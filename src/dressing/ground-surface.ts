import type { V3 } from "../architecture/types.ts";
import { groundArea, groundEdgeDistance } from "./ground-field.ts";
import { latticeHash, valueNoise, valueNoiseRange, smoothStep } from "./finish/noise.ts";
import { TileField } from "./tile-field.ts";
import { tileSurface, type TileSurfaceMaterials } from "./tile-surface.ts";
import { tileCoverage } from "./finish/tile-grid.ts";
import { finishHeight } from "./surface/sample.ts";
import type { SurfaceSample } from "./surface/types.ts";
import { materialRecipeKey } from "./surface/material.ts";

type Bounds = [number, number, number, number];
interface CoveragePlane { origin: V3; x: number; y: number }
interface CoverageFootprint { bounds: Bounds; planes?: CoveragePlane[] }
/** Finish elevations above the shared uneven bed; chips remain above the deeper spalled bed. */
const PLATE_HEIGHTS: Record<string, number> = {
  asphalt: 0.0035, joint: -0.0015, crack: -0.0015, repair: -0.0015,
  spall: -0.004, chip: -0.0025,
};
export interface GroundDeposit { polygon: V3[]; material: string }
export interface GroundSurfaceRecipe {
  seed: number;
  kind: string;
  polygon: V3[];
  /** Shared asphalt footprints, including overflow, in ground-local meters. */
  asphalt?: V3[][];
  deposits: GroundDeposit[];
  tileSize: number;
  tileAspect?: number;
  tileWear?: number;
  tileGrime?: number;
  wornEdges: boolean[];
  angle: number;
  phase: number;
  material(finish: string): { id: string; repeat: number; roughness?: number };
  color(p: V3, finish: string): V3;
  relief: boolean;
  wear?: number;
  /** Actual native perimeter segments, including hole rims that can cut across a pour. */
  receivingEdges: V3[][];
}

/** Signed distance to a counterclockwise convex footprint, positive inside, in meters. */
export function groundSignedDistance(x: number, y: number, polygon: V3[]): number {
  let inside = true, distance = Infinity;
  const p: V3 = [x, y, 0];
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i], b = polygon[(i + 1) % polygon.length];
    if ((b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0]) < 0) inside = false;
    distance = Math.min(distance, groundEdgeDistance(p, a, b));
  }
  return inside ? distance : -distance;
}

/** Normalizes an owned distance footprint without changing caller vertices or edge-indexed construction intent. */
function counterclockwise(polygon: V3[]): V3[] {
  return groundArea(polygon) < 0 ? [...polygon].reverse() : [...polygon];
}

/** Bounds an XY footprint for conservative receiver/deposit rejection. */
function bounds(polygon: V3[]): Bounds {
  return [Math.min(...polygon.map(p => p[0])), Math.min(...polygon.map(p => p[1])), Math.max(...polygon.map(p => p[0])), Math.max(...polygon.map(p => p[1]))];
}
const overlaps = (a: Bounds, b: Bounds, margin: number) => a[0] <= b[2] + margin && a[2] >= b[0] - margin && a[1] <= b[3] + margin && a[3] >= b[1] - margin;

/** Prepares inward unit halfplanes only when they enclose every vertex of a nondegenerate convex footprint. */
function coverageFootprint(polygon: V3[]): CoverageFootprint {
  const result: CoverageFootprint = { bounds: bounds(polygon) };
  if (polygon.length < 3 || groundArea(polygon) <= 1e-12) return result;
  const tolerance = Number.EPSILON * Math.max(1, ...result.bounds.map(Math.abs)) * 128;
  const planes: CoveragePlane[] = [];
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i], b = polygon[(i + 1) % polygon.length];
    const dx = b[0] - a[0], dy = b[1] - a[1], length = Math.hypot(dx, dy);
    if (length === 0) continue;
    if (length <= tolerance) return result;
    const plane = { origin: a, x: -dy / length, y: dx / length };
    if (polygon.some(point => plane.x * (point[0] - a[0]) + plane.y * (point[1] - a[1]) < -tolerance)) return result;
    planes.push(plane);
  }
  if (planes.length >= 3) result.planes = planes;
  return result;
}

/** Proves an entire rectangle lies beyond a convex boundary's noise/coverage band, without enlarging it into a circle. */
function uniformFootprint(area: Bounds, footprint: CoverageFootprint, insideMargin: number, outsideMargin = insideMargin): boolean {
  if (!footprint.planes) return false;
  const x = (area[0] + area[2]) / 2, y = (area[1] + area[3]) / 2;
  const halfWidth = (area[2] - area[0]) / 2, halfHeight = (area[3] - area[1]) / 2;
  const tolerance = Number.EPSILON * Math.max(1, ...area.map(Math.abs), ...footprint.bounds.map(Math.abs)) * 128;
  let inside = true;
  for (const plane of footprint.planes) {
    const distance = plane.x * (x - plane.origin[0]) + plane.y * (y - plane.origin[1]);
    const extent = Math.abs(plane.x) * halfWidth + Math.abs(plane.y) * halfHeight;
    if (distance + extent < -outsideMargin - tolerance) return true;
    if (distance - extent <= insideMargin + tolerance) inside = false;
  }
  if (inside) return true;
  const dx = Math.max(footprint.bounds[0] - area[2], area[0] - footprint.bounds[2], 0);
  const dy = Math.max(footprint.bounds[1] - area[3], area[1] - footprint.bounds[3], 0);
  return Math.hypot(dx, dy) > outsideMargin + tolerance;
}

/** Material-specific failure fields: asphalt ravels, tiles chip as units, and deposits have porous edges. */
export class GroundSurfaceField {
  readonly materials: string[];
  readonly layerElevations?: number[];
  private recipe: GroundSurfaceRecipe;
  private finishes: string[];
  private sources: { id: string; repeat: number; roughness?: number }[];
  private deposits: (GroundDeposit & CoverageFootprint)[];
  private asphaltCoverage: CoverageFootprint[];
  private receivingEdges: V3[][];
  private receivingPolygon: V3[];
  private timberUnits = new Map<string, boolean>();
  private tiles?: TileField;
  private tileMaterials?: TileSurfaceMaterials;
  private asphaltSample?: { x: number; y: number; distance: number };
  private readonly cosine: number;
  private readonly sine: number;

  /** Snapshots geometric and material inputs beside derived coverage data; the color callback retains its explicit producer contract. */
  constructor(recipe: GroundSurfaceRecipe) {
    const points = (polygon: V3[]): V3[] => polygon.map(point => [...point] as V3);
    recipe = { ...recipe, polygon: points(recipe.polygon), asphalt: recipe.asphalt?.map(points),
      deposits: recipe.deposits.map(deposit => ({ ...deposit, polygon: points(deposit.polygon) })),
      receivingEdges: recipe.receivingEdges.map(points), wornEdges: [...recipe.wornEdges] };
    this.recipe = { ...recipe, asphalt: recipe.asphalt?.map(counterclockwise) };
    this.cosine = Math.cos(recipe.angle); this.sine = Math.sin(recipe.angle);
    const units = recipe.kind === "tile" || recipe.kind === "timber";
    this.finishes = [...new Set([recipe.kind,
      ...(recipe.asphalt?.length ? ["asphalt"] : []),
      ...(units ? ["substrate", "grout"] : []),
      ...recipe.deposits.map(item => item.material),
    ])];
    this.sources = this.finishes.map(finish => ({ ...recipe.material(finish) }));
    this.materials = this.sources.map(source => source.id);
    if (recipe.kind === "concrete" || recipe.kind === "repair")
      this.layerElevations = this.finishes.map((finish, index) => index === 0 ? 0 : PLATE_HEIGHTS[finish] ?? 0);
    this.deposits = recipe.deposits.map(item => {
      const polygon = counterclockwise(item.polygon);
      return { ...item, polygon, ...coverageFootprint(polygon) };
    });
    this.asphaltCoverage = (this.recipe.asphalt ?? []).map(coverageFootprint);
    this.receivingPolygon = counterclockwise(recipe.polygon);
    const region = bounds(recipe.polygon);
    this.receivingEdges = recipe.receivingEdges.filter(edge => overlaps(region, bounds(edge), 0.04));
    if (recipe.kind === "tile") {
      this.tiles = new TileField({ seed: recipe.seed, share: 1, size: recipe.tileSize, aspect: recipe.tileAspect ?? 1,
        wear: recipe.tileWear ?? 0.9, grime: recipe.tileGrime ?? 0 });
      const ceramic = this.sources[0], bed = this.sources[this.finishes.indexOf("substrate")];
      this.tileMaterials = { ceramic: ceramic.id, bed: bed.id, bedRepeat: bed.repeat, bedRoughness: bed.roughness ?? 0.96,
        grime: recipe.material("tile-grime").id, repeat: ceramic.repeat,
        roughness: (ceramic.roughness ?? 0.66) + (1 - (ceramic.roughness ?? 0.66)) * (recipe.tileGrime ?? 0) * 0.45 };
      this.materials.push(this.tileMaterials.grime);
    }
  }

  /** Identifies the resolved field plus the caller's complete color program, independently of receiving triangles. */
  materialKey(colorKey: string): string {
    const { material: _material, color: _color, ...parameters } = this.recipe;
    return materialRecipeKey("ground-material/v1", { ...parameters, receivingEdges: this.receivingEdges,
      sources: this.sources, tileMaterials: this.tileMaterials, colorKey });
  }

  /** Preserves the existing plank loss field independently of ceramic erosion. */
  private timberMissing(ix: number, iy: number): boolean {
    const key = `${ix}/${iy}`, prior = this.timberUnits.get(key);
    if (prior !== undefined) return prior;
    const r = this.recipe, width = 0.16, depth = 1.15;
    const center: V3 = [(ix + 0.5) * width, (iy + 0.5) * depth, 0];
    const exposure = Math.min(...r.polygon.map((a, i) => r.wornEdges[i] ? groundEdgeDistance(center, a, r.polygon[(i + 1) % r.polygon.length]) : Infinity));
    const wear = Math.max(0, 1 - exposure / 0.65);
    const loss = valueNoise(center[0] * 1.8, center[1] * 1.8, r.seed + 31) * 0.88 + latticeHash(ix, iy, r.seed + 31) * 0.12;
    const missing = loss < 0.12 + wear * 0.53;
    this.timberUnits.set(key, missing);
    return missing;
  }

  /** Keeps broad repair placement while resolving its edge into correlated aggregate-sized losses. */
  private asphaltDistance(x: number, y: number): number {
    const cached = this.asphaltSample;
    if (cached?.x === x && cached.y === y) return cached.distance;
    const { seed, asphalt } = this.recipe;
    if (!asphalt?.length) return -Infinity;
    // Domain-warp a physical edge at several scales: broad wear clusters plus aggregate-sized losses.
    const dx = (valueNoise(x * 4.2, y * 4.2, seed + 401) - 0.5) * 0.14
      + (valueNoise(x * 19, y * 19, seed + 402) - 0.5) * 0.038;
    const dy = (valueNoise(x * 4.2, y * 4.2, seed + 403) - 0.5) * 0.14
      + (valueNoise(x * 19, y * 19, seed + 404) - 0.5) * 0.038;
    const distance = Math.max(...asphalt.map(polygon => groundSignedDistance(x + dx, y + dy, polygon)))
      + (valueNoise(x * 67, y * 67, seed + 405) - 0.5) * 0.018
      + (valueNoise(x * 157, y * 157, seed + 406) - 0.5) * 0.006;
    this.asphaltSample = { x, y, distance };
    return distance;
  }

  /** Bounds the existing warp over this rectangle so distant local edges need no fine discovery. */
  private uniformAsphalt(area: Bounds): boolean {
    return this.asphaltCoverage.every(footprint => this.uniformAsphaltFootprint(area, footprint));
  }

  /** Proves one footprint locally; unions are uniform when every component is uniform. */
  private uniformAsphaltFootprint(area: Bounds, footprint: CoverageFootprint): boolean {
    if (uniformFootprint(area, footprint, 0.15)) return true;
    if (!footprint.planes) return false;
    const noise = (frequency: number, offset: number, amplitude: number): [number, number] => {
      const range = valueNoiseRange(area.map(value => value * frequency) as Bounds, this.recipe.seed + offset);
      return [(range[0] - 0.5) * amplitude, (range[1] - 0.5) * amplitude];
    };
    const coarseX = noise(4.2, 401, 0.14), fineX = noise(19, 402, 0.038);
    const coarseY = noise(4.2, 403, 0.14), fineY = noise(19, 404, 0.038);
    const warped: Bounds = [
      area[0] + coarseX[0] + fineX[0], area[1] + coarseY[0] + fineY[0],
      area[2] + coarseX[1] + fineX[1], area[3] + coarseY[1] + fineY[1],
    ];
    const grain = noise(67, 405, 0.018), chips = noise(157, 406, 0.006);
    // Fine edge noise uses the original coordinates, just as asphaltDistance does.
    const insideMargin = Math.max(0, 0.0025 - grain[0] - chips[0]);
    const outsideMargin = Math.max(0, 0.0025 + grain[1] + chips[1]);
    return uniformFootprint(warped, footprint, insideMargin, outsideMargin);
  }

  /** Narrow constructed joints and cracks need denser coverage probes than broad wear patches. */
  featureScale(area: Bounds): number {
    if (this.deposits.some(deposit => ["crack", "joint"].includes(deposit.material) && overlaps(area, deposit.bounds, 0.006))) return 0.004;
    return this.recipe.kind === "tile" || this.recipe.kind === "timber" ? 0.008 : 0.02;
  }

  /** Seeds known unit and bevel lines so the contour solver need not rediscover narrow straight grout. */
  constructionCuts(area: Bounds): { u: number[]; v: number[] } | undefined {
    if (this.tiles) return undefined;
    const units = this.recipe.kind === "timber";
    if (!units) return undefined;
    const spans = [0.16, 1.15];
    const perimeter = bounds(this.recipe.polygon);
    const rectangular = this.recipe.polygon.length === 4 && this.recipe.polygon.every(point =>
      [perimeter[0], perimeter[2]].some(value => Math.abs(value - point[0]) < 1e-9)
      && [perimeter[1], perimeter[3]].some(value => Math.abs(value - point[1]) < 1e-9));
    const lines = (axis: number): number[] => {
      const span = spans[axis], lower = area[axis], upper = area[axis + 2];
      const bevel = this.recipe.relief ? [0.006, 0.00675, 0.0075, 0.00825, 0.009] : [0.0075];
      const offsets = [0, ...bevel, ...bevel.map(value => span - value)];
      const result: number[] = [];
      for (let unit = Math.floor(lower / span); unit <= Math.floor(upper / span); unit++)
        for (const offset of offsets) {
          const position = unit * span + offset;
          if (position > lower + 1e-9 && position < upper - 1e-9) result.push(position);
        }
      if (this.recipe.relief && rectangular)
        for (const distance of [0.00625, 0.0125, 0.01875, 0.025])
          for (const position of [perimeter[axis] + distance, perimeter[axis + 2] - distance])
            if (position > lower + 1e-9 && position < upper - 1e-9) result.push(position);
      return [...new Set(result)].sort((a, b) => a - b);
    };
    return { u: lines(0), v: lines(1) };
  }

  /** Conservative distance bounds let intact interiors skip subcentimeter coverage probes. */
  uniformCoverage(area: Bounds): boolean {
    const r = this.recipe;
    if (this.tiles || !this.uniformAsphalt(area)) return false;
    if (r.kind === "timber") {
      const width = 0.16, depth = 1.15;
      const ix = Math.floor(area[0] / width), iy = Math.floor(area[1] / depth);
      if (ix !== Math.floor(area[2] / width) || iy !== Math.floor(area[3] / depth)) return false;
      const retained = !this.timberMissing(ix, iy);
      if (retained) {
        const left = area[0] - ix * width, right = (ix + 1) * width - area[2];
        const bottom = area[1] - iy * depth, top = (iy + 1) * depth - area[3];
        const midpoint = 0.0075;
        const roundoff = Number.EPSILON * Math.max(1, ...area.map(Math.abs)) * 32;
        const grout = area[2] - ix * width <= midpoint + roundoff || (ix + 1) * width - area[0] <= midpoint + roundoff
          || area[3] - iy * depth <= midpoint + roundoff || (iy + 1) * depth - area[1] <= midpoint + roundoff;
        if (!grout && Math.min(left, right, bottom, top) < midpoint - roundoff) return false;
      }
    }
    for (const deposit of this.deposits) {
      const margin = ["spall", "chip"].includes(deposit.material) ? 0.016 : 0.0035;
      if (!overlaps(area, deposit.bounds, margin)) continue;
      if (!uniformFootprint(area, deposit, margin)) return false;
    }
    return true;
  }

  /** Returns finish elevation above the native bed. A positive footprint filters the tile grid in meters; zero samples a point. */
  renderedHeight(x: number, y: number, footprint = 0): number {
    const sample = this.sample(x, y, footprint);
    const weights = sample.layers.map(layer => layer.weight);
    const selected = weights.indexOf(Math.max(...weights));
    return finishHeight(sample, selected, this.layerElevations);
  }

  /** Returns complete intrinsic PBR, including pigment after coatings and appearance-only normal relief. */
  rasterSample(x: number, y: number, footprint: number): SurfaceSample {
    const sample = this.sample(x, y, footprint);
    const weights = sample.layers.map(layer => layer.weight);
    const selected = weights.indexOf(Math.max(...weights));
    for (let index = 0; index < sample.layers.length; index++) {
      const layer = sample.layers[index];
      if (layer.weight === 0) continue;
      const tint = this.tint(x, y, index);
      if (tint.length !== 3 || tint.some(value => !Number.isFinite(value) || value < 0))
        throw new Error("Ground raster pigment must be finite nonnegative RGB.");
      layer.tint = (layer.tint ?? [1, 1, 1]).map((value, axis) => value * tint[axis]) as V3;
    }
    return { ...sample, height: 0, bump: sample.bump ?? finishHeight(sample, selected, this.layerElevations) };
  }

  /** Returns pigment for one finish at a final vertex or texel, in ground-local meters. */
  tint(x: number, y: number, layer: number): V3 {
    const r = this.recipe;
    let edgeSoil = 0;
    if (r.asphalt?.length) {
      const distance = this.asphaltDistance(x, y);
      edgeSoil = (1 - smoothStep(0.004, 0.065, Math.abs(distance)))
        * (0.08 + valueNoise(x * 17, y * 17, r.seed + 408) * 0.12);
    }
    const tileFinish = this.tiles && ["tile", "substrate", "grout"].includes(this.finishes[layer]);
    const color: V3 = tileFinish ? [1, 1, 1] : r.color([x, y, 0], this.finishes[layer]);
    return color.map(value => value * (1 - edgeSoil)) as V3;
  }

  /** Evaluates material ownership and depth without pigment. A positive square footprint in meters filters unit grids; zero preserves point sampling. */
  sample(x: number, y: number, footprint = 0): SurfaceSample {
    const r = this.recipe, seed = r.seed;
    const weights = this.finishes.map(() => 0);
    weights[0] = 1;
    let height = 0;
    const apply = (finish: string, coverage: number) => {
      if (coverage <= 0) return;
      for (let i = 0; i < weights.length; i++) weights[i] *= 1 - coverage;
      weights[this.finishes.indexOf(finish)] += coverage;
    };
    if (r.kind === "timber") {
      const width = 0.16, depth = 1.15;
      const ix = Math.floor(x / width), iy = Math.floor(y / depth);
      const dx = x - ix * width, dy = y - iy * depth;
      const edge = Math.min(dx, width - dx, dy, depth - dy);
      const intact = footprint > 0 ? tileCoverage(x, width, 0.0075, footprint) * tileCoverage(y, depth, 0.0075, footprint)
        : smoothStep(0.006, 0.009, edge);
      const retained = this.timberMissing(ix, iy) ? 0 : 1;
      apply("grout", 1 - intact);
      apply("substrate", 1 - retained);
      const body = intact * retained;
      height += 0.0035 * body - 0.001 * (1 - body);
    }
    const tileSample = this.tiles && this.tileMaterials ? tileSurface(this.tiles, x, y, footprint, this.tileMaterials) : undefined;
    if (tileSample) {
      weights.fill(0);
      weights[0] = tileSample.layers[1].weight;
      weights[this.finishes.indexOf("substrate")] = tileSample.layers[0].weight;
      // Ceramic and bedding relief belong to normals, including when authored source height displaces the receiving floor.
      height = 0;
    }
    for (const deposit of this.deposits) {
      if (!overlaps([x, y, x, y], deposit.bounds, 0.06)) continue;
      let distance = groundSignedDistance(x, y, deposit.polygon);
      const noise = valueNoise(x * 48, y * 48, seed + 430);
      const fine = valueNoise(x * 131, y * 131, seed + 431);
      const fractured = deposit.material === "spall" || deposit.material === "chip";
      distance += (noise - 0.5) * (fractured ? 0.025 : 0.0018) + (fine - 0.5) * 0.002;
      const coverage = smoothStep(-0.0015, 0.0015, distance);
      apply(deposit.material, coverage);
      if (!this.layerElevations)
        height += coverage * (deposit.material === "chip" ? 0.0015 : fractured ? -0.004 : -0.0015);
    }
    if (r.asphalt?.length) {
      const distance = this.asphaltDistance(x, y);
      const coverage = smoothStep(-0.0025, 0.0025, distance);
      apply("asphalt", coverage);
      if (!this.layerElevations) {
        const edgeGrain = Math.max(0, 1 - Math.abs(distance) / 0.025);
        height = height * (1 - coverage) + coverage * (0.0035 + edgeGrain * (valueNoise(x * 72, y * 72, seed + 407) - 0.5) * 0.0012);
      }
    }
    // Shared source normal maps own micro-aggregate; geometry owns finite finish thickness.
    // The authored perimeter remains exactly closed against slab sides and neighboring pours.
    let boundaryWeight = 0;
    if (r.relief) {
      const point: V3 = [x, y, 0];
      let nativeDistance = Infinity;
      for (const edge of this.receivingEdges) nativeDistance = Math.min(nativeDistance, groundEdgeDistance(point, edge[0], edge[1]));
      nativeDistance = Math.max(0, nativeDistance);
      const boundary = Math.max(0, Math.min(groundSignedDistance(x, y, this.receivingPolygon), nativeDistance));
      const asphaltWeight = weights[this.finishes.indexOf("asphalt")] ?? 0;
      boundaryWeight = smoothStep(0, 0.025, boundary) * (1 - asphaltWeight) + smoothStep(0, 0.025, nativeDistance) * asphaltWeight;
    }
    height *= boundaryWeight;
    const { cosine, sine } = this;
    return {
      layers: this.sources.map((source, i) => {
        const tileLayer = tileSample?.layers.find(layer => layer.material === source.id);
        return { ...tileLayer, material: source.id, weight: weights[i], role: `ground-${this.finishes[i]}`,
          uv: tileLayer?.uv ?? (this.finishes[i] === "asphalt" && r.asphalt?.length ? [x * source.repeat, y * source.repeat]
            : [(x * cosine - y * sine) * source.repeat + r.phase, (x * sine + y * cosine) * source.repeat + r.phase * 0.37]) };
      }),
      ...(tileSample ? { bump: tileSample.bump * (weights[0] + weights[this.finishes.indexOf("substrate")])
        + (weights[this.finishes.indexOf("asphalt")] ?? 0) * 0.0035 } : {}),
      height: r.relief ? height : 0,
      heightWeight: r.relief ? boundaryWeight : 0,
      ...(this.layerElevations ? { layerElevationWeight: boundaryWeight } : {}),
    };
  }
}
