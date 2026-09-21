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
  createDocument,
  toGLB,
  toGLTF,
  resolveExportAssets,
  exportMetadata,
  parseLevelSvgx,
} from "../src/vector/index.ts";
import { exportLevel } from "../src/export/vector/index.ts";
import { runTool } from "../src/export/vector/process.ts";
import { signedVolume } from "../src/core/mesh.ts";
import { geometryKernel } from "../src/vector/compiler.ts";
import { solidManifold, convexBrushes } from "../src/export/vector/brushes.ts";
import { buildQuakeMap } from "../src/export/vector/bsp.ts";
import { quakeWad } from "../src/export/vector/textures.ts";
function fixture() {
  const d = createDocument("export-room");
  d.layers = [
    {
      id: "ground",
      vertices: [
        [0, 0],
        [6, 0],
        [6, 4],
        [0, 4],
      ].map(([x, y], i) => ({ id: `v${i}`, x, y, z: 1 })),
      edges: [0, 1, 2, 3].map((i) => ({
        id: `e${i}`,
        from: `v${i}`,
        to: `v${(i + 1) % 4}`,
        kind: "wall",
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
          material: "paint",
        },
      ],
    },
  ];
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
    const level = await compile(d, {
      navigation: false,
      uvs: true,
      uv: { resolution: 128, density: 2 },
    });
    const assets = await resolveExportAssets(level, async () => pngBytes());
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
      TANGENT: level.mesh.tangents!.map((v, i) => (i % 4 === 3 ? -v : v)),
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
    assert.equal(json.images.length, 1);
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
  it("retained brush solids match final mesh-part volumes on showcase and Dust II", async () => {
    const K = await geometryKernel();
    for (const file of [
      "examples/showcase.level.svgx",
      "examples/dust2.level.svgx",
    ]) {
      const level = await compile(
        parseLevelSvgx(await readFile(file, "utf8")),
        { navigation: false, retainExportSolids: true },
      );
      for (const part of level.parts) {
        const inputs = level
          .exportSolids!.filter((s) => s.surface.mesh === part.id)
          .map((s) => solidManifold(K, s));
        const union = K.Manifold.union(inputs);
        try {
          const volume = signedVolume({
            positions: level.mesh.positions,
            indices: part.triangles.flatMap((t) =>
              level.mesh.indices.slice(t * 3, t * 3 + 3),
            ),
            normals: [],
          });
          // The render compiler simplifies shell surfaces by up to 0.1 mm.
          assert.ok(
            Math.abs(union.volume() - volume) <
              Math.max(1e-6, union.surfaceArea() * 0.0001),
            `${file}: ${part.id} changed volume`,
          );
          for (
            let i = 0;
            i < part.triangles.length;
            i += Math.max(1, Math.floor(part.triangles.length / 100))
          ) {
            const t = part.triangles[i],
              ids = level.mesh.indices.slice(t * 3, t * 3 + 3);
            const center = [0, 1, 2].map((axis) =>
              ids.reduce(
                (sum, v) => sum + level.mesh.positions[v * 3 + axis] / 3,
                0,
              ),
            );
            const normal = level.mesh.normals.slice(ids[0] * 3, ids[0] * 3 + 3);
            const start = center.map((v, k) => v - normal[k] * 0.001) as [
                number,
                number,
                number,
              ],
              end = center.map((v, k) => v + normal[k] * 0.001) as [
                number,
                number,
                number,
              ];
            assert.ok(
              union.rayCast(start, end).length,
              `${file}: ${part.id} triangle ${t} diverged from retained solid`,
            );
          }
        } finally {
          union.delete();
          inputs.forEach((s) => s.delete());
        }
      }
    }
  });
  it("generates BSP source for curved walls, stairs, ramps and stacked floors with valid projections", async () => {
    const level = await compile(
      parseLevelSvgx(await readFile("examples/showcase.level.svgx", "utf8")),
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
    d.props = [
      {
        id: "crate",
        layer: "ground",
        shape: "box",
        position: [5, 3, 1],
        rotation: [0, 0, 0],
        scale: [0.6, 0.6, 0.8],
        material: "paint",
        collision: "box",
      },
      {
        id: "ghost",
        layer: "ground",
        shape: "box",
        position: [4, 3, 1],
        rotation: [0, 0, 0],
        scale: [0.5, 0.5, 0.5],
        material: "paint",
        collision: "none",
      },
    ];
    const level = await compile(d, { navigation: false, retainExportSolids: true }),
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
    d.assets = [{ id: "open-mesh", src: "open.glb" }];
    d.props = [{
      id: "open-visual",
      layer: "ground",
      shape: "asset",
      asset: "open-mesh",
      position: [4, 2, 1],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      material: "paint",
      collision: "none",
    }];
    const level = await compile(d, {
      navigation: false,
      retainExportSolids: true,
      resolveAsset: async () => ({
        positions: [[0, 0, 0], [1, 0, 0], [0, 1, 0]],
        triangles: [[0, 1, 2]],
      }),
    });
    assert.deepEqual(level.diagnostics, []);
    const { mappings } = quakeWad(level, {}, palette);
    await assert.rejects(
      buildQuakeMap(level, mappings, "open"),
      /open-visual: invalid export solid/,
    );
  });

  it("rejects missing spawns, blocked Quake hulls, missing solids and invalid palettes", async () => {
    const d = fixture(),
      level = await compile(d, { navigation: false, retainExportSolids: true });
    const { mappings } = quakeWad(level, {}, palette);
    level.document.markers = [];
    await assert.rejects(buildQuakeMap(level, mappings, "x"), /spawn marker/);
    level.document.markers = [
      { id: "bad", kind: "spawn", position: [0.1, 0.1, 1], layer: "ground" },
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
