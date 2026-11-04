import type {LevelDocument,V3} from '../vector/types.ts';
import {subdivideNativeEdge} from './native-subdivide.ts';
import {restoreNativeFloors} from './semantic-native-projection.ts';
import {transformedNativeObjects} from './semantic-native-objects.ts';
import {retainNativeSeams} from './semantic-native-seams.ts';
export {projectNativeFloor} from './semantic-native-projection.ts';

function boundaries(d:LevelDocument) {
  return d.layers.flatMap(l=>{const vertices=new Map(l.vertices.map(v=>[v.id,[v.x,v.y,v.z] as V3]));return l.edges.map(edge=>({edge,layer:l.id,a:vertices.get(edge.from)!,b:vertices.get(edge.to)!}));});
}
function along(p:V3,a:V3,b:V3) {const axis=a[0]===b[0]?1:0;return p[1-axis]===a[1-axis]&&p[axis]>=Math.min(a[axis],b[axis])-1e-7&&p[axis]<=Math.max(a[axis],b[axis])+1e-7;}
/** Retain source walls/openings and gameplay after exact floor reassignment. */
export function retainNativeAuthorship(proposal:LevelDocument,source:LevelDocument,grid:number):LevelDocument {
  const d=structuredClone(proposal),allIds=new Set([d.id,...d.layers.flatMap(l=>[l.id,...l.vertices.map(v=>v.id),...l.edges.map(e=>e.id),...l.regions.map(r=>r.id)])]);
  const fresh=(base:string)=>{let i=0,id=base;while(allIds.has(id))id=`${base}.${++i}`;allIds.add(id);return id;};
  // Match the original exact segment endpoints before transferring attributes.
  // Trace output deliberately retains every cell boundary vertex.
  restoreNativeFloors(d,source,grid);
  for(const old of boundaries(source))splitAtOriginal(d,old,fresh);
  const target=boundaries(d);
  for(const original of boundaries(source))transferBoundary(original,target);
  retainNativeSeams(d,source,grid);
  retainObjects(d,source,grid);return d;
}
type Boundary=ReturnType<typeof boundaries>[number];
function splitAtOriginal(d:LevelDocument,old:Boundary,fresh:(s:string)=>string) {
  for(const target of boundaries(d)){
    if(old.layer!==target.layer)continue;
    const length=Math.hypot(target.b[0]-target.a[0],target.b[1]-target.a[1]);
    const cuts=[0,length,...[old.a,old.b].filter(p=>along(p,target.a,target.b)).map(p=>Math.hypot(p[0]-target.a[0],p[1]-target.a[1]))].sort((a,b)=>a-b).filter((n,i,a)=>i===0||n-a[i-1]>1e-7);
    if(cuts.length<=2)continue;
    if(d.seams.some(s=>s.edges.includes(target.edge.id)))throw new Error(`${old.edge.id}: annotation cannot repartition an authored retaining seam; align source regions explicitly.`);
    subdivideNativeEdge(d,target.edge,cuts,fresh);
  }
}
function transferBoundary(original:Boundary,target:Boundary[]) {
    const e=original.edge;if(e.kind==='open'&&!e.openings.length)return;
    const matches=target.filter(b=>b.layer===original.layer&&along(b.a,original.a,original.b)&&along(b.b,original.a,original.b));
    const length=Math.hypot(original.b[0]-original.a[0],original.b[1]-original.a[1]);
    if(Math.abs(matches.reduce((n,b)=>n+Math.hypot(b.b[0]-b.a[0],b.b[1]-b.a[1]),0)-length)>1e-7)throw new Error(`${e.id}: annotation would alter an authored native boundary; align the new regions with its endpoints or use raster evidence for a new proposal.`);
    for(const m of matches)transferAttributes(original,m);
}
function transferAttributes(original:Boundary,m:Boundary) {
      const e=original.edge;
      if(e.baseFloor||e.topFloor||e.spanFloors)throw new Error(`${e.id}: authored floor-anchored boundary needs an explicit native edit before annotation.`);
      const start=Math.hypot(m.a[0]-original.a[0],m.a[1]-original.a[1]),end=Math.hypot(m.b[0]-original.a[0],m.b[1]-original.a[1]),lo=Math.min(start,end),hi=Math.max(start,end);
      const openings=e.openings.filter(o=>o.end>lo&&o.start<hi).map((o,i)=>{const a=Math.max(o.start,lo),b=Math.min(o.end,hi),offsets=[Math.abs(a-start),Math.abs(b-start)].sort((a,b)=>a-b);return {...o,id:`${m.edge.id}/retained_${i}`,start:offsets[0],end:offsets[1]};});
      const {id,from,to,...attributes}=e;Object.assign(m.edge,attributes,{openings});
}
function retainObjects(d:LevelDocument,source:LevelDocument,grid:number) {
  // Source marker positions retain their actual floor association through native
  // inference after labels change. Their IDs are never rewritten by annotation.
  const transformed=transformedNativeObjects(source,d,grid);d.markers.push(...transformed.markers);
  d.routes.push(...structuredClone(source.routes));d.noSpawnLos.push(...structuredClone(source.noSpawnLos));d.covers.push(...transformed.covers);
  if(source.links.length)throw new Error('Native annotation cannot reinterpret authored traversal links; finalize this native document directly.');
  if(source.expectFail)d.expectFail=true;if(source.validation==='premap')d.validation='premap';
  for(const material of source.materials){const old=d.materials.find(m=>m.id===material.id);if(old&&JSON.stringify(old)!==JSON.stringify(material))throw new Error(`Source material ${material.id} conflicts with annotation material.`);if(!old)d.materials.push(structuredClone(material));}
  d.player=structuredClone(source.player);d.wallThickness=source.wallThickness;d.wallHeight=source.wallHeight;d.lights.push(...structuredClone(source.lights));
  d.props=mergeNamed(d.props,source.props);d.assets=mergeNamed(d.assets,source.assets);d.references=mergeNamed(d.references,source.references);d.sky=structuredClone(source.sky);d.boat=structuredClone(source.boat);d.curveTolerance=source.curveTolerance;
}
function mergeNamed<T extends {id:string}>(target:T[]|undefined,source:T[]|undefined):T[] {
  const items=new Map((target??[]).map(item=>[item.id,item]));
  for(const item of source??[]){const old=items.get(item.id);if(old&&JSON.stringify(old)!==JSON.stringify(item))throw new Error(`Conflicting native metadata ID ${item.id}.`);items.set(item.id,structuredClone(item));}
  return [...items.values()];
}
