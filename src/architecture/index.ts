export * from "./types.ts";
export {
  createArchitecture,
  parseAml,
  serializeAml,
  AmlError,
} from "./format.ts";
export { compile } from "./compiler.ts";
export { ArchitectureBuilder } from "./builder.ts";
export { architectureCompanions } from "./assets.ts";
export { validateForRuntime, bakeNavmesh } from "../vector/validate.ts";
export { collisionMesh } from "../vector/collision.ts";
export { toOBJ, toSVGPlan, toGLB, toGLTF } from "../vector/export.ts";
export { createGLBAssetResolver, parseGLBGeometry } from "../vector/glb.ts";
export { generateUVs, auditUVs, atlasSVG } from "../vector/uv.ts";
export {
  exportName,
  exportMetadata,
  resolveExportAssets,
} from "../vector/export-assets.ts";
export type {
  Diagnostic,
  CompileOptions,
  NavigationOptions,
  NavigationReport,
  ValidationReport,
  RepairRecord,
  Suggestion,
} from "../vector/types.ts";
export type { AssetGeometry, AssetResolver } from "../vector/props.ts";
export type { CompiledArchitecture as CompiledLevel } from "./types.ts";
export type {
  ExportFormat,
  ExportFiles,
  ExportOptions,
} from "../vector/export-assets.ts";
import { toRuntime as runtimeGeometry } from "../vector/export.ts";
import type { CompiledArchitecture } from "./types.ts";

/** Generated runtime transport has its own version, independent of AML version 1. */
export function toRuntime(level: CompiledArchitecture) {
  return {
    ...runtimeGeometry(level),
    physicalHash: level.physicalHash,
    renderHash: level.renderHash,
    architecture: {
      provenance: level.provenance,
      elements: level.architecture.elements,
      definitions: level.architecture.definitions,
    },
  };
}

export { decodeHeightmapPng } from "./heightmap.ts";
export type { HeightmapRaster, HeightmapDecodeOptions } from "./heightmap.ts";

export type { TerrainTile } from "../vector/types.ts";

export type { SpatialVolume } from "../vector/types.ts";

export { TerrainTileCache } from "./terrain-cache.ts";

export * from "../vector/reference.ts";
export * from "../vector/reference-raster.ts";
export * from "../vector/reference-fit.ts";
