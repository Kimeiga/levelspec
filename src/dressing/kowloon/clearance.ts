import { Ray, Vector3 } from "three";
import type { CompiledArchitecture, V3 } from "../../architecture/types.ts";
import type { MeshData } from "../../vector/types.ts";
import type { Pen } from "../pen.ts";

/** Horizontal size of the lookup grid cells, meters. */
const CELL = 2;

/**
 * Tests a triangle against an axis-aligned box given by its center and half
 * extents, using the separating axes of the box, the triangle and their edges.
 */
export function triangleTouchesBox(triangle: V3[], center: V3, half: V3): boolean {
  const v = triangle.map((p) => p.map((value, i) => value - center[i]) as V3);
  for (let axis = 0; axis < 3; axis++) {
    const values = v.map((p) => p[axis]);
    if (Math.min(...values) > half[axis] || Math.max(...values) < -half[axis])
      return false;
  }
  const edges = [0, 1, 2].map(
    (i) => v[(i + 1) % 3].map((value, k) => value - v[i][k]) as V3,
  );
  const separated = (axis: V3) => {
    const projected = v.map(
      (p) => p[0] * axis[0] + p[1] * axis[1] + p[2] * axis[2],
    );
    const reach =
      half[0] * Math.abs(axis[0]) +
      half[1] * Math.abs(axis[1]) +
      half[2] * Math.abs(axis[2]);
    return Math.min(...projected) > reach || Math.max(...projected) < -reach;
  };
  for (const e of edges)
    for (const axis of [
      [0, -e[2], e[1]],
      [e[2], 0, -e[0]],
      [-e[1], e[0], 0],
    ] as V3[])
      if (separated(axis)) return false;
  const [a, b] = edges;
  return !separated([
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ]);
}

/**
 * Answers whether a proposed visual part would run into the level's collision
 * geometry or into another building's volume. Collision triangles are tested
 * against the part's own oriented box. Foreign volumes are compared by their
 * bounds in the part's frame, which is exact for mutually aligned buildings
 * and conservative otherwise.
 */
export class Obstacles {
  /** Every indexed collision triangle with the object it belongs to. */
  private readonly triangles: { points: V3[]; object: string; solid: string }[] = [];
  private readonly grid = new Map<string, number[]>();
  private readonly volumes: { corners: V3[]; owner: unknown }[] = [];

  /** Indexes the collidable triangles of `mesh`; the mesh is only read. */
  constructor(level: CompiledArchitecture, mesh: MeshData) {
    for (let t = 0; t < mesh.surfaces.length; t++) {
      if (level.surfaces[mesh.surfaces[t]].collidable === false) continue;
      const points = mesh.indices
        .slice(t * 3, t * 3 + 3)
        .map((i) => mesh.positions.slice(i * 3, i * 3 + 3) as V3);
      const index = this.triangles.push({
        points, object: level.surfaces[mesh.surfaces[t]].object, solid: mesh.solidIds?.[t] ?? "",
      }) - 1;
      const box = bounds(points);
      for (const key of this.cells(box)) {
        const list = this.grid.get(key);
        if (list) list.push(index);
        else this.grid.set(key, [index]);
      }
    }
  }

  /** Lists grid keys covering the horizontal extent of world bounds. */
  private cells(box: { lo: V3; hi: V3 }): string[] {
    const keys: string[] = [];
    for (let i = Math.floor(box.lo[0] / CELL); i <= Math.floor(box.hi[0] / CELL); i++)
      for (let j = Math.floor(box.lo[1] / CELL); j <= Math.floor(box.hi[1] / CELL); j++)
        keys.push(`${i},${j}`);
    return keys;
  }

  /** Registers a solid volume by its world corners; `owner` is never blocked by it. */
  addVolume(corners: V3[], owner: unknown): void {
    this.volumes.push({ corners, owner });
  }

  /**
   * Tests a world point against authored closed collision solids. The nearest
   * upward ray crossing exits a solid only when the point is inside it. Open
   * patches have no physical-solid identity and remain surface obstacles only.
   */
  contains(point: V3, exempt?: string): boolean {
    const ray = new Ray(new Vector3(...point), new Vector3(0, 0, 1));
    const hit = new Vector3();
    const nearest = new Map<string, { height: number; exits: boolean }>();
    const key = `${Math.floor(point[0] / CELL)},${Math.floor(point[1] / CELL)}`;
    for (const index of this.grid.get(key) ?? []) {
      const triangle = this.triangles[index];
      if (!triangle.solid || triangle.object === exempt) continue;
      const [a, b, c] = triangle.points;
      if (!ray.intersectTriangle(new Vector3(...a), new Vector3(...b), new Vector3(...c), false, hit)) continue;
      const previous = nearest.get(triangle.solid);
      if (previous && previous.height <= hit.z) continue;
      const normalZ = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
      nearest.set(triangle.solid, { height: hit.z, exits: normalZ > 0 });
    }
    return [...nearest.values()].some(crossing => crossing.exits);
  }

  /**
   * True when the pen-local box touches collision geometry or a foreign
   * volume. Collision triangles of the object named `exempt` are ignored.
   */
  blocked(pen: Pen, lo: V3, hi: V3, owner: unknown, exempt?: string): boolean {
    const inverse = pen.matrix.clone().invert();
    const local = (p: V3) => new Vector3(...p).applyMatrix4(inverse).toArray() as V3;
    for (const volume of this.volumes) {
      if (volume.owner === owner) continue;
      const box = bounds(volume.corners.map(local));
      if ([0, 1, 2].every((axis) => box.lo[axis] < hi[axis] && box.hi[axis] > lo[axis])) return true;
    }
    const corners: V3[] = [];
    for (const x of [lo[0], hi[0]])
      for (const y of [lo[1], hi[1]])
        for (const z of [lo[2], hi[2]]) corners.push(pen.world([x, y, z]));
    const center = lo.map((v, i) => (v + hi[i]) / 2) as V3,
      half = hi.map((v, i) => (v - lo[i]) / 2) as V3;
    const seen = new Set<number>();
    for (const key of this.cells(bounds(corners)))
      for (const index of this.grid.get(key) ?? []) {
        const triangle = this.triangles[index];
        if (seen.has(index) || triangle.object === exempt) continue;
        seen.add(index);
        if (triangleTouchesBox(triangle.points.map(local), center, half)) return true;
      }
    return false;
  }
}

/** Returns the axis-aligned bounds of a point set. */
function bounds(points: V3[]): { lo: V3; hi: V3 } {
  const lo: V3 = [Infinity, Infinity, Infinity],
    hi: V3 = [-Infinity, -Infinity, -Infinity];
  for (const p of points)
    for (let axis = 0; axis < 3; axis++) {
      lo[axis] = Math.min(lo[axis], p[axis]);
      hi[axis] = Math.max(hi[axis], p[axis]);
    }
  return { lo, hi };
}
