import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  compile,
  parseAml,
  generateUVs,
  auditUVs,
  collisionMesh,
} from "levelspec";
import { buildCourtyard } from "../tools/fixtures/courtyard/architecture.ts";
import { sourceForState } from "../tools/fixtures/courtyard/variants.ts";

const receiverCases = [
  {
    name: "courtyard clay default atlas",
    source: buildCourtyard({ height: 3, look: "clay" }),
    resolution: 2048,
    expectTiny: true,
  },
  ...(
    [
      { look: "clay", curve: 3, height: 3 },
      { look: "chalk", curve: 6, height: 5 },
      { look: "night", curve: 0, height: 3.5 },
    ] as const
  ).map((preset) => ({
    name: `published ${preset.look} atlas`,
    source: sourceForState({
      ...preset,
      blocked: false,
    }),
    resolution: 1024,
    expectTiny: preset.look === "clay",
  })),
];
for (const fixture of receiverCases)
  it(`retains every positive-area receiver in ${fixture.name} without changing collision`, async () => {
    const level = await compile(parseAml(fixture.source), {
      navigation: false,
    });
    const before = structuredClone(level.mesh),
      physical = collisionMesh(level),
      geometryHash = level.geometryHash;
    const corners = (mesh: typeof before, triangle: number) =>
      mesh.indices
        .slice(triangle * 3, triangle * 3 + 3)
        .flatMap((index) => mesh.positions.slice(index * 3, index * 3 + 3));
    let tinyReceivers = 0;
    await generateUVs(level, { resolution: fixture.resolution });
    assert.equal(level.geometryHash, geometryHash);
    assert.deepEqual(collisionMesh(level), physical);
    assert.deepEqual(level.mesh.surfaces, before.surfaces);
    assert.deepEqual(level.mesh.normals, before.normals);
    assert.deepEqual(level.mesh.uv, before.uv);
    for (let triangle = 0; triangle < before.surfaces.length; triangle++) {
      const surface = level.surfaces[before.surfaces[triangle]];
      assert.deepEqual(
        corners(level.mesh, triangle),
        corners(before, triangle),
        `Triangle ${triangle} retains its exact original corner sequence`,
      );
      if (surface.dynamic || surface.visible === false) continue;
      const p = corners(before, triangle),
        a = [p[3] - p[0], p[4] - p[1], p[5] - p[2]],
        b = [p[6] - p[0], p[7] - p[1], p[8] - p[2]];
      const area =
        Math.hypot(
          a[1] * b[2] - a[2] * b[1],
          a[2] * b[0] - a[0] * b[2],
          a[0] * b[1] - a[1] * b[0],
        ) / 2;
      if (area <= 0) continue;
      if (area < 1e-8) tinyReceivers++;
      assert.ok(
        level.mesh.atlasPages![triangle] >= 0,
        `Positive-area receiver ${triangle} has an atlas page`,
      );
      assert.ok(
        level.mesh.chartIds![triangle] >= 0,
        `Positive-area receiver ${triangle} has a chart`,
      );
      const uv = level.mesh.indices
        .slice(triangle * 3, triangle * 3 + 3)
        .flatMap((index) =>
          level.mesh.uv1!.slice(index * 2, index * 2 + 2).map(Math.fround),
        );
      assert.ok(
        Math.abs(
          (uv[2] - uv[0]) * (uv[5] - uv[1]) - (uv[3] - uv[1]) * (uv[4] - uv[0]),
        ) > 0,
        `Receiver ${triangle} survives Float32 UV storage`,
      );
    }
    if (fixture.expectTiny)
      assert.ok(
        tinyReceivers > 0,
        "The fixture contains independently measured positive sub-1e-8 m² receivers",
      );
    assert.deepEqual(auditUVs(level), []);
    if (fixture.expectTiny)
      assert.ok(
        level.stats.uvSeededTriangles > 0,
        "Omitted receiver recovery is reported explicitly",
      );
    assert.ok(
      level.stats.uvSeedMaxExpansionTexels >= 0 &&
        level.stats.uvSeedMaxExpansionTexels <= 0.125,
    );
    assert.ok(level.stats.uvPrecisionMaxAdjustmentTexels <= 0.125);
  });

describe("Dust2 precision and UV regression", () => {
  it("packs real curved stairs and wall-junction seam faces without changing mesh attributes", async () => {
    const source = await readFile(
      new URL("../examples/dust2.aml", import.meta.url),
      "utf8",
    );
    const level = await compile(parseAml(source), { navigation: false });
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
