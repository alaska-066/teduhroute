export function minuteInstant(now = Date.now()) { return new Date(Math.floor(now / 60000) * 60000).toISOString(); }
export function instantWib(at) {
  if (typeof at !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00\.000Z$/.test(at) || !Number.isFinite(Date.parse(at)) || new Date(at).toISOString() !== at) throw new Error('Waktu sekarang harus timestamp UTC pada menit yang valid.');
  const local = new Date(Date.parse(at) + 7 * 3600000).toISOString();
  return { date: local.slice(0,10), hour: Number(local.slice(11,13)), minute: Number(local.slice(14,16)), at };
}
