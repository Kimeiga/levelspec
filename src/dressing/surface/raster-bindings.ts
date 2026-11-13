import { SurfaceWorkSlice } from "./work-slice.ts";
import { Color } from "three";
import { aborted } from "../../vector/types.ts";
import { SurfaceRasterFailure, SurfaceRasterJobError, type SurfaceRasterExecutor, type SurfaceRasterJob, type SurfaceRasterResult } from "./raster-execution.ts";
import type { Material } from "../../vector/types.ts";
import type { ExportAsset } from "../../vector/export-assets.ts";
import { encodeSurfaceImage, imageHash, type SurfaceImage, type SurfacePngDecoder } from "./images.ts";
import { rasterizeSurface, surfaceRasterLayout, rasterScratchBytes, type SurfaceRasterBinding, type SurfaceRasterLayer } from "./raster.ts";
import type { SurfaceChart } from "./types.ts";
import { materialArtifactKey, readMaterialArtifact, writeMaterialArtifact, type SurfaceMaterialCache, type SurfaceMaterialArtifact, type MaterialCacheValidation } from "./material-cache.ts";

/** Shared compile-owned counters include every generated channel and its uncompressed mip allocation. */
export interface RasterBudget {
  texels: number;
  imageBytes: number;
  maximumTexels: number;
  maximumBytes: number;
}

/** Stages bounded, content-addressed appearance maps; the caller commits them only with successful geometry. */
export async function prepareSurfaceRasters(
  charts: SurfaceChart[], materials: Material[], images: Map<string, SurfaceImage>,
  generated: Record<string, ExportAsset>, budget: RasterBudget, signal?: AbortSignal, inspect?: (chart: SurfaceChart) => void,
  work = new SurfaceWorkSlice(signal), executor?: SurfaceRasterExecutor,
  cache?: SurfaceMaterialCache, sourceHashes: Record<string, string> = {},
  decodePng?: SurfacePngDecoder,
  cacheValidation?: MaterialCacheValidation,
): Promise<Map<string, SurfaceRasterBinding>> {
  const bindings = new Map<string, SurfaceRasterBinding>();
  const groups = new Map<string, { signature: string; materialKey?: string; binding: SurfaceRasterBinding }>();
  const jobs: { descriptor: SurfaceRasterJob; chart: SurfaceChart; binding: SurfaceRasterBinding }[] = [];
  const sources = new Map(materials.map(material => [material.id, material]));
  for (const chart of charts) {
    const settings = chart.raster;
    if (!settings) continue;
    const pending = work.checkpoint();
    if (pending) await pending;
    inspect?.(chart);
    const center = chart.sample((settings.bounds[0] + settings.bounds[2]) / 2, (settings.bounds[1] + settings.bounds[3]) / 2);
    if (settings.geometry === "preserve") {
      const emission = (id: string) => {
        const source = sources.get(id)!;
        return JSON.stringify(new Color(source.emissive ?? "#000000").multiplyScalar(source.emissiveStrength ?? 1).toArray());
      };
      const first = emission(center.layers[0].material);
      if (center.layers.some(layer => emission(layer.material) !== first || layer.coatings?.some(coat => {
        const material = sources.get(coat.material)!;
        return new Color(material.emissive ?? "#000000").multiplyScalar(material.emissiveStrength ?? 1).toArray().some(value => value > 0);
      }))) throw new Error(`Preserved surface ${chart.id} requires matching source emission and non-emissive coatings.`);
    }
    if (settings.scope === "scene" && settings.coordinates !== "uv" && !(settings.repeat && settings.geometry === "preserve"))
      throw new Error(`Scene-shared raster ${chart.id} requires receiver-local UV coordinates.`);
    const group = JSON.stringify(settings.scope === "scene" ? ["scene", settings.group] : ["host", chart.host, settings.group]);
    const signature = JSON.stringify([settings.bounds, settings.texelsPerMeter, settings.coordinates, settings.geometry, settings.repeat,
      settings.coordinates === "uv" || settings.repeat ? undefined : [chart.frame.u, chart.frame.v, chart.frame.normal],
      center.layers.map(layer => [layer.material, (layer.coatings ?? []).map(coat => coat.material)])]);
    const existing = groups.get(group);
    if (existing) {
      if (existing.signature !== signature || existing.materialKey !== settings.materialKey)
        throw new Error(`Raster group ${group} contains incompatible receivers.`);
      bindings.set(chart.id, existing.binding);
      continue;
    }
    const layout = surfaceRasterLayout(settings);
    const normal = (layer: typeof center.layers[number]) => !!settings.bump || !!sources.get(layer.material)?.normalTexture
      || !!layer.coatings?.some(coat => sources.get(coat.material)?.normalTexture);
    const layers = settings.geometry === "preserve"
      ? [{ source: center.layers[0].material, normal: center.layers.some(normal) }]
      : center.layers.map(layer => ({ source: layer.material, normal: normal(layer) }));
    const channels = layers.reduce((sum, layer) => sum + 2 + Number(layer.normal), 0);
    const texels = layout.width * layout.height * channels;
    if (budget.texels + texels > budget.maximumTexels) throw new Error(`Surface appearance raster texel budget exceeded at ${group} (${budget.texels} + ${texels} / ${budget.maximumTexels}).`);
    const scratchBytes = settings.bump === "sample" ? rasterScratchBytes(layout.width, center) : (layout.width + 2) * 3 * 8;
    if ((budget.texels + texels) * 4 * 4 / 3 + scratchBytes > budget.maximumBytes) throw new Error(`Surface appearance raster memory budget exceeded at ${group}.`);
    budget.texels += texels;
    const binding: SurfaceRasterBinding = { layout, materials: [] };
    const descriptor: SurfaceRasterJob = Object.freeze({ index: jobs.length, key: group, signature,
      width: layout.width, height: layout.height, layers: Object.freeze(layers.map(layer => Object.freeze(layer))),
      texels, scratchBytes, estimatedWork: layout.width * layout.height
        * center.layers.reduce((sum, layer) => sum + 1 + (layer.coatings?.length ?? 0), 0) + 2000 });
    jobs.push({ descriptor, chart, binding });
    groups.set(group, { signature, materialKey: settings.materialKey, binding });
    bindings.set(chart.id, binding);
  }
  const maximumScratchBytes = budget.maximumBytes - budget.texels * 4 * 4 / 3;
  for (const job of jobs) if (job.descriptor.scratchBytes > maximumScratchBytes)
    throw new SurfaceRasterFailure(job.chart, new Error("Surface appearance raster memory budget exceeded."));
  const localController = new AbortController();
  const cancelLocal = () => localController.abort();
  signal?.addEventListener("abort", cancelLocal, { once: true });
  if (signal?.aborted) cancelLocal();
  const localWork = new SurfaceWorkSlice(localController.signal);
  const active = new Set<Promise<SurfaceRasterResult>>();
  const started = new Set<number>();
  let activeScratchBytes = 0;
  /** Reserves aggregate scratch before any await; errors keep the responsible receiver attached. */
  const runLocal = async (index: number): Promise<SurfaceRasterResult> => {
    const job = jobs[index];
    if (!job || !Number.isInteger(index)) throw new Error(`Unknown surface raster job ${index}.`);
    const { descriptor, chart } = job;
    try {
      aborted(signal);
      if (started.has(index)) throw new Error(`Surface raster job ${index} executed twice.`);
      if (activeScratchBytes + descriptor.scratchBytes > maximumScratchBytes)
        throw new Error("Concurrent surface raster scratch memory budget exceeded.");
      started.add(index);
      activeScratchBytes += descriptor.scratchBytes;
      try {
        const raster = await rasterizeSurface(chart, chart.raster!, sources, images, localController.signal, localWork);
        return { index, signature: descriptor.signature, layers: raster.layers };
      } finally { activeScratchBytes -= descriptor.scratchBytes; }
    } catch (error) {
      if ((error as Error).name === "AbortError") throw error;
      throw new SurfaceRasterFailure(chart, error);
    }
  };
  /** Tracks admitted work so a failed executor cannot leave local callbacks running after rejection. */
  const bakeLocal = (index: number): Promise<SurfaceRasterResult> => {
    const pending = runLocal(index);
    active.add(pending);
    void pending.then(() => active.delete(pending), () => active.delete(pending));
    return pending;
  };
  const descriptors = Object.freeze(jobs.map(job => job.descriptor));
  const stagedAssets: Record<string, ExportAsset> = {};
  const finished = new Map<number, Record<string, string>[]>();
  const cacheKeys = new Map<number, string>();
  /** Admits encoded maps identically for a cache hit and a newly evaluated recipe. */
  const stageArtifact = (artifact: SurfaceMaterialArtifact): Record<string, string>[] => artifact.layers.map(layer => {
    const channels: Record<string, string> = {};
    for (const [channel, image] of [["texture", layer.color], ["metallicRoughnessTexture", layer.metallicRoughness], ["normalTexture", layer.normal]] as const) {
      if (!image) continue;
      const { bytes, hash } = image, reference = `$generated/surfaces/${hash}.png`;
      if (!generated[reference] && !stagedAssets[reference]) {
        budget.imageBytes += bytes.byteLength;
        if (budget.imageBytes > budget.maximumBytes) throw new Error("Encoded surface appearance byte budget exceeded.");
        stagedAssets[reference] = { bytes, hash, mimeType: "image/png", file: `textures/${hash}.png` };
      }
      channels[channel] = reference;
    }
    return channels;
  });
  let iterator: AsyncIterator<SurfaceRasterResult> | undefined;
  let complete = false;
  try {
    if (cache) for (const { descriptor, chart } of jobs) {
      try {
        const key = await materialArtifactKey(chart, descriptor, sources, sourceHashes, signal);
        if (!key) continue;
        cacheKeys.set(descriptor.index, key);
        const artifact = await abortableResult(() => readMaterialArtifact(cache, key, descriptor, signal, decodePng, cacheValidation), signal);
        if (artifact) finished.set(descriptor.index, stageArtifact(artifact));
      } catch (error) {
        if ((error as Error).name === "AbortError") throw error;
        throw new SurfaceRasterFailure(chart, error);
      }
    }
    const missing = Object.freeze(descriptors.filter(job => !finished.has(job.index)));
    const results = executor && missing.length ? executor(missing, bakeLocal, { signal, maximumScratchBytes, fullPlan: descriptors })
      : sequentialRasters(missing, bakeLocal);
    iterator = results[Symbol.asyncIterator]();
    while (true) {
      const next = await abortableResult(() => iterator!.next(), signal);
      if (next.done) { complete = true; break; }
      const result = next.value, job = jobs[result.index];
      if (!job || !Number.isInteger(result.index)) throw new Error(`Unknown surface raster result ${result.index}.`);
      try {
        if (finished.has(result.index)) throw new Error(`Duplicate surface raster result ${result.index}.`);
        const layers = ownedLayers(result, job.descriptor);
        const artifact: SurfaceMaterialArtifact = { version: 1, key: cacheKeys.get(result.index) ?? "", layers: [] };
        for (const layer of layers) {
          const encoded = { source: layer.source } as SurfaceMaterialArtifact["layers"][number];
          for (const [channel, image] of [["color", layer.color], ["metallicRoughness", layer.metallicRoughness], ["normal", layer.normal]] as const) {
            if (!image) continue;
            const pending = work.checkpoint();
            if (pending) await pending;
            const bytes = encodeSurfaceImage(image), hash = await imageHash(bytes, signal);
            encoded[channel] = { bytes, hash };
          }
          artifact.layers.push(encoded);
        }
        finished.set(result.index, stageArtifact(artifact));
        if (cache && artifact.key) await abortableResult(() => writeMaterialArtifact(cache, artifact, signal), signal);
      } catch (error) {
        if ((error as Error).name === "AbortError") throw error;
        throw new SurfaceRasterFailure(job.chart, error);
      }
    }
    for (const job of jobs) if (!finished.has(job.descriptor.index))
      throw new SurfaceRasterFailure(job.chart, new Error(`Missing surface raster result ${job.descriptor.index}.`));
    aborted(signal);
    // Bind and insert content in recipe order, independent of worker completion order.
    for (const { descriptor, binding } of jobs) {
      for (const [index, references] of finished.get(descriptor.index)!.entries()) {
        for (const reference of Object.values(references)) if (!generated[reference]) generated[reference] = stagedAssets[reference];
        const source = sources.get(descriptor.layers[index].source)!;
        const material = { ...source, id: `$surface/raster/${descriptor.key}/${index}`, ...references,
          color: "#ffffff", roughness: 1, metalness: 1, normalScale: references.normalTexture ? 1 : undefined };
        delete material.heightTexture; delete material.heightScale; delete material.heightOffset;
        materials.push(material);
        binding.materials.push(material.id);
      }
    }
  } catch (error) {
    if (error instanceof SurfaceRasterJobError && jobs[error.index]) throw new SurfaceRasterFailure(jobs[error.index].chart, error);
    throw error;
  } finally {
    cancelLocal();
    signal?.removeEventListener("abort", cancelLocal);
    await Promise.allSettled(active);
    // An uncooperative executor cannot delay cancellation or publish late output.
    if (!complete && iterator?.return) {
      const closing = iterator.return();
      if (signal?.aborted) void closing.catch(() => {});
      else await closing;
    }
  }
  return bindings;
}

/** Default execution keeps one job's raw maps live at a time. */
async function* sequentialRasters(jobs: readonly SurfaceRasterJob[], bake: (index: number) => Promise<SurfaceRasterResult>): AsyncIterable<SurfaceRasterResult> {
  for (const job of jobs) yield await bake(job.index);
}

/** Races host work with cancellation and removes its listener whichever finishes first. */
async function abortableResult<T>(start: () => Promise<T>, signal?: AbortSignal): Promise<T> {
  aborted(signal);
  if (!signal) return start();
  let cancel!: () => void;
  const cancelled = new Promise<never>((_, reject) => {
    cancel = () => reject(new DOMException("Surface raster execution cancelled.", "AbortError"));
    signal.addEventListener("abort", cancel, { once: true });
  });
  try { return await Promise.race([Promise.resolve().then(start), cancelled]); }
  finally { signal.removeEventListener("abort", cancel); }
}

/** Validates against the compile-owned plan and copies exact views before yielding control or hashing. */
function ownedLayers(result: SurfaceRasterResult, job: SurfaceRasterJob): SurfaceRasterLayer[] {
  if (result.signature !== job.signature || !Array.isArray(result.layers) || result.layers.length !== job.layers.length)
    throw new Error(`Incompatible surface raster result ${job.index}.`);
  /** Shared memory is not an ownership transfer; copy only ordinary RGBA8 views of the expected dimensions. */
  const copy = (image: SurfaceImage): SurfaceImage => {
    if (!image || image.width !== job.width || image.height !== job.height || !(image.data instanceof Uint8Array)
      || !(image.data.buffer instanceof ArrayBuffer) || image.data.byteLength !== job.width * job.height * 4)
      throw new Error(`Invalid surface raster image in job ${job.index}.`);
    return { width: image.width, height: image.height, data: Uint8Array.from(image.data) };
  };
  return result.layers.map((layer, index) => {
    const expected = job.layers[index];
    if (layer.source !== expected.source || !!layer.normal !== expected.normal)
      throw new Error(`Invalid surface raster channels in job ${job.index}.`);
    return { source: layer.source, color: copy(layer.color), metallicRoughness: copy(layer.metallicRoughness),
      normal: layer.normal ? copy(layer.normal) : undefined };
  });
}
