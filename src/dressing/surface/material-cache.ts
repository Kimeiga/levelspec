import type { Material } from "../../vector/types.ts";
import { aborted } from "../../vector/types.ts";
import { materialCompanions } from "../../vector/materials.ts";
import type { SurfaceChart } from "./types.ts";
import type { SurfaceRasterJob } from "./raster-execution.ts";
import { decodeSurfaceImage, imageHash, type SurfacePngDecoder } from "./images.ts";

export interface MaterialArtifactImage { bytes: Uint8Array; hash: string }
/** Host policy: integrity trusts compiler-written local PNGs; decode also validates arbitrary encoded pixel streams. */
export type MaterialCacheValidation = "decode" | "integrity";
export interface SurfaceMaterialArtifact {
  version: 1;
  key: string;
  layers: { source: string; color: MaterialArtifactImage; metallicRoughness: MaterialArtifactImage; normal?: MaterialArtifactImage }[];
}

/**
 * Optional opportunistic storage for explicit finished-material recipes. Hosts
 * namespace persistent storage by compiler/generator implementation version.
 * The compiler owns independent byte copies in both directions, validates reads,
 * and treats corruption or non-abort I/O errors as misses/skipped writes.
 */
export interface SurfaceMaterialCache {
  read(key: string, signal?: AbortSignal): Promise<SurfaceMaterialArtifact | undefined>;
  write(artifact: SurfaceMaterialArtifact, signal?: AbortSignal): Promise<void>;
}

/** Hashes intrinsic recipe, codec contract, source properties and source image contents, excluding placement. */
export async function materialArtifactKey(chart: SurfaceChart, job: SurfaceRasterJob,
  materials: Map<string, Material>, sourceHashes: Record<string, string>, signal?: AbortSignal): Promise<string | undefined> {
  const identity = chart.raster?.materialKey;
  if (!identity) return undefined;
  const sources = [...new Set(chart.materials)].sort().map(id => {
    const material = materials.get(id)!;
    return [material, materialCompanions(material).sort().map(reference => [reference, sourceHashes[reference]])];
  });
  return imageHash(new TextEncoder().encode(JSON.stringify(["finished-material/v1", identity,
    job.signature, job.width, job.height, job.layers, sources])), signal);
}

/** Copies metadata and encoded byte views before any asynchronous validation or external write. */
export function copyMaterialArtifact(value: SurfaceMaterialArtifact): SurfaceMaterialArtifact {
  const copy = (image: MaterialArtifactImage): MaterialArtifactImage => {
    if (!(image.bytes instanceof Uint8Array) || image.bytes.byteLength > 32 * 1024 * 1024)
      throw new Error("Invalid cached material image size.");
    return { bytes: Uint8Array.from(image.bytes), hash: image.hash };
  };
  return { version: value.version, key: value.key, layers: value.layers.map(layer => ({
    source: layer.source, color: copy(layer.color), metallicRoughness: copy(layer.metallicRoughness),
    ...(layer.normal ? { normal: copy(layer.normal) } : {}),
  })) };
}

/** Checks owned bytes, planned dimensions and digests; only an explicit trusted-host policy skips pixel decoding. */
export async function readMaterialArtifact(cache: SurfaceMaterialCache, key: string, job: SurfaceRasterJob,
  signal?: AbortSignal, decodePng?: SurfacePngDecoder,
  validation: MaterialCacheValidation = "decode"): Promise<SurfaceMaterialArtifact | undefined> {
  try {
    aborted(signal);
    const borrowed = await cache.read(key, signal);
    if (!borrowed) return undefined;
    if (borrowed.version !== 1 || borrowed.key !== key || !Array.isArray(borrowed.layers)
      || borrowed.layers.length !== job.layers.length) return undefined;
    const artifact = copyMaterialArtifact(borrowed);
    for (const [index, layer] of artifact.layers.entries()) {
      aborted(signal);
      if (layer.source !== job.layers[index].source || !!layer.normal !== job.layers[index].normal) return undefined;
      for (const image of [layer.color, layer.metallicRoughness, layer.normal]) {
        if (!image) continue;
        const { bytes } = image;
        if (bytes.length < 33 || bytes[0] !== 137 || bytes[1] !== 80 || bytes[2] !== 78 || bytes[3] !== 71
          || bytes[4] !== 13 || bytes[5] !== 10 || bytes[6] !== 26 || bytes[7] !== 10) return undefined;
        const header = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        const width = header.getUint32(16), height = header.getUint32(20);
        if (header.getUint32(8) !== 13 || header.getUint32(12) !== 0x49484452
          || !width || !height || width * height > 16 * 1024 * 1024
          || width !== job.width || height !== job.height) return undefined;
        if (await imageHash(bytes, signal) !== image.hash) return undefined;
        if (validation !== "integrity") decodeSurfaceImage(bytes, decodePng);
      }
    }
    aborted(signal);
    return artifact;
  } catch (error) {
    if (error && typeof error === "object" && "name" in error && error.name === "AbortError") throw error;
    aborted(signal);
    return undefined;
  }
}

/** Cache writes are optional and receive their own buffers; failures never invalidate an otherwise valid material. */
export async function writeMaterialArtifact(cache: SurfaceMaterialCache, artifact: SurfaceMaterialArtifact,
  signal?: AbortSignal): Promise<void> {
  try {
    aborted(signal);
    await cache.write(copyMaterialArtifact(artifact), signal);
  } catch (error) {
    if (error && typeof error === "object" && "name" in error && error.name === "AbortError") throw error;
  }
  aborted(signal);
}
