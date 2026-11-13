import { test } from "node:test";
import assert from "node:assert/strict";
import { Matrix4, Triangle, Vector3 } from "three";
import { compile, parseAml, collisionMesh } from "levelspec";
import { KitMesh } from "../src/dressing/kit-mesh.ts";
import { kitFinishes, kitMaterials } from "../src/dressing/kit.ts";
import { Pen } from "../src/dressing/pen.ts";
import { Rng } from "../src/generate/rng.ts";
import { Kit } from "../src/dressing/kowloon/kit.ts";
import { groundUnit, type UnitKind } from "../src/dressing/kowloon/ground.ts";
import { planLots } from "../src/dressing/kowloon/massing.ts";
import { compileSurfaceAppearance } from "../src/dressing/surface/compile.ts";
import { paintedPatina, type PaintedPatina } from "../src/dressing/finish/patina.ts";
import { decodeSurfaceImage } from "../src/dressing/surface/images.ts";

type Level = Awaited<ReturnType<typeof compile>>;
interface Facade { key: string; matrix: Matrix4 }
const front: Facade = { key: "front/bay", matrix: new Matrix4() };
const source = `<architecture version="1" id="painted-entrance"><material id="wall"/>
  <box id="host" width="0.1" depth="0.1" height="0.1" material="wall"/></architecture>`;

/** Distinct construction families selected by fixed public generation seeds. */
interface EntranceCase { kind: UnitKind; seed: string; budget: number }
const entrances: EntranceCase[] = [
  { kind: "door", seed: "door-13", budget: 1200 },
  { kind: "door", seed: "door-3", budget: 2200 },
  { kind: "door", seed: "door-9", budget: 1200 },
  { kind: "gate", seed: "gate-2", budget: 3400 },
  { kind: "shutter", seed: "shutter-1", budget: 500 },
];

/** Builds one seeded entrance family on each facade without changing native collision. */
async function build(grime: number, density: number, facades: Facade[] = [front], entrance = entrances[0], atlas = false): Promise<Level> {
  const xml = atlas ? source.replace('<box', '<material id="kit-shop-timber" texture="atlas.png"/><box') : source;
  const level = await compile(parseAml(xml), { navigation: false });
  const originalCollision = collisionMesh(level, true);
  level.mesh.colors = Array(level.mesh.positions.length).fill(1);
  kitMaterials(level);
  const mesh = new KitMesh(level, "host", "", kitFinishes(level, atlas ? "kit" : undefined, "wall").materials, { maximumTriangles: 5000 });
  const lot = planLots({ width: 2.6, depth: 1, height: 2.95, stories: 1, baseHeight: 0 }, "door-lot")[0];
  const kit = new Kit("paint-test", 0, grime, 0.2, false, density);
  for (const facade of facades) {
    const pen = new Pen(mesh, "openings", facade.matrix, facade.matrix.determinant() < 0);
    groundUnit(pen, entrance.kind, { key: facade.key, u0: 0, u1: 2.6, height: 3 }, lot, kit, new Rng(entrance.seed));
  }
  await compileSurfaceAppearance(level, { navigation: false }, 5000);
  assert.deepEqual(collisionMesh(level, true), originalCollision, "Modeled doors and their paint remain render-only");
  assert.ok(level.mesh.indices.length / 3 < entrance.budget * facades.length + 12, "Each entrance stays within its repeated-prop budget");
  return level;
}

/** Reads generated materials actually used by the mesh, independently of the entrance's design. */
function generatedMaterials(level: Level) {
  const used = new Set(level.mesh.surfaces.map(index => level.surfaces[index].material));
  const materials = [...used].filter(id => id.startsWith("$surface/raster/")).map(id => {
    const material = level.document.materials.find(candidate => candidate.id === id);
    assert.ok(material, `Used raster material ${id} is declared`);
    assert.ok(material.texture, `Used raster material ${id} has a color map`);
    return material;
  });
  assert.ok(materials.length > 0, "The fixture exercises actual generated appearance bindings");
  const ids = new Set(materials.map(material => material.id));
  for (const material of materials) {
    for (const reference of [material.texture, material.metallicRoughnessTexture, material.normalTexture]) {
      if (!reference) continue;
      assert.ok(level.generatedImages?.[reference], `Declared generated map ${reference} is available`);
      const image = decodeSurfaceImage(level.generatedImages[reference].bytes);
      assert.ok(image.width > 0 && image.height > 0 && image.data.length === image.width * image.height * 4);
    }
  }
  for (const [triangle, surface] of level.mesh.surfaces.entries()) {
    if (!ids.has(level.surfaces[surface].material)) continue;
    for (const index of level.mesh.indices.slice(triangle * 3, triangle * 3 + 3))
      assert.ok(level.mesh.uv.slice(index * 2, index * 2 + 2).every(value => Number.isFinite(value) && value >= 0 && value <= 1),
        "Generated appearance uses finite coordinates within its allocated map");
  }
  return new Map(materials.map(material => [material.id, material]));
}

/** Reads source ownership independently of generated surface and material identifiers. */
function ownership(level: Level) {
  return level.mesh.surfaces.map(index => {
    const { id, material, ...source } = level.surfaces[index];
    return source;
  });
}

/** Measures referenced geometry for one material in the original host frame. */
function materialBounds(level: Level, id: string, inverse = new Matrix4()): number[] {
  const points = level.mesh.surfaces.flatMap((surface, triangle) => level.surfaces[surface].material === id
    ? level.mesh.indices.slice(triangle * 3, triangle * 3 + 3).map(index =>
      new Vector3().fromArray(level.mesh.positions, index * 3).applyMatrix4(inverse).toArray()) : []);
  assert.ok(points.length > 0 && points.every(point => point.every(Number.isFinite)), "Each door material has finite referenced geometry");
  return [0, 1, 2].flatMap(axis => [Math.min(...points.map(point => point[axis])), Math.max(...points.map(point => point[axis]))]);
}

test("entrance appearance changes maps while preserving geometry, source ownership and door bindings", async () => {
  const clean = await build(0, 128), dirty = await build(1, 128), finer = await build(1, 192);
  for (const level of [dirty, finer]) {
    for (const attribute of ["positions", "indices", "normals"] as const)
      assert.deepEqual(level.mesh[attribute], clean.mesh[attribute], `${attribute} is independent of pigment and density`);
    assert.deepEqual(collisionMesh(level, true), collisionMesh(clean, true));
    assert.deepEqual(level.mesh.solidIds, clean.mesh.solidIds);
    assert.deepEqual(ownership(level), ownership(clean), "Appearance settings preserve each triangle's source and physical flags");
    generatedMaterials(level);
  }
  assert.ok(finer.surfaceAppearance!.texels > dirty.surfaceAppearance!.texels);
  const cleanMaterials = generatedMaterials(clean), dirtyMaterials = generatedMaterials(dirty), finerMaterials = generatedMaterials(finer);
  const paintIds = [...cleanMaterials.keys()].filter(id => id.includes("front/bay/door/"));
  assert.ok(paintIds.length > 0);
  for (const [triangle, surface] of dirty.mesh.surfaces.entries()) {
    const before = dirty.surfaces[surface].material, after = finer.surfaces[finer.mesh.surfaces[triangle]].material;
    assert.equal(finerMaterials.has(after), dirtyMaterials.has(before), "The same triangles retain their generated appearance");
    if (paintIds.includes(before) || !dirtyMaterials.has(before))
      assert.equal(after, before, "Density preserves named door bindings and unchanged source materials");
    if (dirtyMaterials.has(before)) for (const channel of ["texture", "metallicRoughnessTexture", "normalTexture"] as const)
      assert.equal(!!finerMaterials.get(after)![channel], !!dirtyMaterials.get(before)![channel], "Density retains every bound PBR channel");
  }
  assert.ok(paintIds.some(id => clean.generatedImages![cleanMaterials.get(id)!.texture!].hash !==
    dirty.generatedImages![dirtyMaterials.get(id)!.texture!].hash), "Grime changes the emitted door color maps");
});

test("door-local appearance identities and bindings survive reflected world placement", async () => {
  const back: Facade = { key: "back/bay", matrix: new Matrix4().makeRotationZ(Math.PI).setPosition(2.6, -1, 0) };
  const frontOnly = generatedMaterials(await build(1, 128, [front]));
  const backOnly = generatedMaterials(await build(1, 128, [back]));
  const original = await build(1, 128, [front, back]);
  const materials = generatedMaterials(original);
  assert.deepEqual(new Set(materials.keys()), new Set([...frontOnly.keys(), ...backOnly.keys()]));
  const placement = new Matrix4().makeRotationZ(0.43).scale(new Vector3(-1, 1, 1)).setPosition(4, -3, 0.5);
  const movedFacades = [front, back].map(facade => ({ key: facade.key, matrix: placement.clone().multiply(facade.matrix) }));
  const moved = await build(1, 128, movedFacades), placed = generatedMaterials(moved);
  const doorIds = new Set([...materials.keys()].filter(id => id.includes("/bay/door/")));
  for (const facade of [front, back])
    assert.ok([...doorIds].some(id => id.includes(`${facade.key}/door/`)), "Both facade-local door groups are exercised");
  assert.deepEqual(new Set([...placed.keys()].filter(id => id.includes("/bay/door/"))), doorIds);
  for (const id of doorIds) {
    const before = materials.get(id)!;
    const after = placed.get(id)!;
    assert.ok(after);
    const originalBounds = materialBounds(original, id), movedBounds = materialBounds(moved, id, placement.clone().invert());
    // Kit emission uses a 10 μm grid; inverse rotation combines two 5 μm errors plus the original 5 μm.
    assert.ok(movedBounds.every((value, axis) => Math.abs(value - originalBounds[axis]) <= .000015),
      `Each door material remains attached to its original local bounds: ${id}, ${originalBounds} versus ${movedBounds}`);
    for (const channel of ["texture", "metallicRoughnessTexture", "normalTexture"] as const) {
      assert.equal(!!after[channel], !!before[channel]);
      if (before[channel]) assert.equal(moved.generatedImages![after[channel]!].hash, original.generatedImages![before[channel]!].hash,
        `${channel} remains attached to the same local facade after a reflected rotation`);
    }
  }
});

/** Compares visible triangles independently of primitive emission order and material allocation. */
function geometry(level: Level): string[] {
  return level.mesh.surfaces.flatMap((surface, triangle) => {
    if (level.surfaces[surface].object !== "host/$dressing/openings") return [];
    return [level.mesh.indices.slice(triangle * 3, triangle * 3 + 3).map(index =>
      level.mesh.positions.slice(index * 3, index * 3 + 3).join(",")).sort().join(";")];
  }).sort();
}

for (const entrance of entrances) test(`${entrance.kind} ${entrance.seed} retains its fitted geometry with or without texture maps`, async () => {
  const plain = await build(.6, 0, [front], entrance), mapped = await build(.6, 128, [front], entrance);
  const signature = geometry(plain);
  assert.ok(signature.length > 0, "The fixture must exercise actual entrance geometry");
  assert.deepEqual(geometry(mapped), signature);
  generatedMaterials(mapped);
  for (const [triangle, surface] of mapped.mesh.surfaces.entries()) {
    if (mapped.surfaces[surface].object !== "host/$dressing/openings") continue;
    const indices = mapped.mesh.indices.slice(triangle * 3, triangle * 3 + 3);
    const points = indices.map(index => new Vector3().fromArray(mapped.mesh.positions, index * 3));
    for (const point of points) {
      assert.ok(point.toArray().every(Number.isFinite));
      assert.ok(point.x >= -1e-5 && point.x <= 2.6 + 1e-5, "An entrance stays within its facade bay");
      assert.ok(point.y >= -1e-5 && point.y <= .15 + 1e-5, "Visual depth stays within the 15 cm wall allowance");
    }
    const normal = points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0]));
    assert.ok(normal.length() > 1e-10, "Visible triangles have nonzero area");
    for (const index of indices) {
      const shading = new Vector3().fromArray(mapped.mesh.normals, index * 3);
      assert.ok(Math.abs(shading.length() - 1) < .001 && normal.dot(shading) > 0,
        "Normals remain finite and face with their triangle winding");
    }
  }
});

test("paint loss follows physical panel edges with shallow relief and quiet broad faces", () => {
  const finish: PaintedPatina = {bounds: [0, 0, 1, 2], panels: [[.12, .2, .88, .8], [.12, .95, .88, 1.85]],
    paint: [.1, .2, .3], substrate: [.3, .25, .2], seed: 537, wear: 1, grime: .5};
  const clean = {...finish, wear: 0};
  const relief = (u: number, v: number) => paintedPatina(clean, u, v).bump - paintedPatina(finish, u, v).bump;
  for (let u = .3; u <= .7; u += .025) for (let v = 1.2; v <= 1.6; v += .025)
    assert.ok(Math.abs(relief(u, v)) < 1e-9, "Protected panel centers have no chip depressions");
  const band: number[] = [];
  for (let u = .1; u <= .14; u += .002) for (let v = 1.2; v <= 1.6; v += .01)
    band.push(relief(u, v));
  assert.ok(band.some(value => value > .00004), "Interior panel joinery receives visible wear independently of leaf boundaries");
  assert.ok(band.filter(value => value < .00001).length > band.length / 4, "Edge wear retains intact stretches");
  assert.ok(band.every(value => value >= -1e-9 && value < .00025), "Relief stays below a quarter millimeter of paint");
});

test("timber entrances use the shelf atlas at the same physical grain scale on rails, stiles and edges", async () => {
  const level = await build(.6, 128, [front], entrances[1], true);
  let checked = 0, wornFronts = 0;
  const grainFamilies = new Set<number>();
  for (const [triangle, surface] of level.mesh.surfaces.entries()) {
    if (level.surfaces[surface].material !== "kit-shop-timber") continue;
    const indices = level.mesh.indices.slice(triangle * 3, triangle * 3 + 3);
    const u = indices.reduce((sum, index) => sum + level.mesh.uv[index * 2], 0) / 3;
    const v = indices.reduce((sum, index) => sum + level.mesh.uv[index * 2 + 1], 0) / 3;
    if (v > 256 / 1792) grainFamilies.add(Math.floor(u * 4));
    if (indices.every(index => level.mesh.normals[index * 3 + 1] > .99)) {
      const red = indices.map(index => level.mesh.colors![index * 3]);
      if (Math.max(...red) - Math.min(...red) > .001) wornFronts++;
    }
    for (let edge = 0; edge < 3; edge++) {
      const a = indices[edge], b = indices[(edge + 1) % 3];
      const length = new Vector3().fromArray(level.mesh.positions, a * 3)
        .distanceTo(new Vector3().fromArray(level.mesh.positions, b * 3));
      const textureMeters = Math.hypot((level.mesh.uv[a * 2] - level.mesh.uv[b * 2]) * 1024,
        (level.mesh.uv[a * 2 + 1] - level.mesh.uv[b * 2 + 1]) * 1792) / 494;
      // Two independently quantized endpoints contribute at most 18 micrometers of length error.
      assert.ok(Math.abs(textureMeters - length) < .00002, "Grain is cropped at 494 texels/m rather than stretched to fit a member");
      checked++;
    }
  }
  assert.ok(checked > 100, "The actual door, including its narrow members, uses the atlas adapter");
  assert.ok(wornFronts > 0, "Shelf contact wear faces the visible +Y door front");
  assert.equal(grainFamilies.size, 1, "One entrance uses a coherent timber color family");
  // Fixed probes on this seed's jambs, lintel and transom rail, away from hardware and worn edges.
  const frame = [[1.205, .085, 1.4], [2.225, .085, 1.4], [1.7, .085, 2.45], [1.7, .075, 2.07]];
  const leaf = [[1.3, .064, 1.5], [2.13, .064, 1.5], [1.7, .064, .96],
    [1.38, .047, .5], [1.55, .047, .5], [1.72, .047, .5], [1.88, .047, .5], [2.05, .047, .5]];
  const colors = [...frame, ...leaf].map(point => timberFrontTint(level, new Vector3(...point)));
  for (let channel = 0; channel < 3; channel++) {
    const values = colors.map(color => color[channel]);
    assert.ok(Math.max(...values) / Math.min(...values) < 1.12, "Regular joinery keeps a restrained tint range");
  }
});

/** Samples actual atlas-bound front faces at independently selected interior points. */
function timberFrontTint(level: Level, point: Vector3): number[] {
  for (const [triangle, surface] of level.mesh.surfaces.entries()) {
    if (level.surfaces[surface].material !== "kit-shop-timber") continue;
    const indices = level.mesh.indices.slice(triangle * 3, triangle * 3 + 3);
    if (!indices.every(index => level.mesh.normals[index * 3 + 1] > .99 && Math.abs(level.mesh.positions[index * 3 + 1] - point.y) < .00002)) continue;
    const corners = indices.map(index => new Vector3().fromArray(level.mesh.positions, index * 3));
    const face = new Triangle(corners[0], corners[1], corners[2]);
    if (!face.containsPoint(point)) continue;
    const weights = face.getBarycoord(point, new Vector3())!.toArray();
    return [0, 1, 2].map(channel => indices.reduce((sum, index, corner) => sum + weights[corner] * level.mesh.colors![index * 3 + channel], 0));
  }
  assert.fail(`No visible timber atlas face at ${point.toArray()}`);
}
