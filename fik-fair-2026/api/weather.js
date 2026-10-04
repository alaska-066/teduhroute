import { getWeather } from '../server/weatherService.js';
import { allowGet, sendJson } from '../server/http.js';

export default async function handler(req, res) {
  if (!allowGet(req, res)) return;
  try { sendJson(res, 200, await getWeather(), 'no-store'); }
  catch { sendJson(res, 503, { error: 'Cuaca terbaru belum tersedia. Koneksi atau layanan Open-Meteo sedang bermasalah.' }); }
}
