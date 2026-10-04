import { instantWib } from './liveTime.js';
import { validateMode, isMotorcycleRoad, blocksMotorcycle, motorcycleDirection, motorcycleSpeed, restrictedMotorWays, motorAccess } from './travelModes.js';
import { along, bbox, booleanPointInPolygon, distance, lineString, nearestPointOnLine, point } from '@turf/turf';
import { validCoordinate } from './routeEditing.js';
import { validateWaypoints } from './waypoints.js';
import { dateAtWib, getSolarPosition, projectShadows } from './routeAnalysis.js';

export const ROUTING_OPTIONS = Object.freeze({ maxSnapMeters: 100, maxDetourRatio: 1.35, shadeWeight: 2.5, sampleMeters: 15 });
const footAllowed = new Set(['yes', 'designated', 'permissive', 'official']);
const footWays = new Set(['footway', 'pedestrian', 'path', 'steps', 'living_street']);
const localWays = new Set(['residential', 'service', 'unclassified', 'track', 'road', 'tertiary', 'tertiary_link']);
const arterialWays = new Set(['primary', 'primary_link', 'secondary', 'secondary_link', 'tertiary', 'tertiary_link']);
const sidewalkAllowed = (t) => ['sidewalk', 'sidewalk:left', 'sidewalk:right', 'sidewalk:both'].some((key) => ['yes', 'both', 'left', 'right'].includes(t[key]));

export function isWalkable(tags = {}) {
  if (!tags.highway || ['motorway', 'motorway_link', 'trunk', 'trunk_link', 'construction', 'proposed', 'raceway'].includes(tags.highway)) return false;
  if (tags.area === 'yes' || tags.indoor === 'yes' || tags.construction || tags['foot:conditional'] || tags['access:conditional'] || tags['oneway:foot:conditional'] || tags['foot:forward:conditional'] || tags['foot:backward:conditional']) return false;
  if (tags.foot && !footAllowed.has(tags.foot)) return false;
  if (tags.access && !footAllowed.has(tags.access) && !footAllowed.has(tags.foot)) return false;
  if (footAllowed.has(tags.foot)) return true;
  if (tags.foot === 'use_sidepath' || tags.sidewalk === 'separate') return false;
  return footWays.has(tags.highway) || localWays.has(tags.highway) || sidewalkAllowed(tags) || (arterialWays.has(tags.highway) && sidewalkAllowed(tags));
}
function blockedNode(tags = {}) {
  if (tags['foot:conditional'] || tags['access:conditional']) return true;
  if (footAllowed.has(tags.foot)) return false;
  if (tags.foot || (tags.access && !footAllowed.has(tags.access))) return true;
  return tags.barrier && !['bollard', 'cycle_barrier', 'kerb', 'entrance', 'cattle_grid'].includes(tags.barrier);
}
const meters = (a, b) => distance([a[1], a[0]], [b[1], b[0]], { units: 'meters' });
const cloneGraph = (graph) => ({ mode: graph.mode, nodes: new Map(graph.nodes), edges: graph.edges, adjacency: new Map([...graph.adjacency].map(([id, entries]) => [id, [...entries]])) });
function addEdge(graph, edge) {
  const insert = (from, to, reverse) => {
    if (!graph.adjacency.has(from)) graph.adjacency.set(from, []);
    graph.adjacency.get(from).push({ to, edge, reverse });
  };
  if (edge.direction !== -1) insert(edge.a, edge.b, false);
  if (edge.direction !== 1) insert(edge.b, edge.a, true);
}
export function buildWalkingGraph(network, mode = 'walking') {
  validateMode(mode);
  const motor = mode === 'motorcycle';
  const excluded = motor ? restrictedMotorWays(network.restrictions) : new Set();
  if (!Array.isArray(network?.nodes) || !Array.isArray(network?.ways)) throw new Error('Jaringan jalan OSM belum tersedia. Muat ulang data.');
  const sourceNodes = new Map(network.nodes.map((node) => [node.id, node]));
  const graph = { mode, nodes: new Map(), edges: [], adjacency: new Map() };
  for (const way of network.ways) {
    if (excluded.has(way.id) || !(motor ? isMotorcycleRoad(way.tags) : isWalkable(way.tags))) continue;
    const tags = way.tags;
    const oneWay = tags['oneway:foot'];
    const forward = oneWay !== '-1' && (!tags['foot:forward'] || footAllowed.has(tags['foot:forward']));
    const backward = !['yes', '1', 'true'].includes(oneWay) && (!tags['foot:backward'] || footAllowed.has(tags['foot:backward']));
    if (!motor && !forward && !backward) continue;
    const direction = motor ? motorcycleDirection(tags) : forward && backward ? 0 : forward ? 1 : -1;
    if (direction === null) continue;
    for (let i = 0; i < way.nodes.length - 1; i++) {
      const first = sourceNodes.get(way.nodes[i]);
      const second = sourceNodes.get(way.nodes[i + 1]);
      if (!first || !second || (motor ? blocksMotorcycle(first.tags) : blockedNode(first.tags)) || (motor ? blocksMotorcycle(second.tags) : blockedNode(second.tags))) continue;
      const a = [first.lat, first.lon];
      const b = [second.lat, second.lon];
      if (!validCoordinate(a) || !validCoordinate(b)) continue;
      const length = meters(a, b);
      if (length < 0.01) continue;
      graph.nodes.set(first.id, a); graph.nodes.set(second.id, b);
      const edge = { id: `${way.id}:${i}`, a: first.id, b: second.id, length, seconds: length / (motor ? motorcycleSpeed(tags) : tags.highway === 'steps' ? 0.7 : 1.25), tags, wayId: way.id, direction };
      graph.edges.push(edge); addEdge(graph, edge);
    }
  }
  return graph;
}

// Only OSM node IDs connect ways. Geometric crossings/bridges do not become invented intersections.
export function snapWaypoints(base, waypoints) {
  const graph = cloneGraph(base);
  const groups = new Map();
  const snaps = waypoints.map((coordinate, index) => {
    let best;
    for (const edge of base.edges) {
      const a = base.nodes.get(edge.a); const b = base.nodes.get(edge.b);
      const projected = nearestPointOnLine(lineString([a, b].map(([lat, lng]) => [lng, lat])), point([coordinate[1], coordinate[0]]), { units: 'meters' });
      const snapped = [projected.geometry.coordinates[1], projected.geometry.coordinates[0]];
      const offset = meters(coordinate, snapped);
      if (!best || offset < best.distanceMeters) best = { edge, coordinate: snapped, distanceMeters: offset, along: Math.min(edge.length, Math.max(0, meters(a, snapped))) };
    }
    if (!best || best.distanceMeters > ROUTING_OPTIONS.maxSnapMeters) throw new Error(`Titik ${index === 0 ? 'A' : index === waypoints.length - 1 ? 'B' : index} berjarak lebih dari ${ROUTING_OPTIONS.maxSnapMeters} m dari jalan yang dapat digunakan untuk ${base.mode === 'motorcycle' ? 'motor' : 'jalan kaki'}. Geser lebih dekat ke jalan.`);
    const edge = best.edge;
    let id = best.along < 0.05 ? edge.a : edge.length - best.along < 0.05 ? edge.b : `snap:${index}`;
    if (!groups.has(edge.id)) groups.set(edge.id, []);
    // Two pins at the same projected location must share a virtual graph node.
    const existing = groups.get(edge.id).find((snap) => Math.abs(snap.along - best.along) < 0.05);
    if (existing) id = existing.id;
    const snap = { ...best, id, requested: coordinate };
    graph.nodes.set(id, best.coordinate);
    groups.get(edge.id).push(snap);
    return snap;
  });
  for (const [edgeId, items] of groups) {
    const edge = items[0].edge;
    for (const id of [edge.a, edge.b]) graph.adjacency.set(id, (graph.adjacency.get(id) || []).filter((entry) => entry.edge.id !== edgeId));
    const sequence = [{ id: edge.a, along: 0 }, ...items, { id: edge.b, along: edge.length }].sort((a, b) => a.along - b.along);
    const unique = sequence.filter((item, index) => index === 0 || item.id !== sequence[index - 1].id);
    for (let i = 0; i < unique.length - 1; i++) {
      const a = unique[i]; const b = unique[i + 1]; const length = b.along - a.along;
      if (length > 0.001) addEdge(graph, { ...edge, id: `${edgeId}/split:${i}`, a: a.id, b: b.id, length, seconds: edge.seconds * length / edge.length });
    }
  }
  return { graph, snaps };
}

class MinHeap {
  items = [];
  push(value) {
    const items = this.items; items.push(value); let i = items.length - 1;
    while (i > 0) { const p = (i - 1) >> 1; if (items[p].cost <= value.cost) break; items[i] = items[p]; i = p; } items[i] = value;
  }
  pop() {
    const items = this.items; const top = items[0]; const last = items.pop();
    if (items.length) { let i = 0; while (i * 2 + 1 < items.length) { let child = i * 2 + 1; if (child + 1 < items.length && items[child + 1].cost < items[child].cost) child++; if (items[child].cost >= last.cost) break; items[i] = items[child]; i = child; } items[i] = last; }
    return top;
  }
}
export function shortestPath(graph, start, end, costOf = (edge) => edge.seconds) {
  const heap = new MinHeap(); heap.push({ id: start, cost: 0 });
  const costs = new Map([[start, 0]]); const previous = new Map();
  while (heap.items.length) {
    const current = heap.pop();
    if (current.cost !== costs.get(current.id)) continue;
    if (current.id === end) {
      const entries = []; let id = end;
      while (id !== start) { const step = previous.get(id); entries.push(step.entry); id = step.from; }
      return entries.reverse();
    }
    for (const entry of graph.adjacency.get(current.id) || []) {
      const next = current.cost + costOf(entry.edge);
      if (next < (costs.get(entry.to) ?? Infinity)) { costs.set(entry.to, next); previous.set(entry.to, { from: current.id, entry }); heap.push({ id: entry.to, cost: next }); }
    }
  }
  return null;
}

function spatialIndex(features) {
  const cells = new Map(); const cell = (value) => Math.floor(value * 1000);
  for (const feature of features) {
    const box = bbox(feature);
    for (let x = cell(box[0]); x <= cell(box[2]); x++) for (let y = cell(box[1]); y <= cell(box[3]); y++) {
      const key = `${x}:${y}`; if (!cells.has(key)) cells.set(key, []); cells.get(key).push(feature);
    }
  }
  return (coordinate) => (cells.get(`${cell(coordinate[0])}:${cell(coordinate[1])}`) || []).some((feature) => booleanPointInPolygon(coordinate, feature));
}
export function makeShadeSampler(shadows, footprints = []) {
  const inShadow = spatialIndex(shadows.features); const inBuilding = spatialIndex(footprints);
  return (coordinate) => !inBuilding(coordinate) && inShadow(coordinate);
}

export function routeOnGraph(base, waypoints, shadeAt = () => false) {
  validateWaypoints(waypoints);
  if (!base.edges.length) throw new Error('Tidak ada jaringan jalan untuk moda ini di area studi.');
  const { graph, snaps } = snapWaypoints(base, waypoints);
  const shadeCache = new Map();
  const shade = (edge) => {
    if (!shadeCache.has(edge.id)) {
      if (edge.tags.covered === 'yes' || edge.tags.tunnel === 'yes' || edge.tags.tunnel === 'building_passage') shadeCache.set(edge.id, 1);
      else {
        const line = lineString([graph.nodes.get(edge.a), graph.nodes.get(edge.b)].map(([lat, lng]) => [lng, lat]));
        const count = Math.max(1, Math.ceil(edge.length / ROUTING_OPTIONS.sampleMeters)); let shaded = 0;
        for (let i = 0; i < count; i++) if (shadeAt(along(line, edge.length * (i + 0.5) / count, { units: 'meters' }).geometry.coordinates)) shaded++;
        shadeCache.set(edge.id, shaded / count);
      }
    }
    return shadeCache.get(edge.id);
  };
  const discomfort = (edge) => {
    const traffic = arterialWays.has(edge.tags.highway) ? 0.25 : 0;
    const rough = ['sand', 'mud', 'gravel', 'cobblestone'].includes(edge.tags.surface) ? 0.15 : 0;
    return edge.seconds * (ROUTING_OPTIONS.shadeWeight * (1 - shade(edge)) + traffic + rough);
  };
  const regularEntries = []; const comfortableEntries = [];
  const totals = (entries) => entries.reduce((sum, { edge }) => ({ length: sum.length + edge.length, seconds: sum.seconds + edge.seconds, score: sum.score + edge.seconds + discomfort(edge), shadedMeters: sum.shadedMeters + edge.length * shade(edge) }), { length: 0, seconds: 0, score: 0, shadedMeters: 0 });
  for (let i = 0; i < snaps.length - 1; i++) {
    const start = snaps[i].id; const end = snaps[i + 1].id;
    const regular = shortestPath(graph, start, end);
    if (!regular) throw new Error(`Jaringan antara ${snaps[i].edge.tags.name || 'jalan dekat titik ' + (i + 1)} dan ${snaps[i + 1].edge.tags.name || 'jalan dekat titik ' + (i + 2)} tidak tersambung pada jaringan yang dapat digunakan. Ruas privat, akses khusus tujuan, atau gerbang dapat memutus jalur. Geser pin ke pintu masuk publik; aplikasi tidak membuat sambungan garis lurus.`);
    const baseline = totals(regular); let best = regular; let bestScore = baseline.score;
    const regularIds = new Set(regular.map(({ edge }) => edge.id));
    const candidates = [0.25, 0.5, 1, 2, 4].map((weight) => shortestPath(graph, start, end, (edge) => edge.seconds + weight * discomfort(edge)));
    candidates.push(shortestPath(graph, start, end, (edge) => (edge.seconds + discomfort(edge)) * (regularIds.has(edge.id) ? 1.5 : 1)));
    for (const candidate of candidates) {
      if (!candidate) continue;
      const candidateTotals = totals(candidate);
      if (candidateTotals.length <= baseline.length * ROUTING_OPTIONS.maxDetourRatio + 0.01 && candidateTotals.score < bestScore - 0.001) { best = candidate; bestScore = candidateTotals.score; }
    }
    regularEntries.push(...regular); comfortableEntries.push(...best);
  }
  const describe = (entries) => {
    const total = totals(entries);
    const coordinates = [[...snaps[0].coordinate], ...entries.map((entry) => [...graph.nodes.get(entry.to)])];
    if (total.length < 10 || total.length > 10000 || coordinates.length > 4096) throw new Error('Panjang rute pada jaringan harus 10 m–10 km. Pilih titik yang berbeda atau kurangi persinggahan.');
    return { coordinates, distanceMeters: Math.round(total.length), durationMinutes: Math.ceil(total.seconds / 60), shadeCoverage: Math.round(total.shadedMeters / total.length * 1000) / 10, shadedMeters: Math.round(total.shadedMeters), score: total.score, unverifiedSidewalkMeters: Math.round(entries.reduce((sum, { edge }) => sum + (!footWays.has(edge.tags.highway) && !sidewalkAllowed(edge.tags) ? edge.length : 0), 0)), wayIds: [...new Set(entries.map(({ edge }) => edge.wayId))] };
  };
  const regular = describe(regularEntries); const comfortable = describe(comfortableEntries);
  const sameRoute = JSON.stringify(regular.coordinates) === JSON.stringify(comfortable.coordinates);
  return { mode: base.mode || 'walking', routes: { regular: regular.coordinates, shaded: comfortable.coordinates }, regular, comfortable, sameRoute, extraDistancePercent: Math.round((comfortable.distanceMeters / regular.distanceMeters - 1) * 1000) / 10, snaps: snaps.map(({ coordinate, requested, distanceMeters }) => ({ coordinate, requested, distanceMeters: Math.round(distanceMeters) })), options: ROUTING_OPTIONS };
}

const graphCache = new WeakMap();
export function findWalkingRoutes({ context, waypoints, date, hour, mode = 'walking', at = null }) {
  validateMode(mode); if (at) instantWib(at); else dateAtWib(date, hour); validateWaypoints(waypoints);
  if (!context?.network) throw new Error('Jaringan jalan OSM belum tersedia.');
  if (!graphCache.has(context.network)) graphCache.set(context.network, new Map());
  const modes = graphCache.get(context.network);
  if (!modes.has(mode)) modes.set(mode, buildWalkingGraph(context.network, mode));
  const first = waypoints[0]; const last = waypoints.at(-1);
  const sun = getSolarPosition(date, hour, [(first[0] + last[0]) / 2, (first[1] + last[1]) / 2], at);
  const shadows = projectShadows(context.geojson, sun);
  const footprints = context.geojson.features.filter((f) => f.properties?.building && f.properties.building !== 'no' && ['Polygon', 'MultiPolygon'].includes(f.geometry?.type));
  try {
    return { ...routeOnGraph(modes.get(mode), waypoints, makeShadeSampler(shadows, footprints)), shadows };
  } catch (error) {
    const nearby = restrictedRoadsNear(context.network, waypoints, mode);
    throw new Error(error.message + (nearby.length ? ` Pembatasan OSM di sekitar pin: ${nearby.join('; ')}.` : ''));
  }
}

// Explain omitted roads shown on the base map without granting access to them.
export function restrictedRoadsNear(network, waypoints, mode = 'walking') {
  const nodes = new Map(network.nodes.map((n) => [n.id, n]));
  const found = new Set();
  for (const way of network.ways) {
    const restriction = mode === 'motorcycle' ? motorAccess(way.tags) : way.tags.foot || way.tags.access;
    if (!restriction || ['yes','designated','permissive','official'].includes(restriction) || (mode === 'motorcycle' ? isMotorcycleRoad(way.tags) : isWalkable(way.tags))) continue;
    for (let i = 1; i < way.nodes.length; i++) {
      const a = nodes.get(way.nodes[i - 1]), b = nodes.get(way.nodes[i]);
      if (!a || !b) continue;
      const line = lineString([[a.lon, a.lat], [b.lon, b.lat]]);
      if (waypoints.some(([lat,lng]) => nearestPointOnLine(line, [lng,lat], {units:'meters'}).properties.dist <= 100)) {
        const label = ({private:'privat',destination:'khusus akses tujuan',no:'akses dilarang',use_sidepath:'gunakan jalur samping'})[restriction] || restriction;
        found.add(`${way.tags.name || 'Jalan tanpa nama'} (${label})`); break;
      }
    }
  }
  return [...found].slice(0, 4);
}
