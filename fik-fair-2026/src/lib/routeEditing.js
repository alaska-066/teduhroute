import { length, lineString, point, pointToLineDistance } from '@turf/turf';
import { regularRoute, shadedRoute } from '../data/routeData.js';

import { EDIT_BOUNDS } from './studyArea.js';
export { EDIT_BOUNDS } from './studyArea.js';
export const MAX_POINTS = 64;
export const defaultRoutes = () => ({ regular: regularRoute.map((p) => [...p]), shaded: shadedRoute.map((p) => [...p]) });
export function validCoordinate(value) {
  const [south, west, north, east] = EDIT_BOUNDS;
  return Array.isArray(value) && value.length === 2 && value.every(Number.isFinite) && value[0] >= south && value[0] <= north && value[1] >= west && value[1] <= east;
}
export function validateRoutes(routes, { maxPoints = MAX_POINTS } = {}) {
  for (const key of ['regular', 'shaded']) {
    if (!Array.isArray(routes?.[key]) || routes[key].length < 2 || routes[key].length > maxPoints || !routes[key].every(validCoordinate)) throw new Error(`Rute harus memiliki 2–${maxPoints} titik di dalam batas area studi.`);
    const km = length(lineString(routes[key].map(([lat, lng]) => [lng, lat])));
    if (km < 0.01 || km > 10) throw new Error('Panjang setiap rute harus 10 meter hingga 10 km.');
  }
  for (const index of [0, -1]) {
    if (routes.regular.at(index).some((value, axis) => value !== routes.shaded.at(index)[axis])) throw new Error('Titik awal dan tujuan kedua rute harus sama.');
  }
  return routes;
}
export function editRoute(routes, key, action, index, coordinate) {
  if (!['regular', 'shaded'].includes(key)) throw new Error('Pilihan rute tidak valid.');
  if (action !== 'remove' && !validCoordinate(coordinate)) throw new Error('Titik di luar area studi. Geser di dalam kotak batas pada peta.');
  const next = { regular: routes.regular.map((p) => [...p]), shaded: routes.shaded.map((p) => [...p]) };
  const route = next[key];
  if (action === 'insert') {
    if (route.length >= MAX_POINTS) throw new Error(`Maksimum ${MAX_POINTS} titik per rute.`);
    const target = point([coordinate[1], coordinate[0]]);
    let nearest = 0;
    let distance = Infinity;
    for (let i = 0; i < route.length - 1; i++) {
      const d = pointToLineDistance(target, lineString([route[i], route[i + 1]].map(([lat, lng]) => [lng, lat])));
      if (d < distance) { distance = d; nearest = i; }
    }
    route.splice(nearest + 1, 0, [...coordinate]);
  } else {
    if (!Number.isInteger(index) || index < 0 || index >= route.length) throw new Error('Titik tidak ditemukan.');
    if (action === 'remove') {
      if (index === 0 || index === route.length - 1) throw new Error('Titik awal dan tujuan tidak dapat dihapus.');
      route.splice(index, 1);
    } else if (action === 'move') {
      route[index] = [...coordinate];
      if (index === 0 || index === route.length - 1) {
        const other = key === 'regular' ? 'shaded' : 'regular';
        next[other][index === 0 ? 0 : next[other].length - 1] = [...coordinate];
      }
    } else throw new Error('Aksi penyuntingan tidak valid.');
  }
  return validateRoutes(next);
}
