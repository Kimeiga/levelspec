import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  compile,
  parseLevelSvgx,
  validateForRuntime,
} from "../../src/vector/index.ts";
import type { V3 } from "../../src/vector/types.ts";
import {
  sourceForState,
  readState,
  writeState,
  normalizeHeight,
} from "../state.ts";
import { NavigationSurface } from "../navigation.ts";
const template = readFileSync(
  new URL("../demo.level.svgx", import.meta.url),
  "utf8",
);
const build = async (height: number, curve = 3, blocked = false) =>
  compile(
    parseLevelSvgx(
      sourceForState(template, { ...readState(""), height, curve, blocked }),
    ),
  );
test("height, access, material and presentation state survive a shared link", () => {
  const state = readState(
    "?height=5&curve=6&blocked=1&look=chalk&step=2&present=1",
  );
  assert.deepEqual(
    readState(
      writeState(new URL("https://example.com/levelspec/"), state).search,
    ),
    state,
  );
  assert.equal(normalizeHeight(NaN), 3);
  assert.equal(normalizeHeight(200), 5);
  assert.equal(normalizeHeight(-20), 2);
  assert.equal(readState("?look=toString&height=Infinity").look, "clay");
  assert.equal(readState("?height=Infinity").height, 3);
});
test("all 175 curve/elevation combinations pass the unchanged runtime validator", async () => {
  for (let height = 2; height <= 5; height += 0.5)
    for (let curve = 0; curve <= 6; curve += 0.25) {
      const level = await build(height, curve);
      const result = await validateForRuntime(level, { sealed: true });
      assert.equal(
        result.passed,
        true,
        JSON.stringify({ height, curve, diagnostics: result.diagnostics }),
      );
      assert.equal(result.diagnostics.length, 0);
      for (const vertex of level.document.layers[1].vertices)
        assert.equal(vertex.z, height);
      assert.equal(
        level.document.markers.find((m) => m.id === "objective")!.position[2],
        height,
      );
    }
});
test("closing both approaches really disconnects the terrace; repairing restores it", async () => {
  for (const height of [2, 3, 5]) {
    const broken = await build(height, 6, true);
    const bad = await validateForRuntime(broken, { sealed: true });
    assert.equal(bad.passed, false);
    assert.ok(bad.diagnostics.some((d) => d.code === "ROUTE_REQUIREMENT"));
    assert.equal(
      bad.navigation!.routes.find((r) => r.id === "climb")!.reachable,
      false,
    );
    assert.ok(bad.navigation!.unreachableRegions.includes("bridge"));
    const blockedSurface = new NavigationSurface(bad.navigation!, [2, 2, 0]);
    assert.equal(blockedSurface.locate([25, 5, height]), undefined);
    const repaired = await build(height, 6, false);
    const good = await validateForRuntime(repaired, { sealed: true });
    assert.equal(good.passed, true);
    assert.notEqual(repaired.geometryHash, broken.geometryHash);
  }
});
test("walking stops at walls and the light well, climbs stairs, and reaches the terrace", async () => {
  for (const height of [2, 3, 5]) {
    const level = await build(height);
    const nav = new NavigationSurface(level.navigation!, [2, 2, 0]);
    let p = nav.locate([2, 2, 0])!.point;
    const west = nav.move(p, -10, 0);
    assert.ok(west[0] > 0.35 && west[0] < 0.8);
    const well = nav.move([6, 2, p[2]], 0, 5);
    assert.ok(well[1] < 4);
    p = nav.move(p, 9, 0);
    p = nav.move(p, 0, 5.5);
    p = nav.move(p, 14, 0);
    p = nav.move(p, 0, -2.5);
    assert.ok(Math.abs(p[0] - 25) < 0.15, JSON.stringify(p));
    assert.ok(Math.abs(p[1] - 5) < 0.15, JSON.stringify(p));
    assert.ok(Math.abs(p[2] - height) < 0.15, JSON.stringify(p));
    assert.ok(nav.locate(p));
    assert.deepEqual(nav.move(p, NaN, 0), p);
  }
});
test("three spatial variations all retain usable geometry and navigation", async () => {
  for (const look of ["clay", "chalk", "night"] as const) {
    const l = await compile(
      parseLevelSvgx(
        sourceForState(template, {
          ...readState(""),
          look,
          height: look === "chalk" ? 5 : look === "night" ? 2 : 3,
          curve: look === "chalk" ? 6 : look === "night" ? 0 : 3,
        }),
      ),
    );
    assert.equal((await validateForRuntime(l, { sealed: true })).passed, true);
  }
});
