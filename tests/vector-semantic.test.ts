import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createSemantic,produceSemantic,type NativeSemanticPlan} from '../src/authoring/semantic.ts';

const room=():NativeSemanticPlan=>({format:'levelspec-semantic/2',id:'semantic_room',name:'Room',grid:1,layers:[{id:'ground',height:4}],areas:[{id:'room',rects:[[0,0,12,12]]}]});
test('native semantic rect unions, concavity, holes, cover and relative elevation publish',async()=>{
  const p=room();p.layers[0].z=2;p.areas[0].z=.3;p.areas[0].holes=[[4,4,4,4]];p.areas[0].rects!.push([12,0,4,5]);
  p.covers=[{id:'crate',label:'Retained crate',rect:[2,2,1,1],height:1}];
  const r=await produceSemantic(p);assert.equal(r.report.passed,true);assert.equal(r.document.covers[0].min[2],2.3);assert.equal(r.document.covers[0].label,'Retained crate');
  assert.equal(r.document.links.length,0);assert.equal(r.document.player.height,1.8);assert.equal(r.document.floorThickness,.25);
});
test('single physical mouth cannot gain route capacity from native floor tiling',async()=>{
  const p=room();p.areas=[{id:'a',rects:[[0,0,8,12]],holes:[[2,2,2,2]]},{id:'b',rects:[[8,0,8,12]]}];
  p.markers=[{id:'start',area:'a',kind:'spawn'},{id:'end',area:'b',kind:'site'}];p.routes=[{id:'route',from:'start',to:'end',minRoutes:2}];
  await assert.rejects(produceSemantic(p),/PHYSICAL_ROUTE_REQUIREMENT|ROUTE/);
  p.portals=[{id:'south',between:['a','b'],kind:'door',width:3,at:[8,2.5]},{id:'north',between:['a','b'],kind:'door',width:3,at:[8,9.5]}];
  const r=await produceSemantic(p);assert.equal(r.physical.routes[0].physicalDisjointRoutes,2);
});
test('native steps retain explicit open riser seams without welding different storeys',async()=>{
  const p=room();p.areas=[{id:'a',rects:[[0,0,8,12]]},{id:'b',rects:[[8,0,8,12]],z:.4}];
  assert.equal((await produceSemantic(p)).document.seams.length,1);
  p.layers.push({id:'up',z:4,height:4});p.areas.push({id:'uproom',layer:'up',rects:[[0,0,16,12]]});
  await assert.rejects(produceSemantic(p),/NAV|ISLAND|unreach|connect/i);
});
test('same-layer ramps and two-layer stairs are actual native flights and punch slabs',async()=>{
  const p=room();p.areas=[{id:'low',rects:[[0,0,8,12]]},{id:'high',rects:[[8,0,8,12]],z:2}];
  p.flights=[{id:'ramp',kind:'ramp',from:{layer:'ground',cell:[4,5]},to:{layer:'ground',cell:[10,5]},width:3}];
  let r=await produceSemantic(p);assert.equal(r.document.layers.flatMap(l=>l.regions).filter(r=>r.fill==='ramp').length,1);
  const q=room();q.layers.push({id:'upper',z:4,height:4});q.areas.push({id:'upper_room',layer:'upper',rects:[[0,0,12,12]]});
  q.flights=[{id:'stairs',kind:'stairs',from:{layer:'ground',cell:[2,5]},to:{layer:'upper',cell:[8,5]},width:3}];
  r=await produceSemantic(q);assert.equal(r.document.links.length,0);assert.equal(r.document.layers.flatMap(l=>l.regions).filter(r=>r.fill==='stairs').length,1);
});
test('semantic flags and hard constraints remain strict, including invalid cover',async()=>{
  const p=room();p.player={radius:.4,height:1.9,step:.3,crouch:1.2,vault:0};p.expectFail=true;
  assert.equal(createSemantic(p).expectFail,true);await assert.rejects(produceSemantic(p),/expected-failure/);delete p.expectFail;p.validation='premap';await assert.rejects(produceSemantic(p),/premap/);
  delete p.validation;p.covers=[{id:'off_floor',rect:[30,30,2,2],height:1}];assert.throws(()=>createSemantic(p),/No floor/);
});
test('disconnected components of one source area cannot alias physical routes',async()=>{
  const p=room();p.areas=[{id:'a',rects:[[0,0,8,8],[8,8,8,8]]},{id:'b',rects:[[8,0,8,8]]},{id:'t',rects:[[16,0,8,16]]}];
  p.markers=[{id:'start',area:'a',kind:'spawn',position:[4,4]},{id:'end',area:'t',kind:'site',position:[20,4]}];p.routes=[{id:'walk',from:'start',to:'end',minRoutes:2}];
  await assert.rejects(produceSemantic(p),/ROUTE_REQUIREMENT/);
  p.markers[0].area='b';p.markers[0].position=[12,4];const r=await produceSemantic(p);assert.equal(r.physical.routes[0].physicalDisjointRoutes,2);
});
test('portals across a retaining step preserve independent openings and real wall piers',async()=>{
  const p=room();p.areas=[{id:'a',rects:[[0,0,8,12]]},{id:'b',rects:[[8,0,8,12]],z:.35}];
  p.markers=[{id:'a_start',area:'a',kind:'spawn'},{id:'b_end',area:'b',kind:'site'}];p.routes=[{id:'walk',from:'a_start',to:'b_end',minRoutes:2}];
  p.portals=[{id:'door_one',between:['a','b'],kind:'door',width:3,at:[8,2.5]},{id:'door_two',between:['a','b'],kind:'arch',width:3,at:[8,9.5],head:2.6}];
  const r=await produceSemantic(p);assert.equal(r.physical.routes[0].physicalDisjointRoutes,2);assert.ok(r.document.seams.some(s=>s.kind==='wall'));
});
test('semantic generated IDs cannot collide with source metadata or disconnected component names',async()=>{
  const p=room();p.id='semantic/floor/room';p.markers=[{id:'semantic/floor/room.1',area:'room',kind:'spawn'}];
  assert.equal((await produceSemantic(p)).document.markers[0].id,p.markers[0].id);
  const q=room();q.areas=[{id:'a',rects:[[0,0,8,8],[8,8,8,8]]},{id:'a/component_0',rects:[[8,0,8,8]]}];
  const d=createSemantic(q),areas=new Set(d.layers.flatMap(l=>l.regions.map(r=>r.area)));assert.equal(areas.size,3);
});
