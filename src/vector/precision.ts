import type {LevelDocument,V3} from './types.ts';
/** Authored linear dimensions use a millimetre lattice; derived mesh values do not. */
export const COORDINATE_STEP = 0.001;
/** Reject nonfinite or unsupported coordinate magnitudes without reducing precision. */
function validateCoordinate(value:number):void {
  if(!Number.isFinite(value))throw new RangeError('Coordinates must be finite.');
  if(Math.abs(value)*1000>Number.MAX_SAFE_INTEGER-1)throw new RangeError('Coordinate exceeds the safe millimetre range.');
}
export function millimetres(value:number):number {
  validateCoordinate(value);
  const scaled=Math.abs(value)*1000;
  // Symmetric half-away-from-zero, including decimal ties represented just below .5.
  const units=Math.floor(scaled+.5+Number.EPSILON*Math.max(1,scaled));
  return units===0?0:Math.sign(value)*units;
}
export const snapCoordinate=(value:number)=>millimetres(value)/1000;
export const coordinateKey=(point:readonly number[])=>point.map(millimetres).join(',');
export const sameCoordinate=(a:readonly number[],b:readonly number[])=>a.length===b.length&&a.every((v,i)=>millimetres(v)===millimetres(b[i]));
/** Snap authored geometry without welding IDs or quantizing calibrated reference cameras. */
export function normalizeCoordinates(document:LevelDocument):LevelDocument {
 const d=structuredClone(document),q=snapCoordinate;
 const optional=(o:any,keys:string[])=>{for(const k of keys)if(o[k]!==undefined)o[k]=q(o[k]);};
 const vector=(v:V3)=>v.map(q) as V3;
 optional(d,['wallThickness','wallHeight','floorThickness','curveTolerance']);
 optional(d.player,['radius','height','step','crouch','vault']);
 if(d.boat)optional(d.boat,['radius','height','draft']);
 for(const l of d.layers){
  for(const v of l.vertices)optional(v,['x','y','z']);
  for(const e of l.edges){optional(e,['height','thickness']);if(e.control)e.control=e.control.map(v=>[q(v[0]),q(v[1])]);for(const o of e.openings)optional(o,['start','end','sill','head']);}
  for(const r of l.regions)optional(r,['ceiling','thickness','rise']);
 }
 for(const m of d.markers)m.position=vector(m.position);
 for(const l of d.lights){l.position=vector(l.position);l.target=vector(l.target);}
 for(const l of d.links){l.from=vector(l.from);l.to=vector(l.to);}
 for(const c of d.covers){c.min=vector(c.min);c.max=vector(c.max);}
 for(const p of d.props??[]){p.position=vector(p.position);if(p.shape!=='asset')p.scale=vector(p.scale);}
 for(const ref of d.references??[]){
  ref.camera.position.forEach(validateCoordinate);ref.camera.target.forEach(validateCoordinate);
  for(const landmark of ref.landmarks)landmark.position=vector(landmark.position);
 }
 for(const r of d.routes)optional(r,['minDistance','maxDistance']);
 return d;
}
