import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ArchitectureBuilder,compile,parseAml,serializeAml,type V3} from 'levelspec';
import {auditSurfaceContacts} from '../src/vector/surface-contacts.ts';
import {floor,rectangle} from './fixtures/physical-architecture.ts';

function fixture(height=1,x=0){const b=new ArchitectureBuilder('contacts');floor(b,'upper',rectangle(x,0,2,4,1));b.path('axis',[[0,-1,0],[0,5,0]]);b.wall('retaining-wall','axis',{height,thickness:.2});return b;}
async function inspect(b:ArchitectureBuilder,options:Parameters<typeof compile>[1]={}){return compile(parseAml(serializeAml(b.document)),{navigation:false,floorGaps:false,...options});}
const contacts=(level:Awaited<ReturnType<typeof inspect>>)=>level.diagnostics.filter(d=>d.code==='SURFACE_COPLANAR');

test('native wall caps report real same-facing floor overlap with named source and stable review patches',async()=>{
  const b=fixture(),first=contacts(await inspect(b)),second=contacts(await inspect(b));assert.ok(first.length);assert.ok(first.some(d=>d.objects.includes('upper')&&d.objects.includes('retaining-wall')&&d.source));
  const target=first[0].review!;assert.ok(target.patches?.length);assert.deepEqual(second[0].review,target);
  assert.deepEqual(contacts(await inspect(b,{surfaceContacts:false})),[]);assert.ok((await inspect(b,{surfaceContacts:false})).mesh.indices.length);
});

test('contact classification distinguishes cap elevation, actual wall face, point contact and opposite-facing support',async()=>{
  assert.deepEqual(contacts(await inspect(fixture(2))),[]);assert.deepEqual(contacts(await inspect(fixture(1,.1))),[]);assert.deepEqual(contacts(await inspect(fixture(.8))),[]);
  const point=new ArchitectureBuilder('point');floor(point,'floor',[[.1,5,1],[2,5,1],[.1,7,1]]);point.path('axis',[[0,-1,0],[0,5,0]]);point.wall('wall','axis',{height:1,thickness:.2});assert.deepEqual(contacts(await inspect(point)),[]);
  assert.ok(contacts(await inspect(fixture(1,-.1))).length,'Same-facing vertical slab/wall sides overlap');
});

test('actual host notches remove only their own cap spans from overlap findings',async()=>{
  for(const [width,expect] of [[4,false],[2,true]] as const){const b=fixture();b.opening('cut','retaining-wall',{mode:'notch',center:[3,.5],width,height:1});assert.equal(contacts(await inspect(b)).length>0,expect);}
});

test('real horizontal stair treads participate in native cap-overlap auditing',async()=>{
  const b=new ArchitectureBuilder('treads');b.path('flight-axis',[[0,0,0],[0,3,1]]);b.stairs('flight',{path:'flight-axis',width:2,count:5});b.path('cap-axis',[[-1,0,0],[1,0,0]]);b.wall('cap','cap-axis',{height:.2,thickness:.2});assert.ok(contacts(await inspect(b)).some(d=>d.objects.includes('flight')&&d.objects.includes('cap')));
});

test('curved native wall rims aggregate one measured source-pair finding',async()=>{
  const b=new ArchitectureBuilder('curve');floor(b,'floor',rectangle(0,0,4,4,1));b.path('curve',[[0,0,0]],{segments:[{kind:'bezier',controls:[[2,2,0]],to:[4,0,0]}]});b.wall('rim','curve',{height:1,thickness:.2});const findings=contacts(await inspect(b));assert.equal(findings.length,1);assert.ok(findings[0].review?.patches.length);
});

test('overlapping imported visualization meshes remain excluded while invalid mesh data still fails',async()=>{
  const b=new ArchitectureBuilder('visual');for(const id of ['one','two'])b.add({kind:'visual-mesh',id,src:'triangle.glb'});
  const geometry={positions:[[0,0,0],[2,0,0],[0,2,0]] as V3[],triangles:[[0,1,2],[0,1,2]] as [number,number,number][]};
  const level=await inspect(b,{resolveAsset:async()=>geometry});assert.deepEqual(level.diagnostics.filter(d=>d.severity==='error'),[]);assert.equal(level.mesh.indices.length,12);
  const invalid=await inspect(b,{resolveAsset:async()=>({...geometry,positions:[[NaN,0,0],[2,0,0],[0,2,0]]})});assert.ok(invalid.diagnostics.some(d=>d.severity==='error'));
});

test('the planar contact backend retains exact patches beyond 4096 independent triangles',async()=>{
  const size=46,b=new ArchitectureBuilder('contact-math');b.box('one',{width:1,depth:1,height:1});b.box('two',{width:1,depth:1,height:1,position:[3,0,0]});
  const level=await inspect(b,{surfaceContacts:false}),positions:number[]=[],indices:number[]=[];
  for(let y=0;y<=size;y++)for(let x=0;x<=size;x++)positions.push(x,y,0);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){const a=y*(size+1)+x,c=a+size+2;indices.push(a,a+1,c,a,c,a+size+1);}
  const count=indices.length/3;assert.equal(count,4232);
  // This is a pure compiled-mesh algorithm fixture, not a source parser or compiler replacement.
  level.surfaces=['one','two'].map(id=>({...level.surfaces.find(surface=>surface.object===id)!,closed:false}));
  level.mesh={...level.mesh,positions,indices:[...indices,...indices],surfaces:[...Array(count).fill(0),...Array(count).fill(1)]};
  const findings=auditSurfaceContacts(level);assert.equal(findings.length,1);assert.deepEqual([...findings[0].objects].sort(),['one','two']);assert.deepEqual(findings[0].review!.bounds,{min:[0,0,0],max:[size,size,0]});
  const area=findings[0].review!.patches.reduce((sum,polygon)=>sum+Math.abs(polygon.reduce((twice,p,i)=>{const next=polygon[(i+1)%polygon.length];return twice+p[0]*next[1]-next[0]*p[1];},0))/2,0);assert.ok(Math.abs(area-size*size)<1e-5);
});

test('native wall feet follow transverse floor slope while preserving authored tops and exposed cap findings',async()=>{
  for(const anchored of [false,true]){const b=new ArchitectureBuilder('fitted-wall');floor(b,'upper',[[0,0,1],[2,0,1.5],[2,4,1.5],[0,4,1]]);b.path('axis',[[0,0,anchored?0:1],[0,4,anchored?0:1]]);b.wall('wall','axis',{height:1,thickness:.2,...(anchored?{baseFloor:'upper'}:{fitFloor:'upper'})});
    const level=await inspect(b);assert.deepEqual(level.diagnostics.filter(d=>d.severity==='error'),[]);const points=level.mesh.surfaces.flatMap((s,t)=>level.surfaces[s].object==='wall'?level.mesh.indices.slice(t*3,t*3+3).map(i=>level.mesh.positions.slice(i*3,i*3+3)):[]);
    assert.ok(points.some(p=>Math.abs(p[0]-.1)<1e-6&&Math.abs(p[2]-1.025)<1e-6));assert.ok(points.some(p=>Math.abs(p[0]+.1)<1e-6&&Math.abs(p[2]-.975)<1e-6));assert.ok(Math.abs(Math.max(...points.map(p=>p[2]))-2)<1e-6);
    floor(b,'overhead',rectangle(0,0,2,4,2));assert.ok(contacts(await inspect(b)).some(d=>d.objects.includes('overhead')));
  }
});
