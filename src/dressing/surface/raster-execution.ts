import type { SurfaceRasterLayer } from "./raster.ts";
import type { SurfaceChart } from "./types.ts";

/** Portable identity and resource estimates for one deduplicated raster job; no recipe callbacks cross workers. */
export interface SurfaceRasterJob {
  readonly index: number;
  readonly key: string;
  readonly signature: string;
  readonly width: number;
  readonly height: number;
  readonly layers: readonly Readonly<{ source: string; normal: boolean }>[];
  readonly texels: number;
  readonly scratchBytes: number;
  readonly estimatedWork: number;
}

/** Raw RGBA8 maps for one job. The compiler copies each byte view before encoding or publication. */
export interface SurfaceRasterResult {
  index: number;
  signature: string;
  layers: SurfaceRasterLayer[];
}

/** Compile-owned cancellation and the available aggregate row-scratch allowance, separate from resident image allocation. */
export interface SurfaceRasterExecutionContext {
  signal?: AbortSignal;
  maximumScratchBytes: number;
  /** Complete immutable plan for replay validation; dispatched jobs may be sparse when material artifacts are cached. */
  fullPlan?: readonly SurfaceRasterJob[];
}

/**
 * Executes each supplied recipe exactly once and yields results in any order.
 * Job indices remain stable and may be sparse; use fullPlan for replay identity.
 * Executors must honor cancellation, bound simultaneous scratch and outstanding
 * raw results, and preserve the complete frozen input/recipe identity in replicas.
 * The local callback borrows compiler recipes; concurrent calls reserve scratch.
 * Encoding, content identities, deterministic binding and publication stay with
 * the compiler. The default compiler executes jobs sequentially.
 */
export type SurfaceRasterExecutor = (
  jobs: readonly SurfaceRasterJob[],
  bakeLocal: (index: number) => Promise<SurfaceRasterResult>,
  context: SurfaceRasterExecutionContext,
) => AsyncIterable<SurfaceRasterResult>;

/** Host adapters attach a known job index when a remote recipe fails. */
export class SurfaceRasterJobError extends Error {
  readonly index: number;

  constructor(index: number, message: string) {
    super(message);
    this.index = index;
  }
}

/** Carries the actual failing receiver through asynchronous execution without relying on the most recent progress event. */
export class SurfaceRasterFailure extends Error {
  readonly chart: SurfaceChart;

  constructor(chart: SurfaceChart, cause: unknown) {
    super(cause instanceof Error ? cause.message : String(cause), { cause });
    this.chart = chart;
  }
}
