import type { V3 } from "../../architecture/types.ts";
import type { MeshData } from "../../vector/types.ts";
import type { Pen } from "../pen.ts";

const CELL = 2;
const SAMPLE = 0.15;
const TOLERANCE = 0.005;

/** Samples authored horizontal render surfaces, including noncollidable background streets. */
export class GroundSupport {
  private readonly cells = new Map<string, V3[][]>();

  /** Indexes upward horizontal triangles; neither the source mesh nor its physical meaning changes. */
  constructor(mesh: MeshData, surfaces: readonly { visible?: boolean }[]) {
    for (let index = 0; index < mesh.indices.length; index += 3) {
      if (surfaces[mesh.surfaces[index / 3]]?.visible === false) continue;
      const triangle = mesh.indices.slice(index, index + 3).map(vertex => mesh.positions.slice(vertex * 3, vertex * 3 + 3) as V3);
      const [a, b, c] = triangle;
      const area = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
      if (area <= 1e-10 || Math.max(a[2], b[2], c[2]) - Math.min(a[2], b[2], c[2]) > 0.001) continue;
      const x0 = Math.floor(Math.min(a[0], b[0], c[0]) / CELL), x1 = Math.floor(Math.max(a[0], b[0], c[0]) / CELL);
      const y0 = Math.floor(Math.min(a[1], b[1], c[1]) / CELL), y1 = Math.floor(Math.max(a[1], b[1], c[1]) / CELL);
      for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) {
        const key = `${x}/${y}`;
        const triangles = this.cells.get(key) ?? [];
        triangles.push(triangle);
        this.cells.set(key, triangles);
      }
    }
  }

  /** True when a sampled point meets an authored flat surface within five millimeters. */
  private supports([x, y, z]: V3): boolean {
    const triangles = this.cells.get(`${Math.floor(x / CELL)}/${Math.floor(y / CELL)}`) ?? [];
    return triangles.some(([a, b, c]) => {
      if (Math.abs(a[2] - z) > TOLERANCE) return false;
      const cross = (p: V3, q: V3) => (q[0] - p[0]) * (y - p[1]) - (q[1] - p[1]) * (x - p[0]);
      return cross(a, b) >= -1e-9 && cross(b, c) >= -1e-9 && cross(c, a) >= -1e-9;
    });
  }

  /**
   * Samples the full pen-local rectangle at `z`, including its edges and corners.
   * This bounds optional visual dressing; it does not establish navigation reachability.
   */
  covers(pen: Pen, x0: number, x1: number, y0: number, y1: number, z = 0): boolean {
    const columns = Math.max(1, Math.ceil((x1 - x0) / SAMPLE));
    const rows = Math.max(1, Math.ceil((y1 - y0) / SAMPLE));
    for (let column = 0; column <= columns; column++) for (let row = 0; row <= rows; row++) {
      const point = pen.world([x0 + (x1 - x0) * column / columns, y0 + (y1 - y0) * row / rows, z]);
      if (!this.supports(point)) return false;
    }
    return true;
  }
}
