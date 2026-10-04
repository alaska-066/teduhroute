import { getOsmContext } from '../server/osmService.js';
import { sendJson } from '../server/http.js';
import { analyzeRoutes, dateAtWib } from '../src/lib/routeAnalysis.js';
import { validateRoutes } from '../src/lib/routeEditing.js';
import { getWeather } from '../server/weatherService.js';

async function readInput(req) {
  if (req.method === 'GET') {
    const params = new URL(req.url, 'http://localhost').searchParams;
    return { date: params.get('date') || '', hour: Number(params.get('hour')) };
  }
  if (!req.headers?.['content-type']?.includes('application/json')) throw new Error('POST membutuhkan Content-Type application/json.');
  let body = req.body;
  if (body === undefined) {
    const chunks = [];
    let bytes = 0;
    for await (const chunk of req) {
      bytes += Buffer.byteLength(chunk);
      if (bytes > 16384) throw new Error('Body maksimum 16 KB.');
      chunks.push(Buffer.from(chunk));
    }
    body = Buffer.concat(chunks).toString('utf8');
  }
  if (Buffer.byteLength(typeof body === 'string' ? body : JSON.stringify(body)) > 16384) throw new Error('Body maksimum 16 KB.');
  return typeof body === 'string' ? JSON.parse(body) : body;
}

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) { res.setHeader('Allow', 'GET, POST'); sendJson(res, 405, { error: 'Gunakan GET atau POST.' }); return; }
  let input;
  try {
    input = await readInput(req);
    dateAtWib(input?.date, input?.hour);
    if (input.routes !== undefined) validateRoutes(input.routes);
  }
  catch (error) { sendJson(res, 400, { error: error.message }); return; }
  try {
    const [osmResult, weatherResult] = await Promise.allSettled([getOsmContext(), getWeather()]);
    if (osmResult.status !== 'fulfilled') throw new Error('OSM tidak tersedia');
    const context = osmResult.value;
    const weather = weatherResult.status === 'fulfilled' ? weatherResult.value : null;
    sendJson(res, 200, { ...analyzeRoutes({ date: input.date, hour: input.hour, routes: input.routes, context, weather }), source: context.source, fetchedAt: context.fetchedAt, weatherSource: weather?.source ?? null, weatherFetchedAt: weather?.fetchedAt ?? null, weatherError: weather ? null : 'Cuaca tidak tersedia; analisis geometri tetap berjalan.' }, 'no-store');
  } catch { sendJson(res, 503, { error: 'Analisis belum tersedia karena data OSM gagal dimuat.' }); }
}
