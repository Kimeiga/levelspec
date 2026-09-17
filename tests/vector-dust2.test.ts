import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  parseLevelSvgx,
  compile,
  validateForRuntime,
  toRuntime,
  toSVGPlan,
} from "../src/vector/index.ts";
import { heightAt } from "../src/vector/geometry.ts";

const source = await readFile(
  new URL("../examples/dust2.level.svgx", import.meta.url),
  "utf8",
);
const document = parseLevelSvgx(source);
const built = compile(document);

describe("CS2 Dust II spatial contract", () => {
  it("keeps the upper A connection level and takes the lower CT ramp east to Cross", async () => {
    const level = await built;
    const floor = (id: string) => {
      const patch = level.floors.find((f) => f.region === id);
      assert.ok(patch, `Missing floor ${id}`);
      return patch;
    };
    const sample = (id: string, x: number, y: number) => {
      const z = heightAt(floor(id), (x - 50) * 0.1, (1005 - y) * 0.1);
      assert.ok(z !== undefined, `${id} has no floor at radar (${x}, ${y})`);
      return z;
    };
    const close = (actual: number, expected: number) =>
      assert.ok(
        Math.abs(actual - expected) < 0.001,
        `${actual} != ${expected}`,
      );

    // The misplaced CT flight used to interrupt the upper route here. Inspect
    // compiled floor triangles, including both ends of the replacement landing.
    for (const [x, y] of [
      [625, 115],
      [675, 115],
      [625, 145],
      [675, 145],
    ])
      close(sample("a_short_site_connection", x, y), 4);
    close(
      sample("a_short", 650, 154),
      sample("a_short_site_connection", 650, 154),
    );
    const regions = document.layers.flatMap((layer) => layer.regions);
    assert.equal(
      regions.find((r) => r.id === "a_short_site_connection")!.fill,
      "floor",
    );
    const upperSite = level.floors.filter(
      (f) => f.region === "a_site" || f.region.startsWith("a_site."),
    );
    const atSite = (x: number, y: number) =>
      upperSite
        .map((f) => heightAt(f, (x - 50) * 0.1, (1005 - y) * 0.1))
        .filter((z) => z !== undefined);
    assert.ok(atSite(685, 140).some((z) => Math.abs(z - 4) < 0.001));
    assert.deepEqual(
      atSite(720, 205),
      [],
      "Raised A floor must not cover the lower CT ramp",
    );

    // The same XY position must retain distinct walkable lower and upper spans.
    // This southern sample also guards against truncating CT at radar Y=260.
    for (const [x, y] of [
      [650, 230],
      [670, 267],
    ]) {
      close(sample("ct_underpass", x, y), 0);
      close(sample("a_short", x, y), 4);
    }
    close(sample("ct_underpass", 681, 230), sample("ct_a_ramp", 681, 230));
    const west = sample("ct_a_ramp", 700, 230);
    const center = sample("ct_a_ramp", 720, 230);
    const east = sample("ct_a_ramp", 750, 230);
    assert.ok(
      west < center && center < east,
      "CT must climb east toward Cross",
    );
    close(sample("ct_a_ramp", 720, 205), center);
    close(sample("ct_a_ramp", 720, 250), center);

    // The real narrow stair strip is south/right of the broad ramp, not on the
    // upper bridge. Tread tops progress east and meet the same upper landing.
    assert.ok(
      sample("ct_a_stairs", 700, 267) < sample("ct_a_stairs", 720, 267),
    );
    assert.ok(
      sample("ct_a_stairs", 720, 267) < sample("ct_a_stairs", 750, 267),
    );
    assert.equal(heightAt(floor("ct_a_stairs"), 60, 88), undefined);
    close(sample("ct_a_ramp", 762, 230), 2);
    close(sample("ct_a_stairs", 762, 267), 2);
    close(sample("ct_a_landing", 762, 230), 2);
    close(sample("ct_a_landing", 770, 267), 2);
    close(
      sample("ct_a_landing", 780, 240),
      sample("ct_cross_transition", 780, 240),
    );
    close(sample("ct_cross_transition", 848, 240), sample("a_ramp", 848, 240));

    // Short distance limits reject a false success via a long detour elsewhere
    // on the map, independently checking both routes through this correction.
    for (const [id, limit] of [
      ["ct_to_cross", 28],
      ["short_to_site", 32],
    ] as const) {
      const route = level.navigation!.routes.find((r) => r.id === id);
      assert.ok(route?.reachable, `Missing traversable route ${id}`);
      assert.ok(route.distance < limit, `${id} detours ${route.distance} m`);
    }
    assert.deepEqual(
      level.diagnostics.filter((d) => d.code === "FLOOR_EDGE_GAP"),
      [],
    );
  });

  it("connects Long directly to higher Goose and descends south onto A", async () => {
    const level = await built;
    const sample = (id: string, x: number, y: number) => {
      const floor = level.floors.find((floor) => floor.region === id);
      assert.ok(floor, `Missing floor ${id}`);
      const z = heightAt(floor, (x - 50) * 0.1, (1005 - y) * 0.1);
      assert.ok(z !== undefined, `${id} has no floor at radar (${x}, ${y})`);
      return z;
    };
    const close = (actual: number, expected: number) =>
      assert.ok(
        Math.abs(actual - expected) < 0.001,
        `${actual} != ${expected}`,
      );

    // Cross and Long share the lower road. Its actual incline lies alongside
    // A's platform, rising north to the Goose apron rather than to a dead ledge.
    close(sample("long_a", 885, 470), 2);
    close(sample("long_a", 885, 365), sample("a_ramp", 885, 365));
    close(sample("a_ramp", 885, 260), 2);
    close(sample("a_ramp", 885, 220), sample("a_goose_side", 885, 220));
    assert.ok(
      sample("a_goose_side", 885, 120) > sample("a_goose_side", 885, 180),
    );
    close(sample("a_goose_side", 865, 160), sample("a_goose_side", 905, 160));
    close(
      sample("a_goose_side", 885, 110),
      sample("a_back_platform", 885, 110),
    );
    close(sample("a_back_platform", 820, 101), 4.54);

    // Goose is higher than A Default: the shallow steps descend SOUTH onto the
    // site. Actual treads guard against repeating the visual-reference misread;
    // CS2 lineup coordinates independently establish this elevation ordering.
    close(sample("a_north_stairs", 820, 112), 4.54);
    close(sample("a_north_stairs", 820, 120), 4.36);
    close(sample("a_north_stairs", 820, 130), 4.18);
    close(
      sample("a_north_stairs", 820, 110),
      sample("a_back_platform", 820, 110),
    );
    close(
      sample("a_north_stairs", 820, 130) - sample("a_site", 820, 132),
      0.18,
    );
    close(sample("a_site", 811, 170), 4);

    // Generic T-to-A reachability previously passed through Short while Long
    // took a 111 m detour. These nearby routes require the intended connection.
    for (const [id, limit] of [
      ["long_to_site", 55],
      ["long_to_goose", 48],
      ["goose_to_site", 12],
    ] as const) {
      const route = level.navigation!.routes.find((route) => route.id === id);
      assert.ok(route?.reachable, `Missing traversable route ${id}`);
      assert.ok(route.distance < limit, `${id} detours ${route.distance} m`);
    }
  });

  it("keeps A parapets on their intended supporting floors", async () => {
    const level = await built;
    const regions = document.layers.flatMap((layer) => layer.regions);
    const vertices = document.layers.flatMap((layer) => layer.vertices);
    const parapets = document.layers
      .flatMap((layer) => layer.edges)
      .filter((edge) => edge.id.startsWith("wall.a_platform."));
    assert.ok(parapets.length > 0);
    assert.ok(
      parapets.some(
        (edge) =>
          regions.find((region) => region.id === edge.baseFloor)?.area ===
          "a_site",
      ),
    );
    for (const edge of parapets) {
      const base = level.floors.find(
        (floor) => floor.region === edge.baseFloor,
      );
      if (edge.baseFloor) {
        assert.ok(base, `Missing supporting floor for ${edge.id}`);
        assert.ok(
          ["a_short", "a_site", "a_goose_side", "a_back_platform"].includes(
            base.area ?? base.region,
          ),
          `${edge.id} anchored to the wrong storey: ${edge.baseFloor}`,
        );
      }
      const a = vertices.find((vertex) => vertex.id === edge.from)!;
      const b = vertices.find((vertex) => vertex.id === edge.to)!;
      // The stair-side wall follows a smooth endpoint profile, independent of
      // tread count. Its outer face embeds the slab edge by 0.02 m, avoiding an
      // unsupported sliver while keeping the usable flight nearly 5 m wide.
      if (!base) {
        for (const point of [a, b]) {
          assert.ok(Math.abs(point.x - 79.5) < 0.001);
          const expected =
            4 + 0.54 * Math.max(0, Math.min(1, (point.y - 87.3) / 2.2));
          assert.ok(
            Math.abs(point.z - expected) < 0.001,
            `${edge.id} lost its smooth stair-side profile`,
          );
        }
        if (Math.abs(a.y - b.y) > 0.001) {
          assert.ok(
            Math.abs(
              a.x + (edge.thickness ?? document.wallThickness) / 2 - 79.82,
            ) < 0.001,
          );
        }
      }
      const baseHeight = (x: number, y: number) => {
        if (base) return heightAt(base, x, y);
        const t =
          ((x - a.x) * (b.x - a.x) + (y - a.y) * (b.y - a.y)) /
          ((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
        return a.z + t * (b.z - a.z);
      };

      // Check final shell triangles as well as source anchors: a source string
      // alone cannot establish that the visible parapet survived above its slab.
      let hasRaisedCap = false;
      for (let t = 0; t < level.mesh.surfaces.length; t++) {
        if (level.surfaces[level.mesh.surfaces[t]].object !== edge.id) continue;
        const points = [0, 1, 2].map((corner) => {
          const i = level.mesh.indices[3 * t + corner] * 3;
          return level.mesh.positions.slice(i, i + 3);
        });
        const center = [0, 1, 2].map(
          (axis) => points.reduce((sum, point) => sum + point[axis], 0) / 3,
        );
        const floorZ = baseHeight(center[0], center[1]);
        if (floorZ !== undefined && Math.abs(center[2] - floorZ - 0.8) < 0.001)
          hasRaisedCap = true;
      }
      assert.ok(
        hasRaisedCap,
        `${edge.id} has no 0.8 m parapet cap above its floor`,
      );

      if (!base && Math.abs(a.z - b.z) > 0.001) {
        // Check the final wall envelope after joins and shell booleans: its
        // east face seals the slab edge at X=79.8, and its west face leaves at
        // least 4.9 m of the north flight's width available to walk.
        const wallX: number[] = [];
        for (let t = 0; t < level.mesh.surfaces.length; t++) {
          if (level.surfaces[level.mesh.surfaces[t]].object !== edge.id)
            continue;
          for (let corner = 0; corner < 3; corner++)
            wallX.push(
              level.mesh.positions[level.mesh.indices[3 * t + corner] * 3],
            );
        }
        assert.ok(
          Math.abs(Math.max(...wallX) - 79.82) < 0.001,
          `${edge.id} leaves a ledge or protrudes excessively into the Long road`,
        );
        assert.ok(
          Math.min(...wallX) - 74.2 >= 4.9,
          `${edge.id} narrows the shallow flight`,
        );
      }
    }
  });

  it("descends east through T spawn while its northern approaches stay level", async () => {
    const level = await built;
    const floor = (id: string) => {
      const patch = level.floors.find((f) => f.region === id);
      assert.ok(patch, `Missing floor ${id}`);
      return patch;
    };
    // The source radar is registered at 0.1 metres per pixel, with north
    // pointing toward decreasing image Y. Query actual compiled triangles.
    const sample = (id: string, x: number, y: number) => {
      const z = heightAt(floor(id), (x - 50) * 0.1, (1005 - y) * 0.1);
      assert.ok(z !== undefined, `${id} has no floor at radar (${x}, ${y})`);
      return z;
    };
    const close = (actual: number, expected: number) =>
      assert.ok(
        Math.abs(actual - expected) < 0.001,
        `${actual} != ${expected}`,
      );

    const west = sample("t_spawn_ramp", 500, 935);
    const middle = sample("t_spawn_ramp", 550, 935);
    const east = sample("t_spawn_ramp", 600, 935);
    assert.ok(west > middle && middle > east, "Spawn must descend east/right");
    close(sample("t_spawn_ramp", 550, 890), middle);
    close(sample("t_spawn_ramp", 550, 975), middle);

    for (const y of [900, 950]) {
      close(sample("t_spawn", 490, y), 3);
      close(sample("t_spawn_ramp", 490, y), 3);
      close(sample("t_spawn_ramp", 607, y), 2);
      close(sample("t_spawn_low", 607, y), 2);
    }
    for (const y of [850, 870]) {
      close(sample("t_mid_ramp", 462, y), 2);
      close(sample("t_long_ramp", 630, y), 2);
    }
    close(sample("t_long_ramp", 630, 876), sample("t_spawn_low", 630, 876));
    close(sample("outside_long", 630, 835), sample("t_long_ramp", 630, 835));
    close(sample("t_platform", 250, 890), sample("t_spawn", 250, 890));
    close(
      sample("outside_tunnels_ramp", 120, 890),
      sample("t_spawn", 120, 890),
    );

    const marker = level.document.markers.find((m) => m.id === "t_spawn_mark")!;
    assert.ok(marker);
    const supportedHeight = heightAt(
      floor("t_spawn"),
      marker.position[0],
      marker.position[1],
    );
    assert.ok(supportedHeight !== undefined);
    close(supportedHeight, 3);
    close(marker.position[2], supportedHeight);
    // The parapet belongs on the high spawn side; anchoring it to lower Mid
    // buries its western end beneath the corrected spawn floor.
    const divider = level.document.layers
      .flatMap((l) => l.edges)
      .filter((e) => e.id.startsWith("wall.t_spawn."));
    assert.ok(divider.length > 0);
    for (const edge of divider)
      assert.ok(["t_spawn", "t_spawn_ramp"].includes(edge.baseFloor ?? ""));
  });

  it("keeps the winders in the outer half, with a flat center and level Mid hallway", async () => {
    const level = await built;
    const stairs = level.floors.find(
      (f) => f.region === "lower_tunnels_stairs",
    )!;
    const center = level.floors.find(
      (f) => f.region === "tunnel_center_platform",
    )!;
    const hallway = level.floors.find((f) => f.region === "lower_tunnels")!;
    assert.ok(stairs && center && hallway);
    assert.ok(center.points.every((p) => p[2] === 2));
    assert.ok(hallway.points.every((p) => p[2] === 0));
    const origin = [23.2, 56.5]; // Authored bend center in metres.
    for (const p of stairs.points) {
      const radius = Math.hypot(p[0] - origin[0], p[1] - origin[1]);
      assert.ok(
        radius >= 2.99 && radius <= 6.01,
        `Tread escaped outer half: ${radius}`,
      );
    }
    const r = document.layers
      .flatMap((l) => l.regions)
      .find((r) => r.id === stairs.region)!;
    for (const landing of [r.lower!, r.upper!]) {
      const p = level.curves[landing];
      assert.ok(
        Math.abs(
          Math.hypot(p[0][0] - p.at(-1)![0], p[0][1] - p.at(-1)![1]) - 3,
        ) < 0.001,
      );
    }
    assert.equal(
      level.parts.find((p) => p.id === center.region)?.kind ??
        level.surfaces.find((s) => s.object === center.region)?.kind,
      "floor",
    );
    const plan = toSVGPlan(level);
    assert.match(
      plan,
      /class="stair-treads" data-object="lower_tunnels_stairs"/,
    );
    assert.doesNotMatch(
      plan,
      /class="stair-treads" data-object="tunnel_center_platform"/,
    );
  });

  it("retains distinct entrance flights, CT ramp/side stairs, shallow Goose steps and Pit levels", () => {
    const regions = document.layers.flatMap((l) => l.regions);
    for (const id of [
      "tunnel_entry_stairs",
      "b_exit_stairs",
      "a_short_stairs",
      "ct_a_stairs",
      "a_north_stairs",
      "pit_stairs",
    ])
      assert.equal(regions.find((r) => r.id === id)?.fill, "stairs", id);
    for (const id of [
      "ct_a_ramp",
      "a_ramp",
      "pit_ramp",
      "outside_tunnels_ramp",
    ])
      assert.ok(
        ["floor", "ramp"].includes(regions.find((r) => r.id === id)!.fill),
        id,
      );
    const allVertices = document.layers.flatMap((l) => l.vertices);
    const allEdges = document.layers.flatMap((l) => l.edges);
    const z = (id: string) => {
      const r = regions.find((r) => r.id === id)!;
      return r.boundary.flatMap((ref) => {
        const e = allEdges.find((e) => e.id === ref.replace(/^-/, ""))!;
        return [e.from, e.to].map(
          (v) => allVertices.find((p) => p.id === v)!.z,
        );
      });
    };
    assert.ok(
      Math.max(...z("a_north_stairs")) - Math.min(...z("a_north_stairs")) <=
        0.55,
    );
    assert.ok(Math.min(...z("t_platform")) > Math.max(...z("outside_tunnels")));
    assert.ok(Math.min(...z("pit_platform")) > Math.max(...z("pit")));
  });

  it("compiles a smaller usable map with automatic capsule navigation and no uncovered floors", async () => {
    const level = await built;
    const report = await validateForRuntime(level, { sealed: true });
    // Traversability, shell gaps, and coplanar surfaces are independent audits.
    // Final Dust II geometry must satisfy all of them without accepted warnings.
    assert.deepEqual(report.diagnostics, []);
    assert.equal(report.passed, true);
    assert.equal(level.navigation?.coverage.uncoveredCount, 0);
    assert.equal(level.navigation?.settings.player.height, 2);
    assert.equal(level.navigation?.settings.player.radius, 0.25);
    assert.ok(
      level.stats.triangles < 12000,
      "Simplified architecture exceeded its regression budget",
    );
    assert.ok(level.navigation!.routes.every((r) => r.reachable));
    assert.ok(
      level.navigation!.routes.find((r) => r.id === "tunnel_bend_route")!
        .distance < 15,
    );
    assert.equal(toRuntime(level).navigation, level.navigation);
  });
});
