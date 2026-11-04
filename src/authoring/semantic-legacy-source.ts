/** Explicit .plan input boundary only. No old compiler, navigation or converter is loaded. */
import {parsePlan,planToSpec} from './plan.ts';
import type {NativeSemanticPlan} from './semantic-types.ts';
import type {SemanticSource} from './semantic-sources.ts';
import {applySemanticDirectives} from './semantic-directives.ts';
import {placeSourcePortals} from './semantic-source-portals.ts';
import type {LevelSpec,LayerSpec,MarkerSpec,PortalSpec} from '../core/types.ts';

function booleanHeader(value:string,key:string) {if(!['true','false','yes','no'].includes(value))throw new Error(`Invalid ${key} flag ${value}.`);return value==='true'||value==='yes';}
function headers(plan:NativeSemanticPlan,h:Record<string,string>) {
  const allowed=new Set(['id','name','description','grid','source_image','wall_thickness','floor_thickness','stair_style','expect_fail','validation','move_speed','player','radius','height','step','crouch','vault','slope','rappel','ladder']);
  for(const k of Object.keys(h))if(!allowed.has(k))throw new Error(`Unsupported requirement-bearing plan header '${k}'.`);
  if(h.expect_fail!==undefined)plan.expectFail=booleanHeader(h.expect_fail,'expect_fail');
  if(h.validation!==undefined){if(!['premap','playable'].includes(h.validation))throw new Error(`Unsupported validation ${h.validation}.`);plan.validation=h.validation as 'premap'|'playable';}
  if(h.move_speed!==undefined)plan.moveSpeed=Number(h.move_speed);
  if(h.stair_style!==undefined)stairStyle(plan,h.stair_style);
  playerHeaders(plan,h);
}
function stairStyle(plan:NativeSemanticPlan,style:string) {
  if(!['ramp','stepped'].includes(style))throw new Error(`Unsupported stair_style ${style}.`);
  if(style==='ramp')for(const flight of plan.flights??[])if(flight.kind==='stairs')flight.kind='ramp';
}
function playerHeaders(plan:NativeSemanticPlan,h:Record<string,string>) {
  if(h.player!==undefined)plan.player={...plan.player,...JSON.parse(h.player)};
  for(const k of ['radius','height','step','crouch','vault','slope'] as const)if(h[k]!==undefined)(plan.player??={})[k]=Number(h[k]);
  for(const k of ['rappel','ladder'] as const)if(h[k]!==undefined)(plan.player??={})[k]=booleanHeader(h[k],k);
}
function basePlan(spec:LevelSpec):NativeSemanticPlan {
  return {format:'levelspec-semantic/2',id:spec.id,name:spec.name,description:spec.description,grid:spec.grid??2,
    // Native construction applies the same historical defaults. Only explicit
    // headers below are source constraints; parser defaults must not block supplements.
    wallThickness:spec.wall_thickness,floorThickness:spec.floor_thickness,
    layers:spec.layers.map(l=>({id:l.id,label:l.label,z:l.z,height:l.height,roof:l.roof})),
    areas:spec.layers.flatMap(l=>l.spaces.map(a=>({id:a.id,label:a.label,role:a.role,layer:l.id,z:a.z_offset,height:a.height,rects:[a.rect,...a.extra??[]],holes:a.subtract}))),
    covers:spec.covers?.map(c=>({id:c.id,label:c.label,role:c.material,layer:c.layer,rect:c.rect,height:c.height})),
    markers:[],routes:[],noSpawnLos:[],
    portals:[],boundaries:[],flights:[]};
}
function layerRequirements(plan:NativeSemanticPlan,l:LayerSpec) {
    const grid=plan.grid;
    if(l.railing!==undefined||l.spaces.some(a=>a.railing!==undefined))throw new Error(`${l.id}: legacy railing-height syntax requires explicit native edge authoring; use --legacy for the original source path.`);
    if(l.floor_holes?.length)throw new Error(`${l.id}: source floor_holes require explicit semantic area holes.`);
    for(const w of l.wall_overrides??[])plan.boundaries!.push({between:w.between,kind:'wall'});
    for(const p of l.portals??[])plan.portals!.push(sourcePortal(p,grid));
}
function sourcePortal(p:PortalSpec,grid:number):NonNullable<NativeSemanticPlan['portals']>[number] {
  return {id:p.id,between:p.between,kind:p.kind as 'door'|'arch'|'window',width:p.width_cells==='full'?'full':(p.width_cells??2)*grid,at:p.hint?.map(n=>(n+.5)*grid) as [number,number]|undefined,head:p.head,sill:p.sill};
}
function flights(plan:NativeSemanticPlan,spec:LevelSpec) {
  for(const f of spec.vertical_connections??[]){if(f.kind!=='stairs'&&f.kind!=='ramp')throw new Error(`Unsupported native ability-specific source connection '${f.kind}'.`);plan.flights!.push({id:f.id,label:f.label,kind:f.kind,from:{layer:f.from_layer,cell:f.from_cell},to:{layer:f.to_layer,cell:f.to_cell},width:f.width===undefined?undefined:Math.max(1,Math.round(f.width/plan.grid))*plan.grid});}
}
function sourceMarker(plan:NativeSemanticPlan,m:MarkerSpec) {
    const area=plan.areas.find(a=>a.layer===m.layer&&a.rects!.some(([x,y,w,h])=>m.cell[0]>=x&&m.cell[0]<x+w&&m.cell[1]>=y&&m.cell[1]<y+h));
    if(!area)throw new Error(`${m.id}: marker has no source floor.`);
    plan.markers!.push({id:m.id,area:area.id,kind:m.kind,label:m.label,team:m.team,position:[(m.cell[0]+.5)*plan.grid,(m.cell[1]+.5)*plan.grid]});
}
function provisional(plan:NativeSemanticPlan,parsed:ReturnType<typeof parsePlan>) {
  const requirements=[parsed.directives.length,plan.covers?.length,plan.flights?.length,plan.expectFail,plan.validation];
  return !!parsed.header.source_image&&!requirements.some(Boolean)&&plan.layers.length===1&&plan.areas.every(a=>!a.z);
}
export function decodeLegacySemantic(text:string):SemanticSource {
  const parsed=parsePlan(text),spec=planToSpec(text),plan=basePlan(spec);
  for(const l of spec.layers)layerRequirements(plan,l);flights(plan,spec);
  for(const m of spec.gameplay?.markers??[])sourceMarker(plan,m);
  headers(plan,parsed.header);
  const portals=plan.portals!;plan.portals=[];placeSourcePortals(plan,portals,'legacy');
  // The old source parser does not interpret distance/movement suffixes. Read
  // those hard requirements directly instead of losing them at this boundary.
  plan.routes=[];plan.noSpawnLos=[];
  applySemanticDirectives(plan,parsed.directives.filter(d=>['route','no_spawn_los'].includes(d.parts[0])).map(d=>d.parts.map(p=>JSON.stringify(p)).join(' ')));
  return {kind:'semantic',plan,provisional:provisional(plan,parsed)};
}
