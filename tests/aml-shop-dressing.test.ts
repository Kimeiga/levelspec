import { test } from "node:test";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { collisionMesh, compile, parseAml, serializeAml, resolveExportAssets, toGLB } from "levelspec";
import { validateBytes } from "gltf-validator";
import { Matrix4, Vector3 } from "three";
import { Rng } from "../src/generate/rng.ts";
import { Pen } from "../src/dressing/pen.ts";
import { KitMesh } from "../src/dressing/kit-mesh.ts";
import { kitFinishes } from "../src/dressing/kit.ts";
import { stockShelf } from "../src/dressing/kowloon/shop/goods.ts";

type Point = [number, number, number];
type Level = Awaited<ReturnType<typeof compile>>;
interface PartTriangle {
  points: Point[];
  normals: Point[];
  color: Point;
  part: string;
}

/** A building box in its own frame: front on Y=0, footprint in +X/+Y, meters. */
interface Mass {
  width: number;
  depth: number;
  height: number;
  /** Stories named on the recipe; omitted leaves them to the box height. */
  stories?: number;
}

/** A shop room in building coordinates: its opening spans x0..x1 and z0..z1 on the front plane. */
interface Room {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  depth: number;
}

/** How a building box is placed: its AML attribute and the maps between its frame and the world. */
interface Placement {
  attribute: string;
  toWorld: (p: Point) => Point;
  toLocal: (p: Point) => Point;
}

const YAW = (35 * Math.PI) / 180;
/** Rotates a point about the vertical axis. */
const turn = ([x, y, z]: Point, angle: number): Point => [
  x * Math.cos(angle) - y * Math.sin(angle),
  x * Math.sin(angle) + y * Math.cos(angle),
  z,
];
const PLACEMENTS: Placement[] = [
  { attribute: "", toWorld: (p) => p, toLocal: (p) => p },
  { attribute: 'rotation="0 0 35"', toWorld: (p) => turn(p, YAW), toLocal: (p) => turn(p, -YAW) },
  { attribute: 'scale="-1 1 1"', toWorld: ([x, y, z]) => [-x, y, z], toLocal: ([x, y, z]) => [-x, y, z] },
];

/** A row wide enough for several tenements and many shop bays; large by every documented measure. */
const ROW: Mass = { width: 30, depth: 9, height: 15.35, stories: 5 };
/** The five documented trades, as they appear in part names after `shop-`. */
const TRADES = ["grocer", "greengrocer", "roast", "hardware", "herbalist"];
/**
 * Generated vertices are rounded to 0.01 mm in world space, so positions
 * measured in a rotated building frame agree to about 0.02 mm, not exactly.
 */
const ROUNDING = 1e-4;

const subtract = (a: Point, b: Point): Point => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: Point, b: Point): Point => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const dot = (a: Point, b: Point) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** Lists the triangles generated for one dressing host, with their part name after `$dressing/`. */
function partTriangles(level: Level, host = "building"): PartTriangle[] {
  const prefix = `${host}/$dressing/`;
  const triangles: PartTriangle[] = [];
  for (let t = 0; t < level.mesh.surfaces.length; t++) {
    const surface = level.surfaces[level.mesh.surfaces[t]];
    if (!surface.object.startsWith(prefix)) continue;
    const indices = level.mesh.indices.slice(t * 3, t * 3 + 3);
    triangles.push({
      points: indices.map((i) => level.mesh.positions.slice(i * 3, i * 3 + 3) as Point),
      normals: indices.map((i) => level.mesh.normals.slice(i * 3, i * 3 + 3) as Point),
      color: level.mesh.colors!.slice(indices[0] * 3, indices[0] * 3 + 3) as Point,
      part: surface.object.slice(prefix.length),
    });
  }
  return triangles;
}

/** True for the parts that hold a shop's fittings and stock. */
const isStock = (triangle: PartTriangle) => triangle.part.startsWith("shop-");

/**
 * Lists every crossing of the segment from `origin` to `target`, nearest
 * first, as a fraction of its length and whether the triangle's winding faces
 * the origin. Barycentric bounds are widened by 1e-7 so a ray along a shared
 * edge still registers.
 */
function crossings(triangles: PartTriangle[], origin: Point, target: Point) {
  const direction = subtract(target, origin);
  const hits: { fraction: number; front: boolean }[] = [];
  for (const triangle of triangles) {
    const [a, b, c] = triangle.points;
    const ab = subtract(b, a),
      ac = subtract(c, a);
    const p = cross(direction, ac),
      determinant = dot(ab, p);
    if (Math.abs(determinant) < 1e-12) continue;
    const s = subtract(origin, a),
      u = dot(s, p) / determinant;
    const q = cross(s, ab),
      v = dot(direction, q) / determinant;
    if (u < -1e-7 || v < -1e-7 || u + v > 1 + 1e-7) continue;
    const fraction = dot(ac, q) / determinant;
    if (fraction <= 1e-9 || fraction >= 1) continue;
    hits.push({ fraction, front: dot(cross(ab, ac), direction) < 0 });
  }
  return hits.sort((first, second) => first.fraction - second.fraction);
}

/** Authoring options for one standalone building mass. */
interface Authoring {
  seed?: string;
  /** Text of the recipe's `shops` attribute; omitted leaves the attribute out. */
  shops?: string;
  detail?: string;
  placement?: string;
  /** Extra elements beside the building box. */
  elements?: string;
  /** Extra dressing recipes beside the building recipe. */
  recipes?: string;
}

/** Writes a level holding one building recipe on a box named `building`. */
function shopSource(mass: Mass, options: Authoring = {}): string {
  const shops = options.shops === undefined ? "" : ` shops="${options.shops}"`;
  const stories = mass.stories === undefined ? "" : ` stories="${mass.stories}"`;
  return `<architecture version="1" id="shop-test" validation="premap">
  <material id="finish" color="#c6c2b4" repeat="0.5"/>
  <box id="building" ${options.placement ?? ""} width="${mass.width}" depth="${mass.depth}" height="${mass.height}" collidable="false"/>${options.elements ?? ""}
  <dressing seed="${options.seed ?? "shops"}" detail="${options.detail ?? "medium"}" grime="0.6" wear="0.2">
    <building host="building" material="finish"${stories}${shops}/>${options.recipes ?? ""}
  </dressing>
</architecture>`;
}

/** Compiles a source without navigation and requires a clean result. */
async function build(source: string): Promise<Level> {
  // Room geometry contracts are independent of the default appearance capacity.
  const level = await compile(parseAml(source), { navigation: false,
    appearance: { maximumTexels: 16 * 1024 * 1024, maximumBytes: 128 * 1024 * 1024 } });
  assert.deepEqual(level.diagnostics, [], source);
  return level;
}

/** The triangles generated for `host`, expressed in the building frame of `placement`. */
function localTriangles(level: Level, placement = PLACEMENTS[0], host = "building"): PartTriangle[] {
  const origin = placement.toLocal([0, 0, 0]);
  return partTriangles(level, host).map((triangle) => ({
    ...triangle,
    points: triangle.points.map(placement.toLocal),
    normals: triangle.normals.map((normal) => subtract(placement.toLocal(normal), origin)),
  }));
}

/**
 * Finds shop rooms from the shell alone, given triangles in the building
 * frame. A room is as high as its opening, at most 2.6 m, while ground
 * stories are at least 2.6 m tall and upper bodies start above them; so a
 * street-facing envelope face that lies below 2.6 m and more than 1 m behind
 * the front plane can only be the back wall of a room. Faces within 0.05 m of
 * each other along X at one depth belong to one room; piers keep rooms apart.
 */
function rooms(triangles: PartTriangle[]): Room[] {
  const backs = triangles
    .filter(
      (triangle) =>
        triangle.part === "envelope" &&
        triangle.normals[0][1] < -0.99 &&
        triangle.points.every((p) => p[1] > 1 && p[2] < 2.6 + ROUNDING),
    )
    .map(({ points }) => ({
      x0: Math.min(...points.map((p) => p[0])),
      x1: Math.max(...points.map((p) => p[0])),
      z0: Math.min(...points.map((p) => p[2])),
      z1: Math.max(...points.map((p) => p[2])),
      depth: points[0][1],
    }))
    .sort((a, b) => a.x0 - b.x0);
  const found: Room[] = [];
  for (const back of backs) {
    const last = found.at(-1);
    if (last && back.x0 <= last.x1 + 0.05 && Math.abs(back.depth - last.depth) < ROUNDING) {
      last.x1 = Math.max(last.x1, back.x1);
      last.z0 = Math.min(last.z0, back.z0);
      last.z1 = Math.max(last.z1, back.z1);
    } else found.push({ ...back });
  }
  return found;
}

/** A room as a comparable label, to the millimeter. */
const label = (room: Room) => [room.x0, room.x1, room.z0, room.z1, room.depth].map((v) => v.toFixed(3)).join(" ");

/** True when a building-frame point lies inside a room, within `slack` meters. */
function within(room: Room, point: Point, slack: number): boolean {
  return (
    point[0] >= room.x0 - slack &&
    point[0] <= room.x1 + slack &&
    point[1] >= -slack &&
    point[1] <= room.depth + slack &&
    point[2] >= room.z0 - slack &&
    point[2] <= room.z1 + slack
  );
}

/** The stock triangles that lie wholly inside `room`, within 1 mm. */
const stockOf = (triangles: PartTriangle[], room: Room) =>
  triangles.filter((triangle) => isStock(triangle) && triangle.points.every((p) => within(room, p, 1e-3)));

/** The trade of the shop in `room`, read from its part name; fails unless the room holds exactly one. */
function tradeOf(triangles: PartTriangle[], room: Room): string {
  const trades = [...new Set(stockOf(triangles, room).map((triangle) => triangle.part.slice("shop-".length)))];
  assert.equal(trades.length, 1, `Room ${label(room)} holds trades ${JSON.stringify(trades)}.`);
  assert.ok(TRADES.includes(trades[0]), `Undocumented trade ${trades[0]}.`);
  return trades[0];
}

/** A set of triangles as a sorted list of 1 mm position signatures. */
const signature = (triangles: PartTriangle[]) =>
  triangles.map(({ points }) => points.map((p) => p.map((v) => Math.round(v * 1000)).join(",")).join(";")).sort();

/** Requires the documented room: a 0.12 m step, a head at 2.2–2.6 m, 2.4–3.6 m deep within 49% of the box. */
function documented(room: Room, mass: Mass): void {
  assert.ok(room.x1 - room.x0 >= 1.8 - 1e-6, `Opening too narrow: ${label(room)}`);
  assert.ok(Math.abs(room.z0 - 0.12) < 1e-6, `Floor step: ${label(room)}`);
  assert.ok(room.z1 >= 2.2 - 1e-6 && room.z1 <= 2.6 + 1e-6, `Opening head: ${label(room)}`);
  assert.ok(room.depth >= 2.4 - 1e-6 && room.depth <= 3.6 + 1e-6, `Room depth: ${label(room)}`);
  assert.ok(room.depth <= 0.49 * mass.depth + 1e-6, `Room deeper than 49%: ${label(room)}`);
  assert.ok(room.x0 > 0 && room.x1 < mass.width);
}

/** Checks emitted stock winding against its normals, accounting for reflected frames. */
function assertStockWinding(parts: PartTriangle[], context: string, mirrored = false): void {
  for (const { points, normals } of parts) {
    const facing = cross(subtract(points[1], points[0]), subtract(points[2], points[0]));
    const shading = normals.reduce((sum, normal) => sum.map((v, k) => v + normal[k]) as Point, [0, 0, 0] as Point);
    assert.ok((mirrored ? -1 : 1) * dot(facing, shading) > 0, `Inside-out stock at ${JSON.stringify(points)}: ${context}`);
  }

}

/** Requires every stock triangle to lie wholly inside one of the rooms, within 1 mm. */
function assertContained(triangles: PartTriangle[], found: Room[], context: string): void {
  for (const triangle of triangles.filter(isStock))
    assert.ok(
      found.some((room) => triangle.points.every((p) => within(room, p, 1e-3))),
      `Stock leaves every room at ${JSON.stringify(triangle.points)} ${context}`,
    );
}

test("shops require room-sized buildings, and shops=0 keeps every bay closed", async () => {
  const open = partTriangles(await build(shopSource(ROW, { shops: "1" })));
  const opened = rooms(open);
  assert.ok(opened.length >= 3, `A 30 m row at shops=1 opened ${opened.length} rooms.`);
  for (const room of opened) documented(room, ROW);

  const closed = partTriangles(await build(shopSource(ROW, { shops: "0" })));
  assert.deepEqual(rooms(closed), []);
  assert.ok(!closed.some(isStock));

  // Each mass misses a necessary footprint measure; per-bay room clearance remains authoritative.
  const small: Mass[] = [
    { width: 4.7, depth: 9, height: 15.35, stories: 5 },
    { width: 30, depth: 4.9, height: 15.35, stories: 5 },
  ];
  for (const mass of small) {
    const level = await compile(parseAml(shopSource(mass, { shops: "1" })), { navigation: false });
    const parts = partTriangles(level);
    assert.deepEqual(rooms(parts), [], JSON.stringify(mass));
    assert.ok(!parts.some(isStock));
    // Asking a building that can never hold a shop for shops is reported at the box, not silently ignored.
    assert.equal(level.diagnostics.length, 1, JSON.stringify(level.diagnostics));
    const [warning] = level.diagnostics;
    assert.equal(warning.code, "DRESSING_NO_SHOP_FIT");
    assert.equal(warning.severity, "warning");
    assert.ok(warning.source && warning.objects.includes("building"));
    assert.ok(warning.review?.bounds.max[2] === mass.height && warning.review.bounds.min[2] === 0);
    // The default chance on the same building is no request, so nothing is reported.
    assert.deepEqual((await compile(parseAml(shopSource(mass)), { navigation: false })).diagnostics, []);
  }

  // Compact tenements can open rooms; their remaining rear structure keeps opposing rooms separate.
  const least: Mass = { width: 6, depth: 5, height: 12.35 };
  let atThreshold = 0;
  for (const seed of ["least-a", "least-b", "least-c", "least-d", "least-e", "least-f"]) {
    const found = rooms(partTriangles(await build(shopSource(least, { shops: "1", seed }))));
    for (const room of found) documented(room, least);
    atThreshold += found.length;
  }
  assert.ok(atThreshold > 0, "A compact building with room clearance never opened a shop.");

  // Four stories in 11.55 m stand 2.8 m apart, so some ground stories fall below the 2.9 m a shop needs;
  // in 12.35 m none does. The lower row keeps only shops of the taller one, and loses some.
  let lost = 0;
  for (const seed of ["low-a", "low-d"]) {
    const [tall, squat] = await Promise.all(
      [12.35, 11.55].map(async (height) => rooms(partTriangles(await build(shopSource({ ...ROW, height, stories: 4 }, { shops: "1", seed }))))),
    );
    const spans = tall.map((room) => `${room.x0.toFixed(3)} ${room.x1.toFixed(3)}`);
    for (const room of squat) {
      documented(room, ROW);
      assert.ok(spans.includes(`${room.x0.toFixed(3)} ${room.x1.toFixed(3)}`), `A lower row opened a bay the taller one keeps closed (${seed}).`);
    }
    lost += tall.length - squat.length;
  }
  assert.ok(lost > 0, "No bay closed for want of a 2.9 m ground story.");
});

test("shops is a per-bay chance: raising it keeps every shop and its stock, and the default is 0.15", async () => {
  const seeds = ["rate-a", "rate-b", "rate-c", "rate-d", "rate-e", "rate-f", "rate-g", "rate-h"];
  const totals = { low: 0, middle: 0, all: 0 };
  const trades = new Set<string>();
  let strictSubsets = 0;
  let defaultChecked = false;
  for (const seed of seeds) {
    const [low, middle, all] = await Promise.all(
      ["0.15", "0.5", "1"].map(async (shops) => {
        const level = await build(shopSource(ROW, { shops, seed }));
        const triangles = partTriangles(level);
        return { level, triangles, rooms: rooms(triangles) };
      }),
    );
    // A shop open at a lower chance is the same shop at a higher one: same room, trade and stock.
    for (const [lower, higher] of [[low, middle], [middle, all]]) {
      const kept = higher.rooms.map(label);
      for (const room of lower.rooms) {
        assert.ok(kept.includes(label(room)), `A shop closed as the chance rose (${seed}): ${label(room)}`);
        assert.deepEqual(signature(stockOf(higher.triangles, room)), signature(stockOf(lower.triangles, room)), `Stock changed as the chance rose (${seed}): ${label(room)}`);
        assert.equal(tradeOf(higher.triangles, room), tradeOf(lower.triangles, room));
      }
    }
    // Some bays open and others stay closed at 0.5, which one roll for the whole building could not do.
    if (middle.rooms.length > 0 && middle.rooms.length < all.rooms.length) strictSubsets++;
    // These rows show every trade, so each is held to the room's contract here as well.
    assertContained(all.triangles, all.rooms, seed);
    for (const room of all.rooms) {
      documented(room, ROW);
      assertStockWinding(stockOf(all.triangles, room), `${label(room)} ${seed}`);
      trades.add(tradeOf(all.triangles, room));
    }
    totals.low += low.rooms.length;
    totals.middle += middle.rooms.length;
    totals.all += all.rooms.length;

    // The default is compared on a row where 0, 0.15 and 0.5 all differ. A chance close to 0.15 could
    // still open the same bays here; this rules out a default of none and one near a half or more.
    if (defaultChecked || low.rooms.length === 0 || low.rooms.length === middle.rooms.length) continue;
    const implicit = await build(shopSource(ROW, { seed }));
    const none = await build(shopSource(ROW, { seed, shops: "0" }));
    assert.equal(implicit.renderHash, low.level.renderHash, "An omitted shops attribute must mean 0.15.");
    assert.notEqual(implicit.renderHash, none.renderHash);
    assert.notEqual(implicit.renderHash, middle.level.renderHash);
    defaultChecked = true;
  }
  assert.ok(defaultChecked, "No seed separates the default from 0 and 0.5.");
  assert.ok(strictSubsets > 0, "At 0.5 every row opened all of its bays or none.");
  assert.ok(totals.low < totals.middle && totals.middle < totals.all, JSON.stringify(totals));
  // Loose by design: over these few dozen bays it only rejects a default rate near one half or more.
  assert.ok(totals.low <= totals.all / 3, JSON.stringify(totals));
  assert.deepEqual([...trades].sort(), [...TRADES].sort(), "Eight 30 m rows must show every documented trade.");
});

test("a room is open to the street, closed to the building, furnished throughout, and unlike its neighbors", async () => {
  /** Unit directions for probe rays: four level ones and two that climb. */
  const directions: Point[] = (
    [
      [0.3371, 0.9413, 0],
      [-0.5033, 0.8641, 0],
      [0.9379, 0.3469, 0],
      [0.7193, -0.6947, 0],
      [0.3137, 0.8961, 0.2871],
      [-0.6029, 0.7411, 0.2953],
    ] as Point[]
  ).map((d) => d.map((v) => v / Math.hypot(...d)) as Point);
  const reach = 3 * ROW.width;
  const trades = new Set<string>();
  // Together these two rows hold all five trades, so each is turned and mirrored.
  for (const seed of ["shell", "m3"]) {
    const layouts: Room[][] = [];
    for (const [index, placement] of PLACEMENTS.entries()) {
      // The unrotated row is also built at low detail, where a shop must be no less furnished.
      const details = index === 0 ? ["medium", "low"] : ["medium"];
      for (const detail of details) {
        const level = await build(shopSource(ROW, { shops: "1", seed, detail, placement: placement.attribute }));
        const triangles = localTriangles(level, placement);
        const found = rooms(triangles);
        assert.ok(found.length >= 3, placement.attribute);
        if (detail === "medium") layouts.push(found);
        const world = partTriangles(level);
        const shell = world.filter((triangle) => ["envelope", "roof"].includes(triangle.part));
        assertContained(triangles, found, `${seed} ${placement.attribute}`);
        for (const room of found) {
          const context = `${label(room)} ${seed} ${placement.attribute} ${detail}`;
          const width = room.x1 - room.x0;
          // Street rays run along Y through the opening, so only triangles over its X span can meet them.
          const over = (candidates: PartTriangle[]) =>
            candidates.filter((_, i) => Math.max(...triangles[i].points.map((p) => p[0])) > room.x0 && Math.min(...triangles[i].points.map((p) => p[0])) < room.x1);
          const facing = over(world);
          const structure = facing.filter((triangle) => !isStock(triangle));

          // Seen from the street, the middle of the opening shows the room: no closed front, pipe or panel
          // of any part stands across it, and the first thing behind the front plane is the shop itself.
          for (const fx of [0.2, 0.35, 0.5, 0.65, 0.8])
            for (const fz of [0.1, 0.3, 0.5, 0.7, 0.85]) {
              const x = room.x0 + fx * width,
                z = room.z0 + fz * (room.z1 - room.z0 - 0.3);
              const from: Point = [x, -4, z],
                to: Point = [x, room.depth + 0.5, z];
              const closing = crossings(structure, placement.toWorld(from), placement.toWorld(to));
              assert.ok(closing.length > 0 && closing[0].front, `Nothing closes the room: ${context}`);
              const wall = -4 + closing[0].fraction * (room.depth + 4.5);
              assert.ok(Math.abs(wall - room.depth) < ROUNDING, `Something stands across the opening at X=${x}, Z=${z}, Y=${wall}: ${context}`);
              const nearest = crossings(facing, placement.toWorld(from), placement.toWorld(to))[0];
              assert.ok(-4 + nearest.fraction * (room.depth + 4.5) > -ROUNDING, `A part stands in front of the opening at X=${x}, Z=${z}: ${context}`);
            }

          // A closed shell is entered as often as it is left along any line through the room.
          let cast = 0;
          for (const fx of [0.0713, 0.4519, 0.9041])
            for (const fy of [0.0713, 0.4519, 0.9041])
              for (const fz of [0.0713, 0.4519, 0.9041]) {
                const probe: Point = [room.x0 + fx * width, fy * room.depth, room.z0 + fz * (room.z1 - room.z0)];
                for (const direction of directions) {
                  // Rays stay above the open base of the building.
                  const before = direction[2] > 0 ? Math.min(reach, (probe[2] - 0.01) / direction[2]) : reach;
                  const start = probe.map((v, k) => v - direction[k] * before) as Point,
                    end = probe.map((v, k) => v + direction[k] * reach) as Point;
                  const outside = start[0] < -0.6 || start[0] > ROW.width + 0.6 || start[1] < -0.6 || start[1] > ROW.depth + 0.6;
                  if (!outside) continue;
                  const hits = crossings(shell, placement.toWorld(start), placement.toWorld(end));
                  const entered = hits.filter((hit) => hit.front).length;
                  assert.equal(entered, hits.length - entered, `The shell is open through ${probe} toward ${direction}: ${context}`);
                  cast++;
                }
              }
          // The four level directions always start outside the footprint.
          assert.ok(cast >= 27 * 4, `Only ${cast} probe rays were cast: ${context}`);

          const parts = stockOf(triangles, room);
          assertStockWinding(parts, context, placement === PLACEMENTS[2]);
          trades.add(tradeOf(triangles, room));
        }
      }
    }
    // A turned or mirrored building is the same building: its rooms agree to the rounding of its vertices.
    for (const layout of layouts.slice(1)) {
      assert.equal(layout.length, layouts[0].length);
      for (const [k, room] of layout.entries())
        for (const key of ["x0", "x1", "z0", "z1", "depth"] as const)
          assert.ok(Math.abs(room[key] - layouts[0][k][key]) < ROUNDING, `Room ${k} differs in ${key} when the building is placed otherwise (${seed}).`);
    }
  }
  assert.deepEqual([...trades].sort(), [...TRADES].sort(), "The two rows must hold every trade.");
});

test("a shop changes nothing outside its own bay", async () => {
  for (const seed of ["local-a", "local-b"]) {
    const closed = partTriangles(await build(shopSource(ROW, { shops: "0", seed, detail: "high" })));
    const open = partTriangles(await build(shopSource(ROW, { shops: "1", seed, detail: "high" })));
    const found = rooms(open);
    assert.ok(found.length >= 3);
    // A bay reaches at most 0.3 m of pier beyond its opening; 0.45 m also clears the shutter guides.
    const inBay = ({ points }: PartTriangle) => found.some((room) => points.some((p) => p[0] > room.x0 - 0.45 && p[0] < room.x1 + 0.45));
    // The wall skin of a ground story with a shop is re-cut along its whole length, and the building
    // surveys its signs as a whole, so a new fascia may change which others it keeps. Nothing else may move.
    const elsewhere = (triangles: PartTriangle[]) =>
      signature(
        triangles.filter(
          (triangle) => !isStock(triangle) && triangle.part !== "signage" && !inBay(triangle) && (triangle.part !== "envelope" || triangle.points.every((p) => p[2] > 3.9)),
        ),
      );
    assert.deepEqual(elsewhere(open), elsewhere(closed), `Opening shops changed the building beyond their bays (${seed}).`);
    // The comparison is not vacuous: doors and closed fronts stand in the bays that stayed.
    assert.ok(closed.some((triangle) => triangle.part === "openings" && !inBay(triangle) && triangle.points.every((p) => p[2] < 2.6)));
    // Above the ground stories even the bays of the shops are untouched, apart from pipes turned into the wall.
    const above = (triangles: PartTriangle[]) =>
      signature(triangles.filter((triangle) => !["fixtures", "signage"].includes(triangle.part) && triangle.points.every((p) => p[2] > 3.9)));
    assert.deepEqual(above(open), above(closed));
  }
});

test("shops leave physics alone, repeat for a seed, export cleanly, and respect the projection limits behind a base wall", async () => {
  const attached = (dressed: boolean) => `<architecture version="1" id="shop-attachment" validation="premap">
  <material id="finish" color="#c6c2b4" repeat="0.5"/>
  <path id="boundary-axis" points="0 0.1 0; ${ROW.width} 0.1 0"/>
  <wall id="boundary" path="boundary-axis" thickness="0.2" height="3"/>${
    dressed
      ? `
  <box id="building" width="${ROW.width}" depth="${ROW.depth}" height="${ROW.height}" collidable="false"/>
  <dressing seed="attached" detail="high" grime="0.6" wear="0.2">
    <building host="building" base-wall="boundary" material="finish" stories="${ROW.stories}" shops="1"/>
  </dressing>`
      : ""
  }
</architecture>`;
  const [plain, dressed, repeated] = await Promise.all([build(attached(false)), build(attached(true)), build(attached(true))]);
  const parts = partTriangles(dressed);
  // The base wall stands inside every room's front plane and must not keep the bays closed.
  assert.ok(rooms(parts).length >= 1);
  assert.ok(dressed.mesh.surfaces.every((index) => dressed.surfaces[index].object !== "boundary"));
  assert.equal(dressed.renderHash, repeated.renderHash);
  assert.deepEqual(toGLB(dressed), toGLB(repeated));
  assert.equal((await validateBytes(toGLB(dressed))).issues.numErrors, 0);
  assert.equal(dressed.physicalHash, plain.physicalHash);
  assert.deepEqual(collisionMesh(dressed, true), collisionMesh(plain, true));
  assert.ok(dressed.surfaces.filter((surface) => surface.object.startsWith("building/$dressing/")).every((surface) => surface.collidable === false));

  /** Largest distance outside the footprint rectangle, in meters. */
  const overhang = (point: Point) => Math.max(-point[0], point[0] - ROW.width, -point[1], point[1] - ROW.depth, 0);
  for (const { points, part } of parts) {
    for (const point of points) {
      assert.ok(point[2] >= -1e-6, `${part} dips below the base at ${point}`);
      assert.ok(overhang(point) <= 1.6 + 1e-6, `${part} overhangs at ${point}`);
    }
    // Head clearance is not convex, so each edge is checked where it lies below 2.5 m.
    for (let edge = 0; edge < 3; edge++) {
      const a = points[edge],
        b = points[(edge + 1) % 3];
      if (Math.min(a[2], b[2]) >= 2.5) continue;
      const cut = a[2] < 2.5 === b[2] < 2.5 ? undefined : (2.5 - a[2]) / (b[2] - a[2]);
      const low = [a, b].filter((p) => p[2] < 2.5);
      if (cut !== undefined) low.push(a.map((v, k) => v + (b[k] - v) * (cut - Math.sign(b[2] - a[2]) * 1e-9)) as Point);
      for (const point of low) assert.ok(overhang(point) <= 0.15 + 1e-6, `${part} intrudes on head clearance at ${point}`);
    }
  }
});

test("detail never moves a shop or changes its trade, and only adds to its stock", async () => {
  const levels: PartTriangle[][] = [];
  for (const detail of ["low", "medium", "high"]) levels.push(partTriangles(await build(shopSource(ROW, { shops: "1", seed: "shell", detail }))));
  const found = rooms(levels[0]);
  assert.ok(found.length >= 3);
  /** Triangles of the stock as a multiset of 1 mm position signatures. */
  const counted = (triangles: PartTriangle[]) => {
    const counts = new Map<string, number>();
    for (const key of signature(triangles.filter(isStock))) counts.set(key, (counts.get(key) ?? 0) + 1);
    return counts;
  };
  for (let i = 0; i + 1 < levels.length; i++) {
    assert.deepEqual(rooms(levels[i + 1]).map(label), found.map(label));
    for (const room of found) assert.equal(tradeOf(levels[i + 1], room), tradeOf(levels[i], room));
    for (const part of ["envelope", "openings"])
      assert.deepEqual(
        signature(levels[i + 1].filter((triangle) => triangle.part === part)),
        signature(levels[i].filter((triangle) => triangle.part === part)),
        `${part} depends on detail.`,
      );
    const lower = counted(levels[i]),
      higher = counted(levels[i + 1]);
    for (const [key, count] of lower) assert.ok((higher.get(key) ?? 0) >= count, `A shop lost a triangle between detail levels ${i} and ${i + 1}.`);
  }
});

test("a bay keeps its closed front where the room would meet collision or another building", async () => {
  // A collidable vault and another building recipe each stand inside the block behind the frontage.
  const vault = { x0: 2, x1: 9 },
    annex = { x0: 17, x1: 23 };
  const intruders = {
    elements: `
  <box id="vault" position="${vault.x0} 0.6 0" width="${vault.x1 - vault.x0}" depth="2" height="3"/>
  <box id="annex" position="${annex.x1} 0.5 0" rotation="0 0 90" width="8" depth="${annex.x1 - annex.x0}" height="9.35" collidable="false"/>`,
    recipes: '\n    <building host="annex" material="finish" stories="3"/>',
  };
  const overlaps = (room: Room, span: { x0: number; x1: number }) => room.x1 > span.x0 + 0.01 && room.x0 < span.x1 - 0.01;
  // These seeds open rooms in both spans when nothing stands there.
  for (const seed of ["clear-a", "clear-d"]) {
    const free = rooms(partTriangles(await build(shopSource(ROW, { shops: "1", seed }))));
    // Without the intruders the same row opens rooms there, so the checks below are not vacuous.
    for (const span of [vault, annex]) assert.ok(free.some((room) => overlaps(room, span)), `No room to block for ${seed}.`);
    const blocked = partTriangles(await build(shopSource(ROW, { shops: "1", seed, ...intruders })));
    // Exactly the rooms that would meet an intruder are gone; every other bay opens as before.
    const expected = free.filter((room) => !overlaps(room, vault) && !overlaps(room, annex));
    assert.ok(expected.length > 0 && expected.length < free.length);
    assert.deepEqual(rooms(blocked).map(label), expected.map(label));
    // A blocked bay is closed, not cut open and left without a room: its wall stands on the front plane.
    const shell = blocked.filter((triangle) => triangle.part === "envelope");
    for (const room of free.filter((candidate) => !expected.includes(candidate)))
      for (const fx of [0.1, 0.5, 0.9])
        for (const z of [0.4, 1.3, 2.1]) {
          const x = room.x0 + fx * (room.x1 - room.x0);
          const hits = crossings(shell, [x, -4, z], [x, 4, z]);
          assert.ok(hits.length > 0 && hits[0].front && Math.abs(-4 + hits[0].fraction * 8) < 1e-6, `A blocked bay is open at X=${x}, Z=${z} (${seed}).`);
        }
    // And it shows the closed front it would have had: a shutter, gate or glazing below head height.
    for (const room of free.filter((candidate) => !expected.includes(candidate)))
      assert.ok(
        blocked.some((triangle) => triangle.part === "openings" && triangle.points.every((p) => p[0] > room.x0 - 0.3 && p[0] < room.x1 + 0.3 && p[2] < 2.9)),
        `A blocked bay has no front (${seed}).`,
      );
  }
});

test("the shops attribute round-trips and rejects invalid authoring", async () => {
  const source = shopSource(ROW, { shops: "0.4" });
  assert.equal(parseAml(source).dressing!.rules[0].shops, 0.4);
  assert.equal(parseAml(serializeAml(parseAml(source))).dressing!.rules[0].shops, 0.4);
  assert.ok(!serializeAml(parseAml(shopSource(ROW))).includes("shops="), "An omitted chance must stay omitted.");
  assert.throws(() => parseAml(shopSource(ROW, { shops: "many" })));
  /** A level whose only recipe dresses `host` with a shops chance it cannot take. */
  const misplaced = (recipe: string) => `<architecture version="1" id="shop-misplaced" validation="premap">
  <profile id="floor:profile" points="0 0; 9 0; 9 6; 0 6"/>
  <material id="finish" color="#c6c2b4"/>
  <path id="axis" points="0 0 0; 9 0 0"/>
  <wall id="wall" path="axis" thickness="0.2" height="3"/>
  <slab id="floor" material="finish" profile="floor:profile" thickness="0.2" elevation="0"/>
  <dressing seed="misplaced">
    ${recipe}
  </dressing>
</architecture>`;
  const invalid = [
    { source: shopSource(ROW, { shops: "-0.1" }), host: "building" },
    { source: shopSource(ROW, { shops: "1.5" }), host: "building" },
    { source: misplaced('<wall host="wall" face="back" material="finish" shops="0.5"/>'), host: "wall" },
    { source: misplaced('<floor host="floor" material="finish" shops="0.5"/>'), host: "floor" },
  ];
  for (const { source: text, host } of invalid) {
    const level = await compile(parseAml(text), { navigation: false });
    const error = level.diagnostics.find((diagnostic) => diagnostic.code === "AML_DRESSING");
    assert.ok(error?.source && error.severity === "error", text);
    assert.deepEqual(error.objects, [host]);
    // A rejected recipe generates nothing.
    assert.ok(level.surfaces.every((surface) => !surface.object.includes("/$dressing/")));
  }
});

test("spans are never fixed inside a shop, even where no floor lies beneath the building", async () => {
  // The street slab ends at the frontage, so nothing but the rooms' own height keeps brackets out of them.
  const mass: Mass = { width: 14, depth: 8, height: 15.35, stories: 5 };
  const street = (seed: string) => `<architecture version="1" id="shop-street" validation="premap">
  <profile id="street:profile" points="-2 -8; 16 -8; 16 0; -2 0"/>
  <path id="yard:path" points="0 -5 0; 14 -5 0"/>
  <material id="finish" color="#c6c2b4" repeat="0.5"/>
  <slab id="street" material="finish" profile="street:profile" thickness="0.2" elevation="0"/>
  <wall id="yard" path="yard:path" thickness="0.22" height="5"/>
  <box id="building" width="${mass.width}" depth="${mass.depth}" height="${mass.height}" collidable="false"/>
  <dressing seed="${seed}" detail="medium" grime="0.6" wear="0.2">
    <wall host="yard" face="side" windows="false" material="finish"/>
    <building host="building" material="finish" stories="${mass.stories}" shops="1"/>
    <spans cables="1" clotheslines="0" signs="0"/>
  </dressing>
</architecture>`;
  let checked = 0;
  for (const seed of ["street-a", "street-b", "street-c"]) {
    const level = await build(street(seed));
    const found = rooms(partTriangles(level));
    const strung = ["building", "yard"].flatMap((host) => partTriangles(level, host)).filter((triangle) => triangle.part.startsWith("span-"));
    assert.ok(strung.length > 0, `No span was strung across the street (${seed}).`);
    for (const room of found)
      for (const { points, part } of strung)
        for (const point of points) assert.ok(!within(room, point, -0.02), `${part} enters a shop at ${point} (${seed}).`);
    checked += found.length;
  }
  assert.ok(checked > 0, "None of these streets opened a shop.");
});

test("storefront stock shares two embedded textures and stays within its triangle budget", async () => {
  const level = await build(`<architecture version="1" id="textured-stock" validation="premap">
    <material id="finish" color="#cccccc"/>
    <material id="stock-market-apple" texture="market-apple.png"/>
    <material id="stock-snack-packet" texture="snack-packet.png"/>
    <box id="north-row" width="34" depth="9" height="17.35" collidable="false"/>
    <box id="south-row" position="34 -7 0" rotation="0 0 180" width="34" depth="8" height="14.35" collidable="false"/>
    <dressing seed="shops-01" detail="high" finishes="stock" grime="0.6" wear="0.3">
      <building host="north-row" material="finish" stories="5" shops="1"/>
      <building host="south-row" material="finish" stories="4" shops="1"/>
    </dressing>
  </architecture>`);
  const counts = { "stock-market-apple": 0, "stock-snack-packet": 0 };
  let shopTriangles = 0;
  for (const [triangle, index] of level.mesh.surfaces.entries()) {
    const surface = level.surfaces[index];
    if (surface.object.includes("/$dressing/shop-")) shopTriangles++;
    if (surface.material !== "stock-market-apple" && surface.material !== "stock-snack-packet") continue;
    counts[surface.material]++;
    assert.equal(surface.collidable, false);
    const shop = surface.material === "stock-market-apple" ? "shop-greengrocer" : "shop-grocer";
    assert.ok(surface.object.endsWith(shop), surface.object);
    for (const vertex of level.mesh.indices.slice(triangle * 3, triangle * 3 + 3)) {
      const uv = level.mesh.uv.slice(vertex * 2, vertex * 2 + 2);
      assert.ok(uv.length === 2 && uv.every(value => value >= 0 && value <= 1));
    }
  }
  assert.ok(shopTriangles < 170000, `The fixture emits ${shopTriangles} shop triangles`);
  assert.ok(counts["stock-market-apple"] > 0 && counts["stock-market-apple"] < 16000);
  assert.ok(counts["stock-snack-packet"] > 0 && counts["stock-snack-packet"] < 3500);

  const assets = await resolveExportAssets(level, name => readFile(`projects/dressing-demo/textures/${name}`));
  const bytes = toGLB(level, { assets });
  const buffer = Buffer.from(bytes);
  const gltf = JSON.parse(buffer.toString("utf8", 20, 20 + buffer.readUInt32LE(12)));
  assert.equal(gltf.images.length, 2);
  const images = new Set<number>();
  for (const name of Object.keys(counts)) {
    const material = gltf.materials.find((entry: { name: string }) => entry.name === name);
    const source = gltf.textures[material.pbrMetallicRoughness.baseColorTexture.index].source;
    assert.ok(Number.isInteger(gltf.images[source].bufferView));
    assert.equal(gltf.images[source].uri, undefined);
    images.add(source);
  }
  assert.equal(images.size, 2);
  assert.equal((await validateBytes(bytes)).issues.numErrors, 0);
});

test("shelf stock varies its facing while keeping each stack supported and aligned", async () => {
  /** Draws a known rectangular product and reads its corners back in shelf coordinates. */
  async function arrange(frame: Matrix4, width: number, depth: number) {
    const level = await build(`<architecture version="1" id="shelf" validation="premap">
      <material id="finish" color="#ffffff"/>
    </architecture>`);
    level.mesh.colors = [];
    const { materials } = kitFinishes(level, undefined, "finish");
    materials.paint = "finish";
    const mesh = new KitMesh(level, "shelf", "shelf", materials, { maximumTriangles: 2000 });
    const pen = new Pen(mesh, "stock", frame, false);
    const inverse = frame.clone().invert();
    const stacks = new Map<string, { angles: number[][]; heights: number[] }>();
    stockShelf(pen, { x0: 0, x1: width, y: 0, depth, z: 0, clear: 0.3 }, [() => ({
      width: 0.1, depth: 0.08, height: 0.1, stack: 3,
      draw: (stack, [x, y, z]) => {
        stack.box("paint", [x - 0.05, y - 0.04, z], [x + 0.05, y + 0.04, z + 0.1], [1, 1, 1]);
        const center = new Vector3(...stack.world([x, y, z])).applyMatrix4(inverse);
        const edge = new Vector3(...stack.world([x + 0.05, y, z])).applyMatrix4(inverse).sub(center);
        const key = [center.x, center.y].map(value => value.toFixed(6)).join("/");
        const group = stacks.get(key) ?? { angles: [], heights: [] };
        group.angles.push([edge.x, edge.y].map(value => Number(value.toFixed(6))));
        group.heights.push(Number(center.z.toFixed(6)));
        stacks.set(key, group);
      },
    })], new Rng("shelf-pose"));
    const corners = [];
    for (let i = 0; i < level.mesh.positions.length; i += 3) {
      const point = new Vector3().fromArray(level.mesh.positions, i).applyMatrix4(inverse);
      assert.ok(point.x >= -0.00002 && point.x <= width + 0.00002);
      assert.ok(point.y >= -0.00002 && point.y <= depth + 0.00002);
      assert.ok(point.z >= -0.00002 && point.z <= 0.30002);
      corners.push(point);
    }
    assert.ok(corners.length > 0);
    return [...stacks];
  }

  const ordinary = await arrange(new Matrix4(), 0.85, 0.21);
  const moved = new Matrix4().makeRotationZ(0.41).setPosition(4, -6, 2);
  assert.deepEqual(await arrange(moved, 0.85, 0.21), ordinary);
  for (const [, stack] of ordinary) {
    assert.equal(new Set(stack.angles.map(angle => angle.join("/"))).size, 1);
    assert.deepEqual(stack.heights, stack.heights.map((_, i) => i / 10));
  }
  const tight = await arrange(new Matrix4(), 0.1, 0.08);
  assert.equal(tight.length, 1);
  assert.equal(tight[0][0], "0.050000/0.040000");
  assert.equal(tight[0][1].angles[0][1], 0);
});
