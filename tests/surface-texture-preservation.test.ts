import { test } from "node:test";
import assert from "node:assert/strict";
import { compile, parseAml, collisionMesh, serializeAml, AmlError } from "levelspec";
import { registerSurfaceChart } from "../src/dressing/surface/plans.ts";
import { compileSurfaceAppearance } from "../src/dressing/surface/compile.ts";
import { rasterizeSurface } from "../src/dressing/surface/raster.ts";
import { decodeSurfaceImage } from "../src/dressing/surface/images.ts";
import type { SurfaceChart } from "../src/dressing/surface/types.ts";

type Level = Awaited<ReturnType<typeof compile>>;
const xml = `<architecture version="1" id="texture-preservation">
  <material id="red" color="#ff0000" roughness="0.2"/><material id="blue" color="#0000ff" roughness="0.8"/>
  <profile id="footprint" points="0 0; 3 0; 3 3; 0 3"><hole points="1 1; 1 2; 2 2; 2 1"/></profile>
  <slab id="floor" profile="footprint" thickness="0.2" material="red"/>
</architecture>`;

/** Expands indexed geometry so appearance UV seams do not affect the comparison. */
function geometry(level: Level) {
  return level.mesh.indices.map(index => ({ position: level.mesh.positions.slice(index * 3, index * 3 + 3),
    normal: level.mesh.normals.slice(index * 3, index * 3 + 3) }));
}

/** Registers the actual slab top, including its hole; fine material variation has no geometric contract. */
function receiver(level: Level, density: number): SurfaceChart {
  const triangles = level.mesh.surfaces.flatMap((_, triangle) =>
    level.mesh.normals[level.mesh.indices[triangle * 3] * 3 + 2] > .99 ? [triangle] : []);
  assert.ok(triangles.length > 0);
  return { id: "floor/top", host: "floor", firstTriangle: triangles[0], triangleCount: triangles.length, triangleIndices: triangles,
    frame: { origin: [0, 0, 0], u: [1, 0, 0], v: [0, 1, 0], normal: [0, 0, 1] }, bounds: [0, 0, 3, 3], materials: ["red", "blue"],
    raster: { geometry: "preserve", group: "top", bounds: [0, 0, 3, 3], texelsPerMeter: density, bump: (u, v) => .004 * Math.sin(u * 11 + v * 7) },
    sample: (u, v) => ({ height: 0, layers: [
      { material: "red", weight: Math.sin(u * 91 + v * 73) ** 2, uv: [u, v] },
      { material: "blue", weight: Math.cos(u * 91 + v * 73) ** 2, uv: [u * 2, v * 2] },
    ] }) };
}

test("texture material boundaries and bump preserve actual receiver geometry, holes and collision", async () => {
  const original = await compile(parseAml(xml), { navigation: false });
  for (const density of [4, 8]) {
    const level = await compile(parseAml(xml), { navigation: false });
    registerSurfaceChart(level, receiver(level, density));
    await compileSurfaceAppearance(level, { navigation: false }, original.mesh.indices.length / 3);
    assert.deepEqual(geometry(level), geometry(original));
    assert.deepEqual(collisionMesh(level, true), collisionMesh(original, true));
    assert.equal(serializeAml(level.architecture), serializeAml(original.architecture));
    assert.deepEqual(level.mesh.surfaces.map(index => level.surfaces[index].object), original.mesh.surfaces.map(index => original.surfaces[index].object));
    const material = level.document.materials.find(material => material.id.startsWith("$surface/raster/"))!;
    assert.ok(material.texture && material.normalTexture && material.metallicRoughnessTexture);
    for (const [triangle, surface] of level.mesh.surfaces.entries()) {
      const indices = level.mesh.indices.slice(triangle * 3, triangle * 3 + 3);
      const isTop = level.mesh.normals[indices[0] * 3 + 2] > .99;
      assert.equal(level.surfaces[surface].material, isTop ? material.id : "red");
      if (isTop) for (const index of indices) {
        assert.ok(level.mesh.uv.slice(index * 2, index * 2 + 2).every(value => value >= 0 && value <= 1));
        assert.deepEqual(level.mesh.colors!.slice(index * 3, index * 3 + 3), [1, 1, 1]);
      }
    }
    const color = decodeSurfaceImage(level.generatedImages![material.texture].bytes);
    const normal = decodeSurfaceImage(level.generatedImages![material.normalTexture].bytes);
    assert.ok(new Set(color.data).size > 3);
    assert.ok(normal.data.some((value, index) => index % 4 < 2 && Math.abs(value - 128) > 1));
    assert.equal(level.surfaceAppearance!.texels, (3 * density + 4) ** 2 * 3, "Two source materials allocate one three-channel map set");
  }
});

test("preserved raster blends source weights and factors once in linear space", async () => {
  const level = await compile(parseAml(xml), { navigation: false });
  const chart = receiver(level, 2);
  chart.sample = (u, v) => ({ height: 0, layers: [
    { material: "red", weight: 1, uv: [u, v], tint: [.5, 1, 1] },
    { material: "blue", weight: 3, uv: [u * 2, v * 2] },
  ] });
  const result = await rasterizeSurface(chart, chart.raster!, new Map(level.document.materials.map(material => [material.id, material])), new Map());
  assert.equal(result.layers.length, 1);
  const offset = (2 * result.layout.width + 2) * 4;
  // Linear red .125 and blue .75 encode to sRGB 99 and 225; roughness is .25*.2 + .75*.8 = .65.
  assert.deepEqual([...result.layers[0].color.data.slice(offset, offset + 4)], [99, 0, 225, 255]);
  assert.equal(result.layers[0].metallicRoughness.data[offset + 1], 166);
});

test("preserved appearance rejects displacement and invalid fields atomically, then recovers", async () => {
  for (const failure of ["height", "plate", "source-height", "weight", "zero-weight", "nan-weight", "tint", "bump", "material", "budget", "bounds", "emission", "cancel"] as const) {
    const level = await compile(parseAml(xml), { navigation: false });
    const before = structuredClone({ mesh: level.mesh, surfaces: level.surfaces, document: level.document });
    const chart = receiver(level, 4), sample = chart.sample;
    if (failure === "source-height") level.document.materials.find(material => material.id === "red")!.heightTexture = "authored.png";
    if (failure === "emission") level.document.materials.find(material => material.id === "blue")!.emissive = "#ffffff";
    const transactionBefore = structuredClone({ mesh: level.mesh, surfaces: level.surfaces, document: level.document });
    if (failure === "bounds") chart.raster!.bounds = [0, 0, 1, 1];
    if (failure === "plate") chart.layerElevations = [0, .01];
    else if (failure === "bump") chart.raster!.bump = u => u < 1 ? NaN : 0;
    else chart.sample = (u, v) => {
      const value = sample(u, v);
      if (u < 1) {
        if (failure === "height") value.height = .01;
        if (failure === "weight") value.layers[0].weight = -1;
        if (failure === "nan-weight") value.layers[0].weight = NaN;
        if (failure === "zero-weight") value.layers.forEach(layer => { layer.weight = 0; });
        if (failure === "tint") value.layers[0].tint = [-1, 1, 1];
        if (failure === "material") value.layers[0].material = "missing";
      }
      return value;
    };
    registerSurfaceChart(level, chart);
    const abort = new AbortController();
    if (failure === "cancel") abort.abort();
    await assert.rejects(compileSurfaceAppearance(level, { signal: abort.signal, appearance: failure === "budget" ? { maximumTexels: 1 } : undefined }, 100),
      error => {
        if (failure === "cancel") { assert.equal((error as Error).name, "AbortError"); return true; }
        assert.ok(error instanceof AmlError);
        if (failure === "source-height") assert.match(error.message, /height sources/);
        assert.ok(error.diagnostics.some(diagnostic => diagnostic.objects?.includes("floor") && diagnostic.source && diagnostic.review?.bounds));
        return true;
      });
    assert.deepEqual({ mesh: level.mesh, surfaces: level.surfaces, document: level.document }, transactionBefore);
    assert.equal(level.generatedImages, undefined);
    assert.equal(level.surfaceAppearance, undefined);
    level.document.materials = before.document.materials;
    registerSurfaceChart(level, receiver(level, 4));
    await compileSurfaceAppearance(level, {}, 100);
    assert.ok(level.generatedImages);
  }
});

test("plain-wall ceramics change appearance without adding geometry or filling a doorway", async () => {
  const source = (share: number) => `<architecture version="1" id="textured-wall">
    <material id="finish" color="#bcb6a8"/>
    <path id="axis" points="0 0 0; 3 0 0"/><wall id="wall" path="axis" thickness="0.2" height="2.5"/>
    <opening id="door" host="wall" center="1.5 1" width="0.8" height="2"/>
    <dressing seed="texture-test" detail="low"><wall host="wall" material="finish" windows="false" tile-share="${share}"/></dressing>
  </architecture>`;
  const bare = await compile(parseAml(source(0)), { navigation: false });
  const tiled = await compile(parseAml(source(1)), { navigation: false });
  assert.ok(!tiled.diagnostics.some(diagnostic => diagnostic.severity === "error"));
  assert.ok(!bare.diagnostics.some(diagnostic => diagnostic.severity === "error"));
  assert.deepEqual(geometry(tiled), geometry(bare));
  assert.equal(tiled.physicalHash, bare.physicalHash);
  assert.deepEqual(collisionMesh(tiled, true), collisionMesh(bare, true));
  assert.notDeepEqual(tiled.surfaceAppearance!.generatedHashes, bare.surfaceAppearance!.generatedHashes);
  assert.ok(tiled.mesh.surfaces.some(index => {
    const id = tiled.surfaces[index].material;
    return id.startsWith("$surface/raster/") && tiled.document.materials.some(material => material.id === id && material.normalTexture);
  }));
});

test("preserved receiver closes the shared edge beside explicit geometric displacement", async () => {
  const level = await compile(parseAml(`<architecture version="1" id="mixed"><material id="red"/><material id="blue"/>
    <box id="box" width="1" depth="1" height="1" material="red"/></architecture>`), { navigation: false });
  const select = (axis: number, value: number) => level.mesh.surfaces.flatMap((_, triangle) =>
    level.mesh.normals[level.mesh.indices[triangle * 3] * 3 + axis] === value ? [triangle] : []);
  const top = select(2, 1), front = select(1, -1);
  registerSurfaceChart(level, { id: "top", host: "box", firstTriangle: top[0], triangleCount: top.length, triangleIndices: top,
    frame: { origin: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0], normal: [0, 0, 1] }, bounds: [0, 0, 1, 1], materials: ["red"],
    sample: (u, v) => ({ height: .02, layers: [{ material: "red", weight: 1, uv: [u, v] }] }) });
  registerSurfaceChart(level, { id: "front", host: "box", firstTriangle: front[0], triangleCount: front.length, triangleIndices: front,
    frame: { origin: [0, 0, 0], u: [1, 0, 0], v: [0, 0, 1], normal: [0, -1, 0] }, bounds: [0, 0, 1, 1], materials: ["blue"],
    raster: { geometry: "preserve", group: "front", bounds: [0, 0, 1, 1], texelsPerMeter: 2 },
    sample: (u, v) => ({ height: 0, layers: [{ material: "blue", weight: 1, uv: [u, v] }] }) });
  await compileSurfaceAppearance(level, {}, 1000);
  const closing = level.mesh.surfaces.flatMap((_, triangle) => {
    const points = level.mesh.indices.slice(triangle * 3, triangle * 3 + 3).map(index => level.mesh.positions.slice(index * 3, index * 3 + 3));
    return points.every(point => Math.abs(point[1]) < 1e-9 && point[2] >= 1 - 1e-9)
      && Math.max(...points.map(point => point[2])) > 1.01 ? [points] : [];
  });
  assert.ok(closing.length >= 2, "The raised top's exposed 2 cm edge is closed against the preserved front");
  const area = closing.reduce((sum, [a, b, c]) => sum + Math.abs((b[0] - a[0]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[0] - a[0])) / 2, 0);
  assert.ok(Math.abs(area - .02) < 1e-8, "The complete 1 m by 2 cm shared edge is closed without overlap");
  for (const x of [.17, .43, .79]) for (const z of [1.003, 1.013, 1.017]) {
    assert.ok(closing.some(([a, b, c]) => {
      const sides = [[a, b], [b, c], [c, a]].map(([p, q]) => (q[0] - p[0]) * (z - p[2]) - (q[2] - p[2]) * (x - p[0]));
      return sides.every(value => value >= -1e-10) || sides.every(value => value <= 1e-10);
    }), "Interior points of the authored closure strip are covered");
  }
});

test("shared image bindings preserve distinct projected UVs at a shared source vertex", async () => {
  const level = await compile(parseAml(`<architecture version="1" id="uv-seam"><material id="red"/>
    <box id="box" width="1" depth="1" height="1" material="red"/></architecture>`), { navigation: false });
  const top = level.mesh.surfaces.flatMap((_, triangle) => level.mesh.normals[level.mesh.indices[triangle * 3] * 3 + 2] === 1 ? [triangle] : []);
  assert.equal(top.length, 2);
  const first = level.mesh.indices.slice(top[0] * 3, top[0] * 3 + 3);
  for (let corner = 0; corner < 3; corner++) {
    const offset = top[1] * 3 + corner, index = level.mesh.indices[offset];
    const shared = first.find(other => level.mesh.positions.slice(other * 3, other * 3 + 3)
      .every((value, axis) => value === level.mesh.positions[index * 3 + axis]));
    if (shared !== undefined) level.mesh.indices[offset] = shared;
  }
  assert.equal(level.mesh.indices.slice(top[1] * 3, top[1] * 3 + 3).filter(index => first.includes(index)).length, 2,
    "The legal input mesh shares the top triangles' common edge indices");
  for (const [i, triangle] of top.entries()) registerSurfaceChart(level, {
    id: `top-${i}`, host: "box", firstTriangle: triangle, triangleCount: 1,
    frame: { origin: [i * .5, 0, 1], u: [1, 0, 0], v: [0, 1, 0], normal: [0, 0, 1] },
    bounds: [-.5, 0, 1, 1], materials: ["red"], raster: { geometry: "preserve", group: "shared", bounds: [-.5, 0, 1, 1], texelsPerMeter: 4 },
    sample: (u, v) => ({ height: 0, layers: [{ material: "red", weight: 1, uv: [u, v] }] }),
  });
  await compileSurfaceAppearance(level, {}, 100);
  for (const [i, triangle] of top.entries()) for (const index of level.mesh.indices.slice(triangle * 3, triangle * 3 + 3)) {
    const x = level.mesh.positions[index * 3];
    const expected = (2 + (x - i * .5 + .5) * 4) / 10;
    assert.ok(Math.abs(level.mesh.uv[index * 2] - expected) < 1e-12);
  }
});

test("small patched ground binds texture maps while preserving its source and collision", async () => {
  const document = parseAml(`<architecture version="1" id="ground-textures"><material id="finish"/>
    <profile id="plan" points="0 0; 1 0; 1 1; 0 1"/><slab id="floor" profile="plan" thickness="0.2"/>
    <dressing seed="small"><floor host="floor" material="finish" ground="patched" relief="0" wetness="0" litter="0"
      repairs="0" tile-share="1" timber-share="0" asphalt="0" manholes="0" breakup="0"/></dressing></architecture>`);
  const input = serializeAml(document);
  const plainDocument = structuredClone(document); delete plainDocument.dressing;
  const plain = await compile(plainDocument, { navigation: false });
  const level = await compile(document, { navigation: false });
  assert.ok(!level.diagnostics.some(diagnostic => diagnostic.severity === "error"));
  assert.equal(serializeAml(document), input);
  assert.deepEqual(collisionMesh(level, true), collisionMesh(plain, true));
  const used = new Set(level.mesh.surfaces.map(index => level.surfaces[index].material));
  const maps = level.document.materials.filter(material => used.has(material.id) && material.id.startsWith("$surface/raster/"));
  assert.ok(maps.length > 0);
  for (const material of maps) assert.ok(material.texture && material.normalTexture && level.generatedImages?.[material.texture]);
});

test("preserved composition uses each source texture UV and normal before blending", async () => {
  const level = await compile(parseAml(xml), { navigation: false });
  const chart = receiver(level, 2);
  const texture = { width: 2, height: 1, data: new Uint8Array([255, 0, 0, 255, 0, 0, 255, 255]) };
  const images = new Map([
    ["colors", texture],
    ["east", { width: 1, height: 1, data: new Uint8Array([255, 128, 255, 255]) }],
    ["west", { width: 1, height: 1, data: new Uint8Array([0, 128, 255, 255]) }],
  ]);
  const materials = new Map(level.document.materials.map(material => [material.id, { ...material, color: "#ffffff", texture: "colors",
    normalTexture: material.id === "red" ? "east" : "west" }]));
  chart.raster = { geometry: "preserve", group: "numeric", bounds: [0, 0, 1, 1], texelsPerMeter: 2 };
  chart.sample = (u, v) => ({ height: 0, layers: [
    { material: "red", weight: 1, uv: [u, v] }, { material: "blue", weight: 3, uv: [u + .5, v] },
  ] });
  const result = await rasterizeSurface(chart, chart.raster, materials, images);
  const offset = (2 * result.layout.width + 2) * 4;
  assert.deepEqual([...result.layers[0].color.data.slice(offset, offset + 4)], [137, 0, 225, 255]);
  const normal = result.layers[0].normal!.data.slice(offset, offset + 3);
  assert.ok(Math.abs(normal[0] - 70) <= 1 && Math.abs(normal[1] - 128) <= 1 && Math.abs(normal[2] - 242) <= 1);
});

test("texel filtering preserves thin periodic grout area even when sample centers miss every seam", async () => {
  const { tileCoverage } = await import("../src/dressing/finish/tile-grid.ts");
  // Four texels per 25 cm tile, with a 1.5 cm grout gap: point centers all miss it.
  const footprint = .25 / 4, gap = .015;
  for (const cycle of [-2, 0, 3]) {
    const values = Array.from({ length: 4 }, (_, i) => tileCoverage((cycle + (i + .5) / 4) * .25, .25, gap / 2, footprint));
    for (const [i, expected] of [.88, 1, 1, .88].entries()) assert.ok(Math.abs(values[i] - expected) < 1e-12);
    assert.ok(values.every(value => Number.isFinite(value) && value >= 0 && value <= 1));
    assert.ok(Math.abs(values.reduce((sum, value) => sum + value, 0) * footprint - (.25 - gap)) < 1e-12);
  }
  assert.ok(Math.abs(tileCoverage(0, .25, gap / 2, footprint) - .76) < 1e-12);
  assert.equal(tileCoverage(.125, .25, gap / 2, .01), 1);
  assert.ok(Math.abs(tileCoverage(-.3, .25, gap / 2, .5) - .94) < 1e-12);
});

test("shared raster rows reject malformed streams and scratch overages atomically, close iterators and recover", async () => {
  for (const failure of ["short", "long", "throw", "shape", "missing-bump", "nan-bump", "scratch", "cancel"] as const) {
    const level = await compile(parseAml(xml), { navigation: false });
    const before = structuredClone({ mesh: level.mesh, surfaces: level.surfaces, document: level.document });
    const chart = receiver(level, failure === "cancel" ? 128 : 4);
    const original = chart.sample;
    chart.sample = (u, v) => ({ ...original(u, v), bump: .01 * u * v });
    chart.raster!.bump = "sample";
    let activeRows = 0;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    chart.sampleRow = function* (us, v) {
      activeRows++;
      try {
        if (failure === "cancel" && timer === undefined) timer = setTimeout(() => controller.abort(), 0);
        const count = us.length + (failure === "long" ? 1 : failure === "short" ? -1 : 0);
        for (let i = 0; i < count; i++) {
          if (failure === "throw" && i === 3) throw new Error("broken row");
          const value = chart.sample(us[Math.min(i, us.length - 1)], v);
          if (failure === "shape") value.layers.push(value.layers[0]);
          if (failure === "missing-bump") delete value.bump;
          if (failure === "nan-bump") value.bump = NaN;
          yield value;
        }
      } finally { activeRows--; }
    };
    registerSurfaceChart(level, chart);
    try {
      await assert.rejects(compileSurfaceAppearance(level, { signal: controller.signal,
        appearance: failure === "scratch" ? { maximumBytes: 10000 } : undefined }, 100), error => {
        if (failure === "cancel") return (error as Error).name === "AbortError";
        assert.ok(error instanceof AmlError);
        const expected = { short: /Incomplete raster row/, long: /Oversized raster row/, throw: /broken row/,
          shape: /Invalid raster row shape/, "missing-bump": /Invalid raster bump/, "nan-bump": /Invalid raster bump/,
          scratch: /memory budget/ };
        assert.match(error.message, expected[failure]);
        assert.ok(error.diagnostics.some(diagnostic => diagnostic.objects?.includes("floor") && diagnostic.source));
        return true;
      });
    } finally { clearTimeout(timer); }
    assert.equal(activeRows, 0, "Every opened row releases scratch on failure or cancellation");
    assert.deepEqual({ mesh: level.mesh, surfaces: level.surfaces, document: level.document }, before);
    assert.equal(level.generatedImages, undefined);
    registerSurfaceChart(level, receiver(level, 4));
    await compileSurfaceAppearance(level, {}, 100);
    assert.ok(level.generatedImages);
  }
});
