import { ClippingError } from "../src/vector/clipping.ts";
import { parseNavigationCell } from "../review/navigation-cell.ts";
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
self.onmessage = async (event: MessageEvent) => {
  const { id, text, uvs, assetFiles = {}, navigationCell } = event.data as {
    id: number;
    text: string;
    uvs: boolean;
    assetFiles?: Record<string, Uint8Array>;
    navigationCell?: number;
  };
  try {
    const cell = parseNavigationCell(navigationCell === undefined ? undefined : String(navigationCell));
    const resolveAsset = createGLBAssetResolver(async (reference) => {
        const normalized = reference.replaceAll("\\", "/").replace(/^\.\//, ""),
          basename = normalized.split("/").at(-1)!,
          bytes = assetFiles[normalized] ?? assetFiles[basename];
        if (!bytes)
          throw new Error(`Select companion GLB "${reference}" before compiling.`);
        return bytes;
      }),
      level = await compile(parseAml(text), {
      resolveAsset,
      terrainCache,
      resolveHeightmap: async asset => {
        const normalized = asset.src.replaceAll("\\", "/").replace(/^\.\//, "");
        const bytes = assetFiles[normalized] ?? assetFiles[normalized.split("/").at(-1)!];
        if (!bytes) throw new Error(`Select companion PNG "${asset.src}" before compiling.`);
        if (bytes.byteLength > 16*1024*1024) throw new Error('Heightmap encoded byte budget exceeded.');
        return bytes;
      },
      surfaceContacts: "error",
      navigation: { cell },
      onProgress: (stage) => self.postMessage({ id, stage }),
      onGeometry: (geometry) =>
        self.postMessage({ id, level: geometry, stage: "Geometry ready" }),
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
    self.postMessage({ id, level, report, stage: "Navigation ready" });
    if (uvs) {
      self.postMessage({ id, stage: "Generating lightmap atlas" });
      try {
        await generateUVs(level);
        self.postMessage({ id, level, report, stage: "UVs ready" });
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
