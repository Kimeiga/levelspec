import type {GeometryAssembly,Boundary} from './semantic-geometry.ts';
import type {NativeSemanticPlan,SemanticPortal} from './semantic-types.ts';
import {subdivideNativeEdge,nativeBoundaryPoints} from './native-subdivide.ts';

interface Mouth {parts:Boundary[];axis:number;fixed:number;start:number;end:number}
function pairParts(g:GeometryAssembly,a:string,b:string) {
  const parts=g.boundaries.filter(p=>p.surfaces.some(s=>s.area===a)&&p.surfaces.some(s=>s.area===b));
  for(const seam of g.document.seams){const ends=seam.edges.map(id=>g.boundaries.find(p=>p.edge.id===id)!);if(ends.some(p=>p.surfaces[0].area===a)&&ends.some(p=>p.surfaces[0].area===b))parts.push(ends[0].a[2]>=ends[1].a[2]?ends[0]:ends[1]);}
  if(!parts.length)throw new Error(`No physical boundary between ${a} and ${b}.`);
  return parts;
}
function mouthRuns(parts:Boundary[]):Mouth[] {
  const result:Mouth[]=[];
  for(const p of [...parts].sort((a,b)=>Math.min(...a.a.slice(0,2))-Math.min(...b.a.slice(0,2)))){
    const axis=p.a[0]===p.b[0]?1:0,fixed=p.a[1-axis],start=Math.min(p.a[axis],p.b[axis]),end=Math.max(p.a[axis],p.b[axis]);
    result.push({parts:[p],axis,fixed,start,end});
  }
  result.sort((a,b)=>a.axis-b.axis||a.fixed-b.fixed||a.start-b.start);
  const merged:Mouth[]=[];
  for(const r of result){const prev=merged.at(-1);if(prev&&prev.axis===r.axis&&prev.fixed===r.fixed&&Math.abs(prev.end-r.start)<1e-7){prev.end=r.end;prev.parts.push(...r.parts);}else merged.push(r);}
  return merged;
}
function cut(g:GeometryAssembly,portal:SemanticPortal,parts:Boundary[]) {
  const runs=mouthRuns(parts);runs.sort((a,b)=>{
    if(!portal.at)return (b.end-b.start)-(a.end-a.start);
    const distance=(r:Mouth)=>Math.abs(portal.at![1-r.axis]-r.fixed)+Math.abs(portal.at![r.axis]-Math.max(r.start,Math.min(r.end,portal.at![r.axis])));
    return distance(a)-distance(b);
  });
  const run=runs[0],width=portal.width==='full'?run.end-run.start:portal.width;
  if(width>run.end-run.start+1e-7)throw new Error(`${portal.id}: width ${width} exceeds shared straight boundary ${run.end-run.start}.`);
  const center=portal.at?portal.at[run.axis]:(run.start+run.end)/2,start=center-width/2,end=center+width/2;
  if(start<run.start-1e-7||end>run.end+1e-7)throw new Error(`${portal.id}: opening hint is outside its physical boundary.`);
  for(const p of run.parts)cutPart(g,portal,run,p,start,end);
}
function cutPart(g:GeometryAssembly,portal:SemanticPortal,run:Mouth,p:Boundary,start:number,end:number) {
    const lo=Math.max(start,Math.min(p.a[run.axis],p.b[run.axis])),hi=Math.min(end,Math.max(p.a[run.axis],p.b[run.axis]));if(hi-lo<1e-7)return;
    const offsets=[Math.abs(lo-p.a[run.axis]),Math.abs(hi-p.a[run.axis])].sort((a,b)=>a-b);
    const opening=splitOpening(g,p,offsets[0],offsets[1]);
    opening.edge.openings.push({id:g.fresh(portal.id),kind:portal.kind,start:0,end:hi-lo,sill:portal.sill??(portal.kind==='window'?.9:0),head:portal.head??(portal.kind==='arch'?2.4:2.1)});
    for(const seam of g.document.seams)if(seam.edges.includes(opening.edge.id))seam.kind='open';
}
function splitOpening(g:GeometryAssembly,p:Boundary,start:number,end:number):Boundary {
  const length=Math.hypot(p.b[0]-p.a[0],p.b[1]-p.a[1]);
  if(start<1e-7&&end>length-1e-7)return p;
  if(p.edge.openings.length)throw new Error('Overlapping portal declarations cannot split an existing opening.');
  const cuts=[0,start,end,length].filter((n,i,a)=>i===0||n-a[i-1]>1e-7),seams=g.document.seams.filter(s=>s.edges.includes(p.edge.id));
  const pieces=subdivide(g,p,cuts);
  for(const seam of seams){
    const partner=g.boundaries.find(b=>b.edge.id===seam.edges.find(id=>id!==p.edge.id))!,reversed=partner.a[0]!==p.a[0]||partner.a[1]!==p.a[1];
    const others=subdivide(g,partner,reversed?cuts.map(n=>length-n).reverse():cuts);if(reversed)others.reverse();
    g.document.seams.splice(g.document.seams.indexOf(seam),1,...pieces.map((b,i)=>({...seam,id:g.fresh('portal/seam'),edges:[b.edge.id,others[i].edge.id] as [string,string]})));
  }
  return pieces.find((_,i)=>Math.abs(cuts[i]-start)<1e-7)!;
}
function subdivide(g:GeometryAssembly,p:Boundary,cuts:number[]):Boundary[] {
  const edges=subdivideNativeEdge(g.document,p.edge,cuts,g.fresh),pieces=edges.map(edge=>{const [a,b]=nativeBoundaryPoints(g.document,edge);return {...p,edge,a,b};});
  g.boundaries.splice(g.boundaries.indexOf(p),1,...pieces);
  return pieces;
}
function seamKind(g:GeometryAssembly,id:string,kind:'wall'|'open') {for(const seam of g.document.seams)if(seam.edges.includes(id))seam.kind=kind;}
function close(g:GeometryAssembly,parts:Boundary[]) {for(const p of parts){p.edge.kind='wall';p.edge.height=Math.max(...p.surfaces.map(s=>s.height));if(!p.edge.openings.length)seamKind(g,p.edge.id,'wall');}}
export function applySemanticPortals(plan:NativeSemanticPlan,g:GeometryAssembly) {
  for(const b of plan.boundaries??[])applyBoundary(g,b);
  for(const p of plan.portals??[]){const parts=pairParts(g,...p.between);close(g,parts);cut(g,p,parts);}
}
function applyBoundary(g:GeometryAssembly,b:NonNullable<NativeSemanticPlan['boundaries']>[number]) {
  if(!['wall','open'].includes(b.kind))throw new Error(`Unsupported boundary ${b.kind}.`);
  const parts=pairParts(g,...b.between);if(b.kind==='wall')return close(g,parts);
  for(const p of parts){p.edge.kind='open';p.edge.openings=[];seamKind(g,p.edge.id,'open');}
}
