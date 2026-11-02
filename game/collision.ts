/**
 * Collision world for an exported level: triangles from the collision GLB in
 * glTF Y-up metres, bucketed on a horizontal grid. No Three.js dependency, so
 * the browser game and the Node walk test use exactly the same collision.
 */
import { cross, dot, norm as normalize, sub } from "../src/vector/geometry.ts";

export type Vec3 = [number, number, number];

export interface Hit {
  distance: number;
  point: Vec3;
  normal: Vec3;
}

const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

/** Ericson, Real-Time Collision Detection 5.1.5. */
export function closestPointOnTriangle(p: Vec3, a: Vec3, b: Vec3, c: Vec3): Vec3 {
  const ab = sub(b, a), ac = sub(c, a), ap = sub(p, a);
  const d1 = dot(ab, ap), d2 = dot(ac, ap);
  if (d1 <= 0 && d2 <= 0) return a;
  const bp = sub(p, b), d3 = dot(ab, bp), d4 = dot(ac, bp);
  if (d3 >= 0 && d4 <= d3) return b;
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) return add(a, scale(ab, d1 / (d1 - d3)));
  const cp = sub(p, c), d5 = dot(ab, cp), d6 = dot(ac, cp);
  if (d6 >= 0 && d5 <= d6) return c;
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) return add(a, scale(ac, d2 / (d2 - d6)));
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0)
    return add(b, scale(sub(c, b), (d4 - d3) / (d4 - d3 + (d5 - d6))));
  const denom = 1 / (va + vb + vc);
  return add(a, add(scale(ab, vb * denom), scale(ac, vc * denom)));
}

export class CollisionWorld {
  readonly triangles: Vec3[][] = [];
  readonly normals: Vec3[] = [];
  readonly min: Vec3 = [Infinity, Infinity, Infinity];
  readonly max: Vec3 = [-Infinity, -Infinity, -Infinity];
  private readonly cell = 2;
  private readonly buckets = new Map<string, number[]>();

  constructor(positions: Float32Array | number[], indices: Uint32Array | number[]) {
    for (let i = 0; i < indices.length; i += 3) {
      const tri = [0, 1, 2].map((k) => {
        const j = indices[i + k] * 3;
        return [positions[j], positions[j + 1], positions[j + 2]] as Vec3;
      });
      this.addTriangle(tri);
    }
  }

  private addTriangle(tri: Vec3[]) {
    const n = cross(sub(tri[1], tri[0]), sub(tri[2], tri[0]));
    if (Math.hypot(...n) < 1e-10) return; // degenerate
    const index = this.triangles.push(tri) - 1;
    this.normals.push(normalize(n));
    for (const v of tri) for (let a = 0; a < 3; a++) {
      this.min[a] = Math.min(this.min[a], v[a]);
      this.max[a] = Math.max(this.max[a], v[a]);
    }
    const xs = tri.map((v) => Math.floor(v[0] / this.cell)), zs = tri.map((v) => Math.floor(v[2] / this.cell));
    for (let x = Math.min(...xs); x <= Math.max(...xs); x++)
      for (let z = Math.min(...zs); z <= Math.max(...zs); z++) {
        const key = `${x},${z}`;
        const list = this.buckets.get(key);
        if (list) list.push(index); else this.buckets.set(key, [index]);
      }
  }

  /** Triangle indices whose bucket overlaps the horizontal square around (x, z). */
  near(x: number, z: number, radius: number): Set<number> {
    const found = new Set<number>();
    for (let i = Math.floor((x - radius) / this.cell); i <= Math.floor((x + radius) / this.cell); i++)
      for (let j = Math.floor((z - radius) / this.cell); j <= Math.floor((z + radius) / this.cell); j++)
        for (const t of this.buckets.get(`${i},${j}`) ?? []) found.add(t);
    return found;
  }

  /** Möller–Trumbore against both faces; ray distance or null. */
  private intersect(t: number, origin: Vec3, direction: Vec3): number | null {
    const [a, b, c] = this.triangles[t];
    const e1 = sub(b, a), e2 = sub(c, a), p = cross(direction, e2), det = dot(e1, p);
    if (Math.abs(det) < 1e-12) return null;
    const s = sub(origin, a), u = dot(s, p) / det;
    if (u < 0 || u > 1) return null;
    const q = cross(s, e1), v = dot(direction, q) / det;
    if (v < 0 || u + v > 1) return null;
    return dot(e2, q) / det;
  }

  /** Nearest hit within maxDistance. */
  raycast(origin: Vec3, direction: Vec3, maxDistance: number): Hit | null {
    let best: Hit | null = null;
    const reach = Math.hypot(direction[0], direction[2]) * maxDistance;
    for (const t of this.near(origin[0] + direction[0] * maxDistance / 2,
      origin[2] + direction[2] * maxDistance / 2, reach / 2 + 0.01)) {
      const d = this.intersect(t, origin, direction);
      if (d === null || d < 0 || d > maxDistance || (best && d >= best.distance)) continue;
      best = { distance: d, point: add(origin, scale(direction, d)), normal: this.normals[t] };
    }
    return best;
  }
}
