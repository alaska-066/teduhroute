import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildWalkingGraph, isWalkable, routeOnGraph, shortestPath } from '../src/lib/walkingRouter.js';
import { createRoutesHandler, readRouteRequest } from '../api/routes.js';
import { editWaypoints } from '../src/lib/waypoints.js';
const a = [-6.22, 106.804], b = [-6.22, 106.808];
function network(offset = .0005) {
  return { nodes: [a, b, [a[0] + offset, a[1]], [b[0] + offset, b[1]]].map(([lat, lon], i) => ({ id: i + 1, lat, lon, tags: {} })), ways: [{ id: 10, nodes: [1, 2], tags: { highway: 'footway' } }, { id: 20, nodes: [1, 3, 4, 2], tags: { highway: 'footway', covered: 'yes' } }] };
}
test('regular minimizes walking time; comfortable prefers covered alternative within detour bound', () => {
  const result = routeOnGraph(buildWalkingGraph(network()), [a, b]);
  assert.deepEqual(result.regular.wayIds, [10]);
  assert.deepEqual(result.comfortable.wayIds, [20]);
  assert.equal(result.sameRoute, false);
  assert.ok(result.comfortable.distanceMeters <= result.regular.distanceMeters * 1.35);
  assert.equal(result.comfortable.shadeCoverage, 100);
});
test('rejects excessive detour and reports identical routes honestly', () => {
  const result = routeOnGraph(buildWalkingGraph(network(.002)), [a, b]);
  assert.equal(result.sameRoute, true);
});
test('splits road edges at snapped pins, without including off-road connectors', () => {
  const graph = buildWalkingGraph({ ...network(), ways: network().ways.slice(0, 1) });
  const result = routeOnGraph(graph, [[-6.2199,106.805],[-6.2199,106.807]]);
  assert.ok(result.regular.distanceMeters > 210 && result.regular.distanceMeters < 230);
  assert.ok(result.snaps.every((s) => s.distanceMeters > 10));
  assert.deepEqual(result.routes.regular[0], result.snaps[0].coordinate);
  assert.throws(() => routeOnGraph(graph, [[-6.216,106.805],b]), /100 m/);
});
test('uses OSM node topology, not intersections drawn across bridges', () => {
  const raw = network(); raw.ways = [{ id: 1, nodes: [1,2], tags: { highway: 'footway' } }, { id: 2, nodes: [3,4], tags: { highway: 'footway' } }];
  const graph = buildWalkingGraph(raw);
  assert.equal(shortestPath(graph,1,4), null);
  assert.throws(() => routeOnGraph(graph, [a,[raw.nodes[3].lat,raw.nodes[3].lon]]), /tidak tersambung/);
});
test('pedestrian access and directional restrictions are respected', () => {
  for (const tags of [{highway:'motorway'}, {highway:'footway',foot:'no'}, {highway:'footway',access:'private'}, {highway:'footway','foot:conditional':'yes @ (Mo-Fr)'}]) assert.equal(isWalkable(tags), false);
  assert.equal(isWalkable({highway:'footway',access:'private',foot:'yes'}), true);
  const raw = network(); raw.ways = [raw.ways[0]]; raw.ways[0].tags.oneway = 'yes';
  assert.ok(shortestPath(buildWalkingGraph(raw),2,1));
  raw.ways[0].tags['oneway:foot'] = 'yes';
  assert.equal(shortestPath(buildWalkingGraph(raw),2,1), null);
  raw.ways[0].tags['foot:forward'] = 'no';
  assert.equal(buildWalkingGraph(raw).edges.length, 0);
  delete raw.ways[0].tags['foot:forward'];
  raw.nodes[0].tags.barrier = 'gate';
  assert.equal(buildWalkingGraph(raw).edges.length, 0);
});
test('both routes visit common intermediate waypoint, and edits preserve ordered endpoints', () => {
  const via = [-6.2195,106.806];
  const points = editWaypoints([a,b], 'insert', null, via);
  assert.deepEqual(points,[a,via,b]);
  const result = routeOnGraph(buildWalkingGraph(network()),points);
  for (const route of Object.values(result.routes)) assert.ok(route.some((p) => Math.abs(p[0]-via[0]) < .000001 && Math.abs(p[1]-via[1]) < .000001));
  assert.deepEqual(editWaypoints(points,'remove',1),[a,b]);
  assert.throws(() => editWaypoints(points,'remove',0));
});
test('routing API validates input and ignores client-supplied context', async () => {
  await assert.rejects(readRouteRequest({headers:{'content-type':'application/json'},body:{date:'2026-10-04',hour:12,waypoints:[[0,0],b]}}));
  const context = { network:network(), geojson:{type:'FeatureCollection',features:[]},fetchedAt:new Date().toISOString(),source:'test' };
  const handler = createRoutesHandler(async () => context);
  let status, response;
  const res = {setHeader(){},end(body){response=JSON.parse(body)},set statusCode(value){status=value}};
  await handler({method:'POST',headers:{'content-type':'application/json'},body:{date:'2026-10-04',hour:12,waypoints:[a,b],context:{}}},res);
  assert.equal(status,200); assert.equal(response.sameRoute,false);
  assert.deepEqual(response.routes.regular[0],a);
  await handler({method:'GET'},res); assert.equal(status,405);
});

test('local tertiary connectors do not require explicit sidewalk tags, but restrictions still apply', () => {
  assert.equal(isWalkable({highway:'tertiary',name:'Jalan Widya Chandra V'}),true);
  for (const access of ['private','destination','no']) assert.equal(isWalkable({highway:'tertiary',access}),false);
  assert.equal(isWalkable({highway:'tertiary',foot:'no'}),false);
  assert.equal(isWalkable({highway:'primary'}),false);
  const raw=network(); raw.ways=[{id:10,nodes:[1,2],tags:{highway:'tertiary'}}];
  const result=routeOnGraph(buildWalkingGraph(raw),[a,b]);
  assert.equal(result.regular.unverifiedSidewalkMeters,result.regular.distanceMeters);
});
