import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWeatherService, normalizeWeather } from '../server/weatherService.js';
import { selectHourlyWeather, weatherIsStale, WEATHER_REFRESH_MS } from '../src/lib/weather.js';
import { analyzeRoutes } from '../src/lib/routeAnalysis.js';
import analyzeHandler from '../api/analyze.js';
import weatherHandler from '../api/weather.js';

const now = Date.parse('2026-10-04T05:00:00Z');
const fixture = { latitude: -6.22, longitude: 106.808, current: { time: now / 1000, temperature_2m: 32, apparent_temperature: 35, uv_index: 8, precipitation: 0, interval: 900 }, hourly: { time: [now / 1000], temperature_2m: [32], apparent_temperature: [35], uv_index: [8], precipitation: [0] } };

test('weather normalization keeps zero distinct from missing data and validates payloads', () => {
  const data = normalizeWeather(fixture, now);
  assert.equal(data.current.precipitation, 0);
  assert.equal(data.current.humidity, null);
  assert.equal(data.current.uvIndex, 8);
  assert.throws(() => normalizeWeather({ error: true }, now));
  assert.throws(() => normalizeWeather({ ...fixture, current: { time: now / 1000 } }, now));
});
test('selected forecast respects WIB and never substitutes current data for unavailable dates', () => {
  const weather = normalizeWeather(fixture, now);
  assert.equal(selectHourlyWeather(weather, '2026-10-04', 12).temperature, 32);
  assert.equal(selectHourlyWeather(weather, '2026-10-04', 13), null);
  assert.equal(selectHourlyWeather(weather, '2025-10-04', 12), null);
  const result = analyzeRoutes({ date: '2026-10-04', hour: 12, weather });
  assert.equal(result.regular.feelsLike, 35);
  assert.equal(result.shaded.feelsLike, 35);
  assert.equal(result.regular.surfaceTemperature, null);
  assert.equal(result.regular.airTemperature, 32);
  assert.equal(analyzeRoutes({ date: '2026-10-05', hour: 12, weather }).regular.feelsLike, null);
});
test('stale current weather is marked using fetched time and model valid time', () => {
  const data = normalizeWeather(fixture, now);
  assert.equal(weatherIsStale(data, now), false);
  assert.equal(weatherIsStale(data, now + 11 * 60000), true);
  assert.equal(weatherIsStale({ ...data, current: { ...data.current, time: (now - 2 * 3600000) / 1000 } }, now), true);
});
test('weather requests deduplicate, expire after five minutes and recover after an upstream error', async () => {
  let calls = 0;
  let clock = now;
  let fail = false;
  const get = createWeatherService(async () => { calls++; return { ok: !fail, status: fail ? 503 : 200, json: async () => fixture }; }, () => clock);
  await Promise.all([get(), get()]);
  assert.equal(calls, 1);
  await get(); assert.equal(calls, 1);
  clock += WEATHER_REFRESH_MS + 1;
  fail = true;
  await assert.rejects(get());
  fail = false;
  await get(); assert.equal(calls, 3);
});
function response() { return { headers: {}, setHeader(key, value) { this.headers[key] = value; }, end(body) { this.body = JSON.parse(body); } }; }
test('HTTP validates edited routes/body and protects the weather method', async () => {
  const bad = response();
  await analyzeHandler({ method: 'POST', headers: { 'content-type': 'application/json' }, body: { date: '2026-10-04', hour: 12, routes: { regular: [[0, 0]], shaded: [] } } }, bad);
  assert.equal(bad.statusCode, 400);
  const large = response();
  await analyzeHandler({ method: 'POST', headers: { 'content-type': 'application/json' }, body: 'a'.repeat(17000) }, large);
  assert.equal(large.statusCode, 400);
  const method = response();
  await weatherHandler({ method: 'POST' }, method);
  assert.equal(method.statusCode, 405);
});
