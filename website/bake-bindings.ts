import type { CompiledLevel } from "../src/vector/types.ts";
/** Never sample an invalid atlas page. Tiny unassigned CSG slivers retain live shading. */
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
    if (level.surfaces[level.mesh.surfaces[t]].dynamic) {
      fallback++;
      continue;
    }
    const [a, b, c] = level.mesh.indices
      .slice(t * 3, t * 3 + 3)
      .map((v) => level.mesh.positions.slice(v * 3, v * 3 + 3));
    const u = b.map((v, i) => v - a[i]),
      v = c.map((n, i) => n - a[i]);
    const area =
      0.5 *
      Math.hypot(
        u[1] * v[2] - u[2] * v[1],
        u[2] * v[0] - u[0] * v[2],
        u[0] * v[1] - u[1] * v[0],
      );
    // Below one square millimetre, at the existing authoring coordinate precision.
    if (!Number.isFinite(area) || area > 1e-6)
      throw new Error(
        "A visible static surface is missing from the baked atlas.",
      );
    fallback++;
  }
  return fallback;
}
