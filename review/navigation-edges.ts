import type { V3 } from '../src/vector/types.ts';

interface Edge { owner: number; a: V3; b: V3; axis: number; slope: number[]; anchor: number[]; min: number; max: number }
interface Interval { edge: Edge; maximum: number; left?: Interval; right?: Interval }

/** Builds a balanced interval index so a long edge does not force quadratic rescans. */
function intervals(edges: Edge[], start = 0, end = edges.length): Interval | undefined {
  if (start === end) return;
  const middle = (start + end) >>> 1, left = intervals(edges, start, middle), right = intervals(edges, middle + 1, end), edge = edges[middle];
  return { edge, left, right, maximum: Math.max(edge.max, left?.maximum ?? -Infinity, right?.maximum ?? -Infinity) };
}

/**
 * Connects actual positive-length shared 3D segments, including T-junctions.
 * The 10-micrometer comparison tolerance bounds float32 export noise, not player
 * clearance or gap repair. Coordinates and source navigation triangles are unchanged.
 */
export function navigationNeighbors(triangles: { p: V3[] }[]): number[][] {
  const tolerance = 1e-5, edges: Edge[] = [], buckets = new Map<string, Edge[]>(), exact = new Map<string, Edge[]>();
  const neighbors = triangles.map(() => new Set<number>());
  const key = (axis: number, slope: number[], anchor: number[]) => `${axis}:${slope.join(',')}:${anchor.join(',')}`;
  for (let owner = 0; owner < triangles.length; owner++) for (let i = 0; i < 3; i++) {
    const a = triangles[owner].p[i], b = triangles[owner].p[(i + 1) % 3], delta = b.map((n, axis) => n - a[axis]);
    const axis = delta.map(Math.abs).indexOf(Math.max(...delta.map(Math.abs)));
    if (Math.abs(delta[axis]) < 1e-10) continue;
    const others = [0, 1, 2].filter(index => index !== axis), slope = others.map(index => delta[index] / delta[axis]), anchor = others.map((index, i) => a[index] - slope[i] * a[axis]);
    const edge: Edge = { owner, a, b, axis, slope, anchor, min: Math.min(a[axis], b[axis]), max: Math.max(a[axis], b[axis]) };
    edges.push(edge);
    const id = [a.join(','), b.join(',')].sort().join('|'), bucket = exact.get(id) ?? [];
    bucket.push(edge); exact.set(id, bucket);
  }
  let comparisons = 0;
  const indexed: Edge[] = [];
  for (const group of exact.values()) {
    if (group.length > 1) {
      for (const a of group) for (const b of group) if (a.owner !== b.owner) {
        if (++comparisons > Math.max(10000, edges.length * 128)) throw new Error("Navigation shared-edge comparison budget exceeded.");
        neighbors[a.owner].add(b.owner);
      }
    } else {
      const edge = group[0], delta = edge.b.map((n, axis) => n - edge.a[axis]), maximum = Math.max(...delta.map(Math.abs));
      for (let axis = 0; axis < 3; axis++) {
        if (Math.abs(delta[axis]) < maximum / 2) continue;
        const others = [0, 1, 2].filter(i => i !== axis), slope = others.map(i => delta[i] / delta[axis]), anchor = others.map((i, j) => edge.a[i] - slope[j] * edge.a[axis]);
        const variant: Edge = { ...edge, axis, slope, anchor, min: Math.min(edge.a[axis], edge.b[axis]), max: Math.max(edge.a[axis], edge.b[axis]) };
        indexed.push(variant);
        const id = key(axis, slope.map(n => Math.round(n * 1e5)), anchor.map(n => Math.round(n * 1e4))), bucket = buckets.get(id) ?? [];
        bucket.push(variant); buckets.set(id, bucket);
      }
    }
  }
  const trees = new Map([...buckets].map(([id, bucket]) => [id, intervals(bucket.sort((a, b) => a.min - b.min))]));
  const compare = (a: Edge, b: Edge) => {
    if (a.owner === b.owner || Math.min(a.max, b.max) - Math.max(a.min, b.min) <= tolerance) return;
    if (++comparisons > Math.max(10000, edges.length * 128)) throw new Error('Navigation shared-edge comparison budget exceeded.');
    const others = [0, 1, 2].filter(index => index !== a.axis);
    const coincident = [b.a, b.b].every(p => others.every((axis, i) => Math.abs(p[axis] - (a.slope[i] * p[a.axis] + a.anchor[i])) <= tolerance));
    if (!coincident) return;
    neighbors[a.owner].add(b.owner); neighbors[b.owner].add(a.owner);
  };
  const query = (tree: Interval | undefined, edge: Edge): void => {
    if (!tree || tree.maximum <= edge.min + tolerance) return;
    query(tree.left, edge);
    if (tree.edge.min >= edge.max - tolerance) return;
    compare(edge, tree.edge); query(tree.right, edge);
  };
  for (const edge of indexed) {
    const slope = edge.slope.map(n => Math.round(n * 1e5)), anchor = edge.anchor.map(n => Math.round(n * 1e4));
    for (const a of [-1, 0, 1]) for (const b of [-1, 0, 1]) for (const c of [-1, 0, 1]) for (const d of [-1, 0, 1]) {
      query(trees.get(key(edge.axis, [slope[0] + a, slope[1] + b], [anchor[0] + c, anchor[1] + d])), edge);
    }
  }
  return neighbors.map(set => [...set]);
}
