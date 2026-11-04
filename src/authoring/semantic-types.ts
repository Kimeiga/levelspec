import type {LevelDocument,Player,Route,V2} from '../vector/types.ts';

export type Cell = [number,number];
export type CellRect = [number,number,number,number];
export interface SemanticLayer {id:string;label?:string;z?:number;height?:number;roof?:boolean}
/** Rectangles/cells use a south-up integer lattice; Z and heights are metres. Later areas paint earlier ones. */
export interface SemanticArea {
  id:string;label?:string;role?:string;layer?:string;z?:number;height?:number;roof?:boolean;
  rects?:CellRect[];holes?:CellRect[];cells?:Cell[];
}
export interface SemanticCover {id:string;label?:string;role?:string;layer?:string;rect:CellRect;height:number;z?:number}
export interface SemanticFlight {
  id:string;label?:string;kind:'stairs'|'ramp';
  from:{layer:string;cell:Cell};to:{layer:string;cell:Cell};width?:number;rise?:number;
}
export interface SemanticPortal {
  id:string;between:[string,string];kind:'door'|'arch'|'window';
  /** Width and optional hint position in metres. */
  width:number|'full';at?:V2;head?:number;sill?:number;
}
export interface SemanticMarker {id:string;area:string;kind:string;team?:string;label?:string;position?:V2;movement?:'land'|'water'|'none'}
export interface PlacementDiagnostic {id:string;code:string;message:string;proposed:number;placed:number;omitted:number}
export interface NativeSemanticPlan {
  format:'levelspec-semantic/2';id:string;name:string;description?:string;grid:number;
  width?:number;height?:number;wallThickness?:number;floorThickness?:number;player?:Partial<Player>;
  layers:SemanticLayer[];areas:SemanticArea[];covers?:SemanticCover[];flights?:SemanticFlight[];
  portals?:SemanticPortal[];boundaries?:{between:[string,string];kind:'wall'|'open'}[];
  markers?:SemanticMarker[];routes?:Route[];noSpawnLos?:[string,string][];moveSpeed?:number;
  expectFail?:boolean;validation?:LevelDocument['validation'];placementDiagnostics?:PlacementDiagnostic[];
}
export interface FloorState {spec:SemanticLayer;owner:Map<string,string>}
export interface SemanticState {plan:NativeSemanticPlan;layers:Map<string,FloorState>;areas:Map<string,SemanticArea>}
