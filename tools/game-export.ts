#!/usr/bin/env node
/**
 * Export a validated level for a Three.js (or any glTF) game:
 *
 *   node tools/game-export.ts map.level.svgx --out public/maps/kiln
 *
 * Writes <id>.glb (visual), <id>.collision.glb (walls, floors, cover; no
 * decoration) and <id>.game.json (spawns, sites and player size). Everything
 * is in glTF's Y-up metres, matching how GLTFLoader places both meshes.
 * A level that fails geometry or navigation validation is not exported.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { compile, parseLevelSvgx, toGLB, validateForRuntime } from "../src/vector/index.ts";
import type { V3 } from "../src/vector/types.ts";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { out: { type: "string" } },
});
const source = positionals[0];
if (!source || !values.out) {
  console.error("Usage: node tools/game-export.ts map.level.svgx --out directory");
  process.exit(2);
}

/** LevelSpec is right-handed Z-up; the GLB root rotates -90 degrees about X. */
const yUp = ([x, y, z]: V3): V3 => [x, z, -y];

const level = await compile(parseLevelSvgx(await readFile(source, "utf8")));
const report = await validateForRuntime(level);
const errors = report.diagnostics.filter((d) => d.severity === "error");
if (!report.passed || errors.length) {
  for (const d of errors) console.error(`${d.code}: ${d.message}`);
  console.error(`${source} failed validation; nothing exported.`);
  process.exit(1);
}
const id = level.document.id;
await mkdir(values.out, { recursive: true });
await writeFile(join(values.out, `${id}.glb`), toGLB(level));
await writeFile(join(values.out, `${id}.collision.glb`), toGLB(level, { purpose: "collision" }));
const { player } = level.document;
await writeFile(join(values.out, `${id}.game.json`), JSON.stringify({
  id,
  name: level.document.name,
  geometryHash: level.geometryHash,
  coordinateSystem: "glTF Y-up metres",
  player: { radius: player.radius, height: player.height, step: player.step, slope: player.slope },
  markers: level.document.markers.map((m) => ({
    id: m.id, kind: m.kind, team: m.team, label: m.label, region: m.region, position: yUp(m.position),
  })),
}, null, 2));
console.log(`Exported ${id} to ${values.out}`);
