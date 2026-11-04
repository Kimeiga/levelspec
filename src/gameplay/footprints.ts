import {area,inside,intersection,orient} from '../vector/geometry.ts';
import {snapCoordinate} from '../vector/precision.ts';
import type {V2,V3} from '../vector/types.ts';
import type {GameplaySpace} from './types.ts';

export function footprint(space:GameplaySpace):V2[] {
  const r=space.rect;
  return (r?[[r[0],r[1]],[r[0]+r[2],r[1]],[r[0]+r[2],r[1]+r[3]],[r[0],r[1]+r[3]]]:space.footprint!)
    .map(p=>p.map(snapCoordinate) as V2);
}
function onSegment(p:V2,a:V2,b:V2):boolean {
  return Math.abs(orient(a,b,p))<1e-8&&p.every((n,i)=>n>=Math.min(a[i],b[i])-1e-8&&n<=Math.max(a[i],b[i])+1e-8);
}
function segmentsTouch(a:V2,b:V2,c:V2,d:V2):boolean {
  return intersection(a,b,c,d)||onSegment(c,a,b)||onSegment(d,a,b)||onSegment(a,c,d)||onSegment(b,c,d);
}
export function checkFootprint(points:V2[],name:string) {
  if(points.length<3||area(points.map(p=>[...p,0] as V3))<=1e-6)
    throw new Error(`${name}: footprint must have positive area and counterclockwise winding.`);
  for(let i=0;i<points.length;i++) {
    const a=points[i],b=points[(i+1)%points.length];
    if(Math.hypot(b[0]-a[0],b[1]-a[1])<0.001)throw new Error(`${name}: footprint has a repeated vertex.`);
    for(let j=i+1;j<points.length;j++) {
      if(j===i+1||(i===0&&j===points.length-1))continue;
      const c=points[j],d=points[(j+1)%points.length];
      if(segmentsTouch(a,b,c,d))
        throw new Error(`${name}: footprint self-intersects or touches itself.`);
    }
  }
}
export function floorPosition(point:V2,space:GameplaySpace,radius=0):boolean {
  const loop=footprint(space);
  if(!inside(point,loop))return false;
  return loop.every((a,i)=>{
    const b=loop[(i+1)%loop.length],dx=b[0]-a[0],dy=b[1]-a[1];
    const t=Math.max(0,Math.min(1,((point[0]-a[0])*dx+(point[1]-a[1])*dy)/(dx*dx+dy*dy)));
    return Math.hypot(point[0]-a[0]-t*dx,point[1]-a[1]-t*dy)>=radius;
  });
}
/** Bounded interior search also handles concave polygons whose centroid is outside. */
export function defaultPosition(space:GameplaySpace,radius:number):V2 {
  const points=footprint(space),xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
  const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
  const centre:V2=[(minX+maxX)/2,(minY+maxY)/2];
  if(floorPosition(centre,space,radius))return centre;
  for(let y=1;y<32;y++)for(let x=1;x<32;x++) {
    const p:V2=[snapCoordinate(minX+(maxX-minX)*x/32),snapCoordinate(minY+(maxY-minY)*y/32)];
    if(floorPosition(p,space,radius))return p;
  }
  throw new Error(`${space.id}: no safe default marker position; author an explicit position.`);
}
