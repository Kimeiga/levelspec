import { test } from "node:test";
import assert from "node:assert/strict";
import { compile, parseAml, collisionMesh } from "levelspec";
import { registerSurfaceChart } from "../src/dressing/surface/plans.ts";
import { compileSurfaceAppearance } from "../src/dressing/surface/compile.ts";
import type { SurfaceChart } from "../src/dressing/surface/types.ts";
import type { CompiledArchitecture } from "../src/architecture/types.ts";

const pitch = 0.16, gap = 0.006, bevel = 0.009, extent = 0.5;
const source = `<architecture version="1" id="construction-cuts"><material id="ceramic" color="#ffffff" repeat="2.5"/>
  <material id="bed" color="#555555" repeat="4"/><box id="receiver" width="1" depth="1" height="0.1" material="ceramic"/></architecture>`;

/** A known periodic installation: 6mm grout strips and 3mm smooth ceramic bevels. */
function ceramic(u: number, v: number): number {
  const x = u - Math.floor(u / pitch) * pitch, y = v - Math.floor(v / pitch) * pitch;
  const edge = Math.min(x, pitch - x, y, pitch - y);
  const t = Math.max(0, Math.min(1, (edge - gap) / (bevel - gap)));
  return t * t * (3 - 2 * t);
}

function fieldChart(): { chart: SurfaceChart; calls: () => number } {
  let samples = 0;
  const ownershipBoundary = (gap + bevel) / 2;
  const inBand = (low: number, high: number, start: number, end: number) =>
    Array.from({ length: 6 }, (_, index) => index - 1).some(unit =>
      low >= unit * pitch + start - 1e-10 && high <= unit * pitch + end + 1e-10);
  return { calls: () => samples, chart: {
    id: "tiles", host: "receiver", firstTriangle: 0, triangleCount: 2,
    frame: { origin: [0, 0, 0], u: [1, 0, 0], v: [0, 1, 0], normal: [0, 0, 1] },
    bounds: [0, 0, extent, extent], materials: ["ceramic", "bed"], featureScale: 0.004, geometryStep: 0.055,
    // Closed half-bevel cells have one common winner, including equality on the 7.5mm construction line.
    uniformCoverage: ([u0, v0, u1, v1]) => inBand(u0, u1, -ownershipBoundary, ownershipBoundary) || inBand(v0, v1, -ownershipBoundary, ownershipBoundary) ||
      (inBand(u0, u1, ownershipBoundary, pitch - ownershipBoundary) && inBand(v0, v1, ownershipBoundary, pitch - ownershipBoundary)),
    sample: (u, v) => {
      samples++;
      const body = ceramic(u, v);
      return { layers: [
        { material: "ceramic", weight: body, uv: [2.5 * u + 0.27, 2.5 * v - 0.11] },
        { material: "bed", weight: 1 - body, uv: [4 * u + 0.27, 4 * v - 0.11] },
      ], height: -0.001 + 0.0045 * body };
    },
  } };
}

async function receiver() {
  const level = await compile(parseAml(source), { navigation: false });
  assert.deepEqual(level.diagnostics, []);
  level.mesh = { positions: [0, 0, 0, extent, 0, 0, extent, extent, 0, 0, extent, 0],
    normals: [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1], uv: [0, 0, extent, 0, extent, extent, 0, extent],
    colors: Array(12).fill(1), indices: [0, 1, 2, 0, 2, 3], surfaces: [0, 0] };
  return level;
}

/** Interpolates actual output positions and ownership, independently of construction hints or clipping. */
function hits(level: CompiledArchitecture, x: number, y: number) {
  const found: { height: number; material: string; interior: boolean; points: number[][] }[] = [];
  for (let triangle = 0; triangle < level.mesh.surfaces.length; triangle++) {
    const [a, b, c] = level.mesh.indices.slice(triangle * 3, triangle * 3 + 3).map(index => level.mesh.positions.slice(index * 3, index * 3 + 3));
    const determinant = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]);
    const first = ((b[1] - c[1]) * (x - c[0]) + (c[0] - b[0]) * (y - c[1])) / determinant;
    const second = ((c[1] - a[1]) * (x - c[0]) + (a[0] - c[0]) * (y - c[1])) / determinant;
    const weights = [first, second, 1 - first - second];
    if (weights.every(weight => weight >= -1e-9)) found.push({
      height: weights.reduce((sum, weight, index) => sum + weight * [a, b, c][index][2], 0),
      material: level.surfaces[level.mesh.surfaces[triangle]].material,
      interior: weights.every(weight => weight > 1e-9),
      points: [a, b, c],
    });
  }
  return found;
}

const lines = Array.from({ length: 5 }, (_, unit) =>
  [-bevel, -0.0075, -gap, 0, gap, 0.0075, bevel].map(offset => unit * pitch + offset)).flat();

for (const hinted of [true, false]) {
  test(`${hinted ? "construction hints" : "adaptive discovery"} preserve tiled coverage, physical bevels and source UVs${hinted ? " with bounded output work" : ""}`, async context => {
    const level = await receiver(), physical = collisionMesh(level, true), original = structuredClone(level.architecture);
    const { chart, calls } = fieldChart();
    if (hinted) chart.constructionCuts = { u: [...lines].reverse().concat(lines, [-10, 10]), v: [...lines, ...lines, 10, -10] };
    registerSurfaceChart(level, chart);
    const started = performance.now();
    await compileSurfaceAppearance(level, {}, 30_000);
    context.diagnostic(`${hinted ? "Construction hints" : "Adaptive baseline"}: ${level.mesh.surfaces.length} triangles, ${calls()} field samples, ${(performance.now() - started).toFixed(0)}ms`);
    assert.deepEqual(collisionMesh(level, true), physical);
    assert.deepEqual(level.architecture, original);
    assert.deepEqual(level.generatedImages ?? {}, {}, "Construction hints do not resample source materials");
    let area = 0;
    for (let triangle = 0; triangle < level.mesh.surfaces.length; triangle++) {
      const ids = level.mesh.indices.slice(triangle * 3, triangle * 3 + 3);
      const [a, b, c] = ids.map(index => level.mesh.positions.slice(index * 3, index * 3 + 3));
      const signed = ((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) / 2;
      assert.ok(signed > 0, `Nonpositive receiving face area=${signed}: ${JSON.stringify([a, b, c])}; hinted=${hinted}`); area += signed;
      const material = level.surfaces[level.mesh.surfaces[triangle]].material;
      assert.ok(["ceramic", "bed"].includes(material));
      const repeat = material === "ceramic" ? 2.5 : 4;
      for (const index of ids) {
        assert.ok(Math.abs(level.mesh.uv[index * 2] - (level.mesh.positions[index * 3] * repeat + 0.27)) < 1e-7);
        assert.ok(Math.abs(level.mesh.uv[index * 2 + 1] - (level.mesh.positions[index * 3 + 1] * repeat - 0.11)) < 1e-7);
      }
    }
    assert.ok(Math.abs(area - extent ** 2) < 1e-8, "All construction cells cover the authored receiver exactly");
    for (let x = 0.0137; x < extent; x += 0.0231) for (let y = 0.0071; y < extent; y += 0.0273) {
      const actual = hits(level, x, y), body = ceramic(x, y), expectedHeight = -0.001 + 0.0045 * body;
      assert.ok(actual.length > 0 && actual.filter(hit => hit.interior).length <= 1, "No cell is missing or double-covered");
      for (const hit of actual) assert.ok(Math.abs(hit.height - expectedHeight) <= 0.00035,
        `Known ceramic bevel elevation at ${x},${y}: ${hit.height} vs ${expectedHeight}; hinted=${hinted}; face=${JSON.stringify(hit.points)}`);
      if (body === 0 || body === 1) assert.ok(actual.every(hit => hit.material === (body ? "ceramic" : "bed")),
        "Intact ceramic and grout interiors preserve their source ownership");
    }
    if (hinted) {
      assert.ok(level.mesh.surfaces.length < 4_000, "A quarter-square-meter regular installation must not become a uniform microscopic mesh");
      assert.ok(calls() < 200_000, "Known construction boundaries keep field discovery work bounded");
    }
  });
}

test("nonfinite construction hints reject atomically and valid next work recovers", async () => {
  const level = await receiver(), before = structuredClone(level.mesh);
  for (const invalid of [NaN, Infinity, -Infinity]) {
    const { chart } = fieldChart();
    chart.constructionCuts = { u: [invalid], v: [] };
    registerSurfaceChart(level, chart);
    await assert.rejects(compileSurfaceAppearance(level, {}, 30_000), /construction|finite|cut/i);
    assert.deepEqual(level.mesh, before, "Bad hints cannot publish a partial receiving mesh");
  }
  const valid = fieldChart().chart;
  valid.constructionCuts = { u: lines, v: lines };
  registerSurfaceChart(level, valid);
  await compileSurfaceAppearance(level, {}, 30_000);
  assert.ok(hits(level, 0.08, 0.08).some(hit => hit.material === "ceramic"));
});

test("a claimed uniform region cannot hide contradictory material interiors", async () => {
  const level = await receiver(), before = structuredClone(level.mesh);
  const chart = { ...fieldChart().chart, uniformCoverage: () => true };
  registerSurfaceChart(level, chart);
  await assert.rejects(compileSurfaceAppearance(level, {}, 30_000), /uniform|coverage|proof/i);
  assert.deepEqual(level.mesh, before, "A false caller proof cannot publish missing material regions");
  const valid = fieldChart().chart;
  valid.constructionCuts = { u: lines, v: lines };
  registerSurfaceChart(level, valid);
  await compileSurfaceAppearance(level, {}, 30_000);
  assert.ok(hits(level, 0.08, 0.08).some(hit => hit.material === "ceramic"));
  assert.ok(hits(level, 0.002, 0.08).some(hit => hit.material === "bed"));
});
