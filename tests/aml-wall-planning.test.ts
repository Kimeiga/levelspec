import { test } from "node:test";
import assert from "node:assert/strict";
import { compile, parseAml, collisionMesh } from "levelspec";
import { Matrix4 } from "three";
import { wallFits, type WallSurface } from "../src/dressing/wall-surfaces.ts";

type Level = Awaited<ReturnType<typeof compile>>;
type Point = [number, number, number];

interface WallFixture {
  id: string;
  points: Point[];
  face?: "back" | "side";
}

/** Declares several physical wall objects with independent recipes in one dressing pass. */
function source(walls: WallFixture[], extra = "") {
  return `<architecture version="1" id="wall-planning" validation="premap">
    <material id="finish" color="#b3b19d"/>
    ${walls.map(wall => `<path id="${wall.id}-axis" points="${wall.points.map(point => point.join(" ")).join("; ")}"/>
      <wall id="${wall.id}" path="${wall.id}-axis" thickness="0.2" height="3.6"/>`).join("\n")}
    ${extra}
    <dressing seed="spatial-wall" detail="high" grime="0.6" wear="0.3">
      ${walls.map(wall => `<wall host="${wall.id}" material="finish" face="${wall.face ?? "back"}" windows="false"/>`).join("\n")}
    </dressing>
  </architecture>`;
}

/** Compiles only public AML and requires valid fixture geometry before checking dressing. */
async function build(walls: WallFixture[], extra = "") {
  const level = await compile(parseAml(source(walls, extra)), { navigation: false });
  assert.deepEqual(level.diagnostics, []);
  return level;
}

interface Bounds {
  low: Point;
  high: Point;
  hosts: Set<string>;
}

/** Reads semantic family triangles without depending on generated object identities or materials. */
function familyTriangles(level: Level, role: string) {
  const triangles: { points: Point[]; host: string }[] = [];
  for (let t = 0; t < level.mesh.surfaces.length; t++) {
    const surface = level.surfaces[level.mesh.surfaces[t]];
    if (surface.kind !== "prop" || surface.role !== role) continue;
    const host = level.provenance[surface.object]?.host;
    assert.ok(host, "Family geometry preserves its receiving source host.");
    assert.equal(surface.collidable, false);
    triangles.push({
      points: level.mesh.indices.slice(t * 3, t * 3 + 3).map(index =>
        level.mesh.positions.slice(index * 3, index * 3 + 3) as Point),
      host,
    });
  }
  return triangles;
}

/**
 * Groups geometrically touching family triangles by a sweep and union-find.
 * A 7 mm tolerance joins layered paper/ink; tighter cable checks use 1 mm.
 * Original triangle bounds determine connectivity, never a component's growing box.
 */
function components(level: Level, role: string, tolerance = 0.007): Bounds[] {
  const triangles = familyTriangles(level, role);
  const boxes = triangles.map(({ points, host }) => ({
    low: [0, 1, 2].map(axis => Math.min(...points.map(point => point[axis]))) as Point,
    high: [0, 1, 2].map(axis => Math.max(...points.map(point => point[axis]))) as Point,
    hosts: new Set([host]),
  }));
  const roots = boxes.map((_, i) => i);
  const root = (index: number): number => {
    while (roots[index] !== index) {
      roots[index] = roots[roots[index]];
      index = roots[index];
    }
    return index;
  };
  const order = boxes.map((_, i) => i).sort((a, b) => boxes[a].low[0] - boxes[b].low[0]);
  let active: number[] = [];
  for (const i of order) {
    active = active.filter(j => boxes[j].high[0] + tolerance >= boxes[i].low[0]);
    for (const j of active)
      if ([0, 1, 2].every(axis => boxes[i].low[axis] <= boxes[j].high[axis] + tolerance &&
        boxes[j].low[axis] <= boxes[i].high[axis] + tolerance))
        roots[root(i)] = root(j);
    active.push(i);
  }
  const groups = new Map<number, Bounds>();
  for (const [i, box] of boxes.entries()) {
    const id = root(i);
    const existing = groups.get(id);
    if (!existing) groups.set(id, { low: [...box.low], high: [...box.high], hosts: new Set(box.hosts) });
    else {
      for (const axis of [0, 1, 2]) {
        existing.low[axis] = Math.min(existing.low[axis], box.low[axis]);
        existing.high[axis] = Math.max(existing.high[axis], box.high[axis]);
      }
      for (const host of box.hosts) existing.hosts.add(host);
    }
  }
  return [...groups.values()];
}

/** Builds alternate polygonal approximations of the same 8 m radius quarter-circle. */
function curve(segments: number): WallFixture {
  return { id: "curve", face: "side", points: Array.from({ length: segments + 1 }, (_, i) => {
    const angle = Math.PI * i / (2 * segments);
    return [8 * Math.cos(angle), 8 * Math.sin(angle), 0];
  }) };
}

/** Detects true projected triangle overlap with a known opening by separating axes. */
function crossesOpening(points: Point[], left: number, right: number, top: number): boolean {
  const triangle = points.map(point => [point[0], point[2]]);
  const [a, b, c] = triangle;
  const area = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  if (Math.abs(area) < 1e-10) return false;
  const corners = [[left, 0], [right, 0], [right, top], [left, top]];
  const axes = [[1, 0], [0, 1]];
  for (let i = 0; i < 3; i++) {
    const p = triangle[i], q = triangle[(i + 1) % 3];
    const length = Math.hypot(q[0] - p[0], q[1] - p[1]);
    if (length > 1e-10) axes.push([(p[1] - q[1]) / length, (q[0] - p[0]) / length]);
  }
  return axes.every(axis => {
    const p = triangle.map(point => point[0] * axis[0] + point[1] * axis[1]);
    const q = corners.map(point => point[0] * axis[0] + point[1] * axis[1]);
    return Math.min(Math.max(...p), Math.max(...q)) - Math.max(Math.min(...p), Math.min(...q)) > 1e-7;
  });
}

test("curved receivers compile without generated identity conflicts", async () => {
  for (const segments of [16, 64]) await build([curve(segments)]);

  const coarseDocument = parseAml(source([{
    id: "coarse", face: "side", points: [[0, 0, 0], [12, 0, 0], [18, 1, 0]],
  }]));
  coarseDocument.dressing!.seed = "review";
  const coarse = await compile(coarseDocument, { navigation: false });
  assert.deepEqual(coarse.diagnostics, [], "Several risers on one long facet compile without generated identity conflicts.");
});

test("wall dressing preserves collision and keeps authored openings clear", async () => {
  const walls: WallFixture[] = [
    { id: "a", points: [[0, 0, 0], [5, 0, 0]] },
    { id: "b", points: [[5, 0, 0], [10, 0, 0]] },
  ];
  const level = await build(walls);
  const bare = parseAml(source(walls));
  delete bare.dressing;
  const plain = await compile(bare, { navigation: false });
  assert.equal(level.physicalHash, plain.physicalHash);
  assert.deepEqual(collisionMesh(level, true), collisionMesh(plain, true));
  const interrupted = await build(walls,
    '<opening id="slot" host="a" width="0.6" height="3.4" center="4.5 1.7"/>');
  for (const triangle of familyTriangles(interrupted, "wall-cable"))
    assert.equal(crossesOpening(triangle.points, 4.2, 4.8, 3.4), false,
      "A joined run cannot bridge an authored opening on either source host.");
});

test("emitted utilities remain inside tiny receivers", async () => {
  const tiny = await build([{ id: "tiny", points: [[0, 0, 0], [0.18, 0, 0]] }]);
  const risers = components(tiny, "wall-pipe", 0.001);
  assert.ok(risers.length > 0, "The fixture exercises utility containment");
  for (const riser of risers) {
    assert.ok(riser.low[0] >= -1e-6 && riser.high[0] <= 0.180001);
    assert.ok(riser.low[1] >= 0.099999 && riser.high[1] <= 0.240001);
    assert.ok(riser.low[2] >= -1e-6 && riser.high[2] <= 3.600001);
  }
});

test("curved wall utilities respect their receiving elevation beside a truncated endpoint", async () => {
  const xml = `<architecture version="1" id="curve-end-support" validation="premap" curve-tolerance="0.01">
    <material id="finish" color="#aaaaaa"/>
    <path id="curve-axis" points="0 0 0"><bezier to="14 0 0" controls="4 -3 0; 10 -3 0"/></path>
    <path id="end-axis" points="14 0 0; 14 3 0"/>
    <assembly id="joined">
      <wall id="curve" path="curve-axis" thickness="0.22" height="3"/>
      <wall id="end" path="end-axis" thickness="0.22" height="3"/>
    </assembly>
    <opening id="door" host="end" width="3" height="2.1" center="1.5 1.05"/>
    <dressing seed="curve-wire" detail="high">
      <wall host="curve" face="side" material="finish" windows="false" tile-share="0"/>
    </dressing>
  </architecture>`;
  const level = await compile(parseAml(xml), { navigation: false });
  assert.deepEqual(level.diagnostics, []);
  for (const face of familyTriangles(level, "wall-cable")) {
    if (face.host !== "curve") continue;
    assert.ok(face.points.every(point => point[2] <= 3.000001 && point[2] >= 0));
  }
});


test("receiving-area containment accepts arithmetic roundoff without admitting a protruding cable strip", () => {
  const surface: WallSurface = {
    key: "fixture", frame: new Matrix4(), left: 0, right: 0.3, bottom: 0, top: 1,
    vertical: true, levelBase: true,
    triangles: [[[0, 0, 0], [0, 0, 1], [0.3, 0, 1]], [[0, 0, 0], [0.3, 0, 1], [0.3, 0, 0]]],
  };
  assert.ok(0.1 + 0.2 > 0.3, "The fixture exercises actual Float64 addition roundoff.");
  assert.equal(wallFits(surface, 0.1, 0.1, 0.2, 0.8, 0), true,
    "The mathematical right edge is exactly on the receiver, despite machine roundoff.");
  assert.equal(wallFits(surface, 0.1, 0.1, 0.2000001, 0.8, 0), false,
    "A real 0.1 μm protrusion still exceeds the permitted 0.01 μm arithmetic tolerance.");
});
