import type { Mesh } from "xatlas-wasm";
import type { MeshData, V3 } from "./types.ts";
import { cross, dot, norm, sub } from "./geometry.ts";

/**
 * Preserves positive-area receivers rejected by xatlas's geometry parameterizer.
 * Each gets an independent local planar chart for UV-only repacking. A minimum
 * texel altitude survives Float32 packing; geometry and source corner identities
 * stay unchanged. Expansion is measured in texels and bounded by 1/8 texel.
 */
export function seedUnassignedCharts(
  result: Mesh,
  source: MeshData,
  inputTriangles: number[],
  density: number,
  resolution: number,
  maximumCharts: number,
  signal?: AbortSignal,
) {
  let triangles = 0,
    maxExpansionTexels = 0;
  const removedFaces = new Set<number>(),
    originalChartCount = result.charts.length;
  const minimumAltitude = Math.max(1 / 16, resolution * 2 ** -20);
  for (let t = 0; t < inputTriangles.length; t++) {
    signal?.throwIfAborted();
    const original = [0, 1, 2].map(
      (k) => result.vertices[result.indices[t * 3 + k]],
    );
    const uvArea = Math.abs(
      (original[1].uv[0] - original[0].uv[0]) *
        (original[2].uv[1] - original[0].uv[1]) -
        (original[1].uv[1] - original[0].uv[1]) *
          (original[2].uv[0] - original[0].uv[0]),
    );
    const longestUvEdge = Math.max(
      ...original.map((vertex, i) =>
        Math.hypot(
          vertex.uv[0] - original[(i + 1) % 3].uv[0],
          vertex.uv[1] - original[(i + 1) % 3].uv[1],
        ),
      ),
    );
    const survivesPacking = longestUvEdge >= 1 / 8 && uvArea > 0;
    if (
      original.every(
        (vertex) => vertex.chartIndex >= 0 && vertex.atlasIndex >= 0,
      ) &&
      survivesPacking
    )
      continue;
    if (result.charts.length >= maximumCharts)
      throw new Error("UV chart budget exceeded.");
    const points = source.indices
      .slice(inputTriangles[t] * 3, inputTriangles[t] * 3 + 3)
      .map((index) => source.positions.slice(index * 3, index * 3 + 3) as V3);
    const normal = cross(sub(points[1], points[0]), sub(points[2], points[0]));
    if (Math.hypot(...normal) === 0)
      throw new Error("A zero-area receiver cannot be parameterized.");
    const lengths = points.map((point, i) =>
      Math.hypot(...sub(points[(i + 1) % 3], point)),
    );
    const start = lengths.indexOf(Math.max(...lengths)),
      end = (start + 1) % 3,
      third = (start + 2) % 3;
    const tangent = norm(sub(points[end], points[start])),
      bitangent = cross(norm(normal), tangent);
    const uvs = points.map(
      (point) =>
        [
          dot(sub(point, points[start]), tangent) * density,
          dot(sub(point, points[start]), bitangent) * density,
        ] as [number, number],
    );
    const originalUvs = uvs.map((uv) => [...uv]);
    const baseScale = Math.max(1, minimumAltitude / uvs[end][0]);
    for (const uv of uvs) uv[0] *= baseScale;
    const altitudeExpansion = Math.max(0, minimumAltitude - uvs[third][1]);
    uvs[third][1] += altitudeExpansion;
    const expansion = Math.max(
      ...uvs.map((uv, i) =>
        Math.hypot(uv[0] - originalUvs[i][0], uv[1] - originalUvs[i][1]),
      ),
    );
    if (expansion > 0.125)
      throw new Error(
        "Unassigned receiver exceeds the subpixel UV repair limit.",
      );

    removedFaces.add(t);
    const chartIndex = result.charts.length;
    for (let k = 0; k < 3; k++) {
      result.indices[t * 3 + k] = result.vertices.length;
      result.vertices.push({
        ...original[k],
        chartIndex,
        atlasIndex: 0,
        uv: uvs[k],
      });
    }
    result.charts.push({
      atlasIndex: 0,
      faceCount: 1,
      type: 0,
      material: chartIndex,
      faces: new Uint32Array([t]),
    });
    triangles++;
    maxExpansionTexels = Math.max(maxExpansionTexels, expansion);
  }
  for (let i = 0; i < originalChartCount; i++) {
    signal?.throwIfAborted();
    const chart = result.charts[i];
    chart.faces = Uint32Array.from(
      Array.from(chart.faces).filter((face) => !removedFaces.has(face)),
    );
    chart.faceCount = chart.faces.length;
  }
  return { triangles, maxExpansionTexels };
}
