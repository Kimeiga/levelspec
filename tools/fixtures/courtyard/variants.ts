import { parseAml, serializeAml } from "../../../src/architecture/index.ts";
import { buildCourtyard, type CourtOptions } from "./architecture.ts";

/** Changes the one native courtyard Bezier while retaining all other source data. */
export function sourceForCurve(template: string, curve: number): string {
  const value = curve;
  const document = parseAml(template),
    path = document.paths.find((path) => path.id === "courtyard.e0:path");
  if (
    !path ||
    path.segments.length !== 1 ||
    path.segments[0].kind !== "bezier" ||
    path.segments[0].controls.length !== 2
  )
    throw new Error("Demo fixture must have exactly one courtyard curve.");
  path.segments[0].controls = [
    [4, -value, 0],
    [10, -value, 0],
  ];
  return serializeAml(document);
}

/** Builds fixed geometry/material variants for bake tooling and compiler acceptance. */
export function sourceForState({ curve = 3, height = 3, blocked = false, look = "clay" }: Partial<CourtOptions> & { curve?: number } = {}): string {
  return sourceForCurve(buildCourtyard({ height, blocked, look }), curve);
}
