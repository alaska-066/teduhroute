import { useEffect, useMemo, useState } from 'react';

export default function useWalkingRoutes(waypoints, date, hour, mode, at = null, traffic = false) {
  const [attempt, setAttempt] = useState(0);
  const key = useMemo(() => JSON.stringify({ waypoints, date, hour, mode, at, traffic }), [waypoints, date, hour, mode, at, traffic]);
  const [state, setState] = useState({ key: null, status: 'loading', result: null, error: null });
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setState({ key, status: 'loading', result: null, error: null });
    const timer = setTimeout(async () => {
      const timeout = setTimeout(() => controller.abort('timeout'), 45000);
      try {
        const response = await fetch('/api/routes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: key, signal: controller.signal });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Rute tidak dapat dihitung.');
        if (!result.routes?.regular?.length || !result.routes?.shaded?.length || !result.metrics) throw new Error('Respons rute tidak valid.');
        if (active) setState({ key, status: 'ready', result, error: null });
      } catch (error) {
        if (active) setState({ key, status: 'error', result: null, error: controller.signal.aborted ? 'Pencarian rute melewati batas waktu. Coba lagi.' : error.message });
      } finally { clearTimeout(timeout); }
    }, 250);
    return () => { active = false; clearTimeout(timer); controller.abort(); };
  }, [key, attempt]);
  // New controls invalidate old geometry immediately, before the debounce/request completes.
  const current = state.key === key ? state : { status: 'loading', result: null, error: null };
  return { ...current, retry: () => setAttempt((value) => value + 1) };
}
