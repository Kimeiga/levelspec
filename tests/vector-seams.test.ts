import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createDocument,
  compile,
  type Layer,
  type V3,
} from "../src/vector/index.ts";
import { orient } from "../src/vector/geometry.ts";

function wallCapsAt(
  l: Awaited<ReturnType<typeof compile>>,
  x: number,
  y: number,
) {
  return l.mesh.surfaces.flatMap((s, t) => {
    if (l.surfaces[s].kind !== "wall") return [];
    const p = l.mesh.indices
      .slice(t * 3, t * 3 + 3)
      .map((v) => l.mesh.positions.slice(v * 3, v * 3 + 3) as V3);
    if (
      Math.abs(p[0][2] - p[1][2]) > 1e-6 ||
      Math.abs(p[0][2] - p[2][2]) > 1e-6
    )
      return [];
    if (Math.abs(orient(...(p as [V3, V3, V3]))) < 1e-8) return [];
    const side = p.map((a, i) => orient(a, p[(i + 1) % 3], [x, y]));
    return side.every((v) => v >= -1e-8) || side.every((v) => v <= 1e-8)
      ? [p[0][2]]
      : [];
  });
}

function cornerFixture(curved = false) {
  const d = createDocument("seam-corner");
  for (const [id, z] of [
    ["low", 0],
    ["high", 2],
  ] as const) {
    d.layers.push({
      id,
      vertices: [
        { id: `${id}.a`, x: -2, y: 0, z },
        { id: `${id}.corner`, x: 0, y: 0, z },
        { id: `${id}.b`, x: curved ? -2 : 0, y: -2, z },
      ],
      edges: [
        {
          id: `${id}.straight`,
          from: `${id}.a`,
          to: `${id}.corner`,
          kind: "open",
          openings: [],
        },
        {
          id: `${id}.turn`,
          from: `${id}.corner`,
          to: `${id}.b`,
          kind: "open",
          openings: [],
          ...(curved
            ? {
                control: [
                  [0, -1.105],
                  [-0.895, -2],
                ] as [number, number][],
              }
            : {}),
        },
      ],
      regions: [],
    });
  }
  d.seams = [
    { id: "straight", edges: ["low.straight", "high.straight"], kind: "open" },
    { id: "turn", edges: ["low.turn", "high.turn"], kind: "open" },
  ];
  return d;
}

function fixture(z = 1, upperThickness = 0.3, kind: "open" | "wall" = "open") {
  const d = createDocument("seam-contact");
  for (const [id, x, height] of [
    ["low", 0, 0],
    ["high", 2, z],
  ] as const) {
    const l: Layer = {
      id,
      vertices: [
        [x, 0],
        [x + 2, 0],
        [x + 2, 4],
        [x, 4],
      ].map(([x, y], i) => ({ id: `${id}.v${i}`, x, y, z: height })),
      edges: [0, 1, 2, 3].map((i) => ({
        id: `${id}.e${i}`,
        from: `${id}.v${i}`,
        to: `${id}.v${(i + 1) % 4}`,
        kind: "open",
        openings: [],
      })),
      regions: [
        {
          id: `${id}.floor`,
          fill: "floor",
          boundary: [0, 1, 2, 3].map((i) => `${id}.e${i}`),
          holes: [],
          creases: [],
          interior: [],
          thickness: id === "high" ? upperThickness : 0.2,
        },
      ],
    };
    d.layers.push(l);
  }
  d.seams = [{ id: "join", edges: ["low.e1", "high.e3"], kind }];
  return d;
}
function stairSideFixture(underside: "filled" | "sloped") {
  const d = createDocument("stair-side-seam"),
    low: Layer = {
      id: "low",
      vertices: [
        { id: "low.v0", x: 0, y: -2, z: 0 },
        { id: "low.v1", x: 4, y: -2, z: 0 },
        { id: "low.v2", x: 4, y: 0, z: 0 },
        { id: "low.v3", x: 0, y: 0, z: 0 },
      ],
      edges: [0, 1, 2, 3].map((i) => ({
        id: `low.e${i}`,
        from: `low.v${i}`,
        to: `low.v${(i + 1) % 4}`,
        kind: "open",
        openings: [],
      })),
      regions: [{
        id: "low.floor", fill: "floor", boundary: ["low.e0", "low.e1", "low.e2", "low.e3"],
        holes: [], creases: [], interior: [], thickness: 0.2,
      }],
    },
    high: Layer = {
      id: "high",
      vertices: [
        { id: "high.v0", x: 0, y: 0, z: 0.5 },
        { id: "high.v1", x: 4, y: 0, z: 2.5 },
        { id: "high.v2", x: 4, y: 2, z: 2.5 },
        { id: "high.v3", x: 0, y: 2, z: 0.5 },
      ],
      edges: [0, 1, 2, 3].map((i) => ({
        id: `high.e${i}`,
        from: `high.v${i}`,
        to: `high.v${(i + 1) % 4}`,
        kind: "open",
        openings: [],
      })),
      regions: [{
        id: "high.floor", fill: "stairs", lower: "high.e3", upper: "high.e1",
        underside, boundary: ["high.e0", "high.e1", "high.e2", "high.e3"],
        holes: [], creases: [], interior: [], thickness: 0.2,
      }],
    };
  d.layers = [low, high];
  d.seams = [{ id: "join", edges: ["low.e2", "high.e0"], kind: "open" }];
  return d;
}

const wallHeights = (l: Awaited<ReturnType<typeof compile>>) =>
  l.parts
    .filter((p) => p.kind === "wall")
    .flatMap((p) => p.triangles)
    .flatMap((t) =>
      l.mesh.indices
        .slice(t * 3, t * 3 + 3)
        .map((v) => l.mesh.positions[v * 3 + 2]),
    );

// Walls rising through an upper slab can still duplicate its exposed side;
// ordinary open risers meet the slabs without generating those duplicates.
function expectSideContacts(
  l: Awaited<ReturnType<typeof compile>>,
  floors: string[],
) {
  assert.deepEqual(
    l.diagnostics.map(({ severity, code, objects }) => ({
      severity,
      code,
      objects,
    })),
    floors.map((floor) => ({
      severity: "warning",
      code: "WALL_FLOOR_COPLANAR",
      objects: ["join", floor],
    })),
  );
  assert.ok(
    l.diagnostics.every((d) => d.message.includes("same-facing side surfaces")),
  );
}

describe("separate floor/riser contact", () => {
  it("ends an open retaining seam at the actual upper slab underside", async () => {
    const l = await compile(fixture(), { navigation: false });
    expectSideContacts(l, []);
    assert.ok(Math.abs(Math.max(...wallHeights(l)) - 0.7) < 1e-6);
    assert.ok(l.parts.some((p) => p.kind === "floor"));
  });
  it("does not create coplanar caps or zero-volume walls for equal and shallow floors", async () => {
    for (const height of [0, 0.1]) {
      const l = await compile(fixture(height));
      assert.deepEqual(l.diagnostics, []);
      assert.equal(wallHeights(l).length, 0);
      assert.equal(l.navigation?.passed, true);
    }
  });
  it("clips a sloping seam where the upper slab already closes the gap", async () => {
    const d = fixture(2, 0.2);
    d.layers[0].vertices.forEach((v) => (v.z = v.y / 2));
    const l = await compile(d, { navigation: false });
    expectSideContacts(l, []);
    const vertices = l.parts
      .filter((p) => p.kind === "wall")
      .flatMap((p) => p.triangles)
      .flatMap((t) => l.mesh.indices.slice(t * 3, t * 3 + 3));
    assert.ok(
      Math.abs(
        Math.max(...vertices.map((v) => l.mesh.positions[v * 3 + 1])) - 3.6,
      ) < 1e-5,
    );
    assert.ok(Math.abs(Math.max(...wallHeights(l)) - 1.8) < 1e-6);
  });
  it("retains explicit wall-height seam behavior", async () => {
    const l = await compile(fixture(1, 0.3, "wall"), { navigation: false });
    expectSideContacts(l, ["high.floor"]);
    assert.equal(Math.max(...wallHeights(l)), 4);
  });
  it("uses the solid stair flight underside when the higher region is stairs", async () => {
    const d = fixture(1, 0.3),
      upper = d.layers[1];
    upper.vertices.forEach((v) => {
      if (v.x === 4) v.z = 2;
    });
    Object.assign(upper.regions[0], {
      fill: "stairs",
      lower: "high.e3",
      upper: "high.e1",
    });
    const l = await compile(d, { navigation: false });
    expectSideContacts(l, []);
    assert.ok(l.parts.some((p) => p.kind === "stairs"));
    assert.ok(Math.abs(Math.max(...wallHeights(l)) - 0.7) < 1e-6);
  });
  it("follows a sloped stair underside instead of filling to the lower landing", async () => {
    const filled = await compile(stairSideFixture("filled"), { navigation: false }),
      sloped = await compile(stairSideFixture("sloped"), { navigation: false });
    assert.deepEqual(filled.diagnostics.filter((d) => d.severity === "error"), []);
    assert.deepEqual(sloped.diagnostics.filter((d) => d.severity === "error"), []);
    assert.ok(Math.abs(Math.max(...wallHeights(filled)) - 0.3) < 1e-6);
    assert.ok(Math.abs(Math.max(...wallHeights(sloped)) - 2.3) < 1e-6);
  });

  it("closes the exterior corner between straight and curved retaining seams", async () => {
    for (const curved of [false, true]) {
      const l = await compile(cornerFixture(curved), { navigation: false });
      assert.deepEqual(l.diagnostics, []);
      assert.ok(
        wallCapsAt(l, 0.05, 0.05).some((z) => Math.abs(z - 2) < 1e-5),
        "The former missing corner is covered by the actual wall mesh.",
      );
      assert.ok(
        l.mesh.surfaces.every((s) =>
          ["straight", "turn"].includes(l.surfaces[s].object),
        ),
        "Miter faces retain source ownership.",
      );
      assert.equal(
        wallCapsAt(l, 0.15, 0.15).length,
        0,
        "The sharp join never expands into a rounded or oversized corner.",
      );
    }
  });
  it("joins a seam to an ordinary wall only over their shared vertical span", async () => {
    for (const gap of [false, true]) {
      const d = cornerFixture();
      d.seams = d.seams.slice(0, 1);
      const turn = d.layers[gap ? 1 : 0].edges[1];
      turn.kind = "wall";
      if (gap) {
        const upper = d.layers[1];
        upper.vertices.forEach((v) => (v.z = 3));
        upper.vertices.push({ id: "high.far", x: -2, y: -2, z: 3 });
        upper.edges.push(
          {
            id: "high.back",
            from: "high.b",
            to: "high.far",
            kind: "open",
            openings: [],
          },
          {
            id: "high.side",
            from: "high.far",
            to: "high.a",
            kind: "open",
            openings: [],
          },
        );
        upper.regions.push({
          id: "high.floor",
          fill: "floor",
          boundary: ["high.straight", "high.turn", "high.back", "high.side"],
          holes: [],
          interior: [],
          creases: [],
          thickness: 0.3,
        });
      }
      const l = await compile(d, { navigation: false });
      assert.deepEqual(l.diagnostics, []);
      const caps = wallCapsAt(l, 0.05, 0.05);
      if (gap)
        assert.equal(
          caps.length,
          0,
          "A seam ending below an elevated wall must leave the vertical gap empty.",
        );
      else assert.ok(caps.some((z) => Math.abs(z - 2) < 1e-5));
    }
  });
});
