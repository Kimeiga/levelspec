/** Shared by Node baking and the browser; excludes editorial/source metadata. */
import { REVISION } from "three";
import { hash } from "../vector/geometry.ts";
import type { CompiledLevel } from "../vector/types.ts";
export const COMPILER_REVISION = "levelspec-2-preview-6";
export const TRANSPORT_REVISION = "hybrid-v1";
export function lightingState(level: CompiledLevel) {
  return {
    geometry: level.geometryHash,
    atlas: level.atlas?.uvHash,
    materials: level.document.materials.map(
      ({ id, color, repeat, roughness, metalness, texture }) => ({
        id,
        color,
        repeat,
        roughness,
        metalness,
        texture,
      }),
    ),
    lights: level.document.lights.map(
      ({ id, kind, position, target, color, intensity, angle }) => ({
        id,
        kind,
        position,
        target,
        color,
        intensity,
        angle,
      }),
    ),
    sky: level.document.sky,
    compiler: COMPILER_REVISION,
    renderer: REVISION,
    transport: TRANSPORT_REVISION,
  };
}
export const lightingStateKey = (level: CompiledLevel) =>
  JSON.stringify(lightingState(level));
export const lightingStateHash = (level: CompiledLevel) =>
  hash(lightingState(level));
export async function validateLightingManifest(
  level: CompiledLevel,
  manifest: any,
) {
  if (!level.atlas)
    throw new Error("Generate lightmap UVs before loading lighting.");
  if (
    manifest.version !== 1 ||
    manifest.uvChannel !== 1 ||
    manifest.flipY !== false ||
    manifest.colorSpace !== "Linear-sRGB"
  )
    throw new Error("Unsupported lightmap binding or color space.");
  if (
    manifest.geometryHash !== level.geometryHash ||
    manifest.uvHash !== level.atlas.uvHash ||
    manifest.stateHash !== (await lightingStateHash(level))
  )
    throw new Error(
      "Stale lighting: geometry, UVs, materials, lights, or compiler revision changed.",
    );
  if (
    !Number.isFinite(manifest.irradianceScale) ||
    manifest.irradianceScale <= 0
  )
    throw new Error("Invalid calibrated lightmap scale.");
  if (
    !Number.isInteger(manifest.safeMip) ||
    manifest.safeMip < 0 ||
    manifest.safeMip > level.atlas.safeMip
  )
    throw new Error("Lightmap mip range exceeds the validated atlas padding.");
  if (
    !Array.isArray(manifest.pages) ||
    manifest.pages.length !== level.atlas.pages.length
  )
    throw new Error("Lightmap page count does not match the receiver mesh.");
  for (let i = 0; i < manifest.pages.length; i++) {
    const p = manifest.pages[i];
    if (
      p.id !== i ||
      !Array.isArray(p.mips) ||
      p.mips.length !== manifest.safeMip
    )
      throw new Error("Incomplete lightmap page or mip chain.");
    for (const f of [{ file: p.file, sha256: p.sha256 }, ...p.mips])
      if (!f.file || !/^[0-9a-f]{64}$/.test(f.sha256))
        throw new Error("Every lightmap image must have a SHA-256 checksum.");
  }
}
export async function sha256Bytes(bytes: ArrayBuffer) {
  return Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
}
