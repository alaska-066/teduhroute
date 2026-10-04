import { indexPlaces } from './placeService.js';
import osmtogeojson from 'osmtogeojson';
import { OSM_BOUNDS } from '../src/lib/studyArea.js';

// Fixed bounds include a >300 m buffer around the demo routes. No arbitrary proxy/query input.
export const BOUNDS = OSM_BOUNDS;
export const TTL = 6 * 60 * 60 * 1000;
const endpoint = 'https://overpass-api.de/api/interpreter';
export const query = `[out:json][timeout:20][maxsize:16777216];(nwr["building"](${BOUNDS});node["natural"="tree"](${BOUNDS});nwr["amenity"="drinking_water"](${BOUNDS});nwr["amenity"="shelter"](${BOUNDS});way["highway"](${BOUNDS});nwr["name"](${BOUNDS});rel["type"="restriction"](${BOUNDS}););out body;>>;out body qt;`;

export function normalizeOsm(data) {
  if (!Array.isArray(data?.elements) || data.remark) throw new Error('Respons OSM tidak lengkap.');
  const geojson = osmtogeojson(data, { flatProperties: true });
  const places = indexPlaces(geojson.features);
  geojson.features = geojson.features.filter((f) => {
    const p = f.properties || {};
    return !p.tainted && ((p.building && ['Polygon', 'MultiPolygon'].includes(f.geometry?.type)) || (p.natural === 'tree' && f.geometry?.type === 'Point') || (['drinking_water', 'shelter'].includes(p.amenity) && f.geometry?.type === 'Point'));
  });
  const ways = data.elements.filter((e) => e.type === 'way' && e.tags?.highway && Array.isArray(e.nodes)).map(({ id, nodes, tags }) => ({ id, nodes, tags }));
  const nodeIds = new Set(ways.flatMap((way) => way.nodes));
  const nodes = data.elements.filter((e) => e.type === 'node' && nodeIds.has(e.id)).map(({ id, lat, lon, tags }) => ({ id, lat, lon, tags: tags || {} }));
  const restrictions = data.elements.filter((e) => e.type === 'relation' && e.tags?.type === 'restriction').map(({id,tags,members})=>({id,tags,members}));
  return { geojson, places, network: { nodes, ways, restrictions }, fetchedAt: new Date().toISOString(), osmTimestamp: data.osm3s?.timestamp_osm_base ?? null, bounds: BOUNDS, source: 'OpenStreetMap / Overpass', license: 'ODbL 1.0' };
}

export function createOsmService(fetcher = fetch, now = Date.now) {
  let cached;
  let expiresAt = 0;
  let pending;
  return async function getContext() {
    if (cached && expiresAt > now()) return cached;
    if (!pending) {
      pending = (async () => {
        const response = await fetcher(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Teduh/1.0 (Sudirman-GBK prototype)' }, body: new URLSearchParams({ data: query }), signal: AbortSignal.timeout(25000) });
        if (!response.ok) throw new Error(`Overpass HTTP ${response.status}`);
        const result = normalizeOsm(await response.json());
        cached = result;
        expiresAt = now() + TTL;
        return result;
      })().finally(() => { pending = null; });
    }
    return pending;
  };
}
export const getOsmContext = createOsmService();
