import { test } from "node:test";
import assert from "node:assert/strict";
import { Matrix4 } from "three";
import { collisionMesh, compile, parseAml } from "levelspec";
import type { ArchitectureCompileOptions, V3 } from "../src/architecture/types.ts";
import { GroundSurfaceField, type GroundSurfaceRecipe } from "../src/dressing/ground-surface.ts";
import { WallCondition, type WallAging, type WallExposure } from "../src/dressing/finish/wall-condition.ts";
import type { PaintedPatina } from "../src/dressing/finish/patina.ts";
import { plainWallFinish, registerPlainWallSurface } from "../src/dressing/wall-finish.ts";
import { WALL_TILE_BED, wallTileMaterial } from "../src/dressing/wall-materials.ts";
import { KitMesh } from "../src/dressing/kit-mesh.ts";
import { kitFinishes, kitMaterials } from "../src/dressing/kit.ts";
import type { SurfaceDeposit } from "../src/dressing/kit-surfaces.ts";
import { Decks } from "../src/dressing/kowloon/deck.ts";
import { drawSkin } from "../src/dressing/kowloon/skin.ts";
import { stain } from "../src/dressing/kowloon/fixtures.ts";
import { paintedPanel } from "../src/dressing/kowloon/painted.ts";
import { Pen } from "../src/dressing/pen.ts";
import { compileSurfaceAppearance } from "../src/dressing/surface/compile.ts";
import { decodeSurfaceImage, encodeSurfaceImage } from "../src/dressing/surface/images.ts";
import type { SurfaceMaterialArtifact, SurfaceMaterialCache } from "../src/dressing/surface/material-cache.ts";

type Level = Awaited<ReturnType<typeof compile>>;
const IMAGE = encodeSurfaceImage({ width: 2, height: 1, data: new Uint8Array([180, 210, 230, 255, 240, 130, 90, 255]) });
const OPTIONS: ArchitectureCompileOptions = { navigation: false, resolveMaterialImage: async () => IMAGE,
  limits: { triangles: 20_000 }, appearance: { maximumTexels: 1_000_000, maximumBytes: 16 * 1024 * 1024 } };

/** Each test owns independent cache storage and observes actual lookup outcomes. */
function memoryCache() {
  const entries = new Map<string, SurfaceMaterialArtifact>();
  const reads: string[] = [], hits: string[] = [], writes: string[] = [];
  const cache: SurfaceMaterialCache = {
    async read(key) { reads.push(key); const value = entries.get(key); if (value) hits.push(key); return value; },
    async write(value) { writes.push(value.key); entries.set(value.key, structuredClone(value)); },
  };
  return { entries, reads, hits, writes, cache,
    reset() { reads.length = hits.length = writes.length = 0; } };
}

/** Compares complete committed appearance and physical state, excluding incidental execution timing. */
function published(level: Level) {
  return { mesh: level.mesh, surfaces: level.surfaces, document: level.document, architecture: level.architecture,
    physicalHash: level.physicalHash, renderHash: level.renderHash, collision: collisionMesh(level, true),
    appearance: level.surfaceAppearance, images: level.generatedImages, diagnostics: level.diagnostics };
}

/** Geometry comparison tolerates material-driven vertex splitting, but no moved corner or owner. */
function geometry(level: Level) {
  return level.mesh.surfaces.map((surface, triangle) => ({ object: level.surfaces[surface].object,
    corners: level.mesh.indices.slice(triangle * 3, triangle * 3 + 3).map(vertex => ({
      position: level.mesh.positions.slice(vertex * 3, vertex * 3 + 3),
      normal: level.mesh.normals.slice(vertex * 3, vertex * 3 + 3),
    })) }));
}

/** Checks actual receiver bindings against stored artifacts, without depending on recipe key spelling. */
function boundArtifacts(level: Level, owner: string, entries: Map<string, SurfaceMaterialArtifact>): string[] {
  const ids = new Set(level.mesh.surfaces.flatMap(index => level.surfaces[index].object === owner
    ? [level.surfaces[index].material] : []));
  const materials = level.document.materials.filter(material => ids.has(material.id) && material.id.startsWith("$surface/raster/"));
  assert.ok(materials.length > 0, `${owner} must use a real generated material`);
  const keys = materials.map(material => {
    assert.ok(material.texture && material.metallicRoughnessTexture);
    const channels = [material.texture, material.metallicRoughnessTexture, material.normalTexture];
    const hashes = channels.map(reference => reference ? level.generatedImages![reference].hash : undefined);
    const matched = [...entries].find(([, artifact]) => artifact.layers.some(layer =>
      layer.color.hash === hashes[0] && layer.metallicRoughness.hash === hashes[1] && layer.normal?.hash === hashes[2]));
    assert.ok(matched, `${owner}'s complete bound PBR map set must be cacheable`);
    for (const reference of channels) if (reference) {
      const image = decodeSurfaceImage(level.generatedImages![reference].bytes);
      assert.ok(image.width > 0 && image.height > 0);
    }
    return matched[0];
  });
  return [...new Set(keys)];
}

interface NativeSettings { wetness?: number; relief?: number; shift?: number; extra?: boolean }
/** Small real ground and native wall include the same weather, projection and material producers as the demo. */
async function native(settings: NativeSettings = {}, cache?: SurfaceMaterialCache): Promise<Level> {
  const shift = settings.shift ?? 0;
  const level = await compile(parseAml(`<architecture version="1" id="large-material-native">
    <material id="finish" color="#c6c2b4" texture="source.png" repeat="2"/>
    <profile id="plan" points="${shift} 0; ${shift + 1.2} 0; ${shift + 1.2} 0.9; ${shift} 0.9"/>
    <slab id="floor" profile="plan" thickness="0.2" material="finish"/>
    <path id="axis" points="${shift} -0.1 0; ${shift + 1.2} -0.1 0"/>
    <wall id="wall" path="axis" thickness="0.2" height="1.1" material="finish"/>
    ${settings.extra ? '<box id="unrelated" position="10 10 0" width="1" depth="1" height="1" material="finish"/>' : ""}
    <dressing theme="kowloon-street@1" seed="large-material-native" detail="low" grime="0.6" wear="0.3">
      <wall host="wall" material="finish" face="back" windows="false" tile-share="0.4" texture-density="16"/>
      <floor host="floor" material="finish" ground="patched" texture-density="16"
        relief="${settings.relief ?? .015}" wetness="${settings.wetness ?? .7}" litter="0" repairs="0"
        tile-share="0" timber-share="0" asphalt="0" manholes="0" breakup="0"/>
    </dressing>
  </architecture>`), { ...OPTIONS, materialCache: cache });
  assert.deepEqual(level.diagnostics.filter(diagnostic => diagnostic.severity === "error"), []);
  return level;
}

test("large native material cache preserves complete output and reuses finishes across unrelated layout changes", async () => {
  const storage = memoryCache(), cold = await native({}, storage.cache);
  const floorKeys = boundArtifacts(cold, "floor", storage.entries), wallKeys = boundArtifacts(cold, "wall", storage.entries);
  const keys = [...floorKeys, ...wallKeys];
  for (const key of floorKeys) for (const layer of storage.entries.get(key)!.layers) {
    const image = decodeSurfaceImage(layer.color.bytes);
    assert.deepEqual([image.width, image.height], [Math.ceil(1.2 * 16) + 4, Math.ceil(.9 * 16) + 4],
      "The explicit floor density and finite-map padding stay intact");
  }
  assert.ok(wallKeys.some(key => storage.entries.get(key)!.layers.some(layer => {
    const image = decodeSurfaceImage(layer.color.bytes);
    return image.width === Math.ceil(1.2 * 16) + 4 && image.height === Math.ceil(1.1 * 16) + 4;
  })), "The broad wall face retains its explicit texel density");
  storage.reset();
  const warm = await native({}, storage.cache);
  assert.deepEqual(published(warm), published(cold));
  assert.ok(keys.every(key => storage.hits.includes(key)), "Actual ground and native-wall materials must hit");

  storage.reset();
  const changed = await native({ extra: true }, storage.cache), reference = await native({ extra: true });
  assert.deepEqual(published(changed), published(reference));
  assert.notEqual(changed.physicalHash, cold.physicalHash);
  assert.ok(changed.surfaces.some(surface => surface.object === "unrelated"));
  assert.ok(keys.every(key => storage.hits.includes(key)), "Unrelated geometry is not part of a finished-material identity");
});

test("ground moisture and native world coordinates invalidate only through complete sampled recipes", async () => {
  const storage = memoryCache();
  await native({}, storage.cache);
  for (const change of [{ wetness: .2 }, { relief: .025 }, { shift: .23 }]) {
    storage.reset();
    const cached = await native(change, storage.cache), fresh = await native(change);
    assert.ok(storage.writes.length > 0, `Changed sampled input must rebuild affected maps: ${JSON.stringify(change)}`);
    assert.deepEqual(published(cached), published(fresh), "A cache populated by another layout cannot alter the new result");
  }
});

/** Real flush deck producer keeps its geometry separate from the relief field used for damp pigment. */
async function deck(height: number, cache?: SurfaceMaterialCache): Promise<Level> {
  const level = await compile(parseAml(`<architecture version="1" id="cached-deck">
    <material id="finish" color="#b0afa4" repeat="1.7" texture="source.png"/>
    <box id="host" width="1" depth="1" height="1" material="finish"/>
  </architecture>`), { navigation: false });
  kitMaterials(level);
  level.mesh.colors = Array(level.mesh.positions.length).fill(1);
  const materials = kitFinishes(level, undefined, "finish").materials;
  const mesh = new KitMesh(level, "host", "props", materials, { maximumTriangles: 2000 });
  new Decks(level, mesh, { host: "host", layer: "props", seed: "cached-deck", grime: .6, wear: .3,
    screed: "finish", fineMarks: true }, { maximumTriangles: 2000 }).lay("roof",
  [[0, 0, height], [.7, 0, height], [.7, .6, height], [0, .6, height]]);
  const before = geometry(level), collision = collisionMesh(level, true);
  await compileSurfaceAppearance(level, { ...OPTIONS, materialCache: cache }, 2000);
  assert.deepEqual(geometry(level), before);
  assert.deepEqual(collisionMesh(level, true), collision);
  assert.deepEqual(level.diagnostics, []);
  return level;
}

test("flush roof decks cache PBR maps while retaining fresh geometry and elevation-dependent pigment", async () => {
  const storage = memoryCache(), cold = await deck(2, storage.cache);
  const keys = boundArtifacts(cold, "host/$dressing/roof", storage.entries);
  storage.reset();
  const warm = await deck(2, storage.cache);
  assert.deepEqual(published(warm), published(cold));
  assert.ok(keys.every(key => storage.hits.includes(key)));
  storage.reset();
  const raised = await deck(3, storage.cache), reference = await deck(3);
  assert.ok(storage.writes.length > 0, "A flush deck's elevation remains an input to its pigment field");
  assert.deepEqual(published(raised), published(reference));
});

/** Resolved field inputs deliberately share the same outer rectangle while local boundaries change. */
function groundRecipe(): GroundSurfaceRecipe {
  return { seed: 31, kind: "timber", polygon: [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0]],
    asphalt: [[[.1, .1, 0], [.3, .1, 0], [.3, .8, 0], [.1, .8, 0]]],
    deposits: [{ material: "repair", polygon: [[.6, .1, 0], [.8, .1, 0], [.8, .4, 0], [.6, .4, 0]] }],
    tileSize: .2, tileAspect: 1.5, tileWear: .4, tileGrime: .3, wornEdges: [true, false, false, false],
    angle: .37, phase: .23, relief: true, wear: .4,
    receivingEdges: [[[.4, .4, 0], [.6, .4, 0]]],
    material: finish => ({ id: finish, repeat: 2, roughness: .6 }), color: () => [.8, .7, .6] };
}

test("ground field identities include pigment programs, internal boundaries and resolved source mappings", () => {
  const original = groundRecipe(), key = new GroundSurfaceField(original).materialKey("pigment/v1");
  assert.equal(new GroundSurfaceField(groundRecipe()).materialKey("pigment/v1"), key);
  assert.notEqual(new GroundSurfaceField(groundRecipe()).materialKey("pigment/v2"), key);
  const changes: Partial<GroundSurfaceRecipe>[] = [
    { receivingEdges: [[[.4, .5, 0], [.6, .5, 0]]] },
    { asphalt: original.asphalt!.map(polygon => polygon.map(([x, y, z]) => [x + .1, y, z] as V3)) },
    { deposits: original.deposits.map(deposit => ({ ...deposit, polygon: deposit.polygon.map(([x, y, z]) => [x, y + .1, z] as V3) })) },
    { wornEdges: [false, true, false, false] }, { angle: .61 }, { phase: .72 },
    { material: finish => ({ id: finish, repeat: 3, roughness: .6 }) },
  ];
  for (const change of changes) assert.notEqual(new GroundSurfaceField({ ...groundRecipe(), ...change }).materialKey("pigment/v1"), key,
    "Equal outer bounds do not make different local sampling programs interchangeable");
});

test("ground fields own geometry and resolved material inputs independently of caller mutation", () => {
  for (const kind of ["timber", "tile"]) {
    const recipe = groundRecipe();
    recipe.kind = kind;
    const sources = new Map(["timber", "tile", "asphalt", "substrate", "grout", "repair", "chip", "tile-grime"]
      .map(name => [name, { id: name, repeat: 2, roughness: .6 }] as const));
    recipe.material = name => { const source = sources.get(name); assert.ok(source); return source; };
    const points = [[.005, .4], [.15, .2], [.29, .4], [.49, .4], [.65, .2], [.8, .2], [.93, .93]];
    const areas: [number, number, number, number][] = [[.1, .1, .12, .12], [.64, .14, .66, .16], [.46, .41, .5, .43]];
    /** Samples previously untouched cells as well as the derived coverage plans. */
    function observe(field: GroundSurfaceField) {
      return { key: field.materialKey("fixed-pigment/v1"), materials: [...field.materials],
        samples: points.map(([x, y]) => field.sample(x, y)),
        rasters: points.map(([x, y]) => field.rasterSample(x, y, 1 / 32)),
        uniform: areas.map(area => field.uniformCoverage(area)),
        cuts: areas.map(area => field.constructionCuts(area)),
        scale: areas.map(area => field.featureScale(area)) };
    }
    const expected = observe(new GroundSurfaceField(recipe)), field = new GroundSurfaceField(recipe);
    recipe.polygon[0][0] = -.4;
    recipe.polygon.push([-.4, 1, 0]);
    recipe.asphalt![0][0][0] = .15;
    recipe.asphalt!.push([[.5, .5, 0], [.7, .5, 0], [.7, .7, 0], [.5, .7, 0]]);
    recipe.deposits[0].polygon[0][0] = .55;
    recipe.deposits[0].material = "chip";
    recipe.deposits.push({ material: "repair", polygon: [[.1, .5, 0], [.3, .5, 0], [.3, .7, 0], [.1, .7, 0]] });
    recipe.receivingEdges[0][0][1] = .8;
    recipe.receivingEdges.push([[.6, .6, 0], [.8, .6, 0]]);
    recipe.wornEdges.fill(false);
    recipe.phase = .8;
    for (const [name, source] of sources) Object.assign(source, { id: `${name}-changed`, repeat: 3, roughness: .9 });
    assert.deepEqual(observe(field), expected, `${kind}: owned samples, plans and key retain their construction inputs`);
    assert.notEqual(new GroundSurfaceField(recipe).materialKey("fixed-pigment/v1"), expected.key,
      "A new field observes the caller's current geometry and material mappings");
  }
});

test("wall condition and path identities retain all local weathering inputs", () => {
  const exposure = { base: 0, ledges: [{ u0: 0, u1: 1, z: 1, flow: .6 }],
    openings: [{ u0: .2, u1: .8, z0: .4, z1: 1.2 }] };
  const aging = { seed: 31, grime: .4, wear: .3 };
  const key = new WallCondition(exposure, aging).materialKey;
  assert.equal(new WallCondition(structuredClone(exposure), { ...aging }).materialKey, key);
  const variations: [WallExposure, WallAging][] = [
    [{ ...exposure, base: .2 }, aging],
    [{ ...exposure, ledges: [{ ...exposure.ledges[0], flow: .8 }] }, aging],
    [{ ...exposure, ledges: [{ ...exposure.ledges[0], u1: .8 }] }, aging],
    [{ ...exposure, openings: [] }, aging],
    [{ ...exposure, openings: [{ ...exposure.openings[0], z1: 1.4 }] }, aging],
    [exposure, { ...aging, seed: 32 }], [exposure, { ...aging, grime: .6 }], [exposure, { ...aging, wear: .7 }],
  ];
  for (const [nextExposure, nextAging] of variations)
    assert.notEqual(new WallCondition(nextExposure, nextAging).materialKey, key);
  const path: V3[] = [[0, 0, 0], [1, 0, 0], [1, 1, 0]];
  const first = plainWallFinish(path, 0, 1, .4, .3, 31).materialKey;
  assert.equal(plainWallFinish(structuredClone(path), 0, 1, .4, .3, 31).materialKey, first);
  assert.notEqual(plainWallFinish([[0, 0, 0], [.8, 0, 0], [1, 1, 0]], 0, 1, .4, .3, 31).materialKey, first);
  assert.notEqual(plainWallFinish(path, 0, 1.2, .4, .3, 31).materialKey, first);
});

test("plain wall stations and material identity own their constructor path", () => {
  const path: V3[] = [[0, 0, 0], [1, 0, 0], [1, 1, 0]];
  const original = structuredClone(path), finish = plainWallFinish(path, 0, 1, .4, .3, 31);
  const key = finish.materialKey;
  const points: V3[] = [[-.4, 0, 2], [.5, 0, 2], [1, 0, 2], [1, .5, 2], [1, 1.4, 2]];
  const expected = [0, .5, 1, 1.5, 2];
  assert.deepEqual(path, original, "Constructing the finish must not modify the caller's path");
  assert.deepEqual(points.map(point => finish.along(point)), expected);
  path[0][0] = -2;
  path[1][0] = 3;
  path[2][1] = 4;
  path.push([6, 5, 0]);
  assert.deepEqual(points.map(point => finish.along(point)), expected,
    "Later point and array edits cannot move stations in an existing finish");
  assert.equal(finish.materialKey, key);
  assert.notEqual(plainWallFinish(path, 0, 1, .4, .3, 31).materialKey, key,
    "A newly constructed finish uses the caller's current path");
});

test("wall condition owns exposure and aging snapshots for samples, bounds and cache identity", () => {
  const exposure: WallExposure = { base: 0, ledges: [{ u0: -.3, u1: .7, z: 1.1, flow: .6 }],
    openings: [{ u0: -.3, u1: .7, z0: .2, z1: 1.05 }] };
  const aging: WallAging = { grime: .7, wear: .4, seed: 31 };
  const original = structuredClone({ exposure, aging }), condition = new WallCondition(exposure, aging);
  const points = [[-.3, 1.05], [.2, .2], [.7, 1.05], [2, 1.05]];
  const bounds: [number, number, number, number] = [-.4, .1, .8, 1.1];
  const before = { key: condition.materialKey, sources: structuredClone(condition.runoffSources),
    samples: points.map(([u, v]) => condition.sample(u, v)), range: condition.lossRange(bounds) };
  assert.deepEqual({ exposure, aging }, original);
  assert.ok(before.samples.some(sample => sample.runoff > 0), "The fixture includes an active accepted ledge");
  Object.assign(exposure.ledges[0], { u0: 10, u1: 11, z: 5, flow: .9 });
  exposure.ledges.push({ u0: -1, u1: 1, z: .8, flow: 1 });
  exposure.openings![0].z1 = 2;
  exposure.openings!.push({ u0: 1, u1: 2, z0: 0, z1: 3 });
  exposure.base = .5;
  Object.assign(aging, { grime: .1, wear: .9, seed: 79 });
  assert.deepEqual({ key: condition.materialKey, sources: condition.runoffSources,
    samples: points.map(([u, v]) => condition.sample(u, v)), range: condition.lossRange(bounds) }, before);
  assert.notEqual(new WallCondition(exposure, aging).materialKey, before.key,
    "A new condition observes the changed input without mutating the prior one");
});

test("native wall cache includes explicit weather identity and independent finish scalars", async () => {
  /** Uses actual source triangles while keeping the optional weather callback under caller control. */
  async function wall(value: number, keyed: boolean, cache?: SurfaceMaterialCache,
    scalars: { base?: number; seed?: number } = {}): Promise<Level> {
    const level = await compile(parseAml(`<architecture version="1" id="native-weather-key">
      <material id="paint" color="#ffffff" repeat="2"/>
      <box id="wall" width="1" depth="0.1" height="1" material="paint"/>
    </architecture>`), { navigation: false });
    const source = level.document.materials.find(material => material.id === "paint")!;
    for (const id of [WALL_TILE_BED, wallTileMaterial("wall")]) level.document.materials.push({ ...source, id });
    const finish = { ...plainWallFinish([[0, 0, 0], [1, 0, 0]], 0, 1, .4, .3, 31), ...scalars };
    let receivers = 0;
    for (const [triangle, surface] of level.mesh.surfaces.entries()) {
      const indices = level.mesh.indices.slice(triangle * 3, triangle * 3 + 3);
      if (level.surfaces[surface].object !== "wall" || level.mesh.normals[indices[0] * 3 + 1] > -.99) continue;
      receivers++;
      registerPlainWallSurface(level, { host: "wall", firstTriangle: triangle,
        points: indices.map(index => level.mesh.positions.slice(index * 3, index * 3 + 3) as V3),
        normal: [0, -1, 0], material: "paint", backing: "paint", inverse: new Matrix4(),
        phase: .2, tileShare: 0, tileGrime: 0, tileColor: "#ffffff", textureDensity: 8, wear: .3, finish,
        weather: () => [value, .7, .8], weatherKey: keyed ? `constant-weather/v1/${value}` : undefined });
    }
    assert.ok(receivers > 0);
    const before = geometry(level), collision = collisionMesh(level, true);
    await compileSurfaceAppearance(level, { ...OPTIONS, materialCache: cache }, 100);
    assert.deepEqual(geometry(level), before);
    assert.deepEqual(collisionMesh(level, true), collision);
    assert.deepEqual(level.diagnostics, []);
    return level;
  }
  const storage = memoryCache(), first = await wall(.6, true, storage.cache);
  boundArtifacts(first, "wall", storage.entries);
  storage.reset();
  const changed = await wall(.4, true, storage.cache), changedReference = await wall(.4, true);
  assert.ok(storage.writes.length > 0);
  assert.deepEqual(published(changed), published(changedReference));
  for (const scalars of [{ base: .15 }, { seed: 79 }]) {
    storage.reset();
    const cached = await wall(.6, true, storage.cache, scalars), fresh = await wall(.6, true, undefined, scalars);
    assert.ok(storage.writes.length > 0, "Direct finish scalars remain inputs even when callback identities are unchanged");
    assert.deepEqual(published(cached), published(fresh));
  }
  storage.reset();
  const unkeyed = await wall(.2, false, storage.cache), unkeyedReference = await wall(.2, false);
  assert.deepEqual(storage.reads, []);
  assert.deepEqual(storage.writes, []);
  assert.deepEqual(published(unkeyed), published(unkeyedReference));
});

interface PaintedSettings {
  finish?: Partial<PaintedPatina>;
  repeat?: number;
  before?: boolean;
}

/** A single real panel keeps mutable finish inputs live until the final appearance compile. */
async function painted(settings: PaintedSettings = {}, cache?: SurfaceMaterialCache): Promise<Level> {
  const level = await compile(parseAml(`<architecture version="1" id="cached-painted-panel">
    <material id="finish" color="#ffffff" texture="source.png" repeat="${settings.repeat ?? 1.7}"/>
    <box id="host" width="1" depth="0.1" height="1" material="finish"/>
  </architecture>`), { navigation: false });
  kitMaterials(level);
  level.mesh.colors = Array(level.mesh.positions.length).fill(1);
  const materials = kitFinishes(level, undefined, "finish").materials;
  materials.paint = "finish";
  const mesh = new KitMesh(level, "host", "props", materials, { maximumTriangles: 100 });
  const pen = new Pen(mesh, "painted", new Matrix4(), false);
  const finish: PaintedPatina = { bounds: [0, 0, .5, .6], paint: [.6, .7, .8], substrate: [.3, .25, .2],
    seed: 11, wear: .6, grime: .4 };
  if (settings.before) Object.assign(finish, settings.finish);
  paintedPanel(pen, "paint", [0, 0, .5, .6], .02, [1, 1, 1], { finish, group: "test-panel", density: 16 });
  if (!settings.before) Object.assign(finish, settings.finish);
  const before = geometry(level), collision = collisionMesh(level, true);
  await compileSurfaceAppearance(level, { ...OPTIONS, materialCache: cache }, 100);
  assert.deepEqual(geometry(level), before);
  assert.deepEqual(collisionMesh(level, true), collision);
  assert.deepEqual(level.diagnostics, []);
  return level;
}

test("painted panel cache observes late finish changes and retains exact bound maps", async () => {
  const storage = memoryCache(), cold = await painted({}, storage.cache);
  const keys = boundArtifacts(cold, "host/$dressing/painted", storage.entries);
  storage.reset();
  assert.deepEqual(published(await painted({}, storage.cache)), published(cold));
  assert.ok(keys.every(key => storage.hits.includes(key)));
  const changes: PaintedSettings[] = [
    { finish: { handle: [.2, .35] } }, { finish: { panels: [[.08, .08, .42, .5]] } },
    { finish: { paint: [.3, .5, .7] } }, { finish: { seed: 91 } }, { finish: { wear: .9 } }, { repeat: 3 },
  ];
  for (const change of changes) {
    storage.reset();
    const cached = await painted(change, storage.cache), fresh = await painted(change);
    assert.ok(storage.writes.length > 0, "Final finish inputs cannot reuse an earlier panel artifact");
    assert.deepEqual(published(cached), published(fresh));
    storage.reset();
    const early = await painted({ ...change, before: true }, storage.cache);
    assert.ok(storage.hits.length > 0, "Equivalent final inputs share artifacts regardless of registration order");
    assert.deepEqual(published(early), published(cached));
  }
});

interface Film { tint: V3; strength: number; roughness: number; keyed?: boolean; offset?: number }
const FIRST_FILM: Film = { tint: [.4, .7, .6], strength: .5, roughness: .1 };
const SECOND_FILM: Film = { tint: [.7, .4, .8], strength: .6, roughness: .9 };
interface SkinSettings { films?: Film[]; before?: boolean; wash?: V3; flow?: number; keyedWash?: boolean; realStain?: boolean; shift?: number }

/** A real finite facade map sees all deposits before cache identity is resolved. */
async function skin(settings: SkinSettings = {}, cache?: SurfaceMaterialCache): Promise<Level> {
  const level = await compile(parseAml(`<architecture version="1" id="cached-skin">
    <material id="finish" color="#ffffff" texture="source.png" repeat="1.7"/>
    <box id="host" width="1" depth="0.1" height="1" material="finish"/>
  </architecture>`), { navigation: false });
  kitMaterials(level);
  level.mesh.colors = Array(level.mesh.positions.length).fill(1);
  const materials = kitFinishes(level, undefined, "finish").materials;
  materials.concrete = "finish";
  const mesh = new KitMesh(level, "host", "props", materials, { maximumTriangles: 1000 });
  const pen = new Pen(mesh, "facade", new Matrix4().makeTranslation(settings.shift ?? 0, 0, 0), false);
  const wash: V3 = settings.wash ?? [.7, .8, .9];
  /** Both simple analytic films and the real fixture producer retain exact support in the local frame. */
  function deposit(): void {
    for (const film of settings.films ?? [FIRST_FILM]) {
      const bounds: SurfaceDeposit["bounds"] = [.08 + (film.offset ?? 0), .06, .48 + (film.offset ?? 0), .55];
      mesh.deposit({ frame: pen.surfaceFrame(), bounds,
        materialKey: film.keyed === false ? undefined : `test-film/v1/${JSON.stringify([film.tint, film.strength, film.roughness])}`,
        sample: () => ({ tint: [...film.tint], strength: film.strength, roughness: film.roughness }) });
    }
    if (settings.realStain) stain(pen, .15, .55, .58, .04, [.4, .5, .6], .5);
  }
  if (settings.before) deposit();
  drawSkin({ pen, rects: [{ u0: 0, u1: .7, v0: 0, v1: .6 }], openings: [], uMarks: [.35], zMarks: [.3],
    condition: new WallCondition({ base: 0, ledges: [{ u0: 0, u1: .7, z: .6, flow: settings.flow ?? .6 }] }, { seed: 17, wear: .3, grime: .6 }),
    washAt: () => [...wash], washKey: settings.keyedWash === false ? undefined : `constant-wash/v1/${wash}`,
    finish: { coat: "wall", bare: "concrete", cladding: { type: "plaster", groundTiles: false, seed: 5 } },
    raster: { density: 8, seed: 29 } });
  if (!settings.before) deposit();
  const before = geometry(level), collision = collisionMesh(level, true);
  await compileSurfaceAppearance(level, { ...OPTIONS, materialCache: cache }, 1000);
  assert.deepEqual(geometry(level), before);
  assert.deepEqual(collisionMesh(level, true), collision);
  assert.deepEqual(level.diagnostics, []);
  return level;
}

test("finite facade cache includes late fixture films, wash, runoff and deposit order", async () => {
  const storage = memoryCache(), cold = await skin({}, storage.cache);
  const keys = boundArtifacts(cold, "host/$dressing/facade", storage.entries);
  for (const key of keys) for (const layer of storage.entries.get(key)!.layers) {
    const image = decodeSurfaceImage(layer.color.bytes);
    assert.deepEqual([image.width, image.height], [Math.ceil(.7 * 8) + 4, Math.ceil(.6 * 8) + 4]);
  }
  storage.reset();
  const early = await skin({ before: true }, storage.cache);
  assert.deepEqual(published(early), published(cold));
  assert.ok(keys.every(key => storage.hits.includes(key)), "Equivalent final deposits reuse maps across registration order");
  for (const change of [
    { films: [FIRST_FILM, SECOND_FILM] }, { films: [SECOND_FILM, FIRST_FILM] },
    { films: [{ ...FIRST_FILM, offset: .05 }] }, { wash: [.3, .7, .8] as V3 }, { flow: .9 }, { realStain: true },
  ]) {
    storage.reset();
    const cached = await skin(change, storage.cache), fresh = await skin(change);
    assert.ok(storage.writes.length > 0, "Changed finite appearance must not inherit a prior facade artifact");
    assert.deepEqual(published(cached), published(fresh));
  }
  storage.reset();
  const shifted = await skin({ shift: 2 }, storage.cache), shiftedReference = await skin({ shift: 2 });
  assert.deepEqual(published(shifted), published(shiftedReference));
  assert.ok(keys.every(key => storage.hits.includes(key)), "Equivalent relative film coordinates exclude unrelated world placement");
});

test("unkeyed facade callbacks and touching deposits stay uncached and recover on the next keyed compile", async () => {
  const storage = memoryCache();
  await skin({}, storage.cache);
  for (const settings of [{ keyedWash: false }, { films: [{ ...FIRST_FILM, keyed: false }] }]) {
    storage.reset();
    const uncached = await skin(settings, storage.cache), fresh = await skin(settings);
    assert.deepEqual(storage.reads, []);
    assert.deepEqual(storage.writes, []);
    assert.deepEqual(published(uncached), published(fresh));
  }
  storage.reset();
  await skin({}, storage.cache);
  assert.ok(storage.hits.length > 0);
});
