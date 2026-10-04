import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bbox, featureCollection, polygon } from '@turf/turf';
import { analyzeRoutes, dateAtWib, getSolarPosition, measureRoute, parseMeters, projectShadows } from '../src/lib/routeAnalysis.js';

const building = polygon([[[106.8, -6.22], [106.8001, -6.22], [106.8001, -6.2199], [106.8, -6.2199], [106.8, -6.22]]], { building: 'yes', height: '10' });
test('WIB conversion and date validation are independent of server timezone', () => {
  assert.equal(dateAtWib('2026-10-04', 12).toISOString(), '2026-10-04T05:00:00.000Z');
  for (const [date, hour] of [['2026-02-30', 12], ['bad', 12], ['2026-10-04', 19], ['2026-10-04', 12.5]]) assert.throws(() => dateAtWib(date, hour));
  const sun = getSolarPosition('2026-10-04', 8);
  assert.ok(sun.altitude > 0 && sun.altitude < 90);
  assert.ok(sun.azimuth > 0 && sun.azimuth < 180, 'morning sun must be eastward');
  assert.ok(sun.shadowBearing > 180 && sun.shadowBearing < 360);
});
test('building projection goes opposite the sun; low sun creates longer shadows', () => {
  const high = projectShadows(featureCollection([building]), { altitude: 60, shadowBearing: 270 });
  const low = projectShadows(featureCollection([building]), { altitude: 20, shadowBearing: 270 });
  assert.ok(bbox(low)[0] < bbox(high)[0]);
  assert.ok(Math.abs(bbox(high)[2] - 106.8001) < 0.000001);
  assert.equal(projectShadows(featureCollection([building]), { altitude: -1 }).features.length, 0);
  assert.equal(high.features[0].properties.assumedHeight, false);
});
test('weighted route sampling counts overlapping shadows once and excludes building interiors', () => {
  const covering = polygon([[[106.79, -6.23], [106.81, -6.23], [106.81, -6.21], [106.79, -6.21], [106.79, -6.23]]]);
  const route = [[-6.22, 106.799], [-6.22, 106.801]];
  const measured = measureRoute(route, featureCollection([covering, covering]));
  assert.equal(measured.shadeCoverage, 100);
  assert.ok(measured.distanceKm >= 0.2 && measured.distanceKm <= 0.3);
  assert.equal(measureRoute(route, featureCollection([covering]), featureCollection([covering])).shadeCoverage, 0);
});
test('missing OSM is unknown rather than fabricated shade, and height units are explicit', () => {
  const result = analyzeRoutes({ date: '2026-10-04', hour: 12 });
  assert.equal(result.regular.shadeCoverage, null);
  assert.equal(result.regular.feelsLike, null);
  assert.equal(result.recommendation, null);
  assert.equal(parseMeters('10 m'), 10);
  assert.equal(parseMeters('10 ft'), 3.048);
  assert.equal(parseMeters('10;20'), null);
});
