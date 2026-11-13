/** Theme-level failure policy for units already intersected by a continuous weathering boundary. */
export const TILE_PEELING = { threshold: 0.45, variation: 0.25, removalChance: 0.65 } as const;

/** Independent unit defects at maximum wear; intact areas still retain predominantly complete tiles. */
export const TILE_DEFECTS = { missingChance: 0.02, chipChance: 0.25 } as const;

/** Uses independent seeded rolls so peeling decisions cannot move the underlying damage field. */
export function tilePeelAction(weatheredFraction: number, thresholdRoll: number, outcomeRoll: number): "retain" | "remove" | "chip" {
  if (weatheredFraction <= TILE_PEELING.threshold + thresholdRoll * TILE_PEELING.variation) return "retain";
  return outcomeRoll < TILE_PEELING.removalChance ? "remove" : "chip";
}
