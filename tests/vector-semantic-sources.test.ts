import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createSemantic,produceSemantic,publishSemanticDocument,type NativeSemanticPlan} from '../src/authoring/semantic.ts';
import {applySemanticDirectives} from '../src/authoring/semantic-directives.ts';
import {parsePythonDeclarations,composePythonDeclarations} from '../src/authoring/semantic-python.ts';
import {decodeSemanticSource} from '../src/authoring/semantic-sources.ts';
import {projectNativeFloor,retainNativeAuthorship} from '../src/authoring/semantic-native-source.ts';
import {semanticProfile} from '../src/authoring/semantic-profiles.ts';
import {SceneBuilder} from '../src/vector/authoring.ts';
import {boxGeometry} from '../src/vector/props.ts';
import {publishPythonCandidates} from '../src/authoring/semantic-python-publish.ts';
import {prepareNativeAnnotation,createNativeAnnotation} from '../src/authoring/semantic-native-annotation.ts';

const plan=():NativeSemanticPlan=>({format:'levelspec-semantic/2',id:'source',name:'Source',grid:1,layers:[{id:'ground',height:4}],areas:[{id:'west',rects:[[0,0,10,12]]},{id:'east',rects:[[10,0,10,12]]}]});
test('annotation preserves semantic player limits and rejects conflicting sources',async()=>{
  const input={...plan(),player:{radius:.42,height:1.9,step:.3,ladder:false,rappel:true}};
  const decoded=await decodeSemanticSource(JSON.stringify(input),'.json');
  assert.equal(decoded.kind,'semantic');if(decoded.kind!=='semantic')return;
  for(const source of [decoded.plan,input]){
    const d={ID:'annotation',NAME:'Annotation',AREAS:[{id:'room',seeds:[[3,3,1,1]] as [number,number,number,number][]}]};
    for(const [field,value] of Object.entries(source.player!)) {
      assert.throws(()=>composePythonDeclarations({...d,PLAYER:{[field]:typeof value==='boolean'?!value:value!+.1}},new Map([['ground',source]])),/preserve.*PLAYER.*(radius|height|step|crouch|ladder|rappel)/i);
    }
    const retained=composePythonDeclarations({...d,PLAYER:{...source.player,slope:37}},new Map([['ground',source]]));assert.deepEqual(retained.player,{...source.player,slope:37});
    const second={...source,player:{...source.player,radius:.35}};
    assert.throws(()=>composePythonDeclarations(d,new Map([['ground',source],['other',second]])),/preserve.*PLAYER.*radius/i);
    assert.throws(()=>composePythonDeclarations(d,new Map([['ground',source],['other',{...source,player:{ladder:true}}]])),/preserve.*PLAYER.*ladder/i);
    const supplement=composePythonDeclarations({...d,PLAYER:{crouch:1.3}},new Map([['ground',source],['other',{...source,player:{slope:37}}]]));
    assert.deepEqual(supplement.player,{...source.player,crouch:1.3,slope:37});
  }
});
test('direct semantic grammar retains quoted marks, distances, movement, LOS, walls and portal head/sill',async()=>{
  const p=plan();applySemanticDirectives(p,['mark attacker_spawn west attack "West \\"Entry\\""','mark site east neutral "East"','route west east 1 minDistance=1 maxDistance=100 movement=land','wall west east','door west east 3 at=10,5 head=2.8 sill=0']);
  const r=await produceSemantic(p);assert.equal(r.document.markers[0].label,'West "Entry"');assert.equal(r.document.routes[0].maxDistance,100);assert.equal(r.document.routes[0].movement,'land');
  applySemanticDirectives(p,['no_spawn_los west east']);assert.equal(createSemantic(p).noSpawnLos.length,1);
  for(const line of ['route absent east 2','no_spawn_los west missing','unknown hello','mark site missing','stairs ground 1,1 nope upper 2,1','route west east 1 ignored=3','door west east 2 bad=2'])assert.throws(()=>{const q=plan();applySemanticDirectives(q,[line]);createSemantic(q);});
  assert.throws(()=>applySemanticDirectives(plan(),['mark site west neutral "unclosed']),/Unterminated/);
});
test('Python data normalization retains source defaults, legal cover diagnostics and physical flights',async()=>{
  const declarations={ID:'python_data',NAME:'Native Python data',GRID:1,WIDTH:20,HEIGHT:12,
    AREAS:[{id:'low',rects:[[0,0,10,12]],ceiling:5},{id:'high',rects:[[10,0,10,12]],z:2,ceiling:5}],
    RAMPS:[{id:'slope',label:'Ramp',at:[[7,4,6,3]]}],COVER:[{id:'crate',label:'Crate',height:1.2,at:[[2,2,3,2]]}],
    DIRECTIVES:['mark spawn low','mark site high','route low high 1'],PLAYER:{radius:.35,height:1.8,step:.45,crouch:1.1,vault:0}};
  const p=composePythonDeclarations(parsePythonDeclarations(JSON.stringify({format:'levelspec-python/1',declarations})));
  assert.equal(p.placementDiagnostics![0].proposed,6);assert.ok(p.placementDiagnostics![0].placed>0);assert.equal(p.flights![0].kind,'ramp');assert.equal((await produceSemantic(p)).report.passed,true);
  const q=structuredClone(declarations);q.COVER[0].at=[[50,50,2,2]];const omitted=composePythonDeclarations(parsePythonDeclarations(JSON.stringify({format:'levelspec-python/1',declarations:q})));
  assert.equal(omitted.placementDiagnostics![0].id,'crate');assert.equal(omitted.placementDiagnostics![0].placed,0);assert.equal(omitted.placementDiagnostics![0].omitted,4);assert.equal(omitted.covers?.length??0,0);
  assert.throws(()=>parsePythonDeclarations(JSON.stringify({format:'levelspec-python/1',declarations:{...declarations,IGNORE_ROUTE:true}})),/unsupported fields/);
});
test('native source annotation retains authored player, covers, markers, routes, LOS and failure modes',()=>{
  const p=plan();p.player={radius:.4,height:1.9,step:.3,slope:38,crouch:1.2,vault:0,rappel:false,ladder:false};
  p.markers=[{id:'a',area:'west',kind:'spawn'},{id:'b',area:'east',kind:'site'}];p.routes=[{id:'route',from:'a',to:'b',minRoutes:2,minDistance:3,maxDistance:50}];p.noSpawnLos=[['a','b']];p.expectFail=true;p.validation='premap';p.covers=[{id:'box',rect:[2,2,2,2],height:1}];
  const source=createSemantic(p),projected=projectNativeFloor(source,1);assert.deepEqual(projected.player,source.player);
  const q=plan();q.id='reassigned';q.player=projected.player;const native=retainNativeAuthorship(createSemantic(q),source,1);
  assert.deepEqual(native.player,source.player);assert.deepEqual(native.routes,source.routes);assert.deepEqual(native.noSpawnLos,source.noSpawnLos);assert.deepEqual(native.covers,source.covers);assert.equal(native.expectFail,true);assert.equal(native.validation,'premap');
  assert.throws(()=>projectNativeFloor(source,.7),/not aligned/);
});
test('typed semantic source retains metadata and hard route grammar',async()=>{
  const input=plan();input.id='actual_source';input.expectFail=true;input.validation='premap';input.moveSpeed=3.7;
  input.player={radius:.42,height:1.9,step:.3};
  applySemanticDirectives(input,['mark spawn west','mark site east','route west east 2 minDistance=3 maxDistance=60 movement=land','no_spawn_los west east']);
  const source=await decodeSemanticSource(JSON.stringify(input),'.json');
  assert.equal(source.kind,'semantic');if(source.kind!=='semantic')return;
  assert.equal(source.plan.expectFail,true);assert.equal(source.plan.validation,'premap');assert.equal(source.plan.player!.radius,.42);assert.equal(source.plan.moveSpeed,3.7);
  assert.equal(source.plan.routes![0].minRoutes,2);assert.equal(source.plan.routes![0].minDistance,3);assert.equal(source.plan.routes![0].maxDistance,60);assert.equal(source.plan.routes![0].movement,'land');assert.equal(source.plan.noSpawnLos!.length,1);
  assert.throws(()=>applySemanticDirectives(source.plan,['mystery a b']),/unknown.*directive/i);
  const profile=semanticProfile(plan(),0);assert.equal(profile.areas[1].z,.44);
});
test('annotation tie ownership follows first seed and cannot discard disconnected unseeded floor',()=>{
  const source=plan(),d={ID:'assigned',NAME:'Assigned',AREAS:[{id:'first',seeds:[[3,3,1,1]] as [number,number,number,number][]},{id:'second',seeds:[[3,3,1,1],[15,3,1,1]] as [number,number,number,number][]}]};
  const assigned=composePythonDeclarations(d,new Map([['ground',source]]));assert.ok(assigned.areas[0].cells!.some(c=>c[0]===3&&c[1]===3));
  source.areas.push({id:'island',rects:[[30,0,4,4]]});assert.throws(()=>composePythonDeclarations(d,new Map([['ground',source]])),/unreachable from all seeds/);
});
test('native publication preserves boat routes and imported assets without land-only route evidence',async()=>{
  const scene=new SceneBuilder('water_native'),g=scene.group('water',{},'lake');
  g.platform('bed',{width:20,depth:20,material:'default'});g.polygon('surface',[[0,0,3],[20,0,3],[20,20,3],[0,20,3]],{fill:'water'});
  const d=scene.document;d.boat={radius:1,height:2,draft:.5};d.markers=[{id:'boat_spawn',layer:'lake',position:[4,5,3],kind:'spawn',movement:'water'},{id:'boat_goal',layer:'lake',position:[16,15,3],kind:'site',movement:'water'}];d.routes=[{id:'boat_route',from:'boat_spawn',to:'boat_goal',minRoutes:1,movement:'water'}];
  d.assets=[{id:'statue_asset',src:'memory:statue'}];g.asset('statue','statue_asset',{position:[1,1,4],size:[1,1,1],material:'default',collision:'none'});
  let resolved=0;const made=await publishSemanticDocument(d,{resolveAsset:async asset=>{assert.equal(asset.src,'memory:statue');resolved++;return boxGeometry();}});
  assert.equal(resolved,1);assert.deepEqual(made.document.boat,d.boat);assert.equal(made.document.routes[0].movement,'water');assert.equal(made.physical.routes.length,0);assert.equal(made.physical.movement,'land');assert.equal(made.document.assets![0].src,'memory:statue');assert.equal(made.document.props![0].asset,'statue_asset');
  d.boat.draft=4;await assert.rejects(publishSemanticDocument(d,{resolveAsset:async()=>boxGeometry()}),/ROUTE|NAV|WATER/);
});
test('optional Python portal search preserves hard routes and never changes explicit native portals',async()=>{
  const p=plan();p.portals=[{id:'optional',between:['west','east'],kind:'window',width:1,head:1.5,sill:1}];
  p.markers=[{id:'a',area:'west',kind:'spawn'},{id:'b',area:'east',kind:'site'}];p.routes=[{id:'hard_route',from:'a',to:'b',minRoutes:1}];
  p.placementDiagnostics=[{id:'optional',code:'PORTAL_PLACEMENT',proposed:1,placed:1,omitted:0,message:'Optional rough window proposal'}];
  await assert.rejects(produceSemantic(p),/NAV|ROUTE/);const made=await publishPythonCandidates(p,['optional'],candidate=>produceSemantic(candidate));
  assert.deepEqual(made.omittedPortals,['optional']);assert.equal(made.document.routes[0].minRoutes,1);assert.equal(made.placementDiagnostics[0].omitted,1);assert.equal(p.portals.length,1);
  p.boundaries=[{between:['west','east'],kind:'wall'}];await assert.rejects(publishPythonCandidates(p,['optional'],candidate=>produceSemantic(candidate)),/NAV|ROUTE/);
});

test('native elevation edits retain headroom, relative apertures and grounded offsets, rejecting ambiguous cover and player changes',async()=>{
  const p=plan();p.layers[0].z=2;p.layers[0].roof=true;p.portals=[{id:'door',between:['west','east'],kind:'door',width:3,head:2.8,sill:0}];p.covers=[{id:'box',rect:[3,3,2,2],height:1,z:.1}];
  const source=createSemantic(p),q=plan();q.layers[0].z=2;q.areas.forEach(a=>{a.z=.28;});q.player=source.player;
  prepareNativeAnnotation(q,[source],new Map([['ground',2]]));const d=createNativeAnnotation(q,[source]);await publishSemanticDocument(d);
  assert.equal(d.covers[0].min[2],2.38);assert.equal(d.covers[0].max[2],3.38);assert.ok(d.layers[0].regions.every(r=>Math.abs(r.ceiling!-6.28)<1e-7));assert.ok(d.layers[0].edges.flatMap(e=>e.openings).every(o=>o.head===2.8&&o.sill===0));
  const bad=structuredClone(q);bad.player={...source.player,radius:.1};assert.throws(()=>prepareNativeAnnotation(bad,[source],new Map()),/preserve the source PLAYER/);
  const plain=createSemantic({...p,portals:[]});plain.covers[0].min=[9,3,2];plain.covers[0].max=[11,4,3];q.areas[0].z=0;
  assert.throws(()=>createNativeAnnotation(q,[plain]),/different elevation transforms/);
});

test('native annotation retains a source wall seam even when an alternative path passes all gates',async()=>{
  const p=plan();p.id='seam_source';p.areas[1].z=.3;p.areas.push({id:'north',rects:[[0,12,20,6]],z:.3});
  const source=createSemantic(p),layer=source.layers[0];
  const barrier=source.seams.find(s=>s.edges.every(id=>{const e=layer.edges.find(e=>e.id===id)!;return [e.from,e.to].every(id=>layer.vertices.find(v=>v.id===id)!.x===10);}))!;
  barrier.kind='wall';barrier.label='Retained separation';barrier.material=source.materials[0].id;
  source.markers=[{id:'a',layer:'ground',kind:'spawn',position:[3,3,0]},{id:'b',layer:'ground',kind:'site',position:[17,3,.3]}];source.routes=[{id:'around',from:'a',to:'b',minRoutes:1}];
  await publishSemanticDocument(source);
  const q=structuredClone(p);q.id='seam_annotation';prepareNativeAnnotation(q,[source],new Map([['ground',0]]));
  const retained=createNativeAnnotation(q,[source]);await publishSemanticDocument(retained);
  const walls=retained.seams.filter(s=>s.kind==='wall');assert.equal(walls.length,1);assert.equal(walls[0].label,barrier.label);assert.equal(walls[0].material,barrier.material);assert.deepEqual(retained.routes,source.routes);
  const split=structuredClone(q);split.areas[0].rects=[[0,0,10,6]];split.areas.push({id:'west_north',rects:[[0,6,10,6]]});
  const subdivided=createNativeAnnotation(split,[source]);await publishSemanticDocument(subdivided);assert.equal(subdivided.seams.filter(s=>s.kind==='wall').length,2);assert.ok(subdivided.seams.filter(s=>s.kind==='wall').every(s=>s.label===barrier.label&&s.material===barrier.material));
  q.areas[1].z=0;assert.throws(()=>createNativeAnnotation(q,[source]),/seam.*retain|retain.*seam/i);
});

test('optional Python portal proposals reject either unknown area before composition or annotation filtering',()=>{
  for(const annotation of [false,true])for(const between of [['typo','east'],['west','typo']] as [string,string][]){
    const areas=annotation?[{id:'west',seeds:[[2,2,1,1]] as [number,number,number,number][]},{id:'east',seeds:[[15,2,1,1]] as [number,number,number,number][]}]:plan().areas;
    const d={ID:'unknown_portal',NAME:'Unknown portal',GRID:1,AREAS:areas,PORTALS:[{between,width:2}],DIRECTIVES:['mark spawn west','mark site east','route west east 1']};
    assert.throws(()=>composePythonDeclarations(d,annotation?new Map([['ground',plan()]]):undefined),/portal\/0: unknown area typo/i);
  }
});
