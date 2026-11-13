import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { validateBytes } from "gltf-validator";
import { compile, parseAml, serializeAml, collisionMesh, toGLB } from "levelspec";
import { hangingCurve } from "../src/dressing/spans/catenary.ts";
import { assertHungCloth, atlasCell } from "./fixtures/kit-props.ts";

type Level = Awaited<ReturnType<typeof compile>>;
type Point = [number, number, number];
type Family = "cables" | "washing" | "signs" | "fittings";

const alley = await readFile(new URL("./fixtures/aml/span-dressing.aml", import.meta.url), "utf8");
const alleySpans = '<spans cables="0.7" clotheslines="0.6" signs="0.5"/>';
assert.ok(alley.includes(alleySpans), "The alley fixture declares the recipe these tests replace.");

interface YardOptions {
  seed?: string;
  spans?: string;
  /** Additional architecture placed in the yard. */
  extra?: string;
  /** Additional dressing recipes. */
  rules?: string;
}

/**
 * Builds two facing 5 m walls on a floor whose top is z = 0. The walls are
 * centered on y = 0 and y = 6 and are 0.22 m thick, so the faces that look at
 * one another lie at y = 0.11 and y = 5.89 and run from x = 0 to x = 10.
 */
function yard(options: YardOptions = {}) {
  return `<architecture version="1" id="span-yard" validation="premap">
    <material id="finish" color="#bcb6a0" repeat="0.5"/>
    <profile id="floor-plan" points="-2 -3; 12 -3; 12 9; -2 9"/>
    <slab id="floor" profile="floor-plan" thickness="0.2"/>
    <path id="south-axis" points="0 0 0; 10 0 0"/>
    <path id="north-axis" points="0 6 0; 10 6 0"/>
    <wall id="south" path="south-axis" thickness="0.22" height="5"/>
    <wall id="north" path="north-axis" thickness="0.22" height="5"/>
    ${options.extra ?? ""}
    <dressing seed="${options.seed ?? "yard"}" detail="medium">
      <wall host="south" material="finish" face="side" windows="false"/>
      <wall host="north" material="finish" face="side" windows="false"/>
      ${options.rules ?? ""}
      ${options.spans ?? '<spans cables="1" clotheslines="0" signs="0"/>'}
    </dressing>
  </architecture>`;
}
const SOUTH_FACE = 0.11;
const NORTH_FACE = 5.89;

/** Compiles AML source without navigation; span generation never depends on it. */
function build(source: string) {
  return compile(parseAml(source), { navigation: false });
}

interface SpanTriangle {
  family: Family;
  /** The dressing host whose mesh carries the part. */
  host: string;
  points: Point[];
  normals: Point[];
  uv: number[][];
  surface: Level["surfaces"][number];
}

/** Collects generated span geometry by its documented `<host>/$dressing/span-<family>` identity. */
function spans(level: Level, family?: Family): SpanTriangle[] {
  const result: SpanTriangle[] = [];
  for (let t = 0; t < level.mesh.surfaces.length; t++) {
    const surface = level.surfaces[level.mesh.surfaces[t]];
    const match = /^(.*)\/\$dressing\/span-(cables|washing|signs|fittings)$/.exec(surface.object);
    if (!match || (family && match[2] !== family)) continue;
    const indices = level.mesh.indices.slice(t * 3, t * 3 + 3);
    result.push({
      family: match[2] as Family,
      host: match[1],
      points: indices.map((i) => level.mesh.positions.slice(i * 3, i * 3 + 3) as Point),
      normals: indices.map((i) => level.mesh.normals.slice(i * 3, i * 3 + 3) as Point),
      uv: indices.map((i) => level.mesh.uv.slice(i * 2, i * 2 + 2)),
      surface,
    });
  }
  return result;
}

/** Lists the vertices of the triangles of one family. */
function vertices(level: Level, family: Family): Point[] {
  return spans(level, family).flatMap((triangle) => triangle.points);
}

/** Sums the length of a polyline in meters. */
function pathLength(points: number[][]): number {
  let length = 0;
  for (let i = 1; i < points.length; i++)
    length += Math.hypot(...points[i].map((value, axis) => value - points[i - 1][axis]));
  return length;
}

test("a hanging curve has the requested length and sags as a catenary does", () => {
  const level = hangingCurve([0, 0, 5], [10, 0, 5], 0.02, 200);
  assert.deepEqual(level[0], [0, 0, 5]);
  assert.deepEqual(level[200], [10, 0, 5]);
  assert.ok(Math.abs(pathLength(level) - 10.2) < 1e-3, `arc length ${pathLength(level)}`);
  const lowest = Math.min(...level.map((p) => p[2]));
  assert.equal(level[100][2], lowest, "Level supports hang lowest at mid-span.");
  for (let i = 0; i <= 100; i++) assert.ok(Math.abs(level[i][2] - level[200 - i][2]) < 1e-9);
  // For small slack the sag approaches the parabola's sqrt(3·span·extra length / 8) = 0.866 m.
  assert.ok(Math.abs(5 - lowest - Math.sqrt((3 * 10 * 0.2) / 8)) < 0.02, `sag ${5 - lowest}`);

  const rising = hangingCurve([1, 2, 3], [1, 8, 5], 0.05, 200);
  assert.deepEqual(rising[0], [1, 2, 3]);
  assert.deepEqual(rising[200], [1, 8, 5]);
  assert.ok(Math.abs(pathLength(rising) - Math.hypot(6, 2) * 1.05) < 1e-3);
  for (let i = 1; i < 200; i++)
    assert.ok(rising[i][2] < 3 + (2 * i) / 200, "A hanging line stays below its chord.");
  const lowestIndex = rising.findIndex((p) => p[2] === Math.min(...rising.map((q) => q[2])));
  assert.ok(lowestIndex > 0 && lowestIndex < 100, "The low point lies toward the lower support.");

  for (const straight of [hangingCurve([0, 0, 2], [4, 3, 4], 0, 8), hangingCurve([2, 2, 1], [2, 2, 6], 0.1, 8)])
    for (let i = 0; i <= 8; i++)
      straight[i].forEach((value, axis) =>
        assert.ok(Math.abs(value - (straight[0][axis] + ((straight[8][axis] - straight[0][axis]) * i) / 8)) < 1e-12),
      );
});

test("spans add render-only parts and leave the physical level and all other dressing unchanged", async () => {
  const dressed = await build(alley);
  const bare = await build(alley.replace(alleySpans, '<spans cables="0" clotheslines="0" signs="0"/>'));
  assert.deepEqual(dressed.diagnostics, []);
  assert.deepEqual(bare.diagnostics, []);
  assert.equal(spans(bare).length, 0);
  for (const family of ["cables", "washing", "signs", "fittings"] as const)
    assert.ok(spans(dressed, family).length > 0, `The alley strings ${family}.`);

  assert.equal(dressed.physicalHash, bare.physicalHash);
  assert.deepEqual(collisionMesh(dressed), collisionMesh(bare));
  const others: number[] = [];
  for (let t = 0; t < dressed.mesh.surfaces.length; t++) {
    if (/\/\$dressing\/span-/.test(dressed.surfaces[dressed.mesh.surfaces[t]].object)) continue;
    for (const index of dressed.mesh.indices.slice(t * 3, t * 3 + 3))
      others.push(...dressed.mesh.positions.slice(index * 3, index * 3 + 3));
  }
  assert.deepEqual(others, bare.mesh.indices.flatMap((index) => bare.mesh.positions.slice(index * 3, index * 3 + 3)));

  const materials = new Set(dressed.document.materials.map((material) => material.id));
  for (const { points: [a, b, c], normals, surface, host } of spans(dressed)) {
    const ab = b.map((v, i) => v - a[i]),
      ac = c.map((v, i) => v - a[i]);
    const cross = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]];
    assert.ok(Math.hypot(...cross) > 1e-12, `${surface.object}: nondegenerate triangle`);
    for (const normal of normals)
      assert.ok(cross.reduce((sum, v, i) => sum + v * normal[i], 0) > 0, `${surface.object}: winding agrees with normals`);
    assert.equal(surface.collidable, false);
    assert.equal(surface.kind, "prop");
    assert.equal(surface.domain, "visualization");
    assert.ok(materials.has(surface.material), surface.material);
    const ancestry = dressed.provenance[surface.object];
    assert.equal(ancestry.host, host);
    assert.ok(ancestry.source, `${surface.object}: source location retained`);
  }
  assert.equal((await validateBytes(toGLB(dressed))).issues.numErrors, 0);
});

for (const clearance of [2.6, 3.4])
  test(`cables hang between the facing walls and keep ${clearance} m over the floor`, async () => {
    const level = await build(yard({ spans: `<spans cables="1" clotheslines="0" signs="0" clearance="${clearance}"/>` }));
    assert.deepEqual(level.diagnostics, []);
    const cables = vertices(level, "cables");
    assert.ok(cables.length > 0);
    for (const [x, y, z] of cables) {
      assert.ok(y > SOUTH_FACE && y < NORTH_FACE, `Cable vertex y=${y} lies outside the gap.`);
      assert.ok(x > -0.05 && x < 10.05, `Cable vertex x=${x} runs past the walls.`);
      // The widest cable is under 4 cm across, so its underside is within 2 cm of its centerline.
      assert.ok(z >= clearance - 0.02 && z < 5, `Cable vertex z=${z} breaks the clearance or the wall top.`);
    }
    const ys = cables.map((p) => p[1]);
    assert.ok(Math.min(...ys) < SOUTH_FACE + 0.2 && Math.max(...ys) > NORTH_FACE - 0.2, "Cables reach both walls.");

    const fittings = vertices(level, "fittings");
    assert.ok(fittings.length > 0, "Cables are fixed with brackets.");
    for (const [, y] of fittings)
      assert.ok(
        (y >= SOUTH_FACE - 1e-6 && y < SOUTH_FACE + 0.25) || (y > NORTH_FACE - 0.25 && y <= NORTH_FACE + 1e-6),
        `Fitting vertex y=${y} is not on a facing wall.`,
      );
    for (const host of new Set(spans(level, "cables").map((triangle) => triangle.host)))
      assert.deepEqual([...level.provenance[`${host}/$dressing/span-cables`].contributors].sort(), ["north", "south"]);
  });

test("a wall standing in the gap blocks spans, and a family that fits nowhere is reported", async () => {
  const screen = `<path id="screen-axis" points="-1 3 0; 11 3 0"/>
    <wall id="screen" path="screen-axis" thickness="0.22" height="7"/>`;
  const blocked = await build(yard({ extra: screen, spans: '<spans hosts="south north" cables="1" clotheslines="0" signs="0"/>' }));
  assert.equal(spans(blocked).length, 0);
  assert.equal(blocked.diagnostics.length, 1);
  const [warning] = blocked.diagnostics;
  assert.equal(warning.code, "DRESSING_NO_SPAN_FIT");
  assert.equal(warning.severity, "warning");
  assert.deepEqual([...warning.objects].sort(), ["north", "south"]);
  assert.match(warning.message, /cable/);
  assert.ok(warning.source?.line, "The warning points at the span recipe.");
  const bounds = warning.review?.bounds;
  assert.ok(bounds && [...bounds.min, ...bounds.max].every(Number.isFinite));
  assert.ok(bounds.min[1] <= SOUTH_FACE && bounds.max[1] >= NORTH_FACE, "The inspection target covers both walls.");

  const divided = await build(yard({
    extra: screen,
    rules: '<wall host="screen" material="finish" face="side" windows="false"/>',
    spans: '<spans cables="1" clotheslines="0" signs="0"/>',
  }));
  assert.deepEqual(divided.diagnostics, []);
  const cables = spans(divided, "cables");
  assert.ok(cables.length > 0, "Each half of the divided yard still receives cables.");
  for (const { points } of cables) {
    const sides = new Set(points.map((p) => (p[1] < 3 ? "south" : "north")));
    assert.equal(sides.size, 1, "No cable passes through the screen wall.");
    for (const [, y] of points) assert.ok(Math.abs(y - 3) > 0.11, `Cable vertex y=${y} is inside the screen wall.`);
  }
});

test("washing on a clothesline is hung cloth in the cloth finish, plain when no atlas is declared", async () => {
  const lines = alley.replace(alleySpans, '<spans cables="0" clotheslines="1" signs="0"/>');
  const finished = lines
    .replace('<material id="plaster"', '<material id="kit-cloth" color="#ffffff"/>\n  <material id="plaster"')
    .replace('detail="medium">', 'detail="medium" finishes="kit">');
  assert.ok(finished.includes('finishes="kit"') && finished.includes('id="kit-cloth"'));
  const level = await build(finished);
  assert.deepEqual(level.diagnostics, []);
  const cloth = spans(level, "washing").filter((triangle) => triangle.surface.material === "kit-cloth");
  assertHungCloth(cloth);
  // The cloth atlas is an 8 × 4 grid with one garment design per cell; these lines carry over a dozen garments.
  const designs = new Set(cloth.map(({ uv }) => atlasCell(uv, 8, 4, "A cloth triangle")));
  assert.ok(designs.size >= 5, `Only ${designs.size} garment designs hang on the lines.`);

  // The same cloth hangs in the plain kit paint when the atlas is not declared.
  const plain = spans(await build(lines), "washing");
  /** Names a triangle by its positions and normals at the precision the kit emits. */
  const signature = (triangle: SpanTriangle) =>
    [...triangle.points.flat().map((value) => value.toFixed(4)), ...triangle.normals.flat().map((value) => value.toFixed(3))].join();
  const painted = new Set(plain.filter((triangle) => triangle.surface.material === "$kowloon/paint").map(signature));
  assert.ok(plain.every((triangle) => !triangle.surface.material.startsWith("kit-")));
  for (const triangle of cloth) assert.ok(painted.has(signature(triangle)), "A garment changes without its atlas.");
});

test("family amounts and hosts choose what is strung and between which elements", async () => {
  const washing = await build(alley.replace(alleySpans, '<spans cables="0" clotheslines="0.6" signs="0"/>'));
  assert.deepEqual(washing.diagnostics, []);
  assert.deepEqual([...new Set(spans(washing).map((triangle) => triangle.family))].sort(), ["fittings", "washing"]);
  for (const [, , z] of vertices(washing, "washing")) assert.ok(z >= 2.6 - 0.01, `Washing hangs at z=${z}.`);

  const signs = await build(alley.replace(alleySpans, '<spans hosts="yard-south yard-north" cables="0" clotheslines="0" signs="1"/>'));
  assert.deepEqual(signs.diagnostics, []);
  assert.deepEqual([...new Set(spans(signs).map((triangle) => triangle.family))].sort(), ["fittings", "signs"]);
  assert.deepEqual([...new Set(spans(signs).map((triangle) => triangle.host))].sort(), ["yard-north", "yard-south"]);
  // The fixture's yard walls face one another at y = 0.11 and y = 5.89 between x = -8 and x = -1.
  for (const [x, y, z] of vertices(signs, "signs")) {
    assert.ok(x > -8 && x < -1 && y > 0.11 && y < 5.89, `Sign vertex ${x}, ${y} leaves the yard.`);
    assert.ok(z >= 2.6 - 0.03 && z < 4.2, `Sign vertex z=${z} breaks the clearance or the wall top.`);
  }

  const nothing = await build(alley.replace(alleySpans, '<spans cables="0" clotheslines="0" signs="0"/>'));
  assert.deepEqual(nothing.diagnostics, []);
  assert.equal(spans(nothing).length, 0);
});

test("spans repeat for one seed, change with another, and thicken with the cable amount", async () => {
  const first = await build(yard());
  const again = await build(yard());
  assert.deepEqual(again.mesh, first.mesh);
  assert.equal(again.renderHash, first.renderHash);
  const reseeded = await build(yard({ seed: "another-yard" }));
  assert.notDeepEqual(vertices(reseeded, "cables"), vertices(first, "cables"));
  const sparse = await build(yard({ spans: '<spans cables="0.25" clotheslines="0" signs="0"/>' }));
  assert.ok(spans(sparse, "cables").length > 0);
  assert.ok(spans(sparse, "cables").length < spans(first, "cables").length / 2);
});

test("span recipes round-trip, apply documented defaults, and reject invalid authoring", async () => {
  const defaults = parseAml(yard({ spans: "<spans/>" }));
  assert.deepEqual(
    defaults.dressing!.spans!.map(({ source: _source, ...rule }) => rule),
    [{ hosts: undefined, cables: 0.6, clotheslines: 0.35, signs: 0.2, clearance: 2.6, reach: 14 }],
  );
  const authored = parseAml(yard({
    spans: '<spans hosts="south north" cables="0.9" clotheslines="0.1" signs="0" clearance="3" reach="8"/><spans cables="0.2"/>',
  }));
  const reparsed = parseAml(serializeAml(authored));
  const withoutSources = (document: typeof authored) =>
    document.dressing!.spans!.map(({ source: _source, ...rule }) => rule);
  assert.deepEqual(withoutSources(reparsed), withoutSources(authored));
  assert.deepEqual(withoutSources(authored)[0], {
    hosts: ["south", "north"], cables: 0.9, clotheslines: 0.1, signs: 0, clearance: 3, reach: 8,
  });
  assert.equal(parseAml(serializeAml(parseAml(yard({ spans: "" })))).dressing!.spans, undefined);

  for (const spans of ['<spans typo="1"/>', '<spans cables="many"/>', "<spans><wall/></spans>"])
    assert.throws(() => parseAml(yard({ spans })), spans);
  for (const [recipe, object] of [
    ['<spans cables="2"/>', undefined],
    ['<spans signs="-0.1"/>', undefined],
    ['<spans clearance="1"/>', undefined],
    ['<spans reach="100"/>', undefined],
    ['<spans hosts="south south"/>', undefined],
    ['<spans hosts="south missing"/>', "missing"],
  ] as const) {
    const level = await build(yard({ spans: recipe }));
    const error = level.diagnostics.find((d) => d.code === "AML_DRESSING");
    assert.ok(error?.source?.line, `${recipe}: located error`);
    assert.equal(error.severity, "error");
    if (object) assert.deepEqual(error.objects, [object]);
    assert.equal(spans(level).length, 0, `${recipe}: nothing is strung from an invalid recipe`);
  }
  // An element that exists but is dressed as a floor cannot carry anchors.
  const floorHost = await build(yard({ rules: '<floor host="floor" material="finish"/>', spans: '<spans hosts="south floor"/>' }));
  const refused = floorHost.diagnostics.find((d) => d.code === "AML_DRESSING");
  assert.ok(refused?.source?.line);
  assert.deepEqual(refused.objects, ["floor"]);
  assert.equal(spans(floorHost).length, 0);
});

test("spans share the dressing triangle budget and the next build recovers", async () => {
  const document = parseAml(yard());
  const before = structuredClone(document);
  const full = await compile(document, { navigation: false });
  const spanTriangles = spans(full).length;
  assert.ok(spanTriangles > 10);
  const limit = full.mesh.indices.length / 3 - Math.floor(spanTriangles / 2);
  const limited = await compile(document, { navigation: false, limits: { triangles: limit } });
  assert.ok(limited.diagnostics.some((d) => /budget/i.test(d.message)));
  assert.ok(limited.mesh.indices.length / 3 <= limit);
  const recovered = await compile(document, { navigation: false });
  assert.deepEqual(recovered.diagnostics, []);
  assert.deepEqual(recovered.mesh, full.mesh);
  assert.deepEqual(document, before);
});

/** True when the segment from `a` to `b` passes through the triangle, edges included. */
function segmentCrosses(a: Point, b: Point, [p, q, r]: Point[]): boolean {
  const minus = (u: Point, v: Point): Point => [u[0] - v[0], u[1] - v[1], u[2] - v[2]];
  const cross = (u: Point, v: Point): Point => [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  const dot = (u: Point, v: Point) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
  const direction = minus(b, a),
    pq = minus(q, p),
    pr = minus(r, p);
  const h = cross(direction, pr),
    determinant = dot(pq, h);
  if (Math.abs(determinant) < 1e-12) return false;
  const s = minus(a, p),
    u = dot(s, h) / determinant;
  const g = cross(s, pq),
    v = dot(direction, g) / determinant;
  if (u < 0 || v < 0 || u + v > 1) return false;
  const along = dot(pr, g) / determinant;
  return along > 0 && along < 1;
}

/**
 * Groups cable triangles into strands: sets of triangles joined through
 * shared corners, to 0.1 mm. Returns each strand's vertices.
 */
function strands(triangles: SpanTriangle[]): Point[][] {
  const parent = new Map<string, string>();
  const find = (key: string): string => {
    let root = key;
    while (parent.get(root) !== root) root = parent.get(root)!;
    parent.set(key, root);
    return root;
  };
  const key = (point: Point) => point.map((value) => Math.round(value * 1e4)).join();
  for (const { points } of triangles) {
    for (const point of points) if (!parent.has(key(point))) parent.set(key(point), key(point));
    parent.set(find(key(points[1])), find(key(points[0])));
    parent.set(find(key(points[2])), find(key(points[0])));
  }
  const groups = new Map<string, Point[]>();
  for (const { points } of triangles)
    for (const point of points) {
      const root = find(key(point));
      groups.set(root, [...(groups.get(root) ?? []), point]);
    }
  return [...groups.values()];
}

test("many cables cross the yard, each sagging below the straight line between its fixings", async () => {
  const level = await build(yard());
  const runs = strands(spans(level, "cables"));
  // Ten meters of facing wall at full density carry well over a handful of lines.
  assert.ok(runs.length >= 10, `Only ${runs.length} strands cross the yard.`);
  for (const run of runs) {
    const ys = run.map((p) => p[1]);
    const south = Math.min(...ys),
      north = Math.max(...ys);
    assert.ok(north - south > 5, "A strand runs from one wall to the other.");
    // The vertices of one cross-section lie within 6 cm along the strand; their mean is its centerline.
    const stations: { y: number; z: number; count: number }[] = [];
    for (const [, y, z] of [...run].sort((a, b) => a[1] - b[1])) {
      const last = stations.at(-1);
      if (last && y - last.y / last.count < 0.06) {
        last.y += y;
        last.z += z;
        last.count++;
      } else stations.push({ y, z, count: 1 });
    }
    const line = stations.map(({ y, z, count }) => ({ y: y / count, z: z / count }));
    const first = line[0],
      last = line.at(-1)!;
    const middle = line.reduce((best, station) => (Math.abs(station.y - (south + north) / 2) < Math.abs(best.y - (south + north) / 2) ? station : best));
    const chord = first.z + ((last.z - first.z) * (middle.y - first.y)) / (last.y - first.y);
    const sag = chord - middle.z;
    // A slack utility line hangs a visible few percent of its span; a taut or drooping one is wrong.
    assert.ok(sag > 0.02 * (north - south) && sag < 0.25 * (north - south), `A strand hangs ${sag} m below its chord over ${north - south} m.`);
  }
});

test("reach bounds how far one span may cross", async () => {
  // The facing walls stand 5.78 m apart.
  const short = await build(yard({ spans: '<spans cables="1" clotheslines="0" signs="0" reach="5"/>' }));
  assert.equal(spans(short).length, 0);
  assert.deepEqual(short.diagnostics.map((d) => d.code), ["DRESSING_NO_SPAN_FIT"]);
  const enough = await build(yard({ spans: '<spans cables="1" clotheslines="0" signs="0" reach="6"/>' }));
  assert.deepEqual(enough.diagnostics, []);
  const runs = strands(spans(enough, "cables"));
  assert.ok(runs.length > 0);
  for (const run of runs) {
    const xs = run.map((p) => p[0]),
      ys = run.map((p) => p[1]);
    const crossed = Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
    // A strand's surface lies within 2 cm of its centerline at each end.
    assert.ok(crossed <= 6 + 0.04, `A strand crosses ${crossed} m in plan.`);
  }
});

test("clearance is measured from the walking surface beneath each span", async () => {
  // A deck 1.5 m high covers the west half of the yard, clear of both walls.
  const deck = `<profile id="deck-plan" points="-1 0.4; 5 0.4; 5 5.6; -1 5.6"/>
    <slab id="deck" profile="deck-plan" thickness="0.3" elevation="1.5"/>`;
  const level = await build(yard({ extra: deck }));
  assert.deepEqual(level.diagnostics, []);
  const cables = vertices(level, "cables");
  const overDeck = cables.filter(([x, y]) => x < 4.9 && y > 0.5 && y < 5.5);
  const overFloor = cables.filter(([x]) => x > 5.1);
  assert.ok(overDeck.length > 0 && overFloor.length > 0, "Cables cross both halves of the yard.");
  for (const [x, y, z] of overDeck) assert.ok(z >= 1.5 + 2.6 - 0.02, `A cable hangs at z=${z} over the deck at ${x}, ${y}.`);
  for (const [, , z] of overFloor) assert.ok(z >= 2.6 - 0.02);
  // The deck is what raised them: beyond it cables still hang lower than any may over it.
  assert.ok(Math.min(...overFloor.map((p) => p[2])) < 1.5 + 2.6 - 0.2);

  // Washing obeys the same rule at whatever clearance is asked for.
  const high = await build(alley.replace(alleySpans, '<spans cables="0" clotheslines="1" signs="0" clearance="4.5"/>'));
  assert.deepEqual(high.diagnostics, []);
  const washing = vertices(high, "washing");
  assert.ok(washing.length > 0);
  for (const [, , z] of washing) assert.ok(z >= 4.5 - 0.01, `Washing hangs at z=${z}.`);
});

test("spans avoid what is only rendered, and fix only to solid wall", async () => {
  // A kiosk without collision stands mid-yard and overtops the walls: only the rendered scene reveals it.
  const kiosk = '<box id="kiosk" position="3 2.25 0" width="4" depth="1.5" height="6" collidable="false"/>';
  const inKiosk = ([x, y]: Point) => x > 3.05 && x < 6.95 && y > 2.3 && y < 3.7;
  const open = vertices(await build(yard()), "cables");
  assert.ok(open.some(inKiosk), "Without the kiosk cables cross where it stands.");
  const obstructed = await build(yard({ extra: kiosk }));
  assert.deepEqual(obstructed.diagnostics, []);
  const cables = vertices(obstructed, "cables");
  assert.ok(cables.length > 0, "Cables still cross beside the kiosk.");
  assert.ok(!cables.some(inKiosk), "A cable passes through the kiosk.");

  // A gateway 5 m wide and 4.4 m high is cut through the north wall between x = 2.5 and x = 7.5.
  const gateway = '<opening id="gateway" host="north" center="5 2.2" width="5" height="4.4"/>';
  const inGateway = ([x, y, z]: Point) => y > 5.5 && x > 2.52 && x < 7.48 && z < 4.38;
  const solid = vertices(await build(yard()), "fittings");
  assert.ok(solid.some(inGateway), "Without the gateway brackets are fixed where it opens.");
  const cut = await build(yard({ extra: gateway }));
  assert.deepEqual(cut.diagnostics, []);
  assert.ok(vertices(cut, "cables").length > 0);
  const fittings = vertices(cut, "fittings");
  assert.ok(fittings.some(([, y]) => y > 5.5), "The remaining north wall still carries brackets.");
  assert.ok(!fittings.some(inGateway), "A bracket is fixed in the open gateway.");
  // Wall fittings stay within 0.15 m of the faces they are fixed to.
  for (const [, y] of fittings) assert.ok(y < SOUTH_FACE + 0.15 + 1e-6 || y > NORTH_FACE - 0.15 - 1e-6, `A fitting stands at y=${y}.`);
});

test("signs and cables cross the alley between two buildings, and a family without a fit is named", async () => {
  const level = await build(alley.replace(alleySpans, '<spans hosts="north-block south-block" cables="0.7" clotheslines="0" signs="1"/>'));
  assert.deepEqual(level.diagnostics, []);
  // The blocks face one another across y = 0..5 between x = 0 and x = 12.
  for (const family of ["signs", "cables"] as const) {
    const parts = spans(level, family);
    assert.ok(parts.length > 0, `No ${family} between the blocks.`);
    for (const host of new Set(parts.map((triangle) => triangle.host))) {
      assert.ok(["north-block", "south-block"].includes(host));
      assert.deepEqual([...level.provenance[`${host}/$dressing/span-${family}`].contributors].sort(), ["north-block", "south-block"]);
    }
  }
  const signs = spans(level, "signs");
  // A sign may be fixed to a set-back body or a service well, which lie at most 2.4 m behind these fronts.
  const placed = signs.flatMap((triangle) => triangle.points);
  for (const [x, y] of placed) assert.ok(x > 0 && x < 12 && y > -2.5 && y < 7.5, `Sign vertex ${x}, ${y} leaves the blocks.`);
  assert.ok(placed.some((p) => p[1] < 2) && placed.some((p) => p[1] > 3), "No sign hangs over the middle of the alley.");
  // A sign across the alley is read from both directions along it.
  const facing = signs.map((triangle) => triangle.normals[0][0]);
  assert.ok(facing.some((x) => x > 0.9) && facing.some((x) => x < -0.9));
  assert.ok(strands(spans(level, "cables")).some((run) => run.some((p) => p[1] < 0.8) && run.some((p) => p[1] > 4.2)), "A cable crosses the alley.");

  // Cables keep clear of what the kit generated, not only of authored geometry: no centerline
  // passes through a building fixture, a sign, or the washing and signs strung before it.
  const strung = await build(alley);
  const generated: Point[][] = [];
  for (let t = 0; t < strung.mesh.surfaces.length; t++) {
    const object = strung.surfaces[strung.mesh.surfaces[t]].object;
    if (!/\/\$dressing\/(fixtures|signage|span-washing|span-signs)$/.test(object)) continue;
    generated.push([...strung.mesh.indices.slice(t * 3, t * 3 + 3)].map((i) => strung.mesh.positions.slice(i * 3, i * 3 + 3) as Point));
  }
  assert.ok(generated.length > 1000);
  let segments = 0;
  for (const run of strands(spans(strung, "cables"))) {
    // A strand's cross-sections are ordered along the horizontal axis it mostly follows.
    const extent = [0, 1].map((axis) => Math.max(...run.map((p) => p[axis])) - Math.min(...run.map((p) => p[axis])));
    const axis = extent[0] > extent[1] ? 0 : 1;
    const centers: { sum: Point; count: number; at: number }[] = [];
    for (const point of [...run].sort((a, b) => a[axis] - b[axis])) {
      const last = centers.at(-1);
      if (last && point[axis] - last.at < 0.06) {
        last.sum = last.sum.map((v, k) => v + point[k]) as Point;
        last.count++;
      } else centers.push({ sum: point, count: 1, at: point[axis] });
    }
    const line = centers.map(({ sum, count }) => sum.map((v) => v / count) as Point);
    for (let i = 0; i + 1 < line.length; i++) {
      segments++;
      const [a, b] = [line[i], line[i + 1]];
      const lo = a.map((v, k) => Math.min(v, b[k])),
        hi = a.map((v, k) => Math.max(v, b[k]));
      for (const triangle of generated) {
        if ([0, 1, 2].some((k) => Math.max(...triangle.map((p) => p[k])) < lo[k] || Math.min(...triangle.map((p) => p[k])) > hi[k])) continue;
        assert.ok(!segmentCrosses(a, b, triangle), `A cable passes through generated geometry between ${a} and ${b}.`);
      }
    }
  }
  assert.ok(segments > 100, "Too few cable segments were checked.");

  // Bare walls have no windows to string washing from.
  const bare = await build(yard({ spans: '<spans cables="0" clotheslines="1" signs="0"/>' }));
  assert.equal(spans(bare).length, 0);
  assert.equal(bare.diagnostics.length, 1);
  assert.equal(bare.diagnostics[0].code, "DRESSING_NO_SPAN_FIT");
  assert.match(bare.diagnostics[0].message, /clothesline/);
});

/**
 * Returns the centerline of one strand or conduit: the mean of each
 * cross-section's vertices, ordered along the axis the part mostly follows.
 * Vertices of one cross-section lie within 6 cm of each other along that axis.
 */
function centerline(run: Point[]): Point[] {
  const extent = [0, 1, 2].map((axis) => Math.max(...run.map((p) => p[axis])) - Math.min(...run.map((p) => p[axis])));
  const axis = extent.indexOf(Math.max(...extent));
  const sections: { sum: Point; count: number; at: number }[] = [];
  for (const point of [...run].sort((a, b) => a[axis] - b[axis])) {
    const last = sections.at(-1);
    if (last && point[axis] - last.at < 0.06) {
      last.sum = last.sum.map((v, k) => v + point[k]) as Point;
      last.count++;
    } else sections.push({ sum: point, count: 1, at: point[axis] });
  }
  return sections.map(({ sum, count }) => sum.map((v) => v / count) as Point);
}

/** True when any piece of the polyline passes through one of the triangles. */
function lineCrosses(line: Point[], triangles: Point[][]): boolean {
  for (let i = 0; i + 1 < line.length; i++) {
    const [a, b] = [line[i], line[i + 1]];
    const lo = a.map((v, k) => Math.min(v, b[k])),
      hi = a.map((v, k) => Math.max(v, b[k]));
    for (const triangle of triangles) {
      if ([0, 1, 2].some((k) => Math.max(...triangle.map((p) => p[k])) < lo[k] || Math.min(...triangle.map((p) => p[k])) > hi[k])) continue;
      if (segmentCrosses(a, b, triangle)) return true;
    }
  }
  return false;
}

/** Lists the world triangles of every object whose ID matches `pattern`. */
function trianglesOf(level: Level, pattern: RegExp): Point[][] {
  const found: Point[][] = [];
  for (let t = 0; t < level.mesh.surfaces.length; t++) {
    if (!pattern.test(level.surfaces[level.mesh.surfaces[t]].object)) continue;
    found.push([...level.mesh.indices.slice(t * 3, t * 3 + 3)].map((i) => level.mesh.positions.slice(i * 3, i * 3 + 3) as Point));
  }
  return found;
}

test("clearance holds over a walkway narrower than a cable's pieces", async () => {
  // A footbridge 0.3 m wide and 1.5 m high runs the length of the yard midway between the walls.
  const bridge = `<profile id="bridge-plan" points="-1 2.85; 11 2.85; 11 3.15; -1 3.15"/>
    <slab id="bridge" profile="bridge-plan" thickness="0.1" elevation="1.5"/>`;
  const level = await build(yard({ extra: bridge }));
  assert.deepEqual(level.diagnostics, []);
  const runs = strands(spans(level, "cables"));
  assert.ok(runs.length > 0, "Cables still cross above the footbridge.");
  for (const run of runs) {
    const line = centerline(run);
    for (let i = 0; i + 1 < line.length; i++) {
      const [a, b] = [line[i], line[i + 1]];
      // Where a piece passes over the bridge, its lowest point there is at one of the bridge's edges.
      for (const y of [2.85, 3.15]) {
        if ((a[1] - y) * (b[1] - y) > 0) continue;
        const z = a[2] + ((b[2] - a[2]) * (y - a[1])) / (b[1] - a[1]);
        assert.ok(z >= 1.5 + 2.6 - 0.03, `A cable hangs at z=${z} over the footbridge.`);
      }
    }
  }
});

test("a second span recipe adds to the first's parts and avoids what it strung", async () => {
  const signsOnly = '<spans cables="0" clotheslines="0" signs="1"/>';
  const two = await build(yard({ spans: `<spans cables="1" clotheslines="0" signs="0"/>${signsOnly}` }));
  const ids = two.surfaces.map((surface) => surface.id);
  assert.equal(new Set(ids).size, ids.length, "Two recipes registered one surface twice.");
  const cables = strands(spans(two, "cables")).map(centerline);
  assert.ok(cables.length > 0);
  // Hung blind, the sign recipe puts its boards through the cables of the first recipe.
  const blind = trianglesOf(await build(yard({ spans: `<spans cables="0" clotheslines="0" signs="0"/>${signsOnly}` })), /\/\$dressing\/span-signs$/);
  assert.ok(blind.length > 0 && cables.some((line) => lineCrosses(line, blind)), "The control sign does not meet the cables.");
  // Hung second, it keeps clear of them, or reports that it found no place.
  const signs = trianglesOf(two, /\/\$dressing\/span-signs$/);
  for (const line of cables) assert.ok(!lineCrosses(line, signs), "A sign of the second recipe hangs through a cable of the first.");
  if (signs.length) assert.deepEqual(two.diagnostics, []);
  else assert.deepEqual(two.diagnostics.map((d) => d.code), ["DRESSING_NO_SPAN_FIT"]);
});

test("a conduit drops only where nothing rendered lies across its run", async () => {
  const level = await build(alley.replace('detail="medium"', 'detail="high"').replace(alleySpans, '<spans cables="1" clotheslines="0" signs="0"/>'));
  assert.deepEqual(level.diagnostics, []);
  // Among the fittings, a conduit is the one upright part much taller than it is wide.
  const conduits = strands(spans(level, "fittings")).filter((part) => {
    const extent = [0, 1, 2].map((axis) => Math.max(...part.map((p) => p[axis])) - Math.min(...part.map((p) => p[axis])));
    return extent[2] > 0.7 && extent[0] < 0.05 && extent[1] < 0.05;
  });
  assert.ok(conduits.length >= 5, `Only ${conduits.length} conduits drop from the racks.`);
  const others = trianglesOf(level, /^(?!.*\/\$dressing\/span-)/);
  for (const conduit of conduits) assert.ok(!lineCrosses(centerline(conduit), others), `A conduit passes through another part near ${conduit[0]}.`);
});
