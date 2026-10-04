import { test } from 'node:test';
import assert from 'node:assert/strict';
import { area, bboxPolygon, distance } from '@turf/turf';
import { EDIT_BOUNDS, ORIGINAL_EDIT_BOUNDS, OSM_BOUNDS } from '../src/lib/studyArea.js';
import { validCoordinate } from '../src/lib/routeEditing.js';
import { validateWaypoints } from '../src/lib/waypoints.js';
import { BOUNDS, query } from '../server/osmService.js';
import { buildWalkingGraph, routeOnGraph } from '../src/lib/walkingRouter.js';
const surface = ([s,w,n,e]) => area(bboxPolygon([w,s,e,n]));
test('expanded study area doubles geographic surface and preserves centre', () => {
  assert.ok(Math.abs(surface(EDIT_BOUNDS) / surface(ORIGINAL_EDIT_BOUNDS) - 2) < 0.000001);
  for (let axis = 0; axis < 2; axis++) assert.ok(Math.abs(EDIT_BOUNDS[axis] + EDIT_BOUNDS[axis+2] - ORIGINAL_EDIT_BOUNDS[axis] - ORIGINAL_EDIT_BOUNDS[axis+2]) < 1e-10);
});
test('OSM query includes expanded routing bounds with >300 metre shadow buffer', () => {
  assert.deepEqual(BOUNDS, OSM_BOUNDS);
  assert.ok(query.includes(`(${OSM_BOUNDS})`));
  const [s,w,n,e] = EDIT_BOUNDS, [os,ow,on,oe] = OSM_BOUNDS;
  for (const pair of [[[w,s],[ow,s]],[[e,n],[oe,n]],[[w,s],[w,os]],[[e,n],[e,on]]]) assert.ok(distance(...pair,{units:'meters'}) > 300);
});
test('waypoints and graph accept newly added territory while rejecting outside pins', () => {
  const points = [[-6.228,106.808],[-6.227,106.808]];
  assert.ok(points.every(validCoordinate));
  validateWaypoints(points);
  assert.equal(validCoordinate([-6.23,106.808]),false);
  const graph = buildWalkingGraph({nodes:points.map(([lat,lon],id)=>({id,lat,lon})),ways:[{id:1,nodes:[0,1],tags:{highway:'footway'}}]});
  assert.ok(routeOnGraph(graph,points).regular.distanceMeters > 100);
});
