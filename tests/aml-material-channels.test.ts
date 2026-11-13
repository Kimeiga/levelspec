import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";
import { validateBytes, validateString } from "gltf-validator";
import {
  architectureCompanions,
  compile,
  exportMetadata,
  parseAml,
  resolveExportAssets,
  serializeAml,
  toGLB,
  toGLTF,
  toRuntime,
} from "levelspec";

const source = `<architecture version="1" id="material-channels" validation="premap">
  <material id="finish" color="#aabbcc" repeat="2" roughness="0.7" metalness="0.3"
    texture="color.png" normal-texture="normal.png" normal-scale="0.8"
    metallic-roughness-texture="properties.png" height-texture="height.png"
    height-scale="0.025" height-offset="-0.006"/>
  <profile id="plan" points="0 0; 3 0; 3 2; 0 2"/>
  <slab id="floor" profile="plan" material="finish" thickness="0.2"/>
  <marker id="start" kind="spawn" element="floor" position="1 1 0"/>
</architecture>`;

/** Makes a small authored channel image with known bytes and no color metadata. */
function imageBytes(color: readonly number[]): Uint8Array {
  const image = new PNG({ width: 2, height: 2 });
  for (let i = 0; i < 4; i++) image.data.set(color, i * 4);
  return new Uint8Array(PNG.sync.write(image));
}

/** Reads the public GLB container, independent of exporter object bookkeeping. */
function glbParts(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const jsonLength = view.getUint32(12, true);
  return {
    json: JSON.parse(new TextDecoder().decode(bytes.subarray(20, 20 + jsonLength))),
    binary: bytes.subarray(28 + jsonLength),
  };
}

/** Resolves a standard glTF texture binding to the image bytes in its GLB chunk. */
function embeddedImage(parts: ReturnType<typeof glbParts>, textureIndex: number): Uint8Array {
  const image = parts.json.images[parts.json.textures[textureIndex].source];
  const view = parts.json.bufferViews[image.bufferView];
  return parts.binary.slice(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength);
}

/** Requires an actual material error with an inspectable source location. */
function materialError(error: unknown): boolean {
  const diagnostics = (error as { diagnostics?: { severity: string; objects?: string[]; source?: unknown }[] }).diagnostics;
  assert.ok(diagnostics?.some((diagnostic) => diagnostic.severity === "error" &&
    diagnostic.objects?.includes("finish") && diagnostic.source));
  return true;
}

test("AML material channels round-trip as companions and change render identity without changing physical geometry", async () => {
  const document = parseAml(source);
  const original = structuredClone(document);
  const material = document.materials[0];
  assert.equal(material.metallicRoughnessTexture, "properties.png");
  assert.equal(material.heightTexture, "height.png");
  assert.equal(material.heightScale, 0.025);
  assert.equal(material.heightOffset, -0.006);
  assert.deepEqual(architectureCompanions(document).sort(), ["color.png", "height.png", "normal.png", "properties.png"]);
  const restored = parseAml(serializeAml(document)).materials[0];
  for (const key of ["metallicRoughnessTexture", "heightTexture", "heightScale", "heightOffset"] as const)
    assert.equal(restored[key], material[key]);
  const baseline = await compile(document);
  assert.deepEqual(baseline.diagnostics.filter((diagnostic) => diagnostic.severity === "error"), []);
  for (const change of [
    { metallicRoughnessTexture: "other-properties.png" },
    { heightTexture: "other-height.png" },
    { heightScale: 0 },
    { heightOffset: 0.01 },
  ]) {
    const changed = structuredClone(document);
    Object.assign(changed.materials[0], change);
    const result = await compile(changed);
    assert.deepEqual(result.diagnostics.filter((diagnostic) => diagnostic.severity === "error"), []);
    assert.notEqual(result.renderHash, baseline.renderHash);
    assert.equal(result.physicalHash, baseline.physicalHash);
    assert.deepEqual(result.physicalMesh, baseline.physicalMesh);
    assert.deepEqual(result.navigation, baseline.navigation);
    assert.deepEqual(result.mesh, baseline.mesh, "Height input alone does not promise displacement of an undressed slab");
  }
  assert.deepEqual(document, original);
  const shared = structuredClone(document);
  shared.materials[0].heightTexture = "properties.png";
  assert.equal(architectureCompanions(shared).filter((name) => name === "properties.png").length, 1);
});

test("GLB and external glTF preserve packed material bytes and scalar factors while omitting generation-only height input", async () => {
  const level = await compile(parseAml(source), { navigation: false });
  assert.deepEqual(level.diagnostics.filter((diagnostic) => diagnostic.severity === "error"), []);
  const images = new Map([
    ["color.png", imageBytes([160, 180, 200, 255])],
    ["normal.png", imageBytes([150, 170, 239, 255])],
    ["properties.png", imageBytes([17, 128, 64, 255])],
  ]);
  const requests: string[] = [];
  const assets = await resolveExportAssets(level, async (reference) => {
    requests.push(reference);
    assert.ok(images.has(reference), `Only exported visual channels require bytes: ${reference}`);
    return images.get(reference)!;
  });
  assert.deepEqual(requests.sort(), [...images.keys()].sort());
  const glb = toGLB(level, { assets });
  const parts = glbParts(glb);
  const material = parts.json.materials.find((entry: { name: string }) => entry.name === "finish");
  assert.ok(material);
  assert.equal(material.pbrMetallicRoughness.roughnessFactor, 0.7);
  assert.equal(material.pbrMetallicRoughness.metallicFactor, 0.3);
  assert.equal(material.normalTexture.scale, 0.8);
  assert.ok(material.pbrMetallicRoughness.metallicRoughnessTexture, "The authored packed map must be bound to the standard glTF PBR slot");
  assert.equal(material.pbrMetallicRoughness.metallicRoughnessTexture.texCoord ?? 0, 0);
  assert.equal(parts.json.images.length, 3, "Height is an appearance-generation input, not an extra glTF material texture");
  for (const [binding, file] of [
    [material.pbrMetallicRoughness.baseColorTexture, "color.png"],
    [material.normalTexture, "normal.png"],
    [material.pbrMetallicRoughness.metallicRoughnessTexture, "properties.png"],
  ] as const) {
    assert.ok(binding);
    assert.deepEqual(embeddedImage(parts, binding.index), images.get(file));
  }
  const properties = PNG.sync.read(Buffer.from(embeddedImage(parts, material.pbrMetallicRoughness.metallicRoughnessTexture.index)));
  assert.deepEqual([...properties.data.subarray(0, 4)], [17, 128, 64, 255], "Linear G roughness / B metallic channels are neither swapped nor gamma transformed");
  assert.equal((await validateBytes(glb)).issues.numErrors, 0);
  const bundle = toGLTF(level, { assets });
  const json = JSON.parse(bundle["material-channels.gltf"] as string);
  const exported = json.materials.find((entry: { name: string }) => entry.name === "finish");
  const texture = exported.pbrMetallicRoughness.metallicRoughnessTexture;
  const image = json.images[json.textures[texture.index].source];
  assert.deepEqual(bundle[image.uri], images.get("properties.png"));
  assert.equal((await validateString(bundle["material-channels.gltf"] as string, {
    externalResourceFunction: async (uri: string) => new Uint8Array(bundle[uri] as Uint8Array),
  })).issues.numErrors, 0);
  assert.doesNotThrow(() => toGLB(level, { purpose: "collision" }), "An already compiled collision export does not resolve visual companions");
});

test("packed roughness inputs cannot silently disappear when an export companion is missing or invalid", async () => {
  const document = parseAml(source);
  delete document.materials[0].texture;
  delete document.materials[0].normalTexture;
  delete document.materials[0].normalScale;
  const level = await compile(document, { navigation: false });
  assert.throws(() => toGLB(level), /properties\.png/);
  await assert.rejects(resolveExportAssets(level, async () => { throw new Error("missing companion"); }), /properties\.png.*missing companion/);
  await assert.rejects(resolveExportAssets(level, async () => new Uint8Array([1, 2, 3])), /PNG or JPEG/);
});

test("completed generated images resolve from the compiled result without authored-companion I/O", async () => {
  const document = parseAml(`<architecture version="1" id="generated-material"><material id="finish"/>
    <box id="box" width="1" depth="1" height="1" material="finish"/></architecture>`);
  const level = await compile(document, { navigation: false });
  const bytes = imageBytes([40, 90, 150, 255]);
  const hash = [...new Uint8Array(await crypto.subtle.digest("SHA-256", Uint8Array.from(bytes).buffer))]
    .map((byte) => byte.toString(16).padStart(2, "0")).join("");
  const reference = `generated/${hash}.png`;
  level.document.materials.find((material) => material.id === "finish")!.texture = reference;
  level.generatedImages = {
    [reference]: { bytes, hash, file: `textures/${hash}.png`, mimeType: "image/png" },
  };
  const original = structuredClone(level.generatedImages);
  const assets = await resolveExportAssets(level, async (name) => {
    assert.fail(`Generated output must not be requested from authored files: ${name}`);
  });
  assert.deepEqual(assets[reference].bytes, bytes);
  assert.equal(assets[reference].hash, hash);
  const binary = toGLB(level, { assets });
  const parts = glbParts(binary);
  const material = parts.json.materials.find((entry: { name: string }) => entry.name === "finish");
  assert.deepEqual(embeddedImage(parts, material.pbrMetallicRoughness.baseColorTexture.index), bytes);
  const manifest = { [reference]: { hash, file: `textures/${hash}.png`, mimeType: "image/png" } };
  assert.deepEqual(toRuntime(level).generatedImages, manifest);
  assert.deepEqual(exportMetadata(level, ["gltf"]).generatedImages, manifest);
  const external = toGLTF(level, { assets });
  const externalJson = JSON.parse(external["generated-material.gltf"] as string);
  assert.equal(externalJson.images[0].uri, manifest[reference].file);
  assert.deepEqual(external[manifest[reference].file], bytes);
  assert.deepEqual(level.generatedImages, original, "Export must not detach or mutate the completed image payload");
});

test("explicit material opacity round-trips and uses standard glTF blending while opacity one remains opaque", async () => {
  for (const opacity of [0, 0.45, 1]) {
    const xml = `<architecture version="1" id="opacity"><material id="finish" color="#8090a0" opacity="${opacity}"/>
      <box id="box" width="1" depth="1" height="1" material="finish"/></architecture>`;
    const document = parseAml(xml);
    assert.equal(document.materials[0].opacity, opacity);
    assert.equal(parseAml(serializeAml(document)).materials[0].opacity, opacity);
    const level = await compile(document, { navigation: false });
    assert.deepEqual(level.diagnostics.filter((diagnostic) => diagnostic.severity === "error"), []);
    const binary = toGLB(level);
    const material = glbParts(binary).json.materials.find((entry: { name: string }) => entry.name === "finish");
    assert.equal(material.pbrMetallicRoughness.baseColorFactor[3], opacity);
    assert.equal(material.alphaMode ?? "OPAQUE", opacity < 1 ? "BLEND" : "OPAQUE");
    assert.equal(material.alphaCutoff, undefined);
    assert.equal((await validateBytes(binary)).issues.numErrors, 0);
  }
  const cutout = parseAml(source.replace('roughness="0.7"', 'roughness="0.7" opacity="1" alpha-cutoff="0.5"'));
  const level = await compile(cutout, { navigation: false });
  const assets = await resolveExportAssets(level, async () => imageBytes([128, 128, 255, 255]));
  const material = glbParts(toGLB(level, { assets })).json.materials.find((entry: { name: string }) => entry.name === "finish");
  assert.equal(material.alphaMode, "MASK", "Explicit full opacity remains compatible with cutout coverage");
  assert.equal(material.alphaCutoff, 0.5);
  assert.equal(material.pbrMetallicRoughness.baseColorFactor[3], 1);
});

test("invalid material-channel XML and native values retain source-linked errors", async () => {
  const invalid: Record<string, unknown>[] = [
    { metallicRoughnessTexture: "" },
    { metallicRoughnessTexture: "  " },
    { heightTexture: "" },
    { heightScale: -0.01 },
    { heightScale: NaN },
    { heightScale: Infinity },
    { heightOffset: Infinity },
    { heightOffset: NaN },
    { heightTexture: undefined, heightScale: 0.01 },
    { heightTexture: undefined, heightScale: undefined, heightOffset: 0 },
    { opacity: -0.01 },
    { opacity: 1.01 },
    { opacity: NaN },
    { opacity: 0.5, alphaCutoff: 0.5 },
  ];
  for (const change of invalid) {
    const document = parseAml(source);
    Object.assign(document.materials[0], change);
    await assert.rejects(compile(document, { navigation: false }), materialError);
  }
  for (const xml of [
    source.replace('metallic-roughness-texture="properties.png"', 'metallic-roughness-texture=""'),
    source.replace('height-scale="0.025"', 'height-scale="-1"'),
    source.replace('height-offset="-0.006"', 'height-offset="Infinity"'),
    source.replace('height-texture="height.png"', ""),
    source.replace('height-scale="0.025"', 'height-scale="0.025" opacity="1.1"'),
    source.replace('height-scale="0.025"', 'height-scale="0.025" opacity="0.5" alpha-cutoff="0.5"'),
  ]) assert.throws(() => parseAml(xml), materialError);
});

test("the published schema accepts complete, default-height and transparent materials", (context) => {
  const available = spawnSync("xmllint", ["--version"]);
  if ((available.error as NodeJS.ErrnoException | undefined)?.code === "ENOENT") {
    context.skip("Optional xmllint XML Schema validator is unavailable.");
    return;
  }
  const schema = fileURLToPath(new URL("../schema/aml.xsd", import.meta.url));
  const defaultHeight = source.replace('height-scale="0.025" height-offset="-0.006"', "");
  for (const xml of [source, defaultHeight, source.replace('roughness="0.7"', 'roughness="0.7" opacity="0.4"')]) {
    for (const text of [xml, serializeAml(parseAml(xml))]) {
      const result = spawnSync("xmllint", ["--nonet", "--noout", "--schema", schema, "-"], { input: text, encoding: "utf8" });
      assert.equal(result.status, 0, result.stderr);
    }
  }
});
