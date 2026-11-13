import { test } from "node:test";
import assert from "node:assert/strict";
import type { Material, V3 } from "../src/vector/types.ts";
import { GroundSurfaceField, type GroundSurfaceRecipe } from "../src/dressing/ground-surface.ts";
import { rasterizeSurface, type SurfaceRasterSettings } from "../src/dressing/surface/raster.ts";
import type { SurfaceChart, SurfaceSample } from "../src/dressing/surface/types.ts";

const SETTINGS: SurfaceRasterSettings = {
  geometry: "preserve", group: "ground", bounds: [-.5, -.5, 1, 1], texelsPerMeter: 8, bump: "sample",
};

/** Gives each ground finish a distinct source factor and position-dependent pigment. */
function recipe(kind: string): GroundSurfaceRecipe {
  return {
    seed: 71, kind, polygon: [[-.5, -.5, 0], [1, -.5, 0], [1, 1, 0], [-.5, 1, 0]],
    asphalt: [[[-1, -1, 0], [.25, -1, 0], [.25, 2, 0], [-1, 2, 0]]],
    deposits: [{ material: "repair", polygon: [[.55, .55, 0], [.9, .55, 0], [.9, .9, 0], [.55, .9, 0]] }],
    tileSize: .24, tileAspect: 2, tileWear: .6, tileGrime: .4,
    wornEdges: [false, true, false, false], angle: .37, phase: .23, relief: true,
    receivingEdges: [[[1, -.5, 0], [1, 1, 0]]],
    material: finish => ({ id: finish, repeat: finish === "substrate" ? .5 : 2, roughness: .66 }),
    color: ([x, y], finish) => finish === "asphalt" ? [.35 + x * .03, .4, .45 + y * .02]
      : finish === "repair" ? [.8, .6 + x * .02, .5] : [.55 + x * .04, .65 + y * .03, .8],
  };
}

/** Supplies real ground sampling to the compositor without allocating compiler geometry. */
function chart(field: GroundSurfaceField, sample: SurfaceChart["sample"]): SurfaceChart {
  return { id: "ground", host: "floor", firstTriangle: 0, triangleCount: 2,
    frame: { origin: [0, 0, 0], u: [1, 0, 0], v: [0, 1, 0], normal: [0, 0, 1] },
    bounds: SETTINGS.bounds, materials: field.materials, sample };
}

/** Keeps the pre-composition contract: geometry and pigment are sampled independently. */
function separateSample(field: GroundSurfaceField, u: number, v: number): SurfaceSample {
  const sample = field.sample(u, v, 1 / SETTINGS.texelsPerMeter);
  let selected = 0;
  for (let index = 1; index < sample.layers.length; index++)
    if (sample.layers[index].weight > sample.layers[selected].weight) selected = index;
  const elevation = (field.layerElevations?.[selected] ?? 0) * (sample.layerElevationWeight ?? 1);
  return { ...sample, height: 0, bump: sample.bump ?? sample.height + elevation };
}

test("ground raster samples preserve separate pigment composition, finish ownership and PBR maps", async () => {
  for (const kind of ["concrete", "tile", "timber"]) {
    const source = recipe(kind);
    const input = structuredClone({ ...source, material: undefined, color: undefined });
    const separate = new GroundSurfaceField(source), combined = new GroundSurfaceField(source);
    const materials = new Map<string, Material>(combined.materials.map((id, index) => [id,
      { id, color: index % 2 ? "#c0a080" : "#80b0e0", repeat: 1, roughness: .25 + index * .08, metalness: .1 }]));
    const materialInput = structuredClone(materials);
    const reference = chart(separate, (u, v) => separateSample(separate, u, v));
    reference.appearanceTint = (u, v, layer) => separate.tint(u, v, layer);
    const receiver = chart(combined, (u, v) => combined.rasterSample(u, v, 1 / SETTINGS.texelsPerMeter));
    const expected = await rasterizeSurface(reference, SETTINGS, materials, new Map());
    const actual = await rasterizeSurface(receiver, SETTINGS, materials, new Map());
    assert.deepEqual([actual.layout.width, actual.layout.height, actual.layout.bounds],
      [expected.layout.width, expected.layout.height, expected.layout.bounds], kind);
    assert.deepEqual(actual.layers, expected.layers, `${kind}: pigment movement preserves every decoded PBR channel`);

    const probes = [[-.3, -.2], [.249, .31], [.7, .7], [.6, .2]] as const;
    for (const [u, v] of [...probes, ...probes.toReversed()]) {
      const geometry = combined.sample(u, v, .125), before = structuredClone(geometry);
      const full = combined.rasterSample(u, v, .125), retained = structuredClone(full);
      combined.rasterSample(v, u, .125);
      assert.deepEqual(full, retained, `${kind}: later samples cannot overwrite returned data`);
      assert.deepEqual(geometry, before, `${kind}: pigment composition cannot mutate a geometric sample`);
      assert.equal(full.height, 0);
      assert.deepEqual(full.layers.map(layer => [layer.material, layer.weight, layer.uv, layer.coatings]),
        geometry.layers.map(layer => [layer.material, layer.weight, layer.uv, layer.coatings]));
      for (let index = 0; index < geometry.layers.length; index++) {
        if (geometry.layers[index].weight === 0) continue;
        const fresh = new GroundSurfaceField(source);
        const tint = fresh.tint(u, v, index), base = geometry.layers[index].tint ?? [1, 1, 1];
        assert.deepEqual(full.layers[index].tint, base.map((value, axis) => value * tint[axis]),
          `${kind}: coordinate order cannot change an active finish's full tint`);
      }
    }
    assert.deepEqual({ ...source, material: undefined, color: undefined }, input);
    assert.deepEqual(materials, materialInput);
  }
});

test("ground pigment modulates the complete coating stack exactly once", async () => {
  const pigment: V3 = [.5, .25, 1];
  const field = new GroundSurfaceField({ ...recipe("concrete"), asphalt: [], deposits: [], color: () => pigment });
  const receiver = chart(field, (u, v) => {
    const sample = field.rasterSample(u, v, .125);
    sample.layers[0].coatings = [{ material: "blue", uv: [u, v], opacity: .5 }];
    return sample;
  });
  receiver.materials = [...field.materials, "blue"];
  const materials = new Map<string, Material>([
    ["concrete", { id: "concrete", color: "#ffffff", repeat: 1, roughness: .8, metalness: .2 }],
    ["blue", { id: "blue", color: "#0000ff", repeat: 1, roughness: .4, metalness: .6 }],
  ]);
  const { layers, layout } = await rasterizeSurface(receiver, SETTINGS, materials, new Map());
  const offset = (3 * layout.width + 3) * 4;
  // Half blue over white is [.5, .5, 1]; the ground pigment yields [.25, .125, 1].
  assert.deepEqual(Array.from(layers[0].color.data.slice(offset, offset + 4)), [137, 99, 255, 255]);
  assert.deepEqual(Array.from(layers[0].metallicRoughness.data.slice(offset, offset + 4)), [255, 153, 102, 255]);
  assert.deepEqual(Array.from(layers[0].normal!.data.slice(offset, offset + 4)), [128, 128, 255, 255]);
  assert.deepEqual(pigment, [.5, .25, 1], "The color callback retains ownership of its returned vector");
  assert.equal(field.sample(.2, .3).layers[0].tint, undefined, "Geometry samples remain pigment-free");
  assert.equal(field.renderedHeight(.2, .3), 0);
});
