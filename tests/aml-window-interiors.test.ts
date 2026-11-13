import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Matrix4, Ray, Vector3 } from "three";
import { compile, parseAml, serializeAml, collisionMesh, AmlError, toGLB, toGLTF, toOBJ } from "levelspec";
import { exportLevel } from "levelspec/export";
import { buildQuakeMap } from "../src/export/vector/bsp.ts";
import { toRuntime } from "../src/vector/export.ts";
import { validateBytes } from "gltf-validator";

import { KitMesh } from "../src/dressing/kit-mesh.ts";
import { kitFinishes, kitMaterials } from "../src/dressing/kit.ts";
import { Pen } from "../src/dressing/pen.ts";
import { Rng } from "../src/generate/rng.ts";
import { windowUnit } from "../src/dressing/kowloon/windows.ts";

type Level = Awaited<ReturnType<typeof compile>>;

/** Prepares only structural triangles once, keeping the ray survey independent of dressing tessellation density. */
function structuralTriangles(level: Level) {
  const triangles: { points: Vector3[]; material: string; tint: number[] }[] = [];
  for (let t = 0; t < level.mesh.surfaces.length; t++) {
    const surface = level.surfaces[level.mesh.surfaces[t]];
    if (!["building/$dressing/envelope", "building/$dressing/openings"].includes(surface.object)) continue;
    triangles.push({ points: level.mesh.indices.slice(t * 3, t * 3 + 3).map(i => new Vector3(...level.mesh.positions.slice(i * 3, i * 3 + 3))), material: surface.material, tint: level.mesh.colors!.slice(level.mesh.indices[t * 3] * 3, level.mesh.indices[t * 3] * 3 + 3) });
  }
  return triangles;
}

/** Returns the first visible structural crossing; optional exterior props cannot mask a false window recess. */
function crossing(triangles: ReturnType<typeof structuralTriangles>, origin: Vector3, direction: Vector3) {
  const ray = new Ray(origin, direction.normalize());
  let first: { point: Vector3; normal: Vector3; distance: number; material: string; tint: number[] } | undefined;
  const point = new Vector3();
  for (const { points: [a, b, c], material, tint } of triangles) {
    if (!ray.intersectTriangle(a, b, c, false, point)) continue;
    const distance = point.distanceTo(origin);
    if (!first || distance < first.distance) first = { point: point.clone(), normal: b.clone().sub(a).cross(c.clone().sub(a)).normalize(), distance, material, tint };
  }
  return first;
}

test("building windows expose real dark chambers and preserve geometry between day and night", async () => {
  const xml = await readFile(new URL("./fixtures/aml/window-interiors.aml", import.meta.url), "utf8");
  const source = parseAml(xml);
  const before = serializeAml(source);
  const day = await compile(source, { navigation: false });
  const night = await compile(parseAml(xml.replace('time-of-day="day"', 'time-of-day="night"')), { navigation: false });
  for (const level of [day, night]) assert.deepEqual(level.diagnostics.filter(d => d.severity === "error"), []);
  assert.equal(serializeAml(source), before);
  assert.deepEqual(day.mesh, night.mesh, "Lighting must not reshuffle households, curtains, frames or geometry");
  assert.equal(day.physicalHash, night.physicalHash);
  assert.notEqual(day.renderHash, night.renderHash);
  assert.equal(parseAml(xml.replace(' time-of-day="day"', "")).dressing?.timeOfDay, "day");
  assert.deepEqual(collisionMesh(day, true), collisionMesh(night, true));
  assert.equal(day.document.materials.find(m => m.id === "$kowloon/interior-lit")?.emissiveStrength, 0);
  assert.ok(night.document.materials.find(m => m.id === "$kowloon/interior-lit")!.emissiveStrength! > 0);
  assert.equal(toRuntime(night).timeOfDay, "night");
  const dayExport = JSON.parse(toGLTF(day)["building-structure.gltf"] as string);
  assert.deepEqual(dayExport.materials.find((m: { name: string }) => m.name === "$kowloon/interior-lit").emissiveFactor, [0, 0, 0]);
  assert.equal(parseAml(serializeAml(night.architecture)).dressing?.timeOfDay, "night");
  const triangles = structuralTriangles(day);
  const visibleBacks = new Set<string>();
  let obliqueReveal = false;
  for (let x = 0.3; x < 4.7; x += 0.071) for (let z = 3.5; z < 5.8; z += 0.113) {
    const hit = crossing(triangles, new Vector3(x, -1, z), new Vector3(0, 1, 0));
    if (hit && Math.abs(hit.point.y - 0.417) < 0.002) {
      assert.ok(hit.normal.y < -0.99, "Room back faces away from the exterior");
      const finish = day.document.materials.find(m => m.id === hit.material)!;
      assert.equal(finish.color, "#ffffff");
      assert.ok(Math.max(...hit.tint) < 0.02, "Room back must remain dark in daylight");
      assert.ok(finish.roughness >= 0.8);
      visibleBacks.add(hit.material);
    }
    const angled = crossing(triangles, new Vector3(x - 0.7, -1, z), new Vector3(0.7, 1, 0));
    if (angled && angled.point.y > 0.2 && angled.point.y < 0.4 && Math.abs(angled.normal.x) > 0.99) {
      assert.ok(angled.normal.dot(new Vector3(0.7, 1, 0)) < 0, "Side return faces away from the aperture");
      obliqueReveal = true;
    }
  }
  assert.ok(visibleBacks.has("$kowloon/pane"), "Unlit chambers must be visible through open frame lights");
  assert.ok(visibleBacks.has("$kowloon/interior-lit"), "Occupied chambers must remain dark and visible by day");
  assert.ok(obliqueReveal, "An oblique exterior view must reach a room's side return");
  for (const id of visibleBacks) assert.equal(day.document.materials.find(m => m.id === id)?.texture, undefined);
});

/** A minimal solid isolates material transport from the procedural building's appearance workload. */
function materialSource(attributes: string) {
  return `<architecture version="1" id="emission" validation="premap"><material id="warm" color="#ffffff" ${attributes}/><box id="wall" width="1" depth="1" height="1" material="warm"/></architecture>`;
}

test("emissive materials round-trip and export linear radiance without changing collision", async () => {
  const document = parseAml(materialSource('emissive="#ff8040" emissive-strength="3"'));
  const roundtrip = parseAml(serializeAml(document));
  assert.equal(roundtrip.materials[0].emissive, "#ff8040");
  assert.equal(roundtrip.materials[0].emissiveStrength, 3);
  const level = await compile(roundtrip, { navigation: false });
  const plain = await compile(parseAml(materialSource("")), { navigation: false });
  assert.equal(level.physicalHash, plain.physicalHash);
  assert.notEqual(level.renderHash, plain.renderHash);
  assert.deepEqual(collisionMesh(level, true), collisionMesh(plain, true));
  const exported = JSON.parse(toGLTF(level)["emission.gltf"] as string);
  const material = exported.materials.find((m: { name: string }) => m.name === "warm");
  assert.ok(Math.abs(material.emissiveFactor[1] - 0.2158605) < 1e-6);
  assert.ok(Math.abs(material.emissiveFactor[2] - 0.05126946) < 1e-6);
  assert.equal(material.emissiveFactor[0], 1);
  assert.equal(material.extensions.KHR_materials_emissive_strength.emissiveStrength, 3);
  assert.ok(exported.extensionsUsed.includes("KHR_materials_emissive_strength"));
  assert.equal(toRuntime(level).materials.find(m => m.id === "warm")?.emissiveStrength, 3);
  assert.throws(() => toOBJ(level), /Emissive materials/);
  for (const format of ["fbx", "bsp"] as const)
    await assert.rejects(exportLevel(level, { formats: [format], output: "generated/unsupported-emission-export" }), /Emissive materials/);
  await assert.rejects(buildQuakeMap(level, {}, "emission"), /Emissive materials/);
  for (const strength of [undefined, 0.5]) {
    const attributes = `emissive="#ff8040" ${strength === undefined ? "" : `emissive-strength="${strength}"`}`;
    const variant = await compile(parseAml(materialSource(attributes)), { navigation: false });
    const gltf = JSON.parse(toGLTF(variant)["emission.gltf"] as string);
    const finish = gltf.materials.find((m: { name: string }) => m.name === "warm");
    assert.ok(Math.abs(finish.emissiveFactor[1] - 0.2158605 * (strength ?? 1)) < 1e-6);
    assert.equal(finish.extensions, undefined, "Core-range emission should not require an optional extension");
  }
  const report = await validateBytes(new Uint8Array(toGLB(level)), { maxIssues: 20 });
  assert.equal(report.issues.numErrors, 0, JSON.stringify(report.issues));
});

test("invalid emissive channels and time-of-day fail at their source", async () => {
  const invalid = [
    { attributes: 'emissive="orange"', material: { emissive: "orange" } },
    { attributes: 'emissive="#ffffff" emissive-strength="-1"', material: { emissive: "#ffffff", emissiveStrength: -1 } },
    { attributes: 'emissive-strength="2"', material: { emissiveStrength: 2 } },
  ];
  for (const { attributes, material } of invalid) {
    assert.throws(() => parseAml(materialSource(attributes)), (error: unknown) => error instanceof AmlError && error.diagnostics.some(d => d.code === "AML_MATERIAL" && Boolean(d.source) && d.objects.includes("warm")));
    const native = parseAml(materialSource(""));
    Object.assign(native.materials[0], material);
    await assert.rejects(compile(native, { navigation: false }), (error: unknown) => error instanceof AmlError && error.diagnostics.some(d => d.code === "AML_MATERIAL" && Boolean(d.source) && d.objects.includes("warm")));
  }
  assert.throws(() => parseAml(materialSource("").replace('</architecture>', '<dressing seed="a" time-of-day="dusk"/></architecture>')), /day|night/);
});


test("casements use transparent leaves and stay shut behind fixed exterior guards", async () => {
  for (const fixed of [false, true]) {
    const level = await compile(parseAml(materialSource("")), { navigation: false });
    level.mesh.colors = Array(level.mesh.positions.length).fill(1);
    kitMaterials(level);
    const mesh = new KitMesh(level, "window", "", kitFinishes(level, undefined, "warm").materials, { maximumTriangles: 10000 });
    windowUnit(new Pen(mesh, "openings", new Matrix4(), false), 0, 0, 1.7, 1.3, {
      kind: "casement", frame: [0.2, 0.2, 0.2], trim: [0.5, 0.5, 0.5], curtain: [0.5, 0.5, 0.5],
      reach: 1.3, hood: false, lit: false, boarded: false, recess: 0.42, fixed,
    }, new Rng("sash-2"));
    const lights = level.mesh.surfaces.flatMap((surface, t) => {
      if (level.surfaces[surface].object !== "window/$dressing/openings") return [];
      return level.mesh.indices.slice(t * 3, t * 3 + 3).map(i => level.mesh.positions.slice(i * 3, i * 3 + 3));
    }).filter(p => p[2] > 0.2 && p[2] < 1.2);
    const outward = Math.max(...lights.map(p => p[1]));
    if (fixed) assert.ok(outward < 0.08, "A fixed guard must keep the leaf inside its frame");
    else {
      assert.ok(outward > 0.15, "Fixture must exercise a swung leaf");
      const glass = level.document.materials.find(m => m.id === "$kowloon/glass")!;
      assert.ok(glass.opacity! > 0 && glass.opacity! < 0.3);
      assert.equal(glass.texture, undefined);
      assert.equal(glass.color, "#ffffff");
      const gltf = JSON.parse(toGLTF(level)["emission.gltf"] as string);
      const finish = gltf.materials.find((m: { name: string }) => m.name === glass.id);
      assert.equal(finish.alphaMode, "BLEND");
      assert.equal(finish.pbrMetallicRoughness.baseColorFactor[3], glass.opacity);
      assert.ok(level.surfaces.some(s => s.object === "window/$dressing/openings" && s.material === glass.id));
    }
  }
});


test("planned exterior guards keep facade sashes fixed across detail levels", async () => {
  const xml = (await readFile(new URL("./fixtures/aml/window-interiors.aml", import.meta.url), "utf8")).replace("window-27", "window-42");
  const windows: number[][] = [];
  const guards: number[] = [];
  for (const detail of ["low", "high"]) {
    const level = await compile(parseAml(xml.replace('detail="low"', `detail="${detail}"`)), { navigation: false });
    assert.deepEqual(level.diagnostics.filter(d => d.severity === "error"), []);
    const points: number[] = [];
    let guardTriangles = 0;
    for (let t = 0; t < level.mesh.surfaces.length; t++) {
      const surface = level.surfaces[level.mesh.surfaces[t]];
      const vertices = level.mesh.indices.slice(t * 3, t * 3 + 3).map(i => level.mesh.positions.slice(i * 3, i * 3 + 3));
      if (!vertices.every(p => p[0] > 2.5 && p[2] > 3.5 && p[2] < 5.7 && p[1] < 0.5)) continue;
      if (surface.object === "building/$dressing/openings") {
        assert.ok(vertices.every(p => p[1] > -0.15), "A planned guard must prevent the sash from swinging outward, even when hidden");
        points.push(...vertices.flat());
      }
      if (surface.object === "building/$dressing/fixtures" && vertices.every(p => p[1] >= -0.11 && p[1] <= -0.08)) guardTriangles++;
    }
    assert.ok(points.length > 0);
    windows.push(points);
    guards.push(guardTriangles);
  }
  assert.deepEqual(windows[0], windows[1], "Raising detail must not move an existing window sash");
  assert.ok(guards[1] > guards[0], "Fixture must reveal the planned exterior guard at high detail");
});
