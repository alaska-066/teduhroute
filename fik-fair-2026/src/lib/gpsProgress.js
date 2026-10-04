import { distance, length, lineString, nearestPointOnLine } from '@turf/turf';
export function remainingTrip(route, fix, mode, now = Date.now()) {
  if (!route?.coordinates?.length || !fix) return { status:'waiting' };
  if (!Number.isFinite(fix.latitude) || !Number.isFinite(fix.longitude) || Math.abs(fix.latitude)>90 || Math.abs(fix.longitude)>180) return {status:'inaccurate'};
  if (!Number.isFinite(fix.timestamp) || now - fix.timestamp > 30000 || fix.timestamp > now + 5000) return {status:'stale'};
  if (!Number.isFinite(fix.accuracy) || fix.accuracy < 0 || fix.accuracy > 50) return {status:'inaccurate'};
  const line = lineString(route.coordinates.map(([lat,lng])=>[lng,lat]));
  const snapped = nearestPointOnLine(line,[fix.longitude,fix.latitude],{units:'meters'});
  const offset = snapped.properties.dist;
  if (offset > 50) return {status:'off-route',offset:Math.round(offset)};
  const total = length(line,{units:'meters'});
  // At loops/crossings a single GPS fix cannot identify which visit/leg is active.
  let traversed=0; const candidates=[];
  for (let i=1;i<line.geometry.coordinates.length;i++) {
    const segment=lineString(line.geometry.coordinates.slice(i-1,i+1));
    const projection=nearestPointOnLine(segment,[fix.longitude,fix.latitude],{units:'meters'});
    if (projection.properties.dist <= offset + Math.max(5,Math.min(20,fix.accuracy))) candidates.push(traversed+projection.properties.location);
    traversed+=length(segment,{units:'meters'});
  }
  if (candidates.length>1 && Math.max(...candidates)-Math.min(...candidates)>100) return {status:'ambiguous'};
  const remaining = Math.max(0,total-snapped.properties.location);
  const endDistance = distance([fix.longitude,fix.latitude],line.geometry.coordinates.at(-1),{units:'meters'});
  if (remaining <= 20 && endDistance <= 20 && fix.accuracy <= 20) return {status:'arrived',remainingMeters:0,minutes:0};
  const speedLimit = mode === 'motorcycle' ? 40 : 4;
  const measured = Number.isFinite(fix.speed) && fix.speed >= 0 && fix.speed <= speedLimit;
  const stopped = measured && fix.speed < .5;
  const speed = measured ? fix.speed : total / Math.max(60,route.durationMinutes*60);
  return {status:'tracking',remainingMeters:Math.round(remaining),minutes:stopped ? null : Math.ceil(remaining/speed/60),speedSource:stopped ? 'stopped' : measured ? 'gps' : 'model',offset:Math.round(offset)};
}
export function subscribeGps(geolocation, onFix, onError) {
  const id = geolocation.watchPosition((position)=>onFix({latitude:position.coords.latitude,longitude:position.coords.longitude,accuracy:position.coords.accuracy,speed:position.coords.speed,timestamp:position.timestamp}),onError,{enableHighAccuracy:true,maximumAge:0,timeout:15000});
  return () => geolocation.clearWatch(id);
}
