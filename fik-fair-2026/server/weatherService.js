import { WEATHER_REFRESH_MS } from '../src/lib/weather.js';

export const WEATHER_LOCATION = { latitude: -6.22, longitude: 106.808, name: 'Koridor Sudirman–GBK' };
const variables = 'temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,cloud_cover,wind_speed_10m,uv_index';
const numeric = (value) => typeof value === 'number' && Number.isFinite(value) ? value : null;
function entry(source, index = null) {
  const read = (key) => numeric(index == null ? source[key] : source[key]?.[index]);
  return { time: read('time'), temperature: read('temperature_2m'), apparentTemperature: read('apparent_temperature'), humidity: read('relative_humidity_2m'), precipitation: read('precipitation'), weatherCode: read('weather_code'), cloudCover: read('cloud_cover'), windSpeed: read('wind_speed_10m'), uvIndex: read('uv_index') };
}
export function normalizeWeather(data, now = Date.now()) {
  if (!data?.current || !Array.isArray(data.hourly?.time) || data.error) throw new Error('Format cuaca tidak valid.');
  const current = entry(data.current);
  if (current.time == null || current.temperature == null || current.time * 1000 > now + 60 * 60 * 1000) throw new Error('Cuaca terkini tidak tersedia.');
  return { source: 'Open-Meteo', sourceUrl: 'https://open-meteo.com/', license: 'CC BY 4.0', fetchedAt: new Date(now).toISOString(), location: WEATHER_LOCATION, grid: { latitude: data.latitude, longitude: data.longitude }, timezone: 'Asia/Jakarta', units: { temperature: '°C', windSpeed: 'km/h', precipitation: 'mm' }, current: { ...current, interval: numeric(data.current.interval) }, hourly: data.hourly.time.map((_, index) => entry(data.hourly, index)).filter((row) => row.time != null) };
}
export function createWeatherService(fetcher = fetch, now = Date.now) {
  let cached;
  let expiresAt = 0;
  let pending;
  return async () => {
    if (cached && now() < expiresAt) return cached;
    if (!pending) pending = (async () => {
      const params = new URLSearchParams({ latitude: String(WEATHER_LOCATION.latitude), longitude: String(WEATHER_LOCATION.longitude), current: variables, hourly: variables, timezone: 'Asia/Jakarta', timeformat: 'unixtime', forecast_days: '7', temperature_unit: 'celsius', wind_speed_unit: 'kmh', precipitation_unit: 'mm' });
      const response = await fetcher(`https://api.open-meteo.com/v1/forecast?${params}`, { signal: AbortSignal.timeout(12000) });
      if (!response.ok) throw new Error(`Open-Meteo HTTP ${response.status}`);
      cached = normalizeWeather(await response.json(), now());
      expiresAt = now() + WEATHER_REFRESH_MS;
      return cached;
    })().finally(() => { pending = null; });
    return pending;
  };
}
export const getWeather = createWeatherService();
