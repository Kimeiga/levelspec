import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { isRunArtifact, prepareRunOutput } from "../tools/reconstruct-output.ts";
import { parseAml, serializeAml } from "levelspec";
import { NavigationSurface } from "../review/navigation-surface.ts";

describe("reconstruction output hygiene", () => {
  it("removes only prior generated files, including obsolete iteration drafts", async () => {
    const root = await mkdtemp(join(tmpdir(), "levelspec-output-"));
    try {
      for (const name of ["best.aml", "best.glb", "best-collision.glb",
        "best.runtime.json", "result.json", "run-config.json", "iteration-00.json",
        "iteration-10.aml", "notes.txt"]) await writeFile(join(root, name), "old");
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
      const oldSource = join(root, "best.aml");
      await writeFile(oldSource, "<invalid>");
      await writeFile(join(root, "best.glb"), "obsolete");
      const run = spawnSync(process.execPath, [
        "tools/reconstruct.ts", "--source", oldSource, "--out", root,
      ], { cwd: process.cwd(), encoding: "utf8", timeout: 30000 });
      assert.equal(run.status, 1, run.stderr || run.stdout);
      assert.ok(!run.stderr.includes("ENOENT"), "Input must be captured before cleanup.");
      assert.ok((await readdir(root)).includes("iteration-00.aml"));
      assert.equal(await readFile(join(root, "iteration-00.aml"), "utf8"), "<invalid>");
      assert.equal(JSON.parse(await readFile(join(root, "result.json"), "utf8")).accepted, false);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
  it("does not leave a previous successful export after a failed CLI run", async () => {
    const root = await mkdtemp(join(tmpdir(), "levelspec-stale-"));
    const out = join(root, "output"), source = join(root, "bad.aml");
    try {
      await mkdir(out);
      await writeFile(source, "<invalid>");
      for (const name of ["best.aml", "best.glb", "best-collision.glb",
        "best.runtime.json", "result.json", "iteration-17.json"])
        await writeFile(join(out, name), "previous-success");
      await writeFile(join(out, "notes.txt"), "preserve");
      const run = spawnSync(process.execPath, [
        "tools/reconstruct.ts", "--source", source, "--out", out,
      ], { cwd: process.cwd(), encoding: "utf8", timeout: 30000 });
      assert.equal(run.status, 1, run.stderr || run.stdout);
      const entries = await readdir(out);
      assert.ok(entries.includes("result.json"));
      assert.ok(entries.includes("iteration-00.aml"));
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

describe("reconstruction CLI navigation resolution", () => {
  it("records effective and requested settings and exports matching navigation without accepting absent photo evidence", async () => {
    const root = await mkdtemp(join(tmpdir(), "levelspec-reconstruct-navigation-"));
    try {
      const source = join(root, "doorway.aml"), xml = serializeAml(navigationDoorway());
      await writeFile(source, xml);
      for (const explicit of [false, true]) {
        const out = join(root, explicit ? "explicit" : "default");
        const args = ["tools/reconstruct.ts", "--source", source, "--out", out];
        if (explicit) args.push("--nav-cell", "0.0625");
        const run = spawnSync(process.execPath, args, { cwd: process.cwd(), encoding: "utf8", timeout: 30000 });
        assert.equal(run.status, 1, run.stderr || run.stdout);
        const cell = explicit ? 0.0625 : 0.125;
        const config = JSON.parse(await readFile(join(out, "run-config.json"), "utf8"));
        assert.deepEqual(config.navigation, { cell, source: explicit ? "explicit" : "default" });
        const attempt = JSON.parse(await readFile(join(out, "iteration-00.json"), "utf8"));
        const result = JSON.parse(await readFile(join(out, "result.json"), "utf8"));
        for (const record of [attempt, result]) {
          assert.deepEqual(record.navigation, { cell });
          assert.equal(record.accepted, false, "Navigation settings do not waive independent image evidence");
          assert.equal(record.report.verifiedViews, 0);
        }
        assert.equal(attempt.valid, true, JSON.stringify(attempt.diagnostics));
        const runtime = JSON.parse(await readFile(join(out, "best.runtime.json"), "utf8"));
        assert.equal(runtime.navigation.settings.cell, cell);
        assert.equal(runtime.navigation.settings.player.radius, 0.25);
        assert.equal(runtime.navigation.settings.player.height, 1.8);
        const surface = new NavigationSurface(runtime.navigation, [3, 3, 0]);
        const reached = surface.move([3, 3, 0], 2, 0)[0];
        if (explicit) assert.ok(Math.abs(reached - 5) < 0.01, "Fine setting survives runtime validation and export");
        else assert.ok(reached < 3.85, "Omitted setting preserves the existing coarse bake");
        assert.equal(await readFile(join(out, "iteration-00.aml"), "utf8"), xml);
      }
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it("retains resolution provenance when the candidate is invalid and has no runtime export", async () => {
    const root = await mkdtemp(join(tmpdir(), "levelspec-reconstruct-nav-failure-"));
    try {
      const source = join(root, "invalid.aml"), out = join(root, "output");
      await writeFile(source, "<invalid>");
      const run = spawnSync(process.execPath, ["tools/reconstruct.ts", "--source", source,
        "--out", out, "--nav-cell", "0.0625"], { cwd: process.cwd(), encoding: "utf8", timeout: 30000 });
      assert.equal(run.status, 1, run.stderr || run.stdout);
      const config = JSON.parse(await readFile(join(out, "run-config.json"), "utf8"));
      assert.deepEqual(config.navigation, { cell: 0.0625, source: "explicit" });
      for (const file of ["iteration-00.json", "result.json"]) {
        const record = JSON.parse(await readFile(join(out, file), "utf8"));
        assert.deepEqual(record.navigation, { cell: 0.0625 });
        assert.equal(record.accepted, false);
        assert.equal(record.report, null);
      }
      assert.ok(!(await readdir(out)).some(name => name.startsWith("best.")));
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it("rejects out-of-contract CLI values before replacing output, then recovers at inclusive bounds", async () => {
    const root = await mkdtemp(join(tmpdir(), "levelspec-reconstruct-nav-bounds-"));
    try {
      const source = join(root, "source.aml"), out = join(root, "output");
      await writeFile(source, budgetFixture());
      await mkdir(out);
      await writeFile(join(out, "result.json"), "existing-result");
      for (const value of ["", "NaN", "Infinity", "0", "-0.1", "0.0249", "0.5001", "invalid", undefined]) {
        const args = ["tools/reconstruct.ts", "--source", source, "--out", out, "--nav-cell"];
        if (value !== undefined) args.push(value);
        const run = spawnSync(process.execPath, args, { cwd: process.cwd(), encoding: "utf8", timeout: 30000 });
        assert.equal(run.status, 1, run.stderr || run.stdout);
        assert.match(run.stderr, /nav-cell|navigation cell/i);
        assert.equal(await readFile(join(out, "result.json"), "utf8"), "existing-result");
      }
      for (const cell of [0.025, 0.5]) {
        const run = spawnSync(process.execPath, ["tools/reconstruct.ts", "--source", source,
          "--out", out, "--nav-cell", String(cell)], { cwd: process.cwd(), encoding: "utf8", timeout: 30000 });
        assert.equal(run.status, 1, run.stderr || run.stdout);
        const attempt = JSON.parse(await readFile(join(out, "iteration-00.json"), "utf8"));
        assert.equal(attempt.valid, true, JSON.stringify(attempt.diagnostics));
        assert.deepEqual(attempt.navigation, { cell });
      }
    } finally { await rm(root, { recursive: true, force: true }); }
  });
});

/** Valid geometry with a supported spawn, but no photographs to establish fidelity. */
function budgetFixture() {
  return '<architecture version="1" id="source-budget" validation="premap"><profile id="plan" points="0 0;8 0;8 8;0 8"/><slab id="ground" profile="plan"/><marker id="spawn" kind="spawn" position="4 4 0"/></architecture>' + '<!--' + 'fixture padding '.repeat(80) + '-->';
}

/** Native doorway matches the independently dimensioned 0.70m passage fixture. */
function navigationDoorway(){return parseAml('<architecture version="1" id="doorway" validation="premap"><player radius="0.25" height="1.8"/><profile id="plan" points="0 0;8 0;8 6;0 6"/><slab id="deck" profile="plan"/><box id="south" width="0.3" depth="2.65" height="3" position="3.85 0 0"/><box id="north" width="0.3" depth="2.65" height="3" position="3.85 3.35 0"/></architecture>');}

/** Runs the real CLI with an isolated output; every result still lacks source photographs. */
function evaluateBudget(source: string, out: string, budget?: string) {
  const args = ["tools/reconstruct.ts", "--source", source, "--out", out];
  if (budget !== undefined) args.push("--max-source-characters", budget);
  return spawnSync(process.execPath, args, { cwd: process.cwd(), encoding: "utf8", timeout: 30000 });
}

describe("reconstruction CLI source character budget", () => {
  it("admits identical oversized source only with an explicit sufficient budget, without accepting missing references", async () => {
    const root = await mkdtemp(join(tmpdir(), "levelspec-budget-"));
    try {
      const small = budgetFixture(), length = 2_000_001;
      const xml = small + "\n<!--" + "x".repeat(length - small.length - 8) + "-->";
      assert.equal(xml.length, length);
      const source = join(root, "source.aml");
      await writeFile(source, xml);
      const rejected = join(root, "default"), admitted = join(root, "explicit");
      const first = evaluateBudget(source, rejected);
      assert.equal(first.status, 1, first.stderr || first.stdout);
      const failure = JSON.parse(await readFile(join(rejected, "iteration-00.json"), "utf8"));
      assert.equal(failure.valid, false);
      assert.equal(failure.report, null);
      assert.ok(failure.diagnostics.some((message: string) => message.includes("2000001 > 2000000")));
      assert.equal(failure.accepted, false);
      assert.ok(!(await readdir(rejected)).some(name => name.startsWith("best.")));

      const second = evaluateBudget(source, admitted, String(length));
      assert.equal(second.status, 1, second.stderr || second.stdout);
      const attempt = JSON.parse(await readFile(join(admitted, "iteration-00.json"), "utf8"));
      assert.equal(attempt.valid, true);
      assert.equal(attempt.report.geometryPassed, true);
      assert.equal(attempt.report.navigationPassed, true);
      assert.equal(attempt.accepted, false);
      assert.equal(attempt.report.verifiedViews, 0);
      assert.ok(attempt.report.issues.some((message: string) => message.includes("Only 0 verified view")));
      assert.ok(!attempt.diagnostics.some((message: string) => message.includes("source character budget")));
      assert.equal(await readFile(join(admitted, "iteration-00.aml"), "utf8"), xml);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("preserves both inclusive configuration endpoints", async () => {
    const root = await mkdtemp(join(tmpdir(), "levelspec-budget-bounds-"));
    try {
      const xml = budgetFixture(), source = join(root, "source.aml");
      assert.ok(xml.length > 1000);
      await writeFile(source, xml);
      for (const budget of [1000, 10_000_000]) {
        const out = join(root, String(budget));
        const run = evaluateBudget(source, out, String(budget));
        assert.equal(run.status, 1, run.stderr || run.stdout);
        const attempt = JSON.parse(await readFile(join(out, "iteration-00.json"), "utf8"));
        assert.equal(attempt.accepted, false);
        if (budget === 1000) {
          assert.equal(attempt.report, null);
          assert.ok(attempt.diagnostics.some((message: string) => message.includes(`${xml.length} > 1000`)));
        } else {
          assert.equal(attempt.valid, true);
          assert.equal(attempt.report.geometryPassed, true);
          assert.equal(attempt.report.navigationPassed, true);
        }
      }
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects invalid budgets through the existing runner validation", async () => {
    const root = await mkdtemp(join(tmpdir(), "levelspec-budget-invalid-"));
    try {
      const source = join(root, "source.aml");
      await writeFile(source, budgetFixture());
      for (const budget of ["999", "10000001", "1000.5", "NaN", "Infinity"]) {
        const out = join(root, budget), run = evaluateBudget(source, out, budget);
        assert.equal(run.status, 1, run.stderr || run.stdout);
        assert.match(run.stderr, /maxSourceCharacters must be between 1000 and 10000000/);
        assert.ok(!(await readdir(out)).some(name => name.startsWith("best.")));
      }
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
