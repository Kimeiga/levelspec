import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PNG } from "pngjs";
import { compile, parseAml } from "levelspec";
import { ATLAS } from "../src/dressing/kowloon/signs/atlas.ts";
import { glyphCell, layoutLine } from "../src/dressing/kowloon/signs/lettering.ts";
import { surveySigns, type SurveyedSign } from "../src/dressing/kowloon/signs/survey.ts";
import { Obstructions } from "../src/dressing/spans/scene.ts";

type Point = [number, number, number];
type Level = Awaited<ReturnType<typeof compile>>;
type SignPlan = NonNullable<Level["signPlans"]>[number];

const subtract = (a: Point, b: Point): Point => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: Point, b: Point): Point => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const dot = (a: Point, b: Point) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const close = (a: number, b: number, tolerance = 1e-9) => Math.abs(a - b) <= tolerance;

/** Edge of one atlas cell in texture coordinates. */
const CELL_UV = ATLAS.cell / ATLAS.size;

interface StreetOptions {
  seed?: string;
  detail?: string;
  /** Attributes placing the building box. */
  placement?: string;
  /** Additional `<material>` declarations. */
  materials?: string;
  /** Additional attributes of `<dressing>`. */
  dressing?: string;
  /** Additional architecture beside the building. */
  elements?: string;
}

/**
 * A 30 m tenement row, 17.35 m high, whose front is the plane Y=0 facing -Y,
 * with its footprint in +X/+Y. Unplaced, building coordinates are world
 * coordinates, in meters.
 */
function street(options: StreetOptions = {}) {
  return `<architecture version="1" id="sign-street" validation="premap">
  <material id="finish" color="#c6c2b4" repeat="0.5"/>${options.materials ?? ""}
  <box id="row" ${options.placement ?? ""} width="30" depth="8" height="17.35" collidable="false"/>${options.elements ?? ""}
  <dressing seed="${options.seed ?? "signs"}" detail="${options.detail ?? "high"}" grime="0.6" wear="0.3" ${options.dressing ?? ""}>
    <building host="row" material="finish" stories="5"/>
  </dressing>
</architecture>`;
}

/** Compiles a street without navigation and requires a clean result. */
async function build(options: StreetOptions = {}) {
  const level = await compile(parseAml(street(options)), { navigation: false });
  assert.deepEqual(level.diagnostics, [], JSON.stringify(options));
  return level;
}

/** The sign finishes an author may declare under the `kit` prefix. */
const FINISHES = `
  <material id="kit-lettering" color="#ffffff" texture="textures/lettering.png" alpha-cutoff="0.5"/>
  <material id="kit-signboard" color="#ffffff" repeat="0.8" texture="textures/signboard.png"/>
  <material id="kit-rust" color="#ffffff" repeat="2" texture="textures/rust.png"/>`;
const FINISHED = { materials: FINISHES, dressing: 'finishes="kit"' };

interface Triangle {
  points: Point[];
  center: Point;
  normal: Point;
  uv: number[][];
  material: string;
  part: string;
}

/** Lists the triangles generated for the row, with their part name after `$dressing/`. */
function triangles(level: Level): Triangle[] {
  const prefix = "row/$dressing/";
  const result: Triangle[] = [];
  for (let t = 0; t < level.mesh.surfaces.length; t++) {
    const surface = level.surfaces[level.mesh.surfaces[t]];
    if (!surface.object.startsWith(prefix)) continue;
    const indices = level.mesh.indices.slice(t * 3, t * 3 + 3);
    const points = indices.map((i) => level.mesh.positions.slice(i * 3, i * 3 + 3) as Point);
    result.push({
      points,
      center: [0, 1, 2].map((axis) => (points[0][axis] + points[1][axis] + points[2][axis]) / 3) as Point,
      normal: level.mesh.normals.slice(indices[0] * 3, indices[0] * 3 + 3) as Point,
      uv: indices.map((i) => level.mesh.uv.slice(i * 2, i * 2 + 2)),
      material: surface.material,
      part: surface.object.slice(prefix.length),
    });
  }
  return result;
}

const plans = (level: Level): SignPlan[] => level.signPlans ?? [];
const built = (level: Level) => plans(level).filter((plan) => plan.status === "built");

/** True when `point` lies inside a plan's bounds grown by `margin` meters. */
function within(plan: SignPlan, point: Point, margin: number): boolean {
  return point.every(
    (value, axis) => value >= plan.bounds.min[axis] - margin && value <= plan.bounds.max[axis] + margin,
  );
}

/** The characters a plan letters, in capitals and without spaces. */
const lettersOf = (plan: SignPlan) => [...plan.lines.join("").replaceAll(" ", "").toUpperCase()];

/** Returns the character whose atlas cell a lettering triangle samples, judged at its middle. */
function characterOf(uv: number[][]): { character: string; face: number } {
  const middle = [0, 1].map((axis) => (uv[0][axis] + uv[1][axis] + uv[2][axis]) / 3);
  const column = Math.floor(middle[0] / CELL_UV),
    row = Math.floor((1 - middle[1]) / CELL_UV);
  assert.ok(column < ATLAS.columns && row < ATLAS.faces.length * ATLAS.rows, "Lettering samples outside the glyph cells.");
  const index = (row % ATLAS.rows) * ATLAS.columns + column;
  assert.ok(index < ATLAS.characters.length, "Lettering samples an empty cell.");
  for (const [u, v] of uv) {
    assert.ok(u >= column * CELL_UV - 1e-9 && u <= (column + 1) * CELL_UV + 1e-9, "A glyph quad leaves its cell.");
    assert.ok(1 - v >= row * CELL_UV - 1e-9 && 1 - v <= (row + 1) * CELL_UV + 1e-9, "A glyph quad leaves its cell.");
  }
  return { character: [...ATLAS.characters][index], face: Math.floor(row / ATLAS.rows) };
}

test("the lettering atlas image matches the layout the compiler letters from", async () => {
  const bytes = await readFile(new URL("../projects/dressing-demo/textures/lettering.png", import.meta.url));
  const image = PNG.sync.read(bytes);
  assert.equal(image.width, ATLAS.size);
  assert.equal(image.height, ATLAS.size);
  const alpha = (x: number, y: number) => image.data[(y * image.width + x) * 4 + 3];
  // The painter letters every ideograph that appears in the vocabulary file.
  const vocabulary = await readFile(new URL("../src/dressing/kowloon/signs/words.ts", import.meta.url), "utf8");
  const ideographs = [...new Set(vocabulary.match(/[㐀-鿿]/g))];
  assert.ok(ideographs.length > 150);
  const characters = [...ATLAS.characters];
  for (const character of [...ideographs, ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-"])
    assert.ok(characters.includes(character), `The atlas lacks ${character}; regenerate it.`);
  assert.equal(new Set(characters).size, characters.length);
  assert.ok(characters.length <= ATLAS.columns * ATLAS.rows);
  assert.ok(ATLAS.faces.length * ATLAS.rows * ATLAS.cell <= ATLAS.size);
  assert.ok(ATLAS.em < ATLAS.cell);
  for (const face of ATLAS.faces) assert.equal(ATLAS.advances[face].length, ATLAS.latin.length);
  const cells = new Set<string>();
  for (const face of ATLAS.faces)
    for (const character of characters) {
      const cell = glyphCell(face, character);
      assert.ok(cell, `${face} ${character}`);
      assert.ok(close(cell.u1 - cell.u0, CELL_UV) && close(cell.v1 - cell.v0, CELL_UV));
      // Texture coordinates rise from the image's bottom row; pixel rows count from its top.
      const left = Math.round(cell.u0 * ATLAS.size),
        top = Math.round((1 - cell.v1) * ATLAS.size);
      cells.add(`${left},${top}`);
      let inked = 0;
      for (let y = 0; y < ATLAS.cell; y++)
        for (let x = 0; x < ATLAS.cell; x++) {
          const value = alpha(left + x, top + y);
          const border = x === 0 || y === 0 || x === ATLAS.cell - 1 || y === ATLAS.cell - 1;
          if (border) assert.equal(value, 0, `${face} ${character} bleeds out of its cell.`);
          if (value >= 128) inked++;
        }
      // A full stop inks about half a percent of its cell and no glyph fills it.
      assert.ok(inked > ATLAS.cell ** 2 * 0.002 && inked < ATLAS.cell ** 2 * 0.75, `${face} ${character} inks ${inked} pixels.`);
    }
  assert.equal(cells.size, ATLAS.faces.length * characters.length, "Every face and character has its own cell.");
  assert.equal(glyphCell("hei", "☃"), undefined);
  assert.equal(glyphCell("hei", "a"), undefined, "Cells are looked up by the character as lettered: capitals only.");
});

test("a line of lettering is fitted to its box in reading order", () => {
  // Four ideographs down a 0.5 m by 2.4 m box: each gets a 0.6 m slot and stays 0.5 m wide.
  const down = layoutLine("永安牙科", "kai", 0.5, 2.4, "ttb");
  assert.deepEqual(down.missing, []);
  assert.deepEqual(down.glyphs.map((glyph) => glyph.character), ["永", "安", "牙", "科"]);
  for (const [index, glyph] of down.glyphs.entries()) {
    assert.ok(close(glyph.x, 0.25), "Upright lettering is centered across its box.");
    assert.ok(close(glyph.y, 2.4 - 0.6 * (index + 0.5)), "Characters share the height equally, first at the top.");
    // Square would be 0.5 m; the slot lets each stand a fifth taller, within the quarter allowed.
    assert.ok(close(glyph.width, 0.5) && close(glyph.height, 0.6));
  }
  // A slot much taller than the box is wide is not filled: stretch stops at a quarter.
  const sparse = layoutLine("永安", "kai", 0.5, 2.4, "ttb");
  assert.ok(sparse.glyphs.every((glyph) => close(glyph.width, 0.5) && close(glyph.height, 0.625)));
  assert.ok(close(sparse.glyphs[0].y, 1.8) && close(sparse.glyphs[1].y, 0.6));
  // The same text across a 2.4 m by 0.5 m box, read from either end.
  const across = layoutLine("永安牙科", "hei", 2.4, 0.5, "ltr"),
    reversed = layoutLine("永安牙科", "hei", 2.4, 0.5, "rtl");
  for (const [index, glyph] of across.glyphs.entries()) {
    assert.ok(close(glyph.x, 0.3 + 0.6 * index) && close(glyph.y, 0.25));
    assert.ok(close(glyph.width, 0.6) && close(glyph.height, 0.5));
    assert.equal(reversed.glyphs[index].character, glyph.character, "Glyphs are listed in reading order.");
    assert.ok(close(reversed.glyphs[index].x, 2.4 - glyph.x), "Right-to-left lettering puts the first character at the right end.");
  }
  // Capitals keep their own advance widths at one size, and small letters are lettered as capitals.
  const word = layoutLine("MILL", "hei", 4, 0.4, "ltr"),
    lower = layoutLine("mill", "hei", 4, 0.4, "ltr");
  assert.deepEqual(lower, word);
  assert.deepEqual(layoutLine("MILL", "hei", 4, 0.4, "rtl"), word, "A line with capitals always reads left to right.");
  const advance = (character: string) => ATLAS.advances.hei[ATLAS.latin.indexOf(character)];
  assert.ok(advance("I") < advance("M") && advance(" ") > 0);
  /** Checks that `line` is set at its natural advances with an em of `em` meters, centered in `width`. */
  const naturallySet = (line: ReturnType<typeof layoutLine>, text: string, width: number, height: number, em: number) => {
    let pen = (width - [...text].reduce((sum, character) => sum + advance(character), 0) * em) / 2;
    const expected: { character: string; x: number }[] = [];
    for (const character of text) {
      if (character !== " ") expected.push({ character, x: pen + (advance(character) * em) / 2 });
      pen += advance(character) * em;
    }
    assert.equal(line.glyphs.length, expected.length);
    for (const [index, glyph] of line.glyphs.entries()) {
      assert.equal(glyph.character, expected[index].character);
      assert.ok(close(glyph.x, expected[index].x) && close(glyph.y, height / 2));
      assert.ok(close(glyph.width, em) && close(glyph.height, em), "Capitals are never stretched.");
    }
  };
  // A short word is as tall as its box; a long line is as large as its width allows.
  naturallySet(word, "MILL", 4, 0.4, 0.4);
  const text = "WING ON DENTAL SURGERY";
  const total = [...text].reduce((sum, character) => sum + advance(character), 0);
  assert.ok(2.4 / total < 0.5);
  naturallySet(layoutLine(text, "hei", 2.4, 0.5, "ltr"), text, 2.4, 0.5, 2.4 / total);
  // Upright capitals and digits stack in equal slots like ideographs, unstretched.
  const number = layoutLine("3-82", "hei", 0.3, 2, "ttb");
  assert.deepEqual(number.glyphs.map((glyph) => glyph.character), ["3", "-", "8", "2"]);
  for (const [index, glyph] of number.glyphs.entries())
    assert.ok(close(glyph.x, 0.15) && close(glyph.y, 2 - 0.5 * (index + 0.5)) && close(glyph.width, 0.3) && close(glyph.height, 0.3));
  // Characters the atlas cannot letter are reported once and left out; nothing to letter is no glyphs.
  const unknown = layoutLine("永☃安☃", "hei", 2.4, 0.5, "ltr");
  assert.deepEqual(unknown.missing, ["☃"]);
  assert.deepEqual(unknown.glyphs.map((glyph) => glyph.character), ["永", "安"]);
  assert.ok(close(unknown.glyphs[0].x, 0.6) && close(unknown.glyphs[1].x, 1.8), "The remaining characters share the whole box.");
  assert.deepEqual(layoutLine("  ", "hei", 2.4, 0.5, "ltr"), { glyphs: [], missing: [] });
});

/** How the building box may be placed: unplaced, yawed 35 degrees, and reflected. */
const PLACEMENTS = ["", 'rotation="0 0 35"', 'scale="-1 1 1"'];

test("signs are lettered with their own text, upright and unmirrored however the building is placed", async () => {
  for (const placement of PLACEMENTS) {
    const level = await build({ ...FINISHED, placement });
    const parts = triangles(level);
    const lettered = parts.filter((triangle) => triangle.material === "kit-lettering");
    assert.ok(lettered.length >= 100, "A street frontage carries many lettered signs.");
    for (const { points, uv, normal, part } of lettered) {
      assert.ok(part === "signage" || part === "rooftop" || part.startsWith("shop"), `Lettering belongs to signs and shop boards, not ${part}.`);
      characterOf(uv);
      const e1 = subtract(points[1], points[0]),
        e2 = subtract(points[2], points[0]);
      const du1 = uv[1][0] - uv[0][0],
        dv1 = uv[1][1] - uv[0][1],
        du2 = uv[2][0] - uv[0][0],
        dv2 = uv[2][1] - uv[0][1];
      const handedness = du1 * dv2 - du2 * dv1;
      assert.ok(dot(cross(e1, e2), normal) > 0);
      // +U cross +V equals the winding normal divided by this determinant.
      assert.ok(handedness > 0, "Sign lettering must not be mirrored.");
      const up = e2.map((v, k) => (v * du1 - e1[k] * du2) / handedness) as Point;
      assert.ok(up[2] > 0.98 * Math.hypot(...up), "Sign lettering must stand upright.");
    }
    if (placement) continue;
    // Bounds are exact for the unplaced row, so each sign's glyphs can be read back from the mesh.
    assert.ok(built(level).length >= 10);
    for (const plan of built(level)) {
      assert.ok(plan.lines.length > 0 && plan.lines.every((line) => line.trim().length > 0), `${plan.id} has an empty line.`);
      const wanted = new Map<string, number>();
      for (const character of lettersOf(plan)) wanted.set(character, (wanted.get(character) ?? 0) + 1);
      const drawn = new Map<string, number>();
      for (const triangle of lettered) {
        if (!within(plan, triangle.center, 0.02)) continue;
        const { character } = characterOf(triangle.uv);
        drawn.set(character, (drawn.get(character) ?? 0) + 1);
      }
      assert.deepEqual([...drawn.keys()].sort(), [...wanted.keys()].sort(), `${plan.id} does not letter exactly ${plan.lines.join(" / ")}.`);
      // One quad of two triangles per character; a second face and a drop shadow each at most double it.
      for (const [character, count] of wanted) {
        const copies = drawn.get(character)! / (2 * count);
        assert.ok(copies >= 1 && copies <= 4, `${plan.id} letters ${character} ${drawn.get(character)! / 2} times for ${count}.`);
      }
    }
    for (const role of ["signboard", "rust"])
      assert.ok(parts.some((triangle) => triangle.part === "signage" && triangle.material === `kit-${role}`), `No sign uses the ${role} finish.`);
    // A sign that stands off its wall is carried by steel reaching back to it.
    const steel = parts.filter((triangle) => triangle.part === "signage" && triangle.material !== "kit-lettering");
    const projecting = built(level).filter((plan) => plan.mount === "blade" || plan.mount === "hung");
    assert.ok(projecting.length >= 3);
    for (const plan of projecting)
      assert.ok(
        steel.some(({ points }) =>
          points.some(
            (point) =>
              point[1] > plan.bounds.max[1] + 0.05 &&
              point[0] > plan.bounds.min[0] - 0.3 &&
              point[0] < plan.bounds.max[0] + 0.3 &&
              point[2] > plan.bounds.min[2] - 1 &&
              point[2] < plan.bounds.max[2] + 1,
          ),
        ),
        `${plan.id} hangs in the air.`,
      );
  }
});

test("without a lettering finish signs keep their boards and stand-in lettering", async () => {
  const plain = await build();
  const generated = triangles(plain);
  const signage = generated.filter((triangle) => triangle.part === "signage");
  assert.ok(signage.length > 0);
  assert.ok(signage.every((triangle) => triangle.material === "finish" || triangle.material.startsWith("$kowloon/")));
  // Each character is a painted block: at least one quad per character inside the sign.
  for (const plan of built(plain)) {
    const blocks = generated.filter((triangle) => triangle.material === "$kowloon/paint" && within(plan, triangle.center, 0.02));
    assert.ok(blocks.length >= 2 * lettersOf(plan).length, `${plan.id} has ${blocks.length / 2} painted quads for ${lettersOf(plan).length} characters.`);
  }
  // The same signs are planned with or without finishes; only how they are painted differs.
  const finished = await build(FINISHED);
  assert.deepEqual(plans(plain), plans(finished));
  // Declaring the atlas alone binds lettering alone.
  const lettering = await build({
    materials: '\n  <material id="kit-lettering" color="#ffffff" texture="textures/lettering.png" alpha-cutoff="0.5"/>',
    dressing: 'finishes="kit"',
  });
  const bound = new Set(triangles(lettering).map((triangle) => triangle.material).filter((id) => id.startsWith("kit-")));
  assert.deepEqual([...bound], ["kit-lettering"]);
  // A lettering finish that would draw opaque glyph cells is rejected at the dressing source.
  const opaque = await compile(
    parseAml(street({ materials: '\n  <material id="kit-lettering" color="#ffffff" texture="textures/lettering.png"/>', dressing: 'finishes="kit"' })),
    { navigation: false },
  );
  assert.ok(opaque.diagnostics.some((d) => d.severity === "error" && d.code === "AML_DRESSING" && /alpha-cutoff/.test(d.message) && d.source));
});

/** The clear distance between two plans' bounds along the axis that separates them most, meters. */
function separation(a: SignPlan, b: SignPlan): number {
  return Math.max(
    ...[0, 1, 2].map((axis) => Math.max(a.bounds.min[axis] - b.bounds.max[axis], b.bounds.min[axis] - a.bounds.max[axis])),
  );
}

test("the second pass keeps signs apart and removes those nobody could read", async () => {
  for (const seed of ["cull-a", "cull-b", "cull-d"]) {
    const open = await build({ seed, ...FINISHED });
    const kept = built(open);
    assert.ok(kept.length >= 8);
    assert.ok(plans(open).length > kept.length, "A crowded frontage proposes more signs than it can show.");
    assert.equal(new Set(plans(open).map((plan) => plan.id)).size, plans(open).length);
    // Kept signs stay 0.06 m apart. Bounds are exact here: the row is axis aligned.
    for (const [index, a] of kept.entries())
      for (const b of kept.slice(index + 1))
        assert.ok(separation(a, b) >= 0.06 - 1e-6, `${a.id} and ${b.id} are ${separation(a, b)} m apart.`);
    // Only kept signs are drawn: every sign triangle is accounted for by a built plan.
    for (const plan of plans(open)) assert.equal(plan.triangles > 0, plan.status === "built", `${plan.id} is ${plan.status} with ${plan.triangles} triangles.`);
    const facade = kept.filter((plan) => plan.mount !== "roof").reduce((sum, plan) => sum + plan.triangles, 0);
    assert.equal(triangles(open).filter((triangle) => triangle.part === "signage").length, facade);
    // A blank visual screen hangs 0.6 m in front of the upper stories. The first pass does not
    // look at visual props, so it proposes the same signs; the second removes what the screen hides.
    const screen = '\n  <box id="screen" position="-6 -0.9 4.2" width="42" depth="0.3" height="13.4" collidable="false"/>';
    const screened = await build({ seed, ...FINISHED, elements: screen });
    assert.deepEqual(
      plans(screened).map(({ status, triangles, ...plan }) => plan),
      plans(open).map(({ status, triangles, ...plan }) => plan),
    );
    // Flat signs on the front plane that are wholly behind the screen, clear of its lower edge.
    const hidden = (plan: SignPlan) =>
      plan.mount === "wall" && plan.bounds.min[2] >= 5.3 && plan.bounds.min[1] > -0.55 && plan.bounds.max[1] < 0.15;
    const statusBehind = plans(screened).filter(hidden).map((plan) => plan.status);
    assert.ok(plans(open).some((plan) => hidden(plan) && plan.status === "built"), "The open street has flat signs on its upper wall.");
    assert.ok(statusBehind.every((status) => status !== "built" && status !== "withheld"), `Signs behind the screen are ${statusBehind}.`);
    assert.ok(statusBehind.includes("obstructed"));
    // Nothing survives that would pass through the screen itself.
    for (const plan of built(screened))
      assert.ok(
        plan.bounds.max[1] <= -0.9 || plan.bounds.min[1] >= -0.6 || plan.bounds.max[2] <= 4.2 || plan.bounds.min[2] >= 17.6,
        `${plan.id} passes through the screen.`,
      );
    // Shop fascias lie below the screen and are judged first, so every one of them survives it.
    const fascias = kept.filter((plan) => plan.mount === "fascia").map((plan) => plan.id);
    assert.ok(fascias.length > 0);
    const survivors = new Set(built(screened).map((plan) => plan.id));
    assert.ok(fascias.every((id) => survivors.has(id)));
  }
});

test("sign decisions do not depend on detail, which only withholds planned signs", async () => {
  for (const seed of ["detail-a", "detail-b"]) {
    const [low, medium, high] = await Promise.all(["low", "medium", "high"].map((detail) => build({ seed, detail })));
    assert.ok(plans(high).length > 0);
    assert.ok(plans(high).every((plan) => plan.status !== "withheld"), "High detail builds everything it keeps.");
    const proposal = ({ status, triangles, ...plan }: SignPlan) => plan;
    for (const level of [low, medium]) {
      assert.deepEqual(plans(level).map(proposal), plans(high).map(proposal));
      for (const [index, plan] of plans(level).entries()) {
        const decided = plans(high)[index].status;
        if (decided === "built") assert.ok(plan.status === "built" || plan.status === "withheld");
        else assert.equal(plan.status, decided, "A sign removed at high detail is removed at every detail.");
      }
    }
    const ids = (level: Level) => new Set(built(level).map((plan) => plan.id));
    assert.ok([...ids(low)].every((id) => ids(medium).has(id)), "Raising detail only adds signs.");
    assert.ok(ids(low).size < ids(high).size);
    const again = await build({ seed, detail: "high" });
    assert.deepEqual(plans(again), plans(high));
    assert.notDeepEqual(plans(await build({ seed: `${seed}-other` })), plans(high));
  }
});

/**
 * A board `width` by `height` meters whose lettered face is centered at
 * `center` and faces `normal`, a horizontal axis direction. Its body is
 * 0.04 m thick behind the face, and its reader stands level with it.
 */
function board(center: Point, normal: Point, width: number, height: number, priority: number, lookDown = 0): SurveyedSign {
  const right = cross([0, 0, 1], normal);
  return {
    priority,
    solids: [
      {
        center: [center[0] - normal[0] * 0.02, center[1] - normal[1] * 0.02, center[2]],
        axes: [right, normal, [0, 0, 1]],
        half: [width / 2, 0.02, height / 2],
      },
    ],
    faces: [{ center, right, up: [0, 0, 1], normal, width, height, lookDown }],
  };
}

/** Indexes rectangles as scenery: each lies in the plane where `axis` equals `at` and spans the other two ranges. */
function scenery(...rects: { axis: 0 | 1 | 2; at: number; spans: [[number, number], [number, number]] }[]) {
  const corners: number[] = [];
  for (const { axis, at, spans } of rects) {
    const point = (a: number, b: number) => {
      const p = [a, b];
      p.splice(axis, 0, at);
      return p;
    };
    const [[a0, a1], [b0, b1]] = spans;
    corners.push(...point(a0, b0), ...point(a1, b0), ...point(a1, b1), ...point(a0, b0), ...point(a1, b1), ...point(a0, b1));
  }
  return new Obstructions(Float64Array.from(corners));
}
/** A wall in the plane Y=`y` spanning X and Z ranges. */
const wall = (y: number, x: [number, number], z: [number, number]) => ({ axis: 1 as const, at: y, spans: [x, z] as [[number, number], [number, number]] });
const NOTHING = wall(-90, [0, 1], [0, 1]);
const BIG: [[number, number], [number, number]] = [[-40, 40], [-20, 40]];

test("the survey judges each sign by what stands before its lettering", () => {
  const verdicts = (signs: SurveyedSign[], ...rects: Parameters<typeof scenery>) => surveySigns(signs, scenery(NOTHING, ...rects));
  // A 1.2 m by 0.6 m board at Y=0 facing -Y. Its readers stand 0.8 x 1.2 = 0.96 m back.
  const sign = board([0, 0, 5], [0, -1, 0], 1.2, 0.6, 1);
  assert.deepEqual(verdicts([sign]), ["clear"]);
  // A wall between the board and its readers hides it; one behind them does not.
  assert.deepEqual(verdicts([sign], wall(-0.8, ...BIG)), ["obstructed"]);
  assert.deepEqual(verdicts([sign], wall(-1.1, ...BIG)), ["clear"]);
  // Readers of a small plate stand no nearer than 0.8 m, and of a very large board no farther than 6 m.
  const plate = board([0, 0, 5], [0, -1, 0], 0.3, 0.4, 1);
  assert.deepEqual(verdicts([plate], wall(-0.7, ...BIG)), ["obstructed"]);
  assert.deepEqual(verdicts([plate], wall(-0.9, ...BIG)), ["clear"]);
  const hoarding = board([0, 0, 20], [0, -1, 0], 10, 3, 1);
  assert.deepEqual(verdicts([hoarding], wall(-5, ...BIG)), ["obstructed"]);
  assert.deepEqual(verdicts([hoarding], wall(-7, ...BIG)), ["clear"]);
  // The wall the board is fixed to, just behind its body, neither crowds nor hides it.
  assert.deepEqual(verdicts([sign], wall(0.05, ...BIG)), ["clear"]);
  // Reading needs 60% of the face. A 2 m board is sampled at seven points from 0.8 m left to
  // 0.8 m right of center; a cover 0.2 m before it from its left edge hides two of them from
  // the best reader when it ends at X=-0.2 (5/7 seen) and three when it ends at X=0 (4/7).
  const wide = board([0, 0, 5], [0, -1, 0], 2, 0.5, 1);
  assert.deepEqual(verdicts([wide], wall(-0.2, [-1.001, -0.2], [4, 6])), ["clear"]);
  assert.deepEqual(verdicts([wide], wall(-0.2, [-1.001, 0], [4, 6])), ["obstructed"]);
  // Scenery passing through a board's body crowds it even though its face stays in view.
  assert.deepEqual(verdicts([wide], wall(0.02, [0.9, 1.4], [4.9, 5.1])), ["crowded"]);
  // A reader below the sign looks up past what is in front of it: a ledge 0.5 m below the
  // board hides it from the street, 0.96 x tan 30 = 0.55 m down, but not from its own level.
  const ledge = { axis: 2 as const, at: 4.5, spans: [[-6, 6], [-3, 0]] as [[number, number], [number, number]] };
  assert.deepEqual(verdicts([sign], ledge), ["clear"]);
  assert.deepEqual(verdicts([board([0, 0, 5], [0, -1, 0], 1.2, 0.6, 1, Math.PI / 6)], ledge), ["obstructed"]);
  // Of two overlapping signs the one with priority stays, whichever is listed first.
  const major = board([0, 0, 5], [0, -1, 0], 1.2, 0.6, 2),
    minor = board([0.3, 0, 5.1], [0, -1, 0], 1.2, 0.6, 1);
  assert.deepEqual(verdicts([major, minor]), ["clear", "crowded"]);
  assert.deepEqual(verdicts([minor, major]), ["crowded", "clear"]);
  // With equal priority the first listed is decided first.
  assert.deepEqual(verdicts([{ ...minor, priority: 2 }, major]), ["clear", "crowded"]);
  // Kept signs stay 0.06 m apart: beside one another 0.04 m is too near and 0.08 m is not.
  const beside = (gap: number) => board([1.2 + gap, 0, 5], [0, -1, 0], 1.2, 0.6, 1);
  assert.deepEqual(verdicts([major, beside(0.04)]), ["clear", "crowded"]);
  assert.deepEqual(verdicts([major, beside(0.08)]), ["clear", "clear"]);
  // A later sign may not stand in front of one already kept, and is itself hidden behind one.
  const front = board([0, -0.5, 5], [0, -1, 0], 1.2, 0.6, 1),
    rear = board([0, 0.5, 5], [0, -1, 0], 1.2, 0.6, 1);
  assert.deepEqual(verdicts([major, front]), ["clear", "crowded"]);
  assert.deepEqual(verdicts([major, rear]), ["clear", "obstructed"]);
  // A board read from both sides survives while either side can be read, and not otherwise.
  const blade = board([0, 0, 5], [1, 0, 0], 0.6, 2.4, 1);
  blade.faces.push({ ...blade.faces[0], center: [-0.04, 0, 5], normal: [-1, 0, 0], right: [0, -1, 0] });
  const fin = (x: number) => ({ axis: 0 as const, at: x, spans: [[-6, 6], [0, 12]] as [[number, number], [number, number]] });
  assert.deepEqual(verdicts([blade], fin(0.4)), ["clear"]);
  assert.deepEqual(verdicts([blade], fin(0.4), fin(-0.44)), ["obstructed"]);
  // Signs far apart do not affect one another.
  assert.deepEqual(verdicts([major, board([40, 0, 5], [0, -1, 0], 1.2, 0.6, 1)]), ["clear", "clear"]);
  assert.deepEqual(surveySigns([], scenery(NOTHING)), []);
});
