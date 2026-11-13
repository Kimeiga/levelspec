import { test } from "node:test";
import assert from "node:assert/strict";
import { Matrix4, Ray, Triangle, Vector3 } from "three";
import { compile, parseAml, serializeAml, collisionMesh } from "levelspec";

type Level = Awaited<ReturnType<typeof compile>>;
type Point = [number, number, number];
const trapezoid = "0 0; 5 0; 4 3; 1 3";

/** A visual tenement on an independently collidable street. Geometry checks keep aging disabled. */
function source(points = trapezoid, placement = "", extra = ""): string {
  return `<architecture version="1" id="polygon-building" validation="premap">
    <material id="plaster" color="#b9c3c0" roughness="0.9"/>
    <profile id="lot" points="${points}"/>
    <extrusion id="building" profile="lot" distance="6.35" collidable="false" ${placement}/>
    <box id="street" width="30" depth="20" height="0.2" position="-10 -10 -0.2"/>
    <dressing seed="polygon" grime="0" wear="0" detail="low">
      <building host="building" material="plaster" stories="2" ${extra}/>
    </dressing>
  </architecture>`;
}

/** Intersects generated structural triangles with a world ray; fixtures cannot hide a shell defect. */
function hits(level: Level, point: Point, direction: Point, host = "building"): { distance: number; normal: Vector3 }[] {
  const ray = new Ray(new Vector3(...point), new Vector3(...direction).normalize());
  const result: { distance: number; normal: Vector3 }[] = [];
  for (let t = 0; t < level.mesh.surfaces.length; t++) {
    const surface = level.surfaces[level.mesh.surfaces[t]];
    if (!["envelope", "roof", "openings"].some(part => surface.object === `${host}/$dressing/${part}`)) continue;
    const vertices = level.mesh.indices.slice(t * 3, t * 3 + 3).map(i => new Vector3(...level.mesh.positions.slice(i * 3, i * 3 + 3)));
    const at = ray.intersectTriangle(vertices[0], vertices[1], vertices[2], false, new Vector3());
    if (at) result.push({ distance: at.distanceTo(ray.origin), normal: vertices[1].clone().sub(vertices[0]).cross(vertices[2].clone().sub(vertices[0])).normalize() });
  }
  return result.sort((a, b) => a.distance - b.distance);
}

/** Keeps errors visible while allowing unrelated architectural suggestions to remain warnings. */
async function build(xml: string): Promise<Level> {
  const level = await compile(parseAml(xml), { navigation: false });
  assert.deepEqual(level.diagnostics.filter(d => d.severity === "error"), []);
  return level;
}

test("polygon buildings follow slanted footprint walls and close only their actual roof", async () => {
  const placements = [
    { xml: "", matrix: new Matrix4() },
    { xml: 'position="12 -4 2" rotation="0 0 90" scale="-1 1 1"', matrix: new Matrix4().makeTranslation(12, -4, 2).multiply(new Matrix4().makeRotationZ(Math.PI / 2)).multiply(new Matrix4().makeScale(-1, 1, 1)) },
  ];
  for (const placement of placements) {
    const level = await build(source(trapezoid, placement.xml));
    const world = (p: Point): Point => new Vector3(...p).applyMatrix4(placement.matrix).toArray() as Point;
    const direction = (p: Point): Point => new Vector3(...p).transformDirection(placement.matrix).toArray() as Point;
    for (const z of [2.8, 5.7]) for (const [point, toward, distance] of [
      [[-1, 1.5, z], [1, 0, 0], 1.5],
      [[6, 1.5, z], [-1, 0, 0], 1.5],
    ] as [Point, Point, number][]) {
      const crossing = hits(level, world(point), direction(toward))[0];
      assert.ok(crossing, `Missing slanted wall from ${point}`);
      assert.ok(Math.abs(crossing.distance - distance) < 0.002, `Expected sloped wall at ${distance}, got ${crossing.distance}`);
      assert.ok(crossing.normal.dot(new Vector3(...direction(toward))) < 0, "Facade faces into the building");
    }
    for (const point of [[2.5, 1.5, 10], [1.15, 2.75, 10], [3.85, 2.75, 10], [0.2, 0.2, 10]] as Point[]) {
      const crossing = hits(level, world(point), direction([0, 0, -1]))[0];
      assert.ok(crossing && crossing.distance >= 3.64 && crossing.distance <= 4.01, `Roof missing at ${point}`);
      assert.ok(crossing.normal.dot(new Vector3(...direction([0, 0, 1]))) > 0.99);
    }
    assert.equal(hits(level, world([0.2, 2.75, 10]), direction([0, 0, -1])).length, 0, "Roof fills the trapezoid's excluded corner");
    assert.ok(level.mesh.uv.every(Number.isFinite));
    assert.ok(level.surfaceAppearance && level.surfaceAppearance.charts > 0, "Shared finish pipeline did not receive the building");
  }
});

test("reversed and offset polygon sources remain reproducible and render-only", async () => {
  const xml = source("-2.5 -1.5; 2.5 -1.5; 1.5 1.5; -1.5 1.5");
  const document = parseAml(xml);
  const snapshot = serializeAml(document);
  const normal = await compile(document, { navigation: false });
  const reversed = await build(source("-1.5 1.5; 1.5 1.5; 2.5 -1.5; -2.5 -1.5"));
  assert.equal(serializeAml(document), snapshot, "Compilation mutated source");
  assert.equal(normal.renderHash, reversed.renderHash);
  for (const sign of [-1, 1]) {
    const crossing = hits(normal, [sign * 4, 0, 5.7], [-sign, 0, 0])[0];
    assert.ok(crossing && Math.abs(crossing.distance - 2) < 0.002, "Profile offset was ignored");
  }
  assert.equal(hits(normal, [-2.3, 1.25, 10], [0, 0, -1]).length, 0);
  const plain = parseAml(xml);
  delete plain.dressing;
  const baseline = await compile(plain, { navigation: false });
  assert.equal(normal.physicalHash, baseline.physicalHash);
  assert.deepEqual(collisionMesh(normal, true), collisionMesh(baseline, true));
  assert.ok(normal.surfaces.filter(s => s.object.startsWith("building/$dressing/")).every(s => s.collidable === false));
});

test("unsupported polygon building contracts fail at the recipe source", async () => {
  const cases = [
    source("0 0; 8 0; 8 6; 4 3; 0 6"),
    source().replace(`<profile id="lot" points="${trapezoid}"/>`, `<profile id="lot" points="${trapezoid}"><hole points="2 1; 3 1; 3 2; 2 2"/></profile>`),
    source().replace('<profile id="lot"', '<profile id="lot" rotation="15 0 0"'),
    source(trapezoid, 'rotation="15 0 0"'),
    source(trapezoid, "", 'shops="1"'),
    source(trapezoid, "", 'base-wall="street"'),
  ];
  for (const xml of cases) {
    const level = await compile(parseAml(xml), { navigation: false });
    const error = level.diagnostics.find(d => d.code === "AML_DRESSING" && d.severity === "error");
    assert.ok(error?.source && error.objects.includes("building"), JSON.stringify(level.diagnostics));
  }
});

test("a five-sided roof covers the clipped corner without filling its missing wedge", async () => {
  const level = await build(source("0 0; 4 0; 4 2; 2 4; 0 4"));
  assert.ok(hits(level, [1, 3, 10], [0, 0, -1]).length > 0, "Fifth-vertex roof region is open");
  assert.equal(hits(level, [3.8, 3.8, 10], [0, 0, -1]).length, 0, "Clipped wedge was filled");
});

test("neighboring box buildings hide a contacting polygon wall but preserve a separated one", async () => {
  for (const gap of [0, 0.01]) {
    const xml = source("0 0; 4 0; 3.5 3; 0.5 3")
      .replace('<dressing ', `<box id="neighbor" width="3" depth="3" height="3.35" position="0.5 ${-3 - gap} 0" collidable="false"/><dressing `)
      .replace('</dressing>', '<building host="neighbor" material="plaster" stories="1"/></dressing>');
    const level = await build(xml);
    const near = hits(level, [2, -0.005, 2.8], [0, 1, 0]).filter(hit => hit.distance < 0.008);
    assert.equal(near.length > 0, gap > 0, `Wall contact incorrectly handled for gap ${gap}`);
    const neighbor = hits(level, [2, 0.005, 2.8], [0, -1, 0], "neighbor").filter(hit => hit.distance < 0.018);
    assert.equal(neighbor.length > 0, gap > 0, `Reciprocal wall contact incorrectly handled for gap ${gap}`);
  }
});

/** Interpolates untextured exported wall color in the front plane, independently of receiver IDs. */
function frontTint(level: Level, x: number, z: number): number {
  for (let t = 0; t < level.mesh.surfaces.length; t++) {
    const surface = level.surfaces[level.mesh.surfaces[t]];
    if (surface.object !== "building/$dressing/envelope") continue;
    const ids = level.mesh.indices.slice(t * 3, t * 3 + 3);
    const p = ids.map(i => level.mesh.positions.slice(i * 3, i * 3 + 3));
    if (p.some(v => Math.abs(v[1]) > 1e-6)) continue;
    const [a, b, c] = p;
    const d = (b[2] - c[2]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[2] - c[2]);
    if (Math.abs(d) < 1e-10) continue;
    const u = ((b[2] - c[2]) * (x - c[0]) + (c[0] - b[0]) * (z - c[2])) / d;
    const v = ((c[2] - a[2]) * (x - c[0]) + (a[0] - c[0]) * (z - c[2])) / d;
    const weights = [u, v, 1 - u - v];
    if (weights.some(w => w < -1e-6)) continue;
    const material = level.document.materials.find(m => m.id === surface.material)!;
    assert.equal(material.texture, undefined, "Tint probe requires untextured input");
    return weights.reduce((value, weight, i) => value + weight * level.mesh.colors!.slice(ids[i] * 3, ids[i] * 3 + 3).reduce((sum, c) => sum + c, 0) / 3, 0);
  }
  assert.fail(`No front wall at ${x}, ${z}`);
}

test("roof outlets cause localized stains in exported wall finishes", async () => {
  const xml = source("0 0; 4 0; 3.5 3; 0.5 3");
  const clean = await build(xml);
  const dirty = await build(xml.replace('grime="0"', 'grime="1"'));
  const ratios = (x: number, heights: number[]) => heights.reduce((sum, z) => sum + frontTint(dirty, x, z) / frontTint(clean, x, z), 0) / heights.length;
  const below = [5.79, 5.87, 5.95];
  const underOutlet = ratios(2, below);
  const contrast = (heights: number[]) => (ratios(1.35, heights) + ratios(2.65, heights)) / 2 - ratios(2, heights);
  const beneathContrast = contrast(below), aboveContrast = contrast([6.26, 6.29, 6.32]);
  assert.ok(beneathContrast > 0.025, `Outlet runoff not localized: center ${underOutlet}, contrast ${beneathContrast}`);
  // The roofline also stains the upper parapet; compare localized contrast, not total darkness.
  assert.ok(beneathContrast > aboveContrast + 0.025, `Outlet lacks a downward signal: below ${beneathContrast}, above ${aboveContrast}`);
  const outlet = dirty.mesh.surfaces.some((surfaceIndex, t) => {
    if (dirty.surfaces[surfaceIndex].object !== "building/$dressing/fixtures") return false;
    return dirty.mesh.indices.slice(t * 3, t * 3 + 3).every(i => {
      const [x, y, z] = dirty.mesh.positions.slice(i * 3, i * 3 + 3);
      return x >= 1.85 && x <= 2.15 && y < 0 && y > -0.15 && z > 6 && z < 6.25;
    });
  });
  assert.ok(outlet, "Stain has no modeled outlet above it");
});

test("rectangular buildings keep their shell and openings fixed across detail levels", async () => {
  const xml = source("0 0; 4 0; 3.5 3; 0.5 3").replace('<extrusion id="building" profile="lot" distance="6.35" collidable="false" />', '<box id="building" width="4" depth="3" height="6.35" collidable="false"/>');
  assert.ok(xml.includes('<box id="building"'), "Expected a rectangular building fixture");
  const low = await build(xml);
  const high = await build(xml.replace('detail="low"', 'detail="high"'));
  for (const part of ["envelope", "openings"]) assertSameSurface(low, high, part);
  for (const x of [0.23, 1.13, 2.17, 3.71]) for (const z of [0.27, 1.37, 2.61, 3.71, 4.83, 5.89]) {
    const a = hits(low, [x, -3, z], [0, 1, 0])[0], b = hits(high, [x, -3, z], [0, 1, 0])[0];
    assert.ok(a && b && Math.abs(a.distance - b.distance) < 1e-5, `Front construction moved at ${x}, ${z}`);
    assert.ok(a.normal.dot(b.normal) > 0.99999);
  }
  assert.equal(high.physicalHash, low.physicalHash);
  assert.ok(high.mesh.surfaces.filter(s => high.surfaces[s].object === "building/$dressing/fixtures").length > low.mesh.surfaces.filter(s => low.surfaces[s].object === "building/$dressing/fixtures").length);
});

/** Checks sampled oriented coplanar coverage and area independently of edge-conforming triangle subdivisions. */
function assertSameSurface(first: Level, second: Level, part: string): void {
  const planes = (level: Level): Map<string, Triangle[]> => {
    const result = new Map<string, Triangle[]>();
    for (let t = 0; t < level.mesh.surfaces.length; t++) {
      if (level.surfaces[level.mesh.surfaces[t]].object !== `building/$dressing/${part}`) continue;
      const vertices = level.mesh.indices.slice(t * 3, t * 3 + 3).map(i => new Vector3(...level.mesh.positions.slice(i * 3, i * 3 + 3)));
      const triangle = new Triangle(vertices[0], vertices[1], vertices[2]);
      const normal = triangle.getNormal(new Vector3());
      const key = [...normal.toArray(), normal.dot(vertices[0])].map(v => Math.round(v * 10000)).join(",");
      const group = result.get(key) ?? [];
      group.push(triangle);
      result.set(key, group);
    }
    return result;
  };
  const a = planes(first), b = planes(second);
  assert.deepEqual([...a.keys()].sort(), [...b.keys()].sort(), `${part} changed its supporting planes`);
  for (const [key, triangles] of a) {
    const others = b.get(key)!;
    const area = (values: Triangle[]) => values.reduce((sum, t) => sum + t.getArea(), 0);
    assert.ok(Math.abs(area(triangles) - area(others)) < 1e-5, `${part} changed area on ${key}`);
    for (const [from, to] of [[triangles, others], [others, triangles]])
      for (const triangle of from) {
        const probes = [triangle.a, triangle.b, triangle.c, triangle.getMidpoint(new Vector3()),
          triangle.a.clone().lerp(triangle.b, 0.5), triangle.b.clone().lerp(triangle.c, 0.5), triangle.c.clone().lerp(triangle.a, 0.5)];
        for (const p of probes)
          assert.ok(to.some(t => t.closestPointToPoint(p, new Vector3()).distanceToSquared(p) < 1e-12), `${part} lost coplanar coverage at ${p.toArray()}`);
      }
  }
}
