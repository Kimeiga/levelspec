import assert from "node:assert/strict";

type Point = [number, number, number];

/** One generated triangle: world positions in meters, its vertex normals and texture coordinates. */
export interface KitTriangle {
  points: Point[];
  normals: Point[];
  uv: number[][];
}

/** Returns `a - b`. */
const subtract = (a: Point, b: Point): Point => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
/** Returns the dot product of two vectors. */
const dot = (a: Point, b: Point) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** Returns the mean of a triangle's corners. */
function centroid({ points }: KitTriangle): Point {
  return [0, 1, 2].map((axis) => (points[0][axis] + points[1][axis] + points[2][axis]) / 3) as Point;
}

/** Returns a triangle's area in square meters and the unit normal its winding faces. */
function winding({ points }: KitTriangle): { area: number; normal: Point } {
  const [u, v] = [subtract(points[1], points[0]), subtract(points[2], points[0])];
  const normal: Point = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  const length = Math.hypot(...normal);
  return { area: length / 2, normal: normal.map((value) => value / length) as Point };
}

/** Names a position on a 0.1 mm grid, the precision at which generated vertices coincide. */
const positionKey = (point: Point) => point.map((value) => Math.round(value * 1e4)).join();

/**
 * Requires a triangle's texture coordinates to lie inside one cell of an
 * atlas of `columns` by `rows` cells and to span a positive texture area, so
 * it shows part of one design rather than a single texel. Returns the cell as
 * "column,row", counted from the UV origin.
 */
export function atlasCell(uv: number[][], columns: number, rows: number, label: string): string {
  const counts = [columns, rows];
  const cell = counts.map((count, axis) => Math.floor(((uv[0][axis] + uv[1][axis] + uv[2][axis]) / 3) * count));
  for (const value of uv)
    for (const axis of [0, 1])
      assert.ok(
        value[axis] * counts[axis] >= cell[axis] - 1e-9 && value[axis] * counts[axis] <= cell[axis] + 1 + 1e-9,
        `${label} leaves its atlas cell.`,
      );
  const area = (uv[1][0] - uv[0][0]) * (uv[2][1] - uv[0][1]) - (uv[2][0] - uv[0][0]) * (uv[1][1] - uv[0][1]);
  assert.ok(Math.abs(area) > 1e-9, `${label} samples a single texel.`);
  return cell.join();
}

/** Two faces of one cloth lie at most this far apart, meters. */
const THICKNESS = 0.06;
/**
 * Largest mean triangle area of hung cloth, square meters: samples about
 * 0.15 m apart. Pleated strips a garment long are three times coarser and
 * one card per garment fifteen times.
 */
const MEAN_AREA = 0.012;
/** No single cloth triangle is larger than this, square meters; one card of a garment is several times it. */
const LARGEST_AREA = 0.03;
/** Cosine of the largest angle between a vertex normal and its face: 60 degrees. */
const FOLLOWS_FACE = 0.5;
/** Share of the cloth that must satisfy each statistical requirement; seams and hems are exempt. */
const MOST = 0.9;

/**
 * Requires triangles to form hung cloth rather than flat or faceted cards:
 * - sampled finely (mean area at most MEAN_AREA, none above LARGEST_AREA) and
 *   never degenerate;
 * - unit vertex normals within 60 degrees of each face;
 * - smooth shading: where triangles facing the same way share a vertex, their
 *   normals there agree, for most shared vertices;
 * - curvature: most of the cloth's area meets a neighbor whose face tilts
 *   differently;
 * - both faces modeled: most of the area has cloth facing the opposite way
 *   within THICKNESS, so it shows from both sides where back faces are culled.
 * Shares are weighted by area so a few large flat cards cannot hide among
 * many small triangles.
 */
export function assertHungCloth(cloth: KitTriangle[]): void {
  assert.ok(cloth.length > 0, "There is no cloth to check.");
  const faces = cloth.map((triangle) => ({ triangle, at: centroid(triangle), ...winding(triangle) }));
  /** Formats a position for a failure message. */
  const where = (at: Point) => at.map((value) => value.toFixed(3)).join(", ");
  for (const { triangle, at, area, normal } of faces) {
    assert.ok(area > 1e-10, `Cloth at ${where(at)} has a degenerate triangle.`);
    assert.ok(area <= LARGEST_AREA, `Cloth at ${where(at)} has a triangle of ${area} m².`);
    for (const shading of triangle.normals) {
      assert.ok(Math.abs(Math.hypot(...shading) - 1) < 1e-3, `Cloth at ${where(at)} has a normal that is not a unit vector.`);
      assert.ok(dot(shading, normal) > FOLLOWS_FACE, `Cloth at ${where(at)} has a vertex normal that leaves its face.`);
    }
  }
  const total = faces.reduce((sum, face) => sum + face.area, 0);
  const mean = total / faces.length;
  assert.ok(mean <= MEAN_AREA, `Cloth triangles average ${mean} m², too coarse to fold.`);
  /** Sums the area of some of the cloth's triangles. */
  const areaOf = (some: Iterable<(typeof faces)[number]>) => [...some].reduce((sum, face) => sum + face.area, 0);

  // Vertices shared by triangles of one face: their shading normals and the faces that meet there.
  const shared = new Map<string, { shading: Point; face: (typeof faces)[number] }[]>();
  for (const face of faces)
    face.triangle.points.forEach((point, k) => {
      const key = positionKey(point);
      shared.set(key, [...(shared.get(key) ?? []), { shading: face.triangle.normals[k], face }]);
    });
  let joints = 0,
    smoothJoints = 0;
  const curved = new Set<(typeof faces)[number]>();
  for (const corners of shared.values())
    for (let i = 0; i < corners.length; i++) {
      const sameSide = corners.filter((other, j) => j !== i && dot(other.face.normal, corners[i].face.normal) > 0);
      if (!sameSide.length) continue;
      joints++;
      if (sameSide.every((other) => dot(other.shading, corners[i].shading) > 0.999)) smoothJoints++;
      if (sameSide.some((other) => dot(other.face.normal, corners[i].face.normal) < 1 - 1e-4)) curved.add(corners[i].face);
    }
  assert.ok(smoothJoints >= MOST * joints, `Only ${smoothJoints} of ${joints} shared cloth vertices are smoothly shaded.`);
  assert.ok(areaOf(curved) >= MOST * total, `Only ${areaOf(curved)} of ${total} m² of cloth curves into a neighbor.`);

  /** Names the THICKNESS-wide grid cell a point lies in, optionally shifted by whole cells. */
  const cellOf = (point: Point, shift = [0, 0, 0]) =>
    point.map((value, axis) => Math.floor(value / THICKNESS) + shift[axis]).join();
  const grid = new Map<string, (typeof faces)[number][]>();
  for (const face of faces) grid.set(cellOf(face.at), [...(grid.get(cellOf(face.at)) ?? []), face]);
  const backed: (typeof faces)[number][] = [];
  for (const face of faces) {
    let found = false;
    for (let i = -1; i <= 1 && !found; i++)
      for (let j = -1; j <= 1 && !found; j++)
        for (let k = -1; k <= 1 && !found; k++)
          found = (grid.get(cellOf(face.at, [i, j, k])) ?? []).some(
            (other) => Math.hypot(...subtract(other.at, face.at)) <= THICKNESS && dot(other.normal, face.normal) < -0.5,
          );
    if (found) backed.push(face);
  }
  assert.ok(areaOf(backed) >= MOST * total, `Only ${areaOf(backed)} of ${total} m² of cloth shows from both sides.`);
}

/**
 * Requires a consistent winding across every edge that exactly two of the
 * triangles share: neighbors on one surface run along their common edge in
 * opposite directions, so a face wound the wrong way among its neighbors
 * fails. Edges with more triangles, such as those of two-sided sheets, are
 * left alone.
 */
export function assertConsistentWinding(triangles: KitTriangle[], label: string): void {
  const edges = new Map<string, boolean[]>();
  for (const { points } of triangles)
    for (let k = 0; k < 3; k++) {
      const [from, to] = [positionKey(points[k]), positionKey(points[(k + 1) % 3])];
      if (from === to) continue;
      const key = from < to ? `${from}|${to}` : `${to}|${from}`;
      edges.set(key, [...(edges.get(key) ?? []), from < to]);
    }
  for (const [key, directions] of edges)
    assert.ok(
      directions.length !== 2 || directions[0] !== directions[1],
      `${label}: two faces run the same way along the edge ${key}, so one is wound inside out.`,
    );
}

/**
 * Groups triangles into separate objects by their vertices' cells in a grid
 * `reach` meters wide: triangles with vertices in the same or adjacent cells
 * belong together, directly or through other triangles. Vertices within
 * `reach` of one another always link; none link beyond twice `reach` per axis.
 */
export function clusters<T extends KitTriangle>(triangles: T[], reach: number): T[][] {
  const parent = triangles.map((_, index) => index);
  /** Returns the representative of the group a triangle belongs to. */
  const find = (index: number): number => {
    while (parent[index] !== index) index = parent[index] = parent[parent[index]];
    return index;
  };
  const cells = new Map<string, number>();
  triangles.forEach((triangle, index) => {
    for (const point of triangle.points)
      for (let i = -1; i <= 1; i++)
        for (let j = -1; j <= 1; j++)
          for (let k = -1; k <= 1; k++) {
            const key = [point[0] / reach + i, point[1] / reach + j, point[2] / reach + k].map(Math.floor).join();
            const owner = cells.get(key);
            // Only the vertex's own cell is claimed; neighbors are searched so that nearby vertices join.
            if (owner !== undefined) parent[find(index)] = find(owner);
            else if (i === 0 && j === 0 && k === 0) cells.set(key, index);
          }
  });
  const groups = new Map<number, T[]>();
  triangles.forEach((triangle, index) => groups.set(find(index), [...(groups.get(find(index)) ?? []), triangle]));
  return [...groups.values()];
}
