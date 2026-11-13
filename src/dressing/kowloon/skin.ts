import { TileField } from "../tile-field.ts";
import { tileSurface } from "../tile-surface.ts";
import { WALL_TILE_BED, WALL_TILE_GRIME } from "../wall-materials.ts";
import { createStudyUV } from "../finish/plaster-study.ts";
import { facadeFinish, FACADE_PERIOD } from "./facade-finish.ts";
import type { V3 } from "../../architecture/types.ts";
import { cutPositions } from "../finish/partition.ts";
import { WallCondition, type WallSample } from "../finish/wall-condition.ts";
import type { KitSlot } from "../kit-mesh.ts";
import type { Pen } from "../pen.ts";
import type { Kit } from "./kit.ts";
import type { Lot, Rect } from "./massing.ts";
import { finishSeed, plasterLoss, plasterSample, PLASTER_DEPTH, wallChartNeeds } from "../wall-surface.ts";
import { planRenderRepairs, renderPatina, renderRepairSample, renderRepairRow, type RenderRepair, type RenderRepairSample } from "../finish/patina.ts";
import type { SurfaceRasterSettings } from "../surface/raster.ts";
import type { SurfaceCoating, SurfaceSample } from "../surface/types.ts";
import { materialRecipeKey, type SurfaceMaterialRecipe } from "../surface/material.ts";
import { facadeMaterial } from "./facade-material.ts";

/**
 * Widest wall panel, meters. Mottling, damp fronts and coat-loss patches are
 * all broader than this; finer panels cost triangles on every exposed wall.
 */
const PANEL = 0.9;

/** Canonical finish boundaries keep each finite chart's source UV transform affine. */
function finishCuts(lo: number, hi: number): number[] {
  const cuts: number[] = [];
  for (let cell = Math.floor(lo / FACADE_PERIOD) + 1; cell * FACADE_PERIOD < hi; cell++) cuts.push(cell * FACADE_PERIOD);
  return cuts;
}

/** Splits exact repeat boundaries before ordinary panel spacing can merge nearby construction marks. */
function finishCells(rect: Rect): Rect[] {
  const us = [rect.u0, ...finishCuts(rect.u0, rect.u1), rect.u1];
  const vs = [rect.v0, ...finishCuts(rect.v0, rect.v1), rect.v1];
  const cells: Rect[] = [];
  for (let i = 0; i + 1 < us.length; i++) for (let j = 0; j + 1 < vs.length; j++)
    cells.push({ u0: us[i], u1: us[i + 1], v0: vs[j], v1: vs[j + 1] });
  return cells;
}

/** The two finishes of one lot's walls: the washed coat and what shows where it has come away. */
export interface LotFinish {
  coat: KitSlot;
  bare: KitSlot;
  /** Lot-wide construction choice; absent for individually painted fixtures. */
  cladding?: { type: "plaster" | "concrete"; groundTiles: boolean; seed: number };
}

/** Chooses construction once per lot, independently of facade order, shops, and detail. */
export function lotFinish(kit: Kit, lot: Lot, substrates: number): LotFinish {
  const rng = kit.rng(`${lot.key}/cladding`);
  const bare: KitSlot = substrates > 0 ? `substrate-${rng.int(0, substrates - 1)}` : "concrete";
  const concrete = rng.bool(0.3);
  return { coat: concrete ? bare : "wall", bare,
    cladding: { type: concrete ? "concrete" : "plaster", groundTiles: rng.bool(0.45), seed: rng.int(1, 2147483647) } };
}

/** One wall plane of a facade: its exposed wall, where it must be cut and how it is finished. */
export interface Skin {
  /** Pen on the plane: X is U along the facade, Y outward, Z up. */
  pen: Pen;
  /** Exposed wall in (U, Z), as disjoint rectangles. */
  rects: Rect[];
  /** Areas left open, such as window recesses; their edges must be among the marks. */
  openings: Rect[];
  condition: WallCondition;
  /** The coat's wash at a point. It may change only at marks. */
  washAt(u: number, z: number): V3;
  /** Complete wash program, including behavior outside panel bounds; omission leaves finite bakes uncached. */
  washKey?: string;
  /** Positions every panel edge must respect: bay edges, story datums and recess edges. */
  uMarks: number[];
  zMarks: number[];
  finish: LotFinish;
  /** Optional texture resolution and deterministic face seed; all panels share one image field. */
  raster?: { density: number; seed: number };
  /** Ceramic cladding confined to this skin, normally the ground story. */
  tiles?: { seed: number; wear: number; grime: number };
}

interface SkinAppearance { tint: V3; retention: number; coatings: SurfaceCoating[]; backingCoatings?: SurfaceCoating[]; exposed?: number; bump?: number; backingTone?: number }
interface SkinRaster {
  settings: SurfaceRasterSettings;
  intrinsic?: (wash: V3) => SurfaceMaterialRecipe;
  repairs?: RenderRepair[];
  appearance(u: number, v: number, wall: WallSample, repair?: RenderRepairSample): SkinAppearance;
  washAt(u: number, v: number): V3;
  materials: string[];
  tiles?: TileField;
  concrete?: boolean;
}

/**
 * Gives all facade panels one continuous material field, so tint and finish
 * relief conform across panel boundaries while source textures stay tiled.
 */
export function drawSkin(skin: Skin): void {
  const field = `${skin.pen.part}/skin/${skin.pen.mesh.triangleCount}`;
  let raster: SkinRaster | undefined;
  if (skin.raster && skin.rects.length && !skin.pen.mesh.hasHeight(skin.finish.coat) && !skin.pen.mesh.hasHeight(skin.finish.bare)) {
    const bounds: [number, number, number, number] = [Math.min(...skin.rects.map(r => r.u0)), Math.min(...skin.rects.map(r => r.v0)),
      Math.max(...skin.rects.map(r => r.u1)), Math.max(...skin.rects.map(r => r.v1))];
    const { density, seed } = skin.raster;
    const concrete = skin.finish.cladding?.type === "concrete";
    const repairs = concrete ? [] : planRenderRepairs(bounds, seed, skin.openings.map(r => [r.u0, r.v0, r.u1, r.v1]));
    const tiles = skin.tiles ? new TileField({ ...skin.tiles, share: 1, size: 0.18, aspect: 1 }) : undefined;
    const repaired = skin.pen.mesh.material("render-repair");
    const samplePlaster = facadeFinish({ concrete, density, wear: skin.condition.wearLevel,
      variant: (skin.finish.cladding?.seed ?? seed) % 2 });
    const repairUV = createStudyUV(skin.pen.mesh.repeat("render-repair"), seed + 71);
    const recipes = new Map<string, SurfaceMaterialRecipe>();
    /** Share intrinsic finish maps by pigment; exposed backing keeps its own source color. */
    const recipeFor = (wash: V3): SurfaceMaterialRecipe => {
      const key = wash.join(",");
      let recipe = recipes.get(key);
      if (!recipe) {
        recipe = facadeMaterial({ concrete,
          coat: { material: skin.pen.mesh.material(skin.finish.coat), repeat: skin.pen.mesh.repeat(skin.finish.coat), tint: [...wash] },
          backing: { material: skin.pen.mesh.material(skin.finish.bare), repeat: skin.pen.mesh.repeat(skin.finish.bare) },
          wear: skin.condition.wearLevel, density, variant: (skin.finish.cladding?.seed ?? seed) % 2 });
        recipes.set(key, recipe);
      }
      return recipe;
    };
    raster = { settings: { geometry: "preserve", group: field, bounds, texelsPerMeter: density, bump: "sample",
      materialKey: skin.washKey ? materialRecipeKey("facade-finite/v5", {
        concrete, condition: skin.condition.materialKey, seed, density, repairs, tiles: skin.tiles,
        variant: (skin.finish.cladding?.seed ?? seed) % 2,
        wash: skin.washKey,
        mappingSeed: finishSeed(`${skin.pen.part}/${skin.pen.mesh.material(skin.finish.coat)}/${skin.pen.mesh.material(skin.finish.bare)}`),
        repeats: [skin.pen.mesh.repeat(skin.finish.coat), skin.pen.mesh.repeat(skin.finish.bare), skin.pen.mesh.repeat("render-repair")],
      }) : undefined },
      intrinsic: !tiles ? recipeFor : undefined,
      repairs, concrete,
      appearance(u, v, wall, prepared) {
        const repair = prepared ?? renderRepairSample(repairs, u, v);
        const plaster = samplePlaster(u, v);
        const variation = { tint: [plaster.tone, plaster.tone, plaster.tone] as V3, weathering: 0 };
        return { tint: renderPatina(skin.condition, repair, variation, wall, u, v, seed), retention: repair.age,
          exposed: plaster.exposed * (1 - repair.coverage),
          bump: plaster.bump + repair.height, backingTone: plaster.backingTone / plaster.tone,
          coatings: [{ material: repaired, uv: repairUV(u, v), opacity: repair.coverage }],
          backingCoatings: [],
        };
      },
      washAt(u, v) {
        return skin.washAt(u, v);
      },
      tiles,
      materials: [repaired, ...(tiles ? ["$kowloon/wall-ceramic", WALL_TILE_BED, WALL_TILE_GRIME] : [])] };
  }
  // Clean walls can acquire fixture deposits later, so their finite fallback needs the same canonical cells.
  const rects = raster?.intrinsic ? skin.rects.flatMap(finishCells) : skin.rects;
  for (const rect of rects) {
    const us = cutPositions(rect.u0, rect.u1, skin.uMarks, () => PANEL),
      zs = cutPositions(rect.v0, rect.v1, skin.zMarks, () => PANEL);
    for (let i = 0; i + 1 < us.length; i++)
      for (let j = 0; j + 1 < zs.length; j++) {
        const u = (us[i] + us[i + 1]) / 2,
          z = (zs[j] + zs[j + 1]) / 2;
        const open = skin.openings.some(
          (r) => u > r.u0 && u < r.u1 && z > r.v0 && z < r.v1,
        );
        if (open) continue;
        const wash = skin.washAt(u, z);
        surfacePanel(skin.pen, skin.finish, [us[i], zs[j], us[i + 1], zs[j + 1]], 0, wash, skin.condition, field, raster);
      }
  }
}

/** Registers the original receiving plane; the appearance compiler alone owns finish depth and tint. */
function surfacePanel(pen: Pen, finish: LotFinish, bounds: [number, number, number, number], depth: number, wash: V3, condition: WallCondition, field: string, raster?: SkinRaster): void {
  const coat = pen.mesh.material(finish.coat), bare = pen.mesh.material(finish.bare);
  const seed = finishSeed(`${pen.part}/${coat}/${bare}`);
  const needs = wallChartNeeds(condition, bounds);
  const exposed = plasterLoss(condition, (bounds[0] + bounds[2]) / 2, (bounds[1] + bounds[3]) / 2, seed) > 0;
  const firstTriangle = pen.mesh.triangleCount;
  pen.panel(finish.coat, bounds[0], bounds[2], bounds[1], bounds[3], depth, [1, 1, 1]);
  const triangleCount = pen.mesh.triangleCount - firstTriangle;
  if (!triangleCount || pen.mesh.survey) return;
  const tileBed = raster?.tiles ? pen.mesh.sourceAppearance(WALL_TILE_BED) : undefined;
  const repeats = [pen.mesh.repeat(finish.coat), pen.mesh.repeat(finish.bare)];
  const sourceUVs = raster ? repeats.map((repeat, index) => createStudyUV(repeat, seed + index * 41)) : undefined;
  const placementTint = raster?.intrinsic ? raster.washAt((bounds[0] + bounds[2]) / 2, (bounds[1] + bounds[3]) / 2) : undefined;
  const intrinsic = raster?.intrinsic?.(placementTint!);
  const shared = intrinsic && condition.grimeLevel === 0;
  const origin = [0, 1].map(axis => Math.floor((bounds[axis] + bounds[axis + 2]) / 2 / FACADE_PERIOD) * FACADE_PERIOD);
  const cellBounds: [number, number, number, number] = raster ? [
    Math.max(raster.settings.bounds[0], origin[0]), Math.max(raster.settings.bounds[1], origin[1]),
    Math.min(raster.settings.bounds[2], origin[0] + FACADE_PERIOD), Math.min(raster.settings.bounds[3], origin[1] + FACADE_PERIOD),
  ] : bounds;
  const depositDensity = Math.min(raster?.settings.texelsPerMeter ?? 128, 128);
  const settings = raster && intrinsic ? { ...raster.settings,
    group: `${field}/${intrinsic.key}/${origin.join(",")}`, bounds: cellBounds, texelsPerMeter: depositDensity,
    materialKey: raster.settings.materialKey ? materialRecipeKey("facade-deposits/v2", {
      finish: intrinsic.key, exposure: condition.materialKey, field: raster.settings.materialKey,
      origin, bounds: cellBounds, density: depositDensity,
    }) : undefined,
  } : raster?.settings;
  /** Evaluates one complete finish, optionally reusing repair channels painted for this row. */
  const evaluate = (u: number, v: number, repair?: RenderRepairSample): SurfaceSample => {
    if (intrinsic) {
      const sample = intrinsic.sample(u - origin[0], v - origin[1]), deposit = condition.depositTint(u, v);
      return { ...sample, layers: sample.layers.map(layer => ({ ...layer,
        tint: deposit.map((value, axis) => value * (layer.tint?.[axis] ?? 1)) as V3,
      })) };
    }
    const wall = condition.sample(u, v);
    const sample = plasterSample(condition, u, v, seed,
      { material: coat, uv: [u * repeats[0], v * repeats[0]], tint: raster?.washAt(u, v) ?? wash },
      { material: bare, uv: [u * repeats[1], v * repeats[1]] }, wall);
    if (raster) {
      const appearance = raster.appearance(u, v, wall, repair);
      const { tint, coatings } = appearance, original = wall.tint;
      sample.bump = appearance.bump;
      sample.layers = sample.layers.map((layer, index) => ({ ...layer,
        weight: appearance.exposed === undefined ? layer.weight : index === 0 ? 1 - appearance.exposed : appearance.exposed,
        uv: sourceUVs![index](u, v),
        tint: layer.tint!.map((value, axis) => value * tint[axis] / original[axis]
          * (index === 1 ? (appearance.backingTone ?? 1) * (raster.concrete ? raster.washAt(u, v)[axis] : 1) : 1)) as V3,
        coatings: index === 1 && appearance.backingCoatings ? appearance.backingCoatings : coatings }));
      if (raster.tiles) {
        const ceramic = tileSurface(raster.tiles, u, v, 1 / raster.settings.texelsPerMeter, {
          ceramic: "$kowloon/wall-ceramic", bed: WALL_TILE_BED, grime: WALL_TILE_GRIME, repeat: 1, roughness: 0.65,
          bedRepeat: tileBed!.repeat, bedRoughness: tileBed!.roughness,
        });
        sample.layers = [...sample.layers.map(layer => ({ ...layer, weight: layer.weight * (1 - ceramic.installed) })),
          ...ceramic.layers.map(layer => ({ ...layer, tint: layer.tint!.map((value, axis) =>
            value * tint[axis] * (layer.material === "$kowloon/wall-ceramic" ? raster.washAt(u, v)[axis] : 1)) as V3 }))];
        sample.bump = (sample.bump ?? 0) * (1 - ceramic.installed) + ceramic.bump;
      }
      sample.depositRetention = appearance.retention;
      sample.roughness = (sample.roughness ?? 0.9) * sample.depositRetention + 0.82 * (1 - sample.depositRetention);
    }
    if (raster || needs.fracture) return sample;
    return { ...sample,
      layers: sample.layers.map((layer, index) => ({ ...layer, weight: index === (exposed ? 1 : 0) ? 1 : 0 })) };
  };
  pen.mesh.receive({
    id: `${pen.part}/surface/${firstTriangle}`, firstTriangle, triangleCount,
    mergeGroup: raster ? `${field}/${coat}/${bare}/${placementTint?.join(",") ?? ""}` : `${field}/${coat}/${bare}/${wash.join(",")}/${needs.fracture ? "mixed" : exposed ? "bare" : "coat"}`,
    frame: pen.surfaceFrame(depth), bounds, materials: [...new Set([coat, bare, ...(raster?.materials ?? [])])], layerElevations: raster ? undefined : [0, -PLASTER_DEPTH],
    raster: settings,
    reusableMaterial: shared ? { recipe: intrinsic } : undefined,
    geometryStep: needs.fracture ? 0.035 : 0.2,
    featureScale: needs.fracture ? 0.02 : 0.1,
    uniformCoverage: area => !wallChartNeeds(condition, area).fracture,
    sample: evaluate,
    sampleRow: raster?.repairs && !intrinsic ? function* (us, v) {
      const repairs = renderRepairRow(raster.repairs!, us, v);
      for (let column = 0; column < us.length; column++) yield evaluate(us[column], v, repairs[column]);
    } : undefined,
  });
}

/**
 * Draws a painted panel on the plane Y=`y` of the pen, stained by the water
 * its own top edge sheds down it: a balcony front below its coping, or a
 * spandrel below its sill. Sparse material charts preserve its streaks;
 * `flow` is the top edge's water, 0–1, and `seed` the panel's own.
 */
export function stainedPanel(
  pen: Pen,
  slot: KitSlot,
  rect: Rect,
  y: number,
  paint: V3,
  kit: Kit,
  flow: number,
  seed: number,
): void {
  const condition = new WallCondition(
    { ledges: [{ u0: rect.u0, u1: rect.u1, z: rect.v1, flow }] },
    { grime: kit.grime, wear: kit.wear, seed },
  );
  drawSkin({ pen: pen.move(0, y, 0), rects: [rect], openings: [], condition,
    finish: { coat: slot, bare: "concrete", cladding: { type: slot === "concrete" ? "concrete" : "plaster", groundTiles: false, seed } },
    uMarks: [], zMarks: [], washAt: () => paint, washKey: JSON.stringify(["stained-panel/v2", paint]),
    raster: { density: kit.textureDensity, seed } });
}
