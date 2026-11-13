import { test } from "node:test";
import assert from "node:assert/strict";
import { PNG } from "pngjs";
import { compile, parseAml, serializeAml, resolveExportAssets, toGLB, toOBJ } from "levelspec";

/** Two slabs, one finished in a material carrying the given attributes. */
const source = (attributes: string) => `<architecture version="1" id="cutout" validation="premap">
  <material id="letters" color="#ffffff" ${attributes}/>
  <material id="plain" color="#888888"/>
  <profile id="plan" points="0 0; 2 0; 2 2; 0 2"/>
  <slab id="floor" profile="plan" material="letters" thickness="0.2"/>
  <slab id="deck" profile="plan" material="plain" thickness="0.2" elevation="2"/>
</architecture>`;

/** Decodes the standard GLB JSON chunk rather than relying on exporter metadata. */
function glbJson(bytes: Uint8Array) {
  const length = new DataView(bytes.buffer, bytes.byteOffset).getUint32(12, true);
  return JSON.parse(new TextDecoder().decode(bytes.subarray(20, 20 + length)));
}

test("an alpha cutoff round-trips, changes only render identity, and exports as a masked material", async () => {
  const document = parseAml(source('texture="glyphs.png" alpha-cutoff="0.5"'));
  assert.equal(document.materials[0].alphaCutoff, 0.5);
  assert.equal(document.materials[1].alphaCutoff, undefined);
  assert.equal(parseAml(serializeAml(document)).materials[0].alphaCutoff, 0.5);
  const level = await compile(document, { navigation: false });
  assert.deepEqual(level.diagnostics, []);
  const opaque = await compile(parseAml(source('texture="glyphs.png"')), { navigation: false });
  assert.notEqual(opaque.renderHash, level.renderHash);
  assert.equal(opaque.physicalHash, level.physicalHash);
  const image = new PNG({ width: 2, height: 2 });
  image.data.fill(255);
  const assets = await resolveExportAssets(level, async () => PNG.sync.write(image));
  const exported = (id: string) => glbJson(toGLB(level, { assets })).materials.find((material: { name: string }) => material.name === id);
  assert.equal(exported("letters").alphaMode, "MASK");
  assert.equal(exported("letters").alphaCutoff, 0.5);
  assert.equal(exported("plain").alphaMode, undefined);
  assert.equal(exported("plain").alphaCutoff, undefined);
  // A format that cannot cut the texture out refuses the level instead of drawing it opaque.
  assert.throws(() => toOBJ(level), /alpha cutoff/);
  assert.doesNotThrow(() => toOBJ(opaque));
});

test("an alpha cutoff without a texture or outside 0 to 1 is rejected at the material", () => {
  for (const attributes of [
    'alpha-cutoff="0.5"',
    'texture="glyphs.png" alpha-cutoff="0"',
    'texture="glyphs.png" alpha-cutoff="1"',
    'texture="glyphs.png" alpha-cutoff="-0.2"',
  ])
    assert.throws(
      () => parseAml(source(attributes)),
      (error: { diagnostics?: { code: string; objects: string[]; source?: unknown }[] }) =>
        Boolean(error.diagnostics?.some((d) => d.code === "AML_MATERIAL" && d.objects.includes("letters") && d.source)),
      attributes,
    );
});
