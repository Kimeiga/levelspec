import { test } from "node:test";
import assert from "node:assert/strict";
import type { V3 } from "../src/architecture/types.ts";
import { createPipeRunoff, PipeRunoffSurface, type RunoffRing } from "../src/dressing/finish/pipe-runoff.ts";

/** A straight cylinder with axial V and circumferential U measured in meters. */
function cylinder(axis: V3, radial: V3, across: V3, length = .8, radius = .1): RunoffRing[] {
  return [0, length].map(distance => ({ center: axis.map(value => value * distance) as V3,
    radial: [...radial] as V3, across: [...across] as V3, radius, distance }));
}

/** Compares independently known directions with a tolerance for numerical projection. */
function near(actual: readonly number[], expected: readonly number[], tolerance = 1e-6): void {
  assert.equal(actual.length, expected.length);
  actual.forEach((value, index) => assert.ok(Number.isFinite(value) && Math.abs(value - expected[index]) <= tolerance,
    `Coordinate ${index}: expected ${expected[index]}, received ${value}`));
}

test("pipe gravity follows physical axial and circumferential directions", () => {
  const circumference = 2 * Math.PI * .1;
  for (const direction of [1, -1]) {
    const vertical = new PipeRunoffSurface(cylinder([0, 0, direction], [1, 0, 0], [0, 1, 0]), circumference);
    for (const u of [-circumference / 4, 0, circumference / 4, circumference]) {
      near(vertical.downhill(u, .4), [0, -direction]);
    }
  }
  const horizontal = new PipeRunoffSurface(cylinder([1, 0, 0], [0, 0, 1], [0, -1, 0]), circumference);
  near(horizontal.point(0, .4), [.4, 0, .1], 1e-12);
  near(horizontal.point(circumference / 4, .4), [.4, -.1, 0], 1e-12);
  near(horizontal.downhill(0, .4), [0, 0]);
  near(horizontal.downhill(circumference / 2, .4), [0, 0]);
  near(horizontal.downhill(circumference / 4, .4), [1, 0]);
  near(horizontal.downhill(3 * circumference / 4, .4), [-1, 0]);
});

test("curved pipe coordinates remain periodic and finite at ring joins and derivative padding", () => {
  const radius = .03, bendRadius = .3, circumference = 2 * Math.PI * radius;
  const rings: RunoffRing[] = [0, Math.PI / 4, Math.PI / 2].map((angle, index) => ({
    center: [bendRadius * (1 - Math.cos(angle)), 0, bendRadius * Math.sin(angle)],
    radial: [Math.cos(angle), 0, -Math.sin(angle)], across: [0, 1, 0],
    radius: index === 1 ? .04 : radius, distance: bendRadius * angle,
  }));
  const before = structuredClone(rings), surface = new PipeRunoffSurface(rings, circumference);
  const distances = rings.flatMap(ring => [ring.distance - .0001, ring.distance, ring.distance + .0001]);
  for (const v of distances) for (const u of [-.37 * circumference, 0, .25 * circumference, circumference]) {
    const point = surface.point(u, v), down = surface.downhill(u, v);
    assert.ok(point.every(Number.isFinite) && down.every(Number.isFinite));
    near(surface.point(u + circumference, v), point, 1e-12);
    near(surface.downhill(u + circumference, v), down, 1e-6);
  }
  const expected = rings[1].center.map((value, axis) => value + rings[1].radial[axis] * .04);
  near(surface.point(0, rings[1].distance), expected, 1e-12);
  const returned = surface.point(0, 0);
  returned[0] = 100;
  near(surface.point(0, 0), [radius, 0, 0], 1e-12);
  assert.deepEqual(rings, before, "Geometry queries do not mutate the supplied sweep");
});

test("runoff is bounded, periodic and repeatable without fixing a stain pattern", () => {
  const radius = .01, length = .04, circumference = 2 * Math.PI * radius;
  const rings = cylinder([0, 0, 1], [1, 0, 0], [0, 1, 0], length, radius);
  const seams = [.01, .03], before = structuredClone({ rings, seams });
  const surface = new PipeRunoffSurface(rings, circumference);
  const runoff = createPipeRunoff(surface, seams, 57);
  const repeated = createPipeRunoff(surface, seams, 57);
  const empty = createPipeRunoff(surface, [], 57);
  for (const v of [-.002, 0, .01, .023, length, length + .002]) {
    for (const u of [-1.3 * circumference, 0, .23 * circumference, circumference]) {
      const value = runoff(u, v);
      assert.ok(Number.isFinite(value) && value >= 0 && value <= 1);
      assert.equal(repeated(u, v), value, "The same inputs produce the same intrinsic field");
      assert.ok(Math.abs(runoff(u + circumference, v) - value) < 1e-10);
      assert.equal(empty(u, v), 0, "Absent corrosion sources produce no runoff");
    }
  }
  assert.deepEqual({ rings, seams }, before);
});

test("seam transport follows world gravity when a vertical pipe is reversed", () => {
  const radius = .02, length = .2, circumference = 2 * Math.PI * radius;
  const rising = new PipeRunoffSurface(cylinder([0, 0, 1], [1, 0, 0], [0, 1, 0], length, radius), circumference);
  const falling = new PipeRunoffSurface(cylinder([0, 0, -1], [1, 0, 0], [0, 1, 0], length, radius), circumference);
  const forwards = createPipeRunoff(rising, [length / 2], 41);
  const backwards = createPipeRunoff(falling, [length / 2], 41);
  for (const u of [0, .21 * circumference, .58 * circumference, -.17 * circumference]) {
    assert.ok(forwards(u, .03) > backwards(u, .03), "The low-V side receives transported material when V rises in world space");
    assert.ok(backwards(u, .17) > forwards(u, .17), "Reversing world gravity changes which axial side receives transport");
  }
});

test("pipe runoff rejects nonfinite, unordered and degenerate sweep inputs", () => {
  const valid = cylinder([0, 0, 1], [1, 0, 0], [0, 1, 0]);
  const invalid: RunoffRing[][] = [[], valid.slice(0, 1)];
  for (const change of [
    (rings: RunoffRing[]) => { rings[0].distance = .1; },
    (rings: RunoffRing[]) => { rings[1].distance = 0; },
    (rings: RunoffRing[]) => { rings[1].radius = 0; },
    (rings: RunoffRing[]) => { rings[1].center[0] = NaN; },
    (rings: RunoffRing[]) => { rings[1].radial = [0, 0, 0]; },
    (rings: RunoffRing[]) => { rings[1].across = [...rings[1].radial]; },
  ]) {
    const rings = structuredClone(valid);
    change(rings);
    invalid.push(rings);
  }
  for (const rings of invalid) assert.throws(() => new PipeRunoffSurface(rings, .6), /finite nondegenerate rings/);
  for (const circumference of [0, -1, NaN, Infinity])
    assert.throws(() => new PipeRunoffSurface(valid, circumference), /positive circumference/);
});

test("runoff rejects invalid sources and degeneracy between individually valid rings", () => {
  const rings = cylinder([0, 0, 1], [1, 0, 0], [0, 1, 0], .2, .02);
  const circumference = 2 * Math.PI * .02;
  const surface = new PipeRunoffSurface(rings, circumference);
  for (const seams of [[NaN], [Infinity], [-Infinity], [.1, NaN]])
    assert.throws(() => createPipeRunoff(surface, seams, 1), /finite seams and seed/);
  for (const seed of [NaN, Infinity, -Infinity]) for (const seams of [[], [.1]])
    assert.throws(() => createPipeRunoff(surface, seams, seed), /finite seams and seed/);
  const collapsed = structuredClone(rings);
  collapsed[1].radial = [-1, 0, 0];
  assert.throws(() => createPipeRunoff(new PipeRunoffSurface(collapsed, circumference), [.1], 1), /finite nondegenerate interpolated surface/);
});
