import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ArchitectureBuilder,compile,type V3} from 'levelspec';
import {orient} from '../src/vector/geometry.ts';
import {floor,rectangle} from './fixtures/physical-architecture.ts';

function fixture(z=1,thickness=.3,mode:'open'|'wall'='open'){
  const b=new ArchitectureBuilder('retaining');floor(b,'low.floor',rectangle(0,0,2,4));const high=floor(b,'high.floor',rectangle(2,0,2,4,z));high.thickness=thickness;b.path('lower',[[2,0,0],[2,4,0]]);b.path('upper',[[2,0,z],[2,4,z]]);b.add({kind:'retaining-wall',id:'join',lower:'lower',upper:'upper',lowerFloor:'low.floor',upperFloor:'high.floor',thickness:.2,height:3,mode});return b;
}
const heights=(level:Awaited<ReturnType<typeof compile>>)=>level.mesh.surfaces.flatMap((surface,t)=>level.surfaces[surface].kind==='wall'?level.mesh.indices.slice(t*3,t*3+3).map(i=>level.mesh.positions[i*3+2]):[]);
const valid=(level:Awaited<ReturnType<typeof compile>>)=>assert.deepEqual(level.diagnostics.filter(d=>d.severity==='error'),[]);
function caps(level:Awaited<ReturnType<typeof compile>>,x:number,y:number){return level.mesh.surfaces.flatMap((surface,t)=>{if(level.surfaces[surface].kind!=='wall')return[];const p=level.mesh.indices.slice(t*3,t*3+3).map(i=>level.mesh.positions.slice(i*3,i*3+3)as V3);if(p.some(v=>Math.abs(v[2]-p[0][2])>1e-6)||Math.abs(orient(p[0],p[1],p[2]))<1e-8)return[];const signs=p.map((a,i)=>orient(a,p[(i+1)%3],[x,y]));return signs.every(v=>v>=-1e-8)||signs.every(v=>v<=1e-8)?[p[0][2]]:[];});}

test('native retaining walls stop at actual slab undersides without zero-volume shallow material',async()=>{
  const level=await compile(fixture().document,{navigation:false});valid(level);assert.ok(Math.abs(Math.max(...heights(level))-.7)<1e-6);
  for(const z of [0,.1]){const level=await compile(fixture(z).document);valid(level);assert.equal(heights(level).length,0);assert.equal(level.navigation!.passed,true);}
});
test('a sloping native retaining base clips where the upper slab already closes the interval',async()=>{
  const b=fixture(2,.2);b.document.profiles[0].outer.points!.forEach(p=>p[2]=p[1]/2);b.document.paths[0].points.forEach(p=>p[2]=p[1]/2);const level=await compile(b.document,{navigation:false});valid(level);
  const vertices=level.mesh.surfaces.flatMap((s,t)=>level.surfaces[s].kind==='wall'?level.mesh.indices.slice(t*3,t*3+3):[]);assert.ok(Math.abs(Math.max(...vertices.map(i=>level.mesh.positions[i*3+1]))-3.6)<1e-5);assert.ok(Math.abs(Math.max(...heights(level))-1.8)<1e-6);
});
test('explicit native wall-height mode retains its authored top while physical assemblies compose intersections',async()=>{
  const b=fixture(1,.3,'wall');b.assembly('structure',[...b.document.elements]);const level=await compile(b.document,{navigation:false});valid(level);assert.equal(Math.max(...heights(level)),4);
});
test('native retaining support distinguishes filled and sloped stair soffits',async()=>{
  for(const underside of ['filled','sloped']as const){const b=new ArchitectureBuilder('stair-side');floor(b,'low',rectangle(0,-2,4,2));b.path('axis',[[0,1,.5],[4,1,2.5]]);b.stairs('flight',{path:'axis',width:2,count:10,thickness:.2,underside});b.path('lower',[[0,0,0],[4,0,0]]);b.path('upper',[[0,0,.5],[4,0,2.5]]);b.add({kind:'retaining-wall',id:'join',lower:'lower',upper:'upper',lowerFloor:'low',upperFloor:'flight',thickness:.2,height:3,mode:'open'});const level=await compile(b.document,{navigation:false});valid(level);assert.ok(Math.abs(Math.max(...heights(level))-(underside==='filled'?.3:2.3))<1e-5);}
});
function corner(curved=false){const b=new ArchitectureBuilder('corner');for(const [id,z]of [['low',0],['high',2]]as const){b.path(id+'-straight',[[-2,0,z],[0,0,z]]);b.path(id+'-turn',[[0,0,z]],curved?{segments:[{kind:'bezier',controls:[[0,-1.105,z],[-.895,-2,z]],to:[-2,-2,z]}]}:{segments:[{kind:'line',to:[0,-2,z]}]});}for(const id of ['straight','turn'])b.add({kind:'retaining-wall',id,lower:'low-'+id,upper:'high-'+id,thickness:.2,height:3,mode:'open'});return b;}
test('native retaining corners join straight and curved spans without oversized caps',async()=>{
  for(const curved of [false,true]){const b=corner(curved);b.assembly('joined',[...b.document.elements]);const level=await compile(b.document,{navigation:false});valid(level);assert.ok(caps(level,.05,.05).some(z=>Math.abs(z-2)<1e-5));assert.equal(caps(level,.15,.15).length,0);}
});
test('ordinary wall and retaining corners join only where their physical vertical spans overlap',async()=>{
  for(const gap of [false,true]){const b=corner();b.document.elements=b.document.elements.filter(e=>e.id==='straight');if(gap){b.document.paths.find(p=>p.id==='high-straight')!.points.forEach(p=>p[2]=3);floor(b,'high-floor',rectangle(-2,-2,2,2,3)).thickness=.3;const retaining=b.document.elements[0];if(retaining.kind==='retaining-wall')retaining.upperFloor='high-floor';}b.path('ordinary',[[0,0,gap?3:0],[0,-2,gap?3:0]]);b.wall('ordinary-wall','ordinary',{height:3,thickness:.2});b.assembly('joined',[...b.document.elements]);const level=await compile(b.document,{navigation:false});valid(level);const actual=caps(level,.05,.05);if(gap)assert.equal(actual.length,0);else assert.ok(actual.some(z=>Math.abs(z-2)<1e-5));}
});
