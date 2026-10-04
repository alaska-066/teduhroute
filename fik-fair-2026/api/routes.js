import {trafficConfigured,fetchTrafficCandidates,selectTrafficRoutes} from '../server/trafficService.js';
import { instantWib } from '../src/lib/liveTime.js';
import { validateMode } from '../src/lib/travelModes.js';
import { getOsmContext } from '../server/osmService.js';
import { sendJson } from '../server/http.js';
import { analyzeRoutes, dateAtWib } from '../src/lib/routeAnalysis.js';
import { findWalkingRoutes } from '../src/lib/walkingRouter.js';
import { validateWaypoints } from '../src/lib/waypoints.js';

export async function readRouteRequest(req) {
  if (!req.headers?.['content-type']?.includes('application/json')) throw new Error('Gunakan Content-Type application/json.');
  let body = req.body;
  if (body === undefined) {
    let bytes = 0; const chunks = [];
    for await (const chunk of req) { bytes += Buffer.byteLength(chunk); if (bytes > 4096) throw new Error('Body maksimum 4 KB.'); chunks.push(Buffer.from(chunk)); }
    body = Buffer.concat(chunks).toString('utf8');
  }
  if (Buffer.byteLength(typeof body === 'string' ? body : JSON.stringify(body)) > 4096) throw new Error('Body maksimum 4 KB.');
  const input = typeof body === 'string' ? JSON.parse(body) : body;
  if (input?.at != null) Object.assign(input, instantWib(input.at));
  else dateAtWib(input?.date, input?.hour);
  validateWaypoints(input?.waypoints);
  if(input.traffic != null && typeof input.traffic !== 'boolean')throw new Error('Pilihan traffic harus boolean.');
  if(input.traffic && (input.mode !== 'motorcycle' || !input.at || Math.abs(Date.now()-Date.parse(input.at))>120000))throw new Error('Traffic memerlukan moda motor dan mode Sekarang.');
  return { ...input, mode: validateMode(input.mode) };
}
export function createRoutesHandler(getContext = getOsmContext) {
  return async (req, res) => {
    if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); sendJson(res, 405, { error: 'Gunakan POST.' }); return; }
    let input;
    try { input = await readRouteRequest(req); }
    catch (error) { sendJson(res, 400, { error: error.message }); return; }
    let context;
    try { context = await getContext(); }
    catch { sendJson(res, 503, { error: 'Jaringan OSM belum dapat dimuat. Coba lagi nanti.' }); return; }
    try {
      if(input.traffic && trafficConfigured()) {
        const candidates=await fetchTrafficCandidates(input.waypoints);
        const result=selectTrafficRoutes(candidates,{...input,context});
        sendJson(res,200,result,'no-store');return;
      }
      const { shadows, ...routing } = findWalkingRoutes({ context, waypoints: input.waypoints, date: input.date, hour: input.hour, mode: input.mode, at: input.at });
      const metrics = analyzeRoutes({ date: input.date, hour: input.hour, routes: routing.routes, context, shadowOverride: shadows, at: input.at });
      // Use graph-edge sampling and walking speeds consistently with route selection.
      for (const [key, route] of [['regular', routing.regular], ['shaded', routing.comfortable]]) {
        Object.assign(metrics[key], { distanceKm: Math.round(route.distanceMeters / 100) / 10, durationMinutes: route.durationMinutes, calories: input.mode === 'motorcycle' ? null : Math.round(route.durationMinutes * 3.5), shadeCoverage: route.shadeCoverage, canopyCoverage: route.shadeCoverage, shadedMeters: route.shadedMeters });
        delete metrics[key].samples;
      }
      sendJson(res, 200, { ...routing, metrics, fetchedAt: context.fetchedAt, source: context.source, traffic: { status: input.traffic ? 'not-configured' : 'off', message: input.traffic ? 'Traffic belum aktif: TOMTOM_API_KEY belum diisi. Rute ini memakai estimasi tanpa traffic.' : 'Estimasi tanpa traffic langsung.' } }, 'no-store');
    } catch (error) { sendJson(res, 422, { error: error.message + (input.traffic && !trafficConfigured() ? ' Traffic juga belum aktif: isi TOMTOM_API_KEY pada server.' : '') }); }
  };
}
export default createRoutesHandler();
