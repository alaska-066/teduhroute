import { regularRoute } from '../data/routeData.js';
import { validCoordinate } from './routeEditing.js';

export const MAX_WAYPOINTS = 8;
export const defaultWaypoints = () => [[...regularRoute[0]], [...regularRoute.at(-1)]];
export function validateWaypoints(points) {
  if (!Array.isArray(points) || points.length < 2 || points.length > MAX_WAYPOINTS || !points.every(validCoordinate)) throw new Error(`Pilih 2–${MAX_WAYPOINTS} titik di dalam area studi.`);
  return points;
}
export function editWaypoints(points, action, index, coordinate) {
  if (action !== 'remove' && !validCoordinate(coordinate)) throw new Error('Titik di luar area studi. Geser di dalam kotak batas peta.');
  const next = points.map((p) => [...p]);
  if (action === 'insert') next.splice(next.length - 1, 0, [...coordinate]);
  else {
    if (!Number.isInteger(index) || index < 0 || index >= next.length) throw new Error('Titik tidak ditemukan.');
    if (action === 'move') next[index] = [...coordinate];
    else if (action === 'remove' && index > 0 && index < next.length - 1) next.splice(index, 1);
    else throw new Error('Awal dan tujuan tidak dapat dihapus.');
  }
  return validateWaypoints(next);
}
