import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  compile,
  parseLevelSvgx,
  generateUVs,
  auditUVs,
} from "../src/vector/index.ts";

describe("Dust2 precision and UV regression", () => {
  it("packs real curved stairs and wall-junction seam faces without changing mesh attributes", async () => {
    const source = await readFile(
      new URL("../examples/dust2.level.svgx", import.meta.url),
      "utf8",
    );
    const level = await compile(parseLevelSvgx(source), { navigation: false });
    assert.deepEqual(
      level.diagnostics.filter((d) => d.severity === "error"),
      [],
    );
    const before = structuredClone(level.mesh),
      hash = level.geometryHash;
    await generateUVs(level);
    assert.deepEqual(auditUVs(level), []);
    assert.equal(level.geometryHash, hash);
    assert.deepEqual(level.mesh.positions, before.positions);
    assert.deepEqual(level.mesh.normals, before.normals);
    assert.deepEqual(level.mesh.uv, before.uv);
    assert.deepEqual(level.mesh.surfaces, before.surfaces);
    assert.ok(level.stats.uvPrecisionAdjustedVertices > 0);
    assert.ok(level.stats.uvPrecisionMaxAdjustmentTexels <= 0.125);
    assert.ok(
      level.atlas!.charts.length < level.mesh.surfaces.length / 2,
      "Shared triangles must remain connected instead of falling back to individual islands",
    );
    const stairs = level.parts.filter((p) => p.kind === "stairs");
    assert.ok(stairs.length > 0);
    assert.ok(
      stairs.some((part) => {
        const charts = new Set(
          part.triangles.map((t) => level.mesh.chartIds![t]),
        );
        return charts.size < part.triangles.length / 2;
      }),
    );
    // The actual GPU attribute representation must pass the same audit.
    level.mesh.uv1 = Array.from(new Float32Array(level.mesh.uv1!));
    assert.deepEqual(auditUVs(level), []);
    const invalid = structuredClone(level);
    invalid.mesh.uv1 = invalid.mesh.uv1!.map((v) => v * 0.1);
    assert.ok(
      auditUVs(invalid).some((d) => d.code === "UV_DENSITY"),
      "The precision guard must not weaken density validation",
    );
  });
});
