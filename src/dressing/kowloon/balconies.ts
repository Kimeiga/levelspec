import type { V3 } from "../../architecture/types.ts";
import type { Pen } from "../pen.ts";
import type { KitSlot } from "../kit-mesh.ts";
import type { Kit } from "./kit.ts";
import { insetFootprint } from "./footprint.ts";
import { shade } from "./palette.ts";
import { stainedPanel } from "./skin.ts";
import { weatheredPen } from "./weathered.ts";
import { fixingPlate, type Steel } from "./signs/steel.ts";

/** A balcony's shared counterclockwise slab outline, back-left first, in facade-local meters. */
export type BalconyOutline = [V3, V3, V3, V3];

/** Draws a closed slab from a convex outline, with real vertical thickness and a level upper face. */
export function balconySlab(pen: Pen, outline: BalconyOutline, bottom: number, top: number, tint: V3, slot: KitSlot = "concrete"): void {
  const at = (point: V3, z: number): V3 => [point[0], point[1], z];
  pen.face(slot, outline.map(p => at(p, top)), [0,0,1], tint);
  pen.face(slot, outline.map(p => at(p, bottom)), [0,0,-1], tint);
  for (let i=0;i<outline.length;i++) {
    const a=outline[i], b=outline[(i+1)%outline.length];
    pen.face(slot,[at(a,bottom),at(b,bottom),at(b,top),at(a,top)],[b[1]-a[1],a[0]-b[0],0],tint);
  }
}

/** The three exposed edges, ordered left return, front, right return; each pen faces outward. */
export function balconyEdges(pen: Pen, outline: BalconyOutline): {pen: Pen; length: number}[] {
  const path=[outline[0],outline[3],outline[2],outline[1]];
  return path.slice(0,-1).map((a,i)=>{
    const b=path[i+1], length=Math.hypot(b[0]-a[0],b[1]-a[1]);
    const tangent: V3=[(b[0]-a[0])/length,(b[1]-a[1])/length,0];
    return {pen:pen.facing(a,tangent,[-tangent[1],tangent[0],0]),length};
  });
}

/** Builds an open-backed parapet with mitered top/inner corners, leaving no coplanar duplicate finish faces. */
export function balconyParapet(pen: Pen, outline: BalconyOutline, height: number, tint: V3, trim: V3, kit: Kit, key: string): void {
  const inner=insetFootprint(outline,.075);
  const at=(p:V3,z:number):V3=>[p[0],p[1],z];
  const edges=balconyEdges(pen,outline);
  for(let i=1;i<4;i++) {
    const j=(i+1)%4,a=outline[i],b=outline[j],c=inner[j],d=inner[i];
    pen.face("wall",[at(a,height+.035),at(b,height+.035),at(c,height+.035),at(d,height+.035)],[0,0,1],trim);
    pen.face("wall",[at(c,.02),at(d,.02),at(d,height+.035),at(c,height+.035)],[a[1]-b[1],b[0]-a[0],0],tint);
    pen.face("wall",[at(a,height),at(b,height),at(b,height+.035),at(a,height+.035)],[b[1]-a[1],a[0]-b[0],0],trim);
  }
  for(const i of [0,1]) pen.face("wall",[at(outline[i],.02),at(inner[i],.02),at(inner[i],height+.035),at(outline[i],height+.035)],[0,-1,0],tint);
  for(const [i,edge] of edges.entries()) stainedPanel(edge.pen,"wall",{u0:0,u1:edge.length,v0:.02,v1:height},0,tint,kit,.8,kit.rng(`${key}/parapet-${i}`).int(1,2147483647));
}

/** A bolted semicircular steel climbing barrier in the YZ plane, reaching `radius` from its receiving wall. */
export function antiClimbFan(pen: Pen, x: number, z: number, radius: number, tint: V3, kit: Kit): void {
  const metal=weatheredPen(pen,kit,"cage"), steel: Steel={slot:"metal",tint,weathering:kit};
  const y=.025;
  const arc:V3[]=Array.from({length:25},(_,i)=>[x,y+radius*Math.sin(i*Math.PI/24),z+radius*Math.cos(i*Math.PI/24)]);
  metal.tube("metal",arc,.012,tint,8);
  metal.beveledBar("metal",[x,y,z-radius-.04],[x,y,z+radius+.04],[1,0,0],.03,.03,tint);
  for(let i=1;i<12;i++) metal.tube("metal",[[x,y,z],arc[i*2]],.007,tint,6);
  for(const height of [z-radius*.8,z+radius*.8]) fixingPlate(metal,steel,[x,0,height],[1,0,0],[0,0,1],[0,1,0],.09,.13,2);
  metal.disc("metal",[x+.014,y,z],.04,[1,0,0],shade(tint,.8),12);
}
