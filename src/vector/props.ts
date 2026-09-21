import type { Diagnostic, LevelDocument, Named, V3 } from "./types.ts";
import { aborted } from "./types.ts";
import { cross, sub } from "./geometry.ts";

export interface MeshAsset extends Named { src: string }
export interface AssetGeometry { positions: V3[]; triangles: [number, number, number][] }
export type AssetResolver = (asset: MeshAsset, signal?: AbortSignal) => Promise<AssetGeometry>;
export interface SceneProp extends Named {
  layer: string;
  shape: "box" | "cylinder" | "asset";
  /** Bottom centre for unit primitives; native origin for imported assets. */
  position: V3;
  /** Extrinsic X, then Y, then Z rotations in degrees. */
  rotation: V3;
  /** XYZ dimensions for unit primitives; scale factors for assets. */
  scale: V3;
  material: string;
  /** none is visual only; box uses an invisible local-bounds collision proxy. */
  collision: "solid" | "none" | "box";
  asset?: string;
  segments?: number;
}
export const MAX_ASSET_TRIANGLES = 250_000;
export function rotateXYZ(point: V3, degrees: V3): V3 {
  const [rx, ry, rz] = degrees.map((d) => d * Math.PI / 180);
  const [x, y, z] = point;
  const Y = y * Math.cos(rx) - z * Math.sin(rx), Z = y * Math.sin(rx) + z * Math.cos(rx);
  const X = x * Math.cos(ry) + Z * Math.sin(ry), ZZ = -x * Math.sin(ry) + Z * Math.cos(ry);
  return [X * Math.cos(rz) - Y * Math.sin(rz), X * Math.sin(rz) + Y * Math.cos(rz), ZZ];
}
export function transformPropPoint(prop: Pick<SceneProp, "position" | "rotation" | "scale">, point: V3): V3 {
  const rotated = rotateXYZ(point.map((n, i) => n * prop.scale[i]) as V3, prop.rotation);
  return rotated.map((n, i) => n + prop.position[i]) as V3;
}
export function boxGeometry(min: V3 = [-0.5, -0.5, 0], max: V3 = [0.5, 0.5, 1]): AssetGeometry {
  const [x, y, z] = min, [X, Y, Z] = max;
  return {
    positions: [[x,y,z],[X,y,z],[X,Y,z],[x,Y,z],[x,y,Z],[X,y,Z],[X,Y,Z],[x,Y,Z]],
    triangles: [[0,2,1],[0,3,2],[4,5,6],[4,6,7],[0,1,5],[0,5,4],
      [1,2,6],[1,6,5],[2,3,7],[2,7,6],[3,0,4],[3,4,7]],
  };
}
export function cylinderGeometry(segments = 16): AssetGeometry {
  if (!Number.isInteger(segments) || segments < 3 || segments > 128)
    throw new Error("Cylinder segments must be an integer between 3 and 128.");
  const positions: V3[] = [], triangles: [number, number, number][] = [];
  for (const z of [0, 1]) for (let i = 0; i < segments; i++)
    positions.push([0.5 * Math.cos(i * 2 * Math.PI / segments), 0.5 * Math.sin(i * 2 * Math.PI / segments), z]);
  const bottom = positions.push([0, 0, 0]) - 1, top = positions.push([0, 0, 1]) - 1;
  for (let i = 0; i < segments; i++) {
    const j = (i + 1) % segments;
    triangles.push([bottom,j,i],[top,i+segments,j+segments],[i,j,j+segments],[i,j+segments,i+segments]);
  }
  return { positions, triangles };
}
export function validateAssetGeometry(geometry: AssetGeometry): void {
  if (!geometry.positions.length || geometry.positions.length > MAX_ASSET_TRIANGLES * 3 ||
      !geometry.triangles.length || geometry.triangles.length > MAX_ASSET_TRIANGLES)
    throw new Error(`An asset must have 1 to ${MAX_ASSET_TRIANGLES} triangles.`);
  if (geometry.positions.some((p) => p.length !== 3 || p.some((n) => !Number.isFinite(n) || Math.abs(n) > 1e7)))
    throw new Error("Asset positions must be finite XYZ coordinates within 10 million metres.");
  for (const tri of geometry.triangles) {
    if (tri.length !== 3 || tri.some((i) => !Number.isInteger(i) || i < 0 || i >= geometry.positions.length))
      throw new Error("Asset triangle indices must reference existing vertices.");
    const [a,b,c] = tri.map((i) => geometry.positions[i]);
    if (Math.hypot(...cross(sub(b,a),sub(c,a))) < 1e-10)
      throw new Error("Asset contains a degenerate triangle.");
  }
}
export function validateProps(document: LevelDocument): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const fail = (o: Named, message: string) => diagnostics.push({ severity: "error", code: "PROP", message, objects: [o.id], source: o.source });
  const layers = new Set(document.layers.map((l) => l.id));
  const materials = new Set(["default", ...document.materials.map((m) => m.id)]);
  const assets = new Set((document.assets ?? []).map((a) => a.id));
  if ((document.props?.length ?? 0) > 20_000) fail(document, "A document may contain at most 20000 prop instances.");
  for (const asset of document.assets ?? [])
    if (!asset.src.trim()) fail(asset, "An asset needs a nonempty src reference.");
  for (const prop of document.props ?? []) {
    if (!layers.has(prop.layer)) fail(prop, `Unknown prop layer ${prop.layer}.`);
    if (!materials.has(prop.material)) fail(prop, `Unknown prop material ${prop.material}.`);
    if (![prop.position, prop.rotation, prop.scale].every((v) => v.length === 3 && v.every(Number.isFinite)) || prop.scale.some((n) => n <= 0))
      fail(prop, "Prop transforms require finite XYZ triples and strictly positive scale.");
    if (!["solid", "none", "box"].includes(prop.collision)) fail(prop, "Prop collision must explicitly be solid, none, or box.");
    if (!["box", "cylinder", "asset"].includes(prop.shape)) fail(prop, "Unknown prop shape.");
    if (prop.shape === "asset" && (!prop.asset || !assets.has(prop.asset))) fail(prop, `Unknown mesh asset ${prop.asset ?? "(missing)"}.`);
    if (prop.shape !== "asset" && prop.asset !== undefined) fail(prop, "Only asset props can name a mesh asset.");
    if (prop.shape !== "cylinder" && prop.segments !== undefined) fail(prop, "Only cylinders accept segments.");
    if (prop.shape === "cylinder" && (!Number.isInteger(prop.segments ?? 16) || (prop.segments ?? 16) < 3 || (prop.segments ?? 16) > 128))
      fail(prop, "Cylinder segments must be an integer between 3 and 128.");
  }
  return diagnostics;
}
export interface PreparedProp { prop: SceneProp; geometry: AssetGeometry; proxy?: AssetGeometry }
export async function prepareProps(document: LevelDocument, resolveAsset?: AssetResolver, signal?: AbortSignal): Promise<PreparedProp[]> {
  const cache = new Map<string, AssetGeometry>(), result: PreparedProp[] = [];
  let triangles = 0;
  for (const prop of document.props ?? []) {
    aborted(signal);
    try {
      let geometry: AssetGeometry;
      if (prop.shape === "asset") {
        if (!resolveAsset) throw new Error("Supply resolveAsset to compile imported mesh assets.");
        const asset = document.assets!.find((a) => a.id === prop.asset)!;
        let loaded = cache.get(asset.id);
        if (!loaded) {
          loaded = await resolveAsset(asset, signal);
          aborted(signal);
          validateAssetGeometry(loaded);
          cache.set(asset.id, loaded);
        }
        geometry = loaded;
      } else geometry = prop.shape === "box" ? boxGeometry() : cylinderGeometry(prop.segments);
      triangles += geometry.triangles.length;
      if (triangles > 1_000_000) throw new Error("Prop expansion exceeds the one-million-triangle budget.");
      let proxy: AssetGeometry | undefined;
      if (prop.collision === "box") {
        const min: V3 = [Infinity,Infinity,Infinity], max: V3 = [-Infinity,-Infinity,-Infinity];
        for (const p of geometry.positions) for (let i = 0; i < 3; i++) { min[i] = Math.min(min[i],p[i]); max[i] = Math.max(max[i],p[i]); }
        if (min.some((n,i) => max[i] - n < 1e-6)) throw new Error("Box collision needs a nonzero local extent on every axis.");
        const box = boxGeometry(min,max);
        proxy = { positions: box.positions.map((p) => transformPropPoint(prop,p)), triangles: box.triangles };
      }
      result.push({ prop, geometry: {
        positions: geometry.positions.map((p) => transformPropPoint(prop,p)), triangles: geometry.triangles.map((t) => [...t]),
      }, proxy });
    } catch (error) {
      if ((error as Error).name === "AbortError") throw error;
      throw new Error(`Prop ${prop.id}: ${(error as Error).message}`, { cause: prop });
    }
  }
  return result;
}
