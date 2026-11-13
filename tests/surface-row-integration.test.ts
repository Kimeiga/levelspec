import { test } from "node:test";
import assert from "node:assert/strict";
import { compile, parseAml, collisionMesh } from "levelspec";
import { KitSurfaces } from "../src/dressing/kit-surfaces.ts";
import { compileSurfaceAppearance } from "../src/dressing/surface/compile.ts";
import { decodeSurfaceImage, encodeSurfaceImage } from "../src/dressing/surface/images.ts";
import type { SurfaceChart } from "../src/dressing/surface/types.ts";

const source = `<architecture version="1" id="row-bindings">
  <material id="finish" color="#ffffff" height-texture="height.png" height-scale="0.02"/>
  <box id="receiver" width="1" depth="1" height="0.1" material="finish"/>
</architecture>`;
const height = encodeSurfaceImage({ width: 2, height: 2, data: new Uint8Array(16).fill(255) });

/** Binds deposits and authored height to the actual top face, with either scalar or row sampling. */
async function build(rows: boolean) {
  const level = await compile(parseAml(source), { navigation: false });
  const collision = collisionMesh(level, true), material = structuredClone(level.document.materials[0]);
  const triangles = level.mesh.surfaces.flatMap((_, triangle) =>
    level.mesh.normals[level.mesh.indices[triangle * 3] * 3 + 2] > .99 ? [triangle] : []);
  assert.equal(triangles.length, 2);
  const chart: SurfaceChart = {
    id: "top", host: "receiver", firstTriangle: triangles[0], triangleCount: 2, triangleIndices: triangles,
    frame: { origin: [0, 0, .1], u: [1, 0, 0], v: [0, 1, 0], normal: [0, 0, 1] },
    bounds: [0, 0, 1, 1], materials: ["finish"],
    raster: { group: "top", bounds: [0, 0, 1, 1], texelsPerMeter: 4, bump: "sample" },
    sample: (u, v) => ({ height: 0, bump: .04 * u, roughness: .8, depositRetention: .5,
      layers: [{ material: "finish", weight: 1, uv: [u, v], tint: [.5, 1, .25] }] }),
  };
  if (rows) {
    const sample = chart.sample;
    chart.sampleRow = function* (us, v) { for (const u of us) yield sample(u, v); };
  }
  const surfaces = new KitSurfaces(level);
  surfaces.receive(chart);
  surfaces.deposit({ frame: chart.frame, bounds: [0, 0, 1, 1],
    sample: () => ({ strength: .5, tint: [0, .5, 1], roughness: .2 }) });
  await compileSurfaceAppearance(level, { resolveMaterialImage: async reference => {
    assert.equal(reference, "height.png");
    return height;
  } }, 1000);
  assert.deepEqual(level.diagnostics, []);
  assert.deepEqual(collisionMesh(level, true), collision);
  assert.deepEqual(level.document.materials.find(value => value.id === "finish"), material);
  return level;
}

test("row sampling retains fixture deposits and authored height-material bindings", async () => {
  const scalar = await build(false), rows = await build(true);
  assert.deepEqual(rows.mesh, scalar.mesh, "The row optimization preserves geometric height and material ownership");
  assert.deepEqual(rows.surfaceAppearance!.generatedHashes, scalar.surfaceAppearance!.generatedHashes);
  const used = new Set(rows.mesh.surfaces.map(index => rows.surfaces[index].material));
  const material = rows.document.materials.find(value => used.has(value.id) && value.id.startsWith("$surface/raster/"))!;
  assert.ok(material?.texture && material.metallicRoughnessTexture && material.normalTexture);
  const color = decodeSurfaceImage(rows.generatedImages![material.texture].bytes);
  const properties = decodeSurfaceImage(rows.generatedImages![material.metallicRoughnessTexture].bytes);
  const offset = (3 * color.width + 3) * 4;
  // Half deposit retention makes the half-strength fixture 25% opaque.
  // The resulting linear tint is [.375, .875, .25]; roughness is .8*.75 + .2*.25.
  assert.deepEqual(Array.from(color.data.slice(offset, offset + 4)), [165, 240, 137, 255]);
  assert.equal(properties.data[offset + 1], 166);
  const top = rows.mesh.surfaces.flatMap((index, triangle) => rows.surfaces[index].material === material.id
    && rows.mesh.normals[rows.mesh.indices[triangle * 3] * 3 + 2] > .99
    ? rows.mesh.indices.slice(triangle * 3, triangle * 3 + 3) : []);
  assert.ok(top.length > 0);
  for (const vertex of top) assert.ok(Math.abs(rows.mesh.positions[vertex * 3 + 2] - .12) < 1e-8,
    "The 2 cm authored height remains geometric while sampled bump only changes normals");
});
