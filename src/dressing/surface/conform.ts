import type { V3 } from "../../architecture/types.ts";
import type { MeshData } from "../../vector/types.ts";

/** Existing vertices on a long edge must become corners before nonlinear visual displacement. */
export class ReceiverEdges {
  private readonly buckets = new Map<string, V3[]>();
  private readonly size = 0.05;

  constructor(mesh: MeshData) {
    const seen = new Set<string>();
    for (let i = 0; i < mesh.positions.length; i += 3) {
      const point = mesh.positions.slice(i, i + 3) as V3;
      const identity = point.join(",");
      if (seen.has(identity)) continue;
      seen.add(identity);
      const key = point.map(value => Math.floor(value / this.size)).join(",");
      const bucket = this.buckets.get(key) ?? [];
      bucket.push(point); this.buckets.set(key, bucket);
    }
  }

  /** Visits a segment's nearby buckets once, without scanning its three-dimensional bounding box. */
  private *candidates(a: V3, b: V3, length: number): Generator<V3> {
    const count = Math.max(1, Math.ceil(length / this.size));
    const visited = new Set<string>();
    for (let station = 0; station <= count; station++) {
      const cell = a.map((value, axis) => Math.floor((value + (b[axis] - value) * station / count) / this.size));
      // The nearest station is at most half a cell away on each axis.
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
        const key = `${cell[0] + dx},${cell[1] + dy},${cell[2] + dz}`;
        if (visited.has(key)) continue;
        visited.add(key);
        yield* this.buckets.get(key) ?? [];
      }
    }
  }

  /** Returns strictly interior collinear vertices in edge order; zero-length edges have none. */
  private points(a: V3, b: V3): V3[] {
    const delta = b.map((value, axis) => value - a[axis]);
    const lengthSquared = delta.reduce((sum, value) => sum + value * value, 0);
    if (lengthSquared < 1e-20) return [];
    const length = Math.sqrt(lengthSquared);
    const scale = Math.max(1, length, ...a.map(Math.abs), ...b.map(Math.abs));
    // Proximity is not adjacency: distinct thin rim edges must not share each other's vertices.
    const tolerance = Number.EPSILON * scale * 64;
    const found: { point: V3; t: number }[] = [];
    for (const point of this.candidates(a, b, length)) {
      const t = point.reduce((sum, value, axis) => sum + (value - a[axis]) * delta[axis], 0) / lengthSquared;
      if (t <= tolerance / length || t >= 1 - tolerance / length) continue;
      const distance = point.reduce((sum, value, axis) => sum + (value - a[axis] - t * delta[axis]) ** 2, 0);
      if (distance <= tolerance ** 2) found.push({ point, t });
    }
    const ordered = found.sort((a, b) => a.t - b.t);
    const result: V3[] = [];
    let previous = -Infinity;
    for (const item of ordered) {
      if ((item.t - previous) * length <= tolerance) continue;
      result.push(item.point); previous = item.t;
    }
    return result;
  }

  /** Inserts shared boundary vertices without adding an interior vertex or redundant center-fan faces. */
  triangles(face: V3[]): V3[][] {
    const triangles = [face];
    for (let edge = 0; edge < 3; edge++) {
      const a = face[edge], b = face[(edge + 1) % 3], interior = this.points(a, b);
      if (!interior.length) continue;
      // Earlier insertions leave each unprocessed original edge on exactly one triangle.
      const index = triangles.findIndex(triangle => triangle.includes(a) && triangle.includes(b));
      const opposite = triangles[index].find(point => point !== a && point !== b)!;
      const chain = [a, ...interior, b];
      const split = chain.slice(1).map((point, i) => [opposite, chain[i], point]);
      triangles[index] = split[0];
      for (let i = 1; i < split.length; i++) triangles.push(split[i]);
    }
    return triangles;
  }
}
