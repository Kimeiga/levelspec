import type { Material, V3 } from "../../vector/types.ts";
import type { SurfaceChart, SurfaceSample } from "./types.ts";
import type { SurfaceRasterSettings } from "./raster.ts";

/** Encodes explicit recipe data, including infinite ledge ends; callbacks cannot silently disappear from an identity. */
export function materialRecipeKey(version: string, parameters: unknown): string {
  return `${version}/${JSON.stringify(parameters, (_key, value: unknown) => {
    if (typeof value === "function" || typeof value === "symbol")
      throw new Error("Material identities require explicit data for every callback.");
    if (typeof value === "number" && !Number.isFinite(value)) return { number: String(value) };
    return value;
  })}`;
}

/**
 * A geometry-independent periodic finish in physical meters. The versioned key
 * identifies every intrinsic parameter and source mapping; source material values
 * and image contents are additional cache dependencies. Samples, including bump
 * derivatives, must agree across both boundaries. No displacement is permitted.
 */
export interface SurfaceMaterialRecipe {
  key: string;
  bounds: [number, number, number, number];
  texelsPerMeter: number;
  materials: string[];
  sample(u: number, v: number): SurfaceSample;
  bump?: SurfaceRasterSettings["bump"];
}

/** One placement of a finished recipe; its common linear tint is applied after baking. */
export interface ReusableSurfaceMaterial {
  recipe: SurfaceMaterialRecipe;
  tint?(u: number, v: number): V3;
}

/** Resolves late material eligibility while retaining the original receiver's geometry and ownership. */
export function reusableMaterialChart(chart: SurfaceChart, materials: Map<string, Material>): SurfaceChart {
  const reusable = chart.reusableMaterial;
  if (!reusable) return chart;
  const center = chart.sample((chart.bounds[0] + chart.bounds[2]) / 2, (chart.bounds[1] + chart.bounds[3]) / 2);
  if (chart.raster?.geometry !== "preserve" || chart.layerElevations || center.height !== 0 || chart.materials.some(id => materials.get(id)?.heightTexture))
    throw new Error(`Reusable material ${chart.id} cannot replace displaced geometry.`);
  const { recipe } = reusable;
  if (!recipe.key || !recipe.materials.length) throw new Error(`Reusable material ${chart.id} needs a key and source materials.`);
  return { ...chart, reusableMaterial: reusable, materials: [...recipe.materials],
    sample: recipe.sample, sampleRow: undefined, appearanceTint: undefined, vertexTint: reusable.tint,
    raster: { geometry: "preserve", scope: "scene", repeat: true, group: recipe.key,
      materialKey: recipe.key,
      bounds: [...recipe.bounds], texelsPerMeter: recipe.texelsPerMeter, bump: recipe.bump } };
}

/** Reads a common post-composite tint without reapplying intrinsic layer colors. */
export function materialVertexTint(chart: SurfaceChart, u: number, v: number): V3 {
  const tint = chart.vertexTint?.(u, v) ?? [1, 1, 1];
  if (tint.length !== 3 || tint.some(value => !Number.isFinite(value) || value < 0))
    throw new Error(`Invalid material placement tint at ${chart.id}.`);
  return tint;
}
