import { aborted, type MeshData, type V3 } from "./types.ts";
import { cross, sub, dot, norm, triangleOverlap } from "./geometry.ts";

/**
 * Separates float32 UV rounding at a physical coplanar T-junction. Only the
 * shared chart vertex moves, away from the opposite physical face; world corners
 * remain untouched. Strict final overlap and density audits remain authoritative.
 */
export function repairPackedSeams(
  result: { vertices: { uv: number[]; chartIndex: number }[]; indices: ArrayLike<number> },
  source: MeshData, inputTris: number[], width: number, height: number,
  allowance: number, signal?: AbortSignal, guardDisplacements: readonly number[] = [], atlasInputIds?: readonly number[],
): { vertices: number; maxTexelDisplacement: number } {
  const original = result.vertices.map(v => [...v.uv]);
  const points = inputTris.map(t => source.indices.slice(t * 3, t * 3 + 3).map(i => source.positions.slice(i * 3, i * 3 + 3) as V3));
  const atlasPoints = points.map(face => face.map(p => p.map(Math.fround) as V3));
  const charts = new Map<number, number[]>(), shared = new Map<string, Set<number>>();
  const sourceIds = atlasInputIds ? undefined : uvVertexIdentities(source.positions, signal);
  const key = (chart: number, triangle: number, corner: number) => {
    const vertex = result.indices[triangle*3+corner];
    const identity = atlasInputIds?.[vertex] ?? sourceIds![source.indices[inputTris[triangle]*3+corner]];
    return `${chart}:${identity}`;
  };
  for (let t = 0; t < inputTris.length; t++) {
    const chart = result.vertices[result.indices[t * 3]].chartIndex;
    const group = charts.get(chart) ?? []; group.push(t); charts.set(chart, group);
    for (let k = 0; k < 3; k++) {
      const id = result.indices[t * 3 + k], name = key(chart, t, k);
      const ids = shared.get(name) ?? new Set<number>(); ids.add(id); shared.set(name, ids);
    }
  }
  const uv = (t: number) => [0,1,2].map(k => [...result.vertices[result.indices[t*3+k]].uv, 0] as V3);
  const scale = (p: V3, factor: number): V3 => p.map(n => n * factor) as V3;
  let comparisons = 0;
  for (let pass = 0; pass < 8; pass++) {
    let changed = false;
    for (const [chart, triangles] of charts) for (let i = 0; i < triangles.length; i++) {
      aborted(signal);
      for (let j = i + 1; j < triangles.length; j++) {
        if (++comparisons > inputTris.length * 4096) throw new Error('UV seam comparison budget exceeded.');
        if ((comparisons & 1023) === 0) aborted(signal);
        const a = triangles[i], b = triangles[j];
        if (triangleOverlap(uv(a), uv(b)) <= 1e-12 * width * height) continue;
        for (const [own, other] of [[a,b],[b,a]]) {
          const face = points[other], normal = cross(sub(face[1], face[0]), sub(face[2], face[0]));
          const size = Math.hypot(...normal); if (size <= 1e-14) continue;
          const n = scale(normal, 1 / size), tolerance = Math.max(1, ...face.flat().map(Math.abs)) * 2 ** -23;
          if (points[own].some(p => Math.abs(dot(sub(p, face[0]), n)) > tolerance)) continue;
          for (let corner = 0; corner < 3; corner++) for (let edge = 0; edge < 3; edge++) {
            const p = atlasPoints[own][corner], start = atlasPoints[other][edge], end = atlasPoints[other][(edge+1)%3], direction = sub(end, start);
            const lengthSquared = dot(direction, direction), atlasFraction = lengthSquared > 0 ? dot(sub(p, start), direction) / lengthSquared : 0;
            const rawDirection = sub(face[(edge+1)%3], face[edge]), rawLength = Math.hypot(...rawDirection);
            const rawFraction = dot(sub(points[own][corner],face[edge]),rawDirection) / (rawLength*rawLength);
            // Station projection adds subtraction and dot-product roundoff beyond vertex identity.
            const endpointRoundoff = Math.max(1,...face.flat().map(Math.abs)) * Number.EPSILON * 64 / rawLength;
            if (rawFraction < -endpointRoundoff || rawFraction > 1 + endpointRoundoff) continue;
            if (key(chart,own,corner) === key(chart,other,edge) || key(chart,own,corner) === key(chart,other,(edge+1)%3)) continue;
            const fraction = Math.max(0,Math.min(1,rawFraction));
            const closest = start.map((value, axis) => value + Math.max(0,Math.min(1,atlasFraction)) * direction[axis]) as V3;
            if (Math.hypot(...sub(p, closest)) > tolerance) continue;
            const inward = norm(cross(n, sub(face[(edge+1)%3], face[edge])));
            const side = dot(sub(face[(edge+2)%3], face[edge]), inward);
            const ownSides = points[own].map(q => dot(sub(q, face[edge]), inward) * Math.sign(side));
            const rawTolerance = Math.max(1, ...face.flat().map(Math.abs)) * Number.EPSILON * 16;
            if (ownSides.some(value => value > rawTolerance) || !ownSides.some(value => value < -rawTolerance)) continue;
            const otherUv = uv(other), u = otherUv[edge], v = otherUv[(edge+1)%3], third = otherUv[(edge+2)%3];
            const du = v[0]-u[0], dv = v[1]-u[1], length = Math.hypot(du,dv); if (length < 1e-10) continue;
            const sign = Math.sign(du*(third[1]-u[1])-dv*(third[0]-u[0]));
            const toward: [number, number] = [-dv / length * sign, du / length * sign];
            const id = result.indices[own*3+corner], current = result.vertices[id].uv;
            const penetration = (current[0]-u[0])*toward[0] + (current[1]-u[1])*toward[1];
            const margin = Math.max(width, height) * 2 ** -23;
            const edgeStart = result.indices[other*3+edge], edgeEnd = result.indices[other*3+(edge+1)%3];
            // Repacking preserves guard displacement; normal projection combines both UV axes.
            const guardBound = (guardDisplacements[id] ?? 0)
              + (1-fraction) * (guardDisplacements[edgeStart] ?? 0) + fraction * (guardDisplacements[edgeEnd] ?? 0);
            if (penetration < -margin / 2 || penetration > guardBound + margin * 4 * Math.SQRT2) continue;
            const next = current.map((value, axis) => value - toward[axis] * (penetration + margin));
            const rounded = [Math.fround(next[0]/width)*width, Math.fround(next[1]/height)*height];
            const ids = [...shared.get(key(chart,own,corner))!];
            if (ids.some(index => Math.hypot(rounded[0]-original[index][0], rounded[1]-original[index][1]) > allowance)) continue;
            for (const index of ids) result.vertices[index].uv = [...rounded];
            changed = true;
          }
        }
      }
    }
    if (!changed) break;
  }
  const displacement = result.vertices.map((v,i) => Math.hypot(v.uv[0]-original[i][0],v.uv[1]-original[i][1]));
  return { vertices: displacement.filter(d => d > 1e-12).length, maxTexelDisplacement: displacement.reduce((maximum, value) => Math.max(maximum,value), 0) };
}

/**
 * Identifies atlas-input vertices within 16 × machine epsilon × coordinate scale
 * of source roundoff. Float32-equal but genuinely distinct source vertices stay separate,
 * preserving tiny faces for the UV precision guard. Source coordinates never move.
 */
export function uvVertexIdentities(positions: readonly number[], signal?: AbortSignal): number[] {
  const identities: number[] = [], buckets = new Map<string, { point: V3; id: number }[]>();
  const scale = positions.reduce((maximum, coordinate) => Math.max(maximum, Math.abs(coordinate)), 1);
  if (!Number.isFinite(scale)) throw new Error('Atlas input requires finite coordinates.');
  const cellWidth = scale * Number.EPSILON * 16;
  let comparisons = 0;
  for (let i = 0; i < positions.length; i += 3) {
    aborted(signal);
    const point = positions.slice(i,i+3) as V3, cell = point.map(value => Math.floor(value/cellWidth));
    const axes = cell.map(value => [value-1,value,value+1]);
    let identity: number | undefined;
    search: for (const x of axes[0]) for (const y of axes[1]) for (const z of axes[2]) {
      for (const candidate of buckets.get(`${x},${y},${z}`) ?? []) {
        if (++comparisons > positions.length * 64) throw new Error('UV vertex identity comparison budget exceeded.');
        const tolerance = Math.max(1,...point.map(Math.abs),...candidate.point.map(Math.abs)) * Number.EPSILON * 16;
        if (Math.hypot(...sub(point,candidate.point)) <= tolerance) { identity = candidate.id; break search; }
      }
    }
    if (identity === undefined) {
      identity = i / 3;
      const key = cell.join(','), bucket = buckets.get(key) ?? [];
      bucket.push({ point, id: identity }); buckets.set(key,bucket);
    }
    identities.push(identity);
  }
  return identities;
}
