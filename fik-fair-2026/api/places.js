import {getOsmContext} from '../server/osmService.js';
import {searchPlaces} from '../server/placeService.js';
import {allowGet,sendJson} from '../server/http.js';
export default async function handler(req,res) {
  if(!allowGet(req,res))return;
  const query=new URL(req.url,'http://localhost').searchParams.get('q');
  try {searchPlaces([],query);}catch(e){sendJson(res,400,{error:e.message});return;}
  try {const context=await getOsmContext();sendJson(res,200,{results:searchPlaces(context.places || [],query),source:'OpenStreetMap',fetchedAt:context.fetchedAt},'no-store');}
  catch{sendJson(res,503,{error:'Pencarian lokasi belum tersedia. Coba lagi setelah data OSM termuat.'});}
}
