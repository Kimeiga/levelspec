import type { V3 } from "../../architecture/types.ts";
import { valueNoise, smoothStep } from "./noise.ts";

/** World-oriented sweep rings; centers are relative to the first ring, retaining translation-independent gravity. */
export interface RunoffRing {
  center: V3;
  radial: V3;
  across: V3;
  radius: number;
  distance: number;
}

const dot = (a: V3, b: V3): number => a.reduce((sum, value, i) => sum + value * b[i], 0);

/**
 * Surface geometry for gravity projection. U wraps around the pipe, V is its
 * centerline distance. Sloped collars and curved elbows retain their metric.
 */
export class PipeRunoffSurface {
  readonly circumference: number;
  readonly length: number;
  private readonly rings: RunoffRing[];

  constructor(rings: RunoffRing[], circumference: number) {
    if (rings.length < 2 || !Number.isFinite(circumference) || circumference <= 0
      || rings[0].distance !== 0 || rings.some((ring, index) =>
        !Number.isFinite(ring.distance) || (index > 0 && ring.distance <= rings[index - 1].distance)
        || !Number.isFinite(ring.radius) || ring.radius <= 0
        || [ring.center, ring.radial, ring.across].some(vector => vector.length !== 3 || !vector.every(Number.isFinite))
        || dot(ring.radial, ring.radial) < 1e-10 || dot(ring.across, ring.across) < 1e-10
        || dot(ring.radial, ring.radial) * dot(ring.across, ring.across) - dot(ring.radial, ring.across) ** 2 < 1e-10))
      throw new Error("Pipe runoff needs finite nondegenerate rings with increasing distances from zero and a positive circumference.");
    this.rings = rings;
    this.circumference = circumference;
    this.length = rings.at(-1)!.distance;
  }

  /** Finds the containing axial segment, extending the end segments for derivative padding. */
  private segment(v: number): number {
    let index = 0;
    while (index + 2 < this.rings.length && this.rings[index + 1].distance < v) index++;
    return index;
  }

  /** Evaluates a point on the ring-interpolated surface, including periodic U and axial padding. */
  point(u: number, v: number): V3 {
    const index = this.segment(v), a = this.rings[index], b = this.rings[index + 1];
    const t = (v - a.distance) / (b.distance - a.distance), remaining = 1 - t;
    const angle = 2 * Math.PI * u / this.circumference;
    const radius = a.radius * remaining + b.radius * t;
    const rx = a.radial[0] * remaining + b.radial[0] * t;
    const ry = a.radial[1] * remaining + b.radial[1] * t;
    const rz = a.radial[2] * remaining + b.radial[2] * t;
    const ax = a.across[0] * remaining + b.across[0] * t;
    const ay = a.across[1] * remaining + b.across[1] * t;
    const az = a.across[2] * remaining + b.across[2] * t;
    const cosine = Math.cos(angle) / Math.hypot(rx, ry, rz), sine = Math.sin(angle) / Math.hypot(ax, ay, az);
    return [
      a.center[0] * remaining + b.center[0] * t + radius * (rx * cosine + ax * sine),
      a.center[1] * remaining + b.center[1] * t + radius * (ry * cosine + ay * sine),
      a.center[2] * remaining + b.center[2] * t + radius * (rz * cosine + az * sine),
    ];
  }

  /** Projects gravity onto analytic sweep tangents, in UV change per physical meter downhill. */
  downhill(u: number, v: number): [number, number] {
    const index = this.segment(v), a = this.rings[index], b = this.rings[index + 1];
    const span = b.distance - a.distance, t = (v - a.distance) / span;
    const angle = 2 * Math.PI * u / this.circumference, cosine = Math.cos(angle), sine = Math.sin(angle);
    const radius = a.radius * (1 - t) + b.radius * t, radiusRate = (b.radius - a.radius) / span;
    const radial: V3 = [0, 0, 0], across: V3 = [0, 0, 0];
    const radialRate: V3 = [0, 0, 0], acrossRate: V3 = [0, 0, 0];
    for (let axis = 0; axis < 3; axis++) {
      radial[axis] = a.radial[axis] * (1 - t) + b.radial[axis] * t;
      across[axis] = a.across[axis] * (1 - t) + b.across[axis] * t;
      radialRate[axis] = (b.radial[axis] - a.radial[axis]) / span;
      acrossRate[axis] = (b.across[axis] - a.across[axis]) / span;
    }
    const radialLength = Math.hypot(...radial), acrossLength = Math.hypot(...across);
    const radialStretch = dot(radial, radialRate) / (radialLength * radialLength);
    const acrossStretch = dot(across, acrossRate) / (acrossLength * acrossLength);
    let aa = 0, ab = 0, bb = 0, uz = 0, vz = 0;
    for (let axis = 0; axis < 3; axis++) {
      const r = radial[axis] / radialLength, q = across[axis] / acrossLength;
      const dr = (radialRate[axis] - radial[axis] * radialStretch) / radialLength;
      const dq = (acrossRate[axis] - across[axis] * acrossStretch) / acrossLength;
      const du = radius * 2 * Math.PI / this.circumference * (-r * sine + q * cosine);
      const dv = (b.center[axis] - a.center[axis]) / span + radiusRate * (r * cosine + q * sine)
        + radius * (dr * cosine + dq * sine);
      aa += du * du; ab += du * dv; bb += dv * dv;
      if (axis === 2) { uz = du; vz = dv; }
    }
    const determinant = aa * bb - ab * ab;
    if (determinant < 1e-10) return [0, 0];
    const x = (-uz * bb + vz * ab) / determinant, y = (-vz * aa + uz * ab) / determinant;
    const speed = Math.sqrt(Math.max(0, aa * x * x + 2 * ab * x * y + bb * y * y));
    return speed < 0.02 ? [0, 0] : [x / speed, y / speed];
  }
}

/**
 * Deposits seam corrosion and transports it downhill once in descending world-height
 * order. The periodic field retains its physical sampling grid; each cell depends
 * only on higher neighbors, so bends cannot create iterative transport cycles.
 */
export function createPipeRunoff(surface: PipeRunoffSurface, seams: number[], seed: number): (u: number, v: number) => number {
  if (!Number.isFinite(seed) || seams.some(value => !Number.isFinite(value)))
    throw new Error("Pipe runoff requires finite seams and seed.");
  if (!seams.length) return () => 0;
  const { circumference, length } = surface;
  const columns = Math.max(96, Math.min(192, Math.ceil(circumference * 128)));
  const rows = Math.max(8, Math.min(384, Math.ceil(length * 48)));
  const count = columns * (rows + 1), du = circumference / columns, dv = length / rows;
  const values = new Float32Array(count), points = new Float64Array(count * 3);
  const upstreamU = new Float64Array(count), upstreamV = new Float64Array(count);
  const order = new Uint32Array(count);
  for (let row = 0; row <= rows; row++) for (let column = 0; column < columns; column++) {
    const index = row * columns + column, u = column * du, v = row * dv;
    const point = surface.point(u, v), down = surface.downhill(u, v);
    if (!point.every(Number.isFinite) || !down.every(Number.isFinite))
      throw new Error("Pipe runoff requires a finite nondegenerate interpolated surface.");
    points.set(point, index * 3);
    order[index] = index;
    const rate = Math.max(Math.abs(down[0]) / du, Math.abs(down[1]) / dv);
    upstreamU[index] = rate > 0 ? column - down[0] / du / rate : column;
    upstreamV[index] = rate > 0 ? row - down[1] / dv / rate : row;
    let distance = Infinity;
    for (const seam of seams) distance = Math.min(distance, Math.abs(v - seam));
    const angle = 2 * Math.PI * column / columns, cosine = Math.cos(angle), sine = Math.sin(angle);
    const variation = smoothStep(0.38, 0.72, valueNoise(cosine * 7 + 7, sine * 7 + v * 2, seed));
    const strength = 0.35 + 1.4 * smoothStep(0.2, 0.8, valueNoise(cosine * 3 + 13, sine * 3 + v * 2, seed + 73));
    values[index] = Math.exp(-distance / 0.012) * Math.min(1, 0.04 + variation * strength * 0.96);
  }
  order.sort((a, b) => points[b * 3 + 2] - points[a * 3 + 2]);
  for (const index of order) {
    const x = upstreamU[index], y = upstreamV[index];
    if (y < 0 || y > rows) continue;
    const x0 = Math.floor(x), y0 = Math.floor(y), tx = x - x0, ty = y - y0;
    const at = index * 3;
    let carried = 0, weight = 0;
    for (let dy = 0; dy <= 1; dy++) for (let dx = 0; dx <= 1; dx++) {
      const contribution = (dx ? tx : 1 - tx) * (dy ? ty : 1 - ty);
      if (contribution === 0 || y0 + dy > rows) continue;
      const column = ((x0 + dx) % columns + columns) % columns;
      const neighbor = (y0 + dy) * columns + column, other = neighbor * 3;
      if (points[other + 2] <= points[at + 2] + 1e-8) continue;
      const distance = Math.hypot(points[other] - points[at], points[other + 1] - points[at + 1], points[other + 2] - points[at + 2]);
      carried += contribution * values[neighbor] * Math.exp(-distance / 0.3);
      weight += contribution;
    }
    if (weight > 0) values[index] = Math.max(values[index], carried / weight);
  }
  return (u, v) => {
    const x = (((u / circumference) % 1) + 1) % 1 * columns;
    const y = Math.max(0, Math.min(rows, v / length * rows));
    const x0 = Math.floor(x), y0 = Math.min(rows - 1, Math.floor(y)), tx = x - x0, ty = y - y0;
    const left = y0 * columns + x0, right = y0 * columns + (x0 + 1) % columns;
    return (values[left] * (1 - tx) + values[right] * tx) * (1 - ty)
      + (values[left + columns] * (1 - tx) + values[right + columns] * tx) * ty;
  };
}
