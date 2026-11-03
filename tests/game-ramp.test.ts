import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { planToSpec } from "../src/authoring/plan.ts";
import { compile as compileLegacy } from "../src/core/compiler.ts";
import { mergeBoxes } from "../src/core/mesh.ts";
import { DEFAULTS } from "../src/core/types.ts";
import { migrateText } from "../tools/migration/convert.ts";
import { compile } from "../src/vector/compiler.ts";
import { toGLB } from "../src/vector/export.ts";
import { validateForRuntime } from "../src/vector/validate.ts";
import { CollisionWorld, type Vec3 } from "../game/collision.ts";
import { readGlbTriangles } from "../game/glb.ts";
import { stepPlayer, type PlayerShape, type PlayerState } from "../game/controller.ts";
import { twoRooms, turnPlan } from "./fixtures/ramp.ts";

function turnPoint([x, y, z]: Vec3, turns: number): Vec3 {
  let width = 16, height = 19.2;
  for (let i = 0; i < turns; i++) {
    [x, y] = [y, width - x];
    [width, height] = [height, width];
  }
  return [x, z, -y];
}

function assertLandingSupport(world: CollisionWorld, edges: number[], turns: number) {
  // Literal authored landing positions, including the 16 cm strip that used to
  // be removed by the wall inset. A route down the centre alone misses this.
  for (const x of edges) for (const y of [4.3, 4.5, 13.1, 13.3]) {
    const p = turnPoint([x, y, 1], turns);
    const hit = world.raycast(p, [0, -1, 0], 1.1);
    assert.ok(hit, `missing landing floor at ${p}`);
    assert.ok(hit.normal[1] > 0.99, `not a floor at ${p}`);
    assert.ok(hit.point[1] >= 0 && hit.point[1] <= 0.601);
  }
}

function traverse(world: CollisionWorld, shape: PlayerShape, start: Vec3, goal: Vec3) {
  const state: PlayerState = { position: start, verticalSpeed: 0, grounded: true };
  for (let i = 0; i < 240; i++) {
    const dx = goal[0] - state.position[0], dz = goal[2] - state.position[2];
    if (Math.hypot(dx, dz) < 0.08) break;
    stepPlayer(world, shape, state, { wish: [dx, dz] }, 1 / 60);
    assert.ok(state.position[1] >= -0.01, `fell below the floor: ${state.position}`);
  }
  assert.ok(Math.hypot(goal[0] - state.position[0], goal[2] - state.position[2]) < 0.1,
    `blocked before landing: ${state.position}`);
  assert.ok(Math.abs(state.position[1] - goal[1]) < 0.06, `wrong landing height: ${state.position}`);
}

function checkRamp(world: CollisionWorld, shape: PlayerShape, strip: string, turns: number) {
  const left = strip.indexOf("r") * 1.6, right = (strip.lastIndexOf("r") + 1) * 1.6;
  assertLandingSupport(world, [left + 0.08, right - 0.08], turns);
  for (const x of [left + 0.6, right - 0.6]) for (const downhill of [false, true]) {
    const start = turnPoint([x, downhill ? 14 : 3.6, downhill ? 0.6 : 0], turns);
    const goal = turnPoint([x, downhill ? 3.6 : 14, downhill ? 0 : 0.6], turns);
    traverse(world, shape, start, goal);
  }
}

describe("ramp landing collision", () => {
  for (const strip of ["...rr.....", "...rrr....", "..rrrr...."]) {
    for (const turns of [0, 1, 2, 3]) {
      it(`supports legacy ${strip} rotated ${turns} quarter turns`, () => {
        const text = turnPlan(twoRooms(strip), turns);
        const old = compileLegacy(planToSpec(text));
        const mesh = mergeBoxes(old.solids.filter((s) => !s.dynamic).map((s) => s.box));
        const positions = mesh.positions.flatMap((_, i, p) => i % 3 === 0 ? [p[i], p[i + 2], -p[i + 1]] : []);
        checkRamp(new CollisionWorld(positions, mesh.indices), { ...DEFAULTS.player, slope: 45 }, strip, turns);
      });
      it(`supports exported ${strip} rotated ${turns} quarter turns`, async () => {
        const { document } = migrateText(turnPlan(twoRooms(strip), turns));
        const level = await compile(document);
        const report = await validateForRuntime(level);
        assert.deepEqual(report.diagnostics.filter((d) => d.severity === "error"), []);
        const bytes = toGLB(level, { purpose: "collision" });
        const glb = readGlbTriangles(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
        checkRamp(new CollisionWorld(glb.positions, glb.indices), document.player, strip, turns);
      });
    }
  }
});
