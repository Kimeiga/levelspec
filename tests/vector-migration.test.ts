import { it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { migrateSpec, migrateText } from "../tools/migration/convert.ts";
import { DEFAULTS, type LevelSpec } from "../src/core/types.ts";
import { compile } from "../src/vector/compiler.ts";
import { validateForRuntime } from "../src/vector/validate.ts";
import { planToSpec } from "../src/authoring/plan.ts";
import { compile as compileLegacy } from "../src/core/compiler.ts";

it("preserves the legacy capsule defaults when a JSON spec omits player settings", () => {
  const spec: LevelSpec = {
    schema_version: "1.1", id: "default-player", name: "Default player", units: "meters",
    coordinate_system: "right-handed Z-up",
    layers: [{ id: "ground", z: 0, height: 3, spaces: [{ id: "room", rect: [0, 0, 6, 6] }] }],
  };
  const { document } = migrateSpec(spec);
  for (const key of Object.keys(DEFAULTS.player) as (keyof typeof DEFAULTS.player)[])
    assert.equal(document.player[key], DEFAULTS.player[key], key);
});

for (const source of ["maps/cs/assault.plan", "maps/cs/brewery.plan", "maps/cs/calavera.plan", "maps/hand/archive_c.plan", "maps/cs/rails.plan", "maps/cs/lunacy.plan", "maps/cs/thera_lower.plan", "maps/cs/aztec.plan", "maps/cs/dust.plan"]) {
  it(`retains valid capsule clearance when migrating ${source}`, async () => {
    const { document } = migrateText(readFileSync(source, "utf8"));
    const report = await validateForRuntime(await compile(document));
    assert.deepEqual(report.diagnostics.filter(d => d.severity === "error"), []);
  });
}

for (const source of ["maps/hand/foundry.plan", "maps/hand/nuke.plan", "maps/hand/terminus_b.plan", "maps/hand/drydock_b.plan"]) {
  it(`places automatic markers outside stair bodies and punched floor holes in ${source}`, () => {
    const spec = planToSpec(readFileSync(source, "utf8"));
    const old = compileLegacy(spec);
    for (const marker of old.markers) {
      const inside = old.solids.filter(s => !s.dynamic &&
        marker.pos[0] > s.box.min[0] && marker.pos[0] < s.box.max[0] &&
        marker.pos[1] > s.box.min[1] && marker.pos[1] < s.box.max[1] &&
        marker.pos[2] + spec.player!.height > s.box.min[2] && marker.pos[2] + 0.03 < s.box.max[2]);
      assert.deepEqual(inside.map(s => s.id), [], marker.id);
      assert.ok(old.solids.some(s => s.layer === marker.layer && s.role === "floor" &&
        Math.abs(s.box.max[2] - marker.pos[2]) < 1e-6 &&
        marker.pos[0] >= s.box.min[0] && marker.pos[0] <= s.box.max[0] &&
        marker.pos[1] >= s.box.min[1] && marker.pos[1] <= s.box.max[1]), marker.id);
    }
  });
}

for (const source of ["levels/compiler_demo_hall.json", "levels/dust_three_lane_benchmark.json", "levels/cs_cache_reconstruction.json", "levels/original_ring_arena.json", "levels/vertical_stack_tower.json"]) {
  it(`meets the authored runtime requirements in ${source}`, async () => {
    const { document } = migrateText(readFileSync(source, "utf8"), true);
    const report = await validateForRuntime(await compile(document));
    assert.equal(report.passed, true, JSON.stringify(report.diagnostics.filter(d => d.severity === "error")));
  });
}

for (const source of ["maps/hand/interchange.plan", "maps/hand/kasbah.plan", "maps/hand/mirage.plan", "maps/hand/nuke.plan", "maps/hand/train.plan", "maps/hand/inferno.plan", "maps/hand/assembly_b.plan", "maps/hand/bathhouse.plan", "maps/hand/relay.plan", "maps/hand/riser.plan", "maps/hand/stacks_c.plan", "maps/hand/reserve.plan"]) {
  it(`retains the required independent approaches in ${source}`, async () => {
    const { document } = migrateText(readFileSync(source, "utf8"));
    const report = await validateForRuntime(await compile(document));
    assert.equal(report.passed, true, JSON.stringify(report.diagnostics.filter(d => d.severity === "error")));
    for (const requested of document.routes)
      assert.ok(report.navigation!.routes.find(r => r.id === requested.id)!.disjointRoutes >= requested.minRoutes);
  });
}

function adjacentRooms(): LevelSpec {
  return {
    schema_version: "1.1", id: "migration-crossings", name: "Migration crossings", units: "meters", coordinate_system: "right-handed Z-up",
    layers: [{ id: "ground", z: 0, height: 3, roof: false, spaces: [
      { id: "a", rect: [0, 0, 6, 8] }, { id: "b", rect: [6, 0, 6, 8] },
    ] }],
    gameplay: { markers: [
      { id: "start", layer: "ground", cell: [2, 4], kind: "attacker_spawn" },
      { id: "end", layer: "ground", cell: [9, 4], kind: "site" },
    ], required_routes: [{ id: "two-ways", from: "start", to: "end", min_routes: 2 }] },
  };
}

for (const width of [1, 4]) it(`counts a single ${width} m doorway once after migration`, async () => {
  const spec = adjacentRooms();
  spec.layers[0].portals = [{ id: "one-door", between: ["a", "b"], kind: "door", width_cells: width }];
  const { document } = migrateSpec(spec);
  const report = await validateForRuntime(await compile(document));
  assert.equal(report.navigation!.routes[0].disjointRoutes, 1);
  assert.ok(report.diagnostics.some(d => d.code === "ROUTE_REQUIREMENT"));
});

it("retains two separate openings between the same areas", async () => {
  const spec = adjacentRooms();
  spec.layers[0].spaces[0].open_to = ["b"];
  spec.layers[0].spaces[0].subtract = [[5, 3, 1, 2]];
  const { document } = migrateSpec(spec);
  const report = await validateForRuntime(await compile(document));
  assert.equal(report.navigation!.routes[0].disjointRoutes, 2);
  assert.equal(document.links.length, 2);
  assert.equal(report.passed, true, JSON.stringify(report.diagnostics));
});
