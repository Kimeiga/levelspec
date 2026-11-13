import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ArchitectureBuilder,
  compile,
  serializeAml,
  toGLB,
} from "levelspec";

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

test("CLI resolves local visualization meshes relative to the AML file", async () => {
  const temp = await mkdtemp(join(tmpdir(), "levelspec-glb-cli-"));
  try {
    const assetScene = new ArchitectureBuilder("asset");
    assetScene.box("crate",{width:1,depth:1,height:1});
    const assetLevel = await compile(assetScene.document, { navigation: false });
    assert.deepEqual(assetLevel.diagnostics, []);
    await writeFile(join(temp, "crate.glb"), toGLB(assetLevel));

    const scene = new ArchitectureBuilder("cli-glb");
    scene.profile("plan",[[0,0,0],[8,0,0],[8,8,0],[0,8,0]]);const floor=scene.slab("level/floor","plan",{group:"level"});
    scene.add({kind:"visual-mesh",id:"crate",src:"crate.glb",position:[4,4,0]});
    scene.document.markers.push({
      id: "spawn",
      kind: "attacker_spawn",
      layer: "level",
      region: floor.id,
      position: [1, 1, 0],
    });
    const source = join(temp, "map.aml"),
      output = join(temp, "out");
    await writeFile(source, serializeAml(scene.document));
    const result = await run([
      "bin/levelspec.mjs",
      "build",
      source,
      "--formats",
      "glb",
      "--json",
      "--out",
      output,
      "--no-uv",
      "--strict-floor-gaps",
      "--surface-contacts",
      "error",
    ]);
    assert.equal(result.code, 0, result.stderr || result.stdout);
    assert.equal(JSON.parse(result.stdout).success, true);
    const exported = await readFile(join(output, "cli-glb.glb"));
    assert.equal(exported.toString("ascii", 0, 4), "glTF");
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});
