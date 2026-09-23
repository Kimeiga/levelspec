import { validateReceiverPages } from "../bake-bindings.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { compile, parseLevelSvgx } from "../../src/vector/index.ts";
import { validateLightingManifest } from "../../src/lighting/manifest.ts";
import { sourceForState, readState } from "../state.ts";
import { bakeLighting } from "../../src/lighting/bake.ts";
import { changedObjects } from "../geometry-change.ts";
const digest = (b: Uint8Array | string) =>
  createHash("sha256").update(b).digest("hex");
const presets = {
  clay: { height: 3, curve: 3 },
  chalk: { height: 5, curve: 6 },
  night: { height: 3.5, curve: 0 },
};
test("three actual Cycles bakes match source, albedo, UVs, calibration and every EXR checksum", async () => {
  for (const style of Object.keys(presets) as (keyof typeof presets)[]) {
    const source = sourceForState({
      ...readState(""),
      look: style,
      ...presets[style],
    });
    const level = await compile(parseLevelSvgx(source));
    const root = new URL(`../assets/bakes/${style}/`, import.meta.url);
    const binding = JSON.parse(
      gunzipSync(await readFile(new URL("binding.json.gz", root))).toString(),
    );
    assert.equal(binding.sourceHash, digest(source));
    assert.equal(binding.geometryHash, level.geometryHash);
    const corners = level.mesh.indices.flatMap((i) =>
      level.mesh.positions.slice(i * 3, i * 3 + 3),
    );
    assert.equal(binding.cornerHash, digest(JSON.stringify(corners)));
    assert.equal(binding.uv1.length, level.mesh.indices.length * 2);
    assert.equal(
      validateReceiverPages(level, binding.pages, binding.atlas.pages.length),
      style === "chalk" ? 7 : 0,
    );
    assert.ok(
      binding.uv1.every((v: number) => Number.isFinite(v) && v >= 0 && v <= 1),
    );
    await validateLightingManifest(
      { ...level, atlas: binding.atlas },
      binding.manifest,
    );
    for (const [ref, hash] of Object.entries(binding.manifest.materialAssets))
      assert.equal(
        digest(await readFile(new URL("../assets/" + ref, import.meta.url))),
        hash,
      );
    for (const page of binding.manifest.pages) {
      assert.ok(page.coverageTexels > 0);
      assert.ok(page.maximum > 0);
      for (const image of [page, ...page.mips])
        assert.equal(
          digest(await readFile(new URL(image.file, root))),
          image.sha256,
        );
    }
    const calibration = JSON.parse(
      await readFile(new URL("calibration.json", root), "utf8"),
    );
    assert.ok(
      Math.abs(calibration.calibration.irradianceDecodeMultiplier - Math.PI) <
        1e-8,
    );
    assert.ok(calibration.exr.packedReloadMaximumError < 1e-6);
  }
});
test("a changed floor invalidates a stored light bake and identifies only changed objects", async () => {
  const source = sourceForState(readState(""));
  const original = await compile(parseLevelSvgx(source));
  const edited = await compile(
    parseLevelSvgx(sourceForState({ ...readState(""), height: 5 })),
  );
  const binding = JSON.parse(
    gunzipSync(
      await readFile(
        new URL("../assets/bakes/clay/binding.json.gz", import.meta.url),
      ),
    ).toString(),
  );
  await assert.rejects(
    () =>
      validateLightingManifest(
        { ...edited, atlas: binding.atlas },
        binding.manifest,
      ),
    /Stale lighting/,
  );
  assert.equal(changedObjects(original, original).size, 0);
  const changed = changedObjects(original, edited);
  assert.ok(changed.has("stairs"));
  assert.ok(changed.has("bridge"));
  assert.ok(!changed.has("courtyard"));
});
test("textured bakes refuse unresolved images before trying native Blender", async () => {
  const level = await compile(parseLevelSvgx(sourceForState(readState(""))));
  await assert.rejects(
    () =>
      bakeLighting(level, {
        output: "/tmp/levelspec-test-never-created-missing-images",
      }),
    /unresolved texture/,
  );
});
test("a normal-size static face cannot silently fall back outside the atlas", async () => {
  const level = await compile(parseLevelSvgx(sourceForState(readState(""))));
  const binding = JSON.parse(
    gunzipSync(
      await readFile(
        new URL("../assets/bakes/clay/binding.json.gz", import.meta.url),
      ),
    ).toString(),
  );
  const pages = [...binding.pages];
  const index = level.mesh.surfaces.findIndex(
    (si) => level.surfaces[si].object === "courtyard",
  );
  assert.ok(index >= 0);
  pages[index] = -1;
  assert.throws(
    () => validateReceiverPages(level, pages, binding.atlas.pages.length),
    /visible static surface/,
  );
  pages[index] = 99;
  assert.throws(
    () => validateReceiverPages(level, pages, binding.atlas.pages.length),
    /page index/,
  );
});
