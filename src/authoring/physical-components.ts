/** Sealed navigation clipped to floor ownership. Triangles establish connectivity, never capacity. */
import {heightAt} from '../vector/geometry.ts';
import {aborted,type CompiledLevel,type NavigationReport,type V3} from '../vector/types.ts';

const EPS=1e-5;
type Bounds=[number,number,number,number];
interface Fragment {area:string;points:V3[];bounds:Bounds}
const bounds=(points:V3[]):Bounds=>points.reduce<Bounds>((b,p)=>[Math.min(b[0],p[0]),Math.min(b[1],p[1]),Math.max(b[2],p[0]),Math.max(b[3],p[1])],[Infinity,Infinity,-Infinity,-Infinity]);
const overlaps=(a:Bounds,b:Bounds)=>a[0]<=b[2]+EPS&&a[2]+EPS>=b[0]&&a[1]<=b[3]+EPS&&a[3]+EPS>=b[1];
const cross=(a:V3,b:V3,p:V3)=>(b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]);
function buckets(box:Bounds) {
  const keys:string[]=[];
  for(let x=Math.floor((box[0]-EPS)/8);x<=Math.floor((box[2]+EPS)/8);x++)for(let y=Math.floor((box[1]-EPS)/8);y<=Math.floor((box[3]+EPS)/8);y++)keys.push(`${x},${y}`);
  return keys;
}
function clip(points:V3[],triangle:V3[]) {
  const sign=Math.sign(cross(triangle[0],triangle[1],triangle[2]));
  for(let i=0;i<3&&points.length;i++) {
    const a=triangle[i],b=triangle[(i+1)%3],out:V3[]=[];
    for(let j=0;j<points.length;j++) {
      const p=points[j],q=points[(j+1)%points.length],dp=sign*cross(a,b,p),dq=sign*cross(a,b,q);
      if(dp>=0)out.push(p);
      if((dp<0)!==(dq<0)){const t=dp/(dp-dq);out.push(p.map((v,k)=>v+(q[k]-v)*t) as V3);}
    }
    points=out;
  }
  return points;
}
function surface(points:V3[]) {return {region:'fragment',layer:'',points,loops:[],triangles:Array.from({length:Math.max(0,points.length-2)},(_,i)=>[0,i+1,i+2])};}
function fragments(level:CompiledLevel,navigation:NavigationReport,signal?:AbortSignal) {
  const floors=level.floors.flatMap(f=>f.triangles.map(t=>({area:f.area??f.region,points:t.map(i=>f.points[i])})));
  const index=new Map<string,number[]>(),boxes=floors.map(f=>bounds(f.points));
  floors.forEach((_,i)=>{for(const key of buckets(boxes[i])){if(!index.has(key))index.set(key,[]);index.get(key)!.push(i);}});
  const result:Fragment[]=[],tolerance=level.document.player.step+navigation.settings.cellHeight*2;
  for(let i=0;i<navigation.indices.length;i+=3) {
    aborted(signal);
    const triangle=navigation.indices.slice(i,i+3).map(n=>navigation.positions.slice(n*3,n*3+3) as V3),box=bounds(triangle);
    const candidates=new Set(buckets(box).flatMap(key=>index.get(key)??[]));
    for(const j of candidates) {
      if(!overlaps(box,boxes[j]))continue;
      const floor=floors[j],points=clip(triangle,floor.points);
      if(points.length<3||Math.abs(points.reduce((sum,p,k)=>sum+p[0]*points[(k+1)%points.length][1]-p[1]*points[(k+1)%points.length][0],0))<EPS)continue;
      const center=points.reduce((s,p)=>s.map((v,k)=>v+p[k]/points.length) as V3,[0,0,0] as V3);
      if(Math.abs((heightAt(surface(floor.points),center[0],center[1])??Infinity)-center[2])>tolerance)continue;
      result.push({area:floor.area,points,bounds:bounds(points)});
    }
  }
  return result;
}
interface Side {fragment:number;a:V3;b:V3;bounds:Bounds}
function joined(a:Side,b:Side,tolerance:number) {
  if(!overlaps(a.bounds,b.bounds))return false;
  const dx=a.b[0]-a.a[0],dy=a.b[1]-a.a[1],length=Math.hypot(dx,dy);
  if(length<EPS||Math.abs(cross(a.a,a.b,b.a))/length>EPS||Math.abs(cross(a.a,a.b,b.b))/length>EPS)return false;
  const project=(p:V3)=>((p[0]-a.a[0])*dx+(p[1]-a.a[1])*dy)/length;
  const start=project(b.a),end=project(b.b),lo=Math.max(0,Math.min(start,end)),hi=Math.min(length,Math.max(start,end));
  if(hi-lo<EPS)return false;
  return [lo,hi].every(t=>Math.abs(a.a[2]+(a.b[2]-a.a[2])*t/length-(b.a[2]+(b.b[2]-b.a[2])*(t-start)/(end-start)))<=tolerance);
}
function connect(pieces:Fragment[],tolerance:number,signal?:AbortSignal) {
  const parent=pieces.map((_,i)=>i),index=new Map<string,Side[]>();
  const root=(i:number):number=>parent[i]===i?i:(parent[i]=root(parent[i]));
  for(const [i,piece] of pieces.entries()) {
    aborted(signal);
    piece.points.forEach((_,j)=>{
      const a=piece.points[j],b=piece.points[(j+1)%piece.points.length],side={fragment:i,a,b,bounds:bounds([a,b])},keys=buckets(side.bounds).map(k=>JSON.stringify([piece.area,k]));
      for(const prior of new Set(keys.flatMap(k=>index.get(k)??[])))if(root(i)!==root(prior.fragment)&&joined(side,prior,tolerance))parent[root(i)]=root(prior.fragment);
      for(const key of keys){if(!index.has(key))index.set(key,[]);index.get(key)!.push(side);}
    });
  }
  return pieces.map((_,i)=>root(i));
}
function closestOnSide(point:V3,a:V3,b:V3):V3 {
  const dx=b[0]-a[0],dy=b[1]-a[1],length=dx*dx+dy*dy;
  const t=length?Math.max(0,Math.min(1,((point[0]-a[0])*dx+(point[1]-a[1])*dy)/length)):0;
  return a.map((v,k)=>v+(b[k]-v)*t) as V3;
}
function distanceTo(piece:Fragment,point:V3,snap:number,tolerance:number) {
  const candidates=[point];
  if(snap)piece.points.forEach((p,j)=>candidates.push(closestOnSide(point,p,piece.points[(j+1)%piece.points.length])));
  let best=Infinity;
  for(const p of candidates) {
    const z=heightAt(surface(piece.points),p[0],p[1]);if(z===undefined)continue;
    const horizontal=Math.hypot(p[0]-point[0],p[1]-point[1]),vertical=Math.abs(z-point[2]);
    if(horizontal<=snap+EPS&&vertical<=tolerance)best=Math.min(best,horizontal+vertical);
  }
  return best;
}
export function physicalComponents(level:CompiledLevel,navigation:NavigationReport,signal?:AbortSignal) {
  const pieces=fragments(level,navigation,signal),roots=connect(pieces,navigation.settings.cellHeight*2,signal);
  const ids=new Map<number,string>(),components:{id:string;area:string}[]=[];
  pieces.forEach((p,i)=>{const r=roots[i];if(!ids.has(r)){const id=`component/${ids.size}`;ids.set(r,id);components.push({id,area:p.area});}});
  const locate=(point:V3,area?:string,snap=0):string|undefined=>{
    let best=Infinity,found:string|undefined;
    for(const [i,piece] of pieces.entries()) {
      if(area!==undefined&&piece.area!==area)continue;
      const distance=distanceTo(piece,point,snap,level.document.player.step+navigation.settings.cellHeight*2);
      if(distance<best){best=distance;found=ids.get(roots[i]);}
    }
    return found;
  };
  return {components,locate};
}
