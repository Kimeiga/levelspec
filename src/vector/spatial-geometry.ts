import { Box3, Ray, Triangle, Vector3 } from "three";
import {
  aborted,
  type CompiledLevel,
  type MeshData,
  type Surface,
  type V3,
} from "./types.ts";
import { cross, dot, norm, sub } from "./geometry.ts";

export interface SpatialBounds {
  min: V3;
  max: V3;
}
export interface SpatialPlane {
  normal: V3;
  offset: number;
}
export interface PhysicalFace {
  index: number;
  points: V3[];
  normal: V3;
  surface: Surface;
  solid: string;
}
interface Chunk {
  start: number;
  count: number;
  bounds: SpatialBounds;
}

/** Computes complete bounds without spreading large coordinate arrays. */
export function spatialBounds(points: Iterable<V3>): SpatialBounds {
  const min: V3 = [Infinity, Infinity, Infinity],
    max: V3 = [-Infinity, -Infinity, -Infinity];
  for (const p of points)
    for (let axis = 0; axis < 3; axis++) {
      min[axis] = Math.min(min[axis], p[axis]);
      max[axis] = Math.max(max[axis], p[axis]);
    }
  return { min, max };
}

/** Compares spatial extents with an explicit query tolerance, without moving either shape. */
export function spatialIntersects(
  a: SpatialBounds,
  b: SpatialBounds,
  tolerance = 0,
): boolean {
  return a.min.every(
    (value, axis) =>
      value <= b.max[axis] + tolerance &&
      a.max[axis] + tolerance >= b.min[axis],
  );
}

/** Builds five outward planes of a transformed triangular prism. */
export function prismPlanes(base: V3[], extrusion: V3): SpatialPlane[] {
  const top = base.map((p) => p.map((n, axis) => n + extrusion[axis]) as V3);
  const center = base[0].map(
    (_, axis) =>
      base.reduce((sum, p) => sum + p[axis] / 3, 0) + extrusion[axis] / 2,
  ) as V3;
  const faces = [
    base,
    top,
    ...base.map((p, i) => [p, base[(i + 1) % 3], top[(i + 1) % 3]]),
  ];
  return faces.map((face) => {
    let normal = norm(cross(sub(face[1], face[0]), sub(face[2], face[0])));
    if (dot(normal, sub(center, face[0])) > 0)
      normal = normal.map((n) => -n) as V3;
    return { normal, offset: dot(normal, face[0]) };
  });
}

/** Clips against actual prism planes; inset is a query tolerance, never a geometry repair. */
export function clipToPrism(
  input: V3[],
  planes: SpatialPlane[],
  inset = 0,
): V3[] {
  let points = input;
  for (const plane of planes) {
    const output: V3[] = [];
    for (let i = 0; i < points.length; i++) {
      const a = points[i],
        b = points[(i + 1) % points.length],
        da = dot(plane.normal, a) - plane.offset + inset,
        db = dot(plane.normal, b) - plane.offset + inset;
      if (da <= 0) output.push(a);
      if (da <= 0 !== db <= 0)
        output.push(
          a.map((n, axis) => n + ((b[axis] - n) * da) / (da - db)) as V3,
        );
    }
    points = output;
    if (!points.length) break;
  }
  return points;
}

/** Measures real three-dimensional polygon area. */
export function spatialArea(points: V3[]): number {
  let result = 0;
  for (let i = 1; i + 1 < points.length; i++)
    result +=
      Math.hypot(
        ...cross(sub(points[i], points[0]), sub(points[i + 1], points[0])),
      ) / 2;
  return result;
}

/**
 * Queries immutable final physical geometry in bounded chunks. Terrain tile bounds
 * avoid loading millions of distant faces for a local assertion. Closed-solid
 * parity groups all boundary components, including cavities, under final solid IDs.
 */
export class PhysicalGeometryIndex {
  readonly mesh: MeshData;
  private readonly surfaces: Surface[];
  private readonly chunks: Chunk[] = [];
  private readonly closed = new Set<string>();
  private readonly signal?: AbortSignal;
  private work = 0;
  private readonly maximumWork: number;
  private readonly rendering: boolean;
  private readonly transparent = new Set<string>();
  private readonly contributors = new Map<string, Set<string>>();
  constructor(
    level: CompiledLevel,
    signal?: AbortSignal,
    maximumWork = 8_000_000,
    purpose: "physical" | "render" = "physical",
  ) {
    this.rendering = purpose === "render";
    for (const material of level.document.materials) if (material.texture || material.color === "transparent" || /^(rgba|hsla)\(/i.test(material.color) || /^#[0-9a-f]{6}(?!ff)[0-9a-f]{2}$/i.test(material.color)) this.transparent.add(material.id);
    this.maximumWork = maximumWork;
    this.mesh = purpose === "render" ? level.mesh : level.physicalMesh ?? level.mesh;
    this.surfaces = level.surfaces;
    this.signal = signal;
    const terrain = [...((purpose !== "render" || level.mesh === level.physicalMesh) ? level.terrainTiles ?? [] : [])].sort((a, b) => {
      this.spend();
      return a.triangleStart - b.triangleStart;
    });
    let tile = 0,
      start = 0;
    while (start < this.mesh.surfaces.length) {
      this.spend();
      const range = terrain[tile];
      if (range && range.triangleStart === start) {
        this.chunks.push({
          start,
          count: range.triangleCount,
          bounds: range.bounds,
        });
        start += range.triangleCount;
        tile++;
        continue;
      }
      const count = Math.min(
        8192,
        this.mesh.surfaces.length - start,
        range ? range.triangleStart - start : Infinity,
      );
      if (count <= 0)
        throw new Error("Invalid overlapping terrain tile ranges.");
      const points: V3[] = [];
      for (let t = start; t < start + count; t++)
        for (const i of this.mesh.indices.slice(t * 3, t * 3 + 3))
          points.push(this.point(i));
      this.chunks.push({ start, count, bounds: spatialBounds(points) });
      start += count;
    }
    const open = new Set<string>();
    for (let t = 0; t < this.mesh.surfaces.length; t++) {
      this.spend();
      const id = this.mesh.solidIds?.[t];
      if (!id) continue;
      const surface = this.surfaces[this.mesh.surfaces[t]];
      if (
        surface.closed === false ||
        (this.rendering ? surface.visible === false || this.transparent.has(surface.material) : surface.collidable === false) ||
        surface.domain === "visualization"
      )
        open.add(id);
      else {
        this.closed.add(id);
        const objects = this.contributors.get(id) ?? new Set<string>();
        objects.add(surface.object);
        this.contributors.set(id, objects);
      }
    }
    for (const id of open) this.closed.delete(id);
  }
  /** Shares admission across construction, local queries, and containment ray tests. */
  private spend(): void {
    if ((++this.work & 1023) === 0) aborted(this.signal);
    if (this.work > this.maximumWork)
      throw new Error("Aggregate physical query work budget exceeded.");
  }
  /** Spatial chunk views refer to immutable final geometry; callers must not alter them. */
  regions(): readonly Readonly<Chunk>[] { return this.chunks; }
  /** Whether an entire native boundary establishes a checked opaque/physical interior. */
  isClosed(id: string): boolean { return this.closed.has(id); }
  /** Reads one immutable world vertex. */
  private point(i: number): V3 {
    return this.mesh.positions.slice(i * 3, i * 3 + 3) as V3;
  }
  /** Materializes only faces within a query's actual bounds. */
  *faces(
    bounds: SpatialBounds,
    includeNoncollidable = false,
  ): Generator<PhysicalFace> {
    for (const chunk of this.chunks) {
      this.spend();
      if (!spatialIntersects(chunk.bounds, bounds, 1e-6)) continue;
      for (let t = chunk.start; t < chunk.start + chunk.count; t++) {
        this.spend();
        const surface = this.surfaces[this.mesh.surfaces[t]];
        if (
          surface.domain === "visualization" ||
          (this.rendering ? surface.visible === false : !includeNoncollidable && surface.collidable === false)
        )
          continue;
        const points = this.mesh.indices
          .slice(t * 3, t * 3 + 3)
          .map((i) => this.point(i));
        if (!spatialIntersects(spatialBounds(points), bounds, 1e-6)) continue;
        yield {
          index: t,
          points,
          normal: norm(
            cross(sub(points[1], points[0]), sub(points[2], points[0])),
          ),
          surface,
          solid: this.mesh.solidIds?.[t] ?? "",
        };
      }
    }
  }
  /** Tests confirmed solid occupancy; open patches never invent an interior. */
  occupants(point: V3, ignore = new Set<string>()): string[] {
    const ray = new Ray(
        new Vector3(...point),
        new Vector3(1, 0.371, 0.529).normalize(),
      ),
      crossings = new Map<string, number[]>();
    for (const chunk of this.chunks) {
      this.spend();
      const box = new Box3(
        new Vector3(...chunk.bounds.min),
        new Vector3(...chunk.bounds.max),
      );
      if (!ray.intersectsBox(box)) continue;
      for (let t = chunk.start; t < chunk.start + chunk.count; t++) {
        this.spend();
        const id = this.mesh.solidIds?.[t];
        if (!id || !this.closed.has(id) || ignore.has(id)) continue;
        const vertices = this.mesh.indices
          .slice(t * 3, t * 3 + 3)
          .map((i) => new Vector3(...this.point(i)));
        const hit = ray.intersectTriangle(
          vertices[0],
          vertices[1],
          vertices[2],
          false,
          new Vector3(),
        );
        if (!hit) continue;
        const distance = hit.distanceTo(ray.origin),
          hits = crossings.get(id) ?? [];
        if (distance > 1e-8) hits.push(distance);
        crossings.set(id, hits);
      }
    }
    const occupants = new Set<string>();
    for (const [id, values] of crossings) {
      values.sort((a, b) => {
        this.spend();
        return a - b;
      });
      let count = 0,
        previous = -Infinity;
      for (const value of values) {
        this.spend();
        if (value - previous > 1e-6) {
          count++;
          previous = value;
        }
      }
      if (count % 2)
        for (const object of this.contributors.get(id) ?? [])
          occupants.add(object);
    }
    return [...occupants];
  }
  /** Open patches never establish an occupied volume. */
  contains(point: V3, ignore = new Set<string>()): boolean {
    return this.occupants(point, ignore).length > 0;
  }
}
