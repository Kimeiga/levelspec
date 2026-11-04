import {produceDocument,type ProducerOptions} from '../authoring/native-producer.ts';
import {aborted,type LevelDocument} from '../vector/types.ts';
import type {GameplayPlan} from './types.ts';
import {validateGameplayPlan} from './validate-plan.ts';
import {assembleGameplay} from './geometry.ts';
import {assessGameplay} from './analysis.ts';
import {physicalRouteEvidence,requirePhysicalRoutes} from '../authoring/physical-routes.ts';

export type {GameplayPlan,GameplaySpace,GameplayConnection,GameplayPort,GameplayMarker,GameplayCover,GameplayRoute} from './types.ts';
export type {ProducerOptions};
export function parseGameplayPlan(text:string):GameplayPlan {
  const value:unknown=JSON.parse(text);validateGameplayPlan(value);return value;
}
export function createGameplay(plan:GameplayPlan):LevelDocument {
  validateGameplayPlan(plan);return assembleGameplay(plan);
}
export async function produceGameplay(plan:GameplayPlan,options:ProducerOptions={}) {
  aborted(options.signal);
  const source=structuredClone(plan),made=await produceDocument(createGameplay(source),options);
  aborted(options.signal);
  const physical=physicalRouteEvidence(made.level,(made.report.sealed??made.report.navigation)!,options.signal);
  requirePhysicalRoutes(made.level,physical);
  return {...made,assessment:assessGameplay(source,made,physical,options.signal)};
}
