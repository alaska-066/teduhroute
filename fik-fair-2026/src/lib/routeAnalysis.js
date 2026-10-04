import { instantWib } from './liveTime.js';
import SunCalc from 'suncalc';
import { along, bbox, booleanPointInPolygon, circle, convex, destination, featureCollection, length, lineString, point } from '@turf/turf';
import { regularRoute, shadedRoute } from '../data/routeData.js';
import { validateRoutes } from './routeEditing.js';
import { selectHourlyWeather, weatherIsStale } from './weather.js';

export const MODEL = Object.freeze({ sampleMeters: 15, buildingHeight: 12, floorHeight: 3, treeHeight: 8, crownDiameter: 8, maxShadowMeters: 300 });
const round = (value) => Math.round(value * 10) / 10;
export const todayWib = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

export function dateAtWib(date, hour) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isInteger(hour) || hour < 8 || hour > 17) throw new Error('Tanggal harus YYYY-MM-DD dan jam bilangan bulat 08–17 WIB.');
  const day = new Date(`${date}T00:00:00Z`);
  if (!Number.isFinite(day.getTime()) || day.toISOString().slice(0, 10) !== date) throw new Error('Tanggal tidak valid.');
  return new Date(`${date}T${String(hour).padStart(2, '0')}:00:00+07:00`);
}

export function getSolarPosition(date, hour, location = [-6.22, 106.808], at = null) {
  const position = SunCalc.getPosition(at ? new Date(instantWib(at).at) : dateAtWib(date, hour), location[0], location[1]);
  // SunCalc 1.9: radians, azimuth south -> west. Turf: degrees north -> east.
  const azimuth = (position.azimuth * 180 / Math.PI + 180 + 360) % 360;
  return { altitude: position.altitude * 180 / Math.PI, azimuth, shadowBearing: (azimuth + 180) % 360 };
}

export function parseMeters(value) {
  const match = String(value ?? '').trim().match(/^(\d+(?:\.\d+)?)\s*(m|metres?|meters?|ft|feet|')?$/i);
  if (!match) return null;
  const number = Number(match[1]) * (/^(ft|feet|')$/i.test(match[2] || '') ? 0.3048 : 1);
  return number > 0 && number <= 600 ? number : null;
}

export function projectShadows(features, sun) {
  if (sun.altitude <= 0) return featureCollection([]);
  const shadows = [];
  for (const feature of features.features) {
    const tags = feature.properties || {};
    const tree = tags.natural === 'tree' && feature.geometry?.type === 'Point';
    const building = tags.building && tags.building !== 'no' && ['Polygon', 'MultiPolygon'].includes(feature.geometry?.type);
    if (!tree && !building) continue;
    const taggedHeight = parseMeters(tags.height);
    const levels = /^\d+(\.\d+)?$/.test(String(tags['building:levels'])) ? Number(tags['building:levels']) : null;
    const height = taggedHeight ?? (building && levels > 0 && levels <= 150 ? levels * MODEL.floorHeight : tree ? MODEL.treeHeight : MODEL.buildingHeight);
    const rawLength = height / Math.tan(sun.altitude * Math.PI / 180);
    const distance = Math.min(MODEL.maxShadowMeters, Math.max(0, rawLength));
    const props = { sourceId: feature.id, kind: tree ? 'tree' : 'building', assumedHeight: !taggedHeight, height, capped: rawLength > MODEL.maxShadowMeters };
    if (tree) {
      const center = destination(feature, distance / 1000, sun.shadowBearing);
      const diameter = parseMeters(tags.diameter_crown) ?? MODEL.crownDiameter;
      shadows.push(circle(center, diameter / 2000, { steps: 16, properties: props }));
    } else {
      const polygons = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
      for (const rings of polygons) {
        // Convex extrusion is an approximation; concavities/courtyards are not resolved.
        const vertices = rings[0].slice(0, -1);
        const points = vertices.flatMap((coordinate) => [point(coordinate), destination(coordinate, distance / 1000, sun.shadowBearing)]);
        const shadow = convex(featureCollection(points));
        if (shadow) { shadow.properties = props; shadows.push(shadow); }
      }
    }
  }
  return featureCollection(shadows);
}

export function measureRoute(route, shadows, footprints = featureCollection([])) {
  const line = lineString(route.map(([lat, lng]) => [lng, lat]));
  const distanceKm = length(line);
  const count = Math.max(1, Math.ceil(distanceKm * 1000 / MODEL.sampleMeters));
  const indexed = shadows.features.map((feature) => ({ feature, bounds: bbox(feature) }));
  let shadedCount = 0;
  let insideCount = 0;
  const samples = [];
  for (let i = 0; i < count; i++) {
    const sample = along(line, distanceKm * (i + 0.5) / count);
    const [x, y] = sample.geometry.coordinates;
    const inside = footprints.features.some((footprint) => booleanPointInPolygon(sample, footprint));
    // A route drawn inside a building is a geometry conflict, not verified shade.
    const shaded = !inside && indexed.some(({ feature, bounds }) => x >= bounds[0] && x <= bounds[2] && y >= bounds[1] && y <= bounds[3] && booleanPointInPolygon(sample, feature));
    if (shaded) shadedCount++;
    if (inside) insideCount++;
    sample.properties = { shaded, insideBuilding: inside };
    samples.push(sample);
  }
  return { distanceKm: round(distanceKm), shadeCoverage: round(shadedCount / count * 100), insideBuildingPercent: round(insideCount / count * 100), shadedMeters: Math.round(distanceKm * 1000 * shadedCount / count), durationMinutes: Math.ceil(distanceKm / 4.5 * 60), samples: featureCollection(samples) };
}

export function analyzeRoutes({ date, hour, context = null, routes = { regular: regularRoute, shaded: shadedRoute }, weather = null, shadowOverride = null, at = null }) {
  validateRoutes(routes, { maxPoints: 4096 });
  const start = routes.regular[0];
  const end = routes.regular.at(-1);
  const sun = getSolarPosition(date, hour, [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2], at);
  const geometry = context?.geojson || featureCollection([]);
  const shadows = shadowOverride || projectShadows(geometry, sun);
  const footprints = featureCollection(geometry.features.filter((f) => f.properties?.building && f.properties.building !== 'no' && ['Polygon', 'MultiPolygon'].includes(f.geometry?.type)));
  const selectedWeather = selectHourlyWeather(weather, date, hour);
  const calculate = (route) => {
    const measured = measureRoute(route, shadows, footprints);
    const coverage = context ? measured.shadeCoverage : null;
    // Regional forecast applies to both nearby routes. Do not invent a shade temperature discount.
    return { ...measured, shadeCoverage: coverage, canopyCoverage: coverage, surfaceTemperature: null, airTemperature: selectedWeather?.temperature ?? null, feelsLike: selectedWeather?.apparentTemperature ?? null, uvIndex: selectedWeather?.uvIndex ?? null, calories: Math.round(measured.durationMinutes * 3.5) };
  };
  const regular = calculate(routes.regular);
  const shaded = calculate(routes.shaded);
  return { hour, date, at, sun, regular, shaded, shadows, selectedWeather, weatherStale: weatherIsStale(weather), heatWarning: selectedWeather?.apparentTemperature != null && selectedWeather.apparentTemperature >= 38, hasOsm: Boolean(context), recommendation: !context ? null : shaded.shadeCoverage >= regular.shadeCoverage ? 'shaded' : 'regular', assumptions: MODEL, featureCount: geometry.features.length, assumedHeightCount: shadows.features.filter((f) => f.properties.assumedHeight).length };
}
