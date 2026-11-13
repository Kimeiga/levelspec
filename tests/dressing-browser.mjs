import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import { posix } from "node:path";
import { unzipSync, strFromU8 } from "fflate";
import {
  launchBrowser,
  testContext,
  waitForFrames,
} from "./browser/support/browser.mjs";

const base = process.env.BASE_URL || "http://127.0.0.1:5179/";
const output = "generated/dressing-demo/browser";
await mkdir(output, { recursive: true });
const browser = await launchBrowser();
const errors = [];

/** Waits for the real worker result and rendered frames. */
async function ready(page) {
  await page.locator('#status[data-state="ready"]').waitFor({ timeout: 60000 });
  await page.locator("#model[data-frames]").waitFor();
  await waitForFrames(page);
}

try {
  const context = await testContext(browser, {
    viewport: { width: 1440, height: 1000 },
    serviceWorkers: "block",
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${base}?theme=kowloon&appearance=full-render`);
  await ready(page);
  assert.match(await page.locator("#title").innerText(), /Kowloon/);
  assert.equal(await page.locator("#theme").inputValue(), "kowloon");
  await page.locator("#roofs").check();
  await page.locator("#fit").click();
  await waitForFrames(page);
  const camera = await page.locator("#model").getAttribute("data-camera");
  const detailedSummary = await page.locator("#summary").innerText();
  await page.screenshot({ path: `${output}/overview.png` });

  await page.locator("#theme").selectOption("blockout");
  await ready(page);
  assert.notEqual(await page.locator("#summary").innerText(), detailedSummary);
  assert.equal(
    await page.locator("#model").getAttribute("data-camera"),
    camera,
  );
  assert.equal(new URL(page.url()).searchParams.get("theme"), "blockout");
  await page.locator("#default-level").click();
  await ready(page);
  assert.equal(await page.locator("#theme").inputValue(), "kowloon");
  assert.equal(await page.locator("#summary").innerText(), detailedSummary);
  assert.equal(await page.locator("#appearance").inputValue(), "full-render");
  await page.locator("#appearance").selectOption("wireframe");
  await page.locator("#theme").selectOption("blockout");
  await ready(page);
  assert.equal(await page.locator("#appearance").inputValue(), "wireframe");
  await page.locator("#default-level").click();
  await ready(page);
  assert.equal(await page.locator("#appearance").inputValue(), "wireframe");
  await page.locator("#appearance").selectOption("full-render");
  await waitForFrames(page);


  for (const [selector, file] of [
    ["#download-model", "model.glb"],
    ["#download-package", "package.zip"],
  ]) {
    const waiting = page.waitForEvent("download");
    await page.locator(selector).click();
    const download = await waiting;
    await download.saveAs(`${output}/${file}`);
  }
  const model = await readFile(`${output}/model.glb`);
  assert.equal(model.toString("utf8", 0, 4), "glTF");
  const gltf = JSON.parse(model.toString("utf8", 20, 20 + model.readUInt32LE(12)));
  assert.ok(gltf.materials.some(material => material.name?.startsWith("$ground/") && material.normalTexture), "Downloaded ground retains its surface normals");
  const packageFiles = unzipSync(await readFile(`${output}/package.zip`));
  assert.match(
    strFromU8(packageFiles["level.aml"]),
    /base-wall="building-west-base"/,
  );
  assert.ok(packageFiles["dressing-demo.gltf"]?.length > 0);
  const packagedGltf = JSON.parse(strFromU8(packageFiles["dressing-demo.gltf"]));
  assert.ok(packagedGltf.images?.length > 0 && packagedGltf.buffers?.length > 0);
  const packageAsset = (uri) => {
    assert.ok(typeof uri === "string" && uri.length > 0, "Asset URI is required");
    if (uri.startsWith("data:")) {
      const embedded = /^data:[^,]*;base64,([A-Za-z0-9+/]+={0,2})$/.exec(uri);
      assert.ok(embedded, "Embedded export assets must contain base64 data");
      const bytes = Buffer.from(embedded[1], "base64");
      assert.ok(bytes.length > 0);
      return bytes;
    }
    const decoded = decodeURIComponent(uri);
    assert.ok(!/^(?:[a-z][a-z0-9+.-]*:|[/\\])/i.test(decoded) && !decoded.includes("\\"), "Asset URI must be portable");
    const path = posix.normalize(decoded);
    assert.ok(path !== ".." && !path.startsWith("../"), "Asset URI must stay inside its package");
    const bytes = packageFiles[path];
    assert.ok(bytes?.length > 0, `Missing packaged asset: ${path}`);
    return bytes;
  };
  const packagedBuffers = packagedGltf.buffers.map(buffer => {
    const bytes = packageAsset(buffer.uri);
    assert.equal(bytes.length, buffer.byteLength);
    return bytes;
  });
  for (const image of packagedGltf.images) {
    if (image.uri !== undefined) packageAsset(image.uri);
    else {
      assert.ok(Number.isInteger(image.bufferView) && image.bufferView >= 0);
      const view = packagedGltf.bufferViews?.[image.bufferView];
      assert.ok(view && Number.isInteger(view.buffer) && packagedBuffers[view.buffer]);
      assert.ok(Number.isInteger(view.byteLength) && view.byteLength > 0);
      assert.ok(Number.isInteger(view.byteOffset ?? 0) && (view.byteOffset ?? 0) >= 0);
      assert.ok((view.byteOffset ?? 0) + view.byteLength <= packagedBuffers[view.buffer].length);
      assert.ok(typeof image.mimeType === "string" && image.mimeType.startsWith("image/"));
    }
  }

  await page.locator("#file").setInputFiles("tests/fixtures/aml/showcase.aml");
  await ready(page);
  assert.equal(await page.locator("#theme").isDisabled(), true);
  assert.equal(await page.locator("#download-model").isVisible(), false);
  assert.equal(new URL(page.url()).searchParams.has("theme"), false);
  await page.locator("#default-level").click();
  await ready(page);

  const denyPreset = (route) => route.abort();
  await context.route("**/*preview*.json*", denyPreset);
  await page.locator("#theme").selectOption("blockout");
  await page.locator("#retry").waitFor({ state: "visible" });
  await context.unroute("**/*preview*.json*", denyPreset);
  await page.locator("#default-level").click();
  await ready(page);
  assert.equal(await page.locator("#theme").inputValue(), "kowloon");

  await page.setViewportSize({ width: 390, height: 844 });
  await waitForFrames(page);
  const controls = await page
    .locator("#default-level, #theme, #download-model, #download-package")
    .evaluateAll((elements) =>
      elements.map((element) => {
        const bounds = element.getBoundingClientRect();
        return {
          id: element.id,
          left: bounds.left,
          right: bounds.right,
          height: bounds.height,
        };
      }),
    );
  assert.ok(
    controls.every(
      (control) =>
        control.left >= 0 && control.right <= 390 && control.height > 0,
    ),
    JSON.stringify(controls),
  );
  await page.screenshot({ path: `${output}/mobile.png` });
  assert.deepEqual(errors, []);
  await context.close();
  if (process.env.SITE_URL) {
    const offline = await testContext(browser, {
      viewport: { width: 1440, height: 1000 },
    });
    const site = await offline.newPage();
    site.on("pageerror", (error) => errors.push(error.message));
    await site.goto(
      `${process.env.SITE_URL}?theme=kowloon&appearance=full-render`,
    );
    await ready(site);
    await site
      .locator("#offline")
      .filter({ hasText: "Ready offline" })
      .waitFor({ timeout: 60000 });
    await site.evaluate(async () => {
      await navigator.serviceWorker.ready;
      if (!navigator.serviceWorker.controller)
        await new Promise((resolve) =>
          navigator.serviceWorker.addEventListener(
            "controllerchange",
            resolve,
            { once: true },
          ),
        );
    });
    await offline.setOffline(true);
    await site.reload();
    await ready(site);
    await site.locator("#theme").selectOption("blockout");
    await ready(site);
    await site.locator("#default-level").click();
    await ready(site);
    const downloads = await site
      .locator("#download-model, #download-package")
      .evaluateAll(async (links) =>
        Promise.all(
          links.map(async (link) => {
            const response = await fetch(link.href);
            return response.ok && (await response.arrayBuffer()).byteLength > 0;
          }),
        ),
      );
    assert.deepEqual(downloads, [true, true]);
    assert.deepEqual(errors, []);
    await site.screenshot({ path: `${output}/offline.png` });
    await offline.close();
    console.log(
      "PASS offline site reload, theme switch, textures and downloads",
    );
  }
  console.log(
    "PASS default level, themes, camera, downloads, custom-file recovery, failed-load recovery, mobile controls",
  );
} finally {
  await browser.close();
}
