import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseLevelSvgx,serializeLevelSvgx} from '../src/vector/format.ts';
import {produceDocument} from '../src/authoring/native-producer.ts';

async function fixture() {
  const api=await import('levelspec/gameplay');
  return {api,plan:api.parseGameplayPlan(readFileSync('examples/gameplay/floodgate.gameplay.json','utf8'))};
}

test('native gameplay API publishes a named room without an archetype', async () => {
  const {createGameplay,produceGameplay} = await import('levelspec/gameplay');
  const plan = {format:'levelspec-gameplay/2' as const,id:'room',name:'Room',
    spaces:[{id:'hall',rect:[0,0,8,8] as [number,number,number,number]}],connections:[],
    markers:[{id:'start',space:'hall',kind:'attacker_spawn'}]};
  const proposal=createGameplay(plan);
  assert.equal(proposal.links.length,0);
  const made=await produceGameplay(plan);
  assert.equal(made.report.passed,true);
  assert.equal(made.document.markers[0].id,'start');
  assert.equal(made.document.player.radius,0.35);
});

test('Floodgate publishes arbitrary routes, real elevation and canonical repeatable geometry',async()=>{
  const {api,plan}=await fixture(),a=await api.produceGameplay(plan),b=await api.produceGameplay(plan);
  assert.equal(a.report.passed,true);
  assert.equal(a.text,b.text);
  assert.equal(serializeLevelSvgx(parseLevelSvgx(a.text)),a.text);
  assert.deepEqual(a.document.routes.map(({id,from,to,minRoutes,minDistance,maxDistance})=>({id,from,to,minRoutes,minDistance,maxDistance})),plan.routes);
  assert.deepEqual(a.document.noSpawnLos,plan.noSpawnLos);
  assert.equal(a.document.links.length,0);
  assert.ok(a.document.layers.flatMap(l=>l.regions).some(r=>r.fill==='ramp'));
  assert.ok(a.document.layers.flatMap(l=>l.regions).some(r=>r.fill==='stairs'));
  assert.equal(a.document.covers.length,plan.covers!.length);
  assert.equal(a.document.layers[0].regions.find(r=>r.id==='pump-overlook')!.label,'Pump overlook');
  assert.equal(a.document.layers[0].regions.find(r=>r.id==='pump-overlook')!.role,'high-ground');
  assert.equal(a.document.layers[0].regions.find(r=>r.id==='sluice-bridge')!.role,'fast exposed crossing');
  assert.equal(a.document.markers.find(m=>m.id==='west-spawn')!.label,'West spawn');
  assert.equal(a.document.covers.find(c=>c.id==='west-crate')!.label,'Muster crate');
  assert.ok(a.assessment.routes.every(r=>r.reachable&&r.disjointRoutes>=2&&r.distance>0&&r.travelSeconds!==null&&r.travelSeconds>0));
  assert.deepEqual(a.assessment.elevation,{min:0,max:2});
  assert.ok(a.assessment.sightlines.samples.length>0);
  assert.equal((await produceDocument(parseLevelSvgx(a.text))).report.passed,true);
});

test('slanted fractional footprints and oblique ports publish without grid or axis alignment',async()=>{
  const {api}=await fixture();
  const plan={format:'levelspec-gameplay/2' as const,id:'oblique',name:'Oblique',spaces:[
    {id:'diamond-west',footprint:[[0.125,4.375],[4.125,0.375],[8.125,4.375],[4.125,8.375]] as [number,number][]},
    {id:'diamond-east',footprint:[[14.125,4.375],[18.125,0.375],[22.125,4.375],[18.125,8.375]] as [number,number][]}],
    connections:[{id:'oblique-walk',from:{space:'diamond-west',edge:1},to:{space:'diamond-east',edge:3},width:4}],
    markers:[{id:'s',space:'diamond-west',kind:'attacker_spawn'},{id:'e',space:'diamond-east',kind:'objective'}],routes:[{id:'run',from:'s',to:'e',minRoutes:1}]};
  const before=structuredClone(plan),made=await api.produceGameplay(plan);
  assert.equal(made.report.passed,true);assert.deepEqual(plan,before);
  assert.equal(made.assessment.routes[0].physicalDisjointRoutes,1);
  assert.ok(made.document.layers[0].vertices.some(v=>v.x===0.125&&v.y===4.375));
});

test('one physical mouth cannot satisfy two required routes',async()=>{
  const {api}=await fixture();
  const plan={format:'levelspec-gameplay/2' as const,id:'one-mouth',name:'One mouth',spaces:[
    {id:'a',rect:[0,0,8,8] as [number,number,number,number]},{id:'b',rect:[14,0,8,8] as [number,number,number,number]}],
    connections:[{id:'only',from:{space:'a',edge:1},to:{space:'b',edge:3},width:4}],
    markers:[{id:'s',space:'a',kind:'attacker_spawn'},{id:'e',space:'b',kind:'objective'}],routes:[{id:'two',from:'s',to:'e',minRoutes:2}]};
  await assert.rejects(()=>api.produceGameplay(plan),/ROUTE_REQUIREMENT/);
});

test('rectangle side ports author the same physical corridor and polygon sides reject',async()=>{
  const {api}=await fixture();
  const p={format:'levelspec-gameplay/2' as const,id:'sides',name:'Named sides',spaces:[
    {id:'a',rect:[0,0,8,8] as [number,number,number,number]},{id:'b',rect:[14,0,8,8] as [number,number,number,number]}],
    connections:[{id:'walk',from:{space:'a',side:'east' as const},to:{space:'b',side:'west' as const},width:4}],
    markers:[{id:'s',space:'a',kind:'attacker_spawn'},{id:'e',space:'b',kind:'objective'}],routes:[{id:'run',from:'s',to:'e',minRoutes:1}]};
  const named=await api.produceGameplay(p);
  assert.equal(named.report.passed,true);
  const indexed=await api.produceGameplay({...p,connections:[{...p.connections[0],from:{space:'a',edge:1},to:{space:'b',edge:3}}]});
  assert.equal(named.text,indexed.text);
  assert.throws(()=>api.parseGameplayPlan(JSON.stringify({...p,spaces:[{id:'a',footprint:[[0,0],[8,0],[8,8],[0,8]]},p.spaces[1]]})),/side.*rect|rect.*side/i);
  assert.throws(()=>api.parseGameplayPlan(JSON.stringify({...p,connections:[{...p.connections[0],from:{space:'a',side:'east',edge:1}}]})),/port/);
});

test('redundant collinear boundary vertices cannot manufacture disjoint routes',async()=>{
  const {api}=await fixture();
  const plan={format:'levelspec-gameplay/2' as const,id:'collinear',name:'One opening',spaces:[
    {id:'a',footprint:[[0,0],[8,0],[8,4],[8,8],[0,8]] as [number,number][]},{id:'b',rect:[8,0,8,8] as [number,number,number,number]}],connections:[],
    markers:[{id:'s',space:'a',kind:'attacker_spawn'},{id:'e',space:'b',kind:'objective'}],routes:[{id:'two',from:'s',to:'e',minRoutes:2}]};
  await assert.rejects(()=>api.produceGameplay(plan),/ROUTE_REQUIREMENT|physical.*route/i);
});

test('a contiguous L opening has one physical route while separated mouths provide two',async()=>{
  const {api}=await fixture();
  const base={format:'levelspec-gameplay/2' as const,id:'physical',name:'Physical openings',spaces:[
    {id:'a',footprint:[[0,0],[10,0],[10,4],[6,4],[6,10],[0,10]] as [number,number][]},{id:'b',rect:[6,4,4,6] as [number,number,number,number]}],connections:[],
    markers:[{id:'s',space:'a',kind:'attacker_spawn',position:[2,2] as [number,number]},{id:'e',space:'b',kind:'objective',position:[8,7] as [number,number]}],routes:[{id:'run',from:'s',to:'e',minRoutes:2}]};
  await assert.rejects(()=>api.produceGameplay(base),/PHYSICAL_ROUTE_REQUIREMENT/);
  const one=await api.produceGameplay({...base,routes:[{...base.routes[0],minRoutes:1}]});
  assert.equal(one.assessment.routes[0].physicalDisjointRoutes,1);
  assert.equal(one.assessment.routes[0].disjointRoutes,2,'native edge count is disclosed separately');
  const two=await api.produceGameplay({...base,spaces:[
    {id:'a',footprint:[[0,0],[8,0],[8,4],[6,4],[6,8],[8,8],[8,12],[0,12]]},
    {id:'b',rect:[8,0,8,12]}],markers:[{...base.markers[0],position:[2,6]},{...base.markers[1],position:[12,6]}]});
  assert.equal(two.assessment.routes[0].physicalDisjointRoutes,2);
});

test('closing physical approaches rejects unchanged required routes',async()=>{
  const {api,plan}=await fixture(),d=api.createGameplay(plan),layer=d.layers[0];
  for(const id of ['sluice-bridge','covered-turn-west','lower-access-west']) {
    const region=layer.regions.find(r=>r.id===id)!;
    const host=layer.regions.find(r=>r.id==='west-muster')!;
    const shared=region.boundary.map(e=>e.replace(/^-/,'')).filter(e=>host.boundary.some(h=>h.replace(/^-/,'')===e));
    assert.ok(shared.length>0);
    for(const edge of layer.edges.filter(e=>shared.includes(e.id))){edge.kind='wall';edge.height=3;edge.openings=[];}
  }
  await assert.rejects(()=>produceDocument(d),/ROUTE_REQUIREMENT|UNREACHABLE/);
  assert.equal(d.routes[0].minRoutes,2);
});

test('runtime failures preserve source player, cover and visibility requirements',async()=>{
  const {api}=await fixture();
  const base={format:'levelspec-gameplay/2' as const,id:'negative',name:'Negative',spaces:[{id:'a',rect:[0,0,8,8] as [number,number,number,number]}],connections:[],
    markers:[{id:'start',space:'a',kind:'attacker_spawn',position:[2,4] as [number,number]},{id:'end',space:'a',kind:'objective',position:[6,4] as [number,number]}],
    routes:[{id:'run',from:'start',to:'end',minRoutes:1,minDistance:1,maxDistance:20}]};
  await assert.rejects(()=>api.produceGameplay({...base,noSpawnLos:[['start','end']]}),/SPAWN_LOS/);
  await assert.rejects(()=>api.produceGameplay({...base,spaces:[...base.spaces,{id:'island',rect:[20,0,8,8]}],markers:[...base.markers,{id:'lost',space:'island',kind:'objective'}]}),/UNREACHABLE|NAV_/);
  await assert.rejects(()=>api.produceGameplay({...base,spaces:[{...base.spaces[0],headroom:0.8,roof:true}]}),/HEADROOM|UNREACHABLE|NAV_/);
  const beam={id:'beam',space:'a',position:[4,4,0.46] as [number,number,number],size:[2,1,0.5] as [number,number,number]};
  assert.equal(api.createGameplay({...base,covers:[beam]}).covers.length,1);
  await assert.rejects(()=>api.produceGameplay({...base,covers:[beam]}),/HEADROOM/);
  const player={radius:0.4,height:1.9,step:0.3,slope:37,crouch:1.2,vault:0,rappel:true,ladder:true};
  assert.deepEqual((await api.produceGameplay({...base,player})).document.player,player);
  const narrow={...base,spaces:[{id:'a',rect:[0,0,8,8] as [number,number,number,number]},{id:'b',rect:[12,0,8,8] as [number,number,number,number]}],
    connections:[{id:'thin',from:{space:'a',edge:1},to:{space:'b',edge:3},width:0.5}],markers:[base.markers[0],{...base.markers[1],space:'b',position:[16,4] as [number,number]}]};
  await assert.rejects(()=>api.produceGameplay(narrow),/ROUTE_REQUIREMENT|WIDTH|UNREACHABLE|NAV_/);
});

test('concave adjacent partial runs split T junctions and retain collision-free source IDs',async()=>{
  const {api}=await fixture();
  const plan={format:'levelspec-gameplay/2' as const,id:'irregular',name:'Irregular',spaces:[
    {id:'_gameplay',footprint:[[0,0],[10,0],[10,4],[6,4],[6,10],[0,10]] as [number,number][]},
    {id:'_gameplay/edge',rect:[6,4,4,6] as [number,number,number,number]},
    {id:'tail',rect:[10,2,6,6] as [number,number,number,number]}],connections:[],
    markers:[{id:'_gameplay/vertex',space:'_gameplay',kind:'attacker_spawn',position:[2,2] as [number,number]},
      {id:'finish',space:'tail',kind:'objective'}],routes:[{id:'_gameplay/layer',from:'_gameplay/vertex',to:'finish',minRoutes:1}]};
  const made=await api.produceGameplay(plan),d=made.document;
  assert.equal(made.report.passed,true);
  for(const id of ['_gameplay','_gameplay/edge','tail'])assert.ok(d.layers[0].regions.some(r=>r.id===id));
  const ids=[d.id,...d.layers.flatMap(l=>[l.id,...l.vertices.map(x=>x.id),...l.edges.map(x=>x.id),...l.regions.map(x=>x.id)]),...d.markers.map(x=>x.id),...d.routes.map(x=>x.id),...d.materials.map(x=>x.id)];
  assert.equal(new Set(ids).size,ids.length);
  const stacked=api.createGameplay({...plan,spaces:[{id:'low',rect:[0,0,8,8],z:0},{id:'high',rect:[0,0,8,8],z:4}],markers:[{id:'s',space:'low',kind:'attacker_spawn'},{id:'e',space:'high',kind:'objective'}],routes:[{id:'r',from:'s',to:'e',minRoutes:1}]});
  await assert.rejects(()=>produceDocument(stacked),/ROUTE_REQUIREMENT|UNREACHABLE|NAV_/);
});

test('malformed plans, impossible ports and unknown references are explicit errors',async()=>{
  const {api,plan}=await fixture();
  for(const patch of [{format:'levelspec-gameplay/1'},{moveSpeed:0},{surprise:true},{label:'unsupported root label'},{routes:null},{covers:null},{noSpawnLos:null},{spaces:[{id:'bad',footprint:[[0,0],[2,2],[0,2],[2,0]]}]},
    {connections:[{id:'bad',from:{space:'missing',edge:0},to:{space:'west-muster',edge:1},width:2}]},
    {connections:[{id:'bad',from:{space:'west-muster',edge:1,at:0},to:{space:'east-lock',edge:3},width:4}]},
    {markers:[{id:'bad',space:'unknown',kind:'objective'}]}, {routes:[{id:'bad',from:'unknown',to:'unknown',minRoutes:2}]}])
    assert.throws(()=>api.parseGameplayPlan(JSON.stringify({...plan,...patch})),/gameplay|space|port|footprint|marker|route|moveSpeed|Unknown/i);
  const controller=new AbortController();controller.abort();
  await assert.rejects(()=>api.produceGameplay(plan,{signal:controller.signal}),{name:'AbortError'});
});

test('publication snapshots source assessment values and propagates cancellation during compile',async()=>{
  const {api,plan}=await fixture(),speed=plan.moveSpeed;
  const made=await api.produceGameplay(plan,{onProgress:()=>{plan.moveSpeed=100;}});
  assert.equal(made.assessment.moveSpeed,speed);
  const controller=new AbortController();
  await assert.rejects(()=>api.produceGameplay(plan,{signal:controller.signal,onProgress:()=>controller.abort()}),{name:'AbortError'});
});

test('physical entrance evidence resolves native markers without explicit region IDs',async()=>{
  const {api}=await fixture(),{physicalRouteEvidence,requirePhysicalRoutes}=await import('../src/authoring/physical-routes.ts');
  const p={format:'levelspec-gameplay/2' as const,id:'infer-region',name:'Inferred markers',spaces:[
    {id:'a',footprint:[[0,0],[8,0],[8,4],[6,4],[6,8],[8,8],[8,12],[0,12]] as [number,number][]},{id:'b',rect:[8,0,8,12] as [number,number,number,number]}],connections:[],
    markers:[{id:'s',space:'a',kind:'attacker_spawn',position:[2,6] as [number,number]},{id:'e',space:'b',kind:'objective',position:[12,6] as [number,number]}],routes:[{id:'run',from:'s',to:'e',minRoutes:2}]};
  const document=api.createGameplay(p);for(const marker of document.markers)delete marker.region;
  for(const region of document.layers[0].regions)delete region.area;
  const made=await produceDocument(document),evidence=physicalRouteEvidence(made.level,(made.report.sealed??made.report.navigation)!);
  assert.equal(evidence.routes[0].physicalDisjointRoutes,2);
  requirePhysicalRoutes(made.level,evidence);
});
