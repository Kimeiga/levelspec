import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { planToSpec, PlanError } from "../src/authoring/plan.ts";
import { compile as compileLegacy } from "../src/core/compiler.ts";
import { checkGeometry, validateForRuntime as validateLegacy } from "../src/core/validate.ts";
import { migrateText } from "../tools/migration/convert.ts";
import { compile } from "../src/vector/compiler.ts";
import { validateForRuntime } from "../src/vector/validate.ts";
import { parseLevelSvgx, serializeLevelSvgx } from "../src/vector/format.ts";
import { twoRooms, turnPlan } from "./fixtures/ramp.ts";

describe("plan authoring regressions", () => {
  for (const strip of ["...rr.....", "...rrr....", "..rrrr...."]) {
    it(`keeps a ${strip.split("r").length - 1}-cell ramp flight inside its strip`, () => {
      const report = validateLegacy(compileLegacy(planToSpec(twoRooms(strip))));
      const codes = report.diagnostics.filter((d) => d.severity === "error").map((d) => d.code);
      for (const code of ["PLACED_SOLID_CLIPS_WALL", "DUPLICATE_COPLANAR", "INTERSECTING_VOLUMES"])
        assert.ok(!codes.includes(code), codes.join(", "));
    });
  }
  for (const strip of ["...rr.....", "...rrr....", "..rrrr...."]) {
    for (const turns of [0, 1, 2, 3]) {
      it(`seals both landings of ${strip} climbing ${["N", "E", "S", "W"][turns]}`, () => {
        const level = compileLegacy(planToSpec(turnPlan(twoRooms(strip), turns)));
        const report = validateLegacy(level);
        assert.deepEqual(report.diagnostics.filter((d) => d.severity === "error"), []);
      });
    }
    for (const turns of [0, 1, 2, 3]) {
      it(`keeps stepped and same-width landings valid for ${strip} turned ${turns}`, () => {
        const source = twoRooms(strip);
        const sameWidth = source.replaceAll(".AAAAAAAA.", strip.replaceAll("r", "A"))
          .replaceAll(".BBBBBBBB.", strip.replaceAll("r", "B"));
        for (const text of [source.replace("grid: 1.6", "grid: 1.6\nstair_style: stepped"), sameWidth]) {
          const report = validateLegacy(compileLegacy(planToSpec(turnPlan(text, turns))));
          assert.deepEqual(report.diagnostics.filter((d) => d.severity === "error"), []);
        }
      });
    }
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
  it("keeps stacked stair guards clear when a wall cap starts beside a tread boundary", () => {
    const level = compileLegacy(planToSpec(readFileSync("maps/hand/riser.plan", "utf8")));
    const report = validateLegacy(level);
    assert.deepEqual(report.diagnostics.filter((d) => d.severity === "error"), []);
  });
  for (const turns of [0, 1, 2, 3]) {
    it(`keeps cap-adjacent slivers valid without removing their floor, turned ${turns}`, () => {
      const text = twoRooms("...rr.....").replace("grid: 1.6", "grid: 1.6\nwall_thickness: 0.2")
        .replace("+0.6", "+0.8");
      const level = compileLegacy(planToSpec(turnPlan(text, turns)));
      assert.deepEqual(validateLegacy(level).diagnostics.filter((d) => d.severity === "error"), []);
    });
    it(`keeps off-grid cap fragments non-overlapping, turned ${turns}`, () => {
      const text = twoRooms("...rr.....").replace("grid: 1.6", "grid: 1.1\nwall_thickness: 0.12")
        .replace("+0.6", "+1.21");
      const report = checkGeometry(compileLegacy(planToSpec(turnPlan(text, turns))).solids);
      assert.equal(report.zfight_pairs, 0, JSON.stringify(report.zfight_examples));
      assert.equal(report.intersecting_pairs, 0, JSON.stringify(report.intersecting_examples));
      assert.equal(report.degenerate, 0);
    });
  }
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
