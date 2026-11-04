import {fields,object,rect,list,finite} from './semantic-check.ts';
import {semanticCells} from './semantic-cells.ts';
import {assignSemanticFloor,type SeedArea} from './semantic-annotation.ts';
import {applySemanticDirectives} from './semantic-directives.ts';
import {placePythonObjects} from './semantic-python-objects.ts';
import {key,unkey} from '../core/grid.ts';
import type {NativeSemanticPlan,SemanticArea,SemanticLayer,CellRect,SemanticMarker} from './semantic-types.ts';

export interface PythonArea extends Omit<SemanticArea,'height'|'cells'> {ceiling?:number;seeds?:CellRect[]}
export interface PythonLayer extends SemanticLayer {traced?:string}
export interface PythonDeclarations {
  ID:string;NAME:string;DESCRIPTION?:string;GRID?:number;WIDTH?:number;HEIGHT?:number;
  WALL_THICKNESS?:number;FLOOR_THICKNESS?:number;LAYER_HEIGHT?:number;LAYERS?:PythonLayer[];AREAS:PythonArea[];
  RAMPS?:{id:string;label?:string;layer?:string;at:CellRect[]}[];
  COVER?:{id:string;label?:string;layer?:string;at:CellRect[];height:number;as?:string}[];
  PORTALS?:{id?:string;between:[string,string];kind?:'door'|'arch'|'window';width?:number|'full';at?:[number,number];head?:number;sill?:number}[];
  STAIRS?:{id:string;label?:string;kind?:'stairs'|'ramp';from:string;from_at:[number,number];to:string;to_at:[number,number];width?:number;rise?:number}[];
  DIRECTIVES?:string[];PLAYER?:NativeSemanticPlan['player'];GAMEPLAY?:{markers?:SemanticMarker[];routes?:NativeSemanticPlan['routes'];noSpawnLos?:[string,string][];moveSpeed?:number};
  MOVE_SPEED?:number;EXPECT_FAIL?:boolean;VALIDATION?:'premap'|'playable';
}
export function parsePythonDeclarations(text:string):PythonDeclarations {
  const root=object(JSON.parse(text),'Python declaration data');fields(root,['format','declarations'],'Python declaration data');
  if(root.format!=='levelspec-python/1')throw new Error('Expected levelspec-python/1 declarations.');
  const d=object(root.declarations,'declarations') as unknown as PythonDeclarations;
  fields(d,['ID','NAME','DESCRIPTION','GRID','WIDTH','HEIGHT','WALL_THICKNESS','FLOOR_THICKNESS','LAYER_HEIGHT','LAYERS','AREAS','RAMPS','COVER','PORTALS','STAIRS','DIRECTIVES','PLAYER','GAMEPLAY','MOVE_SPEED','EXPECT_FAIL','VALIDATION'],'Python declarations');
  for(const name of ['AREAS','LAYERS','RAMPS','COVER','PORTALS','STAIRS','DIRECTIVES'] as const)if(d[name]!==undefined)list(d[name],name);
  checkPythonAreas(d);checkPythonObjects(d);
  if(d.GAMEPLAY)fields(d.GAMEPLAY,['markers','routes','noSpawnLos','moveSpeed'],'GAMEPLAY');
  if(!d.AREAS?.length)throw new Error('Python AREAS must be nonempty.');return d;
}
function checkPythonAreas(d:PythonDeclarations) {
  for(const a of d.AREAS??[]){fields(a,['id','label','role','layer','z','ceiling','rects','holes','seeds','roof'],'Python area');for(const r of [...a.rects??[],...a.holes??[],...a.seeds??[]])rect(r,a.id);}
  for(const l of d.LAYERS??[])fields(l,['id','label','z','height','roof','traced'],'Python layer');
}
function checkPythonObjects(d:PythonDeclarations) {
  for(const c of d.COVER??[]){fields(c,['id','label','layer','at','height','as'],'Python cover');for(const r of c.at)rect(r,c.id);finite(c.height,c.id,.001);}
  for(const r of d.RAMPS??[]){fields(r,['id','label','layer','at'],'Python ramp');for(const a of r.at)rect(a,r.id);}
  checkPythonConnections(d);
}
function checkPythonConnections(d:PythonDeclarations) {
  for(const p of d.PORTALS??[])fields(p,['id','between','kind','width','at','head','sill'],'Python portal');
  for(const f of d.STAIRS??[])fields(f,['id','label','kind','from','from_at','to','to_at','width','rise'],'Python stairs');
}
export function pythonLayers(d:PythonDeclarations):PythonLayer[] {return d.LAYERS??[{id:'ground',z:0,height:d.LAYER_HEIGHT??6,roof:false}];}
export function pythonComposition(d:PythonDeclarations) {
  const composition=d.AREAS.every(a=>a.rects!==undefined),annotation=d.AREAS.every(a=>a.seeds!==undefined);
  if(composition===annotation)throw new Error('AREAS must consistently declare rects (composition) or seeds (annotation).');return composition;
}
function assignedAreas(d:PythonDeclarations,source:Map<string,NativeSemanticPlan>,layers:PythonLayer[]):SemanticArea[] {
  const result:SemanticArea[]=[];
  for(const layer of layers){
    const input=source.get(layer.id);if(!input)throw new Error(`No traced floor for layer ${layer.id}.`);
    const state=semanticCells(input),floor=new Set([...state.layers.values()].flatMap(l=>[...l.owner.keys()]));
    const mine=d.AREAS.filter(a=>(a.layer??layers[0].id)===layer.id),assignment=assignSemanticFloor(floor,mine as SeedArea[]);
    for(const a of mine){const {seeds,ceiling,...rest}=a;result.push({...rest,layer:layer.id,height:ceiling,cells:[...assignment].filter(([,id])=>id===a.id).map(([k])=>unkey(k))});}
  }
  return result;
}
function inherited(plan:NativeSemanticPlan,source:Map<string,NativeSemanticPlan>) {
  const state=semanticCells(plan);
  for(const [lid,input] of source){
    inheritMetadata(plan,input);
    for(const m of input.markers??[])inheritMarker(plan,state,lid,m);
    plan.routes!.push(...input.routes??[]);plan.noSpawnLos!.push(...input.noSpawnLos??[]);
    plan.covers!.push(...(input.covers??[]).map(c=>({...c,layer:lid})));
    requireFootprintSource(input);
  }
}
function requireFootprintSource(input:NativeSemanticPlan) {
  if([input.flights,input.portals,input.boundaries].some(items=>items?.length))throw new Error('Annotation of authored legacy boundaries/flights is unsupported; use native SVGX or the original source directly.');
}
function inheritMetadata(plan:NativeSemanticPlan,input:NativeSemanticPlan) {
  plan.player={...input.player,...plan.player};plan.expectFail=plan.expectFail||input.expectFail;
  plan.moveSpeed??=input.moveSpeed;if(input.validation==='premap')plan.validation='premap';
}
function inheritMarker(plan:NativeSemanticPlan,state:ReturnType<typeof semanticCells>,lid:string,m:SemanticMarker) {
  if(!m.position)throw new Error(`Source marker ${m.id} requires a resolved position for annotation.`);
  const cell=m.position.map(n=>Math.floor(n/plan.grid)) as [number,number],area=state.layers.get(lid)?.owner.get(key(...cell));
  if(!area)throw new Error(`Source marker ${m.id} lost its floor during annotation.`);plan.markers!.push({...m,area});
}
function settings(d:PythonDeclarations,composition:boolean) {
  return {width:composition?(d.WIDTH??48):undefined,height:composition?(d.HEIGHT??48):undefined,
    wallThickness:d.WALL_THICKNESS??(composition?.32:.34),floorThickness:d.FLOOR_THICKNESS??.25};
}
function gameplay(d:PythonDeclarations) {
  return {markers:structuredClone(d.GAMEPLAY?.markers??[]),routes:structuredClone(d.GAMEPLAY?.routes??[]),noSpawnLos:structuredClone(d.GAMEPLAY?.noSpawnLos??[]),moveSpeed:d.MOVE_SPEED??d.GAMEPLAY?.moveSpeed};
}
/** Typed declarations only. No Python process, legacy syntax or native compilation here. */
export function composePythonDeclarations(d:PythonDeclarations,source=new Map<string,NativeSemanticPlan>()):NativeSemanticPlan {
  const composition=pythonComposition(d),layers=pythonLayers(d),first=source.values().next().value;
  const grid=composition?(d.GRID??1.6):(first?.grid??d.GRID);
  if(grid===undefined)throw new Error('Annotation requires its traced source grid.');
  if(!composition&&d.GRID!==undefined&&d.GRID!==grid)throw new Error(`GRID=${d.GRID} disagrees with source grid ${grid}; provide aligned evidence at the requested grid.`);
  if(!composition&&[...source.values()].some(s=>s.grid!==grid))throw new Error('All annotation layers must use the same source grid.');
  const p:NativeSemanticPlan={format:'levelspec-semantic/2',id:d.ID,name:d.NAME,description:d.DESCRIPTION,grid,
    ...settings(d,composition),...gameplay(d),
    player:d.PLAYER,layers:layers.map(({traced,...l})=>l),
    areas:composition?d.AREAS.map(({ceiling,seeds,...a})=>({...a,height:ceiling})):assignedAreas(d,source,layers),
    covers:[],expectFail:d.EXPECT_FAIL,validation:d.VALIDATION,placementDiagnostics:[]};
  if(!composition)inherited(p,source);
  placePythonObjects(d,p,composition);applySemanticDirectives(p,d.DIRECTIVES??[]);return p;
}
