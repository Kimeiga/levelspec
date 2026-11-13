import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Matrix4, Vector3 } from "three";
import { PNG } from "pngjs";
import { validateBytes } from "gltf-validator";
import { collisionMesh, compile, parseAml, resolveExportAssets, toGLB } from "levelspec";
import type { V3 } from "../src/architecture/types.ts";
import { KitMesh } from "../src/dressing/kit-mesh.ts";
import { kitFinishes, kitMaterials } from "../src/dressing/kit.ts";
import { Pen } from "../src/dressing/pen.ts";
import { brushedMetal } from "../src/dressing/finish/brushed-metal.ts";
import { lathe } from "../src/dressing/kowloon/shop/forms.ts";

const MAPS = ["brushed-metal.png", "brushed-metal-normal.png", "brushed-metal-properties.png"];
const FRAMES = [new Matrix4(), new Matrix4().makeTranslation(3, -2, .7)
  .multiply(new Matrix4().makeRotationZ(.63)).multiply(new Matrix4().makeScale(-1, 1, 1))];
const WHITE: V3 = [1, 1, 1];
type Level = Awaited<ReturnType<typeof compile>>;

/** Creates a real compiled mesh with optional reusable metal and a second finish sharing its images. */
async function fixture(mode: "textured" | "plain" | "absent" = "textured", frame = new Matrix4()) {
  const finish = mode === "textured"
    ? `<material id="stock-brushed-metal" color="#ffffff" repeat="2" roughness="1" metalness="1" texture="${MAPS[0]}" normal-texture="${MAPS[1]}" metallic-roughness-texture="${MAPS[2]}"/>
       <material id="polished-brushed-metal" color="#ffffff" repeat="2" roughness="0.6" metalness="1" texture="${MAPS[0]}" normal-texture="${MAPS[1]}" metallic-roughness-texture="${MAPS[2]}"/>`
    : mode === "plain" ? '<material id="stock-brushed-metal" color="#aabbcc"/>' : "";
  const level = await compile(parseAml(`<architecture version="1" id="metal-study">
    <material id="plain" color="#ffffff"/>${finish}
  </architecture>`), { navigation: false });
  assert.deepEqual(level.diagnostics, []);
  kitMaterials(level);
  level.mesh.colors = [];
  const mesh = new KitMesh(level, "metal-study", "props", kitFinishes(level, "stock", "plain").materials,
    { maximumTriangles: 10000 });
  return { level, pen: new Pen(mesh, "fixtures", frame, frame.determinant() < 0) };
}

/** Reads actual emitted corner attributes, without assuming vertex sharing or surface ordering. */
function faces(level: Level) {
  return level.mesh.surfaces.map((surface, triangle) => ({
    material: level.surfaces[surface].material,
    corners: level.mesh.indices.slice(triangle * 3, triangle * 3 + 3).map(index => ({
      position: level.mesh.positions.slice(index * 3, index * 3 + 3),
      normal: level.mesh.normals.slice(index * 3, index * 3 + 3),
      uv: level.mesh.uv.slice(index * 2, index * 2 + 2),
      color: level.mesh.colors!.slice(index * 3, index * 3 + 3),
    })),
  }));
}

/** Verifies metric density using physical edge lengths, including the triangle's diagonal. */
function assertMetric(face: ReturnType<typeof faces>[number], repeat = 2) {
  for (let index = 0; index < 3; index++) {
    const a = face.corners[index], b = face.corners[(index + 1) % 3];
    const physical = new Vector3(...a.position).distanceTo(new Vector3(...b.position));
    const texture = Math.hypot(a.uv[0] - b.uv[0], a.uv[1] - b.uv[1]) / repeat;
    assert.ok(Math.abs(physical - texture) < .00004, `UV stretch: ${physical}m edge maps to ${texture}m`);
  }
}

test("brushed metal keeps physical texture density on broad, thin and slanted faces through fixture transforms", async () => {
  for (const frame of FRAMES) {
    const instance = await fixture("textured", frame), original = await fixture("textured", frame);
    const physics = collisionMesh(instance.level);
    for (const [target, mapped] of [[instance, true], [original, false]] as const) {
      const pen = mapped ? brushedMetal(target.pen) : target.pen;
      pen.box("metal", [0, 0, 0], [1.3, .4, .025], WHITE, "");
      pen.move(0, .7, 0).into("small-shelf").box("metal", [0, 0, 0], [.2, .05, .012], WHITE, "");
      pen.facing([0, 1, 0], [0, 1, 0], [-1, 0, 0]).face("metal",
        [[0, 0, 0], [.6, 0, 0], [.6, .24, .32], [0, .24, .32]], [0, -.8, .6], WHITE);
      pen.move(0, 1.5, .2).face("metal",
        [[0, 0, 0], [.4, 0, 0], [.4, .2, 0], [0, .2, 0]], [0, 1, 1], WHITE);
    }
    const result = faces(instance.level), baseline = faces(original.level);
    assert.ok(result.length > 0);
    assert.equal(result.length, baseline.length, "Material adapter added geometry");
    for (let index = 0; index < result.length; index++) {
      assert.equal(result[index].material, "stock-brushed-metal", "A transformed pen lost its finish");
      assertMetric(result[index]);
      for (let corner = 0; corner < 3; corner++) {
        assert.deepEqual(result[index].corners[corner].position, baseline[index].corners[corner].position);
        assert.deepEqual(result[index].corners[corner].normal, baseline[index].corners[corner].normal);
      }
    }
    assert.deepEqual(collisionMesh(instance.level), physics, "Texture application changed physics");
  }
});

test("brushed metal retains explicit charts, per-vertex tints, unrelated finishes and untextured role overrides", async () => {
  const points: V3[] = [[0, 0, 0], [.3, 0, 0], [.3, .2, 0], [0, .2, 0]];
  const uv = [[.2, .3], [1.4, .3], [1.4, .8], [.2, .8]];
  const normals: V3[] = [[0, 0, 1], [.1, 0, Math.sqrt(.99)], [.1, 0, Math.sqrt(.99)], [0, 0, 1]];
  const tint = ([x, y]: V3): V3 => [.4 + x, .5 + y, .6];
  for (const mode of ["textured", "plain", "absent"] as const) {
    const instance = await fixture(mode), original = await fixture(mode);
    for (const [target, mapped] of [[instance, true], [original, false]] as const) {
      const pen = mapped ? brushedMetal(target.pen) : target.pen;
      pen.face("metal", points, [0, 0, 1], tint, uv, normals);
      pen.move(0, 0, .2).face("paint", points, [0, 0, 1], tint, uv, normals);
    }
    const result = faces(instance.level), baseline = faces(original.level);
    assert.deepEqual(result.map(face => face.corners), baseline.map(face => face.corners),
      `${mode}: adapter changed explicit UVs, geometry, normals or tint`);
    assert.deepEqual(result.slice(2), baseline.slice(2), `${mode}: unrelated drawing changed`);
    const expected = mode === "absent" ? "builtin:brushed-metal" : "stock-brushed-metal";
    assert.ok(result.slice(0, 2).every(face => face.material === expected));
  }
});

test("turned metal keeps metric facet charts, smooth sides and flat caps", async () => {
  const instance = await fixture(), original = await fixture();
  const radius = .5 / (2 * 16 * Math.sin(Math.PI / 16));
  const profile: [number, number][] = [[0, 0], [radius, 0], [radius, .3], [0, .3]];
  lathe(brushedMetal(instance.pen), "metal", [0, 0, 0], profile, WHITE, 16, 2);
  lathe(original.pen, "metal", [0, 0, 0], profile, WHITE, 16);
  const result = faces(instance.level), baseline = faces(original.level);
  assert.deepEqual(result.map(face => face.corners.map(({ position, normal }) => ({ position, normal }))),
    baseline.map(face => face.corners.map(({ position, normal }) => ({ position, normal }))));
  const sides = result.filter(face => face.corners.every(corner => Math.abs(corner.normal[2]) < .00001));
  assert.equal(sides.length, 32);
  const u = sides.flatMap(face => face.corners.map(corner => corner.uv[0]));
  const v = sides.flatMap(face => face.corners.map(corner => corner.uv[1]));
  assert.ok(Math.abs(Math.max(...u) - Math.min(...u) - 1) < .00002, "Half-meter polygonal circumference did not unwrap to one repeat");
  assert.ok(Math.abs(Math.max(...v) - Math.min(...v) - .6) < .00002, "Cylinder height lost its metric scale");
  for (const face of sides) {
    const span = Math.max(...face.corners.map(corner => corner.uv[0])) - Math.min(...face.corners.map(corner => corner.uv[0]));
    assert.ok(Math.abs(span - 1 / 16) < .00002, "A cylinder wedge crosses the UV seam or has uneven facet spacing");
  }
  const caps = result.filter(face => face.corners.every(corner => Math.abs(corner.normal[2]) > .999));
  assert.equal(caps.length, 32);
  caps.forEach(face => assertMetric(face));
  const turnedProfile: [number, number][] = [
    [.06, 0], [.06, .12], [.09, .16], [.09, .22], [.025, .24], [0, .28],
  ];
  for (const sides of [8, 32]) for (const scale of [.4, 2]) {
    const mapped = await fixture(), plain = await fixture();
    const scaledProfile = turnedProfile.map(([radius, height]): [number, number] => [radius * scale, height * scale]);
    lathe(brushedMetal(mapped.pen), "metal", [0, 0, 0], scaledProfile, WHITE, sides, 2);
    lathe(plain.pen, "metal", [0, 0, 0], scaledProfile, WHITE, sides);
    const mappedFaces = faces(mapped.level), plainFaces = faces(plain.level);
    assert.deepEqual(mappedFaces.map(face => face.corners.map(({ position, normal }) => ({ position, normal }))),
      plainFaces.map(face => face.corners.map(({ position, normal }) => ({ position, normal }))));
    mappedFaces.forEach(face => assertMetric(face));
  }
  const nearlyCylindrical = await fixture();
  lathe(brushedMetal(nearlyCylindrical.pen), "metal", [0, 0, 0], [[.1, 0], [.100000001, .2]], WHITE, 16, 2);
  faces(nearlyCylindrical.level).forEach(face => assertMetric(face));
  for (const invalid of [0, -1, Infinity, NaN]) assert.throws(() =>
    lathe(instance.pen, "metal", [0, 0, 0], profile, WHITE, 16, invalid), /repeat|finite|positive/i);
});

test("metal maps are portable PBR fields shared by flat and curved finishes with independent roughness", async () => {
  const source = await Promise.all(MAPS.map(name => readFile(`projects/dressing-demo/textures/${name}`)));
  const images = source.map(bytes => PNG.sync.read(bytes));
  for (const image of images) {
    assert.equal(image.width, 512); assert.equal(image.height, 512);
    for (let offset = 0; offset < image.data.length; offset += 4) assert.equal(image.data[offset + 3], 255);
  }
  const roughness = new Set<number>();
  for (let offset = 0; offset < images[1].data.length; offset += 4) {
    const normal = [...images[1].data.subarray(offset, offset + 3)].map(value => value / 127.5 - 1);
    assert.ok(normal[2] > 0 && Math.abs(Math.hypot(...normal) - 1) < .025, "Invalid tangent normal");
    roughness.add(images[2].data[offset + 1]);
    assert.ok(images[2].data[offset + 2] > 127, "Uncoated steel contains a dielectric region");
  }
  assert.ok(roughness.size > 8, "Cloudy surface response was lost to a constant roughness map");
  for (const image of images) for (const axis of [0, 1]) {
    let seam = 0, interior = 0;
    for (let across = 0; across < 512; across++) for (let channel = 0; channel < 3; channel++) {
      const at = (along: number) => image.data[((axis === 0 ? across * 512 + along : along * 512 + across) * 4) + channel];
      seam += Math.abs(at(511) - at(0));
      for (let along = 1; along < 512; along++) interior += Math.abs(at(along) - at(along - 1));
    }
    assert.ok(seam / (512 * 3) <= interior / (511 * 512 * 3) * 3 + 1,
      "A repeat boundary is substantially harsher than the material's ordinary adjacent pixels");
  }
  const instance = await fixture();
  brushedMetal(instance.pen).box("metal", [0, 0, 0], [1, .4, .03], WHITE, "");
  const polishedMesh = new KitMesh(instance.level, "pot", "props", kitFinishes(instance.level, "polished", "plain").materials,
    { maximumTriangles: 10000 });
  const pot = brushedMetal(new Pen(polishedMesh, "vessel", new Matrix4(), false));
  lathe(pot, "metal", [1.3, 0, 0], [[.1, 0], [.1, .2]], WHITE, 16, 2);
  const assets = await resolveExportAssets(instance.level, async name => source[MAPS.indexOf(name)]);
  const bytes = Buffer.from(toGLB(instance.level, { assets }));
  const validation = await validateBytes(new Uint8Array(bytes));
  assert.equal(validation.issues.numErrors, 0, JSON.stringify(validation.issues));
  const length = bytes.readUInt32LE(12), gltf = JSON.parse(bytes.toString("utf8", 20, 20 + length));
  assert.equal(gltf.images.length, 3, "Flat and curved presets duplicated shared texture sources");
  const materials = ["stock-brushed-metal", "polished-brushed-metal"].map(name => gltf.materials.find((material: { name: string }) => material.name === name));
  assert.ok(materials.every(Boolean), "An adopted finish did not survive export");
  assert.equal(materials[0].pbrMetallicRoughness.roughnessFactor, 1);
  assert.equal(materials[1].pbrMetallicRoughness.roughnessFactor, .6);
  const bindings = materials.map(material => [material.pbrMetallicRoughness.baseColorTexture,
    material.normalTexture, material.pbrMetallicRoughness.metallicRoughnessTexture]);
  for (let channel = 0; channel < 3; channel++) {
    assert.ok(bindings.every(group => group[channel]), `Missing PBR channel ${MAPS[channel]}`);
    const indices = bindings.map(group => gltf.textures[group[channel].index].source);
    assert.equal(indices[0], indices[1], "Presets allocated separate images");
    const image = gltf.images[indices[0]], view = gltf.bufferViews[image.bufferView];
    const start = 28 + length + (view.byteOffset ?? 0);
    assert.deepEqual(bytes.subarray(start, start + view.byteLength), source[channel], `Wrong embedded map for ${MAPS[channel]}`);
  }
});
