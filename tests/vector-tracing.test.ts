import {test} from 'node:test';
import assert from 'node:assert/strict';
import {traceToDocument,produceTrace,type RasterTrace} from '../src/tracing/native.ts';
import {produceDocument} from '../src/architecture/producer.ts';
import type {ArchitectureDocument,ArchitectureElement,Slab} from 'levelspec';
import {rayBlocked} from '../src/vector/validate.ts';

function raster(rows:(number|null)[][]):RasterTrace {
  return {format:'levelspec-raster/1',id:'trace_test',name:'Trace test',sourceImage:'radar.png',grid:1,
    colors:[[80,90,100],[160,170,180]],rows};
}
function shape():RasterTrace {
  return raster(Array.from({length:12},(_,north)=>Array.from({length:12},(_,x)=>
    (north>=4&&north<8&&x>=4&&x<8)||(north>=10&&x<2)?null:x<6?0:1)));
}
function elements(document:ArchitectureDocument):ArchitectureElement[]{const out:ArchitectureElement[]=[];const visit=(element:ArchitectureElement)=>{out.push(element);if('children' in element)element.children.forEach(visit);};document.elements.forEach(visit);return out;}
function polygonsOf(d:ArchitectureDocument) {
  return elements(d).filter((element):element is Slab=>element.kind==='slab').map(r=>{const profile=d.profiles.find(profile=>profile.id===r.profile)!;assert.ok(profile.outer.points);return {r,points:profile.outer.points.map(p=>({x:p[0],y:p[1]}))};});
}
type Polygon=ReturnType<typeof polygonsOf>[number];
function contains({points:p}:Polygon,x:number,y:number) {
  let inside=false;
  for(let i=0,j=p.length-1;i<p.length;j=i++)
    if((p[i].y>y)!==(p[j].y>y)&&x<(p[j].x-p[i].x)*(y-p[i].y)/(p[j].y-p[i].y)+p[i].x)inside=!inside;
  return inside;
}
function assertCells(input:RasterTrace,polygons:Polygon[]) {
  for(let north=0;north<12;north++)for(let x=0;x<12;x++){
    const owners=polygons.filter(p=>contains(p,x+0.5,11-north+0.5));
    const band=input.rows[north][x];assert.equal(owners.length,band===null?0:1,`${x},${north}`);
    if(band!==null)assert.equal(owners[0].r.area,`area_${band}`);
  }
}

test('native tracing preserves every occupied cell, band, courtyard and concave corner',async()=>{
  const input=shape(),made=await produceTrace(input),d=made.document;
  assert.equal(made.report.passed,true);assert.equal(d.links.length,0);
  assert.deepEqual([d.player.radius,d.player.height,d.player.step,d.player.crouch,d.player.vault],[0.35,1.8,0.45,1.1,0]);
  const walls=elements(d).filter(element=>element.kind==='wall');assert.ok(walls.length);assert.ok(walls.every(wall=>wall.thickness===.32&&wall.height===5));
  const polygons=polygonsOf(d);
  const area=polygons.reduce((sum,{points:p})=>sum+Math.abs(p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a.x*b.y-b.x*a.y;},0))/2,0);
  assert.equal(area,input.rows.flat().filter(c=>c!==null).length);
  assertCells(input,polygons);
  for(let north=0;north<12;north++)for(let x=0;x<12;x++)if(input.rows[north][x]!==null){
    for(const [dx,dn] of [[1,0],[0,1]]){
      const nx=x+dx,nn=north+dn,occupied=nn<12&&nx<12&&input.rows[nn][nx]!==null;
      assert.equal(rayBlocked(made.level,[x+.5,11-north+.5,1],[nx+.5,11-nn+.5,1]),!occupied,`Physical boundary ${x},${north} to ${nx},${nn}`);
    }
  }

});

test('native trace publication rejects disconnected and capsule-narrow floor without changing the player',async()=>{
  const disconnected=raster(Array.from({length:8},()=>Array.from({length:17},(_,x)=>x===8?null:0)));
  await assert.rejects(()=>produceTrace(disconnected),/NAV_DISCONNECTED/);
  const narrow=raster([Array(12).fill(0)]);narrow.grid=0.6;
  const d=traceToDocument(narrow);assert.equal(d.player.radius,0.35);
  await assert.rejects(()=>produceTrace(narrow),/NAV_/);
});

test('native tracing preserves document IDs that also name generated objects',async()=>{
  for(const id of ['default','ground','band_0','area_0','trace/floor_0','trace/floor_0/v0','trace/floor_0/e0']){
    const input=raster(Array.from({length:8},()=>Array(12).fill(0)));input.id=id;
    const result=await produceTrace(input);
    assert.equal(result.document.id,id);assert.equal(result.report.passed,true,id);
  }
});

test('native trace publication warns on unproven route multiplicity and rejects demonstrated requirements',async()=>{
  const d=traceToDocument(raster(Array.from({length:8},()=>Array(12).fill(0))));
  d.markers=[{id:'start',kind:'attacker_spawn',layer:'ground',position:[2.5,3.5,0]},
    {id:'end',kind:'objective',layer:'ground',position:[9.5,3.5,0]}];
  d.routes=[{id:'required',from:'start',to:'end',minRoutes:2}];
  const unverified=await produceDocument(d);
  assert.equal(unverified.report.passed,true);
  assert.ok(unverified.report.diagnostics.some(diagnostic=>diagnostic.code==='PHYSICAL_ROUTE_UNVERIFIED'&&diagnostic.severity==='warning'));
  assert.equal(d.routes[0].minRoutes,2);
  d.routes[0].maxDistance=6;
  await assert.rejects(()=>produceDocument(d),/ROUTE_REQUIREMENT/);assert.equal(d.routes[0].maxDistance,6);
  delete d.routes[0].maxDistance;d.routes[0].minRoutes=1;d.noSpawnLos=[['start','end']];
  await assert.rejects(()=>produceDocument(d),/SPAWN_LOS/);assert.equal(d.noSpawnLos.length,1);
});

test('raster protocol rejects invalid geometry inputs and native tracing honours cancellation',async()=>{
  const good=shape();assert.equal(traceToDocument(good).id,good.id);
  for(const change of [{format:'plan'},{grid:0},{grid:-1},{grid:null},{rows:[]},{rows:[[0],[0,0]]},{rows:[[2]]},{rows:[[0.5]]},{rows:[[null]]},{colors:[[300,0,0]]}])
    assert.throws(()=>traceToDocument({...good,...change} as RasterTrace),/raster/i,JSON.stringify(change));
  await assert.rejects(()=>produceTrace(good,{signal:AbortSignal.abort()}),{name:'AbortError'});
});

test('trace derived native object admission is bounded before construction and recovers without changing evidence',async()=>{
  const input=raster(Array.from({length:4},(_,y)=>Array.from({length:4},(_,x)=>(x+y)%2))),before=structuredClone(input);
  assert.throws(()=>traceToDocument(input,{maximumElements:8}),/element|budget|limit/i);
  const recovered=await produceTrace(input);assert.equal(recovered.report.passed,true);assert.deepEqual(input,before);
  assert.throws(()=>traceToDocument(input,{signal:AbortSignal.abort()}),{name:'AbortError'});
  await assert.rejects(produceTrace(input,{signal:AbortSignal.abort()}),{name:'AbortError'});
  assert.deepEqual(input,before);
});
