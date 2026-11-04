import type { CompiledLevel, LevelDocument, V3 } from "../vector/types.ts";
import { heightAt } from "../vector/geometry.ts";
import { bakeNavmesh, rayBlocked } from "../vector/validate.ts";
import type { ProducerOptions } from "../authoring/native-producer.ts";
import type { Rng } from "./rng.ts";

export interface Placement { position: V3; layer: string; area: string }
const key = (p: V3) => p.map(v => Math.round(v * 1e5)).join(",");
export const distance = (a: V3, b: V3) => Math.hypot(a[0]-b[0], a[1]-b[1], a[2]-b[2]);

function supportedPoint(level: CompiledLevel, at: V3): Placement | undefined {
  let result: Placement | undefined, nearest = 0.25;
  for (const floor of level.floors) {
    const z = heightAt(floor, at[0], at[1]);
    if (z === undefined || Math.abs(z-at[2]) >= nearest) continue;
    nearest = Math.abs(z-at[2]);
    result = { position: [at[0],at[1],z], layer: floor.layer, area: floor.area ?? floor.region };
  }
  return result;
}

/** Only triangles reached from the observer origin contribute placement points. */
export async function placementPool(level: CompiledLevel, options: ProducerOptions, origin?: V3) {
  const reached = new Map<string, { position: V3; distance: number }>();
  const navigation = await bakeNavmesh(level, { signal: options.signal, sampleOrigin: origin,
    onReachableSample: (position, distance) => reached.set(key(position), { position, distance }) });
  if (!reached.size) throw new Error("No reachable land navigation for run placement.");
  const { positions, indices } = navigation, points = new Map<string, Placement>();
  const n = Math.min(12, Math.max(1, Math.floor(Math.sqrt(8192 / reached.size))));
  const add = (p: V3) => { const supported = supportedPoint(level,p); if(supported) points.set(key(supported.position),supported); };
  for (let i=0;i<indices.length;i+=3) {
    const triangle = indices.slice(i,i+3).map(index=>positions.slice(index*3,index*3+3) as V3);
    const centre = [0,0,0] as V3;
    for(const p of triangle)for(let axis=0;axis<3;axis++)centre[axis]+=p[axis]/3;
    if(!reached.has(key(centre)))continue;
    add(centre);
    for(let a=0;a<n;a++)for(let b=0;b<n-a;b++) {
      const u=(a+1)/(n+2),v=(b+1)/(n+2),w=1-u-v;
      add(triangle[0].map((x,axis)=>x*u+triangle[1][axis]*v+triangle[2][axis]*w) as V3);
    }
  }
  const far = [...reached.values()].sort((a,b)=>b.distance-a.distance)[0];
  return { points:[...points.values()], farthest:supportedPoint(level,far.position) };
}

export function roomyPoint(points: Placement[], rng: Rng): Placement {
  if (!points.length) throw new Error("No supported navigation points.");
  const sample=rng.sample(points,Math.min(100,points.length)),stride=Math.max(1,Math.floor(points.length/1000));
  let best=sample[0],score=-1;
  for(const candidate of sample) {
    let neighbors=0;
    for(let i=0;i<points.length;i+=stride)if(distance(candidate.position,points[i].position)<6)neighbors++;
    if(neighbors>score){best=candidate;score=neighbors;}
  }
  return best;
}

export function spreadPoints(points: Placement[], count: number, origin: V3, rng: Rng, radius: number): Placement[] {
  const shuffled=rng.shuffle([...points]).filter(p=>distance(p.position,origin)>radius*2);
  for(const spacing of [12,8,5,3,2,Math.max(radius*2.1,0.6)]) {
    const kept:Placement[]=[];
    for(const p of shuffled) {
      if(kept.every(q=>distance(p.position,q.position)>=spacing))kept.push(p);
      if(kept.length===count)return kept;
    }
  }
  throw new Error(`Not enough reachable space for ${count} run items.`);
}

export function identifiers(d: LevelDocument) {
  const ids=new Set([d.id]);
  const groups: {id:string}[][]=[d.layers,d.markers,d.routes,d.links,d.covers,d.materials,d.seams,d.lights,d.props??[],d.assets??[],d.references??[]];
  for(const l of d.layers){groups.push(l.vertices,l.edges,l.regions);for(const e of l.edges)groups.push(e.openings);}
  for(const r of d.references??[])groups.push(r.landmarks,r.masks);
  for(const group of groups)for(const o of group)ids.add(o.id);
  return (base:string) => {let id=base,n=2;while(ids.has(id))id=`${base}.${n++}`;ids.add(id);return id;};
}

export function facing(level: CompiledLevel, origin: V3, points: Placement[]) {
  const eye=(p:V3):V3=>[p[0],p[1],p[2]+level.document.player.height*0.9];
  const candidates=points.filter(p=>distance(p.position,origin)<35).sort((a,b)=>distance(b.position,origin)-distance(a.position,origin));
  const target=candidates.slice(0,100).find(p=>!rayBlocked(level,eye(origin),eye(p.position)));
  return target?Math.atan2(target.position[1]-origin[1],target.position[0]-origin[0]):0;
}
