import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, readFile, writeFile, rm, symlink, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, isAbsolute } from "node:path";
import { createServer } from "node:net";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";
import { ArchitectureBuilder, parseAml, serializeAml } from "levelspec";
import { writeExportFiles } from "../src/export/vector/index.ts";
import { NavigationSurface } from "../review/navigation-surface.ts";
import { navigationDoorway } from "./fixtures/navigation-doorway.ts";

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
  const scene = new ArchitectureBuilder("cli-contract");
  scene.profile("footprint", [[0, 0, 0], [8, 0, 0], [8, 8, 0], [0, 8, 0]]);
  const floor = scene.slab("ground/floor", "footprint", { group: "ground" });
  scene.document.markers.push({ id: "spawn", kind: "attacker_spawn", layer: "ground", region: floor.id, position: [1, 1, 0] });
  const file = join(directory, "level with spaces.aml");
  await writeFile(file, serializeAml(scene.document));
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
      "--fov", "47", "--view-height", "14", "--roll=-21.49", "--appearance", "materials", "--frame-aspect", "0.75", "--nav-cell", "0.0625"], { cwd: temp, stdio: ["ignore", "pipe", "pipe"] });
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
      assert.equal(url.searchParams.get("appearance"), "materials");
      assert.equal(url.searchParams.get("frame-aspect"), "0.75");
      assert.equal(url.searchParams.get("nav-cell"), "0.0625");
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

test("navigation resolution survives CLI validation and build exports without changing geometry", async () => {
  const temp = await mkdtemp(join(tmpdir(), "levelspec-nav-cell-"));
  try {
    const source = join(temp, "doorway.aml"), output = join(temp, "output");
    const xml = serializeAml(navigationDoorway());
    await writeFile(source, xml);
    const cells = [undefined, 0.125, 0.0625, 0.025, 0.5];
    let defaultKey: string | undefined;
    for (const cell of cells) {
      const flags = cell === undefined ? [] : ["--nav-cell", String(cell)];
      const response = await run(["validate", source, "--json", ...flags], temp);
      assert.equal(response.code, 0, response.stderr || response.stdout);
      const navigation = result(response.stdout, "validate", true).report.navigation;
      assert.equal(navigation.settings.cell, cell ?? 0.0625);
      assert.equal(navigation.settings.player.radius, 0.25);
      assert.equal(navigation.settings.player.height, 1.8);
      if (cell === undefined) defaultKey = navigation.settings.cacheKey;
      if (cell === 0.125) assert.notEqual(navigation.settings.cacheKey, defaultKey);
      if (cell === 0.0625) {
        assert.equal(navigation.settings.cacheKey, defaultKey);
        const surface = new NavigationSurface(navigation, [3, 3, 0]);
        assert.ok(Math.abs(surface.move([3, 3, 0], 2, 0)[0] - 5) < 0.01);
      }
    }
    const built = await run(["build", source, "--out", output, "--json", "--no-uv", "--nav-cell", "0.0625"], temp);
    assert.equal(built.code, 0, built.stderr || built.stdout);
    const report = result(built.stdout, "build", true).report;
    const runtime = JSON.parse(await readFile(join(output, "navigation-doorway.runtime.json"), "utf8"));
    const savedReport = JSON.parse(await readFile(join(output, "navigation-doorway.report.json"), "utf8"));
    assert.equal(runtime.navigation.settings.cell, 0.0625);
    assert.deepEqual(savedReport.navigation.settings, report.navigation.settings);
    assert.deepEqual(runtime.navigation.settings, report.navigation.settings);
    const surface = new NavigationSurface(runtime.navigation, [3, 3, 0]);
    assert.ok(Math.abs(surface.move([3, 3, 0], 2, 0)[0] - 5) < 0.01);
    assert.equal(await readFile(source, "utf8"), xml);
  } finally { await rm(temp, { recursive: true, force: true }); }
});

test("invalid navigation resolution is a usage error before preview startup or output replacement", async () => {
  const temp = await mkdtemp(join(tmpdir(), "levelspec-nav-invalid-"));
  try {
    const source = await sourceFile(temp), output = join(temp, "output");
    await mkdir(output);
    await writeFile(join(output, "cli-contract.glb"), "existing-export");
    for (const [index, value] of ["", "NaN", "Infinity", "0", "-0.1", "0.0249", "0.5001", "invalid"].entries()) {
      const command = ["validate", "build", "preview"][index % 3];
      const extra = command === "build" ? ["--out", output] : [];
      const response = await run([command, source, ...extra, "--nav-cell", value], temp);
      assert.equal(response.code, 2, `${command} ${value}: ${response.stderr || response.stdout}`);
      assert.doesNotMatch(response.stderr, /Preview ready/);
    }
    const missing = await run(["validate", source, "--nav-cell"], temp);
    assert.equal(missing.code, 2, missing.stderr);
    assert.equal(await readFile(join(output, "cli-contract.glb"), "utf8"), "existing-export");
    const recovered = await run(["validate", source, "--nav-cell", "0.0625", "--json"], temp);
    assert.equal(recovered.code, 0, recovered.stderr || recovered.stdout);
    assert.equal(result(recovered.stdout, "validate", true).report.navigation.settings.cell, 0.0625);
  } finally { await rm(temp, { recursive: true, force: true }); }
});

test("init creates a usable project and refuses existing destinations without mutation", async () => {
  const temp = await mkdtemp(join(tmpdir(), "levelspec-init-"));
  try {
    const project = join(temp, "new building");
    const created = await run(["init", project, "--json"], temp);
    assert.equal(created.code, 0, created.stderr);
    result(created.stdout, "init", true);
    for (const directory of ["references", "schematics", "reviews"]) assert.deepEqual(await readdir(join(project, directory)), []);
    const file = join(project, "level.aml");
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

test("CLI migrates SVGX explicitly while normal inputs accept equivalent AML and XML", async () => {
  const temp = await mkdtemp(join(tmpdir(), "levelspec-migrate-cli-"));
  try {
    const legacy = join(temp, "old.level.svgx"), output = join(temp, "new");
    const original = await readFile(new URL("./fixtures/migration/cli-starter.level.svgx", import.meta.url), "utf8");
    await writeFile(legacy, original);
    const rejected = await run(["validate", legacy, "--json"]);
    assert.equal(rejected.code, 1);
    assert.ok(result(rejected.stdout, "validate", false).diagnostics.some((diagnostic: { message: string }) => /migrate/.test(diagnostic.message)));
    const migrated = await run(["migrate", legacy, "--out", output, "--json"]);
    assert.equal(migrated.code, 0, migrated.stderr || migrated.stdout);
    assert.ok(result(migrated.stdout, "migrate", true).artifacts.some((file: string) => file.endsWith("level.aml")));
    const aml = join(output, "level.aml"), xml = join(output, "level.xml");
    await writeFile(xml, await readFile(aml));
    const first = await run(["validate", aml, "--json"]), second = await run(["validate", xml, "--json"]);
    assert.equal(first.code, 0, first.stderr || first.stdout); assert.equal(second.code, 0, second.stderr || second.stdout);
    assert.equal(result(first.stdout, "validate", true).report.navigation.settings.geometryHash, result(second.stdout, "validate", true).report.navigation.settings.geometryHash);
    assert.equal(await readFile(legacy, "utf8"), original);
    assert.equal((await run(["migrate", legacy, "--out", output, "--json"])).code, 1);
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
    assert.deepEqual(await readdir(temp), ["level with spaces.aml"]);
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
    assert.ok(builtResult.artifacts.includes(join(output, "cli-contract.obj")), "A representable simple level retains its OBJ companion");
    const runtime = JSON.parse(await readFile(join(output, "cli-contract.runtime.json"), "utf8"));
    assert.equal(runtime.id, "cli-contract");
    const validSource = await readFile(source, "utf8");
    const obstructed = parseAml(validSource);
    obstructed.elements.push({ id: "low-ceiling", kind: "box", position: [0, 0, .5], width: 8, depth: 8, height: .2, radius: .5, topRadius: 0 });
    await writeFile(source, serializeAml(obstructed));
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

test("weathered GLB builds package generated PBR images without serializing their bytes into runtime JSON", async () => {
  const temp = await mkdtemp(join(tmpdir(), "levelspec-surface-build-"));
  try {
    const source = join(temp, "level.aml"), output = join(temp, "output");
    await writeFile(source, await readFile(new URL("./fixtures/aml/surface-host.aml", import.meta.url)));
    const png = new PNG({ width: 2, height: 2 });
    png.data = Buffer.from(Uint16Array.from([0x1234, 0x5678, 0xabcd, 0xffff]).buffer);
    await writeFile(join(temp, "finish.png"), PNG.sync.write(png,
      { colorType: 0, inputColorType: 0, inputHasAlpha: false, bitDepth: 16, filterType: 0 }));
    const built = await run(["build", source, "--out", output, "--formats", "glb", "--json", "--no-uv"], temp);
    assert.equal(built.code, 0, built.stderr || built.stdout);
    const artifacts = result(built.stdout, "build", true).artifacts as string[];
    assert.ok(!artifacts.some(file => file.endsWith(".obj")), "Incidental OBJ must not block a supported PBR build");
    const runtime = JSON.parse(await readFile(join(output, "surface-host.runtime.json"), "utf8"));
    const generated = runtime.generatedImages as Record<string, { file: string; hash: string; mimeType: string }>;
    assert.ok(Object.keys(generated).length > 0, "The source height field must produce portable material companions");
    const hashes = new Set<string>();
    for (const [reference, metadata] of Object.entries(generated)) {
      assert.deepEqual(Object.keys(metadata).sort(), ["file", "hash", "mimeType"], "Runtime transport retains identities, never encoded image bytes");
      const file = join(output, metadata.file);
      assert.ok(artifacts.includes(file), `Generated reference ${reference} must have a packaged companion`);
      const bytes = await readFile(file);
      assert.equal(createHash("sha256").update(bytes).digest("hex"), metadata.hash);
      assert.equal(metadata.mimeType, "image/png");
      assert.ok(PNG.sync.read(bytes).width > 0, "Generated companions remain decodable material images");
      hashes.add(metadata.hash);
    }
    const glb = await readFile(join(output, "surface-host.glb"));
    const jsonLength = glb.readUInt32LE(12), document = JSON.parse(glb.toString("utf8", 20, 20 + jsonLength));
    assert.ok(document.materials.some((material: { normalTexture?: unknown }) => material.normalTexture), "The height-derived appearance must remain available in ordinary GLB PBR");
    const binaryStart = 20 + jsonLength + 8;
    const embedded = new Set(document.images.map((image: { bufferView: number }) => {
      const view = document.bufferViews[image.bufferView];
      const start = binaryStart + (view.byteOffset ?? 0);
      return createHash("sha256").update(glb.subarray(start, start + view.byteLength)).digest("hex");
    }));
    for (const hash of hashes) assert.ok(embedded.has(hash), "GLB and packaged runtime images must use identical compiled bytes");
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
