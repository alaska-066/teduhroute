import {distance} from '@turf/turf';
import {validCoordinate,validateRoutes} from '../src/lib/routeEditing.js';
import {analyzeRoutes} from '../src/lib/routeAnalysis.js';
export function trafficConfigured(){return Boolean(process.env.TOMTOM_API_KEY?.trim());}
export async function fetchTrafficCandidates(waypoints,{key=process.env.TOMTOM_API_KEY,fetcher=fetch}={}) {
 if(!key)throw new Error('Traffic belum dikonfigurasi. Isi TOMTOM_API_KEY di environment server.');
 const locations=waypoints.map(p=>p.join(',')).join(':');
 const url=new URL(`https://api.tomtom.com/routing/1/calculateRoute/${locations}/json`);
 for(const [name,value] of Object.entries({key,travelMode:'motorcycle',traffic:'true',departAt:'now',routeType:'fastest',maxAlternatives:waypoints.length===2?'2':'0',computeTravelTimeFor:'all',routeRepresentation:'polyline'}))url.searchParams.set(name,value);
 for(const value of ['motorways','tollRoads','ferries','unpavedRoads'])url.searchParams.append('avoid',value);
 for(const value of ['travelMode','traffic','motorway','tollRoad','ferry'])url.searchParams.append('sectionType',value);
 let response;
 try{response=await fetcher(url,{signal:AbortSignal.timeout(15000)});}catch{throw new Error('Penyedia traffic tidak dapat dihubungi. Coba lagi atau matikan traffic.');}
 if(!response.ok)throw new Error(`Penyedia traffic gagal (HTTP ${response.status}). Periksa konfigurasi/kuota atau matikan traffic.`);
 const data=await response.json();
 if(!Array.isArray(data.routes)||!data.routes.length)throw new Error('Penyedia traffic tidak menemukan rute motor.');
 return data.routes;
}
export function selectTrafficRoutes(candidates,{waypoints,context,date,hour,at}) {
 const valid=[];
 for(const candidate of candidates.slice(0,3)) {
  const summary=candidate.summary,sections=candidate.sections || [];
  if(!Number.isFinite(summary?.travelTimeInSeconds)||summary.travelTimeInSeconds<=0||!Number.isFinite(summary.lengthInMeters)||summary.lengthInMeters<10||summary.lengthInMeters>10000)continue;
  if(sections.some(s=>['MOTORWAY','TOLL_ROAD','FERRY','PEDESTRIAN'].includes(s.sectionType)||s.simpleCategory==='ROAD_CLOSURE'||(s.sectionType==='TRAVEL_MODE'&&s.travelMode!=='motorcycle')))continue;
  if(!Array.isArray(candidate.legs)||candidate.legs.length!==waypoints.length-1)continue;
  const coordinates=[];const snaps=[];let failed=false;
  candidate.legs.forEach((leg,index)=>{
   const pts=leg.points?.map(p=>[p.latitude,p.longitude]);
   if(!pts||pts.length<2||!pts.every(validCoordinate)){failed=true;return;}
   if(index===0)snaps.push(pts[0]);
   if(index>0&&JSON.stringify(coordinates.at(-1))!==JSON.stringify(pts[0]))failed=true;
   snaps.push(pts.at(-1));coordinates.push(...(index?pts.slice(1):pts));
  });
  if(failed||coordinates.length>4096||snaps.some((p,i)=>distance([p[1],p[0]],[waypoints[i][1],waypoints[i][0]],{units:'meters'})>100))continue;
  try{validateRoutes({regular:coordinates,shaded:coordinates},{maxPoints:4096});}catch{continue;}
  const metrics=analyzeRoutes({date,hour,at,context,routes:{regular:coordinates,shaded:coordinates}});
  const shade=metrics.regular.shadeCoverage || 0;
  valid.push({coordinates,snaps,metrics,distanceMeters:Math.round(summary.lengthInMeters),durationMinutes:Math.ceil(summary.travelTimeInSeconds/60),seconds:summary.travelTimeInSeconds,trafficDelaySeconds:Number.isFinite(summary.trafficDelayInSeconds)?Math.max(0,summary.trafficDelayInSeconds):null,shadeCoverage:shade,shadedMeters:metrics.regular.shadedMeters,score:summary.travelTimeInSeconds*(1+2.5*(1-shade/100))});
 }
 if(!valid.length)throw new Error('Tidak ada rute traffic yang memenuhi batas wilayah, akses motor, dan jarak penyesuaian pin.');
 valid.sort((a,b)=>a.seconds-b.seconds);const regular=valid[0];
 const eligible=valid.filter(r=>r.distanceMeters<=regular.distanceMeters*1.35&&JSON.stringify(r.snaps)===JSON.stringify(regular.snaps));
 eligible.sort((a,b)=>a.score-b.score);const comfortable=eligible[0] || regular;
 const metrics={...regular.metrics,shaded:comfortable.metrics.regular};
 for(const [key,route] of [['regular',regular],['shaded',comfortable]]) {
  metrics[key]={...metrics[key],distanceKm:route.distanceMeters/1000,durationMinutes:route.durationMinutes,calories:null};delete metrics[key].samples;
 }
 const detail=({metrics,snaps,seconds,...route})=>route;
 return {mode:'motorcycle',routes:{regular:regular.coordinates,shaded:comfortable.coordinates},regular:detail(regular),comfortable:detail(comfortable),metrics,sameRoute:JSON.stringify(regular.coordinates)===JSON.stringify(comfortable.coordinates),extraDistancePercent:Math.round((comfortable.distanceMeters/regular.distanceMeters-1)*1000)/10,snaps:regular.snaps.map((coordinate,i)=>({coordinate,requested:waypoints[i],distanceMeters:Math.round(distance([coordinate[1],coordinate[0]],[waypoints[i][1],waypoints[i][0]],{units:'meters'}))})),fetchedAt:context.fetchedAt,source:'TomTom + OpenStreetMap',traffic:{status:'live',provider:'TomTom',fetchedAt:new Date().toISOString(),message:'Rute memakai traffic yang tersedia dari TomTom. Penutupan yang dilaporkan dipertimbangkan. Tidak tersedia data antrean atau hitung mundur tiap lampu merah.'}};
}
