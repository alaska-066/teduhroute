export function sendJson(res, status, data, cacheControl = 'public, max-age=300, s-maxage=21600') {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', status === 200 ? cacheControl : 'no-store');
  res.end(JSON.stringify(data));
}
export function allowGet(req, res) {
  if (req.method === 'GET') return true;
  res.setHeader('Allow', 'GET');
  sendJson(res, 405, { error: 'Gunakan GET.' });
  return false;
}
