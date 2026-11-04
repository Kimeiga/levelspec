import {decomposeToRects,unkey} from '../core/grid.ts';
import type {CompiledLevel,LevelSpec,Solid} from '../core/types.ts';
import type {LevelDocument,Layer,V3,Edge,Vertex} from '../vector/types.ts';
import {snapCoordinate} from '../vector/precision.ts';

interface FloorRectangle {bounds:number[];area:string}
function intersectsCell(cx:number,cy:number,g:number,b:number[]) {
  return (cx+1)*g>b[0]&&cx*g<b[2]&&(cy+1)*g>b[1]&&cy*g<b[3];
}
function rampRectangle(s:Solid,old:CompiledLevel,g:number):FloorRectangle[] {
  const [x,y]=s.box.min,[X,Y]=s.box.max;
  const centre=`${Math.floor((x+X)/2/g)},${Math.floor((y+Y)/2/g)}`;
  return [{area:old.occupancy.get(s.layer)?.get(centre)??s.id.replace(/_(?:step|slice)_\d+$/,''),bounds:[x,y,X,Y]}];
}
function floorRectangles(s:Solid,old:CompiledLevel,spec:LevelSpec):FloorRectangle[] {
  const [x,y]=s.box.min,[X,Y]=s.box.max,g=spec.grid??1;
  if(s.role!=='floor')return rampRectangle(s,old,g);
  const groups=new Map<string,Set<string>>();
  for(const [cell,space] of old.occupancy.get(s.layer)??[]) {
    const [cx,cy]=unkey(cell);
    if(!intersectsCell(cx,cy,g,[x,y,X,Y]))continue;
    const cells=groups.get(space)??new Set<string>();cells.add(cell);groups.set(space,cells);
  }
  return [...groups].flatMap(([area,cells])=>decomposeToRects(cells).map(([cx,cy,w,h])=>({area,bounds:[Math.max(x,cx*g),Math.max(y,cy*g),Math.min(X,(cx+w)*g),Math.min(Y,(cy+h)*g)]})));
}

/** Intersection of straight edges at the same elevation, excluding endpoints. */
function crossing(a:Edge,b:Edge,vertices:Map<string,Vertex>) {
  const A=vertices.get(a.from)!,B=vertices.get(a.to)!,C=vertices.get(b.from)!,D=vertices.get(b.to)!;
  const dx=B.x-A.x,dy=B.y-A.y,ex=D.x-C.x,ey=D.y-C.y,den=dx*ey-dy*ex;
  if(Math.abs(den)<1e-9)return;
  const t=((C.x-A.x)*ey-(C.y-A.y)*ex)/den,u=((C.x-A.x)*dy-(C.y-A.y)*dx)/den;
  if(t<=1e-7||t>=1-1e-7||u<=1e-7||u>=1-1e-7)return;
  const z=A.z+t*(B.z-A.z);
  if(Math.abs(z-C.z-u*(D.z-C.z))>1e-7)return;
  return {t,u,position:[A.x+t*dx,A.y+t*dy,z] as V3};
}

type Cuts=Map<string,{t:number;id:string}[]>;
function replaceEdges(layer:Layer,cuts:Cuts,id:(s:string)=>string) {
  const replacements=new Map<string,string[]>(),next:Edge[]=[];
  for(const e of layer.edges) {
    const points=cuts.get(e.id)!.sort((a,b)=>a.t-b.t).filter((v,i,a)=>i===0||Math.abs(v.t-a[i-1].t)>1e-7),parts:string[]=[];
    for(let i=1;i<points.length;i++) {
      const part=i===1?e.id:id(e.id+'.part'+i);parts.push(part);
      next.push({...e,id:part,from:points[i-1].id,to:points[i].id});
    }
    replacements.set(e.id,parts);
  }
  const rewrite=(refs:string[])=>refs.flatMap(ref=>ref.startsWith('-')?[...replacements.get(ref.slice(1))!].reverse().map(x=>'-'+x):replacements.get(ref)!);
  for(const r of layer.regions){r.boundary=rewrite(r.boundary);r.holes=r.holes.map(rewrite);}
  layer.edges=next;
}

const wallRoles=new Set(['static_hard','exterior_wall','soft_panel','glass','reinforcement_slot','sill','lintel','riser']);
export class LegacyGeometry {
  readonly document:LevelDocument;
  private old:CompiledLevel;
  private spec:LevelSpec;
  readonly layers=new Map<string,Layer>();
  private used:Set<string>;
  private vertices=new Map<string,string>();
  private edges=new Map<string,{id:string;from:string;to:string}>();
  constructor(document:LevelDocument,old:CompiledLevel,spec:LevelSpec) {
    this.document=document;this.old=old;this.spec=spec;
    this.used=new Set([document.id]);
    for(const l of spec.layers) {
      const layer:Layer={id:this.id(l.id),label:l.label,vertices:[],edges:[],regions:[]};
      this.layers.set(l.id,layer);document.layers.push(layer);
    }
  }
  id=(s:string)=>{
    let base=s.replace(/[^\w.:/-]/g,'_');if(!/^[A-Za-z_]/.test(base))base='id_'+base;
    let result=base,i=1;while(this.used.has(result))result=`${base}.${i++}`;
    this.used.add(result);return result;
  };
  private vertex(layer:Layer,p:V3,area='') {
    const key=`${layer.id}:${area}:${p.join(',')}`,existing=this.vertices.get(key);
    if(existing)return existing;
    const id=this.id(`v${this.vertices.size}`);layer.vertices.push({id,x:p[0],y:p[1],z:p[2]});this.vertices.set(key,id);return id;
  }
  private edge(layer:Layer,a:string,b:string) {
    const key=`${layer.id}:${[a,b].sort().join('|')}`,existing=this.edges.get(key);
    if(existing)return existing.from===a?existing.id:`-${existing.id}`;
    const e={id:this.id(`e${this.edges.size}`),from:a,to:b,kind:'open' as const,openings:[]};
    this.edges.set(key,e);layer.edges.push(e);return e.id;
  }
  private floor(s:Solid,layer:Layer) {
    const z=s.box.min[2],Z=s.box.max[2];
    for(const {area,bounds:[x,y,X,Y]} of floorRectangles(s,this.old,this.spec)) {
      const points:V3[]=[[x,y,Z],[X,y,Z],[X,Y,Z],[x,Y,Z]],vs=points.map(p=>this.vertex(layer,p,area));
      // Derive depth from snapped end planes so rounded ramps stay on their slabs.
      layer.regions.push({id:this.id(s.id),label:s.label??area,area,role:s.role,fill:'floor',boundary:vs.map((v,i)=>this.edge(layer,v,vs[(i+1)%4])),holes:[],interior:[],creases:[],thickness:snapCoordinate(Z)-snapCoordinate(z)});
    }
  }
  private wall(s:Solid,layer:Layer,owner:string) {
    const [x,y,z]=s.box.min,[X,Y,Z]=s.box.max,alongX=X-x>=Y-y;
    const a:V3=alongX?[x,(y+Y)/2,z]:[(x+X)/2,y,z],b:V3=alongX?[X,(y+Y)/2,z]:[(x+X)/2,Y,z];
    const from=this.id(`${s.id}.a`),to=this.id(`${s.id}.b`);
    layer.vertices.push({id:from,x:a[0],y:a[1],z:a[2]},{id:to,x:b[0],y:b[1],z:b[2]});
    const kind=s.dynamic?(s.role==='glass'?'glass':'soft'):'wall';
    layer.edges.push({id:this.id(s.id),label:`${s.role}: ${owner}`,from,to,kind,height:snapCoordinate(Z)-snapCoordinate(z),thickness:Math.min(X-x,Y-y),openings:[]});
  }
  add(s:Solid) {
    const layer=this.layers.get(s.layer)??this.document.layers[0];if(!layer)return;
    const owner=s.spaces.filter(x=>x!=='__outside__').join('/')||s.id;
    if(['floor','ramp','stair'].includes(s.role)&&!s.dynamic)this.floor(s,layer);
    else if(wallRoles.has(s.role))this.wall(s,layer,owner);
    else this.document.covers.push({id:this.id(s.id),label:s.label??owner,layer:layer.id,min:[...s.box.min],max:[...s.box.max],dynamic:s.dynamic,role:s.role});
  }
  splitCrossings() {
    for(const layer of this.document.layers) {
      const vertices=new Map(layer.vertices.map(v=>[v.id,v]));
      const cuts:Cuts=new Map(layer.edges.map(e=>[e.id,[{t:0,id:e.from},{t:1,id:e.to}]]));
      for(const [i,a] of layer.edges.entries())for(const b of layer.edges.slice(i+1)) {
        const c=crossing(a,b,vertices);if(!c)continue;
        const id=this.vertex(layer,c.position);cuts.get(a.id)!.push({t:c.t,id});cuts.get(b.id)!.push({t:c.u,id});
      }
      replaceEdges(layer,cuts,this.id);
    }
  }
}
