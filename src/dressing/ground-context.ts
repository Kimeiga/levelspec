import type { V3 } from "../architecture/types.ts";
import { groundEdgeDistance } from "./ground-field.ts";
import type { Seam } from "./seams.ts";

/** Local wall exposure; width is measured only between opposing finite contacts from different walls. */
export interface GroundExposure {
  wallDistance: number;
  corridorWidth: number;
}

/** A wall contact retains its owner so two faces of one wall cannot masquerade as a corridor. */
export interface GroundWall {
  host: string;
  seam: Seam;
}

/**
 * Measures passage width along contact normals at a local ground point. Rays must meet finite
 * segments on both sides; distant walls, doorway gaps and other elevations cannot supply a width.
 */
export function groundExposure(
  point: V3,
  walls: GroundWall[],
  charge: () => void,
): GroundExposure {
  let wallDistance = Infinity,
    corridorWidth = Infinity;
  for (const wall of walls) {
    charge();
    wallDistance = Math.min(
      wallDistance,
      groundEdgeDistance(point, ...wall.seam),
    );
  }
  const directions: number[][] = [];
  for (const {
    seam: [a, b],
  } of walls) {
    const dx = b[0] - a[0],
      dy = b[1] - a[1],
      length = Math.hypot(dx, dy);
    if (length < 1e-6 || groundEdgeDistance(point, a, b) > 3) continue;
    const nx = -dy / length,
      ny = dx / length;
    if (directions.some(([x, y]) => Math.abs(nx * x + ny * y) > 0.9999))
      continue;
    directions.push([nx, ny]);
    let positive = Infinity,
      negative = Infinity;
    let positiveHost = "",
      negativeHost = "";
    for (const wall of walls) {
      charge();
      const [p, q] = wall.seam,
        ux = q[0] - p[0],
        uy = q[1] - p[1];
      const determinant = nx * uy - ny * ux;
      if (Math.abs(determinant) < 1e-8) continue;
      const vx = p[0] - point[0],
        vy = p[1] - point[1];
      const t = (vx * uy - vy * ux) / determinant;
      const u = (vx * ny - vy * nx) / determinant;
      if (u < -1e-7 || u > 1 + 1e-7) continue;
      if (t > 1e-5 && t < positive) {
        positive = t;
        positiveHost = wall.host;
      }
      if (t < -1e-5 && -t < negative) {
        negative = -t;
        negativeHost = wall.host;
      }
    }
    if (positiveHost !== negativeHost)
      corridorWidth = Math.min(corridorWidth, positive + negative);
  }
  return { wallDistance, corridorWidth };
}
