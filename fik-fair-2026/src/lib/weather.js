export const WEATHER_REFRESH_MS = 5 * 60 * 1000;
export const WEATHER_STALE_MS = 10 * 60 * 1000;
export function selectHourlyWeather(data, date, hour) {
  const timestamp = Date.parse(`${date}T${String(hour).padStart(2, '0')}:00:00+07:00`) / 1000;
  return data?.hourly?.find((entry) => entry.time === timestamp) ?? null;
}
export function weatherIsStale(data, now = Date.now()) {
  return !data || !Number.isFinite(Date.parse(data.fetchedAt)) || now - Date.parse(data.fetchedAt) > WEATHER_STALE_MS || now - data.current.time * 1000 > 90 * 60 * 1000;
}
export const formatWeatherTime = (seconds) => new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(seconds * 1000));
export function weatherDescription(code) {
  if (code === 0) return 'Cerah';
  if ([1, 2].includes(code)) return 'Cerah berawan';
  if (code === 3) return 'Berawan';
  if ([45, 48].includes(code)) return 'Berkabut';
  if (code >= 51 && code <= 57) return 'Gerimis';
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return 'Hujan';
  if (code >= 95) return 'Badai petir';
  if ((code >= 71 && code <= 77) || [85, 86].includes(code)) return 'Salju';
  return 'Kondisi tidak tersedia';
}
