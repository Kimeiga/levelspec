import type {LevelDocument,Seam,V3} from '../vector/types.ts';
import {nativeRegionCells} from './semantic-native-ownership.ts';

interface Side {layer:string;a:V3;b:V3;cells:Set<string>}
interface SourceSeam {seam:Seam;sides:[Side,Side]}
function descriptors(document:LevelDocument,grid:number):SourceSeam[] {
  const cells=nativeRegionCells(document,grid);
  const sides=new Map<string,Side>();
  for(const layer of document.layers){
    const vertices=new Map(layer.vertices.map(v=>[v.id,[v.x,v.y,v.z] as V3]));
    for(const edge of layer.edges){
      const owners=layer.regions.filter(r=>[r.boundary,...r.holes].flat().some(ref=>ref.replace(/^-/,'')===edge.id));
      if(owners.length===1)sides.set(edge.id,{layer:layer.id,a:vertices.get(edge.from)!,b:vertices.get(edge.to)!,cells:cells.get(owners[0].id)!});
    }
  }
  return document.seams.map(seam=>{const pair=seam.edges.map(id=>sides.get(id));if(pair.some(s=>!s))throw new Error(`${seam.id}: cannot retain seam with ambiguous floor ownership.`);return {seam,sides:pair as [Side,Side]};});
}
function along(point:V3,side:Side) {
  const axis=side.a[0]===side.b[0]?1:0;
  return Math.abs(point[1-axis]-side.a[1-axis])<1e-7&&point[axis]>=Math.min(side.a[axis],side.b[axis])-1e-7&&point[axis]<=Math.max(side.a[axis],side.b[axis])+1e-7;
}
function matchesSide(original:Side,target:Side) {
  return original.layer===target.layer&&along(target.a,original)&&along(target.b,original)&&[...target.cells].every(c=>original.cells.has(c));
}
function matches(original:SourceSeam,target:SourceSeam) {
  const [a,b]=original.sides,[c,d]=target.sides;
  return matchesSide(a,c)&&matchesSide(b,d)||matchesSide(a,d)&&matchesSide(b,c);
}
function punchedSpans(original:SourceSeam,grid:number,punched:Set<string>) {
  if(original.seam.kind!=='open'||!punched.size)return [];
  const {a,b}=original.sides[0],axis=a[0]===b[0]?1:0,start=Math.min(a[axis],b[axis]),end=Math.max(a[axis],b[axis]),spans:number[][]=[];
  for(let lo=start;lo<end;lo+=grid){
    const hi=Math.min(end,lo+grid),point=[...a];point[axis]=(lo+hi)/2;
    const removed=original.sides.every(side=>[...side.cells].some(cell=>{
      if(!punched.has(`${side.layer}:${cell}`))return false;
      const center=cell.split(',').map(n=>(Number(n)+.5)*grid);
      return center.every((n,i)=>Math.abs(n-point[i])<=grid/2+1e-7);
    }));
    if(removed)spans.push([lo,hi]);
  }
  return spans;
}
function requireCoverage(original:SourceSeam,matched:SourceSeam[],grid:number,punched:Set<string>) {
  const {a,b}=original.sides[0],axis=a[0]===b[0]?1:0,end=Math.max(a[axis],b[axis]);let cursor=Math.min(a[axis],b[axis]);
  const spans=[...matched.map(m=>m.sides[0]).map(s=>[Math.min(s.a[axis],s.b[axis]),Math.max(s.a[axis],s.b[axis])]),...punchedSpans(original,grid,punched)].sort((a,b)=>a[0]-b[0]);
  for(const [start,stop] of spans){if(Math.abs(start-cursor)>1e-7)throw new Error(`${original.seam.id}: cannot retain seam through overlapping or incomplete transformed boundaries.`);cursor=stop;}
  if(Math.abs(cursor-end)>1e-7)throw new Error(`${original.seam.id}: cannot retain seam after annotation; preserve its two floor boundaries or edit it explicitly.`);
}
/** Source floor ownership disambiguates the two XY-coincident sides after Z edits. */
export function retainNativeSeams(target:LevelDocument,source:LevelDocument,grid:number,punched=new Set<string>(),required=new Set<string>()) {
  if(!source.seams.length)return;
  const relevant={...target,layers:target.layers.filter(l=>source.layers.some(s=>s.id===l.id))};
  const edgeIds=new Set(relevant.layers.flatMap(l=>l.edges.map(e=>e.id)));relevant.seams=target.seams.filter(s=>s.edges.every(id=>edgeIds.has(id)));
  const candidates=descriptors(relevant,grid),claimed=new Set<Seam>();
  for(const original of descriptors(source,grid)){
    const matched=candidates.filter(candidate=>matches(original,candidate));requireCoverage(original,matched,grid,punched);
    for(const {seam} of matched){
      if(claimed.has(seam))throw new Error(`${original.seam.id}: ambiguous overlapping source seams.`);claimed.add(seam);
      const constrained=seam.edges.some(id=>required.has(id));
      if(constrained&&original.seam.kind==='wall'&&seam.kind!=='wall')throw new Error(`${seam.id}: annotation conflicts with an authored native boundary seam.`);
      const {id,edges,...attributes}=original.seam;Object.assign(seam,structuredClone(attributes),constrained?{kind:seam.kind}:{});
    }
  }
}
