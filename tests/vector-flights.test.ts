import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createDocument,
  type LevelDocument,
  type V3,
} from "../src/vector/types.ts";
import { compile } from "../src/vector/compiler.ts";
import { heightAt, orient, cross, sub } from "../src/vector/geometry.ts";
import { generateUVs, auditUVs } from "../src/vector/uv.ts";
import { validateForRuntime } from "../src/vector/validate.ts";

function flight(
  fill: "stairs" | "ramp" = "stairs",
  rise = 0.18,
): LevelDocument {
  const d = createDocument("curved-flight");
  d.curveTolerance = 0.01;
  d.layers = [
    {
      id: "ground",
      vertices: [
        { id: "a", x: 2, y: 0, z: 0 },
        { id: "b", x: 4, y: 0, z: 0 },
        { id: "c", x: 0, y: 4, z: 1.2 },
        { id: "d", x: 0, y: 2, z: 1.2 },
      ],
      edges: [
        { id: "lower", from: "a", to: "b", kind: "open", openings: [] },
        {
          id: "outer",
          from: "b",
          to: "c",
          kind: "wall",
          control: [
            [4, 2.209],
            [2.209, 4],
          ],
          openings: [],
        },
        { id: "upper", from: "c", to: "d", kind: "open", openings: [] },
        {
          id: "inner",
          from: "d",
          to: "a",
          kind: "wall",
          control: [
            [1.105, 2],
            [2, 1.105],
          ],
          openings: [],
        },
      ],
      regions: [
        {
          id: "flight",
          fill,
          lower: "lower",
          upper: "upper",
          rise,
          boundary: ["lower", "outer", "upper", "inner"],
          holes: [],
          interior: [],
          creases: [],
        },
      ],
    },
  ];
  return d;
}

describe("boundary-rail flights", () => {
  it("puts actual horizontal treads inside the curved footprint", async () => {
    const l = await compile(flight(), { navigation: false });
    assert.deepEqual(l.diagnostics, []);
    const f = l.floors[0];
    const levels = new Set<number>();
    for (const t of f.triangles) {
      const p = t.map((i) => f.points[i]);
      assert.ok(p.every((v) => Math.abs(v[2] - p[0][2]) < 1e-9));
      assert.ok(orient(...(p as [V3, V3, V3])) > 0);
      levels.add(Math.round(p[0][2] * 1e9));
      for (const v of p)
        assert.ok(
          Math.hypot(v[0], v[1]) >= 1.99 && Math.hypot(v[0], v[1]) <= 4.01,
        );
    }
    assert.equal(levels.size, 7);
    assert.equal(
      heightAt(f, 1, 1),
      undefined,
      "No shortcut across the inside of the curve",
    );
    assert.ok(l.parts.some((p) => p.kind === "stairs"));
  });

  it("keeps curved wall triangles independent of step count", async () => {
    const coarse = await compile(flight("stairs", 0.3), { navigation: false });
    const fine = await compile(flight("stairs", 0.1), { navigation: false });
    const walls = (l: typeof coarse) =>
      l.parts
        .filter((p) => p.kind === "wall")
        .flatMap((p) => p.triangles)
        .flatMap((t) =>
          l.mesh.indices
            .slice(t * 3, t * 3 + 3)
            .flatMap((i) => l.mesh.positions.slice(i * 3, i * 3 + 3)),
        );
    assert.deepEqual(coarse.diagnostics, []);
    assert.deepEqual(fine.diagnostics, []);
    assert.deepEqual(walls(coarse), walls(fine));
    assert.ok(
      fine.floors[0].triangles.length > coarse.floors[0].triangles.length,
    );
  });

  it("builds a continuous turning ramp and supports anchored walls", async () => {
    const d = flight("ramp");
    d.layers[0].edges[1].baseFloor = "flight";
    const l = await compile(d, { navigation: false });
    assert.deepEqual(l.diagnostics, []);
    assert.ok(l.parts.some((p) => p.kind === "floor"));
    assert.ok(!l.parts.some((p) => p.kind === "stairs"));
    const h = heightAt(l.floors[0], Math.SQRT1_2 * 3, Math.SQRT1_2 * 3);
    assert.ok(h !== undefined && Math.abs(h - 0.6) < 0.01);
    assert.equal(heightAt(l.floors[0], 1, 1), undefined);
  });

  it("accepts reversed boundary orientation, tapered widths, and ceilings", async () => {
    const d = flight("stairs");
    const r = d.layers[0].regions[0];
    r.boundary = [...r.boundary].reverse().map((ref) => "-" + ref);
    r.ceiling = 4;
    d.layers[0].vertices[2].y = 5;
    d.layers[0].edges[1].control = [
      [4, 2.209],
      [2.209, 5],
    ];
    const l = await compile(d, { navigation: false });
    assert.deepEqual(l.diagnostics, []);
    assert.ok(l.parts.some((p) => p.kind === "ceiling"));
  });

  it("reports invalid flight definitions at their source region", async () => {
    for (const mode of [
      "missing",
      "same",
      "slope",
      "hole",
      "crease",
      "height",
      "fold",
      "rise",
    ]) {
      const d = flight(),
        r = d.layers[0].regions[0],
        layer = d.layers[0];
      r.source = { line: 20, column: 3, offset: 0 };
      if (mode === "missing") r.lower = "missing";
      if (mode === "same") r.upper = r.lower;
      if (mode === "slope") layer.vertices[0].z = 0.2;
      if (mode === "hole") r.holes = [["lower"]];
      if (mode === "crease") r.creases = [["a", "c"]];
      if (mode === "height")
        ((layer.vertices[2].z = -1.2), (layer.vertices[3].z = -1.2));
      if (mode === "fold")
        layer.edges[1].control = [
          [-4, 1],
          [-4, 3],
        ];
      if (mode === "rise") r.rise = 0;
      const l = await compile(d, { navigation: false });
      assert.equal(l.mesh.indices.length, 0, mode);
      assert.ok(
        l.diagnostics.some(
          (x) =>
            x.code === "FLIGHT" &&
            x.objects.includes("flight") &&
            x.source?.line === 20,
        ),
        mode,
      );
    }
  });

  it("keeps deterministic geometry for identical flights", async () => {
    const a = await compile(flight(), { navigation: false }),
      b = await compile(flight(), { navigation: false });
    assert.equal(a.geometryHash, b.geometryHash);
  });

  it("supports an S ramp using curved rails rather than a radial special case", async () => {
    const d = flight("ramp"),
      l = d.layers[0];
    l.vertices = [
      { id: "a", x: 0, y: 2, z: 0 },
      { id: "b", x: 0, y: 0, z: 0 },
      { id: "c", x: 10, y: 0, z: 1.2 },
      { id: "d", x: 10, y: 2, z: 1.2 },
    ];
    l.edges[1].control = [
      [3, 4],
      [7, -4],
    ];
    l.edges[3].control = [
      [7, -2],
      [3, 6],
    ];
    const out = await compile(d, { navigation: false });
    assert.deepEqual(out.diagnostics, []);
    assert.ok(Math.abs(heightAt(out.floors[0], 5, 1)! - 0.6) < 0.001);
    const byPosition = new Map<string, number[]>();
    for (let t = 0; t < out.mesh.surfaces.length; t++) {
      if (out.surfaces[out.mesh.surfaces[t]].role !== "ramp") continue;
      const ids = out.mesh.indices.slice(t * 3, t * 3 + 3);
      if (out.mesh.normals[ids[0] * 3 + 2] < 0.1) continue;
      const p = ids.map(
        (i) => out.mesh.positions.slice(i * 3, i * 3 + 3) as V3,
      );
      const uv = ids.map((i) => out.mesh.uv.slice(i * 2, i * 2 + 2));
      for (let k = 0; k < 3; k++) {
        const key = p[k].join(","),
          known = byPosition.get(key);
        if (known)
          assert.deepEqual(
            uv[k],
            known,
            "Adjacent ramp triangles must share UV0 phase",
          );
        byPosition.set(key, uv[k]);
      }
      const physicalArea =
        Math.hypot(...cross(sub(p[1], p[0]), sub(p[2], p[0]))) / 2;
      const textureArea = Math.abs(orient(uv[0], uv[1], uv[2])) / 2;
      assert.ok(
        Math.abs(textureArea / physicalArea - 1) < 0.001,
        "Each developed ramp triangle retains one repeat per metre",
      );
    }
    assert.ok(byPosition.size > 10);
  });

  it("does not confuse overlapping global height ranges with colliding ramps", async () => {
    const d = flight("ramp"),
      a = d.layers[0];
    a.vertices = [
      { id: "a", x: 0, y: 2, z: 0 },
      { id: "b", x: 0, y: 0, z: 0 },
      { id: "c", x: 10, y: 0, z: 4 },
      { id: "d", x: 10, y: 2, z: 4 },
    ];
    a.edges.forEach((e) => {
      delete e.control;
      e.kind = "open";
    });
    const b = structuredClone(a);
    b.id = "upper-layer";
    b.vertices.forEach((v) => {
      v.id = "upper." + v.id;
      v.z += 2;
    });
    b.edges.forEach((e) => {
      e.id = "upper." + e.id;
      e.from = "upper." + e.from;
      e.to = "upper." + e.to;
    });
    b.regions.forEach((r) => {
      r.id = "upper." + r.id;
      r.boundary = r.boundary.map((e) => "upper." + e);
      r.lower = "upper.lower";
      r.upper = "upper.upper";
    });
    // Keep both in the same layer to verify that layer grouping is irrelevant.
    a.vertices.push(...b.vertices);
    a.edges.push(...b.edges);
    a.regions.push(...b.regions);
    const out = await compile(d, { navigation: false });
    assert.deepEqual(out.diagnostics, []);
    assert.equal(out.floors.length, 2);
    // Cross the second ramp through the first only in their interior.
    for (const v of a.vertices.filter((v) => v.id.startsWith("upper.")))
      v.z = 6 - v.x * 0.4;
    const broken = await compile(d, { navigation: false });
    // Its lower/upper landing assignments also reverse with the slope.
    const r = a.regions[1];
    r.lower = "upper.upper";
    r.upper = "upper.lower";
    const collision = await compile(d, { navigation: false });
    assert.ok(broken.diagnostics.length > 0);
    assert.ok(collision.diagnostics.some((d) => d.code === "SPACE_OVERLAP"));
  });

  it("preserves curved-flight triangle attributes through connected UV charts", async () => {
    const l = await compile(flight(), { navigation: false }),
      before = structuredClone(l.mesh);
    await generateUVs(l, { resolution: 512, density: 8 });
    assert.deepEqual(auditUVs(l), []);
    assert.deepEqual(l.mesh.positions, before.positions);
    assert.deepEqual(l.mesh.normals, before.normals);
    assert.deepEqual(l.mesh.uv, before.uv);
    assert.ok(l.atlas!.charts.length < l.mesh.indices.length / 3);
  });

  it("bakes an actual route around the curved treads", async () => {
    const d = flight();
    d.markers = [
      {
        id: "spawn",
        kind: "spawn",
        layer: "ground",
        region: "flight",
        position: [3 * Math.cos(0.2), 3 * Math.sin(0.2), 1.2 / 7],
      },
      {
        id: "goal",
        kind: "objective",
        layer: "ground",
        region: "flight",
        position: [3 * Math.cos(1.3), 3 * Math.sin(1.3), (1.2 * 6) / 7],
      },
    ];
    d.routes = [{ id: "around-turn", from: "spawn", to: "goal", minRoutes: 1 }];
    const l = await compile(d);
    const report = await validateForRuntime(l);
    assert.deepEqual(l.diagnostics, []);
    assert.ok(l.navigation?.positions.length);
    assert.equal(report.navigation?.routes[0].reachable, true);
    assert.equal(report.passed, true, JSON.stringify(report.diagnostics));
  });
});
