// One source of truth for the editor, pedestrian graph, and upstream OSM query.
// Bounds order: south, west, north, east. Preserve the original centre/aspect ratio.
export const ORIGINAL_EDIT_BOUNDS = Object.freeze([-6.2265, 106.8015, -6.2135, 106.8165]);
export const AREA_MULTIPLIER = 2;
const scale = Math.sqrt(AREA_MULTIPLIER);
const [south, west, north, east] = ORIGINAL_EDIT_BOUNDS;
const lat = (south + north) / 2;
const lng = (west + east) / 2;
const halfHeight = (north - south) * scale / 2;
const halfWidth = (east - west) * scale / 2;
export const EDIT_BOUNDS = Object.freeze([lat - halfHeight, lng - halfWidth, lat + halfHeight, lng + halfWidth]);
// 0.0035 degrees is >380 m here, exceeding the model's 300 m shadow limit.
export const OSM_BUFFER_DEGREES = 0.0035;
export const OSM_BOUNDS = Object.freeze(EDIT_BOUNDS.map((value, index) => value + (index < 2 ? -OSM_BUFFER_DEGREES : OSM_BUFFER_DEGREES)));
