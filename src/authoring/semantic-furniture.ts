import {areaCells,floorZ} from './semantic-cells.ts';
import {inside} from '../vector/geometry.ts';
import type {GeometryAssembly} from './semantic-geometry.ts';
import type {SemanticMarker,SemanticState} from './semantic-types.ts';

function covers(state:SemanticState,g:GeometryAssembly) {
  for(const c of state.plan.covers??[]){
    const layer=c.layer??state.plan.layers[0].id,[x,y,w,h]=c.rect,grid=state.plan.grid,z=floorZ(state,layer,[x,y])+(c.z??0);
    checkCoverFloor(state,c,layer,z);
    g.document.covers.push({id:c.id,label:c.label,role:c.role??'cover',layer,min:[x*grid,y*grid,z],max:[(x+w)*grid,(y+h)*grid,z+c.height]});
  }
}
function checkCoverFloor(state:SemanticState,c:NonNullable<SemanticState['plan']['covers']>[number],layer:string,z:number) {
  const [x,y,w,h]=c.rect;
  for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)if(Math.abs(floorZ(state,layer,[xx,yy])+(c.z??0)-z)>1e-7)throw new Error(`${c.id}: cover crosses unequal floor heights.`);
}
function position(state:SemanticState,g:GeometryAssembly,m:SemanticMarker):[number,number] {
  if(m.position)return m.position;
  const a=state.areas.get(m.area);if(!a)throw new Error(`${m.id}: unknown area ${m.area}.`);
  const cells=areaCells(state,m.area),grid=state.plan.grid,layer=a.layer??state.plan.layers[0].id;
  const average=cells.reduce((sum,c)=>[sum[0]+c[0]/cells.length,sum[1]+c[1]/cells.length],[0,0]);
  const candidates=cells.map(c=>({p:[(c[0]+.5)*grid,(c[1]+.5)*grid] as [number,number],distance:Math.hypot(c[0]-average[0],c[1]-average[1])})).sort((a,b)=>a.distance-b.distance);
  const padding=g.document.player.radius+g.document.wallThickness/2;
  for(const {p} of candidates){
    if(g.document.covers.some(c=>c.layer===layer&&p[0]>c.min[0]-padding&&p[0]<c.max[0]+padding&&p[1]>c.min[1]-padding&&p[1]<c.max[1]+padding))continue;
    if(g.boundaries.some(b=>b.layer===layer&&b.edge.kind==='wall'&&distanceTo(p,b.a,b.b)<padding))continue;
    return p;
  }
  throw new Error(`${m.id}: no capsule-clear marker placement in ${m.area}; provide an explicit position or revise geometry.`);
}
function distanceTo(p:number[],a:number[],b:number[]) {const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy)));return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);}
export function semanticFurniture(state:SemanticState,g:GeometryAssembly) {
  covers(state,g);
  for(const m of state.plan.markers??[])placeMarker(state,g,m);
  g.document.routes=structuredClone(state.plan.routes??[]);g.document.noSpawnLos=structuredClone(state.plan.noSpawnLos??[]);
  const names=new Set(g.document.markers.map(m=>m.id));
  for(const [a,b] of [...g.document.routes.map(r=>[r.from,r.to]),...g.document.noSpawnLos])if(!names.has(a)||!names.has(b))throw new Error(`Requirement references unknown marker ${!names.has(a)?a:b}.`);
}
function placeMarker(state:SemanticState,g:GeometryAssembly,m:SemanticMarker) {
    const area=state.areas.get(m.area);if(!area)throw new Error(`${m.id}: unknown area ${m.area}.`);
    const p=position(state,g,m),surface=g.surfaces.find(s=>s.area===m.area&&inside(p,s.points));
    if(!surface)throw new Error(`${m.id}: marker is outside ${m.area} floor.`);
    g.document.markers.push({id:m.id,label:m.label,kind:m.kind,team:m.team,movement:m.movement,region:surface.physicalArea??surface.area,layer:surface.layer,position:[...p,surface.points[0][2]]});
}
