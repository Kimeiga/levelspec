import { test } from "node:test";
import assert from "node:assert/strict";
import { bakeNavmesh, compile, ArchitectureBuilder, validateForRuntime } from "levelspec";
import { parseWalkPose, walkURL, prepareInspectionWalk, MAX_WALK_PITCH } from "../review/walk.ts";
import { WalkMotion } from "../review/walk-motion.ts";
import { navigationDoorway } from "./fixtures/navigation-doorway.ts";

/** Two disconnected real floors expose inspection-component selection without authored seed edits. */
async function fixture(obstruction?: "wall" | "ceiling" | "high-ceiling" | "visual" | "hidden") {
  const scene = new ArchitectureBuilder("walk-inspection");scene.document.validation="premap";scene.document.player.radius=.3;scene.document.player.height=1.8;
  scene.document.materials.push({id:"stone",color:"#aaaaaa",repeat:1,roughness:.8,metalness:0});
  for(const [id,x,z] of [["left",-6,0],["right",1,0],["right-upper",1,3]] as const){const profile=scene.profile(id+":profile",[[x,-3,z],[x+5,-3,z],[x+5,3,z],[x,3,z]]);scene.slab("rooms/"+id,profile.id,{material:"stone"});}
  scene.document.markers.push({id:"spawn",layer:"architecture",region:"rooms/left",position:[-3,0,0],kind:"attacker_spawn"});
  const baseline = await compile(scene.document, { navigation: false });
  const report = await validateForRuntime(baseline);
  assert.ok(report.navigation);
  if (obstruction) {
    const ceiling=obstruction==="ceiling" || obstruction==="high-ceiling";scene.box("rooms/"+obstruction,{position:ceiling?[1.5,-1.5,obstruction==="high-ceiling"?2.1:1.4]:[2.5,-.5,0],width:ceiling?3:1,depth:ceiling?3:1,height:ceiling?.2:3,material:"stone",collidable:obstruction!=="visual"});
  }
  const level = obstruction ? await compile(scene.document, { navigation: false }) : baseline;
  level.navigation = report.navigation;
  if (obstruction === "hidden") for (const surface of level.surfaces) if (surface.object === "rooms/hidden") surface.visible = false;
  return level;
}

test("inspection walk URL round-trips feet and degree orientation while preserving source context", () => {
  const pose = { feet: [3, -1, 0] as [number, number, number], yaw: 90, pitch: -25 };
  const url = new URL(walkURL("http://localhost/?source=demo&appearance=materials#detail", pose));
  assert.deepEqual(parseWalkPose(url.searchParams), pose);
  assert.equal(url.searchParams.get("source"), "demo");
  assert.equal(url.hash, "#detail");
  assert.equal(parseWalkPose(new URLSearchParams()), undefined);
  const invalidParameters: Record<string, string>[] = [
    { "walk-feet": "1 2" }, { "walk-feet": "NaN 2 3" }, { "walk-feet": "" },
    { "walk-feet": "1 2 3", "walk-yaw": "Infinity" },
    { "walk-feet": "1 2 3", "walk-pitch": "81" }, { "walk-yaw": "20" },
  ];
  for (const parameters of invalidParameters) assert.throws(() => parseWalkPose(new URLSearchParams(parameters)));
});

test("arbitrary inspection starts on another existing component without changing document or navigation", async () => {
  const level = await fixture();
  const before = structuredClone({ document: level.document, navigation: level.navigation });
  const result = prepareInspectionWalk(level, { feet: [3, 0, 0], yaw: 90, pitch: 10 });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.ok(Math.abs(result.pose.feet[2]) < .1);
  assert.equal(result.pose.yaw, 90);
  assert.equal(result.pose.pitch, 10);
  const moved = result.surface.move(result.pose.feet, 5, 0);
  assert.ok(moved[0] > 4, "A valid displacement must move meaningfully");
  assert.ok(moved[0] < 6, "Walk remains constrained at the eroded floor boundary");
  assert.equal(result.surface.locate([-3, 0, 0]), undefined, "Inspection does not join disconnected components");
  assert.deepEqual({ document: level.document, navigation: level.navigation }, before);
});

test("invalid inspection feet reject unsupported air, missing nav and nonfinite direct API poses", async () => {
  const level = await fixture();
  for (const feet of [[0, 0, 0], [3, 0, 1], [3, 0, -1], [NaN, 0, 0]] as [number, number, number][]) {
    assert.equal(prepareInspectionWalk(level, { feet, yaw: 0, pitch: 0 }).ok, false);
  }
  assert.equal(prepareInspectionWalk(level, { feet: [3, 0, 0], yaw: Infinity, pitch: 0 }).ok, false);
  assert.equal(prepareInspectionWalk(level, { feet: [3, 0, 0], yaw: 0, pitch: 90 }).ok, false);
  level.navigation = undefined;
  const result = prepareInspectionWalk(level, { feet: [3, 0, 0], yaw: 0, pitch: 0 });
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.message, /navigation/i);
});

test("real compiled walls and low ceilings reject a body even with an optimistic navigation surface", async () => {
  for (const obstruction of ["wall", "ceiling"] as const) {
    const level = await fixture(obstruction);
    const before = structuredClone({document: level.document, navigation: level.navigation});
    const result = prepareInspectionWalk(level, { feet: [3, 0, 0], yaw: 0, pitch: 0 });
    assert.equal(result.ok, false, obstruction);
    if (!result.ok) assert.match(result.message, /body|collision|intersect/i);
    assert.deepEqual({document: level.document, navigation: level.navigation}, before);
    const recovered = prepareInspectionWalk(level, { feet: [-3, 0, 0], yaw: 0, pitch: 0 });
    assert.equal(recovered.ok, true, "A failed placement does not prevent a subsequent valid start");
  }
});


test("stacked floors preserve requested height and reject unsupported intermediate height", async () => {
  const level = await fixture();
  const upper = prepareInspectionWalk(level, { feet: [3, 0, 3], yaw: 0, pitch: MAX_WALK_PITCH });
  assert.equal(upper.ok, true);
  if (!upper.ok) return;
  assert.ok(upper.pose.feet[2] >= 3 && upper.pose.feet[2] < 3.05, "Actual returned feet remain on upper floor");
  assert.deepEqual(parseWalkPose(new URL(walkURL("http://localhost/", upper.pose)).searchParams), upper.pose);
  assert.equal(prepareInspectionWalk(level, { feet: [3, 0, 1.5], yaw: 0, pitch: 0 }).ok, false);
  const near = prepareInspectionWalk(level, { feet: [3, 0, upper.pose.feet[2] + .099], yaw: 0, pitch: 0 });
  assert.equal(near.ok, true, "Within .10m support tolerance resolves to the actual navigation elevation");
  if (near.ok) assert.equal(near.pose.feet[2], upper.pose.feet[2]);
  assert.equal(prepareInspectionWalk(level, { feet: [3, 0, upper.pose.feet[2] + .101], yaw: 0, pitch: 0 }).ok, false);
});


test("placement uses full body radius and physical collision rather than rendering visibility", async () => {
  const wall = await fixture("wall");
  assert.equal(prepareInspectionWalk(wall, { feet: [2.3, 0, 0], yaw: 0, pitch: 0 }).ok, false, "Feet outside wall still overlap it with .30m player radius");
  assert.equal(prepareInspectionWalk(await fixture("visual"), { feet: [3, 0, 0], yaw: 0, pitch: 0 }).ok, true, "Noncolliding scenery does not block placement");
  assert.equal(prepareInspectionWalk(await fixture("hidden"), { feet: [3, 0, 0], yaw: 0, pitch: 0 }).ok, false, "Hidden physical solids still block placement");
});

test("finer navigation resolves a physically clear doorway without changing the standing body or geometry", async () => {
  const level = await compile(navigationDoorway(), { navigation: false });
  const physical = structuredClone({ document: level.document, mesh: level.mesh });
  const cacheKeys = new Set<string>();
  for (const cell of [0.125, 0.0625]) {
    level.navigation = await bakeNavmesh(level, { cell });
    cacheKeys.add(level.navigation.settings.cacheKey);
    const walk = prepareInspectionWalk(level, { feet: [3, 3, 0], yaw: 0, pitch: 0 });
    assert.equal(walk.ok, true);
    if (!walk.ok) return;
    const destination = walk.surface.move(walk.pose.feet, 2, 0);
    if (cell === 0.125) assert.ok(destination[0] < 3.85, "Coarse grid omits the physically clear throat");
    else assert.ok(Math.abs(destination[0] - 5) < 0.01, "Fine grid permits ordinary movement to the opposite side");
    assert.equal(level.navigation.settings.player.radius, 0.25);
    assert.equal(level.navigation.settings.player.height, 1.8);
    assert.equal(level.navigation.settings.cellHeight, 0.01);
    assert.equal(level.navigation.settings.sampleSpacing, 0.5);
    assert.deepEqual({ document: level.document, mesh: level.mesh }, physical);
  }
  assert.equal(cacheKeys.size, 2, "Changing resolution cannot reuse a differently configured bake");
});

test("fine navigation still blocks sub-body-width and low-headroom doorways", async () => {
  for (const [width, lowHeadroom] of [[0.4, false], [0.7, true]] as const) {
    const level = await compile(navigationDoorway(width, lowHeadroom), { navigation: { cell: 0.0625 } });
    const walk = prepareInspectionWalk(level, { feet: [3, 3, 0], yaw: 0, pitch: 0 });
    assert.equal(walk.ok, true, "Start remains supported before the obstruction");
    if (!walk.ok) return;
    assert.ok(walk.surface.move(walk.pose.feet, 2, 0)[0] < 3.85,
      `${width}m opening / low headroom ${lowHeadroom} must not admit the standing body`);
  }
});

/** Starts a real physical controller on the right-hand component. */
function motionAt(level: Awaited<ReturnType<typeof fixture>>, feet: [number, number, number] = [5.2, 0, 0]) {
  const prepared = prepareInspectionWalk(level, { feet, yaw: 0, pitch: 0 });
  assert.ok(prepared.ok);
  return new WalkMotion(level, prepared.pose.feet);
}
const idle = { forward: 0, right: 0, yaw: 0, jump: false, crouch: false };

test("FPS directions follow camera right at both cardinal yaws with normalized diagonals", async () => {
  const level = await fixture();
  for (const [yaw, right, dx, dy] of [[0, 1, 0, -.34], [0, -1, 0, .34], [Math.PI / 2, 1, .34, 0], [Math.PI / 2, -1, -.34, 0]]) {
    const motion = motionAt(level, [3, 0, 0]);
    motion.advance({ ...idle, yaw, right }, .1);
    assert.ok(Math.abs(motion.state.feet[0] - 3 - dx) < 1e-7);
    assert.ok(Math.abs(motion.state.feet[1] - dy) < 1e-7);
  }
  const diagonal = motionAt(level, [3, 0, 0]);
  diagonal.advance({ ...idle, forward: 1, right: 1 }, .1);
  assert.ok(Math.abs(Math.hypot(diagonal.state.feet[0] - 3, diagonal.state.feet[1]) - .34) < 1e-7);
});

test("manual jumping rises, cannot retrigger in air or while held, and lands; helper repeats", async () => {
  const level = await fixture();
  const before = structuredClone({ document: level.document, mesh: level.mesh, navigation: level.navigation });
  const motion = motionAt(level, [3, 0, 0]);
  const ground = motion.state.feet[2];
  let apex = ground, launches = 0, grounded = true;
  for (let i = 0; i < 180; i++) {
    motion.advance({ ...idle, jump: true }, 1 / 120);
    if (grounded && !motion.state.grounded) launches++;
    grounded = motion.state.grounded;
    apex = Math.max(apex, motion.state.feet[2]);
  }
  assert.equal(launches, 1);
  assert.ok(apex - ground > .60 && apex - ground < .69, "5.2m/s impulse under 20m/s² gravity");
  assert.equal(motion.state.feet[2], ground);
  assert.equal(motion.state.grounded, true);
  const single = motionAt(level, [3, 0, 0]);
  const retrigger = motionAt(level, [3, 0, 0]);
  for (let i = 0; i < 120; i++) {
    single.advance({ ...idle, jump: i === 0 }, 1 / 120);
    retrigger.advance({ ...idle, jump: i === 0 || i === 15 }, 1 / 120);
    assert.deepEqual(retrigger.state, single.state, "Second airborne press cannot change the ballistic trajectory");
  }
  launches = 0;
  for (let i = 0; i < 240; i++) {
    motion.advance(idle, 1 / 120, "jump");
    if (grounded && !motion.state.grounded) launches++;
    grounded = motion.state.grounded;
  }
  assert.ok(launches >= 3);
  motion.advance(idle, 1);
  assert.equal(motion.state.grounded, true);
  assert.deepEqual({ document: level.document, mesh: level.mesh, navigation: level.navigation }, before);
});

test("crouch uses authored capsule and eyes, cannot stand through a ceiling, and recovers outside", async () => {
  const level = await fixture("ceiling");
  const motion = motionAt(level);
  const feet = motion.state.feet;
  motion.advance({ ...idle, crouch: true }, 0);
  assert.equal(motion.state.height, level.document.player.crouch);
  assert.deepEqual(motion.state.feet, feet);
  assert.equal(motion.state.eye[2], feet[2] + level.document.player.crouch * .93);
  motion.advance({ ...idle, forward: -1, crouch: true }, 1.2);
  assert.ok(motion.state.feet[0] < 4, "Short capsule enters the test's optimistic navigation below the ceiling");
  motion.advance(idle, .1);
  assert.equal(motion.state.stance, "crouching", "Releasing crouch cannot expand into the ceiling");
  motion.advance({ ...idle, forward: 1 }, 1.5);
  motion.advance(idle, .01);
  assert.equal(motion.state.stance, "standing");
  motion.advance(idle, .01, "crouch");
  assert.equal(motion.state.stance, "crouching");
  motion.advance(idle, .01);
  assert.equal(motion.state.stance, "standing");
});

test("jump checks real overhead geometry and elevated horizontal body, preserving nav boundaries", async () => {
  const level = await fixture("high-ceiling");
  const grounded = motionAt(level);
  grounded.advance({ ...idle, forward: -1 }, .4);
  assert.ok(grounded.state.feet[0] < 4, "Standing control fits beneath overhead geometry");
  const motion = motionAt(level);
  motion.advance({ ...idle, jump: true }, .15);
  assert.ok(!motion.state.grounded);
  const x = motion.state.feet[0];
  motion.advance({ ...idle, forward: -1 }, .2);
  assert.ok(motion.state.feet[0] > 4.6, "Elevated capsule stops at overhead solid that admits standing movement");
  assert.ok(motion.state.feet[0] < x - .2, "Approach must move meaningfully toward the roof edge");
  motion.advance(idle, 1);
  assert.equal(motion.state.grounded, true);
  const gap = motionAt(await fixture(), [1.4, 0, 0]);
  gap.advance({ ...idle, forward: -1 }, 2, "jump");
  assert.ok(gap.state.feet[0] > 1, "Jump cannot bypass missing navigation support");
});

test("jump head stops below a physical ceiling and returns to support", async () => {
  const b = new ArchitectureBuilder("jump-ceiling");
  b.document.player.height = 1.8;
  b.profile("floor-plan", [[1,-3,0],[6,-3,0],[6,3,0],[1,3,0]]);
  b.slab("floor", "floor-plan");
  b.document.markers.push({id:"spawn",layer:"architecture",region:"floor",position:[3,0,0],kind:"attacker_spawn"});
  const level = await compile(b.document);
  b.box("overhead", { position: [1, -2, 2.1], width: 5, depth: 4, height: .2 });
  const roof = await compile(b.document, { navigation: false });
  roof.navigation = level.navigation;
  const motion = motionAt(roof, [3, 0, 0]);
  let apex = 0;
  for (let i = 0; i < 120; i++) {
    motion.advance({ ...idle, jump: i === 0 || i === 15 }, 1 / 120);
    apex = Math.max(apex, motion.state.feet[2]);
    assert.ok(motion.state.feet[2] + motion.state.height <= 2.1 + 1e-5);
  }
  assert.ok(apex > .1, "Ceiling test must observe an actual jump");
  assert.equal(motion.state.grounded, true);
});
