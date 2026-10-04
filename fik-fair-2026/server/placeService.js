import { pointOnFeature } from '@turf/turf';
import { validCoordinate } from '../src/lib/routeEditing.js';
export function indexPlaces(features) {
  const results=[];
  for(const feature of features) {
    const tags=feature.properties || {};
    const name=tags['name:id'] || tags.name;
    if(!name || tags.tainted || !feature.geometry) continue;
    try {
      const [lng,lat]=pointOnFeature(feature).geometry.coordinates;
      if(validCoordinate([lat,lng])) results.push({id:String(feature.id),name:String(name),coordinates:[lat,lng],kind:tags.amenity || tags.shop || (tags.highway ? 'jalan' : tags.building ? 'bangunan' : 'tempat'),aliases:[tags.alt_name,tags.short_name,tags['name:en']].filter(Boolean).join(' ')});
    }catch{ /* Ignore invalid source geometry. */ }
  }
  return results;
}
const normalize=(value)=>value.normalize('NFKD').replace(/\p{Diacritic}/gu,'').toLocaleLowerCase('id-ID').trim();
export function searchPlaces(places,query) {
  if(typeof query!=='string' || query.trim().length<2 || query.length>100) throw new Error('Masukkan nama lokasi 2–100 karakter.');
  const needle=normalize(query),terms=needle.split(/\s+/);
  const seen=new Set();
  return places.filter(p=>terms.every(term=>normalize(p.name+' '+p.aliases).includes(term))).sort((a,b)=>Number(normalize(b.name)===needle)-Number(normalize(a.name)===needle)||a.name.localeCompare(b.name)).filter(p=>{const key=p.name+':'+p.coordinates.map(v=>v.toFixed(4)).join(',');if(seen.has(key))return false;seen.add(key);return true;}).slice(0,8).map(({aliases,...place})=>place);
}
