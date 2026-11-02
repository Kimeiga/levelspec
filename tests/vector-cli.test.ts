import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, readFile, writeFile, rm, symlink, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, isAbsolute } from "node:path";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import { SceneBuilder, parseLevelSvgx, serializeLevelSvgx } from "levelspec";
import { writeExportFiles } from "../src/export/vector/index.ts";

const launcher = fileURLToPath(new URL("../bin/levelspec.mjs", import.meta.url));
/** Runs the real launcher with isolated working-directory and process boundaries. */
function run(args: string[], cwd = process.cwd()) {
  return new Promise<{ code: number | null; stdout: string; stderr: string }>((done, reject) => {
    const child = spawn(process.execPath, [launcher, ...args], { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "", stderr = "";
    child.stdout.on("data", chunk => stdout += chunk);
    child.stderr.on("data", chunk => stderr += chunk);
    child.once("error", reject);
    child.once("close", code => done({ code, stdout, stderr }));
  });
}
/** Provides a bounded walkable architectural input independently of CLI initialization. */
async function sourceFile(directory: string) {
  const scene = new SceneBuilder("cli-contract");
  const group = scene.group("ground");
  const floor = group.platform("floor", { width: 8, depth: 8, material: "default" });
  scene.document.markers.push({ id: "spawn", kind: "attacker_spawn", layer: group.layer.id, region: floor.id, position: [1, 1, 0] });
  const file = join(directory, "level with spaces.level.svgx");
  await writeFile(file, serializeLevelSvgx(scene.document));
  return file;
}
/** Asserts the single-result JSON protocol, including primitive contract fields. */
function result(stdout: string, command: string, success: boolean) {
  const value = JSON.parse(stdout);
  assert.equal(value.schemaVersion, 1);
  assert.equal(value.command, command);
  assert.equal(value.success, success);
  assert.ok(Array.isArray(value.diagnostics));
  return value;
}

test("CLI help, version and invalid invocations use deliberate exit status", async () => {
  for (const args of [["--help"], ["build", "--help"], ["--version"]]) {
    const response = await run(args);
    assert.equal(response.code, 0, response.stderr);
    assert.ok(response.stdout.trim());
  }
  for (const args of [["unknown"], ["validate"], ["build", "missing.level.svgx"], ["preview", "missing.level.svgx", "--json"]]) {
    const response = await run(args);
    assert.equal(response.code, 2, response.stderr || response.stdout);
  }
});

test("preview rejects invalid camera options before starting a server", async () => {
  for (const flags of [
    ["--projection", "oblique"],
    ["--camera", "1 2 3"],
    ["--target", "1 2 3"],
    ["--camera", "1 2", "--target", "0 0 0"],
    ["--camera", "NaN 2 3", "--target", "0 0 0"],
    ["--camera", "1 2 3", "--target", "1 2 3"],
    ["--fov", "0"], ["--fov", "150"], ["--fov", "Infinity"],
    ["--view-height", "0"], ["--view-height", "-2"],
    ["--frame-aspect", "0"], ["--frame-aspect", "Infinity"], ["--frame-aspect", "1e-300"], ["--frame-aspect", ""],
    ["--appearance", "unlit"], ["--appearance", ""],
    ["--roll", "NaN"], ["--roll", "Infinity"], ["--roll", ""],
  ]) {
    const response = await run(["preview", "missing.level.svgx", ...flags]);
    assert.equal(response.code, 2, `${flags.join(" ")}: ${response.stderr}`);
    assert.doesNotMatch(response.stderr, /ENOENT|Preview ready/);
  }
});

test("preview launcher carries a valid camera into its live URL and shuts down", async () => {
  const temp = await mkdtemp(join(tmpdir(), "levelspec-camera-cli-"));
  let child: ReturnType<typeof spawn> | undefined;
  try {
    const source = await sourceFile(temp);
    child = spawn(process.execPath, [launcher, "preview", source,
      "--camera", "11 -17 8", "--target", "2 3 1", "--projection", "perspective",
      "--fov", "47", "--view-height", "14", "--roll=-21.49", "--appearance", "inspection", "--frame-aspect", "0.75"], { cwd: temp, stdio: ["ignore", "pipe", "pipe"] });
    const previewProcess = child;
    const stopped = new Promise<number | null>(done => {
      previewProcess.once("close", done);
    });
    const watchdog = setTimeout(() => previewProcess.kill("SIGKILL"), 15000);
    try {
      const url = await new Promise<URL>((done, reject) => {
        let stderr = "";
        previewProcess.stderr!.on("data", chunk => {
          stderr += chunk;
          const match = stderr.match(/Preview ready: (http:\/\/[^\s]+)/);
          if (match) done(new URL(match[1]));
        });
        previewProcess.once("error", reject);
        previewProcess.once("close", code => reject(new Error(`Preview closed before readiness (${code}): ${stderr}`)));
      });
      assert.equal(url.hostname, "127.0.0.1");
      assert.equal(url.searchParams.get("camera"), "11 -17 8");
      assert.equal(url.searchParams.get("target"), "2 3 1");
      assert.equal(url.searchParams.get("projection"), "perspective");
      assert.equal(url.searchParams.get("fov"), "47");
      assert.equal(url.searchParams.get("view-height"), "14");
      assert.equal(url.searchParams.get("roll"), "-21.49");
      assert.equal(url.searchParams.get("appearance"), "inspection");
      assert.equal(url.searchParams.get("frame-aspect"), "0.75");
      assert.equal((await fetch(url)).status, 200, "Preview HTML must accept the view query");
      previewProcess.kill("SIGINT");
      assert.equal(await stopped, 130);
    } finally {
      clearTimeout(watchdog);
      if (previewProcess.exitCode === null) { previewProcess.kill("SIGKILL"); await stopped; }
    }
  } finally {
    if (child?.exitCode === null) child.kill("SIGKILL");
    await rm(temp, { recursive: true, force: true });
  }
});

test("init creates a usable project and refuses existing destinations without mutation", async () => {
  const temp = await mkdtemp(join(tmpdir(), "levelspec-init-"));
  try {
    const project = join(temp, "new building");
    const created = await run(["init", project, "--json"], temp);
    assert.equal(created.code, 0, created.stderr);
    result(created.stdout, "init", true);
    for (const directory of ["references", "schematics", "reviews"]) assert.deepEqual(await readdir(join(project, directory)), []);
    const file = join(project, "level.level.svgx");
    const original = await readFile(file, "utf8");
    const validated = await run(["validate", file, "--json"], temp);
    assert.equal(validated.code, 0, validated.stderr || validated.stdout);
    assert.equal(result(validated.stdout, "validate", true).report.passed, true);
    const again = await run(["init", project, "--json"], temp);
    assert.equal(again.code, 1);
    result(again.stdout, "init", false);
    assert.equal(await readFile(file, "utf8"), original);
  } finally { await rm(temp, { recursive: true, force: true }); }
});

test("validate reports source failures without creating output and recovers after repair", async () => {
  const temp = await mkdtemp(join(tmpdir(), "levelspec-validation-"));
  try {
    const file = await sourceFile(temp);
    const valid = await readFile(file, "utf8");
    await writeFile(file, '<level version="2" id="broken"><invalid/></level>');
    const broken = await run(["validate", file, "--json"], temp);
    assert.equal(broken.code, 1);
    const failed = result(broken.stdout, "validate", false);
    assert.ok(failed.diagnostics.some((d: {severity: string; source?: unknown}) => d.severity === "error" && d.source));
    assert.deepEqual(await readdir(temp), ["level with spaces.level.svgx"]);
    await writeFile(file, valid);
    const repaired = await run(["validate", file, "--json"], temp);
    assert.equal(repaired.code, 0, repaired.stderr || repaired.stdout);
    assert.equal(result(repaired.stdout, "validate", true).report.passed, true);
    const missing = await run(["validate", join(temp, "missing.level.svgx"), "--json"], temp);
    assert.equal(missing.code, 1);
    assert.ok(result(missing.stdout, "validate", false).error.message);
  } finally { await rm(temp, { recursive: true, force: true }); }
});

test("build publishes portable files from another working directory and preserves them after failure", async () => {
  const temp = await mkdtemp(join(tmpdir(), "levelspec-build-"));
  try {
    const source = await sourceFile(temp), output = join(temp, "output with spaces");
    const built = await run(["build", source, "--out", output, "--json", "--no-uv"], temp);
    assert.equal(built.code, 0, built.stderr || built.stdout);
    const builtResult = result(built.stdout, "build", true);
    assert.ok(builtResult.artifacts.length > 0);
    for (const file of builtResult.artifacts) assert.ok(isAbsolute(file));
    const glb = join(output, "cli-contract.glb"), original = await readFile(glb);
    assert.equal(original.toString("ascii", 0, 4), "glTF");
    const runtime = JSON.parse(await readFile(join(output, "cli-contract.runtime.json"), "utf8"));
    assert.equal(runtime.id, "cli-contract");
    const validSource = await readFile(source, "utf8");
    const obstructed = parseLevelSvgx(validSource);
    obstructed.layers[0].regions[0].ceiling = 0.5;
    await writeFile(source, serializeLevelSvgx(obstructed));
    const invalidBuild = await run(["build", source, "--out", output, "--json", "--no-uv"], temp);
    assert.equal(invalidBuild.code, 1);
    assert.equal(result(invalidBuild.stdout, "build", false).report.passed, false);
    assert.deepEqual(await readFile(glb), original);
    await writeFile(source, validSource);
    const nativeFailure = await run(["build", source, "--out", output, "--formats", "fbx", "--blender", join(temp, "no-blender"), "--no-uv", "--json"], temp);
    assert.equal(nativeFailure.code, 1);
    result(nativeFailure.stdout, "build", false);
    assert.deepEqual(await readFile(glb), original);
    const recovered = await run(["build", source, "--out", output, "--json", "--no-uv"], temp);
    assert.equal(recovered.code, 0, recovered.stderr || recovered.stdout);
  } finally { await rm(temp, { recursive: true, force: true }); }
});

test("build rejects symlinked output and ancestor directories without changing outside files", async () => {
  const temp = await mkdtemp(join(tmpdir(), "levelspec-symlink-cli-"));
  try {
    const source = await sourceFile(temp), outside = join(temp, "outside"), link = join(temp, "link");
    await mkdir(outside);
    await writeFile(join(outside, "sentinel"), "untouched");
    await symlink(outside, link, "dir");
    for (const output of [link, join(link, "nested")]) {
      const response = await run(["build", source, "--out", output, "--json", "--no-uv"], temp);
      assert.equal(response.code, 1);
      result(response.stdout, "build", false);
      assert.deepEqual(await readdir(outside), ["sentinel"]);
      assert.equal(await readFile(join(outside, "sentinel"), "utf8"), "untouched");
    }
    const recovered = await run(["build", source, "--out", join(temp, "normal"), "--json", "--no-uv"], temp);
    assert.equal(recovered.code, 0, recovered.stderr || recovered.stdout);
  } finally { await rm(temp, { recursive: true, force: true }); }
});

test("nested export paths reject symlink parents and retain normal nested output", async () => {
  const temp = await mkdtemp(join(tmpdir(), "levelspec-symlink-files-"));
  try {
    const output = join(temp, "out"), outside = join(temp, "outside");
    await mkdir(output); await mkdir(outside);
    await writeFile(join(outside, "color.png"), "original");
    await symlink(outside, join(output, "textures"), "dir");
    await assert.rejects(writeExportFiles(output, { "textures/color.png": "replacement" }));
    assert.equal(await readFile(join(outside, "color.png"), "utf8"), "original");
    await rm(join(output, "textures"));
    await writeExportFiles(output, { "textures/color.png": "new" });
    assert.equal(await readFile(join(output, "textures/color.png"), "utf8"), "new");
  } finally { await rm(temp, { recursive: true, force: true }); }
});

test("SIGINT during native export preserves published files and allows a later build", async () => {
  const temp = await mkdtemp(join(tmpdir(), "levelspec-cancel-"));
  try {
    const source = await sourceFile(temp), output = join(temp, "output");
    const first = await run(["build", source, "--out", output, "--json", "--no-uv"], temp);
    assert.equal(first.code, 0, first.stderr);
    const glb = join(output, "cli-contract.glb"), original = await readFile(glb);
    const native = join(temp, "waiting-blender.mjs");
    await writeFile(native, '#!/usr/bin/env node\nconsole.log("NATIVE_READY");\nsetInterval(() => {}, 1000);\n', { mode: 0o755 });
    const cancelled = await new Promise<{code: number | null; stdout: string; stderr: string}>((done, reject) => {
      const child = spawn(process.execPath, [launcher, "build", source, "--out", output, "--formats", "fbx", "--blender", native, "--json", "--no-uv"], { cwd: temp, stdio: ["ignore", "pipe", "pipe"] });
      let stdout = "", stderr = "", signalled = false;
      const watchdog = setTimeout(() => { child.kill("SIGKILL"); reject(new Error("Native export never announced readiness or cancellation did not complete")); }, 15000);
      child.stdout.on("data", chunk => stdout += chunk);
      child.stderr.on("data", chunk => {
        stderr += chunk;
        if (!signalled && stderr.includes("NATIVE_READY")) { signalled = true; child.kill("SIGINT"); }
      });
      child.once("error", error => { clearTimeout(watchdog); reject(error); });
      child.once("close", code => { clearTimeout(watchdog); done({code, stdout, stderr}); });
    });
    assert.equal(cancelled.code, 130, cancelled.stderr || cancelled.stdout);
    result(cancelled.stdout, "build", false);
    assert.deepEqual(await readFile(glb), original);
    const recovered = await run(["build", source, "--out", output, "--json", "--no-uv"], temp);
    assert.equal(recovered.code, 0, recovered.stderr || recovered.stdout);
  } finally { await rm(temp, { recursive: true, force: true }); }
});


test("preview rejects an explicitly occupied port without disturbing its owner", async () => {
  const temp = await mkdtemp(join(tmpdir(), "levelspec-preview-port-"));
  const owner = createServer();
  try {
    await new Promise<void>((done, reject) => { owner.once("error", reject); owner.listen(0, "127.0.0.1", done); });
    const address = owner.address();
    assert.ok(address && typeof address !== "string");
    const source = await sourceFile(temp);
    const response = await run(["preview", source, "--port", String(address.port)], temp);
    assert.equal(response.code, 1, response.stderr);
    assert.equal(owner.listening, true);
  } finally {
    await new Promise<void>((done, reject) => owner.close(error => error ? reject(error) : done()));
    await rm(temp, { recursive: true, force: true });
  }
});
