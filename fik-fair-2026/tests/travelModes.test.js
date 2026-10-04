import {test} from 'node:test';
import assert from 'node:assert/strict';
import {isMotorcycleRoad,blocksMotorcycle,motorcycleDirection,motorcycleSpeed,restrictedMotorWays} from '../src/lib/travelModes.js';
import {buildWalkingGraph,shortestPath,routeOnGraph} from '../src/lib/walkingRouter.js';
import {readRouteRequest,createRoutesHandler} from '../api/routes.js';
const points=[[-6.22,106.804],[-6.22,106.808],[-6.2195,106.804],[-6.2195,106.808]];
const network=()=>({nodes:points.map(([lat,lon],id)=>({id,lat,lon,tags:{}})),ways:[{id:10,nodes:[0,1],tags:{highway:'residential'}},{id:20,nodes:[0,2,3,1],tags:{highway:'residential',covered:'yes'}}]});
test('motorcycle excludes pedestrian infrastructure, toll roads, restrictions and conditional access',()=>{
  for(const highway of ['footway','pedestrian','steps','cycleway','path','motorway','trunk','construction']) assert.equal(isMotorcycleRoad({highway,motorcycle:'yes'}),false);
  for(const tags of [{motorcycle:'no'},{motor_vehicle:'no'},{access:'private'},{access:'destination'},{toll:'yes'},{'motorcycle:conditional':'yes @ (Mo-Fr)'}]) assert.equal(isMotorcycleRoad({highway:'residential',...tags}),false);
  assert.equal(isMotorcycleRoad({highway:'primary',foot:'no'}),true);
  assert.equal(isMotorcycleRoad({highway:'residential',motor_vehicle:'no',motorcycle:'yes'}),true);
  assert.equal(blocksMotorcycle({barrier:'bollard',foot:'yes'}),true);
  assert.equal(blocksMotorcycle({barrier:'gate',motorcycle:'yes'}),false);
});
test('motorcycle follows one-way, reverse direction and roundabout; walking remains independent',()=>{
  assert.equal(motorcycleDirection({oneway:'yes'}),1);
  assert.equal(motorcycleDirection({oneway:'-1'}),-1);
  assert.equal(motorcycleDirection({junction:'roundabout'}),1);
  assert.equal(motorcycleDirection({junction:'roundabout',oneway:'no'}),0);
  assert.equal(motorcycleDirection({oneway:'yes','oneway:motorcycle':'no'}),0);
  assert.equal(motorcycleDirection({oneway:'reversible'}),null);
  const raw=network();raw.ways=[{...raw.ways[0],tags:{highway:'residential',oneway:'yes'}}];
  assert.equal(shortestPath(buildWalkingGraph(raw,'motorcycle'),1,0),null);
  assert.ok(shortestPath(buildWalkingGraph(raw,'walking'),1,0));
});
test('motor travel time uses capped speeds and comfortable route still prefers shade',()=>{
  assert.ok(motorcycleSpeed({highway:'primary',maxspeed:'10'})<=10/3.6);
  const motor=routeOnGraph(buildWalkingGraph(network(),'motorcycle'),points.slice(0,2));
  const walk=routeOnGraph(buildWalkingGraph(network()),points.slice(0,2));
  assert.ok(motor.regular.durationMinutes < walk.regular.durationMinutes);
  assert.equal(motor.mode,'motorcycle');assert.deepEqual(motor.comfortable.wayIds,[20]);
});
test('motor turn restriction relations conservatively exclude affected ways and honor motorcycle exception',()=>{
  const relation={tags:{restriction:'no_left_turn'},members:[{role:'from',type:'way',ref:10},{role:'to',type:'way',ref:20}]};
  assert.ok(restrictedMotorWays([relation]).has(10));
  assert.equal(restrictedMotorWays([{...relation,tags:{...relation.tags,except:'motorcycle'}}]).size,0);
  const raw=network();raw.restrictions=[relation];
  assert.ok(buildWalkingGraph(raw,'motorcycle').edges.every(e=>e.wayId!==10));
  assert.ok(buildWalkingGraph(raw).edges.some(e=>e.wayId===10));
});
test('API rejects unknown mode and provides motorcycle metrics without walking calories',async()=>{
  const body={date:'2026-10-04',hour:16,mode:'car',waypoints:points.slice(0,2)};
  await assert.rejects(readRouteRequest({headers:{'content-type':'application/json'},body}),/Moda/);
  const handler=createRoutesHandler(async()=>({network:network(),geojson:{type:'FeatureCollection',features:[]},source:'test'}));
  let result;const res={setHeader(){},end(data){result=JSON.parse(data)}};
  await handler({method:'POST',headers:{'content-type':'application/json'},body:{...body,mode:'motorcycle'}},res);
  assert.equal(res.statusCode,200);assert.equal(result.mode,'motorcycle');assert.equal(result.metrics.regular.calories,null);
});
