import { heightAt } from "../src/vector/geometry.ts";
import type { CompiledLevel, NavigationReport } from "../src/vector/types.ts";

/** Filters display triangles by their centroid's authored floor, preserving navigation data. */
export function navigationIndices(
  level: CompiledLevel,
  nav: NavigationReport,
  layer: string,
  component?: string,
): number[] {
  if (component) {
    const indices = nav.indices.flatMap((index, i) =>
      nav.triangleComponents[Math.floor(i / 3)] === component ? [index] : [],
    );
    return layer
      ? navigationIndices(level, { ...nav, indices }, layer)
      : indices;
  }
  if (!layer) return nav.indices;
  const floors = [...level.floors, ...(level.water ?? [])].filter(
    (floor) => floor.layer === layer,
  );
  const result: number[] = [];
  for (let t = 0; t < nav.indices.length; t += 3) {
    const triangle = nav.indices.slice(t, t + 3);
    const center = [0, 1, 2].map(
      (axis) =>
        triangle.reduce((sum, i) => sum + nav.positions[i * 3 + axis], 0) / 3,
    );
    const belongs = floors.some((floor) => {
      const z = heightAt(floor, center[0], center[1]);
      return (
        z !== undefined &&
        Math.abs(z - center[2]) < Math.max(0.3, nav.settings.cellHeight * 3)
      );
    });
    if (belongs) result.push(...triangle);
  }
  return result;
}
