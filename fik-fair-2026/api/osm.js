import { getOsmContext } from '../server/osmService.js';
import { allowGet, sendJson } from '../server/http.js';

export default async function handler(req, res) {
  if (!allowGet(req, res)) return;
  try {
    // The graph is used only by server routing; do not transfer it to the map UI.
    const { network, places, ...mapContext } = await getOsmContext();
    sendJson(res, 200, mapContext);
  }
  catch { sendJson(res, 503, { error: 'Data OSM belum tersedia. Layanan Overpass sedang sibuk atau koneksi terputus. Coba lagi nanti.' }); }
}
