import type { CompiledArchitecture as CompiledLevel } from "../architecture/types.ts";
/** Model-agnostic reconstruction loop. An AI supplies proposed AML edits; the compiler and evaluator decide what passed. */
import {
  compile,
  parseAml,
  validateForRuntime,
} from "../architecture/index.ts";
import type { ValidationReport, Diagnostic } from "../vector/types.ts";
import {
  evaluateReconstruction,
  type PhotoEvidence,
  type ReconstructionReport,
  type ReconstructionThresholds,
} from "./evaluate.ts";

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
export type ReconstructionReviser = (
  feedback: RevisionRequest,
) => Promise<string | null>;
export interface ReconstructionLoopOptions {
  /** At most this many model revisions, excluding the initial source. */
  maxRevisions?: number;
  maxSourceCharacters?: number;
  evaluationDimension?: number;
  /** Horizontal navigation grid in meters, applied to compilation and open/closed validation. */
  navigationCell?: number;
  thresholds?: ReconstructionThresholds;
  /** Resolves frozen mesh/texture companions relative to the authored source. */
  resolveAsset?: import("../architecture/types.ts").ArchitectureCompileOptions["resolveAsset"];
  resolveHeightmap?: import("../architecture/types.ts").ArchitectureCompileOptions["resolveHeightmap"];
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
  const perView = report.views.reduce(
    (sum, view) =>
      sum +
      (view.silhouette ? (1 - view.silhouette.iou) * 100 : 0) +
      (view.strokeErrorPixels ?? 0) +
      (view.photoEdgeErrorPixels ?? 0) / 4 +
      (view.landmarks.rmsPixels ?? 0) / 4,
    0,
  );
  return (
    perView +
    report.issues.length * 100 +
    (report.geometryPassed ? 0 : 1000) +
    (report.navigationPassed ? 0 : 1000)
  );
}
function validateLimits(options: ReconstructionLoopOptions) {
  if (
    options.navigationCell !== undefined &&
    (!Number.isFinite(options.navigationCell) || options.navigationCell <= 0)
  )
    throw new Error("navigationCell must be finite and positive.");
  const revisions = options.maxRevisions ?? 4,
    limit = options.maxSourceCharacters ?? 2_000_000;
  if (!Number.isInteger(revisions) || revisions < 0 || revisions > 30)
    throw new Error("maxRevisions must be an integer from 0 to 30.");
  if (!Number.isInteger(limit) || limit < 1000 || limit > 10_000_000)
    throw new Error("maxSourceCharacters must be between 1000 and 10000000.");
  return { revisions, limit };
}
function invalidAttempt(
  iteration: number,
  source: string,
  message: string,
): ReconstructionAttempt {
  return {
    iteration,
    source,
    valid: false,
    accepted: false,
    report: null,
    diagnostics: [message],
    score: Infinity,
  };
}
function buildAttempt(
  iteration: number,
  source: string,
  report: ReconstructionReport,
  diagnostics: string[],
): ReconstructionAttempt {
  const valid = report.geometryPassed && report.navigationPassed;
  return {
    iteration,
    source,
    valid,
    report,
    diagnostics,
    accepted: report.passed && diagnostics.length === 0,
    score: score(report),
  };
}
function errorMessages(diagnostics: Diagnostic[], prefix = "") {
  return diagnostics
    .filter((d) => d.severity === "error")
    .map((d) => `${prefix}${d.code}: ${d.message}`);
}
function sealedState(level: CompiledLevel, runtime: ValidationReport) {
  const required = level.surfaces.some((surface) => surface.dynamic);
  return { required, passed: !required || runtime.sealed?.passed === true };
}
function closedStateDiagnostics(
  runtime: ValidationReport,
  required: boolean,
  passed: boolean,
) {
  if (!required || passed) return [];
  const errors = errorMessages(runtime.sealed?.diagnostics ?? [], "SEALED ");
  return errors.length
    ? errors
    : ["SEALED_NAVIGATION: Closed-state navigation did not pass."];
}
async function inspectCompiled(
  level: CompiledLevel,
  source: string,
  evidence: PhotoEvidence[],
  options: ReconstructionLoopOptions,
  iteration: number,
) {
  const runtime = await validateForRuntime(level, {
    sealed: true,
    signal: options.signal,
    cell: options.navigationCell,
  });
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
  return {
    attempt: buildAttempt(iteration, source, report, diagnostics),
    level,
  };
}
async function inspectSource(
  source: string,
  evidence: PhotoEvidence[],
  options: ReconstructionLoopOptions,
  iteration: number,
  limit: number,
): Promise<{ attempt: ReconstructionAttempt; level: CompiledLevel | null }> {
  if (source.length > limit)
    return {
      attempt: invalidAttempt(
        iteration,
        source,
        `AML exceeds source character budget (${source.length} > ${limit}).`,
      ),
      level: null,
    };
  try {
    if (/^\s*<level\b/.test(source))
      throw new Error(
        "SVGX authoring is retired; use levelspec migrate into a new AML project.",
      );
    const document = parseAml(source);
    const level = await compile(document, {
      floorGaps: "error",
      surfaceContacts: "error",
      resolveAsset: options.resolveAsset,
      resolveHeightmap: options.resolveHeightmap,
      navigation: {
        sealed: true,
        signal: options.signal,
        cell: options.navigationCell,
      },
      signal: options.signal,
    });
    return await inspectCompiled(level, source, evidence, options, iteration);
  } catch (error) {
    return {
      attempt: invalidAttempt(
        iteration,
        source,
        error instanceof Error ? error.message : String(error),
      ),
      level: null,
    };
  }
}

export interface BestCandidate {
  source: string | null;
  level: CompiledLevel | null;
  report: ReconstructionReport | null;
  score: number;
}
/** Accepted candidates supersede lower-scoring rejected candidates. */
export function keepBetter(
  best: BestCandidate,
  result: { attempt: ReconstructionAttempt; level: CompiledLevel | null },
) {
  const { attempt, level } = result;
  if (
    attempt.valid &&
    attempt.report &&
    level &&
    (attempt.accepted || attempt.score < best.score)
  ) {
    best.source = attempt.source;
    best.level = level;
    best.report = attempt.report;
    best.score = attempt.score;
  }
}
interface Stop {
  status: ReconstructionLoopResult["status"];
  error?: string;
}
function message(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
/** A reviser failure ends the run but keeps the attempts and best valid candidate. */
async function revise(
  reviser: ReconstructionReviser,
  request: RevisionRequest,
): Promise<string | Stop> {
  try {
    const next = await reviser(request);
    if (!next?.trim() || next === request.previousSource)
      return { status: "stopped" };
    return next;
  } catch (failure) {
    return {
      status: request.signal?.aborted ? "aborted" : "failed",
      error: message(failure),
    };
  }
}
interface LoopState {
  evidence: PhotoEvidence[];
  reviser: ReconstructionReviser;
  options: ReconstructionLoopOptions;
  revisions: number;
  limit: number;
  attempts: ReconstructionAttempt[];
  best: BestCandidate;
}
/** Inspect and record one candidate; a Stop ends the run before the next revision. */
async function inspectStep(
  source: string,
  iteration: number,
  state: LoopState,
): Promise<Stop | null> {
  const result = await inspectSource(
    source,
    state.evidence,
    state.options,
    iteration,
    state.limit,
  );
  state.attempts.push(result.attempt);
  await state.options.onAttempt?.(result.attempt);
  keepBetter(state.best, result);
  if (result.attempt.accepted) return { status: "accepted" };
  if (iteration === state.revisions) return { status: "exhausted" };
  // Never spend another model request on a cancelled run.
  return state.options.signal?.aborted ? { status: "aborted" } : null;
}
async function iterate(initial: string, state: LoopState): Promise<Stop> {
  const signal = state.options.signal;
  let source = initial;
  for (let i = 0; ; i++) {
    if (signal?.aborted) return { status: "aborted" };
    const stop = await inspectStep(source, i, state);
    if (stop) return stop;
    const next = await revise(state.reviser, {
      iteration: i + 1,
      previousSource: source,
      lastAttempt: state.attempts.at(-1) ?? null,
      attempts: [...state.attempts],
      signal,
    });
    if (typeof next !== "string") return next;
    source = next;
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
  const state: LoopState = {
    evidence,
    reviser,
    options,
    revisions,
    limit,
    attempts: [],
    best: { source: null, level: null, report: null, score: Infinity },
  };
  let stop: Stop = { status: "aborted" };
  if (!options.signal?.aborted) {
    const first = initialSource.trim()
      ? initialSource
      : await revise(reviser, {
          iteration: 0,
          previousSource: "",
          lastAttempt: null,
          attempts: [],
          signal: options.signal,
        });
    stop = typeof first === "string" ? await iterate(first, state) : first;
  }
  // A cancel during the final inspection surfaces as an invalid attempt, not a stop.
  const status =
    options.signal?.aborted && stop.status !== "accepted"
      ? "aborted"
      : stop.status;
  const { best, attempts } = state;
  return {
    accepted: status === "accepted",
    status,
    ...(stop.error ? { error: stop.error } : {}),
    source: best.source,
    level: best.level,
    report: best.report,
    attempts,
  };
}
