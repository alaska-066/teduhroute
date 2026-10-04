// Illustrative corridor geometry, not surveyed pedestrian routing or live data.
export const regularRoute = [
  [-6.2149, 106.8083], [-6.2160, 106.8091], [-6.2173, 106.8101],
  [-6.2186, 106.8110], [-6.2200, 106.8120], [-6.2214, 106.8129],
  [-6.2230, 106.8140], [-6.2247, 106.8150], [-6.2255, 106.8126],
  [-6.2244, 106.8104], [-6.2228, 106.8082], [-6.2215, 106.8066],
];

export const shadedRoute = [
  [-6.2149, 106.8083], [-6.2155, 106.8076], [-6.2164, 106.8070],
  [-6.2172, 106.8064], [-6.2180, 106.8057], [-6.2184, 106.8045],
  [-6.2190, 106.8038], [-6.2200, 106.8035], [-6.2211, 106.8038],
  [-6.2220, 106.8045], [-6.2226, 106.8054], [-6.2222, 106.8063],
  [-6.2215, 106.8066],
];

// All facility points are proposed demo locations. Availability is unverified.
export const coolingShelters = [
  { id: 's1', name: 'Shelter koridor Senayan', coordinates: [-6.2159, 106.8088], description: 'Simulasi halte beratap dengan tempat duduk dan area istirahat.' },
  { id: 's2', name: 'Selasar kawasan GBK', coordinates: [-6.2173, 106.8063], description: 'Simulasi selasar publik beratap, terlindung dari paparan langsung.' },
  { id: 's3', name: 'Lobi sejuk Senayan', coordinates: [-6.2229, 106.8138], description: 'Usulan lobi umum ber-AC. Akses publik dan jam buka belum diverifikasi.' },
  { id: 's4', name: 'Paviliun hijau GBK', coordinates: [-6.2221, 106.8045], description: 'Simulasi paviliun beratap dengan bangku di bawah kanopi pepohonan.' },
];

export const waterStations = [
  { id: 'w1', name: 'Refill pintu koridor', coordinates: [-6.2155, 106.8076], description: 'Usulan titik isi ulang air minum gratis dekat awal perjalanan.' },
  { id: 'w2', name: 'Refill jalur hijau', coordinates: [-6.2184, 106.8045], description: 'Usulan dispenser air minum gratis di jalur hijau GBK.' },
  { id: 'w3', name: 'Refill area olahraga', coordinates: [-6.2210, 106.8038], description: 'Usulan stasiun air minum gratis untuk pejalan kaki dan pelari.' },
  { id: 'w4', name: 'Refill plaza GBK', coordinates: [-6.2216, 106.8068], description: 'Usulan pengisian botol air gratis di area tujuan.' },
];

export const routeEndpoints = {
  start: { name: 'Koridor Sudirman', coordinates: regularRoute[0] },
  end: { name: 'Kawasan Gelora Bung Karno', coordinates: regularRoute.at(-1) },
};

export function getRouteDistance(route) {
  const rad = (value) => value * Math.PI / 180;
  return route.slice(1).reduce((total, point, index) => {
    const previous = route[index];
    const a = Math.sin(rad(point[0] - previous[0]) / 2) ** 2
      + Math.cos(rad(previous[0])) * Math.cos(rad(point[0]))
      * Math.sin(rad(point[1] - previous[1]) / 2) ** 2;
    return total + 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }, 0);
}

const round = (value) => Math.round(value * 10) / 10;

export function getRouteMetrics(hour = 12) {
  const numericHour = Number(hour);
  const safeHour = Number.isFinite(numericHour) ? Math.min(17, Math.max(8, numericHour)) : 12;
  const heatWarning = safeHour >= 11 && safeHour <= 14;
  const intensity = Math.max(0, Math.sin(((safeHour - 7) / 12) * Math.PI));
  const peak = heatWarning ? 1 : intensity * 0.8;
  const makeMetrics = (route, shaded) => {
    const distance = getRouteDistance(route);
    const minutes = Math.ceil(distance / (shaded ? 4.5 : 4.5 - peak * 0.5) * 60);
    return {
      distanceKm: round(distance),
      surfaceTemperature: round((shaded ? 27 : 30) + peak * (shaded ? 6 : 16)),
      feelsLike: round((shaded ? 27 : 29) + peak * (shaded ? 5 : 12)),
      uvIndex: round((shaded ? 0.5 : 2) + intensity * (shaded ? 2 : 9)),
      canopyCoverage: shaded ? Math.round(80 + intensity * 5) : Math.round(18 - intensity * 6),
      durationMinutes: minutes,
      calories: Math.round(minutes * 3.5 * (shaded ? 1 : 1 + peak * 0.05)),
    };
  };
  return { hour: safeHour, heatWarning, regular: makeMetrics(regularRoute, false), shaded: makeMetrics(shadedRoute, true) };
}
