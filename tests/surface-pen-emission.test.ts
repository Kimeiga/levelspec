import { test } from "node:test";
import assert from "node:assert/strict";
import { Matrix4 } from "three";
import { compile, parseAml } from "levelspec";
import type { V3 } from "../src/architecture/types.ts";
import type { KitBudget } from "../src/dressing/geometry.ts";
import { KitMesh, type KitSlot } from "../src/dressing/kit-mesh.ts";
import { Pen } from "../src/dressing/pen.ts";
import { createBuildingLevel } from "../src/dressing/kowloon/building-job.ts";

const QUAD: V3[] = [[1, 0, 2], [3, 0, 2], [3, 0, 3], [1, 0, 3]];

/** A right-angle rotation has exact coefficients, making expected world coordinates independent of trigonometric rounding. */
function rotated(): Matrix4 {
  return new Matrix4().set(0, -1, 0, 10, 1, 0, 0, -3, 0, 0, 1, 4, 0, 0, 0, 1);
}

/** Uses the real collector with an empty owned mesh and a two-repeats-per-meter source material. */
async function drawing(matrix = new Matrix4(), budget: KitBudget = { maximumTriangles: 100 }) {
  const source = await compile(parseAml(`<architecture version="1" id="pen-emission">
    <material id="finish" color="#fff" repeat="2"/>
    <box id="host" width="1" depth="1" height="1" material="finish"/>
  </architecture>`), { navigation: false });
  assert.deepEqual(source.diagnostics, []);
  const level = createBuildingLevel(source);
  const mesh = new KitMesh(level, "host", "props", { wall: "finish" } as Record<KitSlot, string>, budget);
  return { level, pen: new Pen(mesh, "face", matrix, matrix.determinant() < 0) };
}

test("face fans preserve transformed outward winding, flat normals and local metric UVs", async () => {
  const cases = [
    { matrix: rotated(),
      positions: [10, -2, 6, 10, 0, 7, 10, 0, 6, 10, -2, 6, 10, -2, 7, 10, 0, 7],
      normals: [-1, -0, -0, -1, -0, -0, -1, -0, -0, -1, -0, -0, -1, -0, -0, -1, -0, -0],
      uv: [2, 4, 6, 6, 6, 4, 2, 4, 2, 6, 6, 6] },
    { matrix: new Matrix4().set(-1, 0, 0, 10, 0, 1, 0, -3, 0, 0, 1, 4, 0, 0, 0, 1),
      positions: [9, -3, 6, 7, -3, 6, 7, -3, 7, 9, -3, 6, 7, -3, 7, 9, -3, 7],
      normals: [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, -0, 0, 1, -0, 0, 1, -0],
      uv: [2, 4, 6, 4, 6, 6, 2, 4, 6, 6, 2, 6] },
  ];
  for (const expected of cases) {
    const { level, pen } = await drawing(expected.matrix);
    pen.face("wall", QUAD, [0, 1, 0], [.25, .5, 1]);
    assert.deepEqual(level.mesh.positions, expected.positions);
    assert.deepEqual(level.mesh.normals, expected.normals);
    assert.deepEqual(level.mesh.uv, expected.uv, "Placement and winding cannot stretch or mirror local source coordinates");
    assert.deepEqual(level.mesh.indices, [0, 1, 2, 3, 4, 5]);
    assert.deepEqual(level.mesh.colors, Array.from({ length: 6 }, () => [.25, .5, 1]).flat());
    assert.equal(new Set(level.mesh.surfaces).size, 1);
    const surface = level.surfaces[level.mesh.surfaces[0]];
    assert.equal(surface.material, "finish"); assert.equal(surface.collidable, false);
    assert.equal(level.provenance[surface.object].host, "host");
  }
});

test("explicit corner data and local tint callbacks follow emitted winding without memoization or aliasing", async () => {
  const { level, pen } = await drawing(rotated());
  const points = structuredClone(QUAD), hint: V3 = [0, 1, 0];
  const uv = [[.2, -1], [.4, -2], [.6, -3], [.8, -4]];
  const normals: V3[] = [[0, 1, 0], [.6, .8, 0], [0, .8, .6], [-.6, .8, 0]];
  const before = structuredClone({ points, hint, uv, normals });
  const order: number[] = [], returned: V3[] = [];
  pen.face("wall", points, hint, point => {
    const index = points.indexOf(point);
    assert.ok(index >= 0, "Tint receives the original local point, not a transformed or copied point");
    order.push(index);
    const color: V3 = [order.length / 10, point[0] / 10, point[2] / 10];
    returned.push(color); return color;
  }, uv, normals);
  assert.deepEqual(order, [0, 2, 1, 0, 3, 2]);
  assert.deepEqual(level.mesh.normals, [-1, 0, 0, -.8, 0, .6, -.8, .6, 0, -1, 0, 0, -.8, -.6, 0, -.8, 0, .6]);
  assert.deepEqual(level.mesh.uv, [.2, -1, .6, -3, .4, -2, .2, -1, .8, -4, .6, -3]);
  assert.deepEqual(level.mesh.colors, [.1, .1, .2, .2, .3, .3, .3, .3, .2, .4, .1, .2, .5, .1, .3, .6, .3, .3]);
  assert.deepEqual({ points, hint, uv, normals }, before);
  const published = structuredClone(level.mesh);
  points[0].fill(10); hint.fill(10); uv[0].fill(10); normals[0].fill(10); returned[0].fill(10);
  assert.deepEqual(level.mesh, published, "The collector owns emitted numeric attributes after drawing returns");
});

test("degenerate fan pieces are skipped independently and the admission threshold stays strict", async () => {
  const { level, pen } = await drawing();
  const points: V3[] = [[0, 0, 0], [1, 0, 0], [2, 0, 0], [2, 1, 0], [0, 1, 0]];
  const order: number[] = [];
  pen.face("wall", points, [0, 0, -1], point => { order.push(points.indexOf(point)); return [1, 1, 1]; });
  assert.deepEqual(order, [0, 3, 2, 0, 4, 3], "A degenerate first piece cannot discard later valid fan pieces");
  assert.deepEqual(level.mesh.positions, [0, 0, 0, 2, 1, 0, 2, 0, 0, 0, 0, 0, 0, 1, 0, 2, 1, 0]);
  assert.deepEqual(level.mesh.normals, Array.from({ length: 6 }, () => [-0, -0, -1]).flat());
  assert.deepEqual(level.mesh.uv, [0, 0, 4, 2, 4, 0, 0, 0, 0, 2, 4, 2], "The first valid local plane defines UVs independently of the facing hint");
  for (const [height, count] of [[.5e-9, 0], [1e-9, 1], [2e-9, 1]]) {
    const small = await drawing();
    let calls = 0;
    small.pen.face("wall", [[0, 0, 0], [1, 0, 0], [0, height, 0]], [0, 0, 1], () => { calls++; return [1, 1, 1]; });
    // Admission is measured before the collector rounds positions to its 10 micrometer output grid.
    assert.equal(small.level.mesh.surfaces.length, count, `cross-product length ${height}`);
    assert.equal(calls, count * 3);
  }
});

test("face emission retains complete prior triangles on callback or budget failure and honors cancellation", async () => {
  const budget = { maximumTriangles: 1 }, limited = await drawing(new Matrix4(), budget);
  const order: number[] = [];
  assert.throws(() => limited.pen.face("wall", QUAD, [0, 1, 0], point => {
    order.push(QUAD.indexOf(point)); return [1, 1, 1];
  }), /budget/i);
  assert.deepEqual(order, [0, 2, 1, 0, 3, 2], "Corner callbacks precede collector admission for each nondegenerate triangle");
  assert.equal(limited.level.mesh.indices.length, 3);
  assert.equal(limited.level.mesh.positions.length, 9);
  budget.maximumTriangles = 2;
  limited.pen.face("wall", QUAD.slice(0, 3), [0, 1, 0], [1, 1, 1]);
  assert.equal(limited.level.mesh.indices.length, 6);

  const failed = await drawing(); let calls = 0;
  assert.throws(() => failed.pen.face("wall", QUAD, [0, 1, 0], () => {
    if (++calls === 5) throw new Error("test pigment failure");
    return [1, 1, 1];
  }), /test pigment failure/);
  assert.equal(calls, 5);
  assert.equal(failed.level.mesh.indices.length, 3);
  assert.deepEqual([failed.level.mesh.positions.length, failed.level.mesh.normals.length, failed.level.mesh.uv.length, failed.level.mesh.colors!.length], [9, 9, 6, 9]);
  failed.pen.face("wall", QUAD.slice(0, 3), [0, 1, 0], [1, 1, 1]);
  assert.equal(failed.level.mesh.indices.length, 6);

  const controller = new AbortController(); controller.abort();
  const cancelled = await drawing(new Matrix4(), { maximumTriangles: 10, signal: controller.signal });
  let cancelledCalls = 0;
  assert.throws(() => cancelled.pen.face("wall", QUAD, [0, 1, 0], () => { cancelledCalls++; return [1, 1, 1]; }),
    (error: unknown) => error instanceof Error && error.name === "AbortError");
  assert.equal(cancelledCalls, 3);
  assert.equal(cancelled.level.mesh.indices.length, 0);
  assert.equal(cancelled.level.surfaces.length, 0);
  const recovered = await drawing();
  recovered.pen.face("wall", QUAD.slice(0, 3), [0, 1, 0], [1, 1, 1]);
  assert.equal(recovered.level.mesh.indices.length, 3);
});
