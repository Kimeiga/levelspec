/** Physical side guards keep walking capsules out of the low underside of a rising flight. */
import {key,rectCells,decomposeToRects} from '../core/grid.ts';
import {verticalFootprint} from '../core/vertical-footprint.ts';
import {semanticCells} from './semantic-cells.ts';
import {semanticFlights} from './semantic-flights.ts';
import type {NativeSemanticPlan,CellRect,SemanticState,SemanticFlight} from './semantic-types.ts';

function flightSides(f:SemanticFlight,grid:number):CellRect[] {
  const {footprint:r,direction}=verticalFootprint({id:f.id,kind:f.kind,from_layer:f.from.layer,to_layer:f.to.layer,from_cell:f.from.cell,to_cell:f.to.cell,width:f.width},grid)!;
  return direction==='N'||direction==='S'?[[r[0]-1,r[1],1,r[3]],[r[0]+r[2],r[1],1,r[3]]]:[[r[0],r[1]-1,r[2],1],[r[0],r[1]+r[3],r[2],1]];
}
function addSupportedCells(set:Set<string>,sides:CellRect[],owner:Map<string,string>) {
  for(const side of sides)for(const c of rectCells(side))if(owner.has(key(...c)))set.add(key(...c));
}

function guardCells(plan:NativeSemanticPlan,state:SemanticState) {
  const cells=new Map<string,Set<string>>();
  for(const f of plan.flights??[]){
    const layer=f.from.layer,set=cells.get(layer)??new Set<string>();cells.set(layer,set);
    addSupportedCells(set,flightSides(f,plan.grid),state.layers.get(layer)!.owner);
  }
  for(const cover of plan.covers??[])for(const c of rectCells(cover.rect))cells.get(cover.layer??plan.layers[0].id)?.delete(key(...c));
  return cells;
}
function placeGuards(plan:NativeSemanticPlan,cells:Map<string,Set<string>>) {
  const ids=new Set([plan.id,...plan.layers.map(l=>l.id),...plan.areas.map(a=>a.id),...(plan.covers??[]).map(c=>c.id),...(plan.flights??[]).map(f=>f.id),...(plan.portals??[]).map(p=>p.id),...(plan.markers??[]).map(m=>m.id),...(plan.routes??[]).map(r=>r.id)]);
  let count=0;
  for(const [layer,set] of cells)for(const rect of decomposeToRects(set)){
    let id=`concept/flight_guard/${count++}`;while(ids.has(id))id+='.1';ids.add(id);
    plan.covers!.push({id,label:'Flight side guard',role:'cover',layer,rect,height:1.1});
  }
  return count;
}
export function guardConceptFlights(source:NativeSemanticPlan) {
  const plan=structuredClone(source),state=semanticCells(plan);semanticFlights(state);
  const count=placeGuards(plan,guardCells(plan,state));
  plan.placementDiagnostics!.push({id:'concept/flight_guards',code:'FLIGHT_SIDE_GUARDS',message:'Added real 1.1m solid side guards on lower-floor cells beside rising flights; source elevations, flight mouths, player and routes are unchanged.',proposed:count,placed:count,omitted:0});
  return plan;
}
