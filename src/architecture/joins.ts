import { area, norm } from "../vector/geometry.ts";
import type { AssetGeometry } from "../vector/props.ts";
import type { V3 } from "./types.ts";
import { surfaceSolid } from "./geometry.ts";

export interface WallIncident {
  owner: string;
  point: V3;
  direction: V3;
  thickness: number;
  bottom: number;
  top: number;
}

/** Fills exterior offset wedges inside one explicit assembly, never across a vertical gap. */
export function wallJoins(incidents: WallIncident[]): { owner: string; geometry: AssetGeometry }[] {
  const nodes = new Map<string, WallIncident[]>();
  for (const incident of incidents) {
    const key = incident.point.slice(0, 2).map(n => n.toFixed(7)).join(",");
    nodes.set(key, [...(nodes.get(key) ?? []), incident]);
  }
  const result: { owner: string; geometry: AssetGeometry }[] = [];
  for (const entries of nodes.values()) {
    const heights = [...new Set(entries.flatMap(entry => [entry.bottom, entry.top]))].sort((a, b) => a - b);
    for (let h = 1; h < heights.length; h++) {
      const bottom = heights[h - 1], top = heights[h]; if (top - bottom < 1e-7) continue;
      const directions = new Map<string, WallIncident>();
      for (const entry of entries.filter(entry => entry.bottom < top - 1e-7 && entry.top > bottom + 1e-7)) {
        const key = entry.direction.slice(0, 2).map(n => n.toFixed(7)).join(",");
        if ((directions.get(key)?.thickness ?? 0) < entry.thickness) directions.set(key, entry);
      }
      const active = [...directions.values()].sort((a, b) => Math.atan2(a.direction[1], a.direction[0]) - Math.atan2(b.direction[1], b.direction[0]));
      if (active.length < 2) continue;
      for (let i = 0; i < active.length; i++) {
        const a = active[i], b = active[(i + 1) % active.length], u = a.direction, v = b.direction;
        let angle = Math.atan2(v[1], v[0]) - Math.atan2(u[1], u[0]); if (angle <= 0) angle += Math.PI * 2;
        if (angle < Math.PI + 1e-7) continue;
        const p: V3 = [a.point[0], a.point[1], bottom];
        const A: V3 = [p[0] - u[1] * a.thickness / 2, p[1] + u[0] * a.thickness / 2, bottom];
        const B: V3 = [p[0] + v[1] * b.thickness / 2, p[1] - v[0] * b.thickness / 2, bottom];
        const denominator = u[0] * v[1] - u[1] * v[0]; if (Math.abs(denominator) < 1e-7) continue;
        const t = ((B[0] - A[0]) * v[1] - (B[1] - A[1]) * v[0]) / denominator;
        const intersection: V3 = [A[0] + u[0] * t, A[1] + u[1] * t, bottom];
        let base = [p, A, ...(Math.hypot(intersection[0] - p[0], intersection[1] - p[1]) <= 2 * Math.max(a.thickness, b.thickness) ? [intersection] : []), B];
        if (area(base) < 0) base = base.reverse();
        const points: V3[] = base.map(point => [point[0], point[1], top]);
        const triangles = Array.from({ length: points.length - 2 }, (_, i): [number, number, number] => [0, i + 1, i + 2]);
        result.push({ owner: a.owner, geometry: surfaceSolid({ points, triangles, loops: [points] }, point => [point[0], point[1], bottom]) });
      }
    }
  }
  return result;
}

/** Endpoint incidents use horizontal path direction and actual authored height spans. */
export function endpointIncident(owner: string, point: V3, adjacent: V3, thickness: number, top: number): WallIncident {
  return { owner, point, direction: norm([adjacent[0] - point[0], adjacent[1] - point[1], 0]), thickness, bottom: point[2], top };
}
