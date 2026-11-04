import type {V3} from '../vector/types.ts';
import {snapCoordinate} from '../vector/precision.ts';
import type {GameplayConnection,GameplayPort,GameplaySpace} from './types.ts';
import {checkFootprint,footprint} from './footprints.ts';

export interface Mouth {start:V3;end:V3;outward:[number,number];space:string;edge:number;low:number;high:number}
function resolvePort(port:GameplayPort,spaces:Map<string,GameplaySpace>) {
  const space=spaces.get(port.space);
  if(!space)throw new Error(`Unknown port space ${port.space}.`);
  if(port.side!==undefined&&!space.rect)throw new Error(`${space.id}: named side ports require a rect space.`);
  const edge=port.side!==undefined?['south','east','north','west'].indexOf(port.side):port.edge;
  const points=footprint(space),a=points[edge],b=points[(edge+1)%points.length];
  if(!a||!Number.isInteger(edge)||edge<0)throw new Error(`${space.id}: unknown port edge ${edge}.`);
  return {space,edge,a,b};
}
function mouth(port:GameplayPort,width:number,spaces:Map<string,GameplaySpace>):Mouth {
  const {space,edge,a,b}=resolvePort(port,spaces);
  const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy),at=port.at??0.5,half=width/(2*length);
  if(at-half < -1e-8||at+half>1+1e-8)throw new Error(`${space.id}: port mouth does not fit edge ${edge}.`);
  // Keep XY on the host line until assembly has inserted and shared these vertices.
  // Native serialization then rounds each shared vertex once, preserving topology.
  const point=(t:number):V3=>[a[0]+t*dx,a[1]+t*dy,snapCoordinate(space.z??0)];
  return {start:point(at-half),end:point(at+half),outward:[dy/length,-dx/length],space:space.id,edge,low:at-half,high:at+half};
}
export function connectionMouths(connection:GameplayConnection,spaces:Map<string,GameplaySpace>) {
  const a=mouth(connection.from,connection.width,spaces),b=mouth(connection.to,connection.width,spaces);
  const dx=(b.start[0]+b.end[0]-a.start[0]-a.end[0])/2,dy=(b.start[1]+b.end[1]-a.start[1]-a.end[1])/2;
  if(a.space===b.space||dx*a.outward[0]+dy*a.outward[1]<=0.001||dx*b.outward[0]+dy*b.outward[1]>=-0.001)
    throw new Error(`${connection.id}: ports must face a positive physical run outside their spaces.`);
  const points=[a.end,a.start,b.end,b.start];
  checkFootprint(points.map(p=>[p[0],p[1]]),connection.id);
  const kind=connection.kind??'corridor',elevated=a.start[2]!==b.start[2];
  if(elevated!==(kind==='ramp'||kind==='stairs'))throw new Error(`${connection.id}: elevation transitions need a ramp or stairs, with distinct landing heights.`);
  return {a,b,points};
}
