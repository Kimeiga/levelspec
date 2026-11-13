import type { Diagnostic, Material } from "./types.ts";

/** Lists rendered image slots, excluding compile-only inputs and duplicate paths. */
export function materialTextures(material: Material): string[] {
  return [
    ...new Set(
      [material.texture, material.normalTexture, material.metallicRoughnessTexture].filter(
        (path): path is string => Boolean(path),
      ),
    ),
  ];
}

/** Lists every authored companion needed to reproduce the material, including height input. */
export function materialCompanions(material: Material): string[] {
  return [...new Set([...materialTextures(material), ...(material.heightTexture ? [material.heightTexture] : [])])];
}

/** Returns the first definite invalid channel combination, preserving a concise source diagnostic. */
function materialError(material: Material): string | undefined {
  if (material.emissive !== undefined && !/^#[0-9a-f]{6}$/i.test(material.emissive))
    return "emissive must be a six-digit sRGB hex color.";
  if (material.emissiveStrength !== undefined && (!Number.isFinite(material.emissiveStrength) || material.emissiveStrength < 0))
    return "emissive-strength must be finite and nonnegative.";
  if (material.emissiveStrength !== undefined && material.emissive === undefined)
    return "emissive-strength requires emissive.";
  for (const [name, reference] of [
    ["normal-texture", material.normalTexture],
    ["metallic-roughness-texture", material.metallicRoughnessTexture],
    ["height-texture", material.heightTexture],
  ] as const) {
    if (reference !== undefined && (typeof reference !== "string" || !reference.trim())) {
      return `${name} must name an image companion.`;
    }
  }
  if (
    material.normalScale !== undefined &&
    (!Number.isFinite(material.normalScale) || material.normalScale < 0)
  )
    return "normal-scale must be finite and nonnegative.";
  if (material.normalScale !== undefined && !material.normalTexture)
    return "normal-scale requires normal-texture.";
  if (material.heightScale !== undefined &&
    (!Number.isFinite(material.heightScale) || material.heightScale < 0))
    return "height-scale must be finite and nonnegative.";
  if (material.heightOffset !== undefined && !Number.isFinite(material.heightOffset))
    return "height-offset must be finite.";
  if ((material.heightScale !== undefined || material.heightOffset !== undefined) && !material.heightTexture)
    return "height-scale and height-offset require height-texture.";
  if (material.opacity !== undefined &&
    (!Number.isFinite(material.opacity) || material.opacity < 0 || material.opacity > 1))
    return "opacity must be finite and between zero and one.";
  if (material.opacity !== undefined && material.opacity < 1 && material.alphaCutoff !== undefined)
    return "opacity below one cannot be combined with alpha-cutoff.";
  if (
    material.alphaCutoff !== undefined &&
    !(material.alphaCutoff > 0 && material.alphaCutoff < 1)
  )
    return "alpha-cutoff must be greater than 0 and less than 1.";
  if (material.alphaCutoff !== undefined && !material.texture)
    return "alpha-cutoff requires texture.";
}

/** Validates optional material channels for both parsed AML and direct native API documents. */
export function validateMaterial(material: Material): Diagnostic[] {
  const message = materialError(material);
  return message
    ? [
        {
          severity: "error",
          code: "AML_MATERIAL",
          message,
          objects: [material.id],
          source: material.source,
        },
      ]
    : [];
}
