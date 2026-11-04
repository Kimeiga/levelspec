import {edgeLoop,inside,tessellate,orient} from '../vector/geometry.ts';
import type {Layer,LevelDocument,Region,V3} from '../vector/types.ts';
import type {NativeSemanticPlan,SemanticArea} from './semantic-types.ts';
import type {FloorPatches} from './semantic-geometry.ts';

function aligned(rings:V3[][],grid:number,z:number,id:string) {
  for(const ring of rings)for(const [i,p] of ring.entries()){
    const prev=ring[(i+ring.length-1)%ring.length],next=ring[(i+1)%ring.length];
    const corner=Math.abs(orient(prev,p,next))>1e-7;
    const offGrid=corner&&!p.slice(0,2).every(n=>Math.abs(n/grid-Math.round(n/grid))<1e-7);
    if(Math.abs(p[2]-z)>1e-7||offGrid||(p[0]!==next[0]&&p[1]!==next[1]))throw new Error(`${id}: native floor is not aligned to GRID=${grid}; use its exact source grid.`);
  }
}
function cellsWithin(loop:V3[],holes:V3[][],grid:number):[number,number][] {
  const cells:[number,number][]=[],minX=Math.round(Math.min(...loop.map(p=>p[0]))/grid),maxX=Math.round(Math.max(...loop.map(p=>p[0]))/grid),minY=Math.round(Math.min(...loop.map(p=>p[1]))/grid),maxY=Math.round(Math.max(...loop.map(p=>p[1]))/grid);
  if((maxX-minX)*(maxY-minY)>1e6)throw new Error('Native annotation projection exceeds one million cells.');
  for(let y=minY;y<maxY;y++)for(let x=minX;x<maxX;x++){const p=[(x+.5)*grid,(y+.5)*grid];if(inside(p,loop)&&!holes.some(h=>inside(p,h)))cells.push([x,y]);}
  return cells;
}
function projectRegion(document:LevelDocument,layer:Layer,r:Region,curves:Record<string,V3[]>,grid:number):SemanticArea {
  if(r.fill!=='floor'||r.interior.length||r.creases.length)throw new Error(`${r.id}: native annotation requires horizontal floors; finalize authored flights directly.`);
  const loop=edgeLoop(r.boundary,layer,curves),holes=r.holes.map(h=>edgeLoop(h,layer,curves)),z=loop[0][2];aligned([loop,...holes],grid,z,r.id);
  return {id:r.id,label:r.label,role:r.role,layer:layer.id,z,height:r.ceiling===undefined?document.wallHeight:r.ceiling-z,roof:r.ceiling!==undefined,cells:cellsWithin(loop,holes,grid)};
}
/** Exact horizontal grid projection. Curves, slopes and nonaligned corners fail before any footprint changes. */
export function projectNativeFloor(document:LevelDocument,grid:number):NativeSemanticPlan {
  const plan:NativeSemanticPlan={format:'levelspec-semantic/2',id:document.id,name:document.name,description:document.description,grid,
    wallThickness:document.wallThickness,floorThickness:document.floorThickness,player:structuredClone(document.player),expectFail:document.expectFail,validation:document.validation,
    layers:document.layers.map(l=>({id:l.id,label:l.label,z:0,height:document.wallHeight})),areas:[]};
  for(const layer of document.layers){
    const curves=Object.fromEntries(layer.edges.map(e=>{if(e.control?.length)throw new Error('Native annotation cannot project curves; provide raster evidence or aligned floor geometry.');return [e.id,tessellate(e,layer,document.curveTolerance)];}));
    plan.areas.push(...layer.regions.map(r=>projectRegion(document,layer,r,curves,grid)));
  }
  return plan;
}
export function restoreNativeFloors(proposal:LevelDocument,source:LevelDocument,grid:number) {
  const original=projectNativeFloor(source,grid),target=projectNativeFloor({...proposal,layers:proposal.layers.filter(l=>source.layers.some(s=>s.id===l.id))},grid),cells=new Map<string,SemanticArea>();
  for(const a of original.areas)for(const c of a.cells!)cells.set(`${a.layer}:${c}`,a);
  for(const area of target.areas){
    const sources=new Set(area.cells!.map(c=>cells.get(`${area.layer}:${c}`)));if(sources.has(undefined))throw new Error(`${area.id}: annotation changed the native footprint.`);
    const originals=[...sources] as SemanticArea[];
    const regions=originals.map(a=>source.layers.flatMap(l=>l.regions).find(r=>r.id===a.id)!);
    const settings=new Set(regions.map(r=>JSON.stringify([r.ceiling,r.thickness,r.material])));
    if(settings.size!==1)throw new Error(`${area.id}: annotation joins native floors with different ceilings, thickness or materials; align its area boundaries with the source.`);
    const r=proposal.layers.flatMap(l=>l.regions).find(r=>r.id===area.id)!;restoreProperties(r,regions[0],source.floorThickness,(area.z??0)-(originals[0].z??0));
    for(const c of area.cells!)cells.delete(`${area.layer}:${c}`);
  }
  if(cells.size)throw new Error('Annotation removed authored native floor cells.');
}
function restoreProperties(target:Region,source:Region,thickness:number,shift:number) {
  target.ceiling=source.ceiling===undefined?undefined:source.ceiling+shift;target.thickness=source.thickness??thickness;target.material=source.material;
}
/** Partition source property boundaries before shared-edge assembly. */
export function nativeFloorPatches(sources:LevelDocument[],grid:number):FloorPatches {
  const patches:FloorPatches=new Map();
  for(const source of sources)for(const area of projectNativeFloor(source,grid).areas){
    const region=source.layers.flatMap(l=>l.regions).find(r=>r.id===area.id)!;
    const patch={id:area.id,material:region.material,thickness:region.thickness??source.floorThickness,headroom:region.ceiling===undefined?undefined:region.ceiling-area.z!};
    for(const cell of area.cells!)patches.set(`${area.layer}:${cell}`,patch);
  }
  return patches;
}
