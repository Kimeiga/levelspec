import type { CompiledLevel } from "../src/vector/types.ts";
/** Requires every visible static receiver to have an atlas page; nonreceivers retain live shading. */
export function validateReceiverPages(
  level: CompiledLevel,
  pages: number[],
  pageCount: number,
): number {
  if (pages.length !== level.mesh.surfaces.length)
    throw new Error("Baked receiver count does not match.");
  let fallback = 0;
  for (let t = 0; t < pages.length; t++) {
    const page = pages[t];
    if (Number.isInteger(page) && page >= 0 && page < pageCount) continue;
    if (page !== -1) throw new Error("Invalid baked page index.");
    const surface = level.surfaces[level.mesh.surfaces[t]];
    if (surface.dynamic || surface.visible === false) {
      fallback++;
      continue;
    }
    throw new Error(
      "A visible static surface is missing from the baked atlas.",
    );
  }
  return fallback;
}
