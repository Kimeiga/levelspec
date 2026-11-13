import type { V3 } from "../../vector/types.ts";
import { smoothStep } from "../finish/noise.ts";
import { facadeFinish, FACADE_PERIOD as PERIOD } from "./facade-finish.ts";
import type { SurfaceMaterialRecipe } from "../surface/material.ts";
import type { SurfaceSample } from "../surface/types.ts";

/** Intrinsic facade inputs; dimensions and location belong to placement; coat pigment is shared by matching finishes. */
export interface FacadeMaterialSettings {
  concrete: boolean;
  coat: { material: string; repeat: number; tint: V3 };
  backing: { material: string; repeat: number };
  wear: number;
  density: number;
  variant: number;
}

/**
 * Prepares a seamless finished facade recipe. Four translated material fields
 * blend at the boundary while source textures retain their authored meter scale.
 * Two deterministic variants replace face-specific weathering; geometry and
 * source PBR resolution are independent of the shared material's physical period.
 */
export function facadeMaterial(settings: FacadeMaterialSettings): SurfaceMaterialRecipe {
  const variant = settings.variant % 2;
  const recipe = { ...settings, variant };
  const plaster = facadeFinish(settings);
  const key = `facade-material/v6/${JSON.stringify(recipe)}`;
  return { key, bounds: [0, 0, PERIOD, PERIOD], texelsPerMeter: settings.density,
    materials: [...new Set([settings.coat.material, settings.backing.material])], bump: "sample",
    sample(u, v): SurfaceSample {
      const x = canonicalCoordinate(u), y = canonicalCoordinate(v);
      const across = smoothStep(0, PERIOD, x), up = smoothStep(0, PERIOD, y);
      const layers: SurfaceSample["layers"] = [];
      const finish = plaster(u, v);
      for (let row = 0; row < 2; row++) for (let column = 0; column < 2; column++) {
        const weight = (column ? across : 1 - across) * (row ? up : 1 - up);
        const tint: V3 = [finish.tone, finish.tone, finish.tone];
        layers.push({ material: settings.coat.material, weight: weight * (1 - finish.exposed),
          uv: [(x - column * PERIOD) * settings.coat.repeat, (y - row * PERIOD) * settings.coat.repeat],
          tint: tint.map((value, axis) => value * settings.coat.tint[axis]) as V3 },
        { material: settings.backing.material, weight: weight * finish.exposed,
          uv: [(x - column * PERIOD) * settings.backing.repeat, (y - row * PERIOD) * settings.backing.repeat], tint: tint.map((_value, axis) => finish.backingTone * .84 * (settings.concrete ? settings.coat.tint[axis] : 1)) as V3 });
      }
      return { height: 0, layers, bump: finish.bump, roughness: .9 + finish.exposed * .07 };
    } };
}

/** Keeps the closed canonical cell affine, with periodic samples beyond its edges for normal halos. */
function canonicalCoordinate(value: number): number {
  if (value >= -1e-9 && value <= PERIOD + 1e-9) return Math.max(0, Math.min(PERIOD, value));
  return ((value % PERIOD) + PERIOD) % PERIOD;
}
