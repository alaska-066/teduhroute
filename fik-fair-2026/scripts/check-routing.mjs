import { getOsmContext } from '../server/osmService.js';
import { buildWalkingGraph, findWalkingRoutes, snapWaypoints, shortestPath } from '../src/lib/walkingRouter.js';
import { defaultWaypoints } from '../src/lib/waypoints.js';
import { ORIGINAL_EDIT_BOUNDS, EDIT_BOUNDS } from '../src/lib/studyArea.js';
const fetchStarted = performance.now();
const context = await getOsmContext();
const graph = buildWalkingGraph(context.network);
console.log(JSON.stringify({ loadMilliseconds: Math.round(performance.now()-fetchStarted), responseBytes: Buffer.byteLength(JSON.stringify(context)), features:context.geojson.features.length, ways: context.network.ways.length, nodes: graph.nodes.size, edges: graph.edges.length, bounds:EDIT_BOUNDS }));
function check(label,waypoints) {
  const started = performance.now();
  const result = findWalkingRoutes({ context, waypoints, date: '2026-10-04', hour: 16 });
  console.log(JSON.stringify({ label, milliseconds: Math.round(performance.now() - started), regular: result.regular.distanceMeters, comfortable: result.comfortable.distanceMeters, sameRoute: result.sameRoute, coverage: [result.regular.shadeCoverage, result.comfortable.shadeCoverage], snaps: result.snaps }));
}
check('default',defaultWaypoints());
const {graph: snappedGraph,snaps} = snapWaypoints(graph,defaultWaypoints());
const [south,west,north,east] = ORIGINAL_EDIT_BOUNDS;
const candidates = [...graph.nodes].filter(([, [lat,lng]])=> lat < south || lat > north || lng < west || lng > east);
const target = candidates.find(([id])=> shortestPath(snappedGraph,snaps[0].id,id));
if (!target) throw new Error('No connected route found in expanded territory.');
check('expanded-territory',[defaultWaypoints()[0],target[1]]);
