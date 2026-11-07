import {key,rectCells} from './cell-grid.ts';
import {verticalFootprint} from './cell-flight-footprint.ts';
import {cellRectPoints,floorZ} from './semantic-cells.ts';
import type {SemanticState,SemanticFlight,CellRect} from './semantic-types.ts';
import type {V3} from '../vector/types.ts';

export interface FlightSurface {id:string;label?:string;layer:string;toLayer:string;kind:'stairs'|'ramp';points:V3[];rise?:number;low:number;high:number}
function punch(state:SemanticState,f:SemanticFlight,r:[number,number,number,number]) {
  for(const lid of new Set([f.from.layer,f.to.layer])){
    const owner=state.layers.get(lid)?.owner;if(!owner)throw new Error(`${f.id}: unknown layer ${lid}.`);
    for(const [x,y] of rectCells(r))owner.delete(key(x,y));
  }
}
function flightSurface(state:SemanticState,f:SemanticFlight):FlightSurface {
  const {grid}=state.plan,low=floorZ(state,f.from.layer,f.from.cell),high=floorZ(state,f.to.layer,f.to.cell);
  if(high<=low)throw new Error(`${f.id}: physical flight must go from lower to upper floor.`);
  const [fx,fy]=f.from.cell,[tx,ty]=f.to.cell;
  if(fx!==tx&&fy!==ty)throw new Error(`${f.id}: grid flight endpoints must share X or Y.`);
  const found=verticalFootprint({id:f.id,kind:f.kind,from_layer:f.from.layer,to_layer:f.to.layer,from_cell:f.from.cell,to_cell:f.to.cell,width:f.width??2*grid},grid);
  if(!found?.direction)throw new Error(`${f.id}: physical flight requires a nonzero run.`);
  const {footprint:r,direction}=found,points=slopedPoints(r,grid,direction,low,high);
  // Punch actual slabs and their ceilings in both storeys. No walking link or
  // duplicate flat floor exists beneath the flight's authored footprint.
  punch(state,f,r);
  return {id:f.id,label:f.label,layer:f.from.layer,toLayer:f.to.layer,kind:f.kind,points,rise:f.rise,low,high};
}
function slopedPoints(r:CellRect,grid:number,direction:string,low:number,high:number) {
  const points=cellRectPoints(r,grid,low),axis=direction==='E'||direction==='W'?0:1;
  const lo=r[axis]*grid,hi=(r[axis]+r[axis+2])*grid,positive=direction==='E'||direction==='N';
  for(const p of points)p[2]=(positive?p[axis]===hi:p[axis]===lo)?high:low;return points;
}
export function semanticFlights(state:SemanticState) {return (state.plan.flights??[]).map(f=>flightSurface(state,f));}
