import type { TerrainTileRange } from "./terrain-tiles.ts";
import type { Matrix4 } from "three";
import { aborted, type V3 } from "../vector/types.ts";
import { cross, sub } from "../vector/geometry.ts";
import { transform, type ResolvedProfile } from "./geometry.ts";
import type { Terrain } from "./types.ts";
import type { HeightmapRaster } from "./heightmap.ts";
import type { ArchitectureResolution, ResolvedElement } from "./resolve.ts";

/** Enforces one source contract before external data is loaded or geometry allocated. */
export function validateTerrainSource(terrain: Terrain): void {
  const sources = [
    !!terrain.profile,
    !!terrain.heightmap,
    terrain.columns !== undefined ||
      terrain.rows !== undefined ||
      terrain.heights.length > 0,
    terrain.points.length > 0 || terrain.triangles.length > 0,
  ];
  if (sources.filter(Boolean).length !== 1)
    throw new Error(
      "Terrain requires exactly one profile, heightmap, numeric grid, or explicit patch.",
    );
  if (
    !terrain.heightmap &&
    (terrain.minHeight !== undefined ||
      terrain.maxHeight !== undefined ||
      terrain.flipY)
  )
    throw new Error(
      "Height range and row flipping require a heightmap source.",
    );
  if (
    terrain.heightmap &&
    (!Number.isFinite(terrain.minHeight ?? 0) ||
      !Number.isFinite(terrain.maxHeight ?? 1) ||
      (terrain.maxHeight ?? 1) < (terrain.minHeight ?? 0))
  )
    throw new Error(
      "Heightmaps require finite min-height and max-height with max-height >= min-height (defaults 0 and 1).",
    );
}

/** Validates native terrain against its own admitted limits rather than imported asset limits. */
export function validateTerrainGeometry(
  profile: ResolvedProfile,
  maximumTriangles: number,
  signal?: AbortSignal,
): void {
  if (
    !profile.points.length ||
    !profile.triangles.length ||
    profile.triangles.length > maximumTriangles
  )
    throw new Error("Terrain triangle budget exceeded or terrain is empty.");
  for (const point of profile.points)
    if (
      point.length !== 3 ||
      point.some((n) => !Number.isFinite(n) || Math.abs(n) > 1e7)
    )
      throw new Error(
        "Terrain positions must be finite XYZ within ten million meters.",
      );
  for (const triangle of profile.triangles) {
    aborted(signal);
    if (
      triangle.length !== 3 ||
      triangle.some(
        (i) => !Number.isInteger(i) || i < 0 || i >= profile.points.length,
      )
    )
      throw new Error("Terrain triangles must reference existing vertices.");
    const [a, b, c] = triangle.map((i) => profile.points[i]);
    if (Math.hypot(...cross(sub(b, a), sub(c, a))) < 1e-10)
      throw new Error("Terrain contains a degenerate triangle.");
  }
}

/** Maps local terrain into its authored frame, preserving outward orientation under reflection. */
function placed(profile: ResolvedProfile, matrix: Matrix4): ResolvedProfile {
  return {
    points: profile.points.map((p) => transform(p, matrix)),
    triangles:
      matrix.determinant() < 0
        ? profile.triangles.map(([a, b, c]) => [c, b, a])
        : profile.triangles,
    loops: profile.loops.map((loop) => loop.map((p) => transform(p, matrix))),
  };
}

export interface ResolvedTerrain extends ResolvedProfile {
  tileRanges: TerrainTileRange[];
}

/** Resolves local ground samples once; derived PNG elevations are not requantized. */
export function resolveTerrain(
  node: ResolvedElement,
  resolution: ArchitectureResolution,
  raster: HeightmapRaster | undefined,
  maximumSamples: number,
  maximumTriangles: number,
  signal?: AbortSignal,
  onProgress?: (stage: string) => void,
  maximumTiles = 16_384,
): ResolvedTerrain {
  const terrain = node.element as Terrain;
  validateTerrainSource(terrain);
  let profile: ResolvedProfile;
  const tileRanges: TerrainTileRange[] = [],
    tileSize = terrain.tileSize ?? 64;
  if (!Number.isInteger(tileSize) || tileSize < 1 || tileSize > 64)
    throw new Error("Terrain tile-size must be an integer from 1 to 64 cells.");
  if (terrain.profile) {
    const source = resolution.profiles.get(terrain.profile);
    if (!source) throw new Error(`Unknown terrain profile ${terrain.profile}.`);
    profile = { ...source, triangles: source.triangles.map((t) => [...t]) };
  } else if (
    terrain.heightmap ||
    terrain.columns !== undefined ||
    terrain.rows !== undefined
  ) {
    const columns = raster?.width ?? terrain.columns ?? 0,
      rows = raster?.height ?? terrain.rows ?? 0;
    if (
      !Number.isInteger(columns) ||
      !Number.isInteger(rows) ||
      columns < 2 ||
      rows < 2 ||
      columns * rows > maximumSamples
    )
      throw new Error(
        "Terrain grid dimensions exceed the sample budget or have fewer than two rows/columns.",
      );
    if (
      Math.ceil((columns - 1) / tileSize) * Math.ceil((rows - 1) / tileSize) >
      maximumTiles
    )
      throw new Error("Terrain tile budget exceeded before grid allocation.");
    if (2 * (columns - 1) * (rows - 1) > maximumTriangles)
      throw new Error(
        "Terrain triangle budget exceeded before grid allocation.",
      );
    if (terrain.cellSize.some((value) => !Number.isFinite(value) || value <= 0))
      throw new Error("Terrain cell-size must be finite and positive.");
    if (!raster && terrain.heights.length !== columns * rows)
      throw new Error("Terrain grid dimensions must match its height samples.");
    const points: V3[] = [];
    for (let y = 0; y < rows; y++) {
      aborted(signal);
      for (let x = 0; x < columns; x++) {
        const index = (terrain.flipY ? rows - 1 - y : y) * columns + x;
        const height = raster
          ? (terrain.minHeight ?? 0) +
            (((terrain.maxHeight ?? 1) - (terrain.minHeight ?? 0)) *
              raster.samples[index]) /
              (raster.bitDepth === 8 ? 255 : 65535)
          : terrain.heights[y * columns + x];
        points.push([x * terrain.cellSize[0], y * terrain.cellSize[1], height]);
      }
    }
    const triangles: [number, number, number][] = [];
    for (let ty = 0; ty * tileSize < rows - 1; ty++)
      for (let tx = 0; tx * tileSize < columns - 1; tx++) {
        onProgress?.(`Terrain tile ${node.id}:${tx},${ty}`);
        aborted(signal);
        const start = triangles.length;
        for (
          let y = ty * tileSize;
          y < Math.min(rows - 1, (ty + 1) * tileSize);
          y++
        )
          for (
            let x = tx * tileSize;
            x < Math.min(columns - 1, (tx + 1) * tileSize);
            x++
          ) {
            const a = y * columns + x,
              b = a + 1,
              c = b + columns,
              d = a + columns;
            triangles.push([a, b, c], [a, c, d]);
          }
        tileRanges.push({
          index: [tx, ty],
          start,
          count: triangles.length - start,
        });
      }
    profile = { points, triangles, loops: [] };
  } else
    profile = {
      points: terrain.points,
      triangles: terrain.triangles.map((t) => [...t]),
      loops: [],
    };
  if (!tileRanges.length) {
    const groups = new Map<
      string,
      { index: [number, number]; triangles: [number, number, number][] }
    >();
    for (const triangle of profile.triangles) {
      const center = [0, 1].map((axis) =>
        triangle.reduce((sum, i) => sum + profile.points[i][axis] / 3, 0),
      );
      const index: [number, number] = [
          Math.floor(center[0] / tileSize),
          Math.floor(center[1] / tileSize),
        ],
        key = index.join(",");
      if (!groups.has(key) && groups.size >= maximumTiles)
        throw new Error("Terrain tile budget exceeded.");
      const group = groups.get(key) ?? { index, triangles: [] };
      group.triangles.push(triangle);
      groups.set(key, group);
    }
    const triangles: [number, number, number][] = [];
    for (const group of [...groups.values()].sort(
      (a, b) => a.index[1] - b.index[1] || a.index[0] - b.index[0],
    )) {
      for (let offset = 0; offset < group.triangles.length; offset += 8192) {
        onProgress?.(`Terrain tile ${node.id}:${group.index.join(",")}`);
        aborted(signal);
        if (tileRanges.length >= maximumTiles)
          throw new Error("Terrain tile budget exceeded.");
        const values = group.triangles.slice(offset, offset + 8192),
          start = triangles.length;
        triangles.push(...values);
        tileRanges.push({
          index: group.index,
          part: offset / 8192,
          start,
          count: values.length,
        });
      }
    }
    profile = { ...profile, triangles };
  }
  if (terrain.orientation === "down" && (terrain.profile || terrain.heightmap || terrain.columns !== undefined))
    profile.triangles = profile.triangles.map(([a, b, c]) => [c, b, a]);
  validateTerrainGeometry(profile, maximumTriangles, signal);
  const world = placed(profile, node.matrix);
  validateTerrainGeometry(world, maximumTriangles, signal);
  return { ...world, tileRanges };
}
