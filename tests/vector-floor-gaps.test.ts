import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ArchitectureBuilder,compile,parseAml,serializeAml,type V3} from 'levelspec';
import {floor,rectangle} from './fixtures/physical-architecture.ts';

function adjacent(height=1){const b=new ArchitectureBuilder('floor-gap');b.document.validation='premap';floor(b,'low',rectangle(0,0,2,4));floor(b,'high',rectangle(2,0,2,4,height));return b;}
async function inspect(b:ArchitectureBuilder,options:Parameters<typeof compile>[1]={}){return compile(parseAml(serializeAml(b.document)),{navigation:false,surfaceContacts:false,...options});}
const gaps=(level:Awaited<ReturnType<typeof inspect>>)=>level.diagnostics.filter(d=>d.code==='FLOOR_EDGE_GAP');
function wall(b:ArchitectureBuilder,id:string,base=0,height=.8,start=0,end=4){b.path(id+':path',[[2,start,base],[2,end,base]]);return b.wall(id,id+':path',{height,thickness:.2});}

test('native adjacent floor gaps retain source objects, warning/error policy and explicit opt-out',async()=>{
  const b=adjacent(),warning=gaps(await inspect(b));assert.ok(warning.length);assert.ok(warning.every(d=>d.severity==='warning'&&d.objects.includes('low')&&d.objects.includes('high')&&d.source));
  assert.ok(gaps(await inspect(b,{floorGaps:'error'})).every(d=>d.severity==='error'));assert.deepEqual(gaps(await inspect(b,{floorGaps:false})),[]);
});

test('floor gap intervals distinguish slab-covered steps, positive partial spans and point-only contacts',async()=>{
  for(const height of [0,.1,.2])assert.deepEqual(gaps(await inspect(adjacent(height))),[]);
  assert.ok(gaps(await inspect(adjacent(.202))).length);
  const partial=new ArchitectureBuilder('partial');floor(partial,'low',rectangle(0,0,2,4));floor(partial,'high',rectangle(2,2,2,4,1));assert.ok(gaps(await inspect(partial)).length);
  const corner=new ArchitectureBuilder('corner');floor(corner,'low',rectangle(0,0,2,4));floor(corner,'high',rectangle(2,4,2,4,1));assert.deepEqual(gaps(await inspect(corner)),[]);
  const stacked=new ArchitectureBuilder('stacked');floor(stacked,'low',rectangle(0,0,4,4));floor(stacked,'high',rectangle(0,0,4,4,3));assert.deepEqual(gaps(await inspect(stacked)),[]);
});

test('actual wall and intermediate slab material seal only the intervals they occupy',async()=>{
  const full=adjacent();wall(full,'seal');assert.deepEqual(gaps(await inspect(full)),[]);
  for(const [base,height]of [[0,.5],[.3,.5]]){const b=adjacent();wall(b,'short',base,height);assert.ok(gaps(await inspect(b)).length);}
  const separated=adjacent();wall(separated,'bottom',0,.4);wall(separated,'top',.6,.2);assert.ok(gaps(await inspect(separated)).length);
  const half=adjacent();wall(half,'partial',0,.8,0,2);assert.ok(gaps(await inspect(half)).length);
  const slab=adjacent();wall(slab,'short',0,.5);const patch=slab.profile('cap-plan',rectangle(1.8,0,.4,4,.8));slab.slab('cap',patch.id,{thickness:.3});assert.deepEqual(gaps(await inspect(slab)),[]);
});

test('floor gap checks retain real apertures including a two-millimetre uncovered station span',async()=>{
  for(const width of [1,.002]){const b=adjacent();wall(b,'seal');b.opening('cut','seal',{center:[1.235,.4],width,height:.4});assert.ok(gaps(await inspect(b)).length);}
});

test('hidden static collision can seal a floor gap while dynamic and noncolliding walls cannot',async()=>{
  const hidden=adjacent();wall(hidden,'seal').visible=false;assert.deepEqual(gaps(await inspect(hidden)),[]);
  for(const setting of ['dynamic','collidable'] as const){const b=adjacent();const seal=wall(b,'seal');if(setting==='dynamic')seal.dynamic=true;else seal.collidable=false;assert.ok(gaps(await inspect(b)).length);}
});

test('native stair side gaps use the real underside and survive common transformed frames',async()=>{
  for(const underside of ['filled','sloped'] as const)for(const transformed of [false,true]){
    const b=new ArchitectureBuilder('stair-gap');floor(b,'low',rectangle(0,0,2,4));b.path('axis',[[3,0,0],[3,4,1]]);b.stairs('flight',{path:'axis',width:2,count:5,thickness:.2,underside});
    if(transformed){b.document.frames.push({id:'placed',position:[10,-4,3],rotation:[0,0,37]});for(const profile of b.document.profiles)profile.frame='placed';for(const path of b.document.paths)path.frame='placed';}
    const actual=gaps(await inspect(b));assert.equal(actual.length>0,underside==='sloped');
  }
});

test('courtyard hole boundaries and partial underpass continuations retain their opposite filled sides',async()=>{
  const ring=new ArchitectureBuilder('ring-gap');floor(ring,'low',rectangle(0,0,6,6),'low',[rectangle(2,2,2,2)]);floor(ring,'high',rectangle(2,2,2,2,1));assert.ok(gaps(await inspect(ring)).length);
  const underpass=new ArchitectureBuilder('underpass');floor(underpass,'low',rectangle(0,0,4,4));floor(underpass,'high',rectangle(2,0,2,4,3));assert.deepEqual(gaps(await inspect(underpass)),[]);
  const partial=new ArchitectureBuilder('partial-underpass');floor(partial,'low',[[0,0,0],[4,0,0],[4,2,0],[2,2,0],[2,4,0],[0,4,0]]);floor(partial,'high',rectangle(2,0,2,4,1));const exposed=gaps(await inspect(partial));assert.ok(exposed.length);assert.ok(exposed.every(d=>!d.review||d.review.bounds.min[1]>=2-1e-5));
});

test('reversed shared native curved boundaries detect an exposed interval and accept actual sealing walls',async()=>{
  const b=new ArchitectureBuilder('curved-gap');for(const [id,r]of [['inner',2],['outer',4]]as const)b.path(id,[[r,0,0]],{segments:[{kind:'arc',center:[0,0,0],radii:[r,r],start:0,sweep:90,rotation:0}]});
  b.path('end',[[0,4,0],[0,2,0]]);b.path('start',[[2,0,0],[4,0,0]]);b.path('center-return',[[0,2,0],[0,0,0],[2,0,0]]);
  b.document.profiles.push({id:'low-plan',outer:{paths:['outer','end','-inner','start']},holes:[],interior:[],breaklines:[]},{id:'high-plan',outer:{paths:['inner','center-return']},holes:[],interior:[],breaklines:[]});b.slab('low','low-plan');b.slab('high','high-plan',{elevation:1});assert.ok(gaps(await inspect(b)).length);
  b.wall('seal','inner',{height:.8,thickness:.2});assert.deepEqual(gaps(await inspect(b)),[]);
});
