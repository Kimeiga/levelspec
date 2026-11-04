import { it } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { join, resolve, dirname, basename } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

const tool = resolve("tools/vector-migrate.ts");
const room = () => ({
  schema_version: "1.1", id: "cli-room", name: "CLI room", units: "meters",
  coordinate_system: "right-handed Z-up",
  layers: [{ id: "ground", z: 0, height: 3, roof: false, spaces: [{ id: "room", rect: [0, 0, 6, 6] }] }],
});

async function validate(spec: object) {
  const cwd = await mkdtemp(join(tmpdir(), "levelspec-migration-"));
  try {
  await mkdir(join(cwd, "maps"));
  await mkdir(join(cwd, "levels"));
  await writeFile(join(cwd, "levels/input.json"), JSON.stringify(spec));
  const child = spawnSync(process.execPath, [tool, "--validate"], { cwd, encoding: "utf8", timeout: 30_000 });
  assert.ifError(child.error);
  const report = JSON.parse(await readFile(join(cwd, "generated/migration-report.json"), "utf8"));
  return { status: child.status, row: report[0], output: child.stdout + child.stderr };
  } finally {
    assert.equal(dirname(cwd), resolve(tmpdir()));
    assert.match(basename(cwd), /^levelspec-migration-/);
    await rm(cwd, { recursive: true, force: true });
  }
}

it("accepts a source only when both legacy and migrated validation pass", async () => {
  const result = await validate(room());
  assert.equal(result.status, 0, result.output);
  assert.equal(result.row.legacyPassed, true);
  assert.equal(result.row.passed, true);
});

it("rejects an expected failure that unexpectedly validates", async () => {
  const result = await validate({ ...room(), expect_fail: true });
  assert.equal(result.row.passed, true);
  assert.notEqual(result.status, 0, result.output);
});

it("rejects legacy errors even when the migrated geometry validates", async () => {
  const spec = { ...room(), layers: [{ ...room().layers[0], internal_walls: false }] };
  spec.layers[0].spaces.push({ id: "overlap", rect: [4, 0, 6, 6] });
  const result = await validate(spec);
  assert.equal(result.row.legacyPassed, false);
  assert.equal(result.row.passed, true);
  assert.notEqual(result.status, 0, result.output);
});

it("rejects v2 clearance failures that the legacy cell graph misses", async () => {
  const result = await validate({ ...room(), covers: [{ id: "beam", layer: "ground", rect: [2, 2, 2, 2], z_offset: 0.46, height: 0.5 }] });
  assert.equal(result.row.legacyPassed, true);
  assert.equal(result.row.passed, false);
  assert.notEqual(result.status, 0, result.output);
});

it("retains the intentionally invalid corpus fixture as a rejection", async () => {
  const result = await validate(JSON.parse(await readFile("levels/zz_broken_by_design.json", "utf8")));
  assert.equal(result.row.legacyPassed, false);
  assert.equal(result.row.passed, false);
  assert.equal(result.status, 0, result.output);
});
