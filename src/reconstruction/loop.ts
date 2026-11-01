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
  /** Lowest-penalty compiled candidate, not necessarily the last proposed one. */
  source: string | null;
  level: CompiledLevel | null;
  report: ReconstructionReport | null;
  attempts: ReconstructionAttempt[];
}
function score(report: ReconstructionReport) {
  const perView = report.views.reduce((sum, view) => sum +
    (view.silhouette ? (1 - view.silhouette.iou) * 100 : 0) +
    (view.strokeErrorPixels ?? 0) +
    (view.landmarks.rmsPixels ?? 0) / 4, 0);
  return perView + report.issues.length * 100 +
    (report.geometryPassed ? 0 : 1000) +
    (report.navigationPassed ? 0 : 1000);
}

/**
 * Uses strict compiler and traversal checks. Invalid proposals are sent back
 * to the reviser as diagnostics rather than silently corrected by the compiler.
 * No AI/model/API request is made by this module.
 */
export async function runReconstruction(
  initialSource: string,
  evidence: PhotoEvidence[],
  reviser: ReconstructionReviser,
  options: ReconstructionLoopOptions = {},
): Promise<ReconstructionLoopResult> {
  const revisions = options.maxRevisions ?? 4;
  if (!Number.isInteger(revisions) || revisions < 0 || revisions > 30)
    throw new Error("maxRevisions must be an integer from 0 to 30.");
  const limit = options.maxSourceCharacters ?? 2_000_000;
  if (!Number.isInteger(limit) || limit < 1000 || limit > 10_000_000)
    throw new Error("maxSourceCharacters must be between 1000 and 10000000.");
  const attempts: ReconstructionAttempt[] = [];
  let source = initialSource, bestSource: string | null = null,
    bestLevel: CompiledLevel | null = null, bestReport: ReconstructionReport | null = null,
    bestScore = Infinity;
  let status: ReconstructionLoopResult["status"] = "exhausted";
  for (let i = 0; i <= revisions; i++) {
    if (options.signal?.aborted) { status = "aborted"; break; }
    if (!source.trim()) {
      if (i === revisions) { status = "stopped"; break; }
      const next = await reviser({ iteration: i, previousSource: source,
        lastAttempt: attempts.at(-1) ?? null, attempts: [...attempts] });
      if (!next || next === source) { status = "stopped"; break; }
      source = next;
      continue;
    }
    let report: ReconstructionReport | null = null, level: CompiledLevel | null = null;
    const diagnostics: string[] = [];
    if (source.length > limit)
      diagnostics.push(`SVGX exceeds source character budget (${source.length} > ${limit}).`);
    else {
      try {
        const document = parseLevelSvgx(source);
        level = await compile(document, {
          floorGaps: "error", surfaceContacts: "error",
          navigation: { sealed: true, signal: options.signal },
          signal: options.signal,
        });
        for (const diagnostic of level.diagnostics.filter(d => d.severity === "error"))
          diagnostics.push(`${diagnostic.code}: ${diagnostic.message}`);
        const runtime = await validateForRuntime(level, { sealed: true });
        for (const diagnostic of runtime.diagnostics.filter(d => d.severity === "error"))
          diagnostics.push(`${diagnostic.code}: ${diagnostic.message}`);
        report = evaluateReconstruction(level, evidence, {
          maxDimension: options.evaluationDimension,
          thresholds: options.thresholds, navigationPassed: runtime.passed,
        });
        diagnostics.push(...report.issues);
      } catch (error) {
        if (options.signal?.aborted) { status = "aborted"; break; }
        diagnostics.push(error instanceof Error ? error.message : String(error));
      }
    }
    const currentScore = report ? score(report) : Infinity;
    const attempt: ReconstructionAttempt = {
      iteration: i, source, report, diagnostics,
      valid: Boolean(report?.geometryPassed && report.navigationPassed),
      accepted: Boolean(report?.passed && !diagnostics.length), score: currentScore,
    };
    attempts.push(attempt);
    await options.onAttempt?.(attempt);
    if (report && level && currentScore < bestScore) {
      bestSource = source; bestReport = report; bestLevel = level; bestScore = currentScore;
    }
    if (attempt.accepted) { status = "accepted"; break; }
    if (i === revisions) break;
    const next = await reviser({ iteration: i + 1, previousSource: source,
      lastAttempt: attempt, attempts: [...attempts] });
    if (!next || next === source) { status = "stopped"; break; }
    source = next;
  }
  return { accepted: status === "accepted", status,
    source: bestSource, level: bestLevel, report: bestReport, attempts };
}
