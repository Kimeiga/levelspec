import {createDocument,type Edge,type Layer,type LevelDocument,type Region,type V3} from '../vector/types.ts';
import {coordinateKey,snapCoordinate} from '../vector/precision.ts';
import {junctions} from '../authoring/native-junctions.ts';
import {DEFAULT_PLAYER} from '../vector/types.ts';
import type {GameplayPlan,GameplaySpace,GameplayConnection} from './types.ts';
import {defaultPosition,footprint} from './footprints.ts';
import {connectionMouths,type Mouth} from './ports.ts';
import {orient} from '../vector/geometry.ts';

interface Surface {
  id:string;label?:string;role?:string;points:V3[];fill:Region['fill'];wallHeight:number;ceiling?:number;rise?:number;
}
function corners(points:V3[]):V3[] {
  return points.filter((p,i)=>Math.abs(orient(points[(i+points.length-1)%points.length],p,points[(i+1)%points.length]))>1e-8);
}
function allocator(plan:GameplayPlan) {
  const used=new Set([plan.id,...[...plan.spaces,...plan.connections,...plan.markers,...plan.covers??[],...plan.routes??[]].map(x=>x.id)]);
  return (base:string)=>{let id=base,index=1;while(used.has(id))id=`${base}.${index++}`;used.add(id);return id;};
}
function ceilingFor(plan:GameplayPlan,z:number,s:{roof?:boolean;headroom?:number;wallHeight?:number}) {
  return s.roof||s.headroom!==undefined?z+(s.headroom??s.wallHeight??plan.wallHeight??3):undefined;
}
function spaceSurface(plan:GameplayPlan,s:GameplaySpace):Surface {
  return {id:s.id,label:s.label,role:s.role,points:corners(footprint(s).map(p=>[...p,snapCoordinate(s.z??0)])),
    fill:'floor',wallHeight:s.wallHeight??plan.wallHeight??3,ceiling:ceilingFor(plan,s.z??0,s)};
}
function connectionSurface(plan:GameplayPlan,c:GameplayConnection,spaces:Map<string,GameplaySpace>) {
  const {a,b,points}=connectionMouths(c,spaces),fill=c.kind==='stairs'?'stairs':c.kind==='ramp'?'ramp':'floor';
  const surface:Surface={id:c.id,label:c.label,role:c.purpose,points,fill,wallHeight:c.wallHeight??plan.wallHeight??3,
    ceiling:ceilingFor(plan,Math.max(a.start[2],b.start[2]),c),rise:c.rise};
  return {a,b,surface};
}
function surfacesFor(plan:GameplayPlan) {
  const spaces=new Map(plan.spaces.map(s=>[s.id,s])),mouths:{connection:string;mouth:Mouth;door:boolean;head:number;wallHeight:number}[]=[];
  const surfaces=plan.spaces.map(s=>spaceSurface(plan,s));
  for(const c of plan.connections) {
    const {a,b,surface}=connectionSurface(plan,c,spaces);surfaces.push(surface);
    for(const m of [a,b])mouths.push({connection:c.id,mouth:m,door:c.kind==='door',head:c.headroom??2.1,wallHeight:surface.wallHeight});
  }
  return {surfaces,mouths,spaces};
}
function assemble(surfaces:Surface[],layer:Layer,fresh:(base:string)=>string,thickness:number,material:string) {
  const vertices=new Map<string,string>(),edges=new Map<string,Edge>(),owners=new Map<string,Surface[]>();
  const all=surfaces.flatMap(s=>s.points);
  const vertex=(p:V3)=>{
    const key=coordinateKey(p),existing=vertices.get(key);if(existing)return existing;
    const id=fresh('_gameplay/vertex');vertices.set(key,id);layer.vertices.push({id,x:p[0],y:p[1],z:p[2]});return id;
  };
  for(const s of surfaces) {
    const points=junctions(s.points,all),ids=points.map(vertex);
    const boundary=ids.map((from,i)=>{
      const to=ids[(i+1)%ids.length],key=[from,to].sort().join('|');let edge=edges.get(key);
      if(!edge){edge={id:fresh('_gameplay/edge'),from,to,kind:'open',openings:[]};edges.set(key,edge);layer.edges.push(edge);}
      const refs=owners.get(edge.id)??[];refs.push(s);owners.set(edge.id,refs);
      if(refs.length>2)throw new Error(`${s.id}: more than two floors share a boundary.`);
      return edge.from===from?edge.id:`-${edge.id}`;
    });
    const region:Region={id:s.id,label:s.label,role:s.role,area:s.id,boundary,holes:[],interior:[],creases:[],fill:s.fill,thickness,material,ceiling:s.ceiling};
    if(s.fill==='ramp'||s.fill==='stairs') {
      const z=points.map(p=>p[2]),min=Math.min(...z),max=Math.max(...z);
      const landing=(height:number)=>points.findIndex((p,i)=>p[2]===height&&points[(i+1)%points.length][2]===height);
      region.lower=boundary[landing(min)].replace(/^-/,'');region.upper=boundary[landing(max)].replace(/^-/,'');
      if(s.fill==='stairs'){region.rise=s.rise??0.18;region.underside='sloped';}
    }
    layer.regions.push(region);
  }
  return owners;
}
function seal(layer:Layer,owners:Map<string,Surface[]>,wallMaterial:string) {
  for(const edge of layer.edges) {
    const regions=owners.get(edge.id)!;
    if(regions.length===1){edge.kind='wall';edge.height=regions[0].wallHeight;edge.material=wallMaterial;}
  }
}
function configureMouths(layer:Layer,mouths:ReturnType<typeof surfacesFor>['mouths'],fresh:(base:string)=>string,wallMaterial:string) {
  const vertices=new Map(layer.vertices.map(v=>[v.id,[v.x,v.y,v.z] as V3]));
  for(const {connection,mouth:m,door,head,wallHeight} of mouths) {
    const region=layer.regions.find(r=>r.id===connection)!,host=layer.regions.find(r=>r.id===m.space)!;
    const shared=region.boundary.map(e=>e.replace(/^-/,'')).filter(e=>host.boundary.some(h=>h.replace(/^-/,'')===e));
    if(shared.length!==1)throw new Error(`${connection}: port mouth must be one physical boundary; move junctions outside the mouth.`);
    const edge=layer.edges.find(e=>e.id===shared[0])!;
    const a=vertices.get(edge.from)!,b=vertices.get(edge.to)!;
    if(coordinateKey(a)!==coordinateKey(m.start)&&coordinateKey(a)!==coordinateKey(m.end))throw new Error(`${connection}: malformed port boundary.`);
    if(door){edge.kind='wall';edge.height=wallHeight;edge.material=wallMaterial;
      edge.openings=[{id:fresh('_gameplay/door'),kind:'door',start:0,end:Math.hypot(...b.map((n,i)=>n-a[i])),sill:0,head}];}
  }
}
function furniture(plan:GameplayPlan,d:LevelDocument,spaces:ReturnType<typeof surfacesFor>['spaces'],layer:string,material:string) {
  for(const c of plan.covers??[]) {
    const s=spaces.get(c.space)!,[x,y,z]=c.position,[w,depth,height]=c.size;
    d.covers.push({id:c.id,label:c.label,layer,material,role:c.role??'cover',min:[x-w/2,y-depth/2,(s.z??0)+z],max:[x+w/2,y+depth/2,(s.z??0)+z+height]});
  }
  for(const m of plan.markers) {
    const s=spaces.get(m.space)!,z=s.z??0;
    const clear=(p:number[])=>d.covers.every(c=>c.max[2]<=z||c.min[2]>=z+d.player.height||
      Math.hypot(Math.max(c.min[0]-p[0],0,p[0]-c.max[0]),Math.max(c.min[1]-p[1],0,p[1]-c.max[1]))>d.player.radius+0.15);
    const p=m.position??defaultPosition(s,d.player.radius+0.15,clear);
    d.markers.push({id:m.id,label:m.label,layer,region:m.space,kind:m.kind,team:m.team,position:[p[0],p[1],z]});
  }
}
/** A deterministic authoring proposal; only produceDocument can establish playability. */
export function assembleGameplay(plan:GameplayPlan):LevelDocument {
  const d=createDocument(plan.id),fresh=allocator(plan),layer:Layer={id:fresh('_gameplay/layer'),vertices:[],edges:[],regions:[]};
  d.name=plan.name;d.description=plan.description;d.wallThickness=plan.wallThickness??0.22;d.wallHeight=plan.wallHeight??3;d.floorThickness=plan.floorThickness??0.22;
  d.player={...DEFAULT_PLAYER,radius:0.35,height:1.8,step:0.45,crouch:1.1,vault:0,...plan.player};d.layers.push(layer);
  const floor=fresh('_gameplay/floor'),wall=fresh('_gameplay/wall'),cover=fresh('_gameplay/cover');
  for(const [id,color] of [[floor,'#82909a'],[wall,'#67737b'],[cover,'#a38c64']])d.materials.push({id,color,repeat:1,roughness:0.8,metalness:0});
  const {surfaces,mouths,spaces}=surfacesFor(plan),owners=assemble(surfaces,layer,fresh,d.floorThickness,floor);
  seal(layer,owners,wall);configureMouths(layer,mouths,fresh,wall);furniture(plan,d,spaces,layer.id,cover);
  d.routes=structuredClone(plan.routes??[]);d.noSpawnLos=structuredClone(plan.noSpawnLos??[]);
  return d;
}
