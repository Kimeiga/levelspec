import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { isRunArtifact, prepareRunOutput } from "../tools/reconstruct-output.ts";

describe("reconstruction output hygiene", () => {
  it("removes only prior generated files, including obsolete iteration drafts", async () => {
    const root = await mkdtemp(join(tmpdir(), "levelspec-output-"));
    try {
      for (const name of ["best.level.svgx", "best.glb", "best-collision.glb",
        "best.runtime.json", "result.json", "iteration-00.json",
        "iteration-10.level.svgx", "notes.txt"]) await writeFile(join(root, name), "old");
      await prepareRunOutput(root);
      assert.deepEqual(await readdir(root), ["notes.txt"]);
      assert.equal(isRunArtifact("iteration-abc.json"), false);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
  it("reads the previous best source before clearing its own output directory", async () => {
    const root = await mkdtemp(join(tmpdir(), "levelspec-inplace-"));
    try {
      const oldSource = join(root, "best.level.svgx");
      await writeFile(oldSource, "<invalid>");
      await writeFile(join(root, "best.glb"), "obsolete");
      const run = spawnSync(process.execPath, [
        "tools/reconstruct.ts", "--source", oldSource, "--out", root,
      ], { cwd: process.cwd(), encoding: "utf8", timeout: 30000 });
      assert.equal(run.status, 1, run.stderr || run.stdout);
      assert.ok(!run.stderr.includes("ENOENT"), "Input must be captured before cleanup.");
      assert.ok((await readdir(root)).includes("iteration-00.level.svgx"));
      assert.equal(await readFile(join(root, "iteration-00.level.svgx"), "utf8"), "<invalid>");
      assert.equal(JSON.parse(await readFile(join(root, "result.json"), "utf8")).accepted, false);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
  it("does not leave a previous successful export after a failed CLI run", async () => {
    const root = await mkdtemp(join(tmpdir(), "levelspec-stale-"));
    const out = join(root, "output"), source = join(root, "bad.level.svgx");
    try {
      await mkdir(out);
      await writeFile(source, "<invalid>");
      for (const name of ["best.level.svgx", "best.glb", "best-collision.glb",
        "best.runtime.json", "result.json", "iteration-17.json"])
        await writeFile(join(out, name), "previous-success");
      await writeFile(join(out, "notes.txt"), "preserve");
      const run = spawnSync(process.execPath, [
        "tools/reconstruct.ts", "--source", source, "--out", out,
      ], { cwd: process.cwd(), encoding: "utf8", timeout: 30000 });
      assert.equal(run.status, 1, run.stderr || run.stdout);
      const entries = await readdir(out);
      assert.ok(entries.includes("result.json"));
      assert.ok(entries.includes("iteration-00.level.svgx"));
      assert.ok(entries.includes("notes.txt"));
      assert.ok(!entries.some(name => name.startsWith("best.")));
      assert.ok(!entries.includes("best-collision.glb"));
      assert.ok(!entries.includes("iteration-17.json"));
      const result = JSON.parse(await readFile(join(out, "result.json"), "utf8"));
      assert.equal(result.accepted, false);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
