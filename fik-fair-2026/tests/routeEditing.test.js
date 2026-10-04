import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultRoutes, editRoute, validateRoutes } from '../src/lib/routeEditing.js';
import { analyzeRoutes } from '../src/lib/routeAnalysis.js';

test('moving either endpoint updates both routes without mutating originals', () => {
  const original = defaultRoutes();
  const next = editRoute(original, 'shaded', 'move', 0, [-6.215, 106.808]);
  assert.deepEqual(next.regular[0], next.shaded[0]);
  assert.notDeepEqual(next.regular[0], original.regular[0]);
  const end = editRoute(next, 'regular', 'move', next.regular.length - 1, [-6.222, 106.807]);
  assert.deepEqual(end.regular.at(-1), end.shaded.at(-1));
});
test('internal edits change only the chosen route, recalculate distance, and allow insert/delete', () => {
  const original = defaultRoutes();
  const next = editRoute(original, 'shaded', 'move', 1, [-6.2155, 106.804]);
  assert.deepEqual(next.regular, original.regular);
  const before = analyzeRoutes({ date: '2026-10-04', hour: 12, routes: original });
  const after = analyzeRoutes({ date: '2026-10-04', hour: 12, routes: next });
  assert.notEqual(before.shaded.distanceKm, after.shaded.distanceKm);
  assert.equal(before.regular.distanceKm, after.regular.distanceKm);
  const inserted = editRoute(original, 'regular', 'insert', null, [-6.2154, 106.8087]);
  assert.equal(inserted.regular.length, original.regular.length + 1);
  assert.deepEqual(editRoute(inserted, 'regular', 'remove', 1), original);
});
test('invalid/outside points, missing endpoints and excessive paths are rejected', () => {
  const routes = defaultRoutes();
  for (const coordinate of [[-7, 106], [NaN, 106.808], ['-6.22', 106.808]]) assert.throws(() => editRoute(routes, 'regular', 'move', 0, coordinate));
  assert.throws(() => editRoute(routes, 'regular', 'remove', 0));
  const invalid = defaultRoutes(); invalid.shaded[0] = [-6.22, 106.81];
  assert.throws(() => validateRoutes(invalid));
  const long = Array.from({ length: 64 }, (_, i) => i % 2 ? [-6.226, 106.816] : [-6.214, 106.802]);
  assert.throws(() => validateRoutes({ regular: long, shaded: long }));
});
