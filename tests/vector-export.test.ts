import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  readFile,
  writeFile,
  mkdtemp,
  rm,
  readdir,
  mkdir,
} from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { PNG } from "pngjs";
import { validateBytes, validateString } from "gltf-validator";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Vector3 } from "three";
import {
  compile,
  ArchitectureBuilder,
  toGLB,
  toGLTF,
  resolveExportAssets,
  exportMetadata,
  collisionMesh,
  type V3,
  parseAml,
} from "levelspec";
import { exportLevel } from "../src/export/vector/index.ts";
import { runTool } from "../src/export/vector/process.ts";
import { boxMesh } from "../src/export/vector/box-mesh.ts";
import { solidKernel as geometryKernel } from "../src/architecture/geometry.ts";
import { solidManifold, convexBrushes } from "../src/export/vector/brushes.ts";
import { buildQuakeMap } from "../src/export/vector/bsp.ts";
import { quakeWad } from "../src/export/vector/textures.ts";
/** Independent scalar triple-product volume oracle for closed, oriented triangles. */
function signedVolume(mesh: {
  positions: number[];
  indices: number[];
  normals?: number[];
}): number {
  let sixTimesVolume = 0;
  const p = mesh.positions;
  for (let i = 0; i < mesh.indices.length; i += 3) {
    const a = mesh.indices[i] * 3;
    const b = mesh.indices[i + 1] * 3;
    const c = mesh.indices[i + 2] * 3;
    sixTimesVolume +=
      p[a] * (p[b + 1] * p[c + 2] - p[b + 2] * p[c + 1]) +
      p[a + 1] * (p[b + 2] * p[c] - p[b] * p[c + 2]) +
      p[a + 2] * (p[b] * p[c + 1] - p[b + 1] * p[c]);
  }
  return sixTimesVolume / 6;
}

describe("export box geometry", () => {
  it("has outward normals and the analytic volume of an asymmetric translated box", () => {
    const mesh = boxMesh({ min: [1, 2, 3], max: [4, 7, 5] });
    assert.equal(mesh.indices.length, 36);
    assert.ok(Math.abs(signedVolume(mesh) - 30) < 1e-9);
    for (let i = 0; i < mesh.indices.length; i += 3) {
      const [a, b, c] = mesh.indices
        .slice(i, i + 3)
        .map((index) => mesh.positions.slice(index * 3, index * 3 + 3));
      const u = b.map((value, axis) => value - a[axis]);
      const v = c.map((value, axis) => value - a[axis]);
      const cross = [
        u[1] * v[2] - u[2] * v[1],
        u[2] * v[0] - u[0] * v[2],
        u[0] * v[1] - u[1] * v[0],
      ];
      const centroid = a.map((value, axis) => (value + b[axis] + c[axis]) / 3);
      const fromCenter = centroid.map(
        (value, axis) => value - [2.5, 4.5, 4][axis],
      );
      assert.ok(
        cross.reduce((sum, value, axis) => sum + value * fromCenter[axis], 0) >
          0,
      );
      for (const index of mesh.indices.slice(i, i + 3)) {
        const normal = mesh.normals.slice(index * 3, index * 3 + 3);
        assert.ok(
          cross.reduce((sum, value, axis) => sum + value * normal[axis], 0) > 0,
        );
      }
    }
    const reversed = mesh.indices.flatMap((_, i, indices) =>
      i % 3 === 0 ? [indices[i + 2], indices[i + 1], indices[i]] : [],
    );
    assert.ok(
      Math.abs(
        signedVolume({ positions: mesh.positions, indices: reversed }) + 30,
      ) < 1e-9,
    );
  });
});

function fixture() {
  const builder = new ArchitectureBuilder("export-room"),
    d = builder.document;
  builder.profile("plan", [
    [0, 0, 1],
    [6, 0, 1],
    [6, 4, 1],
    [0, 4, 1],
  ]);
  builder.slab("floor", "plan", { group: "ground", material: "paint" });
  const corners: V3[] = [
    [0, 0, 1],
    [6, 0, 1],
    [6, 4, 1],
    [0, 4, 1],
  ];
  for (let i = 0; i < 4; i++) {
    builder.path(`wall-path-${i}`, [corners[i], corners[(i + 1) % 4]]);
    builder.wall(`e${i}`, `wall-path-${i}`, {
      material: "paint",
      group: "ground",
    });
  }
  builder.assembly("room", [...d.elements]);
  d.materials = [
    {
      id: "paint",
      color: "#7f9faf",
      repeat: 2,
      roughness: 0.6,
      metalness: 0.2,
    },
  ];
  d.markers = [
    {
      id: "spawn",
      kind: "attacker_spawn",
      layer: "ground",
      region: "floor",
      position: [2, 1, 1],
    },
  ];
  return d;
}
function glbJSON(bytes: Uint8Array) {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return JSON.parse(
    new TextDecoder().decode(bytes.slice(20, 20 + v.getUint32(12, true))),
  );
}
const palette = Uint8Array.from({ length: 768 }, (_, i) => Math.floor(i / 3));
function pngBytes() {
  const image = new PNG({ width: 2, height: 2 });
  image.data.set([
    255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 255, 255,
  ]);
  return PNG.sync.write(image);
}

describe("portable vector exports", () => {
  it("validates GLB and external glTF, shares geometry, preserves both UV channels and metadata", async () => {
    const d = fixture();
    d.materials[0].texture = "images/a.png";
    d.materials.push({
      ...d.materials[0],
      id: "other",
      texture: "other/a.png",
    });
    d.materials.push({ ...d.materials[0], id: "unused", texture: "unused.png" });
    const room = d.elements[0];
    assert.ok("children" in room);
    room.coincidentMaterial = "retained-face";
    const secondFinish = room.children.find(element => element.id === "e0");
    assert.ok(secondFinish?.kind === "wall");
    secondFinish.material = "other";
    const level = await compile(d, {
      navigation: false,
      uvs: true,
      uv: { resolution: 128, density: 2 },
    });
    const unused = PNG.sync.read(pngBytes());
    unused.data[0] = 17;
    const assets = await resolveExportAssets(level, async reference =>
      reference === "unused.png" ? PNG.sync.write(unused) : pngBytes());
    assets["images/a.png"].file = "textures/first-alias.png";
    assets["other/a.png"].file = "textures/second-alias.png";
    const binary = toGLB(level, { assets }),
      bundle = toGLTF(level, { assets });
    const json = glbJSON(binary),
      external = JSON.parse(bundle["export-room.gltf"] as string);
    assert.equal(
      (await validateBytes(binary, { maxIssues: 100 })).issues.numErrors,
      0,
    );
    const validation = await validateString(
      bundle["export-room.gltf"] as string,
      {
        externalResourceFunction: async (uri: string) =>
          bundle[decodeURIComponent(uri)] as Uint8Array,
      },
    );
    assert.equal(
      validation.issues.numErrors,
      0,
      JSON.stringify(validation.issues),
    );
    assert.deepEqual(json.meshes, external.meshes);
    const attributes = json.meshes[0].primitives[0].attributes;
    const binStart = 28 + new DataView(binary.buffer).getUint32(12, true);
    for (const [name, values] of Object.entries({
      POSITION: level.mesh.positions,
      NORMAL: level.mesh.normals,
      TEXCOORD_0: level.mesh.uv.map((v, i) => (i % 2 ? 1 - v : v)),
      TEXCOORD_1: level.mesh.uv1!.map((v, i) => (i % 2 ? 1 - v : v)),
      TANGENT: level.mesh.tangents!,
    })) {
      const acc = json.accessors[attributes[name]],
        view = json.bufferViews[acc.bufferView];
      const actual = new Float32Array(
        binary.buffer,
        binStart + view.byteOffset,
        values.length,
      );
      assert.deepEqual(
        Array.from(actual),
        values.map(Math.fround),
        `${name} preserves every component with the declared convention conversion`,
      );
    }
    assert.deepEqual(json.materials.map((material: { name: string }) => material.name).sort(), ["other", "paint"]);
    const boundMaterials = new Set(json.meshes.flatMap((mesh: { primitives: { material: number }[] }) =>
      mesh.primitives.map(primitive => json.materials[primitive.material].name)));
    assert.deepEqual([...boundMaterials].sort(), ["other", "paint"], "Both aliases must be used to prove image sharing");
    assert.equal(json.materials[0].pbrMetallicRoughness.baseColorTexture.index,
      json.materials[1].pbrMetallicRoughness.baseColorTexture.index, "Used aliases duplicated the same image content");
    assert.equal(json.images.length, 1, "The export retained a unique image from an unused material");
    assert.equal(bundle[assets["unused.png"].file], undefined, "External glTF bundled an unused companion");
    assert.equal(
      Object.keys(bundle).filter((k) => k.startsWith("textures/")).length,
      1,
    );
    assert.ok(
      json.meshes.every(
        (m: any) => m.primitives[0].attributes.TEXCOORD_1 !== undefined,
      ),
    );
    assert.ok(
      json.meshes.every(
        (m: any) => m.primitives[0].attributes.TANGENT !== undefined,
      ),
    );
    assert.equal(json.extras.lightingManifest, undefined);
    assert.deepEqual(
      json.nodes.find((n: any) => n.name === "spawn").translation,
      [2, 1, 1],
    );
    assert.deepEqual(
      exportMetadata(level, ["glb"]).markers,
      level.document.markers,
    );
    const directory = await mkdtemp(join(tmpdir(), "levelspec-texture-report-"));
    try {
      const output = join(directory, "bundle");
      await exportLevel(level, { formats: ["glb", "gltf"], output, assets });
      const report = JSON.parse(await readFile(join(output, "export-room.export.json"), "utf8"));
      const written = JSON.parse(await readFile(join(output, "export-room.gltf"), "utf8"));
      assert.equal(written.images.length, 1);
      const emittedImage = written.images[0].uri;
      assert.deepEqual(await readFile(join(output, emittedImage)), Buffer.from(assets["images/a.png"].bytes));
      for (const reference of ["images/a.png", "other/a.png"]) {
        assert.equal(report.textures[reference].sourceSha256, assets[reference].hash);
        assert.equal(report.textures[reference].embeddedInGLB, true);
        assert.equal(report.textures[reference].gltfFile, emittedImage,
          "Same-content aliases must report the image filename actually emitted by glTF");
      }
      assert.deepEqual([assets["images/a.png"].file, assets["other/a.png"].file],
        ["textures/first-alias.png", "textures/second-alias.png"], "Export mutated caller-owned alias filenames");
      assert.equal(report.textures["unused.png"].embeddedInGLB, false, "Report claims an omitted image is embedded");
      assert.equal(report.textures["unused.png"].gltfFile, undefined, "Report points to an omitted glTF companion");
      assert.equal((await readdir(join(output, "textures"))).length, 1);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
  it("selects visual and collision materials without losing the explicit default fallback", async () => {
    for (const authoredDefault of [false, true]) {
      const level = await compile(parseAml(`<architecture version="1" id="material-selection" validation="premap">
        <material id="visual" color="#cc5533"/><material id="proxy" color="#33aa66"/><material id="shared" color="#4477bb"/>
        <material id="unused" texture="unused.png" normal-texture="unused.png"/>
        ${authoredDefault ? '<material id="default" color="#808080" roughness="0.37"/>' : ''}
        <box id="visual-only" width="1" depth="1" height="1" material="visual" collidable="false"/>
        <box id="physical-only" position="2 0 0" width="1" depth="1" height="1" material="proxy" visible="false"/>
        <box id="shared-box" position="4 0 0" width="1" depth="1" height="1" material="shared"/>
        <box id="fallback-box" position="6 0 0" width="1" depth="1" height="1"/>
      </architecture>`), { navigation: false });
      assert.ok(!level.diagnostics.some(diagnostic => diagnostic.severity === "error"));
      for (const surface of level.surfaces) if (surface.object === "fallback-box") surface.material = "unknown-runtime-finish";
      const original = structuredClone({ mesh: level.mesh, surfaces: level.surfaces, materials: level.document.materials });
      assert.throws(() => toGLB(level), /unused\.png/, "Filtering output must not suppress declared-companion validation");
      const assets = await resolveExportAssets(level, async () => pngBytes());
      for (const purpose of ["visual", "collision"] as const) {
        const bytes = toGLB(level, { purpose, assets }), json = glbJSON(bytes);
        const bundle = toGLTF(level, { purpose, assets });
        const external = JSON.parse(bundle["material-selection.gltf"] as string);
        const expected = purpose === "visual" ? ["default", "shared", "visual"] : ["default", "proxy", "shared"];
        assert.deepEqual(json.materials.map((material: { name: string }) => material.name).sort(), expected);
        assert.deepEqual(json.materials, external.materials);
        assert.equal(json.images, undefined, "Selected untextured geometry retained an unused image");
        assert.equal(Object.keys(bundle).filter(name => name.startsWith("textures/")).length, 0);
        const bound = new Map(json.nodes.filter((node: { mesh?: number }) => node.mesh !== undefined).map((node: any) => {
          const primitive = json.meshes[node.mesh].primitives[0];
          return [node.extras.objectId, json.materials[primitive.material].name];
        }));
        assert.equal(bound.get("fallback-box"), "default", "Unknown surface material fell through to an unrelated active finish");
        assert.equal(bound.get("shared-box"), "shared");
        assert.equal(bound.get(purpose === "visual" ? "visual-only" : "physical-only"), purpose === "visual" ? "visual" : "proxy");
        assert.equal(bound.has(purpose === "visual" ? "physical-only" : "visual-only"), false);
        const fallback = json.materials.find((material: { name: string }) => material.name === "default");
        assert.equal(fallback.pbrMetallicRoughness.roughnessFactor, authoredDefault ? .37 : .8);
        if (authoredDefault) assert.ok(fallback.pbrMetallicRoughness.baseColorFactor.slice(0, 3)
          .every((value: number) => Math.abs(value - .21586050011389926) < 1e-12));
        assert.equal((await validateBytes(bytes)).issues.numErrors, 0);
        assert.equal((await validateString(bundle["material-selection.gltf"] as string, {
          externalResourceFunction: async (uri: string) => bundle[uri] as Uint8Array,
        })).issues.numErrors, 0);
      }
      assert.deepEqual({ mesh: level.mesh, surfaces: level.surfaces, materials: level.document.materials }, original,
        "Material selection mutated the compiled input");
    }
  });
  it("loads through Three.js with the exact asymmetric bounds and marker conversion", async () => {
    const level = await compile(fixture(), { navigation: false });
    const bytes = toGLB(level),
      loaded = await new GLTFLoader().parseAsync(
        Uint8Array.from(bytes).buffer,
        "",
      );
    loaded.scene.updateMatrixWorld(true);
    const marker = loaded.scene.getObjectByName("spawn")!,
      p = marker.getWorldPosition(new Vector3());
    assert.ok(p.distanceTo(new Vector3(2, 1, -1)) < 1e-6);
    let triangles = 0;
    loaded.scene.traverse((o: any) => {
      if (o.isMesh) {
        triangles += o.geometry.index.count / 3;
        assert.ok(o.geometry.getAttribute("normal"));
        assert.ok(o.geometry.getAttribute("uv"));
      }
    });
    assert.equal(triangles, level.mesh.indices.length / 3);
    const root = loaded.scene.getObjectByName(level.document.id)!;
    assert.deepEqual(root.userData.geometryHash, level.geometryHash);
  });
  it("fails on missing/unsupported textures and unsafe bundle filenames", async () => {
    const d = fixture();
    d.materials[0].texture = "missing.png";
    const level = await compile(d, { navigation: false });
    assert.throws(() => toGLB(level), /unresolved texture/);
    await assert.rejects(
      resolveExportAssets(level, async () => new Uint8Array([1, 2, 3])),
      /PNG or JPEG/,
    );
    await assert.rejects(
      resolveExportAssets(level, async () => {
        throw new Error("missing");
      }),
      /paint.*missing.png/,
    );
    const tmp = await mkdtemp(join(tmpdir(), "levelspec-export-test-"));
    try {
      await assert.rejects(
        exportLevel(await compile(fixture(), { navigation: false }), {
          formats: ["glb"],
          output: join(tmp, "out"),
          additionalFiles: { "../escape": "bad" },
        }),
        /Unsafe/,
      );
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });
  it("cancels and times out native processes without leaving them running", async () => {
    const abort = new AbortController();
    await assert.rejects(
      runTool(
        process.execPath,
        ["-e", "console.log('ready'); setInterval(()=>{},1000)"],
        { signal: abort.signal, onProgress: () => abort.abort() },
      ),
    );
    await assert.rejects(
      runTool(process.execPath, ["-e", "setInterval(()=>{},1000)"], {
        timeoutMs: 20,
      }),
      /timed out/,
    );
  });
  it("leaves existing files intact after native failure and cancellation", async () => {
    const tmp = await mkdtemp(join(tmpdir(), "levelspec-export-test-")),
      level = await compile(fixture(), { navigation: false });
    try {
      await writeFile(join(tmp, "export-room.glb"), "previous");
      await writeFile(join(tmp, "unrelated"), "keep");
      await assert.rejects(
        exportLevel(level, {
          formats: ["glb", "fbx"],
          output: tmp,
          blender: join(tmp, "missing-blender"),
        }),
        /Cannot run/,
      );
      assert.equal(
        await readFile(join(tmp, "export-room.glb"), "utf8"),
        "previous",
      );
      const abort = new AbortController();
      await assert.rejects(
        exportLevel(level, {
          formats: ["glb"],
          output: tmp,
          signal: abort.signal,
          onProgress: () => abort.abort(),
        }),
      );
      assert.equal(
        await readFile(join(tmp, "export-room.glb"), "utf8"),
        "previous",
      );
      assert.equal(await readFile(join(tmp, "unrelated"), "utf8"), "keep");
      await mkdir(join(tmp, "export-room.gltf"));
      await writeFile(
        join(tmp, "export-room.gltf", "keep"),
        "directory content",
      );
      await assert.rejects(
        exportLevel(level, { formats: ["glb", "gltf"], output: tmp }),
        /replace a directory/,
      );
      assert.equal(
        await readFile(join(tmp, "export-room.glb"), "utf8"),
        "previous",
      );
      assert.equal(
        await readFile(join(tmp, "export-room.gltf", "keep"), "utf8"),
        "directory content",
      );
      await rm(join(tmp, "export-room.gltf"), { recursive: true });
      await exportLevel(level, { formats: ["glb", "gltf"], output: tmp });
      assert.equal(
        glbJSON(await readFile(join(tmp, "export-room.glb"))).asset.version,
        "2.0",
      );
      assert.equal(
        (await readdir(tmp)).includes(".levelspec-export.lock"),
        false,
      );
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });
});

describe("Quake brush export", () => {
  it("preserves a native top-face material independently from the slab side material", async () => {
    const document =
      parseAml(`<architecture version="1" id="painted-box" validation="premap">
      <material id="base" color="#888888"/><material id="accent" color="#ff0000"/>
      <profile id="plan" points="0 0; 6 0; 6 4; 0 4"/>
      <slab id="body" group="ground" profile="plan" elevation="1" thickness="0.2" material="base"/>
      <face-material id="top-paint" host="body" face="top" material="accent"/>
      <marker id="spawn" group="ground" element="body" kind="attacker_spawn" position="2 1 1"/>
    </architecture>`);
    const level = await compile(document, {
      navigation: false,
      retainExportSolids: true,
    });
    assert.deepEqual(
      level.diagnostics.filter((diagnostic) => diagnostic.severity === "error"),
      [],
    );
    const { mappings } = quakeWad(level, {}, palette);
    const map = await buildQuakeMap(level, mappings, "painted-box");
    const topPlanes = map.text.split("\n").filter((line) => {
      const points = [...line.matchAll(/\( ([^)]+) \)/g)].map((match) =>
        match[1].trim().split(/\s+/).map(Number),
      );
      return (
        points.length === 3 &&
        points.every((point) => Math.abs(point[2] - 32) < 1e-6)
      );
    });
    assert.ok(
      topPlanes.length,
      "The authored slab has an exposed top plane at 1 metre",
    );
    for (const plane of topPlanes)
      assert.ok(
        plane.includes(` ${mappings.accent.name} `),
        "Every exposed top plane retains the authored accent",
      );
    assert.ok(
      map.text.includes(` ${mappings.base.name} `),
      "Side planes retain their independent base material",
    );
  });
  it("retains identical runtime geometry while exposing closed solids", async () => {
    const d = fixture(),
      plain = await compile(d, { navigation: false }),
      retained = await compile(d, {
        navigation: false,
        retainExportSolids: true,
      });
    assert.equal(plain.geometryHash, retained.geometryHash);
    assert.deepEqual(plain.mesh, retained.mesh);
    const K = await geometryKernel();
    for (const source of retained.exportSolids!) {
      const manifold = solidManifold(K, source);
      try {
        const brushes = convexBrushes(K, source);
        assert.ok(brushes.length);
        assert.ok(
          Math.abs(
            brushes.reduce((s, b) => s + b.volume, 0) - manifold.volume(),
          ) < 1e-5,
        );
      } finally {
        manifold.delete();
      }
    }
  });
  it("retained closed solids agree with final native physical volume and exposed faces", async () => {
    const K = await geometryKernel();
    for (const file of ["tests/fixtures/aml/showcase.aml", "examples/dust2.aml"]) {
      const level = await compile(parseAml(await readFile(file, "utf8")), {
          navigation: false,
          retainExportSolids: true,
        }),
        physical = collisionMesh(level, true);
      const solids = level
        .exportSolids!.filter(
          (source) =>
            source.purpose === "physical" &&
            source.surface.collidable !== false,
        )
        .map((source) => solidManifold(K, source));
      try {
        assert.ok(solids.length, `${file}: no retained physical solids`);
        const expected = signedVolume(physical),
          actual = solids.reduce((sum, solid) => sum + solid.volume(), 0),
          area = solids.reduce((sum, solid) => sum + solid.surfaceArea(), 0);
        assert.ok(
          Math.abs(actual - expected) < Math.max(1e-6, area * 0.0001),
          `${file}: retained ${actual} vs physical ${expected}`,
        );
        for (
          let t = 0;
          t < physical.surfaces.length;
          t += Math.max(1, Math.floor(physical.surfaces.length / 100))
        ) {
          const ids = physical.indices.slice(t * 3, t * 3 + 3),
            center = [0, 1, 2].map((axis) =>
              ids.reduce(
                (sum, id) => sum + physical.positions[id * 3 + axis] / 3,
                0,
              ),
            );
          const normal = physical.normals.slice(ids[0] * 3, ids[0] * 3 + 3),
            start = center.map((v, i) => v - normal[i] * 0.001) as V3,
            end = center.map((v, i) => v + normal[i] * 0.001) as V3;
          assert.ok(
            solids.some((solid) => solid.rayCast(start, end).length),
            `${file}: final face ${t} diverges from retained solids`,
          );
        }
      } finally {
        solids.forEach((solid) => solid.delete());
      }
    }
  });
  it("generates BSP source for curved walls, stairs, ramps and stacked floors with valid projections", async () => {
    const level = await compile(
      parseAml(await readFile("tests/fixtures/aml/showcase.aml", "utf8")),
      { navigation: false, retainExportSolids: true },
    );
    const wad = quakeWad(level, {}, palette),
      map = await buildQuakeMap(level, wad.mappings, "showcase");
    assert.equal(wad.bytes.toString("ascii", 0, 4), "WAD2");
    assert.ok(map.report.brushes > 100);
    assert.match(map.text, /info_player_start/);
    assert.match(map.text, /sky_ls/);
    assert.equal(map.report.enclosure.marginMetres, 8);
    for (const line of map.text.split("\n").filter((l) => l.startsWith("( "))) {
      const axes = [...line.matchAll(/\[ ([^\]]+) \]/g)].map((m) =>
        m[1].trim().split(/\s+/).map(Number),
      );
      assert.equal(axes.length, 2);
      assert.ok(axes.flat().every(Number.isFinite));
      const [a, b] = axes;
      const cross = [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
      ];
      assert.ok(
        Math.hypot(...cross) > 1e-8,
        "texture projection must be nonsingular",
      );
    }
  });
  it("preserves visual-only and collision-only prop semantics in BSP source", async () => {
    const d = fixture();
    d.elements.push(
      {
        kind: "box",
        id: "crate",
        position: [5, 3, 1],
        width: 0.6,
        depth: 0.6,
        height: 0.8,
        radius: 0.5,
        topRadius: 0,
        material: "paint",
        visible: false,
        dynamic: true,
      },
      {
        kind: "box",
        id: "ghost",
        position: [4, 3, 1],
        width: 0.5,
        depth: 0.5,
        height: 0.5,
        radius: 0.5,
        topRadius: 0,
        material: "paint",
        collidable: false,
      },
    );
    const level = await compile(d, {
        navigation: false,
        retainExportSolids: true,
      }),
      wad = quakeWad(level, {}, palette),
      map = await buildQuakeMap(level, wad.mappings, "props");
    assert.deepEqual(level.diagnostics, []);
    assert.match(map.text, /"classname" "func_detail_illusionary"/);
    assert.match(map.text, /\sskip\s/);
    assert.match(map.text, /"targetname" "crate"/);
    assert.match(map.text, /"targetname" "ghost"/);
  });

  it("fails BSP export instead of dropping an open visual-only imported mesh", async () => {
    const d = fixture();
    d.elements.push({
      kind: "visual-mesh",
      id: "open-visual",
      src: "open.glb",
      position: [4, 2, 1.1],
      material: "paint",
    });
    const level = await compile(d, {
      navigation: false,
      retainExportSolids: true,
      resolveAsset: async () => ({
        positions: [
          [0, 0, 0],
          [1, 0, 0],
          [0, 1, 0],
        ],
        triangles: [[0, 1, 2]],
      }),
    });
    assert.deepEqual(level.diagnostics, []);
    const { mappings } = quakeWad(level, {}, palette);
    await assert.rejects(
      buildQuakeMap(level, mappings, "open"),
      /open-visual:.*cannot be exported as BSP brushes/i,
    );
  });

  it("rejects missing spawns, blocked Quake hulls, missing solids and invalid palettes", async () => {
    const d = fixture(),
      level = await compile(d, { navigation: false, retainExportSolids: true });
    const { mappings } = quakeWad(level, {}, palette);
    level.document.markers = [];
    await assert.rejects(buildQuakeMap(level, mappings, "x"), /spawn marker/);
    level.document.markers = [
      { id: "bad", kind: "spawn", position: [0.3, 0.3, 1], layer: "ground" },
    ];
    await assert.rejects(
      buildQuakeMap(level, mappings, "x"),
      /hull is blocked/,
    );
    delete level.exportSolids;
    await assert.rejects(
      buildQuakeMap(level, mappings, "x"),
      /retainExportSolids/,
    );
    assert.throws(() => quakeWad(level, {}, new Uint8Array(12)), /768/);
  });
  it(
    "compiles a real BSP2 with populated collision, visibility and light lumps",
    {
      skip:
        !process.env.QBSP_PATH ||
        !process.env.LIGHT_PATH ||
        !process.env.VIS_PATH,
    },
    async () => {
      const temp = await mkdtemp(join(tmpdir(), "levelspec-bsp-test-"));
      try {
        const paletteFile = join(temp, "palette.lmp");
        await writeFile(paletteFile, palette);
        const level = await compile(fixture(), {
          navigation: false,
          retainExportSolids: true,
        });
        const result = await exportLevel(level, {
          formats: ["bsp"],
          output: join(temp, "out"),
          quakePalette: paletteFile,
        });
        const bytes = await readFile(join(result.output, "export-room.bsp"));
        assert.equal(bytes.toString("ascii", 0, 4), "BSP2");
        for (const lump of [4, 8, 9])
          assert.ok(bytes.readInt32LE(8 + lump * 8) > 0);
        const planes = bytes.readInt32LE(4 + 1 * 8),
          clips = bytes.readInt32LE(4 + 9 * 8),
          models = bytes.readInt32LE(4 + 14 * 8);
        const content = (p: number[]) => {
          let index = bytes.readInt32LE(models + 40),
            guard = 0;
          while (index >= 0) {
            assert.ok(++guard < 10000);
            const node = clips + index * 12,
              plane = planes + bytes.readInt32LE(node) * 20;
            const distance =
              p.reduce(
                (sum, v, k) => sum + v * bytes.readFloatLE(plane + k * 4),
                0,
              ) - bytes.readFloatLE(plane + 12);
            index = bytes.readInt32LE(node + (distance >= 0 ? 4 : 8));
          }
          return index;
        };
        assert.equal(content([64, 32, 57]), -1);
        assert.equal(content([0, 32, 57]), -2);
        const log = await readFile(
          join(result.output, "export-room.qbsp.log"),
          "utf8",
        );
        assert.doesNotMatch(
          log,
          /repairing invalid texture|LEAK|no entities in empty space.*hull [01]/i,
        );
      } finally {
        await rm(temp, { recursive: true, force: true });
      }
    },
  );
});
