import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createDocument } from "../src/vector/types.ts";
import {
  parseLevelSvgx,
  serializeLevelSvgx,
  SvgxError,
} from "../src/vector/format.ts";
import { compile } from "../src/vector/compiler.ts";
import { generateUVs, auditUVs } from "../src/vector/uv.ts";
function expectSideContacts(
  l: Awaited<ReturnType<typeof compile>>,
  edges: string[],
) {
  assert.deepEqual(
    l.diagnostics.map(({ severity, code, objects }) => ({
      severity,
      code,
      objects,
    })),
    edges.map((edge) => ({
      severity: "warning",
      code: "WALL_FLOOR_COPLANAR",
      objects: [edge, "floor"],
    })),
  );
  assert.ok(
    l.diagnostics.every((d) => d.message.includes("same-facing side surfaces")),
  );
}
export function room() {
  const d = createDocument("room");
  d.layers = [
    {
      id: "ground",
      vertices: [
        [0, 0],
        [6, 0],
        [6, 6],
        [0, 6],
      ].map(([x, y], i) => ({ id: "v" + i, x, y, z: 0 })),
      edges: [0, 1, 2, 3].map((i) => ({
        id: "e" + i,
        from: "v" + i,
        to: "v" + ((i + 1) % 4),
        kind: "wall" as const,
        openings: [],
      })),
      regions: [
        {
          id: "floor",
          boundary: ["e0", "e1", "e2", "e3"],
          holes: [],
          interior: [],
          creases: [],
          fill: "floor",
        },
      ],
    },
  ];
  return d;
}
describe("SVGX", () => {
  it("round trips semantic documents and preserves source locations", () => {
    const d = room();
    d.name = "A & B <test>";
    const parsed = parseLevelSvgx(serializeLevelSvgx(d));
    assert.equal(parsed.name, d.name);
    assert.equal(parsed.layers[0].vertices[0].source?.line, 6);
    assert.equal(serializeLevelSvgx(parsed), serializeLevelSvgx(d));
  });
  it("rejects XML entities, unknown attributes, duplicate IDs and nonfinite coordinates", () => {
    for (const text of [
      '<!DOCTYPE level [<!ENTITY x SYSTEM "file:///etc/passwd">]><level version="2" id="x"/>',
      serializeLevelSvgx(room()).replace('x="0"', 'x="Infinity"'),
      serializeLevelSvgx(room()).replace('id="v1"', 'id="v0"'),
      serializeLevelSvgx(room()).replace('x="0"', 'xx="0"'),
    ])
      assert.throws(() => parseLevelSvgx(text), SvgxError);
  });
  it("constructs a real closed mesh and deterministic geometry", async () => {
    const a = await compile(room()),
      b = await compile(room());
    assert.deepEqual(a.diagnostics, []);
    assert.ok(a.mesh.indices.length > 0);
    assert.equal(a.geometryHash, b.geometryHash);
  });
  it("does not fill an unreferenced closed outline", async () => {
    const d = room();
    d.layers[0].regions = [];
    const a = await compile(d);
    assert.equal(a.floors.length, 0);
    assert.ok(a.surfaces.every((s) => s.role === "wall"));
  });
  it("preserves slope and curved edge height", async () => {
    const d = room();
    d.layers[0].vertices[1].z = 1;
    d.layers[0].vertices[2].z = 1;
    d.layers[0].edges[1].control = [
      [8, 2],
      [8, 4],
    ];
    const a = await compile(d);
    // Perimeter wall feet follow the floor plane across their thickness;
    // the former sloping corner's duplicate slab-side wedge is gone.
    assert.deepEqual(a.diagnostics, []);
    assert.ok(a.curves.e1.length > 3);
    assert.ok(a.floors[0].points.some((p) => p[2] === 1));
  });
  it("rejects unclosed regions before emitting geometry", async () => {
    const d = room();
    d.layers[0].regions[0].boundary.pop();
    const a = await compile(d);
    assert.equal(a.mesh.indices.length, 0);
    assert.equal(a.diagnostics[0].code, "TOPOLOGY");
  });
  it("generates unique atlas UVs while preserving actual triangle corners", async () => {
    const a = await compile(room()),
      before = a.mesh;
    await generateUVs(a, { resolution: 256, density: 8 });
    assert.equal(auditUVs(a).length, 0);
    assert.deepEqual(a.mesh.positions, before.positions);
    assert.deepEqual(a.mesh.normals, before.normals);
    assert.deepEqual(a.mesh.uv, before.uv);
    assert.ok(a.mesh.uv1?.length);
    assert.equal(a.atlas?.lightmapChannel, 1);
  });
});

describe("mesh-derived navigation", () => {
  it("finds a continuous walkable room", async () => {
    const { validateForRuntime } = await import("../src/vector/validate.ts");
    const r = await validateForRuntime(await compile(room()));
    assert.equal(r.passed, true, JSON.stringify(r.diagnostics));
    assert.equal(r.navigation?.components, 1);
  });
  it("rejects a floor whose ceiling blocks the player", async () => {
    const { validateForRuntime } = await import("../src/vector/validate.ts");
    const d = room();
    d.layers[0].regions[0].ceiling = 1;
    const r = await validateForRuntime(await compile(d));
    assert.equal(r.passed, false);
  });
});

describe("corner styles", () => {
  it("keeps right-angle walls square by default", async () => {
    const a = await compile(room()),
      p = a.mesh.positions;
    assert.ok(
      Array.from({ length: p.length / 3 }, (_, i) =>
        p.slice(i * 3, i * 3 + 3),
      ).some(
        (p) =>
          Math.abs(p[0] + 0.11) < 1e-6 &&
          Math.abs(p[1] + 0.11) < 1e-6 &&
          p[2] > 2.9,
      ),
      "The outer miter reaches the exact square corner.",
    );
  });
  it("rounds corners only with an explicit join attribute", async () => {
    const d = room();
    for (const e of d.layers[0].edges) e.join = "round";
    const sharp = await compile(room()),
      round = await compile(d);
    assert.notEqual(sharp.geometryHash, round.geometryHash);
    assert.ok(round.mesh.indices.length > sharp.mesh.indices.length);
    assert.equal(
      parseLevelSvgx(serializeLevelSvgx(d)).layers[0].edges[0].join,
      "round",
    );
  });
});

describe("walls spanning storeys", () => {
  function stacked(base: number, sameLayer = false, reverse = false) {
    const d = createDocument("stacked-walls");
    const layer = (id: string, z: number) => ({
      id,
      vertices: [
        { id: `${id}.a`, x: 0, y: 0, z },
        { id: `${id}.b`, x: 4, y: 0, z },
      ],
      edges: [
        {
          id: `${id}.wall`,
          from: `${id}.${reverse && z ? "b" : "a"}`,
          to: `${id}.${reverse && z ? "a" : "b"}`,
          kind: "wall" as const,
          height: 3,
          thickness: 0.2,
          openings: [],
        },
      ],
      regions: [],
    });
    const low = layer("low", 0),
      high = layer("high", base);
    if (sameLayer) {
      low.vertices.push(...high.vertices);
      low.edges.push(...high.edges);
      d.layers = [low];
    } else d.layers = [low, high];
    return d;
  }
  function caps(l: Awaited<ReturnType<typeof compile>>) {
    return [
      ...new Set(
        l.mesh.surfaces.flatMap((_, t) => {
          const ids = l.mesh.indices.slice(t * 3, t * 3 + 3);
          return Math.abs(l.mesh.normals[ids[0] * 3 + 2]) > 0.99
            ? [l.mesh.positions[ids[0] * 3 + 2]]
            : [];
        }),
      ),
    ].sort((a, b) => a - b);
  }
  function volume(l: Awaited<ReturnType<typeof compile>>) {
    const m = l.mesh;
    let sum = 0;
    for (let t = 0; t < m.indices.length; t += 3) {
      const [a, b, c] = m.indices
        .slice(t, t + 3)
        .map((i) => m.positions.slice(i * 3, i * 3 + 3));
      sum +=
        (a[0] * (b[1] * c[2] - b[2] * c[1]) +
          a[1] * (b[2] * c[0] - b[0] * c[2]) +
          a[2] * (b[0] * c[1] - b[1] * c[0])) /
        6;
    }
    return sum;
  }
  it("unions overlapping walls across layers with no buried horizontal caps", async () => {
    const l = await compile(stacked(2, false, true));
    assert.deepEqual(l.diagnostics, []);
    assert.equal(l.parts.length, 1);
    assert.deepEqual(l.parts[0].layers, ["low", "high"]);
    assert.equal(l.parts[0].layer, "");
    assert.deepEqual(caps(l), [0, 5]);
    assert.ok(
      Math.abs(volume(l) - 4 * 0.2 * 5) < 1e-5,
      "Overlapping volume is counted only once.",
    );
    assert.deepEqual(
      new Set(l.mesh.surfaces.map((s) => l.surfaces[s].object)),
      new Set(["low.wall", "high.wall"]),
    );
  });
  it("joins touching spans and supports distinct heights in one layer", async () => {
    for (const sameLayer of [false, true]) {
      const l = await compile(stacked(3, sameLayer));
      assert.deepEqual(l.diagnostics, []);
      assert.equal(l.parts.length, 1);
      assert.deepEqual(caps(l), [0, 6]);
      assert.ok(Math.abs(volume(l) - 4 * 0.2 * 6) < 1e-5);
    }
  });
  it("preserves a gap between vertically separated walls", async () => {
    const l = await compile(stacked(4));
    assert.deepEqual(l.diagnostics, []);
    assert.deepEqual(caps(l), [0, 3, 4, 7]);
    assert.ok(
      Math.abs(volume(l) - 4 * 0.2 * 6) < 1e-5,
      "No wall volume is invented inside the gap.",
    );
  });
});

describe("floor-anchored walls", () => {
  function fixture() {
    const d = room();
    d.layers[0].vertices.forEach((v) => (v.z = 1));
    d.layers[0].edges.forEach((e) => (e.kind = "open" as any));
    const upper = structuredClone(d.layers[0]);
    upper.id = "upper";
    upper.vertices.forEach((v) => {
      v.id = "upper." + v.id;
      v.z = 4;
    });
    upper.edges.forEach((e) => {
      e.id = "upper." + e.id;
      e.from = "upper." + e.from;
      e.to = "upper." + e.to;
    });
    upper.regions[0].id = "upper-floor";
    upper.regions[0].thickness = 0.3;
    upper.regions[0].boundary = upper.edges.map((e) => e.id);
    d.layers.push(upper);
    d.layers[0].vertices.push(
      { id: "wall-a", x: 1, y: 3, z: 99 },
      { id: "wall-b", x: 5, y: 3, z: 99 },
    );
    const e: import("../src/vector/types.ts").Edge = {
      id: "partition",
      from: "wall-a",
      to: "wall-b",
      kind: "wall",
      openings: [],
      spanFloors: true,
    };
    d.layers[0].edges.push(e);
    return { d, e, upper };
  }
  function points(l: Awaited<ReturnType<typeof compile>>) {
    return l.mesh.surfaces.flatMap((s, t) =>
      l.surfaces[s].object === "partition"
        ? l.mesh.indices
            .slice(t * 3, t * 3 + 3)
            .map((i) => l.mesh.positions.slice(i * 3, i * 3 + 3))
        : [],
    );
  }
  it("round trips anchors and spans exactly to the upper slab underside", async () => {
    const { d, e } = fixture();
    e.baseFloor = "floor";
    e.topFloor = "upper-floor";
    const parsed = parseLevelSvgx(serializeLevelSvgx(d));
    assert.equal(parsed.layers[0].edges.at(-1)!.spanFloors, true);
    assert.equal(parsed.layers[0].edges.at(-1)!.baseFloor, "floor");
    assert.equal(parsed.layers[0].edges.at(-1)!.topFloor, "upper-floor");
    const l = await compile(parsed),
      p = points(l);
    assert.deepEqual(l.diagnostics, []);
    assert.ok(p.length);
    assert.ok(p.every((v) => v[2] >= 1 - 1e-6 && v[2] <= 3.7 + 1e-6));
    assert.ok(p.some((v) => Math.abs(v[2] - 3.7) < 1e-6));
    assert.ok(l.parts.some((p) => p.kind === "floor"));
  });
  it("automatically selects exactly two overlapping floors, independent of layers", async () => {
    const { d, upper } = fixture();
    d.layers[0].vertices.push(...upper.vertices);
    d.layers[0].edges.push(...upper.edges);
    d.layers[0].regions.push(...upper.regions);
    d.layers.pop();
    const l = await compile(d);
    assert.deepEqual(l.diagnostics, []);
    assert.ok(points(l).every((v) => v[2] < 3.71));
  });
  it("measures fixed height from the named base floor", async () => {
    const { d, e } = fixture();
    e.spanFloors = false;
    e.baseFloor = "floor";
    e.height = 1.5;
    const l = await compile(d),
      p = points(l);
    assert.deepEqual(l.diagnostics, []);
    assert.equal(Math.min(...p.map((v) => v[2])), 1);
    assert.equal(Math.max(...p.map((v) => v[2])), 2.5);
  });
  it("follows a triangulated upper floor's interior height breakpoints", async () => {
    const { d, upper } = fixture();
    upper.vertices.push({ id: "peak", x: 3, y: 3, z: 6 });
    upper.regions[0].interior = ["peak"];
    const l = await compile(d),
      p = points(l);
    assert.deepEqual(l.diagnostics, []);
    assert.ok(
      p.some((v) => Math.abs(v[0] - 3) < 1e-5 && Math.abs(v[2] - 5.7) < 1e-5),
      "The wall reaches the intermediate peak, not just the endpoints.",
    );
    assert.ok(
      p.filter((v) => Math.abs(v[0] - 1) < 1e-5).every((v) => v[2] < 4.367),
    );
  });
  it("rejects missing references, ambiguous floors and conflicting height modes at the edge source", async () => {
    for (const mode of [
      "missing",
      "conflict",
      "top-without-span",
      "ambiguous",
    ]) {
      const { d, e, upper } = fixture();
      if (mode === "missing") e.baseFloor = "absent";
      if (mode === "conflict") e.height = 3;
      if (mode === "top-without-span") {
        e.spanFloors = false;
        e.topFloor = "upper-floor";
      }
      if (mode === "ambiguous") {
        const third = structuredClone(upper);
        third.id = "third";
        third.vertices.forEach((v) => {
          v.id = "third." + v.id;
          v.z = 8;
        });
        third.edges.forEach((e) => {
          e.id = "third." + e.id;
          e.from = "third." + e.from;
          e.to = "third." + e.to;
        });
        third.regions[0].id = "third-floor";
        third.regions[0].boundary = third.edges.map((e) => e.id);
        d.layers.push(third);
      }
      const l = await compile(parseLevelSvgx(serializeLevelSvgx(d)));
      const error = l.diagnostics.find((d) => d.code === "WALL_ANCHOR");
      assert.ok(error, mode);
      assert.deepEqual(error.objects, ["partition"]);
      assert.ok(error.source?.line);
      assert.equal(l.mesh.indices.length, 0);
    }
  });
  it("rejects a span crossing an upper-floor hole even when both endpoints are supported", async () => {
    const { d, e, upper } = fixture();
    e.baseFloor = "floor";
    e.topFloor = "upper-floor";
    const coords = [
      [2, 2],
      [4, 2],
      [4, 4],
      [2, 4],
    ];
    upper.vertices.push(
      ...coords.map(([x, y], i) => ({ id: "h" + i, x, y, z: 4 })),
    );
    upper.edges.push(
      ...coords.map((_, i) => ({
        id: "he" + i,
        from: "h" + i,
        to: "h" + ((i + 1) % 4),
        kind: "open" as any,
        openings: [],
      })),
    );
    upper.regions[0].holes = [["he0", "he1", "he2", "he3"]];
    const l = await compile(d);
    assert.ok(
      l.diagnostics.some(
        (d) =>
          d.code === "WALL_ANCHOR" && d.message.includes("leaves top-floor"),
      ),
    );
    assert.equal(l.mesh.indices.length, 0);
  });
});

describe("independent structural meshes and connected charts", () => {
  function stairs(rise = 0.18) {
    const d = room(),
      l = d.layers[0];
    l.vertices = [
      { id: "v0", x: 0, y: 0, z: 0 },
      { id: "v1", x: 8, y: 0, z: 3 },
      { id: "v2", x: 8, y: 2, z: 3 },
      { id: "v3", x: 0, y: 2, z: 0 },
    ];
    l.edges[1].kind = "open";
    l.edges[3].kind = "open";
    Object.assign(l.regions[0], {
      fill: "stairs",
      lower: "e3",
      upper: "e1",
      rise,
    });
    return d;
  }
  it("never fuses a floor into a wall mesh", async () => {
    const l = await compile(room());
    assert.ok(l.parts.some((p) => p.kind === "floor"));
    assert.ok(l.parts.some((p) => p.kind === "wall"));
    for (const p of l.parts)
      assert.ok(
        p.triangles.every(
          (t) => l.surfaces[l.mesh.surfaces[t]].kind === p.kind,
        ),
      );
  });
  it("keeps stair-side walls as parallelograms independent of tread count", async () => {
    const coarse = await compile(stairs(0.3)),
      fine = await compile(stairs(0.1));
    const triangles = (l: Awaited<ReturnType<typeof compile>>, kind: string) =>
      l.parts
        .filter((p) => p.kind === kind)
        .flatMap((p) => p.triangles)
        .map((t) =>
          l.mesh.indices
            .slice(t * 3, t * 3 + 3)
            .map((v) => l.mesh.positions.slice(v * 3, v * 3 + 3)),
        );
    expectSideContacts(coarse, ["e0", "e2"]);
    expectSideContacts(fine, ["e0", "e2"]);
    assert.deepEqual(triangles(coarse, "wall"), triangles(fine, "wall"));
    assert.equal(
      triangles(coarse, "wall").length,
      24,
      "Two simple closed wall panels have 12 triangles each.",
    );
    assert.ok(
      triangles(fine, "stairs").length > triangles(coarse, "stairs").length,
    );
    assert.equal(coarse.parts.filter((p) => p.kind === "stairs").length, 1);
  });
  it("keeps adjoining coplanar floor triangles in a shared atlas chart", async () => {
    const l = await compile(room(), {
        uvs: true,
        uv: { resolution: 256, density: 8 },
      }),
      m = l.mesh;
    const top = l.parts
      .find((p) => p.kind === "floor")!
      .triangles.filter((t) => m.normals[m.indices[t * 3] * 3 + 2] > 0.99);
    assert.ok(top.length >= 2);
    assert.equal(new Set(top.map((t) => m.chartIds![t])).size, 1);
    const uses = new Map<string, { uv: number[]; chart: number }[]>();
    for (const t of top)
      for (const i of m.indices.slice(t * 3, t * 3 + 3)) {
        const key = m.positions.slice(i * 3, i * 3 + 3).join(","),
          list = uses.get(key) ?? [];
        list.push({
          uv: m.uv1!.slice(i * 2, i * 2 + 2),
          chart: m.chartIds![t],
        });
        uses.set(key, list);
      }
    for (const list of uses.values())
      for (const v of list)
        assert.deepEqual(
          v,
          list[0],
          "A shared world vertex has matching UVs within its chart.",
        );
  });
  it("unwraps the showcase into connected charts without per-triangle fallback", async () => {
    const { readFile } = await import("node:fs/promises");
    const l = await compile(
      parseLevelSvgx(
        await readFile(
          new URL("../examples/showcase.level.svgx", import.meta.url),
          "utf8",
        ),
      ),
      { uvs: true },
    );
    assert.deepEqual(l.diagnostics, []);
    assert.ok(l.atlas!.charts.length < l.mesh.surfaces.length / 4);
    const curved = l.atlas!.charts.filter((c) =>
      c.objects.includes("courtyard.e0"),
    );
    assert.ok(curved.some((c) => c.triangles.length > 50));
    assert.ok(curved.length <= 8);
  });
});

describe("export and lighting revision contracts", () => {
  it("exports separate structural meshes with both UV channels", async () => {
    const { toGLB, toRuntime } = await import("../src/vector/export.ts");
    const l = await compile(room(), { uvs: true, uv: { resolution: 256 } }),
      glb = toGLB(l),
      view = new DataView(glb.buffer),
      json = JSON.parse(
        new TextDecoder().decode(glb.slice(20, 20 + view.getUint32(12, true))),
      );
    assert.equal(view.getUint32(0, true), 0x46546c67);
    assert.equal(view.getUint32(8, true), glb.length);
    for (const mesh of json.meshes)
      for (const primitive of mesh.primitives) {
        assert.ok("TEXCOORD_0" in primitive.attributes);
        assert.ok("TEXCOORD_1" in primitive.attributes);
        assert.ok(primitive.extras.sourceSurfaces.length);
      }
    assert.ok(json.nodes.some((n: any) => n.extras?.meshKind === "wall"));
    assert.ok(json.nodes.some((n: any) => n.extras?.meshKind === "floor"));
    assert.equal(toRuntime(l).meshes.length, l.parts.length);
  });
  it("rejects stale light rigs and materials without treating source locations as lighting changes", async () => {
    const { lightingStateHash, validateLightingManifest } = await import(
      "../src/lighting/manifest.ts"
    );
    const l = await compile(room(), { uvs: true, uv: { resolution: 256 } }),
      manifest = {
        version: 1,
        uvChannel: 1,
        flipY: false,
        colorSpace: "Linear-sRGB",
        geometryHash: l.geometryHash,
        uvHash: l.atlas!.uvHash,
        stateHash: await lightingStateHash(l),
        irradianceScale: Math.PI,
        safeMip: 0,
        pages: l.atlas!.pages.map((p) => ({
          id: p.id,
          file: "page.exr",
          sha256: "0".repeat(64),
          mips: [],
        })),
      };
    await validateLightingManifest(l, manifest);
    l.document.name = "Editorial rename";
    l.document.source = { line: 99, column: 1, offset: 20 };
    await validateLightingManifest(l, manifest);
    l.document.sky.intensity += 0.1;
    await assert.rejects(
      () => validateLightingManifest(l, manifest),
      /Stale lighting/,
    );
  });
});
