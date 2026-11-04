import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGameplay,produceGameplay,type GameplayPlan} from '../src/gameplay/index.ts';
import {createSemantic,produceSemantic,publishSemanticDocument,type NativeSemanticPlan} from '../src/authoring/semantic.ts';
import {composePythonDeclarations,type PythonDeclarations} from '../src/authoring/semantic-python.ts';
import {publishPythonCandidates} from '../src/authoring/semantic-python-publish.ts';
import {projectNativeFloor} from '../src/authoring/semantic-native-projection.ts';
import {prepareNativeAnnotation,createNativeAnnotation} from '../src/authoring/semantic-native-annotation.ts';
import {SceneBuilder} from '../src/vector/authoring.ts';
import {serializeLevelSvgx,parseLevelSvgx} from '../src/vector/format.ts';
import {tessellate,pathLength} from '../src/vector/geometry.ts';
import {requirePhysicalRoutes} from '../src/authoring/physical-routes.ts';
import {horizontalAnnotation,annotationPunches} from '../src/authoring/semantic-native-flights.ts';
import type {Region} from '../src/vector/types.ts';

const plan=():NativeSemanticPlan=>({format:'levelspec-semantic/2',id:'review',name:'Review',grid:1,layers:[{id:'ground',height:5}],areas:[{id:'west',rects:[[0,0,10,12]]},{id:'east',rects:[[10,0,10,12]]}]});

test('hard annotation walls and portals cannot be overwritten by retained source openings',async()=>{
  const p=plan();p.areas.push({id:'north',rects:[[0,12,20,5]]});p.portals=[{id:'original_door',between:['west','east'],kind:'door',width:2}];const source=createSemantic(p);
  const q=structuredClone(p);delete q.portals;q.boundaries=[{between:['west','east'],kind:'wall'}];
  assert.throws(()=>createNativeAnnotation(q,[source]),/conflict.*boundary|boundary.*conflict/i);
  delete q.boundaries;q.portals=[{id:'new_door',between:['west','east'],kind:'door',width:2,head:2.8}];assert.throws(()=>createNativeAnnotation(q,[source]),/conflict.*boundary|boundary.*conflict/i);
  delete q.portals[0].head;await publishSemanticDocument(createNativeAnnotation(q,[source]));
  delete q.portals;const retained=createNativeAnnotation(q,[source]);assert.equal(retained.layers[0].edges.flatMap(e=>e.openings).reduce((n,o)=>n+o.end-o.start,0),2);await publishSemanticDocument(retained);
  const raw=createSemantic({...p,portals:[]});q.boundaries=[{between:['west','east'],kind:'wall'}];const wall=createNativeAnnotation(q,[raw]);assert.equal(wall.layers[0].edges.flatMap(e=>e.openings).length,0);await publishSemanticDocument(wall);
  delete q.boundaries;q.portals=[{id:'new_door',between:['west','east'],kind:'door',width:3}];await publishSemanticDocument(createNativeAnnotation(q,[raw]));
});

test('retaining seams preserve authored barriers and compatible hard annotation intent',async()=>{
  const p=plan();p.areas[1].z=.3;p.areas.push({id:'north',rects:[[0,12,20,5]],z:.3});const source=createSemantic(p),q=structuredClone(p);
  q.boundaries=[{between:['west','east'],kind:'wall'}];const wall=createNativeAnnotation(q,[source]);await publishSemanticDocument(wall);assert.ok(wall.seams.some(s=>s.kind==='wall'));
  const barrier=structuredClone(source);barrier.seams[0].kind='wall';q.boundaries[0].kind='open';assert.throws(()=>createNativeAnnotation(q,[barrier]),/conflicts.*boundary seam/);
  q.boundaries[0].kind='wall';await publishSemanticDocument(createNativeAnnotation(q,[barrier]));
});

test('compatible stepped doorway boundaries retain each floor side exactly once',async()=>{
  const p=plan();p.areas[1].z=.3;p.portals=[{id:'step_door',between:['west','east'],kind:'door',width:4}];p.markers=[{id:'spawn',kind:'spawn',area:'west',position:[3,3]},{id:'site',kind:'site',area:'east',position:[17,3]}];p.routes=[{id:'through',from:'spawn',to:'site',minRoutes:1}];
  const source=createSemantic(p);await publishSemanticDocument(source);
  for(const shift of [0,.28])for(const explicit of [false,true]){
    const q=structuredClone(p);q.markers=[];q.routes=[];q.areas.forEach(a=>{a.z=(a.z??0)+shift;});prepareNativeAnnotation(q,[source],new Map([['ground',0]]));
    if(!explicit)q.portals=[];
    const d=createNativeAnnotation(q,[source]),made=await publishSemanticDocument(d);assert.equal(made.physical.routes[0].physicalDisjointRoutes,1);
    const openings=d.layers[0].edges.flatMap(e=>e.openings);assert.equal(openings.reduce((n,o)=>n+o.end-o.start,0),4);assert.ok(openings.every(o=>o.head===2.1&&o.sill===0));assert.equal(d.markers[1].position[2],Number((.3+shift).toFixed(6)));
  }
  const conflicting=structuredClone(p);conflicting.markers=[];conflicting.routes=[];conflicting.portals=[];conflicting.boundaries=[{between:['west','east'],kind:'wall'}];assert.throws(()=>createNativeAnnotation(conflicting,[source]),/conflict.*boundary|boundary.*conflict/);
});

test('compatible stepped wall profiles survive unchanged and shifted native annotation',async()=>{
  const p=plan();p.areas[1].z=.3;p.areas.push({id:'north',rects:[[0,12,20,5]],z:.3});p.boundaries=[{between:['west','east'],kind:'wall'}];
  const source=createSemantic(p);await publishSemanticDocument(source);
  for(const shift of [0,.28]){
    const q=structuredClone(p);q.boundaries=[];q.areas.forEach(a=>{a.z=(a.z??0)+shift;});prepareNativeAnnotation(q,[source],new Map([['ground',0]]));
    const d=createNativeAnnotation(q,[source]);await publishSemanticDocument(d);const layer=d.layers[0],vertices=new Map(layer.vertices.map(v=>[v.id,v]));
    const walls=layer.edges.filter(e=>vertices.get(e.from)!.x===10&&vertices.get(e.to)!.x===10&&Math.max(vertices.get(e.from)!.y,vertices.get(e.to)!.y)<=12);
    const original=source.layers[0],points=new Map(original.vertices.map(v=>[v.id,v])),sourceWalls=original.edges.filter(e=>points.get(e.from)!.x===10&&points.get(e.to)!.x===10&&Math.max(points.get(e.from)!.y,points.get(e.to)!.y)<=12);
    assert.equal(walls.length,2);assert.deepEqual(walls.map(e=>[e.kind,e.height,e.openings.length]).sort(),sourceWalls.map(e=>[e.kind,e.height,e.openings.length]).sort());assert.equal(d.seams.filter(s=>s.kind==='wall').length,1);
  }
});

test('new automatic native annotation markers account for retained covers without moving explicit authorship',async()=>{
  const p:NativeSemanticPlan={format:'levelspec-semantic/2',id:'covered_source',name:'Covered source',grid:1,layers:[{id:'ground',height:5}],areas:[{id:'room',rects:[[0,0,12,12]]}],covers:[{id:'retained_crate',rect:[5,5,2,2],height:2}],markers:[{id:'retained_site',kind:'site',area:'room',position:[3,3]}]};
  for(const shift of [0,2]){
    const source=createSemantic(p),q=structuredClone(p);q.id='covered_annotation';q.covers=[];q.markers=[{id:'new_spawn',kind:'spawn',area:'room'}];q.areas[0].z=shift;
    prepareNativeAnnotation(q,[source],new Map([['ground',0]]));const d=createNativeAnnotation(q,[source]),made=await publishSemanticDocument(d);assert.equal(made.report.passed,true);assert.notDeepEqual(d.markers[0].position,[6.5,6.5,shift]);assert.deepEqual(d.markers[1].position,[3,3,shift]);assert.deepEqual(d.covers[0].min,[5,5,shift]);assert.deepEqual(d.covers[0].max,[7,7,shift+2]);assert.equal(d.covers[0].id,'retained_crate');
    assert.equal(serializeLevelSvgx(createNativeAnnotation(q,[source])),serializeLevelSvgx(d));
    q.markers[0].position=[6,6];const blocked=createNativeAnnotation(q,[source]);assert.deepEqual(blocked.markers[0].position,[6,6,shift]);await assert.rejects(publishSemanticDocument(blocked),/NAV|MARKER/);
    delete q.markers[0].position;source.covers[0].min=[0,0,0];source.covers[0].max=[12,12,2];assert.throws(()=>createNativeAnnotation(q,[source]),/no capsule-clear marker/);
  }
  const source=createSemantic(p),q=structuredClone(p);q.id='high_cover_annotation';q.covers=[];q.markers=[{id:'new_spawn',kind:'spawn',area:'room'}];source.covers[0].min[2]=2;source.covers[0].max[2]=4;
  const high=createNativeAnnotation(q,[source]);assert.deepEqual(high.markers[0].position,[6.5,6.5,0]);await publishSemanticDocument(high);
  source.covers[0].min[2]=0;source.covers[0].max[2]=2;source.markers[0].position=[6,6,0];const blockedSource=createNativeAnnotation(q,[source]);assert.deepEqual(blockedSource.markers[1].position,[6,6,0]);await assert.rejects(publishSemanticDocument(blockedSource),/NAV|MARKER/);
});

test('new native annotation flights retain all unpunched source properties and reject ambiguous objects',async()=>{
  for(const kind of ['ramp','stairs'] as const){
    const p=plan();p.areas[1].z=2;p.layers[0].roof=true;const source=createSemantic(p);source.layers[0].regions[0].thickness=.37;
    const q=structuredClone(p);q.flights=[{id:'new_flight',kind,from:{layer:'ground',cell:[6,5]},to:{layer:'ground',cell:[13,5]},width:3}];q.markers=[{id:'a',kind:'spawn',area:'west',position:[3,3]},{id:'b',kind:'site',area:'east',position:[17,3]}];q.routes=[{id:'up',from:'a',to:'b',minRoutes:1}];
    prepareNativeAnnotation(q,[source],new Map([['ground',0]]));const d=createNativeAnnotation(q,[source]),made=await publishSemanticDocument(d);
    assert.equal(d.links.length,0);assert.equal(d.layers.flatMap(l=>l.regions).filter(r=>r.fill===kind).length,1);assert.equal(made.physical.routes[0].physicalDisjointRoutes,1);
    const original=projectNativeFloor(source,1),remaining=projectNativeFloor(horizontalAnnotation(d,q),1),punched=annotationPunches(q);
    const cells=new Map<string,Region>(original.areas.flatMap(a=>a.cells!.map(c=>[`${a.layer}:${c}`,source.layers[0].regions.find(r=>r.id===a.id)!] as const)));
    for(const area of remaining.areas)for(const cell of area.cells!){const key=`${area.layer}:${cell}`,old=cells.get(key)!,r=d.layers[0].regions.find(r=>r.id===area.id)!;assert.ok(old);assert.deepEqual([r.material,r.thickness,r.ceiling],[old.material,old.thickness,old.ceiling]);cells.delete(key);}
    assert.deepEqual(new Set(cells.keys()),punched);
    assert.throws(()=>projectNativeFloor(d,1),/horizontal floors/);
    const covered=structuredClone(source);covered.covers=[{id:'exact',layer:'ground',min:[7,4,0],max:[8,5,1]}];assert.throws(()=>createNativeAnnotation(q,[covered]),/unambiguous retained floor/);
    const marked=structuredClone(source);marked.markers=[{id:'exact_marker',layer:'ground',kind:'site',position:[7.5,4.5,0]}];assert.throws(()=>createNativeAnnotation(q,[marked]),/unambiguous retained floor/);
    const barrier=structuredClone(source);barrier.seams[0].kind='wall';assert.throws(()=>createNativeAnnotation(q,[barrier]),/retain seam|incomplete transformed/);
    const missing=structuredClone(q);missing.areas[0].rects=[[1,0,9,12]];assert.throws(()=>createNativeAnnotation(missing,[source]),/removed authored native floor cells/);
  }
});

test('hole-ring doorway ownership preserves one actual mouth capacity',async()=>{
  for(const curved of [false,true]){
  const s=new SceneBuilder('hole'),g=s.group('rooms',{},'ground');
  g.polygon('inner',[[6,6,0],[14,6,0],[14,14,0],[6,14,0]]);g.platform('ring',{width:20,depth:20,material:'default'});
  const d=s.document,l=d.layers[0],inner=l.regions[0];l.regions[1].holes=[inner.boundary.slice().reverse().map(ref=>ref.startsWith('-')?ref.slice(1):`-${ref}`)];
  for(const edge of l.edges){edge.kind='wall';edge.height=3;}
  const door=l.edges.find(e=>e.id===inner.boundary[3])!;door.openings=[{id:'doorway',kind:'door',start:3,end:5,sill:0,head:2.5}];
  if(curved){door.control=[[3,12],[3,8]];const length=pathLength(tessellate(door,l,d.curveTolerance));door.openings[0].start=length*.375;door.openings[0].end=length*.625;}
  d.markers=[{id:'outside',kind:'spawn',layer:'ground',position:[3,10,0]},{id:'inside',kind:'site',layer:'ground',position:[10,10,0]}];d.routes=[{id:'enter',from:'outside',to:'inside',minRoutes:1}];
  const made=await publishSemanticDocument(d);assert.equal(made.physical.routes[0].physicalDisjointRoutes,1);assert.equal(made.text,serializeLevelSvgx(d));assert.equal(parseLevelSvgx(made.text).layers[0].regions[1].holes.length,1);
  made.level.document.routes[0].minRoutes=2;assert.throws(()=>requirePhysicalRoutes(made.level,made.physical),/PHYSICAL_ROUTE_REQUIREMENT/);
  d.routes[0].minRoutes=2;await assert.rejects(publishSemanticDocument(d),/ROUTE_REQUIREMENT/);
  }
});

test('curved mouths sample actual path and partial spans without multiplying capacity',async()=>{
  for(const partial of [false,true]){
    const s=new SceneBuilder(`curved_${partial}`),g=s.group('rooms',{},'ground');
    g.platform('west',{width:10,depth:12,material:'default'});g.platform('east',{origin:[10,0,0],width:10,depth:12,material:'default'});
    const d=s.document,l=d.layers[0],edge=l.edges.find(e=>l.regions.every(r=>r.boundary.some(ref=>ref.replace(/^-/,'')===e.id)))!;
    edge.control=[[16,3],[16,9]];
    if(partial){edge.kind='wall';edge.height=3;const length=pathLength(tessellate(edge,l,d.curveTolerance));edge.openings=[{id:'curved_door',kind:'door',start:length*.25,end:length*.75,sill:0,head:2.5}];}
    d.markers=[{id:'a',kind:'spawn',layer:'ground',position:[3,6,0]},{id:'b',kind:'site',layer:'ground',position:[18,6,0]}];d.routes=[{id:'cross',from:'a',to:'b',minRoutes:1}];
    const made=await publishSemanticDocument(d);assert.equal(made.physical.routes[0].physicalDisjointRoutes,1);assert.equal(made.text,serializeLevelSvgx(d));
    made.level.document.routes[0].minRoutes=2;assert.throws(()=>requirePhysicalRoutes(made.level,made.physical),/PHYSICAL_ROUTE_REQUIREMENT/);
    d.routes[0].minRoutes=2;await assert.rejects(publishSemanticDocument(d),/ROUTE_REQUIREMENT/);
  }
});

test('rough Python cover excludes actual flight footprints before reporting placement',async()=>{
  const d:PythonDeclarations={ID:'rough_flight',NAME:'Rough flight',GRID:1,AREAS:[{id:'low',rects:[[0,0,10,12]]},{id:'high',rects:[[10,0,10,12]],z:2}],RAMPS:[{id:'slope',at:[[7,4,6,3]]}],COVER:[{id:'blocked',label:'Blocked',at:[[7,4,1,1]],height:1},{id:'safe',at:[[2,2,1,1]],height:1}],DIRECTIVES:['mark spawn low','mark site high','route low high 1']};
  const p=composePythonDeclarations(d),diagnostic=p.placementDiagnostics!.find(d=>d.id==='blocked')!;
  assert.deepEqual([diagnostic.proposed,diagnostic.placed,diagnostic.omitted],[1,0,1]);assert.equal(p.covers!.length,1);assert.equal((await produceSemantic(p)).report.passed,true);
  const exact=structuredClone(p);exact.covers!.push({id:'exact',rect:[7,4,1,1],height:1});assert.throws(()=>createSemantic(exact),/No floor/);
  delete d.RAMPS;d.DIRECTIVES!.unshift('ramp ground 6,5 -> ground 13,5 3');
  assert.equal(composePythonDeclarations(d).placementDiagnostics!.find(d=>d.id==='blocked')!.placed,0);
});

test('stacked native floor projection rejects ownership loss but direct publication preserves both floors',async()=>{
  const scene=new SceneBuilder('stacked'),g=scene.group('storeys',{},'ground');
  g.platform('low',{width:8,depth:8,material:'default'});g.polygon('high',[[0,0,4],[8,0,4],[8,8,4],[0,8,4]]);
  const d=scene.document;d.player.ladder=true;d.markers=[{id:'spawn',layer:'ground',position:[2,2,0],kind:'spawn'},{id:'goal',layer:'ground',position:[2,2,4],kind:'site'}];
  d.links=[{id:'ladder',kind:'ladder',from:[2,2,0],to:[2,2,4],ability:'ladder',bidirectional:true}];d.routes=[{id:'up',from:'spawn',to:'goal',minRoutes:1}];
  const made=await publishSemanticDocument(d);assert.equal(made.document.layers[0].regions.length,2);assert.equal(made.text,serializeLevelSvgx(d));
  assert.throws(()=>projectNativeFloor(d,1),/overlap.*ownership|ownership.*overlap/i);
});

test('optional portal ID collisions cannot erase required directives or malformed structure',async()=>{
  const d:PythonDeclarations={ID:'collision',NAME:'Collision',GRID:1,AREAS:plan().areas,PORTALS:[{id:'door_west_east_1',between:['west','east'],kind:'window',width:1,sill:1,head:1.5}],DIRECTIVES:['door west east 3','mark spawn west','mark site east','route west east 1']};
  let attempts=0;
  await assert.rejects(async()=>{const p=composePythonDeclarations(d);return publishPythonCandidates(p,['door_west_east_1'],candidate=>{attempts++;return produceSemantic(candidate);});},/Duplicate semantic id/);assert.equal(attempts,0);
  const bad=plan();bad.portals=[{id:'west',between:['west','east'],kind:'door',width:3}];
  await assert.rejects(publishPythonCandidates(bad,['west'],candidate=>produceSemantic(candidate)),/Duplicate semantic id/);
  const omitted:PythonDeclarations={ID:'omitted_duplicate',NAME:'Omitted duplicate',GRID:1,AREAS:[{id:'a',rects:[[0,0,8,8]]},{id:'b',rects:[[10,0,8,8]]}],PORTALS:[{id:'a',between:['a','b'],width:2}]};
  assert.throws(()=>composePythonDeclarations(omitted),/Duplicate semantic id/);
});

test('early omitted optional portal identity cannot remove a later required low doorway',async()=>{
  const d:PythonDeclarations={ID:'early_collision',NAME:'Early collision',GRID:1,AREAS:[...plan().areas,{id:'far',rects:[[20,0,10,12]]}],PORTALS:[{id:'door_west_east_0',between:['west','far'],width:1}],DIRECTIVES:['door west east 3 head=1','mark spawn west','mark site east','route west east 1']};
  let attempts=0;
  await assert.rejects(async()=>{const p=composePythonDeclarations(d);return publishPythonCandidates(p,d.PORTALS!.map(p=>p.id!),candidate=>{attempts++;return produceSemantic(candidate);});},/Duplicate semantic id|ROUTE|NAV/);
  assert.equal(attempts,0,'raw omitted identities are rejected before evaluating a hard portal');
  d.PORTALS![0].id='omitted_optional';const p=composePythonDeclarations(d);await assert.rejects(publishPythonCandidates(p,['omitted_optional'],candidate=>produceSemantic(candidate)),/ROUTE|NAV/);
  await assert.rejects(publishPythonCandidates(p,['door_west_east_0'],candidate=>produceSemantic(candidate)),/ROUTE|NAV/);
  d.DIRECTIVES![0]='door west east 3 head=2.5';const good=composePythonDeclarations(d),made=await publishPythonCandidates(good,['omitted_optional'],candidate=>produceSemantic(candidate));assert.equal(made.omittedPortals.length,0);assert.ok(made.document.layers[0].edges.flatMap(e=>e.openings).some(o=>o.head===2.5));
});

test('default gameplay markers search around exact cover using the whole player body',async()=>{
  const p:GameplayPlan={format:'levelspec-gameplay/2',id:'cover_room',name:'Cover room',spaces:[{id:'room',rect:[0,0,8,8],z:4}],connections:[],markers:[{id:'spawn',space:'room',kind:'spawn'}],covers:[{id:'crate',space:'room',position:[4,4,0],size:[2,2,2]}]};
  const before=structuredClone(p),a=await produceGameplay(p),b=await produceGameplay(p);
  assert.equal(a.text,b.text);assert.deepEqual(p,before);assert.deepEqual(a.document.covers[0].min,[3,3,4]);assert.deepEqual(a.document.covers[0].max,[5,5,6]);assert.notDeepEqual(a.document.markers[0].position,[4,4,4]);
  p.markers[0].position=[4,4];assert.deepEqual(createGameplay(p).markers[0].position,[4,4,4]);await assert.rejects(produceGameplay(p),/NAV|SPAWN|MARKER/i);
  delete p.markers[0].position;p.covers![0].size=[8,8,2];assert.throws(()=>createGameplay(p),/no safe default marker/);
  p.covers![0].position=[4,4,2];assert.deepEqual(createGameplay(p).markers[0].position,[4,4,4]);
});
