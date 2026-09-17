import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { compile } from "../src/vector/compiler.ts";
import { bakeNavmesh, validateForRuntime } from "../src/vector/validate.ts";
import { parseLevelSvgx, serializeLevelSvgx } from "../src/vector/format.ts";
import { toRuntime } from "../src/vector/export.ts";
import {
  createDocument,
  type LevelDocument,
  type V3,
} from "../src/vector/types.ts";

function floor(
  d: LevelDocument,
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  z = 0,
  walls = false,
) {
  let layer = d.layers[0];
  if (!layer) {
    layer = { id: "shared", vertices: [], edges: [], regions: [] };
    d.layers.push(layer);
  }
  const vertices = [
    [x, y],
    [x + w, y],
    [x + w, y + h],
    [x, y + h],
  ].map(([x, y], i) => ({ id: `${id}.v${i}`, x, y, z }));
  layer.vertices.push(...vertices);
  const edges = vertices.map((v, i) => ({
    id: `${id}.e${i}`,
    from: v.id,
    to: vertices[(i + 1) % 4].id,
    kind: walls ? ("wall" as const) : ("open" as const),
    openings: [],
  }));
  layer.edges.push(...edges);
  const region = {
    id,
    boundary: edges.map((e) => e.id),
    holes: [],
    interior: [],
    creases: [],
    fill: "floor" as const,
  };
  layer.regions.push(region);
  return region;
}
function spawn(d: LevelDocument, id: string, position: V3) {
  d.markers.push({ id, layer: "shared", position, kind: "spawn" });
}
function room() {
  const d = createDocument("navigation");
  floor(d, "room", 0, 0, 6, 6, 0, true);
  spawn(d, "start", [1, 1, 0]);
  return d;
}

describe("compiled capsule navigation and independent floor coverage", () => {
  it("includes source-linked navigation diagnostics in compilation, cache and runtime output", async () => {
    const d = room();
    d.layers[0].regions[0].ceiling = 1.8;
    d.layers[0].regions[0].area = "logical-room";
    const doc = parseLevelSvgx(serializeLevelSvgx(d)),
      level = await compile(doc),
      nav = level.navigation!;
    assert.deepEqual(level.diagnostics, []);
    assert.ok(level.mesh.indices.length > 0);
    const headroom = nav.diagnostics.find((d) => d.code === "NAV_HEADROOM");
    assert.ok(headroom);
    assert.deepEqual(headroom.objects, ["room"]);
    assert.deepEqual(headroom.source, doc.layers[0].regions[0].source);
    assert.deepEqual(
      nav.diagnostics.find(
        (d) =>
          d.code === "NAV_DISCONNECTED" && d.objects.includes("logical-room"),
      )?.source,
      headroom.source,
    );
    assert.ok(headroom.source!.line > 0);
    assert.ok(headroom.source!.column > 0);
    assert.deepEqual(toRuntime(level).navigation?.diagnostics, nav.diagnostics);
    const cached = await bakeNavmesh(level);
    assert.equal(cached, nav);
    const validation = await validateForRuntime(level);
    assert.deepEqual(validation.diagnostics, nav.diagnostics);
    assert.equal(
      validation.diagnostics.filter((d) => d.code === "NAV_HEADROOM").length,
      1,
    );
    // Moving source text must refresh locations while reusing the expensive bake.
    const source = { ...doc.layers[0].regions[0].source!, line: 999 };
    level.document.layers[0].regions[0].source = source;
    assert.equal(await bakeNavmesh(level), cached);
    assert.deepEqual(
      cached.diagnostics.find((d) => d.code === "NAV_HEADROOM")?.source,
      source,
    );
  });
  it("builds by default, delivers geometry first, and reuses an exact cache", async () => {
    const stages: string[] = [];
    let early = false;
    const level = await compile(room(), {
      onGeometry: (l) => {
        early = l.mesh.indices.length > 0 && !l.navigation;
        stages.push("geometry");
      },
      onProgress: (s) => stages.push(s),
    });
    assert.ok(early);
    assert.ok(level.navigation);
    assert.equal(
      level.navigation.passed,
      true,
      JSON.stringify(level.navigation.coverage),
    );
    assert.equal(level.navigation.settings.player.height, 2);
    assert.equal(level.navigation.settings.player.radius, 0.25);
    assert.equal(level.navigation.settings.cell, 0.125);
    assert.equal(level.navigation.settings.cellHeight, 0.05);
    assert.ok(stages.indexOf("geometry") < stages.indexOf("Navigation"));
    const report = await validateForRuntime(level);
    assert.equal(report.navigation, level.navigation);
    assert.equal(report.passed, true, JSON.stringify(report.diagnostics));
    const cached = level.navigation;
    assert.equal(await bakeNavmesh(level), cached);
    level.document.player.height = 2.1;
    assert.notEqual(await bakeNavmesh(level), cached);
  });
  it("permits an explicit geometry-only compile and later navigation", async () => {
    const level = await compile(room(), { navigation: false });
    assert.equal(level.navigation, undefined);
    assert.equal((await validateForRuntime(level)).passed, true);
    assert.ok(level.navigation);
  });
  it("accepts normal capsule margins along walls and occupied cover footprints", async () => {
    const d = room();
    d.covers.push({
      id: "crate",
      layer: "shared",
      min: [2, 2, 0],
      max: [3, 3, 1],
    });
    const level = await compile(d);
    assert.equal(
      level.navigation?.coverage.uncoveredCount,
      0,
      JSON.stringify(level.navigation?.coverage),
    );
    assert.ok(level.navigation!.coverage.excluded > 0);
    assert.equal(level.navigation?.passed, true);
  });
  it("excludes samples exactly on a merged wall junction with different top heights", async () => {
    const d = room(),
      l = d.layers[0];
    for (const v of l.vertices) v.z = 3;
    d.markers[0].position[2] = 3;
    l.vertices.push(
      { id: "wa", x: 2.9, y: 1, z: 2.5 },
      { id: "wb", x: 2.9, y: 3, z: 1.46 },
      { id: "wc", x: 5, y: 3, z: 1.46 },
    );
    l.edges.push(
      {
        id: "wall-one",
        from: "wa",
        to: "wb",
        kind: "wall",
        height: 2.4,
        thickness: 0.7,
        openings: [],
      },
      {
        id: "wall-two",
        from: "wb",
        to: "wc",
        kind: "wall",
        height: 2.4,
        thickness: 0.7,
        openings: [],
      },
    );
    const level = await compile(d);
    assert.deepEqual(level.diagnostics, []);
    assert.equal(
      level.navigation?.coverage.uncoveredCount,
      0,
      JSON.stringify(level.navigation?.coverage.uncovered),
    );
  });
  it("finds partial headroom loss even when the rest of a room is navigable", async () => {
    const d = room();
    d.covers.push({
      id: "beam",
      layer: "shared",
      min: [2, 2, 1.8],
      max: [4, 4, 2.2],
    });
    const level = await compile(d),
      nav = level.navigation!;
    assert.ok(nav.indices.length > 0);
    assert.equal(nav.passed, false);
    assert.ok(
      nav.coverage.uncovered.some(
        (s) => s.reason === "headroom" && s.clearance! < 2,
      ),
    );
    assert.ok(
      (await validateForRuntime(level)).diagnostics.some(
        (d) => d.code === "NAV_HEADROOM",
      ),
    );
  });
  it("treats a wall overhanging a lower tread below step height as occupied footprint", async () => {
    const d = room(),
      l = d.layers[0];
    l.vertices.push(
      { id: "overhang.a", x: 3, y: 2, z: 0.18 },
      { id: "overhang.b", x: 3, y: 4, z: 0.18 },
    );
    l.edges.push({
      id: "low-overhang",
      from: "overhang.a",
      to: "overhang.b",
      kind: "wall",
      height: 0.8,
      thickness: 0.6,
      openings: [],
    });
    const level = await compile(d);
    assert.equal(
      level.navigation?.passed,
      true,
      JSON.stringify(level.navigation?.coverage.uncovered),
    );
    assert.ok(level.navigation!.coverage.excluded > 0);
  });
  it("retains headroom failures for beams starting just above step height", async () => {
    const d = room();
    d.covers.push({
      id: "low-beam",
      layer: "shared",
      min: [2, 2, d.player.step + 0.01],
      max: [4, 4, 1],
    });
    const level = await compile(d);
    assert.ok(
      level.navigation?.coverage.uncovered.some((s) => s.reason === "headroom"),
    );
    assert.equal(level.navigation?.passed, false);
  });
  it("never classifies a low walkable slab as a wall footprint", async () => {
    const d = room();
    floor(d, "low-slab", 2, 2, 2, 2, 0.38);
    const level = await compile(d);
    assert.ok(
      level.navigation?.coverage.uncovered.some(
        (s) =>
          s.region === "room" &&
          s.reason === "headroom" &&
          Math.abs(s.clearance! - 0.18) < 0.01,
      ),
    );
    assert.equal(level.navigation?.passed, false);
  });
  it("rejects a declared floor entirely occupied by a low obstacle", async () => {
    const d = room();
    d.markers = [];
    d.covers.push({
      id: "entire-room-obstacle",
      layer: "shared",
      min: [0, 0, 0.18],
      max: [6, 6, 1],
    });
    const level = await compile(d);
    assert.equal(level.navigation?.coverage.covered, 0);
    assert.equal(level.navigation?.passed, false);
    assert.ok(
      (await validateForRuntime(level)).diagnostics.some(
        (d) => d.code === "NAV_DISCONNECTED",
      ),
    );
  });
  it("keeps overlapping floors in one layer distinct at their actual elevations", async () => {
    const d = createDocument("bridge");
    floor(d, "lower", 0, 0, 6, 6);
    floor(d, "upper", 2, 0, 2, 6, 3);
    spawn(d, "lowerSpawn", [1, 3, 0]);
    spawn(d, "upperSpawn", [3, 3, 3]);
    const level = await compile(d),
      nav = level.navigation!;
    assert.deepEqual(level.diagnostics, []);
    assert.equal(nav.passed, true, JSON.stringify(nav.coverage));
    assert.equal(nav.components, 2);
    assert.ok(nav.coverage.regions.every((r) => r.covered > 0));
    assert.equal(nav.coverage.uncoveredCount, 0);
  });
  it("measures underside clearance rather than upper floor elevation", async () => {
    const d = createDocument("low-bridge");
    floor(d, "lower", 0, 0, 6, 6);
    floor(d, "upper", 2, 0, 2, 6, 2.1);
    spawn(d, "lowerSpawn", [1, 3, 0]);
    spawn(d, "upperSpawn", [3, 3, 2.1]);
    const level = await compile(d),
      bad = level.navigation!.coverage.uncovered.filter(
        (s) => s.region === "lower" && s.reason === "headroom",
      );
    assert.ok(bad.length > 0);
    assert.ok(bad.every((s) => Math.abs(s.clearance! - 1.9) < 0.01));
    assert.ok(
      !level.navigation!.coverage.uncovered.some(
        (s) => s.region === "upper" && s.reason === "headroom",
      ),
    );
  });
  it("reports a narrow dead-end branch without treating it as an ordinary boundary margin", async () => {
    const d = createDocument("narrow-test");
    floor(d, "narrow", 0, 0, 4, 4);
    spawn(d, "start", [2, 2, 0]);
    const l = d.layers[0];
    l.vertices = [
      [0, 0],
      [4, 0],
      [4, 1.8],
      [7, 1.8],
      [7, 2.2],
      [4, 2.2],
      [4, 4],
      [0, 4],
    ].map(([x, y], i) => ({ id: `v${i}`, x, y, z: 0 }));
    l.edges = l.vertices.map((v, i) => ({
      id: `e${i}`,
      from: v.id,
      to: l.vertices[(i + 1) % l.vertices.length].id,
      kind: "open",
      openings: [],
    }));
    l.regions[0].boundary = l.edges.map((e) => e.id);
    const level = await compile(d),
      nav = level.navigation!;
    assert.deepEqual(level.diagnostics, []);
    assert.ok(
      nav.coverage.uncovered.some(
        (s) => s.region === "narrow" && s.reason === "width",
      ),
      JSON.stringify(nav.coverage),
    );
    assert.equal(nav.passed, false);
  });
  it("reports a completely eroded narrow floor without turning it into a geometry bake error", async () => {
    const d = createDocument("empty-navigation");
    floor(d, "hall", 0, 0, 4, 0.4);
    spawn(d, "start", [1, 0.2, 0]);
    d.markers.push({
      id: "end",
      layer: "shared",
      position: [3, 0.2, 0],
      kind: "objective",
    });
    d.routes.push({
      id: "blocked-route",
      from: "start",
      to: "end",
      minRoutes: 1,
    });
    const level = await compile(d),
      nav = level.navigation!;
    assert.deepEqual(level.diagnostics, []);
    assert.equal(nav.indices.length, 0);
    assert.equal(nav.passed, false);
    assert.ok(nav.coverage.uncovered.some((s) => s.reason === "width"));
    const report = await validateForRuntime(level);
    assert.ok(report.diagnostics.some((d) => d.code === "NAV_WIDTH"));
    assert.ok(report.diagnostics.some((d) => d.code === "ROUTE_REQUIREMENT"));
    assert.ok(!report.diagnostics.some((d) => d.code === "NAV_BAKE"));
  });
  it("classifies sharp triangular tips as boundary margins rather than narrow corridors", async () => {
    const d = createDocument("tapered-room");
    floor(d, "triangle", 0, 0, 8, 4);
    spawn(d, "start", [1, 2, 0]);
    const l = d.layers[0];
    l.vertices = [
      [0, 0],
      [8, 2],
      [0, 4],
    ].map(([x, y], i) => ({ id: `v${i}`, x, y, z: 0 }));
    l.edges = l.vertices.map((v, i) => ({
      id: `e${i}`,
      from: v.id,
      to: l.vertices[(i + 1) % 3].id,
      kind: "open",
      openings: [],
    }));
    l.regions[0].boundary = l.edges.map((e) => e.id);
    const level = await compile(d);
    assert.equal(
      level.navigation?.passed,
      true,
      JSON.stringify(level.navigation?.coverage),
    );
    assert.ok(level.navigation!.coverage.excluded > 0);
  });
  it("reports physical stair risers above the configured step limit", async () => {
    const d = createDocument("excessive-step");
    floor(d, "flight", 0, 0, 3, 4);
    const l = d.layers[0],
      r = l.regions[0];
    r.fill = "stairs";
    r.lower = "flight.e0";
    r.upper = "flight.e2";
    r.rise = 0.75;
    l.vertices[2].z = 3;
    l.vertices[3].z = 3;
    const level = await compile(d);
    assert.deepEqual(level.diagnostics, []);
    assert.ok(
      level.navigation!.coverage.uncovered.some((s) => s.reason === "step"),
    );
    assert.ok(
      (await validateForRuntime(level)).diagnostics.some(
        (d) => d.code === "NAV_STEP",
      ),
    );
  });
  it("rejects slopes and disconnected islands independently", async () => {
    const d = createDocument("slope");
    floor(d, "start", 0, 0, 4, 4);
    floor(d, "island", 8, 0, 4, 4);
    floor(d, "steep", 0, 8, 2, 2);
    for (const v of d.layers[0].vertices)
      if (v.id.startsWith("steep") && v.x === 2) v.z = 4;
    spawn(d, "spawn", [2, 2, 0]);
    const level = await compile(d),
      nav = level.navigation!;
    assert.ok(nav.coverage.uncovered.some((s) => s.reason === "slope"));
    assert.ok(nav.unreachableRegions.includes("island"));
    assert.ok(
      nav.coverage.uncovered.some(
        (s) => s.region === "island" && s.reason === "disconnected",
      ),
    );
  });
  it("keeps sealed dynamic-state reports separate from the reusable open bake", async () => {
    const d = createDocument("door");
    floor(d, "hall", 0, 0, 8, 2);
    spawn(d, "start", [1, 1, 0]);
    d.covers.push({
      id: "dynamic-door",
      layer: "shared",
      min: [3.8, 0, 0],
      max: [4.2, 2, 3],
      dynamic: true,
    });
    const level = await compile(d),
      open = level.navigation!;
    assert.equal(open.passed, true);
    const sealed = await bakeNavmesh(level, { sealed: true });
    assert.equal(sealed.passed, false);
    assert.equal(level.navigation, open);
    assert.equal(sealed.settings.sealed, true);
    assert.notEqual(sealed.settings.cacheKey, open.settings.cacheKey);
  });
  it("invalidates marker/settings changes and propagates cancellation", async () => {
    const level = await compile(room()),
      cached = level.navigation!;
    level.document.markers[0].position = [50, 50, 0];
    const changed = await bakeNavmesh(level);
    assert.notEqual(changed.settings.cacheKey, cached.settings.cacheKey);
    assert.deepEqual(changed.unreachableMarkers, ["start"]);
    assert.notEqual(
      (await bakeNavmesh(level, { cell: 0.1 })).settings.cacheKey,
      changed.settings.cacheKey,
    );
    const signal = AbortSignal.abort();
    await assert.rejects(() => validateForRuntime(level, { signal }), {
      name: "AbortError",
    });
    await assert.rejects(() => bakeNavmesh(level, { cell: 0 }), /positive/);
  });
});
