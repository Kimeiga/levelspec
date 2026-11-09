import { readFile } from "node:fs/promises";
import { test } from "node:test";
import assert from "node:assert/strict";
import { heightAt } from "../src/vector/geometry.ts";
import { Ray, Vector3 } from "three";
import { compile, parseAml, serializeAml, validateForRuntime, collisionMesh } from "levelspec";
import { migrateSvgx } from "levelspec/migration";

const source = await readFile(new URL("../examples/dust2.level.svgx", import.meta.url), "utf8");
const document = await migrateSvgx(source);
const maintained = parseAml(await readFile(new URL("../examples/dust2.aml", import.meta.url), "utf8"));
const built = compile(maintained);

const routes = [
  ["b_doors_route", "b_doors_route.from", "b_doors_route.to", 10],
  ["b_tunnel_threshold_route", "b_tunnel_threshold_route.from", "b_tunnel_threshold_route.to", 10],
  ["short_stair_route", "short_stair_route.from", "short_stair_route.to", 12],
  ["mid_stair_route", "mid_stair_route.from", "mid_stair_route.to", 12],
  ["pit_platform_route", "pit_platform_route.from", "pit_platform_route.to", 10],
  ["t_to_site_a", "t_spawn_mark", "site_a", 250],
  ["t_to_site_b", "t_spawn_mark", "site_b", 250],
  ["t_to_a_back_mark", "t_spawn_mark", "a_back_mark", 250],
  ["t_to_pit_mark", "t_spawn_mark", "pit_mark", 250],
  ["t_to_short_mark", "t_spawn_mark", "short_mark", 250],
  ["tunnel_bend_route", "tunnel_upper_mark", "tunnel_lower_mark", 15],
  ["ct_to_cross", "ct_spawn_mark", "ct_cross_mark", 28],
  ["short_to_site", "short_mark", "site_a", 32],
  ["long_to_site", "long_mark", "site_a", 55],
  ["long_to_goose", "long_mark", "goose_mark", 48],
  ["goose_to_site", "goose_mark", "site_a", 12],
] as const;

test("mechanical AML migration retains the exact sixteen Dust II route contracts", async () => {
  assert.deepEqual(document.routes.map(route => [route.id, route.from, route.to, route.maxDistance]), routes);
  assert.deepEqual(maintained.routes.map(route => [route.id, route.from, route.to, route.maxDistance]), routes);
  assert.ok(document.routes.every(route => route.minRoutes === 1));
  assert.equal(document.player.height, 2);
  assert.equal(document.player.radius, .25);
  assert.equal(document.player.step, .4);
  const level = await built, report = await validateForRuntime(level, { sealed: true });
  assert.equal(level.document.player.height, 2); assert.equal(level.document.player.radius, .25); assert.equal(level.document.player.step, .4);
  assert.ok(maintained.routes.every(route => route.minRoutes === 1));
  const mechanical = await compile(parseAml(serializeAml(document)), { navigation: false });
  const directMigration = await compile(document, { navigation: false });
  assert.equal(mechanical.physicalHash, directMigration.physicalHash);
  assert.equal(report.passed, true, JSON.stringify(report.diagnostics));
  assert.equal(level.navigation!.routes.length, 16);
  for (const [id, , , maximum] of routes) {
    const route = level.navigation!.routes.find(route => route.id === id);
    assert.ok(route?.reachable && route.disjointRoutes >= 1, id);
    assert.ok(route.distance < maximum, `${id}: ${route.distance} m exceeds ${maximum} m`);
  }
});

test("migrated Dust II retains physical Short/CT separation and local stair elevations", async () => {
  const level = await built, mesh = collisionMesh(level);
  const hit = (x: number, y: number, z: number, upward: boolean) => {
    const origin = new Vector3((x - 50) * .1, (1005 - y) * .1, z), ray = new Ray(origin, new Vector3(0, 0, upward ? 1 : -1));
    const distances: number[] = [];
    for (let i = 0; i < mesh.indices.length; i += 3) {
      const [a, b, c] = mesh.indices.slice(i, i + 3).map(index => new Vector3(...mesh.positions.slice(index * 3, index * 3 + 3)));
      const point = ray.intersectTriangle(a, b, c, false, new Vector3()); if (point) distances.push(point.z);
    }
    return distances.sort((a, b) => upward ? a - b : b - a)[0];
  };
  assert.ok(Math.abs(hit(650, 230, .1, true) - 3.8) < .0001, "Short slab must leave 3.8 m CT clearance");
  assert.ok(Math.abs(hit(650, 230, 1, false)) < .0001, "The CT route must have physical support at Z=0");
  assert.ok(Math.abs(hit(650, 230, 4.5, false) - 4) < .0001, "Short remains above CT at Z=4");
  assert.ok(Math.abs(hit(820, 120, 5, false) - 4.36) < .0001, "Goose stairs descend toward A");
});

test("native Dust II preserves independently recorded local elevations and directional transitions", async () => {
  const level = await built;
  const sample = (id: string, x: number, y: number): number => {
    const floor = level.floors.find(floor => floor.region === id); assert.ok(floor, id);
    const z = heightAt(floor, (x - 50) * .1, (1005 - y) * .1); assert.notEqual(z, undefined, `${id} at ${x},${y}`); return z!;
  };
  for (const [id, x, y, expected] of [
    ['a_short_site_connection', 625, 115, 4], ['ct_underpass', 650, 230, 0], ['a_short', 650, 230, 4],
    ['ct_a_ramp', 761.99, 230, 2], ['ct_a_stairs', 761.99, 267, 2], ['ct_a_landing', 770, 267, 2],
    ['long_a', 885, 470, 2], ['a_ramp', 885, 260, 2], ['a_back_platform', 820, 101, 4.54],
    ['a_north_stairs', 820, 112, 4.54], ['a_north_stairs', 820, 120, 4.36], ['a_north_stairs', 820, 130, 4.18],
    ['t_spawn', 490, 900, 3], ['t_spawn_ramp', 607, 900, 2], ['t_mid_ramp', 462, 850, 2], ['t_long_ramp', 630, 850, 2],
  ] as const) assert.ok(Math.abs(sample(id, x, y) - expected) < .001, `${id} expected ${expected}`);
  assert.ok(sample('ct_a_ramp', 700, 230) < sample('ct_a_ramp', 750, 230));
  assert.ok(sample('t_spawn_ramp', 500, 935) > sample('t_spawn_ramp', 600, 935));
  assert.ok(Math.abs(sample('t_spawn_ramp', 550, 890) - sample('t_spawn_ramp', 550, 975)) < .001);
});
