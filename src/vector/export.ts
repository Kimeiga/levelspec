import type { CompiledLevel, V3 } from "./types.ts";
import { escapeXML } from "./format.ts";
import {
  assertExportable,
  exportName,
  exportMetadata,
  type ExportOptions,
  type ExportFiles,
} from "./export-assets.ts";
/** Generated transport, not an authoring format. */
export function toRuntime(level: CompiledLevel) {
  return {
    version: "2",
    id: level.document.id,
    name: level.document.name,
    coordinateSystem: "right-handed Z-up",
    geometryHash: level.geometryHash,
    mesh: level.mesh,
    meshes: level.parts,
    surfaces: level.surfaces,
    materials: level.document.materials,
    layers: level.document.layers.map((l) => ({ id: l.id, label: l.label })),
    markers: level.document.markers,
    lights: level.document.lights,
    sky: level.document.sky,
    atlas: level.atlas,
    navigation: level.navigation,
    diagnostics: level.diagnostics,
    stats: level.stats,
  };
}
export function toOBJ(level: CompiledLevel): string {
  const m = level.mesh,
    lines = [
      `# LevelSpec 2 ${level.document.id}`,
      "# Z-up metres; OBJ contains material UVs only.",
    ];
  for (let i = 0; i < m.positions.length; i += 3)
    lines.push(`v ${m.positions.slice(i, i + 3).join(" ")}`);
  for (let i = 0; i < m.uv.length; i += 2)
    lines.push(`vt ${m.uv.slice(i, i + 2).join(" ")}`);
  for (let i = 0; i < m.normals.length; i += 3)
    lines.push(`vn ${m.normals.slice(i, i + 3).join(" ")}`);
  let owner = -1;
  for (let t = 0; t < m.surfaces.length; t++) {
    if (owner !== m.surfaces[t]) {
      owner = m.surfaces[t];
      lines.push(
        `g ${level.surfaces[owner].object.replace(/\s/g, "_")}`,
        `usemtl ${level.surfaces[owner].material}`,
      );
    }
    lines.push(
      `f ${m.indices
        .slice(t * 3, t * 3 + 3)
        .map((i) => `${i + 1}/${i + 1}/${i + 1}`)
        .join(" ")}`,
    );
  }
  return lines.join("\n") + "\n";
}
export function toSVGPlan(level: CompiledLevel, layer?: string): string {
  const floors = level.floors.filter((f) => !layer || f.layer === layer),
    points = floors.flatMap((f) => f.points),
    xs = points.map((p) => p[0]),
    ys = points.map((p) => p[1]),
    minX = Math.min(0, ...xs) - 1,
    maxX = Math.max(1, ...xs) + 1,
    minY = Math.min(0, ...ys) - 1,
    maxY = Math.max(1, ...ys) + 1;
  const loop = (p: V3[]) =>
    `M ${p.map((v) => `${v[0]} ${-v[1]}`).join(" L ")} Z`;
  const body = floors.map(
    (f, i) =>
      `<path data-object="${escapeXML(f.region)}" data-layer="${escapeXML(f.layer)}" d="${f.loops.map(loop).join(" ")}" fill="hsl(${205 + ((i * 19) % 85)} 28% 79%)" fill-rule="evenodd" stroke="#829cae" stroke-width="0.04"><title>${escapeXML(f.region)}</title></path>`,
  );
  const stairIds = new Set(
    level.document.layers.flatMap((l) =>
      l.regions.filter((r) => r.fill === "stairs").map((r) => r.id),
    ),
  );
  for (const floor of floors.filter((f) => stairIds.has(f.region))) {
    // Two tread edges at the same XY but different Z bound a real riser.
    // This uses compiled treads, so curved flights and their flat platforms
    // remain distinct without drawing the internal triangulation diagonals.
    const edges = new Map<
      string,
      { a: V3; b: V3; low: number; high: number }
    >();
    const xy = (p: V3) =>
      p
        .slice(0, 2)
        .map((n) => Math.round(n * 1e6))
        .join(",");
    for (const tri of floor.triangles)
      for (let i = 0; i < 3; i++) {
        const a = floor.points[tri[i]],
          b = floor.points[tri[(i + 1) % 3]];
        if (Math.abs(a[2] - b[2]) > 1e-5) continue;
        const key = [xy(a), xy(b)].sort().join("/"),
          previous = edges.get(key);
        edges.set(key, {
          a,
          b,
          low: Math.min(a[2], previous?.low ?? a[2]),
          high: Math.max(a[2], previous?.high ?? a[2]),
        });
      }
    const risers = [...edges.values()].filter((e) => e.high - e.low > 1e-4);
    if (risers.length)
      body.push(
        `<path class="stair-treads" data-object="${escapeXML(floor.region)}" data-layer="${escapeXML(floor.layer)}" d="${risers.map(({ a, b }) => `M ${a[0]} ${-a[1]} L ${b[0]} ${-b[1]}`).join(" ")}" fill="none" stroke="#526d80" stroke-width="0.06" pointer-events="none"/>`,
      );
  }
  for (const l of level.document.layers.filter((l) => !layer || l.id === layer))
    for (const e of l.edges) {
      const p = level.curves[e.id];
      if (!p) continue;
      body.push(
        `<polyline data-object="${escapeXML(e.id)}" data-layer="${escapeXML(l.id)}" points="${p.map((v) => `${v[0]},${-v[1]}`).join(" ")}" fill="none" stroke="${e.kind === "open" ? "#79adba" : e.kind === "door" ? "#bc690d" : "#233749"}" stroke-linejoin="${e.join ?? "miter"}" stroke-linecap="${e.join === "round" ? "round" : "butt"}" stroke-width="${e.kind === "open" ? 0.045 : (e.thickness ?? level.document.wallThickness)}"${e.kind === "open" ? ' stroke-dasharray=".2 .2"' : ""}/>`,
      );
    }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${-maxY} ${maxX - minX} ${maxY - minY}" role="img" aria-label="Floor plan"><g>${body.join("")}</g></svg>`;
}
/** GLB exporter without a renderer/DOM dependency. All vertex attributes survive. */
function buildGLTF(
  level: CompiledLevel,
  options: ExportOptions,
  embedded: boolean,
) {
  assertExportable(level, options);
  const m = level.mesh,
    views: any[] = [],
    accessors: any[] = [],
    chunks: Uint8Array[] = [];
  let byteLength = 0;
  const add = (
    data: Float32Array | Uint32Array,
    type: string,
    components: number,
    bounds = false,
  ) => {
    const pad = (4 - (byteLength % 4)) % 4;
    if (pad) {
      chunks.push(new Uint8Array(pad));
      byteLength += pad;
    }
    const view = views.length;
    views.push({
      buffer: 0,
      byteOffset: byteLength,
      byteLength: data.byteLength,
    });
    chunks.push(new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
    byteLength += data.byteLength;
    const acc: any = {
      bufferView: view,
      componentType: data instanceof Float32Array ? 5126 : 5125,
      count: data.length / components,
      type,
    };
    if (bounds) {
      acc.min = Array(components).fill(Infinity);
      acc.max = Array(components).fill(-Infinity);
      for (let k = 0; k < data.length; k++) {
        const i = k % components;
        acc.min[i] = Math.min(acc.min[i], data[k]);
        acc.max[i] = Math.max(acc.max[i], data[k]);
      }
    }
    accessors.push(acc);
    return accessors.length - 1;
  };
  // Compiled/Blender UVs are bottom-left; glTF samples images from top-left.
  // Reflect V once, and reflect tangent handedness with material UVs.
  const gltfUV = (uv: number[]) =>
    new Float32Array(uv.map((v, i) => (i % 2 ? 1 - v : v)));
  const attributes: Record<string, number> = {
    POSITION: add(new Float32Array(m.positions), "VEC3", 3, true),
    NORMAL: add(new Float32Array(m.normals), "VEC3", 3),
    TEXCOORD_0: add(gltfUV(m.uv), "VEC2", 2),
  };
  if (m.uv1) attributes.TEXCOORD_1 = add(gltfUV(m.uv1), "VEC2", 2);
  if (m.tangents)
    attributes.TANGENT = add(
      new Float32Array(m.tangents.map((v, i) => (i % 4 === 3 ? -v : v))),
      "VEC4",
      4,
    );
  const groups = new Map<string, number[]>();
  for (let t = 0; t < m.surfaces.length; t++) {
    const s = level.surfaces[m.surfaces[t]],
      key = JSON.stringify([
        s.mesh,
        s.object,
        s.material,
        m.atlasPages?.[t] ?? -1,
      ]);
    const triangles = groups.get(key) ?? [];
    triangles.push(t);
    groups.set(key, triangles);
  }
  const mats = [
    ...(!level.document.materials.some((m) => m.id === "default")
      ? [
          {
            id: "default",
            color: "#b9c7d1",
            roughness: 0.8,
            metalness: 0,
            texture: undefined as string | undefined,
          },
        ]
      : []),
    ...level.document.materials,
  ];
  const images: any[] = [],
    textures: any[] = [],
    imageIndex = new Map<string, number>();
  const files: ExportFiles = {};
  const texture = (reference: string) => {
    const asset = options.assets![reference];
    if (imageIndex.has(asset.hash)) return imageIndex.get(asset.hash)!;
    const index = images.length;
    imageIndex.set(asset.hash, index);
    if (embedded) {
      const pad = (4 - (byteLength % 4)) % 4;
      chunks.push(new Uint8Array(pad));
      byteLength += pad;
      const bufferView = views.length;
      views.push({
        buffer: 0,
        byteOffset: byteLength,
        byteLength: asset.bytes.length,
      });
      chunks.push(asset.bytes);
      byteLength += asset.bytes.length;
      images.push({ bufferView, mimeType: asset.mimeType });
    } else {
      images.push({ uri: asset.file, mimeType: asset.mimeType });
      files[asset.file] = asset.bytes;
    }
    textures.push({ source: index, sampler: 0 });
    return index;
  };
  const materialIndex = new Map(mats.map((m, i) => [m.id, i]));
  const linear = (c: number) =>
    c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  const materials = mats.map((m) => ({
    name: m.id,
    pbrMetallicRoughness: {
      baseColorFactor: [
        ...m.color
          .slice(1)
          .match(/../g)!
          .map((c) => linear(parseInt(c, 16) / 255)),
        1,
      ],
      roughnessFactor: m.roughness,
      metallicFactor: m.metalness,
      ...(m.texture
        ? { baseColorTexture: { index: texture(m.texture), texCoord: 0 } }
        : {}),
    },
  }));
  const meshes: any[] = [],
    nodes: any[] = [];
  for (const triangles of groups.values()) {
    const surface = level.surfaces[m.surfaces[triangles[0]]],
      page = m.atlasPages?.[triangles[0]] ?? -1,
      index = meshes.length,
      ids = triangles.flatMap((t) => m.indices.slice(t * 3, t * 3 + 3));
    meshes.push({
      name: `${surface.mesh}:${surface.object}`,
      primitives: [
        {
          attributes,
          indices: add(new Uint32Array(ids), "SCALAR", 1),
          material: materialIndex.get(surface.material) ?? 0,
          mode: 4,
          extras: { sourceSurfaces: triangles.map((t) => m.surfaces[t]) },
        },
      ],
    });
    nodes.push({
      name: `${surface.mesh}:${surface.object}:${surface.material}:page${page}`,
      mesh: index,
      extras: {
        meshPart: surface.mesh,
        meshKind: surface.kind,
        objectId: surface.object,
        layer: surface.layer,
        role: surface.role,
        dynamic: surface.dynamic,
        atlasPage: page,
      },
    });
  }
  for (const marker of level.document.markers)
    nodes.push({
      name: marker.id,
      translation: marker.position,
      extras: {
        objectId: marker.id,
        markerKind: marker.kind,
        layer: marker.layer,
        region: marker.region,
        team: marker.team,
      },
    });
  const rootIndex = nodes.length;
  nodes.push({
    name: level.document.id,
    rotation: [-Math.SQRT1_2, 0, 0, Math.SQRT1_2],
    children: Array.from({ length: rootIndex }, (_, i) => i),
    extras: {
      geometryHash: level.geometryHash,
      lightmapUV: m.uv1 ? 1 : undefined,
    },
  });
  const json = {
    asset: { version: "2.0", generator: "LevelSpec 2" },
    scene: 0,
    scenes: [{ nodes: [rootIndex] }],
    nodes,
    meshes,
    materials,
    buffers: [
      {
        byteLength,
        ...(!embedded ? { uri: `${exportName(level.document.id)}.bin` } : {}),
      },
    ],
    ...(images.length
      ? {
          images,
          textures,
          samplers: [
            { magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497 },
          ],
        }
      : {}),
    bufferViews: views,
    accessors,
    extras: { levelspec: exportMetadata(level, [embedded ? "glb" : "gltf"]) },
  };
  const binary = new Uint8Array(byteLength);
  let cursor = 0;
  for (const chunk of chunks) {
    binary.set(chunk, cursor);
    cursor += chunk.length;
  }
  return { json, binary, files };
}

/** External glTF with relative buffers and content-addressed images. */
export function toGLTF(
  level: CompiledLevel,
  options: ExportOptions = {},
): ExportFiles {
  const { json, binary, files } = buildGLTF(level, options, false),
    name = exportName(level.document.id);
  return {
    ...files,
    [`${name}.gltf`]: JSON.stringify(json, null, 2),
    [`${name}.bin`]: binary,
  };
}

/** Self-contained GLB. No DOM, renderer, filesystem, or native dependencies. */
export function toGLB(
  level: CompiledLevel,
  options: ExportOptions = {},
): Uint8Array {
  const { json, binary } = buildGLTF(level, options, true),
    byteLength = binary.length;
  const raw = new TextEncoder().encode(JSON.stringify(json)),
    jsonLength = Math.ceil(raw.length / 4) * 4,
    binLength = Math.ceil(byteLength / 4) * 4,
    result = new Uint8Array(12 + 8 + jsonLength + 8 + binLength),
    view = new DataView(result.buffer);
  view.setUint32(0, 0x46546c67, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, result.length, true);
  view.setUint32(12, jsonLength, true);
  view.setUint32(16, 0x4e4f534a, true);
  result.fill(32, 20, 20 + jsonLength);
  result.set(raw, 20);
  const offset = 20 + jsonLength;
  view.setUint32(offset, binLength, true);
  view.setUint32(offset + 4, 0x004e4942, true);
  result.set(binary, offset + 8);
  return result;
}
