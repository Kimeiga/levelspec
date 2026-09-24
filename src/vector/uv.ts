import createXAtlas from "xatlas-wasm";
import {
  aborted,
  type CompiledLevel,
  type UVOptions,
  type MeshData,
  type Diagnostic,
  type V3,
} from "./types.ts";
import { cross, sub, dot, norm, hash, triangleOverlap } from "./geometry.ts";
import { emptyMesh, meshParts } from "./mesh.ts";
let module: ReturnType<typeof createXAtlas> | undefined;
/** Atlas UVs are added by original-corner mapping. No coordinate-based attribute transfer. */
export async function generateUVs(
  level: CompiledLevel,
  options: UVOptions = {},
): Promise<CompiledLevel> {
  aborted(options.signal);
  if (level.diagnostics.some((d) => d.severity === "error"))
    throw new Error("Cannot unwrap invalid geometry.");
  const density = options.density ?? 8,
    resolution = options.resolution ?? 2048,
    padding = options.padding ?? 8;
  if (
    !Number.isFinite(density) ||
    density <= 0 ||
    !Number.isInteger(resolution) ||
    resolution < 64 ||
    resolution > 8192 ||
    !Number.isInteger(padding) ||
    padding < 2 ||
    padding * 4 >= resolution
  )
    throw new Error("Invalid UV density, resolution or padding.");
  const x = await (module ??= createXAtlas()),
    src = level.mesh,
    out: MeshData = { ...emptyMesh(), uv1: [], atlasPages: [], chartIds: [] },
    inputTris: number[] = [],
    indices: number[] = [];
  let atlas = x.createAtlas();
  try {
    for (let t = 0; t < src.surfaces.length; t++)
      if (!level.surfaces[src.surfaces[t]].dynamic && level.surfaces[src.surfaces[t]].visible !== false) {
        inputTris.push(t);
        indices.push(...src.indices.slice(t * 3, t * 3 + 3));
      }
    if (!indices.length) throw new Error("No static receiver triangles.");
    atlas.setProgressCallback(() => !options.signal?.aborted);
    let faceIndices = indices;
    {
      // Supply real shared-vertex topology to chart growth. Original corner
      // attributes are restored by face/corner identity after parameterization.
      const positions: number[] = [],
        weld = new Map<string, number>(),
        groups = new Map<string, number>();
      faceIndices = [];
      const faceGroups: number[] = [];
      for (const t of inputTris) {
        const surface = level.surfaces[src.surfaces[t]],
          group = `${surface.mesh}:${surface.object}:${surface.material}`;
        if (!groups.has(group)) groups.set(group, groups.size);
        faceGroups.push(groups.get(group)!);
        for (const old of src.indices.slice(t * 3, t * 3 + 3)) {
          const p = src.positions.slice(old * 3, old * 3 + 3),
            key = `${surface.mesh}:${p.join(",")}`;
          let index = weld.get(key);
          if (index === undefined) {
            index = positions.length / 3;
            weld.set(key, index);
            positions.push(...p);
          }
          faceIndices.push(index);
        }
      }
      const error = atlas.addMesh({
        positions: new Float32Array(positions),
        indices: new Uint32Array(faceIndices),
        faceMaterialData: new Uint32Array(faceGroups),
      });
      if (error) throw new Error(x.addMeshErrorString(error));
      const span = (resolution - 2 * padding - 4) / density;
      atlas.generate(
        {
          maxChartArea: (span * span) / 4,
          maxBoundaryLength: span * 2,
          normalSeamWeight: 4,
          maxIterations: 3,
          fixWinding: true,
        },
        {
          texelsPerUnit: density,
          resolution,
          padding,
          bilinear: true,
          rotateCharts: true,
          createImage: false,
        },
      );
    }
    aborted(options.signal);
    let result = atlas.getMesh(0);
    const charts = [];
    const precisionRepair = guardSubpixelTriangles(
      result,
      src,
      inputTris,
      density,
      atlas.width,
      atlas.height,
      padding,
    );
    if (precisionRepair.vertices > 0) {
      // Zero-area input charts may have occupied no raster cells in the initial
      // pack. Repack the repaired connected charts, in local UV coordinates.
      const previous = result,
        bounds = new Map<number, number[]>();
      for (const v of previous.vertices) {
        const p = bounds.get(v.chartIndex) ?? [Infinity, Infinity];
        p[0] = Math.min(p[0], v.uv[0]);
        p[1] = Math.min(p[1], v.uv[1]);
        bounds.set(v.chartIndex, p);
      }
      const repaired = x.createAtlas();
      try {
        repaired.setProgressCallback(() => !options.signal?.aborted);
        const error = repaired.addUvMesh({
          uvs: new Float32Array(
            previous.vertices.flatMap((v) =>
              v.uv.map((n, i) => (n - bounds.get(v.chartIndex)![i]) / density),
            ),
          ),
          indices: previous.indices,
          faceMaterialData: new Uint32Array(
            inputTris.map(
              (_, t) => previous.vertices[previous.indices[t * 3]].chartIndex,
            ),
          ),
        });
        if (error) throw new Error(x.addMeshErrorString(error));
        repaired.generate(
          {},
          {
            texelsPerUnit: density,
            resolution,
            padding,
            bilinear: true,
            rotateCharts: true,
            createImage: false,
          },
        );
        aborted(options.signal);
      } catch (error) {
        repaired.destroy();
        throw error;
      }
      atlas.destroy();
      atlas = repaired;
      result = atlas.getMesh(0);
      for (const v of result.vertices) v.xref = previous.vertices[v.xref].xref;
      aborted(options.signal);
    }
    const copy = (old: number, uv: [number, number]) => {
      const i = out.positions.length / 3;
      out.positions.push(...src.positions.slice(old * 3, old * 3 + 3));
      out.normals.push(...src.normals.slice(old * 3, old * 3 + 3));
      out.uv.push(...src.uv.slice(old * 2, old * 2 + 2));
      out.uv1!.push(...uv);
      return i;
    };
    // xatlas preserves face order; assert every face retains its exact original corner sequence.
    for (let t = 0; t < inputTris.length; t++) {
      const source = inputTris[t],
        vs = [0, 1, 2].map((k) => result.vertices[result.indices[t * 3 + k]]);
      if (vs.some((v, k) => v.xref !== faceIndices[t * 3 + k]))
        throw new Error(
          "xatlas changed triangle order or winding; refusing unsafe transfer.",
        );
      for (let k = 0; k < 3; k++) {
        const v = vs[k];
        out.indices.push(
          copy(src.indices[source * 3 + k], [
            v.uv[0] / atlas.width,
            v.uv[1] / atlas.height,
          ]),
        );
      }
      out.surfaces.push(src.surfaces[source]);
      out.atlasPages!.push(vs[0].atlasIndex);
      out.chartIds!.push(vs[0].chartIndex);
    }
    for (let t = 0; t < src.surfaces.length; t++)
      if (level.surfaces[src.surfaces[t]].dynamic || level.surfaces[src.surfaces[t]].visible === false) {
        for (const old of src.indices.slice(t * 3, t * 3 + 3))
          out.indices.push(copy(old, [0, 0]));
        out.surfaces.push(src.surfaces[t]);
        out.atlasPages!.push(-1);
        out.chartIds!.push(-1);
      }
    for (let i = 0; i < result.charts.length; i++) {
      const c = result.charts[i],
        triangles = Array.from(c.faces);
      charts.push({
        id: i,
        page: c.atlasIndex,
        triangles,
        objects: [
          ...new Set(
            triangles.map((t) => level.surfaces[out.surfaces[t]].object),
          ),
        ],
      });
    }
    out.tangents = tangents(out);
    const manifest = {
      version: 1 as const,
      geometryHash: level.geometryHash,
      uvHash: await hash({ uv: out.uv1, pages: out.atlasPages }),
      materialChannel: 0 as const,
      lightmapChannel: 1 as const,
      density,
      padding,
      safeMip: Math.max(0, Math.floor(Math.log2(padding)) - 1),
      pages: Array.from({ length: atlas.atlasCount }, (_, id) => ({
        id,
        width: atlas.width,
        height: atlas.height,
      })),
      charts,
    };
    const candidate = { ...level, mesh: out, atlas: manifest };
    const issues = auditUVs(candidate);
    if (issues.some((i) => i.severity === "error"))
      throw new Error(
        "Atlas validation failed; geometry remains available. " +
          issues.map((i) => i.message).join("\n"),
      );

    level.mesh = out;
    level.parts = meshParts(out, level.surfaces);
    level.atlas = manifest;
    level.stats.uvPrecisionAdjustedVertices = precisionRepair.vertices;
    level.stats.uvPrecisionMaxAdjustmentTexels =
      precisionRepair.maxTexelDisplacement;
    level.diagnostics.push(...issues);
    return level;
  } finally {
    atlas.destroy();
  }
}

/** A float32 packed coordinate can erase a real micrometre-wide seam face.
 * Make only subpixel chart-local adjustments, sharing each adjusted vertex with
 * all incident faces. This does not split islands or change mesh attributes.
 * Final overlap/density auditing remains authoritative. */
function guardSubpixelTriangles(
  result: {
    vertices: { uv: number[]; chartIndex: number }[];
    indices: ArrayLike<number>;
    charts: { faces: ArrayLike<number> }[];
  },
  source: MeshData,
  inputTris: number[],
  density: number,
  width: number,
  height: number,
  padding: number,
) {
  const original = result.vertices.map((v) => [...v.uv]);
  const signs = result.charts.map((chart) => {
    let signed = 0;
    for (const t of Array.from(chart.faces)) {
      const [a, b, c] = [0, 1, 2].map(
        (k) => result.vertices[result.indices[t * 3 + k]].uv,
      );
      signed += (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    }
    return signed < 0 ? -1 : 1;
  });
  const targets = inputTris.map((t, i) => {
    const p = source.indices
      .slice(t * 3, t * 3 + 3)
      .map((v) => source.positions.slice(v * 3, v * 3 + 3) as V3);
    const worldArea =
      Math.hypot(...cross(sub(p[1], p[0]), sub(p[2], p[0]))) / 2;
    const uv = [0, 1, 2].map(
      (k) => result.vertices[result.indices[i * 3 + k]].uv,
    );
    const longest = Math.max(
      ...uv.map((a, k) =>
        Math.hypot(a[0] - uv[(k + 1) % 3][0], a[1] - uv[(k + 1) % 3][1]),
      ),
    );
    // Two ULPs of normalized float32 coordinates, measured in texels.
    const precision = Math.max(width, height) * 2 ** -22;
    return Math.max(worldArea * density * density * 0.81, longest * precision);
  });
  const limit = Math.min(0.125, padding / 16);
  for (let iteration = 0; iteration < 64; iteration++) {
    let adjusted = false;
    for (let t = 0; t < inputTris.length; t++) {
      const ids = [0, 1, 2].map((k) => result.indices[t * 3 + k]);
      const [a, b, c] = ids.map((i) => result.vertices[i].uv);
      const sign = signs[result.vertices[ids[0]].chartIndex] ?? 1;
      const signed =
        (sign *
          ((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]))) /
        2;
      if (signed >= targets[t]) continue;
      const gradient = [
        [b[1] - c[1], c[0] - b[0]],
        [c[1] - a[1], a[0] - c[0]],
        [a[1] - b[1], b[0] - a[0]],
      ].map((v) => v.map((n) => (n * sign) / 2));
      const squared = gradient.flat().reduce((s, v) => s + v * v, 0);
      if (squared < 1e-20) continue;
      const step = ((targets[t] - signed) / squared) * 1.02;
      for (let k = 0; k < 3; k++) {
        const index = ids[k],
          uv = result.vertices[index].uv,
          start = original[index];
        const next = uv.map((v, axis) => v + step * gradient[k][axis]);
        if (Math.hypot(next[0] - start[0], next[1] - start[1]) > limit)
          continue;
        const rounded = [
          Math.fround(next[0] / width) * width,
          Math.fround(next[1] / height) * height,
        ];
        if (Math.hypot(rounded[0] - start[0], rounded[1] - start[1]) > limit)
          continue;
        [uv[0], uv[1]] = rounded;
      }
      adjusted = true;
    }
    if (!adjusted) break;
  }
  const displacements = result.vertices.map((v, i) =>
    Math.hypot(v.uv[0] - original[i][0], v.uv[1] - original[i][1]),
  );
  return {
    vertices: displacements.filter((d) => d > 1e-12).length,
    maxTexelDisplacement: displacements.reduce(
      (largest, d) => Math.max(largest, d),
      0,
    ),
  };
}
function tangents(m: MeshData): number[] {
  const out: number[] = [];
  for (let t = 0; t < m.indices.length; t += 3) {
    const ids = m.indices.slice(t, t + 3),
      p = ids.map((i) => m.positions.slice(i * 3, i * 3 + 3) as V3),
      uv = ids.map((i) => m.uv.slice(i * 2, i * 2 + 2)),
      e1 = sub(p[1], p[0]),
      e2 = sub(p[2], p[0]),
      du1 = uv[1][0] - uv[0][0],
      dv1 = uv[1][1] - uv[0][1],
      du2 = uv[2][0] - uv[0][0],
      dv2 = uv[2][1] - uv[0][1],
      det = du1 * dv2 - du2 * dv1,
      n = m.normals.slice(ids[0] * 3, ids[0] * 3 + 3) as V3;
    let T: V3, B: V3;
    if (Math.abs(det) < 1e-12) {
      T = norm(e1);
      B = cross(n, T);
    } else {
      T = e1.map((v, i) => (v * dv2 - e2[i] * dv1) / det) as V3;
      B = e1.map((v, i) => (e2[i] * du1 - v * du2) / det) as V3;
    }
    T = norm(T.map((v, i) => v - dot(n, T) * n[i]) as V3);
    const w = dot(cross(n, T), B) < 0 ? -1 : 1;
    for (const id of ids) out.splice(id * 4, 4, ...T, w);
  }
  return out;
}
export function auditUVs(level: CompiledLevel): Diagnostic[] {
  const m = level.mesh,
    a = level.atlas,
    issues: Diagnostic[] = [];
  if (!a || !m.uv1)
    return [
      {
        severity: "error",
        code: "UV_MISSING",
        objects: [],
        message: "Lightmap UVs are missing.",
      },
    ];
  const fail = (
    code: string,
    t: number,
    message: string,
    severity: "error" | "warning" = "error",
  ) =>
    issues.push({
      severity,
      code,
      message,
      objects: [level.surfaces[m.surfaces[t]].object],
    });
  const buckets = new Map<string, number[]>(),
    tested = new Set<string>();
  const tri = (t: number) =>
    m.indices
      .slice(t * 3, t * 3 + 3)
      .map((i) => [m.uv1![i * 2], m.uv1![i * 2 + 1], 0] as V3);
  for (let t = 0; t < m.surfaces.length; t++) {
    const page = m.atlasPages![t];
    if (page < 0) continue;
    const uv = tri(t),
      p = m.indices
        .slice(t * 3, t * 3 + 3)
        .map((i) => m.positions.slice(i * 3, i * 3 + 3) as V3),
      uvArea = Math.abs(cross(sub(uv[1], uv[0]), sub(uv[2], uv[0]))[2]) / 2,
      area = Math.hypot(...cross(sub(p[1], p[0]), sub(p[2], p[0]))) / 2;
    if (uv.flat().some((v) => !Number.isFinite(v) || v < 0 || v > 1))
      fail("UV_BOUNDS", t, "Lightmap UV is out of range.");
    if (uvArea < 1e-14 && area > 1e-10)
      fail(
        "UV_COLLAPSED",
        t,
        `Triangle ${t} collapsed: ${JSON.stringify({ p, uv, area })}.`,
      );
    const actual = Math.sqrt(
      (uvArea * a.pages[page].width * a.pages[page].height) / area,
    );
    if (actual < a.density * 0.8)
      fail(
        "UV_DENSITY",
        t,
        `Atlas density ${actual.toFixed(2)} is below requested ${a.density}; increase resolution or split the surface.`,
      );
    const minX = Math.floor(Math.min(...uv.map((p) => p[0])) * 64),
      maxX = Math.floor(Math.max(...uv.map((p) => p[0])) * 64),
      minY = Math.floor(Math.min(...uv.map((p) => p[1])) * 64),
      maxY = Math.floor(Math.max(...uv.map((p) => p[1])) * 64);
    for (let x = minX; x <= maxX; x++)
      for (let y = minY; y <= maxY; y++) {
        const k = `${page}:${x}:${y}`,
          list = buckets.get(k) ?? [];
        for (const prev of list) {
          const pair = `${prev}:${t}`;
          if (tested.has(pair)) continue;
          tested.add(pair);
          if (triangleOverlap(tri(prev), uv) > 1e-12)
            fail(
              "UV_OVERLAP",
              t,
              `Lightmap triangles ${prev} and ${t} overlap (charts ${m.chartIds![prev]}/${m.chartIds![t]}, objects ${level.surfaces[m.surfaces[prev]].object}/${level.surfaces[m.surfaces[t]].object}).`,
            );
        }
        list.push(t);
        buckets.set(k, list);
      }
  }
  return issues;
}
export function atlasSVG(level: CompiledLevel, page: number): string {
  if (!level.atlas || !level.mesh.uv1) throw new Error("Generate UVs first.");
  const a = level.atlas.pages[page],
    m = level.mesh,
    paths = [];
  for (let t = 0; t < m.surfaces.length; t++)
    if (m.atlasPages![t] === page) {
      const points = m.indices
        .slice(t * 3, t * 3 + 3)
        .map(
          (i) =>
            `${m.uv1![i * 2] * a.width},${(1 - m.uv1![i * 2 + 1]) * a.height}`,
        )
        .join(" ");
      paths.push(
        `<polygon data-chart="${m.chartIds![t]}" points="${points}" fill="hsl(${(m.chartIds![t] * 137.508) % 360} 45% 65%)" stroke="#233749" stroke-width="0.4"/>`,
      );
    }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${a.width} ${a.height}" width="${a.width}" height="${a.height}"><rect width="100%" height="100%" fill="#172c3e"/>${paths.join("")}</svg>`;
}
