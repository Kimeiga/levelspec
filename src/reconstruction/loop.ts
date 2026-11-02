/** Model-agnostic reconstruction loop. An AI supplies proposed SVGX edits; the compiler and evaluator decide what passed. */
import { compile, parseLevelSvgx, validateForRuntime } from "../vector/index.ts";
import type { CompiledLevel, ValidationReport, Diagnostic } from "../vector/types.ts";
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
  /** Cancellation for the reviser's own work, such as model requests. */
  signal?: AbortSignal;
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
  /** "failed" means the reviser threw; see `error`. */
  status: "accepted" | "exhausted" | "stopped" | "aborted" | "failed";
  /** Accepted candidate on success; otherwise lowest-scoring valid candidate, or null. */
  source: string | null;
  level: CompiledLevel | null;
  report: ReconstructionReport | null;
  attempts: ReconstructionAttempt[];
  /** Reviser failure message when status is "failed" or the reviser was aborted. */
  error?: string;
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
function errorMessages(diagnostics: Diagnostic[], prefix = "") {
  return diagnostics.filter(d => d.severity === "error")
    .map(d => `${prefix}${d.code}: ${d.message}`);
}
function sealedState(level: CompiledLevel, runtime: ValidationReport) {
  const required = level.surfaces.some(surface => surface.dynamic);
  return { required, passed: !required || runtime.sealed?.passed === true };
}
function closedStateDiagnostics(runtime: ValidationReport, required: boolean, passed: boolean) {
  if (!required || passed) return [];
  const errors = errorMessages(runtime.sealed?.diagnostics ?? [], "SEALED ");
  return errors.length ? errors : ["SEALED_NAVIGATION: Closed-state navigation did not pass."];
}
async function inspectCompiled(level: CompiledLevel, source: string, evidence: PhotoEvidence[],
  options: ReconstructionLoopOptions, iteration: number) {
  const runtime = await validateForRuntime(level, { sealed: true, signal: options.signal });
  const sealed = sealedState(level, runtime);
  const openPassed = runtime.passed && runtime.navigation?.passed === true;
  const report = evaluateReconstruction(level, evidence, {
    maxDimension: options.evaluationDimension,
    thresholds: options.thresholds,
    navigationPassed: openPassed && sealed.passed,
    sealedNavigationPassed: sealed.required ? sealed.passed : null,
  });
  const diagnostics = [
    ...errorMessages(level.diagnostics),
    ...errorMessages(runtime.diagnostics),
    ...closedStateDiagnostics(runtime, sealed.required, sealed.passed),
    ...report.issues,
  ];
  return { attempt: buildAttempt(iteration, source, report, diagnostics), level };
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
    return await inspectCompiled(level, source, evidence, options, iteration);
  } catch (error) {
    return { attempt: invalidAttempt(iteration, source,
      error instanceof Error ? error.message : String(error)), level: null };
  }
}

export interface BestCandidate {
  source: string | null;
  level: CompiledLevel | null;
  report: ReconstructionReport | null;
  score: number;
}
/** Accepted candidates supersede lower-scoring rejected candidates. */
export function keepBetter(best: BestCandidate, result: { attempt: ReconstructionAttempt; level: CompiledLevel | null }) {
  const { attempt, level } = result;
  if (attempt.valid && attempt.report && level &&
      (attempt.accepted || attempt.score < best.score)) {
    best.source = attempt.source;
    best.level = level;
    best.report = attempt.report;
    best.score = attempt.score;
  }
}
async function initialCandidate(source: string, reviser: ReconstructionReviser, signal?: AbortSignal) {
  if (source.trim()) return source;
  return (await reviser({ iteration: 0, previousSource: "", lastAttempt: null, attempts: [], signal })) ?? "";
}
function message(error: unknown) {
  return error instanceof Error ? error.message : String(error);
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
  if (options.signal?.aborted)
    return { accepted: false, status: "aborted", source: null, level: null,
      report: null, attempts: [] };
  let source: string;
  try {
    source = await initialCandidate(initialSource, reviser, options.signal);
  } catch (error) {
    return { accepted: false, status: options.signal?.aborted ? "aborted" : "failed",
      error: message(error), source: null, level: null, report: null, attempts };
  }
  if (!source.trim())
    return { accepted: false, status: "stopped", source: null, level: null,
      report: null, attempts };
  let status: ReconstructionLoopResult["status"] = "exhausted";
  let error: string | undefined;
  for (let i = 0; i <= revisions; i++) {
    if (options.signal?.aborted) { status = "aborted"; break; }
    const result = await inspectSource(source, evidence, options, i, limit);
    attempts.push(result.attempt);
    await options.onAttempt?.(result.attempt);
    keepBetter(best, result);
    if (result.attempt.accepted) { status = "accepted"; break; }
    if (i === revisions) break;
    // Never spend another model request on a cancelled run.
    if (options.signal?.aborted) { status = "aborted"; break; }
    let next: string | null;
    try {
      next = await reviser({ iteration: i + 1, previousSource: source,
        lastAttempt: attempts.at(-1) ?? null, attempts: [...attempts], signal: options.signal });
    } catch (failure) {
      // Keep the attempts and best valid candidate instead of discarding the run.
      status = options.signal?.aborted ? "aborted" : "failed";
      error = message(failure);
      break;
    }
    if (!next?.trim() || next === source) { status = "stopped"; break; }
    source = next;
  }
  // A cancel during the final inspection surfaces as an invalid attempt, not a break.
  if (options.signal?.aborted && status !== "accepted") status = "aborted";
  return { accepted: status === "accepted", status, ...(error ? { error } : {}),
    source: best.source, level: best.level, report: best.report, attempts };
}
