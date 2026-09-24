import { validateProps } from "./props.ts";
import { validateReference } from "./reference.ts";
import type { Diagnostic, LevelDocument, Named } from "./types.ts";

function report(
  diagnostics: Diagnostic[],
  object: Named,
  message: string,
  code = "TOPOLOGY",
): void {
  diagnostics.push({
    severity: "error",
    code,
    message,
    objects: [object.id],
    source: object.source,
  });
}

function validateIds(
  document: LevelDocument,
  diagnostics: Diagnostic[],
): void {
  const allIds = new Set<string>();
  for (const object of [
    document,
    ...document.layers.flatMap((layer) => [
      layer,
      ...layer.vertices,
      ...layer.edges,
      ...layer.regions,
      ...layer.edges.flatMap((edge) => edge.openings),
    ]),
    ...document.seams,
    ...document.covers,
    ...(document.props ?? []),
    ...(document.assets ?? []),
    ...(document.references ?? []).flatMap((reference) => [
      reference,
      ...reference.landmarks,
      ...reference.masks,
    ]),
    ...document.materials,
    ...document.markers,
    ...document.links,
    ...document.routes,
    ...document.lights,
  ]) {
    if (allIds.has(object.id))
      report(diagnostics, object, `Duplicate id ${object.id}.`, "DUPLICATE_ID");
    allIds.add(object.id);
  }
}

export function validateDocument(
  document: LevelDocument,
  diagnostics: Diagnostic[],
): Set<string> {
  for (const [name, value] of Object.entries({
    wallThickness: document.wallThickness,
    wallHeight: document.wallHeight,
    floorThickness: document.floorThickness,
    curveTolerance: document.curveTolerance,
  })) {
    if (!Number.isFinite(value) || value <= 0)
      report(diagnostics, document, `${name} must be positive.`, "DIMENSION");
  }
  if (document.curveTolerance < 0.00001)
    report(
      diagnostics,
      document,
      "curve-tolerance must be at least 0.00001 metres.",
      "DIMENSION",
    );

  validateIds(document, diagnostics);

  diagnostics.push(
    ...validateProps(document),
    ...(document.references ?? []).flatMap(validateReference),
  );

  const materials = new Set(document.materials.map((material) => material.id));
  for (const material of document.materials) {
    if (
      material.repeat <= 0 ||
      !Number.isFinite(material.repeat) ||
      material.roughness < 0 ||
      material.roughness > 1 ||
      material.metalness < 0 ||
      material.metalness > 1 ||
      !/^#[0-9a-f]{6}$/i.test(material.color)
    )
      report(
        diagnostics,
        material,
        "Invalid material color, repeat, roughness, or metalness.",
        "MATERIAL",
      );
  }
  return materials;
}
