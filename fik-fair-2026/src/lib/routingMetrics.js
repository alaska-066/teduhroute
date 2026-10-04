import { getSolarPosition } from './routeAnalysis.js';
import { selectHourlyWeather, weatherIsStale } from './weather.js';

export function displayRoutingMetrics(result, { date, hour, weather, context, at = null }) {
  const forecast = selectHourlyWeather(weather, date, hour);
  const emptyRoute = { distanceKm: null, durationMinutes: null, calories: null, shadeCoverage: null, insideBuildingPercent: 0, shadedMeters: null };
  const base = result?.metrics || { date, hour, sun: getSolarPosition(date, hour, undefined, at), regular: emptyRoute, shaded: emptyRoute, shadows: { type: 'FeatureCollection', features: [] }, hasOsm: Boolean(context), featureCount: context?.geojson.features.length || 0 };
  const applyWeather = (route) => ({ ...route, feelsLike: forecast?.apparentTemperature ?? null, airTemperature: forecast?.temperature ?? null, uvIndex: forecast?.uvIndex ?? null, surfaceTemperature: null });
  return { ...base, regular: applyWeather(base.regular), shaded: applyWeather(base.shaded), selectedWeather: forecast, weatherStale: weatherIsStale(weather), heatWarning: forecast?.apparentTemperature != null && forecast.apparentTemperature >= 38 };
}
