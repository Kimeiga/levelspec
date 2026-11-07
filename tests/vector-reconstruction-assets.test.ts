import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile, rename } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { PNG } from "pngjs";
import { SceneBuilder, compile, createGLBAssetResolver, parseLevelSvgx,
  renderReference, serializeLevelSvgx, toGLB } from "../src/vector/index.ts";
import { runReconstruction } from "../src/reconstruction/loop.ts";
import { createCompanionStore } from "../tools/reconstruct-assets.ts";

const cli = fileURLToPath(new URL("../tools/reconstruct.ts", import.meta.url));

/** A native floor and two independently loaded, transformed visual companions. */
async function fixture(root: string) {
  const scene = new SceneBuilder("asset-reconstruction");
  const group = scene.group("court");
  const floor = group.platform("floor", { width: 8, depth: 8, material: "default" });
  scene.document.markers.push({ id: "spawn", kind: "attacker_spawn", layer: group.layer.id,
    region: floor.id, position: [1, 1, 0] });
  scene.document.assets = [{ id: "a", src: "meshes/a/crate.glb" }, { id: "b", src: "meshes/b/crate.glb" }];
  group.asset("first", "a", { position: [4, 4, 1], size: [2, 1, 3], rotation: [0, 0, 90],
    material: "default", collision: "none" });
  group.asset("second", "b", { position: [6, 4, 1], size: [1, 1, 1],
    material: "default", collision: "none" });
  scene.document.references = [{ id: "front", image: "photos/front.png", width: 80, height: 60,
    scale: "assumed", scaleNote: "Synthetic integration fixture.", landmarks: [], masks: [],
    camera: { position: [4, -8, 6], target: [4, 4, 2], up: [0, 0, 1], fov: 55, near: 0.1, far: 100 } }];
  for (const [index, asset] of scene.document.assets.entries()) {
    const mesh = new SceneBuilder("mesh");
    mesh.group("box").box("box", { position: [0, 0, 0], size: [1, 1, index + 1], material: "default", collision: "none" });
    const bytes = toGLB(await compile(mesh.document, { navigation: false }));
    const path = join(root, asset.src);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, bytes);
  }
  const png = new PNG({ width: 80, height: 60 });
  png.data.fill(255);
  const photo = join(root, "photos/front.png");
  await mkdir(dirname(photo), { recursive: true });
  await writeFile(photo, PNG.sync.write(png));
  scene.document.materials[0].texture = "photos/front.png";
  const source = serializeLevelSvgx(scene.document);
  await writeFile(join(root, "level.level.svgx"), source);
  return { scene, source, photo };
}

/** Runs the actual CLI from outside the repository and source directory. */
function evaluate(source: string, out: string, cwd: string, images: string[] = []) {
  return spawnSync(process.execPath, [cli, "--source", source, "--out", out,
    ...images.flatMap(path => ["--image", `front=${path}`])], { cwd, encoding: "utf8", timeout: 30000 });
}

test("reconstruction includes transformed GLB geometry and rejects unresolved geometry", async () => {
  const root = await mkdtemp(join(tmpdir(), "reconstruct-assets-"));
  try {
    const { source } = await fixture(root);
    const store = createCompanionStore(root);
    const result = await runReconstruction(source, [], async () => null,
      { maxRevisions: 0, resolveAsset: store.resolveAsset });
    assert.equal(result.attempts[0].valid, true, result.attempts[0].diagnostics.join("\n"));
    assert.equal(result.accepted, false, "No independent image observations were supplied.");
    assert.ok(result.level);
    const positions = result.level.mesh.positions;
    assert.equal(Math.max(...positions.filter((_, i) => i % 3 === 2)), 4);
    assert.ok(Array.from({ length: positions.length / 3 }, (_, i) => positions.slice(3 * i, 3 * i + 3))
      .some(p => Math.abs(p[0] - 3.5) < 1e-6 && Math.abs(p[1] - 3) < 1e-6 && Math.abs(p[2] - 4) < 1e-6));
    const without = parseLevelSvgx(source);
    without.props = [];
    const floorOnly = await compile(without, { navigation: false });
    const view = result.level.document.references![0];
    const fullRaster = renderReference(result.level, view), floorRaster = renderReference(floorOnly, view);
    assert.ok(fullRaster.depth.some((depth, i) => Number.isFinite(depth) && depth < floorRaster.depth[i] - 0.1),
      "Imported geometry must visibly occlude the native floor.");
    for (const badPath of ["missing.glb", "https://example.invalid/mesh.glb", "invalid.glb"]) {
      await writeFile(join(root, "invalid.glb"), "not a GLB");
      const invalid = source.replace("meshes/a/crate.glb", badPath);
      const rejected = await runReconstruction(invalid, [], async () => null,
        { maxRevisions: 0, resolveAsset: createCompanionStore(root).resolveAsset });
      assert.equal(rejected.attempts[0].valid, false);
      assert.equal(rejected.source, null);
      assert.equal(rejected.level, null);
    }
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("CLI bundles exact companions, survives relocation and same-output reuse, and rejects a different same-name photo", async () => {
  const root = await mkdtemp(join(tmpdir(), "reconstruct-portable-"));
  try {
    const sourceDir = join(root, "source"), out = join(root, "output");
    await mkdir(sourceDir);
    const { photo } = await fixture(sourceDir);
    const first = evaluate(join(sourceDir, "level.level.svgx"), out, root, [photo]);
    assert.equal(first.status, 1, first.stderr || first.stdout);
    assert.equal(first.stderr, "", first.stderr);
    const report = JSON.parse(await readFile(join(out, "result.json"), "utf8"));
    assert.equal(report.attempts[0].valid, true, JSON.stringify(report));
    const manifest = JSON.parse(await readFile(join(out, "best.companions.json"), "utf8"));
    assert.equal(manifest.portableComplete, true);
    for (const item of manifest.companions)
      assert.deepEqual(await readFile(join(out, item.snapshot)), await readFile(join(sourceDir, item.source)));
    const doc = parseLevelSvgx(await readFile(join(out, "best.level.svgx"), "utf8"));
    assert.notEqual(doc.assets![0].src, doc.assets![1].src, "Same basenames must preserve distinct mesh bytes.");
    const runtime = JSON.parse(await readFile(join(out, "best.runtime.json"), "utf8"));
    for (const reference of [...runtime.assets.map((item: any) => item.src),
      ...runtime.references.map((item: any) => item.image),
      ...runtime.materials.flatMap((item: any) => item.texture ? [item.texture] : [])])
      assert.ok((await readFile(join(out, reference))).length > 0);
    const original = await compile(doc, { navigation: false,
      resolveAsset: createGLBAssetResolver(path => readFile(join(out, path))) });
    const badDir = join(root, "other");
    await mkdir(badDir);
    const different = new PNG({ width: 80, height: 60 });
    different.data.fill(0);
    await writeFile(join(badDir, "front.png"), PNG.sync.write(different));
    const wrongPhoto = evaluate(join(sourceDir, "level.level.svgx"), join(root, "wrong"), root, [join(badDir, "front.png")]);
    assert.equal(wrongPhoto.status, 1);
    assert.match(wrongPhoto.stderr, /differs from declared image/);
    await rm(sourceDir, { recursive: true });
    const moved = join(root, "moved");
    await rename(out, moved);
    await writeFile(join(moved, "notes.txt"), "preserve");
    const second = evaluate(join(moved, "best.level.svgx"), moved, root);
    assert.equal(second.status, 1, second.stderr || second.stdout);
    const movedDoc = parseLevelSvgx(await readFile(join(moved, "best.level.svgx"), "utf8"));
    const reloaded = await compile(movedDoc, { navigation: false,
      resolveAsset: createGLBAssetResolver(path => readFile(join(moved, path))) });
    assert.deepEqual(reloaded.mesh.positions, original.mesh.positions);
    assert.deepEqual(reloaded.mesh.indices, original.mesh.indices);
    assert.equal(await readFile(join(moved, "notes.txt"), "utf8"), "preserve");
    await writeFile(join(root, "bad.level.svgx"), "<invalid>");
    evaluate(join(root, "bad.level.svgx"), moved, root);
    await assert.rejects(readFile(join(moved, "best.level.svgx")), { code: "ENOENT" });
    assert.equal(await readFile(join(moved, "notes.txt"), "utf8"), "preserve");
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("archival uses the exact bytes already read by compilation", async () => {
  const root = await mkdtemp(join(tmpdir(), "reconstruct-freeze-"));
  try {
    const { source } = await fixture(root);
    const store = createCompanionStore(root);
    const result = await runReconstruction(source, [], async () => null,
      { maxRevisions: 0, resolveAsset: store.resolveAsset });
    assert.ok(result.level);
    const original = await readFile(join(root, "meshes/a/crate.glb"));
    await writeFile(join(root, "meshes/a/crate.glb"), "changed after compilation");
    const out = join(root, "archive");
    await mkdir(out);
    const portable = await store.archive(source, out, "best");
    assert.ok(portable);
    const document = parseLevelSvgx(portable);
    assert.deepEqual(await readFile(join(out, document.assets![0].src)), original);
    assert.equal(result.level.document.assets![0].src, "meshes/a/crate.glb", "Archiving must not mutate the compiled document.");
  } finally { await rm(root, { recursive: true, force: true }); }
});


test("a corrupted companion snapshot aborts publication without reporting success", async () => {
  const root = await mkdtemp(join(tmpdir(), "reconstruct-corrupt-"));
  try {
    const sourceDir = join(root, "source"), out = join(root, "output");
    await mkdir(sourceDir);
    await fixture(sourceDir);
    evaluate(join(sourceDir, "level.level.svgx"), out, root);
    const manifest = JSON.parse(await readFile(join(out, "best.companions.json"), "utf8"));
    const asset = manifest.companions.find((item: any) => item.kind === "asset");
    await writeFile(join(out, asset.snapshot), "unrelated conflicting bytes");
    const failed = evaluate(join(sourceDir, "level.level.svgx"), out, root);
    assert.equal(failed.status, 1);
    assert.match(failed.stderr, /does not match its content hash/);
    await assert.rejects(readFile(join(out, "best.level.svgx")), { code: "ENOENT" });
    await assert.rejects(readFile(join(out, "result.json")), { code: "ENOENT" });
    assert.equal(await readFile(join(out, asset.snapshot), "utf8"), "unrelated conflicting bytes");
  } finally { await rm(root, { recursive: true, force: true }); }
});
