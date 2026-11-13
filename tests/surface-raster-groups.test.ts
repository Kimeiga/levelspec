import { test } from "node:test";
import assert from "node:assert/strict";
import { compile, parseAml, collisionMesh } from "levelspec";
import { KitSurfaces, type SurfaceDeposit } from "../src/dressing/kit-surfaces.ts";
import { compileSurfaceAppearance } from "../src/dressing/surface/compile.ts";
import { decodeSurfaceImage, type SurfaceImage } from "../src/dressing/surface/images.ts";
import type { SurfaceChart } from "../src/dressing/surface/types.ts";
import { registerSurfaceChart } from "../src/dressing/surface/plans.ts";

type Level = Awaited<ReturnType<typeof compile>>;
type DepositOrder = "none" | "before" | "between" | "after";
const source = `<architecture version="1" id="shared-pigment"><material id="coat" color="#ffffff" roughness="0.7"/>
  <group id="wall"><box id="early" width="1" depth="0.1" height="1" material="coat"/>
    <box id="late" position="2 0 0" width="1" depth="0.1" height="1" material="coat"/></group></architecture>`;
const frame: SurfaceChart["frame"] = { origin: [0, 0, 0], u: [1, 0, 0], v: [0, 0, 1], normal: [0, -1, 0] };

/** Selects the two real front triangles of one disjoint native panel. */
function panel(level: Level, id: string, left: number): SurfaceChart {
  const triangles = level.mesh.surfaces.flatMap((_, triangle) => {
    const indices = level.mesh.indices.slice(triangle * 3, triangle * 3 + 3);
    const normalY = level.mesh.normals[indices[0] * 3 + 1];
    const xs = indices.map(index => level.mesh.positions[index * 3]);
    return normalY < -0.99 && Math.min(...xs) >= left && Math.max(...xs) <= left + 1 ? [triangle] : [];
  });
  assert.equal(triangles.length, 2);
  return { id, host: "wall", firstTriangle: triangles[0], triangleCount: 2, triangleIndices: triangles,
    frame, bounds: [left, 0, left + 1, 1], materials: ["coat"],
    raster: { group: "continuous-wall", bounds: [0, 0, 3, 1], texelsPerMeter: 8 },
    sample: (u, v) => ({ height: 0, roughness: 0.7, depositRetention: u >= 2 && u <= 3 && v >= 0.5 && v <= 1 ? 0 : 1,
      layers: [{ material: "coat", weight: 1, uv: [u, v], tint: [0.5, 0.5, 0.5], coatings: left === 0 ? undefined : [] }] }),
  };
}

/** Registers a later-panel fixture before, between or after receiver creation, then runs real binding and geometry. */
async function build(order: DepositOrder): Promise<Level> {
  const level = await compile(parseAml(source), { navigation: false });
  const originalCollision = collisionMesh(level, true);
  const surfaces = new KitSurfaces(level);
  const deposit: SurfaceDeposit = { frame, bounds: [2.05, 0.05, 2.95, 0.95],
    sample: () => ({ strength: 1, tint: [0.25, 0.5, 0.75], roughness: 1 }) };
  if (order === "before") surfaces.deposit(deposit);
  surfaces.receive(panel(level, "first-panel", 0));
  if (order === "between") surfaces.deposit(deposit);
  surfaces.receive(panel(level, "later-panel", 2));
  if (order === "after") surfaces.deposit(deposit);
  await compileSurfaceAppearance(level, { navigation: false }, 1000);
  assert.deepEqual(collisionMesh(level, true), originalCollision, "Deposits and repair age leave native collision unchanged");
  return level;
}

/** Reads one generated image texel without filtering. */
function pixel(image: SurfaceImage, column: number, row: number): number[] {
  return Array.from(image.data.subarray((row * image.width + column) * 4, (row * image.width + column + 1) * 4));
}

test("appearance tint spans shared raster bounds and remains independent between groups", async () => {
  for (const shared of [true, false]) {
    const level = await compile(parseAml(source), { navigation: false });
    for (const left of [0, 2]) {
      const chart = panel(level, `panel-${left}`, left);
      if (!shared) chart.raster!.group = `group-${left}`;
      chart.appearanceTint = shared
        ? u => u < 1 ? [0.5, 0.5, 0.5] : [1, 1, 1]
        : () => left === 0 ? [0.5, 0.5, 0.5] : [1, 1, 1];
      registerSurfaceChart(level, chart);
    }
    await compileSurfaceAppearance(level, {}, 1000);
    const materials = level.document.materials.filter(material => material.id.startsWith("$surface/raster/"));
    assert.equal(materials.length, shared ? 1 : 2);
    const first = decodeSurfaceImage(level.generatedImages![materials[0].texture!].bytes);
    const last = decodeSurfaceImage(level.generatedImages![materials.at(-1)!.texture!].bytes);
    assert.deepEqual(pixel(first, 5, 7), [137, 137, 137, 255]);
    assert.deepEqual(pixel(last, 21, 7), [188, 188, 188, 255]);
    assert.ok(level.mesh.colors!.every(value => value === 1), "Baked appearance is not multiplied again at vertices");
  }
});

test("a shared raster retains later-panel stains in every registration order and fresh repairs cover them", async () => {
  const clean = await build("none");
  let firstHashes: string[] | undefined;
  for (const order of ["before", "between", "after"] as const) {
    const level = await build(order);
    for (const attribute of ["positions", "indices", "normals"] as const)
      assert.deepEqual(level.mesh[attribute], clean.mesh[attribute], `${order}: local pigment does not subdivide either receiver`);
    assert.equal(level.mesh.indices.length / 3, 24);
    const frontMaterials = new Set(level.mesh.surfaces.flatMap((surface, triangle) => {
      const vertex = level.mesh.indices[triangle * 3];
      return level.mesh.normals[vertex * 3 + 1] < -0.99 ? [level.surfaces[surface].material] : [];
    }));
    assert.equal(frontMaterials.size, 1, "Both disjoint panels use one continuous generated material");
    const material = level.document.materials.find(material => frontMaterials.has(material.id))!;
    assert.ok(material.texture && level.generatedImages![material.texture], "The shared material actually binds generated pigment");
    assert.ok(material.metallicRoughnessTexture && level.generatedImages![material.metallicRoughnessTexture]);
    const color = decodeSurfaceImage(level.generatedImages![material.texture].bytes);
    const roughness = decodeSurfaceImage(level.generatedImages![material.metallicRoughnessTexture].bytes);
    assert.deepEqual([color.width, color.height], [28, 12]);
    assert.deepEqual(pixel(color, 21, 7), [99, 137, 165, 255], `${order}: stain survives at u=2.4375,v=0.3125 on the later panel`);
    assert.deepEqual(pixel(color, 21, 4), [188, 188, 188, 255], `${order}: the fresh upper repair covers the old deposit`);
    assert.deepEqual(pixel(color, 5, 7), [188, 188, 188, 255], `${order}: the first panel remains outside the fixture's influence`);
    assert.equal(pixel(roughness, 21, 7)[1], 255);
    assert.equal(pixel(roughness, 21, 4)[1], 179, "Fresh repair retention covers old roughness as well as pigment");
    for (const [x, z, expectedU, expectedV] of [[0, 0, 2 / 28, 2 / 12], [3, 1, 26 / 28, 10 / 12]]) {
      const vertex = level.mesh.positions.findIndex((value, offset) => offset % 3 === 0 && value === x
        && level.mesh.positions[offset + 1] === 0 && level.mesh.positions[offset + 2] === z
        && level.mesh.normals[offset + 1] < -0.99) / 3;
      assert.ok(vertex >= 0);
      assert.deepEqual(level.mesh.uv.slice(vertex * 2, vertex * 2 + 2), [expectedU, expectedV],
        "Actual panel vertices sample their shared meter frame, including its gap");
    }
    assert.equal(level.surfaceAppearance!.texels, 28 * 12 * 2, "One shared color/MR pair is charged once");
    if (firstHashes) assert.deepEqual(level.surfaceAppearance!.generatedHashes, firstHashes,
      "Registration order does not alter the final image bytes");
    firstHashes = level.surfaceAppearance!.generatedHashes;
  }
});
