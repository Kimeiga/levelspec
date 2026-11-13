import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import {
  compile,
  parseAml,
  serializeAml,
  collisionMesh,
  toGLB,
  resolveExportAssets,
  generateUVs,
} from "levelspec";
import { validateBytes } from "gltf-validator";
import { contactSeams } from "../src/dressing/seams.ts";

const source = `<architecture version="1" id="dressing-test">
  <material id="finish" color="#c6c2b4"/>
  <path id="wall-axis" points="0 0 0; 8 0 0"/>
  <profile id="floor-plan" points="0 0; 8 0; 8 6; 0 6"/>
  <wall id="wall" path="wall-axis" thickness="0.2" height="3"/>
  <slab id="floor" profile="floor-plan" thickness="0.2"/>
  <opening id="door" host="wall" width="1.4" height="2.1" center="4 1.05"/>
  <box id="mass" position="10 0 0" width="6" depth="4" height="9" collidable="false"/>
  <marker id="spawn" kind="spawn" element="floor" position="2 2 0"/>
  <marker id="goal" kind="objective" element="floor" position="6 2 0"/>
  <route id="cross" from="spawn" to="goal" min-routes="1"/>
  <dressing theme="kowloon-street@1" seed="contract" grime="0.8" wear="0.2" detail="low">
    <wall host="wall" face="back" material="finish"/>
    <floor host="floor" material="finish"/>
    <building host="mass" material="finish" stories="3"/>
  </dressing>
</architecture>`;

/** Reads the JSON chunk from a GLB produced by the public exporter. */
function gltf(bytes: Uint8Array) {
  const buffer = Buffer.from(bytes);
  return JSON.parse(buffer.toString("utf8", 20, 20 + buffer.readUInt32LE(12)));
}

test("dressing round-trips and preserves source, collision, navigation, and route results", async () => {
  const document = parseAml(source),
    original = structuredClone(document);
  const roundtrip = parseAml(serializeAml(document));
  assert.equal(roundtrip.dressing?.rules[2].stories, 3);
  const base = structuredClone(document);
  delete base.dressing;
  const plain = await compile(base),
    dressed = await compile(document),
    repeated = await compile(document);
  assert.deepEqual(document, original);
  assert.deepEqual(dressed.diagnostics, []);
  assert.equal(dressed.physicalHash, plain.physicalHash);
  assert.deepEqual(collisionMesh(dressed, true), collisionMesh(plain, true));
  assert.deepEqual(dressed.navigation, plain.navigation);
  assert.equal(dressed.renderHash, repeated.renderHash);
  assert.deepEqual(toGLB(dressed), toGLB(repeated));
  const recompiled = await compile(
    parseAml(serializeAml(dressed.architecture)),
  );
  assert.deepEqual(recompiled.diagnostics, []);
  assert.deepEqual(recompiled.mesh, dressed.mesh);
  const exported = gltf(toGLB(dressed));
  assert.ok(
    exported.meshes.every(
      (mesh: any) => mesh.primitives[0].attributes.COLOR_0 !== undefined,
    ),
  );
  assert.equal((await validateBytes(toGLB(dressed))).issues.numErrors, 0);
  // Building-specific contracts live in aml-building-dressing.test.ts.
  let wallWindowTriangles = 0;
  for (let t = 0; t < dressed.mesh.surfaces.length; t++) {
    const surface = dressed.surfaces[dressed.mesh.surfaces[t]];
    if (!surface.object.startsWith("wall/$dressing/")) continue;
    wallWindowTriangles++;
    const xs = dressed.mesh.indices
      .slice(t * 3, t * 3 + 3)
      .map((i) => dressed.mesh.positions[i * 3]);
    assert.ok(
      Math.max(...xs) < 3.3 || Math.min(...xs) > 4.7,
      "Generated window parts must clear the authored doorway.",
    );
  }
  assert.ok(wallWindowTriangles > 0);
});

test("broad weathering preserves finite structural contacts, collision and exported vertex colors", async () => {
  const document = parseAml(source);
  document.dressing!.rules = document.dressing!.rules.slice(0, 2);
  const dirty = await compile(document, { navigation: false });
  document.dressing!.grime = 0;
  const clean = await compile(document, { navigation: false });
  const seams = contactSeams(dirty).byObject.get("wall")!;
  assert.ok(seams.length > 0);
  assert.ok(seams.every((seam) => seam[0][2] === 0 && seam[1][2] === 0));
  assert.ok(
    seams.every(
      (seam) =>
        Math.max(seam[0][0], seam[1][0]) <= 3.3 + 1e-5 ||
        Math.min(seam[0][0], seam[1][0]) >= 4.7 - 1e-5,
    ),
  );
  assert.equal(dirty.physicalHash, clean.physicalHash);
  assert.deepEqual(collisionMesh(dirty, true), collisionMesh(clean, true));
  const bytes = toGLB(dirty),
    exported = gltf(bytes),
    colors: number[] = [];
  const binaryOffset = 28 + Buffer.from(bytes).readUInt32LE(12);
  const colorAccessor = exported.meshes[0].primitives[0].attributes.COLOR_0;
  assert.ok(
    exported.meshes.every((mesh: any) =>
      mesh.primitives.every(
        (primitive: any) => primitive.attributes.COLOR_0 === colorAccessor,
      ),
    ),
  );
  const accessor = exported.accessors[colorAccessor];
  const view = exported.bufferViews[accessor.bufferView];
  const data = new DataView(
    bytes.buffer,
    bytes.byteOffset +
      binaryOffset +
      (view.byteOffset ?? 0) +
      (accessor.byteOffset ?? 0),
    accessor.count * 12,
  );
  for (let i = 0; i < accessor.count * 3; i++)
    colors.push(data.getFloat32(i * 4, true));
  assert.deepEqual(colors, Array.from(new Float32Array(dirty.mesh.colors!)));
  const raised = source.replace("0 0 0; 8 0 0", "0 0 0.4; 8 0 0.4");
  const separated = await compile(parseAml(raised), { navigation: false });
  assert.equal(contactSeams(separated).byObject.get("wall"), undefined);
});

test("invalid recipes identify the host and source location", async () => {
  for (const replacement of [
    source.replace('grime="0.8"', 'grime="2"'),
    source.replace('stories="3"', 'stories="8"'),
    source.replace('collidable="false"', 'collidable="true"'),
    source.replace('<wall host="wall"', '<wall host="missing"'),
  ]) {
    const level = await compile(parseAml(replacement), { navigation: false });
    const error = level.diagnostics.find((d) => d.code === "AML_DRESSING");
    assert.ok(error?.source && error.objects.length);
  }
  assert.throws(() => parseAml(source.replace("kowloon-street@1", "unknown")));
});

test("saved demo embeds its declared color and normal textures and matches its baseline physics", async () => {
  const document = parseAml(
    await readFile("projects/dressing-demo/level.aml", "utf8"),
  );
  const base = structuredClone(document);
  base.elements = base.elements.filter(
    (element) => !["background-west", "background-east", "back-street", "shop-row"].includes(element.id),
  );
  delete base.dressing;
  const [plainLevel, dressedLevel] = await Promise.all([
    compile(base),
    compile(document),
  ]);
  assert.deepEqual(dressedLevel.diagnostics, []);
  const plain = { level: plainLevel },
    dressed = { level: dressedLevel };
  assert.equal(dressed.level.physicalHash, plain.level.physicalHash);
  assert.deepEqual(dressed.level.navigation, plain.level.navigation);
  const assets = await resolveExportAssets(dressed.level, (reference) =>
    readFile(`projects/dressing-demo/${reference}`),
  );
  const model = toGLB(dressed.level, { assets });
  const declaredReferences = new Set(document.materials.flatMap(material =>
    [material.texture, material.normalTexture].filter((reference): reference is string => reference !== undefined)));
  assert.ok(declaredReferences.size > 0);
  const expectedImages = new Set(await Promise.all([...declaredReferences].map(async reference =>
    createHash("sha256").update(await readFile(`projects/dressing-demo/${reference}`)).digest("hex"))));
  const exported = gltf(model);
  const binaryStart = 28 + Buffer.from(model).readUInt32LE(12);
  const embeddedImages = new Set(exported.images.map((image: { bufferView: number }) => {
    const view = exported.bufferViews[image.bufferView];
    const offset = binaryStart + (view.byteOffset ?? 0);
    return createHash("sha256").update(model.subarray(offset, offset + view.byteLength)).digest("hex");
  }));
  assert.deepEqual(embeddedImages, expectedImages,
    "Every distinct declared color/normal image must survive export, without substitute or extra image payloads.");
  assert.equal(exported.images.length, expectedImages.size, "Shared image bytes are embedded once.");
  assert.equal((await validateBytes(model)).issues.numErrors, 0);
});

const attachedSource = `<architecture version="1" id="attachment" validation="premap">
  <material id="finish" color="#c6c2b4" repeat="0.5"/>
  <path id="boundary-axis" points="0 0.1 0; 6 0.1 0"/>
  <wall id="boundary" path="boundary-axis" thickness="0.2" height="3"/>
  <box id="building" width="6" depth="4" height="9.35" collidable="false"/>
  <dressing seed="attachment" detail="medium" grime="0.8" wear="0.2">
    <building host="building" base-wall="boundary" material="finish" stories="3"/>
  </dressing>
</architecture>`;

test("building frontage replaces the visible boundary and preserves its physical wall", async () => {
  const document = parseAml(attachedSource);
  assert.equal(
    parseAml(serializeAml(document)).dressing!.rules[0].baseWall,
    "boundary",
  );
  const baseline = structuredClone(document);
  baseline.elements = baseline.elements.filter(
    (element) => element.id !== "building",
  );
  delete baseline.dressing;
  const plain = await compile(baseline, { navigation: false });
  const dressed = await compile(document, { navigation: false });
  assert.deepEqual(dressed.diagnostics, []);
  assert.equal(dressed.physicalHash, plain.physicalHash);
  assert.deepEqual(collisionMesh(dressed, true), collisionMesh(plain, true));
  assert.ok(
    dressed.physicalMesh!.surfaces.some(
      (index) => dressed.surfaces[index].object === "boundary",
    ),
  );
  assert.ok(
    dressed.mesh.surfaces.every(
      (index) => dressed.surfaces[index].object !== "boundary",
    ),
  );
  const cleanSource = attachedSource
    .replace('grime="0.8"', 'grime="0"')
    .replace('wear="0.2"', 'wear="0"');
  const clean = await compile(parseAml(cleanSource), { navigation: false });
  assert.notDeepEqual(dressed.mesh.colors, clean.mesh.colors);
  const detailed = await compile(
    parseAml(attachedSource.replace('detail="medium"', 'detail="high"')),
    { navigation: false },
  );
  assert.ok(detailed.mesh.indices.length > dressed.mesh.indices.length);
  const hidden = await compile(
    parseAml(
      attachedSource.replace(
        '<box id="building"',
        '<box id="building" visible="false"',
      ),
    ),
    { navigation: false },
  );
  assert.ok(
    hidden.mesh.surfaces.every(
      (index) => hidden.surfaces[index].object === "boundary",
    ),
  );
  const limited = await compile(document, {
    navigation: false,
    limits: { triangles: 1000 },
  });
  assert.ok(limited.diagnostics.some((d) => /budget/i.test(d.message)));
  assert.ok(limited.mesh.indices.length / 3 <= 1000);
});

test("building attachment rejects invalid geometry and preserves explicit authoring", async () => {
  const cases = [
    attachedSource.replace('base-wall="boundary"', 'base-wall="absent"'),
    attachedSource.replace('width="6" depth', 'width="5" depth'),
    attachedSource.replace("0 0.1 0; 6 0.1 0", "3 0 0; 3 3 0"),
    attachedSource.replace("0 0.1 0; 6 0.1 0", "0 0.4 0; 6 0.4 0"),
    attachedSource.replace('height="3"', 'height="3" dynamic="true"'),
    attachedSource.replace(
      '<box id="building"',
      '<box id="building" rotation="20 0 0"',
    ),
    attachedSource.replace(
      '<box id="building"',
      '<box id="building" dynamic="true"',
    ),
    attachedSource.replace(
      "<dressing",
      '<opening id="door" host="boundary" width="1" height="2" center="3 1"/><dressing',
    ),
    attachedSource.replace(
      "<dressing",
      '<face-material id="paint" host="boundary" face="front" material="finish"/><dressing',
    ),
  ];
  for (const input of cases) {
    const level = await compile(parseAml(input), { navigation: false });
    assert.ok(
      level.diagnostics.some(
        (d) =>
          d.code === "AML_DRESSING" &&
          d.source &&
          d.objects.includes("building"),
      ),
      input,
    );
  }
  const duplicate = attachedSource
    .replace('<box id="building"', '<box id="building" visible="false"')
    .replace('<dressing', '<box id="second" width="6" depth="4" height="9.35" collidable="false"/><dressing')
    .replace('</dressing>', '<building host="second" base-wall="boundary" material="finish" stories="3"/></dressing>');
  const duplicateLevel = await compile(parseAml(duplicate), { navigation: false });
  assert.ok(duplicateLevel.diagnostics.some(d => d.code === "AML_DRESSING" && /only one building/.test(d.message)));
  const empty = parseAml(attachedSource);
  empty.dressing!.rules = [];
  empty.dressing!.grime = 2;
  const level = await compile(empty, { navigation: false });
  assert.ok(
    level.diagnostics.some((d) => d.code === "AML_DRESSING" && d.source),
  );
});

test("yaw and reflection keep generated surfaces outward, and textures honor material scale", async () => {
  const base = attachedSource
    .replace('base-wall="boundary" ', "")
    .replace(
      '<wall id="boundary" path="boundary-axis" thickness="0.2" height="3"/>',
      "",
    );
  for (const placement of ['rotation="0 0 35"', 'scale="-1 1 1"']) {
    const level = await compile(
      parseAml(
        base.replace('<box id="building"', `<box id="building" ${placement}`),
      ),
      { navigation: false },
    );
    assert.deepEqual(level.diagnostics, []);
    for (let t = 0; t < level.mesh.surfaces.length; t++) {
      const indices = level.mesh.indices.slice(t * 3, t * 3 + 3);
      const [a, b, c] = indices.map((index) =>
        level.mesh.positions.slice(index * 3, index * 3 + 3),
      );
      const u = b.map((value, i) => value - a[i]),
        v = c.map((value, i) => value - a[i]);
      const cross = [
        u[1] * v[2] - u[2] * v[1],
        u[2] * v[0] - u[0] * v[2],
        u[0] * v[1] - u[1] * v[0],
      ];
      const normal = level.mesh.normals.slice(
        indices[0] * 3,
        indices[0] * 3 + 3,
      );
      assert.ok(
        cross.reduce((sum, value, i) => sum + value * normal[i], 0) > 0,
      );
    }
  }
  const original = await compile(parseAml(base), { navigation: false });
  const scaled = await compile(
    parseAml(base.replace('repeat="0.5"', 'repeat="1"')),
    { navigation: false },
  );
  // A triangle whose first edge spans both texture axes exercises U and V.
  const triangle = original.mesh.surfaces.findIndex((index, t) => {
    if (!original.surfaces[index].object.endsWith("/envelope")) return false;
    const [a, b] = original.mesh.indices.slice(t * 3, t * 3 + 2);
    return [0, 1].every(
      (axis) => Math.abs(original.mesh.uv[b * 2 + axis] - original.mesh.uv[a * 2 + axis]) > 1e-3,
    );
  });
  assert.ok(triangle >= 0);
  const indices = original.mesh.indices.slice(triangle * 3, triangle * 3 + 3);
  for (const axis of [0, 1]) {
    const span = (mesh: typeof original.mesh) =>
      mesh.uv[indices[1] * 2 + axis] - mesh.uv[indices[0] * 2 + axis];
    assert.ok(Math.abs(span(scaled.mesh) - 2 * span(original.mesh)) < 1e-6);
  }
});

test("ordinary atlas generation retains weathering at each original surface corner", async () => {
  const document = parseAml(source);
  document.dressing!.rules = document.dressing!.rules.slice(0, 2);
  document.elements = document.elements.filter(
    (element) => element.id !== "mass",
  );
  const level = await compile(document, { navigation: false });
  const originalMesh = structuredClone(level.mesh);
  const originalCollision = structuredClone(collisionMesh(level, true));
  const expected = new Map<string, number[]>();
  // Adjacent triangles may meet at one corner with different colors, so a
  // corner is identified within its own triangle.
  const centroid = (mesh: typeof level.mesh, triangle: number) =>
    [0, 1, 2].map((axis) =>
      Math.round(
        (mesh.indices
          .slice(triangle * 3, triangle * 3 + 3)
          .reduce((sum, i) => sum + mesh.positions[i * 3 + axis], 0) /
          3) *
          1e6,
      ),
    );
  const key = (mesh: typeof level.mesh, triangle: number, index: number) =>
    JSON.stringify([
      mesh.surfaces[triangle],
      ...centroid(mesh, triangle),
      ...mesh.positions
        .slice(index * 3, index * 3 + 3)
        .map((value) => Math.round(value * 1e6)),
      ...mesh.normals
        .slice(index * 3, index * 3 + 3)
        .map((value) => Math.round(value * 1e6)),
    ]);
  for (let triangle = 0; triangle < originalMesh.surfaces.length; triangle++)
    for (const index of originalMesh.indices.slice(
      triangle * 3,
      triangle * 3 + 3,
    ))
      expected.set(
        key(originalMesh, triangle, index),
        originalMesh.colors!.slice(index * 3, index * 3 + 3),
      );
  await generateUVs(level, { resolution: 512, density: 4 });
  assert.ok(level.mesh.uv1?.length);
  for (let triangle = 0; triangle < level.mesh.surfaces.length; triangle++)
    for (const index of level.mesh.indices.slice(
      triangle * 3,
      triangle * 3 + 3,
    ))
      assert.deepEqual(
        level.mesh.colors!.slice(index * 3, index * 3 + 3),
        expected.get(key(level.mesh, triangle, index)),
      );
  assert.deepEqual(collisionMesh(level, true), originalCollision);
});
