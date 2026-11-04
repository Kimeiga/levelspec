import type {Player,Route,V2,V3} from '../vector/types.ts';

export interface GameplaySpace {
  id:string;
  label?:string;
  role?:string;
  /** Exactly one footprint form. Points run counterclockwise in XY metres. */
  rect?:[number,number,number,number];
  footprint?:V2[];
  z?:number;
  wallHeight?:number;
  /** Physical ceiling clearance, measured above the highest floor point. */
  headroom?:number;
  roof?:boolean;
}
export type GameplayPort = {space:string;at?:number}&(
  {edge:number;side?:never}|{side:'south'|'east'|'north'|'west';edge?:never}
);
export interface GameplayConnection {
  id:string;
  label?:string;
  purpose?:string;
  from:GameplayPort;
  to:GameplayPort;
  kind?:'corridor'|'door'|'ramp'|'stairs';
  width:number;
  wallHeight?:number;
  headroom?:number;
  roof?:boolean;
  rise?:number;
}
export interface GameplayMarker {
  id:string;
  label?:string;
  space:string;
  kind:string;
  team?:string;
  /** Absolute XY metres; Z is supplied by the named floor. */
  position?:V2;
}
export interface GameplayCover {
  id:string;
  label?:string;
  space:string;
  /** XY centre in world metres; Z is an offset above the named floor. */
  position:V3;
  size:V3;
  role?:string;
}
export type GameplayRoute=Omit<Route,'source'|'movement'>&{movement?:'land'};
/** Pinned, additive gameplay authoring schema. No archetype or off-mesh links. */
export interface GameplayPlan {
  format:'levelspec-gameplay/2';
  id:string;
  name:string;
  description?:string;
  player?:Partial<Player>;
  wallThickness?:number;
  wallHeight?:number;
  floorThickness?:number;
  spaces:GameplaySpace[];
  connections:GameplayConnection[];
  covers?:GameplayCover[];
  markers:GameplayMarker[];
  routes?:GameplayRoute[];
  noSpawnLos?:[string,string][];
  moveSpeed?:number;
}
