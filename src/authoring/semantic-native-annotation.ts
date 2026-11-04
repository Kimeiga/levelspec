import {projectNativeFloor,nativeFloorPatches} from './semantic-native-projection.ts';
import {semanticCells,areaCells} from './semantic-cells.ts';
import {createSemantic} from './semantic.ts';
import {retainNativeAuthorship} from './semantic-native-source.ts';
import type {NativeSemanticPlan} from './semantic-types.ts';
import type {LevelDocument} from '../vector/types.ts';

/** Explicit Z is relative to a declared origin, otherwise the uniform source base.
 * Omitted area Z retains its original floor; ambiguous multi-height edits fail. */
export function prepareNativeAnnotation(plan:NativeSemanticPlan,sources:LevelDocument[],origins:Map<string,number>) {
  retainSettings(plan,sources);
  const state=semanticCells(plan);
  for(const source of sources)for(const layer of source.layers){
    const original=projectNativeFloor(source,plan.grid).areas.filter(a=>a.layer===layer.id),heights=new Set(original.map(a=>a.z!));
    const target=plan.layers.find(l=>l.id===layer.id)!,base=origins.get(layer.id)??(heights.size===1?[...heights][0]:0);target.z=base;
    const cells=new Map(original.flatMap(a=>a.cells!.map(c=>[c.join(','),a.z!] as const)));
    for(const area of plan.areas.filter(a=>(a.layer??plan.layers[0].id)===layer.id))assignHeight(area,state,cells,base,origins.has(layer.id)||heights.size===1);
  }
}
function assignHeight(area:NativeSemanticPlan['areas'][number],state:ReturnType<typeof semanticCells>,cells:Map<string,number>,base:number,explicit:boolean) {
  if(area.z!==undefined){if(!explicit)throw new Error(`${area.id}: explicit Z requires a layer origin for a nonuniform native source.`);return;}
  const assigned=new Set(areaCells(state,area.id).map(c=>cells.get(c.join(','))));
  if(assigned.size!==1||assigned.has(undefined))throw new Error(`${area.id}: omitted Z spans different source heights; split the annotation or declare an explicit Z and layer origin.`);
  area.z=[...assigned][0]!-base;
}
function retainSettings(plan:NativeSemanticPlan,sources:LevelDocument[]) {
  if(!sources.length)return;
  const first=sources[0],settings=(s:LevelDocument)=>JSON.stringify([s.player,s.wallThickness,s.wallHeight,s.sky,s.boat,s.curveTolerance]);
  if(sources.some(s=>settings(s)!==settings(first)))throw new Error('Native annotation sources disagree on player or global wall, sky, boat or curve settings; reconcile them explicitly.');
  if(Object.entries(plan.player??{}).some(([key,value])=>first.player[key as keyof typeof first.player]!==value))throw new Error('Native annotation must preserve the source PLAYER; edit the native source explicitly to change body limits.');
  plan.player=structuredClone(first.player);plan.wallThickness=first.wallThickness;plan.floorThickness=first.floorThickness;
}
export function createNativeAnnotation(plan:NativeSemanticPlan,sources:LevelDocument[]) {
  let document=createSemantic(plan,nativeFloorPatches(sources,plan.grid));
  for(const source of sources)document=retainNativeAuthorship(document,source,plan.grid);
  return document;
}
