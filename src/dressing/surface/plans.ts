import type { CompiledArchitecture } from "../../architecture/types.ts";
import type { SurfaceChart } from "./types.ts";

// Recipes live only until compilation; functions and decoded images never enter runtime JSON.
const plans = new WeakMap<CompiledArchitecture, SurfaceChart[]>();

export function registerSurfaceChart(level: CompiledArchitecture, chart: SurfaceChart): void {
  const list = plans.get(level) ?? [];
  list.push(chart);
  plans.set(level, list);
}

/**
 * Moves unfinished receivers to an assembled mesh, rebasing their triangle ranges.
 * Keeps the original objects and lazy getters alive for later fixture deposits;
 * coalescing belongs to takeSurfaceCharts after all deferred drawing has finished.
 */
export function moveSurfaceCharts(source: CompiledArchitecture, target: CompiledArchitecture, triangleOffset: number): void {
  const charts = plans.get(source);
  if (!charts) return;
  const destination = plans.get(target) ?? [];
  for (const chart of charts) {
    chart.firstTriangle += triangleOffset;
    if (chart.triangleIndices)
      for (let i = 0; i < chart.triangleIndices.length; i++) chart.triangleIndices[i] += triangleOffset;
    destination.push(chart);
  }
  plans.set(target, destination);
  plans.delete(source);
}

export function takeSurfaceCharts(level: CompiledArchitecture): SurfaceChart[] {
  const charts = plans.get(level) ?? [];
  plans.delete(level);
  const output: SurfaceChart[] = [], groups = new Map<string, SurfaceChart>();
  for (const chart of charts) {
    if (!chart.mergeGroup) { output.push(chart); continue; }
    const centerU = (chart.bounds[0] + chart.bounds[2]) / 2, centerV = (chart.bounds[1] + chart.bounds[3]) / 2;
    const cell = chart.raster?.geometry === "preserve" ? "raster" : `${Math.floor(centerU / 0.75)}/${Math.floor(centerV / 0.75)}`;
    const key = `${chart.mergeGroup}/${JSON.stringify(chart.elevationRange)}/${JSON.stringify(chart.layerElevations)}/${cell}`;
    const previous = groups.get(key);
    const indices = chart.triangleIndices ?? Array.from({ length: chart.triangleCount }, (_, i) => chart.firstTriangle + i);
    if (!previous) {
      const merged = { ...chart, triangleIndices: indices, bounds: [...chart.bounds] as SurfaceChart["bounds"], raster: chart.raster ? { ...chart.raster } : undefined };
      groups.set(key, merged); output.push(merged); continue;
    }
    previous.triangleIndices!.push(...indices);
    previous.triangleCount += chart.triangleCount;
    previous.bounds = [Math.min(previous.bounds[0], chart.bounds[0]), Math.min(previous.bounds[1], chart.bounds[1]), Math.max(previous.bounds[2], chart.bounds[2]), Math.max(previous.bounds[3], chart.bounds[3])];
    if (previous.raster?.geometry === "preserve") previous.raster.bounds = [...previous.bounds];
    previous.geometryStep = Math.min(previous.geometryStep ?? 0.12, chart.geometryStep ?? 0.12);
    if (previous.constructionCuts || chart.constructionCuts) previous.constructionCuts = {
      u: [...(previous.constructionCuts?.u ?? []), ...(chart.constructionCuts?.u ?? [])],
      v: [...(previous.constructionCuts?.v ?? []), ...(chart.constructionCuts?.v ?? [])],
    };
  }
  return output;
}
