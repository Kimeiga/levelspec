import { SurfaceWorkSlice } from "./work-slice.ts";
import type { CompiledArchitecture, V3 } from "../../architecture/types.ts";
import { AmlError } from "../../architecture/format.ts";
import type { Material, MeshData } from "../../vector/types.ts";
import { aborted } from "../../vector/types.ts";
import { emptyMesh } from "../../vector/mesh.ts";
import { ReceiverEdges } from "./conform.ts";
import { SurfaceJunctions } from "./junctions.ts";
import { materialVertexTint } from "./material.ts";
import { surfaceAppearanceError } from "./diagnostics.ts";
import type { SurfaceImage } from "./images.ts";
import { finishHeight, surfaceTint, SurfaceSampler } from "./sample.ts";
import type { SurfaceChart, SurfaceSample } from "./types.ts";
import { Quaternion, Vector3 } from "three";
import type { SurfaceRasterBinding } from "./raster.ts";

type UV = [number, number];
interface Sample { value: SurfaceSample; weights: number[]; winner: number }
interface Region { points: V3[]; layer: number; source: number; chart: SurfaceChart }
interface Work { samples: number; nodes: number; maximumSamples: number; signal?: AbortSignal }
interface Corner { point: V3; weights: number[] }
interface AttributeTriangle { points: V3[]; layer: number; values: SurfaceSample[]; heights: number[] }

const BOUNDARY_ERROR = 0.0015;
const MINIMUM_EDGE = 0.003;
const MINIMUM_SAMPLES = 20_000_000;
const MAXIMUM_SAMPLES = 128_000_000;
const SAMPLES_PER_TRIANGLE = 64;
const MAXIMUM_CACHED_SAMPLES = 65_536;
const MAXIMUM_SUBDIVISIONS = 20_000_000;
const dot = (a: V3, b: V3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const middle = (a: V3, b: V3): V3 => a.map((value, axis) => (value + b[axis]) / 2) as V3;
const center = (points: V3[]): V3 => points[0].map((_, axis) => points.reduce((sum, p) => sum + p[axis], 0) / points.length) as V3;

/** Measured finish discovery needs 28–50 samples per triangle; allow bounded work at the existing render scale. */
function sampleAllowance(maximumTriangles: number): number {
  if (!Number.isFinite(maximumTriangles) || maximumTriangles <= 0) return MINIMUM_SAMPLES;
  return Math.min(MAXIMUM_SAMPLES, Math.max(MINIMUM_SAMPLES, maximumTriangles * SAMPLES_PER_TRIANGLE));
}

/** Rejects zero-area clipping remnants without discarding visible millimeter fragments. */
function nondegenerate(points: V3[]): boolean {
  const a = points[1].map((value, axis) => value - points[0][axis]);
  const b = points[2].map((value, axis) => value - points[0][axis]);
  return Math.hypot(a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]) > 1e-13;
}

/** Samples one receiver in its original frame; cache lifetime is limited to that receiver's work. */
class Field {
  readonly chart: SurfaceChart;
  private readonly work: Work;
  private readonly heightSampler?: SurfaceSampler;
  private readonly samples = new Map<string, Sample>();
  private order?: string[];

  constructor(chart: SurfaceChart, work: Work, heightSampler?: SurfaceSampler) {
    this.chart = chart; this.work = work; this.heightSampler = heightSampler;
  }

  /** Projects a world-space receiving point into the recipe's meter coordinates. */
  coordinates(point: V3): UV {
    const delta = point.map((value, axis) => value - this.chart.frame.origin[axis]) as V3;
    return [dot(delta, this.chart.frame.u), dot(delta, this.chart.frame.v)];
  }

  /** Resolves the declared field without sampling or rescaling any source texture. */
  at(point: V3): Sample { return this.local(...this.coordinates(point)); }

  /** Bounds total render elevation while preserving the original receiver as the displacement datum. */
  clampHeight(point: V3, additionalHeight: number): number {
    const range = this.chart.elevationRange;
    if (!range) return additionalHeight;
    const delta = point.map((value, axis) => value - this.chart.frame.origin[axis]) as V3;
    const elevation = dot(delta, this.chart.frame.normal);
    return Math.max(range[0], Math.min(range[1], elevation + additionalHeight)) - elevation;
  }

  /** Includes source height when an envelope can move a clipping transition within the receiver. */
  interpolationHeight(point: V3, layer: number): number {
    const sample = this.at(point).value;
    const selectedLayer = this.chart.layerElevations ? layer : undefined;
    const sourceHeight = this.heightSampler
      ? this.heightSampler.height(sample, selectedLayer, this.chart.layerElevations)
      : finishHeight(sample, selectedLayer, this.chart.layerElevations);
    return this.clampHeight(point, sourceHeight);
  }

  /** Lets the outer asynchronous compiler observe cancellation during a single large receiver. */
  checkpoint(): boolean {
    if (++this.work.nodes > MAXIMUM_SUBDIVISIONS) throw new Error("Surface appearance subdivision budget exceeded.");
    return this.work.nodes % 1024 === 0;
  }

  /** Validates source identities, finite values and layer order at each newly visited field point. */
  local(u: number, v: number): Sample {
    const key = `${u}/${v}`;
    const prior = this.samples.get(key);
    if (prior) return prior;
    if (++this.work.samples > this.work.maximumSamples) throw new Error("Surface appearance sampling budget exceeded.");
    if (this.work.samples % 1024 === 0) aborted(this.work.signal);
    let value = this.chart.sample(u, v);
    if (!this.chart.raster && value.layers.some(layer => layer.coatings?.length))
      throw new Error(`Surface coatings require raster appearance at ${this.chart.id}.`);
    const total = value.layers.reduce((sum, layer) => sum + layer.weight, 0);
    this.order ??= value.layers.map(layer => layer.material);
    if (this.chart.layerElevations && (this.chart.layerElevations.length !== value.layers.length
      || !this.chart.layerElevations.every(Number.isFinite)))
      throw new Error(`Layer elevations must match sampled layer order for surface ${this.chart.id}.`);
    if (!(total > 0) || !Number.isFinite(total) || value.layers.length !== this.order.length || !Number.isFinite(value.height)
      || (value.roughness !== undefined && !Number.isFinite(value.roughness))) throw new Error(`Invalid surface field ${this.chart.id}.`);
    if (value.layerElevationWeight !== undefined && (!Number.isFinite(value.layerElevationWeight)
      || value.layerElevationWeight < 0 || value.layerElevationWeight > 1))
      throw new Error(`Surface ${this.chart.id} layer elevation weight must be finite and between zero and one.`);
    for (const [index, layer] of value.layers.entries()) {
      if (layer.material !== this.order[index] || !this.chart.materials.includes(layer.material)
        || layer.weight < 0 || ![layer.weight, ...layer.uv, ...(layer.tint ?? [])].every(Number.isFinite))
        throw new Error(`Invalid material layer in surface field ${this.chart.id}.`);
    }
    if (this.chart.raster) value = { ...value, roughness: undefined,
      layers: value.layers.map(layer => ({ ...layer, tint: [1, 1, 1] })) };
    const weights = value.layers.map(layer => layer.weight / total);
    const winner = weights.indexOf(Math.max(...weights));
    const sample = { value, weights, winner };
    if (this.samples.size >= MAXIMUM_CACHED_SAMPLES) this.samples.clear();
    this.samples.set(key, sample);
    return sample;
  }
}

/** Validates and bounds construction hints before they can allocate receiving cells. */
function constructionCuts(chart: SurfaceChart): [number[], number[]] {
  const cuts = [chart.constructionCuts?.u ?? [], chart.constructionCuts?.v ?? []];
  if (cuts.some(axis => axis.some(value => !Number.isFinite(value))))
    throw new Error(`Surface ${chart.id} has a non-finite construction cut.`);
  const bounded = cuts.map((axis, index) => [...new Set(axis.filter(value => value > chart.bounds[index]
    && value < chart.bounds[index + 2]))].sort((a, b) => a - b)) as [number[], number[]];
  if (bounded[0].length + bounded[1].length > 4096) throw new Error(`Surface ${chart.id} exceeds the construction cut budget.`);
  return bounded;
}

/** Partitions a source-plane polygon once, sharing canonical intersections on its directed edges. */
function splitConstruction(polygon: V3[], field: Field, axis: number, cut: number): [V3[], V3[]] {
  const halves: [V3[], V3[]] = [[], []];
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i], b = polygon[(i + 1) % polygon.length];
    const da = field.coordinates(a)[axis] - cut, db = field.coordinates(b)[axis] - cut;
    if (da <= 0) halves[0].push(a);
    if (da >= 0) halves[1].push(a);
    if ((da < 0 && db > 0) || (da > 0 && db < 0)) {
      const firstAxis = a.findIndex((value, coordinate) => value !== b[coordinate]);
      const start = firstAxis >= 0 && a[firstAxis] > b[firstAxis] ? b : a;
      const end = start === a ? b : a;
      const low = field.coordinates(start)[axis], high = field.coordinates(end)[axis];
      const t = (cut - low) / (high - low);
      const point = start.map((value, coordinate) => value + (end[coordinate] - value) * t) as V3;
      halves[0].push(point); halves[1].push(point);
    }
  }
  return halves;
}

/** Seeds true construction edges with logarithmic recursion, then resolves the unchanged material field. */
function* constructionRegions(polygon: V3[], field: Field, cuts: [number[], number[]], maximumTriangles: number): Generator<void, { points: V3[]; layer: number }[]> {
  if (field.checkpoint()) yield;
  const local = polygon.map(point => field.coordinates(point));
  const intersecting = cuts.map((axis, index) => axis.filter(value => value > Math.min(...local.map(point => point[index]))
    && value < Math.max(...local.map(point => point[index])))) as [number[], number[]];
  const axis = intersecting[0].length ? 0 : 1, selected = intersecting[axis];
  if (selected.length) {
    const middle = Math.floor(selected.length / 2), cut = selected[middle];
    const halves = splitConstruction(polygon, field, axis, cut);
    const lower: [number[], number[]] = [...intersecting], upper: [number[], number[]] = [...intersecting];
    lower[axis] = selected.slice(0, middle); upper[axis] = selected.slice(middle + 1);
    const left = yield* constructionRegions(halves[0], field, lower, maximumTriangles);
    const right = yield* constructionRegions(halves[1], field, upper, maximumTriangles);
    if (left.length + right.length > maximumTriangles) throw new Error("Surface appearance triangle budget exceeded.");
    return [...left, ...right];
  }
  const result: { points: V3[]; layer: number }[] = [];
  for (let i = 1; i + 1 < polygon.length; i++) {
    const face = [polygon[0], polygon[i], polygon[i + 1]];
    if (!nondegenerate(face)) continue;
    for (const cell of yield* regions(face, field, maximumTriangles)) result.push(cell);
    if (result.length > maximumTriangles) throw new Error("Surface appearance triangle budget exceeded.");
  }
  return result;
}

/** Interpolates a point's source-triangle coordinates without depending on its later displacement. */
function barycentric(point: V3, face: V3[]): V3 {
  const a = face[1].map((value, axis) => value - face[0][axis]) as V3;
  const b = face[2].map((value, axis) => value - face[0][axis]) as V3;
  const p = point.map((value, axis) => value - face[0][axis]) as V3;
  const normal = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dropped = normal.map(Math.abs).indexOf(Math.max(...normal.map(Math.abs)));
  const x = (dropped + 1) % 3, y = (dropped + 2) % 3;
  const determinant = a[x] * b[y] - a[y] * b[x];
  if (Math.abs(determinant) < 1e-24) return [1, 0, 0];
  const u = (p[x] * b[y] - p[y] * b[x]) / determinant, v = (a[x] * p[y] - a[y] * p[x]) / determinant;
  return [1 - u - v, u, v];
}

/** Clips one linear coverage cell; all cells share exactly the same intersections and cover one receiver once. */
function partition(face: V3[], field: Field): { points: V3[]; layer: number }[] {
  const corners = face.map(point => ({ point, weights: field.at(point).weights }));
  const active = new Set([...face, ...face.map((point, i) => middle(point, face[(i + 1) % 3])), center(face)]
    .flatMap(point => field.at(point).weights.flatMap((weight, index) => weight > 0 ? [index] : [])));
  if (active.size === 2) return pairPartition(face, [...active] as [number, number], field);
  const output: { points: V3[]; layer: number }[] = [];
  for (let layer = 0; layer < corners[0].weights.length; layer++) {
    if (corners.every(corner => corner.weights[layer] === 0)) continue;
    let polygon = corners;
    for (let other = 0; other < corners[0].weights.length && polygon.length; other++) {
      if (other === layer) continue;
      if (corners.every(corner => corner.weights[layer] === corner.weights[other])) {
        if (other < layer) polygon = [];
        continue;
      }
      const clipped: Corner[] = [];
      for (let i = 0; i < polygon.length; i++) {
        const a = polygon[i], b = polygon[(i + 1) % polygon.length];
        const da = a.weights[layer] - a.weights[other], db = b.weights[layer] - b.weights[other];
        if (da >= 0) clipped.push(a);
        if ((da >= 0) !== (db >= 0)) {
          const t = da / (da - db);
          clipped.push({ point: a.point.map((value, axis) => value + (b.point[axis] - value) * t) as V3,
            weights: a.weights.map((value, index) => value + (b.weights[index] - value) * t) });
        }
      }
      polygon = clipped;
    }
    if (polygon.length >= 3) output.push({ points: polygon.map(corner => corner.point), layer });
  }
  return output;
}

/** Solves a two-material crossing in a canonical edge direction, independent of triangulation and saturated weights. */
function crossing(a: V3, b: V3, layers: [number, number], field: Field, threshold = 0): V3 {
  const axis = a.findIndex((value, index) => value !== b[index]);
  const start = axis >= 0 && a[axis] > b[axis] ? b : a;
  const end = start === a ? b : a;
  const difference = (point: V3) => { const weights = field.at(point).weights; return weights[layers[0]] - weights[layers[1]] - threshold; };
  let low = start, high = end, sign = difference(low) >= 0;
  for (let iteration = 0; iteration < 18; iteration++) {
    const point = middle(low, high), value = difference(point);
    if (Math.abs(value) < 1e-12) return point;
    if ((value >= 0) === sign) low = point; else high = point;
    if (Math.hypot(...low.map((component, index) => component - high[index])) < 0.000025) break;
  }
  return middle(low, high);
}

/** Splits a triangle into two disjoint cells using the same actual-field crossing on both sides. */
function pairPartition(face: V3[], layers: [number, number], field: Field, threshold = 0): { points: V3[]; layer: number }[] {
  if (face.every(point => { const weights = field.at(point).weights; return weights[layers[0]] - weights[layers[1]] === threshold; }))
    return [{ points: face, layer: Math.min(...layers) }];
  const polygons: V3[][] = [[], []];
  for (let i = 0; i < face.length; i++) {
    const a = face[i], b = face[(i + 1) % face.length];
    const wa = field.at(a).weights, wb = field.at(b).weights;
    const da = wa[layers[0]] - wa[layers[1]] - threshold, db = wb[layers[0]] - wb[layers[1]] - threshold;
    if (da >= 0) polygons[0].push(a);
    if (da <= 0) polygons[1].push(a);
    if ((da > 0 && db < 0) || (da < 0 && db > 0)) {
      const point = crossing(a, b, layers, field, threshold);
      polygons[0].push(point); polygons[1].push(point);
    }
  }
  return polygons.flatMap((points, index) => points.length >= 3 ? [{ points, layer: layers[index] }] : []);
}

/** Adds shared in-material cuts across finite relief rims without quantizing their sampled elevation. */
function reliefRegions(cells: { points: V3[]; layer: number }[], probes: Sample[], field: Field): { points: V3[]; layer: number }[] {
  const heights = probes.map(probe => probe.value.height);
  if (Math.max(...heights) - Math.min(...heights) <= 0.00035) return cells;
  const active = new Set(probes.flatMap(probe => probe.weights.flatMap((weight, index) => weight > 0 ? [index] : [])));
  if (active.size !== 2) return cells;
  const layers = [...active] as [number, number];
  let output = cells;
  for (const threshold of [-0.95, -0.5, 0.5, 0.95]) {
    output = output.flatMap(cell => pairPartition(cell.points, layers, field, threshold)
      .map(part => ({ points: part.points, layer: cell.layer })));
  }
  return output;
}

/** Tests a convex projected region with a physical contour tolerance rather than a fixed tiny edge length. */
function insideRegion(point: V3, polygon: V3[], field: Field, tolerance: number): boolean {
  const p = field.coordinates(point), vertices = polygon.map(vertex => field.coordinates(vertex));
  let positive = false, negative = false;
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i], b = vertices[(i + 1) % vertices.length];
    const dx = b[0] - a[0], dy = b[1] - a[1], length = Math.hypot(dx, dy);
    if (length < 1e-12) continue;
    const side = (dx * (p[1] - a[1]) - dy * (p[0] - a[0])) / length;
    if (side > tolerance) positive = true;
    if (side < -tolerance) negative = true;
  }
  return !(positive && negative);
}

/** Checks proposed internal contours against the actual field, preventing error accumulation during coalescing. */
function accurateContours(face: V3[], cells: { points: V3[]; layer: number }[], field: Field): boolean {
  for (const cell of cells) for (let edge = 0; edge < cell.points.length; edge++) {
    const a = cell.points[edge], b = cell.points[(edge + 1) % cell.points.length];
    const wa = barycentric(a, face), wb = barycentric(b, face);
    if (wa.some((weight, axis) => Math.abs(weight) < 1e-8 && Math.abs(wb[axis]) < 1e-8)) continue;
    const pa = field.coordinates(a), pb = field.coordinates(b);
    const dx = pb[0] - pa[0], dy = pb[1] - pa[1], length = Math.hypot(dx, dy);
    if (length < 1e-9) continue;
    const count = Math.max(1, Math.ceil(length / Math.min(0.005, (field.chart.featureScale ?? 0.02) / 2)));
    for (let i = 0; i < count; i++) {
      const t = (i + 0.5) / count, u = pa[0] + dx * t, v = pa[1] + dy * t;
      const first = field.local(u - dy / length * BOUNDARY_ERROR, v + dx / length * BOUNDARY_ERROR).winner;
      const second = field.local(u + dy / length * BOUNDARY_ERROR, v - dx / length * BOUNDARY_ERROR).winner;
      if ((first === cell.layer) === (second === cell.layer)) return false;
    }
  }
  return true;
}

/** Checks the actual height and selected finish tint against one proposed triangle's interpolation. */
function interpolatesAttributes(triangle: AttributeTriangle, point: V3, weights: V3, field: Field): boolean {
  const actual = field.at(point).value;
  const height = weights.reduce((sum, weight, index) => sum + weight * triangle.heights[index], 0);
  if (Math.abs(field.interpolationHeight(point, triangle.layer) - height) > 0.00035) return false;
  for (let axis = 0; axis < 3; axis++) {
    const tint = weights.reduce((sum, weight, index) => sum + weight * (triangle.values[index].layers[triangle.layer].tint?.[axis] ?? 1), 0);
    if (Math.abs((actual.layers[triangle.layer].tint?.[axis] ?? 1) - tint) > 0.015) return false;
  }
  return true;
}

/** Retains height and tint variation while allowing broad flat interiors to reuse their original triangles. */
function closeAttributes(candidates: { points: V3[]; layer: number }[], children: { points: V3[]; layer: number }[], field: Field): boolean {
  const triangles = candidates.flatMap(candidate => candidate.points.slice(2).map((point, index) => {
    const points = [candidate.points[0], candidate.points[index + 1], point];
    return { layer: candidate.layer, points, values: points.map(vertex => field.at(vertex).value),
      heights: points.map(vertex => field.interpolationHeight(vertex, candidate.layer)) };
  })).filter(triangle => nondegenerate(triangle.points));
  for (const triangle of triangles) {
    const probes = [...triangle.points.map((point, index) => middle(point, triangle.points[(index + 1) % 3])), center(triangle.points)];
    for (const point of probes)
      if (!interpolatesAttributes(triangle, point, barycentric(point, triangle.points), field)) return false;
  }
  for (const child of children) {
    for (const point of child.points) {
      // New boundary vertices belong to the candidate mesh and must participate in its interpolation.
      const sample = field.at(point);
      const matches = triangles.filter(triangle => (triangle.layer === child.layer
        || Math.abs(sample.weights[triangle.layer] - sample.weights[child.layer]) < 1e-9)
        && insideRegion(point, triangle.points, field, BOUNDARY_ERROR))
        .map(triangle => ({ triangle, weights: barycentric(point, triangle.points) }));
      if (!matches.length) return false;
      const { triangle, weights } = matches.reduce((best, value) => Math.min(...value.weights) > Math.min(...best.weights) ? value : best);
      if (!interpolatesAttributes(triangle, point, weights, field)) return false;
    }
  }
  return true;
}

/** Counts convex cell fan triangles before shared-edge conformance. */
function regionTriangleCount(cells: { points: V3[] }[]): number {
  return cells.reduce((sum, cell) => sum + cell.points.length - 2, 0);
}

/** Probes the declared feature scale, then coalesces uniform/straight regions without losing curved material edges. */
function* regions(face: V3[], field: Field, maximumTriangles: number): Generator<void, { points: V3[]; layer: number }[]> {
  if (field.checkpoint()) yield;
  const lengths = face.map((point, i) => Math.hypot(...point.map((value, axis) => value - face[(i + 1) % 3][axis])));
  const longest = Math.max(...lengths), edge = lengths.indexOf(longest);
  const probes = [...face, ...face.map((point, i) => middle(point, face[(i + 1) % 3])), center(face)];
  const values = probes.map(point => field.at(point));
  const featureScale = field.chart.featureScale ?? 0.02;
  const locals = probes.map(point => field.coordinates(point));
  const uniform = values[0].value.layers.length === 1 || field.chart.uniformCoverage?.([
    Math.min(...locals.map(point => point[0])), Math.min(...locals.map(point => point[1])),
    Math.max(...locals.map(point => point[0])), Math.max(...locals.map(point => point[1])),
  ]);
  // A closed construction cell can touch a tied material boundary without changing its interior owner.
  const uniformLayer = uniform ? values[0].weights.findIndex((_, layer) => values.every(value =>
    value.weights[layer] >= value.weights[value.winner] - 1e-9)) : undefined;
  if (uniformLayer === -1) throw new Error(`Surface ${field.chart.id} contradicts its uniform-coverage proof.`);
  const winners = new Set(uniformLayer === undefined ? values.map(value => value.winner) : [uniformLayer]);
  const materialCells = winners.size === 1 ? [{ points: face, layer: [...winners][0] }] : partition(face, field);
  const probeCells = probes.map((point, index) => ({ points: [point], layer: uniformLayer ?? values[index].winner }));
  let attributesResolved: boolean | undefined;
  const attributesFit = () => attributesResolved ??= closeAttributes(materialCells, probeCells, field);
  const varying = values.some(value => Math.abs(value.value.height - values[0].value.height) > 0.00035
    || Math.abs((value.value.roughness ?? 0) - (values[0].value.roughness ?? 0)) > 1 / 30)
    || [...winners].some(layer => {
      const visible = uniform ? values : values.filter(value => value.winner === layer);
      return visible.some(value => (value.value.layers[layer].tint ?? [1, 1, 1])
        .some((channel, axis) => Math.abs(channel - (visible[0].value.layers[layer].tint?.[axis] ?? 1)) > 0.01));
    });
  const detailStep = Math.min(0.1, field.chart.geometryStep ?? 0.1);
  if (longest <= BOUNDARY_ERROR && !attributesFit()) {
    const represented = new Set(materialCells.filter(cell => cell.points.slice(2)
      .some((point, index) => nondegenerate([cell.points[0], cell.points[index + 1], point])))
      .map(cell => cell.layer));
    if (values.some(value => !represented.has(value.winner))) {
      // A sliver rejected by the area threshold may change ownership only within the existing contour tolerance.
      const layer = field.at(center(face)).winner, whole = [{ points: face, layer }];
      if (closeAttributes(whole, probes.map(point => ({ points: [point], layer })), field)) return whole;
    }
  }
  if (uniform && (!varying || longest <= detailStep)
    && attributesFit()) return materialCells;
  // Large cells must subdivide regardless of attribute accuracy; validate only acceptance candidates.
  const withinDiscoveryScale = longest <= MINIMUM_EDGE
    || (!uniform && longest <= Math.min(featureScale, varying ? detailStep : featureScale));
  if (withinDiscoveryScale && attributesFit()) {
    if (longest <= MINIMUM_EDGE || winners.size === 1) return materialCells;
    const resolved = probes.every((point, index) => {
      const cell = materialCells.find(item => item.layer === values[index].winner);
      return cell && insideRegion(point, cell.points, field, BOUNDARY_ERROR);
    });
    if (resolved && accurateContours(face, materialCells, field)) return materialCells;
  }
  if (longest < 0.00001) throw new Error(`Surface ${field.chart.id} cannot meet height or tint interpolation tolerance near ${field.coordinates(center(face)).map(value => value.toFixed(6)).join(", ")}.`);
  const a = face[edge], b = face[(edge + 1) % 3], c = face[(edge + 2) % 3], midpoint = middle(a, b);
  const left = yield* regions([a, midpoint, c], field, maximumTriangles);
  const right = yield* regions([midpoint, b, c], field, maximumTriangles);
  const children = [...left, ...right];
  if (children.length > maximumTriangles) throw new Error("Surface appearance triangle budget exceeded.");
  const childCount = regionTriangleCount(children);
  if (regionTriangleCount(materialCells) < childCount && closeAttributes(materialCells, children, field)
    && accurateContours(face, materialCells, field)) return materialCells;
  const banded = reliefRegions(materialCells, values, field);
  if (banded !== materialCells && regionTriangleCount(banded) < childCount
    && closeAttributes(banded, children, field) && accurateContours(face, materialCells, field)) return banded;
  return children;
}

/** Creates bounded roughness variants while preserving source color, UV, normal and packed-property contracts. */
function regionMaterial(level: CompiledArchitecture, source: Material, roughness: number | undefined, variants: Map<string, string>): string {
  if (roughness === undefined || Math.abs(roughness - source.roughness) < 1 / 30) return source.id;
  const bucket = Math.round(Math.max(0, Math.min(1, roughness)) * 15), key = `${source.id}/${bucket}`;
  const prior = variants.get(key);
  if (prior) return prior;
  const id = `$surface/roughness/${source.id}/${bucket}`;
  level.document.materials.push({ ...source, id, roughness: bucket / 15 });
  variants.set(key, id);
  return id;
}

/** Keeps coverage-driven height changes in geometry normals while source UV height slopes remain in its normal map. */
function coverageHeight(sampler: SurfaceSampler, center: SurfaceSample, offset: SurfaceSample, selectedLayer?: number, elevations?: number[]): number {
  return sampler.height({ ...offset, layers: offset.layers.map((layer, index) => ({ ...layer, uv: center.layers[index].uv })) }, selectedLayer, elevations);
}

/** Returns the orientation of an emitted triangle, independent of its authored shading normals. */
function faceNormal(face: V3[]): Vector3 {
  const a = face[1].map((value, axis) => value - face[0][axis]);
  const b = face[2].map((value, axis) => value - face[0][axis]);
  return new Vector3(a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]).normalize();
}

/** Rotates source smoothing by actual recipe relief; source UV height slopes remain in the normal texture. */
function reliefRotation(face: V3[], samples: SurfaceSample[], center: SurfaceSample, field: Field, sampler: SurfaceSampler, authoredHeight: boolean, layer: number): Quaternion | undefined {
  const selectedLayer = field.chart.layerElevations ? layer : undefined;
  const heights = samples.map((sample, index) => field.clampHeight(face[index],
    authoredHeight ? coverageHeight(sampler, center, sample, selectedLayer, field.chart.layerElevations)
      : finishHeight(sample, selectedLayer, field.chart.layerElevations)));
  if (heights.every(height => height === heights[0])) return undefined;
  const direction = field.chart.frame.normal;
  const raised = face.map((point, index) => point.map((value, axis) => value + direction[axis] * heights[index]) as V3);
  return new Quaternion().setFromUnitVectors(faceNormal(face), faceNormal(raised));
}

/**
 * Replaces receiving triangles with disjoint source-material regions. Source images
 * and UVs remain intact; only recipe relief, normals and vertex tint change. The
 * caller owns the detached level and commits its material/surface additions atomically.
 */
export async function buildSurfaceRegions(level: CompiledArchitecture, charts: SurfaceChart[], materials: Map<string, Material>, images: Map<string, SurfaceImage>, maximumTriangles: number, signal?: AbortSignal, onProgress?: (stage: string) => void, rasters = new Map<string, SurfaceRasterBinding>(), slice = new SurfaceWorkSlice(signal)): Promise<MeshData> {
  const input = level.mesh, output = emptyMesh();
  const work: Work = { samples: 0, nodes: 0, maximumSamples: sampleAllowance(maximumTriangles), signal };
  output.colors = []; output.solidIds = [];
  const sampler = new SurfaceSampler(materials, images), records: Region[] = [], targeted = new Set<number>();
  const uvReceivers = new Map<number, SurfaceChart>();
  let current = charts[0];
  try {
  for (const [chartIndex, chart] of charts.entries()) {
    current = chart;
    if (chartIndex % Math.max(1, Math.ceil(charts.length / 10)) === 0)
      onProgress?.(`Surface appearance: receiver ${chartIndex + 1}/${charts.length}`);
    if (chart.raster?.coordinates === "uv" || chart.raster?.geometry === "preserve") {
      if (chartIndex % 128 === 0) { const pending = slice.checkpoint(); if (pending) await pending; }
      for (const triangle of chart.triangleIndices ?? Array.from({ length: chart.triangleCount }, (_, i) => chart.firstTriangle + i))
        uvReceivers.set(triangle, chart);
      continue;
    }
    await new Promise<void>(resolve => setTimeout(resolve, 0));
    aborted(signal);
    if (!Number.isFinite(chart.featureScale ?? 0.02) || (chart.featureScale ?? 0.02) < 0.001)
      throw new Error(`Invalid feature scale for surface ${chart.id}.`);
    const heightSampler = chart.elevationRange && chart.materials.some(id => materials.get(id)?.heightTexture) ? sampler : undefined;
    const field = new Field(chart, work, heightSampler);
    const cuts = constructionCuts(chart);
    for (const source of chart.triangleIndices ?? Array.from({ length: chart.triangleCount }, (_, i) => chart.firstTriangle + i)) {
      targeted.add(source);
      const face = input.indices.slice(source * 3, source * 3 + 3).map(index => input.positions.slice(index * 3, index * 3 + 3) as V3);
      if (!nondegenerate(face)) continue;
      const generator = cuts.some(axis => axis.length) ? constructionRegions(face, field, cuts, maximumTriangles)
        : regions(face, field, maximumTriangles);
      let progress = generator.next();
      while (!progress.done) {
        await new Promise<void>(resolve => setTimeout(resolve, 0));
        aborted(signal);
        progress = generator.next();
      }
      for (const region of progress.value) for (let i = 1; i + 1 < region.points.length; i++) {
        const points = [region.points[0], region.points[i], region.points[i + 1]];
        if (!nondegenerate(points)) continue;
        records.push({ ...region, points, source, chart });
        if (records.length + input.surfaces.length - targeted.size > maximumTriangles) throw new Error("Surface appearance triangle budget exceeded.");
      }
    }
  }
  // Conform before displacement: points on a shared source edge must sample the same nonlinear height.
  onProgress?.("Surface appearance: joining receiver edges");
  const edgePositions = records.length ? input.positions.slice() : [];
  for (const record of records) for (const point of record.points) edgePositions.push(...point);
  const edges = records.length ? new ReceiverEdges({ ...emptyMesh(), positions: edgePositions }) : undefined;
  const junctions = records.length ? new SurfaceJunctions(input, maximumTriangles, signal) : undefined;
  const junctionOwner = (source: number): string => input.solidIds?.[source]
    ? `solid:${input.solidIds[source]}` : `object:${level.surfaces[input.surfaces[source]].object}`;
  const junctionOwners = new Set([...targeted].map(junctionOwner));
  const variants = new Map<string, string>(), surfaces = new Map<string, number>();
  const vertices = new Map<string, number>();
  let field: Field | undefined;
  for (const [recordIndex, record] of records.entries()) {
    current = record.chart;
    if (recordIndex % 1024 === 0) { await new Promise<void>(resolve => setTimeout(resolve, 0)); aborted(signal); }
    if (field?.chart !== record.chart) { field = new Field(record.chart, work); vertices.clear(); }
    const sourceIndices = input.indices.slice(record.source * 3, record.source * 3 + 3);
    const sourcePoints = sourceIndices.map(index => input.positions.slice(index * 3, index * 3 + 3) as V3);
    const authoredHeight = record.chart.materials.some(id => materials.get(id)?.heightTexture);
    for (const face of edges!.triangles(record.points)) {
      if (!nondegenerate(face)) continue;
      if (output.surfaces.length >= maximumTriangles) throw new Error("Surface appearance triangle budget exceeded.");
      const centroid = field.at(center(face)).value;
      const samples = face.map(point => field!.at(point).value);
      const rotation = reliefRotation(face, samples, centroid, field, sampler, authoredHeight, record.layer);
      const material = materials.get(centroid.layers[record.layer].material)!;
      const raster = rasters.get(record.chart.id);
      const materialId = raster?.materials[record.layer] ?? regionMaterial(level, material, centroid.roughness, variants);
      const role = centroid.layers[record.layer].role;
      const sourceSurface = input.surfaces[record.source], key = `${sourceSurface}/${materialId}/${role ?? ""}`;
      let surface = surfaces.get(key);
      if (surface === undefined) {
        const original = level.surfaces[sourceSurface];
        surface = level.surfaces.length;
        level.surfaces.push({ ...original, id: `${original.id}:region:${materialId}:${role ?? ""}`, material: materialId, role: role ?? original.role });
        surfaces.set(key, surface);
      }
      for (const [corner, point] of face.entries()) {
        const weights = barycentric(point, sourcePoints);
        const incoming = [0, 1, 2].map(axis => weights.reduce((sum, weight, index) => sum + weight * input.normals[sourceIndices[index] * 3 + axis], 0)) as V3;
        const shadingNormal = new Vector3(...incoming).normalize();
        const normal = (rotation ? shadingNormal.applyQuaternion(rotation) : shadingNormal).toArray() as V3;
        const identity = `${record.layer}/${point.join(",")}/${normal.join(",")}`;
        const existing = vertices.get(identity);
        if (existing !== undefined) { output.indices.push(existing); continue; }
        const index = output.positions.length / 3;
        vertices.set(identity, index);
        const sample = samples[corner], layer = sample.layers[record.layer];
        const height = field.clampHeight(point, sampler.height(sample,
          record.chart.layerElevations ? record.layer : undefined, record.chart.layerElevations));
        output.positions.push(...point.map((value, axis) => value + record.chart.frame.normal[axis] * height));
        output.normals.push(...normal);
        output.uv.push(...(raster ? raster.layout.uv(...field.coordinates(point)) : layer.uv));
        output.colors.push(...(raster ? [1, 1, 1]
          : surfaceTint(record.chart, ...field.coordinates(point), record.layer, layer)));
        output.indices.push(index);
      }
      output.surfaces.push(surface); output.solidIds.push(input.solidIds?.[record.source] ?? "");
      const faceIndices = output.indices.slice(-3);
      junctions!.add({ base: face,
        positions: faceIndices.map(index => output.positions.slice(index * 3, index * 3 + 3) as V3),
        uv: faceIndices.map(index => output.uv.slice(index * 2, index * 2 + 2) as UV),
        colors: faceIndices.map(index => output.colors!.slice(index * 3, index * 3 + 3) as V3),
        surface, solidId: input.solidIds?.[record.source] ?? "", host: level.surfaces[sourceSurface].object, chart: record.chart });
    }
  }
  onProgress?.("Surface appearance: binding preserved geometry");
  const retainedVertices = new Map<number, number>();
  const uvVertices = new Map<SurfaceChart, Map<number, number>>();
  const uvSurfaces = new Map<string, Map<number, number>>();
  for (let source = 0; source < input.surfaces.length; source++) {
    if (targeted.has(source)) continue;
    if (source % 256 === 0) { const pending = slice.checkpoint(); if (pending) await pending; }
    if (output.surfaces.length >= maximumTriangles) throw new Error("Surface appearance triangle budget exceeded.");
    const sourceIndices = input.indices.slice(source * 3, source * 3 + 3);
    const uvChart = uvReceivers.get(source);
    if (uvChart) {
      current = uvChart;
      const raster = rasters.get(uvChart.id)!;
      const materialId = raster.materials[0], sourceSurface = input.surfaces[source];
      let materialSurfaces = uvSurfaces.get(materialId);
      if (!materialSurfaces) { materialSurfaces = new Map(); uvSurfaces.set(materialId, materialSurfaces); }
      let surface = materialSurfaces.get(sourceSurface);
      if (surface === undefined) {
        const original = level.surfaces[sourceSurface];
        surface = level.surfaces.length;
        level.surfaces.push({ ...original, id: `${original.id}:uv:${materialId}`, material: materialId });
        materialSurfaces.set(sourceSurface, surface);
      }
      let chartVertices = uvVertices.get(uvChart);
      if (!chartVertices) { chartVertices = new Map(); uvVertices.set(uvChart, chartVertices); }
      for (const index of sourceIndices) {
        let retained = chartVertices.get(index);
        if (retained === undefined) {
          retained = output.positions.length / 3;
          chartVertices.set(index, retained);
          const offset = index * 3;
          output.positions.push(input.positions[offset], input.positions[offset + 1], input.positions[offset + 2]);
          output.normals.push(input.normals[offset], input.normals[offset + 1], input.normals[offset + 2]);
          let u: number, v: number;
          if (uvChart.raster?.coordinates === "uv") {
            u = input.uv[index * 2];
            v = input.uv[index * 2 + 1];
          } else {
            const frame = uvChart.frame;
            const x = input.positions[offset] - frame.origin[0];
            const y = input.positions[offset + 1] - frame.origin[1];
            const z = input.positions[offset + 2] - frame.origin[2];
            u = 0 + frame.u[0] * x + frame.u[1] * y + frame.u[2] * z;
            v = 0 + frame.v[0] * x + frame.v[1] * y + frame.v[2] * z;
          }
          output.uv.push(...raster.layout.uv(u, v));
          output.colors.push(...materialVertexTint(uvChart, u, v));
        }
        output.indices.push(retained);
      }
      output.surfaces.push(surface); output.solidIds.push(input.solidIds?.[source] ?? "");
      if (junctionOwners.has(junctionOwner(source))) {
        const sourcePoints = sourceIndices.map(index => input.positions.slice(index * 3, index * 3 + 3) as V3);
        for (const face of edges!.triangles(sourcePoints)) {
          const uv = face.map(point => {
            const weights = barycentric(point, sourcePoints);
            const coordinates = uvChart.raster?.coordinates === "uv"
              ? [0, 1].map(axis => weights.reduce((sum, weight, corner) => sum + weight * input.uv[sourceIndices[corner] * 2 + axis], 0))
              : [uvChart.frame.u, uvChart.frame.v].map(axis => axis.reduce((sum, value, i) => sum + value * (point[i] - uvChart.frame.origin[i]), 0));
            return raster.layout.uv(coordinates[0], coordinates[1]);
          });
          const colors = face.map(point => {
            const weights = barycentric(point, sourcePoints);
            const coordinates = uvChart.raster?.coordinates === "uv"
              ? [0, 1].map(axis => weights.reduce((sum, weight, corner) => sum + weight * input.uv[sourceIndices[corner] * 2 + axis], 0))
              : [uvChart.frame.u, uvChart.frame.v].map(axis => axis.reduce((sum, value, i) => sum + value * (point[i] - uvChart.frame.origin[i]), 0));
            return materialVertexTint(uvChart, coordinates[0], coordinates[1]);
          });
          junctions!.add({ base: face, positions: face, uv, colors,
            surface, solidId: input.solidIds?.[source] ?? "", host: level.surfaces[input.surfaces[source]].object });
        }
      }
      continue;
    }
    if (junctionOwners.has(junctionOwner(source))) {
      const sourcePoints = sourceIndices.map(index => input.positions.slice(index * 3, index * 3 + 3) as V3);
      for (const face of edges!.triangles(sourcePoints)) {
        const weights = face.map(point => barycentric(point, sourcePoints));
        junctions!.add({ base: face, positions: face,
          uv: weights.map(weights => [0, 1].map(axis => weights.reduce((sum, weight, index) =>
            sum + weight * input.uv[sourceIndices[index] * 2 + axis], 0)) as UV),
          colors: weights.map(weights => [0, 1, 2].map(axis => weights.reduce((sum, weight, index) =>
            sum + weight * (input.colors?.[sourceIndices[index] * 3 + axis] ?? 1), 0)) as V3),
          surface: input.surfaces[source], solidId: input.solidIds?.[source] ?? "",
          host: level.surfaces[input.surfaces[source]].object });
      }
    }
    for (const index of sourceIndices) {
      let retained = retainedVertices.get(index);
      if (retained === undefined) {
        retained = output.positions.length / 3;
        retainedVertices.set(index, retained);
        const offset = index * 3;
        output.positions.push(input.positions[offset], input.positions[offset + 1], input.positions[offset + 2]);
        output.normals.push(input.normals[offset], input.normals[offset + 1], input.normals[offset + 2]);
        output.uv.push(input.uv[index * 2], input.uv[index * 2 + 1]);
        output.colors.push(input.colors?.[offset] ?? 1, input.colors?.[offset + 1] ?? 1, input.colors?.[offset + 2] ?? 1);
      }
      output.indices.push(retained);
    }
    output.surfaces.push(input.surfaces[source]); output.solidIds.push(input.solidIds?.[source] ?? "");
  }
  onProgress?.("Surface appearance: closing displaced seams");
  await junctions?.finish(output, face => { if (face.chart) current = face.chart; });
  aborted(signal);
  return output;
  } catch (error) {
    if ((error as Error).name === "AbortError" || error instanceof AmlError) throw error;
    throw surfaceAppearanceError(level, error, current);
  }
}
