import { test } from "node:test";
import assert from "node:assert/strict";
import { PNG } from "pngjs";
import { validateBytes, validateString } from "gltf-validator";
import {
  parseAml,
  serializeAml,
  compile,
  architectureCompanions,
  resolveExportAssets,
  toGLB,
  toGLTF,
  toOBJ,
} from "levelspec";
import { exportLevel } from "levelspec/export";
import { buildQuakeMap } from "../src/export/vector/bsp.ts";

const source = `<architecture version="1" id="normal-material" validation="premap">
  <material id="rough" color="#aaaaaa" normal-texture="surface-normal.png" normal-scale="1.7"/>
  <profile id="plan" points="0 0; 2 0; 2 2; 0 2"/>
  <slab id="floor" profile="plan" material="rough" thickness="0.2"/>
</architecture>`;

/** A known linear tangent-space normal image, independent of any texture generator. */
function normalBytes() {
  const image = new PNG({ width: 2, height: 2 });
  for (let i = 0; i < 4; i++) image.data.set([128, 200, 231, 255], i * 4);
  return PNG.sync.write(image);
}

/** Decodes the standard GLB JSON chunk rather than relying on exporter metadata. */
function glbJson(bytes: Uint8Array) {
  const length = new DataView(bytes.buffer, bytes.byteOffset).getUint32(
    12,
    true,
  );
  return JSON.parse(new TextDecoder().decode(bytes.subarray(20, 20 + length)));
}

/** Reads exported float attributes from standard GLB accessors. */
function floatAttribute(
  bytes: Uint8Array,
  json: any,
  attribute: string,
): number[] {
  const accessor =
    json.accessors[json.meshes[0].primitives[0].attributes[attribute]];
  const view = json.bufferViews[accessor.bufferView];
  const width = attribute === "TANGENT" ? 4 : 3;
  const start =
    bytes.byteOffset +
    28 +
    new DataView(bytes.buffer, bytes.byteOffset).getUint32(12, true) +
    view.byteOffset;
  return Array.from(
    new Float32Array(bytes.buffer, start, accessor.count * width),
  );
}

test("AML normal textures round-trip as companions and affect only render identity", async () => {
  const document = parseAml(source),
    original = structuredClone(document);
  const material = document.materials[0];
  assert.equal(material.normalTexture, "surface-normal.png");
  assert.equal(material.normalScale, 1.7);
  assert.deepEqual(architectureCompanions(document), ["surface-normal.png"]);
  const parsed = parseAml(serializeAml(document));
  assert.equal(parsed.materials[0].normalTexture, material.normalTexture);
  assert.equal(parsed.materials[0].normalScale, material.normalScale);
  const level = await compile(document);
  assert.ok(!level.diagnostics.some((d) => d.severity === "error"));
  for (const change of [{ normalScale: 0 }, { normalTexture: "other.png" }]) {
    const altered = structuredClone(document);
    Object.assign(altered.materials[0], change);
    const result = await compile(altered);
    assert.ok(!result.diagnostics.some((d) => d.severity === "error"));
    assert.notEqual(result.renderHash, level.renderHash);
    assert.equal(result.physicalHash, level.physicalHash);
    assert.deepEqual(result.navigation, level.navigation);
    assert.deepEqual(result.mesh, level.mesh);
  }
  assert.deepEqual(document, original);
  const defaultScale = parseAml(source.replace(' normal-scale="1.7"', ""));
  const defaults = await compile(defaultScale, { navigation: false });
  assert.ok(!defaults.diagnostics.some((d) => d.severity === "error"));
  const assets = await resolveExportAssets(defaults, async () => normalBytes());
  assert.equal(
    glbJson(toGLB(defaults, { assets })).materials.find(
      (m: any) => m.name === "rough",
    ).normalTexture.scale,
    1,
  );
});

test("normal-only material exports linear image bytes and scale in GLB and external glTF", async () => {
  const level = await compile(parseAml(source), { navigation: false });
  assert.ok(!level.diagnostics.some((d) => d.severity === "error"));
  const bytes = normalBytes(),
    reads: string[] = [];
  const assets = await resolveExportAssets(level, async (ref) => {
    reads.push(ref);
    return bytes;
  });
  assert.deepEqual(reads, ["surface-normal.png"]);
  const binary = toGLB(level, { assets }),
    bundle = toGLTF(level, { assets });
  const embedded = glbJson(binary),
    external = JSON.parse(bundle["normal-material.gltf"] as string);
  for (const json of [embedded, external]) {
    const material = json.materials.find((m: any) => m.name === "rough");
    assert.equal(material.normalTexture.scale, 1.7);
    assert.equal(material.normalTexture.texCoord, 0);
    assert.equal(material.pbrMetallicRoughness.baseColorTexture, undefined);
    assert.equal(json.textures[material.normalTexture.index].source, 0);
    assert.equal(json.images.length, 1);
    assert.ok(
      json.meshes.every(
        (m: any) => m.primitives[0].attributes.TANGENT !== undefined,
      ),
    );
  }
  const view = embedded.bufferViews[embedded.images[0].bufferView];
  const start =
    28 +
    new DataView(binary.buffer, binary.byteOffset).getUint32(12, true) +
    view.byteOffset;
  assert.deepEqual(
    binary.slice(start, start + view.byteLength),
    new Uint8Array(bytes),
  );
  assert.deepEqual(bundle[external.images[0].uri], bytes);
  assert.equal((await validateBytes(binary)).issues.numErrors, 0);
  assert.equal(
    (
      await validateString(bundle["normal-material.gltf"] as string, {
        externalResourceFunction: async (uri: string) =>
          bundle[decodeURIComponent(uri)] as Uint8Array,
      })
    ).issues.numErrors,
    0,
  );
  assert.throws(() => toGLB(level), /unresolved texture.*surface-normal/);
  const collision = glbJson(toGLB(level, { purpose: "collision" }));
  assert.ok(
    collision.materials.every((m: any) => m.normalTexture === undefined),
  );
  assert.equal(collision.images, undefined);
  assert.throws(() => toOBJ(level), /Normal-mapped materials/);
  for (const format of ["fbx", "bsp"] as const)
    await assert.rejects(
      exportLevel(level, {
        formats: [format],
        output: "generated/unsupported-normal-export",
      }),
      /Normal-mapped materials/,
    );
  await assert.rejects(
    buildQuakeMap(level, {}, "normal"),
    /Normal-mapped materials/,
  );
  await assert.rejects(
    resolveExportAssets(level, async () => {
      throw new Error("missing");
    }),
    /surface-normal.*missing/,
  );
  await assert.rejects(
    resolveExportAssets(level, async () => new Uint8Array([1, 2, 3])),
    /PNG or JPEG/,
  );
});

test("normal-map amounts validate XML and native inputs with material source locations", async () => {
  for (const value of ["-1", "NaN", "Infinity"]) {
    await assert.rejects(
      async () =>
        compile(
          parseAml(
            source.replace('normal-scale="1.7"', `normal-scale="${value}"`),
          ),
        ),
      (error) => {
        assert.ok(
          (error as any).diagnostics.some(
            (d: any) => d.severity === "error" && d.source,
          ),
        );
        return true;
      },
    );
  }
  const orphan = parseAml(source);
  delete orphan.materials[0].normalTexture;
  await assert.rejects(compile(orphan), /normal-scale requires normal-texture/);
  const invalid = parseAml(source);
  invalid.materials[0].normalScale = -1;
  await assert.rejects(
    compile(invalid),
    /normal-scale must be finite and nonnegative/,
  );
});

test("smooth indexed receivers export unit tangents orthogonal to every vertex normal, independent of triangle order", async () => {
  const document = parseAml(
    source.replace(
      /<profile[\s\S]*<\/architecture>/,
      '<terrain id="ground" material="rough" columns="3" rows="3" cell-size="1 1" heights="0 0.1 0.3 0.2 0.6 0.5 0.1 0.2 0.4"/></architecture>',
    ),
  );
  const level = await compile(document, { navigation: false });
  assert.ok(!level.diagnostics.some((d) => d.severity === "error"));
  assert.ok(
    level.mesh.positions.length / 3 < level.mesh.indices.length,
    "Fixture has shared indexed vertices",
  );
  const assets = await resolveExportAssets(level, async () => normalBytes());
  const frames = (binary: Uint8Array) => {
    const json = glbJson(binary);
    const positions = floatAttribute(binary, json, "POSITION");
    const normals = floatAttribute(binary, json, "NORMAL"),
      tangents = floatAttribute(binary, json, "TANGENT");
    const result = new Map<string, number[]>();
    for (let i = 0; i < positions.length / 3; i++) {
      const normal = normals.slice(i * 3, i * 3 + 3),
        tangent = tangents.slice(i * 4, i * 4 + 3);
      assert.ok(Math.abs(Math.hypot(...tangent) - 1) < 1e-6);
      assert.ok(
        Math.abs(
          normal.reduce((sum, value, axis) => sum + value * tangent[axis], 0),
        ) < 1e-6,
      );
      result.set(
        positions.slice(i * 3, i * 3 + 3).join(","),
        tangents.slice(i * 4, i * 4 + 4),
      );
    }
    return result;
  };
  const first = frames(toGLB(level, { assets }));
  const reordered = structuredClone(level);
  reordered.mesh.indices = Array.from(
    { length: level.mesh.indices.length / 3 },
    (_, i) => level.mesh.indices.slice(i * 3, i * 3 + 3),
  )
    .reverse()
    .flat();
  reordered.mesh.surfaces.reverse();
  const second = frames(toGLB(reordered, { assets }));
  assert.equal(first.size, second.size);
  for (const [position, frame] of first)
    assert.ok(
      frame.every(
        (value, axis) => Math.abs(value - second.get(position)![axis]) < 1e-6,
      ),
    );
});

test("generated concrete inherits its normal-only source material through portable export", async () => {
  const document = parseAml(
    source.replace(
      "</architecture>",
      `<dressing seed="normal-ground"><floor host="floor" material="rough" ground="patched" repairs="0" tile-share="0" timber-share="0" wetness="0" litter="0"/></dressing></architecture>`,
    ),
  );
  const level = await compile(document, { navigation: false, resolveMaterialImage: async (reference) => {
    assert.equal(reference, "surface-normal.png");
    return normalBytes();
  } });
  assert.ok(!level.diagnostics.some((d) => d.severity === "error"));
  const concrete = level.mesh.surfaces.map((index) => level.surfaces[index]).find((s) => s.role === "ground-concrete");
  assert.ok(
    concrete && level.mesh.surfaces.some((i) => level.surfaces[i] === concrete),
  );
  const material = level.document.materials.find(
    (m) => m.id === concrete.material,
  )!;
  assert.ok(material.normalTexture && level.generatedImages?.[material.normalTexture], "Ground binds its composed normal map");
  assert.equal(material.normalScale, 1, "Authored normal strength is composed into the output map once");
  const authored = level.document.materials.find(entry => entry.id === "rough")!;
  assert.equal(authored.normalTexture, "surface-normal.png");
  assert.equal(authored.normalScale, 1.7, "Composition preserves the source material for other receivers");
  const assets = await resolveExportAssets(level, async () => normalBytes());
  const exported = glbJson(toGLB(level, { assets })).materials.find(
    (m: any) => m.name === material.id,
  );
  assert.equal(exported.normalTexture.scale, material.normalScale ?? 1, "Export applies the composed map's scale exactly once");
});
