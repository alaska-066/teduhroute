import { useCallback, useRef, useState } from 'react';
import { defaultWaypoints, editWaypoints } from '../lib/waypoints';

export default function useRouteEditor() {
  const [waypoints, setWaypoints] = useState(defaultWaypoints);
  const current = useRef(waypoints);
  const history = useRef([]);
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState('');
  const commit = useCallback((next) => {
    history.current = [...history.current.slice(-19), current.current];
    current.current = next;
    setWaypoints(next);
  }, []);
  const update = useCallback((key, action, index, coordinate) => {
    try {
      commit(editWaypoints(current.current, action, index, coordinate));
      setMessage('Titik diperbarui. Hasil pencarian otomatis ditampilkan di bawah.');
      if (action === 'insert') setAdding(false);
      return true;
    } catch (error) { setMessage(error.message); return false; }
  }, [commit]);
  const undo = () => {
    const previous = history.current.pop();
    if (previous) { current.current = previous; setWaypoints(previous); setMessage('Perubahan terakhir dibatalkan. Kedua rute dihitung ulang.'); }
  };
  const reset = () => { commit(defaultWaypoints()); setMessage('Awal dan tujuan dikembalikan. Mencari ulang kedua rute.'); setAdding(false); };
  const toggle = () => { setEditing((value) => !value); setAdding(false); setMessage(''); };
  return { waypoints, editing, adding, setAdding, message, update, undo, reset, toggle, canUndo: history.current.length > 0 };
}
