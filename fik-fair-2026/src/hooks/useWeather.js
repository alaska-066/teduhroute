import { useEffect, useState } from 'react';
import { WEATHER_REFRESH_MS, weatherIsStale } from '../lib/weather';

let pending;
function loadWeather() {
  if (!pending) pending = fetch('/api/weather', { cache: 'no-store', signal: AbortSignal.timeout(16000) }).then(async (response) => {
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Cuaca tidak tersedia.');
    if (!Number.isFinite(data.current?.time) || !Array.isArray(data.hourly)) throw new Error('Respons cuaca tidak valid.');
    return data;
  }).finally(() => { pending = null; });
  return pending;
}
export default function useWeather() {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const [attempt, setAttempt] = useState(0);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    let active = true;
    setState((previous) => ({ ...previous, loading: true }));
    loadWeather().then((data) => { if (active) setState({ data, loading: false, error: null }); }).catch((error) => { if (active) setState((previous) => ({ ...previous, loading: false, error: error.name === 'TimeoutError' ? 'Permintaan cuaca melewati batas waktu.' : error.message })); });
    return () => { active = false; };
  }, [attempt]);
  useEffect(() => {
    const poll = setInterval(() => { if (!document.hidden) setAttempt((value) => value + 1); }, WEATHER_REFRESH_MS);
    const clock = setInterval(() => setNow(Date.now()), 30000);
    const visible = () => { if (!document.hidden) { setNow(Date.now()); setAttempt((value) => value + 1); } };
    document.addEventListener('visibilitychange', visible);
    return () => { clearInterval(poll); clearInterval(clock); document.removeEventListener('visibilitychange', visible); };
  }, []);
  return { ...state, stale: Boolean(state.error) || weatherIsStale(state.data, now), refresh: () => setAttempt((value) => value + 1) };
}
