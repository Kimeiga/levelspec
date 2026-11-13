import { test } from "node:test";
import assert from "node:assert/strict";
import { PNG } from "pngjs";
import { compile, parseAml } from "levelspec";
import { clipByLevel, cutPositions } from "../src/dressing/finish/partition.ts";
import { WallCondition } from "../src/dressing/finish/wall-condition.ts";
import { footprintLayout } from "../src/dressing/ground-layout.ts";
import { alongPath } from "../src/dressing/wall-finish.ts";

type Point = [number, number, number];
type Level = Awaited<ReturnType<typeof compile>>;

interface Triangle {
  points: Point[];
  normal: Point;
  colors: Point[];
  uv: number[][];
  material: string;
  part: string;
  role: string;
}

/** An axis-aligned rectangle on a facade: X along the front, Z up, meters. */
interface Rect {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
}

/** Lists the triangles generated for a dressing host with their part name after `$dressing/`. */
function partTriangles(level: Level, host: string): Triangle[] {
  const prefix = `${host}/$dressing/`;
  const result: Triangle[] = [];
  for (let t = 0; t < level.mesh.surfaces.length; t++) {
    const surface = level.surfaces[level.mesh.surfaces[t]];
    if (!surface.object.startsWith(prefix)) continue;
    const indices = level.mesh.indices.slice(t * 3, t * 3 + 3);
    result.push({
      points: indices.map((i) => level.mesh.positions.slice(i * 3, i * 3 + 3) as Point),
      normal: level.mesh.normals.slice(indices[0] * 3, indices[0] * 3 + 3) as Point,
      colors: indices.map((i) => level.mesh.colors!.slice(i * 3, i * 3 + 3) as Point),
      uv: indices.map((i) => level.mesh.uv.slice(i * 2, i * 2 + 2)),
      material: surface.material,
      role: surface.role,
      part: surface.object.slice(prefix.length),
    });
  }
  return result;
}

/** True when a point lies inside a triangle, both projected onto the two given axes. */
function contains(triangle: Point[], point: number[], axes: [number, number]): boolean {
  const [i, j] = axes;
  const side = (a: Point, b: Point) =>
    (b[i] - a[i]) * (point[1] - a[j]) - (b[j] - a[j]) * (point[0] - a[i]);
  const sides = [side(triangle[0], triangle[1]), side(triangle[1], triangle[2]), side(triangle[2], triangle[0])];
  return sides.every((s) => s >= 0) || sides.every((s) => s <= 0);
}

const maximum = (values: number[]) => values.reduce((largest, value) => Math.max(largest, value), -Infinity);
const minimum = (values: number[]) => values.reduce((smallest, value) => Math.min(smallest, value), Infinity);

const PALETTE_PIXELS: Record<string, Point> = {
  "rough.png": [220, 30, 30], "render.png": [30, 220, 30], "plaster.png": [30, 30, 220], "roofing.png": [80, 80, 80],
};

/** Independent, unmistakable input hues identify authored substrates after procedural region cutting. */
async function finishImage(reference: string): Promise<Uint8Array> {
  assert.ok(PALETTE_PIXELS[reference], `Unexpected source image ${reference}`);
  const image = new PNG({ width: 2, height: 2 });
  for (let i = 0; i < 4; i++) image.data.set([...PALETTE_PIXELS[reference], 255], i * 4);
  return PNG.sync.write(image);
}


const triangleGrids = new WeakMap<Triangle[], Map<string, Map<string, Triangle[]>>>();

/** Narrows independent point-in-triangle checks to conservative half-meter test buckets. */
function trianglesAt(triangles: Triangle[], point: number[], axes: [number, number]): Triangle[] {
  let projections = triangleGrids.get(triangles);
  if (!projections) { projections = new Map(); triangleGrids.set(triangles, projections); }
  const projection = axes.join();
  let grid = projections.get(projection);
  if (!grid) {
    grid = new Map(); projections.set(projection, grid);
    for (const triangle of triangles) {
      const xs = triangle.points.map((vertex) => vertex[axes[0]]), ys = triangle.points.map((vertex) => vertex[axes[1]]);
      for (let x = Math.floor(minimum(xs) * 2); x <= Math.floor(maximum(xs) * 2); x++)
        for (let y = Math.floor(minimum(ys) * 2); y <= Math.floor(maximum(ys) * 2); y++) {
          const key = `${x},${y}`, bucket = grid.get(key) ?? [];
          bucket.push(triangle); grid.set(key, bucket);
        }
    }
  }
  return (grid.get(`${Math.floor(point[0] * 2)},${Math.floor(point[1] * 2)}`) ?? [])
    .filter((triangle) => contains(triangle.points, point, axes));
}

interface BuildingOptions {
  width: number;
  depth: number;
  height: number;
  stories: number;
  seed: string;
  grime?: number;
  wear?: number;
  detail?: string;
  /** Extra `<material>` declarations. */
  materials?: string;
  /** Extra `<dressing>` attributes. */
  dressing?: string;
}

/** Compiles one standalone building: front on local Y=0, footprint in +X/+Y, meters. */
async function building(options: BuildingOptions): Promise<Level> {
  const source = `<architecture version="1" id="finish-test" validation="premap">
  <material id="finish" color="#c6c2b4" repeat="0.5"/>${options.materials ?? ""}
  <box id="building" width="${options.width}" depth="${options.depth}" height="${options.height}" collidable="false"/>
  <dressing seed="${options.seed}" detail="${options.detail ?? "medium"}" grime="${options.grime ?? 0.6}" wear="${options.wear ?? 0.2}" ${options.dressing ?? ""}>
    <building host="building" material="finish" stories="${options.stories}"/>
  </dressing>
</architecture>`;
  const level = await compile(parseAml(source), {
    navigation: false, resolveMaterialImage: finishImage, limits: { triangles: 500_000 },
  });
  assert.deepEqual(level.diagnostics, [], JSON.stringify(options));
  return level;
}

const PALETTE = `
  <material id="rough" color="#ffffff" repeat="0.5" texture="rough.png"/>
  <material id="render" color="#ffffff" repeat="0.8" texture="render.png"/>
  <material id="plaster" color="#ffffff" repeat="0.65" texture="plaster.png"/>`;
const PALETTE_IDS = ["rough", "render", "plaster"];
/** Envelope triangles that face the street from the front half of a building `depth` deep. */
function streetFacing(level: Level, depth: number): Triangle[] {
  return partTriangles(level, "building").filter(
    (triangle) =>
      triangle.part === "envelope" &&
      triangle.normal[1] < -0.99 &&
      triangle.points.every((p) => p[1] < depth / 2),
  );
}

/**
 * Reads the street front of a single tenement: `skin` is the wall on the
 * plane of its upper stories, `ground` the ground-story wall on the building
 * line, and `recesses` the window and stair recesses cut into the upper wall.
 */
function frontage(level: Level, depth: number) {
  const facing = streetFacing(level, depth);
  // Above 4.8 m only upper stories remain; the ground story is at most 3.9 m tall.
  const plane = Math.min(
    ...facing.filter((triangle) => triangle.points.every((p) => p[2] > 4.8)).map((triangle) => triangle.points[0][1]),
  );
  const skin = facing.filter((triangle) => triangle.points.every((p) => Math.abs(p[1] - plane) < 0.02));
  const ground = facing.filter((triangle) => triangle.points.every((p) => Math.abs(p[1]) < 0.02 && p[2] < 2.6));
  // Recess backs face the street from 5 to 60 cm behind the frontage; each is one rectangle.
  const backs = new Map<string, Rect>();
  for (const triangle of facing) {
    const y = triangle.points[0][1],
      set = y - plane;
    // Under a jetty the ground-story wall on Y=0 also lies behind the frontage.
    if (set < 0.05 || set > 0.6 || Math.abs(y) < 1e-6) continue;
    const xs = triangle.points.map((p) => p[0]),
      zs = triangle.points.map((p) => p[2]);
    const rect = { x0: minimum(xs), x1: maximum(xs), z0: minimum(zs), z1: maximum(zs) };
    // No ground story is lower than 2.6 m, so anything set back below that is a shopfront.
    if (rect.z0 < 2.6) continue;
    backs.set([rect.x0, rect.x1, rect.z0, rect.z1].map((v) => v.toFixed(3)).join(), rect);
  }
  return { skin, ground, plane, recesses: [...backs.values()] };
}

test("a wall condition repeats for the same inputs", () => {
  const exposure = { base: 0, ledges: [{ u0: 1, u1: 3, z: 4, flow: 0.6 }] };
  const first = new WallCondition(exposure, { grime: 0.7, wear: 0.4, seed: 5 });
  const again = new WallCondition(exposure, { grime: 0.7, wear: 0.4, seed: 5 });
  for (let u = 0; u < 5; u += 0.31)
    for (let z = 0; z < 5; z += 0.29) {
      assert.deepEqual(first.sample(u, z), again.sample(u, z));
      assert.deepEqual(first.tint(u, z), first.sample(u, z).tint);
    }
});

test("clipping by a level splits a polygon exactly in two along the zero contour", () => {
  // Vertices carry X, Y, an attribute equal to 10·X, and the level X + Y − 1.
  const triangle = [
    [0, 0, 0, -1],
    [2, 0, 20, 1],
    [0, 2, 0, 1],
  ];
  const above = clipByLevel(triangle, (vertex) => vertex[3]);
  const below = clipByLevel(triangle, (vertex) => -vertex[3]);
  const area = (polygon: number[][]) =>
    Math.abs(polygon.reduce((sum, p, i) => {
      const q = polygon[(i + 1) % polygon.length];
      return sum + p[0] * q[1] - q[0] * p[1];
    }, 0)) / 2;
  assert.ok(Math.abs(area(below) - 0.5) < 1e-12, "The corner under X + Y = 1 has area 1/2.");
  assert.ok(Math.abs(area(above) + area(below) - 2) < 1e-12);
  for (const polygon of [above, below])
    for (const vertex of polygon) {
      assert.ok(Math.abs(vertex[0] + vertex[1] - 1 - vertex[3]) < 1e-12, "The level is interpolated linearly.");
      assert.ok(Math.abs(vertex[2] - 10 * vertex[0]) < 1e-12, "Attributes are interpolated with position.");
    }
  const cut = above.filter((vertex) => Math.abs(vertex[3]) < 1e-12);
  assert.equal(cut.length, 2);
  for (const vertex of cut) assert.ok(below.some((other) => other.every((value, k) => value === vertex[k])), "Both halves share their cut vertices.");
  assert.deepEqual(clipByLevel(triangle, () => -1), []);
  assert.deepEqual(clipByLevel(triangle, () => 1), triangle);
});

test("cut positions divide each stretch between marks evenly within its step and merge marks a millimeter apart", () => {
  // Stretches may be 1.25 m wide, except between 4 and 6 where they may be 0.3 m.
  const step = (position: number) => (position > 4 && position < 6 ? 0.3 : 1.25);
  // 6.0004 and 8.9996 lie within a millimeter of the mark at 6 and of the end at 9.
  const cuts = cutPositions(1, 9, [0.5, 6, 2.2, 4, 6.0004, 8.9996, 12], step);
  // 1.2 m is one stretch, 1.8 m two, 2 m at 0.3 m seven, and 3 m three.
  const expected = [1, 2.2, 3.1, 4, ...Array.from({ length: 6 }, (_, k) => 4 + (2 * (k + 1)) / 7), 6, 7, 8, 9];
  assert.equal(cuts.length, expected.length, JSON.stringify(cuts));
  for (const [i, cut] of cuts.entries()) assert.ok(Math.abs(cut - expected[i]) < 1e-12, `${cut} is not ${expected[i]}.`);
  assert.equal(cuts[0], 1);
  assert.equal(cuts.at(-1), 9);
  assert.deepEqual(cutPositions(0, 1, [], () => 5), [0, 1]);
  assert.deepEqual(cutPositions(0, 1, [0.0004, 0.5, 0.5003, 0.9997], () => 5), [0, 0.5, 1]);
});

test("a footprint layout lays its pours along the outline's longest edge, between its corners", () => {
  // A 9 m by 4 m deck turned 30 degrees and lifted to 12 m, with a 3 m by 1.5 m notch out of one corner.
  const angle = Math.PI / 6,
    origin = [5, -3];
  const place = (x: number, y: number): Point => [
    origin[0] + x * Math.cos(angle) - y * Math.sin(angle),
    origin[1] + x * Math.sin(angle) + y * Math.cos(angle),
    12,
  ];
  const loop = [place(0, 0), place(9, 0), place(9, 4), place(3, 4), place(3, 2.5), place(0, 2.5)];
  const layout = footprintLayout([loop], 2, 6);
  assert.ok(Math.abs(layout.columns[0]) < 1e-9 && Math.abs(layout.columns.at(-1)! - 9) < 1e-9);
  assert.ok(Math.abs(layout.rows[0]) < 1e-9 && Math.abs(layout.rows.at(-1)! - 4) < 1e-9);
  assert.ok(layout.columns.some((column) => Math.abs(column - 3) < 1e-9), "The notch corner sets a pour line.");
  assert.ok(layout.rows.some((row) => Math.abs(row - 2.5) < 1e-9));
  for (const lines of [layout.columns, layout.rows])
    for (let i = 1; i < lines.length; i++) {
      assert.ok(lines[i] - lines[i - 1] <= 2 + 1e-9, "No pour is wider than the patch size.");
      assert.ok(lines[i] - lines[i - 1] > 0.5, "No pour is a sliver.");
    }
  // The layout frame maps its grid back onto the deck: the far grid corner is the far deck corner.
  const e = layout.world.elements;
  const far = [e[0] * 9 + e[4] * 4 + e[12], e[1] * 9 + e[5] * 4 + e[13]];
  assert.ok(Math.hypot(far[0] - loop[2][0], far[1] - loop[2][1]) < 1e-9);
});

test("wall weathering coordinates preserve meter scale and remain continuous at inner and outer miters", () => {
  for (const end of [[4, 3, 0], [8, 1, 0]] as Point[]) {
    const path: Point[] = [[0, 0, 0], [4, 0, 0], end];
    const length = Math.hypot(end[0] - 4, end[1]), dx = (end[0] - 4) / length, dy = end[1] / length;
    assert.ok(Math.abs(alongPath(path, [2, 0, 5]) - 2) < 1e-12, "Centerline stations remain authored arc length");
    assert.ok(Math.abs(alongPath(path, [4 + dx * length / 2, dy * length / 2, 0]) - (4 + length / 2)) < 1e-12);
    assert.equal(alongPath(path, [-1, 0.05, 0]), 0, "Before the start the measure holds at zero");
    assert.ok(Math.abs(alongPath(path, [end[0] + dx, end[1] + dy, 0]) - (4 + length)) < 1e-12,
      "Past the end it holds at the path length");
    for (const offset of [-0.1, 0.1]) {
      // Intersect y=offset with the corner's perpendicular tangent-bisector plane.
      const corner: Point = [4 - offset * dy / (1 + dx), offset, 0];
      assert.ok(Math.abs(alongPath(path, corner) - 4) < 1e-10, "Both offset faces share the actual miter station");
      assert.ok(Math.abs(alongPath([path[0], path[0], path[1], path[1], path[2]], corner) - 4) < 1e-10,
        "Duplicate path vertices do not change the physical miter measure");
      for (const reflection of [-1, 1]) {
        const placed = ([x, y, z]: Point): Point => [12 + reflection * x * Math.cos(0.37) - y * Math.sin(0.37),
          -7 + reflection * x * Math.sin(0.37) + y * Math.cos(0.37), z + 3];
        assert.ok(Math.abs(alongPath(path.map(placed), placed(corner)) - 4) < 1e-9,
          "Translations, headings and reflection preserve the same physical corner station");
      }
      const nearCorner: Point[] = [[corner[0] - 1e-6, corner[1], 0], [corner[0] + dx * 1e-6, corner[1] + dy * 1e-6, 0]];
      for (const point of nearCorner) {
        const station = alongPath(path, point);
        assert.ok(Math.abs(station - 4) < 3e-6, "Micrometer movement across a real miter cannot jump a millimeter-scale weathering field");
        assert.ok(Math.abs(alongPath([...path].reverse(), point) - (4 + length - station)) < 1e-9,
          "Reversing a path reverses the same continuous station measure");
      }
    }
  }
  const straight: Point[] = [[0, 0, 0], [4, 0, 0]];
  for (const offset of [-0.1, 0.1]) assert.ok(Math.abs(alongPath(straight, [2, offset, 5]) - 2) < 1e-12,
    "A straight wall retains exact meter scale on both faces");
  for (const end of [[0.001, 0.00001, 0], [0.001, 0, 0]] as Point[]) {
    const hairpin: Point[] = [[0, 0, 0], [4, 0, 0], end], total = 4 + Math.hypot(end[0] - 4, end[1]);
    for (const point of [[2, 0.1, 0], [4, 0, 0], [4.001, -0.001, 0]] as Point[]) {
      const station = alongPath(hairpin, point);
      assert.ok(Number.isFinite(station) && station >= 0 && station <= total,
        "Nearly reversed and exactly reversed segments retain a finite bounded weathering coordinate");
      assert.equal(alongPath(hairpin, point), station, "Ambiguous hairpin sides resolve deterministically");
    }
  }
  // A heading that the former skewed coordinate could not tell apart from a point still advances.
  const diagonal: Point[] = [[0, 0, 0], [6.3, -7.8, 0]];
  const step = alongPath(diagonal, [3.15, -3.9, 0]) - alongPath(diagonal, [0.63, -0.78, 0]);
  assert.ok(Math.abs(step - Math.hypot(2.52, 3.12)) < 1e-9);
});

test("building finishes preserve authored palette declarations and ignore unused palette assets", async () => {
  const row = { width: 18, depth: 4, height: 10.35, stories: 3, detail: "low" };
  const palette = { materials: PALETTE, dressing: 'wall-materials="rough render plaster"' };
  for (const seed of ["palette-a", "palette-b", "palette-c"]) {
    const level = await building({ ...row, seed, wear: 0, ...palette });
    assert.deepEqual(PALETTE_IDS.map((id) => level.document.materials.find((material) => material.id === id)!.texture),
      ["rough.png", "render.png", "plaster.png"], "The authored palette declarations remain intact.");
  }
  const plain = await building({ ...row, seed: "palette-a", wear: 0.5, materials: PALETTE });
  assert.ok(Object.keys(plain.surfaceAppearance?.sourceHashes ?? {}).every((reference) => !Object.keys(PALETTE_PIXELS).includes(reference)),
    "Declaring an unused palette must not substitute it into the recipe finish");
});

test("wall finishing retains one receiving layer and leaves recesses open", async () => {
  const mass = { width: 7.5, depth: 6, height: 15.35, stories: 4, detail: "low", materials: PALETTE, dressing: 'wall-materials="rough render"' };
  for (const seed of ["stack-a", "stack-c"]) {
    for (const wear of [0, 0.4, 0.7, 1]) {
      const level = await building({ ...mass, seed, wear });
      const { skin, recesses } = frontage(level, mass.depth);
      const upper = skin.filter((triangle) => triangle.points.some((point) => point[2] > 4.8));
      const top = maximum(upper.flatMap((triangle) => triangle.points.map((point) => point[2])));
      for (let i = 0; i < 40; i++) for (let j = 0; j < 40; j++) {
        const point = [0.0137 + i * (mass.width - 0.03) / 39, 4.8071 + j * (top - 4.82) / 39];
        const edge = recesses.some((r) => Math.min(Math.abs(point[0] - r.x0), Math.abs(point[0] - r.x1)) < 0.01 || Math.min(Math.abs(point[1] - r.z0), Math.abs(point[1] - r.z1)) < 0.01);
        if (edge) continue;
        const recessed = recesses.some((r) => point[0] > r.x0 && point[0] < r.x1 && point[1] > r.z0 && point[1] < r.z1);
        const layers = trianglesAt(upper, point, [0, 2]);
        assert.equal(layers.length, recessed ? 0 : 1, `${layers.length} receiving layers at ${point} (${seed}, wear ${wear}).`);
      }
      assert.ok(level.mesh.surfaces.length < 500_000, "The fixture remains within the declared high-detail triangle ceiling");
    }
  }
});

test("roof decks have resolved materials and nonoverlapping level coverage", async () => {
  const mass = { width: 7.5, depth: 6, height: 15.35, stories: 4 };
  const roofing = '\n  <material id="kit-roofing" color="#ffffff" repeat="0.65" texture="roofing.png"/>';
  for (const seed of ["deck-a", "deck-b", "deck-c", "deck-d", "deck-e", "deck-f"]) {
    const level = await building({ ...mass, seed, materials: roofing, dressing: 'finishes="kit"' });
    const roof = partTriangles(level, "building").filter((triangle) => triangle.part === "roof");
    // The terrace is the highest paving; a stepped-back body also leaves a paved ledge over the ground story.
    const height = maximum(roof.map((triangle) => triangle.points[0][2]));
    const paving = roof.filter((triangle) => Math.abs(triangle.points[0][2] - height) < 1e-6);
    assert.ok(paving.length > 0, "The deck has a visible receiving surface.");
    for (const triangle of roof) {
      assert.ok(triangle.normal[2] > 0.999999, "Paving faces straight up.");
      const level = triangle.points[0][2];
      for (const point of triangle.points) assert.ok(Math.abs(point[2] - level) < 1e-6, "Paving is level.");
      assert.ok(triangle.colors.flat().every((value) => Number.isFinite(value) && value >= 0));
    }
    assert.ok(paving.every((triangle) => level.document.materials.some((entry) => entry.id === triangle.material)), "Every roof receiver has a resolved render material");
    // A deck is one rectangle between its parapets; a body may jetty out or step back by up to 1.2 m.
    const xs = paving.flatMap((triangle) => triangle.points.map((p) => p[0])),
      ys = paving.flatMap((triangle) => triangle.points.map((p) => p[1]));
    const deck = { x0: minimum(xs), x1: maximum(xs), y0: minimum(ys), y1: maximum(ys) };
    // Off-lattice samples: every point of the deck is paved exactly once.
    for (let i = 0; i < 30; i++)
      for (let j = 0; j < 30; j++) {
        const sample = [
          deck.x0 + 0.0137 + (i * (deck.x1 - deck.x0 - 0.03)) / 29,
          deck.y0 + 0.0071 + (j * (deck.y1 - deck.y0 - 0.02)) / 29,
        ];
        const layers = trianglesAt(paving, sample, [0, 1]);
        assert.equal(layers.length, 1, `${layers.length} layers of paving at ${sample} (${seed}).`);
      }
    assert.ok(level.mesh.surfaces.length < 500_000, `${level.mesh.surfaces.length} triangles exceed the fixture ceiling (${seed}).`);
  }
  // Without a declared roofing material the decks are still paved, in generated finishes only.
  const plain = await building({ ...mass, seed: "deck-a" });
  const plainPaving = partTriangles(plain, "building").filter((triangle) => triangle.part === "roof");
  assert.ok(plainPaving.length > 0);
  assert.ok(!plain.surfaceAppearance?.sourceHashes["roofing.png"], "Undeclared roofing is not loaded");
});

