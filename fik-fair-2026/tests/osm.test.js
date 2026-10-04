import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createOsmService, normalizeOsm, TTL } from '../server/osmService.js';
import analyzeHandler from '../api/analyze.js';
import osmHandler from '../api/osm.js';

const fixture = { elements: [
  { type: 'node', id: 1, lat: -6.22, lon: 106.8 },
  { type: 'node', id: 2, lat: -6.22, lon: 106.801 },
  { type: 'node', id: 3, lat: -6.221, lon: 106.801 },
  { type: 'way', id: 4, nodes: [1, 2, 3, 1], tags: { building: 'yes', height: '20' } },
  { type: 'node', id: 5, lat: -6.22, lon: 106.802, tags: { natural: 'tree' } },
] };
test('OSM conversion preserves building tags and point coordinates', () => {
  const data = normalizeOsm(fixture);
  assert.equal(data.geojson.features.length, 2);
  assert.equal(data.geojson.features.find((f) => f.properties.building).properties.height, '20');
  assert.deepEqual(data.geojson.features.find((f) => f.properties.natural).geometry.coordinates, [106.802, -6.22]);
  assert.throws(() => normalizeOsm({ ...fixture, remark: 'runtime error: timed out' }));
});
test('OSM multipolygon relations retain holes rather than becoming invented building interiors', () => {
  const nodes = [[1, 0, 0], [2, 0, 1], [3, 1, 1], [4, 1, 0], [5, 0.2, 0.2], [6, 0.2, 0.4], [7, 0.4, 0.4], [8, 0.4, 0.2]].map(([id, lat, lon]) => ({ type: 'node', id, lat, lon }));
  const result = normalizeOsm({ elements: [...nodes,
    { type: 'way', id: 10, nodes: [1, 2, 3, 4, 1] },
    { type: 'way', id: 11, nodes: [5, 6, 7, 8, 5] },
    { type: 'relation', id: 12, tags: { type: 'multipolygon', building: 'yes' }, members: [{ type: 'way', ref: 10, role: 'outer' }, { type: 'way', ref: 11, role: 'inner' }] },
  ] });
  assert.equal(result.geojson.features.length, 1);
  assert.equal(result.geojson.features[0].geometry.coordinates.length, 2);
});
test('cache deduplicates concurrent requests, expires, and retries after failure', async () => {
  let time = 0;
  let calls = 0;
  const get = createOsmService(async () => { calls++; return { ok: true, json: async () => fixture }; }, () => time);
  await Promise.all([get(), get()]);
  await get();
  assert.equal(calls, 1);
  time = TTL + 1;
  await get();
  assert.equal(calls, 2);
  let fail = true;
  const retry = createOsmService(async () => { if (fail) throw new Error('offline'); return { ok: true, json: async () => fixture }; });
  await assert.rejects(retry());
  fail = false;
  assert.equal((await retry()).geojson.features.length, 2);
});
function response() { return { headers: {}, setHeader(key, value) { this.headers[key] = value; }, end(body) { this.body = JSON.parse(body); } }; }
test('API rejects unsupported methods and invalid input before upstream requests', async () => {
  const badMethod = response();
  await osmHandler({ method: 'POST' }, badMethod);
  assert.equal(badMethod.statusCode, 405);
  assert.equal(badMethod.headers.Allow, 'GET');
  const badDate = response();
  await analyzeHandler({ method: 'GET', url: '/api/analyze?date=2026-02-30&hour=12' }, badDate);
  assert.equal(badDate.statusCode, 400);
  assert.equal(badDate.headers['Cache-Control'], 'no-store');
});
