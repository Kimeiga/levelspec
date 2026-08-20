/**
 * The single source of truth for winding.
 *
 * Every exporter, validator and renderer gets its triangles from here, in the
 * canonical right-handed Z-up frame with outward-facing CCW faces. Engine
 * adapters convert the axes exactly once, downstream of this file.
 */

import type { Box } from './types.ts';

export type Vec3 = [number, number, number];

export interface Mesh {
  /** Flat xyz triplets. */
  positions: number[];
  /** Flat xyz triplets, one per vertex. */
  normals: number[];
  /** Triangle indices into the vertex arrays. */
  indices: number[];
}

/** Quad corner order per face, chosen so `(b-a) x (c-a)` points outward. */
const FACES: { normal: Vec3; corners: [number, number, number, number] }[] = [
  { normal: [1, 0, 0], corners: [0b100, 0b110, 0b111, 0b101] }, // +X
  { normal: [-1, 0, 0], corners: [0b000, 0b001, 0b011, 0b010] }, // -X
  { normal: [0, 1, 0], corners: [0b110, 0b010, 0b011, 0b111] }, // +Y
  { normal: [0, -1, 0], corners: [0b000, 0b100, 0b101, 0b001] }, // -Y
  { normal: [0, 0, 1], corners: [0b001, 0b101, 0b111, 0b011] }, // +Z
  { normal: [0, 0, -1], corners: [0b000, 0b010, 0b110, 0b100] }, // -Z
];

function corner(box: Box, mask: number): Vec3 {
  return [
    mask & 0b100 ? box.max[0] : box.min[0],
    mask & 0b010 ? box.max[1] : box.min[1],
    mask & 0b001 ? box.max[2] : box.min[2],
  ];
}

export function boxMesh(box: Box, into?: Mesh): Mesh {
  const m: Mesh = into ?? { positions: [], normals: [], indices: [] };
  for (const face of FACES) {
    const base = m.positions.length / 3;
    for (const c of face.corners) {
      const p = corner(box, c);
      m.positions.push(p[0], p[1], p[2]);
      m.normals.push(face.normal[0], face.normal[1], face.normal[2]);
    }
    m.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  return m;
}

export function mergeBoxes(boxes: Box[]): Mesh {
  const m: Mesh = { positions: [], normals: [], indices: [] };
  for (const b of boxes) boxMesh(b, m);
  return m;
}

/**
 * Signed volume via the divergence theorem. Equals +volume when every face
 * winds counter-clockwise as seen from outside, and -volume when inverted.
 */
export function signedVolume(mesh: Mesh): number {
  let total = 0;
  const p = mesh.positions;
  for (let i = 0; i < mesh.indices.length; i += 3) {
    const a = mesh.indices[i] * 3;
    const b = mesh.indices[i + 1] * 3;
    const c = mesh.indices[i + 2] * 3;
    const cx = (p[b + 1] - p[a + 1]) * (p[c + 2] - p[a + 2]) - (p[b + 2] - p[a + 2]) * (p[c + 1] - p[a + 1]);
    const cy = (p[b + 2] - p[a + 2]) * (p[c] - p[a]) - (p[b] - p[a]) * (p[c + 2] - p[a + 2]);
    const cz = (p[b] - p[a]) * (p[c + 1] - p[a + 1]) - (p[b + 1] - p[a + 1]) * (p[c] - p[a]);
    total += (p[a] * cx + p[a + 1] * cy + p[a + 2] * cz) / 6;
  }
  return total;
}

/** True when every triangle's stored normal agrees with its winding. */
export function windingConsistent(mesh: Mesh): boolean {
  const p = mesh.positions;
  const n = mesh.normals;
  for (let i = 0; i < mesh.indices.length; i += 3) {
    const a = mesh.indices[i] * 3;
    const b = mesh.indices[i + 1] * 3;
    const c = mesh.indices[i + 2] * 3;
    const cx = (p[b + 1] - p[a + 1]) * (p[c + 2] - p[a + 2]) - (p[b + 2] - p[a + 2]) * (p[c + 1] - p[a + 1]);
    const cy = (p[b + 2] - p[a + 2]) * (p[c] - p[a]) - (p[b] - p[a]) * (p[c + 2] - p[a + 2]);
    const cz = (p[b] - p[a]) * (p[c + 1] - p[a + 1]) - (p[b + 1] - p[a + 1]) * (p[c] - p[a]);
    const len = Math.hypot(cx, cy, cz);
    if (len < 1e-12) return false;
    if ((cx * n[a] + cy * n[a + 1] + cz * n[a + 2]) / len < 0.9) return false;
  }
  return true;
}

export function boxVolume(b: Box): number {
  return (b.max[0] - b.min[0]) * (b.max[1] - b.min[1]) * (b.max[2] - b.min[2]);
}

export function boxCenter(b: Box): Vec3 {
  return [
    (b.min[0] + b.max[0]) / 2,
    (b.min[1] + b.max[1]) / 2,
    (b.min[2] + b.max[2]) / 2,
  ];
}

/**
 * The six half-spaces of a brush, each given as the ordered point triple a
 * Quake-style `.map` file stores. The interior is the intersection of the
 * lower half-spaces, so a single reversed triple empties or inverts the brush.
 */
export function brushPlanes(box: Box): { pts: [Vec3, Vec3, Vec3]; normal: Vec3; d: number }[] {
  return FACES.map((face) => {
    const [a, b, c] = [
      corner(box, face.corners[0]),
      corner(box, face.corners[1]),
      corner(box, face.corners[2]),
    ];
    // Quake winds map planes clockwise when seen from the front, i.e. from
    // outside the brush, so the emitted triple is reversed relative to the
    // render mesh. The normal below is recomputed from the emitted order.
    const pts: [Vec3, Vec3, Vec3] = [c, b, a];
    const u: Vec3 = [pts[1][0] - pts[0][0], pts[1][1] - pts[0][1], pts[1][2] - pts[0][2]];
    const v: Vec3 = [pts[2][0] - pts[0][0], pts[2][1] - pts[0][1], pts[2][2] - pts[0][2]];
    const nx = u[1] * v[2] - u[2] * v[1];
    const ny = u[2] * v[0] - u[0] * v[2];
    const nz = u[0] * v[1] - u[1] * v[0];
    const len = Math.hypot(nx, ny, nz) || 1;
    const normal: Vec3 = [-nx / len, -ny / len, -nz / len];
    const d = normal[0] * pts[0][0] + normal[1] * pts[0][1] + normal[2] * pts[0][2];
    return { pts, normal, d };
  });
}

/** Half-space test: the brush centroid must lie inside all six planes. */
export function brushContains(box: Box, p: Vec3, eps = 1e-9): boolean {
  for (const plane of brushPlanes(box)) {
    const dist = plane.normal[0] * p[0] + plane.normal[1] * p[1] + plane.normal[2] * p[2] - plane.d;
    if (dist > eps) return false;
  }
  return true;
}
