import type { V3 } from "../../architecture/types.ts";
import type { MeshData, Surface } from "../../vector/types.ts";

/** Smallest obstruction lookup cell, meters; large levels use coarser cells. */
const MINIMUM_CELL = 1.25;
/** Upper bound on lookup cells, which bounds memory on very large levels. */
const MAXIMUM_CELLS = 2_000_000;
/** Plan size of the walking-surface lookup cells, meters. */
const FLOOR_CELL = 2;

/**
 * Tests whether the segment `a`–`b` crosses the triangle stored as nine
 * numbers at `offset`. Both faces count, and touching an edge counts.
 */
function segmentCrosses(
  a: V3,
  b: V3,
  corners: ArrayLike<number>,
  offset: number,
): boolean {
  const x0 = corners[offset],
    y0 = corners[offset + 1],
    z0 = corners[offset + 2];
  const e1x = corners[offset + 3] - x0,
    e1y = corners[offset + 4] - y0,
    e1z = corners[offset + 5] - z0;
  const e2x = corners[offset + 6] - x0,
    e2y = corners[offset + 7] - y0,
    e2z = corners[offset + 8] - z0;
  const dx = b[0] - a[0],
    dy = b[1] - a[1],
    dz = b[2] - a[2];
  const px = dy * e2z - dz * e2y,
    py = dz * e2x - dx * e2z,
    pz = dx * e2y - dy * e2x;
  const determinant = e1x * px + e1y * py + e1z * pz;
  if (Math.abs(determinant) < 1e-12) return false;
  const inverse = 1 / determinant;
  const sx = a[0] - x0,
    sy = a[1] - y0,
    sz = a[2] - z0;
  const u = (sx * px + sy * py + sz * pz) * inverse;
  if (u < 0 || u > 1) return false;
  const qx = sy * e1z - sz * e1y,
    qy = sz * e1x - sx * e1z,
    qz = sx * e1y - sy * e1x;
  const v = (dx * qx + dy * qy + dz * qz) * inverse;
  if (v < 0 || u + v > 1) return false;
  const t = (e2x * qx + e2y * qy + e2z * qz) * inverse;
  return t >= 0 && t <= 1;
}

/** Returns the world corners of every visible triangle of `mesh`, nine numbers each. */
export function visibleCorners(mesh: MeshData, surfaces: Surface[]): Float64Array {
  const included: number[] = [];
  for (let t = 0; t < mesh.surfaces.length; t++)
    if (surfaces[mesh.surfaces[t]].visible !== false) included.push(t);
  const corners = new Float64Array(included.length * 9);
  included.forEach((t, index) => {
    for (let corner = 0; corner < 3; corner++)
      for (let axis = 0; axis < 3; axis++)
        corners[index * 9 + corner * 3 + axis] = mesh.positions[mesh.indices[t * 3 + corner] * 3 + axis];
  });
  return corners;
}

/**
 * Answers whether a straight segment would pass through any of a fixed set
 * of triangles, and which triangles lie near a box. Spans index the render
 * mesh as it stands when they are planned, so the finished walls, buildings
 * and their fixtures all obstruct. Sheets reserved later, such as hung
 * washing, obstruct the segments tested after them.
 */
export class Obstructions {
  /** World corners of the indexed triangles, nine numbers each, meters; only read. */
  readonly corners: Float64Array;
  private readonly origin: V3 = [0, 0, 0];
  private readonly cell: number;
  private readonly counts: [number, number, number] = [1, 1, 1];
  private readonly starts: Int32Array;
  private readonly members: Int32Array;
  private readonly visited: Int32Array;
  private pass = 0;
  private readonly reserved: number[] = [];

  /** Indexes triangles given as nine world coordinates each; the array is kept, not copied. */
  constructor(corners: Float64Array) {
    this.corners = corners;
    const triangles = corners.length / 9;
    const lo: V3 = [Infinity, Infinity, Infinity],
      hi: V3 = [-Infinity, -Infinity, -Infinity];
    for (let index = 0; index < corners.length; index++) {
      const axis = index % 3;
      lo[axis] = Math.min(lo[axis], corners[index]);
      hi[axis] = Math.max(hi[axis], corners[index]);
    }
    if (!triangles) lo.fill(0), hi.fill(0);
    const extent = hi.map((value, axis) => value - lo[axis] + 1e-6);
    this.cell = Math.max(
      MINIMUM_CELL,
      Math.cbrt((extent[0] * extent[1] * extent[2]) / MAXIMUM_CELLS),
    );
    for (let axis = 0; axis < 3; axis++) {
      this.origin[axis] = lo[axis];
      this.counts[axis] = Math.max(1, Math.ceil(extent[axis] / this.cell));
    }
    const total = this.counts[0] * this.counts[1] * this.counts[2];
    this.starts = new Int32Array(total + 1);
    this.eachCell(triangles, (cell) => this.starts[cell + 1]++);
    for (let cell = 0; cell < total; cell++)
      this.starts[cell + 1] += this.starts[cell];
    this.members = new Int32Array(this.starts[total]);
    const next = this.starts.slice(0, total);
    this.eachCell(triangles, (cell, index) => {
      this.members[next[cell]++] = index;
    });
    this.visited = new Int32Array(triangles);
  }

  /** Indexes every visible triangle of `mesh`; the mesh is only read. */
  static ofMesh(mesh: MeshData, surfaces: Surface[]): Obstructions {
    return new Obstructions(visibleCorners(mesh, surfaces));
  }

  /** Visits every lookup cell overlapped by each of the first `count` triangles' bounds. */
  private eachCell(
    count: number,
    visit: (cell: number, triangle: number) => void,
  ): void {
    const range = [0, 0, 0, 0, 0, 0];
    for (let index = 0; index < count; index++) {
      for (let axis = 0; axis < 3; axis++) {
        const a = this.corners[index * 9 + axis],
          b = this.corners[index * 9 + 3 + axis],
          c = this.corners[index * 9 + 6 + axis];
        range[axis * 2] = this.cellIndex(Math.min(a, b, c), axis);
        range[axis * 2 + 1] = this.cellIndex(Math.max(a, b, c), axis);
      }
      for (let i = range[0]; i <= range[1]; i++)
        for (let j = range[2]; j <= range[3]; j++)
          for (let k = range[4]; k <= range[5]; k++)
            visit((k * this.counts[1] + j) * this.counts[0] + i, index);
    }
  }

  /** Returns the lookup cell along one axis, clamped into the indexed bounds. */
  private cellIndex(value: number, axis: number): number {
    const index = Math.floor((value - this.origin[axis]) / this.cell);
    return Math.min(this.counts[axis] - 1, Math.max(0, index));
  }

  /** True when the segment from `a` to `b` touches visible geometry or a reserved sheet. */
  blocked(a: V3, b: V3): boolean {
    this.pass++;
    const steps = Math.max(
      1,
      Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) / this.cell),
    );
    const range = [0, 0, 0, 0, 0, 0];
    for (let step = 0; step < steps; step++) {
      for (let axis = 0; axis < 3; axis++) {
        const p = a[axis] + ((b[axis] - a[axis]) * step) / steps,
          q = a[axis] + ((b[axis] - a[axis]) * (step + 1)) / steps;
        range[axis * 2] = this.cellIndex(Math.min(p, q), axis);
        range[axis * 2 + 1] = this.cellIndex(Math.max(p, q), axis);
      }
      for (let i = range[0]; i <= range[1]; i++)
        for (let j = range[2]; j <= range[3]; j++)
          for (let k = range[4]; k <= range[5]; k++) {
            const cell = (k * this.counts[1] + j) * this.counts[0] + i;
            for (let m = this.starts[cell]; m < this.starts[cell + 1]; m++) {
              const index = this.members[m];
              if (this.visited[index] === this.pass) continue;
              this.visited[index] = this.pass;
              if (segmentCrosses(a, b, this.corners, index * 9)) return true;
            }
          }
    }
    for (let offset = 0; offset < this.reserved.length; offset += 9)
      if (segmentCrosses(a, b, this.reserved, offset)) return true;
    return false;
  }

  /** True when any piece of the polyline through `points` is blocked. */
  blockedPath(points: V3[]): boolean {
    for (let i = 0; i + 1 < points.length; i++)
      if (this.blocked(points[i], points[i + 1])) return true;
    return false;
  }

  /**
   * Lists the indexed triangles whose lookup cells overlap the world box from
   * `lo` to `hi`, each once, as offsets into `corners`. Reserved sheets are
   * not listed.
   */
  near(lo: V3, hi: V3): number[] {
    this.pass++;
    const range = [0, 0, 0, 0, 0, 0];
    for (let axis = 0; axis < 3; axis++) {
      range[axis * 2] = this.cellIndex(lo[axis], axis);
      range[axis * 2 + 1] = this.cellIndex(hi[axis], axis);
    }
    const found: number[] = [];
    for (let i = range[0]; i <= range[1]; i++)
      for (let j = range[2]; j <= range[3]; j++)
        for (let k = range[4]; k <= range[5]; k++) {
          const cell = (k * this.counts[1] + j) * this.counts[0] + i;
          for (let m = this.starts[cell]; m < this.starts[cell + 1]; m++) {
            const index = this.members[m];
            if (this.visited[index] === this.pass) continue;
            this.visited[index] = this.pass;
            found.push(index * 9);
          }
        }
    return found;
  }

  /**
   * True when an edge of any indexed triangle passes through the flat
   * quadrilateral `quad`. This finds thin parts such as cables, which pierce
   * a sheet between the lines `blocked` probes along its outline.
   */
  pierced(quad: V3[]): boolean {
    const lo = [0, 1, 2].map((axis) => Math.min(...quad.map((p) => p[axis]))) as V3,
      hi = [0, 1, 2].map((axis) => Math.max(...quad.map((p) => p[axis]))) as V3;
    const sheet = [...quad[0], ...quad[1], ...quad[2], ...quad[0], ...quad[2], ...quad[3]];
    const corner = (offset: number): V3 => [this.corners[offset], this.corners[offset + 1], this.corners[offset + 2]];
    for (const offset of this.near(lo, hi)) {
      const points = [corner(offset), corner(offset + 3), corner(offset + 6)];
      for (let edge = 0; edge < 3; edge++) {
        const a = points[edge],
          b = points[(edge + 1) % 3];
        if (segmentCrosses(a, b, sheet, 0) || segmentCrosses(a, b, sheet, 9)) return true;
      }
    }
    return false;
  }

  /** Makes a flat quadrilateral sheet obstruct every span tested from now on. */
  reserve(quad: V3[]): void {
    this.reserved.push(...quad[0], ...quad[1], ...quad[2]);
    this.reserved.push(...quad[0], ...quad[2], ...quad[3]);
  }
}

/**
 * Looks up the walking surface beneath a point: collidable floors and stairs
 * of the physical mesh. Spans keep their clearance above these, not above
 * visual roofs or wall tops nobody walks on.
 */
export class WalkingSurfaces {
  private readonly triangles: V3[][] = [];
  private readonly cells = new Map<string, number[]>();

  /** Indexes the upward-facing floor and stair triangles of `physical`; it is only read. */
  constructor(physical: MeshData, surfaces: Surface[]) {
    for (let t = 0; t < physical.surfaces.length; t++) {
      const surface = surfaces[physical.surfaces[t]];
      if (surface.collidable === false) continue;
      if (surface.kind !== "floor" && surface.kind !== "stairs") continue;
      const points = [0, 1, 2].map((corner) => {
        const index = physical.indices[t * 3 + corner] * 3;
        return physical.positions.slice(index, index + 3) as V3;
      });
      const [a, b, c] = points;
      const across =
        (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
      const steepness = Math.hypot(
        (b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]),
        (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]),
      );
      // Keeps faces whose normal rises more than it leans: tops, treads and ramps.
      if (across <= steepness) continue;
      const index = this.triangles.push(points) - 1;
      const xs = points.map((p) => p[0]),
        ys = points.map((p) => p[1]);
      for (let i = Math.floor(Math.min(...xs) / FLOOR_CELL); i <= Math.floor(Math.max(...xs) / FLOOR_CELL); i++)
        for (let j = Math.floor(Math.min(...ys) / FLOOR_CELL); j <= Math.floor(Math.max(...ys) / FLOOR_CELL); j++) {
          const key = `${i},${j}`;
          const cell = this.cells.get(key);
          if (cell) cell.push(index);
          else this.cells.set(key, [index]);
        }
    }
  }

  /**
   * Returns the elevation of the highest walking surface under `point` that
   * is not more than 5 cm above it, or undefined where nothing lies beneath.
   */
  below(point: V3): number | undefined {
    const key = `${Math.floor(point[0] / FLOOR_CELL)},${Math.floor(point[1] / FLOOR_CELL)}`;
    let highest: number | undefined;
    for (const index of this.cells.get(key) ?? []) {
      const [a, b, c] = this.triangles[index];
      const area =
        (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
      const wb =
        ((point[0] - a[0]) * (c[1] - a[1]) - (point[1] - a[1]) * (c[0] - a[0])) / area;
      const wc =
        ((b[0] - a[0]) * (point[1] - a[1]) - (b[1] - a[1]) * (point[0] - a[0])) / area;
      if (wb < -1e-9 || wc < -1e-9 || wb + wc > 1 + 1e-9) continue;
      const z = a[2] + wb * (b[2] - a[2]) + wc * (c[2] - a[2]);
      if (z <= point[2] + 0.05 && (highest === undefined || z > highest)) highest = z;
    }
    return highest;
  }

  /** True when `point` is at least `clearance` meters above the walking surface beneath it. */
  clears(point: V3, clearance: number): boolean {
    const floor = this.below(point);
    return floor === undefined || point[2] - floor >= clearance;
  }
}
