import { useEffect, useState } from 'react';

let cached;
let pending;
function loadContext() {
  if (cached && Date.now() - Date.parse(cached.fetchedAt) < 6 * 60 * 60 * 1000) return Promise.resolve(cached);
  if (!pending) pending = fetch('/api/osm', { signal: AbortSignal.timeout(30000) }).then(async (response) => {
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Gagal mengambil data OSM.');
    if (data.geojson?.type !== 'FeatureCollection' || !Array.isArray(data.geojson.features)) throw new Error('Format data OSM tidak valid.');
    cached = data;
    return data;
  }).finally(() => { pending = null; });
  return pending;
}

export default function useOsmContext() {
  const [state, setState] = useState({ status: 'loading', context: null, error: null });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setState({ status: 'loading', context: null, error: null });
    loadContext().then((context) => { if (active) setState({ status: 'ready', context, error: null }); }).catch((error) => { if (active) setState({ status: 'error', context: null, error: error.name === 'TimeoutError' ? 'Permintaan OSM melebihi batas waktu. Coba lagi.' : error.message }); });
    return () => { active = false; };
  }, [attempt]);
  return { ...state, retry: () => setAttempt((value) => value + 1) };
}
