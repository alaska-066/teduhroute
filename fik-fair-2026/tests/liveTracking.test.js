import {test} from 'node:test';
import assert from 'node:assert/strict';
import {minuteInstant,instantWib} from '../src/lib/liveTime.js';
import {getSolarPosition,projectShadows} from '../src/lib/routeAnalysis.js';
import {remainingTrip,subscribeGps} from '../src/lib/gpsProgress.js';
import {readRouteRequest} from '../api/routes.js';
const now=Date.parse('2026-10-04T09:00:00Z');
const route={coordinates:[[-6.22,106.804],[-6.22,106.808]],durationMinutes:6};
const fix={latitude:-6.22,longitude:106.806,accuracy:5,speed:1,timestamp:now};
test('minute clock handles WIB midnight, invalid instants and night sun',()=>{
 assert.equal(minuteInstant(now+59999),'2026-10-04T09:00:00.000Z');
 assert.deepEqual(instantWib('2026-10-04T17:01:00.000Z'),{date:'2026-10-05',hour:0,minute:1,at:'2026-10-04T17:01:00.000Z'});
 assert.throws(()=>instantWib('2026-02-30T00:00:00.000Z'));
 const sun=getSolarPosition('2026-10-05',0,undefined,'2026-10-04T17:01:00.000Z');
 assert.ok(sun.altitude<0);assert.equal(projectShadows({features:[]},sun).features.length,0);
 assert.notEqual(getSolarPosition('2026-10-04',16,undefined,'2026-10-04T09:01:00.000Z').azimuth,getSolarPosition('2026-10-04',16).azimuth);
});
test('API accepts exact minute instant outside manual slider range',async()=>{
 const r=await readRouteRequest({headers:{'content-type':'application/json'},body:{at:'2026-10-04T17:01:00.000Z',waypoints:route.coordinates}});
 assert.equal(r.hour,0);assert.equal(r.date,'2026-10-05');
});
test('GPS progress computes remaining distance and measured or fallback ETA',()=>{
 const p=remainingTrip(route,fix,'walking',now);
 assert.ok(p.remainingMeters>210&&p.remainingMeters<230);assert.equal(p.minutes,4);assert.equal(p.speedSource,'gps');
 assert.equal(remainingTrip(route,{...fix,speed:null},'walking',now).speedSource,'model');
 assert.equal(remainingTrip(route,{...fix,speed:0},'walking',now).minutes,null);
 assert.equal(remainingTrip(route,{...fix,longitude:106.808},'walking',now).status,'arrived');
});
test('GPS suppresses stale, inaccurate and off-route results',()=>{
 assert.equal(remainingTrip(route,fix,'walking',now+31000).status,'stale');
 assert.equal(remainingTrip(route,{...fix,accuracy:90},'walking',now).status,'inaccurate');
 assert.equal(remainingTrip(route,{...fix,latitude:-6.225},'walking',now).status,'off-route');
 assert.equal(remainingTrip(null,fix,'walking',now).status,'waiting');
});
test('GPS subscription forwards location/errors and clears browser watch',()=>{
 let success,failure,cleared,received,error;
 const geo={watchPosition(ok,bad,options){success=ok;failure=bad;assert.equal(options.maximumAge,0);return 17;},clearWatch(id){cleared=id;}};
 const stop=subscribeGps(geo,value=>received=value,value=>error=value);
 success({coords:fix,timestamp:now});assert.equal(received.longitude,fix.longitude);
 failure({code:1});assert.equal(error.code,1);stop();assert.equal(cleared,17);
});

test('GPS does not claim arrival at start of a closed route',()=>{
 const loop={coordinates:[...route.coordinates,[-6.219,106.808],[-6.219,106.804],route.coordinates[0]],durationMinutes:20};
 assert.equal(remainingTrip(loop,{...fix,longitude:106.804},'walking',now).status,'ambiguous');
 assert.equal(remainingTrip(route,{...fix,latitude:NaN},'walking',now).status,'inaccurate');
});
