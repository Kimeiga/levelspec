/** Bakes the current production wall/floor recipes around the restaurant prop study. */
import assert from "node:assert/strict";
import { readFile, writeFile, mkdir, rename, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve, join } from "node:path";
import { Matrix4 } from "three";
import { compile, parseAml, toGLB, resolveExportAssets } from "levelspec";
import type { V3 } from "../../src/architecture/types.ts";
import { localMaterialImages } from "../../src/cli/material-images.ts";
import { KitMesh } from "../../src/dressing/kit-mesh.ts";
import { kitMaterials, kitFinishes } from "../../src/dressing/kit.ts";
import { Pen } from "../../src/dressing/pen.ts";
import { triangle } from "../../src/dressing/geometry.ts";
import { GroundSurfaceField } from "../../src/dressing/ground-surface.ts";
import { WallCondition } from "../../src/dressing/finish/wall-condition.ts";
import { drawSkin } from "../../src/dressing/kowloon/skin.ts";
import { registerSurfaceChart } from "../../src/dressing/surface/plans.ts";
import { compileSurfaceAppearance } from "../../src/dressing/surface/compile.ts";

const output = resolve(process.argv[2] ?? "generated/restaurant-props/store-surfaces");
const source = resolve("projects/kowloon-restaurant-props/store-surfaces.aml");
const bytes = await readFile(source);
const images = localMaterialImages(source);
const dependencies = ["projects/kowloon-restaurant-props/build-store-surfaces.ts", source,
  ...(await readdir("src/dressing", { recursive: true })).filter(file => file.endsWith(".ts")).map(file => `src/dressing/${file}`)];
const inputs = Object.fromEntries(await Promise.all(dependencies.map(async file =>
  [file, createHash("sha256").update(await readFile(file)).digest("hex")])));
const materialInputs: Record<string, string> = {};

/** Records the actual image bytes consumed by compilation and export, rejecting mid-bake changes. */
async function materialImage(reference: string, signal?: AbortSignal): Promise<Uint8Array> {
  const image = await images.load(reference, signal);
  const hash = createHash("sha256").update(image).digest("hex");
  if (materialInputs[reference]) assert.equal(hash, materialInputs[reference], `Material changed during bake: ${reference}`);
  materialInputs[reference] = hash;
  return image;
}
const level = await compile(parseAml(bytes.toString()), { navigation: false });
assert.deepEqual(level.diagnostics.filter(item => item.severity === "error"), []);
const width = 3.6, depth = 2.9, height = 2.6;
const budget = { maximumTriangles: 500_000 };
const started = performance.now();

/** Reports the expensive offline surface bake without requiring the browser to compile it. */
function progress(stage: string): void {
  process.stderr.write(`${stage} (${((performance.now() - started) / 1000).toFixed(1)}s)\n`);
}

kitMaterials(level);
level.mesh.colors = [];
const slots = kitFinishes(level, undefined, "coat").materials;
slots.wall = "coat";
slots["render-weathered"] = "render-weathered";
slots["render-repair"] = "render-repair";
slots["substrate-0"] = "substrate";
const mesh = new KitMesh(level, "store-enclosure", "study", slots, budget);
const pen = new Pen(mesh, "enclosure", new Matrix4(), false);

/** Uses the shared facade recipe, including its latest weathering/repair raster path. */
function wall(name: string, origin: V3, tangent: V3, inward: V3, length: number, seed: number): void {
  const local = pen.into(name).facing(origin, tangent, inward);
  local.box("substrate-0", [0, -.08, 0], [length, 0, height], [1, 1, 1], "f");
  const condition = new WallCondition({ base: 0, ledges: [{ u0: 0, u1: length, z: height, flow: .6 }] },
    { grime: .65, wear: .75, seed });
  drawSkin({ pen: local, rects: [{ u0: 0, u1: length, v0: 1.5, v1: height }], openings: [], condition,
    washAt: () => [1, .99, .96], uMarks: [0, length], zMarks: [0, height],
    finish: { coat: "wall", bare: "substrate-0" }, raster: { density: 80, seed } });
}

/** Registers a continuous real-relief floor field at the existing stock's Z=0 support datum. */
function floor(name: string, bounds: [number, number, number, number], tiled: boolean): void {
  const [x0, y0, x1, y1] = bounds;
  const polygon: V3[] = [[x0, y0, 0], [x1, y0, 0], [x1, y1, 0], [x0, y1, 0]];
  const field = new GroundSurfaceField({ seed: 317, kind: tiled ? "tile" : "concrete", polygon, deposits: [],
    tileSize: .20, wornEdges: [true, true, true, true], angle: 0, phase: .37, relief: true, wear: .7, receivingEdges: [],
    material(finish) {
      const id = finish === "asphalt" ? "concrete" : finish;
      const material = level.document.materials.find(item => item.id === id)!;
      return { id, repeat: material.repeat };
    },
    color: () => [1, 1, 1],
  });
  const surface = mesh.finished(name, name, tiled ? "tile" : "concrete");
  const firstTriangle = level.mesh.surfaces.length;
  for (let i = 1; i < 3; i++) {
    const points = [polygon[0], polygon[i], polygon[i + 1]];
    triangle(level.mesh, points, [0, 0, 1], points.map(p => [p[0], p[1]]), [[1, 1, 1], [1, 1, 1], [1, 1, 1]], surface);
  }
  registerSurfaceChart(level, { id: name, host: "store-enclosure", firstTriangle, triangleCount: 2,
    frame: { origin: [0, 0, 0], u: [1, 0, 0], v: [0, 1, 0], normal: [0, 0, 1] }, bounds,
    materials: field.materials, layerElevations: field.layerElevations, geometryStep: .055,
    featureScale: field.featureScale(bounds), constructionCuts: field.constructionCuts(bounds),
    uniformCoverage: area => field.uniformCoverage(area), sample: (u, v) => field.sample(u, v) });
}

wall("back-wall", [0, depth, 0], [1, 0, 0], [0, -1, 0], width, 317);
wall("left-wall", [0, 0, 0], [0, 1, 0], [1, 0, 0], depth, 318);
wall("right-wall", [width, depth, 0], [0, -1, 0], [-1, 0, 0], depth, 319);
pen.into("floor-edge").box("substrate-0", [-.08, -1, -.08], [width + .08, depth + .08, 0], [1, 1, 1], "u");
floor("interior-floor", [0, 0, width, depth], true);
floor("street-apron", [-.08, -1, width + .08, 0], false);
progress("Compiling production surface fields");
await compileSurfaceAppearance(level, { resolveMaterialImage: materialImage,
  appearance: { maximumTexels: 4 * 1024 * 1024 }, onProgress: progress }, budget.maximumTriangles);
const assets = await resolveExportAssets(level, materialImage);
const glb = toGLB(level, { assets });
await mkdir(output, { recursive: true });
await writeFile(join(output, "enclosure.tmp.glb"), glb);
await rename(join(output, "enclosure.tmp.glb"), join(output, "enclosure.glb"));
await writeFile(join(output, "report.json"), JSON.stringify({ dimensions: { width, depth, height },
  sourceSha256: createHash("sha256").update(bytes).digest("hex"),
  glbSha256: createHash("sha256").update(glb).digest("hex"), triangles: level.mesh.indices.length / 3,
  budget, inputs, materialInputs, appearance: level.surfaceAppearance, diagnostics: level.diagnostics,
  purpose: "Visual enclosure only; production restaurant stock is composed by store-viewer.mjs." }, null, 2));
progress(`Exported ${level.mesh.indices.length / 3} enclosure triangles`);
