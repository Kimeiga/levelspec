import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { unzipSync, strFromU8 } from "fflate";
import { prepareDemoPreset } from "../tools/dressing-demo/presets.ts";
import { demoFingerprint } from "../tools/dressing-demo/cache.ts";
import { packageDemoPreset } from "../tools/dressing-demo/package.ts";
import { profileDressing } from "../tools/dressing-demo/profile.ts";

const source = `<architecture version="1" id="profile-test">
  <material id="finish" color="#c6c2b4"/>
  <profile id="plan" points="0 0; 2 0; 2 2; 0 2"/>
  <slab id="floor" profile="plan" thickness="0.2"/>
  <path id="axis" points="0 0 0; 2 0 0"/>
  <wall id="boundary" path="axis" thickness="0.2" height="3"/>
  <box id="decorative-building" width="4" depth="4" height="3.5" collidable="false"/>
  <box id="unrelated" width="1" depth="1" height="1" position="5 5 0" collidable="false"/>
  <dressing theme="kowloon-street@1" seed="profile" detail="low">
    <building host="decorative-building" material="finish" stories="1"/>
  </dressing>
</architecture>`;

test("demo presets remove only building dressing hosts and retain independent documents", () => {
  const dressed = prepareDemoPreset(source, "kowloon");
  const original = structuredClone(dressed);
  const blockout = prepareDemoPreset(source, "blockout");
  assert.deepEqual(blockout.elements.map(element => element.id), ["floor", "boundary", "unrelated"]);
  assert.equal(blockout.dressing, undefined);
  blockout.elements[0].id = "changed";
  assert.deepEqual(dressed, original);
  assert.equal(dressed.dressing?.rules[0].host, "decorative-building");
});

test("host isolation retains native walls and only the selected building proxy", () => {
  const study = source.replace('<dressing theme=',
    '<box id="second-building" width="4" depth="4" height="3.5" collidable="false"/><dressing theme=')
    .replace('</dressing>', '<building host="second-building" material="finish" stories="1"/>'
      + '<wall host="boundary" material="finish" windows="false" wear="0" grime="0" tile-share="0"/><spans cables="1"/></dressing>');
  const full = prepareDemoPreset(study, "kowloon"), before = structuredClone(full);
  assert.ok(full.dressing!.spans);
  const building = prepareDemoPreset(study, "kowloon", "decorative-building");
  assert.deepEqual(building.elements.map(element => element.id), ["floor", "boundary", "decorative-building", "unrelated"]);
  assert.deepEqual(building.dressing!.rules.map(rule => rule.host), ["decorative-building"]);
  const wall = prepareDemoPreset(study, "kowloon", "boundary");
  assert.deepEqual(wall.elements.map(element => element.id), ["floor", "boundary", "unrelated"]);
  assert.deepEqual(wall.dressing!.rules.map(rule => rule.host), ["boundary"]);
  assert.equal(wall.dressing!.spans, undefined);
  assert.deepEqual(full, before);
  assert.throws(() => prepareDemoPreset(study, "kowloon", "missing"), /No dressing rule/);
  assert.throws(() => prepareDemoPreset(study, "blockout", "boundary"), /Kowloon/);
});

test("demo fingerprint includes extracted build helpers and packages nested asset bytes", async t => {
  const directory = await mkdtemp(join(tmpdir(), "dressing-tools-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  for (const name of ["src", "projects/dressing-demo", "tools/dressing-demo", "bundle/textures"])
    await mkdir(join(directory, name), { recursive: true });
  await writeFile(join(directory, "tools/build-dressing-demo.ts"), "entry");
  const helper = join(directory, "tools/dressing-demo/presets.ts");
  await writeFile(helper, "before");
  const before = await demoFingerprint(directory);
  assert.equal(await demoFingerprint(directory), before);
  await writeFile(helper, "after");
  assert.notEqual(await demoFingerprint(directory), before);
  const after = await demoFingerprint(directory);
  await writeFile(join(directory, "tools/dressing-demo/profile.ts"), "measurement-only change");
  assert.equal(await demoFingerprint(directory), after);
  const bundle = join(directory, "bundle");
  await writeFile(join(bundle, "level.aml"), source);
  await writeFile(join(bundle, "preview.json"), "preview");
  await writeFile(join(bundle, "textures/test.png"), new Uint8Array([0, 1, 255]));
  await writeFile(join(bundle, "textures/preview.json"), "nested asset");
  await packageDemoPreset(bundle);
  const contents = unzipSync(await readFile(join(bundle, "package.zip")));
  assert.equal(strFromU8(contents["level.aml"]), source);
  assert.deepEqual(contents["textures/test.png"], new Uint8Array([0, 1, 255]));
  assert.equal(contents["preview.json"], undefined);
  assert.equal(contents["package.zip"], undefined);
  assert.equal(strFromU8(contents["textures/preview.json"]), "nested asset");
});

test("profiling distinguishes completed, failed, and cancelled compiles and recovers", async t => {
  const directory = await mkdtemp(join(tmpdir(), "dressing-profile-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const sourceFile = join(directory, "level.aml");
  const options = { sourceFile, preset: "blockout" as const, seconds: 10 };
  await writeFile(sourceFile, source);
  const success = await profileDressing({ ...options, cpuProfile: true });
  assert.equal(success.report.status, "completed");
  assert.ok(success.report.triangles! > 0);
  assert.ok(success.profile?.nodes.length);
  assert.ok(success.report.intervals.every(interval => Number.isFinite(interval.durationMs) && interval.durationMs >= 0));
  const total = success.report.intervals.reduce((sum, interval) => sum + interval.durationMs, 0);
  assert.ok(Math.abs(total - success.report.elapsedMs) < 1e-6);
  await writeFile(sourceFile, source.replace('profile="plan"', 'profile="missing"'));
  const failed = await profileDressing(options);
  assert.equal(failed.report.status, "failed");
  assert.ok(failed.report.diagnostics?.some(diagnostic => diagnostic.severity === "error"));
  const cancelledSource = source.replace('<building host="decorative-building" material="finish" stories="1"/>',
    '<wall host="boundary" material="finish" face="side" windows="false" tile-share="0"/>');
  await writeFile(sourceFile, cancelledSource);
  const cancelled = await profileDressing({ ...options, preset: "kowloon", seconds: .000001 });
  assert.equal(cancelled.report.status, "cancelled");
  assert.equal(cancelled.report.triangles, undefined);
  await writeFile(sourceFile, source);
  assert.equal((await profileDressing(options)).report.status, "completed");
  await assert.rejects(profileDressing({ ...options, seconds: NaN }), /seconds/);
  await assert.rejects(profileDressing({ ...options, host: "boundary" }), /Kowloon/);
});
