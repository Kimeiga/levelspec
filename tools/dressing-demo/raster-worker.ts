import { parentPort, workerData } from "node:worker_threads";
import { compile } from "../../src/architecture/index.ts";
import { decodeMaterialPng } from "../../src/materials/node-images.ts";
import { SurfaceRasterFailure } from "../../src/dressing/surface/raster-execution.ts";
import { prepareDemoPreset } from "./presets.ts";
import { rasterCodeHash, rasterJobsHash, replayHash, type RasterWorkerInput, type RasterWorkerMessage } from "./raster-protocol.ts";

const port = parentPort!;
const data = workerData as RasterWorkerInput;
let current = data.indices[0] ?? -1;
let completed = false;
const controller = new AbortController();
/** Sends one owned raw result and waits until the parent has consumed it before allocating another. */
async function sendResult(message: Extract<RasterWorkerMessage, { kind: "result" }>): Promise<void> {
  const buffers = new Set<ArrayBuffer>();
  for (const layer of message.result.layers) for (const image of [layer.color, layer.metallicRoughness, layer.normal])
    if (image) buffers.add(image.data.buffer as ArrayBuffer);
  const acknowledged = new Promise<void>(resolve => port.once("message", () => resolve()));
  port.postMessage(message, [...buffers]);
  await acknowledged;
}
try {
  if (replayHash(data.input) !== data.inputHash || await rasterCodeHash() !== data.codeHash)
    throw new Error("Raster replay input or compiler source changed.");
  const images = new Map(data.input.images);
  const level = await compile(prepareDemoPreset(data.input.source, data.input.preset, data.input.host), {
    ...data.input.budgets, navigation: false, signal: controller.signal,
    decodeMaterialPng,
    async resolveMaterialImage(reference) {
      const image = images.get(reference);
      if (!image) throw new Error(`Raster replay is missing frozen material ${reference}.`);
      return image;
    },
    rasterExecutor: async function* (jobs, bake) {
      if (rasterJobsHash(jobs) !== data.jobsHash) throw new Error("Raster replay job plan changed.");
      for (const index of data.indices) {
        current = index;
        await sendResult({ kind: "result", result: await bake(index) });
      }
      completed = true;
      controller.abort();
      throw new DOMException("Raster replay finished its assigned jobs.", "AbortError");
    },
  });
  throw new Error(level.diagnostics.map(diagnostic => diagnostic.message).join("; ") || "Raster replay did not reach its jobs.");
} catch (error) {
  if (completed && (error as Error).name === "AbortError") port.postMessage({ kind: "done" } satisfies RasterWorkerMessage);
  else {
    const cause = error instanceof SurfaceRasterFailure ? error.cause : error;
    port.postMessage({ kind: "error", index: current, message: cause instanceof Error ? cause.message : String(cause) } satisfies RasterWorkerMessage);
  }
} finally { port.close(); }
