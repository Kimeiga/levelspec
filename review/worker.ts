import { ClippingError } from "../src/vector/clipping.ts";
import { withBuiltinMaterialImages } from "../src/materials/images.ts";
import { parseNavigationCell } from "./navigation-cell.ts";
import type { CompiledLevel } from "../src/vector/types.ts";
import type { ExportAsset } from "../src/vector/export-assets.ts";
import {
  compile,
  TerrainTileCache,
  parseAml,
  generateUVs,
  validateForRuntime,
  AmlError,
  createGLBAssetResolver,
} from "../src/architecture/index.ts";
const terrainCache = new TerrainTileCache();

const maximumImageBytes = 16 * 1024 * 1024;

/** Normalizes companion names without granting access to paths outside the supplied map. */
function companion<T>(files: Record<string, T>, reference: string): T | undefined {
  const normalized = reference.replaceAll("\\", "/").replace(/^\.\//, "");
  if (Object.hasOwn(files, normalized)) return files[normalized];
  const basename = normalized.split("/").at(-1)!;
  return Object.hasOwn(files, basename) ? files[basename] : undefined;
}

/** Loads an explicitly bundled image URL with an encoded byte limit before allocation. */
async function imageBytes(url: string, signal?: AbortSignal): Promise<Uint8Array> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Unable to load material image (${response.status}).`);
  if (Number(response.headers.get("Content-Length")) > maximumImageBytes) {
    await response.body?.cancel();
    throw new Error("Material image encoded byte budget exceeded.");
  }
  if (!response.body) throw new Error("Material image response has no body.");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      signal?.throwIfAborted();
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maximumImageBytes) {
        await reader.cancel();
        throw new Error("Material image encoded byte budget exceeded.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

/** Restores generated image bytes from explicit preset assets, checking the published content hash. */
async function restoreImages(
  images: Record<string, Omit<ExportAsset, "bytes">>,
  urls: Record<string, string>,
): Promise<NonNullable<CompiledLevel["generatedImages"]>> {
  const generated: NonNullable<CompiledLevel["generatedImages"]> = {};
  for (const [reference, metadata] of Object.entries(images)) {
    const url = Object.hasOwn(urls, metadata.file) ? urls[metadata.file] : undefined;
    if (!url || !/^[a-f0-9]{64}$/.test(metadata.hash) || !["image/png", "image/jpeg"].includes(metadata.mimeType))
      throw new Error(`Invalid generated material image: ${reference}`);
    const bytes = await imageBytes(url);
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new Uint8Array(bytes).buffer)),
      byte => byte.toString(16).padStart(2, "0")).join("");
    if (hash !== metadata.hash) throw new Error(`Generated material image changed: ${reference}`);
    generated[reference] = { ...metadata, bytes };
  }
  return generated;
}

self.onmessage = async (event: MessageEvent) => {
  const { id, text, uvs, assetFiles = {}, materialURLs = {}, presetImages = {}, navigationCell, presetURL } = event.data as {
    presetURL?: string;
    presetImages?: Record<string, string>;
    materialURLs?: Record<string, string>;
    id: number;
    text: string;
    uvs: boolean;
    assetFiles?: Record<string, Uint8Array>;
    navigationCell?: number;
  };
  try {
    if (presetURL) {
      const response = await fetch(presetURL);
      if (!response.ok) throw new Error(`Unable to load demo preset (${response.status}).`);
      const snapshot = await response.json();
      if (snapshot.version !== 2 || !snapshot.level?.mesh || !snapshot.report?.passed) throw new Error("Invalid demo preview package.");
      if (snapshot.generatedImages)
        snapshot.level.generatedImages = await restoreImages(snapshot.generatedImages, presetImages);
      self.postMessage({ id, level: snapshot.level, report: snapshot.report, stage: "Ready" });
      return;
    }
    const cell = parseNavigationCell(navigationCell === undefined ? undefined : String(navigationCell));
    const resolveAsset = createGLBAssetResolver(async (reference) => {
        const bytes = companion(assetFiles, reference);
        if (!bytes)
          throw new Error(`Select companion GLB "${reference}" before compiling.`);
        return bytes;
      }),
      level = await compile(parseAml(text), {
      resolveAsset,
      terrainCache,
      resolveMaterialImage: withBuiltinMaterialImages(async (reference, signal) => {
        signal?.throwIfAborted();
        const bytes = companion(assetFiles, reference);
        if (bytes) {
          if (bytes.byteLength > maximumImageBytes) throw new Error("Material image encoded byte budget exceeded.");
          return bytes;
        }
        const url = companion(materialURLs, reference);
        if (!url) throw new Error(`Select companion image "${reference}" before compiling.`);
        return imageBytes(url, signal);
      }),
      resolveHeightmap: async asset => {
        const bytes = companion(assetFiles, asset.src);
        if (!bytes) throw new Error(`Select companion PNG "${asset.src}" before compiling.`);
        if (bytes.byteLength > 16*1024*1024) throw new Error('Heightmap encoded byte budget exceeded.');
        return bytes;
      },
      surfaceContacts: "error",
      navigation: { cell },
      onProgress: (stage) => self.postMessage({ id, stage }),
      onGeometry: () => self.postMessage({ id, stage: "Geometry ready" }),
    });
    if (
      level.diagnostics.some((d) => d.severity === "error") &&
      !level.navigation
    ) {
      self.postMessage({
        id,
        level,
        report: { passed: false, diagnostics: level.diagnostics },
        stage: "Geometry needs attention",
      });
      return;
    }
    const report = await validateForRuntime(level, { sealed: true, cell });
    self.postMessage({ id, stage: "Navigation ready" });
    if (uvs) {
      self.postMessage({ id, stage: "Generating lightmap atlas" });
      try {
        await generateUVs(level);
        self.postMessage({ id, stage: "UVs ready" });
      } catch (error) {
        self.postMessage({
          id,
          level,
          report,
          partial: "uv",
          error: `Lightmap UVs: ${(error as Error).message}`,
          stage: "Navigation ready · UV generation failed",
        });
        return;
      }
    }
    self.postMessage({ id, level, report, stage: "Ready" });
  } catch (error) {
    self.postMessage({
      id,
      error: (error as Error).message,
      diagnostics: error instanceof AmlError ? error.diagnostics : error instanceof ClippingError ? [error.diagnostic] : undefined,
    });
  }
};
