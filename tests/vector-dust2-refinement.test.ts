import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { compile, parseAml, type CompiledLevel, type V3 } from "levelspec";
import { cross, dot, heightAt, sub } from "../src/vector/geometry.ts";

const architecture = parseAml(
  await readFile(new URL("../examples/dust2.aml", import.meta.url), "utf8"),
);
const built = compile(architecture);
const document = (await built).document;
const point = (x: number, y: number, z = 0): V3 => [
  (x - 50) * 0.1,
  (1005 - y) * 0.1,
  z,
];
const close = (actual: number, expected: number, tolerance = 0.001) =>
  assert.ok(
    Math.abs(actual - expected) < tolerance,
    `${actual} != ${expected}`,
  );

function sample(level: CompiledLevel, id: string, x: number, y: number) {
  const patch = level.floors.find((floor) => floor.region === id);
  assert.ok(patch, `Missing ${id}`);
  const p = point(x, y),
    z = heightAt(patch, p[0], p[1]);
  assert.ok(z !== undefined, `${id} has no floor at radar (${x}, ${y})`);
  return z;
}

function groundAt(level: CompiledLevel, x: number, y: number) {
  const p = point(x, y);
  const hits = level.floors
    .filter((floor) => floor.layer === "ground")
    .flatMap((floor) => {
      const z = heightAt(floor, p[0], p[1]);
      return z === undefined ? [] : [{ floor, z }];
    });
  assert.ok(hits.length > 0, `Missing ground at radar (${x}, ${y})`);
  return hits;
}

/** Probe final shell triangles rather than accepting opening attributes alone. */
function crossings(level: CompiledLevel, from: V3, to: V3, wallsOnly = false) {
  const direction = sub(to, from),
    result: number[] = [];
  for (let t = 0; t < level.mesh.surfaces.length; t++) {
    const surface = level.surfaces[level.mesh.surfaces[t]];
    if (surface.dynamic || (wallsOnly && surface.kind !== "wall")) continue;
    const [a, b, c] = level.mesh.indices
      .slice(t * 3, t * 3 + 3)
      .map((i) => level.mesh.positions.slice(i * 3, i * 3 + 3) as V3);
    const e1 = sub(b, a),
      e2 = sub(c, a),
      h = cross(direction, e2),
      determinant = dot(e1, h);
    if (Math.abs(determinant) < 1e-9) continue;
    const s = sub(from, a),
      u = dot(s, h) / determinant;
    if (u < -1e-7 || u > 1 + 1e-7) continue;
    const q = cross(s, e1),
      v = dot(direction, q) / determinant;
    if (v < -1e-7 || u + v > 1 + 1e-7) continue;
    const along = dot(e2, q) / determinant;
    if (along > 1e-6 && along < 1 - 1e-6) result.push(along);
  }
  return result.sort((a, b) => a - b);
}

function treads(level: CompiledLevel, id: string) {
  const heights = new Set<number>();
  for (let t = 0; t < level.mesh.surfaces.length; t++) {
    const surface = level.surfaces[level.mesh.surfaces[t]];
    if (surface.kind !== "stairs" || surface.object !== id) continue;
    const p = level.mesh.indices
      .slice(t * 3, t * 3 + 3)
      .map((i) => level.mesh.positions.slice(i * 3, i * 3 + 3) as V3);
    if (
      Math.abs(p[0][2] - p[1][2]) > 1e-5 ||
      Math.abs(p[0][2] - p[2][2]) > 1e-5
    )
      continue;
    if (cross(sub(p[1], p[0]), sub(p[2], p[0]))[2] <= 1e-8) continue;
    heights.add(Math.round(p[0][2] * 1e5) / 1e5);
  }
  return [...heights].sort((a, b) => a - b);
}

describe("Dust II visual-refinement geometry acceptance", () => {
  it("constructs a real B divider with separate Doors and raised Window openings", async () => {
    const level = await built;
    const base = sample(level, "b_site", 260, 180);
    const blocked = (y: number, height: number) =>
      crossings(
        level,
        point(260, y, base + height),
        point(274, y, base + height),
        true,
      ).length > 0;
    assert.equal(
      blocked(180, 1.5),
      true,
      "The wall mass must divide the spaces between its openings.",
    );
    const faces = crossings(
      level,
      point(260, 180, base + 1.5),
      point(274, 180, base + 1.5),
      true,
    );
    close((faces.at(-1)! - faces[0]) * 1.4, 0.5);
    assert.equal(
      blocked(180, 4),
      true,
      "The B divider must retain its tall silhouette.",
    );
    assert.equal(
      blocked(180, 4.7),
      false,
      "The wall must stop at its authored cap.",
    );
    assert.equal(
      blocked(233, 0.2),
      false,
      "Doors must open all the way to the walking floor.",
    );
    assert.equal(blocked(233, 3), false);
    for (const y of [215, 251]) assert.equal(blocked(y, 1.5), false);
    for (const y of [212, 254]) assert.equal(blocked(y, 1.5), true);
    assert.equal(blocked(233, 3.5), true, "Doors need a remaining lintel.");
    assert.equal(blocked(137, 0.5), true, "Window must have an elevated sill.");
    assert.equal(blocked(137, 1.5), false);
    for (const y of [127, 147]) assert.equal(blocked(y, 1.5), false);
    for (const y of [124, 150]) assert.equal(blocked(y, 1.5), true);
    assert.equal(
      blocked(137, 3.3),
      true,
      "Window must have a remaining lintel.",
    );
  });

  it("gives A Short twelve compact treads and preserves CT clearance below the upper bridge", async () => {
    const level = await built;
    const levels = treads(level, "a_short_stairs");
    assert.equal(levels.length, 12);
    levels.forEach((z, i) => close(z, 2 + (i + 1) / 6));
    close(sample(level, "catwalk", 650, 377), 2);
    close(
      sample(level, "a_short_stairs", 650, 335),
      sample(level, "a_short", 650, 335),
    );
    close(sample(level, "a_short", 650, 230), 4);
    close(sample(level, "ct_underpass", 650, 230), 0);
    const hits = crossings(level, point(650, 230, 0.05), point(650, 230, 4.05));
    assert.ok(hits.length > 0, "The actual overhead slab must exist.");
    close(0.05 + hits[0] * 4, 3.8);
  });

  it("restores a narrow Mid side staircase beside the central incline", async () => {
    const level = await built;
    const candidates = groundAt(level, 497, 510);
    const stair = candidates.find(({ floor }) =>
      document.layers
        .flatMap((layer) => layer.regions)
        .some(
          (region) => region.id === floor.region && region.fill === "stairs",
        ),
    );
    assert.ok(
      stair,
      "The Catwalk-side Mid strip must be actual staircase geometry.",
    );
    const levels = treads(level, stair.floor.region);
    assert.equal(levels.length, 16);
    levels.forEach((z, i) => close(z, (i + 1) * 0.125));
    const x = stair.floor.points.map((p) => p[0]);
    close(Math.max(...x) - Math.min(...x), 1.4);
    for (const radarY of [480, 548]) {
      const expected = radarY < 485 ? 0 : 2;
      groundAt(level, 480, radarY)
        .concat(groundAt(level, 497, radarY))
        .forEach(({ z }) => close(z, expected));
    }
    const west = groundAt(level, 480, 515);
    west.forEach(({ z }) => close(z, 1));
    close(sample(level, "catwalk_approach", 520, 520), 2);
  });

  it("uses the corrected nearby passages instead of passing via remote detours", async () => {
    const level = await built;
    for (const [id, limit] of [
      ["b_doors_route", 10],
      ["b_tunnel_threshold_route", 10],
      ["short_stair_route", 12],
      ["mid_stair_route", 12],
      ["pit_platform_route", 10],
    ] as const) {
      const route = level.navigation?.routes.find((route) => route.id === id);
      assert.ok(route?.reachable, `Missing traversable local route ${id}`);
      assert.ok(
        route.distance < limit,
        `${id} uses a ${route.distance} m detour`,
      );
      assert.ok(
        route.disjointRoutes >= 1,
        `${id} lost authored semantic connectivity`,
      );
    }
  });
});

it("retains final-collision B thresholds, B approach grade and Pit elevation joins", async () => {
  const level = await built,
    mesh = level.physicalMesh ?? level.mesh;
  const { Ray, Vector3 } = await import("three");
  /** Samples the actual nearest collision surface below an independently placed probe. */
  const top = (x: number, y: number) => {
    const ray = new Ray(new Vector3(...point(x, y, 5)), new Vector3(0, 0, -1));
    let highest = -Infinity;
    for (let i = 0; i < mesh.indices.length; i += 3) {
      if (level.surfaces[mesh.surfaces[i / 3]].collidable === false) continue;
      const triangle = mesh.indices
        .slice(i, i + 3)
        .map(
          (index) =>
            new Vector3(...mesh.positions.slice(index * 3, index * 3 + 3)),
        );
      const hit = ray.intersectTriangle(
        triangle[0],
        triangle[1],
        triangle[2],
        false,
        new Vector3(),
      );
      if (hit) highest = Math.max(highest, hit.z);
    }
    return highest;
  };
  for (const [x, y, z] of [
    [110, 327, 1.46],
    [110, 330, 1.64],
    [110, 344, 2],
    [110, 346, 2],
    [110, 347, 2],
    [290, 235, 1.27],
    [420, 235, 0.198],
    [444, 235, 0],
    [949, 559, 2],
    [949, 562, 2.15],
    [949, 590, 3.2],
    [949, 592, 3.2],
    [949, 644, 3.2],
    [885, 675, 0.2],
  ])
    close(top(x, y), z);
  assert.deepEqual(treads(level, "b_exit_stairs"), [1.64, 1.82, 2]);
  assert.equal(treads(level, "pit_stairs").length, 8);
});
