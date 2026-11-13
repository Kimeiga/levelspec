import { AmlError } from "../../architecture/format.ts";
import type { CompiledArchitecture, V3 } from "../../architecture/types.ts";
import { spatialDiagnostic } from "../../vector/diagnostics.ts";
import type { SurfaceChart } from "./types.ts";

/** Locates failed surface work on its receiver without relying on partially generated geometry. */
export function surfaceAppearanceError(level: CompiledArchitecture, error: unknown, chart?: SurfaceChart): AmlError {
  const points: V3[] = [];
  if (chart?.raster?.coordinates === "uv") {
    for (const triangle of chart.triangleIndices ?? Array.from({ length: chart.triangleCount }, (_, i) => chart.firstTriangle + i))
      for (const index of level.mesh.indices.slice(triangle * 3, triangle * 3 + 3)) {
        const point = level.mesh.positions.slice(index * 3, index * 3 + 3) as V3;
        if (point.length === 3 && point.every(Number.isFinite)) points.push(point);
      }
  } else if (chart) {
    for (const u of [chart.bounds[0], chart.bounds[2]]) for (const v of [chart.bounds[1], chart.bounds[3]]) {
      const point = chart.frame.origin.map((value, axis) => value + chart.frame.u[axis] * u + chart.frame.v[axis] * v) as V3;
      if (point.every(Number.isFinite)) points.push(point);
    }
  }
  const message = error instanceof Error ? error.message : String(error);
  const diagnostic = spatialDiagnostic(level, "AML_SURFACE_APPEARANCE", `${chart?.id ?? "surface"}: ${message}`,
    chart ? [chart.host] : [], points, "error");
  diagnostic.source ??= level.architecture.source;
  return new AmlError([diagnostic]);
}
