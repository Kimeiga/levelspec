import { Vector3 } from "three";
import type { CompiledArchitecture } from "../../src/architecture/types.ts";
import catalog from "../../src/dressing/kowloon/shop/assets/grocer-props.json" with { type: "json" };
import appearances from "../../src/dressing/kowloon/shop/assets/stock-appearances.json" with { type: "json" };

type Triangle = [Vector3, Vector3, Vector3];
type Appearance = { source: number[]; variants: { uv: number[] }[] };
const palettes = appearances as Record<string, Appearance>;

/** Matches authored UV faces across winding and harmless floating-point differences. */
function uvFace(coordinates: number[][]): string {
  return coordinates.map(uv => uv.map(value => value.toFixed(6)).join("/")).sort().join("|");
}

const faceOwners = new Map<string, string[]>();
for (const [name, asset] of Object.entries(catalog)) for (const face of asset.faces) {
  const source = face.map(vertex => vertex.slice(6, 8));
  const appearance = palettes[name];
  const variants = [source, ...(appearance?.variants.map(variant => source.map(uv => uv.map((value, axis) =>
    variant.uv[axis] + (value - appearance.source[axis]) / (appearance.source[axis + 2] - appearance.source[axis])
      * (variant.uv[axis + 2] - variant.uv[axis]),
  ))) ?? [])];
  for (const [variant, coordinates] of variants.entries()) {
    const key = uvFace(coordinates), owners = faceOwners.get(key) ?? [];
    for (const owner of [name, `${name}/${variant}`]) if (!owners.includes(owner)) owners.push(owner);
    faceOwners.set(key, owners);
  }
}

const levels = new WeakMap<CompiledArchitecture, { indices: number; assets: Map<string, Triangle[]> }>();

/** Identifies complete emitted catalog faces, including alternate atlas rectangles. */
export function grocerAssetTriangles(level: CompiledArchitecture, name: keyof typeof catalog, variant?: number): Triangle[] {
  let cached = levels.get(level);
  if (!cached || cached.indices !== level.mesh.indices.length) {
    const assets = new Map<string, Triangle[]>();
    for (const [triangle, surfaceIndex] of level.mesh.surfaces.entries()) {
      if (level.surfaces[surfaceIndex].material !== "stock-grocer-props") continue;
      const indices = level.mesh.indices.slice(triangle * 3, triangle * 3 + 3);
      const key = uvFace(indices.map(index => level.mesh.uv.slice(index * 2, index * 2 + 2)));
      const owners = faceOwners.get(key);
      if (!owners) continue;
      const points = indices.map(index => new Vector3().fromArray(level.mesh.positions, index * 3)) as Triangle;
      for (const owner of owners) {
        const faces = assets.get(owner) ?? [];
        faces.push(points);
        assets.set(owner, faces);
      }
    }
    cached = { indices: level.mesh.indices.length, assets };
    levels.set(level, cached);
  }
  return cached.assets.get(variant === undefined ? name : `${name}/${variant}`) ?? [];
}

/** Groups actual emitted faces through shared positions, independently of UV seams and triangle ordering. */
export function connectedBodies(triangles: Triangle[]): Triangle[][] {
  const vertices = new Map<string, number[]>();
  const keys = triangles.map(triangle => triangle.map(point => point.toArray().map(value => Math.round(value * 1e6)).join("/")));
  keys.forEach((points, index) => points.forEach(key => {
    const faces = vertices.get(key) ?? [];
    faces.push(index);
    vertices.set(key, faces);
  }));
  const remaining = new Set(triangles.keys()), bodies: Triangle[][] = [];
  while (remaining.size) {
    const pending = [remaining.values().next().value!], body: Triangle[] = [];
    remaining.delete(pending[0]);
    while (pending.length) {
      const index = pending.pop()!;
      body.push(triangles[index]);
      for (const key of keys[index]) for (const neighbor of vertices.get(key)!) {
        if (!remaining.delete(neighbor)) continue;
        pending.push(neighbor);
      }
    }
    bodies.push(body);
  }
  return bodies;
}

/** Separates UV-sharing miniatures from whole floor props by their actual support elevation. */
export function groundedTriangles(triangles: Triangle[], floor = 0): Triangle[] {
  return connectedBodies(triangles).filter(body => Math.abs(Math.min(...body.flat().map(point => point.z)) - floor) <= .00002).flat();
}
