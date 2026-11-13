import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  compile,
  parseAml,
  validateForRuntime,
} from "levelspec";
import { buildCourtyard } from "../../tools/fixtures/courtyard/architecture.ts";
import { sourceForCurve } from "../../tools/fixtures/courtyard/variants.ts";
import { overlappingSurfaces } from "../../tests/fixtures/courtyard/surface-audit.ts";
import { materialDescriptions } from "../../tools/fixtures/courtyard/world-styles.ts";
import type { CompiledLevel } from "../../src/vector/types.ts";
test("surface audit detects overlap, not merely shared edges or opposing faces", () => {
  const level = {
    mesh: {
      positions: [0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 0, 2, 0, 0, 0, 2, 0],
      indices: [0, 1, 2, 3, 4, 5],
      surfaces: [0, 1],
    },
    surfaces: [
      { id: "a", object: "a" },
      { id: "b", object: "b" },
    ],
  } as unknown as CompiledLevel;
  assert.equal(overlappingSurfaces(level)[0].area, 2);
  level.mesh.indices = [0, 1, 2, 3, 5, 4];
  assert.deepEqual(overlappingSurfaces(level), []);
});
test("styles use genuinely different images and authored features, not just recolors", async () => {
  const sets: Set<string>[] = [];
  for (const look of ["clay", "chalk", "night"] as const) {
    const materials = materialDescriptions(look);
    const images = new Set(materials.map((m) => m.texture));
    assert.equal(images.size, 6);
    sets.push(
      new Set(
        [...images].map((ref) =>
          createHash("sha256")
            .update(readFileSync(new URL("../assets/" + ref, import.meta.url)))
            .digest("hex"),
        ),
      ),
    );
    const level = await compile(
      parseAml(buildCourtyard({ look, height: 3 })),
    );
    assert.ok(
      level.surfaces.some((s) =>
        s.object.startsWith(
          look === "clay"
            ? "clay.belvedere."
            : look === "chalk"
              ? "chalk.west-roof."
              : "night.monitor.",
        ),
      ),
    );
  }
  for (let i = 0; i < 3; i++)
    for (let j = i + 1; j < 3; j++)
      assert.ok([...sets[i]].filter((hash) => !sets[j].has(hash)).length >= 4);
});
test("chalk/slate curve-elevation boundary variations validate without weakening gates", async () => {
  for (const look of ["chalk", "night"] as const) {
    for (const height of [3, 4.5, 6]) {
      for (const curve of [0, 3, 6]) {
        const level = await compile(
          parseAml(
            sourceForCurve(buildCourtyard({ look, height }), curve),
          ),
        );
        const report = await validateForRuntime(level, { sealed: true });
        assert.equal(
          report.passed,
          true,
          JSON.stringify({
            look,
            height,
            curve,
            diagnostics: report.diagnostics,
          }),
        );
        assert.deepEqual(report.diagnostics, []);
        assert.deepEqual(
          overlappingSurfaces(level),
          [],
          `${look} h=${height} curve=${curve}`,
        );
      }
    }
  }
});
test("Lantern Court trim and capitals have no same-facing coplanar conflicts at representative elevations", async () => {
  for (const height of [3, 4.5, 6]) {
    for (const curve of [0, 3, 6]) {
      const level = await compile(
        parseAml(sourceForCurve(buildCourtyard({ height }), curve)),
      );
      assert.deepEqual(
        overlappingSurfaces(level),
        [],
        `height=${height} curve=${curve}`,
      );
    }
  }
});
