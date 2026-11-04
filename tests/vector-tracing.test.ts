import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseRasterTrace,traceToDocument,produceTrace,type RasterTrace} from '../src/tracing/native.ts';
import {produceDocument} from '../src/authoring/native-producer.ts';
import type {LevelDocument} from '../src/vector/types.ts';

function raster(rows:(number|null)[][]):RasterTrace {
  return {format:'levelspec-raster/1',id:'trace_test',name:'Trace test',sourceImage:'radar.png',grid:1,
    colors:[[80,90,100],[160,170,180]],rows};
}
function shape():RasterTrace {
  return raster(Array.from({length:12},(_,north)=>Array.from({length:12},(_,x)=>
    (north>=4&&north<8&&x>=4&&x<8)||(north>=10&&x<2)?null:x<6?0:1)));
}
function polygonsOf(d:LevelDocument) {
  const l=d.layers[0],vertices=new Map(l.vertices.map(v=>[v.id,v])),edges=new Map(l.edges.map(e=>[e.id,e]));
  return l.regions.map(r=>({r,points:r.boundary.map(ref=>{
    const e=edges.get(ref.replace(/^-/,'') )!;return vertices.get(ref.startsWith('-')?e.to:e.from)!;
  })}));
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
  const input=shape(),made=await produceTrace(input),d=made.document,l=d.layers[0];
  assert.equal(made.report.passed,true);assert.equal(d.links.length,0);
  assert.deepEqual([d.player.radius,d.player.height,d.player.step,d.player.crouch,d.player.vault],[0.35,1.8,0.45,1.1,0]);
  assert.equal(d.wallThickness,0.32);assert.equal(d.wallHeight,5);
  const polygons=polygonsOf(d);
  const area=polygons.reduce((sum,{points:p})=>sum+Math.abs(p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a.x*b.y-b.x*a.y;},0))/2,0);
  assert.equal(area,input.rows.flat().filter(c=>c!==null).length);
  assertCells(input,polygons);
  const uses=new Map<string,number>();for(const r of l.regions)for(const ref of r.boundary){const id=ref.replace(/^-/,'');uses.set(id,(uses.get(id)??0)+1);}
  for(const e of l.edges)assert.equal(e.kind,uses.get(e.id)===1?'wall':'open',e.id);
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

test('native trace constraints still pass through the unchanged runtime publication gate',async()=>{
  const d=traceToDocument(raster(Array.from({length:8},()=>Array(12).fill(0))));
  d.markers=[{id:'start',kind:'attacker_spawn',layer:'ground',position:[2.5,3.5,0]},
    {id:'end',kind:'objective',layer:'ground',position:[9.5,3.5,0]}];
  d.routes=[{id:'required',from:'start',to:'end',minRoutes:2}];
  await assert.rejects(()=>produceDocument(d),/ROUTE_REQUIREMENT/);assert.equal(d.routes[0].minRoutes,2);
  d.routes[0].minRoutes=1;d.noSpawnLos=[['start','end']];
  await assert.rejects(()=>produceDocument(d),/SPAWN_LOS/);assert.equal(d.noSpawnLos.length,1);
});

test('raster protocol rejects invalid geometry inputs and native tracing honours cancellation',async()=>{
  const good=shape();assert.deepEqual(parseRasterTrace(JSON.stringify(good)),good);
  for(const change of [{format:'plan'},{grid:0},{grid:-1},{grid:null},{rows:[]},{rows:[[0],[0,0]]},{rows:[[2]]},{rows:[[0.5]]},{rows:[[null]]},{colors:[[300,0,0]]}])
    assert.throws(()=>parseRasterTrace(JSON.stringify({...good,...change})),/raster/i,JSON.stringify(change));
  await assert.rejects(()=>produceTrace(good,{signal:AbortSignal.abort()}),{name:'AbortError'});
});
