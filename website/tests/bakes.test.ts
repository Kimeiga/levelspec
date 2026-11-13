import { COURTYARD_BAKE_PRESETS } from "../../tools/fixtures/courtyard/bake-presets.ts";
import { validateReceiverPages } from "../../tests/fixtures/courtyard/bake-bindings.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { compile, parseAml } from "levelspec";
import { validateLightingManifest } from "../../src/lighting/manifest.ts";
import { sourceForState } from "../../tools/fixtures/courtyard/variants.ts";
import { bakeLighting } from "../../src/lighting/bake.ts";
const digest = (b: Uint8Array | string) =>
  createHash("sha256").update(b).digest("hex");
const presets = COURTYARD_BAKE_PRESETS;
test("three actual Cycles bakes match source, albedo, UVs, calibration and every EXR checksum", async () => {
  for (const style of Object.keys(presets) as (keyof typeof presets)[]) {
    const source = sourceForState({
      look: style,
      ...presets[style],
    });
    const level = await compile(parseAml(source));
    const root = new URL(`../../tests/fixtures/lighting/courtyard/${style}/`, import.meta.url);
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
      0,
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
test("a changed floor invalidates a stored light bake", async () => {
  const edited = await compile(
    parseAml(sourceForState({ height: 5 })),
  );
  const binding = JSON.parse(
    gunzipSync(
      await readFile(
        new URL("../../tests/fixtures/lighting/courtyard/clay/binding.json.gz", import.meta.url),
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

});
test("textured bakes refuse unresolved images before trying native Blender", async () => {
  const level = await compile(parseAml(sourceForState()));
  await assert.rejects(
    () =>
      bakeLighting(level, {
        output: "/tmp/levelspec-test-never-created-missing-images",
      }),
    /unresolved texture/,
  );
});
