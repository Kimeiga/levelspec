import type { V3 } from "../architecture/types.ts";
import type { SurfaceLayer } from "./surface/types.ts";
import type { TileField } from "./tile-field.ts";

/** Shared ceramic sources and physical sampling; caller supplies surface-local meters. */
export interface TileSurfaceMaterials {
  ceramic: string;
  bed: string;
  grime: string;
  repeat: number;
  bedRepeat: number;
  bedRoughness: number;
  roughness: number;
}

/** Composes ceramic, combed bedding, faded pigment, grime and normal relief identically on walls and floors. */
export function tileSurface(field: TileField, u: number, v: number, footprint: number,
  materials: TileSurfaceMaterials, bedTint: V3 = [1, 1, 1]): { layers: SurfaceLayer[]; bump: number; installed: number } {
  const installed = field.installation(u, v);
  const coverage = field.coverage(u, v, footprint);
  const bedCoverage = Math.max(0, installed - coverage);
  const bed = field.bed(u, v, footprint);
  const seam = bedCoverage > 0 ? field.seam(u, v, footprint) : 0;
  const appearance = field.appearance(u, v, footprint);
  return {
    installed,
    bump: bed.bump * bedCoverage + field.relief(u, v, footprint) * coverage,
    layers: [
      { material: materials.bed, weight: bedCoverage, uv: [u * materials.bedRepeat, v * materials.bedRepeat],
        roughness: materials.bedRoughness,
        tint: bedTint.map(value => value * bed.tone * (1 - seam * 0.35)) as V3 },
      { material: materials.ceramic, weight: coverage, uv: [u * materials.repeat, v * materials.repeat],
        tint: appearance.tint, roughness: materials.roughness + (1 - materials.roughness) * appearance.fade * 0.2,
        coatings: [
          { material: materials.grime, uv: [u, v], opacity: appearance.deposit },
        ] },
    ],
  };
}
