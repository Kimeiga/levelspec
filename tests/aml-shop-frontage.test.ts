import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { Matrix3, Matrix4, Ray, Vector3 } from "three";
import { collisionMesh, compile, parseAml } from "levelspec";
import { Rng } from "../src/generate/rng.ts";
import { Pen } from "../src/dressing/pen.ts";
import { KitMesh } from "../src/dressing/kit-mesh.ts";
import { kitFinishes, kitMaterials } from "../src/dressing/kit.ts";
import { Kit } from "../src/dressing/kowloon/kit.ts";
import { GroundSupport } from "../src/dressing/kowloon/ground-support.ts";
import { applyDressing } from "../src/dressing/apply.ts";
import { ArchitectureResolution } from "../src/architecture/resolve.ts";
import { DISPLAY_SIZES, drawDisplay, type DisplayKind } from "../src/dressing/kowloon/shop/display-assemblies.ts";
import { drawFrontage, planFrontage } from "../src/dressing/kowloon/shop/frontage.ts";
import appleFaces from "../src/dressing/kowloon/shop/assets/apple-pile.json" with { type: "json" };

type Level = Awaited<ReturnType<typeof compile>>;
type Triangle = [Vector3, Vector3, Vector3];
const KINDS: DisplayKind[] = ["stool", "box-stand", "crate-shelf", "cart"];
const ASSEMBLY_BUDGETS: Record<DisplayKind, number> = { stool: 3000, "box-stand": 3000, "crate-shelf": 4500, cart: 4500 };
const EPSILON = 0.00002;

/** Builds real kit geometry on an optional authored surface, with distinguishable support and goods finishes. */
async function fixture(body = "", frame = new Matrix4(), mirrored = false, navigation = false) {
  const level = await compile(parseAml(`<architecture version="1" id="frontage-test">
    <material id="finish" color="#ffffff"/><material id="wood" color="#ffffff"/>
    <material id="stock-grocer-props" color="#ffffff" texture="grocer-props.png"/>
    <material id="stock-market-apple" color="#ffffff" texture="market-apple.png"/>
    ${body}
  </architecture>`), { navigation });
  assert.deepEqual(level.diagnostics, []);
  level.mesh.colors = Array(level.mesh.positions.length).fill(1);
  kitMaterials(level);
  const { materials } = kitFinishes(level, "stock", "finish");
  materials.timber = "wood";
  const mesh = new KitMesh(level, "frontage", "props", materials, { maximumTriangles: 40000 });
  return { level, pen: new Pen(mesh, "display", frame, mirrored) };
}

/** Extracts the emitted presentation triangles in the fixture's local frame. */
function drawn(level: Level, inverse = new Matrix4()) {
  return level.mesh.surfaces.flatMap((surfaceIndex, triangle) => {
    const surface = level.surfaces[surfaceIndex];
    if (!surface.object.startsWith("frontage/$dressing/")) return [];
    const points = level.mesh.indices.slice(triangle * 3, triangle * 3 + 3)
      .map(index => new Vector3().fromArray(level.mesh.positions, index * 3).applyMatrix4(inverse)) as Triangle;
    return [{ points, material: surface.material, surface }];
  });
}

/** Measures actual corners without relying on an assembly's advertised dimensions. */
function bounds(points: Vector3[]) {
  const min = new Vector3(Infinity, Infinity, Infinity), max = new Vector3(-Infinity, -Infinity, -Infinity);
  for (const point of points) { min.min(point); max.max(point); }
  return { min, max };
}

/** Finds a real support surface immediately below a point. */
function supportAt(triangles: Triangle[], point: Vector3): number {
  const ray = new Ray(point.clone().add(new Vector3(0, 0, 0.001)), new Vector3(0, 0, -1));
  let height = -Infinity;
  for (const triangle of triangles) {
    const hit = ray.intersectTriangle(...triangle, false, new Vector3());
    if (hit) height = Math.max(height, hit.z);
  }
  return height;
}

/** Finds connected fruit bodies by position, ignoring duplicated UV-seam vertices. */
function fruitBodies(triangles: Triangle[]): Triangle[][] {
  const owners = new Map<string, number>(), parents = triangles.map((_, index) => index);
  /** Resolves the body currently owning a triangle. */
  function root(index: number): number {
    while (parents[index] !== index) index = parents[index];
    return index;
  }
  triangles.forEach((triangle, index) => {
    for (const point of triangle) {
      const key = point.toArray().map(value => Math.round(value * 1e6)).join(",");
      const previous = owners.get(key);
      if (previous !== undefined) parents[root(index)] = root(previous);
      else owners.set(key, index);
    }
  });
  const bodies = new Map<number, Triangle[]>();
  triangles.forEach((triangle, index) => {
    const owner = root(index), body = bodies.get(owner) ?? [];
    body.push(triangle);
    bodies.set(owner, body);
  });
  return [...bodies.values()];
}

test("display assemblies stay grounded, supported, and within their reviewed envelopes", async t => {
  for (const kind of KINDS) for (const trade of ["grocer", "greengrocer"] as const) {
    await t.test(`${kind}, ${trade}`, async () => {
      let reference: Vector3[] | undefined;
      for (const mirrored of [false, true]) {
        const frame = new Matrix4().makeRotationZ(0.43).multiply(new Matrix4().makeScale(mirrored ? -1 : 1, 1, 1)).setPosition(2, -1, 0.4);
        const { level, pen } = await fixture("", frame, mirrored);
        drawDisplay(pen, kind, trade, new Rng(`${kind}/${trade}`));
        const triangles = drawn(level, frame.clone().invert()), points = triangles.flatMap(triangle => triangle.points);
        assert.ok(triangles.length > 0 && triangles.length <= ASSEMBLY_BUDGETS[kind], `${kind}/${trade}: ${triangles.length} triangles exceeds ${ASSEMBLY_BUDGETS[kind]}`);
        const [width, depth, height] = DISPLAY_SIZES[kind], box = bounds(points);
        assert.ok(Math.abs(box.min.z) <= EPSILON, "Display feet or wheels miss ground level");
        for (const point of points) assert.ok(Math.abs(point.x) <= width / 2 + EPSILON && Math.abs(point.y) <= depth / 2 + EPSILON
          && point.z >= -EPSILON && point.z <= height + EPSILON, `${kind}: actual geometry leaves its reserved envelope`);
        assert.ok(triangles.every(triangle => !triangle.surface.collidable && triangle.surface.domain === "visualization"));
        const wood = triangles.filter(triangle => triangle.material === "wood").map(triangle => triangle.points);
        const boardBottom = bounds(wood.flat()).min.z;
        const contacts = triangles.filter(triangle => triangle.material !== "wood").flatMap(triangle => triangle.points)
          .filter(point => Math.abs(point.z - boardBottom) <= 0.001);
        assert.ok(contacts.some(point => point.x < -0.04) && contacts.some(point => point.x > 0.04), "The display board has no support on both sides");
        const fruit = triangles.filter(triangle => triangle.material === "stock-market-apple").map(triangle => triangle.points);
        const produce = fruit.flat();
        if (produce.length) {
          const wide = kind === "crate-shelf" || kind === "cart";
          assert.equal(fruit.length, appleFaces.length * (wide ? 2 : 1), "Wide displays must carry two complete produce piles");
          if (wide) assert.ok(produce.some(point => point.x < 0) && produce.some(point => point.x > 0)
            && produce.every(point => Math.abs(point.x) > .006), "The two produce crates overlap at the central gap");
          const bodies = fruitBodies(fruit);
          assert.ok(bodies.length >= 8, "The display lost its distinct fruit bodies");
          for (const body of bodies) {
            assert.ok(body.length >= 20, "A fruit body fragmented into a small shard");
            const vertices = body.flat(), box = bounds(vertices), spans = box.max.sub(box.min).toArray();
            assert.ok(Math.max(...spans) / Math.min(...spans) < 1.6, "An apple was stretched to fill its display board");
            const mean = vertices.reduce((sum, point) => sum.add(point), new Vector3()).divideScalar(vertices.length);
            const covariance = Array<number>(9).fill(0);
            for (const point of vertices) {
              const delta = point.clone().sub(mean).toArray();
              for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) covariance[a * 3 + b] += delta[a] * delta[b];
            }
            const trace = covariance[0] + covariance[4] + covariance[8];
            assert.ok(new Matrix3().fromArray(covariance).determinant() / trace ** 3 > .005,
              "A fruit body is a flat fragment rather than a rounded volume");
          }
          const bottom = bounds(produce).min.z;
          const supports = triangles.filter(triangle => triangle.material !== "stock-market-apple").map(triangle => triangle.points);
          assert.ok(produce.filter(point => point.z <= bottom + EPSILON).some(point => Math.abs(point.z - supportAt(supports, point)) <= 0.001),
            "Produce floats above the actual tray floor");
        }
        if (kind === "cart") for (const x of [-1, 1]) for (const y of [-1, 1])
          assert.ok(points.some(point => point.x * x > 0.2 && point.y * y > 0.1 && Math.abs(point.z) <= EPSILON), "A cart caster misses the ground");
        if (!mirrored) reference = points;
        else assert.equal(points.length, reference!.length, "Reflection changed the assembly's geometry count");
      }
    });
  }
});

test("frontage plans preserve a one-meter entry and independent, repeatable edge displays", () => {
  const seen = new Set<DisplayKind>();
  for (let index = 0; index < 24; index++) {
    const seed = `frontage-choice-${index}`, width = 3.6;
    const plan = planFrontage(width, new Rng(seed), () => true);
    assert.deepEqual(planFrontage(width, new Rng(seed), () => true), plan);
    assert.ok(plan.length > 0 && plan.length <= 2);
    for (const display of plan) {
      seen.add(display.kind);
      const [w, d, h] = DISPLAY_SIZES[display.kind];
      const matrix = new Matrix4().makeRotationZ(display.yaw).setPosition(...display.center);
      const corners: Vector3[] = [];
      for (const x of [-w / 2, w / 2]) for (const y of [-d / 2, d / 2]) for (const z of [0, h])
        corners.push(new Vector3(x, y, z).applyMatrix4(matrix));
      const box = bounds(corners);
      assert.ok(box.min.x >= 0.05 - EPSILON && box.max.x <= width - 0.05 + EPSILON);
      assert.ok(box.min.y >= 0 && box.max.y <= 0.65 + EPSILON && Math.abs(box.min.z) <= EPSILON);
      assert.ok(box.max.x <= width / 2 - 0.5 + EPSILON || box.min.x >= width / 2 + 0.5 - EPSILON, "A display narrows the central entry");
    }
    const leftBlocked = planFrontage(width, new Rng(seed), (_x0, x1) => x1 > width / 2 - 0.5 + EPSILON);
    assert.deepEqual(leftBlocked, plan.filter(display => display.side === "right"), "Blocking one edge moved the unobstructed edge display");
    assert.deepEqual(planFrontage(width, new Rng(seed), (x0, x1) => !(x0 < width / 2 && x1 > width / 2)), [], "A blocked central entry still receives displays");
  }
  assert.deepEqual([...seen].sort(), [...KINDS].sort(), "Seeded frontages never offer every supported display type");
  for (const width of [0.8, 1, 1.1]) assert.deepEqual(planFrontage(width, new Rng("narrow"), () => true), []);
  assert.deepEqual(planFrontage(3.6, new Rng("unavailable"), () => false), []);
});

test("densely stocked non-produce displays retain their assembly triangle budgets", async () => {
  for (const [kind, seed] of [["stool", "display-density-102"], ["crate-shelf", "display-density-50"], ["cart", "display-density-99"]] as const) {
    const { level, pen } = await fixture();
    drawDisplay(pen, kind, "grocer", new Rng(seed));
    const triangles = drawn(level);
    assert.ok(!triangles.some(triangle => triangle.material === "stock-market-apple"), `${seed}: this case no longer exercises a packaged-goods display`);
    const top = bounds(triangles.filter(triangle => triangle.material === "wood").flatMap(triangle => triangle.points)).max.z;
    const goods = triangles.filter(triangle => triangle.material === "stock-grocer-props" && triangle.points.every(point => point.z >= top - EPSILON));
    assert.ok(goods.length >= 24, `${seed}: packed display stock disappeared`);
    assert.ok(triangles.length <= ASSEMBLY_BUDGETS[kind], `${kind}, ${seed}: ${triangles.length} triangles exceeds ${ASSEMBLY_BUDGETS[kind]}`);
  }
});

/** Authored slab with configurable elevation and collision, including visual background streets. */
function slab(points: string, elevation = 0, collidable = false) {
  return `<profile id="ground-plan" points="${points}"/><slab id="ground" profile="ground-plan" thickness="0.1" elevation="${elevation}" collidable="${collidable}"/>`;
}

test("ground support samples real flat render surfaces, including noncollidable streets", async () => {
  const broad = "-5 -5; 8 -5; 8 5; -5 5";
  for (const collidable of [false, true]) {
    const { level, pen } = await fixture(slab(broad, 0, collidable));
    const physical = structuredClone(collisionMesh(level, true));
    const support = new GroundSupport(level.mesh, level.surfaces);
    assert.ok(support.covers(pen, 0, 0.8, 0.025, 1.85));
    assert.ok(!support.covers(pen, 0, 0.8, 0.025, 1.85, 0.12), "Street support incorrectly uses the raised shop threshold");
    assert.deepEqual(collisionMesh(level, true), physical);
  }
  for (const body of ["", slab("0 0; 1 0; 1 0.4; 0 0.4"), slab("0 0; 1 0; 1 0.3; 0.4 0.3; 0.4 1; 0 1"), slab(broad, 0.03)]) {
    const { level, pen } = await fixture(body);
    assert.ok(!new GroundSupport(level.mesh, level.surfaces).covers(pen, 0.05, 0.8, 0.05, 0.8), "An unsupported or uneven patch was accepted");
  }
  const frame = new Matrix4().makeRotationZ(0.61).multiply(new Matrix4().makeScale(-1, 1, 1)).setPosition(2, -1, 1.25);
  const moved = await fixture(slab(broad, 1.25), frame, true);
  assert.ok(new GroundSupport(moved.level.mesh, moved.level.surfaces).covers(moved.pen, 0, 0.8, 0.025, 1.85), "Flat support changed under a placed/mirrored facade");
  const tilted = structuredClone(moved.level.mesh);
  const tilt = new Matrix4().makeRotationX(0.08);
  for (let index = 0; index < tilted.positions.length; index += 3) new Vector3().fromArray(tilted.positions, index).applyMatrix4(tilt).toArray(tilted.positions, index);
  assert.ok(!new GroundSupport(tilted, moved.level.surfaces).covers(moved.pen, 0, 0.8, 0.025, 1.85), "A sloping surface was treated as flat street support");
  const hidden = moved.level.surfaces.map(surface => ({ ...surface, visible: false }));
  assert.ok(!new GroundSupport(moved.level.mesh, hidden).covers(moved.pen, 0, 0.8, 0.025, 1.85), "Hidden source faces provide false ground support");
});

test("drawn frontages retain actual clearance, navigation, collision, and the 9000-triangle budget", async () => {
  const floor = slab("-2 -2; 6 -2; 6 4; -2 4", 0, true);
  const { level, pen } = await fixture(floor, new Matrix4(), false, true);
  assert.ok(level.navigation, "The fixture did not build a navigation report");
  const navigation = structuredClone(level.navigation), physical = structuredClone(collisionMesh(level, true)), hash = level.physicalHash;
  const shown = drawFrontage({ pen, width: 3.6, trade: "greengrocer", kit: new Kit("frontage-render", 2, 0.6, 0.3, false), key: "shop", available: () => true });
  const triangles = drawn(level);
  assert.ok(shown.length > 0 && triangles.length > 0 && triangles.length <= 9000, `Frontage emits ${triangles.length} triangles`);
  for (const triangle of triangles) {
    assert.ok(triangle.surface.object.endsWith("/shop-frontage"));
    assert.ok(!triangle.surface.collidable && triangle.surface.domain === "visualization");
    for (const point of triangle.points) assert.ok(point.x >= 0.05 - EPSILON && point.x <= 3.55 + EPSILON && point.y >= -EPSILON && point.y <= 0.65 + EPSILON
      && (point.x <= 1.3 + EPSILON || point.x >= 2.3 - EPSILON), "Actual display geometry enters a reserved clear strip");
  }
  assert.equal(level.physicalHash, hash);
  assert.deepEqual(collisionMesh(level, true), physical);
  assert.deepEqual(level.navigation, navigation);
});

test("the AML dressing phase uses original ground and preserves clear street access", async () => {
  /** Exercises the real dressing phase on native geometry, independently of subsequent appearance baking. */
  async function build(ground: boolean, obstacle = "", streetDepth = 3) {
    const document = parseAml(`<architecture version="1" id="frontage-integration" validation="premap">
      <material id="finish" color="#c6c2b4"/>
      ${ground ? slab(`-1 -${streetDepth}; 17 -${streetDepth}; 17 0; -1 0`) : ""}
      <box id="row" width="16" depth="6" height="12.35" collidable="false"/>
      ${obstacle}
      <dressing seed="frontage-street" detail="high" grime="0" wear="0">
        <building host="row" material="finish" stories="4" shops="1"/>
      </dressing>
    </architecture>`);
    const plain = structuredClone(document);
    delete plain.dressing;
    const level = await compile(plain, { navigation: false });
    assert.deepEqual(level.diagnostics, []);
    level.architecture.dressing = document.dressing;
    applyDressing(level, new ArchitectureResolution(level.architecture, 10000, 10000), 300000);
    assert.deepEqual(level.diagnostics, []);
    return level;
  }
  /** Reads authored-space output independent of vertex ordering and material surface indices. */
  function shopGeometry(level: Level, frontage: boolean) {
    const triangles = level.mesh.surfaces.flatMap((surfaceIndex, triangle) => {
      const object = level.surfaces[surfaceIndex].object;
      if (!object.includes("/$dressing/shop-") || object.endsWith("/shop-frontage") !== frontage) return [];
      const points = level.mesh.indices.slice(triangle * 3, triangle * 3 + 3).map(index => level.mesh.positions.slice(index * 3, index * 3 + 3));
      return [JSON.stringify({ object, points })];
    }).sort();
    return { triangles: triangles.length, digest: createHash("sha256").update(triangles.join("\n")).digest("hex") };
  }
  const clear = await build(true);
  assert.ok(shopGeometry(clear, true).triangles > 0, "The production path lost valid original render ground and emitted no street displays");
  const room = shopGeometry(clear, false);
  assert.ok(room.triangles > 0);
  const noGround = await build(false);
  assert.equal(shopGeometry(noGround, true).triangles, 0, "Displays float where no authored ground exists");
  assert.deepEqual(shopGeometry(noGround, false), room, "Ground eligibility changed the shop interiors");
  const blocked = await build(true, '<box id="barrier" position="-1 -1 0" width="18" depth="0.1" height="2.2"/>');
  assert.equal(shopGeometry(blocked, true).triangles, 0, "Displays ignore an obstacle in the standing strip ahead");
  assert.deepEqual(shopGeometry(blocked, false), room, "An outdoor obstruction rerolled interior furnishings");
  const remote = await build(true, '<box id="remote" position="-4 -1 0" width="0.1" depth="0.1" height="2.2"/>');
  assert.deepEqual(shopGeometry(remote, true), shopGeometry(clear, true), "A remote obstacle changed an unobstructed frontage");
  const enclosing = await build(true, '<box id="enclosing" position="-2 -3.5 -0.2" width="20" depth="3.49" height="3.2"/>');
  assert.equal(shopGeometry(enclosing, true).triangles, 0, "A frontage wholly enclosed by a solid escaped triangle-boundary checks");
  // Above the existing shop-opening clearance as well as the frontage's standing-height query.
  const overhead = await build(true, '<box id="ceiling" position="-1 -3 3.4" width="18" depth="3" height="0.2"/>');
  assert.deepEqual(shopGeometry(overhead, true), shopGeometry(clear, true), "Empty space below a floating closed ceiling was classified as solid");
  const opposing = await build(true, '<box id="opposing" position="-1 -2.3 0" width="18" depth="0.1" height="2.2"/>');
  assert.equal(shopGeometry(opposing, true).triangles, 0, "The reserve for opposing displays was ignored");
  const limitedGround = await build(true, "", 1.9);
  assert.deepEqual(shopGeometry(limitedGround, true), shopGeometry(clear, true), "Ground was required beyond the actual standing strip");
});
