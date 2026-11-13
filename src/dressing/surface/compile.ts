import { SurfaceWorkSlice } from "./work-slice.ts";
import { withBuiltinMaterialImages } from "../../materials/images.ts";
import { AmlError } from "../../architecture/format.ts";
import type { ArchitectureCompileOptions, CompiledArchitecture } from "../../architecture/types.ts";
import { materialCompanions } from "../../vector/materials.ts";
import { aborted } from "../../vector/types.ts";
import type { ExportAsset } from "../../vector/export-assets.ts";
import { decodeSurfaceImage, encodeSurfaceImage, imageHash, type SurfaceImage } from "./images.ts";
import { buildSurfaceRegions } from "./regions.ts";
import { heightUVMetric, sourceHeightNormal } from "./height-normal.ts";
import { takeSurfaceCharts } from "./plans.ts";
import type { SurfaceChart, SurfaceSample } from "./types.ts";
import { surfaceAppearanceError } from "./diagnostics.ts";
import { prepareSurfaceRasters } from "./raster-bindings.ts";
import { SurfaceRasterFailure } from "./raster-execution.ts";
import { reusableMaterialChart } from "./material.ts";

const MAXIMUM_HEIGHT_VARIANTS = 1024;

/** Validates receiver ownership and physical sampling frames before resolving external images. */
async function validateCharts(charts: SurfaceChart[], level: CompiledArchitecture, inspect: (chart: SurfaceChart) => void, work: SurfaceWorkSlice): Promise<void> {
  const occupied = new Set<number>();
  const ids = new Set<string>();
  const materials = new Map(level.document.materials.map(material => [material.id, material]));
  for (const chart of charts) {
    const pending = work.checkpoint();
    if (pending) await pending;
    inspect(chart);
    if (ids.has(chart.id)) throw new Error(`Duplicate surface chart ${chart.id}.`);
    ids.add(chart.id);
    if (!chart.bounds.every(Number.isFinite) || chart.bounds[2] <= chart.bounds[0] || chart.bounds[3] <= chart.bounds[1])
      throw new Error(`Invalid bounds for surface chart ${chart.id}.`);
    if (chart.elevationRange && (!chart.elevationRange.every(Number.isFinite) || chart.elevationRange[0] > chart.elevationRange[1]))
      throw new Error(`Invalid elevation range for surface chart ${chart.id}.`);
    if (chart.layerElevations) {
      if (!chart.layerElevations.length || !chart.layerElevations.every(Number.isFinite))
        throw new Error(`Invalid layer elevations for surface chart ${chart.id}.`);
      const sample = chart.sample((chart.bounds[0] + chart.bounds[2]) / 2, (chart.bounds[1] + chart.bounds[3]) / 2);
      if (sample.layers.length !== chart.layerElevations.length)
        throw new Error(`Layer elevations must match sampled layer order for surface chart ${chart.id}.`);
    }
    const axes = [chart.frame.u, chart.frame.v, chart.frame.normal];
    if (!chart.frame.origin.every(Number.isFinite) || axes.some(axis => !axis.every(Number.isFinite) || Math.abs(Math.hypot(...axis) - 1) > 1e-5)
      || axes.some((axis, index) => axes.slice(index + 1).some(other => Math.abs(axis.reduce((sum, value, coordinate) => sum + value * other[coordinate], 0)) > 1e-5)))
      throw new Error(`Surface chart ${chart.id} requires a finite orthonormal meter frame.`);
    if (chart.geometryStep !== undefined && (!Number.isFinite(chart.geometryStep) || chart.geometryStep < 0.005))
      throw new Error(`Invalid geometry step for surface chart ${chart.id}.`);
    const indices = chart.triangleIndices ?? Array.from({ length: chart.triangleCount }, (_, i) => chart.firstTriangle + i);
    if (!Number.isInteger(chart.firstTriangle) || !Number.isInteger(chart.triangleCount) || chart.firstTriangle < 0 || chart.triangleCount < 1 || indices.length !== chart.triangleCount || indices.some(index => !Number.isInteger(index) || index < 0 || index >= level.mesh.surfaces.length))
      throw new Error(`Invalid receiving triangles for surface chart ${chart.id}.`);
    const center = chart.sample((chart.bounds[0] + chart.bounds[2]) / 2, (chart.bounds[1] + chart.bounds[3]) / 2);
    if ((chart.raster?.repeat || chart.vertexTint) && chart.raster?.geometry !== "preserve")
      throw new Error(`Repeated materials and placement tint require preserved geometry at ${chart.id}.`);
    if (chart.raster?.geometry === "preserve" && (chart.layerElevations || center.height !== 0
      || chart.materials.some(id => materials.get(id)?.heightTexture)))
      throw new Error(`Preserved surface ${chart.id} cannot displace geometry or use height sources.`);
    if (chart.raster?.coordinates === "uv") {
      if (chart.layerElevations || center.height !== 0 || center.layers.length !== 1 || center.layers[0].weight !== 1
        || chart.materials.some(id => materials.get(id)?.heightTexture))
        throw new Error(`UV appearance ${chart.id} requires one opaque layer without displacement or height sources.`);
      const bounds = chart.raster.bounds;
      for (const triangle of indices) for (const index of level.mesh.indices.slice(triangle * 3, triangle * 3 + 3)) {
        const uv = level.mesh.uv.slice(index * 2, index * 2 + 2);
        if (uv.length !== 2 || !uv.every(Number.isFinite) || (!chart.raster.repeat && uv.some((value, axis) => value < bounds[axis] - 1e-6 || value > bounds[axis + 2] + 1e-6)))
          throw new Error(`UV appearance ${chart.id} has coordinates outside its raster bounds.`);
      }
    }
    if (chart.raster?.geometry === "preserve") {
      const bounds = chart.raster.bounds;
      for (const triangle of indices) for (const index of level.mesh.indices.slice(triangle * 3, triangle * 3 + 3)) {
        const point = level.mesh.positions.slice(index * 3, index * 3 + 3);
        const coordinates = chart.raster.coordinates === "uv" ? level.mesh.uv.slice(index * 2, index * 2 + 2)
          : [chart.frame.u, chart.frame.v].map(axis => axis.reduce((sum, value, i) => sum + value * (point[i] - chart.frame.origin[i]), 0));
        if (coordinates.some((value, axis) => !Number.isFinite(value) || (!chart.raster!.repeat && (value < bounds[axis] - 1e-5 || value > bounds[axis + 2] + 1e-5))))
          throw new Error(`Preserved surface ${chart.id} has receiving coordinates outside its raster bounds.`);
      }
    }
    const geometricMaterials = new Set(center.layers.map(layer => layer.material));
    if (!chart.raster && center.layers.some(layer => layer.coatings?.length)) throw new Error(`Surface coatings require raster appearance at ${chart.id}.`);
    if (!chart.raster && center.layers.some(layer => layer.roughness !== undefined)) throw new Error(`Layer roughness requires raster appearance at ${chart.id}.`);
    for (const id of chart.materials) {
      const material = materials.get(id);
      if (!material) throw new Error(`Unknown surface chart material ${id}.`);
      if (geometricMaterials.has(id) && ((material.opacity ?? 1) < 1 || material.alphaCutoff !== undefined)) throw new Error(`Opaque surface chart ${chart.id} cannot use a transparent material.`);
    }
    for (const triangle of indices) {
      if (occupied.has(triangle)) throw new Error(`Overlapping surface charts at ${chart.id}.`);
      occupied.add(triangle);
    }
  }
}

/** Resolves material inputs, preserves source PBR maps, and commits complete visual finish geometry. */
export async function compileSurfaceAppearance(level: CompiledArchitecture, options: ArchitectureCompileOptions, maximumTriangles: number): Promise<void> {
  let charts = takeSurfaceCharts(level);
  const work = new SurfaceWorkSlice(options.signal);
  if (!charts.length) return;
  let current = charts[0];
  try {
    aborted(options.signal);
    const detail = level.architecture.dressing?.detail ?? "medium";
    const maximumTexels = options.appearance?.maximumTexels ?? ({ low: 4, medium: 8, high: 16 }[detail] * 1024 * 1024);
    const maximumBytes = options.appearance?.maximumBytes ?? (detail === "high" ? 128 : 64) * 1024 * 1024;
    const maximumCharts = options.appearance?.maximumCharts ?? (detail === "high" ? 32768 : 16384);
    if (![maximumTexels, maximumBytes, maximumCharts].every(value => Number.isFinite(value) && value > 0)) throw new Error("Surface appearance budgets must be finite and positive.");
    if (charts.length > maximumCharts) throw new Error(`Surface appearance chart budget exceeded (${charts.length}/${maximumCharts}); receivers: ${[...new Set(charts.map(chart => chart.host))].map(host => `${host}=${charts.filter(chart => chart.host === host).length}`).join(", ")}.`);
    const sourceMaterials = new Map(level.document.materials.map(material => [material.id, material]));
    const normalized: SurfaceChart[] = [];
    for (const chart of charts) {
      const pending = work.checkpoint();
      if (pending) await pending;
      current = chart;
      normalized.push(reusableMaterialChart(chart, sourceMaterials));
    }
    charts = normalized;
    options.onProgress?.("Surface appearance: validating receivers");
    await validateCharts(charts, level, chart => { current = chart; }, work);
    const materialIds = new Set(charts.flatMap(chart => chart.materials));
    const materials = new Map(level.document.materials.filter(material => materialIds.has(material.id)).map(material => [material.id, material]));
    const images = new Map<string, SurfaceImage>(), sourceHashes: Record<string, string> = {};
    options.onProgress?.("Surface appearance: decoding material images");
    let decodedBytes = 0;
    for (const chart of charts) {
      current = chart;
      for (const id of chart.materials) for (const reference of materialCompanions(materials.get(id)!)) {
        if (images.has(reference)) continue;
        aborted(options.signal);
        const read = options.resolveMaterialImage ?? withBuiltinMaterialImages();
        const bytes = await read(reference, options.signal);
        aborted(options.signal);
        const image = decodeSurfaceImage(bytes, options.decodeMaterialPng);
        decodedBytes += image.data.byteLength;
        if (decodedBytes > 256 * 1024 * 1024) throw new Error("Decoded material inputs exceed 256 MiB.");
        images.set(reference, image);
        sourceHashes[reference] = await imageHash(bytes, options.signal);
      }
    }
    const generated: Record<string, ExportAsset> = {};
    const staged = { ...level, document: { ...level.document, materials: level.document.materials.map(material => ({ ...material })) }, surfaces: [...level.surfaces] };
    let imageBytes = 0, texels = 0;
    const derived = new Map<string, string>(), variants = new Map<string, string>();
    options.onProgress?.("Surface appearance: deriving height normals");
    const prepared: SurfaceChart[] = [];
    for (const chart of charts) {
      current = chart;
      if (!chart.materials.some(id => materials.get(id)?.heightTexture)) { prepared.push(chart); continue; }
      const center = chart.sample((chart.bounds[0] + chart.bounds[2]) / 2, (chart.bounds[1] + chart.bounds[3]) / 2);
      const sourceIds = center.layers.map(layer => layer.material);
      const bindings: string[] = [];
      for (const [index, sourceId] of sourceIds.entries()) {
        const material = materials.get(sourceId);
        if (!material || !chart.materials.includes(sourceId)) throw new Error(`Surface ${chart.id} samples an undeclared height material.`);
        if (!material.heightTexture) { bindings.push(sourceId); continue; }
        const metric = heightUVMetric(chart, index, sourceId);
        const metricKey = `${metric.uScale},${metric.shear},${metric.vScale}`;
        const variantKey = `${sourceId}/${metricKey}`;
        let variant = variants.get(variantKey);
        if (!variant) {
          if (variants.size >= MAXIMUM_HEIGHT_VARIANTS) throw new Error("Surface height-material variant budget exceeded.");
          const key = JSON.stringify([material.heightTexture, material.heightScale ?? 0.01, material.normalTexture, material.normalScale ?? 1, metric]);
          let reference = derived.get(key);
          if (!reference) {
            const height = images.get(material.heightTexture)!;
            const normal = material.normalTexture ? images.get(material.normalTexture) : undefined;
            texels += Math.max(height.width, normal?.width ?? 0) * Math.max(height.height, normal?.height ?? 0);
            if (texels > maximumTexels) throw new Error("Surface appearance texel budget exceeded.");
            if (texels * 4 * 4 / 3 > maximumBytes) throw new Error("Surface appearance byte budget exceeded.");
            const map = await sourceHeightNormal(material, height, normal, options.signal, metric);
            const bytes = encodeSurfaceImage(map), hash = await imageHash(bytes, options.signal);
            imageBytes += bytes.byteLength;
            if (imageBytes > maximumBytes) throw new Error("Encoded surface appearance byte budget exceeded.");
            reference = `$generated/surfaces/${hash}.png`;
            generated[reference] = { bytes, hash, mimeType: "image/png", file: `textures/${hash}.png` };
            images.set(reference, map);
            derived.set(key, reference);
          }
          variant = `$surface/height/${variantKey}`;
          staged.document.materials.push({ ...material, id: variant, normalTexture: reference, normalScale: 1 });
          variants.set(variantKey, variant);
        }
        bindings.push(variant);
      }
      /** Rebinds authored-height layers identically for scalar and row sampling. */
      const bind = (value: SurfaceSample): SurfaceSample => {
        if (value.layers.length !== sourceIds.length || value.layers.some((layer, index) => layer.material !== sourceIds[index]))
          throw new Error(`Surface ${chart.id} must keep its source layer order stable.`);
        return { ...value, layers: value.layers.map((layer, index) => ({ ...layer, material: bindings[index] })) };
      };
      prepared.push({ ...chart, materials: [...new Set([...bindings, ...chart.materials])],
        sample: (u, v) => bind(chart.sample(u, v)),
        sampleRow: chart.sampleRow ? function* (us, v) {
          for (const value of chart.sampleRow!(us, v)) yield bind(value);
        } : undefined,
      });
    }
    options.onProgress?.("Surface appearance: rasterizing materials");
    const rasterBudget = { texels, imageBytes, maximumTexels, maximumBytes };
    const rasters = await prepareSurfaceRasters(prepared, staged.document.materials, images, generated, rasterBudget, options.signal,
      chart => { current = chart; }, work, options.rasterExecutor, options.materialCache, sourceHashes,
      options.decodeMaterialPng, options.materialCacheValidation);
    texels = rasterBudget.texels; imageBytes = rasterBudget.imageBytes;
    // Geometry samples only authored height; all other decoded maps have finished their compile work.
    const heightReferences = new Set([...materials.values()].flatMap(material => material.heightTexture ? [material.heightTexture] : []));
    for (const reference of images.keys()) if (!heightReferences.has(reference)) images.delete(reference);
    const mesh = await buildSurfaceRegions(staged, prepared, new Map(staged.document.materials.map(material => [material.id, material])), images, maximumTriangles, options.signal, options.onProgress, rasters, work);
    aborted(options.signal);
    level.mesh = mesh;
    level.document = staged.document;
    level.surfaces = staged.surfaces;
    level.generatedImages = { ...level.generatedImages, ...generated };
    level.surfaceAppearance = { version: 1, sourceHashes, generatedHashes: Object.values(generated).map(image => image.hash), charts: charts.length, texels, imageBytes };
  } catch (error) {
    if (error instanceof SurfaceRasterFailure) { current = error.chart; error = error.cause; }
    if ((error as Error).name === "AbortError") throw error;
    if (error instanceof AmlError) throw error;
    throw surfaceAppearanceError(level, error, current);
  }
}
