import {key,unkey,rectCells} from './cell-grid.ts';
import type {CellRect,NativeSemanticPlan,SemanticState,SemanticArea} from './semantic-types.ts';

function insideCanvas(plan:NativeSemanticPlan,x:number,y:number) {return (plan.width===undefined||x>=0&&x<plan.width)&&(plan.height===undefined||y>=0&&y<plan.height);}
/** Resolved ownership, independent of compilation. Declared paint order is significant. */
export function semanticCells(plan:NativeSemanticPlan):SemanticState {
  const layers=new Map(plan.layers.map(spec=>[spec.id,{spec,owner:new Map<string,string>()}])),areas=new Map(plan.areas.map(a=>[a.id,a]));
  const state={plan,layers,areas};for(const a of plan.areas)paintArea(state,a);
  for(const a of plan.areas)if(![...layers.values()].some(l=>[...l.owner.values()].includes(a.id)))throw new Error(`${a.id}: area has no floor after declared painting.`);
  return state;
}
function paintArea(state:SemanticState,a:SemanticArea) {
    const {plan,layers}=state;
    const layer=layers.get(a.layer??plan.layers[0].id);if(!layer)throw new Error(`${a.id}: unknown layer ${a.layer}.`);
    const paint=(x:number,y:number,id?:string)=>{if(!insideCanvas(plan,x,y))return;if(id)layer.owner.set(key(x,y),id);else layer.owner.delete(key(x,y));};
    for(const [x,y] of (a.rects??[]).flatMap(r=>[...rectCells(r)]))paint(x,y,a.id);
    for(const [x,y] of a.cells??[])paint(x,y,a.id);
    for(const [x,y] of (a.holes??[]).flatMap(r=>[...rectCells(r)]))paint(x,y);
}
export function areaAt(state:SemanticState,layer:string,cell:[number,number]) {
  const owner=state.layers.get(layer)?.owner.get(key(...cell));if(!owner)throw new Error(`No floor at ${layer} cell ${cell.join(',')}.`);return state.areas.get(owner)!;
}
export function floorZ(state:SemanticState,layer:string,cell:[number,number]) {return (state.layers.get(layer)!.spec.z??0)+(areaAt(state,layer,cell).z??0);}
export function areaCells(state:SemanticState,id:string) {const a=state.areas.get(id);if(!a)throw new Error(`Unknown area ${id}.`);return [...state.layers.get(a.layer??state.plan.layers[0].id)!.owner].filter(([,owner])=>owner===id).map(([k])=>unkey(k));}
export function cellRectPoints([x,y,w,h]:CellRect,grid:number,z:number):[number,number,number][] {return [[x*grid,y*grid,z],[(x+w)*grid,y*grid,z],[(x+w)*grid,(y+h)*grid,z],[x*grid,(y+h)*grid,z]];}
