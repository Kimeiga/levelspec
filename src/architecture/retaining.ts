import { floorBoundarySpans } from "../vector/floor-gaps.ts";
import { area, cross, dot, lerp, norm, pathAt, pathLength, sub } from "../vector/geometry.ts";
import type { AssetGeometry } from "../vector/props.ts";
import type { FloorPatch } from "../vector/types.ts";
import { surfaceSolid } from "./geometry.ts";
import type { RetainingWall, V3 } from "./types.ts";

/** Fills only the exposed contact below the upper slab, retaining exact stepped boundary spans. */
export function retainingGeometry(element: RetainingWall, lower: V3[], upper: V3[], lowerFloor?: FloorPatch, upperFloor?: FloorPatch, upperThickness = .2, filledStairBottom?: number): AssetGeometry[] {
  if (Math.hypot(lower[0][0] - upper[0][0], lower[0][1] - upper[0][1]) > 1e-7) upper = [...upper].reverse();
  if (Math.abs(pathLength(lower) - pathLength(upper)) > .01) throw new Error("Retaining boundaries must have matching plan lengths.");
  const offsets = lower.map((_, i) => {
    const before = norm(sub(lower[Math.max(1, i)], lower[Math.max(1, i) - 1]));
    const after = norm(sub(lower[Math.min(lower.length - 1, i + 1)], lower[Math.min(lower.length - 1, i + 1) - 1]));
    const n0 = norm([-before[1], before[0], 0]), n1 = norm([-after[1], after[0], 0]), bisector = norm([n0[0] + n1[0], n0[1] + n1[1], 0]), denominator = dot(bisector, n0);
    if (denominator < .25) throw new Error("Retaining path turns too sharply for its thickness.");
    return bisector.map(value => value * element.thickness / 2 / denominator) as V3;
  });
  const result: AssetGeometry[] = [];
  for (let i = 1; i < lower.length; i++) {
    const a = lower[i - 1], b = lower[i], h0 = pathAt(upper, pathLength(lower.slice(0, i))), h1 = pathAt(upper, pathLength(lower.slice(0, i + 1)));
    const lowerSpans = lowerFloor ? floorBoundarySpans(lowerFloor, a, b) : [], upperSpans = upperFloor ? floorBoundarySpans(upperFloor, h0, h1) : [];
    const cuts = [...new Set([0, 1, ...lowerSpans.flatMap(span => [span.start, span.end]), ...upperSpans.flatMap(span => [span.start, span.end])].map(value => Math.max(0, Math.min(1, value))))].sort((a, b) => a - b);
    for (let s = 1; s < cuts.length; s++) {
      const start = cuts[s - 1], end = cuts[s], midpoint = (start + end) / 2;
      if (end - start < 1e-9) continue;
      const lowSpan = lowerSpans.find(span => midpoint >= span.start && midpoint <= span.end), highSpan = upperSpans.find(span => midpoint >= span.start && midpoint <= span.end);
      if (lowerFloor && !lowSpan || upperFloor && !highSpan) throw new Error("Cannot resolve actual stepped retaining contact.");
      let A = lerp(a, b, start), B = lerp(a, b, end), n0 = lerp(offsets[i - 1], offsets[i], start), n1 = lerp(offsets[i - 1], offsets[i], end);
      if (lowSpan) { A[2] = lowSpan.z0 + lowSpan.dz * start; B[2] = lowSpan.z0 + lowSpan.dz * end; }
      let top0 = filledStairBottom ?? lerp(h0, h1, start)[2] + (element.mode === "wall" ? element.height : -upperThickness);
      let top1 = filledStairBottom ?? lerp(h0, h1, end)[2] + (element.mode === "wall" ? element.height : -upperThickness);
      if (highSpan) { top0 = highSpan.z0 + highSpan.dz * start - upperThickness; top1 = highSpan.z0 + highSpan.dz * end - upperThickness; }
      const gap0 = top0 - A[2], gap1 = top1 - B[2];
      if (element.mode === "open") {
        if (gap0 <= 1e-7 && gap1 <= 1e-7) continue;
        if (gap0 < 0) { const t = gap0 / (gap0 - gap1); A = lerp(A, B, t); top0 = A[2]; n0 = lerp(n0, n1, t); }
        else if (gap1 < 0) { const t = gap0 / (gap0 - gap1); B = lerp(A, B, t); top1 = B[2]; n1 = lerp(n0, n1, t); }
      }
      if (Math.hypot(A[0] - lerp(h0, h1, start)[0], A[1] - lerp(h0, h1, start)[1]) > .01 && gap0 >= 0) throw new Error("Retaining paths differ in plan.");
      for (const sign of [1, -1]) {
        let base: V3[] = [[A[0] + sign * n0[0], A[1] + sign * n0[1], A[2]], A, B, [B[0] + sign * n1[0], B[1] + sign * n1[1], B[2]]];
        let top: V3[] = base.map((point, j) => [point[0], point[1], j < 2 ? top0 : top1]);
        if (area(base) < 0) { base = [...base].reverse(); top = [...top].reverse(); }
        const heights = new Map(base.map(point => [`${point[0]},${point[1]}`, point[2]]));
        const geometry = surfaceSolid({ points: top, triangles: [[0, 1, 2], [0, 2, 3]], loops: [top] }, point => [point[0], point[1], heights.get(`${point[0]},${point[1]}`)!]);
        geometry.triangles = geometry.triangles.filter(indices => {
          const [a, b, c] = indices.map(index => geometry.positions[index]); return Math.hypot(...cross(sub(b, a), sub(c, a))) > 1e-12;
        });
        result.push(geometry);
      }
    }
  }
  return result;
}
