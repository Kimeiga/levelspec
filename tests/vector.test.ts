import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ArchitectureBuilder,
  compile,
  parseAml,
  serializeAml,
  generateUVs,
  auditUVs,
} from "levelspec";
import type { Wall } from "levelspec";

/** A native slab and four assembled walls with independently fixed dimensions. */
function room() {
  const b = new ArchitectureBuilder("room");
  b.profile("plan", [
    [0, 0, 0],
    [6, 0, 0],
    [6, 6, 0],
    [0, 6, 0],
  ]);
  b.slab("floor", "plan");
  const points: [
    [number, number, number],
    [number, number, number],
    [number, number, number],
    [number, number, number],
  ] = [
    [0, 0, 0],
    [6, 0, 0],
    [6, 6, 0],
    [0, 6, 0],
  ];
  for (let i = 0; i < 4; i++) {
    b.path(`path${i}`, [points[i], points[(i + 1) % 4]]);
    b.wall(`wall${i}`, `path${i}`);
  }
  b.assembly("shell", [...b.document.elements]);
  return b.document;
}
/** Explicit lower/upper supports separate source path height from architectural anchoring. */
function anchored() {
  const b = new ArchitectureBuilder("anchored");
  for (const [id, z, thickness] of [
    ["lower", 1, 0.2],
    ["upper", 4, 0.3],
  ] as const) {
    b.profile(`${id}-plan`, [
      [0, 0, z],
      [6, 0, z],
      [6, 6, z],
      [0, 6, z],
    ]);
    b.slab(id, `${id}-plan`, { thickness });
  }
  b.path("axis", [
    [1, 3, 99],
    [5, 3, 99],
  ]);
  const wall = b.wall("partition", "axis", { spanFloors: true });
  return { b, wall };
}
/** Reads the final exposed partition vertices in meters, including derived anchor breakpoints. */
function wallPoints(level: Awaited<ReturnType<typeof compile>>) {
  return level.mesh.surfaces.flatMap((s, t) =>
    level.surfaces[s].object === "partition"
      ? level.mesh.indices
          .slice(t * 3, t * 3 + 3)
          .map((i) => level.mesh.positions.slice(i * 3, i * 3 + 3))
      : [],
  );
}

describe("native floor and soffit anchors", () => {
  it("retains explicit anchors through XML and measures exactly to the upper underside", async () => {
    const { b, wall } = anchored();
    wall.baseFloor = "lower";
    wall.topFloor = "upper";
    wall.spanFloors = true;
    const level = await compile(parseAml(serializeAml(b.document)), {
      navigation: false,
    });
    assert.deepEqual(level.diagnostics, []);
    const z = wallPoints(level).map((p) => p[2]);
    assert.ok(Math.abs(Math.min(...z) - 1) < 1e-7);
    assert.ok(Math.abs(Math.max(...z) - 3.7) < 1e-7);
  });
  it("automatically selects exactly two overlapping floors", async () => {
    const { b } = anchored();
    const level = await compile(b.document, { navigation: false });
    assert.deepEqual(level.diagnostics, []);
    assert.ok(
      Math.abs(Math.max(...wallPoints(level).map((p) => p[2])) - 3.7) < 1e-7,
    );
  });
  it("measures fixed wall height from its named floor", async () => {
    const { b, wall } = anchored();
    wall.spanFloors = false;
    wall.baseFloor = "lower";
    wall.height = 1.7;
    const level = await compile(b.document, { navigation: false });
    assert.deepEqual(level.diagnostics, []);
    assert.ok(
      Math.abs(Math.max(...wallPoints(level).map((p) => p[2])) - 2.7) < 1e-7,
    );
  });
  it("follows interior triangulated upper-floor height breakpoints", async () => {
    const { b } = anchored();
    b.document.profiles.find((p) => p.id === "upper-plan")!.interior = [
      [3, 3, 4.8],
    ];
    const level = await compile(b.document, { navigation: false });
    assert.deepEqual(level.diagnostics, []);
    assert.ok(
      wallPoints(level).some(
        (p) => Math.abs(p[0] - 3) < 1e-7 && Math.abs(p[2] - 4.5) < 1e-7,
      ),
    );
  });
  it("rejects missing and ambiguous floor anchors with source-linked diagnostics", async () => {
    for (const mode of ["missing", "ambiguous"]) {
      const { b, wall } = anchored();
      if (mode === "missing") wall.baseFloor = "absent";
      else {
        b.profile("third-plan", [
          [0, 0, 6],
          [6, 0, 6],
          [6, 6, 6],
          [0, 6, 6],
        ]);
        b.slab("third", "third-plan");
      }
      const level = await compile(parseAml(serializeAml(b.document)), {
        navigation: false,
      });
      assert.ok(
        level.diagnostics.some(
          (d) =>
            d.severity === "error" &&
            d.objects.includes("partition") &&
            d.source,
        ),
      );
    }
  });
  it("does not bridge a declared anchor hole between supported endpoints", async () => {
    const { b } = anchored();
    b.document.profiles.find((p) => p.id === "upper-plan")!.holes = [
      {
        points: [
          [2, 2, 4],
          [2, 4, 4],
          [4, 4, 4],
          [4, 2, 4],
        ],
      },
    ];
    const level = await compile(b.document, { navigation: false });
    assert.ok(
      level.diagnostics.some(
        (d) => d.severity === "error" && d.objects.includes("partition"),
      ),
    );
  });
});

describe("native structural meshes and connected charts", () => {
  it("retains structural categories and exact material corners through UV generation", async () => {
    const level = await compile(room(), { navigation: false });
    assert.ok(level.parts.some((p) => p.kind === "floor"));
    assert.ok(level.parts.some((p) => p.kind === "wall"));
    for (const part of level.parts)
      assert.ok(
        part.triangles.every(
          (t) => level.surfaces[level.mesh.surfaces[t]].kind === part.kind,
        ),
      );
    const before = structuredClone(level.mesh);
    await generateUVs(level, { resolution: 256, density: 8 });
    assert.deepEqual(auditUVs(level), []);
    for (const field of [
      "positions",
      "normals",
      "indices",
      "uv",
      "surfaces",
    ] as const)
      assert.deepEqual(level.mesh[field], before[field]);
    const top = level.parts
      .filter((p) => p.kind === "floor")
      .flatMap((p) => p.triangles)
      .filter(
        (t) => level.mesh.normals[level.mesh.indices[t * 3] * 3 + 2] > 0.99,
      );
    assert.ok(top.length >= 2);
    assert.equal(new Set(top.map((t) => level.mesh.chartIds![t])).size, 1);
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
    const { lightingStateHash, validateLightingManifest } =
      await import("../src/lighting/manifest.ts");
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
