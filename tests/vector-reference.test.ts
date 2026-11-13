import { boxGeometry, rotateXYZ } from "../src/vector/props.ts";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { PerspectiveCamera, Vector3 } from "three";
import {
  ArchitectureBuilder,
  compile,
  parseAml,
  serializeAml,
  validateForRuntime,
  toGLB,
  toOBJ,
  compareReference,
  projectReference,
  referenceViewport,
  pointInMask,
  validateReference,
  collisionMesh,
  generateUVs,
  parseGLBGeometry,
  createGLBAssetResolver,
  type ReferenceView,
  type V3,
} from "levelspec";
import { rayBlocked } from "../src/vector/validate.ts";
function reference(): ReferenceView {
  return {
    id: "photo",
    image: "reference.png",
    width: 1500,
    height: 1000,
    scale: "assumed",
    scaleNote: "Approximate storey height of 3 metres.",
    camera: {
      position: [0, -10, 3],
      target: [0, 0, 3],
      up: [0, 0, 1],
      fov: 60,
      near: 0.05,
      far: 2000,
    },
    landmarks: [],
    masks: [],
  };
}
/** Provides an eight-meter native support floor and an independently authored spawn. */
function fixture() {
  const scene = new ArchitectureBuilder("fixture");
  scene.profile("plan", [
    [0, 0, 0],
    [8, 0, 0],
    [8, 8, 0],
    [0, 8, 0],
  ]);
  const floor = scene.slab("deck", "plan");
  scene.document.markers.push({
    id: "spawn",
    layer: "architecture",
    region: floor.id,
    kind: "attacker_spawn",
    position: [1, 1, 0],
  });
  return { scene, document: scene.document };
}
/** Reads the JSON chunk from a binary glTF fixture without changing caller bytes. */
function glbJSON(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return JSON.parse(
    new TextDecoder().decode(bytes.slice(20, 20 + view.getUint32(12, true))),
  );
}
/** Returns a malformed-data fixture with an edited JSON chunk and unchanged binary geometry. */
function withGLBJSON(bytes: Uint8Array, mutate: (json: any) => void) {
  const result = bytes.slice(),
    view = new DataView(result.buffer, result.byteOffset, result.byteLength),
    length = view.getUint32(12, true),
    json = glbJSON(result);
  mutate(json);
  const encoded = new TextEncoder().encode(JSON.stringify(json));
  assert.ok(encoded.length <= length);
  result.fill(0x20, 20, 20 + length);
  result.set(encoded, 20);
  return result;
}
describe("reference views", () => {
  it("round trips cameras, normalized landmarks, masks and assumption provenance", () => {
    const { document } = fixture(),
      r = reference();
    r.landmarks = [
      { id: "roof-corner", position: [0, 0, 3], image: [0.5, 0.5] },
    ];
    r.masks = [
      {
        id: "person",
        points: [
          [0.6, 0.3],
          [0.9, 0.3],
          [0.9, 1],
          [0.6, 1],
        ],
      },
    ];
    document.references = [r];
    const xml = serializeAml(document),
      round = serializeAml(parseAml(xml));
    assert.equal(serializeAml(parseAml(round)), round);
    assert.equal(parseAml(xml).references![0].camera.fov, 60);
  });
  it("matches Three.js projection for tilted, rolled and non-square views", () => {
    const r = reference();
    r.camera = {
      ...r.camera,
      position: [4, -10, 9],
      target: [2, 3, 4],
      up: [0.15, 0.2, 1],
      fov: 53,
    };
    const c = new PerspectiveCamera(
      r.camera.fov,
      r.width / r.height,
      r.camera.near,
      r.camera.far,
    );
    c.up.fromArray(r.camera.up);
    c.position.fromArray(r.camera.position);
    c.lookAt(...r.camera.target);
    c.updateMatrixWorld();
    for (let i = 0; i < 30; i++) {
      const p: V3 = [Math.sin(i) * 5, Math.cos(i) * 4, 1 + i / 10],
        actual = projectReference(r, p).image!;
      const expected = new Vector3(...p).project(c);
      assert.ok(Math.abs(actual[0] - (expected.x + 1) / 2) < 1e-12);
      assert.ok(Math.abs(actual[1] - (1 - expected.y) / 2) < 1e-12);
    }
  });
  it("preserves calibrated camera precision through raw XML, saving and compilation", async () => {
    const { document } = fixture(),
      r = reference();
    r.camera = {
      position: [4.123456789, -10.234567891, 9.345678912],
      target: [2.456789123, 3.567891234, 4.678912345],
      up: [0.153456789, 0.203456789, 1],
      fov: 53.123456789,
      near: 0.051234567,
      far: 2000.123456789,
    };
    r.landmarks = [
      {
        id: "survey",
        position: [1.23456, 2.34567, 3.45678],
        image: [0.45, 0.55],
      },
    ];
    r.masks = [
      {
        id: "occluder",
        points: [
          [0.8, 0.8],
          [0.9, 0.8],
          [0.9, 0.9],
        ],
      },
    ];
    document.profiles[0].outer.points![0][0] = 0.123456789;
    document.references = [r];
    const before = structuredClone(document),
      xml = serializeAml(document);
    // Inject the original pose into XML independently of the serializer under test.
    const raw = xml
      .replace(/<reference [^>]*>/, (tag) =>
        tag
          .replace(
            /position="[^"]*"/,
            `position="${r.camera.position.join(" ")}"`,
          )
          .replace(/target="[^"]*"/, `target="${r.camera.target.join(" ")}"`),
      )
      .replace('x="0.123"', 'x="0.123456789"')
      .replace(
        'position="1.235 2.346 3.457"',
        'position="1.23456 2.34567 3.45678"',
      );
    assert.match(raw, /position="4.123456789 -10.234567891 9.345678912"/);
    const parsed = parseAml(raw),
      saved = parseAml(xml),
      compiled = await compile(document, { navigation: false });
    assert.deepEqual(compiled.diagnostics, []);
    const camera = new PerspectiveCamera(
      r.camera.fov,
      r.width / r.height,
      r.camera.near,
      r.camera.far,
    );
    camera.up.fromArray(r.camera.up);
    camera.position.fromArray(r.camera.position);
    camera.lookAt(...r.camera.target);
    camera.updateMatrixWorld();
    const points: V3[] = [
      [0, 0, 2],
      [2, 2, 4],
      [5, 4, 6],
      [1, 5, 3],
    ];
    for (const candidate of [parsed, saved, compiled.architecture]) {
      const actual = candidate.references![0];
      assert.deepEqual(actual.camera, r.camera);
      for (const key of [
        "image",
        "width",
        "height",
        "scale",
        "scaleNote",
      ] as const)
        assert.deepEqual(actual[key], r[key]);
      const maskValues = (masks: ReferenceView["masks"]) =>
        masks.map(({ id, label, points }) => ({ id, label, points }));
      assert.deepEqual(maskValues(actual.masks), maskValues(r.masks));
      const normalized = candidate === compiled.architecture;
      assert.deepEqual(
        actual.landmarks[0].position,
        normalized ? [1.235, 2.346, 3.457] : r.landmarks[0].position,
      );
      assert.equal(
        candidate.profiles[0].outer.points![0][0],
        normalized ? 0.123 : 0.123456789,
      );
      for (const point of points) {
        const expected = new Vector3(...point).project(camera),
          projected = projectReference(actual, point);
        assert.ok(projected.inFrame);
        assert.ok(projected.depth > 1);
        assert.ok(
          Math.abs(projected.image![0] - (expected.x + 1) / 2) * r.width < 1e-8,
        );
        assert.ok(
          Math.abs(projected.image![1] - (1 - expected.y) / 2) * r.height <
            1e-8,
        );
      }
    }
    assert.equal(
      serializeAml(parseAml(serializeAml(saved))),
      serializeAml(saved),
    );
    assert.deepEqual(document, before);
    const other = structuredClone(document);
    other.references![0].camera.position[0] += 0.000123456;
    const second = await compile(other, { navigation: false });
    assert.equal(second.geometryHash, compiled.geometryHash);
    assert.deepEqual(second.mesh, compiled.mesh);
  });
  it("keeps legal submillimetre viewing directions distinct after saving and compiling", async () => {
    const { document } = fixture(),
      r = reference();
    r.camera.position = [0, 0, 0];
    r.camera.target = [0, 0.0001, 0];
    document.references = [r];
    assert.deepEqual(validateReference(r), []);
    const saved = parseAml(serializeAml(document)),
      compiled = await compile(document, { navigation: false });
    assert.deepEqual(saved.references![0].camera, r.camera);
    assert.deepEqual(compiled.document.references![0].camera, r.camera);
    assert.deepEqual(compiled.diagnostics, []);
    assert.equal(
      projectReference(saved.references![0], [0, 2, 0]).inFrame,
      true,
    );
    r.camera.target = [0, 1e-10, 0];
    assert.ok(validateReference(r).length);
  });
  it("retains finite and safe-range checks for unsnapped camera coordinates", async () => {
    const limit = (Number.MAX_SAFE_INTEGER - 1) / 1000;
    for (const key of ["position", "target"] as const) {
      for (const value of [
        Number.NaN,
        Infinity,
        -Infinity,
        limit + 1,
        -limit - 1,
        Number.MAX_VALUE,
      ]) {
        const { document } = fixture();
        document.references = [reference()];
        document.references[0].camera[key][0] = value;
        const error = Number.isFinite(value)
          ? /safe millimetre range/
          : /finite/;
        assert.throws(() => parseAml(serializeAml(document)), error);
        await assert.rejects(compile(document, { navigation: false }), error);
      }
      const { document } = fixture();
      document.references = [reference()];
      document.references[0].camera[key][0] = limit - 1;
      const saved = parseAml(serializeAml(document));
      assert.equal(saved.references![0].camera[key][0], limit - 1);
    }
  });
  it("does not report a zero-error fit with no observations or clipped points", () => {
    const r = reference();
    assert.equal(compareReference(r).rmsPixels, null);
    r.landmarks = [{ id: "behind", position: [0, -20, 3], image: [0.5, 0.5] }];
    const behind = compareReference(r);
    assert.equal(behind.clipped, 1);
    assert.equal(behind.rmsPixels, null);
    assert.equal(projectReference(r, [0, -10, 3]).image, null);
    r.landmarks = [
      { id: "offscreen", position: [50, 0, 3], image: [0.5, 0.5] },
    ];
    const offscreen = compareReference(r);
    assert.equal(offscreen.clipped, 1);
    assert.equal(offscreen.compared, 0);
    assert.equal(offscreen.rmsPixels, null);
    assert.equal(projectReference(r, [50, 0, 3]).inFrame, false);
  });
  it("measures pixel alignment and excludes explicitly masked observations", () => {
    const r = reference();
    r.landmarks = [
      { id: "a", position: [0, 0, 3], image: [0.6, 0.5] },
      { id: "b", position: [0, 0, 3], image: [0.5, 0.8] },
    ];
    r.masks = [
      {
        id: "foreground",
        points: [
          [0.4, 0.7],
          [0.6, 0.7],
          [0.6, 0.9],
          [0.4, 0.9],
        ],
      },
    ];
    const result = compareReference(r);
    assert.equal(result.compared, 1);
    assert.equal(result.masked, 1);
    assert.ok(Math.abs(result.rmsPixels! - 150) < 1e-9);
    assert.equal(pointInMask([0.4, 0.8], r.masks[0].points), true);
  });
  it("keeps image and render in the same letterbox", () => {
    assert.deepEqual(referenceViewport(1000, 1000, 1.5), {
      x: 0,
      y: (1000 - 1000 / 1.5) / 2,
      width: 1000,
      height: 1000 / 1.5,
    });
    assert.deepEqual(referenceViewport(1200, 400, 1.5), {
      x: 300,
      y: 0,
      width: 600,
      height: 400,
    });
    assert.throws(() => referenceViewport(0, 100, 1));
  });
  it("rejects malformed cameras, masks and missing scale provenance with source diagnostics", () => {
    for (const mutate of [
      (r: ReferenceView) => {
        r.camera.target = [...r.camera.position];
      },
      (r: ReferenceView) => {
        r.camera.up = [0, 1, 0];
      },
      (r: ReferenceView) => {
        r.camera.fov = 180;
      },
      (r: ReferenceView) => {
        r.camera.near = r.camera.far;
      },
      (r: ReferenceView) => {
        r.width = 1.2;
      },
      (r: ReferenceView) => {
        r.scaleNote = "";
      },
      (r: ReferenceView) => {
        r.masks = [
          {
            id: "bad-mask",
            points: [
              [0, 0],
              [1, 1],
              [0, 1],
              [1, 0],
            ],
          },
        ];
      },
    ]) {
      const r = reference();
      mutate(r);
      assert.ok(validateReference(r).length);
    }
    const { document } = fixture();
    document.references = [reference()];
    assert.throws(
      () => parseAml(serializeAml(document).replace('fov="60"', 'fov="180"')),
      /Invalid camera/,
    );
  });
});

describe("native visualization and physical outputs", () => {
  it("keeps distant scenery out of navigation bounds and gameplay line of sight", async () => {
    const { scene, document } = fixture();
    scene.box("skyline", {
      position: [10000, 10000, 0],
      width: 200,
      depth: 200,
      height: 200,
      collidable: false,
    });
    scene.box("drawing-wall", {
      position: [4, 0, 0],
      width: 0.1,
      depth: 8,
      height: 4,
      collidable: false,
    });
    const level = await compile(document);
    assert.ok(collisionMesh(level).positions.every((n) => Math.abs(n) < 100));
    assert.equal(rayBlocked(level, [1, 4, 1], [7, 4, 1]), false);
    assert.equal(
      (await validateForRuntime(level, { sealed: true })).passed,
      true,
    );
  });
  it("keeps native collision proxies invisible and out of the atlas", async () => {
    const { scene, document } = fixture();
    const box = scene.box("proxy-body", {
      position: [3, 3, 0],
      width: 2,
      depth: 2,
      height: 2,
    });
    scene.compose("collision", "proxy", [box]);
    const level = await compile(document);
    assert.equal(rayBlocked(level, [2, 4, 1], [6, 4, 1]), true);
    const proxy = level.surfaces.find((s) => s.object === "proxy-body")!;
    assert.equal(proxy.visible, false);
    assert.notEqual(proxy.collidable, false);
    const visual = glbJSON(toGLB(level)),
      collision = glbJSON(toGLB(level, { purpose: "collision" }));
    assert.ok(
      !visual.nodes.some((n: any) => n.extras?.object === "proxy-body"),
    );
    assert.ok(
      collision.extras.levelspec.includedSurfaceIndices.some(
        (i: number) => level.surfaces[i].object === "proxy-body",
      ),
    );
    await generateUVs(level, { density: 4, resolution: 128, padding: 2 });
    for (let t = 0; t < level.mesh.surfaces.length; t++)
      if (level.surfaces[level.mesh.surfaces[t]].visible === false)
        assert.equal(level.mesh.atlasPages![t], -1);
  });
  it("invalidates physical and navigation identity when native collision changes", async () => {
    const { scene, document } = fixture();
    const box = scene.box("box", {
      position: [4, 4, 0],
      width: 1,
      depth: 1,
      height: 1,
      collidable: false,
    });
    const before = await compile(document);
    box.collidable = true;
    const after = await compile(document);
    assert.notEqual(before.physicalHash, after.physicalHash);
    assert.notEqual(
      before.navigation!.settings.cacheKey,
      after.navigation!.settings.cacheKey,
    );
  });
  it("loads transformed GLB geometry and only its declared default scene", async () => {
    const { scene, document } = fixture();
    scene.box("crate", {
      position: [3, 4, 0],
      width: 2,
      depth: 1,
      height: 1.5,
      rotation: [0, 0, 20],
    });
    const level = await compile(document, { navigation: false });
    const bytes = toGLB(level),
      geometry = parseGLBGeometry(bytes);
    for (let axis = 0; axis < 3; axis++) {
      const expected = level.mesh.positions.filter((_, i) => i % 3 === axis);
      assert.ok(
        Math.abs(
          Math.min(...geometry.positions.map((p) => p[axis])) -
            Math.min(...expected),
        ) < 1e-5,
      );
      assert.ok(
        Math.abs(
          Math.max(...geometry.positions.map((p) => p[axis])) -
            Math.max(...expected),
        ) < 1e-5,
      );
    }
    assert.throws(
      () =>
        parseGLBGeometry(
          withGLBJSON(bytes, (json) => {
            json.scenes[json.scene ?? 0].nodes = [];
          }),
        ),
      /no triangle mesh geometry/,
    );
    assert.throws(
      () =>
        parseGLBGeometry(
          withGLBJSON(bytes, (json) => {
            json.scene = 9;
          }),
        ),
      /default scene 9/,
    );
    assert.throws(
      () => parseGLBGeometry(new Uint8Array([1, 2, 3])),
      /too small/,
    );
    const host = fixture();
    host.scene.add({ kind: "visual-mesh", id: "drawing", src: "scene.glb" });
    assert.deepEqual(
      (
        await compile(host.document, {
          navigation: false,
          resolveAsset: createGLBAssetResolver(async () => bytes),
        })
      ).diagnostics,
      [],
    );
  });
  it("preserves visualization scaling, validates imported data, and honors cancellation", async () => {
    const { scene, document } = fixture();
    scene.add({
      kind: "visual-mesh",
      id: "drawing",
      src: "x.glb",
      position: [4.44444, 4.55555, 0],
      scale: [1.23456, 2.34567, 3.45678],
    });
    const geometry = boxGeometry(),
      before = structuredClone(geometry);
    const level = await compile(document, {
      navigation: false,
      resolveAsset: async () => geometry,
    });
    assert.deepEqual(geometry, before);
    const drawing = level.architecture.elements.find(
      (e) => e.id === "drawing",
    )!;
    assert.deepEqual(drawing.position, [4.444, 4.556, 0]);
    assert.deepEqual(drawing.scale, [1.23456, 2.34567, 3.45678]);
    const missing = await compile(document, { navigation: false });
    assert.ok(
      missing.diagnostics.some(
        (d) => d.objects.includes("drawing") && d.severity === "error",
      ),
    );
    const bad = await compile(document, {
      navigation: false,
      resolveAsset: async () => ({
        positions: [[0, 0, 0]],
        triangles: [[0, 0, 8]],
      }),
    });
    assert.ok(bad.diagnostics.some((d) => /indices/.test(d.message)));
    const controller = new AbortController();
    await assert.rejects(
      compile(document, {
        signal: controller.signal,
        resolveAsset: async () => {
          controller.abort();
          return geometry;
        },
      }),
      { name: "AbortError" },
    );
  });
});
