import {test} from 'node:test';
import assert from 'node:assert/strict';
import {indexPlaces,searchPlaces} from '../server/placeService.js';
import {gpsStartCoordinate} from '../src/lib/gpsStart.js';
import {editWaypoints} from '../src/lib/waypoints.js';
import {fetchTrafficCandidates,selectTrafficRoutes} from '../server/trafficService.js';
import {readRouteRequest} from '../api/routes.js';
const a=[-6.22,106.804],b=[-6.22,106.808];
const now=Date.now();const at=new Date(Math.floor(now/60000)*60000).toISOString();
test('GPS start requires fresh accurate fix inside service area and preserves destination/via',()=>{
 const fix={latitude:a[0],longitude:a[1],timestamp:now,accuracy:10};
 assert.deepEqual(gpsStartCoordinate(fix,now),a);
 for(const change of [{timestamp:now-31000},{accuracy:60},{latitude:0},{accuracy:NaN}])assert.throws(()=>gpsStartCoordinate({...fix,...change},now));
 const original=[[-6.219,106.804],[-6.219,106.806],b];
 const next=editWaypoints(original,'move',0,gpsStartCoordinate(fix,now));assert.deepEqual(next.slice(1),original.slice(1));
 assert.deepEqual(editWaypoints(next,'move',2,[-6.221,106.808]).slice(0,2),next.slice(0,2));
});
test('place index searches names and aliases only within service area',()=>{
 const places=indexPlaces([{id:'n1',type:'Feature',properties:{name:'Istora Senayan',alt_name:'Istana Olahraga'},geometry:{type:'Point',coordinates:[a[1],a[0]]}},{id:'n2',type:'Feature',properties:{name:'Outside'},geometry:{type:'Point',coordinates:[0,0]}}]);
 assert.equal(places.length,1);assert.equal(searchPlaces(places,'istana')[0].name,'Istora Senayan');assert.equal(searchPlaces(places,'  SENAYAN ').length,1);assert.equal(searchPlaces(places,'missing').length,0);assert.throws(()=>searchPlaces(places,'a'));
});
const candidate=(seconds=120,extra={})=>({summary:{lengthInMeters:440,travelTimeInSeconds:seconds,trafficDelayInSeconds:30},legs:[{points:[a,b].map(([latitude,longitude])=>({latitude,longitude}))}],sections:[{sectionType:'TRAVEL_MODE',travelMode:'motorcycle'}],...extra});
const options={waypoints:[a,b],date:'2026-10-04',hour:16,context:{geojson:{type:'FeatureCollection',features:[]}}};
test('traffic request uses motorcycle, current traffic, avoidances and protects credentials in failures',async()=>{
 let requested;
 const data=await fetchTrafficCandidates([a,b],{key:'test-secret',fetcher:async(url)=>{requested=url;return {ok:true,json:async()=>({routes:[candidate()]})};}});
 assert.equal(requested.searchParams.get('travelMode'),'motorcycle');assert.equal(requested.searchParams.get('traffic'),'true');assert.equal(requested.searchParams.get('departAt'),'now');assert.ok(requested.searchParams.getAll('avoid').includes('motorways'));assert.equal(data.length,1);
 await assert.rejects(fetchTrafficCandidates([a,b],{key:'test-secret',fetcher:async()=>{throw new Error('test-secret')}}),error=>!error.message.includes('test-secret'));
 await assert.rejects(fetchTrafficCandidates([a,b],{key:''}),/TOMTOM_API_KEY/);
});
test('traffic selection exposes provider ETA and rejects closed, toll, wrong-mode and outside routes',()=>{
 const result=selectTrafficRoutes([candidate(180),candidate(120)],options);
 assert.equal(result.regular.durationMinutes,2);assert.equal(result.regular.trafficDelaySeconds,30);assert.equal(result.traffic.status,'live');assert.equal(result.metrics.regular.calories,null);
 for(const sections of [[{simpleCategory:'ROAD_CLOSURE'}],[{sectionType:'TOLL_ROAD'}],[{sectionType:'TRAVEL_MODE',travelMode:'other'}]])assert.throws(()=>selectTrafficRoutes([candidate(120,{sections})],options));
 assert.throws(()=>selectTrafficRoutes([candidate(120,{legs:[{points:[{latitude:0,longitude:0},{latitude:0,longitude:1}]}]})],options));
});
test('traffic API requires current time and motorcycle mode',async()=>{
 const request=(body)=>readRouteRequest({headers:{'content-type':'application/json'},body:{waypoints:[a,b],...body}});
 await assert.rejects(request({traffic:true,date:'2026-10-04',hour:16,mode:'motorcycle'}));
 await assert.rejects(request({traffic:true,at,mode:'walking'}));
 assert.equal((await request({traffic:true,at,mode:'motorcycle'})).traffic,true);
});
