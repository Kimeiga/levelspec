import {SceneBuilder,type AuthoringGroup} from '../vector/authoring.ts';
import {components,decomposeToRects,key} from './cell-grid.ts';
import {cellRectPoints,areaCells} from './semantic-cells.ts';
import {junctions} from './native-junctions.ts';
import type {SemanticState,SemanticArea} from './semantic-types.ts';
import type {FlightSurface} from './semantic-flights.ts';
import type {Edge,LevelDocument,Region,V3} from '../vector/types.ts';

export interface FloorPatch {id:string;material?:string;thickness:number;headroom?:number}
export type FloorPatches=Map<string,FloorPatch>;
export interface FloorSurface {id:string;area:string;physicalArea?:string;label?:string;role?:string;layer:string;points:V3[];height:number;ceiling?:number;fill:Region['fill'];rise?:number;toLayer?:string;patch?:FloorPatch}
export interface Boundary {edge:Edge;layer:string;surfaces:FloorSurface[];a:V3;b:V3}
export interface GeometryAssembly {document:LevelDocument;surfaces:FloorSurface[];boundaries:Boundary[];fresh:(id:string)=>string}
function allocator(state:SemanticState) {
  const p=state.plan,used=new Set([p.id,...p.layers.map(l=>l.id),...p.areas.map(a=>a.id),...(p.markers??[]).map(m=>m.id),...(p.covers??[]).map(c=>c.id),...(p.flights??[]).map(f=>f.id),...(p.routes??[]).map(r=>r.id),...(p.portals??[]).map(r=>r.id)]);
  return (base:string)=>{let id=base,n=1;while(used.has(id)||[...used].some(known=>known.startsWith(id+'/')))id=`${base}.${n++}`;used.add(id);return id;};
}
function surfacesFor(state:SemanticState,flights:FlightSurface[],fresh:(s:string)=>string,patches?:FloorPatches):FloorSurface[] {
  const surfaces=state.plan.areas.flatMap(a=>areaSurfaces(state,a,fresh,patches));
  const points=surfaces.flatMap(s=>s.points);
  for(const f of flights)for(const strip of flightStrips(f,points))surfaces.push({id:fresh(f.id),area:f.id,label:f.label,role:f.kind,layer:f.layer,toLayer:f.toLayer,points:strip,height:state.layers.get(f.layer)!.spec.height??6,fill:f.kind,rise:f.rise});
  return surfaces;
}
function areaSurfaces(state:SemanticState,a:SemanticArea,fresh:(s:string)=>string,patches?:FloorPatches):FloorSurface[] {
    const p=state.plan,surfaces:FloorSurface[]=[];
    const layer=a.layer??p.layers[0].id,l=state.layers.get(layer)!.spec,z=(l.z??0)+(a.z??0),height=areaHeight(a,l);
    const pieces=components(areaCells(state,a.id).map(c=>key(...c)));
    surfaces.push(...pieces.flatMap((cells,i)=>{
      const physicalArea=pieces.length===1?a.id:fresh(`${a.id}/component_${i}`);
      return partition(cells,layer,patches).flatMap(({cells,patch})=>decomposeToRects(cells).map((rect):FloorSurface=>({id:fresh(`floor/${a.id}`),area:a.id,physicalArea,label:a.label,role:a.role,layer,points:cellRectPoints(rect,p.grid,z),height,ceiling:patch?(patch.headroom===undefined?undefined:z+patch.headroom):((a.roof??l.roof)?z+height:undefined),fill:'floor',patch})));
    }));
  return surfaces;
}
function partition(cells:Iterable<string>,layer:string,patches?:FloorPatches) {
  const groups=new Map<string,{cells:Set<string>;patch?:FloorPatch}>();
  for(const c of cells){const patch=patches?.get(`${layer}:${c}`),id=patch?.id??'';if(!groups.has(id))groups.set(id,{cells:new Set(),patch});groups.get(id)!.cells.add(c);}
  return [...groups.values()];
}
function areaHeight(a:SemanticArea,l:SemanticState['plan']['layers'][number]) {return a.height??l.height??6;}
function flightStrips(f:FlightSurface,points:V3[]):V3[][] {
  const low=f.points.filter(p=>p[2]===f.low),axis=low[0][0]===low[1][0]?1:0;
  const start=Math.min(...low.map(p=>p[axis])),end=Math.max(...low.map(p=>p[axis]));
  const cuts=[start,end,...points.filter(p=>p[axis]>start&&p[axis]<end).map(p=>p[axis])].sort((a,b)=>a-b).filter((n,i,a)=>i===0||n-a[i-1]>1e-7);
  return cuts.slice(1).map((end,i)=>f.points.map(p=>{const point=[...p] as V3;point[axis]=p[axis]===start?cuts[i]:end;return point;}));
}
function xyKey(a:V3,b:V3) {return [a.slice(0,2).join(','),b.slice(0,2).join(',')].sort().join('|');}
/** Split true T junctions, including XY boundaries at distinct elevations. */
function splitSurface(s:FloorSurface,surfaces:FloorSurface[]) {
  const candidates=surfaces.filter(o=>o.layer===s.layer||o.toLayer===s.layer||s.toLayer===o.layer).flatMap(o=>o.points);
  // Project candidates onto this plane/flight before invoking the common pure splitter.
  const low=Math.min(...s.points.map(p=>p[2])),high=Math.max(...s.points.map(p=>p[2]));
  const heights=(p:V3):V3=>{
    if(low===high)return [p[0],p[1],low];
    const lows=s.points.filter(p=>p[2]===low),a=lows[0],b=s.points.find(p=>p[2]===high)!,axis=lows[0][0]===lows[1][0]?0:1;
    return [p[0],p[1],low+(p[axis]-a[axis])/(b[axis]-a[axis])*(high-low)];
  };
  const points=junctions(s.points,candidates.map(heights));
  if(s.fill!=='floor'&&points.filter((p,i)=>p[2]===low&&points[(i+1)%points.length][2]===low).length!==1)
    throw new Error(`${s.id}: split lower landing; use a narrower flight or align floor patch ends.`);
  if(s.fill!=='floor'&&points.filter((p,i)=>p[2]===high&&points[(i+1)%points.length][2]===high).length!==1)
    throw new Error(`${s.id}: split upper landing; use a narrower flight or align floor patch ends.`);
  return points;
}
function emit(s:FloorSurface,points:V3[],group:AuthoringGroup,material:string,thickness:number) {
  const r=group.polygon(s.id,points,{fill:s.fill,material:s.patch?.material??material,thickness:s.patch?.thickness??thickness,rise:s.rise});
  r.area=s.physicalArea??s.area;r.label=s.label;r.role=s.role;r.ceiling=s.ceiling;
  if(s.fill==='stairs'){r.rise=s.rise??.18;r.underside='filled';}
  return r;
}
function seal(d:LevelDocument,boundaries:Boundary[],fresh:(s:string)=>string) {
  const byXY=new Map<string,Boundary[]>();
  for(const b of boundaries)if(b.surfaces.length===1){const k=xyKey(b.a,b.b);byXY.set(k,[...byXY.get(k)??[],b]);}
  const seamed=new Set<string>();
  for(const group of byXY.values())seamGroup(d,group,fresh,seamed);
  for(const b of boundaries)if(b.surfaces.length===1&&!seamed.has(b.edge.id)){b.edge.kind='wall';b.edge.height=b.surfaces[0].height;}
}
function seamGroup(d:LevelDocument,group:Boundary[],fresh:(s:string)=>string,seamed:Set<string>) {
  for(let i=0;i<group.length;i++)for(let j=i+1;j<group.length;j++){
    const a=group[i],b=group[j],sa=a.surfaces[0],sb=b.surfaces[0];
    if(a.layer!==b.layer&&sa.toLayer!==b.layer&&sb.toLayer!==a.layer)continue;
    d.seams.push({id:fresh('seam'),edges:[a.edge.id,b.edge.id],kind:'open'});seamed.add(a.edge.id);seamed.add(b.edge.id);
  }
}
export function assembleSemantic(state:SemanticState,flights:FlightSurface[],patches?:FloorPatches):GeometryAssembly {
  const p=state.plan,fresh=allocator(state),scene=new SceneBuilder(p.id),d=scene.document;
  d.materials=[];const material=scene.material(fresh('semantic/material'));d.name=p.name;d.description=p.description;d.wallThickness=p.wallThickness??.32;d.floorThickness=p.floorThickness??.25;d.wallHeight=p.layers[0].height??6;
  d.player={...d.player,radius:.35,height:1.8,step:.45,crouch:1.1,vault:0,...p.player};d.expectFail=p.expectFail;d.validation=p.validation;
  const groups=new Map(p.layers.map(l=>[l.id,scene.group(fresh('semantic'),{},l.id)])),surfaces=surfacesFor(state,flights,fresh,patches),owners=new Map<string,FloorSurface[]>();
  for(const layer of d.layers)layer.label=p.layers.find(l=>l.id===layer.id)?.label;
  for(const s of surfaces){const r=emit(s,splitSurface(s,surfaces),groups.get(s.layer)!,material,d.floorThickness);s.id=r.id;for(const ref of r.boundary){const id=ref.replace(/^-/,'');owners.set(id,[...owners.get(id)??[],s]);}}
  const boundaries:Boundary[]=[];
  for(const l of d.layers){const vertices=new Map(l.vertices.map(v=>[v.id,[v.x,v.y,v.z] as V3]));for(const edge of l.edges)boundaries.push({edge,layer:l.id,surfaces:owners.get(edge.id)!,a:vertices.get(edge.from)!,b:vertices.get(edge.to)!});}
  seal(d,boundaries,fresh);return {document:d,surfaces,boundaries,fresh};
}
