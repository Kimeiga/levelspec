import { test } from "node:test";
import assert from "node:assert/strict";
import { PNG } from "pngjs";
import { Matrix4, Ray, Vector3 } from "three";
import { compile, parseAml, collisionMesh, AmlError } from "levelspec";
import type { CompiledArchitecture, V3 } from "../src/architecture/types.ts";
import type { MeshData } from "../src/vector/types.ts";
import type { SurfaceChart, SurfaceSample } from "../src/dressing/surface/types.ts";
import { registerSurfaceChart } from "../src/dressing/surface/plans.ts";
import { compileSurfaceAppearance } from "../src/dressing/surface/compile.ts";
import { SurfaceJunctions, type SurfaceJunctionFace } from "../src/dressing/surface/junctions.ts";

/** Requires a positive public compile before examining its render geometry. */
function successful(level: CompiledArchitecture): CompiledArchitecture {
  assert.deepEqual(level.diagnostics.filter(entry => entry.severity === "error"), []);
  return level;
}

/** Constructs a real compiled receiver while isolating one square of its visual finish. */
async function receiver(materials = '<material id="coat" color="#ff0000"/><material id="backing" color="#0000ff"/>') {
  const level = successful(await compile(parseAml(`<architecture version="1" id="finite-layers">${materials}
    <box id="receiver" width="1" depth="1" height="0.1" material="coat"/></architecture>`), { navigation: false }));
  level.mesh = { positions: [0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0],
    indices: [0, 1, 2, 0, 2, 3], normals: [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1],
    uv: [0, 0, 1, 0, 1, 1, 0, 1], colors: Array(12).fill(1), surfaces: [0, 0], solidIds: ["receiver", "receiver"] };
  return level;
}

/** A meter-scaled chart with coat at the native plane and a 6mm lower backing. */
function chart(sample: (u: number, v: number) => SurfaceSample): SurfaceChart {
  return { id: "finish", host: "receiver", firstTriangle: 0, triangleCount: 2,
    frame: { origin: [0, 0, 0], u: [1, 0, 0], v: [0, 1, 0], normal: [0, 0, 1] },
    bounds: [0, 0, 1, 1], materials: ["coat", "backing"], layerElevations: [0, -0.006], sample };
}

/** Reads actual emitted triangles without relying on generated surface identifiers. */
function faces(mesh: MeshData) {
  return mesh.surfaces.map((surface, triangle) => {
    const indices = mesh.indices.slice(triangle * 3, triangle * 3 + 3);
    const points = indices.map(index => new Vector3(...mesh.positions.slice(index * 3, index * 3 + 3)));
    const cross = points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0]));
    return { surface, points, indices, area: cross.length() / 2, normal: cross.normalize() };
  });
}

test("appearance tint colors final material vertices without changing geometry", async () => {
  const levels: CompiledArchitecture[] = [];
  for (const colored of [false, true]) {
    const level = await receiver(), physical = collisionMesh(level, true);
    const plan = chart((u, v) => ({ height: 0, layers: [
      { material: "coat", weight: 1 - u, uv: [u, v], tint: [0.5, 0.75, 1] },
      { material: "backing", weight: u, uv: [u, v], tint: [0.5, 0.75, 1] },
    ] }));
    plan.constructionCuts = { u: [0.5], v: [] };
    plan.uniformCoverage = ([left, , right]) => right <= 0.5 || left >= 0.5;
    if (colored) plan.appearanceTint = (u, v, layer) => [0.6 + Math.sin(u * 37 + v * 19) * 0.2, 0.4 + layer * 0.3, 1.2];
    registerSurfaceChart(level, plan);
    await compileSurfaceAppearance(level, {}, 1_000);
    assert.deepEqual(collisionMesh(level, true), physical);
    levels.push(level);
    if (!colored) continue;
    for (const face of faces(level.mesh).filter(face => face.normal.z > 0.99)) {
      const layer = level.surfaces[face.surface].material === "coat" ? 0 : 1;
      for (const index of face.indices) {
        const [u, v] = level.mesh.positions.slice(index * 3, index * 3 + 2);
        const expected = [0.3 + Math.sin(u * 37 + v * 19) * 0.1, (0.4 + layer * 0.3) * 0.75, 1.2];
        assert.ok(expected.every((value, axis) => Math.abs(value - level.mesh.colors![index * 3 + axis]) < 1e-12));
      }
    }
  }
  for (const attribute of ["positions", "indices", "normals", "uv"] as const)
    assert.deepEqual(levels[1].mesh[attribute], levels[0].mesh[attribute]);
  assert.notDeepEqual(levels[1].mesh.colors, levels[0].mesh.colors);
});

test("invalid appearance tint fails atomically with a source location and permits recovery", async () => {
  const level = await receiver(), before = structuredClone({ mesh: level.mesh, document: level.document, surfaces: level.surfaces });
  const plan = chart((u, v) => ({ height: 0, layers: [
    { material: "coat", weight: 1, uv: [u, v] }, { material: "backing", weight: 0, uv: [u, v] },
  ] }));
  plan.uniformCoverage = () => true;
  for (const invalid of [NaN, Infinity, -0.1, "short", "throw"] as const) {
    registerSurfaceChart(level, { ...plan, appearanceTint(u) {
      if (u <= 0.75) return [1, 1, 1];
      if (invalid === "throw") throw new Error("pigment failure");
      if (invalid === "short") return [1, 1] as unknown as V3;
      return [invalid, 1, 1];
    } });
    await assert.rejects(compileSurfaceAppearance(level, {}, 1_000), error => {
      assert.ok(error instanceof AmlError);
      assert.equal(error.diagnostics[0].code, "AML_SURFACE_APPEARANCE");
      assert.deepEqual(error.diagnostics[0].objects, ["receiver"]);
      assert.ok(error.diagnostics[0].source);
      assert.match(error.message, /appearance tint|pigment failure/);
      return true;
    });
    assert.deepEqual({ mesh: level.mesh, document: level.document, surfaces: level.surfaces }, before);
    assert.equal(level.generatedImages, undefined);
  }
  registerSurfaceChart(level, { ...plan, appearanceTint: () => [0.5, 0.5, 0.5] });
  await compileSurfaceAppearance(level, {}, 1_000);
  assert.ok(level.mesh.colors!.every(value => value === 0.5));
});

/** Recovers one affine scalar gradient in a triangle's actual world plane. */
function gradient(points: Vector3[], values: number[]): Vector3 {
  const a = points[1].clone().sub(points[0]), b = points[2].clone().sub(points[0]);
  const aa = a.dot(a), ab = a.dot(b), bb = b.dot(b), determinant = aa * bb - ab * ab;
  const da = values[1] - values[0], db = values[2] - values[0];
  return a.multiplyScalar((da * bb - db * ab) / determinant).add(b.multiplyScalar((db * aa - da * ab) / determinant));
}

/** Front-facing ray intersections distinguish a closed finish from a distant back face behind a slit. */
function rayHits(mesh: MeshData, origin: V3, direction: V3) {
  const start = new Vector3(...origin), ray = new Ray(start, new Vector3(...direction).normalize());
  return faces(mesh).flatMap(face => {
    const hit = ray.intersectTriangle(face.points[0], face.points[1], face.points[2], true, new Vector3());
    return hit ? [{ ...face, point: hit, distance: hit.distanceTo(start) }] : [];
  }).sort((a, b) => a.distance - b.distance);
}

test("finite coats preserve fine material contours and source UVs with real textured fracture walls", async () => {
  const level = await receiver(), physical = collisionMesh(level, true), original = structuredClone(level.architecture);
  const center = [0.437, 0.491], radius = (angle: number) => 0.15 + 0.009 * Math.sin(17 * angle) + 0.004 * Math.sin(53 * angle);
  const plan = chart((u, v) => {
    const angle = Math.atan2(v - center[1], u - center[0]);
    const exposed = Math.max(0, Math.min(1, 0.5 + (radius(angle) - Math.hypot(u - center[0], v - center[1])) / 0.004));
    return { layers: [
      { material: "coat", weight: 1 - exposed, uv: [2 * u + 0.13, 3 * v - 0.2] },
      { material: "backing", weight: exposed, uv: [4 * u + 0.2 * v + 0.27, 5 * v + 0.7] },
    ], height: 0 };
  });
  plan.featureScale = 0.008;
  plan.uniformCoverage = ([u0, v0, u1, v1]) => {
    const distance = Math.hypot((u0 + u1) / 2 - center[0], (v0 + v1) / 2 - center[1]);
    const extent = Math.hypot(u1 - u0, v1 - v0) / 2;
    return distance + extent < 0.134 || distance - extent > 0.166;
  };
  registerSurfaceChart(level, plan);
  await compileSurfaceAppearance(level, {}, 20_000);
  assert.deepEqual(collisionMesh(level, true), physical);
  assert.deepEqual(level.architecture, original);
  const emitted = faces(level.mesh), tops = emitted.filter(face => face.normal.z > 0.999999), rims = emitted.filter(face => Math.abs(face.normal.z) < 1e-6);
  assert.ok(tops.length > 0 && rims.length > 0, "Both plate surfaces and their physical fracture walls must exist");
  assert.ok(Math.abs(tops.reduce((sum, face) => sum + face.area, 0) - 1) < 1e-8, "Finite layers partition one complete opaque receiver");
  for (const face of tops) {
    const coat = level.surfaces[face.surface].material === "coat";
    for (const [corner, index] of face.indices.entries()) {
      const p = face.points[corner];
      assert.ok(Math.abs(p.z - (coat ? 0 : -0.006)) < 1e-10, "Each material owns its constant elevation, without a broad noisy shoulder");
      const expected = coat ? [2 * p.x + 0.13, 3 * p.y - 0.2] : [4 * p.x + 0.2 * p.y + 0.27, 5 * p.y + 0.7];
      assert.ok(expected.every((value, axis) => Math.abs(value - level.mesh.uv[index * 2 + axis]) < 1e-9));
      assert.ok(level.mesh.normals[index * 3 + 2] > 1 - 1e-9, "Flat plate normals cannot inherit the steep fracture wall normal");
    }
  }
  let rimArea = 0;
  for (const face of rims) {
    rimArea += face.area;
    assert.equal(level.surfaces[face.surface].material, "backing", "Fracture walls expose the lower backing material");
    assert.ok(face.points.every(p => p.z >= -0.006 - 1e-10 && p.z <= 1e-10));
    const uv = face.indices.map(index => level.mesh.uv.slice(index * 2, index * 2 + 2));
    const uvArea = Math.abs((uv[1][0] - uv[0][0]) * (uv[2][1] - uv[0][1]) - (uv[2][0] - uv[0][0]) * (uv[1][1] - uv[0][1])) / 2;
    assert.ok(Math.abs(uvArea / face.area - 20) < 1e-5, "Folded backing UVs retain the original affine scale and shear, with nonzero area");
    const uGradient = gradient(face.points, uv.map(value => value[0])), vGradient = gradient(face.points, uv.map(value => value[1]));
    assert.ok(Math.abs(uGradient.lengthSq() - 16.04) < 1e-5 && Math.abs(vGradient.lengthSq() - 25) < 1e-5
      && Math.abs(uGradient.dot(vGradient) - 1) < 1e-5,
    "Isometric folding preserves both anisotropic scales and shear, including the source height-normal metric");
    for (const index of face.indices) assert.ok(new Vector3(...level.mesh.normals.slice(index * 3, index * 3 + 3)).dot(face.normal) > 1 - 1e-9,
      "The fracture wall has its own outward geometric normal");
  }
  assert.ok(rimArea > 0.003, "The retained fine contour has a substantial 6mm sidewall, not a flat decal");
  for (let i = 0; i < 103; i++) {
    const angle = (i + 0.317) * 2 * Math.PI / 103;
    for (const offset of [-0.003, 0.003]) {
      const r = radius(angle) + offset, x = center[0] + r * Math.cos(angle), y = center[1] + r * Math.sin(angle);
      const hits = rayHits(level.mesh, [x, y, 1], [0, 0, -1]);
      assert.equal(hits.length, 1, "Fine damage has exactly one top surface at off-lattice points");
      assert.equal(level.surfaces[hits[0].surface].material, offset < 0 ? "backing" : "coat",
        "Centimeter and fine lobes remain within the existing 3mm contour acceptance bound");
    }
  }
});

test("finite plates retain mismatched source subdivisions with closed rims and bounded work", async () => {
  const level = await receiver(), originalPhysical = collisionMesh(level, true);
  const points: V3[] = [[0, 0, 0], [0.5, 0, 0], [0.5, 1, 0], [0, 1, 0], [1, 0, 0], [1, 1, 0], [0.5, 0.37, 0]];
  level.mesh = { positions: points.flat(), indices: [0, 1, 2, 0, 2, 3, 4, 5, 2, 4, 2, 6, 4, 6, 1],
    normals: points.flatMap(() => [0, 0, 1]), uv: points.flatMap(([x, y]) => [x, y]), colors: points.flatMap(() => [1, 1, 1]),
    surfaces: Array(5).fill(0), solidIds: Array(5).fill("receiver") };
  let samples = 0;
  for (const right of [false, true]) {
    const plan = chart((u, v) => {
      samples++;
      return { layers: [{ material: "coat", weight: right ? 0 : 1, uv: [u, v] },
        { material: "backing", weight: right ? 1 : 0, uv: [u, v] }], height: 0 };
    });
    plan.id = right ? "right" : "left";
    plan.firstTriangle = right ? 2 : 0;
    plan.triangleCount = right ? 3 : 2;
    plan.bounds = right ? [0.5, 0, 1, 1] : [0, 0, 0.5, 1];
    plan.uniformCoverage = () => true;
    registerSurfaceChart(level, plan);
  }
  await compileSurfaceAppearance(level, {}, 1_000);
  const emitted = faces(level.mesh), rims = emitted.filter(face => Math.abs(face.normal.z) < 1e-6);
  assert.deepEqual(collisionMesh(level, true), originalPhysical);
  assert.ok(Math.abs(rims.reduce((sum, face) => sum + face.area, 0) - 0.006) < 1e-10,
    "Every segment of the source T-junction receives exactly one full-depth fracture wall");
  assert.ok(rims.every(face => face.normal.x > 0.999999 && face.points.every(point => Math.abs(point.x - 0.5) < 1e-10)));
  for (const y of [0.017, 0.19, 0.37 - 1e-5, 0.37 + 1e-5, 0.79, 0.983]) {
    const hits = rayHits(level.mesh, [0.6, y, -0.003], [-1, 0, 0]);
    assert.equal(hits.length, 1);
    assert.ok(Math.abs(hits[0].distance - 0.1) < 1e-10);
  }
  assert.ok(emitted.length <= 32 && samples < 1_000,
    `Constant finite plates must stay coarse while preserving construction joins: ${emitted.length} triangles, ${samples} samples`);
});

test("finite layers select their own authored height and reject malformed offsets atomically", async () => {
  const level = await receiver(`<material id="coat" height-texture="coat.png" height-scale="0.02" height-offset="0.001"/>
    <material id="backing" height-texture="backing.png" height-scale="0.01" height-offset="0.002"/>`);
  let reads = 0;
  const resolveMaterialImage = async (reference: string) => {
    reads++;
    const png = new PNG({ width: 2, height: 2 });
    for (let i = 0; i < 4; i++) png.data.set([reference === "coat.png" ? 128 : 255, 17, 240, 255], i * 4);
    return new Uint8Array(PNG.sync.write(png));
  };
  const plan = chart((u, v) => ({ layers: [
    { material: "coat", weight: 1 - u, uv: [u, v] }, { material: "backing", weight: u, uv: [u, v] },
  ], height: 0.002 }));
  const before = structuredClone(level.mesh);
  for (const offsets of [[], [0], [0, NaN], [0, Infinity]]) {
    registerSurfaceChart(level, { ...plan, layerElevations: offsets });
    await assert.rejects(compileSurfaceAppearance(level, { resolveMaterialImage }, 10_000), /layer|elevation/i);
    assert.deepEqual(level.mesh, before);
    assert.equal(reads, 0, "Invalid layer plans fail before image IO");
  }
  registerSurfaceChart(level, plan);
  await compileSurfaceAppearance(level, { resolveMaterialImage }, 10_000);
  for (const u of [0.13, 0.37, 0.61, 0.89]) {
    const hits = rayHits(level.mesh, [u, 0.317, 1], [0, 0, -1]);
    assert.equal(hits.length, 1);
    const expected = u < 0.5 ? 0.002 + 0.001 + 128 / 255 * 0.02 : 0.002 - 0.006 + 0.002 + 0.01;
    assert.ok(Math.abs(hits[0].point.z - expected) < 1e-9, "Source height belongs to the selected plate instead of blending across its physical fracture");
  }
});

test("finite offsets and shared relief obey the total elevation envelope with matching fracture depth", async () => {
  const level = await receiver(), physical = collisionMesh(level, true);
  const plan = chart((u, v) => ({ layers: [
    { material: "coat", weight: 1 - u, uv: [u, v] }, { material: "backing", weight: u, uv: [u, v] },
  ], height: 0.002 }));
  plan.elevationRange = [-0.003, 0.001];
  plan.uniformCoverage = ([left, , right]) => right <= 0.5 || left >= 0.5;
  registerSurfaceChart(level, plan);
  await compileSurfaceAppearance(level, {}, 1_000);
  const emitted = faces(level.mesh), tops = emitted.filter(face => face.normal.z > 0.999999);
  const rims = emitted.filter(face => Math.abs(face.normal.z) < 1e-6);
  assert.deepEqual(collisionMesh(level, true), physical);
  assert.ok(Math.abs(tops.reduce((sum, face) => sum + face.area, 0) - 1) < 1e-10);
  for (const u of [0.173, 0.371, 0.613, 0.891]) {
    const hits = rayHits(level.mesh, [u, 0.317, 1], [0, 0, -1]);
    assert.equal(hits.length, 1);
    assert.ok(Math.abs(hits[0].point.z - (u < 0.5 ? 0.001 : -0.003)) < 1e-10,
      "The envelope bounds shared relief plus the selected constant plate offset");
  }
  assert.ok(Math.abs(rims.reduce((sum, face) => sum + face.area, 0) - 0.004) < 1e-10,
    "The fracture wall meets both clamped plates with their actual 4mm separation");
});

test("finite thickness taper stays independent of authored height and obeys the total envelope", async () => {
  const pixel = new PNG({ width: 1, height: 1 }); pixel.data.set([0, 17, 240, 255]);
  const bytes = new Uint8Array(PNG.sync.write(pixel));
  for (const bounded of [false, true]) {
    const level = await receiver(`<material id="coat" height-texture="coat.png" height-scale="0" height-offset="0.002"/>
      <material id="backing" height-texture="backing.png" height-scale="0" height-offset="0.004"/>`);
    const physical = collisionMesh(level, true), document = structuredClone(level.architecture);
    const plan = chart((u, v) => ({ layers: [
      { material: "coat", weight: 1 - u, uv: [u, v] }, { material: "backing", weight: u, uv: [u, v] },
    ], height: 0.001, layerElevationWeight: u, heightWeight: 0.25 + 0.5 * v }));
    plan.layerElevations = [0.006, -0.004];
    plan.uniformCoverage = ([left, , right]) => right <= 0.5 || left >= 0.5;
    plan.constructionCuts = { u: [0.5], v: [] };
    if (bounded) plan.elevationRange = [-0.001, 0.004];
    registerSurfaceChart(level, plan);
    await compileSurfaceAppearance(level, { resolveMaterialImage: async () => bytes }, 2_000);
    assert.deepEqual(collisionMesh(level, true), physical);
    assert.deepEqual(level.architecture, document);
    const expected = (u: number, v: number, coat: boolean) => {
      const height = 0.001 + (coat ? 0.006 : -0.004) * u + (coat ? 0.002 : 0.004) * (0.25 + 0.5 * v);
      return bounded ? Math.max(-0.001, Math.min(0.004, height)) : height;
    };
    let topArea = 0;
    for (const face of faces(level.mesh).filter(face => face.normal.z > 0.9)) {
      const material = level.document.materials.find(item => item.id === level.surfaces[face.surface].material)!;
      const coat = material.heightTexture === "coat.png";
      assert.ok(coat || material.heightTexture === "backing.png");
      topArea += face.area * face.normal.z;
      for (const [corner, index] of face.indices.entries()) {
        const point = face.points[corner];
        assert.ok(Math.abs(point.z - expected(point.x, point.y, coat)) < 1e-9,
          "Plate thickness and source height use independent weights before the total height clamp");
        assert.ok(Math.abs(level.mesh.uv[index * 2] - point.x) < 1e-9 && Math.abs(level.mesh.uv[index * 2 + 1] - point.y) < 1e-9);
        if (!bounded) {
          const normal = new Vector3(coat ? -0.006 : 0.004, coat ? -0.001 : -0.002, 1).normalize();
          assert.ok(normal.dot(new Vector3(...level.mesh.normals.slice(index * 3, index * 3 + 3))) > 1 - 1e-9,
            "Normals include the thickness-taper slope and the independently weighted source-height slope exactly once");
        }
      }
    }
    assert.ok(Math.abs(topArea - 1) < 1e-8);
    for (const u of [0.113, 0.373, 0.617, 0.913]) for (const v of [0.071, 0.419, 0.937]) {
      const hits = rayHits(level.mesh, [u, v, 1], [0, 0, -1]);
      assert.equal(hits.length, 1);
      assert.ok(Math.abs(hits[0].point.z - expected(u, v, u < 0.5)) <= 0.00035 + 1e-9,
        "Off-lattice interpolation respects the same authored total elevation within the existing 0.35mm bound");
    }
  }
});

test("invalid finite thickness weights reject the whole appearance and permit subsequent recovery", async () => {
  const level = await receiver(), before = structuredClone({ mesh: level.mesh, document: level.document, surfaces: level.surfaces });
  for (const invalid of [NaN, -0.01, 1.01]) {
    const plan = chart((u, v) => ({ layers: [
      { material: "coat", weight: 1 - u, uv: [u, v] }, { material: "backing", weight: u, uv: [u, v] },
    ], height: 0, layerElevationWeight: u > 0.75 ? invalid : 0.5 }));
    registerSurfaceChart(level, plan);
    await assert.rejects(compileSurfaceAppearance(level, {}, 1_000), /elevation weight/i);
    assert.deepEqual({ mesh: level.mesh, document: level.document, surfaces: level.surfaces }, before,
      "A later invalid field sample cannot publish part of the new finish");
  }
  const plan = chart((u, v) => ({ layers: [
    { material: "coat", weight: 1 - u, uv: [u, v] }, { material: "backing", weight: u, uv: [u, v] },
  ], height: 0, layerElevationWeight: 0.5 }));
  plan.uniformCoverage = ([left, , right]) => right <= 0.5 || left >= 0.5;
  registerSurfaceChart(level, plan);
  await compileSurfaceAppearance(level, {}, 1_000);
  assert.ok(Math.abs(rayHits(level.mesh, [0.731, 0.317, 1], [0, 0, -1])[0].point.z + 0.003) < 1e-10,
    "A valid next finish still commits its independently weighted 3mm plate");
});

test("authored recessed wall finishes close native concave corners without duplicating retained caps", async () => {
  const base = `<architecture version="1" id="native-corner"><material id="finish"/>
    <path id="axis" points="0 0 0; 2 0 0; 2 2 0"/><wall id="wall" path="axis" thickness="0.2" height="1" material="finish"/></architecture>`;
  const baseline = successful(await compile(parseAml(base), { navigation: false }));
  const document = parseAml(base.replace('<material id="finish"/>', '<material id="finish" height-texture="height.png" height-scale="0" height-offset="-0.006"/>')
    .replace('</architecture>', '<dressing seed="corner" grime="0" wear="0" detail="low"><wall host="wall" material="finish" face="side" windows="false" tile-share="0"/></dressing></architecture>'));
  const original = structuredClone(document), pixel = new PNG({ width: 1, height: 1 }); pixel.data.set([0, 0, 0, 255]);
  const level = successful(await compile(document, { navigation: false, resolveMaterialImage: async () => new Uint8Array(PNG.sync.write(pixel)) }));
  assert.deepEqual(document, original);
  assert.equal(level.physicalHash, baseline.physicalHash);
  assert.deepEqual(collisionMesh(level, true), collisionMesh(baseline, true));
  for (const z of [0.173, 0.371, 0.713]) for (const offset of [-0.004, -0.002, 0, 0.002, 0.004]) {
    const origin: V3 = [1.88 + offset, 0.12 + offset, z];
    assert.ok(rayHits(baseline.mesh, origin, [1, -1, 0])[0]?.distance < 0.04);
    const hits = rayHits(level.mesh, origin, [1, -1, 0]);
    assert.ok(hits[0]?.distance < 0.05, `The recessed inner corner retains a front-facing near wall, not a slit or far backing: z=${z},offset=${offset}`);
  }
  const capArea = (mesh: MeshData) => faces(mesh).filter(face => face.normal.z > 0.999999 && face.points.every(p => Math.abs(p.z - 1) < 1e-8))
    .reduce((sum, face) => sum + face.area, 0);
  assert.ok(Math.abs(capArea(level.mesh) - capArea(baseline.mesh)) < 1e-8, "Unchanged native caps cannot acquire coplanar duplicate rim faces");
});

test("positive authored wall height closes the three-face corner beside an unchanged native top cap", async () => {
  const base = `<architecture version="1" id="raised-native-corner"><material id="finish"/>
    <path id="axis" points="0 0 0; 2 0 0"/><wall id="wall" path="axis" thickness="0.2" height="1" material="finish"/></architecture>`;
  const baseline = successful(await compile(parseAml(base), { navigation: false }));
  const document = parseAml(base.replace('<material id="finish"/>', '<material id="finish" height-texture="height.png" height-scale="0" height-offset="0.006"/>')
    .replace('</architecture>', '<dressing seed="corner" grime="0" wear="0" detail="low"><wall host="wall" material="finish" face="side" windows="false" tile-share="0"/></dressing></architecture>'));
  const original = structuredClone(document), pixel = new PNG({ width: 1, height: 1 }); pixel.data.set([0, 0, 0, 255]);
  const level = successful(await compile(document, { navigation: false, resolveMaterialImage: async () => new Uint8Array(PNG.sync.write(pixel)) }));
  assert.deepEqual(document, original);
  assert.equal(level.physicalHash, baseline.physicalHash);
  assert.deepEqual(collisionMesh(level, true), collisionMesh(baseline, true));
  for (const [dx, dy] of [[0.0011, 0.0017], [0.0023, 0.0011], [0.0013, 0.0031], [0.002, -0.002], [-0.002, 0.002], [-0.002, -0.002]]) {
    const hits = rayHits(level.mesh, [2 + dx, -0.1 - dy, 1.02], [0, 0, -1]);
    assert.ok(hits[0] && Math.abs(hits[0].point.z - 1) < 1e-7,
      `Raised side finishes keep a near top closure at the outer native miter: ${dx},${dy}`);
    assert.equal(hits.filter(hit => Math.abs(hit.point.z - 1) < 1e-7).length, 1,
      "The corner patch and its retained cap have one visible top surface");
  }
});

/** Small independent triangles for adjacency, orientation and ownership checks. */
function junctionFace(base: V3[], height: number, surface: number, host = "wall", solidId = "solid"): SurfaceJunctionFace {
  return { base, positions: base.map(([x, y, z]) => [x, y, z + height]),
    uv: base.map(([x, y]) => [2 * x + 0.3 * y, 3 * y]), colors: base.map(() => [1, 1, 1]), surface, host, solidId };
}

async function closure(input: SurfaceJunctionFace[], maximumTriangles = 100) {
  const mesh: MeshData = { positions: [], indices: [], normals: [], uv: [], colors: [], surfaces: [], solidIds: [] };
  const junctions = new SurfaceJunctions({ ...mesh, positions: input.flatMap(face => face.base.flat()) }, maximumTriangles);
  for (const face of input) junctions.add(face);
  await junctions.finish(mesh);
  return mesh;
}

/** A closed source fan at a convex corner, with two raised walls and an unchanged top cap. */
function raisedCorner(splitCap = false): SurfaceJunctionFace[] {
  const origin: V3 = [0, 0, 0], a: V3 = [0, -1, 0], b: V3 = [0, 0, -1], c: V3 = [-1, 0, 0];
  const bases = [[origin, a, b], [origin, b, c], [origin, c, a]], offsets = [[0.006, 0, 0], [0, 0.006, 0], [0, 0, 0]];
  const result: SurfaceJunctionFace[] = bases.map((base, side) => ({ base,
    positions: base.map(point => point.map((value, axis) => value + offsets[side][axis]) as V3),
    uv: base.map(([x, y, z]) => side === 0 ? [2 * y, 3 * z] : side === 1 ? [2 * x, 3 * z] : [2 * x + 0.3 * y, 3 * y]),
    colors: base.map(() => side === 2 ? [0.3, 0.5, 0.7] : [1, 0.2, 0.2]), surface: side, host: "corner", solidId: "corner" }));
  if (!splitCap) return result;
  const d: V3 = [-1 + 1e-9, -1e-9, 0];
  const top = (base: V3[]): SurfaceJunctionFace => ({ ...result[2], base, positions: base,
    uv: base.map(([x, y]) => [2 * x + 0.3 * y, 3 * y]) });
  return [result[1], top([origin, c, d]), top([origin, d, a]), result[0]];
}

/** Adds unchanged source triangles for ray checks against the complete finished receiver. */
function joinedScene(joined: MeshData, source: SurfaceJunctionFace[]): MeshData {
  const output = structuredClone(joined);
  for (const face of source) {
    const start = output.positions.length / 3;
    const [a, b, c] = face.positions.map(point => new Vector3(...point));
    const normal = b.sub(a).cross(c.sub(a)).normalize().toArray();
    output.positions.push(...face.positions.flat()); output.indices.push(start, start + 1, start + 2);
    output.normals.push(...normal, ...normal, ...normal); output.uv.push(...face.uv.flat()); output.colors!.push(...face.colors.flat());
    output.surfaces.push(face.surface); output.solidIds!.push(face.solidId);
  }
  return output;
}

test("three-face corner caps close exposed vertex gaps with source UVs and without filling ambiguous fans", async () => {
  const transforms = [new Matrix4(), new Matrix4().makeRotationY(0.31).multiply(new Matrix4().makeRotationZ(0.47)).setPosition(17, -23, 5)];
  for (const splitCap of [false, true]) for (const transform of transforms) {
    const original = raisedCorner(splitCap);
    const source = original.map(face => ({ ...face,
      base: face.base.map(point => new Vector3(...point).applyMatrix4(transform).toArray() as V3),
      positions: face.positions.map(point => new Vector3(...point).applyMatrix4(transform).toArray() as V3),
    }));
    const snapshot = structuredClone(source), joined = await closure(source), inverse = transform.clone().invert();
    assert.deepEqual(source, snapshot);
    const normal = new Vector3(0, 0, 1).transformDirection(transform);
    const caps = faces(joined).filter(face => face.points.every(point => {
      const local = point.clone().applyMatrix4(inverse);
      return Math.abs(local.z) < 1e-10 && local.x >= -1e-10 && local.y >= -1e-10;
    }));
    assert.ok(Math.abs(caps.reduce((sum, face) => sum + face.area, 0) - 0.006 ** 2 / 2) < 1e-10,
      "The exposed corner has its independently known 18mm² triangular cap, with no overlap");
    for (const cap of caps) {
      assert.ok(cap.normal.dot(normal) > 1 - 1e-9);
      assert.equal(cap.surface, 2, "The unchanged top plane supplies the outward cap's source material");
      for (const [corner, index] of cap.indices.entries()) {
        const local = cap.points[corner].clone().applyMatrix4(inverse), expected = [2 * local.x + 0.3 * local.y, 3 * local.y];
        assert.ok(expected.every((value, axis) => Math.abs(value - joined.uv[index * 2 + axis]) < 1e-9));
        assert.deepEqual(joined.colors!.slice(index * 3, index * 3 + 3), [0.3, 0.5, 0.7]);
      }
    }
    const scene = joinedScene(joined, source), direction = normal.clone().negate().toArray() as V3;
    for (const [x, y] of [[0.002, 0.002], [0.002, -0.002], [-0.002, 0.002], [-0.002, -0.002]]) {
      const origin = new Vector3(x, y, 0.02).applyMatrix4(transform).toArray() as V3;
      const hits = rayHits(scene, origin, direction);
      assert.equal(hits.length, 1);
      assert.ok(Math.abs(hits[0].distance - 0.02) < 1e-9);
    }
    await assert.rejects(closure(source, joined.surfaces.length - 1), /triangle budget/i,
      "Vertex caps count toward the same final geometry budget as edge strips");
  }
  const source = raisedCorner();
  for (const ambiguous of [source.slice(0, 2), [...source, source[0]],
    source.map((face, index) => ({ ...face, solidId: index === 2 ? "other" : "corner" })),
    source.map((face, index) => ({ ...face, solidId: "", host: index === 2 ? "other" : "corner" })),
  ]) {
    const joined = await closure(ambiguous);
    assert.equal(rayHits(joined, [0.002, 0.002, 0.02], [0, 0, -1]).length, 0,
      "An open, nonmanifold or mixed-owner source fan cannot invent a closing cap");
  }
  assert.ok((await closure(source)).surfaces.length > 0, "Valid corner closure remains available after failed-budget and ambiguous work");
});

test("a displaced closed-looking loop cannot cap an originally open four-face source fan", async () => {
  const origin: V3 = [0, 0, 0];
  const radial: V3[] = Array.from({ length: 5 }, (_, i) => [Math.cos(i * Math.PI / 3), Math.sin(i * Math.PI / 3), -1]);
  const source: SurfaceJunctionFace[] = Array.from({ length: 4 }, (_, i) => {
    const base: V3[] = [origin, radial[i], radial[i + 1]];
    const normal = new Vector3(...radial[i]).cross(new Vector3(...radial[i + 1])).normalize();
    const height = i === 1 || i === 2 ? 0.006 : 0;
    return { base, positions: base.map(point => new Vector3(...point).addScaledVector(normal, height).toArray() as V3),
      uv: base.map(([x, y]) => [x, y]), colors: base.map(() => [1, 1, 1]), surface: i, solidId: "open", host: "open" };
  });
  const joined = await closure(source);
  const p = new Vector3(...source[1].positions[0]), q = new Vector3(...source[2].positions[0]);
  const capNormal = p.clone().cross(q).normalize();
  const capLike = faces(joined).filter(face => Math.abs(face.normal.dot(capNormal)) > 1 - 1e-10
    && face.points.every(point => Math.abs(point.dot(capNormal)) < 1e-10));
  assert.equal(capLike.length, 0,
    "Coincident unchanged endpoints do not close the unmatched first and last native source edges");
  assert.ok(faces(joined).length > 0, "Legitimate pairwise strips remain on the open fan");
});

test("nonplanar four-face corner caps preserve physical texture scale on each actual triangle", async () => {
  const origin: V3 = [0, 0, 0];
  const radial: V3[] = Array.from({ length: 4 }, (_, i) => [Math.cos(i * Math.PI / 2), Math.sin(i * Math.PI / 2), -1]);
  const source: SurfaceJunctionFace[] = radial.map((point, i) => {
    const base: V3[] = [origin, point, radial[(i + 1) % 4]];
    const u = new Vector3(...point).normalize(), normal = new Vector3(...point).cross(new Vector3(...base[2])).normalize();
    const v = normal.clone().cross(u), height = [0.002, 0.006, 0.004, 0.007][i];
    return { base, positions: base.map(point => new Vector3(...point).addScaledVector(normal, height).toArray() as V3),
      uv: base.map(point => { const p = new Vector3(...point); return [p.dot(u), p.dot(v)]; }),
      colors: base.map(() => [1, 1, 1]), surface: i, solidId: "cone", host: "cone" };
  });
  const joined = await closure(source);
  const caps = faces(joined).filter(face => face.points.every(point => point.length() < 0.01));
  assert.ok(caps.length > 0, "Unequal offsets require a real corner cap");
  for (const point of source.map(face => new Vector3(...face.positions[0])))
    assert.ok(caps.some(face => face.points.some(corner => corner.distanceTo(point) < 1e-10)),
      "Every offset plate endpoint remains on the completed nonplanar cap");
  for (const cap of caps) {
    const uv = cap.indices.map(index => joined.uv.slice(index * 2, index * 2 + 2));
    const du = gradient(cap.points, uv.map(value => value[0])), dv = gradient(cap.points, uv.map(value => value[1]));
    assert.ok(Math.abs(du.lengthSq() - 1) < 1e-8 && Math.abs(dv.lengthSq() - 1) < 1e-8 && Math.abs(du.dot(dv)) < 1e-8,
      "Each actual cap triangle retains orthonormal meter UVs instead of projection shrinkage from a loop-average plane");
    for (const index of cap.indices)
      assert.ok(new Vector3(...joined.normals.slice(index * 3, index * 3 + 3)).dot(cap.normal) > 1 - 1e-9);
  }
});

/** Two vertical native faces at a right-angle edge, displaced along their own outward normals. */
function cornerFaces(concave: boolean, firstHeight: number, secondHeight: number): SurfaceJunctionFace[] {
  const bases: V3[][] = concave
    ? [[[0, 0, 1], [0, 0, 0], [-1, 0, 0]], [[0, 0, 0], [0, 0, 1], [0, 1, 0]]]
    : [[[0, 0, 0], [0, 0, 1], [1, 0, 0]], [[0, 0, 1], [0, 0, 0], [0, -1, 0]]];
  return bases.map((base, side) => ({ base,
    positions: base.map(([x, y, z]) => [x - (side ? secondHeight : 0), y + (side ? 0 : firstHeight), z]),
    uv: base.map(([x, y, z]) => [2 * (side ? y : x), 3 * z]), colors: base.map(() => [1, 1, 1]),
    surface: side, host: "corner", solidId: "corner" }));
}

test("corner closures distinguish exposed concave gaps, internal convex recesses and signed relief", async () => {
  const concave = await closure(cornerFaces(true, -0.006, -0.006));
  const expectedArea = Math.hypot(0.006, 0.006);
  assert.ok(Math.abs(faces(concave).reduce((sum, face) => sum + face.area, 0) - expectedArea) < 1e-12);
  assert.ok(faces(concave).every(face => face.normal.dot(new Vector3(-1, 1, 0).normalize()) > 1 - 1e-10));
  assert.equal((await closure(cornerFaces(false, -0.006, -0.006))).surfaces.length, 0,
    "Recessed convex faces already overlap inside the solid; an inward bridge would add a false surface");
  assert.equal((await closure(cornerFaces(true, 0, 0))).surfaces.length, 0, "Unchanged native corners need no new geometry");
  const signed = await closure(cornerFaces(true, 0.004, -0.006));
  const expectedNormal = new Vector3(0.004, 0.006, 0).normalize();
  assert.ok(Math.abs(faces(signed).reduce((sum, face) => sum + face.area, 0) - Math.hypot(0.004, 0.006)) < 1e-12);
  assert.ok(faces(signed).every(face => face.normal.dot(expectedNormal) > 1 - 1e-10));
  const origin = new Vector3(0.003, 0.002, 0.371).addScaledVector(expectedNormal, 0.02);
  const hits = rayHits(signed, origin.toArray() as V3, expectedNormal.clone().negate().toArray() as V3);
  assert.equal(hits.length, 1);
  assert.ok(Math.abs(hits[0].distance - 0.02) < 1e-12, "Mixed positive and negative relief still closes its actually exposed gap");
});

test("junctions close only real paired gaps within one source owner and charge their triangles", async () => {
  const left = junctionFace([[-1, 0, 0], [0, 0, 0], [0, 1, 0]], 0, 0);
  const right = junctionFace([[0, 1, 0], [0, 0, 0], [1, 0, 0]], -0.006, 1);
  const valid = await closure([left, right]);
  assert.ok(Math.abs(faces(valid).reduce((sum, face) => sum + face.area, 0) - 0.006) < 1e-12);
  assert.ok(faces(valid).every(face => face.normal.x > 0.999999 && face.surface === 1));
  for (const unrelated of [
    { ...right, solidId: "other" },
    { ...right, solidId: "", host: "other" },
    { ...right, base: right.base.map(([x, y, z]) => [x + 0.0000004, y, z] as V3) },
  ]) assert.equal((await closure([{ ...left, solidId: unrelated.solidId === "" ? "" : left.solidId }, unrelated])).surfaces.length, 0,
    "Different solids, untagged hosts and nearby submicron edges must not be bridged");
  assert.equal((await closure([left, right, { ...right, surface: 2 }])).surfaces.length, 0,
    "A third source owner invalidates a formerly paired edge instead of creating an arbitrary closure");
  await assert.rejects(closure([left, right], 1), /triangle budget/i);
  assert.ok((await closure([left, right])).surfaces.length > 0, "Valid subsequent work remains usable after budget failure");
});
