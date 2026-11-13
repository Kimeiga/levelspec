import { test } from "node:test";
import assert from "node:assert/strict";
import { collisionMesh, compile, parseAml } from "levelspec";
import { compileSurfaceAppearance } from "../src/dressing/surface/compile.ts";
import { decodeSurfaceImage } from "../src/dressing/surface/images.ts";
import { registerSurfaceChart } from "../src/dressing/surface/plans.ts";
import type { SurfaceChart } from "../src/dressing/surface/types.ts";

/** Gives a real compiled object an indexed square with two distinguishable source faces. */
async function fixture() {
  const level = await compile(parseAml(`<architecture version="1" id="receiver-binding">
    <material id="red" color="#ff0000"/><material id="blue" color="#0000ff"/>
    <box id="box" width="1" depth="1" height="0.1" material="red"/>
  </architecture>`), { navigation: false });
  assert.deepEqual(level.diagnostics, []);
  const original = level.surfaces.find(surface => surface.object === "box")!;
  const first = level.surfaces.length;
  level.surfaces.push({ ...original, id: "first-face", role: "first-face" },
    { ...original, id: "second-face", role: "second-face" });
  level.mesh = { positions: [0, 0, .1, 1, 0, .1, 1, 1, .1, 0, 1, .1],
    normals: [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1], uv: [0, 0, 1, 0, 1, 1, 0, 1],
    indices: [0, 1, 2, 0, 2, 3], surfaces: [first, first + 1], solidIds: ["first-solid", "second-solid"] };
  return level;
}

/** Uses the square's authored UVs, with one fixed material for each receiver. */
function receiver(id: string, triangles: number[], material: string, group: string): SurfaceChart {
  return { id, host: "box", firstTriangle: triangles[0], triangleCount: triangles.length, triangleIndices: triangles,
    frame: { origin: [0, 0, .1], u: [1, 0, 0], v: [0, 1, 0], normal: [0, 0, 1] },
    bounds: [0, 0, 1, 1], materials: [material],
    raster: { coordinates: "uv", group, bounds: [0, 0, 1, 1], texelsPerMeter: 2 },
    sample: (u, v) => ({ height: 0, layers: [{ material, weight: 1, uv: [u, v] }] }),
  };
}

test("UV binding reuses vertices within a receiver and preserves independent receiver and source-face ownership", async () => {
  for (const mode of ["one-receiver", "shared-material", "distinct-materials"] as const) {
    const level = await fixture(), before = structuredClone(level.mesh), collision = collisionMesh(level, true);
    if (mode === "one-receiver") registerSurfaceChart(level, receiver("both", [0, 1], "red", "shared"));
    else {
      registerSurfaceChart(level, receiver("first", [0], "red", "shared"));
      registerSurfaceChart(level, receiver("second", [1], mode === "distinct-materials" ? "blue" : "red",
        mode === "distinct-materials" ? "different" : "shared"));
    }
    await compileSurfaceAppearance(level, {}, 2);
    assert.equal(level.mesh.indices.length, 6, "Binding preserves both input triangles");
    assert.deepEqual(level.mesh.solidIds, before.solidIds);
    assert.deepEqual(collisionMesh(level, true), collision);
    const materials: string[] = [];
    for (let triangle = 0; triangle < 2; triangle++) {
      const surface = level.surfaces[level.mesh.surfaces[triangle]];
      assert.equal(surface.object, "box");
      assert.equal(surface.role, triangle === 0 ? "first-face" : "second-face",
        "Sharing a generated material cannot merge source-face metadata");
      materials.push(surface.material);
      const material = level.document.materials.find(candidate => candidate.id === surface.material)!;
      assert.ok(material.texture && level.generatedImages?.[material.texture]);
      const color = decodeSurfaceImage(level.generatedImages[material.texture].bytes);
      assert.deepEqual(Array.from(color.data.slice(0, 4)), mode === "distinct-materials" && triangle === 1
        ? [0, 0, 255, 255] : [255, 0, 0, 255]);
      for (let corner = 0; corner < 3; corner++) {
        const output = level.mesh.indices[triangle * 3 + corner], input = before.indices[triangle * 3 + corner];
        assert.deepEqual(level.mesh.positions.slice(output * 3, output * 3 + 3), before.positions.slice(input * 3, input * 3 + 3));
        assert.deepEqual(level.mesh.normals.slice(output * 3, output * 3 + 3), before.normals.slice(input * 3, input * 3 + 3));
        assert.deepEqual(level.mesh.colors!.slice(output * 3, output * 3 + 3), [1, 1, 1]);
        assert.deepEqual(level.mesh.uv.slice(output * 2, output * 2 + 2), before.uv.slice(input * 2, input * 2 + 2).map(value => (2 + 2 * value) / 6));
      }
    }
    assert.equal(materials[0] === materials[1], mode !== "distinct-materials");
    assert.equal(new Set(level.mesh.indices).size, mode === "one-receiver" ? 4 : 6,
      "One receiver reuses its shared edge; separate receivers own independent output attributes");
  }
});

test("UV binding preserves untouched authored attributes and keeps receiver vertices independent", async () => {
  const level = await fixture();
  level.mesh.normals = [1, 0, 0, 0, 1, 0, 0, 0, -1, -1, 0, 0];
  level.mesh.uv = [.25, .75, .5, .25, .75, .5, .125, .875];
  level.mesh.colors = [0, .2, .3, .4, 0, .6, .7, .8, 0, 0, .5, 1];
  const input = level.mesh, before = structuredClone(input);
  const originalSurfaces = input.surfaces.map(index => structuredClone(level.surfaces[index]));
  registerSurfaceChart(level, receiver("first", [0], "red", "first"));
  await compileSurfaceAppearance(level, {}, 2);
  assert.deepEqual(input, before, "Appearance binding must not mutate the input mesh");
  assert.deepEqual(level.mesh.solidIds, before.solidIds);
  assert.equal(new Set(level.mesh.indices).size, 6, "A bound and untouched face cannot share output attributes");
  assert.equal(level.mesh.surfaces[1], before.surfaces[1]);
  for (let face = 0; face < 2; face++) {
    const surface = level.surfaces[level.mesh.surfaces[face]];
    assert.equal(surface.object, originalSurfaces[face].object);
    assert.equal(surface.role, originalSurfaces[face].role);
    for (let corner = 0; corner < 3; corner++) {
      const source = before.indices[face * 3 + corner], output = level.mesh.indices[face * 3 + corner];
      assert.deepEqual(level.mesh.positions.slice(output * 3, output * 3 + 3), before.positions.slice(source * 3, source * 3 + 3));
      assert.deepEqual(level.mesh.normals.slice(output * 3, output * 3 + 3), before.normals.slice(source * 3, source * 3 + 3));
      const uv = before.uv.slice(source * 2, source * 2 + 2);
      assert.deepEqual(level.mesh.uv.slice(output * 2, output * 2 + 2), face === 0 ? uv.map(value => (2 + 2 * value) / 6) : uv);
      assert.deepEqual(level.mesh.colors!.slice(output * 3, output * 3 + 3),
        face === 0 ? [1, 1, 1] : before.colors!.slice(source * 3, source * 3 + 3));
    }
  }
});
