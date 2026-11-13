import type { Material } from "../../vector/types.ts";
import { imageSample, type SurfaceImage } from "./images.ts";
import type { SurfaceChart, SurfaceLayer, SurfaceSample } from "./types.ts";
import type { V3 } from "../../architecture/types.ts";

/** Composes appearance-only pigment at final vertices or raster texels without refining geometry. */
export function surfaceTint(chart: SurfaceChart, u: number, v: number, index: number, layer: SurfaceLayer): V3 {
  const base: V3 = layer.tint ?? [1, 1, 1];
  if (!chart.appearanceTint) return base;
  const tint = chart.appearanceTint(u, v, index);
  if (!Array.isArray(tint) || tint.length !== 3 || !tint.every(value => Number.isFinite(value) && value >= 0))
    throw new Error(`Invalid appearance tint at surface ${chart.id}.`);
  const composed = base.map((value, axis) => value * tint[axis]) as V3;
  if (!composed.every(Number.isFinite)) throw new Error(`Invalid composed appearance tint at surface ${chart.id}.`);
  return composed;
}

/** One selected finish's physical elevation, before authored height maps and the receiver's total envelope. */
export function finishHeight(sample: SurfaceSample, selectedLayer?: number, elevations?: number[]): number {
  const weight = sample.layerElevationWeight ?? 1;
  if (!Number.isFinite(weight) || weight < 0 || weight > 1)
    throw new Error("Surface layer elevation weight must be finite and between zero and one.");
  if (elevations && (selectedLayer === undefined || !Number.isInteger(selectedLayer)
    || selectedLayer < 0 || selectedLayer >= elevations.length || !Number.isFinite(elevations[selectedLayer])))
    throw new Error("Finite surface height requires a valid selected plate elevation.");
  const height = sample.height + (elevations ? elevations[selectedLayer!] * weight : 0);
  if (!Number.isFinite(height)) throw new Error("Surface finish height must be finite.");
  return height;
}

/** Evaluates authored height in meters; source PBR color and normals remain shared renderer inputs. */
export class SurfaceSampler {
  private readonly materials: Map<string, Material>;
  private readonly images: Map<string, SurfaceImage>;

  constructor(materials: Map<string, Material>, images: Map<string, SurfaceImage>) {
    this.materials = materials;
    this.images = images;
  }

  /** Adds either coverage-blended source height or one selected plate's source height to the shared continuous relief. */
  height(sample: SurfaceSample, selectedLayer?: number, elevations?: number[]): number {
    const total = sample.layers.reduce((sum, layer) => sum + layer.weight, 0);
    if (!(total > 0) || !Number.isFinite(total)) throw new Error("Surface sample requires finite positive material coverage.");
    if (selectedLayer !== undefined && (!Number.isInteger(selectedLayer) || selectedLayer < 0 || selectedLayer >= sample.layers.length))
      throw new Error("Surface height requires a valid selected material layer.");
    let height = finishHeight(sample, selectedLayer, elevations);
    for (const [index, layer] of sample.layers.entries()) {
      const weight = selectedLayer === undefined ? layer.weight / total : index === selectedLayer ? 1 : 0;
      if (weight <= 0) continue;
      const material = this.materials.get(layer.material);
      if (!material) throw new Error(`Unknown surface material ${layer.material}.`);
      if (!material.heightTexture) continue;
      const image = this.images.get(material.heightTexture);
      if (!image) throw new Error(`Missing surface height image ${material.heightTexture}.`);
      const value = imageSample(image, layer.uv[0], layer.uv[1])[0];
      height += (sample.heightWeight ?? 1) * weight * (value * (material.heightScale ?? 0.01) + (material.heightOffset ?? 0));
    }
    if (!Number.isFinite(height)) throw new Error("Surface height must be finite.");
    return height;
  }
}
