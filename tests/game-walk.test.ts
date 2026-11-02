import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CollisionWorld, type Vec3 } from "../game/collision.ts";
import { stepPlayer, type PlayerShape, type PlayerState } from "../game/controller.ts";
import { readGlbTriangles } from "../game/glb.ts";
import { WalkGrid, walk } from "../game/walk.ts";

const dir = "game/public/maps/kiln/";
interface Meta { player: PlayerShape; markers: { kind: string; position: Vec3 }[] }
let meta: Meta, world: CollisionWorld, grid: WalkGrid;
const marker = (kind: string, i = 0) => meta.markers.filter((m) => m.kind === kind)[i].position;

describe("Kiln played from its exported collision GLB", () => {
  before(() => {
    meta = JSON.parse(readFileSync(dir + "og_kiln.game.json", "utf8"));
    const bytes = readFileSync(dir + "og_kiln.collision.glb");
    const { positions, indices } = readGlbTriangles(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
    world = new CollisionWorld(positions, indices);
    grid = new WalkGrid(world, meta.player);
  });
  for (const [name, from, to, site] of [
    ["T spawn to A", "attacker_spawn", "site", 0], ["T spawn to B", "attacker_spawn", "site", 1],
    ["CT spawn to A", "defender_spawn", "site", 0], ["CT spawn to B", "defender_spawn", "site", 1],
  ] as const) {
    it(`walks ${name}`, () => {
      const result = walk(world, meta.player, grid, marker(from), marker(to, site));
      assert.ok(result.reached, `${result.reason} at ${result.end.map((n) => n.toFixed(1))}`);
      // CT rotations should beat the attackers' approach by a clear margin.
      assert.ok(result.seconds < (from === "defender_spawn" ? 10 : 20), `${result.seconds.toFixed(1)} s`);
    });
  }
  it("cannot walk straight through the walls between spawns", () => {
    const state: PlayerState = { position: [...marker("attacker_spawn")], verticalSpeed: 0, grounded: true };
    const goal = marker("defender_spawn");
    for (let i = 0; i < 60 * 30; i++)
      stepPlayer(world, meta.player, state, { wish: [goal[0] - state.position[0], goal[2] - state.position[2]] }, 1 / 60);
    assert.ok(Math.hypot(goal[0] - state.position[0], goal[2] - state.position[2]) > 10);
    assert.ok(state.position[1] > world.min[1] - 1, "fell out of the world");
  });
});
