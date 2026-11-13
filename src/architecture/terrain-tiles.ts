import type {
  TerrainTileCache,
  CachedTerrainNormals,
} from "./terrain-cache.ts";
import type { MeshData, TerrainTile, V3 } from "../vector/types.ts";
import { aborted } from "../vector/types.ts";
import { cross, sub, hash } from "../vector/geometry.ts";
import type { ResolvedProfile } from "./geometry.ts";

export interface TerrainTileRange {
  index: [number, number];
  part?: number;
  start: number;
  count: number;
}

/** Derives finite world bounds and content identities from the source triangles of each tile. */
export async function terrainTileMetadata(
  terrain: string,
  profile: ResolvedProfile,
  ranges: TerrainTileRange[],
  signal?: AbortSignal,
  spend: () => void = () => {},
): Promise<TerrainTile[]> {
  const tiles: TerrainTile[] = [];
  const counts = new Uint32Array(profile.points.length);
  for (const triangle of profile.triangles)
    for (const vertex of triangle) counts[vertex]++;
  const offsets = new Uint32Array(counts.length + 1);
  for (let i = 0; i < counts.length; i++)
    offsets[i + 1] = offsets[i] + counts[i];
  const incident = new Uint32Array(offsets[offsets.length - 1]),
    cursors = offsets.slice();
  for (let t = 0; t < profile.triangles.length; t++) {
    if ((t & 1023) === 0) aborted(signal);
    for (const vertex of profile.triangles[t]) incident[cursors[vertex]++] = t;
  }
  for (const range of ranges) {
    aborted(signal);
    const vertices = new Set<number>();
    for (let t = range.start; t < range.start + range.count; t++)
      for (const i of profile.triangles[t]) vertices.add(i);
    const indices = [...vertices].sort((a, b) => a - b),
      min: V3 = [Infinity, Infinity, Infinity],
      max: V3 = [-Infinity, -Infinity, -Infinity];
    for (const i of indices)
      for (let axis = 0; axis < 3; axis++) {
        min[axis] = Math.min(min[axis], profile.points[i][axis]);
        max[axis] = Math.max(max[axis], profile.points[i][axis]);
      }
    const halo = new Set<number>();
    for (const vertex of indices)
      for (let i = offsets[vertex]; i < offsets[vertex + 1]; i++) {
        spend();
        halo.add(incident[i]);
      }
    const fingerprint = await hash({
      normalDependencies: [...halo]
        .sort((a, b) => a - b)
        .map((t) => profile.triangles[t].map((i) => profile.points[i])),
      positions: indices.map((i) => profile.points[i]),
      triangles: profile.triangles.slice(
        range.start,
        range.start + range.count,
      ),
    });
    tiles.push({
      id: `${terrain}:${range.index.join(",")}:${range.part ?? 0}`,
      terrain,
      index: range.index,
      triangleStart: range.start,
      triangleCount: range.count,
      bounds: { min, max },
      hash: fingerprint,
    });
  }
  return tiles;
}

/** Appends a complete indexed terrain surface; area-weighted normals share every tile seam. */
export function appendTerrainMesh(
  output: MeshData,
  profile: ResolvedProfile,
  surface: number,
  repeat: number,
  signal?: AbortSignal,
  caching?: {
    cache: TerrainTileCache;
    tiles: TerrainTile[];
    stats: Record<string, number>;
  },
): void {
  const sums = new Float64Array(profile.points.length * 3),
    used = new Uint8Array(profile.points.length);
  const remap = new Int32Array(profile.points.length);
  remap.fill(-1);
  const pending: { key: string; vertices: Uint32Array }[] = [];
  const needed = new Uint8Array(profile.points.length);
  if (caching) {
    for (const tile of caching.tiles) {
      aborted(signal);
      const key = `normals-v1:${tile.hash}`;
      const cached = caching.cache.get(key);
      const stat = cached ? "terrainCacheHits" : "terrainCacheMisses";
      caching.stats[stat] = (caching.stats[stat] ?? 0) + 1;
      if (cached) {
        for (let j = 0; j < cached.vertices.length; j++) {
          const i = cached.vertices[j];
          used[i] = 1;
          for (let axis = 0; axis < 3; axis++)
            sums[i * 3 + axis] = cached.normals[j * 3 + axis];
        }
      } else {
        const vertices = new Set<number>();
        for (
          let t = tile.triangleStart;
          t < tile.triangleStart + tile.triangleCount;
          t++
        )
          for (const i of profile.triangles[t]) {
            vertices.add(i);
            needed[i] = 1;
            used[i] = 1;
          }
        pending.push({ key, vertices: Uint32Array.from(vertices) });
      }
    }
  } else needed.fill(1);
  // Misses accumulate only the requested vertices, including incident faces across tile seams.
  for (let i = 0; i < needed.length; i++)
    if (needed[i]) sums.fill(0, i * 3, i * 3 + 3);
  if (!caching || pending.length)
    for (const triangle of profile.triangles) {
      aborted(signal);
      if (!triangle.some((i) => needed[i])) continue;
      const [a, b, c] = triangle.map((i) => profile.points[i]),
        normal = cross(sub(b, a), sub(c, a));
      for (const i of triangle)
        if (needed[i]) {
          used[i] = 1;
          for (let axis = 0; axis < 3; axis++)
            sums[i * 3 + axis] += normal[axis];
        }
    }
  if (caching)
    for (const tile of pending) {
      aborted(signal);
      const normals = new Float64Array(tile.vertices.length * 3);
      for (let j = 0; j < tile.vertices.length; j++) {
        const i = tile.vertices[j];
        for (let axis = 0; axis < 3; axis++)
          normals[j * 3 + axis] = sums[i * 3 + axis];
      }
      const value: CachedTerrainNormals = { vertices: tile.vertices, normals };
      caching.cache.set(tile.key, value);
    }
  for (let i = 0; i < profile.points.length; i++) {
    if ((i & 1023) === 0) aborted(signal);
    if (!used[i]) continue;
    const p = profile.points[i],
      length = Math.hypot(sums[i * 3], sums[i * 3 + 1], sums[i * 3 + 2]);
    if (!Number.isFinite(length))
      throw new Error("Terrain normal exceeds finite precision.");
    if (length <= 1e-20) continue;
    remap[i] = output.positions.length / 3;
    output.positions.push(...p);
    output.normals.push(
      sums[i * 3] / length,
      sums[i * 3 + 1] / length,
      sums[i * 3 + 2] / length,
    );
    output.uv.push(p[0] * repeat, p[1] * repeat);
  }
  for (const triangle of profile.triangles) {
    const points = triangle.map((i) => profile.points[i]),
      raw = cross(sub(points[1], points[0]), sub(points[2], points[0])),
      length = Math.hypot(...raw);
    for (const i of triangle) {
      if (remap[i] >= 0) output.indices.push(remap[i]);
      else {
        const p = profile.points[i],
          index = output.positions.length / 3;
        output.positions.push(...p);
        output.normals.push(...raw.map((value) => value / length));
        output.uv.push(p[0] * repeat, p[1] * repeat);
        output.indices.push(index);
      }
    }
    output.surfaces.push(surface);
    (output.solidIds ??= []).push("");
  }
}

/** Spatially groups derived patches without clipping or altering their physical triangles. */
export function partitionTerrain(
  profile: ResolvedProfile,
  inverse: import("three").Matrix4,
  size: [number, number],
  maximumTiles: number,
  onProgress?: (stage: string) => void,
  terrain = "",
  signal?: AbortSignal,
): ResolvedProfile & { tileRanges: TerrainTileRange[] } {
  const groups = new Map<
    string,
    { index: [number, number]; triangles: [number, number, number][] }
  >();
  for (const triangle of profile.triangles) {
    aborted(signal);
    const center = triangle.reduce(
      (p, id) => p.map((n, axis) => n + profile.points[id][axis] / 3) as V3,
      [0, 0, 0] as V3,
    );
    const e = inverse.elements,
      x = e[0] * center[0] + e[4] * center[1] + e[8] * center[2] + e[12],
      y = e[1] * center[0] + e[5] * center[1] + e[9] * center[2] + e[13];
    const index: [number, number] = [
        Math.floor(x / size[0]),
        Math.floor(y / size[1]),
      ],
      key = index.join(",");
    let group = groups.get(key);
    if (!group) {
      if (groups.size >= maximumTiles)
        throw new Error("Terrain tile budget exceeded.");
      group = { index, triangles: [] };
      groups.set(key, group);
    }
    group.triangles.push(triangle);
  }
  const triangles: [number, number, number][] = [],
    tileRanges: TerrainTileRange[] = [];
  for (const group of [...groups.values()].sort(
    (a, b) => a.index[1] - b.index[1] || a.index[0] - b.index[0],
  ))
    for (let offset = 0; offset < group.triangles.length; offset += 8192) {
      if (tileRanges.length >= maximumTiles)
        throw new Error("Terrain tile budget exceeded.");
      onProgress?.(`Terrain tile ${terrain}:${group.index.join(",")}`);
      aborted(signal);
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
  return { ...profile, triangles, tileRanges };
}
