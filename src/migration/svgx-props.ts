import type { Named, Diagnostic, V3 } from "../vector/types.ts";
import type { SvgxDocument } from "./svgx-types.ts";
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
export function validateProps(document: SvgxDocument): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const fail = (o: Named, message: string) =>
    diagnostics.push({
      severity: "error",
      code: "PROP",
      message,
      objects: [o.id],
      source: o.source,
    });
  const layers = new Set(document.layers.map((l) => l.id));
  const materials = new Set([
    "default",
    ...document.materials.map((m) => m.id),
  ]);
  const assets = new Set((document.assets ?? []).map((a) => a.id));
  if ((document.props?.length ?? 0) > 20_000)
    fail(document, "A document may contain at most 20000 prop instances.");
  for (const asset of document.assets ?? [])
    if (!asset.src.trim())
      fail(asset, "An asset needs a nonempty src reference.");
  for (const prop of document.props ?? []) {
    if (!layers.has(prop.layer))
      fail(prop, `Unknown prop layer ${prop.layer}.`);
    if (!materials.has(prop.material))
      fail(prop, `Unknown prop material ${prop.material}.`);
    if (
      ![prop.position, prop.rotation, prop.scale].every(
        (v) => v.length === 3 && v.every(Number.isFinite),
      ) ||
      prop.scale.some((n) => n <= 0)
    )
      fail(
        prop,
        "Prop transforms require finite XYZ triples and strictly positive scale.",
      );
    if (!["solid", "none", "box"].includes(prop.collision))
      fail(prop, "Prop collision must explicitly be solid, none, or box.");
    if (!["box", "cylinder", "asset"].includes(prop.shape))
      fail(prop, "Unknown prop shape.");
    if (prop.shape === "asset" && (!prop.asset || !assets.has(prop.asset)))
      fail(prop, `Unknown mesh asset ${prop.asset ?? "(missing)"}.`);
    if (prop.shape !== "asset" && prop.asset !== undefined)
      fail(prop, "Only asset props can name a mesh asset.");
    if (prop.shape !== "cylinder" && prop.segments !== undefined)
      fail(prop, "Only cylinders accept segments.");
    if (
      prop.shape === "cylinder" &&
      (!Number.isInteger(prop.segments ?? 16) ||
        (prop.segments ?? 16) < 3 ||
        (prop.segments ?? 16) > 128)
    )
      fail(prop, "Cylinder segments must be an integer between 3 and 128.");
  }
  return diagnostics;
}
