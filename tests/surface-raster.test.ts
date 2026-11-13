import { test } from "node:test";
import assert from "node:assert/strict";
import type { Material, V3 } from "../src/vector/types.ts";
import type { SurfaceImage } from "../src/dressing/surface/images.ts";
import type { SurfaceChart, SurfaceCoating } from "../src/dressing/surface/types.ts";
import { rasterizeSurface, surfaceRasterLayout, type SurfaceRasterSettings } from "../src/dressing/surface/raster.ts";
const SETTINGS: SurfaceRasterSettings = { group: "calibration", bounds: [0, 0, 1, 1], texelsPerMeter: 2 };

/** A source material whose scalar factors remain distinguishable from its image channels. */
function material(overrides: Partial<Material> = {}): Material {
  return { id: "coat", color: "#ffffff", repeat: 1, roughness: 0.8, metalness: 0.25, ...overrides };
}

/** A meter-based planar receiver; raster tests require no compiler or geometry allocation. */
function chart(sample: SurfaceChart["sample"] = (u, v) => ({
  height: 0, layers: [{ material: "coat", weight: 1, uv: [u, v] }],
})): SurfaceChart {
  return { id: "calibration", host: "wall", firstTriangle: 0, triangleCount: 2,
    frame: { origin: [0, 0, 0], u: [1, 0, 0], v: [0, 0, 1], normal: [0, -1, 0] },
    bounds: [0, 0, 1, 1], materials: ["coat"], sample };
}

/** Creates authored RGBA pixels in top-row-first image order. */
function rgba(width: number, height: number, pixels: number[]): SurfaceImage {
  assert.equal(pixels.length, width * height * 4);
  return { width, height, data: new Uint8Array(pixels) };
}

/** Reads one output texel without filtering or color conversion. */
function pixel(image: SurfaceImage, column: number, row: number): number[] {
  const offset = (row * image.width + column) * 4;
  return Array.from(image.data.subarray(offset, offset + 4));
}

/** Checks a physical normal direction, allowing only one byte's signed-component quantization. */
function assertNormal(image: SurfaceImage | undefined, expected: V3, context: string): void {
  assert.ok(image, `${context}: normal map exists`);
  const length = Math.hypot(...expected), actual = pixel(image, 2, 2);
  for (let axis = 0; axis < 3; axis++) {
    assert.ok(Math.abs(actual[axis] / 255 * 2 - 1 - expected[axis] / length) <= 1 / 255 + 1e-6,
      `${context}: component ${axis} should follow ${expected}, received ${actual}`);
  }
  assert.equal(actual[3], 255);
}

test("raster layout preserves meter coordinates inside padded lower-left UVs", () => {
  const settings: SurfaceRasterSettings = { group: "offset-wall", bounds: [-2, -1, 1, 1], texelsPerMeter: 4 };
  const layout = surfaceRasterLayout(settings);
  assert.deepEqual([layout.width, layout.height], [16, 12]);
  assert.deepEqual(layout.uv(-2, -1), [2 / 16, 2 / 12]);
  assert.deepEqual(layout.uv(1, 1), [14 / 16, 10 / 12]);
  assert.deepEqual(layout.uv(-0.5, 0), [0.5, 0.5]);
  assert.deepEqual(layout.bounds, settings.bounds);
  assert.notEqual(layout.bounds, settings.bounds, "The returned layout owns its bounds");
  for (const invalid of [
    { ...settings, bounds: [1, 0, 0, 1] as [number, number, number, number] },
    { ...settings, bounds: [0, 0, 1, Infinity] as [number, number, number, number] },
    { ...settings, texelsPerMeter: 0 },
    { ...settings, texelsPerMeter: NaN },
  ]) assert.throws(() => surfaceRasterLayout(invalid), /finite ordered bounds and positive density/);
});

test("color decodes source texels before interpolation and composites the material factor once", async () => {
  const source = rgba(2, 1, [0, 0, 0, 51, 255, 255, 255, 153]);
  const sourceMaterial = material({ texture: "color.png", color: "#4080c0" });
  const originals = structuredClone({ source, sourceMaterial });
  const receiver = chart(() => ({ height: 0,
    layers: [{ material: "coat", weight: 1, uv: [0.5, 0.5], tint: [0.5, 0.25, 1] }] }));
  const result = await rasterizeSurface(receiver, SETTINGS,
    new Map([["coat", sourceMaterial]]), new Map([["color.png", source]]));
  // Linear factors for sRGB 64/128/192 are approximately .05127/.21586/.52712.
  // Half black/white, then tint and those factors, encodes to 30/46/140.
  assert.deepEqual(pixel(result.layers[0].color, 2, 2), [30, 46, 140, 102]);
  assert.deepEqual(pixel(result.layers[0].metallicRoughness, 2, 2), [255, 204, 64, 255]);
  assert.equal(result.layers[0].normal, undefined, "Color-only baking does not invent a normal map");
  assert.deepEqual({ source, sourceMaterial }, originals, "Source images and material factors remain caller-owned");
});

test("repair tint above one brightens a colored source before output clipping", async () => {
  const receiver = chart((u, v) => ({ height: 0,
    layers: [{ material: "coat", weight: 1, uv: [u, v], tint: [1.13, 1.13, 1.13] }] }));
  const { layers } = await rasterizeSurface(receiver, SETTINGS,
    new Map([["coat", material({ color: "#808080" })]]), new Map());
  assert.deepEqual(pixel(layers[0].color, 2, 2), [135, 135, 135, 255],
    "Linear 0.21586 × 1.13 remains below one and encodes brighter than the original sRGB 128");
});

test("appearance tint composes once in raster coordinates after the source layer", async () => {
  const receiver = chart((u, v) => ({ height: 0,
    layers: [{ material: "coat", weight: 1, uv: [u, v], tint: [0.5, 0.5, 0.5] }] }));
  receiver.appearanceTint = (u, v) => [0.5, u < 0.5 ? 0.5 : 1, v < 0.5 ? 1 : 0.5];
  const { layers } = await rasterizeSurface(receiver, SETTINGS, new Map([["coat", material()]]), new Map());
  assert.deepEqual(pixel(layers[0].color, 2, 2), [137, 137, 137, 255]);
  assert.deepEqual(pixel(layers[0].color, 3, 3), [137, 188, 188, 255]);
  receiver.sample = (u, v) => ({ height: 0, layers: [{ material: "coat", weight: 1, uv: [u, v],
    tint: [0.5, 0.5, 0.5], coatings: [{ material: "overlay", uv: [u, v], opacity: 1 }] }] });
  receiver.materials.push("overlay");
  const coated = await rasterizeSurface(receiver, SETTINGS,
    new Map([["coat", material()], ["overlay", material({ id: "overlay", color: "#ff0000" })]]), new Map());
  assert.deepEqual(pixel(coated.layers[0].color, 2, 2), [137, 0, 0, 255], "Pigment also modulates the finished overlay");
});

test("authored color UVs retain lower-left orientation and repeat through negative coordinates", async () => {
  const source = rgba(2, 2, [255, 0, 0, 255, 0, 255, 0, 255,
    0, 0, 255, 255, 255, 255, 0, 255]);
  const receiver = chart((u, v) => ({ height: 0, layers: [{ material: "coat", weight: 1, uv: [u + 1, v - 1] }] }));
  const { layers } = await rasterizeSurface(receiver, SETTINGS,
    new Map([["coat", material({ texture: "quadrants.png" })]]), new Map([["quadrants.png", source]]));
  assert.deepEqual(pixel(layers[0].color, 2, 2), [255, 0, 0, 255], "Upper-left world sample reads the top source row");
  assert.deepEqual(pixel(layers[0].color, 2, 3), [0, 0, 255, 255], "Lower-left world sample reads the bottom source row");
  assert.deepEqual(pixel(layers[0].color, 1, 2), [0, 255, 0, 255], "Source UV repetition continues through the left gutter");
});

test("packed MR remains linear, includes scalar factors once, and keeps layers independent", async () => {
  const receiver = chart((u, v) => ({ height: 0.04, roughness: 0.6, layers: [
    { material: "coat", weight: 1, uv: [u, v], tint: [1, 0, 0] },
    { material: "backing", weight: 0, uv: [u, v], tint: [0, 0, 1] },
  ] }));
  receiver.materials = ["coat", "backing"];
  const sources = new Map([["coat", material({ metallicRoughnessTexture: "mr.png" })],
    ["backing", material({ id: "backing", roughness: 0.2, metalness: 0.5 })]]);
  const images = new Map([["mr.png", rgba(1, 1, [17, 128, 64, 90])]]);
  const { layers } = await rasterizeSurface(receiver, SETTINGS, sources, images);
  assert.deepEqual(layers.map(layer => layer.source), ["coat", "backing"]);
  assert.deepEqual(pixel(layers[0].metallicRoughness, 2, 2), [17, 77, 16, 255]);
  assert.deepEqual(pixel(layers[1].metallicRoughness, 2, 2), [255, 153, 128, 255]);
  assert.deepEqual(pixel(layers[0].color, 2, 2), [255, 0, 0, 255]);
  assert.deepEqual(pixel(layers[1].color, 2, 2), [0, 0, 255, 255], "Zero coverage does not erase a layer's independent image");
  const withoutOverride = await rasterizeSurface(chart(), SETTINGS, sources, images);
  assert.deepEqual(pixel(withoutOverride.layers[0].metallicRoughness, 2, 2), [17, 102, 16, 255],
    "Without a chart override the authored roughness factor still applies");
  for (const [roughness, expected] of [[0, 0], [0.4, 51]]) {
    receiver.sample = (u, v) => ({ height: 0, roughness: 0.6, layers: [
      { material: "coat", weight: 1, uv: [u, v], roughness },
      { material: "backing", weight: 1, uv: [u, v] },
    ] });
    const overridden = await rasterizeSurface(receiver, SETTINGS, sources, images);
    assert.equal(pixel(overridden.layers[0].metallicRoughness, 2, 2)[1], expected,
      "Layer roughness, including zero, overrides the chart factor and multiplies the source map.");
    assert.equal(pixel(overridden.layers[1].metallicRoughness, 2, 2)[1], 153,
      "The other layer retains its chart roughness factor.");
  }
});

test("normal baking rebases rotated, mirrored, scaled and sheared source UVs", async () => {
  const sources = new Map([["coat", material({ normalTexture: "normal.png", normalScale: 0.7 })]]);
  const images = new Map([["normal.png", rgba(1, 1, [204, 153, 230, 255])]]);
  const nx = 0.6 * 0.7, ny = 0.2 * 0.7, nz = 230 / 255 * 2 - 1;
  const cases: { name: string; uv(u: number, v: number): [number, number]; expected: V3 }[] = [
    { name: "identity", uv: (u, v) => [u, v], expected: [nx, ny, nz] },
    { name: "quarter turn", uv: (u, v) => [-v, u], expected: [ny, -nx, nz] },
    { name: "reflection", uv: (u, v) => [-u, v], expected: [-nx, ny, nz] },
    { name: "unequal UV scale", uv: (u, v) => [2 * u, 0.25 * v], expected: [nx, ny, nz] },
    { name: "U shear", uv: (u, v) => [u + 0.5 * v, v], expected: [nx, ny, nz] },
    { name: "V shear", uv: (u, v) => [u, v + 0.75 * u], expected: [0.8 * nx + 0.6 * ny, -0.6 * nx + 0.8 * ny, nz] },
  ];
  for (const entry of cases) {
    const receiver = chart((u, v) => ({ height: 0, layers: [{ material: "coat", weight: 1, uv: entry.uv(u, v) }] }));
    const { layers } = await rasterizeSurface(receiver, SETTINGS, sources, images);
    assertNormal(layers[0].normal, entry.expected, entry.name);
  }
});

test("microscopic bump uses meter slopes independently of image density and height offsets", async () => {
  const sources = new Map([["coat", material()]]);
  for (const texelsPerMeter of [2, 8]) for (const offset of [0, 7]) {
    const settings = { ...SETTINGS, texelsPerMeter, bump: (u: number, v: number) => offset + 0.08 * u - 0.04 * v };
    const { layers } = await rasterizeSurface(chart(), settings, sources, new Map());
    assertNormal(layers[0].normal, [-0.08, 0.04, 1], `density=${texelsPerMeter}, offset=${offset}`);
  }
  const receiver = chart((u, v) => ({ height: 0, layers: [{ material: "coat", weight: 1, uv: [-v, u] }] }));
  const { layers } = await rasterizeSurface(receiver, { ...SETTINGS, bump: (u, v) => 0.08 * u - 0.04 * v },
    new Map([["coat", material({ normalTexture: "normal.png", normalScale: 0.7 })]]),
    new Map([["normal.png", rgba(1, 1, [204, 153, 230, 255])]]));
  const nz = 230 / 255 * 2 - 1;
  assertNormal(layers[0].normal, [0.14 - 0.08 * nz, -0.42 + 0.04 * nz, nz],
    "Bump gradients compose in receiver coordinates after source normal rotation");
});

test("padded charts sample one continuous field on both sides of a receiver boundary", async () => {
  const receiver = chart((u, v) => ({ height: 0, layers: [
    { material: "coat", weight: 1, uv: [u, v], tint: [0.2 + 0.4 * u, 0.1 + 0.2 * v, 0.3] },
  ] }));
  const sources = new Map([["coat", material()]]);
  const left = await rasterizeSurface(receiver, { ...SETTINGS, bounds: [0, 0, 0.5, 1], texelsPerMeter: 4 }, sources, new Map());
  const right = await rasterizeSurface(receiver, { ...SETTINGS, bounds: [0.5, 0, 1, 1], texelsPerMeter: 4 }, sources, new Map());
  for (const [leftColumn, rightColumn] of [[2, 0], [3, 1], [4, 2], [5, 3]]) {
    for (let row = 0; row < left.layout.height; row++) {
      assert.deepEqual(pixel(left.layers[0].color, leftColumn, row), pixel(right.layers[0].color, rightColumn, row),
        "Overlapping gutters and receiver texels must sample the same position, including both sides of the seam");
    }
  }
  assert.deepEqual(pixel(left.layers[0].color, 1, 4), [108, 116, 149, 255],
    "The left gutter samples u=-0.125 and v=0.375, rather than clamping or wrapping the baked field");
  assert.deepEqual(pixel(right.layers[0].color, 4, 4), [211, 116, 149, 255],
    "The right gutter continues to u=1.125 without borrowing pixels from the opposite edge");
});

test("invalid raster sources and inconsistent fields fail explicitly", async () => {
  for (const source of [material({ texture: "missing.png" }), material({ normalTexture: "missing.png" }),
    material({ metallicRoughnessTexture: "missing.png" })]) {
    await assert.rejects(rasterizeSurface(chart(), SETTINGS, new Map([["coat", source]]), new Map()), /Missing raster source image/);
  }
  const invalidFields: SurfaceChart["sample"][] = [
    (u, v) => ({ height: 0, layers: [{ material: "coat", weight: 1, uv: [u, v], tint: [1, NaN, 1] }] }),
    (u, v) => ({ height: 0, roughness: Infinity, layers: [{ material: "coat", weight: 1, uv: [u, v] }] }),
    (u, v) => ({ height: 0, layers: u < 0 ? [] : [{ material: "coat", weight: 1, uv: [u, v] }] }),
    (u, v) => ({ height: 0, layers: [{ material: u < 0 ? "backing" : "coat", weight: 1, uv: [u, v] }] }),
  ];
  for (const sample of invalidFields) {
    await assert.rejects(rasterizeSurface(chart(sample), SETTINGS, new Map([["coat", material()]]), new Map()),
      /Invalid raster field|stable finite raster layers/);
  }
  for (const roughness of [NaN, Infinity, -0.1, 1.1]) {
    const receiver = chart((u, v) => ({ height: 0, layers: [{ material: "coat", weight: 1, uv: [u, v], roughness }] }));
    await assert.rejects(rasterizeSurface(receiver, SETTINGS, new Map([["coat", material()]]), new Map()),
      /stable finite raster layers/);
  }
  for (const uv of [(u: number, _v: number): [number, number] => [u, 0],
    (u: number, v: number): [number, number] => [u + v * v, v]]) {
    const receiver = chart((u, v) => ({ height: 0, layers: [{ material: "coat", weight: 1, uv: uv(u, v) }] }));
    await assert.rejects(rasterizeSurface(receiver, SETTINGS,
      new Map([["coat", material({ normalTexture: "normal.png" })]]),
      new Map([["normal.png", rgba(1, 1, [128, 128, 255, 255])]])), /affine UVs for raster normals/);
  }
  await assert.rejects(rasterizeSurface(chart(), { ...SETTINGS, bump: () => NaN },
    new Map([["coat", material()]]), new Map()), /Invalid raster bump field/);
});

test("appearance coatings preserve absent and zero coverage, with linear color and MR at intermediate opacity", async () => {
  const sources = new Map([["coat", material({ color: "#ff0000", roughness: 0.8, metalness: 0.2, metallicRoughnessTexture: "base-mr.png" })],
    ["glaze", material({ id: "glaze", color: "#0000ff", roughness: 0.4, metalness: 0.8, metallicRoughnessTexture: "coat-mr.png" })]]);
  const images = new Map([["base-mr.png", rgba(1, 1, [51, 255, 255, 255])],
    ["coat-mr.png", rgba(1, 1, [204, 128, 192, 255])]]);
  const bare = await rasterizeSurface(chart(), SETTINGS, sources, images);
  const cases: { opacity?: number; color: number[]; packed: number[] }[] = [
    { color: [255, 0, 0, 255], packed: [51, 204, 51, 255] },
    { opacity: 0, color: [255, 0, 0, 255], packed: [51, 204, 51, 255] },
    { opacity: 0.5, color: [188, 0, 188, 255], packed: [128, 128, 102, 255] },
    { opacity: 1, color: [0, 0, 255, 255], packed: [204, 51, 154, 255] },
  ];
  for (const entry of cases) {
    const receiver = chart((u, v) => ({ height: 0, layers: [{ material: "coat", weight: 1, uv: [u, v],
      coatings: entry.opacity === undefined ? [] : [{ material: "glaze", uv: [u, v], opacity: entry.opacity }] }] }));
    receiver.materials.push("glaze");
    const result = await rasterizeSurface(receiver, SETTINGS, sources, images);
    assert.deepEqual(pixel(result.layers[0].color, 2, 2), entry.color, `Color opacity=${entry.opacity}`);
    assert.deepEqual(pixel(result.layers[0].metallicRoughness, 2, 2), entry.packed, `MR opacity=${entry.opacity}`);
    if (entry.opacity === undefined || entry.opacity === 0) assert.deepEqual(result.layers, bare.layers,
      "Empty stacks and zero-opacity coatings leave every output channel unchanged");
  }
});

test("coatings use their own UVs and multiply texture alpha, material opacity and authored coverage", async () => {
  const sources = new Map([["coat", material({ color: "#ff0000" })],
    ["glaze", material({ id: "glaze", texture: "alpha.png", opacity: 0.5 })]]);
  const images = new Map([["alpha.png", rgba(2, 1, [0, 0, 255, 128, 0, 255, 0, 255])]]);
  const receiver = chart(() => ({ height: 0, layers: [{ material: "coat", weight: 1, uv: [0.75, 0.5],
    coatings: [{ material: "glaze", uv: [0.25, 0.5], opacity: 0.5 }] }] }));
  receiver.materials.push("glaze");
  const translucent = await rasterizeSurface(receiver, SETTINGS, sources, images);
  assert.deepEqual(pixel(translucent.layers[0].color, 2, 2), [240, 0, 99, 255],
    "Blue's effective coverage is (128/255) × 0.5 × 0.5, independent of the base's green-source UV");
  for (const [alphaCutoff, expected] of [[0.6, [255, 0, 0, 255]], [0.4, [225, 0, 137, 255]]] as const) {
    sources.set("glaze", { ...sources.get("glaze")!, alphaCutoff });
    const masked = await rasterizeSurface(receiver, SETTINGS, sources, images);
    assert.deepEqual(pixel(masked.layers[0].color, 2, 2), expected,
      "Cutout coverage thresholds sampled alpha before the remaining opacity factors");
  }
});

test("coating order and tint compose before the final whole-layer weathering tint", async () => {
  const sources = new Map([["coat", material({ color: "#ff0000" })],
    ["green", material({ id: "green", color: "#00ff00" })], ["blue", material({ id: "blue", color: "#0000ff" })]]);
  for (const [order, expected] of [[ ["green", "blue"], [99, 137, 99, 255] ],
    [ ["blue", "green"], [99, 188, 71, 255] ]] as const) {
    const receiver = chart((u, v) => ({ height: 0, layers: [{ material: "coat", weight: 1, uv: [u, v], tint: [0.5, 1, 0.5],
      coatings: order.map(id => ({ material: id, uv: [u, v], opacity: 0.5, tint: id === "blue" ? [1, 1, 0.5] : [1, 1, 1] })) }] }));
    receiver.materials.push("green", "blue");
    const { layers } = await rasterizeSurface(receiver, SETTINGS, sources, new Map());
    assert.deepEqual(pixel(layers[0].color, 2, 2), expected,
      "Each coat tints its own source; whole-layer tint then multiplies the completed linear stack once");
  }
});

test("coating-only normals rebase in their own UV frame while color-only coats preserve base grain", async () => {
  const sources = new Map([["coat", material()],
    ["glaze", material({ id: "glaze", normalTexture: "tilt.png", normalScale: 0.5 })]]);
  const images = new Map([["tilt.png", rgba(1, 1, [230, 128, 204, 255])]]);
  const turned: V3 = [(128 / 255 * 2 - 1) * 0.5, -(230 / 255 * 2 - 1) * 0.5, 0.6];
  const turnedLength = Math.hypot(...turned);
  for (const opacity of [0, 0.5, 1]) {
    const receiver = chart((u, v) => ({ height: 0, layers: [{ material: "coat", weight: 1, uv: [u, v],
      coatings: [{ material: "glaze", uv: [-v, u], opacity }] }] }));
    receiver.materials.push("glaze");
    const { layers } = await rasterizeSurface(receiver, SETTINGS, sources, images);
    const expected = turned.map((value, axis) => value / turnedLength * opacity + (axis === 2 ? 1 - opacity : 0)) as V3;
    assertNormal(layers[0].normal, expected, `Coating opacity=${opacity}, including a base with no authored normal`);
  }
  sources.set("coat", material({ normalTexture: "tilt.png", normalScale: 0.5 }));
  sources.set("glaze", material({ id: "glaze", color: "#884422" }));
  const bare = await rasterizeSurface(chart(), SETTINGS, sources, images);
  const receiver = chart((u, v) => ({ height: 0, layers: [{ material: "coat", weight: 1, uv: [u, v],
    coatings: [{ material: "glaze", uv: [-v, u], opacity: 1 }] }] }));
  receiver.materials.push("glaze");
  const coated = await rasterizeSurface(receiver, SETTINGS, sources, images);
  assert.deepEqual(coated.layers[0].normal, bare.layers[0].normal, "A color-only overcoat leaves the underlying normal grain intact");
});

test("coatings reject invalid coverage, identities, UVs and missing images rather than silently dropping detail", async () => {
  const sources = new Map([["coat", material()], ["glaze", material({ id: "glaze" })], ["other", material({ id: "other" })]]);
  const valid: SurfaceCoating = { material: "glaze", uv: [0.25, 0.5], opacity: 0.5 };
  const invalid: SurfaceCoating[] = [
    { ...valid, opacity: -0.01 }, { ...valid, opacity: 1.01 }, { ...valid, opacity: NaN },
    { ...valid, uv: [Infinity, 0] }, { ...valid, tint: [1, NaN, 1] }, { ...valid, roughness: Infinity },
    { ...valid, material: "missing" }, { ...valid, material: "other" },
  ];
  for (const coating of invalid) {
    const receiver = chart((u, v) => ({ height: 0, layers: [{ material: "coat", weight: 1, uv: [u, v], coatings: [coating] }] }));
    receiver.materials.push("glaze");
    await assert.rejects(rasterizeSurface(receiver, SETTINGS, sources, new Map()), /Invalid raster coating|Unknown raster material/);
  }
  for (const changed of [[], [{ ...valid, material: "other" }]]) {
    const receiver = chart((u, v) => ({ height: 0, layers: [{ material: "coat", weight: 1, uv: [u, v],
      coatings: u < 0 ? changed : [valid] }] }));
    receiver.materials.push("glaze", "other");
    await assert.rejects(rasterizeSurface(receiver, SETTINGS, sources, new Map()), /stable finite raster layers|Invalid raster coating/);
  }
  for (const companion of ["texture", "normalTexture", "metallicRoughnessTexture"] as const) {
    sources.set("glaze", material({ id: "glaze", [companion]: "missing.png" }));
    const receiver = chart((u, v) => ({ height: 0, layers: [{ material: "coat", weight: 1, uv: [u, v], coatings: [valid] }] }));
    receiver.materials.push("glaze");
    await assert.rejects(rasterizeSurface(receiver, SETTINGS, sources, new Map()), /Missing raster source image/);
  }
  sources.set("glaze", material({ id: "glaze", normalTexture: "normal.png" }));
  const receiver = chart((u, v) => ({ height: 0, layers: [{ material: "coat", weight: 1, uv: [u, v],
    coatings: [{ ...valid, uv: [u + v * v, v] }] }] }));
  receiver.materials.push("glaze");
  await assert.rejects(rasterizeSurface(receiver, SETTINGS, sources,
    new Map([["normal.png", rgba(1, 1, [128, 128, 255, 255])]])), /affine UVs for raster normals/);
});


test("byte color sampling preserves sRGB transfer across the full byte range while alpha stays linear", async () => {
  const data: number[] = [];
  for (let value = 0; value < 256; value++) data.push(value, value, value, value);
  const image = rgba(256, 1, data);
  const receiver = chart((u, v) => ({ height: 0, layers: [{ material: "coat", weight: 1, uv: [u, .5], tint: [.37, .37, .37] }] }));
  const { layers } = await rasterizeSurface(receiver, { ...SETTINGS, texelsPerMeter: 256, bounds: [0, 0, 1, 1 / 256] },
    new Map([["coat", material({ texture: "ramp" })]]), new Map([["ramp", image]]));
  for (let value = 0; value < 256; value++) {
    const encoded = value / 255;
    const decoded = encoded <= .04045 ? encoded / 12.92 : Math.pow((encoded + .055) / 1.055, 2.4);
    const tinted = decoded * .37;
    const expected = Math.round(255 * (tinted <= .0031308 ? tinted * 12.92 : 1.055 * Math.pow(tinted, 1 / 2.4) - .055));
    assert.deepEqual(pixel(layers[0].color, value + 2, 2), [expected, expected, expected, value]);
  }
});

test("shared raster rows retain nonlinear color and bump across halos, rows and reused callback objects", async () => {
  const sources = new Map([["coat", material()]]);
  for (const bias of [0, .17]) {
    const shared = { height: 0, bump: 0, layers: [{ material: "coat", weight: 1, uv: [0, 0] as [number, number], tint: [1, 1, 1] as V3 }] };
    const sample = (u: number, v: number) => {
      shared.bump = .03 * u * u + .02 * u * v + .01 * v * v + bias;
      shared.layers[0].tint[0] = .3 + .07 * u + bias;
      shared.layers[0].tint[1] = .4 + .04 * v;
      shared.layers[0].tint[2] = .5;
      shared.layers[0].uv[0] = u; shared.layers[0].uv[1] = v;
      return shared;
    };
    const receiver = chart(sample);
    receiver.sampleRow = function* (us, v) { for (const u of us) yield sample(u, v); };
    const settings: SurfaceRasterSettings = { group: "row", bounds: [-.7, -.4, 1.1, .9], texelsPerMeter: 5, bump: "sample" };
    const { layout, layers } = await rasterizeSurface(receiver, settings, sources, new Map());
    const du = 1.8 / (layout.width - 4), dv = 1.3 / (layout.height - 4);
    for (const row of [0, 1, layout.height - 2, layout.height - 1]) for (const column of [0, 2, layout.width - 1]) {
      const u = -.7 + (column - 1.5) * du, v = .9 - (row - 1.5) * dv;
      const normal = [-.06 * u - .02 * v, -.02 * u - .02 * v, 1];
      const length = Math.hypot(...normal), actual = pixel(layers[0].normal!, column, row);
      assert.deepEqual(actual, [...normal.map(value => Math.round((value / length * .5 + .5) * 255)), 255]);
      const tint = [.3 + .07 * u + bias, .4 + .04 * v, .5];
      const expected = tint.map(value => Math.round((1.055 * value ** (1 / 2.4) - .055) * 255));
      assert.deepEqual(pixel(layers[0].color, column, row), [...expected, 255]);
    }
  }
});

test("shared rows snapshot nested source and coating UVs and tints before callbacks reuse them", async () => {
  const source = rgba(2, 2, [255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 255, 255]);
  const materials = new Map([["coat", material({ texture: "grid" })], ["overlay", material({ id: "overlay", texture: "grid" })]]);
  const images = new Map([["grid", source]]);
  const settings: SurfaceRasterSettings = { ...SETTINGS, texelsPerMeter: 5, bump: "sample" };
  const allocated = (u: number, v: number) => ({ height: 0, bump: .01 * u * v, layers: [{ material: "coat", weight: 1,
    uv: [u * .7, v * .6] as [number, number], tint: [.6 + u * .1, .8, .9] as V3,
    coatings: [{ material: "overlay", uv: [v * .4, u * .5] as [number, number], opacity: .2 + u * .1, tint: [.7, .8 + v * .1, .9] as V3 }] }] });
  const fresh = chart(allocated); fresh.materials.push("overlay");
  const expected = await rasterizeSurface(fresh, settings, materials, images);
  const scratch = allocated(0, 0);
  const reused = chart((u, v) => {
    const value = allocated(u, v);
    scratch.bump = value.bump;
    const layer = scratch.layers[0], next = value.layers[0];
    for (let i = 0; i < 2; i++) { layer.uv[i] = next.uv[i]; layer.coatings[0].uv[i] = next.coatings[0].uv[i]; }
    for (let i = 0; i < 3; i++) { layer.tint[i] = next.tint[i]; layer.coatings[0].tint[i] = next.coatings[0].tint[i]; }
    layer.coatings[0].opacity = next.coatings[0].opacity;
    return scratch;
  });
  reused.materials.push("overlay");
  reused.sampleRow = function* (us, v) { for (const u of us) yield reused.sample(u, v); };
  const actual = await rasterizeSurface(reused, settings, materials, images);
  assert.deepEqual(actual.layers, expected.layers);
});

test("shared rows clear omitted tint and roughness overrides when storage is reused", async () => {
  const sources = new Map([["coat", material({ roughness: .8, metalness: .2 })],
    ["overlay", material({ id: "overlay", roughness: .9, metalness: .6 })]]);
  const settings: SurfaceRasterSettings = { ...SETTINGS, texelsPerMeter: 8, bump: "sample" };
  const sample: SurfaceChart["sample"] = (u, v) => {
    const phase = ((Math.floor((1 - v) * 8) % 4) + 4) % 4;
    return { height: 0, bump: .03 * u * u + .02 * u * v + .01 * v * v,
      ...(phase === 0 ? { roughness: .2 } : phase === 2 ? { roughness: .3 } : {}),
      layers: [{ material: "coat", weight: 1, uv: [u, v],
        ...(phase === 0 ? { roughness: .4, tint: [.5, .25, 1] as V3 }
          : phase === 2 ? { tint: [1, .5, .25] as V3 } : phase === 3 ? { roughness: .7 } : {}),
        coatings: [{ material: "overlay", uv: [u, v], opacity: [.5, .5, .25, 0][phase],
          ...(phase === 0 ? { roughness: .6, tint: [1, .5, .25] as V3 }
            : phase === 2 ? { tint: [.5, 1, 1] as V3 } : phase === 3 ? { roughness: .1 } : {}) }],
      }] };
  };
  const linearColors = [[.5, .1875, .625], [1, 1, 1], [.875, .5, .25], [1, 1, 1]];
  const roughness = [.5, .85, .45, .7], metallic = [.4, .4, .3, .2];
  for (const rowCallback of [false, true]) {
    const receiver = chart(sample);
    receiver.materials.push("overlay");
    if (rowCallback) receiver.sampleRow = function* (us, v) { for (const u of us) yield sample(u, v); };
    const { layout, layers } = await rasterizeSurface(receiver, settings, sources, new Map());
    for (let row = 0; row < layout.height; row++) {
      const phase = ((row - 2) % 4 + 4) % 4;
      const expectedColor = linearColors[phase].map(value => Math.round(255 * (1.055 * value ** (1 / 2.4) - .055)));
      for (const column of [0, 6, layout.width - 1]) {
        assert.deepEqual(pixel(layers[0].color, column, row), [...expectedColor, 255]);
        assert.deepEqual(pixel(layers[0].metallicRoughness, column, row),
          [255, Math.round(roughness[phase] * 255), Math.round(metallic[phase] * 255), 255]);
        const u = (column - 1.5) / 8, v = 1 - (row - 1.5) / 8;
        const normal = [-.06 * u - .02 * v, -.02 * u - .02 * v, 1], length = Math.hypot(...normal);
        assert.deepEqual(pixel(layers[0].normal!, column, row),
          [...normal.map(value => Math.round((value / length * .5 + .5) * 255)), 255]);
      }
    }
  }
});
