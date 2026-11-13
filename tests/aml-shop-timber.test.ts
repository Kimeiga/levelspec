import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { Matrix4, Vector3 } from "three";
import { PNG } from "pngjs";
import { validateBytes } from "gltf-validator";
import { compile, parseAml } from "levelspec";
import { kitFinishes, kitMaterials } from "../src/dressing/kit.ts";
import { KitMesh, type KitSlot } from "../src/dressing/kit-mesh.ts";
import { Pen } from "../src/dressing/pen.ts";
import { Kit } from "../src/dressing/kowloon/kit.ts";
import { srgb } from "../src/dressing/kowloon/palette.ts";
import { shelving } from "../src/dressing/kowloon/shop/fittings.ts";
import { agedShopTimber } from "../src/dressing/kowloon/shop/timber.ts";
import { drawDisplay, type DisplayKind } from "../src/dressing/kowloon/shop/display-assemblies.ts";
import { grocer } from "../src/dressing/kowloon/shop/grocer.ts";
import { Rng } from "../src/generate/rng.ts";
import { resolveExportAssets } from "../src/vector/export-assets.ts";
import { toGLB } from "../src/vector/export.ts";

type Level = Awaited<ReturnType<typeof compile>>;
type Mode = "atlas" | "legacy" | "untextured-role" | "plain";
interface Atlas {
  width: number;
  height: number;
  padding: number;
  texelsPerMeter: number;
  albedoGain: number;
  endGrainStart: number;
  regions: { x: number; y: number; width: number; height: number }[];
}
const WOOD = srgb("#7a5a3c");
const MAPS = ["shop-timber.png", "shop-timber-normal.png", "shop-timber-properties.png"];
const KINDS: DisplayKind[] = ["stool", "box-stand", "crate-shelf", "cart"];
const FRAMES = [new Matrix4(), new Matrix4().makeTranslation(3.7, -2.4, .6)
  .multiply(new Matrix4().makeRotationZ(.63)).multiply(new Matrix4().makeScale(-1, 1, 1))];

/** Uses actual material resolution and mesh emission, without the unrelated surface-baking stage. */
async function fixture(mode: Mode, frame = new Matrix4()) {
  const legacy = mode === "plain" ? "" : '<material id="stock-timber" color="#ffffff" texture="timber.png" repeat="1.7"/>';
  const special = mode === "atlas"
    ? '<material id="stock-shop-timber" color="#ffffff" roughness="1" metalness="1" texture="shop-timber.png" normal-texture="shop-timber-normal.png" metallic-roughness-texture="shop-timber-properties.png"/>'
    : mode === "untextured-role" ? '<material id="stock-shop-timber" color="#776655"/>' : "";
  const level = await compile(parseAml(`<architecture version="1" id="shop-timber-test">
    <material id="plain" color="#ffffff"/>${legacy}${special}
    <material id="stock-grocer-props" color="#ffffff" texture="grocer-props.png"/>
    <material id="stock-market-apple" color="#ffffff" texture="market-apple.png"/>
    <material id="stock-snack-packet" color="#ffffff" texture="snack-packet.png"/>
  </architecture>`), { navigation: false });
  assert.deepEqual(level.diagnostics, []);
  level.mesh.colors = [];
  kitMaterials(level);
  const { materials } = kitFinishes(level, "stock", "plain");
  const mesh = new KitMesh(level, "timber-study", "props", materials, { maximumTriangles: 100000 });
  return { level, materials, pen: new Pen(mesh, "furnishings", frame, frame.determinant() < 0) };
}

/** Reads triangles by their actual material and corner attributes, independent of surface allocation. */
function faces(level: Level) {
  return level.mesh.surfaces.map((surface, triangle) => ({
    material: level.surfaces[surface].material,
    corners: level.mesh.indices.slice(triangle * 3, triangle * 3 + 3).map(index => ({
      position: level.mesh.positions.slice(index * 3, index * 3 + 3),
      normal: level.mesh.normals.slice(index * 3, index * 3 + 3),
      uv: level.mesh.uv.slice(index * 2, index * 2 + 2),
      color: level.mesh.colors!.slice(index * 3, index * 3 + 3),
    })),
  }));
}

/** Reports compact failures while comparing every emitted attribute rather than triangle totals alone. */
function hash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

type Point2 = [number, number];
type Face = ReturnType<typeof faces>[number];
const isWood = (face: Face) => ["stock-timber", "stock-shop-timber"].includes(face.material);

/** Measures oriented polygon area in its projected plane. */
function signedArea(polygon: Point2[]): number {
  return polygon.reduce((sum, point, index) => {
    const next = polygon[(index + 1) % polygon.length];
    return sum + point[0] * next[1] - next[0] * point[1];
  }, 0) / 2;
}

/** Clips one triangle against another to measure surface coverage independently of triangulation. */
function intersectionArea(subject: Point2[], clip: Point2[]): number {
  let polygon = subject;
  const sign = Math.sign(signedArea(clip));
  for (let index = 0; index < clip.length && polygon.length; index++) {
    const a = clip[index], b = clip[(index + 1) % clip.length];
    const distance = (point: Point2) => sign * ((b[0] - a[0]) * (point[1] - a[1]) - (b[1] - a[1]) * (point[0] - a[0]));
    const result: Point2[] = [];
    for (let edge = 0; edge < polygon.length; edge++) {
      const start = polygon[edge], end = polygon[(edge + 1) % polygon.length];
      const d0 = distance(start), d1 = distance(end);
      if (d0 >= 0) result.push(start);
      if ((d0 >= 0) !== (d1 >= 0)) {
        const t = d0 / (d0 - d1);
        result.push([start[0] + t * (end[0] - start[0]), start[1] + t * (end[1] - start[1])]);
      }
    }
    polygon = result;
  }
  return Math.abs(signedArea(polygon));
}

interface WoodPlane {
  normal: Vector3;
  geometricNormal: Vector3;
  offset: number;
  axes: number[];
  triangles: Point2[][];
}

/** Groups timber against geometric planes; optional references keep subdivisions on the original surfaces. */
function woodPlanes(level: Level, references: WoodPlane[] = []): WoodPlane[] {
  const planes: WoodPlane[] = references.map(plane => ({ ...plane, triangles: [] }));
  for (const face of faces(level).filter(isWood)) {
    const points = face.corners.map(corner => new Vector3(...corner.position as [number, number, number]));
    const normal = new Vector3(...face.corners[0].normal as [number, number, number]);
    const winding = points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0]));
    assert.ok(winding.dot(normal) > 0, "Timber subdivision reversed a face");
    for (const corner of face.corners) assert.ok(new Vector3(...corner.normal as [number, number, number]).distanceTo(normal) < .000002,
      "A formerly flat wood face acquired a different corner normal");
    let plane = planes.find(group => group.normal.distanceTo(normal) < .000002 &&
      points.every(point => Math.abs(group.geometricNormal.dot(point) - group.offset) < .00003));
    if (!plane) {
      const geometricNormal = winding.normalize();
      const drop = [0, 1, 2].reduce((a, b) => Math.abs(geometricNormal.getComponent(a)) >= Math.abs(geometricNormal.getComponent(b)) ? a : b);
      plane = { normal, geometricNormal, offset: geometricNormal.dot(points[0]), axes: [0, 1, 2].filter(axis => axis !== drop), triangles: [] };
      planes.push(plane);
    }
    plane.triangles.push(points.map(point => [point.getComponent(plane.axes[0]), point.getComponent(plane.axes[1])] as Point2));
  }
  return planes;
}

/** Compares exact nonwood geometry and wood coverage, including holes and overlapping face multiplicity. */
function assertSameGeometry(before: Level, after: Level, message: string): void {
  const solid = (level: Level) => faces(level).filter(face => !isWood(face))
    .map(face => face.corners.map(({ position, normal }) => ({ position, normal })));
  assert.equal(hash(solid(after)), hash(solid(before)), message);
  const original = woodPlanes(before), divided = woodPlanes(after, original);
  assert.equal(divided.length, original.length, `${message}: added or moved a timber plane beyond 30 µm position precision`);
  for (const [index, plane] of original.entries()) {
    const oldTriangles = plane.triangles, newTriangles = divided[index].triangles;
    assert.ok(newTriangles.length, `${message}: removed a timber plane`);
    const overlap = (a: Point2[][], b: Point2[][]) => a.reduce((sum, triangle) =>
      sum + b.reduce((area, other) => area + intersectionArea(triangle, other), 0), 0);
    const area = oldTriangles.reduce((sum, triangle) => sum + Math.abs(signedArea(triangle)), 0);
    const difference = overlap(oldTriangles, oldTriangles) + overlap(newTriangles, newTriangles) - 2 * overlap(oldTriangles, newTriangles);
    assert.ok(Math.abs(difference) < .00004 * (1 + area), `${message}: changed coverage on plane ${index} (${difference} m²)`);
  }
}

/** Captures the complete unaffected stock, fittings and image bindings. */
function nonwood(level: Level): string {
  return hash(faces(level).filter(face => !["stock-timber", "stock-shop-timber"].includes(face.material)));
}

test("shop timber leaves shelf reservations, transformed geometry and unrelated finishes unchanged", async () => {
  for (const frame of FRAMES) for (const slot of ["timber", "metal"] as KitSlot[]) {
    const plain = await fixture("legacy", frame), aged = await fixture("atlas", frame);
    const original = shelving(plain.pen, 2.7, .34, 1.8, 6, slot, WOOD, .3);
    const weathered = shelving(aged.pen, 2.7, .34, 1.8, 6, slot, WOOD, .3);
    assert.deepEqual(weathered, original, "Weathering moved a stock-support reservation");
    assertSameGeometry(plain.level, aged.level, `Weathering changed ${slot} shelf geometry or normals`);
    assert.ok(original.length > 6 && aged.level.mesh.indices.length > 0);
    if (slot === "timber") {
      assert.ok(faces(aged.level).every(face => face.material === "stock-shop-timber"), "A transformed shelf lost the atlas adapter");
      assert.notEqual(hash(faces(aged.level).map(face => face.corners.map(corner => corner.uv))),
        hash(faces(plain.level).map(face => face.corners.map(corner => corner.uv))), "Shelves still use the old planar timber coordinates");
    } else assert.equal(hash(faces(aged.level)), hash(faces(plain.level)), "The timber adapter changed another finish");
  }
});

test("weathered shelves and support boards preserve seeded stock and existing triangle budgets", async () => {
  for (const frame of FRAMES) for (const kind of KINDS) {
    const plain = await fixture("legacy", frame), aged = await fixture("atlas", frame);
    const before = new Rng(`timber-support/${kind}`), after = new Rng(`timber-support/${kind}`);
    drawDisplay(plain.pen, kind, "grocer", before);
    drawDisplay(aged.pen, kind, "grocer", after);
    assert.equal(after.next(), before.next(), `${kind}: board weathering consumed the stock random stream`);
    assertSameGeometry(plain.level, aged.level, `${kind}: support or stocked geometry moved`);
    assert.equal(nonwood(aged.level), nonwood(plain.level), `${kind}: stock textures, colors or positions changed`);
    assert.ok(faces(aged.level).some(face => face.material === "stock-shop-timber"), `${kind}: support boards have no new finish`);
    assert.ok(aged.level.mesh.indices.length / 3 <= (kind === "cart" || kind === "crate-shelf" ? 4500 : 3000),
      `${kind}: ${aged.level.mesh.indices.length / 3} triangles exceed the display budget`);
  }
  for (const [width, seed] of [[2.2, "timber-store-a"], [3.6, "timber-store-b"]] as const) {
    const plain = await fixture("legacy"), aged = await fixture("atlas");
    for (const instance of [plain, aged]) grocer.furnish({ pen: instance.pen, width, depth: 2.9, height: 2.6,
      key: "shop", kit: new Kit(seed, 2, .6, .3, false) });
    assertSameGeometry(plain.level, aged.level, `${seed}: enabling shelf art changes store geometry`);
    assert.equal(nonwood(aged.level), nonwood(plain.level), `${seed}: enabling shelf art changes inventory or artwork`);
    assert.ok(faces(aged.level).some(face => face.material === "stock-shop-timber"));
    assert.ok(aged.level.mesh.indices.length / 3 <= (width < 3 ? 35000 : 45000), `${seed}: unchanged store budget exceeded`);
  }
});

test("shop timber honors untextured role overrides without changing authored geometry or tint", async () => {
  const instance = await fixture("untextured-role"), reference = await fixture("untextured-role");
  agedShopTimber(instance.pen).box("timber", [0,0,0], [1.3,.3,.1], WOOD, "");
  reference.pen.box("shop-timber", [0,0,0], [1.3,.3,.1], WOOD, "");
  assert.deepEqual(faces(instance.level), faces(reference.level));
  assert.ok(faces(instance.level).every(face => face.material === "stock-shop-timber"));
  const defaults = await fixture("plain");
  assert.equal(defaults.materials["shop-timber"], "builtin:shop-timber");
});

/** Finds the one padded rectangular chart containing a triangle, including its interpolated interior. */
function regionOf(uvs: number[][], atlas: Atlas): number {
  const pixels = uvs.map(([u, v]) => [u * atlas.width, (1 - v) * atlas.height]);
  const region = atlas.regions.findIndex(({ x, y, width, height }) => pixels.every(([u, v]) =>
    Number.isFinite(u) && Number.isFinite(v) &&
    u >= x + atlas.padding + .5 - .002 && u <= x + width - atlas.padding - .5 + .002 &&
    v >= y + atlas.padding + .5 - .002 && v <= y + height - atlas.padding - .5 + .002));
  assert.ok(region >= 0, "A board samples outside one padded atlas region");
  const [a, b, c] = uvs;
  assert.ok(Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1])) > 1e-12,
    "A board has collapsed appearance coordinates");
  return region;
}

test("shelf faces repeat with valid material bindings and padded atlas coordinates", async () => {
  const atlas: Atlas = JSON.parse(await readFile("src/dressing/kowloon/shop/assets/shop-timber.json", "utf8"));
  for (const frame of FRAMES) {
    const instance = await fixture("atlas", frame), repeated = await fixture("atlas", frame);
    for (const target of [instance, repeated]) shelving(target.pen, 2.7, .34, 1.8, 6, "timber", WOOD);
    assert.equal(hash(faces(instance.level)), hash(faces(repeated.level)), "A redraw changes authored shelf data");
    for (const face of faces(instance.level)) {
      assert.equal(face.material, "stock-shop-timber");
      regionOf(face.corners.map(corner => corner.uv), atlas);
    }
  }
});

/** Restores pen-local points so rotated and reflected fixtures have the same physical expectations. */
function localFaces(level: Level, frame: Matrix4): Face[] {
  const inverse = frame.clone().invert();
  return faces(level).map(face => ({ ...face, corners: face.corners.map(corner => ({ ...corner,
    position: new Vector3(...corner.position as [number, number, number]).applyMatrix4(inverse).toArray(),
    normal: new Vector3(...corner.normal as [number, number, number]).transformDirection(inverse).toArray(),
  })) }));
}

const PIXELS_PER_METER = 494;
// Each endpoint rounds by at most 5 µm per world axis; their distance error is bounded by √3 × 10 µm.
const PIXEL_POSITION_ERROR = Math.sqrt(3) * .00001 * PIXELS_PER_METER + 1e-7;

/** Preserves all three triangle-edge lengths in pixel space, which also preserves source aspect and angles. */
function assertUndistortedSource(face: Face, atlas: Atlas): void {
  for (let edge = 0; edge < 3; edge++) {
    const a = face.corners[edge], b = face.corners[(edge + 1) % 3];
    const meters = Math.hypot(...a.position.map((value, axis) => value - b.position[axis]));
    const pixels = Math.hypot((a.uv[0] - b.uv[0]) * atlas.width, (a.uv[1] - b.uv[1]) * atlas.height);
    assert.ok(Math.abs(pixels - meters * PIXELS_PER_METER) <= PIXEL_POSITION_ERROR,
      `Source artwork stretches or shears: edge is ${pixels} pixels across ${meters} m`);
  }
}

/** Checks physical grain direction without amplifying position rounding on narrow wear bands. */
function assertSideGrain(face: Face, along: number, across: number, atlas: Atlas): void {
  assertUndistortedSource(face, atlas);
  for (let edge = 0; edge < 3; edge++) {
    const a = face.corners[edge], b = face.corners[(edge + 1) % 3];
    const uPixels = Math.abs(a.uv[0] - b.uv[0]) * atlas.width;
    const vPixels = Math.abs(a.uv[1] - b.uv[1]) * atlas.height;
    assert.ok(Math.abs(uPixels - Math.abs(a.position[across] - b.position[across]) * PIXELS_PER_METER) <= PIXEL_POSITION_ERROR &&
      Math.abs(vPixels - Math.abs(a.position[along] - b.position[along]) * PIXELS_PER_METER) <= PIXEL_POSITION_ERROR,
      "Timber grain turns across the board instead of following its length");
  }
}

/** Requires one uninterrupted longitudinal crop across every side of a board that fits the source strip. */
function assertLongitudinalContinuity(sides: Face[], along: number, atlas: Atlas): number {
  assert.ok(sides.length > 0, "A timber member has no longitudinal faces");
  const first = sides[0].corners;
  const sorted = [...first].sort((a, b) => a.position[along] - b.position[along]);
  const direction = Math.sign(sorted.at(-1)!.uv[1] - sorted[0].uv[1]);
  assert.notEqual(direction, 0, "The longitudinal chart collapsed");
  const phases = sides.flatMap(face => face.corners.map(corner =>
    corner.uv[1] * atlas.height - direction * 494 * corner.position[along]));
  assert.ok(Math.max(...phases) - Math.min(...phases) < .02,
    "A board repeats a short strip or changes longitudinal crop phase between faces");
  return phases[0];
}

test("timber boards keep metric grain across thin edges, broad faces and rotated members", async () => {
  const atlas: Atlas = JSON.parse(await readFile("src/dressing/kowloon/shop/assets/shop-timber.json", "utf8"));
  assert.equal(atlas.endGrainStart, 4);
  const boards = [{ size: [1.2, .30, .022], along: 0 }, { size: [.65, .30, .022], along: 0 },
    { size: [2.7, .30, .022], along: 0 }, { size: [4.2, .30, .022], along: 0 },
    { size: [.022, .30, 1.2], along: 2 }];
  for (const frame of FRAMES) for (const { size, along } of boards) {
    const instance = await fixture("atlas", frame), original = await fixture("legacy", frame);
    agedShopTimber(instance.pen).box("timber", [0, 0, 0], size as [number, number, number], WOOD, "");
    original.pen.box("timber", [0, 0, 0], size as [number, number, number], WOOD, "");
    assertSameGeometry(original.level, instance.level, "Metric UV subdivisions changed the timber solid");
    const sideRegions = new Set<number>(), capRegions = new Set<number>();
    const sides: Face[] = [];
    for (const face of localFaces(instance.level, frame)) {
      const tile = regionOf(face.corners.map(corner => corner.uv), atlas);
      const normal = face.corners[0].normal;
      const perpendicular = [0, 1, 2].find(axis => Math.abs(normal[axis]) > .99)!;
      if (perpendicular === along) {
        capRegions.add(tile);
        assert.ok(tile >= atlas.endGrainStart, "A cut timber end uses longitudinal side grain");
        assertUndistortedSource(face, atlas);
      } else {
        sides.push(face);
        sideRegions.add(tile);
        assert.ok(tile < atlas.endGrainStart, "A longitudinal timber face uses cut-end art");
        const across = [0, 1, 2].find(axis => axis !== perpendicular && axis !== along)!;
        assertSideGrain(face, along, across, atlas);
      }
    }
    assert.equal(sideRegions.size, 1, "One board changes its timber variant between faces");
    assert.equal(capRegions.size, 1, "Matching timber ends use unrelated end-grain variants");
    const strip = atlas.regions[[...sideRegions][0]];
    const length = (strip.height - 2 * atlas.padding - 1) / 494;
    if (size[along] <= length) assertLongitudinalContinuity(sides, along, atlas);
  }
  for (const frame of FRAMES) {
    const crops: number[] = [];
    for (let member = 0; member < 6; member++) {
      const instance = await fixture("atlas", frame);
      agedShopTimber(instance.pen.move(0, 0, member * .25)).box("timber", [0, 0, 0], [1.2, .30, .022], WOOD, "");
      const sides = localFaces(instance.level, frame).filter(face => Math.abs(face.corners[0].normal[0]) < .99);
      crops.push(assertLongitudinalContinuity(sides, 0, atlas));
    }
    assert.ok(Math.max(...crops) - Math.min(...crops) > 5, "Different shelves all start at the same source position");
  }
});

test("production shelves keep their intended grain and a single complete top surface", async () => {
  const atlas: Atlas = JSON.parse(await readFile("src/dressing/kowloon/shop/assets/shop-timber.json", "utf8"));
  for (const frame of FRAMES) {
    const instance = await fixture("atlas", frame);
    shelving(instance.pen, 2.7, .34, 1.8, 6, "timber", WOOD);
    const backing = localFaces(instance.level, frame).filter(face =>
      face.corners.every(corner => Math.abs(corner.position[1] - .334) < .00002));
    assert.ok(backing.length > 0, "The actual shelf fixture has no mapped back panel");
    const backingCrops = backing.map(face => ({
      region: regionOf(face.corners.map(corner => corner.uv), atlas),
      phase: assertLongitudinalContinuity([face], 2, atlas),
    }));
    const phases = backingCrops.map(crop => crop.phase);
    assert.ok(new Set(backingCrops.map(crop => crop.region)).size > 1 || Math.max(...phases) - Math.min(...phases) > 5,
      "The wide backing repeats one identical narrow strip across its width");
    for (const face of backing) {
      assert.ok(regionOf(face.corners.map(corner => corner.uv), atlas) < atlas.endGrainStart);
      assertSideGrain(face, 2, 0, atlas);
    }
    const kick = localFaces(instance.level, frame).filter(face => face.corners.every(corner =>
      Math.abs(corner.position[1] - .02) < .00002 && corner.position[2] >= -.00002 && corner.position[2] <= .08002));
    assert.ok(kick.length > 0, "The actual shelf fixture has no mapped kick strip");
    for (const face of kick) {
      assert.ok(regionOf(face.corners.map(corner => corner.uv), atlas) < atlas.endGrainStart);
      assertSideGrain(face, 0, 2, atlas);
    }
    const top = localFaces(instance.level, frame).filter(face => face.corners.every(corner =>
      Math.abs(corner.position[2] - 1.8) < .00002 && corner.normal[2] > .99));
    const probes: { label: string; at: Point2 }[] = [
      { label: "first covered divider", at: [.903, .173] },
      { label: "second covered divider", at: [1.796, .173] },
      { label: "first divider's exposed front lip", at: [.903, .002] },
      { label: "second divider's exposed front lip", at: [1.796, .002] },
      { label: "left exposed end cap", at: [.009, .173] },
      { label: "right exposed end cap", at: [2.691, .173] },
    ];
    for (const { label, at } of probes) {
      const hits = top.filter(face => {
        const triangle = face.corners.map(corner => corner.position.slice(0, 2) as Point2);
        const sides = triangle.map((point, index) => signedArea([point, triangle[(index + 1) % 3], at]));
        return Math.min(...sides) >= -1e-10 || Math.max(...sides) <= 1e-10;
      });
      assert.equal(hits.length, 1, `${label}: the top has a hole or overlapping coplanar faces`);
    }
  }
});

/** Samples interpolated vertex tint on a known local face, allowing the emitter's position quantization. */
function surfaceTint(source: Face[], at: [number, number, number], normalAxis: number, sign: number): number[] {
  const axes = [0, 1, 2].filter(axis => axis !== normalAxis);
  const point: Point2 = [at[axes[0]], at[axes[1]]];
  const samples: number[][] = [];
  for (const face of source) {
    if (!face.corners.every(corner => corner.normal[normalAxis] * sign > .99 &&
      Math.abs(corner.position[normalAxis] - at[normalAxis]) < .00002)) continue;
    const triangle = face.corners.map(corner => [corner.position[axes[0]], corner.position[axes[1]]] as Point2);
    const area = signedArea(triangle), orientation = Math.sign(area);
    const inside = triangle.every((a, index) => {
      const b = triangle[(index + 1) % 3];
      return signedArea([a, b, point]) * orientation >= -.00001 * Math.hypot(b[0] - a[0], b[1] - a[1]);
    });
    if (!inside) continue;
    const weights = triangle.map((_, index) => signedArea([triangle[(index + 1) % 3], triangle[(index + 2) % 3], point]) / area);
    samples.push([0, 1, 2].map(channel => weights.reduce((sum, weight, index) => sum + weight * face.corners[index].color[channel], 0)));
  }
  assert.ok(samples.length > 0, `No timber surface at ${at} with normal ${normalAxis}/${sign}`);
  assert.ok(samples.every(sample => sample.every((value, channel) => Math.abs(value - samples[0][channel]) < .003)),
    "Adjacent triangles disagree on their shared edge tint");
  return samples[0];
}

test("contact wear brightens uneven physical front edges without washing out board interiors", async () => {
  const atlas: Atlas = JSON.parse(await readFile("src/dressing/kowloon/shop/assets/shop-timber.json", "utf8"));
  assert.ok(Number.isFinite(atlas.albedoGain) && atlas.albedoGain >= 1);
  const base = [1 / atlas.albedoGain, 1 / atlas.albedoGain, 1 / atlas.albedoGain];
  const close = (actual: number[], expected: number[], message: string) => assert.ok(
    actual.every((value, channel) => Math.abs(value - expected[channel]) < .003), message);
  const brightness = (color: number[]) => color.reduce((sum, channel) => sum + channel, 0) / 3 * atlas.albedoGain;
  for (const frame of FRAMES) {
    const shelf = await fixture("atlas", frame), repeated = await fixture("atlas", frame);
    for (const instance of [shelf, repeated])
      agedShopTimber(instance.pen).box("timber", [0, 0, 0], [1.2, .30, .022], WOOD, "");
    assert.equal(hash(faces(shelf.level)), hash(faces(repeated.level)), "Contact wear changes on redraw");
    const board = localFaces(shelf.level, frame), edges: number[] = [];
    for (const x of [.11, .37, .58, .83, 1.09]) {
      const top = surfaceTint(board, [x, 0, .022], 2, 1);
      const front = surfaceTint(board, [x, 0, .022], 1, -1);
      close(top, front, "The wear breaks at the shared top/front edge");
      edges.push(brightness(top));
      close(surfaceTint(board, [x, .025, .022], 2, 1), base, "Front-edge wear spreads across the shelf top");
      close(surfaceTint(board, [x, 0, .005], 1, -1), base, "Front-edge wear washes out the whole lip");
      close(surfaceTint(board, [x, .30, .011], 1, 1), base, "Contact wear brightens a protected rear face");
      close(surfaceTint(board, [x, .15, 0], 2, -1), base, "Contact wear brightens the underside");
    }
    assert.ok(Math.max(...edges) > 1.02, "The handled front edge has no visible brightening");
    assert.ok(Math.max(...edges) - Math.min(...edges) > .01, "The edge is a uniform painted outline instead of uneven contact wear");

    const upright = await fixture("atlas", frame);
    agedShopTimber(upright.pen).box("timber", [0, 0, 0], [.022, .30, 1.2], WOOD, "");
    const vertical = localFaces(upright.level, frame), corners: number[] = [];
    for (const z of [.17, .43, .79, 1.03]) {
      for (const x of [0, .022]) corners.push(brightness(surfaceTint(vertical, [x, 0, z], 1, -1)));
      close(surfaceTint(vertical, [.011, 0, z], 1, -1), base, "Upright wear fills the whole front face");
      close(surfaceTint(vertical, [.011, .30, z], 1, 1), base, "Upright wear reaches its protected back");
    }
    assert.ok(Math.max(...corners) > 1.01, "The exposed upright corners have no contact wear");

    const protectedWood = await fixture("atlas", frame);
    const pen = agedShopTimber(protectedWood.pen);
    pen.box("timber", [0, 0, 0], [.4, .4, .4], WOOD, "");
    pen.panel("timber", 0, 1.2, 0, 1.2, .6, WOOD);
    for (const face of faces(protectedWood.level)) for (const corner of face.corners)
      close(corner.color, base, "Contact wear affects a bulky box or standalone backing");
  }
});

test("shop boards share portable albedo, normal and dielectric property images with safe atlas gutters", async () => {
  const atlas: Atlas = JSON.parse(await readFile("src/dressing/kowloon/shop/assets/shop-timber.json", "utf8"));
  const instance = await fixture("atlas");
  shelving(instance.pen, 2.7, .34, 1.8, 6, "timber", WOOD);
  const images = await Promise.all(MAPS.map(async name => PNG.sync.read(await readFile(`projects/dressing-demo/textures/${name}`))));
  for (const image of images) {
    assert.equal(image.width, atlas.width);
    assert.equal(image.height, atlas.height);
    for (const region of atlas.regions) {
      const { x: x0, y: y0, width, height } = region;
      assert.ok(x0 >= 0 && y0 >= 0 && x0 + width <= image.width && y0 + height <= image.height,
        "A timber region lies outside the image");
      for (const vertical of [false, true]) {
        const fixedSize = vertical ? width : height, movingSize = vertical ? height : width;
        const first = atlas.padding, last = fixedSize - atlas.padding - 1;
        for (let moving = first; moving < movingSize - atlas.padding; moving++) {
          const start = ((y0 + (vertical ? moving : first)) * image.width + x0 + (vertical ? first : moving)) * 4;
          const end = ((y0 + (vertical ? moving : last)) * image.width + x0 + (vertical ? last : moving)) * 4;
          assert.deepEqual(image.data.subarray(start, start + 4), image.data.subarray(end, end + 4),
            "A metric texture repeat introduces a discontinuity at the opposite region edge");
        }
        for (const along of [.2, .5, .8]) for (const end of [false, true]) {
          const fixed = end ? fixedSize - 1 : 0, inner = end ? last : first;
          const moving = Math.floor(along * movingSize);
          const outside = ((y0 + (vertical ? moving : fixed)) * image.width + x0 + (vertical ? fixed : moving)) * 4;
          const edge = ((y0 + (vertical ? moving : inner)) * image.width + x0 + (vertical ? inner : moving)) * 4;
          assert.deepEqual(image.data.subarray(outside, outside + 4), image.data.subarray(edge, edge + 4),
            "A PBR atlas gutter samples neighboring board art");
        }
      }
    }
  }
  for (let index = 0; index < images[1].data.length; index += 4) {
    const normal = [...images[1].data.subarray(index, index + 3)].map(value => value / 127.5 - 1);
    assert.ok(normal[2] > 0 && Math.abs(Math.hypot(...normal) - 1) < .025, "The timber map contains an invalid tangent normal");
    assert.equal(images[2].data[index + 2], 0, "Timber's property map makes a dielectric board metallic");
  }
  const used = new Set(instance.level.surfaces.map(surface => surface.material));
  instance.level.document.materials = instance.level.document.materials.filter(material => used.has(material.id));
  const sourceBytes = new Map<string, Buffer>();
  const assets = await resolveExportAssets(instance.level, async name => {
    const bytes = await readFile(`projects/dressing-demo/textures/${name}`); sourceBytes.set(name, bytes); return bytes;
  });
  const bytes = Buffer.from(toGLB(instance.level, { assets })), length = bytes.readUInt32LE(12);
  const gltf = JSON.parse(bytes.toString("utf8", 20, 20 + length));
  const validation = await validateBytes(new Uint8Array(bytes));
  assert.equal(validation.issues.numErrors, 0, JSON.stringify(validation.issues));
  const colorAccessors = new Set<number>(gltf.meshes.flatMap((mesh: { primitives: { attributes: { COLOR_0?: number } }[] }) =>
    mesh.primitives.map(primitive => {
      assert.ok(primitive.attributes.COLOR_0 !== undefined, "Exported timber lost its vertex tint");
      return primitive.attributes.COLOR_0;
    })));
  assert.ok(colorAccessors.size > 0, "No exported timber color attributes were checked");
  for (const index of colorAccessors) {
    const accessor = gltf.accessors[index], view = gltf.bufferViews[accessor.bufferView];
    const channels = accessor.type === "VEC4" ? 4 : 3;
    const componentBytes = accessor.componentType === 5126 ? 4 : accessor.componentType === 5123 ? 2 : 1;
    const stride = view.byteStride ?? channels * componentBytes;
    const start = 28 + length + (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
    for (let vertex = 0; vertex < accessor.count; vertex++) for (let channel = 0; channel < channels; channel++) {
      const offset = start + vertex * stride + channel * componentBytes;
      const value = accessor.componentType === 5126 ? bytes.readFloatLE(offset)
        : accessor.componentType === 5123 ? bytes.readUInt16LE(offset) / 65535 : bytes.readUInt8(offset) / 255;
      assert.ok(Number.isFinite(value) && value >= 0 && value <= 1, `Exported COLOR_0 contains illegal value ${value}`);
    }
  }
  const assigned = new Set<number>(gltf.meshes.flatMap((mesh: { primitives: { material: number }[] }) =>
    mesh.primitives.map(primitive => primitive.material)));
  assert.equal(assigned.size, 1, "Board primitives allocate separate materials instead of sharing their atlas");
  const material = gltf.materials[[...assigned][0]];
  assert.equal(material.name, "stock-shop-timber");
  const bindings = [material.pbrMetallicRoughness.baseColorTexture, material.normalTexture, material.pbrMetallicRoughness.metallicRoughnessTexture];
  const sources = new Set<number>();
  for (const [index, binding] of bindings.entries()) {
    assert.ok(binding, `Missing timber channel ${MAPS[index]}`);
    const source = gltf.textures[binding.index].source; sources.add(source);
    const image = gltf.images[source], view = gltf.bufferViews[image.bufferView];
    assert.equal(image.uri, undefined);
    const start = 28 + length + (view.byteOffset ?? 0);
    assert.deepEqual(bytes.subarray(start, start + view.byteLength), sourceBytes.get(MAPS[index]), `Wrong bytes bound as ${MAPS[index]}`);
  }
  assert.equal(sources.size, 3);
  assert.equal(gltf.images.length, 3, "Repeated boards duplicated embedded atlas images");
  assert.equal(material.pbrMetallicRoughness.roughnessFactor, 1);
  assert.equal(material.pbrMetallicRoughness.metallicFactor, 1);
});

test("explicit joinery wear reaches wide front edges while preserving interiors and ordinary shelf defaults", async () => {
  for (const high of [[.1, .06, 1.2], [1.2, .06, .1]] as [number, number, number][]) {
    const ordinary = await fixture("atlas"), joinery = await fixture("atlas");
    agedShopTimber(ordinary.pen).box("timber", [0, 0, 0], high, WOOD, "");
    agedShopTimber(joinery.pen, undefined, { grainVariant: 1, frontWear: { width: .008, strength: .9 } })
      .box("timber", [0, 0, 0], high, WOOD, "");
    assertSameGeometry(ordinary.level, joinery.level, "Contact-wear subdivisions changed the timber solid");
    const plain = localFaces(ordinary.level, new Matrix4()), worn = localFaces(joinery.level, new Matrix4());
    const vertical = high[2] > high[0], edgeValues: number[] = [];
    for (const along of [.13, .39, .65, .91, 1.09]) {
      const edge: [number, number, number] = vertical ? [.001, 0, along] : [along, 0, .001];
      const center: [number, number, number] = vertical ? [.05, 0, along] : [along, 0, .05];
      const rear: [number, number, number] = [center[0], .06, center[2]];
      const base = surfaceTint(plain, edge, 1, -1);
      assert.ok(base.every(value => Math.abs(value - .5) < .003), "Shelf defaults should leave wide joinery intact");
      const edgeTint = surfaceTint(worn, edge, 1, -1);
      edgeValues.push(edgeTint[0]);
      for (const value of surfaceTint(worn, center, 1, -1))
        assert.ok(Math.abs(value - .5) < .003, "Stronger edge wear must not wash over a board's broad face");
      for (const value of surfaceTint(worn, rear, 1, 1))
        assert.ok(Math.abs(value - .5) < .003, "The protected rear remains intact");
    }
    assert.ok(Math.max(...edgeValues) > .6, "Door joinery needs visible front-edge wear");
    assert.ok(Math.max(...edgeValues) - Math.min(...edgeValues) > .01, "Worn edges retain uneven stretches");
  }
});
