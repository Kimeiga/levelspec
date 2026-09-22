import { test } from "node:test";
import assert from "node:assert/strict";
import { WalkClock } from "../walk-clock.ts";
import { NavigationSurface } from "../navigation.ts";

test("held input has the same speed at 144, 60, 20, 5, 2 and 1 Hz", () => {
  for (const hz of [144, 60, 20, 5, 2, 1]) {
    const clock = new WalkClock();
    clock.reset(0);
    let distance = 0;
    for (let frame = 1; frame <= hz; frame++) {
      distance += 3.4 * clock.consume((frame * 1000) / hz);
    }
    assert.ok(Math.abs(distance - 3.4) < 1e-8, `${hz} Hz: ${distance} metres`);
  }
});
test("press and release retain input held between sparse frames", () => {
  const clock = new WalkClock();
  clock.reset(0);
  clock.consume(100); // No held input before the press.
  const seconds = clock.consume(350) + clock.consume(700);
  assert.ok(Math.abs(seconds - 0.6) < 1e-8);
  assert.equal(clock.consume(700), 0);
});
test("suspension and explicit resets do not replay stale movement", () => {
  const clock = new WalkClock();
  assert.equal(clock.consume(5000), 0);
  clock.reset(7000);
  assert.equal(clock.consume(7100), 0.1);
  assert.equal(clock.consume(20000), 0);
  assert.equal(clock.consume(20016), 0.016);
  assert.equal(clock.consume(19900), 0);
  assert.equal(clock.consume(Number.NaN), 0);
  assert.equal(clock.consume(21000), 0);
});
test("a slow frame still respects the actual navigation boundary", () => {
  const nav = new NavigationSurface(
    {
      positions: [0, 0, 0, 4, 0, 0, 4, 4, 0, 0, 4, 0],
      indices: [0, 1, 2, 0, 2, 3],
    },
    [1, 1, 0],
  );
  const clock = new WalkClock();
  clock.reset(0);
  const point = nav.move([1, 1, 0], 3.4 * clock.consume(1000), 0);
  assert.ok(point[0] > 3.94 && point[0] <= 4 + 1e-8, JSON.stringify(point));
  assert.ok(nav.locate(point));
  assert.deepEqual(nav.move(point, 0.85, 0), point);
});
test("multi-second software-rendered frames are not mistaken for suspension", () => {
  for (const milliseconds of [1200, 2500, 5000, 8000]) {
    const clock = new WalkClock();
    clock.reset(0);
    assert.equal(clock.consume(milliseconds), milliseconds / 1000);
  }
  const clock = new WalkClock();
  clock.reset(0);
  assert.equal(clock.consume(10001), 0);
});
