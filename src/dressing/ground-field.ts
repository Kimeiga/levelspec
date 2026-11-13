import type { V3 } from "../architecture/types.ts";
import { clipByLevel } from "./finish/partition.ts";

/** Signed XY area; ground polygons use counterclockwise winding. */
export function groundArea(points: V3[]): number {
  return (
    points.reduce((area, p, i) => {
      const q = points[(i + 1) % points.length];
      return area + p[0] * q[1] - q[0] * p[1];
    }, 0) / 2
  );
}

/** Clips an owned convex polygon to a scalar half-space, interpolating its height. */
export function clipGround(points: V3[], distance: (p: V3) => number): V3[] {
  return clipByLevel(points, (point) => distance(point as V3)) as V3[];
}

/** Intersects convex XY footprints without spanning native holes or cutouts. */
export function intersectGround(points: V3[], boundary: V3[]): V3[] {
  let result = points;
  const sign = Math.sign(groundArea(boundary));
  for (let i = 0; i < boundary.length && result.length >= 3; i++) {
    const a = boundary[i],
      b = boundary[(i + 1) % boundary.length];
    result = clipGround(
      result,
      (p) =>
        sign * ((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])),
    );
  }
  return result.length >= 3 && Math.abs(groundArea(result)) > 1e-10
    ? result
    : [];
}

/** Partitions a convex surface by a convex paint footprint, retaining disjoint outside fragments. */
export function splitGround(
  points: V3[],
  boundary: V3[],
): { inside: V3[]; outside: V3[][] } {
  if (!intersectGround(points, boundary).length)
    return { inside: [], outside: [points] };
  let inside = points;
  const outside: V3[][] = [],
    sign = Math.sign(groundArea(boundary));
  for (let i = 0; i < boundary.length && inside.length >= 3; i++) {
    const a = boundary[i],
      b = boundary[(i + 1) % boundary.length];
    const distance = (p: V3) =>
      sign * ((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]));
    const removed = clipGround(inside, (p) => -distance(p));
    if (Math.abs(groundArea(removed)) > 1e-10) outside.push(removed);
    inside = clipGround(inside, distance);
  }
  return {
    inside: Math.abs(groundArea(inside)) > 1e-10 ? inside : [],
    outside,
  };
}

/** A convex rectangle in domain XY, carrying the receiving plane elevation. */
export function groundRectangle(
  x: number,
  y: number,
  width: number,
  depth: number,
  z = 0,
): V3[] {
  return [
    [x, y, z],
    [x + width, y, z],
    [x + width, y + depth, z],
    [x, y + depth, z],
  ];
}

/** Distance to a finite XY segment, independent of the render displacement. */
export function groundEdgeDistance(p: V3, a: V3, b: V3): number {
  const x = b[0] - a[0],
    y = b[1] - a[1];
  const t = Math.max(
    0,
    Math.min(
      1,
      ((p[0] - a[0]) * x + (p[1] - a[1]) * y) / Math.max(1e-20, x * x + y * y),
    ),
  );
  return Math.hypot(p[0] - a[0] - t * x, p[1] - a[1] - t * y);
}
