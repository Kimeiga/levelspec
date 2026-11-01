/** Model-agnostic reconstruction loop. An AI supplies proposed SVGX edits; the compiler and evaluator decide what passed. */
import { compile, parseLevelSvgx, validateForRuntime } from "../vector/index.ts";
import type { CompiledLevel } from "../vector/types.ts";
import { evaluateReconstruction, type PhotoEvidence, type ReconstructionReport,
  type ReconstructionThresholds } from "./evaluate.ts";

export interface ReconstructionAttempt {
  iteration: number;
  source: string;
  valid: boolean;
  accepted: boolean;
  report: ReconstructionReport | null;
  diagnostics: string[];
  score: number;
}
export interface RevisionRequest {
  /** Zero-based candidate number about to be produced. */
  iteration: number;
  previousSource: string;
  lastAttempt: ReconstructionAttempt | null;
  attempts: readonly ReconstructionAttempt[];
}
export type ReconstructionReviser = (feedback: RevisionRequest) => Promise<string | null>;
export interface ReconstructionLoopOptions {
  /** At most this many model revisions, excluding the initial source. */
  maxRevisions?: number;
  maxSourceCharacters?: number;
  evaluationDimension?: number;
  thresholds?: ReconstructionThresholds;
  signal?: AbortSignal;
  onAttempt?: (attempt: ReconstructionAttempt) => void | Promise<void>;
}
export interface ReconstructionLoopResult {
  accepted: boolean;
  status: "accepted" | "exhausted" | "stopped" | "aborted";
  /** Lowest-penalty geometry- and navigation-valid candidate, or null. */
  source: string | null;
  level: CompiledLevel | null;
  report: ReconstructionReport | null;
  attempts: ReconstructionAttempt[];
}
function score(report: ReconstructionReport) {
  const perView = report.views.reduce((sum, view) => sum +
    (view.silhouette ? (1 - view.silhouette.iou) * 100 : 0) +
    (view.strokeErrorPixels ?? 0) +
    (view.photoEdgeErrorPixels ?? 0) / 4 +
    (view.landmarks.rmsPixels ?? 0) / 4, 0);
  return perView + report.issues.length * 100 +
    (report.geometryPassed ? 0 : 1000) +
    (report.navigationPassed ? 0 : 1000);
}
function validateLimits(options: ReconstructionLoopOptions) {
  const revisions = options.maxRevisions ?? 4, limit = options.maxSourceCharacters ?? 2_000_000;
  if (!Number.isInteger(revisions) || revisions < 0 || revisions > 30)
    throw new Error("maxRevisions must be an integer from 0 to 30.");
  if (!Number.isInteger(limit) || limit < 1000 || limit > 10_000_000)
    throw new Error("maxSourceCharacters must be between 1000 and 10000000.");
  return { revisions, limit };
}
function invalidAttempt(iteration: number, source: string, message: string): ReconstructionAttempt {
  return { iteration, source, valid: false, accepted: false,
    report: null, diagnostics: [message], score: Infinity };
}
function buildAttempt(iteration: number, source: string,
  report: ReconstructionReport, diagnostics: string[]): ReconstructionAttempt {
  const valid = report.geometryPassed && report.navigationPassed;
  return { iteration, source, valid, report, diagnostics,
    accepted: report.passed && diagnostics.length === 0, score: score(report) };
}
async function inspectSource(source: string, evidence: PhotoEvidence[],
  options: ReconstructionLoopOptions, iteration: number, limit: number):
  Promise<{ attempt: ReconstructionAttempt; level: CompiledLevel | null }> {
  if (source.length > limit) return {
    attempt: invalidAttempt(iteration, source,
      `SVGX exceeds source character budget (${source.length} > ${limit}).`),
    level: null,
  };
  try {
    const document = parseLevelSvgx(source);
    const level = await compile(document, {
      floorGaps: "error", surfaceContacts: "error",
      navigation: { sealed: true, signal: options.signal },
      signal: options.signal,
    });
    const runtime = await validateForRuntime(level, { sealed: true });
    const dynamicSurfaces = level.surfaces.some(surface => surface.dynamic);
    const openPassed = runtime.passed && runtime.navigation?.passed === true;
    const sealedPassed = !dynamicSurfaces || runtime.sealed?.passed === true;
    const report = evaluateReconstruction(level, evidence, {
      maxDimension: options.evaluationDimension,
      thresholds: options.thresholds,
      navigationPassed: openPassed && sealedPassed,
      sealedNavigationPassed: dynamicSurfaces ? sealedPassed : null,
    });
    const sealedDiagnostics = dynamicSurfaces && !sealedPassed ?
      (runtime.sealed?.diagnostics.filter(d => d.severity === "error")
        .map(d => `SEALED ${d.code}: ${d.message}`) ?? []) : [];
    if (dynamicSurfaces && !sealedPassed && !sealedDiagnostics.length)
      sealedDiagnostics.push("SEALED_NAVIGATION: Closed-state navigation did not pass.");
    const diagnostics = [
      ...level.diagnostics.filter(d => d.severity === "error").map(d => `${d.code}: ${d.message}`),
      ...runtime.diagnostics.filter(d => d.severity === "error").map(d => `${d.code}: ${d.message}`),
      ...sealedDiagnostics,
      ...report.issues,
    ];
    return { attempt: buildAttempt(iteration, source, report, diagnostics), level };
  } catch (error) {
    return { attempt: invalidAttempt(iteration, source,
      error instanceof Error ? error.message : String(error)), level: null };
  }
}
interface BestCandidate {
  source: string | null;
  level: CompiledLevel | null;
  report: ReconstructionReport | null;
  score: number;
}
function keepBetter(best: BestCandidate, result: { attempt: ReconstructionAttempt; level: CompiledLevel | null }) {
  const { attempt, level } = result;
  if (attempt.valid && attempt.report && level && attempt.score < best.score) {
    best.source = attempt.source;
    best.level = level;
    best.report = attempt.report;
    best.score = attempt.score;
  }
}
/**
 * The model proposes geometry, but only compiler, navigation, and independent
 * photographic evidence can accept it. No model provider is required here.
 */
export async function runReconstruction(
  initialSource: string,
  evidence: PhotoEvidence[],
  reviser: ReconstructionReviser,
  options: ReconstructionLoopOptions = {},
): Promise<ReconstructionLoopResult> {
  const { revisions, limit } = validateLimits(options);
  const attempts: ReconstructionAttempt[] = [];
  const best: BestCandidate = { source: null, level: null, report: null, score: Infinity };
  let source = initialSource;
  let status: ReconstructionLoopResult["status"] = "exhausted";
  for (let i = 0; i <= revisions; i++) {
    if (options.signal?.aborted) { status = "aborted"; break; }
    if (source.trim()) {
      const result = await inspectSource(source, evidence, options, i, limit);
      attempts.push(result.attempt);
      await options.onAttempt?.(result.attempt);
      keepBetter(best, result);
      if (result.attempt.accepted) { status = "accepted"; break; }
    }
    if (i === revisions) break;
    const next = await reviser({ iteration: i + 1, previousSource: source,
      lastAttempt: attempts.at(-1) ?? null, attempts: [...attempts] });
    if (!next || next === source) { status = "stopped"; break; }
    source = next;
  }
  return { accepted: status === "accepted", status,
    source: best.source, level: best.level, report: best.report, attempts };
}
