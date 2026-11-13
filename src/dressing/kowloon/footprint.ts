import { AmlError } from "../../architecture/format.ts";
import type { ArchitectureResolution, ResolvedElement } from "../../architecture/resolve.ts";
import type { V3 } from "../../architecture/types.ts";
import type { DressingRule } from "../types.ts";

/** A level convex building footprint in host-local meters, counterclockwise and based at Z=0. */
export interface BuildingFootprint {
  points: V3[];
  elevation: number;
  width: number;
  depth: number;
  height: number;
}

/** Returns the signed plan area; positive loops run counterclockwise. */
function area(points: V3[]): number {
  return points.reduce((sum, p, i) => {
    const q = points[(i + 1) % points.length];
    return sum + p[0] * q[1] - q[0] * p[1];
  }, 0) / 2;
}

/** Intersects adjacent offset edge lines to form a mitered inset of a strictly convex loop. */
export function insetFootprint(points: V3[], distance: number): V3[] {
  return points.map((p, i) => {
    const a = points[(i + points.length - 1) % points.length], b = points[(i + 1) % points.length];
    const ax = p[0] - a[0], ay = p[1] - a[1], bx = b[0] - p[0], by = b[1] - p[1];
    const al = Math.hypot(ax, ay), bl = Math.hypot(bx, by);
    const nx = -ay / al, ny = ax / al, mx = -by / bl, my = bx / bl;
    const determinant = nx * my - ny * mx;
    return [p[0] + distance * (my - ny) / determinant, p[1] + distance * (nx - mx) / determinant, p[2]];
  });
}

/** True when a point lies at least `margin` meters inside every edge of a convex footprint. */
export function withinFootprint(points: V3[], p: V3, margin = 0): boolean {
  return points.every((a, i) => {
    const b = points[(i + 1) % points.length], dx = b[0] - a[0], dy = b[1] - a[1];
    return (dx * (p[1] - a[1]) - dy * (p[0] - a[0])) / Math.hypot(dx, dy) >= margin - 1e-7;
  });
}

/**
 * Resolves an extrusion's actual footprint, never its bounding rectangle. Rejects holes,
 * concavity, sloped profiles and corners too tight for the kit's recessed construction.
 */
export function buildingFootprint(node: ResolvedElement, resolution: ArchitectureResolution, rule: DressingRule): BuildingFootprint {
  const fail = (message: string): never => {
    throw new AmlError([{ severity: "error", code: "AML_DRESSING", message, objects: [rule.host], source: rule.source }]);
  };
  if (node.element.kind !== "extrusion") return fail("A polygon building requires an extrusion host.");
  const profile = resolution.profiles.get(node.element.profile)!;
  if (profile.loops.length !== 1) fail("Building footprints require one convex loop without holes.");
  const elevation = profile.points[0][2];
  if (profile.points.some(p => Math.abs(p[2] - elevation) > 1e-6)) fail("Building footprint profiles must be horizontal.");
  let points = profile.loops[0].map((p): V3 => [p[0], p[1], 0]);
  if (area(points) < 0) points.reverse();
  // A canonical origin makes reversing a source loop preserve household and drainage seeds.
  const first = points.reduce((best, p, i) => p[1] < points[best][1] || (p[1] === points[best][1] && p[0] < points[best][0]) ? i : best, 0);
  points = [...points.slice(first), ...points.slice(0, first)];
  if (points.length > 16) fail("Building footprints support at most 16 corners.");
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length], c = points[(i + 2) % points.length];
    const ab = [b[0] - a[0], b[1] - a[1]], bc = [c[0] - b[0], c[1] - b[1]];
    const length = Math.hypot(...ab), nextLength = Math.hypot(...bc);
    const turn = ab[0] * bc[1] - ab[1] * bc[0];
    const cosine = (ab[0] * bc[0] + ab[1] * bc[1]) / (length * nextLength);
    if (length < 1 || turn <= 1e-6 || cosine < -Math.SQRT1_2) fail("Building footprints must be strictly convex, with edges at least 1 m and interior angles at least 45 degrees.");
  }
  const inner = insetFootprint(points, 0.45);
  if (area(inner) < 1 || !inner.every(p => withinFootprint(points, p, 0.45))) fail("Building footprint is too narrow for recessed walls and a roof terrace.");
  return {
    points, elevation, height: node.element.distance,
    width: Math.max(...points.map(p => p[0])) - Math.min(...points.map(p => p[0])),
    depth: Math.max(...points.map(p => p[1])) - Math.min(...points.map(p => p[1])),
  };
}
