export * from "./types.ts";
export { parseLevelSvgx, serializeLevelSvgx, SvgxError } from "./format.ts";
export { compile } from "./compiler.ts";
export { validateForRuntime, bakeNavmesh } from "./validate.ts";
export { generateUVs, auditUVs, atlasSVG } from "./uv.ts";
export { toRuntime, toOBJ, toSVGPlan, toGLB, toGLTF } from "./export.ts";

export {
  COORDINATE_STEP,
  millimetres,
  snapCoordinate,
  coordinateKey,
  sameCoordinate,
  normalizeCoordinates,
} from "./precision.ts";

export {
  resolveExportAssets,
  exportMetadata,
  exportName,
} from "./export-assets.ts";
export type {
  ExportAsset,
  ExportOptions,
  ExportFiles,
  ExportFormat,
} from "./export-assets.ts";

export * from "./reference.ts";\nexport * from "./reference-fit.ts";
export * from "./reference-raster.ts";
export * from "./props.ts";
export * from "./glb.ts";
export * from "./authoring.ts";
export { collisionMesh } from "./collision.ts";
