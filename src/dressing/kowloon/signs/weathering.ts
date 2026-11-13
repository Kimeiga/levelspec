import type { V3 } from "../../../vector/types.ts";
import type { SurfaceChart } from "../../surface/types.ts";
import { fractalNoise, smoothStep, valueNoise } from "../../finish/noise.ts";
import { finishSeed } from "../../wall-surface.ts";
import type { Kit } from "../kit.ts";
import { mix, srgb } from "../palette.ts";
import type { SignPaint, SignSurface } from "./lettering.ts";
import type { PanelDesign } from "./panel.ts";
import { materialRecipeKey } from "../../surface/material.ts";

const WHITE: V3 = [1, 1, 1];
const CHALK = srgb("#ded8ca");
const subtract = (a: V3, b: V3): V3 => a.map((value, axis) => value - b[axis]) as V3;

/** Varies the paint pigment before fading; primer and oxide retain their own material colors. */
function paintTint(color: V3, pigment: V3, fade: number): V3 {
  return mix(color.map((value, axis) => value * pigment[axis]) as V3, CHALK, fade);
}

/** Measures distance to a convex sheet's actual perimeter, including diamond and round panels. */
function edgeDistance(points: [number, number][], x: number, y: number): number {
  let distance = Infinity;
  for (let index = 0; index < points.length; index++) {
    const [ax, ay] = points[index], [bx, by] = points[(index + 1) % points.length];
    const dx = bx - ax, dy = by - ay;
    const along = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
    distance = Math.min(distance, Math.hypot(x - ax - along * dx, y - ay - along * dy));
  }
  return distance;
}

/** Artwork is convex; opacity clips its atlas cell without sampling neighboring characters. */
function inside(points: [number, number][], x: number, y: number): boolean {
  return points.every(([ax, ay], index) => {
    const [bx, by] = points[(index + 1) % points.length];
    return (bx - ax) * (y - ay) - (by - ay) * (x - ax) >= -1e-9;
  });
}

/** Intrinsic paint aging: chips cluster at exposed edges, with short trails below the upper fixings. */
function signPatina(design: PanelDesign, kit: Pick<Kit, "grime" | "wear" | "rust">, outline: [number, number][], seed: number, x: number, y: number) {
  const age = design.age;
  const wear = kit.wear * age, grime = kit.grime * (0.3 + 0.7 * age);
  const smooth = design.construction === "lightbox" || design.construction === "cloth";
  const edge = Math.exp(-edgeDistance(outline, x, y) / 0.035);
  const cloud = fractalNoise(x * 2.7, y * 2.1, seed, 4);
  const warm = (fractalNoise(x * 5.1, y * 4.7, seed + 53, 3) - 0.5) * 0.08;
  const dye = (fractalNoise(x * 7.3, y * 5.9, seed + 59, 3) - 0.5) * 0.06;
  const value = 1 + (cloud - 0.5) * 0.14;
  const pigment: V3 = [value * (1 + warm), value * (1 + dye * 0.45), value * (1 - warm * 0.65 - dye * 0.25)];
  const flecks = fractalNoise(x * 22, y * 27, seed + 31, 4) * 0.85
    + fractalNoise(x * 72, y * 89, seed + 33, 2) * 0.15;
  const cluster = smoothStep(0.48, 0.72, fractalNoise(x * 6, y * 8, seed + 37, 3));
  const threshold = 0.73 - wear * (0.1 + edge * 0.42 + cluster * 0.16);
  const loss = smooth || wear === 0 ? 0 : smoothStep(threshold, threshold + 0.065, flecks);
  const head = Math.max(0, design.height - y), foot = Math.max(0, y);
  const rain = smoothStep(0.35, 0.72, valueNoise(x * 39, y * 0.7, seed + 41));
  let runs = 0;
  const inset = Math.min(0.03, Math.min(design.width, design.height) * 0.12);
  const fixings = design.outline === "rectangle" && ["sheet", "tile", "enamel"].includes(design.construction)
    ? [inset, design.width - inset] : [];
  for (const fixing of fixings) {
    const drop = design.height - inset - y;
    if (drop > 0) runs += Math.exp(-Math.abs(x - fixing) / (0.005 + drop * 0.018))
      * Math.exp(-drop / 0.32) * (0.5 + 0.5 * rain);
  }
  const dirt = grime * Math.min(0.65, (Math.exp(-head / 0.2) * (0.2 + rain * 0.42)
    + Math.exp(-foot / 0.08) * 0.22 + runs * 0.28) * (0.65 + cloud * 0.7));
  const fade = wear * (0.1 + cloud * 0.22);
  const corrosion = (design.construction === "sheet" || design.construction === "enamel" || design.construction === "tile")
    ? kit.rust * Math.min(1, loss * (0.12 + edge * 0.88) + runs * grime * wear * 0.35) : 0;
  const tone: V3 = [1 - dirt * 0.86, 1 - dirt * 0.92, 1 - dirt];
  const tooth = (valueNoise(x * 120, y * 67, seed + 47) - 0.5) * 0.00005;
  return { loss, corrosion, fade, tone, pigment, roughness: Math.min(1, 0.5 + (cloud - 0.5) * 0.16 + fade + dirt * 0.28 + loss * 0.28),
    bump: tooth - loss * 0.00045 };
}

/**
 * Bakes the complete painted face. An optional producer key must identify all
 * artwork polygons, ordered colors and UV programs; arbitrary callbacks remain uncached.
 */
export function paintSignFace(surface: SignSurface, design: PanelDesign, kit: Kit, paints: SignPaint[], artworkKey?: string): void {
  const [ground, ...art] = paints;
  if (!ground) return;
  const { pen } = surface;
  const firstTriangle = pen.mesh.triangleCount;
  pen.face(ground.slot, ground.points.map(([x, y]) => surface.at(x, y)), surface.out, WHITE);
  if (pen.mesh.triangleCount === firstTriangle) return;
  const origin = pen.world(surface.at(0, 0));
  const frame: SurfaceChart["frame"] = { origin,
    u: subtract(pen.world(surface.at(1, 0)), origin), v: subtract(pen.world(surface.at(0, 1)), origin),
    normal: subtract(pen.world(surface.at(0, 0, 1)), origin) };
  const bounds: [number, number, number, number] = [0, 0, design.width, design.height];
  const base = pen.mesh.material(ground.slot), rust = pen.mesh.material("rust"), underpaint = pen.mesh.material("paint");
  const ordered = art.sort((a, b) => a.lift - b.lift).map(paint => ({ ...paint, material: pen.mesh.material(paint.slot) }));
  const tintAt = (paint: SignPaint, x: number, y: number): V3 =>
    typeof paint.tint === "function" ? paint.tint(surface.at(x, y)) : paint.tint;
  const seed = finishSeed(`sign/${design.phase}`);
  const aging = { grime: kit.grime, wear: kit.wear, rust: kit.rust };
  const patina = (x: number, y: number) => signPatina(design, aging, ground.points, seed, x, y);
  const materialKey = artworkKey ? materialRecipeKey("sign-face/v1", { artworkKey, aging,
    width: design.width, height: design.height, construction: design.construction,
    outline: design.outline, age: design.age, phase: design.phase }) : undefined;
  const group = `${pen.part}/sign-face/${firstTriangle}`;
  pen.mesh.receive({ id: group, firstTriangle, triangleCount: pen.mesh.triangleCount - firstTriangle, frame, bounds,
    materials: [...new Set([base, rust, underpaint, ...ordered.map(paint => paint.material)])],
    raster: { group, materialKey, bounds, texelsPerMeter: Math.max(128, kit.textureDensity ?? 128), bump: "sample" },
    sample(x, y) {
      const weather = patina(x, y);
      return { height: 0, bump: weather.bump, roughness: weather.roughness, layers: [{ material: base, weight: 1, uv: ground.uv(x, y), tint: weather.tone,
        coatings: [
          { material: base, uv: ground.uv(x, y), opacity: 1, tint: paintTint(tintAt(ground, x, y), weather.pigment, weather.fade), roughness: weather.roughness },
          { material: underpaint, uv: [x, y] as [number, number], opacity: 0.72,
            tint: paintTint(tintAt(ground, x, y), weather.pigment, weather.fade), roughness: weather.roughness },
          ...ordered.map(paint => ({ material: paint.material, uv: paint.uv(x, y),
            opacity: inside(paint.points, x, y) ? 1 : 0, tint: paintTint(tintAt(paint, x, y), weather.pigment, weather.fade * 0.65), roughness: weather.roughness })),
          { material: underpaint, uv: [x, y] as [number, number], opacity: weather.loss,
            tint: design.construction === "timber" ? srgb("#96734a") : srgb("#938f80"), roughness: 0.88 },
          { material: rust, uv: [x * 3.7 + design.phase, y * 3.7] as [number, number], opacity: weather.corrosion,
            tint: [0.72, 0.8, 0.86], roughness: 0.96 },
        ] }] };
    },
  });
}

