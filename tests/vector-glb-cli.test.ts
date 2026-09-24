import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SceneBuilder,
  compile,
  serializeLevelSvgx,
  toGLB,
} from "../src/vector/index.ts";

function run(args: string[]) {
  return new Promise<{ code: number | null; stdout: string; stderr: string }>(
    (resolve, reject) => {
      const child = spawn(process.execPath, args, {
        cwd: process.cwd(),
        env: process.env,
        stdio: ["ignore", "pipe", "pipe"],
      });
      let stdout = "", stderr = "";
      child.stdout.on("data", (data) => (stdout += data));
      child.stderr.on("data", (data) => (stderr += data));
      child.once("error", reject);
      child.once("close", (code) => resolve({ code, stdout, stderr }));
    },
  );
}

test("vector CLI resolves local GLB assets relative to the SVGX file", async () => {
  const temp = await mkdtemp(join(tmpdir(), "levelspec-glb-cli-"));
  try {
    const assetScene = new SceneBuilder("asset"),
      assetGroup = assetScene.group("mesh");
    assetGroup.box("crate", {
      position: [0, 0, 0],
      size: [1, 1, 1],
      material: "default",
      collision: "solid",
    });
    const assetLevel = await compile(assetScene.document, { navigation: false });
    assert.deepEqual(assetLevel.diagnostics, []);
    await writeFile(join(temp, "crate.glb"), toGLB(assetLevel));

    const scene = new SceneBuilder("cli-glb"),
      group = scene.group("level"),
      floor = group.platform("floor", {
        width: 8,
        depth: 8,
        material: "default",
      });
    scene.document.assets = [{ id: "crate-mesh", src: "crate.glb" }];
    group.asset("crate", "crate-mesh", {
      position: [4, 4, 0],
      size: [1, 1, 1],
      material: "default",
      collision: "none",
    });
    scene.document.markers.push({
      id: "spawn",
      kind: "attacker_spawn",
      layer: group.layer.id,
      region: floor.id,
      position: [1, 1, 0],
    });
    const source = join(temp, "map.level.svgx"),
      output = join(temp, "out");
    await writeFile(source, serializeLevelSvgx(scene.document));
    const result = await run([
      "tools/vector-build.ts",
      source,
      "--formats",
      "glb",
      "--out",
      output,
      "--no-uv",
      "--strict-floor-gaps",
      "--strict-surface-contacts",
    ]);
    assert.equal(result.code, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /"passed": true/);
    const exported = await readFile(join(output, "cli-glb.glb"));
    assert.equal(exported.toString("ascii", 0, 4), "glTF");
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});
