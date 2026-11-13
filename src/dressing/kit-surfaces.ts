import type { CompiledArchitecture, V3 } from "../architecture/types.ts";
import { registerSurfaceChart } from "./surface/plans.ts";
import type { SurfaceChart, SurfaceSample } from "./surface/types.ts";
import { materialRecipeKey } from "./surface/material.ts";

/** A thin deposit changes the receiving finish rather than adding a floating polygon. */
export interface SurfaceDeposit {
  frame: SurfaceChart["frame"];
  bounds: SurfaceChart["bounds"];
  /** Complete intrinsic sampler identity; an unkeyed deposit disables persistent caching of touched receivers. */
  materialKey?: string;
  sample(u: number, v: number): { strength: number; tint: V3; roughness?: number };
}

interface Receiver {
  chart: SurfaceChart;
  deposits: SurfaceDeposit[];
}

const dot = (a: V3, b: V3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** Places a point in the receiver's meter-based orthonormal frame. */
function pointAt(frame: SurfaceChart["frame"], u: number, v: number): V3 {
  return frame.origin.map((value, axis) => value + frame.u[axis] * u + frame.v[axis] * v) as V3;
}

/** Projects a point into another surface frame, retaining its signed plane distance. */
function coordinates(frame: SurfaceChart["frame"], point: V3): V3 {
  const offset = point.map((value, axis) => value - frame.origin[axis]) as V3;
  return [dot(offset, frame.u), dot(offset, frame.v), dot(offset, frame.normal)];
}

/** Tests finite, parallel receiver areas; fixtures cannot stain a wall behind the intended face. */
function intersects(chart: SurfaceChart, deposit: SurfaceDeposit): boolean {
  if (chart.raster?.coordinates === "uv") return false;
  if (dot(chart.frame.normal, deposit.frame.normal) < 0.99999) return false;
  const [u0, v0, u1, v1] = deposit.bounds;
  const corners = [[u0, v0], [u1, v0], [u1, v1], [u0, v1]]
    .map(([u, v]) => coordinates(chart.frame, pointAt(deposit.frame, u, v)));
  if (corners.some(point => Math.abs(point[2]) > 0.012)) return false;
  const bounds = chart.raster?.bounds ?? chart.bounds;
  return Math.max(...corners.map(point => point[0])) > bounds[0]
    && Math.min(...corners.map(point => point[0])) < bounds[2]
    && Math.max(...corners.map(point => point[1])) > bounds[1]
    && Math.min(...corners.map(point => point[1])) < bounds[3];
}

/** Composes deposits without changing layer order, source UVs or solid finish depth. */
function deposited(receiver: Receiver, original: SurfaceSample, u: number, v: number): SurfaceSample {
  if (receiver.deposits.length === 0) return original;
  const point = pointAt(receiver.chart.frame, u, v);
  let result = original;
  for (const deposit of receiver.deposits) {
    const [x, y] = coordinates(deposit.frame, point), [x0, y0, x1, y1] = deposit.bounds;
    if (x < x0 || x > x1 || y < y0 || y > y1) continue;
    const retention = original.depositRetention ?? 1;
    if (!Number.isFinite(retention) || retention < 0 || retention > 1) throw new Error("Deposit retention must be between zero and one.");
    const film = deposit.sample(x, y), strength = Math.max(0, Math.min(1, film.strength)) * retention;
    if (strength === 0) continue;
    result = {
      ...result,
      layers: result.layers.map(layer => ({
        ...layer,
        tint: (layer.tint ?? [1, 1, 1]).map((value, axis) => value * (1 + (film.tint[axis] - 1) * strength)) as V3,
      })),
      ...(film.roughness === undefined ? {} : {
        roughness: (result.roughness ?? 0.9) * (1 - strength) + film.roughness * strength,
      }),
    };
  }
  return result;
}

/** Resolves the full ordered stain stack after assembly, using the actual receiver-to-deposit sampling transform. */
function depositedMaterialKey(receiver: Receiver, base: string | undefined): string | undefined {
  if (!base || receiver.deposits.some(deposit => !deposit.materialKey)) return undefined;
  if (!receiver.deposits.length) return base;
  const frame = receiver.chart.frame;
  return materialRecipeKey("deposited-material/v1", { base, deposits: receiver.deposits.map(deposit => ({
    key: deposit.materialKey, bounds: deposit.bounds,
    offset: coordinates(deposit.frame, frame.origin),
    u: [dot(deposit.frame.u, frame.u), dot(deposit.frame.u, frame.v)],
    v: [dot(deposit.frame.v, frame.u), dot(deposit.frame.v, frame.v)],
  })) });
}

/** Keeps receiving fields available to fixtures generated later in the same kit. */
export class KitSurfaces {
  private readonly receivers: Receiver[] = [];
  private readonly groups = new Map<string, Receiver>();
  private readonly deposits: SurfaceDeposit[] = [];
  private level: CompiledArchitecture;
  constructor(level: CompiledArchitecture) {
    this.level = level;
  }

  /** Redirects future registrations after the existing live charts have moved to this level. */
  retarget(level: CompiledArchitecture): void {
    this.level = level;
  }

  /**
   * Coalesces patches only when their producer declares the same continuous
   * field. Merged receivers retain all triangles and collect deposits over their
   * combined extent, including fixtures emitted before or after registration.
   * UV-space charts keep their intrinsic finish but never receive spatial deposits.
   */
  receive(chart: SurfaceChart): void {
    const acceptsDeposits = chart.raster?.coordinates !== "uv";
    let key: string | undefined;
    if (chart.mergeGroup) {
      const centerU = (chart.bounds[0] + chart.bounds[2]) / 2, centerV = (chart.bounds[1] + chart.bounds[3]) / 2;
      key = JSON.stringify([chart.mergeGroup, chart.host, chart.frame, chart.materials,
        chart.geometryStep, chart.featureScale, chart.constructionCuts, chart.elevationRange, chart.layerElevations, !!chart.uniformCoverage,
        chart.raster?.group, chart.raster?.bounds, chart.raster?.texelsPerMeter, chart.raster?.coordinates, chart.raster?.geometry,
        chart.reusableMaterial?.recipe.key,
        Math.floor(centerU / 0.75), Math.floor(centerV / 0.75)]);
      const previous = this.groups.get(key);
      if (previous) {
        const indices = chart.triangleIndices ?? Array.from({ length: chart.triangleCount }, (_, i) => chart.firstTriangle + i);
        for (const index of indices) previous.chart.triangleIndices!.push(index);
        previous.chart.triangleCount += indices.length;
        previous.chart.bounds = [Math.min(previous.chart.bounds[0], chart.bounds[0]), Math.min(previous.chart.bounds[1], chart.bounds[1]),
          Math.max(previous.chart.bounds[2], chart.bounds[2]), Math.max(previous.chart.bounds[3], chart.bounds[3])];
        if (acceptsDeposits)
          for (const deposit of this.deposits)
            if (!previous.deposits.includes(deposit) && intersects(previous.chart, deposit)) previous.deposits.push(deposit);
        return;
      }
      chart = { ...chart, mergeGroup: undefined, bounds: [...chart.bounds],
        triangleIndices: chart.triangleIndices ? [...chart.triangleIndices] : Array.from({ length: chart.triangleCount }, (_, i) => chart.firstTriangle + i) };
    }
    if (!acceptsDeposits) {
      if (key) this.groups.set(key, { chart, deposits: [] });
      registerSurfaceChart(this.level, chart);
      return;
    }
    const sample = chart.sample, sampleRow = chart.sampleRow;
    const receiver: Receiver = { chart, deposits: this.deposits.filter(deposit => intersects(chart, deposit)) };
    const raster = chart.raster;
    if (raster && "materialKey" in raster) {
      chart.raster = Object.defineProperties({}, { ...Object.getOwnPropertyDescriptors(raster),
        materialKey: { enumerable: true, configurable: true, get: () => depositedMaterialKey(receiver, raster.materialKey) },
      }) as typeof raster;
    }
    const reusable = chart.reusableMaterial;
    if (reusable) Object.defineProperty(chart, "reusableMaterial", {
      enumerable: true, get: () => receiver.deposits.length ? undefined : reusable,
    });
    chart.sample = (u, v) => deposited(receiver, sample(u, v), u, v);
    if (sampleRow) chart.sampleRow = function* (us, v) {
      let column = 0;
      for (const value of sampleRow(us, v)) yield deposited(receiver, value, us[column++], v);
    };
    this.receivers.push(receiver);
    if (key) this.groups.set(key, receiver);
    registerSurfaceChart(this.level, chart);
  }

  /** Adds a finish modifier to existing and future coplanar receivers; it creates no geometry. */
  deposit(deposit: SurfaceDeposit): void {
    this.deposits.push(deposit);
    for (const receiver of this.receivers) {
      if (!intersects(receiver.chart, deposit)) continue;
      receiver.deposits.push(deposit);
    }
  }
}
