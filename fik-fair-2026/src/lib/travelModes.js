export const TRAVEL_MODES = ['walking', 'motorcycle'];
const allowed = new Set(['yes', 'designated', 'permissive', 'official']);
const motorRoads = new Set(['primary','primary_link','secondary','secondary_link','tertiary','tertiary_link','residential','unclassified','service','living_street']);
const accessKeys = ['motorcycle','motor_vehicle','vehicle','access'];
export function validateMode(mode = 'walking') {
  if (!TRAVEL_MODES.includes(mode)) throw new Error('Moda harus walking atau motorcycle.');
  return mode;
}
export function motorAccess(tags, suffix = '') {
  return accessKeys.map((key) => tags[`${key}${suffix}`]).find((value) => value !== undefined);
}
const hasConditional = (tags) => Object.keys(tags).some((key) => /^(motorcycle|motor_vehicle|vehicle|access|oneway)(:.*)?:conditional$/.test(key));
export function isMotorcycleRoad(tags = {}) {
  if (!motorRoads.has(tags.highway) || tags.area === 'yes' || tags.indoor === 'yes' || tags.construction || tags.motorroad === 'yes' || tags.toll === 'yes' || tags['toll:motorcycle'] === 'yes' || hasConditional(tags)) return false;
  const access = motorAccess(tags);
  return access === undefined || allowed.has(access);
}
export function blocksMotorcycle(tags = {}) {
  const access = motorAccess(tags);
  if (hasConditional(tags) || (access !== undefined && !allowed.has(access))) return true;
  if (!tags.barrier || ['entrance','toll_booth'].includes(tags.barrier)) return false;
  // Gates with explicit motor permission can be traversed; physical bollards/walls cannot.
  return !(['gate','lift_gate','swing_gate'].includes(tags.barrier) && allowed.has(access));
}
export function motorcycleDirection(tags) {
  const oneWay = tags['oneway:motorcycle'] ?? tags['oneway:motor_vehicle'] ?? tags['oneway:vehicle'] ?? tags.oneway ?? (tags.junction === 'roundabout' ? 'yes' : 'no');
  if (!['yes','1','true','-1','no','0','false'].includes(oneWay)) return null;
  const f = motorAccess(tags, ':forward'), b = motorAccess(tags, ':backward');
  const forward = oneWay !== '-1' && (f === undefined || allowed.has(f));
  const backward = !['yes','1','true'].includes(oneWay) && (b === undefined || allowed.has(b));
  return !forward && !backward ? null : forward && backward ? 0 : forward ? 1 : -1;
}
export function motorcycleSpeed(tags) {
  let kmh = ({primary:30,primary_link:20,secondary:25,secondary_link:20,tertiary:20,tertiary_link:15,residential:15,unclassified:15,service:10,living_street:10})[tags.highway] || 15;
  for (const key of ['maxspeed','maxspeed:forward','maxspeed:backward']) {
    const value = String(tags[key] || '');
    if (/^\d+(\.\d+)?(\s*(mph|km\/h))?$/.test(value)) kmh = Math.min(kmh, Number.parseFloat(value) * (value.includes('mph') ? 1.609344 : 1));
    if (value === 'walk') kmh = Math.min(kmh,5);
  }
  if (['sand','mud','gravel','cobblestone','unpaved'].includes(tags.surface)) kmh = Math.min(kmh,10);
  return Math.max(1,kmh) / 3.6;
}
// Full turn-restriction routing needs arrival-edge state. Until supported, exclude
// affected incoming ways rather than silently permitting prohibited turns.
export function restrictedMotorWays(relations = []) {
  const excluded = new Set();
  for (const relation of relations) {
    const tags = relation.tags || {};
    if (String(tags.except || '').split(';').map((s)=>s.trim()).includes('motorcycle')) continue;
    const relevant = ['restriction','restriction:motorcycle','restriction:motor_vehicle','restriction:vehicle'].some((key)=>tags[key] || tags[`${key}:conditional`]);
    if (!relevant) continue;
    for (const member of relation.members || []) if (member.type === 'way' && ['from','via'].includes(member.role)) excluded.add(member.ref);
  }
  return excluded;
}
