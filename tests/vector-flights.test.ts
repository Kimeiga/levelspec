import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ArchitectureBuilder,compile,parseAml,serializeAml,collisionMesh,generateUVs,auditUVs,type V3} from 'levelspec';
import {Ray,Vector3} from 'three';

function quarter(kind:'stairs'|'ramp'='stairs',count=7,walls=false){
  const b=new ArchitectureBuilder('quarter');b.document.validation='premap';b.document.curveTolerance=.005;
  for(const [id,r]of [['inner',2],['outer',4]]as const)b.path(id,[[r,0,0]],{segments:[{kind:'arc',center:[0,0,0],radii:[r,r],start:0,sweep:90,rotation:0}],elevation:[0,1.2]});
  if(kind==='stairs')b.stairs('flight',{left:'inner',right:'outer',count,thickness:.25,underside:'sloped'});else b.ramp('flight',{left:'inner',right:'outer',thickness:.25});
  if(walls){b.wall('inner-wall','inner',{height:1.05});b.wall('outer-wall','outer',{height:1.05});b.assembly('enclosed',[...b.document.elements]);}return b;
}
function support(level:Awaited<ReturnType<typeof compile>>,x:number,y:number){const mesh=collisionMesh(level),ray=new Ray(new Vector3(x,y,5),new Vector3(0,0,-1));let result=-Infinity;for(let i=0;i<mesh.indices.length;i+=3){const p=mesh.indices.slice(i,i+3).map(index=>new Vector3(...mesh.positions.slice(index*3,index*3+3)));const hit=ray.intersectTriangle(p[0],p[1],p[2],false,new Vector3());if(hit)result=Math.max(result,hit.z);}return result;}
const valid=(level:Awaited<ReturnType<typeof compile>>)=>assert.deepEqual(level.diagnostics.filter(d=>d.severity==='error'),[]);

test('native curved paired rails retain seven actual horizontal treads and the open inside of the turn',async()=>{
  const level=await compile(quarter().document,{navigation:false});valid(level);const floor=level.floors.find(f=>f.region==='flight')!,heights=new Set<number>();
  for(const triangle of floor.triangles){const p=triangle.map(i=>floor.points[i]);assert.ok(p.every(v=>Math.abs(v[2]-p[0][2])<1e-8));heights.add(Math.round(p[0][2]*1e8));for(const v of p)assert.ok(Math.hypot(v[0],v[1])>=1.99&&Math.hypot(v[0],v[1])<=4.01);}
  assert.equal(heights.size,7);assert.equal(support(level,1,1),-Infinity);
  for(let i=0;i<7;i++){const angle=(i+.5)/7*Math.PI/2;assert.ok(Math.abs(support(level,3*Math.cos(angle),3*Math.sin(angle))-(i+1)*1.2/7)<.003);}
});
test('native wall source guides stay independent of the authored stair count',async()=>{
  const coarse=await compile(quarter('stairs',4,true).document,{navigation:false}),fine=await compile(quarter('stairs',12,true).document,{navigation:false});valid(coarse);valid(fine);
  const profiles=(level:typeof coarse)=>level.sourceProfiles!.filter(p=>p.object.endsWith('-wall')).map(p=>({object:p.object,role:p.role,points:p.points}));assert.ok(profiles(coarse).length);assert.deepEqual(profiles(coarse),profiles(fine));
});
test('a turning native ramp follows its continuous guide rather than stair steps',async()=>{
  const level=await compile(quarter('ramp').document,{navigation:false});valid(level);
  for(const fraction of [.2,.5,.8]){const angle=fraction*Math.PI/2;const actual=support(level,3*Math.cos(angle),3*Math.sin(angle));assert.ok(Math.abs(actual-fraction*1.2)<.005,`Ramp fraction ${fraction}: ${actual} versus ${fraction*1.2}`);}
});
test('native paired rails support varying width and reversed authored traversal',async()=>{
  for(const reversed of [false,true]){const b=new ArchitectureBuilder('taper');b.path('left',reversed?[[0,4,1],[0,0,0]]:[[0,0,0],[0,4,1]]);b.path('right',reversed?[[3,4,1],[2,0,0]]:[[2,0,0],[3,4,1]]);b.ramp('flight',{left:reversed?'right':'left',right:reversed?'left':'right'});const level=await compile(b.document,{navigation:false});valid(level);assert.ok(Math.abs(support(level,1.25,2)-.5)<1e-6);assert.equal(support(level,3.5,2),-Infinity);}
});
test('invalid native flight definitions retain source identity and recover after rejection',async()=>{
  for(const count of [0,-1]){const b=quarter();const flight=b.document.elements[0];if(flight.kind!=='stairs')throw new Error('stairs');flight.count=count;const level=await compile(parseAml(serializeAml(b.document)),{navigation:false});assert.ok(level.diagnostics.some(d=>d.severity==='error'&&d.objects.includes('flight')&&d.source));}
  const b=quarter();const flight=b.document.elements[0];if(flight.kind!=='stairs')throw new Error('stairs');flight.right='inner';assert.ok((await compile(b.document,{navigation:false})).diagnostics.some(d=>d.severity==='error'&&d.objects.includes('flight')));valid(await compile(quarter().document,{navigation:false}));
});
test('a native S ramp uses authored cubic side rails with deterministic physical geometry',async()=>{
  const b=new ArchitectureBuilder('S-ramp');for(const [id,x]of [['left',0],['right',2]]as const)b.path(id,[[x,0,0]],{segments:[{kind:'bezier',controls:[[x+3,2,0],[x-3,4,0]],to:[x,6,0]}],elevation:[0,1.2]});b.ramp('flight',{left:'left',right:'right'});const first=await compile(b.document,{navigation:false}),second=await compile(b.document,{navigation:false});valid(first);assert.deepEqual(first.mesh,second.mesh);assert.ok(Math.abs(support(first,1,3)-.6)<.01);
});
test('overlapping global height ranges cannot manufacture a collision between vertically separated native ramps',async()=>{
  const b=new ArchitectureBuilder('separated-ramps');for(const [id,z]of [['lower',0],['upper',2]]as const){b.path(id,[[1,0,z],[1,6,z+3]]);b.ramp(id,{path:id,width:2});}valid(await compile(b.document,{navigation:false}));
});
test('curved native flights retain physical attributes through connected UV charts',async()=>{
  const level=await compile(quarter().document,{navigation:false});valid(level);const before=structuredClone(collisionMesh(level)),hash=level.physicalHash;await generateUVs(level);assert.deepEqual(auditUVs(level),[]);assert.deepEqual(collisionMesh(level),before);assert.equal(level.physicalHash,hash);assert.ok(level.atlas!.charts.length<level.mesh.indices.length/3);
});
test('curved native treads bake a required route without filling the inside radius',async()=>{
  const b=quarter();b.document.markers=[{id:'start',kind:'spawn',layer:'architecture',region:'flight',position:[3,.3,1.2/7]},{id:'end',kind:'objective',layer:'architecture',region:'flight',position:[.3,3,1.2]}];b.document.routes=[{id:'around',from:'start',to:'end',minRoutes:1,maxDistance:8}];const level=await compile(b.document);valid(level);const route=level.navigation!.routes[0];assert.equal(route.reachable,true);assert.ok(route.path!.every(p=>Math.hypot(p[0],p[1])>=1.99));
});
