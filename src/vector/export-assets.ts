import type { CompiledLevel } from "./types.ts";
import { aborted } from "./types.ts";

export type ExportFormat = "glb" | "gltf" | "fbx" | "bsp";
export interface ExportAsset {
  bytes: Uint8Array;
  mimeType: "image/png" | "image/jpeg";
  hash: string;
  file: string;
}
export interface ExportOptions {
  assets?: Record<string, ExportAsset>;
}
export type ExportFiles = Record<string, string | Uint8Array>;

export function exportName(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 100) || "level";
}

/** Asset I/O is supplied by the host; synchronous writers only consume bytes. */
export async function resolveExportAssets(
  level: CompiledLevel,
  read: (reference: string) => Promise<Uint8Array>,
  signal?: AbortSignal,
): Promise<Record<string, ExportAsset>> {
  const assets: Record<string, ExportAsset> = Object.create(null);
  for (const material of level.document.materials) {
    const ref = material.texture;
    if (!ref || assets[ref]) continue;
    aborted(signal);
    let bytes: Uint8Array;
    try {
      bytes = await read(ref);
    } catch (error) {
      throw new Error(
        `Material ${material.id}: cannot resolve texture "${ref}": ${(error as Error).message}`,
      );
    }
    aborted(signal);
    const png = [137, 80, 78, 71, 13, 10, 26, 10].every(
      (v, i) => bytes[i] === v,
    );
    const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    if (!png && !jpeg)
      throw new Error(
        `Material ${material.id}: "${ref}" must be a PNG or JPEG image.`,
      );
    const hash = Array.from(
      new Uint8Array(
        await crypto.subtle.digest("SHA-256", Uint8Array.from(bytes).buffer),
      ),
      (n) => n.toString(16).padStart(2, "0"),
    ).join("");
    assets[ref] = {
      bytes,
      hash,
      mimeType: png ? "image/png" : "image/jpeg",
      file: `textures/${hash}.${png ? "png" : "jpg"}`,
    };
  }
  return assets;
}

export function assertExportable(
  level: CompiledLevel,
  options: ExportOptions = {},
) {
  if (level.diagnostics.some((d) => d.severity === "error"))
    throw new Error(
      "Cannot export invalid geometry. Resolve compilation errors first.",
    );
  if (!level.mesh.indices.length)
    throw new Error("Cannot export an empty model.");
  for (const m of level.document.materials)
    if (m.texture && !options.assets?.[m.texture])
      throw new Error(
        `Material ${m.id}: unresolved texture "${m.texture}". Supply resolved export assets.`,
      );
}

export function exportMetadata(level: CompiledLevel, formats: ExportFormat[]) {
  return {
    version: 1,
    id: level.document.id,
    name: level.document.name,
    geometryHash: level.geometryHash,
    coordinates: {
      source: "right-handed Z-up metres",
      glb: "Y-up metres: (x,z,-y)",
      gltf: "Y-up metres: (x,z,-y)",
      fbx: "Y-up, -Z forward; metre scene with FBX unit metadata",
      bsp: "Z-up, 32 units per metre",
    },
    formats,
    parts: level.parts,
    surfaces: level.surfaces,
    materials: level.document.materials,
    markers: level.document.markers,
    routes: level.document.routes,
    links: level.document.links,
    lights: level.document.lights,
    sky: level.document.sky,
    layers: level.document.layers.map(({ id, label }) => ({ id, label })),
    atlas: level.atlas,
    uvChannels: { material: 0, lightmap: level.mesh.uv1 ? 1 : null },
    uvCoordinates: {
      source: "bottom-left",
      glb: "(u, 1-v); tangent.w negated",
      gltf: "(u, 1-v); tangent.w negated",
      fbx: "unchanged",
    },
    lighting:
      "Lightmap coordinates only; baked illumination is not packaged or bound automatically.",
  };
}
