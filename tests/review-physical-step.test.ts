import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compile, parseAml, collisionMesh } from 'levelspec';
import { prepareInspectionWalk } from '../review/walk.ts';

/** Creates a real physical ledge with an intentionally optimistic flat navigation report. */
async function ledge(height: number) {
  const level = await compile(parseAml(`<architecture version="1" id="ledge" validation="premap"><profile id="base" points="0 0; 4 0; 4 4; 0 4"/><profile id="upper" points="2 0; 4 0; 4 4; 2 4"/><assembly id="solid"><slab id="floor" profile="base"/><slab id="ledge" profile="upper" elevation="${height}" thickness="${height}"/></assembly></architecture>`));
  level.navigation = { ...level.navigation!, positions: [0,0,.01,4,0,.01,4,4,.01,0,4,.01], indices: [0,1,2,0,2,3] };
  return level;
}

test('capsule step support uses the physical edge hemisphere rather than smoothed navigation height', async () => {
  const level = await ledge(1 / 6), before = structuredClone(level.physicalMesh);
  const prepared = prepareInspectionWalk(level, { feet: [1,2,.01], yaw: 0, pitch: 0 }); assert.ok(prepared.ok);
  let position = prepared.pose.feet;
  for (let i = 0; i < 20; i++) position = prepared.surface.move(position, .04, 0);
  assert.ok(Math.abs(position[0] - 1.8) < 1e-5);
  // Authored linear dimensions normalize to millimeters: .167 here, not a derived snap.
  const expected = .167 + Math.sqrt(.25 ** 2 - .2 ** 2) - .25 + .01;
  assert.ok(Math.abs(position[2] - expected) < 1e-5, `${position[2]} != ${expected}`);
  assert.deepEqual(level.physicalMesh, before);
});

test('physical step acquisition cannot climb a high ledge through incremental substeps', async () => {
  for (const height of [.44, .6]) {
    const level = await ledge(height), prepared = prepareInspectionWalk(level, { feet: [1,2,.01], yaw: 0, pitch: 0 }); assert.ok(prepared.ok);
    let position = prepared.pose.feet;
    for (let i = 0; i < 50; i++) position = prepared.surface.move(position, .04, 0);
    if (height < .45) { assert.ok(Math.abs(position[0] - 3) < 1e-5); assert.ok(Math.abs(position[2] - .45) < 1e-5); }
    else { assert.ok(position[0] <= 1.75001); assert.ok(position[2] < .02); }
  }
});

test('supplied continuous slope navigation uses physical gradient contact with zero step height', async () => {
  for (const [gx, gy] of [[.5,0],[.3,.4]]) {
    const level = await compile(parseAml(`<architecture version="1" id="slope"><player step="0"/><profile id="p" dimensions="3" points="0 0 0; 4 0 ${4*gx}; 4 4 ${4*(gx+gy)}; 0 4 ${4*gy}"/><slab id="floor" profile="p" thickness="0.2"/></architecture>`));
    const baseline = await compile(parseAml(`<architecture version="1" id="baseline"><profile id="p" dimensions="3" points="0 0 0; 4 0 ${4*gx}; 4 4 ${4*(gx+gy)}; 0 4 ${4*gy}"/><slab id="floor" profile="p"/></architecture>`));
    // Exact eroded ramp data isolates physical movement from Recast's climb-zero voxel limitation.
    const corners = [[.5,.5],[3.5,.5],[3.5,3.5],[.5,3.5]];
    level.navigation = { ...baseline.navigation!, settings: { ...baseline.navigation!.settings, player: { ...level.document.player } }, positions: corners.flatMap(([x,y]) => [x,y,x*gx+y*gy+.01]), indices: [0,1,2,0,2,3] };
    const z = gx + 2 * gy, expected = z + .25 * (Math.sqrt(1.25) - 1) + .01;
    const prepared = prepareInspectionWalk(level, { feet: [1,2,z], yaw: 0, pitch: 0 }); assert.ok(prepared.ok);
    assert.ok(Math.abs(prepared.pose.feet[2] - expected) < 1e-5);
    const moved = prepared.surface.move(prepared.pose.feet, .4, 0);
    assert.ok(Math.abs(moved[0] - 1.4) < 1e-5);
    assert.ok(Math.abs(moved[2] - expected - .4 * gx) < 1e-5);
  }
});

test('per-move collision blocks ceilings and unsupported gaps beneath optimistic navigation', async () => {
  for (const body of [
    '<profile id="p" points="0 0; 4 0; 4 4; 0 4"/><slab id="floor" profile="p"/><box id="ceiling" width="2" depth="4" height="0.2" position="2 0 1.5"/>',
    '<profile id="a" points="0 0; 1.8 0; 1.8 4; 0 4"/><profile id="b" points="2.6 0; 4 0; 4 4; 2.6 4"/><slab id="left" profile="a"/><slab id="right" profile="b"/>',
  ]) {
    const level = await compile(parseAml(`<architecture version="1" id="blocked">${body}</architecture>`));
    level.navigation = { ...level.navigation!, positions: [0,0,.01,4,0,.01,4,4,.01,0,4,.01], indices: [0,1,2,0,2,3] };
    const prepared = prepareInspectionWalk(level, { feet: [1,2,.01], yaw: 0, pitch: 0 }); assert.ok(prepared.ok);
    let position = prepared.pose.feet;
    for (let i = 0; i < 50; i++) position = prepared.surface.move(position, .04, 0);
    assert.ok(position[0] < 2, 'Physical collision/support overrides optimistic navigation');
  }
});

test('permitted physical steps remain supported when traversed in reverse', async () => {
  const level = await ledge(.44), prepared = prepareInspectionWalk(level, { feet: [3,2,.45], yaw: 180, pitch: 0 }); assert.ok(prepared.ok);
  let position = prepared.pose.feet;
  for (let i = 0; i < 50; i++) position = prepared.surface.move(position, -.04, 0);
  assert.ok(Math.abs(position[0] - 1) < 1e-5); assert.ok(Math.abs(position[2] - .01) < 1e-5);
});

test('touching closed native solids retain interior collision independently of open surfaces', async () => {
  const { physicalWalk } = await import('../review/physical-walk.ts');
  const level = await compile(parseAml('<architecture version="1" id="inside"><box id="one" width="10" depth="10" height="5"/><box id="two" width="10" depth="10" height="5" position="10 0 0"/><collision-surface id="open" points="0 0 0; 10 0 0; 10 10 0" triangles="0 1 2"/></architecture>'), { navigation: false });
  assert.equal(physicalWalk(level).blocked([5,5,.01], level.document.player), true);
});

test('near-limit slope support includes the full sphere lift for a larger radius', async () => {
  const { physicalWalk } = await import('../review/physical-walk.ts');
  const level = await compile(parseAml('<architecture version="1" id="steep"><player step="0" radius="0.35" slope="42"/><profile id="p" dimensions="3" points="0 0 0; 4 0 3.6; 4 4 3.6; 0 4 0"/><slab id="floor" profile="p"/></architecture>'), { navigation: false });
  const physical = physicalWalk(level), expected = .9 + .35 * (Math.sqrt(1.81) - 1) + .01;
  const feet = physical.resolve([1,2,.91], [1,2,.9], level.document.player);
  assert.ok(feet); assert.ok(Math.abs(feet[2] - expected) < 1e-5);
});

test('composed solid interiors survive mixed boolean and opening contributors', async () => {
  const { physicalWalk } = await import('../review/physical-walk.ts');
  const union = await compile(parseAml('<architecture version="1" id="union"><union id="solid"><box id="one" width="10" depth="10" height="5"/><box id="two" width="10" depth="10" height="5" position="6 0 0"/></union><box id="decorative" collidable="false" width="1" depth="1" height="1" position="30 0 0"/></architecture>'), { navigation: false });
  assert.equal(physicalWalk(union).blocked([5,1,.01], union.document.player), true);
  const selected = collisionMesh(union);
  assert.equal(selected.solidIds!.length, selected.indices.length / 3);
  assert.equal(new Set(selected.solidIds).size, 1);
  assert.ok(new Set(union.physicalMesh!.solidIds).size > 1, 'Noncollidable output is filtered with its own solid identity');
  const cut = await compile(parseAml('<architecture version="1" id="cut"><path id="axis" points="0 0 0; 20 0 0"/><wall id="wall" path="axis" thickness="10" height="5"/><opening id="door" host="wall" center="15 1.5" width="2" height="3"/></architecture>'), { navigation: false });
  assert.equal(physicalWalk(cut).blocked([5,1,.01], cut.document.player), true);
  assert.equal(physicalWalk(cut).blocked([15,1,.01], cut.document.player), false);
});

test('closed CSG cavities remain empty while their surrounding shell stays occupied', async () => {
  const { physicalWalk } = await import('../review/physical-walk.ts');
  const level = await compile(parseAml('<architecture version="1" id="cavity"><subtract id="shell"><box id="outer" width="10" depth="10" height="10"/><box id="void" width="8" depth="8" height="8" position="1 1 1"/></subtract></architecture>'), { navigation: false });
  assert.deepEqual(level.diagnostics.filter(d => d.severity === 'error'), []);
  const physical = physicalWalk(level);
  assert.equal(physical.blocked([5,5,1.01], level.document.player), false);
  assert.equal(physical.blocked([.5,5,1.01], level.document.player), true);
});
