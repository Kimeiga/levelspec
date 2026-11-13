import { Matrix4, Vector3 } from "three";
import type { V3 } from "../architecture/types.ts";

/** An exposed steep plane in meters, with local X along it and +Y outward. */
export interface WallSurface {
  key: string;
  frame: Matrix4;
  triangles: V3[][];
  left: number;
  right: number;
  bottom: number;
  top: number;
  vertical: boolean;
  levelBase: boolean;
}

/** Groups coplanar receiving triangles without joining opposite sides or corners. */
export function wallSurfaces(triangles: V3[][]): WallSurface[] {
  const planes = new Map<string, { normal: Vector3; offset: number; faces: V3[][] }>();
  for (const face of triangles) {
    const a = new Vector3(...face[0]);
    const normal = new Vector3(...face[1]).sub(a)
      .cross(new Vector3(...face[2]).sub(a)).normalize();
    if (Math.abs(normal.z) > 0.85 || normal.lengthSq() < 0.5) continue;
    const offset = normal.dot(a);
    const key = [...normal.toArray(), offset].map(value => Math.round(value * 1e5)).join(":");
    const plane = planes.get(key) ?? { normal, offset, faces: [] };
    plane.faces.push(face);
    planes.set(key, plane);
  }
  return [...planes.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, plane]) => {
    const { normal, offset } = plane;
    const origin = normal.clone().multiplyScalar(offset).toArray() as V3;
    const tangent = new Vector3(normal.y, -normal.x, 0).normalize();
    const up = tangent.clone().cross(normal).normalize();
    const frame = new Matrix4().makeBasis(tangent, normal, up).setPosition(...origin);
    const inverse = frame.clone().invert();
    const local = plane.faces.map(face => face.map(p =>
      new Vector3(...p).applyMatrix4(inverse).toArray() as V3));
    let left = Infinity, right = -Infinity, bottom = Infinity, top = -Infinity;
    for (const face of local) for (const p of face) {
      left = Math.min(left, p[0]); right = Math.max(right, p[0]);
      bottom = Math.min(bottom, p[2]); top = Math.max(top, p[2]);
    }
    const basePoints = local.flat().filter(point => Math.abs(point[2] - bottom) < 1e-5);
    const baseLeft = Math.min(...basePoints.map(point => point[0]));
    const baseRight = Math.max(...basePoints.map(point => point[0]));
    return { key, frame, triangles: local, left, right, bottom, top,
      vertical: Math.abs(normal.z) < 1e-5, levelBase: baseRight - baseLeft > right - left - 0.05 };
  });
}

/**
 * Requires the entire assembly rectangle plus a 2 cm margin on the receiving
 * triangles. Clipped area, rather than attachment samples, preserves small holes.
 * Bounds allow 10 nanometers of Float64 arithmetic error in the plane transform.
 */
export function wallFits(surface: WallSurface, x: number, z: number, width: number, height: number, horizontalMargin = 0.02): boolean {
  const left = x - horizontalMargin, right = x + width + horizontalMargin;
  const bottom = z - 0.02, top = z + height + 0.02;
  if (left < surface.left - 1e-8 || right > surface.right + 1e-8
    || bottom < surface.bottom - 1e-8 || top > surface.top + 1e-8) return false;
  let area = 0;
  for (const face of surface.triangles) {
    let polygon = face.map(p => [p[0], p[2]]);
    for (const [axis, bound, sign] of [[0, left, 1], [0, right, -1], [1, bottom, 1], [1, top, -1]]) {
      const clipped: number[][] = [];
      for (let i = 0; i < polygon.length; i++) {
        const a = polygon[i], b = polygon[(i + 1) % polygon.length];
        const da = sign * (a[axis] - bound), db = sign * (b[axis] - bound);
        if (da >= 0) clipped.push(a);
        if ((da >= 0) !== (db >= 0)) clipped.push(a.map((v, j) => v + da / (da - db) * (b[j] - v)));
      }
      polygon = clipped;
    }
    for (let i = 1; i + 1 < polygon.length; i++) {
      const [a, b, c] = [polygon[0], polygon[i], polygon[i + 1]];
      area += Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) / 2;
    }
  }
  return Math.abs(area - (right - left) * (top - bottom)) < 1e-7;
}
