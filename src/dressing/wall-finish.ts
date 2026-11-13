import type { SurfaceSample } from "./surface/types.ts";
import { materialRecipeKey } from "./surface/material.ts";
import type { CompiledArchitecture, V3 } from "../architecture/types.ts";
import { Matrix4, Vector3 } from "three";
import { Rng } from "../generate/rng.ts";
import { smoothStep, valueNoise } from "./finish/noise.ts";
import { clipByLevel } from "./finish/partition.ts";
import { WallCondition } from "./finish/wall-condition.ts";
import { WALL_TILE_BED, WALL_TILE_GRIME, wallBaseMaterial, wallTileMaterial, tilePlasterMaterial } from "./wall-materials.ts";
import { registerSurfaceChart } from "./surface/plans.ts";
import { tileSurface } from "./tile-surface.ts";
import { TileField } from "./tile-field.ts";
import { PLASTER_DEPTH, plasterLoss, plasterSample, wallChartNeeds } from "./wall-surface.ts";

/** Clips a world-space polygon against a plane expressed by an affine coordinate function. */
function clip(polygon: V3[], coordinate: (point: V3) => number, bound: number, sign: number): V3[] {
  return clipByLevel(polygon, point => sign * (coordinate(point as V3) - bound)) as V3[];
}

/**
 * Cuts the receiving triangles into vertical finish sections, preserving every
 * opening and authored boundary exactly. Sections replace the surface's material;
 * they add no offset skin or physical geometry. Dimensions remain wall-local meters.
 */
export function wallFinishSections(points: V3[], inverse: Matrix4, host: string, seed: string, paletteSize: number, continuous: boolean): { points: V3[]; material: string }[] {
  if (paletteSize === 1 || continuous)
    return [{ points, material: wallBaseMaterial(host, new Rng(`${seed}/${host}/surface`).int(0, paletteSize - 1)) }];
  const { width, phase } = wallSectionLayout(seed, host);
  const coordinate = (point: V3) => {
    const local = new Vector3(...point).applyMatrix4(inverse);
    return local.x * 0.83 + local.y * 0.67 + phase;
  };
  const values = points.map(coordinate);
  const first = Math.floor(Math.min(...values) / width), last = Math.floor(Math.max(...values) / width);
  const result: { points: V3[]; material: string }[] = [];
  for (let section = first; section <= last; section++) {
    const polygon = clip(clip(points, coordinate, section * width, 1), coordinate, (section + 1) * width, -1);
    const finish = wallSectionFinish(seed, host, section, paletteSize);
    for (let i = 1; i + 1 < polygon.length; i++) {
      const triangle = [polygon[0], polygon[i], polygon[i + 1]];
      const a = new Vector3(...triangle[0]);
      const area = new Vector3(...triangle[1]).sub(a).cross(new Vector3(...triangle[2]).sub(a)).length();
      if (area > 1e-10) result.push({ points: triangle, material: wallBaseMaterial(host, finish) });
    }
  }
  return result;
}

/** Shares exact finish boundaries with the shallow structural dividers. */
export function wallSectionLayout(seed: string, host: string): { width: number; phase: number } {
  const rng = new Rng(`${seed}/${host}/sections`);
  const width = rng.float(4.5, 7.5);
  return { width, phase: rng.float(0, width) };
}

/** Picks a declared material without changing its texture, color, scale or surface response. */
export function wallSectionFinish(seed: string, host: string, section: number, count: number): number {
  return new Rng(`${seed}/${host}/section-${section}`).int(0, count - 1);
}

/** How one plain wall weathers, in its own frame: Z up, meters. */
export interface PlainWallFinish {
  /** Complete semantic identity of the station callback and condition; omission disables persistent baking. */
  materialKey?: string;
  condition: WallCondition;
  /** Continuous distance along the wall, including its offset miter joints. */
  along(point: V3): number;
  /** Height of the wall's base line, where damp rises and the paint band starts. */
  base: number;
  /** Seed of the wall's own patterns, shared with its condition. */
  seed: number;
}

/**
 * Describes how a plain wall weathers: it stands on its base line at `base`
 * and sheds rain from its top edge, `height` above, along its whole length.
 * A wall whose base line rises is treated as standing at its lowest point.
 * `path` is the wall's base path in its own frame, and `seed` distinguishes
 * the wall's patterns from every other wall's.
 */
export function plainWallFinish(path: V3[], base: number, height: number, grime: number, wear: number, seed: number): PlainWallFinish {
  const condition = new WallCondition(
    { base, ledges: [{ u0: -Infinity, u1: Infinity, z: base + height, flow: 0.8 }] },
    { grime, wear, seed },
  );
  const measure = new WallPathMeasure(path);
  return { condition, along: point => measure.at(point), base, seed,
    materialKey: materialRecipeKey("wall-stations/v1", { path, base, height, grime, wear, seed }) };
}

type Direction = [number, number];
interface WallPathSegment {
  a: V3;
  b: V3;
  direction: Direction;
  length: number;
  station: number;
  start: Direction;
  end: Direction;
}

/**
 * Measures wall stations between perpendicular joint-bisector planes. Offset
 * faces stretch slightly between bends, but adjacent cells meet at the exact
 * same path station. Precomputing the planes keeps finish sampling inexpensive.
 */
class WallPathMeasure {
  private readonly segments: WallPathSegment[] = [];

  /** Owns the points alongside the derived distances, so later authoring edits cannot change an existing station program. */
  constructor(path: V3[]) {
    const points = path.map(point => [...point] as V3);
    let station = 0;
    for (let index = 0; index + 1 < points.length; index++) {
      const a = points[index], b = points[index + 1], dx = b[0] - a[0], dy = b[1] - a[1];
      const length = Math.hypot(dx, dy);
      if (length < 1e-9) continue;
      const direction: Direction = [dx / length, dy / length];
      this.segments.push({ a, b, direction, length, station, start: direction, end: direction });
      station += length;
    }
    for (let index = 0; index < this.segments.length; index++) {
      const segment = this.segments[index];
      segment.start = this.plane(segment.direction, this.segments[index - 1]?.direction);
      segment.end = this.plane(segment.direction, this.segments[index + 1]?.direction);
    }
  }

  /** Scales each joint plane so distance along the segment retains a meter-to-meter slope. */
  private plane(direction: Direction, adjacent?: Direction): Direction {
    if (!adjacent) return direction;
    const sum: Direction = [direction[0] + adjacent[0], direction[1] + adjacent[1]];
    const divisor = direction[0] * sum[0] + direction[1] * sum[1];
    // Reversing paths have no finite miter; keep their endpoint plane well defined.
    return divisor > 1e-8 ? [sum[0] / divisor, sum[1] / divisor] : direction;
  }

  /** Selects the nearest valid local strip; positions outside all strips use their nearest endpoint projection. */
  at(point: V3): number {
    let nearest = Infinity, station = 0, nearestOutside = Infinity, outside = 0;
    for (const [index, segment] of this.segments.entries()) {
      const { a, b, direction, length, start, end } = segment;
      const x = point[0] - a[0], y = point[1] - a[1];
      const projected = Math.max(0, Math.min(length, x * direction[0] + y * direction[1]));
      const distance = Math.hypot(x - projected * direction[0], y - projected * direction[1]);
      if (distance < nearestOutside) { nearestOutside = distance; outside = segment.station + projected; }
      const from = x * start[0] + y * start[1];
      const to = (b[0] - point[0]) * end[0] + (b[1] - point[1]) * end[1];
      const tolerance = Number.EPSILON * 64 * Math.max(1, length, Math.abs(from), Math.abs(to));
      if (from + to <= tolerance || (index > 0 && from < -tolerance)
        || (index + 1 < this.segments.length && to < -tolerance)) continue;
      if (distance < nearest) {
        nearest = distance;
        station = segment.station + length * Math.max(0, Math.min(1, from / (from + to)));
      }
    }
    return nearest < Infinity ? station : outside;
  }
}

/** Returns the continuous weathering station; centerline distance stays exact and the ends remain clamped. */
export function alongPath(path: V3[], point: V3): number {
  return new WallPathMeasure(path).at(point);
}

/**
 * Modulates the receiving wall itself with the shared wall condition and a
 * lower paint band whose top edge wanders and which survives only where the
 * coat has not come away. `point` is wall-local; `weather` and the result are
 * linear material multipliers. This is finish variation, never baked illumination.
 */
export function wallFinishColor(point: V3, weather: V3, finish: PlainWallFinish): V3 {
  const u = finish.along(point), z = point[2];
  const { tint, loss } = finish.condition.sample(u, z), paint = wallPaintTint(point, finish, u, loss);
  return weather.map((value, axis) => Math.max(0.16, Math.min(1,
    value * tint[axis] * paint[axis]))) as V3;
}

/** Keeps the lower painted band separate from weather tint, so material composition applies each once. */
function wallPaintTint(point: V3, finish: PlainWallFinish, u: number, loss: number): V3 {
  const z = point[2];
  const paintTop = finish.base + 0.85 + valueNoise(u * 1.8, 0.5, finish.seed + 37) * 0.35;
  const band = (1 - smoothStep(paintTop - 0.12, paintTop + 0.12, z)) * (1 - smoothStep(-0.1, 0.02, loss));
  return [0.89, 0.87, 0.83].map(value => 1 - band * (1 - value)) as V3;
}

interface PlainWallReceiver {
  host: string;
  points: V3[];
  normal: V3;
  firstTriangle: number;
  material: string;
  backing: string;
  inverse: Matrix4;
  phase: number;
  tileShare: number;
  tileSize?: number;
  tileAspect?: number;
  tileWear?: number;
  tileGrime: number;
  tileColor?: string;
  tilePlasterColor?: string;
  textureDensity?: number;
  wear: number;
  finish: PlainWallFinish;
  weather(point: V3): V3;
  /** Complete identity of the weather callback, including all parameters except its world point. */
  weatherKey?: string;
}

/** Locates fine fracture work before tessellation; intact wall interiors retain broad triangles. */
export function plainWallChartNeeds(points: V3[], inverse: Matrix4, finish: PlainWallFinish): ReturnType<typeof wallChartNeeds> {
  const local = points.map(point => new Vector3(...point).applyMatrix4(inverse).toArray() as V3);
  const distances = local.map(point => finish.along(point));
  return wallChartNeeds(finish.condition, [Math.min(...distances), Math.min(...local.map(point => point[2])),
    Math.max(...distances), Math.max(...local.map(point => point[2]))]);
}

/** Registers every native-wall receiver on its original plane, retaining material projection and continuous aging. */
export function registerPlainWallSurface(level: CompiledArchitecture, receiver: PlainWallReceiver): void {
  const { points, normal, finish, inverse, material, backing, phase } = receiver;
  const localPoints = points.map(point => new Vector3(...point).applyMatrix4(inverse).toArray() as V3);
  const needs = plainWallChartNeeds(points, inverse, finish);
  const exposed = localPoints.some(point => plasterLoss(finish.condition, finish.along(point), point[2], finish.seed) > 0);
  const across: V3 = [-normal[1], normal[0], 0], up: V3 = [0, 0, 1];
  const distance = normal.reduce((sum, value, axis) => sum + value * points[0][axis], 0);
  const origin = normal.map(value => value * distance) as V3;
  const us = points.map(point => point.reduce((sum, value, axis) => sum + (value - origin[axis]) * across[axis], 0));
  const bounds: [number, number, number, number] = [Math.min(...us), Math.min(...points.map(point => point[2])),
    Math.max(...us), Math.max(...points.map(point => point[2]))];
  const cosine = Math.round(Math.cos(Math.floor(phase) * Math.PI));
  const repeats = [material, backing].map(id => level.document.materials.find(entry => entry.id === id)!.repeat);
  const uv = (point: V3, repeat: number): [number, number] => [
    (point[0] * 0.83 + point[1] * 0.67) * repeat * cosine + phase,
    point[2] * repeat * cosine + phase * 0.37,
  ];
  const tiles = new TileField({ seed: finish.seed, share: receiver.tileShare,
    wear: receiver.tileWear ?? receiver.wear, grime: receiver.tileGrime, size: receiver.tileSize, aspect: receiver.tileAspect });
  const ceramic = receiver.tileColor === undefined
    ? `$kowloon/wall-${["ceramic", "ceramicWarm", "ceramicGray"][finish.seed % 3]}` : wallTileMaterial(receiver.host);
  const tiled = receiver.tileShare > 0;
  const tileBed = receiver.tilePlasterColor === undefined ? WALL_TILE_BED : tilePlasterMaterial(receiver.host);
  const bedMaterial = level.document.materials.find(entry => entry.id === tileBed)!;
  const materials = [material, backing, ...(tiled ? [tileBed, ceramic] : [])];
  const preserve = !materials.some(id => level.document.materials.find(entry => entry.id === id)?.heightTexture);
  const rasterized = preserve || tiled;
  const density = receiver.textureDensity ?? 32;
  const group = `${receiver.host}/${material}/${backing}/${[...normal, distance].map(value => Math.round(value * 1e5)).join("/")}`;
  // Displaced receivers retain individual raster bounds; only preserved planes share a merged atlas.
  const rasterGroup = preserve ? group : `${group}/${receiver.firstTriangle}`;
  const ceramicMaterial = level.document.materials.find(entry => entry.id === ceramic)!;
  const tileRepeat = ceramicMaterial.repeat;
  const tileRoughness = ceramicMaterial.roughness + (1 - ceramicMaterial.roughness) * receiver.tileGrime * 0.45;
  const vertical = inverse.elements[8] === 0 && inverse.elements[9] === 0 && inverse.elements[11] === 0;
  let columns: readonly number[] | undefined;
  let stations: number[] = [];
  /** Reuses one condition and station for color, roughness and shallow relief. */
  const evaluate = (u: number, v: number, knownStation?: number): SurfaceSample => {
    const world = origin.map((value, axis) => value + across[axis] * u + up[axis] * v) as V3;
    const local = new Vector3(...world).applyMatrix4(inverse).toArray() as V3;
    const station = knownStation ?? finish.along(local);
    const condition = finish.condition.sample(station, local[2]);
    const sample = plasterSample(finish.condition, station, local[2], finish.seed,
      { material, uv: uv(local, repeats[0]), tint: wallPaintTint(local, finish, station, condition.loss) },
      { material: backing, uv: uv(local, repeats[1]) }, condition);
    const weather = receiver.weather(world);
    const installed = tiles.installation(u, v);

    const layers: SurfaceSample["layers"] = sample.layers.map((layer, index) => ({ ...layer,
      weight: (rasterized || needs.fracture ? layer.weight : index === (exposed ? 1 : 0) ? 1 : 0) * (1 - installed),
      tint: layer.tint!.map((value, axis) => value * weather[axis]) as V3 }));
    let tileBump = 0;
    if (tiled) {
      const bedTint = weather.map((value, axis) =>
        0.82 + (value * condition.tint[axis] - 0.82) * 0.18) as V3;
      const ceramicSample = tileSurface(tiles, u, v, 1 / density, {
        ceramic, bed: tileBed, grime: WALL_TILE_GRIME,
        repeat: tileRepeat, bedRepeat: bedMaterial.repeat, bedRoughness: bedMaterial.roughness, roughness: tileRoughness,
      }, bedTint);
      tileBump = ceramicSample.bump;
      layers.push(...ceramicSample.layers);
    }
    const bump = tileBump - (preserve ? PLASTER_DEPTH * sample.layers[1].weight * (1 - installed) : 0);
    return { ...sample, layers, bump };
  };
  registerSurfaceChart(level, {
    id: `${receiver.host}/finish/${receiver.firstTriangle}`, host: receiver.host,
    mergeGroup: preserve ? group : tiled || needs.fracture ? undefined : `${group}/${exposed ? "bare" : "coat"}`,
    firstTriangle: receiver.firstTriangle, triangleCount: 1, frame: { origin, u: across, v: up, normal }, bounds,
    materials: [...materials, ...(tiled ? [WALL_TILE_GRIME] : [])],
    layerElevations: preserve ? undefined : [0, -PLASTER_DEPTH, ...(tiled ? [0, 0] : [])],
    raster: rasterized ? { geometry: preserve ? "preserve" : undefined, group: rasterGroup, bounds, texelsPerMeter: density, bump: "sample",
      materialKey: finish.materialKey && receiver.weatherKey ? materialRecipeKey("native-wall-material/v1", {
        finish: finish.materialKey, base: finish.base, seed: finish.seed,
        condition: finish.condition.materialKey, weather: receiver.weatherKey,
        origin, across, up, normal, inverse: inverse.elements, phase, repeats,
        tileShare: receiver.tileShare, tileSize: receiver.tileSize, tileAspect: receiver.tileAspect,
        tileWear: receiver.tileWear ?? receiver.wear, tileGrime: receiver.tileGrime,
        ceramic, tileBed, tileRepeat, tileRoughness, bedRepeat: bedMaterial.repeat, bedRoughness: bedMaterial.roughness,
      }) : undefined } : undefined,
    geometryStep: needs.fracture ? 0.035 : 0.2,
    featureScale: needs.fracture ? 0.02 : 0.1,
    uniformCoverage: needs.fracture || receiver.tileShare > 0 ? undefined : () => true,
    sample: evaluate,
    sampleRow: rasterized ? function* (us, v) {
      if (vertical && columns !== us) {
        columns = us;
        stations = us.map(u => {
          const world = origin.map((value, axis) => value + across[axis] * u) as V3;
          return finish.along(new Vector3(...world).applyMatrix4(inverse).toArray() as V3);
        });
      }
      for (let column = 0; column < us.length; column++) yield evaluate(us[column], v, vertical ? stations[column] : undefined);
    } : undefined,
  });
}
