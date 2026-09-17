import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  compile,
  createDocument,
  parseLevelSvgx,
  serializeLevelSvgx,
  type Layer,
  type LevelDocument,
  type V3,
} from "../src/vector/index.ts";

function floor(id: string, points: V3[]): Layer {
  return {
    id: `${id}.layer`,
    vertices: points.map(([x, y, z], i) => ({ id: `${id}.v${i}`, x, y, z })),
    edges: points.map((_, i) => ({
      id: `${id}.e${i}`,
      from: `${id}.v${i}`,
      to: `${id}.v${(i + 1) % points.length}`,
      kind: "open",
      openings: [],
    })),
    regions: [
      {
        id,
        fill: "floor",
        boundary: points.map((_, i) => `${id}.e${i}`),
        holes: [],
        creases: [],
        interior: [],
        thickness: 0.2,
      },
    ],
  };
}

function fixture(): LevelDocument {
  const d = createDocument("surface-contact");
  d.layers = [
    floor("upper", [
      [0, 0, 1],
      [2, 0, 1],
      [2, 4, 1],
      [0, 4, 1],
    ]),
    {
      id: "walls",
      vertices: [
        { id: "wall.a", x: 0, y: -1, z: 0 },
        { id: "wall.b", x: 0, y: 5, z: 0 },
      ],
      edges: [
        {
          id: "retaining-wall",
          from: "wall.a",
          to: "wall.b",
          kind: "wall",
          height: 1,
          thickness: 0.2,
          openings: [],
        },
      ],
      regions: [],
    },
  ];
  return d;
}

async function inspect(d: LevelDocument) {
  const level = await compile(d, { navigation: false });
  assert.deepEqual(
    level.diagnostics.filter((diagnostic) => diagnostic.severity === "error"),
    [],
    "The fixture must compile before contacts are audited.",
  );
  return level.diagnostics.filter(
    (diagnostic) => diagnostic.code === "WALL_FLOOR_COPLANAR",
  );
}

describe("wall/floor coplanar surfaces", () => {
  it("warns for a wall cap overlapping a floor, with both IDs and source location", async () => {
    const document = parseLevelSvgx(serializeLevelSvgx(fixture()));
    const contacts = await inspect(document);
    assert.equal(
      contacts.length,
      1,
      "Aggregate triangle overlaps into one source-pair warning.",
    );
    assert.equal(contacts[0].severity, "warning");
    for (const id of ["retaining-wall", "upper"])
      assert.ok(contacts[0].objects.includes(id));
    const source = contacts[0].source;
    assert.ok(source && source.line > 0 && source.column > 0);
    assert.ok(
      document.layers
        .flatMap((l) => [...l.edges, ...l.regions])
        .some(
          (o) =>
            contacts[0].objects.includes(o.id) &&
            o.source?.offset === source.offset,
        ),
    );
  });

  it("supports strict errors and an explicit opt-out without discarding geometry", async () => {
    const strict = await compile(fixture(), {
      navigation: false,
      surfaceContacts: "error",
    });
    assert.equal(
      strict.diagnostics.find((d) => d.code === "WALL_FLOOR_COPLANAR")
        ?.severity,
      "error",
    );
    assert.ok(strict.mesh.indices.length > 0);
    const disabled = await compile(fixture(), {
      navigation: false,
      surfaceContacts: false,
    });
    assert.ok(disabled.mesh.indices.length > 0);
    assert.equal(disabled.diagnostics.length, 0);
  });

  it("clears the cap warning when the wall rises above the floor", async () => {
    const d = fixture();
    d.layers[1].edges[0].height = 1.2;
    assert.deepEqual(await inspect(d), []);
  });

  it("does not report line contact after the floor is moved to the actual wall face", async () => {
    const d = fixture();
    d.layers[0].vertices.filter((v) => v.x === 0).forEach((v) => (v.x = 0.1));
    assert.deepEqual(await inspect(d), []);
  });

  it("does not report point-only contact despite intersecting triangle bounds", async () => {
    const d = fixture();
    d.layers[0] = floor("upper", [
      [0.1, 4, 1],
      [2, 3, 1],
      [2, 4, 1],
    ]);
    assert.deepEqual(await inspect(d), []);
  });

  it("detects a sloping wall cap coplanar with an actual ramp surface", async () => {
    const d = fixture();
    d.layers[0].vertices.forEach((v) => (v.z += v.y / 4));
    d.layers[1].vertices.forEach((v) => (v.z += v.y / 4));
    const contacts = await inspect(d);
    assert.equal(contacts.length, 1);
    assert.ok(contacts[0].objects.includes("upper"));
  });

  it("finds positive-area overlap within a triangular footprint", async () => {
    const d = fixture();
    d.layers[0] = floor("upper", [
      [0, 0, 1],
      [2, 2, 1],
      [0, 4, 1],
    ]);
    assert.equal((await inspect(d)).length, 1);
  });

  it("audits the actual remaining wall beside an opening", async () => {
    const d = fixture();
    d.layers[1].edges[0].openings = [
      {
        id: "passage",
        kind: "door",
        start: 2,
        end: 4,
        sill: 0,
        head: 1,
      },
    ];
    assert.equal((await inspect(d)).length, 1);
    d.layers[0] = floor("upper", [
      [0, 1.2, 1],
      [2, 1.2, 1],
      [2, 2.8, 1],
      [0, 2.8, 1],
    ]);
    assert.deepEqual(
      await inspect(d),
      [],
      "No wall cap exists across the opening itself.",
    );
  });

  it("detects same-facing vertical wall/slab side overlap", async () => {
    const d = fixture();
    d.layers[1].edges[0].height = 2;
    d.layers[0] = floor("upper", [
      [-2, 1, 1],
      [0.1, 1, 1],
      [0.1, 3, 1],
      [-2, 3, 1],
    ]);
    const contacts = await inspect(d);
    assert.equal(contacts.length, 1);
    assert.ok(contacts[0].objects.includes("retaining-wall"));
  });

  it("does not mistake opposite-facing floor/side contact for z-fighting", async () => {
    const d = fixture();
    d.layers[1].edges[0].height = 2;
    d.layers[0] = floor("upper", [
      [0.1, 1, 1],
      [2, 1, 1],
      [2, 3, 1],
      [0.1, 3, 1],
    ]);
    assert.deepEqual(await inspect(d), []);
  });

  it("does not confuse stacked surfaces or a millimetre height separation", async () => {
    for (const height of [1.001, 3]) {
      const d = fixture();
      d.layers[0].vertices.forEach((v) => (v.z = height));
      assert.deepEqual(await inspect(d), []);
    }
  });

  it("allows a supporting wall cap to meet the opposite-facing slab underside", async () => {
    const d = fixture();
    d.layers[1].edges[0].height = 0.8;
    assert.deepEqual(await inspect(d), []);
  });

  it("allows an open retaining seam ending at the upper slab underside", async () => {
    const d = fixture();
    // Extend the lower slab past the seam's end caps, so this fixture tests
    // underside support rather than an independent outer-side overlap.
    d.layers[1] = floor("lower", [
      [-2, -1, 0],
      [0, -1, 0],
      [0, 0, 0],
      [0, 4, 0],
      [0, 5, 0],
      [-2, 5, 0],
    ]);
    d.seams = [
      { id: "retaining-seam", edges: ["lower.e2", "upper.e3"], kind: "open" },
    ];
    assert.deepEqual(await inspect(d), []);
  });

  it("includes real staircase treads among floor receivers", async () => {
    const d = fixture();
    d.layers[0].vertices.forEach((v) => (v.z = v.y / 4));
    Object.assign(d.layers[0].regions[0], {
      fill: "stairs",
      lower: "upper.e0",
      upper: "upper.e2",
      rise: 0.25,
    });
    d.layers[1].edges[0].height = 0.5;
    const contacts = await inspect(d);
    assert.equal(contacts.length, 1);
    assert.ok(contacts[0].objects.includes("upper"));
  });

  it("constructs retaining seams above the lower slab without redundant end-cap skirts", async () => {
    for (const kind of ["open", "wall"] as const) {
      const d = fixture();
      d.layers[1] = floor("lower", [
        [-2, 0, 0],
        [0, 0, 0],
        [0, 4, 0],
        [-2, 4, 0],
      ]);
      d.seams = [
        { id: "retaining-seam", edges: ["lower.e1", "upper.e3"], kind },
      ];
      const level = await compile(d, { navigation: false });
      assert.deepEqual(
        level.diagnostics.map(({ code, objects }) => ({ code, objects })),
        kind === "open"
          ? []
          : [
              {
                code: "WALL_FLOOR_COPLANAR",
                objects: ["retaining-seam", "upper"],
              },
            ],
        "Only an above-floor wall still exposes an authored upper-slab end contact.",
      );
      const wallPoints = level.mesh.surfaces.flatMap((surface, triangle) =>
        level.surfaces[surface].kind === "wall"
          ? level.mesh.indices
              .slice(triangle * 3, triangle * 3 + 3)
              .map((vertex) =>
                level.mesh.positions.slice(vertex * 3, vertex * 3 + 3),
              )
          : [],
      );
      assert.ok(
        wallPoints.length > 0,
        "The retaining wall still seals the height gap.",
      );
      assert.ok(wallPoints.every((p) => p[2] >= -1e-6));
      assert.ok(level.parts.some((part) => part.kind === "wall"));
      assert.equal(
        level.parts.filter((part) => part.kind === "floor").length,
        2,
      );
    }
  });

  it("keeps a curved retaining seam on its smooth guide without floating above treads", async () => {
    const build = (rise: number) => {
      const d = createDocument("curved-retaining-contact");
      d.layers = [
        {
          id: "stairs-layer",
          vertices: [
            { id: "a", x: 3, y: 0, z: 0 },
            { id: "b", x: 6, y: 0, z: 0 },
            { id: "c", x: 0, y: 6, z: 2 },
            { id: "d", x: 0, y: 3, z: 2 },
          ],
          edges: [
            { id: "lower", from: "a", to: "b", kind: "open", openings: [] },
            {
              id: "outer",
              from: "b",
              to: "c",
              kind: "open",
              openings: [],
              control: [
                [6, 3.314],
                [3.314, 6],
              ],
            },
            { id: "upper", from: "c", to: "d", kind: "open", openings: [] },
            {
              id: "inner",
              from: "d",
              to: "a",
              kind: "open",
              openings: [],
              control: [
                [1.657, 3],
                [3, 1.657],
              ],
            },
          ],
          regions: [
            {
              id: "stairs",
              fill: "stairs",
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
        floor("center", [
          [0, 0, 2],
          [3, 0, 2],
          [0, 3, 2],
        ]),
      ];
      d.layers[1].edges[1].control = [
        [3, 1.657],
        [1.657, 3],
      ];
      d.seams = [
        { id: "curved-riser", edges: ["inner", "center.e1"], kind: "open" },
      ];
      return d;
    };
    const wallTriangleCounts = [];
    for (const rise of [0.18, 0.11]) {
      const level = await compile(build(rise), { navigation: false });
      assert.deepEqual(level.diagnostics, []);
      wallTriangleCounts.push(
        level.parts
          .filter((part) => part.kind === "wall")
          .reduce((sum, part) => sum + part.triangles.length, 0),
      );
    }
    assert.equal(
      wallTriangleCounts[0],
      wallTriangleCounts[1],
      "Retaining geometry stays independent of tread count.",
    );
  });

  it("fits wall feet to a transverse floor slope while preserving their authored tops", async () => {
    for (const anchored of [false, true]) {
      const d = fixture();
      d.layers[0].vertices.forEach((v) => (v.z = 1 + v.x / 4));
      if (anchored) {
        d.layers[1].vertices[0].y = 0;
        d.layers[1].vertices[1].y = 4;
        d.layers[1].edges[0].baseFloor = "upper";
      } else {
        d.layers.pop();
        Object.assign(d.layers[0].edges[3], {
          kind: "wall",
          height: 1,
          thickness: 0.2,
        });
      }
      const level = await compile(d, { navigation: false });
      assert.deepEqual(level.diagnostics, []);
      const points = level.mesh.surfaces.flatMap((surface, triangle) =>
        level.surfaces[surface].kind === "wall"
          ? level.mesh.indices
              .slice(triangle * 3, triangle * 3 + 3)
              .map((vertex) =>
                level.mesh.positions.slice(vertex * 3, vertex * 3 + 3),
              )
          : [],
      );
      assert.ok(
        points.some(
          (p) => Math.abs(p[0] - 0.1) < 1e-6 && Math.abs(p[2] - 1.025) < 1e-6,
        ),
      );
      assert.ok(
        points.some(
          (p) => Math.abs(p[0] + 0.1) < 1e-6 && Math.abs(p[2] - 0.975) < 1e-6,
        ),
      );
      assert.ok(Math.abs(Math.max(...points.map((p) => p[2])) - 2) < 1e-6);

      d.layers.push(
        floor("overhead", [
          [0, 0, 2],
          [2, 0, 2],
          [2, 4, 2],
          [0, 4, 2],
        ]),
      );
      const contacts = await inspect(d);
      assert.ok(
        contacts.some((contact) => contact.objects.includes("overhead")),
        "Correcting the contact foot must not hide authored wall cap overlaps.",
      );
    }
  });
});
