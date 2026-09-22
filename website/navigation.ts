import type { NavigationReport, V3 } from "../src/vector/types.ts";
interface Triangle {
  p: V3[];
  center: V3;
  neighbors: number[];
}
/** A constrained inspection walk, not a physics engine. Uses the eroded Recast mesh. */
export class NavigationSurface {
  readonly triangles: Triangle[] = [];
  readonly reachable = new Set<number>();
  constructor(nav: Pick<NavigationReport, "positions" | "indices">, spawn: V3) {
    const edges = new Map<string, number[]>();
    const key = (p: V3) => p.map((n) => Math.round(n * 10000)).join(",");
    for (let i = 0; i < nav.indices.length; i += 3) {
      const p = nav.indices
        .slice(i, i + 3)
        .map((n) => nav.positions.slice(n * 3, n * 3 + 3) as V3);
      const id = this.triangles.length;
      this.triangles.push({
        p,
        center: [0, 1, 2].map((a) => (p[0][a] + p[1][a] + p[2][a]) / 3) as V3,
        neighbors: [],
      });
      for (let j = 0; j < 3; j++) {
        const k = [key(p[j]), key(p[(j + 1) % 3])].sort().join("|");
        const owners = edges.get(k) ?? [];
        owners.push(id);
        edges.set(k, owners);
      }
    }
    for (const owners of edges.values())
      for (const a of owners)
        for (const b of owners)
          if (a !== b) this.triangles[a].neighbors.push(b);
    const seed = this.locate(spawn, false);
    if (seed) {
      const queue = [seed.index];
      this.reachable.add(seed.index);
      for (let i = 0; i < queue.length; i++)
        for (const n of this.triangles[queue[i]].neighbors)
          if (!this.reachable.has(n)) {
            this.reachable.add(n);
            queue.push(n);
          }
    }
  }
  locate(
    point: V3,
    reachableOnly = true,
    vertical = 0.65,
  ): { index: number; point: V3 } | undefined {
    let best: { index: number; point: V3 } | undefined,
      dist = vertical;
    for (let index = 0; index < this.triangles.length; index++) {
      if (reachableOnly && !this.reachable.has(index)) continue;
      const [a, b, c] = this.triangles[index].p;
      const den = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]);
      if (Math.abs(den) < 1e-10) continue;
      const u =
        ((b[1] - c[1]) * (point[0] - c[0]) +
          (c[0] - b[0]) * (point[1] - c[1])) /
        den;
      const v =
        ((c[1] - a[1]) * (point[0] - c[0]) +
          (a[0] - c[0]) * (point[1] - c[1])) /
        den;
      if (u < -1e-6 || v < -1e-6 || u + v > 1 + 1e-6) continue;
      const z = u * a[2] + v * b[2] + (1 - u - v) * c[2],
        d = Math.abs(z - point[2]);
      if (d <= dist) {
        dist = d;
        best = { index, point: [point[0], point[1], z] };
      }
    }
    return best;
  }
  move(start: V3, dx: number, dy: number): V3 {
    if (![...start, dx, dy].every(Number.isFinite)) return start;
    const count = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 0.04));
    if (count > 1000) return start;
    let p = [...start] as V3;
    for (let i = 0; i < count; i++) {
      const x = dx / count,
        y = dy / count;
      const full = this.locate([p[0] + x, p[1] + y, p[2]], true, 0.46);
      if (full) {
        p = full.point;
        continue;
      }
      const slideX = this.locate([p[0] + x, p[1], p[2]], true, 0.46);
      if (slideX) p = slideX.point;
      const slideY = this.locate([p[0], p[1] + y, p[2]], true, 0.46);
      if (slideY) p = slideY.point;
    }
    return p;
  }
}
