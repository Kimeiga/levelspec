/** Normal companions, color-space ownership, runtime relief, and portable GLB shading. */
import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PNG } from "pngjs";
import { compile, parseAml, resolveExportAssets, toGLB } from "levelspec";
import { startPreview } from "../src/cli/preview.ts";
import { launchBrowser, waitForFrames } from "./browser/support/browser.mjs";

const directory = await mkdtemp(join(tmpdir(), "levelspec-normal-"));
const output = "generated/normal-material-browser";
await mkdir(output, { recursive: true });
const source = `<architecture version="1" id="normal-calibration" validation="premap">
  <material id="rough" color="#888888" normal-texture="normal.png" normal-scale="1"/>
  <profile id="plan" points="0 0; 2 0; 2 2; 0 2"/>
  <slab id="floor" profile="plan" material="rough" thickness="0.2"/>
</architecture>`;
const texture = new PNG({ width: 16, height: 16 });
for (let i = 0; i < 256; i++) texture.data.set([160, 195, 230, 255], i * 4);
const image = PNG.sync.write(texture),
  file = join(directory, "level.aml");
await writeFile(file, source);
await writeFile(join(directory, "normal.png"), image);
const level = await compile(parseAml(source), { navigation: false });
assert.ok(!level.diagnostics.some((d) => d.severity === "error"));
const assets = await resolveExportAssets(level, async () => image);
const binary = toGLB(level, { assets });
const atlased = await compile(parseAml(source), {
  navigation: false,
  uvs: true,
  uv: { resolution: 64, density: 2 },
});
assert.ok(!atlased.diagnostics.some((d) => d.severity === "error"));
const tangentBinary = toGLB(atlased, { assets });
let server, browser;
const errors = [];

/** Measures a fixed central receiver patch, away from silhouette and cast-shadow boundaries. */
function average(image) {
  let total = 0,
    count = 0;
  for (let y = 340; y < 380; y++)
    for (let x = 380; x < 420; x++) {
      const i = (y * image.width + x) * 4;
      total += image.data[i] + image.data[i + 1] + image.data[i + 2];
      count += 3;
    }
  return total / count;
}

try {
  server = await startPreview(file, { port: 0 });
  browser = await launchBrowser();
  const page = await browser.newPage({
    viewport: { width: 800, height: 720 },
    deviceScaleFactor: 1,
  });
  page.on("pageerror", (error) => errors.push(error.message));
  const response = page.waitForResponse((r) =>
    /\/__levelspec\/[^/]+\/source$/.test(new URL(r.url()).pathname),
  );
  await page.goto(server.url);
  const payload = await (await response).json();
  assert.deepEqual(
    Buffer.from(payload.files["normal.png"]),
    image,
    "Live preview must deliver the normal-only companion",
  );
  await page.route(
    (url) => url.pathname === "/",
    (route) =>
      route.fulfill({
        contentType: "text/html",
        body: '<html><body style="margin:0"><div id="model" style="width:100vw;height:100vh"></div></body></html>',
      }),
  );
  await page.goto(server.url);
  await page.evaluate(
    async ({ level, image }) => {
      const { ReviewScene } = await import("/review/scene.ts");
      window.fixture = level;
      window.review = new ReviewScene(
        document.querySelector("#model"),
        () => {},
        () => {},
        () => {},
      );
      window.assetURLs = { "normal.png": image };
      window.options = {
        layer: "",
        roofs: true,
        cut: 2,
        appearance: "full-render",
        movement: "",
        selected: "",
        issues: false,
      };
      const prepared = await review.prepareAssets(fixture, assetURLs);
      review.setLevel(fixture, options, true, prepared);
      review.overview.setView({
        projection: "orthographic",
        position: [1, -2, 3],
        target: [1, 1, 0],
        viewHeight: 3,
      });
    },
    { level, image: `data:image/png;base64,${image.toString("base64")}` },
  );
  await page.waitForFunction(() =>
    review.model.children
      .filter((o) => o.isMesh)
      .every((o) => o.material.normalMap?.image?.width),
  );
  await waitForFrames(page, 3);
  const native = PNG.sync.read(
    await page.screenshot({ path: join(output, "native.png") }),
  );
  for (const [name, bytes] of [
    ["generated", binary],
    ["precomputed", tangentBinary],
  ]) {
    await page.evaluate(async (bytes) => {
      const { GLTFLoader } = await import(
        "/node_modules/three/examples/jsm/loaders/GLTFLoader.js"
      );
      const { DoubleSide } = await import(
        "/node_modules/three/build/three.module.js"
      );
      const gltf = await new GLTFLoader().parseAsync(
        new Uint8Array(bytes).buffer,
        "",
      );
      window.imported = gltf.scene;
      imported.rotation.x = Math.PI / 2;
      imported.traverse((o) => {
        if (o.isMesh) {
          o.material.envMapIntensity = 0.8;
          o.material.side = DoubleSide;
          o.castShadow = true;
          o.receiveShadow = true;
        }
      });
      review.model.visible = false;
      review.scene.add(imported);
      review.renderer.shadowMap.needsUpdate = true;
      review.invalidate();
    }, Array.from(bytes));
    await waitForFrames(page, 4);
    const exported = PNG.sync.read(
      await page.screenshot({ path: join(output, `exported-${name}.png`) }),
    );
    console.log(
      "NORMAL SHADING",
      JSON.stringify({
        name,
        native: average(native),
        exported: average(exported),
      }),
    );
    assert.ok(
      Math.abs(average(native) - average(exported)) < 2,
      `Preview and exported GLB must agree on normal-map handedness: ${name}`,
    );
    await page.evaluate(() => review.scene.remove(imported));
  }
  await page.evaluate(() => {
    review.scene.remove(imported);
    review.model.visible = true;
    fixture = structuredClone(fixture);
    fixture.document.materials[0].normalScale = 0;
    review.setLevel(fixture, options);
  });
  await waitForFrames(page, 4);
  const flat = PNG.sync.read(
    await page.screenshot({ path: join(output, "flat.png") }),
  );
  assert.ok(
    Math.abs(average(native) - average(flat)) > 5,
    "Normals must visibly affect lighting, not only populate a material property",
  );
  const cache = await page.evaluate(async () => {
    fixture = structuredClone(fixture);
    fixture.document.materials[0].texture = "normal.png";
    fixture.document.materials[0].normalScale = 1;
    const prepared = await review.prepareAssets(fixture, assetURLs);
    review.setLevel(fixture, options, false, prepared);
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const material = review.model.children.find((o) => o.isMesh).material;
    return {
      different: material.map !== material.normalMap,
      color: material.map.colorSpace,
      normal: material.normalMap.colorSpace,
    };
  });
  assert.deepEqual(cache, { different: true, color: "srgb", normal: "" });
  const lifecycle = await page.evaluate(async () => {
    const before = review.model.children.find((o) => o.isMesh).material;
    const images = [before.map, before.normalMap];
    let disposed = 0;
    for (const texture of images)
      texture.addEventListener("dispose", () => disposed++);
    review.setLevel(fixture, { ...options, appearance: "wireframe" });
    const wireframe = review.model.children
      .filter((o) => o.isMesh)
      .every((o) => !o.material.map && !o.material.normalMap);
    const prepared = await review.prepareAssets(fixture, assetURLs);
    review.setLevel(fixture, options, false, prepared);
    return { wireframe, disposed };
  });
  assert.equal(lifecycle.wireframe, true);
  assert.equal(lifecycle.disposed, 2);
  await page.route("**/shared-cache.png", route => route.fulfill({ contentType: "image/png", body: image }));
  await page.route("**/cancel-cache.png", route => route.fulfill({ contentType: "image/png", body: image }));
  const aliasLevel = await compile(parseAml(source.replace("</architecture>",
    '<material id="alias" color="#888888"/><box id="alias-box" position="3 0 0" width="1" depth="1" height="1" material="alias"/></architecture>')),
    { navigation: false });
  assert.ok(!aliasLevel.diagnostics.some(diagnostic => diagnostic.severity === "error"));
  const reuse = await page.evaluate(async ({ bytes, hash, aliasLevel }) => {
    const { prepareReviewTextures, ReviewTextures } = await import("/review/material-assets.ts");
    const nativeDecode = HTMLImageElement.prototype.decode;
    const originalAdd = ReviewTextures.prototype.add;
    const createURL = URL.createObjectURL, revokeURL = URL.revokeObjectURL;
    const created = [], revoked = new Set();
    let owned = new Map(), decodes = 0, abortOn = "", controller;
    HTMLImageElement.prototype.decode = function () {
      decodes++;
      if (this.src === abortOn) { abortOn = ""; controller.abort(); }
      return nativeDecode.call(this);
    };
    ReviewTextures.prototype.add = function (reference, color, image) {
      originalAdd.call(this, reference, color, image);
      const texture = this.get(reference, color);
      if (!owned.has(texture)) {
        const record = { texture, disposed: 0 };
        owned.set(texture, record);
        texture.addEventListener("dispose", () => record.disposed++);
      }
    };
    URL.createObjectURL = function (blob) { const url = createURL.call(URL, blob); created.push(url); return url; };
    URL.revokeObjectURL = function (url) { revoked.add(url); return revokeURL.call(URL, url); };
    const sharedURL = new URL("/shared-cache.png", location.href).href;
    const cases = [], failures = [];
    try {
      for (const mode of ["url", "generated"]) {
        owned = new Map(); decodes = 0;
        const candidate = structuredClone(aliasLevel), base = candidate.document.materials[0];
        const refs = ["color-a.png", "normal-a.png", "properties-a.png", "color-b.png", "normal-b.png", "properties-b.png"];
        candidate.document.materials = [
          { ...base, texture: refs[0], normalTexture: refs[1], metallicRoughnessTexture: refs[2] },
          { ...base, id: "alias", texture: refs[3], normalTexture: refs[4], metallicRoughnessTexture: refs[5] },
          { ...base, id: "unused", texture: "not-supplied.png" },
        ];
        const urls = Object.fromEntries(refs.map((reference, index) => [reference, index % 2 ? sharedURL : "/shared-cache.png"]));
        if (mode === "generated") {
          candidate.generatedImages = Object.fromEntries(refs.map(reference => [reference,
            { bytes: new Uint8Array(bytes), hash, mimeType: "image/png", file: `textures/${hash}.png` }]));
          for (const reference of refs) urls[reference] = "/must-not-fetch-generated.png";
        }
        const prepared = await prepareReviewTextures(candidate, urls);
        const color = prepared.get(refs[0], true), linear = prepared.get(refs[1], false);
        const report = {
          mode, decodes, unique: owned.size,
          sharedColor: color === prepared.get(refs[3], true),
          sharedLinear: [refs[2], refs[4], refs[5]].every(reference => linear === prepared.get(reference, false)),
          distinctInterpretations: color !== linear,
          sharedImage: color.image === linear.image,
          colorSpace: color.colorSpace, linearSpace: linear.colorSpace,
        };
        const before = [...owned.values()].map(record => record.texture.version);
        prepared.restore();
        report.restoreDeltas = [...owned.values()].map((record, index) => record.texture.version - before[index]);
        prepared.dispose(); prepared.dispose();
        report.disposals = [...owned.values()].map(record => record.disposed);
        report.cleared = refs.every(reference => !prepared.get(reference, true) && !prepared.get(reference, false));
        cases.push(report);
      }
      for (const mode of ["failure", "cancel"]) {
        owned = new Map(); decodes = 0;
        controller = new AbortController();
        const candidate = structuredClone(fixture);
        candidate.document.materials[0] = { ...candidate.document.materials[0], texture: "ok.png", normalTexture: "bad.png" };
        const badURL = mode === "failure" ? "data:image/png;base64,AAAA" : new URL("/cancel-cache.png", location.href).href;
        abortOn = mode === "cancel" ? badURL : "";
        let error, unexpected;
        try { unexpected = await prepareReviewTextures(candidate, { "ok.png": sharedURL, "bad.png": badURL }, controller.signal); }
        catch (caught) { error = { name: caught.name, message: caught.message }; }
        unexpected?.dispose();
        const report = { mode, error, allocated: owned.size, disposals: [...owned.values()].map(record => record.disposed) };
        owned = new Map(); decodes = 0; abortOn = "";
        const recovered = await prepareReviewTextures(candidate, { "ok.png": sharedURL, "bad.png": sharedURL });
        report.recovered = !!recovered.get("ok.png", true) && !!recovered.get("bad.png", false) && decodes === 1;
        recovered.dispose();
        report.recoveryDisposals = [...owned.values()].map(record => record.disposed);
        failures.push(report);
      }
      return { cases, failures, blobsRevoked: created.length > 0 && created.every(url => revoked.has(url)) };
    } finally {
      HTMLImageElement.prototype.decode = nativeDecode;
      ReviewTextures.prototype.add = originalAdd;
      URL.createObjectURL = createURL; URL.revokeObjectURL = revokeURL;
    }
  }, { bytes: Array.from(image), hash: assets["normal.png"].hash, aliasLevel });
  for (const result of reuse.cases) {
    assert.equal(result.decodes, 1, `${result.mode}: source aliases decoded the image more than once`);
    assert.equal(result.unique, 2, `${result.mode}: aliases allocated extra color-space textures`);
    assert.equal(result.sharedColor, true);
    assert.equal(result.sharedLinear, true);
    assert.equal(result.distinctInterpretations, true);
    assert.equal(result.sharedImage, true);
    assert.equal(result.colorSpace, "srgb"); assert.equal(result.linearSpace, "");
    assert.deepEqual(result.restoreDeltas, [1, 1]);
    assert.deepEqual(result.disposals, [1, 1]);
    assert.equal(result.cleared, true);
  }
  for (const result of reuse.failures) {
    assert.ok(result.error, `${result.mode}: preparation unexpectedly succeeded`);
    if (result.mode === "failure") assert.match(result.error.message, /bad\.png/);
    else assert.equal(result.error.name, "AbortError");
    assert.ok(result.allocated > 0, "Failure fixture never reached partial texture allocation");
    assert.ok(result.disposals.every(count => count === 1), "Failed preparation leaked or disposed a texture twice");
    assert.equal(result.recovered, true, "Failed preparation poisoned later source reuse");
    assert.deepEqual(result.recoveryDisposals, [1, 1]);
  }
  assert.equal(reuse.blobsRevoked, true, "Generated source aliases leaked an object URL");
  assert.deepEqual(errors, []);
  console.log(
    "PASS normal companion, GLB appearance, source reuse, color-space ownership, cancellation, and disposal",
  );
} finally {
  await browser?.close();
  await server?.close();
  await rm(directory, { recursive: true, force: true });
}
