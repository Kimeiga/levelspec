import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { compile, parseAml, serializeAml, collisionMesh, resolveExportAssets, toGLB } from "levelspec";
import { validateBytes } from "gltf-validator";

type Level = Awaited<ReturnType<typeof compile>>;
type Point = [number, number, number];
type Surface = Level["surfaces"][number];

interface FixtureOptions {
  path?: string;
  placement?: string;
  face?: "back" | "side";
  seed?: string;
  tileShare?: number;
  tileGrime?: number;
  tilePlasterColor?: string;
  extra?: string;
}

const imageSnapshots = new Map<string, Promise<Uint8Array>>();

/** Shares the fixture's declared source bytes between appearance compilation and GLB packaging. */
function fixtureImage(reference: string): Promise<Uint8Array> {
  assert.ok(["plaster.png", "wall-concrete-rough.png"].includes(reference));
  let snapshot = imageSnapshots.get(reference);
  if (!snapshot) {
    snapshot = readFile(new URL(`../projects/dressing-demo/textures/${reference}`, import.meta.url));
    imageSnapshots.set(reference, snapshot);
  }
  return snapshot;
}

/** Two genuinely different declared textures retain distinct authored PBR and scale settings. */
function source(options: FixtureOptions = {}) {
  return `<architecture version="1" id="wall-finishes" validation="premap">
    <material id="plaster" color="#efeee6" texture="plaster.png" repeat="0.35" roughness="0.91" metalness="0"/>
    <material id="concrete" color="#d8d9d4" texture="wall-concrete-rough.png" repeat="0.6" roughness="0.98" metalness="0.02"/>
    <material id="tile-finish-wall-ceramic" color="#ded7c6" roughness="0.78"/>
    <material id="tile-finish-wall-edge" color="#978b72" roughness="0.99"/>
    <path id="axis" points="${options.path ?? "0 0 0; 14 0 0"}"/>
    <wall id="wall" path="axis" thickness="0.2" height="3.6" material="plaster" ${options.placement ?? ""}/>
    ${options.extra ?? ""}
    <dressing finishes="tile-finish" seed="${options.seed ?? "finish-contract"}" detail="high" grime="0.7" wear="0.8" wall-materials="plaster concrete">
      <wall host="wall" material="plaster" face="${options.face ?? "back"}" windows="false" tile-share="${options.tileShare ?? 0}"
        ${options.tileGrime === undefined ? "" : `tile-grime="${options.tileGrime}"`}
        ${options.tilePlasterColor === undefined ? "" : `tile-plaster-color="${options.tilePlasterColor}"`}/>
    </dressing>
  </architecture>`;
}

/** Compiles the fixture through the public boundary and rejects unrelated geometry failures. */
async function build(options: FixtureOptions = {}) {
  const level = await compile(parseAml(source(options)), { navigation: false, resolveMaterialImage: fixtureImage });
  assert.deepEqual(level.diagnostics, []);
  return level;
}

interface Triangle {
  points: Point[];
  normal: Point;
  surface: Surface;
  uv: number[][];
}

/** Reads mesh triangles by public surface semantics rather than private generated IDs. */
function triangles(level: Level, selected: (surface: Surface) => boolean): Triangle[] {
  const result: Triangle[] = [];
  for (let t = 0; t < level.mesh.surfaces.length; t++) {
    const surface = level.surfaces[level.mesh.surfaces[t]];
    if (!selected(surface)) continue;
    const indices = level.mesh.indices.slice(t * 3, t * 3 + 3);
    result.push({ surface,
      points: indices.map(i => level.mesh.positions.slice(i * 3, i * 3 + 3) as Point),
      normal: level.mesh.normals.slice(indices[0] * 3, indices[0] * 3 + 3) as Point,
      uv: indices.map(i => level.mesh.uv.slice(i * 2, i * 2 + 2)),
    });
  }
  return result;
}

/** Independently measures area projected onto the known untransformed wall's X/Z plane. */
function area(points: Point[]) {
  const [a, b, c] = points;
  return Math.abs((b[0] - a[0]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[0] - a[0])) / 2;
}

/** Reads receiving vertical faces, excluding the wall cap and every generated overlay. */
function baseTriangles(level: Level) {
  return triangles(level, surface => surface.object === "wall")
    .filter(triangle => Math.abs(triangle.normal[2]) < 1e-5);
}

/** Detects doorway intrusion beyond 1 μm, allowing the native mesh's Float32 boundary rounding. */
function crossesDoor(points: Point[]) {
  const projected = points.map(point => [point[0], point[2]]);
  if (area(points) < 1e-10) return false;
  const door = [[5.3, 0], [6.7, 0], [6.7, 2.1], [5.3, 2.1]];
  const axes = [[1, 0], [0, 1]];
  for (let i = 0; i < 3; i++) {
    const a = projected[i], b = projected[(i + 1) % 3];
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (length > 1e-10) axes.push([(a[1] - b[1]) / length, (b[0] - a[0]) / length]);
  }
  return axes.every(axis => {
    const a = projected.map(point => point[0] * axis[0] + point[1] * axis[1]);
    const b = door.map(point => point[0] * axis[0] + point[1] * axis[1]);
    return Math.min(Math.max(...a), Math.max(...b)) - Math.max(Math.min(...a), Math.min(...b)) > 1e-6;
  });
}

/** Front-facing divider texel density follows world meters and the declared material repeat. */
function metricDividerUVs(level: Level) {
  const fronts = triangles(level, surface => surface.role === "wall-divider")
    .filter(triangle => triangle.normal[1] > 0.99);
  assert.ok(fronts.length > 0, "The fixture contains a visible divider front.");
  for (const triangle of fronts) {
    const repeat = level.document.materials.find(material => material.id === triangle.surface.material)!.repeat;
    for (let i = 1; i < 3; i++)
      for (const [coordinate, uvAxis] of [[0, 0], [2, 1]]) {
        const meters = Math.abs(triangle.points[i][coordinate] - triangle.points[0][coordinate]);
        const span = Math.abs(triangle.uv[i][uvAxis] - triangle.uv[0][uvAxis]);
        assert.ok(Math.abs(span - meters * repeat) < 2e-6,
          `Divider texture span ${span} must represent ${meters} m at repeat ${repeat}.`);
      }
  }
}

test("wall material palettes round-trip, preserve declared material properties and reject invalid references", async () => {
  const document = parseAml(source());
  const before = structuredClone(document);
  const roundtrip = parseAml(serializeAml(document));
  assert.deepEqual(roundtrip.dressing!.wallMaterials, ["plaster", "concrete"]);
  assert.equal(roundtrip.dressing!.rules[0].tileShare, 0);
  for (const tilePlasterColor of [undefined, "#8a9BAc"]) {
    const parsed = parseAml(source({ tilePlasterColor }));
    assert.equal(parsed.dressing!.rules[0].tilePlasterColor, tilePlasterColor);
    assert.equal(parseAml(serializeAml(parsed)).dressing!.rules[0].tilePlasterColor, tilePlasterColor);
  }
  for (const tileGrime of [undefined, 0, 1]) {
    const parsed = parseAml(source({ tileGrime }));
    assert.equal(parsed.dressing!.rules[0].tileGrime, tileGrime);
    assert.equal(parseAml(serializeAml(parsed)).dressing!.rules[0].tileGrime, tileGrime,
      "Serialization must distinguish explicit clean tiles from inherited grime.");
  }
  const level = await compile(document, { navigation: false, resolveMaterialImage: fixtureImage });
  assert.deepEqual(level.diagnostics, []);
  assert.deepEqual(document, before);
  for (const generated of level.document.materials.filter(material => material.id.startsWith("$kowloon/wall-finish/"))) {
    const authored = document.materials.find(material => material.texture === generated.texture);
    assert.ok(authored);
    for (const property of ["texture", "color", "repeat", "roughness", "metalness"] as const)
      assert.equal(generated[property], authored[property], `Palette source ${property} is preserved.`);
  }
  const receiving = baseTriangles(level).filter(face => face.normal[1] > 0.99);
  assert.ok(receiving.length > 0);
  for (const face of receiving) {
    const material = level.document.materials.find(material => material.id === face.surface.material)!;
    assert.ok(material.texture && level.generatedImages?.[material.texture], "Receiving faces bind composed palette maps");
  }
  const assets = await resolveExportAssets(level, fixtureImage);
  const bytes = toGLB(level, { assets });
  assert.equal((await validateBytes(bytes)).issues.numErrors, 0);
  for (const input of [
    source().replace('wall-materials="plaster concrete"', 'wall-materials="plaster missing"'),
    source().replace('wall-materials="plaster concrete"', 'wall-materials="plaster plaster"'),
    source({ tileShare: -0.01 }), source({ tileShare: 1.01 }),
  ]) {
    const invalid = await compile(parseAml(input), { navigation: false });
    assert.ok(invalid.diagnostics.some(diagnostic => diagnostic.severity === "error" && diagnostic.source && diagnostic.objects.length),
      "Invalid palette references and normalized shares need source-linked errors.");
  }
  for (const tileGrime of [-0.01, 1.01, NaN, Infinity]) {
    const invalidDocument = parseAml(source({ tileGrime: Number.isFinite(tileGrime) ? tileGrime : undefined }));
    invalidDocument.dressing!.rules[0].tileGrime = tileGrime;
    const invalid = await compile(invalidDocument, { navigation: false });
    assert.ok(invalid.diagnostics.some(diagnostic => diagnostic.severity === "error" && /Tile-grime/.test(diagnostic.message)
      && diagnostic.source && diagnostic.objects.length));
  }
  for (const tilePlasterColor of ["", "gray", "#abc", "#aabbccdd"]) {
    const invalid = await compile(parseAml(source({ tilePlasterColor })), { navigation: false });
    assert.ok(invalid.diagnostics.some(diagnostic => diagnostic.severity === "error"
      && /Tile-plaster-color/.test(diagnostic.message) && diagnostic.source && diagnostic.objects.length));
  }
  const windowed = parseAml(source({ tilePlasterColor: "#8a9BAc" }));
  windowed.dressing!.rules[0].windows = true;
  const wrongHost = await compile(windowed, { navigation: false });
  assert.ok(wrongHost.diagnostics.some(diagnostic => diagnostic.severity === "error" && /plain wall/.test(diagnostic.message)
    && diagnostic.source && diagnostic.objects.length),
    "Tile-specific controls require a plain wall or floor, not the window-kit recipe.");
});

test("ceramic appearance preserves receiving geometry, openings and physics", async () => {
  const extra = '<opening id="door" host="wall" width="1.4" height="2.1" center="6 1.05"/>';
  const empty = await build({ tileShare: 0, extra });
  const tiled = await build({ tileShare: 1, extra });
  const tileFaces = baseTriangles(tiled).filter(face => face.normal[1] > .99);
  assert.ok(tileFaces.length > 0);
  assert.deepEqual(tileFaces.map(face => face.points), baseTriangles(empty).filter(face => face.normal[1] > .99).map(face => face.points));
  for (const face of tileFaces) {
    assert.equal(crossesDoor(face.points), false,
      `A ceramic fragment must clear the authored doorway: ${JSON.stringify(face.points)}`);
    for (const [x, y, z] of face.points) {
      assert.ok(x >= -1e-6 && x <= 14.000001);
      assert.ok(y >= 0.099999 && y <= 0.240001);
      assert.ok(z >= -1e-6 && z <= 3.600001);
    }
  }
  assert.equal(tiled.physicalHash, empty.physicalHash);
  assert.deepEqual(collisionMesh(tiled, true), collisionMesh(empty, true));
});

test("any dividers at joined source walls stay contained, clear openings and retain metric UVs", async () => {
  const adjoining = source({ extra: `<path id="annex-axis" points="14 0 0; 20 0 0"/>
    <wall id="annex" path="annex-axis" height="3.6" thickness="0.2" material="concrete"/>` })
    .replace(' wall-materials="plaster concrete"', "")
    .replace("</dressing>", '<wall host="annex" material="concrete" face="back" windows="false" tile-share="0"/></dressing>');
  const level = await compile(parseAml(adjoining), { navigation: false, resolveMaterialImage: fixtureImage });
  assert.deepEqual(level.diagnostics, []);
  const dividers = triangles(level, surface => surface.role === "wall-divider");
  const points = dividers.flatMap(triangle => triangle.points);
  assert.ok(points.every(([x, y, z]) => x >= 13.86 && x <= 14.14 && y >= 0.1 && y <= 0.24 && z >= 0 && z <= 3.6));
  if (dividers.length) metricDividerUVs(level);

  const blocked = adjoining.replace("<dressing", '<opening id="entry" host="annex" width="0.6" height="2.2" center="0.3 1.1" mode="notch"/><dressing');
  const interrupted = await compile(parseAml(blocked), { navigation: false, resolveMaterialImage: fixtureImage });
  assert.deepEqual(interrupted.diagnostics, []);
  assert.deepEqual(triangles(interrupted, surface => surface.role === "wall-divider"), [],
    "The complete joint divider is omitted when its half-footprint would bridge the adjoining opening.");
});

test("structural dividers keep metric texture density and clear the complete shutter frontage", async () => {
  let shutterCount = 0;
  let dividerCount = 0;
  for (const seed of ["finish-contract", "review", "divider-layout"]) {
    const level = await build({ seed, path: "0 0 0; 28 0 0" });
    const dividers = triangles(level, surface => surface.role === "wall-divider");
    if (dividers.length) metricDividerUVs(level);
    dividerCount += dividers.length;
    const shutters = triangles(level, surface => surface.role === "wall-shutter");
    shutterCount += shutters.length;
    const bounds = (triangle: Triangle) => ({
      left: Math.min(...triangle.points.map(point => point[0])),
      right: Math.max(...triangle.points.map(point => point[0])),
      bottom: Math.min(...triangle.points.map(point => point[2])),
      top: Math.max(...triangle.points.map(point => point[2])),
    });
    for (const divider of dividers.map(bounds))
      for (const shutter of shutters.map(bounds)) {
        const overlapX = Math.min(divider.right, shutter.right) - Math.max(divider.left, shutter.left);
        const overlapZ = Math.min(divider.top, shutter.top) - Math.max(divider.bottom, shutter.bottom);
        assert.ok(overlapX <= 1e-6 || overlapZ <= 1e-6,
          `${seed}: a structural divider must not cut across the shutter, guide, hood, or rail.`);
      }
  }
  assert.ok(shutterCount > 0, "The spacing fixtures must preserve some usable shutter fronts.");
  assert.ok(dividerCount > 0, "The fixtures must exercise actual texture dividers alongside frontage variation.");
});

test("rising-base and tilted walls retain attached utilities without shutter fronts", async () => {
  const slope = await build({ path: "0 0 0; 14 0 1.4", tileShare: 0.5 });
  const angle = 20 * Math.PI / 180;
  const tilted = await build({ placement: 'rotation="20 0 0"', tileShare: 0.5 });
  for (const [name, level] of [["rising-base", slope], ["tilted", tilted]] as const) {
    assert.deepEqual(triangles(level, surface => surface.role === "wall-shutter"), [],
      `${name}: shutter fronts require a vertical plane with a level base.`);
    const utilities = triangles(level, surface => ["wall-pipe", "wall-cable", "wall-duct", "wall-meter"].includes(surface.role));
    assert.ok(utilities.length > 0, `${name}: utilities still fit suitable exposed areas.`);
    const allProps = triangles(level, surface => surface.kind === "prop");
    for (const triangle of allProps) for (const point of triangle.points) {
      const local = name === "tilted" ? [point[0], point[1] * Math.cos(angle) + point[2] * Math.sin(angle),
        -point[1] * Math.sin(angle) + point[2] * Math.cos(angle)] : point;
      const bottom = name === "rising-base" ? local[0] * 0.1 : 0;
      assert.ok(local[0] >= -1e-5 && local[0] <= 14.00001);
      assert.ok(local[1] >= 0.09999 && local[1] <= 0.24001,
        `${name}: detail stays within 14 cm of the actual receiving plane.`);
      assert.ok(local[2] >= bottom - 1e-5 && local[2] <= bottom + 3.60001,
        `${name}: complete assemblies remain on the authored sloping surface.`);
    }
  }
});
