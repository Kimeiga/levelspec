/** Reusable native semantic geometry, with no parser, Python or legacy compiler dependency. */
import {aborted,type LevelDocument} from '../vector/types.ts';
import {produceDocument,type ProducerOptions} from './native-producer.ts';
import {physicalRouteEvidence,requirePhysicalRoutes} from './physical-routes.ts';
import {checkSemantic} from './semantic-check.ts';
import {semanticCells} from './semantic-cells.ts';
import {semanticFlights} from './semantic-flights.ts';
import {assembleSemantic,type FloorPatches} from './semantic-geometry.ts';
import {applySemanticPortals} from './semantic-portals.ts';
import {semanticFurniture} from './semantic-furniture.ts';
import type {NativeSemanticPlan} from './semantic-types.ts';
export type * from './semantic-types.ts';
export type {ProducerOptions};
export function parseSemanticPlan(text:string):NativeSemanticPlan {const plan:unknown=JSON.parse(text);checkSemantic(plan);return plan;}
export function createSemantic(plan:NativeSemanticPlan,patches?:FloorPatches):LevelDocument {
  const {state,assembly}=createSemanticGeometry(plan,patches);semanticFurniture(state,assembly);return assembly.document;
}
/** Geometry stage shared with native annotation, before automatic object placement. */
export function createSemanticGeometry(plan:NativeSemanticPlan,patches?:FloorPatches) {
  checkSemantic(plan);const state=semanticCells(plan),flights=semanticFlights(state),assembly=assembleSemantic(state,flights,patches);
  applySemanticPortals(plan,assembly);return {state,assembly};
}
/** The same strict native + physical gates also apply to retained native sources. */
export async function publishSemanticDocument(document:LevelDocument,options:ProducerOptions={}) {
  aborted(options.signal);const result=await produceDocument(document,options);
  const land={...result.level,document:{...result.document,routes:result.document.routes.filter(r=>r.movement!=='water')}};
  const physical=physicalRouteEvidence(land,(result.report.sealed??result.report.navigation)!,options.signal);
  requirePhysicalRoutes(land,physical);return {...result,physical:{...physical,movement:'land' as const}};
}
export async function produceSemantic(plan:NativeSemanticPlan,options:ProducerOptions={}) {
  aborted(options.signal);const source=structuredClone(plan),result=await publishSemanticDocument(createSemantic(source),options);
  return {...result,placementDiagnostics:source.placementDiagnostics??[],moveSpeed:source.moveSpeed??4.6};
}
