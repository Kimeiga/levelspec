import { test } from "node:test";
import assert from "node:assert/strict";
import { Matrix4, Vector3 } from "three";
import { AmlError, collisionMesh, compile, parseAml, resolveExportAssets, toGLB } from "levelspec";
import type { V3 } from "../src/architecture/types.ts";
import { KitSurfaces, type SurfaceDeposit } from "../src/dressing/kit-surfaces.ts";
import { KitMesh } from "../src/dressing/kit-mesh.ts";
import { kitFinishes, kitMaterials } from "../src/dressing/kit.ts";
import { WallCondition } from "../src/dressing/finish/wall-condition.ts";
import { facadeMaterial, type FacadeMaterialSettings } from "../src/dressing/kowloon/facade-material.ts";
import { drawSkin, type Skin } from "../src/dressing/kowloon/skin.ts";
import { Pen } from "../src/dressing/pen.ts";
import { compileSurfaceAppearance } from "../src/dressing/surface/compile.ts";
import { decodeSurfaceImage, encodeSurfaceImage, type SurfaceImage } from "../src/dressing/surface/images.ts";
import type { SurfaceMaterialRecipe } from "../src/dressing/surface/material.ts";
import { registerSurfaceChart, takeSurfaceCharts } from "../src/dressing/surface/plans.ts";
import type { SurfaceChart, SurfaceSample } from "../src/dressing/surface/types.ts";
import { WALL_TILE_BED, WALL_TILE_GRIME } from "../src/dressing/wall-materials.ts";

type Level = Awaited<ReturnType<typeof compile>>;
const normal = encodeSurfaceImage({ width: 1, height: 1, data: new Uint8Array([128, 204, 230, 255]) });
const source = `<architecture version="1" id="reusable-finish">
  <material id="white" color="#ffffff" roughness="0.7"/>
  <material id="red" color="#ff0000" roughness="0.2" normal-texture="normal.png"/>
  <material id="green" color="#00ff00" roughness="0.6" normal-texture="normal.png"/>
  <material id="blue" color="#0000ff" roughness="0.8" normal-texture="normal.png"/>
  <profile id="outline" points="-1 -1; 3 -1; 3 2; -1 2"><hole points="0 0; 0 1; 1 1; 1 0"/></profile>
  <slab id="floor" profile="outline" thickness="0.2" material="white"/>
  <box id="wall" position="6 0 0" width="4" depth="0.2" height="3" material="white"/>
</architecture>`;

/** One fixed two-layer material exercises intrinsic tint, ordered coatings and source normal maps. */
function recipe(): SurfaceMaterialRecipe {
  return { key: "numeric-finish/v1", bounds: [-.25, -.5, .75, .5], texelsPerMeter: 4,
    materials: ["red", "green", "blue"], sample: (u, v) => ({ height: 0, layers: [
      { material: "red", weight: 1, uv: [u, v], tint: [.5, 1, 1],
        coatings: [{ material: "green", opacity: .5, uv: [u, v], tint: [1, .5, 1] }] },
      { material: "blue", weight: 3, uv: [u, v] },
    ] }) };
}

/** Expanded geometry ignores the harmless vertex duplication required by material bindings. */
function geometry(level: Level) {
  return level.mesh.surfaces.map((surface, triangle) => ({ object: level.surfaces[surface].object,
    solid: level.mesh.solidIds?.[triangle], corners: level.mesh.indices.slice(triangle * 3, triangle * 3 + 3).map(vertex => ({
      position: level.mesh.positions.slice(vertex * 3, vertex * 3 + 3), normal: level.mesh.normals.slice(vertex * 3, vertex * 3 + 3),
    })) }));
}

/** Creates source-owned receivers in different planes; one uses reflected U and one has a real hole. */
function charts(level: Level, material: SurfaceMaterialRecipe, tinted = true): SurfaceChart[] {
  return (["floor", "wall"] as const).map<SurfaceChart>(host => {
    const axis = host === "floor" ? 2 : 1, direction = host === "floor" ? 1 : -1;
    const triangles = level.mesh.surfaces.flatMap((surface, triangle) => level.surfaces[surface].object === host
      && level.mesh.normals[level.mesh.indices[triangle * 3] * 3 + axis] * direction > .99 ? [triangle] : []);
    assert.ok(triangles.length >= 2);
    return { id: `${host}/finish`, host, firstTriangle: triangles[0], triangleCount: triangles.length, triangleIndices: triangles,
      frame: host === "floor" ? { origin: [0, 0, 0], u: [1, 0, 0], v: [0, 1, 0], normal: [0, 0, 1] }
        : { origin: [6, 0, 0], u: [-1, 0, 0], v: [0, 0, 1], normal: [0, -1, 0] },
      bounds: host === "floor" ? [-1, -1, 3, 2] : [-4, 0, 0, 3], materials: ["white"],
      raster: { geometry: "preserve", group: host, bounds: host === "floor" ? [-1, -1, 3, 2] : [-4, 0, 0, 3], texelsPerMeter: 4 },
      sample: (u, v) => ({ height: 0, layers: [{ material: "white", weight: 1, uv: [u, v] }] }),
      appearanceTint: () => [.01, .02, .03],
      reusableMaterial: { recipe: material, tint: tinted ? (u, v): V3 => host === "floor"
        ? [1.25 + u * .01, .5, .75 + v * .01] : [.25, 1.5 + v * .01, .5 + u * .01] : undefined },
    };
  });
}

/** Reads the material and maps used by actual receiving triangles rather than inspecting recipe key strings. */
function binding(level: Level, chart: SurfaceChart) {
  const ids = new Set(chart.triangleIndices!.map(triangle => level.surfaces[level.mesh.surfaces[triangle]].material));
  assert.equal(ids.size, 1);
  const material = level.document.materials.find(value => value.id === [...ids][0])!;
  assert.ok(material?.texture && material.metallicRoughnessTexture);
  const image = (reference: string): SurfaceImage => {
    const asset = level.generatedImages?.[reference];
    assert.ok(asset, "A bound generated material must publish every referenced image");
    return decodeSurfaceImage(asset.bytes);
  };
  return { material, color: image(material.texture), packed: image(material.metallicRoughnessTexture),
    normal: material.normalTexture ? image(material.normalTexture) : undefined };
}

/** Provides only the declared source normal image; generated image lookup stays compiler-owned. */
async function resolveImage(reference: string) {
  assert.equal(reference, "normal.png");
  return normal;
}

test("finished material recipes share maps across meter frames while retaining geometry, unwrapped UVs and local tint", async () => {
  const results: Level[] = [];
  for (const reverse of [false, true]) {
    const level = await compile(parseAml(source), { navigation: false });
    const before = geometry(level), collision = collisionMesh(level, true), physicalHash = level.physicalHash;
    const material = recipe(), recipeInputs = structuredClone({ bounds: material.bounds, materials: material.materials });
    const receivers = charts(level, material);
    for (const chart of reverse ? [...receivers].reverse() : receivers) registerSurfaceChart(level, chart);
    await compileSurfaceAppearance(level, { resolveMaterialImage: resolveImage, appearance: { maximumTexels: 48 },
      rasterExecutor: async function* (jobs, bake) {
        assert.equal(jobs.length, 1, "Two different source hosts bake one finished material");
        yield await bake(jobs[0].index);
      } }, level.mesh.indices.length / 3);
    assert.deepEqual(level.diagnostics, []);
    assert.deepEqual(geometry(level), before, "The existing hole and every source triangle remain unchanged");
    assert.deepEqual(collisionMesh(level, true), collision);
    assert.equal(level.physicalHash, physicalHash);
    assert.deepEqual({ bounds: material.bounds, materials: material.materials }, recipeInputs);
    assert.equal(level.surfaceAppearance!.texels, 48, "One unpadded 4×4 color/roughness/normal set is charged once");
    const first = binding(level, receivers[0]);
    assert.equal(binding(level, receivers[1]).material.id, first.material.id);
    for (const image of [first.color, first.packed, first.normal!]) assert.deepEqual([image.width, image.height], [4, 4]);
    // Weighted linear RGB is (.0625, .0625, .75); roughness is .25*.4 + .75*.8.
    assert.deepEqual([...first.color.data.slice(0, 4)], [71, 71, 225, 255]);
    assert.equal(first.packed.data[1], 179);
    for (let axis = 0; axis < 3; axis++) assert.ok(Math.abs(first.normal!.data[axis] - [128, 204, 230][axis]) <= 1);
    for (const chart of receivers) {
      const vertices = new Set(chart.triangleIndices!.flatMap(triangle => level.mesh.indices.slice(triangle * 3, triangle * 3 + 3)));
      let outsideUnitSquare = false;
      for (const vertex of vertices) {
        const point = level.mesh.positions.slice(vertex * 3, vertex * 3 + 3);
        const coordinate = (axis: V3) => axis.reduce((sum, value, index) => sum + value * (point[index] - chart.frame.origin[index]), 0);
        const u = coordinate(chart.frame.u), v = coordinate(chart.frame.v);
        assert.deepEqual(level.mesh.uv.slice(vertex * 2, vertex * 2 + 2), [u + .25, v + .5],
          "UVs cross whole periods without modulo or per-receiver stretching");
        outsideUnitSquare ||= u + .25 < 0 || u + .25 > 1 || v + .5 < 0 || v + .5 > 1;
        assert.deepEqual(level.mesh.colors!.slice(vertex * 3, vertex * 3 + 3), chart.reusableMaterial!.tint!(u, v),
          "Only the common placement tint belongs in vertex RGB, including values above one");
      }
      assert.ok(outsideUnitSquare);
    }
    const bytes = Buffer.from(toGLB(level, { assets: await resolveExportAssets(level, resolveImage) }));
    const gltf = JSON.parse(bytes.toString("utf8", 20, 20 + bytes.readUInt32LE(12)));
    assert.ok(gltf.samplers.every((sampler: { wrapS: number; wrapT: number }) => sampler.wrapS === 10497 && sampler.wrapT === 10497));
    assert.ok(gltf.meshes.some((mesh: { primitives: { attributes: Record<string, number> }[] }) =>
      mesh.primitives.some(primitive => primitive.attributes.COLOR_0 !== undefined && primitive.attributes.TEXCOORD_0 !== undefined)));
    results.push(level);
  }
  assert.deepEqual(results[1].surfaceAppearance!.generatedHashes, results[0].surfaceAppearance!.generatedHashes,
    "The first registered receiver cannot bake its placement tint into the shared material");
  assert.deepEqual(results[1].mesh.colors, results[0].mesh.colors);
});

test("repeat materials retain periodic bump derivatives at unpadded pixel centers and halos", async () => {
  const level = await compile(parseAml(source), { navigation: false });
  const material: SurfaceMaterialRecipe = { key: "periodic-bump/v1", bounds: [0, 0, 1, 1], texelsPerMeter: 4,
    materials: ["white"], bump: "sample", sample: (u, v) => ({ height: 0,
      bump: .02 * Math.sin(2 * Math.PI * u) + .01 * Math.cos(2 * Math.PI * v),
      layers: [{ material: "white", weight: 1, uv: [u, v] }] }) };
  const [chart] = charts(level, material, false);
  registerSurfaceChart(level, chart);
  await compileSurfaceAppearance(level, {}, 100);
  const image = binding(level, chart).normal!;
  assert.deepEqual([image.width, image.height], [4, 4]);
  for (let row = 0; row < 4; row++) for (let column = 0; column < 4; column++) {
    const u = (column + .5) / 4, v = 1 - (row + .5) / 4;
    const dx = .08 * Math.cos(2 * Math.PI * u), dy = -.04 * Math.sin(2 * Math.PI * v);
    const length = Math.hypot(dx, dy, 1);
    const expected = [-dx / length, -dy / length, 1 / length].map(value => Math.round((value * .5 + .5) * 255));
    const offset = (row * 4 + column) * 4;
    for (let axis = 0; axis < 3; axis++) assert.ok(Math.abs(image.data[offset + axis] - expected[axis]) <= 1,
      "Normal derivatives use physical meter steps across both repeat seams");
  }
});

test("reusable material validation and late tint errors remain source-linked and atomic", async () => {
  for (const failure of ["original-height", "geometric-field", "original-plate", "original-height-map", "recipe-height", "recipe-height-map", "bounds", "signature", "tint", "budget", "chart-budget"] as const) {
    const level = await compile(parseAml(source), { navigation: false });
    const material = recipe(), receivers = charts(level, material);
    if (failure === "original-height") receivers[0].sample = (u, v) => ({ height: .01, layers: [{ material: "white", weight: 1, uv: [u, v] }] });
    if (failure === "geometric-field") {
      receivers[0].raster = undefined;
      receivers[0].sample = (u, v) => ({ height: .01 * (u - 1) ** 2, layers: [{ material: "white", weight: 1, uv: [u, v] }] });
      assert.equal(receivers[0].sample(1, .5).height, 0);
      assert.ok(receivers[0].sample(0, .5).height > 0, "Zero height at the center does not authorize discarding a geometric field");
    }
    if (failure === "original-plate") receivers[0].layerElevations = [0];
    if (failure === "original-height-map") level.document.materials.find(value => value.id === "white")!.heightTexture = "height.png";
    if (failure === "recipe-height") {
      const sample = material.sample;
      material.sample = (u, v) => ({ ...sample(u, v), height: .01 });
    }
    if (failure === "recipe-height-map") level.document.materials.find(value => value.id === "red")!.heightTexture = "height.png";
    if (failure === "bounds") material.bounds = [0, 0, NaN, 1];
    if (failure === "signature") receivers[1].reusableMaterial = { recipe: { ...material, texelsPerMeter: 8 } };
    if (failure === "tint") receivers[1].reusableMaterial!.tint = u => u < -1 ? [NaN, 1, 1] : [1, 1, 1];
    if (failure === "chart-budget") for (const receiver of receivers)
      receiver.sample = () => { throw new Error("An over-budget receiver set must not begin material selection"); };
    const before = structuredClone({ mesh: level.mesh, surfaces: level.surfaces, document: level.document });
    for (const chart of receivers) registerSurfaceChart(level, chart);
    await assert.rejects(compileSurfaceAppearance(level, { resolveMaterialImage: resolveImage,
      appearance: failure === "budget" ? { maximumTexels: 47 } : failure === "chart-budget" ? { maximumCharts: 1 } : undefined }, 100), error => {
      assert.ok(error instanceof AmlError);
      const expected = failure === "tint" ? /tint/i : failure === "signature" ? /incompatible|recipe/i
        : failure === "budget" || failure === "chart-budget" ? /budget/i : failure === "bounds" ? /bounds|finite|ordered/i : /height|displac|elevation/i;
      assert.match(error.message, expected, `The ${failure} case must fail for its intended contract`);
      assert.ok(error.diagnostics.some(diagnostic => diagnostic.source && diagnostic.review?.bounds));
      if (failure === "tint") assert.ok(error.diagnostics.some(diagnostic => diagnostic.objects?.includes("wall")),
        "A late placement callback failure identifies its actual receiver");
      return true;
    });
    assert.deepEqual({ mesh: level.mesh, surfaces: level.surfaces, document: level.document }, before);
    assert.equal(level.generatedImages, undefined);
    assert.equal(level.surfaceAppearance, undefined);
    for (const source of level.document.materials) delete source.heightTexture;
    for (const chart of charts(level, recipe())) registerSurfaceChart(level, chart);
    await compileSurfaceAppearance(level, { resolveMaterialImage: resolveImage }, 100);
    assert.equal(level.surfaceAppearance!.texels, 48, "Failed reusable material state cannot poison the next compile");
  }
});

test("reusable material selection yields to cancellation before later receivers and can recover", async context => {
  const level = await compile(parseAml(source), { navigation: false });
  const receivers = charts(level, recipe()), original = receivers[0].sample;
  const before = structuredClone({ mesh: level.mesh, surfaces: level.surfaces, document: level.document });
  const controller = new AbortController();
  let now = 0, reads = 0, cancellation: ReturnType<typeof setImmediate> | undefined;
  const clock = context.mock.method(performance, "now", () => now);
  receivers[0].sample = (u, v) => {
    now += 20;
    cancellation = setImmediate(() => controller.abort());
    return original(u, v);
  };
  receivers[1].sample = () => { throw new Error("Cancelled material selection reached another receiver"); };
  for (const chart of receivers) registerSurfaceChart(level, chart);
  try {
    await assert.rejects(compileSurfaceAppearance(level, { signal: controller.signal,
      resolveMaterialImage: async reference => { reads++; return resolveImage(reference); } }, 100), { name: "AbortError" });
  } finally {
    clearImmediate(cancellation);
    clock.mock.restore();
  }
  assert.notEqual(cancellation, undefined);
  assert.equal(reads, 0);
  assert.deepEqual({ mesh: level.mesh, surfaces: level.surfaces, document: level.document }, before);
  assert.equal(level.generatedImages, undefined);
  assert.equal(level.surfaceAppearance, undefined);
  for (const chart of charts(level, recipe())) registerSurfaceChart(level, chart);
  await compileSurfaceAppearance(level, { resolveMaterialImage: resolveImage }, 100);
  assert.deepEqual(level.diagnostics, []);
  assert.equal(level.surfaceAppearance!.texels, 48);
});

/** Small coalescing facade panels share one fallback extent, with a later-panel-only deposit. */
async function deposited(order: "none" | "before" | "between" | "after" | "offset", reusable: boolean) {
  const level = await compile(parseAml(`<architecture version="1" id="reusable-deposit">
    <material id="white" color="#ffffff" roughness="0.7"/><group id="wall">
    <box id="early" width="0.2" depth="0.1" height="1" material="white"/>
    <box id="late" position="0.3 0 0" width="0.2" depth="0.1" height="1" material="white"/></group>
  </architecture>`), { navigation: false });
  const before = geometry(level), collision = collisionMesh(level, true);
  const manager = new KitSurfaces(level);
  const frame: SurfaceChart["frame"] = { origin: [0, 0, 0], u: [1, 0, 0], v: [0, 0, 1], normal: [0, -1, 0] };
  const deposit: SurfaceDeposit = { frame: order === "offset" ? { ...frame, origin: [0, .04, 0] } : frame,
    bounds: [.32, .05, .48, .95], sample: () => ({ strength: 1, tint: [.25, .5, .75], roughness: 1 }) };
  const material: SurfaceMaterialRecipe = { key: "shared-gray/v1", bounds: [0, 0, 1, 1], texelsPerMeter: 4, materials: ["white"],
    sample: (u, v) => ({ height: 0, layers: [{ material: "white", weight: 1, uv: [u, v], tint: [.5, .5, .5] }] }) };
  if (order === "before") manager.deposit(deposit);
  const receivers: SurfaceChart[] = [];
  for (const [id, left] of [["early", 0], ["late", .3]] as const) {
    const triangles = level.mesh.surfaces.flatMap((surface, triangle) => level.surfaces[surface].object === id
      && level.mesh.normals[level.mesh.indices[triangle * 3] * 3 + 1] < -.99 ? [triangle] : []);
    assert.equal(triangles.length, 2);
    const chart: SurfaceChart = { id, host: "wall", firstTriangle: triangles[0], triangleCount: 2, triangleIndices: triangles,
      mergeGroup: "continuous-facade", frame, bounds: [left, 0, left + .2, 1], materials: ["white"],
      raster: { geometry: "preserve", group: "original-facade", bounds: [0, 0, .5, 1], texelsPerMeter: 8 },
      sample: (u, v) => ({ height: 0, roughness: .7, depositRetention: v > .5 ? 0 : 1,
        layers: [{ material: "white", weight: 1, uv: [u, v], tint: [.5, .5, .5] }] }),
      reusableMaterial: reusable ? { recipe: material, tint: () => [.2, .3, .4] } : undefined };
    receivers.push(chart);
    manager.receive(chart);
    if (id === "early" && order === "between") manager.deposit(deposit);
  }
  if (order === "after" || order === "offset") manager.deposit(deposit);
  await compileSurfaceAppearance(level, {}, 100);
  assert.deepEqual(level.diagnostics, []);
  assert.deepEqual(geometry(level), before);
  assert.deepEqual(collisionMesh(level, true), collision);
  assert.equal(binding(level, receivers[0]).material.id, binding(level, receivers[1]).material.id);
  return { level, image: binding(level, receivers[1]) };
}

test("local deposits select the original shared raster after registration and preserve exact tint, roughness and retention", async () => {
  const clean = await deposited("none", true), offset = await deposited("offset", true);
  assert.deepEqual([clean.image.color.width, clean.image.color.height], [4, 4]);
  assert.deepEqual(offset.level.surfaceAppearance, clean.level.surfaceAppearance, "A deposit on another plane does not disable material reuse");
  const unmarked = await deposited("none", false);
  for (const order of ["before", "between", "after"] as const) {
    const original = await deposited(order, false), selected = await deposited(order, true);
    assert.deepEqual([selected.image.color.width, selected.image.color.height], [8, 12]);
    assert.deepEqual(selected.image.color, original.image.color, "Every registration order retains the original per-pixel footprint");
    assert.deepEqual(selected.image.packed, original.image.packed, "Local roughness remains per-pixel on the fallback path");
    assert.deepEqual(selected.level.mesh, original.level.mesh, "An unselected reusable tint cannot leak into fallback vertices");
    const pixel = (image: SurfaceImage, column: number, row: number) => [...image.data.slice((row * image.width + column) * 4, (row * image.width + column + 1) * 4)];
    assert.notDeepEqual(pixel(selected.image.color, 5, 7), pixel(unmarked.image.color, 5, 7), "The selected fallback contains an actual deposit");
    assert.equal(selected.image.packed.data[(7 * 8 + 5) * 4 + 1], 255);
    assert.deepEqual(pixel(selected.image.color, 5, 4), pixel(unmarked.image.color, 5, 4), "Fresh upper repair retention removes old pigment");
    assert.deepEqual(pixel(selected.image.packed, 5, 4), pixel(unmarked.image.packed, 5, 4), "Fresh upper repair retention also removes old roughness");
  }
});

/** Samples an independent periodic virtual texture so seam checks include the source UVs, not only tint. */
function virtualSurface(sample: SurfaceSample): number[] {
  let total = 0;
  const color = [0, 0, 0];
  for (const layer of sample.layers) {
    assert.ok(Number.isFinite(layer.weight) && layer.weight >= 0);
    const pigment = [(1 + Math.cos(2 * Math.PI * layer.uv[0])) / 2,
      (1 + Math.sin(2 * Math.PI * layer.uv[1])) / 2, .5];
    for (let axis = 0; axis < 3; axis++) color[axis] += pigment[axis] * (layer.tint?.[axis] ?? 1) * layer.weight;
    total += layer.weight;
  }
  assert.ok(Math.abs(total - 1) < 1e-10);
  assert.equal(sample.height, 0);
  const result = [...color.map(value => value / total), sample.bump!, sample.roughness!];
  assert.ok(result.every(Number.isFinite));
  return result;
}

test("facade recipes close periodic seams with affine source UVs and isolate intrinsic style settings", () => {
  const settings: FacadeMaterialSettings = { concrete: false, coat: { material: "red", repeat: 1.3, tint: [1, 1, 1] },
    backing: { material: "blue", repeat: 2.7 }, wear: .4, density: 8, variant: 1 };
  const before = structuredClone(settings), material = facadeMaterial(settings);
  const width = material.bounds[2] - material.bounds[0], height = material.bounds[3] - material.bounds[1];
  for (const along of [0, .23, .71, 1]) {
    for (const [a, b] of [[[0, height * along], [width, height * along]], [[width * along, 0], [width * along, height]]]) {
      const expected = virtualSurface(material.sample(a[0], a[1])), actual = virtualSurface(material.sample(b[0], b[1]));
      actual.forEach((value, axis) => assert.ok(Math.abs(value - expected[axis]) < 1e-8,
        "The canonical boundary closes source texture composition, intrinsic color and bump"));
    }
  }
  for (const u of [-width - .17, -.000001, .23, width + .000001])
    assert.ok(Math.abs(material.sample(u, .47).bump! - material.sample(u + width, .47).bump!) < 1e-10,
      "The normal derivative halo repeats beyond the canonical rectangle");
  const left = material.sample(0, .37), right = material.sample(width, .37);
  for (let index = 0; index < left.layers.length; index++) {
    const repeat = left.layers[index].material === settings.coat.material ? settings.coat.repeat : settings.backing.repeat;
    assert.ok(Math.abs(right.layers[index].uv[0] - left.layers[index].uv[0] - width * repeat) < 1e-12,
      "Each source layer retains affine UVs and its authored physical repeat through the boundary");
  }
  const first = material.sample(.21, .37), retained = structuredClone(first);
  material.sample(.8, .9);
  assert.deepEqual(first, retained);
  first.layers[0].uv[0] = 99;
  first.layers[0].tint![0] = 99;
  assert.deepEqual(material.sample(.21, .37), retained);
  assert.deepEqual(settings, before);
  assert.equal(facadeMaterial(structuredClone(settings)).key, material.key);
  const differences: Partial<FacadeMaterialSettings>[] = [
    { concrete: true }, { wear: .6 }, { density: 16 }, { variant: 0 },
    { coat: { ...settings.coat, tint: [.2, .4, .6] } },
    { coat: { ...settings.coat, repeat: 1.7 } }, { backing: { ...settings.backing, material: "other" } },
  ];
  for (const difference of differences) assert.notEqual(facadeMaterial({ ...settings, ...difference }).key, material.key,
    "A different intrinsic program cannot claim the same finished-material identity");
  const pigment: V3 = [.2, .4, .6];
  const colored = facadeMaterial({ ...settings, coat: { ...settings.coat, tint: pigment } });
  for (const [u, v] of [[0, 0], [.21, .37], [.8, .9]]) {
    const neutral = material.sample(u, v), tinted = colored.sample(u, v);
    assert.ok(neutral.layers.some(layer => layer.material === settings.coat.material));
    assert.ok(neutral.layers.some(layer => layer.material === settings.backing.material));
    for (let index = 0; index < neutral.layers.length; index++) {
      const layer = neutral.layers[index], actual = tinted.layers[index];
      if (layer.material === settings.backing.material) {
        assert.deepEqual(actual, layer, "Coat pigment cannot recolor exposed backing");
      } else {
        assert.deepEqual(actual, { ...layer, tint: layer.tint!.map((value, axis) => value * pigment[axis]) });
      }
    }
    assert.equal(tinted.bump, neutral.bump);
    assert.equal(tinted.roughness, neutral.roughness);
  }
});

test("drawSkin preserves marked coat pigments while sharing each finish across matching panels", async () => {
  const level = await compile(parseAml(source), { navigation: false });
  kitMaterials(level);
  level.mesh.colors = Array(level.mesh.positions.length).fill(1);
  const lower: V3 = [.2, .4, .6], upper: V3 = [.8, .6, .3];
  /** Uniform controls identify each pigment's compiled finish independently of panel partitioning. */
  function draw(part: string, x: number, washAt: Skin["washAt"], split: boolean): void {
    const materials = kitFinishes(level, undefined, "white").materials;
    materials.concrete = "white";
    const mesh = new KitMesh(level, "floor", "props", materials, { maximumTriangles: 1000 });
    drawSkin({ pen: new Pen(mesh, part, new Matrix4().makeTranslation(x, 0, 0), false),
      rects: [{ u0: 0, u1: .6, v0: 0, v1: .6 }], openings: [], uMarks: [], zMarks: split ? [.3] : [],
      condition: new WallCondition({ ledges: [] }, { wear: .2, grime: 0, seed: 17 }),
      washAt, finish: { coat: "wall", bare: "concrete", cladding: { type: "plaster", groundTiles: false, seed: 5 } },
      raster: { density: 4, seed: 29 } });
  }
  draw("marked", 0, (_u, v) => v < .3 ? lower : upper, true);
  draw("lower-control", 2, () => lower, false);
  draw("upper-control", 4, () => upper, false);
  const before = geometry(level), collision = collisionMesh(level, true);
  await compileSurfaceAppearance(level, { rasterExecutor: async function* (jobs, bake) {
    assert.equal(jobs.length, 2, "Each distinct coat pigment has one shared finished material");
    for (const job of jobs) yield await bake(job.index);
  } }, 1000);
  assert.deepEqual(level.diagnostics, []);
  assert.deepEqual(geometry(level), before);
  assert.deepEqual(collisionMesh(level, true), collision);
  /** Reads actual bindings and placement colors on both sides of the authored pigment boundary. */
  function faces(part: string) {
    return level.mesh.surfaces.flatMap((surface, triangle) => {
      if (level.surfaces[surface].object !== `floor/$dressing/${part}`) return [];
      const vertices = level.mesh.indices.slice(triangle * 3, triangle * 3 + 3);
      return [{ material: level.surfaces[surface].material,
        height: vertices.reduce((sum, vertex) => sum + level.mesh.positions[vertex * 3 + 2], 0) / 3,
        colors: vertices.map(vertex => {
          const color = level.mesh.colors!.slice(vertex * 3, vertex * 3 + 3);
          assert.equal(color.length, 3, `${part}: vertex ${vertex} needs RGB within ${level.mesh.colors!.length} color values`);
          return color;
        }) }];
    });
  }
  const lowerFaces = faces("lower-control"), upperFaces = faces("upper-control");
  assert.ok(lowerFaces.length > 0 && upperFaces.length > 0);
  const lowerMaterial = lowerFaces[0].material, upperMaterial = upperFaces[0].material;
  assert.ok(lowerFaces.every(face => face.material === lowerMaterial));
  assert.ok(upperFaces.every(face => face.material === upperMaterial));
  assert.notEqual(lowerMaterial, upperMaterial, "Different pigments remain distinct intrinsic finishes");
  const marked = faces("marked");
  assert.ok(marked.some(face => face.height < .3) && marked.some(face => face.height > .3));
  for (const face of marked)
    assert.equal(face.material, face.height < .3 ? lowerMaterial : upperMaterial,
      "Each panel shares its own pigment's finish rather than inheriting its neighbor's");
  for (const face of [...marked, ...lowerFaces, ...upperFaces]) for (const color of face.colors)
    assert.deepEqual(color, [1, 1, 1], "Clean placement tint cannot apply coat pigment again to exposed backing");
});

test("drawSkin reuses clean normal-bearing facade maps without changing openings and excludes tile or height finishes", async () => {
  const level = await compile(parseAml(source), { navigation: false });
  kitMaterials(level);
  level.mesh.colors = Array(level.mesh.positions.length).fill(1);
  const dimensions = [[1.2, 1.2], [1.6, 1.4]];
  const placements = [new Matrix4(), new Matrix4().makeTranslation(4, 0, 0)
    .multiply(new Matrix4().makeRotationZ(.37)).multiply(new Matrix4().makeScale(-1, 1, 1))];
  for (let index = 0; index < 2; index++) {
    const materials = kitFinishes(level, undefined, "red").materials;
    materials.concrete = "blue";
    const mesh = new KitMesh(level, index === 0 ? "floor" : "wall", "props", materials, { maximumTriangles: 1000 });
    const pen = new Pen(mesh, `facade-${index}`, placements[index], index === 1);
    drawSkin({ pen, rects: [{ u0: 0, v0: 0, u1: dimensions[index][0], v1: dimensions[index][1] }],
      openings: [{ u0: .4, u1: .8, v0: .4, v1: .8 }], uMarks: [.4, .8], zMarks: [.4, .8],
      condition: new WallCondition({ ledges: [] }, { wear: .3, grime: 0, seed: 73 + index }),
      washAt: () => [.7, .8, .9],
      finish: { coat: "wall", bare: "concrete", cladding: { type: "plaster", groundTiles: false, seed: 3 } },
      raster: { density: 8, seed: 131 + index } });
  }
  const receivers = takeSurfaceCharts(level);
  assert.ok(receivers.length > 1 && receivers.every(chart => chart.reusableMaterial));
  for (const chart of receivers) registerSurfaceChart(level, chart);
  const before = geometry(level), collision = collisionMesh(level, true);
  await compileSurfaceAppearance(level, { resolveMaterialImage: resolveImage, rasterExecutor: async function* (jobs, bake) {
    assert.equal(jobs.length, 1, "Facade size, host and placement do not duplicate a matching intrinsic finish");
    yield await bake(jobs[0].index);
  } }, 1000);
  assert.deepEqual(geometry(level), before);
  assert.deepEqual(collisionMesh(level, true), collision);
  const maps = binding(level, receivers[0]);
  assert.ok(maps.normal, "Authored source normal maps remain part of the finished facade");
  const recipeBounds = receivers[0].reusableMaterial!.recipe.bounds;
  assert.deepEqual([maps.color.width, maps.color.height], [Math.ceil((recipeBounds[2] - recipeBounds[0]) * 8), Math.ceil((recipeBounds[3] - recipeBounds[1]) * 8)]);
  for (const chart of receivers) assert.equal(binding(level, chart).material.id, maps.material.id);
  for (let index = 0; index < 2; index++) {
    let area = 0;
    const inverse = placements[index].clone().invert();
    for (const face of geometry(level).filter(face => face.object.endsWith(`/$dressing/facade-${index}`))) {
      const points = face.corners.map(corner => new Vector3(...corner.position).applyMatrix4(inverse));
      const u = points.reduce((sum, point) => sum + point.x, 0) / 3, v = points.reduce((sum, point) => sum + point.z, 0) / 3;
      assert.ok(!(u > .40001 && u < .79999 && v > .40001 && v < .79999), "The facade's actual window opening stays empty");
      area += Math.abs((points[1].x - points[0].x) * (points[2].z - points[0].z)
        - (points[1].z - points[0].z) * (points[2].x - points[0].x)) / 2;
    }
    assert.ok(Math.abs(area - (dimensions[index][0] * dimensions[index][1] - .16)) < .0002,
      "The complete solid facade area remains once, excluding the opening");
  }
  for (const mode of ["tile", "height"] as const) {
    const excluded = await compile(parseAml(source), { navigation: false });
    kitMaterials(excluded);
    excluded.mesh.colors = Array(excluded.mesh.positions.length).fill(1);
    const white = excluded.document.materials.find(material => material.id === "white")!;
    for (const id of [WALL_TILE_BED, WALL_TILE_GRIME, "$kowloon/wall-ceramic"])
      excluded.document.materials.push({ ...white, id });
    const materials = kitFinishes(excluded, undefined, "red").materials;
    materials.concrete = "blue";
    if (mode === "height") {
      excluded.document.materials.push({ ...white, id: "height-coat", heightTexture: "height.png", heightScale: .01 });
      materials.wall = "height-coat";
    }
    const pen = new Pen(new KitMesh(excluded, "floor", "props", materials, { maximumTriangles: 1000 }), "excluded", new Matrix4(), false);
    const skin: Skin = { pen, rects: [{ u0: 0, u1: .3, v0: 0, v1: .3 }], openings: [], uMarks: [], zMarks: [],
      condition: new WallCondition({ ledges: [] }, { wear: 0, grime: 0, seed: 7 }), washAt: () => [1, 1, 1],
      finish: { coat: "wall", bare: "concrete" }, raster: { density: 8, seed: 17 },
      tiles: mode === "tile" ? { seed: 3, wear: .3, grime: .2 } : undefined };
    drawSkin(skin);
    const plans = takeSurfaceCharts(excluded);
    assert.ok(plans.length > 0 && plans.every(chart => !chart.reusableMaterial));
    if (mode === "height") assert.ok(plans.every(chart => chart.layerElevations && !chart.raster), "Authored displacement keeps its geometric path");
    else assert.ok(plans.every(chart => chart.raster && !chart.raster.repeat), "Tile-clad facades retain their existing finite raster domain");
  }
});
