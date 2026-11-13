import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Matrix4, Ray, Triangle as MeshTriangle, Vector3 } from "three";
import { collisionMesh, compile, parseAml, resolveExportAssets, toGLB } from "levelspec";
import { validateBytes } from "gltf-validator";
import { Rng } from "../src/generate/rng.ts";
import { Pen } from "../src/dressing/pen.ts";
import { KitMesh } from "../src/dressing/kit-mesh.ts";
import { kitFinishes, kitMaterials } from "../src/dressing/kit.ts";
import { Kit } from "../src/dressing/kowloon/kit.ts";
import { grocer } from "../src/dressing/kowloon/shop/grocer.ts";
import { grocerProp, type GrocerProp } from "../src/dressing/kowloon/shop/grocer-props.ts";
import { stockShelf } from "../src/dressing/kowloon/shop/goods.ts";
import { snackPacket } from "../src/dressing/kowloon/shop/stock-mesh.ts";
import { packetRow, packetString, planPacketString, type HungPacket } from "../src/dressing/kowloon/shop/snack-string.ts";
import packetMesh from "../src/dressing/kowloon/shop/assets/snack-packet.json" with { type: "json" };
import { connectedBodies, grocerAssetTriangles, groundedTriangles } from "./support/grocer-assets.ts";
import { surfaceContact } from "./support/mesh-contact.ts";

type Level = Awaited<ReturnType<typeof compile>>;
type Point = [number, number, number];
const SEEDS = Array.from({ length: 16 }, (_, index) => `grocer-suspension-${index}`);
const ORIGIN: Point = [0.35, 0.25, 2.4];
const ROUNDING = 0.00002;

/** Reads the baked pouch at its declared 12 × 6 × 16 cm hanging size. */
function pouchVertices(mirrored: boolean): Vector3[] {
  return packetMesh.flat().map(vertex => new Vector3(
    vertex[0] * 0.12 * (mirrored ? -1 : 1), vertex[1] * 0.06, vertex[2] * 0.16,
  ));
}

/** Measures geometry directly rather than trusting the planner's bounds. */
function extent(points: Vector3[]) {
  return {
    min: new Vector3(...["x", "y", "z"].map(axis => Math.min(...points.map(point => point[axis as "x" | "y" | "z"])))),
    max: new Vector3(...["x", "y", "z"].map(axis => Math.max(...points.map(point => point[axis as "x" | "y" | "z"])))),
  };
}

/** Requires corresponding vectors to agree within the stated distance, in meters. */
function near(actual: Vector3, expected: Vector3, tolerance: number, context: string): void {
  assert.ok(actual.distanceTo(expected) <= tolerance, `${context}: ${actual.toArray()} versus ${expected.toArray()}`);
}

/** Builds actual kit surfaces with distinct finishes for the pouch, clip, and connecting wire. */
async function fixture(frame = new Matrix4(), mirrored = false, maximumTriangles = 10000) {
  const level = await compile(parseAml(`<architecture version="1" id="grocer-suspension" validation="premap">
    <material id="plain" color="#ffffff"/>
    <material id="wire" color="#777777"/>
    <material id="clip" color="#b29b72"/>
    <material id="packet" color="#ffffff" texture="packet.png"/>
  </architecture>`), { navigation: false });
  assert.deepEqual(level.diagnostics, []);
  level.mesh.colors = [];
  const { materials } = kitFinishes(level, undefined, "plain");
  Object.assign(materials, { paint: "plain", metal: "wire", timber: "clip", "snack-packet": "packet" });
  const mesh = new KitMesh(level, "grocer", "props", materials, { maximumTriangles });
  return { level, pen: new Pen(mesh, "shop-grocer", frame, mirrored) };
}

/** Extracts emitted corners of a material in the ceiling-local coordinate frame. */
function materialPoints(level: Level, material: string, inverse: Matrix4): Vector3[] {
  const points: Vector3[] = [];
  for (const [triangle, surface] of level.mesh.surfaces.entries()) {
    if (level.surfaces[surface].material !== material) continue;
    for (const index of level.mesh.indices.slice(triangle * 3, triangle * 3 + 3)) {
      points.push(new Vector3().fromArray(level.mesh.positions, index * 3).applyMatrix4(inverse));
    }
  }
  return points;
}

/** Returns whether a point lies within an axis-aligned box, allowing only rounding slack. */
function contains(box: ReturnType<typeof extent>, point: Vector3, tolerance = ROUNDING): boolean {
  return ["x", "y", "z"].every(axis => {
    const key = axis as "x" | "y" | "z";
    return point[key] >= box.min[key] - tolerance && point[key] <= box.max[key] + tolerance;
  });
}

/** Makes repeatability comparisons independent of Three.js object identities. */
function poses(packets: HungPacket[]) {
  return packets.map(packet => ({ ...packet, matrix: packet.matrix.toArray() }));
}

test("hanging packets use real upper-seam anchors and stay separated inside their available drop", () => {
  for (const mirrored of [false, true]) {
    const vertices = pouchVertices(mirrored);
    for (const seed of SEEDS) {
      const packets = planPacketString(1.3, new Rng(seed), mirrored);
      assert.ok(packets.length > 0, `No emitted hanging packets for ${seed}, mirrored=${mirrored}`);
      const bounds = packets.map(packet => extent(vertices.map(vertex => vertex.clone().applyMatrix4(packet.matrix))));
      for (const [index, packet] of packets.entries()) {
        const context = `${seed}, mirrored=${mirrored}, packet=${index}`;
        const anchor = new Vector3(...packet.seam);
        assert.ok(vertices.some(vertex => vertex.distanceTo(anchor) < 1e-10), `Attachment is not on the mesh: ${context}`);
        assert.ok(anchor.z >= 0.152, `Attachment is below the upper seam: ${context}`);
        near(anchor.clone().applyMatrix4(packet.matrix), new Vector3(...packet.clip), 1e-10, `Seam misses its clip: ${context}`);
        const { min, max } = bounds[index];
        near(new Vector3(...packet.min), min, 1e-10, `Minimum bounds: ${context}`);
        near(new Vector3(...packet.max), max, 1e-10, `Maximum bounds: ${context}`);
        assert.ok(min.z >= -1.3 && max.z < 0, `Packet crosses ceiling or requested floor clearance: ${context}`);
        assert.ok(min.x >= -0.13 && max.x <= 0.13, `Packet exceeds its string's 26 cm envelope: ${context}`);
        assert.ok(max.y < -0.004, `Pouch reaches the cord's 4 mm clearance envelope: ${context}`);
        if (index > 0) {
          const gap = bounds[index - 1].min.z - max.z;
          assert.ok(gap > 0.001, `Neighboring pouches intersect or touch: ${context}`);
        }
      }
      const neighbor = planPacketString(1.3, new Rng(`${seed}/neighbor`), mirrored);
      for (const left of bounds) for (const right of neighbor) {
        const rightBounds = extent(vertices.map(vertex => vertex.clone().applyMatrix4(right.matrix)));
        assert.ok(left.max.x < rightBounds.min.x + 0.28, `Adjacent strings overlap at their 28 cm pitch: ${seed}`);
      }
    }
  }
});

test("suspension repeats a seed and shortens a display without moving its surviving packets", () => {
  for (const mirrored of [false, true]) for (const seed of SEEDS.slice(0, 4)) {
    const longer = planPacketString(1.3, new Rng(seed), mirrored);
    const shorter = planPacketString(0.65, new Rng(seed), mirrored);
    assert.ok(shorter.length > 0 && shorter.length < longer.length);
    assert.deepEqual(poses(planPacketString(1.3, new Rng(seed), mirrored)), poses(longer));
    assert.deepEqual(poses(shorter), poses(longer.slice(0, shorter.length)));
    assert.deepEqual(planPacketString(0.1, new Rng(seed), mirrored), []);
    assert.deepEqual(planPacketString(0, new Rng(seed), mirrored), []);
  }
});

test("emitted pouches meet their clips and connectors under translated, rotated, and mirrored hosts", async () => {
  const frames = [
    { frame: new Matrix4(), mirrored: false },
    { frame: new Matrix4().makeRotationZ(0.43).setPosition(4, -6, 2), mirrored: false },
    { frame: new Matrix4().makeRotationZ(0.43).multiply(new Matrix4().makeScale(-1, 1, 1)).setPosition(4, -6, 2), mirrored: true },
  ];
  let reference: Vector3[] | undefined;
  for (const { frame, mirrored } of frames) {
    const seed = "grocer-clips";
    const { level, pen } = await fixture(frame, mirrored);
    const plan = planPacketString(1.1, new Rng(seed), mirrored);
    packetString(pen, ORIGIN, 1.1, new Rng(seed));
    const inverse = frame.clone().multiply(new Matrix4().makeTranslation(...ORIGIN)).invert();
    const clips = materialPoints(level, "clip", inverse);
    const wires = materialPoints(level, "wire", inverse);
    const pouches = [...materialPoints(level, "packet", inverse), ...materialPoints(level, "plain", inverse)];
    assert.ok(materialPoints(level, "packet", inverse).length > 0, "Hanging packets lost their print material");
    assert.ok(clips.length > 0 && wires.length > 0, "Clips or connecting wires are missing");
    assert.ok(level.surfaces.every(surface => !surface.collidable && surface.domain === "visualization"));
    const vertices = pouchVertices(mirrored);
    for (const [index, pose] of plan.entries()) {
      const bite = new Vector3(...pose.clip);
      for (const vertex of vertices) {
        const expected = vertex.clone().applyMatrix4(pose.matrix);
        assert.ok(pouches.some(point => point.distanceTo(expected) <= ROUNDING), `Missing/misplaced real pouch corner: mirrored=${mirrored}, packet=${index}`);
      }
      assert.ok(pouches.some(point => point.distanceTo(bite) <= ROUNDING), "No emitted pouch seam reaches the clip bite");
      const clipCorners = clips.filter(point => point.distanceTo(bite) < 0.04);
      assert.ok(clipCorners.length >= 8, "No clip encloses this seam attachment");
      const toBody = pose.matrix.clone().invert();
      const clipBox = extent(clipCorners.map(point => point.clone().applyMatrix4(toBody)));
      assert.ok(contains(clipBox, new Vector3(...pose.seam)), "The clip floats outside its pouch seam");
      assert.ok(wires.some(point => contains(clipBox, point.clone().applyMatrix4(toBody))), "The support wire does not meet the clip");
      const cordJunction = new Vector3(0, 0, pose.clip[2]);
      assert.ok(wires.some(point => point.distanceTo(cordJunction) < 0.005), "The clip connector stops before the cord");
    }
    for (let triangle = 0; triangle < level.mesh.indices.length; triangle += 3) {
      const indices = level.mesh.indices.slice(triangle, triangle + 3);
      const [a, b, c] = indices.map(index => new Vector3().fromArray(level.mesh.positions, index * 3));
      const normal = indices.reduce((sum, index) => sum.add(new Vector3().fromArray(level.mesh.normals, index * 3)), new Vector3());
      assert.ok(b.sub(a).cross(c.sub(a)).dot(normal) > 0, `Inverted packet/clip face under mirrored=${mirrored}`);
    }
    if (!mirrored) {
      const points = [];
      for (let index = 0; index < level.mesh.positions.length; index += 3) {
        points.push(new Vector3().fromArray(level.mesh.positions, index).applyMatrix4(inverse));
      }
      if (reference) {
        assert.equal(points.length, reference.length);
        points.forEach((point, index) => near(point, reference![index], ROUNDING, "Host placement changed local suspension"));
      } else reference = points;
    }
  }
});

test("short strings emit nothing and suspension obeys the shared triangle budget", async () => {
  const empty = await fixture();
  packetString(empty.pen, ORIGIN, 0.1, new Rng("too-short"));
  assert.equal(empty.level.mesh.indices.length, 0);
  const limited = await fixture(new Matrix4(), false, 8);
  assert.throws(() => packetString(limited.pen, ORIGIN, 1.1, new Rng("budget")), /Dressing triangle budget exceeded/);
});

test("closely packed hanging rows retain separate whole pouches and repeat under host placement", async () => {
  /** Reads complete emitted bag bodies from all materials, including their unprinted backs and seams. */
  async function arrange(seed: string, frame = new Matrix4(), mirrored = false) {
    const { level, pen } = await fixture(frame, mirrored);
    packetRow(pen, .2, 1.8, .55, 2.4, new Rng(seed));
    const inverse = frame.clone().invert();
    const triangles = level.mesh.surfaces.map((_, triangle) => level.mesh.indices.slice(triangle * 3, triangle * 3 + 3)
      .map(index => new Vector3().fromArray(level.mesh.positions, index * 3).applyMatrix4(inverse)) as Triangle);
    for (const point of triangles.flat()) assert.ok(point.x >= .2 - ROUNDING && point.x <= 1.8 + ROUNDING,
      `${seed}: a pouch attachment or cord leaves the available horizontal row`);
    const bags = connectedBodies(triangles).filter(body => body.length === packetMesh.length);
    assert.ok(bags.length > 0, `${seed}: the row lost its whole hanging bags`);
    const boxes = bags.map(body => extent(body.flat()));
    for (const box of boxes) assert.ok(box.min.x >= .2 - ROUNDING && box.max.x <= 1.8 + ROUNDING
      && box.min.z >= 2.4 - .85 - ROUNDING && box.max.z < 2.4,
    `${seed}: a hanging bag leaves the available row or drop`);
    for (let left = 0; left < boxes.length; left++) for (let right = left + 1; right < boxes.length; right++)
      assert.ok(["x", "y", "z"].some(axis => {
        const key = axis as "x" | "y" | "z";
        return boxes[left].max[key] <= boxes[right].min[key] + ROUNDING || boxes[right].max[key] <= boxes[left].min[key] + ROUNDING;
      }), `${seed}: adjacent hanging bags overlap`);
    return { mesh: level.mesh, points: triangles.flat() };
  }
  for (const seed of ["packet-row-a", "packet-row-b", "packet-row-c", "packet-row-d"])
    for (const mirrored of [false, true]) await arrange(seed, new Matrix4(), mirrored);
  const base = await arrange("packet-row-repeat"), repeated = await arrange("packet-row-repeat");
  assert.ok(JSON.stringify(base.mesh) === JSON.stringify(repeated.mesh), "The same row seed changed packet placement or label selection");
  const moved = await arrange("packet-row-repeat", new Matrix4().makeRotationZ(.43).setPosition(3, -2, 1));
  assert.equal(moved.points.length, base.points.length);
  moved.points.forEach((point, index) => near(point, base.points[index], ROUNDING, "Host placement changed a packed packet row"));
});

test("close hanging gaps reserve clips and spring bars without cutting into neighboring pouches", async () => {
  for (const seed of ["clip-density-0", "clip-density-1", "clip-density-2", "clip-density-3"])
    for (const mirrored of [false, true]) {
      const { level, pen } = await fixture(new Matrix4(), mirrored);
      packetString(pen, ORIGIN, .85, new Rng(seed));
      const faces = level.mesh.surfaces.map((surfaceIndex, triangle) => ({
        material: level.surfaces[surfaceIndex].material,
        points: level.mesh.indices.slice(triangle * 3, triangle * 3 + 3)
          .map(index => new Vector3().fromArray(level.mesh.positions, index * 3)) as Triangle,
      }));
      const bags = connectedBodies(faces.map(face => face.points)).filter(body => body.length === packetMesh.length)
        .sort((left, right) => extent(right.flat()).max.z - extent(left.flat()).max.z);
      const clips = connectedBodies(faces.filter(face => face.material === "clip").map(face => face.points))
        .sort((left, right) => extent(right.flat()).max.z - extent(left.flat()).max.z);
      assert.ok(bags.length > 0 && clips.length === bags.length, `${seed}: attachment clearance has no complete neighboring packets`);
      for (const [index, clip] of clips.entries()) {
        const clipBox = extent(clip.flat());
        const metal = faces.filter(face => face.material === "wire" && face.points.some(point => contains(clipBox, point, .004))).map(face => face.points);
        assert.ok(metal.length > 0, "The attachment check lost its actual spring or connector geometry");
        for (const [neighbor, bag] of bags.entries()) {
          if (neighbor === index) continue;
          for (const attachment of [...clip, ...metal]) for (const pouch of bag)
            assert.ok(!trianglesCross(attachment, pouch), `${seed}, mirrored=${mirrored}: attachment ${index} cuts into neighboring pouch ${neighbor}`);
        }
      }
    }
});

/** Approved production limits, independent of the baked catalog's reported mesh sizes. */
const PROP_BUDGETS = {
  "drink-bottle": 110, "food-tin": 62, "tea-carton": 64, "seasoning-jar": 94,
  "tissue-roll": 100, "counter-scale": 900, "bottle-crate": 700, "shop-counter": 400,
  "shop-stool": 400, "drinks-cooler": 1200, "garlic-braid": 500, "rice-sack": 600,
  "bottle-load": 1152, "egg-basket": 1024,
  "produce-crate": 200,
  "dry-goods-bag": 160, "stock-box": 12,
};
interface BakedProp {
  size: Point;
  faces: number[][][];
  paintedFaces?: number[][][];
}
type Triangle = [Vector3, Vector3, Vector3];
const ATLAS_FILES = ["grocer-props.png", "grocer-props-normal.png", "grocer-props-properties.png"];

/** Separates actual mesh shells by shared positions, independent of the bake's egg layout. */
function connectedShells(faces: number[][][]): Triangle[][] {
  const vertexFaces = new Map<string, number[]>();
  const keys = faces.map(face => face.map(vertex => vertex.slice(0, 3).map(value => Math.round(value * 1e6)).join("/")));
  keys.forEach((vertices, face) => vertices.forEach(key => {
    const neighbors = vertexFaces.get(key) ?? [];
    neighbors.push(face);
    vertexFaces.set(key, neighbors);
  }));
  const remaining = new Set(faces.keys());
  const shells: Triangle[][] = [];
  while (remaining.size > 0) {
    const first = remaining.values().next().value!;
    const queue = [first], shell: Triangle[] = [];
    remaining.delete(first);
    while (queue.length > 0) {
      const index = queue.pop()!;
      shell.push(faces[index].map(vertex => new Vector3(...vertex.slice(0, 3))) as Triangle);
      for (const key of keys[index]) for (const neighbor of vertexFaces.get(key)!) {
        if (!remaining.delete(neighbor)) continue;
        queue.push(neighbor);
      }
    }
    shells.push(shell);
  }
  return shells;
}

/** Finds the real basket surface visible from above at one footprint position. */
function upperSurfaceAt(triangles: Triangle[], x: number, y: number, above: number): number {
  const ray = new Ray(new Vector3(x, y, above), new Vector3(0, 0, -1));
  let height = -Infinity;
  for (const triangle of triangles) {
    const hit = ray.intersectTriangle(...triangle, false, new Vector3());
    if (hit) height = Math.max(height, hit.z);
  }
  return height;
}

test("the sealed packet remains one coherent body without broken or open faces", () => {
  assert.ok(packetMesh.length > 0 && packetMesh.length <= 192, "Packet geometry exceeds its reviewed 192-triangle allowance");
  assert.equal(connectedShells(packetMesh).length, 1, "The packet has fragmented into disconnected pieces");
  const edges = new Map<string, { count: number; vertices: number[][] }>();
  for (const face of packetMesh) {
    assert.ok(face.length === 3 && face.every(vertex => vertex.length === 8 && vertex.every(Number.isFinite)));
    const [a, b, c] = face.map(vertex => new Vector3(...vertex.slice(0, 3)));
    assert.ok(b.sub(a).cross(c.sub(a)).lengthSq() > 1e-20, "Packet has a collapsed face");
    for (let index = 0; index < 3; index++) {
      const vertices = [face[index], face[(index + 1) % 3]];
      const key = vertices.map(vertex => vertex.slice(0, 3).map(value => Math.round(value * 1e6)).join("/")).sort().join("|");
      const edge = edges.get(key) ?? { count: 0, vertices };
      edge.count++;
      edges.set(key, edge);
    }
  }
  assert.ok([...edges.values()].every(edge => edge.count === 2), "The sealed packet has an open or nonmanifold edge");
});

test("packet printing remains bound to its front faces", async () => {
  const { level, pen } = await fixture();
  snackPacket(pen, [0, 0, 0], 0.12, 0.16, [0.2, 0.3, 0.4]);
  let printed = 0, sideFaces = 0;
  for (const [triangle, surfaceIndex] of level.mesh.surfaces.entries()) {
    const material = level.surfaces[surfaceIndex].material;
    const indices = level.mesh.indices.slice(triangle * 3, triangle * 3 + 3);
    const points = indices.map(index => new Vector3().fromArray(level.mesh.positions, index * 3));
    if (material === "packet") {
      printed++;
      assert.ok(points.every(point => point.y < 0), "Printing spills onto a side or rear triangle");
    } else {
      if (points.some(point => point.y < 0) && points.some(point => point.y > 0)) sideFaces++;
    }
  }
  assert.ok(printed > 0 && sideFaces > 0, "The material check did not include both label and edge geometry");
});

test("the bottle crate has sound faces, an open top, and unobstructed hand grips", async () => {
  const catalog: Record<string, BakedProp> = JSON.parse(await readFile("src/dressing/kowloon/shop/assets/grocer-props.json", "utf8"));
  const crate = catalog["bottle-crate"];
  const triangles = crate.faces.map(face => face.map(vertex => new Vector3(...vertex.slice(0, 3))) as Triangle);
  for (const [a, b, c] of triangles) assert.ok(b.clone().sub(a).cross(c.clone().sub(a)).lengthSq() > 1e-20, "Crate has a collapsed lattice face");
  const [width, depth, height] = crate.size;
  for (const x of [-0.125, 0.125]) for (const y of [-0.1, 0.1]) {
    const surface = upperSurfaceAt(triangles, width * x, depth * y, height + 1);
    assert.ok(Number.isFinite(surface) && surface < height * 0.6, "The crate has a closed or obstructed loading opening");
  }
  for (const x of [-0.12, 0, 0.12]) {
    const grip = new Ray(new Vector3(width * x, -depth, height * 0.8), new Vector3(0, 1, 0));
    assert.ok(!triangles.some(triangle => grip.intersectTriangle(...triangle, false, new Vector3())), "The crate's hand-grip opening is blocked");
  }
  const rail = new Ray(new Vector3(0, -depth, height * 0.98), new Vector3(0, 1, 0));
  assert.ok(triangles.some(triangle => rail.intersectTriangle(...triangle, false, new Vector3())), "The handle test passed because its supporting rim disappeared");
});

/** Creates a real floor and a kit pen, with optional production atlas bindings. */
async function grocerFixture(textured: boolean, width = 3.6, depth = 3.4) {
  const atlas = textured ? `<material id="stock-grocer-props" color="#ffffff" roughness="1" metalness="1"
    texture="grocer-props.png" normal-texture="grocer-props-normal.png"
    metallic-roughness-texture="grocer-props-properties.png"/>
    <material id="stock-snack-packet" color="#ffffff" texture="snack-packet.png"/>` : "";
  const level = await compile(parseAml(`<architecture version="1" id="grocer-stock" validation="premap">
    <material id="floor-finish" color="#999999"/>
    ${atlas}
    <profile id="floor-plan" points="0 0; ${width} 0; ${width} ${depth}; 0 ${depth}"/>
    <slab id="floor" profile="floor-plan" thickness="0.1" material="floor-finish"/>
  </architecture>`), { navigation: false });
  assert.deepEqual(level.diagnostics, []);
  level.mesh.colors = Array(level.mesh.positions.length).fill(1);
  kitMaterials(level);
  const { materials } = kitFinishes(level, textured ? "stock" : undefined, "floor-finish");
  const mesh = new KitMesh(level, "grocer", "props", materials, { maximumTriangles: 100000 });
  return { level, pen: new Pen(mesh, "shop-grocer", new Matrix4(), false) };
}

/** Lists vertex indices owned by the direct shop fixture, excluding its physical floor. */
function stockVertices(level: Level): number[] {
  return level.mesh.surfaces.flatMap((surface, triangle) => level.surfaces[surface].object.startsWith("grocer/$dressing/")
    ? level.mesh.indices.slice(triangle * 3, triangle * 3 + 3) : []);
}

test("repeated stock keeps closed coherent bodies, outward shading, and usable atlas charts", async () => {
  const catalog: Record<string, BakedProp> = JSON.parse(await readFile("src/dressing/kowloon/shop/assets/grocer-props.json", "utf8"));
  const appearances: Record<string, { source: number[] }> = JSON.parse(await readFile("src/dressing/kowloon/shop/assets/stock-appearances.json", "utf8"));
  const { level, pen } = await grocerFixture(true);
  const smallSizes: Record<string, Point> = { "drink-bottle": [.052, .052, .17], "food-tin": [.065, .065, .075], "seasoning-jar": [.075, .075, .115] };
  for (const name of ["drink-bottle", "food-tin", "seasoning-jar"] as const) {
    const asset = catalog[name], rect = appearances[name].source;
    const bodies = connectedShells(asset.faces);
    assert.equal(bodies.length, 1, `${name}: reduction fragmented a closed stock item`);
    const edges = new Map<string, { count: number; winding: number }>();
    let volume = 0;
    for (const face of asset.faces) {
      const [a, b, c] = face.map(vertex => new Vector3(...vertex.slice(0, 3)));
      const normal = b.clone().sub(a).cross(c.clone().sub(a));
      assert.ok(normal.length() > 1e-10, `${name}: reduction collapsed a triangle`);
      normal.normalize();
      volume += a.dot(b.clone().cross(c)) / 6;
      for (const vertex of face) {
        const shading = new Vector3(...vertex.slice(3, 6));
        assert.ok(Math.abs(shading.length() - 1) < .0001 && shading.dot(normal) > .01, `${name}: a reduced face has invalid or inward shading`);
        assert.ok(vertex.slice(6, 8).every((value, axis) => value >= rect[axis] - 1e-6 && value <= rect[axis + 2] + 1e-6),
          `${name}: reduction moved its artwork into another atlas tile`);
      }
      const uvArea = (face[1][6] - face[0][6]) * (face[2][7] - face[0][7]) - (face[2][6] - face[0][6]) * (face[1][7] - face[0][7]);
      assert.ok(Math.abs(uvArea) > 1e-12, `${name}: a reduced face collapsed its texture/normal-map coordinates`);
      const keys = face.map(vertex => vertex.slice(0, 3).map(value => Math.round(value * 1e6)).join("/"));
      for (let corner = 0; corner < 3; corner++) {
        const from = keys[corner], to = keys[(corner + 1) % 3], key = [from, to].sort().join("|");
        const edge = edges.get(key) ?? { count: 0, winding: 0 };
        edge.count++;
        edge.winding += from < to ? 1 : -1;
        edges.set(key, edge);
      }
    }
    assert.ok(volume > 1e-12, `${name}: the closed body is inside out or has no enclosed volume`);
    assert.ok([...edges.values()].every(edge => edge.count === 2 && edge.winding === 0), `${name}: reduction opened, reversed, or made a nonmanifold edge`);
    assert.ok(!surfaceContact(bodies[0], bodies[0], 0).crosses, `${name}: the reduced body's surface crosses itself`);
    for (const mirrored of [false, true]) {
      const frame = new Matrix4().makeRotationZ(.43).multiply(new Matrix4().makeScale(mirrored ? -1 : 1, 1, 1)).setPosition(2, -1, .4);
      const start = level.mesh.indices.length;
      grocerProp(new Pen(pen.mesh, pen.part, frame, mirrored), name, [.4, .5, .6], smallSizes[name].map(value => value * .88) as Point, .27, { variant: 4 });
      assert.equal((level.mesh.indices.length - start) / 3, asset.faces.length, `${name}: drawing a small stock item dropped a face`);
      for (let offset = start; offset < level.mesh.indices.length; offset += 3) {
        const indices = level.mesh.indices.slice(offset, offset + 3);
        const [a, b, c] = indices.map(vertex => new Vector3().fromArray(level.mesh.positions, vertex * 3));
        const normal = b.sub(a).cross(c.sub(a));
        assert.ok(normal.length() > 1e-12, `${name}: export precision collapsed a miniature face`);
        normal.normalize();
        for (const vertex of indices) {
          const shading = new Vector3().fromArray(level.mesh.normals, vertex * 3);
          assert.ok(Math.abs(shading.length() - 1) < .0001 && shading.dot(normal) > -.001,
            `${name}: export precision or reflection reversed a miniature's shading`);
        }
      }
    }
  }
});

test("the offline grocer catalog respects per-prop budgets and fits supported meshes to their display envelopes", async () => {
  const catalog: Record<string, BakedProp> = JSON.parse(await readFile("src/dressing/kowloon/shop/assets/grocer-props.json", "utf8"));
  assert.deepEqual(Object.keys(catalog).sort(), Object.keys(PROP_BUDGETS).sort(), "Every shipped grocer prop needs a reviewed triangle budget");
  const { level, pen } = await grocerFixture(false);
  for (const [name, maximum] of Object.entries(PROP_BUDGETS)) {
    const asset = catalog[name];
    assert.ok(asset, `Required grocer asset is missing: ${name}`);
    const faces = [...asset.faces, ...(asset.paintedFaces ?? [])];
    assert.ok(faces.length > 0 && faces.length <= maximum, `${name}: ${faces.length} triangles exceeds ${maximum}`);
    assert.ok(asset.size.length === 3 && asset.size.every(value => Number.isFinite(value) && value > 0), `${name}: invalid physical size`);
    assert.ok(faces.every(face => face.length === 3 && face.every(vertex => vertex.length === 11 && vertex.every(Number.isFinite))), `${name}: malformed triangle data`);
    for (const vertex of faces.flat()) {
      assert.ok(vertex.slice(6, 8).every(value => value >= 0 && value <= 1), `${name}: UV outside the shared atlas`);
      assert.ok(vertex.slice(8, 11).every(value => value >= 0 && value <= 1), `${name}: invalid sampled linear color`);
    }
    const original = extent(faces.flat().map(vertex => new Vector3(...vertex.slice(0, 3))));
    const sourceSize = original.max.clone().sub(original.min);
    near(sourceSize, new Vector3(...asset.size), 0.00002, `${name}: catalog size disagrees with geometry`);
    near(new Vector3((original.min.x + original.max.x) / 2, (original.min.y + original.max.y) / 2, original.min.z),
      new Vector3(), 0.00002, `${name}: catalog mesh is not centered on its support`);
    const start = level.mesh.positions.length;
    const before = level.mesh.indices.length;
    const envelope: Point = [0.37, 0.29, 0.43];
    const at: Point = [0.8, 0.9, 0.2];
    grocerProp(pen.into(name), name as GrocerProp, at, envelope);
    assert.ok((level.mesh.indices.length - before) / 3 <= maximum, `${name}: emitted geometry exceeds its budget`);
    const points: Vector3[] = [];
    for (let index = start; index < level.mesh.positions.length; index += 3) points.push(new Vector3().fromArray(level.mesh.positions, index));
    assert.ok(points.length > 0, `${name}: no production geometry was emitted`);
    const box = extent(points), size = box.max.clone().sub(box.min);
    assert.ok(size.toArray().every((value, axis) => value <= envelope[axis] + ROUNDING), `${name}: mesh exceeds its display envelope`);
    assert.ok(Math.abs(box.min.z - at[2]) < ROUNDING, `${name}: prop floats above or sinks below its support`);
    if (name === "shop-counter" || name === "stock-box") {
      near(size, new Vector3(...envelope), ROUNDING, `${name}: the fitted rectangular prop does not fill its assigned envelope`);
    } else {
      const scales = size.toArray().map((value, axis) => value / sourceSize.getComponent(axis));
      assert.ok(Math.max(...scales) - Math.min(...scales) < ROUNDING / Math.min(...sourceSize.toArray()), `${name}: axes were stretched independently`);
    }
    const palette = faces.flat().map(vertex => vertex.slice(8, 11));
    for (let index = start / 3; index < level.mesh.positions.length / 3; index++) {
      const color = level.mesh.colors!.slice(index * 3, index * 3 + 3);
      assert.ok(palette.some(sample => sample.every((value, axis) => Math.abs(value - color[axis]) <= 0.00051)), `${name}: fallback color was not sampled from its art`);
    }
  }
  assert.ok(level.surfaces.filter(surface => surface.object.startsWith("grocer/$dressing/")).every(surface => surface.material === "$kowloon/paint"));
});

test("modeled eggs retain their authored colors and material bindings", async () => {
  const catalog: Record<string, BakedProp> = JSON.parse(await readFile("src/dressing/kowloon/shop/assets/grocer-props.json", "utf8"));
  const basket = catalog["egg-basket"];
  assert.ok(basket.paintedFaces && basket.paintedFaces.length > 0, "The basket contains no modeled eggs");
  const { level, pen } = await grocerFixture(true);
  grocerProp(pen, "egg-basket", [0.8, 0.9, 0.2], [0.28, 0.22, 0.12]);
  const groups = new Map<string, number[]>();
  for (const [triangle, surfaceIndex] of level.mesh.surfaces.entries()) {
    const surface = level.surfaces[surfaceIndex];
    if (!surface.object.startsWith("grocer/$dressing/")) continue;
    const indices = groups.get(surface.material) ?? [];
    indices.push(...level.mesh.indices.slice(triangle * 3, triangle * 3 + 3));
    groups.set(surface.material, indices);
  }
  assert.equal(groups.get("stock-grocer-props")?.length, basket.faces.length * 3, "The basket lost its atlas geometry");
  const eggs = groups.get("$kowloon/paint");
  assert.equal(eggs?.length, basket.paintedFaces.length * 3, "Egg geometry was lost or assigned the basket's textured material");
  const palette = basket.paintedFaces.flat().map(vertex => vertex.slice(8, 11));
  for (const index of eggs!) {
    const color = level.mesh.colors!.slice(index * 3, index * 3 + 3);
    assert.ok(palette.some(sample => sample.every((value, axis) => Math.abs(value - color[axis]) <= 0.00051)), "Eggs lost their modeled shell colors");
  }
  const finish = level.document.materials.find(material => material.id === "$kowloon/paint")!;
  assert.equal(finish.texture, undefined);
  assert.equal(finish.normalTexture, undefined);
  assert.equal(finish.metallicRoughnessTexture, undefined);
  assert.equal(finish.metalness, 0);
});

test("eggs sit below the basket rim on a recessed supporting surface", async () => {
  const catalog: Record<string, BakedProp> = JSON.parse(await readFile("src/dressing/kowloon/shop/assets/grocer-props.json", "utf8"));
  const basket = catalog["egg-basket"];
  assert.ok(basket.paintedFaces?.length, "The basket contains no modeled eggs");
  const triangles = basket.faces.map(face => face.map(vertex => new Vector3(...vertex.slice(0, 3))) as Triangle);
  const body = extent(triangles.flat());
  const center = body.min.clone().add(body.max).multiplyScalar(0.5);
  const radii = body.max.clone().sub(body.min).multiplyScalar(0.5);
  // The rim is the outer lip; a closed top or misplaced contents must not raise this reference.
  const rim = Math.max(...triangles.flat().filter(vertex =>
    Math.hypot((vertex.x - center.x) / radii.x, (vertex.y - center.y) / radii.y) >= 0.8).map(vertex => vertex.z));
  const shells = connectedShells(basket.paintedFaces);
  const shortestEgg = Math.min(...shells.map(shell => {
    const bounds = extent(shell.flat());
    return bounds.max.z - bounds.min.z;
  }));
  const floor = upperSurfaceAt(triangles, center.x, center.y, body.max.z + 1);
  assert.ok(Number.isFinite(floor) && rim - floor > shortestEgg * 0.5,
    "The basket still has a closed top instead of a recess deep enough to hold eggs");
  for (const [index, shell] of shells.entries()) {
    const bounds = extent(shell.flat());
    const eggHeight = bounds.max.z - bounds.min.z;
    assert.ok((rim - bounds.min.z) / eggHeight >= 0.6, `Egg ${index} sits on top of the rim instead of predominantly inside it`);
    let supportGap = Infinity;
    for (const triangle of shell) {
      // Corners, edge midpoints, and face centers expose support cuts between the original vertices.
      const samples = [...triangle,
        triangle[0].clone().add(triangle[1]).multiplyScalar(0.5),
        triangle[1].clone().add(triangle[2]).multiplyScalar(0.5),
        triangle[2].clone().add(triangle[0]).multiplyScalar(0.5),
        triangle[0].clone().add(triangle[1]).add(triangle[2]).multiplyScalar(1 / 3)];
      for (const point of samples) {
        const surface = upperSurfaceAt(triangles, point.x, point.y, body.max.z + 1);
        assert.ok(Number.isFinite(surface) && surface < rim - 0.001, `Egg ${index} escapes the basket cavity`);
        const gap = point.z - surface;
        assert.ok(gap >= -0.001, `Egg ${index} penetrates the basket by ${-gap} m`);
        supportGap = Math.min(supportGap, gap);
      }
    }
    assert.ok(supportGap <= 0.002, `Egg ${index} floats ${supportGap} m above its basket support`);
  }
});

test("single-row shelves limit inventory while the default retains two rows", async () => {
  /** Draws real stock boxes on a deep, low shelf where a second row is visible. */
  async function arrange(maximumRows?: number, width = 0.9, seed = "visible-stock-rows") {
    const { level, pen } = await fixture();
    stockShelf(pen, { x0: 0, x1: width, y: 0, z: 0, depth: 0.3, clear: 0.3 }, [() => ({
      width: 0.1, depth: 0.08, height: 0.1, stack: 1,
      draw: (stock, [x, y, z]) => stock.box("paint", [x - 0.05, y - 0.04, z], [x + 0.05, y + 0.04, z + 0.1], [1, 1, 1]),
    })], new Rng(seed), 0.9, maximumRows);
    const points: Vector3[] = [];
    for (let index = 0; index < level.mesh.positions.length; index += 3) points.push(new Vector3().fromArray(level.mesh.positions, index));
    for (const point of points) assert.ok(point.x >= -ROUNDING && point.x <= width + ROUNDING
      && point.y >= -ROUNDING && point.y <= 0.3 + ROUNDING && point.z >= -ROUNDING && point.z <= 0.3 + ROUNDING,
    "Stock escaped its shelf while limiting its rows");
    return level;
  }
  assert.deepEqual((await arrange()).mesh, (await arrange(2)).mesh, "The default changed the stock of other trades");
  let singleBoxes = 0, doubleBoxes = 0;
  for (let seed = 0; seed < 8; seed++) {
    const single = (await arrange(1, 0.1, `row-cap-${seed}`)).mesh.indices.length / 36;
    const double = (await arrange(2, 0.1, `row-cap-${seed}`)).mesh.indices.length / 36;
    assert.ok(single <= 1 && double <= 2, "A one-product-wide shelf ignored its row limit");
    singleBoxes += single;
    doubleBoxes += double;
  }
  assert.ok(singleBoxes > 0 && doubleBoxes > singleBoxes, "The row option failed to retain or reduce real inventory");
});

/** Tests overlap of the actual rectangular base polygons by their separating axes. */
function footprintsOverlap(left: Vector3[], right: Vector3[]): boolean {
  for (const polygon of [left, right]) for (let index = 0; index < polygon.length; index++) {
    const edge = polygon[(index + 1) % polygon.length].clone().sub(polygon[index]);
    const axis = new Vector3(-edge.y, edge.x, 0).normalize();
    const a = left.map(point => point.dot(axis)), b = right.map(point => point.dot(axis));
    if (Math.max(...a) <= Math.min(...b) + ROUNDING || Math.max(...b) <= Math.min(...a) + ROUNDING) return false;
  }
  return true;
}

/** Verifies stock support and repeatability for each still-supported density mode. */
async function inspectStockSupport(density: "varied" | "packed"): Promise<void> {
  interface Product { center: Vector3; yaw: number; points: Vector3[]; height: number }
  /** Uses real asymmetric boxes so quarter turns expose incorrect footprint reservations. */
  async function arrange(seed: string, frame = new Matrix4()) {
    const { level, pen } = await fixture(frame);
    const inverse = frame.clone().invert(), products: Product[] = [];
    const makers = [[0.12, 0.07, 0.1], [0.09, 0.1, 0.12], [0.14, 0.06, 0.09], [0.27, 0.16, 0.16]].map(([width, depth, height]) => () => ({
      width, depth, height, stack: 3,
      draw: (stock: Pen, [x, y, z]: Point) => {
        const start = level.mesh.positions.length;
        stock.box("paint", [x - width / 2, y - depth / 2, z], [x + width / 2, y + depth / 2, z + height], [1, 1, 1]);
        const center = new Vector3(...stock.world([x, y, z])).applyMatrix4(inverse);
        const direction = new Vector3(...stock.world([x + 1, y, z])).applyMatrix4(inverse).sub(center);
        const points: Vector3[] = [];
        for (let index = start; index < level.mesh.positions.length; index += 3) points.push(new Vector3().fromArray(level.mesh.positions, index).applyMatrix4(inverse));
        products.push({ center, yaw: Math.atan2(direction.y, direction.x), points, height });
      },
    }));
    stockShelf(pen, { x0: 0, x1: 1.8, y: 0, z: 0.4, depth: 0.3, clear: 0.36 }, makers, new Rng(seed), 0.98, 1, density);
    assert.ok(products.length > 0);
    for (const product of products) for (const point of product.points) assert.ok(point.x >= -ROUNDING && point.x <= 1.8 + ROUNDING
      && point.y >= -ROUNDING && point.y <= 0.3 + ROUNDING && point.z >= 0.4 - ROUNDING && point.z <= 0.76 + ROUNDING,
    `A rotated product left its shelf: ${seed}`);
    const bases = products.filter(product => Math.abs(product.center.z - 0.4) < ROUNDING);
    for (const product of products) if (!bases.includes(product)) {
      assert.ok(products.some(lower => Math.abs(lower.center.x - product.center.x) < ROUNDING
        && Math.abs(lower.center.y - product.center.y) < ROUNDING && Math.abs(lower.yaw - product.yaw) < ROUNDING
        && Math.abs(lower.center.z + lower.height - product.center.z) < ROUNDING), `A stack lost its aligned support: ${seed}`);
    }
    const polygons = bases.map(product => {
      const corners = new Map<string, Vector3>();
      for (const point of product.points) if (Math.abs(point.z - 0.4) < ROUNDING) corners.set(point.toArray().map(value => value.toFixed(4)).join("/"), point);
      return [...corners.values()].sort((a, b) => Math.atan2(a.y - product.center.y, a.x - product.center.x) - Math.atan2(b.y - product.center.y, b.x - product.center.x));
    });
    for (let a = 0; a < polygons.length; a++) for (let b = a + 1; b < polygons.length; b++)
      assert.ok(!footprintsOverlap(polygons[a], polygons[b]), `Neighboring rotated products overlap: ${seed}`);
    return { products, bases };
  }
  const seeds = ["stock-variety-a", "stock-variety-b", "stock-variety-c", "stock-variety-d"];
  const runs = await Promise.all(seeds.map(seed => arrange(seed)));
  const repeated = await arrange(seeds[0]);
  assert.deepEqual(repeated, runs[0], "Stock variation does not repeat its seed");
  const moved = await arrange(seeds[0], new Matrix4().makeRotationZ(0.43).setPosition(4, -6, 2));
  assert.equal(moved.products.length, runs[0].products.length);
  moved.products.forEach((product, index) => product.points.forEach((point, corner) => near(point, runs[0].products[index].points[corner], ROUNDING, "Host transform changed local stock")));
}

test("shelf stock repeats within its bounds without intersecting its supports", async t => {
  for (const density of ["varied", "packed"] as const) await t.test(density, () => inspectStockSupport(density));
});

/** Detects a proper surface crossing, excluding coplanar contact and points resting on a support. */
function trianglesCross(left: Triangle, right: Triangle): boolean {
  for (const [triangle, plane] of [[left, right], [right, left]]) {
    const normal = plane[1].clone().sub(plane[0]).cross(plane[2].clone().sub(plane[0])).normalize();
    const distances = triangle.map(point => point.clone().sub(plane[0]).dot(normal));
    if (Math.min(...distances) >= -ROUNDING || Math.max(...distances) <= ROUNDING) return false;
  }
  const intersections: Vector3[] = [];
  for (const [triangle, target] of [[left, right], [right, left]]) for (let index = 0; index < 3; index++) {
    const origin = triangle[index], delta = triangle[(index + 1) % 3].clone().sub(origin), length = delta.length();
    const hit = new Ray(origin, delta.normalize()).intersectTriangle(...target, false, new Vector3());
    if (hit && hit.distanceTo(origin) <= length + ROUNDING && intersections.every(point => point.distanceTo(hit) > ROUNDING)) intersections.push(hit);
  }
  const surfaces = [new MeshTriangle(...left), new MeshTriangle(...right)];
  for (let a = 0; a < intersections.length; a++) for (let b = a + 1; b < intersections.length; b++) {
    const midpoint = intersections[a].clone().add(intersections[b]).multiplyScalar(.5);
    if (surfaces.every(surface => {
      const weights = surface.getBarycoord(midpoint, new Vector3());
      return weights && Math.min(weights.x, weights.y, weights.z) > 1e-6;
    })) return true;
  }
  return false;
}

test("prop contact comparisons distinguish resting edges from interior penetration", () => {
  const bottle: Triangle = [new Vector3(-1, 0, 0), new Vector3(1, 0, 0), new Vector3(1, 0, 1)];
  const support: Triangle = [new Vector3(0, -1, 0), new Vector3(0, 1, -1), new Vector3(0, 1, 0)];
  assert.ok(!trianglesCross(bottle, support) && !trianglesCross(support, bottle), "A shared bottom/top edge point is resting contact");
  const penetrating: Triangle = [new Vector3(0, -1, .6), new Vector3(0, 1, -1), new Vector3(0, 1, .6)];
  assert.ok(trianglesCross(bottle, penetrating) && trianglesCross(penetrating, bottle), "An interior intersection segment must remain a collision");
});

test("loaded bottles clear real crate dividers and rest on the floor rails", async () => {
  const catalog: Record<string, BakedProp> = JSON.parse(await readFile("src/dressing/kowloon/shop/assets/grocer-props.json", "utf8"));
  const { level, pen } = await grocerFixture(true);
  grocer.furnish({ pen, width: 3.6, depth: 3.4, height: 2.6, key: "shop", kit: new Kit("grocer-room-a", 2, 0.6, 0.3, false) });
  const crates = grocerAssetTriangles(level, "bottle-crate");
  assert.ok(crates.length > 0);
  const area = extent(crates.flat());
  const load = grocerAssetTriangles(level, "bottle-load").filter(triangle => triangle.every(point =>
    point.x >= area.min.x - ROUNDING && point.x <= area.max.x + ROUNDING
    && point.y >= area.min.y - ROUNDING && point.y <= area.max.y + ROUNDING));
  assert.ok(load.length > 0, "The front crate display contains no actual bottle load");
  const bars = crates.map(triangle => ({ triangle, bounds: extent(triangle) }));
  for (const triangle of load) {
    const bounds = extent(triangle);
    for (const bar of bars) {
      if (["x", "y", "z"].some(axis => {
        const key = axis as "x" | "y" | "z";
        return bounds.max[key] < bar.bounds.min[key] - ROUNDING || bounds.min[key] > bar.bounds.max[key] + ROUNDING;
      })) continue;
      if (trianglesCross(triangle, bar.triangle)) assert.fail(`A loaded bottle crosses a crate wall, divider, or floor rail: ${JSON.stringify({
        bottle: triangle.map(point => point.toArray()), crate: bar.triangle.map(point => point.toArray()),
      })}`);
    }
  }
  const bottles = connectedShells(load.map(triangle => triangle.map(point => point.toArray())));
  const sourceBottles = connectedShells(catalog["bottle-load"].faces).length;
  assert.ok(bottles.length >= sourceBottles && bottles.length % sourceBottles === 0, "The crate load lost or fragmented a bottle");
  for (const [index, bottle] of bottles.entries()) {
    const bottom = extent(bottle.flat()).min.z;
    const perimeter = bottle.flat().filter(point => point.z <= bottom + ROUNDING);
    assert.ok(perimeter.some(point => {
      const support = upperSurfaceAt(crates, point.x, point.y, bottom + 0.001);
      return Number.isFinite(support) && Math.abs(bottom - support) <= 0.001;
    }), `Bottle ${index} floats above the crate's actual floor rails`);
  }
});

test("scales and sacks retain actual counter and floor support", async () => {
  const catalog: Record<string, BakedProp> = JSON.parse(await readFile("src/dressing/kowloon/shop/assets/grocer-props.json", "utf8"));
  const scaleAsset = catalog["counter-scale"], sackAsset = catalog["rice-sack"];
  for (const width of [2.2, 3.6]) for (const seed of ["free-props-a", "free-props-b", "free-props-c", "free-props-d"]) {
    const depth = 3.4, height = 2.6;
    const { level, pen } = await grocerFixture(true, width, depth);
    grocer.furnish({ pen, width, depth, height, key: "shop", kit: new Kit(seed, 2, 0.6, 0.3, false) });
    const counter = grocerAssetTriangles(level, "shop-counter"), scale = grocerAssetTriangles(level, "counter-scale");
    assert.equal(counter.length, catalog["shop-counter"].faces.length, "The emitted counter could not be identified completely");
    assert.equal(scale.length, scaleAsset.faces.length, "The emitted scale could not be identified completely");
    const support = extent(counter.flat()), scaleBounds = extent(scale.flat());
    assert.ok(Math.abs(scaleBounds.min.z - support.max.z) <= ROUNDING, "The scale floats above or sinks below the counter");
    for (const point of scale.flat()) assert.ok(point.x >= support.min.x - ROUNDING && point.x <= support.max.x + ROUNDING
      && point.y >= support.min.y - ROUNDING && point.y <= support.max.y + ROUNDING,
    "A rotated scale overhangs its counter");
    for (const foot of scale.flat().filter(point => point.z <= scaleBounds.min.z + ROUNDING)) {
      const surface = upperSurfaceAt(counter, foot.x, foot.y, support.max.z + 1);
      assert.ok(Number.isFinite(surface) && Math.abs(foot.z - surface) <= 0.001, "The scale's feet miss the real worktop surface");
    }
    const sacks = connectedShells(groundedTriangles(grocerAssetTriangles(level, "rice-sack")).map(face => face.map(point => point.toArray())));
    assert.ok(sacks.length > 0, `${seed}, width ${width}: the fixture exercises grounded sacks`);
    const bounds = sacks.map(sack => extent(sack.flat()));
    for (const [index, sack] of sacks.entries()) {
      assert.equal(sack.length, sackAsset.faces.length, "A sack is fragmented or merged into a neighboring sack");
      assert.ok(Math.abs(bounds[index].min.z) <= ROUNDING, "A rotated sack lost floor contact");
      for (const point of sack.flat()) assert.ok(point.x >= -ROUNDING && point.x <= width + ROUNDING
        && point.y >= -ROUNDING && point.y <= depth + ROUNDING, "A rotated sack leaves its shop floor");
    }
    for (let left = 0; left < sacks.length; left++) for (let right = left + 1; right < sacks.length; right++) {
      const contact = surfaceContact(sacks[left], sacks[right], .002);
      assert.ok(!contact.crosses, "Neighboring sack surfaces cut through one another");
    }
  }
});

test("representative generated grocers retain physical geometry and stay within the shop triangle budget", async t => {
  // The wider room carries six densely stocked shelves and the extended rack requested for the packed shop.
  for (const [width, depth, height, maximumTriangles] of [[2.2, 2.6, 2.4, 35000], [3.6, 3.4, 2.6, 45000]]) {
    for (const seed of ["grocer-room-a", "grocer-room-b"]) {
      await t.test(`${width}×${depth}×${height} m, ${seed}`, async () => {
        const { level, pen } = await grocerFixture(true, width, depth);
        const physical = structuredClone(collisionMesh(level, true));
        const physicalHash = level.physicalHash;
        grocer.furnish({ pen, width, depth, height, key: "shop", kit: new Kit(seed, 2, 0.6, 0.3, false) });
        const indices = stockVertices(level);
        assert.ok(indices.length > 0, "The shop contains no fittings or stock");
        for (const index of indices) {
          const [x, y, z] = level.mesh.positions.slice(index * 3, index * 3 + 3);
          assert.ok(x >= -ROUNDING && x <= width + ROUNDING && y >= -ROUNDING && y <= depth + ROUNDING && z >= -ROUNDING && z <= height + ROUNDING,
            `Grocer prop leaves its room at ${x},${y},${z}: ${seed}, width=${width}`);
        }
        assert.equal(level.physicalHash, physicalHash);
        assert.deepEqual(collisionMesh(level, true), physical);
        assert.ok(level.surfaces.filter(surface => surface.object.startsWith("grocer/$dressing/")).every(surface => !surface.collidable && surface.domain === "visualization"));
        assert.ok(level.surfaces.some(surface => surface.object.startsWith("grocer/$dressing/") && surface.material === "stock-grocer-props"), "Production stock has no atlas material");
        assert.ok(indices.length / 3 <= maximumTriangles, `${seed}, width=${width}: ${indices.length / 3} shop triangles exceeds ${maximumTriangles}`);
      });
    }
  }
});

test("production grocer export embeds and shares the real color, normal, and material-property atlas", async () => {
  const { level, pen } = await grocerFixture(true);
  grocer.furnish({ pen, width: 3.6, depth: 3.4, height: 2.6, key: "shop", kit: new Kit("grocer-pbr", 2, 0.6, 0.3, false) });
  const images = new Map<string, Buffer>();
  const assets = await resolveExportAssets(level, async name => {
    const bytes = await readFile(`projects/dressing-demo/textures/${name}`);
    images.set(name, bytes);
    return bytes;
  });
  const bytes = Buffer.from(toGLB(level, { assets }));
  const jsonLength = bytes.readUInt32LE(12);
  const gltf = JSON.parse(bytes.toString("utf8", 20, 20 + jsonLength));
  const binaryOffset = 28 + jsonLength;
  const materials = gltf.materials.filter((material: { name: string }) => material.name === "stock-grocer-props");
  assert.equal(materials.length, 1, "Repeated props should share their production material");
  const [material] = materials;
  const bindings = [material.pbrMetallicRoughness.baseColorTexture, material.normalTexture, material.pbrMetallicRoughness.metallicRoughnessTexture];
  const sources = new Set<number>();
  for (const [index, binding] of bindings.entries()) {
    assert.ok(binding, `Missing production material channel: ${ATLAS_FILES[index]}`);
    const source = gltf.textures[binding.index].source;
    sources.add(source);
    const image = gltf.images[source];
    assert.equal(image.uri, undefined, "The portable model must embed its atlas");
    const view = gltf.bufferViews[image.bufferView];
    assert.ok(view && view.byteLength > 0);
    const embedded = bytes.subarray(binaryOffset + (view.byteOffset ?? 0), binaryOffset + (view.byteOffset ?? 0) + view.byteLength);
    assert.deepEqual(embedded, images.get(ATLAS_FILES[index]), `Wrong bytes bound as ${ATLAS_FILES[index]}`);
  }
  assert.equal(sources.size, 3, "PBR channels must not accidentally share one image");
  assert.ok(gltf.images.length <= 4, "Store props duplicated atlas images per instance");
  assert.equal(material.pbrMetallicRoughness.roughnessFactor, 1);
  assert.equal(material.pbrMetallicRoughness.metallicFactor, 1);
  assert.equal((await validateBytes(bytes)).issues.numErrors, 0);
});
