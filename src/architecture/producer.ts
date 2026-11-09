import { ProducerValidationError } from "./producer-errors.ts";
import {
  physicalRouteEvidence,
  requirePhysicalRoutes,
} from "../authoring/physical-routes.ts";
import type {
  ArchitectureDocument,
  ArchitectureCompileOptions,
} from "./types.ts";
/** Validated publication of native architectural documents. */
import { compile } from "./compiler.ts";
import { parseAml, serializeAml } from "./format.ts";
import { validateForRuntime } from "../vector/validate.ts";
import { aborted, type Diagnostic, type V3 } from "../vector/types.ts";
import type { AssetResolver } from "../vector/props.ts";
export interface ProducerOptions {
  /** Host-controlled imported mesh I/O; publication never fetches assets itself. */
  resolveAsset?: AssetResolver;
  resolveHeightmap?: ArchitectureCompileOptions["resolveHeightmap"];
  /** Shared indexing and candidate budget for physical route evidence. Defaults to 8,000,000. */
  physicalWork?: number;
  signal?: AbortSignal;
  onProgress?: (stage: string) => void;
  /** Observes verified navigation for placement; never changes acceptance. */
  onReachableSample?: (position: V3, distance: number) => void;
  sampleOrigin?: V3;
}

export { ProducerValidationError } from "./producer-errors.ts";

/** Publishes only documents that pass native geometry and unchanged runtime validation. */
export async function produceDocument(
  document: ArchitectureDocument,
  options: ProducerOptions = {},
) {
  aborted(options.signal);
  if (document.validation === "premap")
    throw new Error("A premap draft cannot be published as a playable map.");
  const text = serializeAml(document),
    parsed = parseAml(text);
  const level = await compile(parsed, {
    resolveAsset: options.resolveAsset,
    resolveHeightmap: options.resolveHeightmap,
    signal: options.signal,
    onProgress: options.onProgress,
    navigation: {
      signal: options.signal,
      onReachableSample: options.onReachableSample,
      sampleOrigin: options.sampleOrigin,
    },
  });
  const report = await validateForRuntime(level, {
    signal: options.signal,
    sealed: true,
  });
  if (!report.passed)
    throw new ProducerValidationError("architecture", report.diagnostics);
  if (
    !level.navigation?.indices.length &&
    !level.waterNavigation?.indices.length
  )
    throw new ProducerValidationError("architecture", [
      {
        severity: "error",
        code: "NATIVE_SUPPORT_REQUIRED",
        message: "Publication requires traversable native navigation support.",
        objects: [parsed.id],
      },
    ]);
  const land = {
    ...level,
    document: {
      ...level.document,
      routes: level.document.routes.filter(
        (route) => route.movement !== "water",
      ),
    },
  };
  options.onProgress?.("Physical route evidence");
  aborted(options.signal);
  const physical = physicalRouteEvidence(
    land,
    report.sealed ?? report.navigation!,
    options.signal,
    options.physicalWork,
  );
  requirePhysicalRoutes(land, physical);
  return { document: parsed, text, level, report, physical };
}

export type ProducedLevel = Awaited<ReturnType<typeof produceDocument>>;
