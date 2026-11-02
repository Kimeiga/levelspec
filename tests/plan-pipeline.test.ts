import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { planToSpec, PlanError } from "../src/authoring/plan.ts";
import { compile as compileLegacy } from "../src/core/compiler.ts";
import { validateForRuntime as validateLegacy } from "../src/core/validate.ts";
import { migrateText } from "../tools/migration/convert.ts";
import { compile } from "../src/vector/compiler.ts";
import { validateForRuntime } from "../src/vector/validate.ts";
import { parseLevelSvgx, serializeLevelSvgx } from "../src/vector/format.ts";

const twoRooms = (strip: string, extra = "") => `id: ramp_test
grid: 1.6
layer g z=0 height=4 roof=no
legend
  A  low   "Low"   room
  B  high  "High"  room  +0.6
  r  climb "Ramp"  ramp
end
plan
..........
.BBBBBBBB.
.BBBBBBBB.
.BBBBBBBB.
${strip}
${strip}
${strip}
${strip}
${strip}
.AAAAAAAA.
.AAAAAAAA.
..........
end
mark attacker_spawn low attack
mark defender_spawn high defend
${extra}`;

describe("plan authoring regressions", () => {
  for (const strip of ["...rr.....", "...rrr....", "..rrrr...."]) {
    it(`keeps a ${strip.split("r").length - 1}-cell ramp flight inside its strip`, () => {
      const report = validateLegacy(compileLegacy(planToSpec(twoRooms(strip))));
      // Narrow strips still meet the rooms at concave corners (a separate,
      // documented NAVMESH_VOID_EDGE gap); this regression is about clipping.
      const codes = report.diagnostics.filter((d) => d.severity === "error").map((d) => d.code);
      for (const code of ["PLACED_SOLID_CLIPS_WALL", "DUPLICATE_COPLANAR", "INTERSECTING_VOLUMES"])
        assert.ok(!codes.includes(code), codes.join(", "));
    });
  }
  it("resolves no_spawn_los area names to the markers standing in them", () => {
    const spec = planToSpec(twoRooms("...rr.....", "no_spawn_los low high"));
    assert.deepEqual(spec.gameplay?.no_spawn_los,
      [["mark_attacker_spawn_low", "mark_defender_spawn_high"]]);
  });
  it("rejects a no_spawn_los name without a marker instead of skipping the check", () => {
    assert.throws(() => planToSpec(twoRooms("...rr.....", "no_spawn_los low nowhere")),
      (e: unknown) => e instanceof PlanError && /no_spawn_los.*nowhere/.test(e.message));
  });
  it("reports an unknown no_spawn_los marker in a JSON spec", () => {
    const spec = planToSpec(twoRooms("...rr....."));
    spec.gameplay!.no_spawn_los = [["mark_attacker_spawn_low", "missing"]];
    const report = validateLegacy(compileLegacy(spec));
    assert.ok(report.diagnostics.some((d) => d.code === "MARKER_REFERENCE" && d.severity === "error"));
  });
});

describe("v1 to v2 migration", () => {
  it("joins drawn ramps to their areas so v2 counts independent routes", async () => {
    const { document } = migrateText(readFileSync("maps/hand/kiln.plan", "utf8"));
    const level = await compile(document);
    const report = await validateForRuntime(level);
    const routes = report.navigation?.routes ?? [];
    assert.equal(routes.length, 4);
    for (const route of routes) assert.ok(route.disjointRoutes >= 2, `${route.id}: ${route.disjointRoutes}`);
    assert.deepEqual(report.diagnostics.filter((d) => d.severity === "error").map((d) => d.code), []);
  });
});

describe("v2 link areas", () => {
  it("counts routes through stairs between storeys", async () => {
    const { document } = migrateText(readFileSync("maps/hand/archive.plan", "utf8"));
    const report = await validateForRuntime(await compile(document));
    assert.deepEqual(report.diagnostics.filter((d) => d.severity === "error").map((d) => d.code), []);
    assert.ok((report.navigation?.routes ?? []).every((r) => r.disjointRoutes >= 1));
  });
  it("round-trips declared link areas through SVGX", () => {
    const { document } = migrateText(readFileSync("maps/hand/archive.plan", "utf8"));
    const parsed = parseLevelSvgx(serializeLevelSvgx(document));
    assert.ok(parsed.links.length > 0);
    assert.deepEqual(parsed.links.map((l) => [l.fromArea, l.toArea]),
      document.links.map((l) => [l.fromArea, l.toArea]));
  });
  it("reports a link that names an unknown area", async () => {
    const { document } = migrateText(readFileSync("maps/hand/archive.plan", "utf8"));
    document.links[0].toArea = "no_such_area";
    const level = await compile(document, { navigation: false });
    assert.ok(level.diagnostics.some((d) => d.code === "LINK_AREA" && d.severity === "error"));
  });
});
