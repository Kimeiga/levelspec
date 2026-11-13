import { test } from "node:test";
import assert from "node:assert/strict";
import { compile, parseAml, serializeAml, collisionMesh, resolveExportAssets, toGLB, AmlError } from "levelspec";
import { validateBytes } from "gltf-validator";
import { registerSurfaceChart } from "../src/dressing/surface/plans.ts";
import { compileSurfaceAppearance } from "../src/dressing/surface/compile.ts";
import { encodeSurfaceImage, decodeSurfaceImage } from "../src/dressing/surface/images.ts";
import type { SurfaceChart } from "../src/dressing/surface/types.ts";

type Level = Awaited<ReturnType<typeof compile>>;
const source = `<architecture version="1" id="raster-contract"><material id="paint" color="#c0d0e0" roughness="0.7" metalness="0.2" texture="grain.png" repeat="2" normal-texture="normal.png" normal-scale="0.5" metallic-roughness-texture="packed.png"/>
  <box id="wall" width="2" depth="0.2" height="2" material="paint"/></architecture>`;
const grain = encodeSurfaceImage({ width: 2, height: 2, data: new Uint8Array([
  210, 200, 190, 255, 240, 230, 220, 255, 240, 230, 220, 255, 210, 200, 190, 255,
]) });
const normal = encodeSurfaceImage({ width: 1, height: 1, data: new Uint8Array([128, 204, 230, 255]) });
const packed = encodeSurfaceImage({ width: 1, height: 1, data: new Uint8Array([20, 128, 192, 255]) });
const resolveImage = async (reference: string): Promise<Uint8Array> => {
  const sources: Record<string, Uint8Array> = { "grain.png": grain, "normal.png": normal, "packed.png": packed };
  assert.ok(sources[reference], "Generated images must resolve internally, without an authored-file lookup");
  return sources[reference];
};

/** Registers the actual box's front triangles; no fake mesh or duplicated appearance engine is involved. */
function receiver(level: Level, dirty: boolean, density = 32, host = "wall", x = 0): SurfaceChart {
  const indices = level.mesh.surfaces.flatMap((_, triangle) => {
    const vertex = level.mesh.indices[triangle * 3];
    return level.surfaces[level.mesh.surfaces[triangle]].object === host && level.mesh.normals[vertex * 3 + 1] < -0.99 ? [triangle] : [];
  });
  assert.equal(indices.length, 2);
  return { id: `${host}/front`, host, firstTriangle: indices[0], triangleCount: indices.length, triangleIndices: indices,
    frame: { origin: [x, 0, 0], u: [1, 0, 0], v: [0, 0, 1], normal: [0, -1, 0] },
    bounds: [0, 0, 2, 2], materials: ["paint"], raster: { group: "front", bounds: [0, 0, 2, 2], texelsPerMeter: density },
    sample: (u, v) => ({ height: 0, roughness: dirty ? 0.6 + 0.3 * Math.sin(u * 7) ** 2 : 0.7,
      layers: [{ material: "paint", weight: 1, uv: [u * 2 + 0.13, v * 2 - 0.19],
        tint: dirty ? [0.3 + 0.6 * Math.sin(u * 23 + v * 31) ** 2, 0.6, 0.8] : [1, 1, 1] }] }),
    appearanceTint: dirty ? (u, v) => [0.8 + 0.1 * Math.sin(u + v), 1, 1] : undefined,
  };
}

/** Finishes one real compiled receiver through the production appearance boundary. */
async function build(dirty: boolean, density = 32): Promise<Level> {
  const level = await compile(parseAml(source), { navigation: false });
  registerSurfaceChart(level, receiver(level, dirty, density));
  await compileSurfaceAppearance(level, { navigation: false, resolveMaterialImage: resolveImage }, 1000);
  return level;
}

test("procedural pigment resolution changes maps without adding geometry and survives ordinary GLB", async () => {
  const clean = await build(false), dirty = await build(true), finer = await build(true, 64);
  for (const level of [dirty, finer]) {
    for (const attribute of ["positions", "indices", "normals"] as const)
      assert.deepEqual(level.mesh[attribute], clean.mesh[attribute], `${attribute} is independent of pigment and map resolution`);
    assert.equal(level.mesh.indices.length / 3, 12, "Two textured receiver triangles replace the same two box faces");
    assert.ok(level.mesh.colors!.every(value => value === 1), "Baked tint is never applied a second time as vertex color");
    assert.equal(level.physicalHash, clean.physicalHash);
    assert.deepEqual(collisionMesh(level, true), collisionMesh(clean, true));
    assert.equal(serializeAml(level.architecture), serializeAml(clean.architecture));
  }
  assert.notDeepEqual(dirty.surfaceAppearance!.generatedHashes, clean.surfaceAppearance!.generatedHashes);
  assert.ok(finer.surfaceAppearance!.texels > dirty.surfaceAppearance!.texels);
  const material = dirty.document.materials.find(material => material.id.startsWith("$surface/raster/"))!;
  assert.equal(material.color, "#ffffff", "Authored color factor is baked exactly once into the image");
  assert.equal(material.roughness, 1);
  assert.equal(material.metalness, 1);
  assert.equal(material.normalScale, 1, "Source normalScale is already composed into the map");
  const normalPixels = decodeSurfaceImage(dirty.generatedImages![material.normalTexture!].bytes).data;
  for (let axis = 0; axis < 3; axis++) assert.ok(Math.abs(normalPixels[axis] - [128, 172, 247][axis]) <= 1,
    "A source normal tilted toward V retains its direction with the authored half strength applied once");
  assert.equal(dirty.document.materials.find(material => material.id === "paint")!.texture, "grain.png");
  assert.ok(dirty.mesh.surfaces.some(index => dirty.surfaces[index].material === "paint"), "Undressed faces still use the untouched tiled source");
  const assets = await resolveExportAssets(dirty, resolveImage), bytes = toGLB(dirty, { assets });
  const gltf = await validateBytes(bytes);
  assert.equal(gltf.issues.numErrors, 0);
  const buffer = Buffer.from(bytes), document = JSON.parse(buffer.toString("utf8", 20, 20 + buffer.readUInt32LE(12)));
  assert.ok(document.materials.some((m: { pbrMetallicRoughness?: { metallicRoughnessTexture?: unknown } }) => m.pbrMetallicRoughness?.metallicRoughnessTexture));
  assert.equal(document.materials.find((m: { name: string }) => m.name === material.id).normalTexture.scale, 1);
  assert.ok(document.images.length >= 3, "Source grain and generated color/MR images are embedded");
  for (const image of Object.values(dirty.generatedImages!)) assert.ok(decodeSurfaceImage(image.bytes).width > 4);
});

test("raster budget failure and cancellation leave the compiled result intact and allow a subsequent build", async () => {
  for (const failure of ["texels", "normal-channel", "memory", "cancel"] as const) {
    const level = await compile(parseAml(source), { navigation: false });
    const mesh = structuredClone(level.mesh), materials = structuredClone(level.document.materials), surfaces = structuredClone(level.surfaces);
    registerSurfaceChart(level, receiver(level, true, failure === "cancel" ? 256 : 32));
    const abort = new AbortController();
    const timer = failure === "cancel" ? setTimeout(() => abort.abort(), 10) : undefined;
    try {
      await assert.rejects(compileSurfaceAppearance(level, { resolveMaterialImage: resolveImage, signal: abort.signal,
        appearance: failure === "texels" ? { maximumTexels: 1 } : failure === "normal-channel" ? { maximumTexels: 68 * 68 * 2 }
          : failure === "memory" ? { maximumBytes: 16 } : undefined }, 1000),
      failure === "cancel" ? { name: "AbortError" } : /raster (texel|memory) budget exceeded/);
    } finally { clearTimeout(timer); }
    assert.deepEqual(level.mesh, mesh); assert.deepEqual(level.document.materials, materials); assert.deepEqual(level.surfaces, surfaces);
    assert.equal(level.generatedImages, undefined);
    registerSurfaceChart(level, receiver(level, true));
    await compileSurfaceAppearance(level, { resolveMaterialImage: resolveImage }, 1000);
    assert.ok(Object.keys(level.generatedImages!).length >= 2, "A failed raster does not poison the next successful compile");
  }
});

test("a raster failure targets its real source receiver rather than the last chart", async () => {
  const level = await compile(parseAml(source.replace("</architecture>", '<box id="other" width="2" depth="0.2" height="2" material="paint" position="6 0 0"/></architecture>')), { navigation: false });
  registerSurfaceChart(level, receiver(level, true));
  registerSurfaceChart(level, receiver(level, false, 32, "other", 6));
  await assert.rejects(compileSurfaceAppearance(level, { resolveMaterialImage: resolveImage, appearance: { maximumTexels: 1 } }, 1000), error => {
    assert.ok(error instanceof AmlError);
    const diagnostic = error.diagnostics[0];
    assert.deepEqual(diagnostic.objects, ["wall"]);
    assert.ok(diagnostic.source);
    assert.deepEqual(diagnostic.review!.bounds, { min: [0, 0, 0], max: [2, 0, 2] });
    return true;
  });
});

test("building map density round-trips and rejects invalid or unrelated recipe inputs", async () => {
  const xml = `<architecture version="1" id="density"><material id="wall"/><box id="building" width="3" depth="3" height="3.35" collidable="false"/>
    <dressing seed="density"><building host="building" material="wall" stories="1" texture-density="96"/></dressing></architecture>`;
  assert.equal(parseAml(serializeAml(parseAml(xml))).dressing!.rules[0].textureDensity, 96);
  for (const value of [0, 15, 1025]) {
    const level = await compile(parseAml(xml.replace('texture-density="96"', `texture-density="${value}"`)), { navigation: false });
    assert.ok(level.diagnostics.some(d => d.severity === "error" && d.message.includes("texture-density") && d.source));
  }
});
