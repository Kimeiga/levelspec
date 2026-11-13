import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { validateBytes } from "gltf-validator";
import { compile, parseAml, collisionMesh, toGLB, resolveExportAssets } from "levelspec";

type Level = Awaited<ReturnType<typeof compile>>;
type Point = [number, number, number];
type Point2 = [number, number];

interface WallOptions {
  seed?: string;
  detail?: "low" | "medium" | "high";
  grime?: number;
  wear?: number;
  face?: "front" | "back" | "side" | "top";
  path?: string;
  height?: number;
  placement?: string;
  extra?: string;
  rule?: string;
  walking?: boolean;
  texture?: string;
  repeat?: number;
}

/** Builds an isolated 14 m wall; all fixture dimensions and exclusions are in meters. */
function source(options: WallOptions = {}) {
  return `<architecture version="1" id="plain-wall-test" validation="${options.walking ? "playable" : "premap"}">
    <material id="finish" color="#bcb6a0" repeat="${options.repeat ?? 0.5}" ${options.texture ? `texture="${options.texture}"` : ""}/>
    <material id="assigned" color="#467a82"/>
    <path id="axis" points="${options.path ?? "0 0 0; 14 0 0"}"/>
    <wall id="wall" path="axis" thickness="0.2" height="${options.height ?? 3.6}" ${options.placement ?? ""}/>
    ${options.walking ? `<profile id="floor-plan" points="0 0; 14 0; 14 5; 0 5"/>
      <slab id="floor" profile="floor-plan" thickness="0.2"/>
      <marker id="start" kind="spawn" element="floor" position="2 2 0"/>
      <marker id="goal" kind="objective" element="floor" position="12 2 0"/>
      <route id="along-wall" from="start" to="goal" min-routes="1"/>` : ""}
    ${options.extra ?? ""}
    <dressing seed="${options.seed ?? "plain-wall"}" detail="${options.detail ?? "high"}" grime="${options.grime ?? 0.7}" wear="${options.wear ?? 0.4}">
      <wall host="wall" material="finish" face="${options.face ?? "back"}" windows="false" ${options.rule ?? ""}/>
    </dressing>
  </architecture>`;
}

/** Compiles a wall through the supported API, allowing diagnostics to fail at the fixture. */
async function build(options: WallOptions = {}) {
  const level = await compile(parseAml(source(options)), {
    navigation: options.walking ?? false,
  });
  assert.deepEqual(level.diagnostics, [], JSON.stringify(options));
  return level;
}

interface PropTriangle {
  points: Point[];
  normals: Point[];
  uv: number[];
  colors: number[];
  surface: Level["surfaces"][number];
}

/** Collects generated visual geometry by its source ancestry, independent of part names. */
function props(level: Level): PropTriangle[] {
  const result: PropTriangle[] = [];
  for (let t = 0; t < level.mesh.surfaces.length; t++) {
    const surface = level.surfaces[level.mesh.surfaces[t]];
    if (surface.kind !== "prop" || level.provenance[surface.object]?.host !== "wall") continue;
    const indices = level.mesh.indices.slice(t * 3, t * 3 + 3);
    result.push({
      points: indices.map(i => level.mesh.positions.slice(i * 3, i * 3 + 3) as Point),
      normals: indices.map(i => level.mesh.normals.slice(i * 3, i * 3 + 3) as Point),
      uv: indices.flatMap(i => level.mesh.uv.slice(i * 2, i * 2 + 2)),
      colors: indices.flatMap(i => level.mesh.colors!.slice(i * 3, i * 3 + 3)),
      surface,
    });
  }
  return result;
}

/** Reads the selected base wall, excluding all decorations and unselected faces. */
function receivingFinish(level: Level) {
  const materialIds = new Set<string>();
  const colors: number[] = [];
  const points: Point[] = [];
  const uv: number[][] = [];
  for (let t = 0; t < level.mesh.surfaces.length; t++) {
    const surface = level.surfaces[level.mesh.surfaces[t]];
    if (surface.object !== "wall") continue;
    const indices = level.mesh.indices.slice(t * 3, t * 3 + 3);
    if (!indices.every(i => Math.abs(level.mesh.positions[i * 3 + 1] - 0.1) < 1e-6)) continue;
    materialIds.add(surface.material);
    for (const i of indices) {
      points.push(level.mesh.positions.slice(i * 3, i * 3 + 3) as Point);
      colors.push(...level.mesh.colors!.slice(i * 3, i * 3 + 3));
      uv.push(level.mesh.uv.slice(i * 2, i * 2 + 2));
    }
  }
  assert.ok(points.length > 0, "The authored back wall remains visible receiving geometry.");
  const materials = [...materialIds].map(id => {
    const material = level.document.materials.find(entry => entry.id === id);
    assert.ok(material, `Receiving material ${id} exists.`);
    return material;
  });
  return { materials, colors, points, uv };
}

/** Reads the exported scene's JSON chunk without depending on generated node names. */
function exportedScene(bytes: Uint8Array) {
  const buffer = Buffer.from(bytes);
  return JSON.parse(buffer.toString("utf8", 20, 20 + buffer.readUInt32LE(12)));
}

/** Checks the output's winding, complete attributes, material references, and physical separation. */
function validProps(level: Level) {
  const triangles = props(level);
  assert.ok(triangles.length > 0, "A plain wall must generate visible detail.");
  const materials = new Set(level.document.materials.map(material => material.id));
  for (const triangle of triangles) {
    const { points: [a, b, c], normals, surface } = triangle;
    const ab = b.map((v, i) => v - a[i]);
    const ac = c.map((v, i) => v - a[i]);
    const cross = [
      ab[1] * ac[2] - ab[2] * ac[1],
      ab[2] * ac[0] - ab[0] * ac[2],
      ab[0] * ac[1] - ab[1] * ac[0],
    ];
    assert.ok(Math.hypot(...cross) > 1e-12, `${surface.object}: nondegenerate triangle`);
    assert.ok(cross.reduce((sum, v, i) => sum + v * normals[0][i], 0) > 0,
      `${surface.object}: winding agrees with normals`);
    assert.equal(triangle.uv.length, 6);
    assert.equal(triangle.colors.length, 9);
    assert.ok([...triangle.points.flat(), ...normals.flat(), ...triangle.uv,
      ...triangle.colors].every(Number.isFinite));
    assert.equal(surface.collidable, false);
    assert.equal(surface.domain, "visualization");
    assert.ok(materials.has(surface.material), surface.material);
    const ancestry = level.provenance[surface.object];
    assert.equal(ancestry.sourceId, "wall");
    assert.ok(ancestry.source, `${surface.object}: source location retained`);
  }
  return triangles;
}

/**
 * Separating-axis overlap of a projected triangle and an open rectangle.
 * This independently detects panels or tubes bridging a hole with vertices outside it.
 * A 1 μm tolerance admits native Float32 boundary rounding for flush tile fragments.
 */
function overlapsRectangle(points: Point[], rect: [number, number, number, number]) {
  const triangle: Point2[] = points.map(p => [p[0], p[2]]);
  const [a, b, c] = triangle;
  const area = Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]));
  if (area < 1e-10) return false;
  const [left, bottom, right, top] = rect;
  const corners: Point2[] = [[left, bottom], [right, bottom], [right, top], [left, top]];
  const axes: Point2[] = [[1, 0], [0, 1]];
  for (let i = 0; i < 3; i++) {
    const p = triangle[i], q = triangle[(i + 1) % 3];
    const length = Math.hypot(q[0] - p[0], q[1] - p[1]);
    if (length > 1e-10) axes.push([(p[1] - q[1]) / length, (q[0] - p[0]) / length]);
  }
  return axes.every(axis => {
    const t = triangle.map(p => p[0] * axis[0] + p[1] * axis[1]);
    const r = corners.map(p => p[0] * axis[0] + p[1] * axis[1]);
    return Math.min(Math.max(...t), Math.max(...r)) - Math.max(Math.min(...t), Math.min(...r)) > 1e-6;
  });
}

/** Checks a known untransformed wall's selected side and the 0.14 m outward projection limit. */
function onStraightWall(triangles: PropTriangle[], face: "front" | "back", inverse = (point: Point) => point) {
  const sign = face === "back" ? 1 : -1;
  for (const triangle of triangles)
    for (const point of triangle.points) {
      const [x, y, z] = inverse(point);
      assert.ok(x >= -1e-6 && x <= 14 + 1e-6, `${triangle.surface.object}: x=${x}`);
      assert.ok(z >= -1e-6 && z <= 3.6 + 1e-6, `${triangle.surface.object}: z=${z}`);
      const projection = sign * y - 0.1;
      assert.ok(projection >= -1e-6 && projection <= 0.14 + 1e-6,
        `${triangle.surface.object}: outward projection=${projection}`);
    }
}

test("plain wall decoration is repeatable and preserves source, collision, navigation, and routes", async () => {
  const document = parseAml(source({ walking: true }));
  const before = structuredClone(document);
  const bare = structuredClone(document);
  delete bare.dressing;
  const plain = await compile(bare);
  const dressed = await compile(document);
  const repeated = await compile(document);
  assert.deepEqual(dressed.diagnostics, []);
  validProps(dressed);
  assert.deepEqual(document, before);
  assert.equal(dressed.physicalHash, plain.physicalHash);
  assert.deepEqual(collisionMesh(dressed, true), collisionMesh(plain, true));
  assert.deepEqual(dressed.navigation, plain.navigation);
  assert.ok(dressed.navigation, "The fixture must actually exercise navigation.");
  assert.deepEqual(dressed.mesh, repeated.mesh);
  assert.deepEqual(toGLB(dressed), toGLB(repeated));
  assert.equal((await validateBytes(toGLB(dressed))).issues.numErrors, 0);
  assert.deepEqual(props(plain), []);
  const reseeded = await build({ seed: "different-wall", walking: true });
  assert.notDeepEqual(props(reseeded).map(t => t.points), props(dressed).map(t => t.points),
    "Reseeding must vary generated geometry, not just host weathering.");
});

test("whole wall detail footprints clear doors, narrow openings, and authored face assignments", async () => {
  const extra = `<opening id="door" host="wall" width="1.4" height="2.1" center="4 1.05"/>
    <opening id="slit" host="wall" width="0.13" height="2.8" center="8.37 1.4"/>
    <profile id="paint-region" points="10 0.4; 12 0.4; 12 2.7; 10 2.7"/>
    <face-material id="paint" host="wall" face="back" projection="xz" profile="paint-region" material="assigned"/>`;
  const excluded: [number, number, number, number][] = [
    [3.3, 0, 4.7, 2.1], [8.305, 0, 8.435, 2.8], [10, 0.4, 12, 2.7],
  ];
  for (const seed of ["plain-wall", "utility-wall", "paper-wall"]) {
    const level = await build({ seed, extra });
    const triangles = validProps(level);
    onStraightWall(triangles, "back");
    assert.ok(triangles.some(t => t.points.every(p => p[0] < 3.3)), "Eligible wall left of doorway receives detail.");
    assert.ok(triangles.some(t => t.points.every(p => p[0] > 4.7)), "Eligible wall right of doorway receives detail.");
    for (const triangle of triangles)
      for (const rect of excluded)
        assert.equal(overlapsRectangle(triangle.points, rect), false,
          `${seed}: ${triangle.surface.object} crosses excluded region ${rect}: ${JSON.stringify(triangle.points)}`);
  }
});

test("front/back dressing remains attached and correctly wound through yaw, translation, and reflection", async () => {
  const angle = 35 * Math.PI / 180;
  for (const face of ["front", "back"] as const)
    for (const reflected of [false, true]) {
      const level = await build({ face,
        placement: `position="4 -3 2" rotation="0 0 35" scale="${reflected ? -1 : 1} 1 1"`,
      });
      const triangles = validProps(level);
      onStraightWall(triangles, face, ([x, y, z]) => {
        const dx = x - 4, dy = y + 3;
        return [
          (dx * Math.cos(angle) + dy * Math.sin(angle)) * (reflected ? -1 : 1),
          -dx * Math.sin(angle) + dy * Math.cos(angle),
          z - 2,
        ];
      });
    }
});

test("side dressing handles both legs of a bent wall without bridging its corner", async () => {
  const level = await build({ path: "0 0 0; 8 0 0; 8 6 0", face: "side" });
  const triangles = validProps(level);
  const planes = [
    { axis: 1, coordinate: -0.1, sign: -1, span: [0, 8.1] },
    { axis: 1, coordinate: 0.1, sign: 1, span: [0, 7.9] },
    { axis: 0, coordinate: 8.1, sign: 1, span: [-0.1, 6] },
    { axis: 0, coordinate: 7.9, sign: -1, span: [0.1, 6] },
    { axis: 0, coordinate: 0, sign: -1, span: [-0.1, 0.1] },
    { axis: 1, coordinate: 6, sign: 1, span: [7.9, 8.1] },
  ];
  const used = new Set<number>();
  for (const triangle of triangles) {
    const plane = planes.findIndex(({ axis, coordinate, sign, span }) =>
      triangle.points.every(p => {
        const outward = (p[axis] - coordinate) * sign;
        return outward >= -1e-6 && outward <= 0.140001 &&
          p[1 - axis] >= span[0] - 1e-6 && p[1 - axis] <= span[1] + 1e-6 &&
          p[2] >= -1e-6 && p[2] <= 3.600001;
      }));
    assert.ok(plane >= 0, `${triangle.surface.object}: outside every eligible wall facet`);
    used.add(plane);
  }
  assert.ok(used.has(0) || used.has(1), "The first wall leg receives decoration.");
  assert.ok(used.has(2) || used.has(3), "The second wall leg receives decoration.");
});

test("per-wall weathering overrides global amounts", async () => {
  const clean = await build({ grime: 0, wear: 0 });
  const override = await build({ grime: 0.9, wear: 0.9, rule: 'grime="0" wear="0"' });
  assert.deepEqual(override.mesh, clean.mesh, "Rule weathering values override global amounts.");
});

test("wall material repeat changes composed maps while preserving source geometry and portable export", async () => {
  const texture = "wall-grain.png";
  const png = await readFile(new URL("./fixtures/aml/terrain-course/hill.png", import.meta.url));
  const variants: Level[] = [];
  for (const repeat of [.35, .7]) {
    const document = parseAml(source({ texture, repeat, path: "0 0 0; 3 0 0" })), before = structuredClone(document);
    const level = await compile(document, { navigation: false, resolveMaterialImage: async reference => {
      assert.equal(reference, texture); return png;
    } });
    assert.deepEqual(level.diagnostics, []);
    assert.deepEqual(document, before);
    const finish = receivingFinish(level);
    assert.ok(finish.materials.every(material => material.texture && level.generatedImages?.[material.texture]));
    assert.ok(finish.uv.flat().every(value => Number.isFinite(value) && value >= 0 && value <= 1));
    assert.ok(finish.colors.every(value => value === 1), "Composed pigment is applied exactly once");
    assert.equal(level.document.materials.find(material => material.id === "finish")!.repeat, repeat);
    variants.push(level);
  }
  assert.deepEqual(receivingFinish(variants[0]).points, receivingFinish(variants[1]).points);
  assert.notDeepEqual(variants[0].surfaceAppearance!.generatedHashes, variants[1].surfaceAppearance!.generatedHashes);
  const assets = await resolveExportAssets(variants[0], async reference => { assert.equal(reference, texture); return png; });
  const bytes = toGLB(variants[0], { assets });
  assert.equal((await validateBytes(bytes)).issues.numErrors, 0);
  assert.ok(exportedScene(bytes).images.length > 0);
});

test("weathering leaves established three-dimensional utilities in place and long walls batch draw objects", async () => {
  const clean = await build({ grime: 0, wear: 0 });
  const dirty = await build({ grime: 1, wear: 1 });
  const solidPoints = (level: Level) => props(level).filter(triangle => triangle.surface.closed).map(triangle => triangle.points);
  const established = solidPoints(clean);
  assert.ok(established.length > 0, "The fixture contains physical-looking utility assemblies.");
  assert.deepEqual(solidPoints(dirty), established,
    "Weather settings change finishes, not pipe, cable, duct, or shutter placement.");

  const long = await build({ path: "0 0 0; 40 0 0" });
  const triangles = validProps(long);
  assert.ok(triangles.some(triangle => triangle.points.every(point => point[0] > 30)),
    "The batching fixture generates detail along the full wall.");
  const scene = exportedScene(toGLB(long));
  const draws = scene.meshes.reduce((sum: number, mesh: { primitives: unknown[] }) => sum + mesh.primitives.length, 0);
  assert.ok(draws <= 96, `A 40 m plain wall must batch families and materials instead of exporting each stroke or tile as a draw object: ${draws}`);
});

test("hidden and fully assigned hosts receive no detail; narrow hosts never acquire oversized parts", async () => {
  const cases: WallOptions[] = [
    { placement: 'visible="false"' },
    { extra: '<face-material id="paint" host="wall" face="back" material="assigned"/>' },
    { face: "top" },
  ];
  for (const options of cases) assert.deepEqual(props(await build(options)), []);
  const narrow = await build({ path: "0 0 0; 0.22 0 0", height: 0.3 });
  for (const triangle of props(narrow))
    for (const [x, y, z] of triangle.points) {
      assert.ok(x >= -1e-6 && x <= 0.220001);
      assert.ok(y >= 0.099999 && y <= 0.240001);
      assert.ok(z >= -1e-6 && z <= 0.300001);
    }
});

test("wall prop generation shares the triangle budget and recovers after failure and cancellation", async () => {
  const document = parseAml(source());
  const before = structuredClone(document);
  const full = await compile(document, { navigation: false });
  validProps(full);
  const limit = full.mesh.indices.length / 3 - 1;
  const limited = await compile(document, { navigation: false, limits: { triangles: limit } });
  assert.ok(limited.diagnostics.some(d => /budget/i.test(d.message)));
  assert.ok(limited.mesh.indices.length / 3 <= limit);
  assert.ok(props(limited).length > 0, "The budget fixture must reach generated props before exhausting its budget.");
  const controller = new AbortController();
  await assert.rejects(compile(document, {
    navigation: false, signal: controller.signal,
    onProgress: stage => { if (stage === "Resolving face materials") controller.abort(); },
  }), { name: "AbortError" });
  const recovered = await compile(document, { navigation: false });
  assert.deepEqual(recovered.diagnostics, []);
  assert.deepEqual(recovered.mesh, full.mesh);
  assert.deepEqual(document, before);
});
