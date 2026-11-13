import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import type { ArchitectureCompileOptions } from "../../src/architecture/types.ts";
import type { SurfaceRasterJob, SurfaceRasterResult } from "../../src/dressing/surface/raster-execution.ts";
import type { DemoPreset } from "./presets.ts";

export interface RasterReplayInput {
  source: string;
  preset: DemoPreset;
  host?: string;
  budgets: Pick<ArchitectureCompileOptions, "limits" | "appearance">;
  images: [string, Uint8Array][];
}
export interface RasterWorkerInput {
  input: RasterReplayInput;
  inputHash: string;
  codeHash: string;
  jobsHash: string;
  indices: number[];
}
export type RasterWorkerMessage = { kind: "result"; result: SurfaceRasterResult }
  | { kind: "done" } | { kind: "error"; index: number; message: string };

/** Includes exact source bytes/settings and a canonical list of material byte snapshots. */
export function replayHash(input: RasterReplayInput): string {
  const hash = createHash("sha256").update(JSON.stringify([input.source, input.preset, input.host, input.budgets]));
  for (const [reference, bytes] of [...input.images].sort(([a], [b]) => a.localeCompare(b)))
    hash.update(JSON.stringify([reference, bytes.byteLength])).update(bytes);
  return hash.digest("hex");
}

/** Detects divergent job plans before any worker sends a texture. */
export function rasterJobsHash(jobs: readonly SurfaceRasterJob[]): string {
  return createHash("sha256").update(JSON.stringify(jobs)).digest("hex");
}

/** Rejects observed source edits across replay; frozen asset bytes are checked separately. */
export async function rasterCodeHash(): Promise<string> {
  const root = fileURLToPath(new URL("../../", import.meta.url)), hash = createHash("sha256");
  for (const directory of ["src", "tools/dressing-demo"]) {
    const paths = (await readdir(join(root, directory), { recursive: true })).filter(path => path.endsWith(".ts")).sort();
    for (const path of paths) hash.update(JSON.stringify([directory, path])).update(await readFile(join(root, directory, path)));
  }
  hash.update(await readFile(join(root, "package-lock.json")));
  return hash.digest("hex");
}
