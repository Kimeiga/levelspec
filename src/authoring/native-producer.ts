/** Native SVGX publication, independent of compatibility source compilers. */
import {compile} from '../vector/compiler.ts';
import {parseLevelSvgx,serializeLevelSvgx} from '../vector/format.ts';
import {validateForRuntime} from '../vector/validate.ts';
import {aborted,type LevelDocument,type Diagnostic,type V3} from '../vector/types.ts';
import type {AssetResolver} from '../vector/props.ts';
export interface ProducerOptions {
  /** Host-controlled imported mesh I/O; publication never fetches assets itself. */
  resolveAsset?: AssetResolver;
  signal?: AbortSignal;
  onProgress?: (stage: string) => void;
  /** Observes verified navigation for placement; never changes acceptance. */
  onReachableSample?: (position: V3, distance: number) => void;
  sampleOrigin?: V3;
}

export class ProducerValidationError extends Error {
  readonly stage: "source" | "vector";
  readonly diagnostics: readonly Pick<Diagnostic, "severity" | "code" | "message" | "objects">[];
  constructor(stage: "source" | "vector", diagnostics: ProducerValidationError["diagnostics"]) {
    super(`${stage} validation failed: ${diagnostics.filter(d => d.severity === "error").map(d => `${d.code}: ${d.message}`).join("; ")}`);
    this.name = "ProducerValidationError";
    this.stage = stage;
    this.diagnostics = diagnostics;
  }
}

export async function produceDocument(document: LevelDocument, options: ProducerOptions = {}) {
  aborted(options.signal);
  if (document.validation === "premap") throw new Error("A premap draft cannot be published as a playable map.");
  if (document.expectFail) throw new Error("An expected-failure fixture cannot be published as a playable map.");
  const text = serializeLevelSvgx(document), parsed = parseLevelSvgx(text);
  const level = await compile(parsed, { resolveAsset: options.resolveAsset, signal: options.signal, onProgress: options.onProgress,
    navigation: { signal: options.signal, onReachableSample: options.onReachableSample, sampleOrigin: options.sampleOrigin } });
  const report = await validateForRuntime(level, { signal: options.signal, sealed: true });
  if (!report.passed) throw new ProducerValidationError("vector", report.diagnostics);
  return { document: parsed, text, level, report };
}


export type ProducedLevel = Awaited<ReturnType<typeof produceDocument>>;
