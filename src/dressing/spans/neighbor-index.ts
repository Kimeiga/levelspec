import type { Anchor } from "./anchors.ts";

/** Local façade anchors indexed by horizontal reach and allowable vertical rise. */
export class AnchorIndex {
  private readonly radius: number;
  private readonly rise: number;
  private readonly cells = new Map<string, Anchor[]>();

  /** Distances are positive meters in the domain's Z-up coordinate system. */
  constructor(anchors: Anchor[], radius: number, rise: number) {
    this.radius = radius;
    this.rise = rise;
    for (const anchor of anchors) {
      const [x, y, z] = this.cell(anchor);
      const key = `${x},${y},${z}`;
      const cell = this.cells.get(key);
      if (cell) cell.push(anchor);
      else this.cells.set(key, [anchor]);
    }
  }

  /** Integer cell coordinates, including positions on the negative side of the origin. */
  private cell(anchor: Anchor): [number, number, number] {
    const [x, y, z] = anchor.position;
    return [Math.floor(x / this.radius), Math.floor(y / this.radius), Math.floor(z / this.rise)];
  }

  /** Other anchors inside the inclusive horizontal radius and vertical band, in stable order. */
  near(anchor: Anchor): Anchor[] {
    const [x, y, z] = this.cell(anchor);
    const [ax, ay, az] = anchor.position;
    const found: Anchor[] = [];
    for (let dx = -1; dx <= 1; dx++)
      for (let dy = -1; dy <= 1; dy++)
        for (let dz = -1; dz <= 1; dz++)
          for (const other of this.cells.get(`${x + dx},${y + dy},${z + dz}`) ?? []) {
            const [bx, by, bz] = other.position;
            if (other !== anchor && Math.abs(az - bz) <= this.rise && Math.hypot(ax - bx, ay - by) <= this.radius)
              found.push(other);
          }
    return found;
  }
}
