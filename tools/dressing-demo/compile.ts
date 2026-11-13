import { compile } from "../../src/architecture/index.ts";
import { withBuiltinMaterialImages } from "../../src/materials/images.ts";
import { decodeMaterialPng } from "../../src/materials/node-images.ts";
import type { ArchitectureCompileOptions } from "../../src/architecture/types.ts";
import { DEMO_COMPILE_BUDGETS, prepareDemoPreset, type DemoPreset } from "./presets.ts";
import { createRasterPool, type RasterPoolReport } from "./parallel-raster.ts";
import { rasterCodeHash, type RasterReplayInput } from "./raster-protocol.ts";
import { createDiskMaterialCache } from "./material-cache.ts";
import { fileURLToPath } from "node:url";

// Pin the identity at module load; later calls must not replay new files beside cached modules.
const importedCodeHash = await rasterCodeHash();
const materialCache = createDiskMaterialCache(fileURLToPath(new URL("../../generated/material-cache", import.meta.url)), importedCodeHash);

export interface DemoCompileOptions {
  host?: string;
  /** Total isolates including the main thread, 1–4. Omitted selects a bounded pool only for large jobs. */
  workers?: number;
  budgets?: Pick<ArchitectureCompileOptions, "limits" | "appearance">;
  signal?: AbortSignal;
  navigation?: boolean;
  onProgress?: (stage: string) => void;
  onRasterPool?: (report: RasterPoolReport) => void;
  resolveMaterialImage?: ArchitectureCompileOptions["resolveMaterialImage"];
  /** Overrides the demo's persistent finished-material cache, useful for controlled measurements. */
  materialCache?: ArchitectureCompileOptions["materialCache"];
}

/**
 * Compiles the demo from one source snapshot. Replay admits material images only;
 * arbitrary geometry/heightmap resolvers and callbacks are deliberately outside
 * this helper. Material byte views are copied before either main or worker decode.
 */
export async function compileDemo(source: string, preset: DemoPreset, options: DemoCompileOptions = {}) {
  if (options.workers !== undefined && (!Number.isInteger(options.workers) || options.workers < 1 || options.workers > 4))
    throw new Error("Demo workers must be an integer from 1 through 4, including the main thread.");
  const budgets = structuredClone(options.budgets ?? DEMO_COMPILE_BUDGETS);
  const input: RasterReplayInput = { source, preset, host: options.host, budgets, images: [] };
  const codeHash = options.workers === 1 ? "" : await rasterCodeHash();
  if (options.workers !== 1 && codeHash !== importedCodeHash)
    throw new Error("Compiler source changed since this process loaded; restart before parallel compilation.");
  const pool = createRasterPool(input, codeHash, options.workers, options.onRasterPool);
  const snapshots = new Map<string, Uint8Array>();
  const read = options.resolveMaterialImage ?? withBuiltinMaterialImages();
  try {
    const result = await compile(prepareDemoPreset(source, preset, options.host), {
      ...budgets, signal: options.signal, navigation: options.navigation, onProgress: options.onProgress,
      rasterExecutor: pool.execute,
      decodeMaterialPng,
      materialCache: options.materialCache ?? materialCache,
      materialCacheValidation: options.materialCache ? "decode" : "integrity",
      resolveMaterialImage: async (reference, signal) => {
        let image = snapshots.get(reference);
        if (!image) {
          image = Uint8Array.from(await read(reference, signal));
          snapshots.set(reference, image); input.images.push([reference, image]);
        }
        return image;
      },
    });
    if (pool.usedWorkers() > 1 && await rasterCodeHash() !== codeHash)
      throw new Error("Compiler source changed during parallel compilation; discard this run and retry.");
    return result;
  } finally { await pool.dispose(); }
}
