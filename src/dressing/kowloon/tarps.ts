import { Vector3 } from "three";
import type { V3 } from "../../architecture/types.ts";
import { Rng } from "../../generate/rng.ts";
import type { Pen } from "../pen.ts";
import { valueNoise } from "../finish/noise.ts";
import type { Kit } from "./kit.ts";
import { GALVANIZED, mix, shade, srgb } from "./palette.ts";
import { weatheredPen } from "./weathered.ts";
import cloth from "./assets/cloth-forms.json" with { type: "json" };

interface ClothForm {
  id: string;
  referenceDimensions: { width: number; depth: number; drop: number; skirt: number };
  positions: number[][];
  uv: number[][];
  indices: number[];
  attachments: { vertex: number; kind: string; normalized: number[] }[];
  supports: { rearRail: number[][]; frontRail: number[][] };
}

const FORMS: ClothForm[] = cloth.forms;
const DUST = srgb("#a99d88");
const ROPE = srgb("#968779");
const STEEL = shade(GALVANIZED, 0.58);

/**
 * Facade-local dimensions in meters. `z` is the rear attachment height; cloth
 * folds may rise 0.03 m above it or hang 0.15 m below the nominal front rail.
 * An optional valance extends that lower bound by its requested drop.
 */
export interface TarpEnvelope {
  x0: number;
  x1: number;
  z: number;
  depth: number;
  drop: number;
  /** Additional drop from the simulated front free edge, in meters; 0–0.6. */
  valance?: number;
}

/** Alternating canvas bands: linear RGB accent color and each band's rest-space width in meters. */
export interface CanvasPattern {
  color: V3;
  width: number;
}

interface ClothVertex {
  point: V3;
  restUV: [number, number];
  normal: V3;
}

/** Interpolates a cut on the fitted triangle while retaining its original rest-space coordinates. */
function stripeVertex(a: ClothVertex, b: ClothVertex, amount: number): ClothVertex {
  const normal = a.normal.map((value, axis) => value + (b.normal[axis] - value) * amount) as V3;
  const length = Math.hypot(...normal);
  return {
    point: a.point.map((value, axis) => value + (b.point[axis] - value) * amount) as V3,
    restUV: a.restUV.map((value, axis) => value + (b.restUV[axis] - value) * amount) as [number, number],
    normal: length > 1e-10 ? normal.map(value => value / length) as V3 : [...a.normal],
  };
}

/** Clips a convex cloth polygon to one side of a rest-U boundary without moving its silhouette. */
function clipStripe(vertices: ClothVertex[], boundary: number, greater: boolean): ClothVertex[] {
  const result: ClothVertex[] = [];
  const inside = (vertex: ClothVertex): boolean => greater ? vertex.restUV[0] >= boundary : vertex.restUV[0] <= boundary;
  const append = (vertex: ClothVertex): void => {
    const last = result.at(-1);
    if (!last || Math.hypot(vertex.restUV[0] - last.restUV[0], vertex.restUV[1] - last.restUV[1]) > 1e-10) result.push(vertex);
  };
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i], b = vertices[(i + 1) % vertices.length];
    const aInside = inside(a), bInside = inside(b);
    if (aInside) append(a);
    if (aInside !== bInside) append(stripeVertex(a, b, (boundary - a.restUV[0]) / (b.restUV[0] - a.restUV[0])));
  }
  if (result.length > 1) {
    const a = result[0].restUV, b = result.at(-1)!.restUV;
    if (Math.hypot(a[0] - b[0], a[1] - b[1]) <= 1e-10) result.pop();
  }
  return result;
}

/** Emits constant-parity stripe pieces before applying repeating weave UVs and their seeded offset. */
function stripedTriangle(
  pen: Pen, triangle: ClothVertex[], pattern: CanvasPattern, moduleOffset: number,
  repeat: number, offset: number[], width: number, run: number, base: V3, grime: number, seed: number,
): void {
  const us = triangle.map(vertex => vertex.restUV[0] + moduleOffset);
  const first = Math.floor(Math.min(...us) / pattern.width);
  const last = Math.ceil(Math.max(...us) / pattern.width) - 1;
  for (let stripe = first; stripe <= last; stripe++) {
    const lower = stripe * pattern.width - moduleOffset, upper = lower + pattern.width;
    const polygon = clipStripe(clipStripe(triangle, lower, true), upper, false);
    if (polygon.length < 3) continue;
    const color = stripe % 2 === 0 ? base : mix(pattern.color, DUST, 0.3);
    const colors = new Map(polygon.map(vertex => [vertex.point, fabricTint(vertex.restUV, width, run, color, grime, seed)]));
    const uv = polygon.map(vertex => vertex.restUV.map((value, axis) => value * repeat + offset[axis]));
    for (const sign of [1, -1]) {
      const normals = polygon.map(vertex => vertex.normal.map(value => value * sign) as V3);
      const hint = normals.reduce((sum, normal) => sum.map((value, axis) => value + normal[axis]) as V3, [0, 0, 0] as V3);
      pen.face("tarp", polygon.map(vertex => vertex.point), hint, point => colors.get(point)!, uv, normals);
    }
  }
}

/** Area-weighted smooth normals after fitting; source normals cannot survive unequal axis scaling. */
function smoothNormals(points: V3[], indices: number[]): V3[] {
  const normals = points.map(() => new Vector3());
  for (let i = 0; i < indices.length; i += 3) {
    const [a, b, c] = indices.slice(i, i + 3);
    const ab = new Vector3(...points[b]).sub(new Vector3(...points[a]));
    const ac = new Vector3(...points[c]).sub(new Vector3(...points[a]));
    const normal = ab.cross(ac);
    for (const index of [a, b, c]) normals[index].add(normal);
  }
  return normals.map(normal => normal.normalize().toArray() as V3);
}

/** Finds open cloth edges once; a narrow rolled hem follows the actual simulated silhouette. */
function boundaryEdges(indices: number[]): [number, number][] {
  const edges = new Map<string, { pair: [number, number]; count: number }>();
  for (let i = 0; i < indices.length; i += 3) {
    const triangle = indices.slice(i, i + 3);
    for (let j = 0; j < 3; j++) {
      const a = triangle[j], b = triangle[(j + 1) % 3];
      const key = `${Math.min(a, b)}/${Math.max(a, b)}`;
      const edge = edges.get(key);
      if (edge) edge.count++;
      else edges.set(key, { pair: [a, b], count: 1 });
    }
  }
  return [...edges.values()].filter(edge => edge.count === 1).map(edge => edge.pair);
}

const EDGES = FORMS.map(form => boundaryEdges(form.indices));

/** Fits all cloth and attachment points together, reserving room for rolled hems and steel radii. */
function fittedForm(form: ClothForm, envelope: TarpEnvelope) {
  const { x0, x1, z, depth, drop } = envelope;
  const width = x1 - x0;
  const bounds = [0, 1].map(axis => [
    Math.min(...form.positions.map(p => p[axis])),
    Math.max(...form.positions.map(p => p[axis])),
  ]);
  const t = (point: number[]) => (point[1] - bounds[1][0]) / (bounds[1][1] - bounds[1][0]);
  let sagScale = Math.min(1, depth / form.referenceDimensions.depth);
  // All folds and hems stay above front rail − 0.15 m, including unusually shallow caller slopes.
  for (const point of form.positions) {
    const sag = point[2] * form.referenceDimensions.depth;
    if (sag < 0) sagScale = Math.min(sagScale, (drop * (1 - t(point)) + 0.145) / -sag);
    if (sag > 0) sagScale = Math.min(sagScale, (drop * t(point) + 0.025) / sag);
  }
  const at = (point: number[]): V3 => [
    x0 + 0.025 + (point[0] - bounds[0][0]) / (bounds[0][1] - bounds[0][0]) * (width - 0.05),
    0.025 + t(point) * (depth - 0.05),
    z - drop * t(point) + point[2] * form.referenceDimensions.depth * sagScale,
  ];
  const reference = (point: number[]): V3 => {
    const r = form.referenceDimensions;
    const fitted = at([point[0] / r.width, point[1] / r.depth, 0]);
    // Tube radii and the gap beneath pinned cloth are physical millimeters, independent of sag fitting.
    fitted[2] += point[2] + r.drop * point[1] / r.depth;
    return fitted;
  };
  return { at, reference, points: form.positions.map(at) };
}

/** Adds subtle brown hem deposits and broad fading; shared maps retain fiber-scale detail. */
function fabricTint(uv: number[], width: number, run: number, base: V3, grime: number, seed: number): V3 {
  const [u, v] = uv;
  const edge = Math.max(0, Math.min(u, width - u, v, run - v));
  const hem = Math.exp(-edge / 0.085);
  const streak = 0.45 + valueNoise(u * 8, v * 1.3, seed) * 0.55;
  const fading = valueNoise(u * 1.4, v * 1.7, seed + 1) * 0.12;
  const tint = mix(base, DUST, fading);
  const soil = grime * hem * streak;
  return tint.map((value, axis) => value * (1 - soil * [0.42, 0.49, 0.55][axis])) as V3;
}

/** Hardware is generated from the same fitted attachment coordinates as the cloth. */
function fittings(pen: Pen, form: ClothForm, fit: ReturnType<typeof fittedForm>, envelope: TarpEnvelope, normals: V3[], kit?: Kit): void {
  const steel = weatheredPen(pen, kit, "frame", undefined, ["metal"]);
  const rear = form.supports.rearRail.map(fit.reference);
  const front = form.supports.frontRail.map(fit.reference);
  steel.tube("metal", rear, 0.012, STEEL, 8);
  steel.tube("metal", front, 0.012, STEEL, 8);
  for (let i = 0; i < 2; i++) {
    steel.tube("metal", [rear[i], front[i]], 0.012, STEEL, 8);
    const foot: V3 = [rear[i][0], 0.015, envelope.z - envelope.drop - 0.08];
    steel.tube("metal", [foot, front[i]], 0.011, STEEL, 6);
    for (const at of [rear[i], foot])
      steel.box("metal", [at[0] - 0.018, 0, at[2] - 0.022], [at[0] + 0.018, 0.027, at[2] + 0.007], STEEL, "");
  }
  const pins = form.attachments.filter((pin, i) => pin.kind !== "rear-seam" || i % 7 === 0);
  for (const pin of pins) {
    const point = fit.at(pin.normalized);
    let rail = pin.kind === "rear-seam" ? rear : front;
    let axis = 0;
    if (pin.kind === "side-tie") {
      const side = pin.normalized[0] < 0.5 ? 0 : 1;
      rail = [rear[side], front[side]];
      axis = 1;
    }
    const amount = (point[axis] - rail[0][axis]) / (rail[1][axis] - rail[0][axis]);
    const anchor = rail[0].map((value, axis) => value + (rail[1][axis] - value) * amount) as V3;
    const normal = new Vector3(...normals[pin.vertex]);
    const across = new Vector3(1, 0, 0).addScaledVector(normal, -normal.x).normalize();
    const along = normal.clone().cross(across);
    const ring = Array.from({ length: 9 }, (_, i) => {
      const angle = i / 8 * Math.PI * 2;
      return new Vector3(...point).addScaledVector(normal, 0.002)
        .addScaledVector(across, Math.cos(angle) * 0.008)
        .addScaledVector(along, Math.sin(angle) * 0.008).toArray() as V3;
    });
    pen.tube("metal", ring, 0.002, STEEL, 4);
    const railAxis = new Vector3(...rail[1]).sub(new Vector3(...rail[0])).normalize();
    const up = new Vector3(0, 0, 1).addScaledVector(railAxis, -railAxis.z).normalize();
    const around = railAxis.clone().cross(up);
    const loop = Array.from({ length: 9 }, (_, i) => {
      const angle = i / 8 * Math.PI * 2;
      return new Vector3(...anchor).addScaledVector(up, Math.cos(angle) * 0.017)
        .addScaledVector(around, Math.sin(angle) * 0.017).toArray() as V3;
    });
    pen.tube("tarp", [point, ...loop, point], 0.003, ROPE, 5);
  }
}

/**
 * Continues the actual open front edge into hanging cloth. Scallops shorten the
 * maximum drop, and the small bend remains inside the fitted front allowance.
 */
function hangingValance(
  pen: Pen, form: ClothForm, edges: [number, number][], points: V3[], physicalUV: number[][],
  height: number, moduleOffset: number, repeat: number, offset: number[],
  fabricWidth: number, base: V3, edgeTint: V3, grime: number, seed: number, pattern?: CanvasPattern,
): void {
  const maximumV = Math.max(...form.uv.map(uv => uv[1]));
  const frontEdges = edges.filter(([a, b]) => Math.abs(form.uv[a][1] - maximumV) < 1e-7 && Math.abs(form.uv[b][1] - maximumV) < 1e-7);
  const frontIds = [...new Set(frontEdges.flat())];
  if (!frontIds.length) return;
  const columns = frontIds.length;
  const columnOf = new Map(frontIds.map((id, column) => [id, column]));
  const vertices: Omit<ClothVertex, "normal">[] = [];
  const scallopWidth = pattern?.width ?? 0.24;
  for (const row of [0, 0.5, 1]) {
    for (const id of frontIds) {
      const top = points[id], rest = physicalUV[id], u = rest[0] + moduleOffset;
      const shortening = Math.min(0.028, height * 0.18) * Math.sin(Math.PI * u / scallopWidth) ** 2;
      const bend = Math.min(0.02, height * 0.08) * (0.4 + valueNoise(u * 2, 0, seed + 211) * 0.6);
      const point: V3 = row === 0 ? top : [top[0], top[1] + bend * Math.sin(row * Math.PI * 0.7), top[2] - (height - shortening) * row];
      const previous = row === 0 ? undefined : vertices[(row === 0.5 ? 0 : 1) * columns + columnOf.get(id)!];
      const v = previous ? previous.restUV[1] + Math.hypot(...point.map((value, axis) => value - previous.point[axis])) : rest[1];
      vertices.push({ point, restUV: [rest[0], v] });
    }
  }
  const indices: number[] = [];
  for (let row = 0; row < 2; row++) for (const [a, b] of frontEdges) {
    const a0 = row * columns + columnOf.get(a)!, b0 = row * columns + columnOf.get(b)!;
    const a1 = a0 + columns, b1 = b0 + columns;
    indices.push(a0, b0, b1, a0, b1, a1);
  }
  const normals = smoothNormals(vertices.map(vertex => vertex.point), indices);
  const run = Math.max(...vertices.map(vertex => vertex.restUV[1]));
  for (let i = 0; i < indices.length; i += 3) {
    const triangle = indices.slice(i, i + 3).map(id => ({ ...vertices[id], normal: normals[id] }));
    if (pattern) {
      stripedTriangle(pen, triangle, pattern, moduleOffset, repeat, offset, fabricWidth, run, base, grime, seed);
      continue;
    }
    const colors = new Map(triangle.map(vertex => [vertex.point, fabricTint(vertex.restUV, fabricWidth, run, base, grime, seed)]));
    const uv = triangle.map(vertex => vertex.restUV.map((value, axis) => value * repeat + offset[axis]));
    for (const sign of [1, -1]) {
      const shading = triangle.map(vertex => vertex.normal.map(value => value * sign) as V3);
      const hint = shading.reduce((sum, normal) => sum.map((value, axis) => value + normal[axis]) as V3, [0, 0, 0] as V3);
      pen.face("tarp", triangle.map(vertex => vertex.point), hint, point => colors.get(point)!, uv, shading);
    }
  }
  for (const [a, b] of frontEdges)
    pen.tube("tarp", [vertices[columns * 2 + columnOf.get(a)!].point, vertices[columns * 2 + columnOf.get(b)!].point], 0.0025, edgeTint, 4);
}

/** Draws one static Blender cloth form with physical UVs and opposite, smoothly shaded faces. */
function panel(pen: Pen, envelope: TarpEnvelope, tint: V3, hem: V3, rng: Rng, kit?: Kit, pattern?: CanvasPattern, moduleOffset = 0): void {
  const index = rng.int(0, FORMS.length - 1), form = FORMS[index];
  const fit = fittedForm(form, envelope);
  const normals = smoothNormals(fit.points, form.indices);
  const width = envelope.x1 - envelope.x0;
  const run = Math.hypot(envelope.depth, envelope.drop);
  const referenceRun = Math.hypot(form.referenceDimensions.depth, form.referenceDimensions.drop);
  const physicalUV = form.uv.map(uv => [uv[0] * width / form.referenceDimensions.width, uv[1] * run / referenceRun]);
  const offset = [rng.next(), rng.next()];
  const repeat = pen.mesh.repeat("tarp");
  const uv = physicalUV.map(point => point.map((value, axis) => value * repeat + offset[axis]));
  const seed = rng.int(0, 0x7fffffff);
  const base = mix(tint, DUST, 0.3);
  const fabricWidth = Math.max(...physicalUV.map(point => point[0]));
  const fabricRun = Math.max(...physicalUV.map(point => point[1]));
  const colors = physicalUV.map(point => fabricTint(point, fabricWidth, fabricRun, base, kit?.grime ?? 0.7, seed));
  const colorAt = new Map(fit.points.map((point, index) => [point, colors[index]]));
  for (let i = 0; i < form.indices.length; i += 3) {
    const ids = form.indices.slice(i, i + 3);
    if (pattern) {
      stripedTriangle(pen, ids.map(id => ({ point: fit.points[id], restUV: physicalUV[id] as [number, number], normal: normals[id] })),
        pattern, moduleOffset, repeat, offset, fabricWidth, fabricRun, base, kit?.grime ?? 0.7, seed);
      continue;
    }
    const points = ids.map(id => fit.points[id]);
    for (const sign of [1, -1]) {
      const shading = ids.map(id => normals[id].map(value => value * sign) as V3);
      const hint = shading.reduce((sum, normal) => sum.map((value, axis) => value + normal[axis]) as V3, [0, 0, 0] as V3);
      pen.face("tarp", points, hint, point => colorAt.get(point)!, ids.map(id => uv[id]), shading);
    }
  }
  const edgeTint = shade(mix(base, hem, 0.1), 0.62);
  for (const [a, b] of EDGES[index]) pen.tube("tarp", [fit.points[a], fit.points[b]], 0.0025, edgeTint, 4);
  if ((envelope.valance ?? 0) > 0)
    hangingValance(pen, form, EDGES[index], fit.points, physicalUV, envelope.valance!, moduleOffset,
      repeat, offset, fabricWidth, base, edgeTint, kit?.grime ?? 0.7, seed, pattern);
  fittings(pen, form, fit, envelope, normals, kit);
}

/**
 * Reuses settled cloth meshes and shared PBR maps; no runtime simulation or per-awning image bake.
 * The stable identity selects tension independently of detail. Very wide spans use tied modules.
 * Optional stripes use physical rest-space U before weave repetition and preserve their phase across modules.
 */
export function canvasAwning(pen: Pen, envelope: TarpEnvelope, tint: V3, hem: V3, key: string, kit?: Kit, pattern?: CanvasPattern): void {
  const width = envelope.x1 - envelope.x0;
  if (![envelope.x0, envelope.x1, envelope.z, envelope.depth, envelope.drop].every(Number.isFinite) || width <= 0.05 || envelope.depth <= 0.05 || envelope.drop < 0)
    throw new Error("Canvas awnings require finite dimensions, width/depth above 0.05 m, and a nonnegative drop.");
  if (envelope.valance !== undefined && (!Number.isFinite(envelope.valance) || envelope.valance < 0 || envelope.valance > 0.6))
    throw new Error("Canvas valance must be a finite additional drop in [0,0.6] meters.");
  if (pattern && (!Number.isFinite(pattern.width) || pattern.width < 0.08
    || pattern.color.length !== 3 || pattern.color.some(value => !Number.isFinite(value) || value < 0 || value > 1)))
    throw new Error("Canvas stripes require finite linear RGB in [0,1] and a width of at least 0.08 m.");
  const count = Math.max(1, Math.ceil(width / (envelope.depth * 4.4)));
  for (let i = 0; i < count; i++) {
    const rng = new Rng(`${kit?.seed ?? "canvas"}/${key}/${i}`);
    panel(pen, { ...envelope, x0: envelope.x0 + width * i / count, x1: envelope.x0 + width * (i + 1) / count }, tint, hem, rng, kit, pattern, width * i / count);
  }
}
