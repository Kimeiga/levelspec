import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { Box3, Matrix4, Ray, Triangle, Vector3 } from "three";
import { collisionMesh, compile, parseAml } from "levelspec";
import { Rng } from "../src/generate/rng.ts";
import { Pen } from "../src/dressing/pen.ts";
import { KitMesh } from "../src/dressing/kit-mesh.ts";
import { kitFinishes, kitMaterials } from "../src/dressing/kit.ts";
import { Kit } from "../src/dressing/kowloon/kit.ts";
import { grocer } from "../src/dressing/kowloon/shop/grocer.ts";
import { planGrocerLayout, type GrocerFixture, type GrocerLayout } from "../src/dressing/kowloon/shop/grocer-layout.ts";
import catalog from "../src/dressing/kowloon/shop/assets/grocer-props.json" with { type: "json" };
import { grocerAssetTriangles, groundedTriangles } from "./support/grocer-assets.ts";

type Level = Awaited<ReturnType<typeof compile>>;
type Prop = keyof typeof catalog;
const EPSILON = 0.00002;
const ROOMS = [
  { width: 2.2, depth: 2.6, height: 2.4, maximum: 35000 },
  { width: 3.6, depth: 3.4, height: 2.6, maximum: 45000 },
  { width: 2.2, depth: 2.4, height: 2.48, maximum: 35000 },
  { width: 1.8, depth: 2.4, height: 2.08, maximum: 35000 },
];
const FAMILIES = ["front-counter", "side-counter", "recessed-counter"];

/** Measures all eight fixture corners in room coordinates, including stock above a shelf. */
function fixtureBox(fixture: GrocerFixture, above = 0): Box3 {
  const matrix = new Matrix4().makeRotationZ(fixture.turn).setPosition(...fixture.origin);
  const points: Vector3[] = [];
  for (const x of [0, fixture.size[0]]) for (const y of [0, fixture.size[1]]) for (const z of [0, fixture.size[2] + above])
    points.push(new Vector3(x, y, z).applyMatrix4(matrix));
  return new Box3().setFromPoints(points);
}

/** Lists the occupied volumes of independently supported furnishings. */
function reservations(layout: GrocerLayout) {
  return [layout.counter, layout.cooler, ...layout.shelves, layout.crates, layout.sacks, layout.stool]
    .filter((fixture): fixture is GrocerFixture => !!fixture)
    .map(fixture => ({ id: fixture.id, box: fixtureBox(fixture, "above" in fixture ? Number(fixture.above) : 0) }));
}

/** Ignores touching support faces and rejects a positive-volume intersection. */
function overlaps(left: Box3, right: Box3): boolean {
  return ["x", "y", "z"].every(axis => {
    const key = axis as "x" | "y" | "z";
    return Math.min(left.max[key], right.max[key]) - Math.max(left.min[key], right.min[key]) > EPSILON;
  });
}

/** Reflects a reservation when the chosen shop layout places its counter on the opposite side. */
function roomBox(fixture: GrocerFixture, layout: GrocerLayout, width: number, above = 0): Box3 {
  const box = fixtureBox(fixture, above);
  if (layout.mirrored) {
    const minimum = width - box.max.x;
    box.max.x = width - box.min.x;
    box.min.x = minimum;
  }
  return box.expandByScalar(EPSILON);
}

test("grocer plans offer three actual arrangements and keep all primary fixture reservations separate", () => {
  for (const room of ROOMS) {
    const choices = new Set<string>();
    for (let index = 0; index < 64; index++) {
      const seed = `layout-${index}`, plan = planGrocerLayout(room.width, room.depth, room.height, new Rng(seed));
      assert.deepEqual(planGrocerLayout(room.width, room.depth, room.height, new Rng(seed)), plan, "A fixed layout seed moved a fixture");
      choices.add(`${plan.kind}/${plan.mirrored}`);
      const fixtures = reservations(plan);
      assert.equal(new Set(fixtures.map(fixture => fixture.id)).size, fixtures.length, "Independent fixtures share a random-stream identity");
      for (const { id, box } of fixtures) {
        assert.ok(box.min.x >= -EPSILON && box.min.y >= -EPSILON && box.min.z >= -EPSILON
          && box.max.x <= room.width + EPSILON && box.max.y <= room.depth + EPSILON && box.max.z <= room.height + EPSILON,
        `${seed}, ${plan.kind}, ${room.width}m: ${id} leaves its room`);
      }
      for (let left = 0; left < fixtures.length; left++) for (let right = left + 1; right < fixtures.length; right++)
        assert.ok(!overlaps(fixtures[left].box, fixtures[right].box),
          `${seed}, ${plan.kind}, ${room.width}m: ${fixtures[left].id} intersects ${fixtures[right].id}`);
      const shelfFrontage = plan.shelves.filter(shelf => shelf.levels >= 6).reduce((sum, shelf) => sum + shelf.size[0] * shelf.levels, 0);
      assert.ok(shelfFrontage >= room.width * 6 * .9,
        `${seed}, ${plan.kind}, ${room.width}×${room.depth}m: main shelves lost the equivalent of one nearly full wall at six levels`);
    }
    const families = room.width < 2.2 ? ["front-counter"] : FAMILIES;
    assert.deepEqual([...choices].sort(), families.flatMap(kind => [`${kind}/false`, `${kind}/true`]).sort());
  }
});

/** Builds real production furnishings on a native physical floor without the unrelated appearance bake. */
async function render(room: typeof ROOMS[number], seed: string, detail = 2) {
  const level = await compile(parseAml(`<architecture version="1" id="grocer-layout" validation="premap">
    <material id="finish" color="#999999"/><material id="rack-wood" color="#ffffff"/>
    <material id="stock-grocer-props" color="#ffffff" texture="grocer-props.png"/>
    <material id="stock-snack-packet" color="#ffffff" texture="snack-packet.png"/>
    <profile id="floor-plan" points="0 0; ${room.width} 0; ${room.width} ${room.depth}; 0 ${room.depth}"/>
    <slab id="floor" profile="floor-plan" thickness="0.1" material="finish"/>
  </architecture>`), { navigation: true });
  assert.deepEqual(level.diagnostics, []);
  const physical = structuredClone(collisionMesh(level, true)), navigation = structuredClone(level.navigation), hash = level.physicalHash;
  assert.ok(navigation, "The fixture did not produce an independent navigation report");
  level.mesh.colors = Array(level.mesh.positions.length).fill(1);
  kitMaterials(level);
  const { materials } = kitFinishes(level, "stock", "finish");
  materials.timber = "rack-wood";
  const mesh = new KitMesh(level, "grocer", "props", materials, { maximumTriangles: 100000 });
  grocer.furnish({ pen: new Pen(mesh, "shop-grocer", new Matrix4(), false), ...room, key: "shop", kit: new Kit(seed, detail, .6, .3, false) });
  assert.deepEqual(collisionMesh(level, true), physical, "Decorative layout changed physical geometry");
  assert.deepEqual(level.navigation, navigation, "Decorative layout changed navigation");
  assert.equal(level.physicalHash, hash);
  return level;
}

/** Reads emitted triangle indices by their presentation ownership, excluding the authored floor. */
function furnishings(level: Level) {
  return level.mesh.surfaces.flatMap((surfaceIndex, triangle) => {
    const surface = level.surfaces[surfaceIndex];
    if (!surface.object.startsWith("grocer/$dressing/")) return [];
    return [{ indices: level.mesh.indices.slice(triangle * 3, triangle * 3 + 3), material: surface.material }];
  });
}

/** Identifies real catalog corners by their authored atlas coordinates, independently of placement metadata. */
function propPoints(level: Level, name: Prop): Vector3[] {
  const triangles = grocerAssetTriangles(level, name);
  return (name === "rice-sack" ? groundedTriangles(triangles) : triangles).flat();
}

/** Distinguishes furniture arrangements after discarding left/right reflection and small position jitter. */
function arrangement(counter: Box3, roomWidth: number): string {
  const size = counter.getSize(new Vector3()), center = counter.getCenter(new Vector3());
  let family = "front-counter";
  if (size.y > size.x) family = "side-counter";
  else if (counter.min.y > .5) family = "recessed-counter";
  return `${family}/${center.x < roomWidth / 2 ? "left" : "right"}`;
}

/** Checks the real prop envelopes and shelf faces, including contents on the counter. */
function inspectFurnishings(level: Level, room: typeof ROOMS[number], seed: string): string {
  const triangles = furnishings(level);
  const layout = planGrocerLayout(room.width, room.depth, room.height, new Rng(`${seed}/shop/layout`));
  const shelfBoxes = layout.shelves.map(shelf => roomBox(shelf, layout, room.width, shelf.above));
  assert.ok(triangles.length > 0 && triangles.length <= room.maximum, `${seed}: ${triangles.length} exceeds the ${room.maximum} triangle budget`);
  for (const triangle of triangles) for (const index of triangle.indices) {
    const [x, y, z] = level.mesh.positions.slice(index * 3, index * 3 + 3);
    assert.ok(x >= -EPSILON && x <= room.width + EPSILON && y >= -EPSILON && y <= room.depth + EPSILON
      && z >= -EPSILON && z <= room.height + EPSILON, `${seed}: an emitted prop leaves its room at ${x},${y},${z}`);
  }
  const counterPoints = propPoints(level, "shop-counter"), counter = new Box3().setFromPoints(counterPoints);
  assert.equal(counterPoints.length, catalog["shop-counter"].faces.length * 3, "The store lost its single complete counter");
  const primary: { id: string; box: Box3 }[] = [];
  const placements = { "shop-counter": layout.counter, "shop-stool": layout.stool, "drinks-cooler": layout.cooler,
    "rice-sack": layout.sacks, "bottle-crate": layout.crates };
  for (const id of Object.keys(placements) as (keyof typeof placements)[]) {
    const points = id === "shop-counter" ? counterPoints : propPoints(level, id);
    if (id === "drinks-cooler" && room.width < 2.5) continue;
    assert.ok(points.length > 0, `${seed}: ${id} disappeared from the arrangement`);
    const box = new Box3().setFromPoints(points);
    assert.ok(Math.abs(box.min.z) <= EPSILON, `${seed}: ${id} floats above its floor`);
    const reserved = roomBox(placements[id]!, layout, room.width);
    assert.ok(points.every(point => reserved.containsPoint(point)),
      `${seed}: actual ${id} leaves the space reserved for it`);
    if (id === "shop-counter") box.expandByPoint(new Box3().setFromPoints(propPoints(level, "counter-scale")).max);
    primary.push({ id, box });
  }
  for (let left = 0; left < primary.length; left++) for (let right = left + 1; right < primary.length; right++)
    assert.ok(!overlaps(primary[left].box, primary[right].box), `${seed}: actual ${primary[left].id} intersects ${primary[right].id}`);
  for (const item of triangles.filter(triangle => triangle.material === "rack-wood")) {
    const vertices = item.indices.map(index => new Vector3().fromArray(level.mesh.positions, index * 3));
    if (Math.max(vertices[0].distanceTo(vertices[1]), vertices[1].distanceTo(vertices[2]), vertices[2].distanceTo(vertices[0])) < .06) continue;
    const face = new Triangle(...vertices as [Vector3, Vector3, Vector3]);
    assert.ok(shelfBoxes.some(box => vertices.every(point => box.containsPoint(point))),
      `${seed}: an actual shelf board leaves all planned shelf reservations`);
    for (const fixture of primary) assert.ok(!fixture.box.clone().expandByScalar(-EPSILON).intersectsTriangle(face),
      `${seed}: a shelf board crosses the actual ${fixture.id} envelope`);
  }
  const stocked = [...shelfBoxes, roomBox(layout.counter, layout, room.width), roomBox(layout.crates, layout, room.width), roomBox(layout.sacks, layout, room.width)];
  if (layout.cooler) stocked.push(roomBox(layout.cooler, layout, room.width));
  for (const name of ["drink-bottle", "food-tin", "tea-carton", "seasoning-jar", "tissue-roll", "dry-goods-bag", "stock-box"] as const)
    assert.ok(propPoints(level, name).every(point => stocked.some(box => box.containsPoint(point))),
      `${seed}: ${name} leaves its actual fixture's reserved stock volume`);
  return arrangement(counter, room.width);
}

test("production grocers realize every layout and handedness with supported, separate fixtures", async () => {
  for (const room of ROOMS) {
    const seen = new Set<string>();
    const families = room.width < 2.2 ? ["front-counter"] : FAMILIES;
    for (let index = 0; index < 32 && seen.size < families.length * 2; index++) {
      const seed = `layout-render-${index}`, level = await render(room, seed);
      seen.add(inspectFurnishings(level, room, seed));
    }
    assert.deepEqual([...seen].sort(), families.flatMap(kind => [`${kind}/left`, `${kind}/right`]).sort(),
      `${room.width}m shops only mirror or shuffle the same furniture arrangement`);
  }
});

/** Detects a proper surface crossing while permitting coplanar faces and resting contact. */
function crosses(left: Triangle, right: Triangle): boolean {
  for (const [face, target] of [[left, right], [right, left]]) {
    const normal = target.getNormal(new Vector3());
    const distances = [face.a, face.b, face.c].map(point => point.clone().sub(target.a).dot(normal));
    if (Math.min(...distances) >= -EPSILON || Math.max(...distances) <= EPSILON) return false;
  }
  for (const [face, target] of [[left, right], [right, left]]) {
    const points = [face.a, face.b, face.c];
    for (let index = 0; index < 3; index++) {
      const origin = points[index], delta = points[(index + 1) % 3].clone().sub(origin), length = delta.length();
      const hit = new Ray(origin, delta.normalize()).intersectTriangle(target.a, target.b, target.c, false, new Vector3());
      if (hit && hit.distanceTo(origin) > EPSILON && hit.distanceTo(origin) < length - EPSILON) return true;
    }
  }
  return false;
}

test("hanging lights and fan blades clear the actual shelving at shallow and low-ceiling boundaries", async () => {
  const cases = [
    { width: 1.8, depth: 3.1, height: 2.2, maximum: 35000, seed: "fan-clearance-4", requireFan: false },
    { width: 1.8, depth: 3.4, height: 2.2, maximum: 35000, seed: "fan-clearance-4", requireFan: true },
    { width: 2.2, depth: 2.9, height: 2.48, maximum: 35000, seed: "layout-render-4", requireFan: false },
  ];
  for (const room of cases) {
    const level = await render(room, room.seed);
    const faces = furnishings(level).map(item => {
      const vertices = item.indices.map(index => new Vector3().fromArray(level.mesh.positions, index * 3));
      return { material: item.material, face: new Triangle(...vertices as [Vector3, Vector3, Vector3]), box: new Box3().setFromPoints(vertices) };
    });
    const boards = faces.filter(item => item.material === "rack-wood"
      && Math.max(item.face.a.distanceTo(item.face.b), item.face.b.distanceTo(item.face.c), item.face.c.distanceTo(item.face.a)) > .06);
    const overhead = faces.filter(item => item.material !== "rack-wood" && !item.material.startsWith("stock-") && item.box.min.z > 1.3);
    assert.ok(boards.length > 0 && overhead.length > 0);
    for (const fitting of overhead) for (const board of boards) {
      if (!fitting.box.intersectsBox(board.box)) continue;
      assert.ok(!crosses(fitting.face, board.face), `${room.seed}, ${room.width}×${room.depth}×${room.height}m: ${fitting.material} fitting ${JSON.stringify(fitting.box)} crosses shelf face ${JSON.stringify(board.box)}`);
    }
    if (room.requireFan) {
      const hub = overhead.filter(item => item.material === "$kowloon/metal" && item.box.min.x > room.width / 2 - .12
        && item.box.max.x < room.width / 2 + .12 && item.box.min.y > room.depth / 2 + .4 && item.box.max.z < room.height - .1);
      assert.ok(hub.length >= 10, "A sufficiently deep room lost its selected ceiling fan instead of placing it clear of the shelves");
    }
  }
});

/** Normalizes actual face content so detail comparisons ignore material and vertex allocation order. */
function faceContent(level: Level): Set<string> {
  return new Set(furnishings(level).map(triangle => JSON.stringify({
    material: triangle.material,
    vertices: triangle.indices.map(index => [
      ...level.mesh.positions.slice(index * 3, index * 3 + 3),
      ...level.mesh.uv.slice(index * 2, index * 2 + 2),
      ...level.mesh.colors!.slice(index * 3, index * 3 + 3),
    ]),
  })));
}

test("layout geometry repeats its seed and increasing detail only adds furnishings", async () => {
  const room = ROOMS[1], seed = "layout-repeat", high = faceContent(await render(room, seed));
  const repeated = faceContent(await render(room, seed));
  /** Keeps large geometry comparisons readable on failure. */
  const digest = (faces: Set<string>) => createHash("sha256").update([...faces].sort().join("\n")).digest("hex");
  assert.equal(digest(repeated), digest(high), "Repeated generation moved or restocked the shop");
  let previous = faceContent(await render(room, seed, 0));
  for (const current of [faceContent(await render(room, seed, 1)), high]) {
    assert.ok([...previous].every(face => current.has(face)), "Higher detail displaced or restocked an existing fixture");
    previous = current;
  }
});
