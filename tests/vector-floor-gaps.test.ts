import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { auditFloorGaps } from "../src/vector/floor-gaps.ts";
import {
  compile,
  createDocument,
  parseLevelSvgx,
  serializeLevelSvgx,
  SceneBuilder,
  type Layer,
  type LevelDocument,
} from "../src/vector/index.ts";

function rectangle(
  id: string,
  x: number,
  y: number,
  width: number,
  length: number,
  z: number,
): Layer {
  return {
    id,
    vertices: [
      [x, y],
      [x + width, y],
      [x + width, y + length],
      [x, y + length],
    ].map(([x, y], i) => ({ id: `${id}.v${i}`, x, y, z })),
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
        thickness: 0.2,
      },
    ],
  };
}

function adjacent(height = 1): LevelDocument {
  const d = createDocument("floor-gap");
  d.layers = [
    rectangle("low", 0, 0, 2, 4, 0),
    rectangle("high", 2, 0, 2, 4, height),
  ];
  return d;
}

async function inspect(d: LevelDocument) {
  // These fixtures deliberately overlap retaining walls and slabs while testing gap coverage.
  const level = await compile(d, { navigation: false, surfaceContacts: false });
  assert.deepEqual(
    level.diagnostics.filter((diagnostic) => diagnostic.severity === "error"),
    [],
    "The fixture itself must compile successfully.",
  );
  return level.diagnostics.filter(
    (diagnostic) => diagnostic.code === "FLOOR_EDGE_GAP",
  );
}

function assertPair(objects: string[]) {
  for (const id of ["low.floor", "high.floor", "low.e1", "high.e3"])
    assert.ok(objects.includes(id), `Diagnostic identifies ${id}.`);
}

describe("unsealed adjacent floor boundaries", () => {
  it("warns by default with both floor and boundary IDs and an XML source location", async () => {
    const document = parseLevelSvgx(serializeLevelSvgx(adjacent()));
    const gaps = await inspect(document);
    assert.equal(gaps.length, 1);
    assert.equal(gaps[0].severity, "warning");
    assertPair(gaps[0].objects);
    assert.ok(gaps[0].source && gaps[0].source.line > 0);
    assert.ok(gaps[0].source.column > 0);
    const sources = document.layers
      .flatMap((layer) => [...layer.edges, ...layer.regions])
      .filter((object) => gaps[0].objects.includes(object.id));
    assert.ok(
      sources.some(
        (object) => object.source?.offset === gaps[0].source?.offset,
      ),
    );
  });

  it("allows the audit to be disabled or promoted to an error", async () => {
    const disabled = await compile(adjacent(), {
      navigation: false,
      floorGaps: false,
    });
    assert.equal(disabled.diagnostics.length, 0);
    assert.ok(disabled.mesh.indices.length > 0);
    const strict = await compile(adjacent(), {
      navigation: false,
      floorGaps: "error",
    });
    const gap = strict.diagnostics.find(
      (diagnostic) => diagnostic.code === "FLOOR_EDGE_GAP",
    );
    assert.ok(gap);
    assert.equal(gap.severity, "error");
    assertPair(gap.objects);
  });

  it("ignores equal elevations and shallow steps already closed by slab thickness", async () => {
    for (const height of [0, 0.1, 0.2, 0.201])
      assert.deepEqual(await inspect(adjacent(height)), [], `Height ${height}`);
    assert.equal((await inspect(adjacent(0.202))).length, 1);
  });

  it("detects a positive-length partial boundary overlap but not a point contact", async () => {
    const partial = adjacent();
    partial.layers[1] = rectangle("high", 2, 1, 2, 2, 1);
    const gaps = await inspect(partial);
    assert.equal(gaps.length, 1);
    assertPair(gaps[0].objects);
    const point = adjacent();
    point.layers[1] = rectangle("high", 2, 4, 2, 2, 1);
    assert.deepEqual(await inspect(point), []);
  });

  it("preserves stacked footprints and perpendicular overpasses", async () => {
    const stacked = adjacent(3);
    stacked.layers[1] = rectangle("high", 0, 0, 2, 4, 3);
    assert.deepEqual(await inspect(stacked), []);
    const crossing = adjacent(3);
    crossing.layers[1] = rectangle("high", -1, 1, 4, 2, 3);
    assert.deepEqual(await inspect(crossing), []);
  });

  it("recognizes a level floor continuing through an underpass entrance", async () => {
    const d = adjacent(3);
    d.layers.push(rectangle("underpass", 2, 0, 2, 4, 0));
    assert.deepEqual(await inspect(d), []);
  });

  it("uses a sloped stair's real underside when auditing an adjacent boundary", async () => {
    const d = adjacent();
    const stairs = d.layers[1];
    stairs.vertices.forEach((vertex) => {
      vertex.z = vertex.y / 2;
    });
    Object.assign(stairs.regions[0], {
      fill: "stairs",
      lower: "high.e0",
      upper: "high.e2",
      underside: "sloped",
    });
    const gaps = await inspect(d);
    assert.equal(gaps.length, 1);
    assertPair(gaps[0].objects);
    const height = Number(gaps[0].message.match(/about ([\d.]+) m high/)?.[1]);
    assert.ok(height > 1.7 && height < 1.9);
    stairs.regions[0].underside = "filled";
    assert.deepEqual(await inspect(d), []);
  });

  it("audits perpendicular sloped stairs meeting a landing at a shared corner after rotation and translation", async () => {
    for (const yaw of [0, 31, 90, 180]) {
      const scene = new SceneBuilder("perpendicular-stairs");
      const group = scene.group("entry", { origin: [7.3, -4.2, 2], yaw });
      group.platform("landing", {
        width: 1.5, depth: 1.4, thickness: 0.16, material: "default",
      });
      group.polygon("north-flight", [
        [0, 1.4, 0], [1.5, 1.4, 0], [1.5, 4.9, 1.6], [0, 4.9, 1.6],
      ], { fill: "stairs", rise: 0.18, underside: "sloped", thickness: 0.16 });
      group.polygon("west-flight", [
        [0, 0, 0], [0, 1.4, 0], [-1.6, 1.4, 1], [-1.6, 0, 1],
      ], { fill: "stairs", rise: 0.18, underside: "sloped", thickness: 0.16 });
      group.platform("upper-landing", {
        origin: [-3.1, 0, 1], width: 1.5, depth: 1.4,
        thickness: 0.16, material: "default",
      });
      const level = await compile(scene.document, {
        navigation: false, floorGaps: "error",
      });
      assert.deepEqual(level.diagnostics, [], `Valid landing joins at yaw ${yaw}`);
      const flight = level.floors.find((floor) => floor.region === "entry/west-flight");
      assert.ok(flight && flight.triangles.length > 0, "The audited flight retains real tread geometry.");
      assert.ok(Math.abs(Math.max(...flight.points.map((point) => point[2])) - 3) < 1e-6);
    }
  });

  it("still reports a real exposed sloped stair-side gap after rotation and translation", async () => {
    const document = adjacent();
    const stairs = document.layers[1];
    stairs.vertices.forEach((vertex) => { vertex.z = vertex.y / 2; });
    Object.assign(stairs.regions[0], {
      fill: "stairs", lower: "high.e0", upper: "high.e2", underside: "sloped",
    });
    const radians = 31 * Math.PI / 180;
    for (const layer of document.layers) for (const vertex of layer.vertices) {
      const { x, y } = vertex;
      vertex.x = 7.3 + x * Math.cos(radians) - y * Math.sin(radians);
      vertex.y = -4.2 + x * Math.sin(radians) + y * Math.cos(radians);
      vertex.z += 2;
    }
    const level = await compile(document, { navigation: false, floorGaps: "error" });
    const gaps = level.diagnostics.filter((diagnostic) => diagnostic.code === "FLOOR_EDGE_GAP");
    assert.equal(gaps.length, 1);
    assert.equal(gaps[0].severity, "error");
    assertPair(gaps[0].objects);
    const height = Number(gaps[0].message.match(/about ([\d.]+) m high/)?.[1]);
    assert.ok(height > 1.7 && height < 1.9, "An orientation change cannot hide the physical gap.");
  });

  it("recognizes a first stair riser stepping down onto a continuous underpass floor", async () => {
    const d = adjacent(3);
    const stairs = d.layers[0];
    stairs.vertices.forEach((vertex) => {
      vertex.z = vertex.x === 0 ? 1 : 0;
    });
    Object.assign(stairs.regions[0], {
      fill: "stairs",
      lower: "low.e1",
      upper: "low.e3",
    });
    d.layers.push(rectangle("underpass", 2, 0, 2, 4, 0));
    assert.deepEqual(await inspect(d), []);
  });

  it("reports the remainder when a lower floor continues beneath only half an elevated boundary", async () => {
    const d = adjacent(3);
    d.layers.push(rectangle("underpass", 2, 0, 2, 2, 0));
    const gaps = await inspect(d);
    assert.equal(gaps.length, 1);
    assertPair(gaps[0].objects);
    const length = Number(gaps[0].message.match(/along ([\d.]+) m/)?.[1]);
    assert.ok(
      Math.abs(length - 2) < 0.01,
      "Only the unsealed half is reported.",
    );
  });

  it("follows reversed curved boundaries and their sealing seam", async () => {
    const d = adjacent();
    d.layers[0].edges[1].control = [
      [3, 1],
      [3, 3],
    ];
    d.layers[1].edges[3].control = [
      [3, 3],
      [3, 1],
    ];
    const gaps = await inspect(d);
    assert.equal(gaps.length, 1);
    assertPair(gaps[0].objects);
    d.seams.push({
      id: "curved-riser",
      edges: ["low.e1", "high.e3"],
      kind: "open",
    });
    assert.deepEqual(await inspect(d), []);
  });

  it("recognizes the opposite fill sides around a courtyard hole", async () => {
    const d = createDocument("courtyard-gap");
    const outside = rectangle("outside", -4, -4, 8, 8, 0);
    const hole = rectangle("hole", -2, -2, 4, 4, 0);
    outside.vertices.push(...hole.vertices);
    outside.edges.push(...hole.edges);
    outside.regions[0].holes = [hole.regions[0].boundary];
    d.layers = [outside, rectangle("courtyard", -2, -2, 4, 4, 1)];
    const gaps = await inspect(d);
    assert.equal(gaps.length, 4);
    assert.ok(
      gaps.every(
        (gap) =>
          gap.objects.includes("outside.floor") &&
          gap.objects.includes("courtyard.floor"),
      ),
    );
  });

  it("detects the exposed part of a ramp boundary whose lower end is slab-covered", async () => {
    const d = adjacent();
    const upper = d.layers[1];
    upper.vertices.forEach((vertex) => {
      vertex.z = vertex.y === 0 ? 0.1 : 1;
    });
    Object.assign(upper.regions[0], {
      fill: "ramp",
      lower: "high.e0",
      upper: "high.e2",
    });
    const gaps = await inspect(d);
    assert.equal(gaps.length, 1);
    assertPair(gaps[0].objects);
    d.seams.push({
      id: "ramp-riser",
      edges: ["low.e1", "high.e3"],
      kind: "open",
    });
    assert.deepEqual(await inspect(d), []);
  });

  it("seals a stair-side seam even when both profiles start at the same landing height", async () => {
    for (const edges of [
      ["high.e3", "low.e1"],
      ["low.e1", "high.e3"],
    ] as [string, string][]) {
      const d = adjacent();
      const stairs = d.layers[0];
      stairs.vertices.forEach((vertex) => {
        vertex.z = vertex.y / 4;
      });
      Object.assign(stairs.regions[0], {
        fill: "stairs",
        lower: "low.e0",
        upper: "low.e2",
      });
      d.seams.push({ id: "stair-side-riser", edges, kind: "open" });
      const level = await compile(d, { navigation: false, surfaceContacts: "error" });
      assert.deepEqual(
        level.diagnostics.map(({ severity, code, objects }) => ({
          severity,
          code,
          objects,
        })),
        [
          {
            severity: "error",
            code: "SURFACE_COPLANAR",
            objects: ["low.floor", "stair-side-riser"],
          },
        ],
      );
      assert.ok(
        level.mesh.surfaces.some(
          (index) => level.surfaces[index].object === "stair-side-riser",
        ),
        "The retaining seam must produce actual wall geometry, regardless of edge order.",
      );
    }
  });

  it("finds boundaries regardless of layer organization or an unrelated storey", async () => {
    const d = adjacent();
    const [low, high] = d.layers;
    low.vertices.push(...high.vertices);
    low.edges.push(...high.edges);
    low.regions.push(...high.regions);
    d.layers = [low, rectangle("upper-storey", 8, 0, 4, 4, 5)];
    const gaps = await inspect(d);
    assert.equal(gaps.length, 1);
    assertPair(gaps[0].objects);
    assert.ok(!gaps[0].objects.includes("upper-storey.floor"));
  });

  it("accepts a wall that seals the entire vertical interval", async () => {
    const d = adjacent();
    Object.assign(d.layers[0].edges[1], { kind: "wall", height: 0.8 });
    assert.deepEqual(await inspect(d), []);
  });

  it("does not let a short wall or a wall based above the gap hide it", async () => {
    const short = adjacent();
    Object.assign(short.layers[0].edges[1], { kind: "wall", height: 0.4 });
    assert.equal((await inspect(short)).length, 1);
    const above = adjacent();
    Object.assign(above.layers[1].edges[3], { kind: "wall", height: 3 });
    assert.equal((await inspect(above)).length, 1);
  });

  it("preserves a vertical gap between two static wall spans at the same boundary", async () => {
    const d = adjacent();
    Object.assign(d.layers[0].edges[1], { kind: "wall", height: 0.3 });
    d.layers.push({
      id: "upper-wall",
      vertices: [
        { id: "upper-wall.a", x: 2, y: 0, z: 0.5 },
        { id: "upper-wall.b", x: 2, y: 4, z: 0.5 },
      ],
      edges: [
        {
          id: "upper-wall.edge",
          from: "upper-wall.a",
          to: "upper-wall.b",
          kind: "wall",
          height: 0.3,
          openings: [],
        },
      ],
      regions: [],
    });
    const gaps = await inspect(d);
    assert.equal(gaps.length, 1);
    assertPair(gaps[0].objects);
    const height = Number(gaps[0].message.match(/about ([\d.]+) m high/)?.[1]);
    assert.ok(
      Math.abs(height - 0.2) < 0.001,
      "The opening between the two solids remains unsealed.",
    );
  });

  it("still reports the uncovered length when a freestanding wall seals only half the edge", async () => {
    const d = adjacent();
    d.layers.push({
      id: "partial-wall",
      vertices: [
        { id: "wall.a", x: 2, y: 0, z: 0 },
        { id: "wall.b", x: 2, y: 2, z: 0 },
      ],
      edges: [
        {
          id: "wall",
          from: "wall.a",
          to: "wall.b",
          kind: "wall",
          height: 1,
          openings: [],
        },
      ],
      regions: [],
    });
    assert.equal((await inspect(d)).length, 1);
  });

  it("accepts physical seams and explicit floor-spanning walls", async () => {
    const seam = adjacent();
    seam.seams.push({
      id: "retaining-riser",
      edges: ["low.e1", "high.e3"],
      kind: "open",
    });
    assert.deepEqual(await inspect(seam), []);
    const span = adjacent();
    Object.assign(span.layers[0].edges[1], {
      kind: "wall",
      spanFloors: true,
      baseFloor: "low.floor",
      topFloor: "high.floor",
    });
    assert.deepEqual(await inspect(span), []);
  });

  it("checks an actual door opening instead of treating the whole edge as a seal", async () => {
    const d = adjacent();
    const edge = d.layers[0].edges[1];
    edge.kind = "wall";
    edge.openings.push({
      id: "door",
      kind: "door",
      start: 1,
      end: 3,
      sill: 0,
      head: 2.1,
    });
    assert.equal((await inspect(d)).length, 1);
    edge.openings[0].sill = 0.8;
    assert.deepEqual(
      await inspect(d),
      [],
      "A raised opening above the upper slab underside leaves a complete seal below.",
    );
  });

  it("finds a two-millimetre opening between arbitrary wall stations", async () => {
    const d = adjacent();
    const edge = d.layers[0].edges[1];
    edge.kind = "wall";
    edge.openings.push({
      id: "tiny-opening",
      kind: "door",
      start: 1.137,
      end: 1.139,
      sill: 0,
      head: 2.1,
    });
    const gaps = await inspect(d);
    assert.equal(gaps.length, 1);
    assertPair(gaps[0].objects);
  });
});


/** The intermediate slab is on the lower floor's occupied side, not an underpass continuation. */
function intermediateSeal(top = 0.9, bottom = 0.6, length = 4) {
  const document = adjacent(1);
  Object.assign(document.layers[0].edges[1], { kind: "wall", height: 0.6 });
  const middle = rectangle("middle", 0, 0, 2, length, top);
  middle.regions[0].thickness = top - bottom;
  document.layers.push(middle);
  return document;
}

describe("actual intermediate structural material seals floor boundaries", () => {
  it("accepts a same-side slab that closes the .20m interval above a short wall", async () => {
    const document = intermediateSeal();
    const level = await compile(document, { navigation: false, floorGaps: "error", surfaceContacts: "error" });
    assert.deepEqual(level.diagnostics, []);
    const slabFaces = level.surfaces.filter(surface => surface.object === "middle.floor");
    assert.ok(slabFaces.length > 0, "The intermediate seal must be actual compiled structural material");
    assert.ok(slabFaces.every(surface => surface.kind === "floor" && !surface.dynamic));
  });

  it("retains independently sized lower, upper and partial-length gaps", async () => {
    const noSlab = intermediateSeal();
    noSlab.layers.pop();
    const cases = [
      { document: noSlab, length: 4, height: 0.2 },
      { document: intermediateSeal(0.95, 0.65), length: 4, height: 0.05 },
      { document: intermediateSeal(0.75, 0.45), length: 4, height: 0.05 },
      { document: intermediateSeal(0.9, 0.6, 2), length: 2, height: 0.2 },
    ];
    for (const { document, length, height } of cases) {
      const gaps = await inspect(document);
      const gap = gaps.find(diagnostic => diagnostic.objects.includes("low.floor") && diagnostic.objects.includes("high.floor"));
      assert.ok(gap, "A real remaining interval must not disappear behind another slab");
      const reportedLength = Number(gap.message.match(/along ([\d.]+) m/)?.[1]);
      const reportedHeight = Number(gap.message.match(/about ([\d.]+) m high/)?.[1]);
      assert.equal(reportedLength, length);
      assert.equal(reportedHeight, height);
    }
  });

  it("uses actual native stair caps as intermediate sealing material", async () => {
    const document = intermediateSeal();
    const middle = document.layers[2];
    middle.vertices.forEach(vertex => { vertex.z = vertex.x === 2 ? 0.8 : 1; });
    Object.assign(middle.regions[0], {
      fill: "stairs", lower: "middle.e1", upper: "middle.e3", rise: 0.1, thickness: 0.3, underside: "stepped",
    });
    const level = await compile(document, { navigation: false, floorGaps: "error", surfaceContacts: "error" });
    assert.deepEqual(level.diagnostics, []);
    assert.ok(level.surfaces.some(surface => surface.object === "middle.floor" && surface.kind === "stairs"));
  });

  it("counts hidden static collision but excludes dynamic or noncolliding material", async () => {
    const compiled = await compile(intermediateSeal(), { navigation: false, floorGaps: false });
    assert.deepEqual(compiled.diagnostics, []);
    const targets = compiled.surfaces.filter(surface => surface.object === "middle.floor");
    assert.ok(targets.length > 0, "The flag controls must modify real intermediate slab surfaces");
    for (const [flag, value, expectedGap] of [
      ["visible", false, false], ["collidable", false, true], ["dynamic", true, true],
    ] as const) {
      const level = structuredClone(compiled);
      for (const surface of level.surfaces) if (surface.object === "middle.floor") surface[flag] = value;
      const gaps = auditFloorGaps(level, "error");
      assert.equal(gaps.some(diagnostic => diagnostic.objects.includes("low.floor") && diagnostic.objects.includes("high.floor")), expectedGap, flag);
    }
    assert.deepEqual(compiled.surfaces.filter(surface => surface.object === "middle.floor"), targets);
  });
});
