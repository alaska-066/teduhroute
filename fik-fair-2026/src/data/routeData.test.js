import { test } from 'node:test';
import assert from 'node:assert/strict';
import { regularRoute, shadedRoute, coolingShelters, waterStations, getRouteMetrics, getRouteDistance } from './routeData.js';

test('routes share endpoints and include four facilities per layer', () => {
  assert.deepEqual(regularRoute[0], shadedRoute[0]);
  assert.deepEqual(regularRoute.at(-1), shadedRoute.at(-1));
  assert.ok(coolingShelters.length >= 4 && waterStations.length >= 4);
  for (const route of [regularRoute, shadedRoute]) assert.ok(getRouteDistance(route) > 0);
});

test('heat warning boundaries and peak comparison match the demo', () => {
  for (let hour = 8; hour <= 17; hour++) {
    const result = getRouteMetrics(hour);
    assert.equal(result.heatWarning, hour >= 11 && hour <= 14);
    assert.ok(result.shaded.feelsLike < result.regular.feelsLike);
    assert.ok(result.shaded.uvIndex < result.regular.uvIndex);
    for (const route of [result.shaded, result.regular]) {
      assert.ok(route.canopyCoverage >= 0 && route.canopyCoverage <= 100);
      assert.ok(route.durationMinutes > 0 && route.calories > 0);
    }
  }
  const noon = getRouteMetrics(12);
  assert.equal(noon.regular.feelsLike, 41);
  assert.equal(noon.shaded.feelsLike, 32);
  assert.equal(noon.shaded.canopyCoverage, 85);
  assert.notDeepEqual(getRouteMetrics(8), getRouteMetrics(17));
});

test('invalid hours fall back safely and out-of-range hours are clamped', () => {
  assert.equal(getRouteMetrics('invalid').hour, 12);
  assert.equal(getRouteMetrics(0).hour, 8);
  assert.equal(getRouteMetrics(23).hour, 17);
});
