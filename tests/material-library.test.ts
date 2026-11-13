import { test } from "node:test";
import assert from "node:assert/strict";
import { PNG } from "pngjs";
import { createHash } from "node:crypto";
import { compile, parseAml, resolveExportAssets, serializeAml, toGLB, withBuiltinMaterialImages } from "../src/architecture/index.ts";
import { materialTextures } from "../src/vector/materials.ts";

const slab = `<architecture version="1" id="library" validation="premap">
  <material id="unused" color="#ffffff" texture="unreadable.png"/>
  <profile id="plan" points="0 0; 1 0; 1 1; 0 1"/>
  <slab id="floor" profile="plan" thickness="0.2" material="builtin:concrete"/>
</architecture>`;

/** Tiny independent valid input exercises plumbing without checking any art pixels. */
function image(): Uint8Array {
  const png = new PNG({ width: 2, height: 2 });
  png.data.fill(128);
  for (let i = 3; i < png.data.length; i += 4) png.data[i] = 255;
  return PNG.sync.write(png);
}

test("library material references round-trip, preserve source, and export only used PBR assets", async () => {
  const document = parseAml(slab), before = structuredClone(document);
  const level = await compile(document, { navigation: false });
  assert.deepEqual(document, before);
  const restored = await compile(parseAml(serializeAml(level.architecture)), { navigation: false });
  assert.ok(!restored.diagnostics.some(item => item.severity === "error"));
  assert.equal(restored.physicalHash, level.physicalHash);
  assert.deepEqual(restored.mesh, level.mesh);
  const finishes = (scene: typeof level) => scene.document.materials.map(({ source: _source, ...material }) =>
    Object.fromEntries(Object.entries(material).filter(([, value]) => value !== undefined)));
  assert.deepEqual(finishes(restored), finishes(level));
  const material = level.document.materials.find(entry => entry.id === "builtin:concrete")!;
  assert.ok(material.texture && material.normalTexture);
  const reads: string[] = [], bytes = image();
  const assets = await resolveExportAssets(level, async reference => { reads.push(reference); return bytes; });
  assert.deepEqual(new Set(reads), new Set(materialTextures(material)));
  assert.ok(Object.values(assets).every(asset => asset.bytes === bytes), "the supplied frozen reader is authoritative");
  assert.ok(toGLB(level, { assets }).byteLength > bytes.byteLength);
  const actual = await resolveExportAssets(level);
  assert.deepEqual(Object.keys(actual).sort(), Object.keys(assets).sort());
});

test("default dressing loads builtin inputs through the supplied snapshot reader", async () => {
  const source = slab.replace("</architecture>", `<dressing seed="library" detail="low">
    <floor host="floor" ground="patched" tile-share="0" timber-share="0" asphalt="0" litter="0" texture-density="32"/>
  </dressing></architecture>`);
  const document = parseAml(source), bytes = image(), references = new Set<string>();
  const level = await compile(document, { navigation: false, resolveMaterialImage: async reference => {
    references.add(reference); return bytes;
  } });
  assert.ok(!level.diagnostics.some(item => item.severity === "error"), JSON.stringify(level.diagnostics));
  assert.ok([...references].some(reference => reference.startsWith("levelspec-material:")));
  const hash = createHash("sha256").update(bytes).digest("hex");
  assert.deepEqual(new Set(Object.keys(level.surfaceAppearance!.sourceHashes)), references);
  assert.ok(Object.values(level.surfaceAppearance!.sourceHashes).every(value => value === hash));
  const native = structuredClone(document);
  delete (native.dressing!.rules[0] as { material?: string }).material;
  const nativeLevel = await compile(native, { navigation: false, resolveMaterialImage: async () => bytes });
  assert.ok(!nativeLevel.diagnostics.some(item => item.severity === "error"));
  assert.equal(nativeLevel.architecture.dressing!.rules[0].material, "builtin:concrete");
  assert.equal(nativeLevel.physicalHash, level.physicalHash);
  assert.equal(nativeLevel.renderHash, level.renderHash);
});

test("reserved library names reject unknown or modified definitions and preserve cancellation", async () => {
  const read = withBuiltinMaterialImages(async () => image());
  await assert.rejects(read("levelspec-material:../escape.png"), /Unknown library image/);
  await assert.rejects(compile(parseAml(slab.replace("builtin:concrete", "builtin:missing")), { navigation: false }), /Unknown library material/);
  const level = await compile(parseAml(slab), { navigation: false });
  const changed = structuredClone(level.architecture);
  changed.materials.find(entry => entry.id === "builtin:concrete")!.repeat *= 2;
  await assert.rejects(compile(changed, { navigation: false }), /reserved/);
  const controller = new AbortController();
  const pending = resolveExportAssets(level, async (_reference, signal) => {
    assert.equal(signal, controller.signal);
    controller.abort();
    return image();
  }, controller.signal);
  await assert.rejects(pending, /abort/i);
  assert.ok((await read("authored.png")).byteLength > 0);
});
