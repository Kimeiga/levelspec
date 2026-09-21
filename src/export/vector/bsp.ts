import { writeFile, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import type { CompiledLevel, ExportSolid, V3 } from "../../vector/types.ts";
import type { ExportAsset } from "../../vector/export-assets.ts";
import { geometryKernel } from "../../vector/compiler.ts";
import { heightAt } from "../../vector/geometry.ts";
import { boxMesh } from "../../core/mesh.ts";
import {
  convexBrushes,
  solidManifold,
  brushMath,
  type Brush,
  type BrushPlane,
} from "./brushes.ts";
import { quakeWad, type QuakeTexture } from "./textures.ts";
import { runTool, type ProcessOptions } from "./process.ts";
const { norm, cross, sub, dot } = brushMath;
const U = 32;
const n = (value: number) => Number(value.toFixed(7)).toString();
const quoted = (value: string) => `"${value.replace(/["\\\r\n]/g, "_")}"`;
function boxSolid(
  min: V3,
  max: V3,
  id: string,
  material = "default",
): ExportSolid {
  const mesh = boxMesh({ min, max });
  return {
    positions: Array.from(
      { length: mesh.positions.length / 3 },
      (_, i) => mesh.positions.slice(i * 3, i * 3 + 3) as V3,
    ),
    triangles: Array.from({ length: mesh.indices.length / 3 }, (_, i) =>
      mesh.indices.slice(i * 3, i * 3 + 3),
    ),
    surface: {
      id,
      object: id,
      mesh: id,
      kind: "wall",
      role: "enclosure",
      layer: "",
      dynamic: false,
      material,
    },
  };
}
function uvAt(
  p: V3,
  plane: BrushPlane,
  brush: Brush,
  repeat: number,
): [number, number] {
  const path = brush.surface.path;
  if (path && Math.abs(plane.normal[2]) < 0.5) {
    let best = Infinity,
      accumulated = 0,
      u = 0;
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1],
        b = path[i],
        dx = b[0] - a[0],
        dy = b[1] - a[1],
        length = Math.hypot(dx, dy);
      if (!length) continue;
      const t = Math.max(
        0,
        Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / length ** 2),
      );
      const distance = Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
      if (distance < best) {
        best = distance;
        u = accumulated + t * length;
      }
      accumulated += length;
    }
    return [u * repeat, p[2] * repeat];
  }
  const axis = norm(
    cross(
      Math.abs(plane.normal[2]) > 0.9 ? [0, 1, 0] : [0, 0, 1],
      plane.normal,
    ),
  );
  return [dot(p, axis) * repeat, dot(p, cross(plane.normal, axis)) * repeat];
}
function planeLine(
  plane: BrushPlane,
  brush: Brush,
  texture: QuakeTexture,
  repeat: number,
) {
  const [a, b, c] = plane.points,
    ab = sub(b, a),
    ac = sub(c, a);
  const aa = dot(ab, ab),
    bb = dot(ab, ac),
    cc = dot(ac, ac),
    denominator = aa * cc - bb * bb;
  let uv = plane.points.map((p) => uvAt(p, plane, brush, repeat));
  const uvArea =
    (uv[1][0] - uv[0][0]) * (uv[2][1] - uv[0][1]) -
    (uv[2][0] - uv[0][0]) * (uv[1][1] - uv[0][1]);
  if (Math.abs(uvArea) < Math.sqrt(denominator) * repeat * repeat * 1e-3) {
    // End caps have no travel along a wall path. Use an independent planar
    // frame there instead of asking qbsp to repair a singular projection.
    const axis = norm(
      cross(
        Math.abs(plane.normal[2]) > 0.9 ? [0, 1, 0] : [0, 0, 1],
        plane.normal,
      ),
    );
    const other = cross(plane.normal, axis);
    uv = plane.points.map((p) => [
      dot(p, axis) * repeat,
      dot(p, other) * repeat,
    ]);
  }
  const axis = (component: number, size: number, flip: number) => {
    const db = (uv[1][component] - uv[0][component]) * size * flip;
    const dc = (uv[2][component] - uv[0][component]) * size * flip;
    const x = (db * cc - dc * bb) / denominator,
      y = (dc * aa - db * bb) / denominator;
    const vector = ab.map((v, i) => (v * x + ac[i] * y) / U) as V3;
    const offset = uv[0][component] * size * flip - dot(vector, a) * U;
    return `[ ${vector.map(n).join(" ")} ${n(offset)} ]`;
  };
  // Quake .map point triples wind clockwise as viewed from outside.
  return `${[c, b, a].map((p) => `( ${p.map((v) => n(v * U)).join(" ")} )`).join(" ")} ${texture.name} ${axis(0, texture.width, 1)} ${axis(1, texture.height, -1)} 0 1 1`;
}
export async function buildQuakeMap(
  level: CompiledLevel,
  mappings: Record<string, QuakeTexture>,
  name: string,
  options: ProcessOptions = {},
) {
  if (!level.exportSolids?.length)
    throw new Error("BSP requires compile(..., { retainExportSolids: true }).");
  const K = await geometryKernel();
  const brushes: Brush[] = [];
  for (const solid of level.exportSolids) {
    options.signal?.throwIfAborted();
    brushes.push(...convexBrushes(K, solid, options.signal));
    await new Promise<void>((resolve) => setImmediate(resolve));
    if (brushes.length > 100_000)
      throw new Error("BSP export exceeds 100,000 brushes.");
  }
  const bounds = [0, 1, 2].map((axis) => {
    let min = Infinity,
      max = -Infinity;
    for (let i = axis; i < level.mesh.positions.length; i += 3) {
      min = Math.min(min, level.mesh.positions[i]);
      max = Math.max(max, level.mesh.positions[i]);
    }
    return [min - 8, max + 8];
  });
  const enclosure: ExportSolid[] = [];
  for (let axis = 0; axis < 3; axis++)
    for (const side of [0, 1]) {
      const min = bounds.map((b) => b[0] - 1) as V3,
        max = bounds.map((b) => b[1] + 1) as V3;
      if (side === 0) max[axis] = bounds[axis][0];
      else min[axis] = bounds[axis][1];
      enclosure.push(
        boxSolid(
          min,
          max,
          `__enclosure_${axis}_${side}`,
          axis === 2 && side === 1 ? "__enclosure_sky" : "default",
        ),
      );
    }
  for (const solid of enclosure)
    brushes.push(...convexBrushes(K, solid, options.signal));
  const spawnMarkers = level.document.markers.filter(
    (m) =>
      /(^|_)spawn$/.test(m.kind) ||
      m.kind === "info_player_start" ||
      m.kind === "info_player_deathmatch",
  );
  if (!spawnMarkers.length)
    throw new Error("BSP requires an authored spawn marker.");
  const sourceSolids = level.exportSolids
    .filter((s) => s.surface.collidable !== false)
    .map((s) => solidManifold(K, s));
  const spawns: { id: string; position: V3 }[] = [];
  try {
    for (const marker of spawnMarkers) {
      options.signal?.throwIfAborted();
      const [x, y, z] = marker.position;
      const heights = level.floors
        .filter(
          (f) =>
            f.layer === marker.layer &&
            (!marker.region || f.region === marker.region),
        )
        .map((f) => heightAt(f, x, y))
        .filter((v): v is number => v !== undefined && Math.abs(v - z) <= 0.1);
      if (!heights.length)
        throw new Error(
          `${marker.id}: Quake spawn must lie on its authored floor.`,
        );
      const feet = Math.max(...heights) + 1 / U;
      const hull = K.Manifold.cube([1, 1, 56 / U]).translate([
        x - 0.5,
        y - 0.5,
        feet,
      ]);
      try {
        for (const solid of sourceSolids) {
          const overlap = solid.intersect(hull);
          try {
            if (overlap.volume() > 1e-7)
              throw new Error(
                `${marker.id}: Quake player hull is blocked (1 × 1 × 1.75 m).`,
              );
          } finally {
            overlap.delete();
          }
        }
      } finally {
        hull.delete();
      }
      spawns.push({ id: marker.id, position: [x * U, y * U, feet * U + 24] });
    }
  } finally {
    for (const solid of sourceSolids) solid.delete();
  }
  const skipTexture: QuakeTexture = { name: "skip", width: 16, height: 16 };
  const emit = (b: Brush) => {
    const texture =
      b.surface.visible === false
        ? skipTexture
        : mappings[b.surface.material] ?? mappings.default;
    const repeat =
      level.document.materials.find((m) => m.id === b.surface.material)
        ?.repeat ?? 1;
    return `// source ${quoted(b.surface.id)}\n{\n${b.planes.map((p) => planeLine(p, b, texture, repeat)).join("\n")}\n}`;
  };
  const text = [
    "// LevelSpec 2 / Valve 220 / Z-up / 32 units per metre",
    "{",
    '"classname" "worldspawn"',
    `"message" ${quoted(level.document.name)}`,
    `"wad" "${name}.wad"`,
    '"_minlight" "80"',
    ...brushes
      .filter((b) => !b.surface.dynamic && b.surface.collidable !== false)
      .map(emit),
    "}",
  ];
  const dynamics = new Map<string, Brush[]>(),
    illusionary = new Map<string, Brush[]>();
  for (const b of brushes) {
    if (b.surface.collidable === false && b.surface.visible !== false)
      illusionary.set(b.surface.object, [
        ...(illusionary.get(b.surface.object) ?? []),
        b,
      ]);
    else if (b.surface.dynamic)
      dynamics.set(b.surface.object, [
        ...(dynamics.get(b.surface.object) ?? []),
        b,
      ]);
  }
  for (const [id, group] of dynamics)
    text.push(
      "{",
      '"classname" "func_wall"',
      `"targetname" ${quoted(id)}`,
      ...group.map(emit),
      "}",
    );
  for (const [id, group] of illusionary)
    text.push(
      "{",
      '"classname" "func_detail_illusionary"',
      `"targetname" ${quoted(id)}`,
      ...group.map(emit),
      "}",
    );
  for (const [i, spawn] of spawns.entries())
    text.push(
      "{",
      `"classname" "${i === 0 ? "info_player_start" : "info_player_deathmatch"}"`,
      `"targetname" ${quoted(spawn.id)}`,
      `"origin" "${spawn.position.map(n).join(" ")}"`,
      "}",
    );
  // A deathmatch start is also useful when there is only one authored spawn.
  if (spawns.length === 1)
    text.push(
      "{",
      '"classname" "info_player_deathmatch"',
      `"origin" "${spawns[0].position.map(n).join(" ")}"`,
      "}",
    );
  return {
    text: text.join("\n") + "\n",
    report: {
      brushes: brushes.length,
      spawns,
      enclosure: {
        marginMetres: 8,
        bounds,
        brushIds: enclosure.map((s) => s.surface.id),
      },
      warnings: [
        "BSP2 uses Quake collision hulls, palette colors, and neutral minlight; PBR and LevelSpec baked lighting are not transferred.",
        "BSP texture projection follows physical surface scale; unfolded ramp UVs and lightmap UVs are not preserved.",
        "Dynamic parts become static func_wall entities; gameplay semantics remain in the sidecar.",
        "Visual-only closed solids become func_detail_illusionary; collision-only solids use Quake's invisible solid skip texture.",
        "Textures are quantized to the supplied palette, capped at 512 pixels, and transparency is flattened.",
      ],
    },
  };
}
export interface BSPOptions extends ProcessOptions {
  qbsp?: string;
  vis?: string;
  light?: string;
  quakePalette?: string;
}
export async function exportBSP(
  level: CompiledLevel,
  assets: Record<string, ExportAsset>,
  directory: string,
  name: string,
  options: BSPOptions,
) {
  if (!options.quakePalette)
    throw new Error(
      "BSP requires --quake-palette /path/to/palette.lmp (768 RGB bytes).",
    );
  const palette = await readFile(options.quakePalette),
    wad = quakeWad(level, assets, palette);
  options.onProgress?.("Decomposing Quake brushes");
  const map = await buildQuakeMap(level, wad.mappings, name, options);
  await writeFile(join(directory, `${name}.map`), map.text);
  await writeFile(join(directory, `${name}.wad`), wad.bytes);
  const logs: Record<string, string> = {};
  for (const [tool, executable, args] of [
    [
      "qbsp",
      options.qbsp ?? process.env.QBSP_PATH ?? "qbsp",
      ["-bsp2", "-leaktest", `${name}.map`],
    ],
    [
      "vis",
      options.vis ?? process.env.VIS_PATH ?? "vis",
      ["-fast", `${name}.bsp`],
    ],
    [
      "light",
      options.light ?? process.env.LIGHT_PATH ?? "light",
      [`${name}.bsp`],
    ],
  ] as const) {
    options.onProgress?.(`Running ${tool}`);
    logs[tool] = await runTool(executable, [...args], options, directory);
    await writeFile(join(directory, `${name}.${tool}.log`), logs[tool]);
  }
  for (const file of ["light.log", "vis.log"])
    await rm(join(directory, file), { force: true });
  const bytes = await readFile(join(directory, `${name}.bsp`));
  if (bytes.toString("ascii", 0, 4) !== "BSP2")
    throw new Error("Compiler did not produce a BSP2 file.");
  const compilerWarnings = Object.fromEntries(
    Object.entries(logs).map(([tool, log]) => [
      tool,
      log
        .replace(/\r/g, "\n")
        .split("\n")
        .filter((line) => /WARNING|ERROR/i.test(line)),
    ]),
  );
  return {
    ...map.report,
    compilerWarnings,
    tools: Object.fromEntries(
      Object.entries(logs).map(([key, value]) => [
        key,
        value.split("\n").slice(0, 5).join("\n"),
      ]),
    ),
  };
}
