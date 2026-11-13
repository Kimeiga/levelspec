import type { V3 } from "../../architecture/types.ts";
import type { SurfaceRasterSettings } from "./raster.ts";
import type { ReusableSurfaceMaterial } from "./material.ts";

/** A source material sampled in its own UV space; tints are linear RGB multipliers. */
export interface SurfaceLayer {
  material: string;
  weight: number;
  /** Height-bearing source UVs must be affine across the receiver so one tangent-space normal can be shared. */
  uv: [number, number];
  tint?: V3;
  /** Raster-only roughness factor, 0–1, multiplying the source map; overrides sample and material factors. */
  roughness?: number;
  /** Optional semantic render role retained when a recipe changes the winning finish. */
  role?: string;
  /** Ordered appearance-only coats, composited by opacity maps without creating material regions or geometry. */
  coatings?: SurfaceCoating[];
}

/**
 * A raster-only texture layer with geometry-adapted opacity. Keep material order and
 * count stable over the complete raster bounds; use zero opacity where absent.
 * Normal-bearing coats require affine UVs. Coating height maps do not displace geometry.
 */
export interface SurfaceCoating {
  material: string;
  uv: [number, number];
  /** Multiplied by sampled texture alpha and material opacity before linear PBR composition. */
  opacity: number;
  tint?: V3;
  roughness?: number;
}

export interface SurfaceSample {
  layers: SurfaceLayer[];
  /** Continuous finish elevation shared by all layers relative to the receiver, in meters. */
  height: number;
  /** Appearance-only relief in meters, required when raster.bump is "sample". Never displaces geometry. */
  bump?: number;
  /** Boundary closure can taper authored height-map relief without altering its material color. */
  heightWeight?: number;
  /** Scales finite plate thickness from 0 to 1 at physical boundaries; defaults to 1, independently of source height-map relief. */
  layerElevationWeight?: number;
  roughness?: number;
  /** Fraction of preexisting fixture deposits retained after resurfacing; 0 is a completely fresh repair. */
  depositRetention?: number;
}

/** A sparse parameterized opaque receiver. Openings remain defined by the original triangles. */
export interface SurfaceChart {
  id: string;
  host: string;
  firstTriangle: number;
  triangleCount: number;
  /** Coalesced receivers can reference nonconsecutive original triangles. */
  triangleIndices?: number[];
  /** Recipes may merge only patches with exactly the same sampling, appearance tint and frame. */
  mergeGroup?: string;
  frame: { origin: V3; u: V3; v: V3; normal: V3 };
  bounds: [number, number, number, number];
  /** Optional total render-height envelope along frame.normal from frame.origin, including source height. */
  elevationRange?: [number, number];
  /** Constant unblended plate offsets in meters, indexed by stable sampled layer order. Omitted layers share continuous relief. */
  layerElevations?: number[];
  materials: string[];
  sample(u: number, v: number): SurfaceSample;
  /**
   * Equivalent scalar samples, exactly one per supplied evenly spaced ascending U coordinate in order,
   * including the normal derivative halo. Coordinates are borrowed read-only. Samples
   * may reuse scratch objects; the consumer snapshots each before advancing the iterator.
   */
  sampleRow?(us: readonly number[], v: number): Iterable<SurfaceSample>;
  /**
   * Deterministic linear RGB multiplier in the same coordinates and stable layer
   * order as sample. Evaluated at final vertices (interpolated by the renderer),
   * or baked per texel for raster charts; never drives geometry refinement.
   * Components must be finite and nonnegative; values above one brighten a finish.
   */
  appearanceTint?(u: number, v: number, layer: number): V3;
  /** Pigment and microscopic relief maps; preserve geometry to resolve material boundaries entirely in texels. */
  raster?: SurfaceRasterSettings;
  /** Finished periodic material selected after fixture registration; geometry-dependent receivers may omit it. */
  reusableMaterial?: ReusableSurfaceMaterial;
  /** Common linear RGB modulation after a preserved raster is baked; does not modify source layers or maps. */
  vertexTint?(u: number, v: number): V3;
  /** Maximum initial sampling step for visible relief; validated linear regions may coalesce afterward. */
  geometryStep?: number;
  /** Construction-aligned meter coordinates that seed the receiver before adaptive finish sampling. */
  constructionCuts?: { u: number[]; v: number[] };
  /** Smallest material feature to probe, in meters; arbitrary smaller isolated islands are not guaranteed. */
  featureScale?: number;
  /** Conservative proof of one common dominant layer across a meter-space rectangle, including tied boundary weights. */
  uniformCoverage?(bounds: [number, number, number, number]): boolean;
}

export interface SurfaceAppearanceLimits {
  maximumTexels?: number;
  maximumBytes?: number;
  maximumCharts?: number;
}

export interface SurfaceAppearanceManifest {
  version: 1;
  sourceHashes: Record<string, string>;
  generatedHashes: string[];
  charts: number;
  texels: number;
  imageBytes: number;
}
