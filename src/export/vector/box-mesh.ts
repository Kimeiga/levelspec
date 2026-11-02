/**
 * Internal box construction for BSP enclosure solids.
 *
 * Enclosure triangles use right-handed Z-up coordinates and outward-facing
 * CCW faces. BSP export owns subsequent engine-axis conversion.
 */

import type { V3 } from "../../vector/types.ts";

type Box = { min: V3; max: V3 };

type Vec3 = V3;

interface Mesh {
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

/** Resolves a binary corner mask against the box bounds. */
function corner(box: Box, mask: number): Vec3 {
  return [
    mask & 0b100 ? box.max[0] : box.min[0],
    mask & 0b010 ? box.max[1] : box.min[1],
    mask & 0b001 ? box.max[2] : box.min[2],
  ];
}

/** Builds an outward-wound Z-up box in meters without modifying its bounds. */
export function boxMesh(box: Box): Mesh {
  const m: Mesh = { positions: [], normals: [], indices: [] };
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

