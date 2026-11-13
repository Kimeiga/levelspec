import { cross, dot, norm, sub } from "./geometry.ts";
import type { MeshData, V3 } from "./types.ts";

/**
 * Averages UV0 directions at shared vertices, then builds each normal's orthonormal frame.
 * Optional triangle filtering preserves source vertex indices; the input mesh is never changed.
 */
export function materialTangents(
  mesh: MeshData,
  include: (triangle: number) => boolean = () => true,
): number[] {
  const tangentSums = new Float64Array(mesh.positions.length);
  const bitangentSums = new Float64Array(mesh.positions.length);
  for (let t = 0; t < mesh.indices.length; t += 3) {
    if (!include(t / 3)) continue;
    const ids = mesh.indices.slice(t, t + 3);
    const points = ids.map((i) => mesh.positions.slice(i * 3, i * 3 + 3) as V3);
    const uv = ids.map((i) => mesh.uv.slice(i * 2, i * 2 + 2));
    const e1 = sub(points[1], points[0]),
      e2 = sub(points[2], points[0]);
    const du1 = uv[1][0] - uv[0][0],
      dv1 = uv[1][1] - uv[0][1];
    const du2 = uv[2][0] - uv[0][0],
      dv2 = uv[2][1] - uv[0][1];
    const det = du1 * dv2 - du2 * dv1;
    if (Math.abs(det) < 1e-12) continue;
    const tangent = e1.map((v, i) => (v * dv2 - e2[i] * dv1) / det);
    const bitangent = e1.map((v, i) => (e2[i] * du1 - v * du2) / det);
    for (const id of ids)
      for (let axis = 0; axis < 3; axis++) {
        tangentSums[id * 3 + axis] += tangent[axis];
        bitangentSums[id * 3 + axis] += bitangent[axis];
      }
  }
  const out: number[] = [];
  for (let i = 0; i < mesh.positions.length; i += 3) {
    const normal = mesh.normals.slice(i, i + 3) as V3;
    const sum = Array.from(tangentSums.slice(i, i + 3)) as V3;
    const bitangent = Array.from(bitangentSums.slice(i, i + 3)) as V3;
    let tangent = sum.map(
      (v, axis) => v - dot(normal, sum) * normal[axis],
    ) as V3;
    if (Math.hypot(...tangent) < 1e-12) {
      const axis: V3 = Math.abs(normal[2]) < 0.9 ? [0, 0, 1] : [0, 1, 0];
      tangent = cross(axis, normal);
    }
    tangent = norm(tangent);
    const handedness = dot(cross(normal, tangent), bitangent) < 0 ? -1 : 1;
    out.push(...tangent, handedness);
  }
  return out;
}
