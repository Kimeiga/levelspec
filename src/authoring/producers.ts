/** Validated compatibility-source producers; native publication stays independent. */
import type {LevelSpec} from '../core/types.ts';
import {validateForRuntime as validateLegacy,type RuntimeValidationReport} from '../core/validate.ts';
import {aborted} from '../vector/types.ts';
import {migrateSpec,migrateText} from './legacy-convert.ts';
import {produceDocument,ProducerValidationError,type ProducerOptions} from './native-producer.ts';
export {produceDocument,ProducerValidationError} from './native-producer.ts';
export type {ProducerOptions,ProducedLevel} from './native-producer.ts';

async function publish(converted:ReturnType<typeof migrateSpec>,options:ProducerOptions) {
  aborted(options.signal);
  const sourceReport:RuntimeValidationReport=validateLegacy(converted.legacy);
  if(!sourceReport.passed)throw new ProducerValidationError('source',sourceReport.diagnostics);
  const produced=await produceDocument(converted.document,options);
  return {...produced,legacy:{level:converted.legacy,report:sourceReport}};
}
/** Compatibility source to native document, without claiming runtime readiness. */
export function planToDocument(text:string) {return migrateText(text);}
export async function produceSpec(spec:LevelSpec,options:ProducerOptions={}) {
  aborted(options.signal);return publish(migrateSpec(spec),options);
}
export async function producePlan(text:string,options:ProducerOptions={}) {
  aborted(options.signal);return publish(planToDocument(text),options);
}
export type ProducedSource=Awaited<ReturnType<typeof producePlan>>;
