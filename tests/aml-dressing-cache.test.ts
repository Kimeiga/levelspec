import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, readdir, rm, stat, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { encodeSurfaceImage } from "../src/dressing/surface/images.ts";
import type { SurfaceMaterialArtifact } from "../src/dressing/surface/material-cache.ts";
import { createDiskMaterialCache } from "../tools/dressing-demo/material-cache.ts";

/** Real small PNG artifacts exercise the disk boundary without invoking a scene compiler. */
function artifact(key: string, red = 64): SurfaceMaterialArtifact {
  const bytes = encodeSurfaceImage({ width: 1, height: 1, data: new Uint8Array([red, 128, 192, 255]) });
  const channel = () => ({ bytes: bytes.slice(), hash: createHash("sha256").update(bytes).digest("hex") });
  return { version: 1, key: key.repeat(64), layers: [{ source: "paint", color: channel(), metallicRoughness: channel(), normal: channel() }] };
}

/** Each test owns and removes its complete filesystem namespace, including failed-write residue. */
async function directory(t: TestContext): Promise<string> {
  const path = await mkdtemp(join(tmpdir(), "levelspec-material-cache-"));
  t.after(() => rm(path, { recursive: true, force: true }));
  return path;
}

/** Locates a persisted artifact through its public key without reproducing namespace hashing. */
async function storedFile(path: string, key: string): Promise<string> {
  const names = (await readdir(path)).filter(name => name.endsWith(`-${key}.json`));
  assert.equal(names.length, 1);
  return join(path, names[0]);
}

test("disk material cache atomically replaces artifacts and isolates namespaces and byte ownership", async t => {
  const path = await directory(t), first = createDiskMaterialCache(path, "../compiler/a"), second = createDiskMaterialCache(path, "../compiler/a");
  const old = artifact("a", 30), next = artifact("a", 90), other = artifact("a", 180);
  await first.write(old);
  const expectedNext = structuredClone(next);
  let complete = false;
  const pending = Promise.all([first.write(next), second.write(other)]).finally(() => { complete = true; });
  next.layers[0].color.bytes.fill(0);
  next.layers[0].normal!.bytes.fill(0);
  const allowed = [old, expectedNext, other].map(value => JSON.stringify(value));
  do {
    const observed = await first.read(old.key);
    assert.ok(observed, "An existing file remains readable throughout atomic replacement");
    assert.ok(allowed.includes(JSON.stringify(observed)), "Readers only observe complete old or new artifacts");
  } while (!complete);
  await pending;
  const final = await first.read(old.key);
  assert.ok(final);
  assert.ok([expectedNext, other].some(value => JSON.stringify(value) === JSON.stringify(final)));
  const stable = structuredClone(final);
  final.layers[0].color.bytes.fill(0);
  final.layers[0].normal!.bytes.fill(0);
  assert.deepEqual(await second.read(old.key), stable, "Returned buffers belong to the reader");

  const owned = artifact("b", 111), channel = owned.layers[0].color;
  const backing = new Uint8Array(channel.bytes.length + 10).fill(219);
  backing.set(channel.bytes, 4);
  channel.bytes = backing.subarray(4, 4 + channel.bytes.length);
  const snapshot = structuredClone(owned), writing = first.write(owned);
  backing.fill(0);
  owned.layers[0].normal!.bytes.fill(0);
  await writing;
  assert.deepEqual(await first.read(owned.key), snapshot, "Writes retain exact input views independently of subsequent caller edits");

  const isolated = createDiskMaterialCache(path, "compiler/b");
  assert.equal(await isolated.read(old.key), undefined);
  await isolated.write(old);
  assert.deepEqual(await isolated.read(old.key), old);
  assert.deepEqual(await first.read(old.key), stable);
  const files = await readdir(path);
  assert.equal(files.length, 3, "Namespaces remain inside the cache directory without temporary files");
  assert.ok(files.every(name => name.endsWith(".json")));
});

test("disk cache corruption, cancellation and failed replacement leave subsequent writes usable", async t => {
  const path = await directory(t), cache = createDiskMaterialCache(path, "compiler");
  const original = artifact("a"), replacement = artifact("a", 220), blocked = artifact("b");
  await cache.write(original);
  const originalPath = await storedFile(path, original.key);
  await writeFile(originalPath, "{truncated");
  assert.equal(await cache.read(original.key), undefined);
  await cache.write(original);
  assert.deepEqual(await cache.read(original.key), original);

  const controller = new AbortController();
  const cancelled = cache.write(replacement, controller.signal);
  controller.abort();
  await assert.rejects(cancelled, { name: "AbortError" });
  await assert.rejects(cache.read(original.key, controller.signal), { name: "AbortError" });
  assert.deepEqual(await cache.read(original.key), original, "Cancellation cannot replace an existing artifact");

  await cache.write(blocked);
  const blockedPath = await storedFile(path, blocked.key);
  await rm(blockedPath);
  await mkdir(blockedPath);
  await writeFile(join(blockedPath, "occupied"), "prevent replacement");
  await assert.rejects(cache.write(blocked), "A failed rename must reject rather than publish a partial artifact");
  assert.ok((await readdir(path)).every(name => !name.endsWith(".tmp")), "Failure cleans temporary output");
  await rm(blockedPath, { recursive: true });
  await cache.write(blocked);
  await cache.write(replacement);
  assert.deepEqual(await cache.read(blocked.key), blocked);
  assert.deepEqual(await cache.read(original.key), replacement, "A rejected write does not poison the serialization queue");
});

test("disk cache quota evicts complete oldest entries across namespaces and skips oversized artifacts", async t => {
  const path = await directory(t), measurement = join(path, "measurement"), bounded = join(path, "bounded");
  const a = artifact("a"), b = artifact("b"), c = artifact("c");
  await createDiskMaterialCache(measurement, "compiler").write(a);
  const size = (await stat(await storedFile(measurement, a.key))).size;
  const first = createDiskMaterialCache(bounded, "old-compiler", 2 * size);
  await first.write(a);
  await utimes(await storedFile(bounded, a.key), new Date(1000), new Date(1000));
  await writeFile(join(bounded, "notes.txt"), "unrelated caller-owned data");
  const second = createDiskMaterialCache(bounded, "new-compiler", 2 * size);
  await second.write(b);
  await second.write(c);
  assert.equal(await first.read(a.key), undefined, "The oldest code namespace participates in the shared quota");
  assert.deepEqual(await second.read(b.key), b);
  assert.deepEqual(await second.read(c.key), c);
  assert.equal(await readFile(join(bounded, "notes.txt"), "utf8"), "unrelated caller-owned data");
  const names = (await readdir(bounded)).filter(name => name.endsWith(".json"));
  const sizes = await Promise.all(names.map(name => stat(join(bounded, name))));
  assert.ok(sizes.reduce((sum, entry) => sum + entry.size, 0) <= 2 * size);

  const tooSmall = createDiskMaterialCache(join(path, "too-small"), "compiler", size - 1);
  await tooSmall.write(a);
  assert.equal(await tooSmall.read(a.key), undefined, "An oversized artifact is optional cache work, not a partial entry");
  assert.ok((await readdir(bounded)).every(name => !name.endsWith(".tmp")));
});
