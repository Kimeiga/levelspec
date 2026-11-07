import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  compile,
  createDocument,
  parseLevelSvgx,
  serializeLevelSvgx,
  type Layer,
  type CompileOptions,
  type AssetGeometry,
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

async function inspect(d: LevelDocument, options: CompileOptions = {}) {
  const level = await compile(d, { navigation: false, surfaceContacts: "error", ...options });
  assert.deepEqual(
    level.diagnostics.filter((diagnostic) => diagnostic.severity === "error" && diagnostic.code !== "SURFACE_COPLANAR"),
    [],
    "The fixture must compile before contacts are audited.",
  );
  return level.diagnostics.filter(
    (diagnostic) => diagnostic.code === "SURFACE_COPLANAR",
  );
}

/** A minimal host for independent imported or primitive prop surfaces. */
function propDocument(collision: "none" | "solid" | "box" = "none") {
  const document = createDocument("overlapping-props");
  document.layers = [{ id: "props", vertices: [], edges: [], regions: [] }];
  document.props = ["one", "two"].map((id) => ({ id, layer: "props", shape: "box", position: [0, 0, 0], rotation: [0, 0, 0], scale: [2, 2, 2], material: "default", collision }));
  return document;
}

/** Single triangle, with an independently known two-square-meter footprint. */
function triangleAsset(downward = false): AssetGeometry {
  return { positions: [[0, 0, 0], [2, 0, 0], [0, 2, 0]], triangles: [downward ? [0, 2, 1] : [0, 1, 2]] };
}

/** Changes the visible prop geometry while keeping each instance's authored identity. */
function importedProps(count = 2) {
  const document = propDocument();
  document.assets = [{ id: "triangle", src: "triangle.glb" }];
  document.props = document.props!.slice(0, count).map((prop) => ({ ...prop, shape: "asset", asset: "triangle", scale: [1, 1, 1] }));
  return document;
}

describe("general same-facing coplanar surfaces", () => {
  it("errors for a wall cap overlapping a floor, with both IDs and source location", async () => {
    const document = parseLevelSvgx(serializeLevelSvgx(fixture()));
    const contacts = await inspect(document);
    assert.equal(
      contacts.length,
      1,
      "Aggregate triangle overlaps into one source-pair diagnostic.",
    );
    assert.equal(contacts[0].severity, "error");
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
      strict.diagnostics.find((d) => d.code === "SURFACE_COPLANAR")
        ?.severity,
      "error",
    );
    assert.ok(strict.mesh.indices.length > 0);
    const warning = await compile(fixture(), { navigation: false, surfaceContacts: "warning" });
    assert.equal(warning.diagnostics.find((d) => d.code === "SURFACE_COPLANAR")?.severity, "warning");
    const disabled = await compile(fixture(), {
      navigation: false,
      surfaceContacts: false,
    });
    assert.ok(disabled.mesh.indices.length > 0);
    assert.equal(disabled.diagnostics.length, 0);
  });

  it("clears the cap error when the wall rises above the floor", async () => {
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
        level.diagnostics.map(({ code, objects }) => ({ code, objects: [...objects].sort() })),
        kind === "open"
          ? []
          : [
              {
                code: "SURFACE_COPLANAR",
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

  it("reports coincident primitive prop and floor surfaces", async () => {
    const document = propDocument();
    document.layers.push(floor("slab", [[0, 0, 1], [2, 0, 1], [2, 4, 1], [0, 4, 1]]));
    document.props = [{ ...document.props![0], position: [1, 2, 0.8], scale: [2, 4, 0.2] }];
    const contacts = await inspect(document);
    assert.equal(contacts.length, 1);
    assert.deepEqual([...contacts[0].objects].sort(), ["one", "slab"]);
  });

  for (const collision of ["none", "solid", "box"] as const) {
    it(`detects prop/prop overlaps with ${collision} collision while ignoring invisible collision proxies`, async () => {
      const document = parseLevelSvgx(serializeLevelSvgx(propDocument(collision)));
      const contacts = await inspect(document);
      assert.equal(contacts.length, 1, "Aggregate the coincident cube faces into one authored pair finding.");
      assert.deepEqual([...contacts[0].objects].sort(), ["one", "two"]);
      assert.equal(contacts[0].severity, "error");
      assert.ok(contacts[0].source && contacts[0].source.line > 0);
      assert.ok(document.props!.some((prop) => prop.source?.offset === contacts[0].source?.offset));
    });
  }

  it("attaches exact typed review patches and stable spatial targets to imported overlap errors", async () => {
    const document = importedProps();
    const first = await inspect(document, { resolveAsset: async () => triangleAsset() });
    const second = await inspect(document, { resolveAsset: async () => triangleAsset() });
    assert.equal(first.length, 1);
    const target = first[0].review!;
    assert.ok(target);
    assert.deepEqual(target.layers, ["props"]);
    assert.deepEqual(target.bounds, { min: [0, 0, 0], max: [2, 2, 0] });
    assert.ok(target.position.every(Number.isFinite));
    assert.ok(target.position[0] >= 0 && target.position[1] >= 0 && target.position[0] + target.position[1] <= 2 + 1e-6);
    assert.ok(target.direction[2] > 0.99);
    assert.ok(target.patches.length > 0);
    const area = target.patches.reduce((sum, polygon) => sum + Math.abs(polygon.reduce((twice, point, i) => {
      const next = polygon[(i + 1) % polygon.length];
      return twice + point[0] * next[1] - next[0] * point[1];
    }, 0)) / 2, 0);
    assert.ok(Math.abs(area - 2) < 1e-6, "Patches must describe the actual two-square-meter overlap.");
    assert.equal(second[0].review?.id, target.id);
  });

  it("audits more than 4096 independent planar overlaps without treating them as one complex fragment", async () => {
    const size = 46;
    const geometry: AssetGeometry = { positions: [], triangles: [] };
    for (let y = 0; y <= size; y++) for (let x = 0; x <= size; x++) geometry.positions.push([x, y, 0]);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const a = y * (size + 1) + x, b = a + 1, d = a + size + 1, c = d + 1;
      geometry.triangles.push([a, b, c], [a, c, d]);
    }
    assert.equal(geometry.triangles.length, 4232);
    const contacts = await inspect(importedProps(), { resolveAsset: async () => geometry });
    assert.equal(contacts.length, 1, "A tiled plane is one source-pair overlap, with no clipping complexity failure.");
    assert.deepEqual([...contacts[0].objects].sort(), ["one", "two"]);
    const target = contacts[0].review!;
    assert.deepEqual(target.bounds, { min: [0, 0, 0], max: [size, size, 0] });
    const area = target.patches.reduce((sum, polygon) => sum + Math.abs(polygon.reduce((twice, point, i) => {
      const next = polygon[(i + 1) % polygon.length];
      return twice + point[0] * next[1] - next[0] * point[1];
    }, 0)) / 2, 0);
    assert.ok(Math.abs(area - size * size) < 1e-5,
      "The duplicate 46 m square must measure 2116 m² regardless of triangle count.");
  });

  it("detects duplicate triangles within a single visual imported object", async () => {
    const document = importedProps(1);
    const geometry = triangleAsset();
    geometry.triangles.push([0, 1, 2]);
    const contacts = await inspect(document, { resolveAsset: async () => geometry });
    assert.equal(contacts.length, 1);
    assert.deepEqual(contacts[0].objects, ["one"]);
    assert.ok(contacts[0].review?.patches.length);
  });

  it("detects same-facing downward overlap rather than excluding visible undersides", async () => {
    const contacts = await inspect(importedProps(), { resolveAsset: async () => triangleAsset(true) });
    assert.equal(contacts.length, 1);
    assert.ok(contacts[0].review!.direction[2] < -0.99);
  });

  it("excludes opposing, perpendicular, line-only, point-only, and separated imported faces", async () => {
    for (const mode of ["opposing", "perpendicular", "line", "point", "separated"] as const) {
      const document = importedProps();
      const second = document.props![1];
      if (mode === "opposing") { document.assets!.push({ id: "opposite", src: "opposite.glb" }); second.asset = "opposite"; }
      if (mode === "perpendicular") second.rotation = [90, 0, 0];
      if (mode === "line") { second.rotation = [0, 0, 180]; second.position = [2, 2, 0]; }
      if (mode === "point") second.position = [2, 0, 0];
      if (mode === "separated") second.position = [0, 0, 0.001];
      assert.deepEqual(await inspect(document, { resolveAsset: async (asset) => triangleAsset(asset.id === "opposite") }), [], mode);
    }
  });

  it("finds a curved wall rim overlapping a floor cap without one report per curve segment", async () => {
    const document = createDocument("curved-wall-rim");
    document.layers = [floor("curved-floor", [[0, 0, 1], [4, 0, 1], [0, 4, 1]]), {
      id: "curved-wall.layer", vertices: [{ id: "wa", x: 4, y: 0, z: 0 }, { id: "wb", x: 0, y: 4, z: 0 }],
      edges: [{ id: "curved-wall", from: "wa", to: "wb", kind: "wall", height: 1, thickness: 0.2, control: [[4, 2.209], [2.209, 4]], openings: [] }], regions: [],
    }];
    document.layers[0].edges[1].control = [[4, 2.209], [2.209, 4]];
    const contacts = await inspect(document);
    assert.equal(contacts.length, 1);
    assert.deepEqual([...contacts[0].objects].sort(), ["curved-floor", "curved-wall"]);
    assert.ok(contacts[0].review!.patches.length > 1);
    assert.ok(contacts[0].review!.position.every(Number.isFinite));
  });

});
