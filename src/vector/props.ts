import type { Named, V3 } from "./types.ts";
import { cross, sub } from "./geometry.ts";

export interface MeshAsset extends Named {
  src: string;
}
export interface AssetGeometry {
  positions: V3[];
  triangles: [number, number, number][];
}
export type AssetResolver = (
  asset: MeshAsset,
  signal?: AbortSignal,
) => Promise<AssetGeometry>;
export const MAX_ASSET_TRIANGLES = 250_000;
/** Rotates a point by extrinsic X, Y, then Z angles in degrees. */
export function rotateXYZ(point: V3, degrees: V3): V3 {
  const [rx, ry, rz] = degrees.map((d) => (d * Math.PI) / 180);
  const [x, y, z] = point;
  const Y = y * Math.cos(rx) - z * Math.sin(rx),
    Z = y * Math.sin(rx) + z * Math.cos(rx);
  const X = x * Math.cos(ry) + Z * Math.sin(ry),
    ZZ = -x * Math.sin(ry) + Z * Math.cos(ry);
  return [
    X * Math.cos(rz) - Y * Math.sin(rz),
    X * Math.sin(rz) + Y * Math.cos(rz),
    ZZ,
  ];
}
export function boxGeometry(
  min: V3 = [-0.5, -0.5, 0],
  max: V3 = [0.5, 0.5, 1],
): AssetGeometry {
  const [x, y, z] = min,
    [X, Y, Z] = max;
  return {
    positions: [
      [x, y, z],
      [X, y, z],
      [X, Y, z],
      [x, Y, z],
      [x, y, Z],
      [X, y, Z],
      [X, Y, Z],
      [x, Y, Z],
    ],
    triangles: [
      [0, 2, 1],
      [0, 3, 2],
      [4, 5, 6],
      [4, 6, 7],
      [0, 1, 5],
      [0, 5, 4],
      [1, 2, 6],
      [1, 6, 5],
      [2, 3, 7],
      [2, 7, 6],
      [3, 0, 4],
      [3, 4, 7],
    ],
  };
}
export function cylinderGeometry(segments = 16): AssetGeometry {
  if (!Number.isInteger(segments) || segments < 3 || segments > 128)
    throw new Error("Cylinder segments must be an integer between 3 and 128.");
  const positions: V3[] = [],
    triangles: [number, number, number][] = [];
  for (const z of [0, 1])
    for (let i = 0; i < segments; i++)
      positions.push([
        0.5 * Math.cos((i * 2 * Math.PI) / segments),
        0.5 * Math.sin((i * 2 * Math.PI) / segments),
        z,
      ]);
  const bottom = positions.push([0, 0, 0]) - 1,
    top = positions.push([0, 0, 1]) - 1;
  for (let i = 0; i < segments; i++) {
    const j = (i + 1) % segments;
    triangles.push(
      [bottom, j, i],
      [top, i + segments, j + segments],
      [i, j, j + segments],
      [i, j + segments, i + segments],
    );
  }
  return { positions, triangles };
}
/** Validates bounded triangle data for loading/rendering, without architectural topology checks. */
export function validateMeshData(geometry: AssetGeometry): void {
  if (
    !geometry.positions.length ||
    geometry.positions.length > MAX_ASSET_TRIANGLES * 3 ||
    !geometry.triangles.length ||
    geometry.triangles.length > MAX_ASSET_TRIANGLES
  )
    throw new Error(
      `An asset must have 1 to ${MAX_ASSET_TRIANGLES} triangles.`,
    );
  if (
    geometry.positions.some(
      (p) =>
        p.length !== 3 ||
        p.some((n) => !Number.isFinite(n) || Math.abs(n) > 1e7),
    )
  )
    throw new Error(
      "Asset positions must be finite XYZ coordinates within 10 million metres.",
    );
  for (const tri of geometry.triangles) {
    if (
      tri.length !== 3 ||
      tri.some(
        (i) => !Number.isInteger(i) || i < 0 || i >= geometry.positions.length,
      )
    )
      throw new Error(
        "Asset triangle indices must reference existing vertices.",
      );
  }
}
/** Native physical facets additionally require meaningful nondegenerate triangles. */
export function validateAssetGeometry(geometry: AssetGeometry): void {
  validateMeshData(geometry);
  for (const tri of geometry.triangles) {
    const [a, b, c] = tri.map((i) => geometry.positions[i]);
    if (Math.hypot(...cross(sub(b, a), sub(c, a))) < 1e-10)
      throw new Error("Asset contains a degenerate triangle.");
  }
}
