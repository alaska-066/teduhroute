import { useEffect, useState } from 'react';
import { minuteInstant, instantWib } from '../lib/liveTime.js';
export default function useLiveTime(enabled) {
  const [at, setAt] = useState(minuteInstant);
  useEffect(() => {
    if (!enabled) return;
    const tick = () => { if (!document.hidden) setAt(minuteInstant()); };
    tick();
    const timer = setInterval(tick, 1000);
    document.addEventListener('visibilitychange', tick);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', tick); };
  }, [enabled]);
  return instantWib(at);
}
