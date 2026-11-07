import {key,unkey,rectCells,decomposeToRects} from './cell-grid.ts';
import {semanticCells,areaAt} from './semantic-cells.ts';
import type {PythonDeclarations} from './semantic-python.ts';
import type {NativeSemanticPlan,SemanticState,Cell} from './semantic-types.ts';
import {placeSourcePortals} from './semantic-source-portals.ts';
import {verticalFootprint} from './cell-flight-footprint.ts';

export function placePythonCovers(d:PythonDeclarations,p:NativeSemanticPlan,composition:boolean) {
  const state=semanticCells(p);excludeFlights(state);
  const occupied=new Map([...state.layers].map(([id,l])=>[id,new Map(l.owner)]));
  for(const c of d.COVER??[]){
    const layer=c.layer??p.layers[0].id,owner=occupied.get(layer);if(!owner)throw new Error(`${c.id}: unknown layer ${layer}.`);
    const {selected,proposed}=selectCover(c,owner,composition);
    const diagnostic={id:c.id,code:'COVER_PLACEMENT',proposed,placed:selected.size,omitted:proposed-selected.size,message:`${c.id}: ${selected.size}/${proposed} proposed cover cells satisfy the deterministic interior rule.`};
    p.placementDiagnostics!.push(diagnostic);
    emitCover(c,p,state,layer,selected);
  }
}
function excludeFlights(state:SemanticState) {
  for(const f of state.plan.flights??[]){
    const footprint=verticalFootprint({id:f.id,kind:f.kind,from_layer:f.from.layer,to_layer:f.to.layer,from_cell:f.from.cell,to_cell:f.to.cell,width:f.width??2*state.plan.grid},state.plan.grid);
    if(!footprint)throw new Error(`${f.id}: physical flight requires a footprint.`);
    for(const layer of new Set([f.from.layer,f.to.layer]))for(const [x,y] of rectCells(footprint.footprint))state.layers.get(layer)?.owner.delete(key(x,y));
  }
}
type PythonCover=NonNullable<PythonDeclarations['COVER']>[number];
function interior(owner:Map<string,string>,x:number,y:number) {
  const own=owner.get(key(x,y));if(!own)return false;
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(owner.get(key(x+dx,y+dy))!==own)return false;return true;
}
function selectCover(c:PythonCover,owner:Map<string,string>,composition:boolean) {
  const selected=new Set<string>(),cells=c.at.flatMap(r=>[...rectCells(r)]);
  for(const [x,y] of cells)if(interior(owner,x,y)){selected.add(key(x,y));if(composition)owner.set(key(x,y),`cover/${c.id}`);}
  return {selected,proposed:cells.length};
}
function emitCover(c:PythonCover,p:NativeSemanticPlan,state:SemanticState,layer:string,selected:Set<string>) {
  const byArea=new Map<string,string[]>();for(const k of selected){const area=state.layers.get(layer)!.owner.get(k)!;byArea.set(area,[...byArea.get(area)??[],k]);}
  const rectangles=[...byArea.values()].flatMap(cells=>decomposeToRects(cells));
  for(const [index,rect] of rectangles.entries())(p.covers??=[]).push({id:`${c.id}/${index}`,label:c.label,role:c.as??'crate',layer,rect,height:c.height});
}
function ramps(d:PythonDeclarations,p:NativeSemanticPlan,state:SemanticState) {
  for(const r of d.RAMPS??[])placeRamp(r,p,state);
}
function placeRamp(r:NonNullable<PythonDeclarations['RAMPS']>[number],p:NativeSemanticPlan,state:SemanticState) {
    const layer=r.layer??p.layers[0].id,cells=new Set(r.at.flatMap(rect=>[...rectCells(rect)].map(c=>key(...c)))),pts=[...cells].map(unkey);
    if(!pts.length)throw new Error(`${r.id}: empty ramp.`);
    const xs=pts.map(c=>c[0]),ys=pts.map(c=>c[1]),min=[Math.min(...xs),Math.min(...ys)],max=[Math.max(...xs),Math.max(...ys)],axis=max[0]-min[0]>=max[1]-min[1]?0:1;
    const middle=Math.floor((min[1-axis]+max[1-axis])/2),end=(high:boolean):Cell=>axis===0?[high?max[0]:min[0],middle]:[middle,high?max[1]:min[1]];
    const beyond=(high:boolean)=>{const c=end(high);for(let n=1;n<=2;n++){const at=[...c] as Cell;at[axis]+=(high?1:-1)*n;if(state.layers.get(layer)?.owner.has(key(...at))&&!cells.has(key(...at)))return at;}throw new Error(`${r.id}: ramp does not join floor beyond both ends.`);};
    const a=beyond(false),b=beyond(true),az=elevation(state,layer,a),bz=elevation(state,layer,b);
    if(az===bz)throw new Error(`${r.id}: painted ramp endpoints have equal elevation.`);
    (p.flights??=[]).push({id:`climb/${r.id}`,label:r.label,kind:'ramp',from:{layer,cell:az<bz?a:b},to:{layer,cell:az<bz?b:a},width:(max[1-axis]-min[1-axis]+1)*p.grid});
}
function elevation(state:SemanticState,layer:string,cell:Cell) {return areaAt(state,layer,cell).z??0;}
export function placePythonObjects(d:PythonDeclarations,p:NativeSemanticPlan,composition:boolean) {
  const state=semanticCells(p);ramps(d,p,state);
  const portals=(d.PORTALS??[]).map((portal,i)=>({id:portal.id??`portal/${i}`,between:portal.between,kind:portal.kind??'door',width:portal.width==='full'?'full' as const:(portal.width??2)*p.grid,at:portal.at?.map(n=>(n+.5)*p.grid) as Cell|undefined,head:portal.head,sill:portal.sill}));
  placeSourcePortals(p,portals,composition?'composition':'annotation');
  for(const f of d.STAIRS??[])(p.flights??=[]).push({id:`flight/${f.id}`,label:f.label,kind:f.kind??'stairs',from:{layer:f.from,cell:f.from_at},to:{layer:f.to,cell:f.to_at},width:f.width===undefined?undefined:Math.max(1,Math.round(f.width/p.grid))*p.grid,rise:f.rise});
}
