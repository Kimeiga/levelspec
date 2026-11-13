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

/** A closed room whose interior pillars share an edge without occupying the free walking space. */
async function enclosedRoom(pillarHeight = 3) {
  return compile(parseAml(`<architecture version="1" id="cavity" validation="premap">
    <player radius="0.35" height="1.8" step="0.3" slope="42"/>
    <profile id="walk-area" points="1 1; 11 1; 11 11; 1 11"/>
    <assembly id="room" coincident-material="retained-face">
      <subtract id="shell">
        <box id="outer" width="12" depth="12" height="6"/>
        <box id="void" width="10" depth="10" height="4.3" position="1 1 0.7"/>
      </subtract>
      <box id="pillar-a" width="1" depth="1" height="${pillarHeight}" position="8 8 0"/>
      <box id="pillar-b" width="1" depth="1" height="${pillarHeight}" position="9 9 0"/>
      <slab id="floor" profile="walk-area" elevation="1" thickness="0.3"/>
    </assembly>
  </architecture>`), { uvs: false });
}

test('closed native cavities remain walkable beside edge-touching solid details', async () => {
  const { physicalWalk } = await import('../review/physical-walk.ts');
  const level = await enclosedRoom();
  assert.deepEqual(level.diagnostics.filter(d => d.severity === 'error'), []);
  const physical = physicalWalk(level);
  assert.equal(physical.blocked([5,5,1.01], level.document.player), false);
  assert.equal(physical.blocked([.5,5,1.01], level.document.player), true);
  assert.equal(physical.blocked([8.5,8.5,1.01], level.document.player), true);
  const prepared = prepareInspectionWalk(level, { feet: [3,4,1.01], yaw: 0, pitch: 0 });
  assert.ok(prepared.ok, 'The empty enclosed room must admit the unchanged standing body');
  let position = prepared.pose.feet;
  for (let i = 0; i < 50; i++) position = prepared.surface.move(position, .04, 0);
  assert.ok(Math.abs(position[0] - 5) < 1e-5, 'Normal supported movement must cross the free room interior');
  assert.ok(Math.abs(position[2] - 1.01) < 1e-5);
});

test('partially filtered native boundaries do not infer containment from a remaining closed subset', async () => {
  const { physicalWalk } = await import('../review/physical-walk.ts');
  const level = await enclosedRoom();
  assert.ok(level.surfaces.some(surface => surface.object === 'void'));
  const filtered = {
    ...level,
    surfaces: level.surfaces.map(surface => surface.object === 'void' ? { ...surface, collidable: false } : surface),
  };
  assert.ok(collisionMesh(filtered).indices.length < collisionMesh(level).indices.length);
  const physical = physicalWalk(filtered);
  assert.equal(physical.blocked([5,5,1.01], filtered.document.player), false,
    'A known solid identity is insufficient after collision selection removes its cavity boundary');
  assert.equal(physical.blocked([.1,5,1.01], filtered.document.player), true,
    'Retained exterior faces still block actual capsule contact');
});

test('remote edge-touching solids cannot turn empty room space into an occupied volume', async () => {
  const { physicalWalk } = await import('../review/physical-walk.ts');
  const level = await enclosedRoom(5), physical = physicalWalk(level);
  assert.deepEqual(level.diagnostics.filter(d => d.severity === 'error'), []);
  // These bodies are three meters west of the pillars; the middle containment ray meets their shared edge.
  for (const y of [8.307, 8.308, 8.309]) {
    assert.equal(physical.blocked([5,y,1.01], level.document.player), false, `Clear room space at y=${y}`);
  }
  assert.equal(physical.blocked([8.5,8.5,1.01], level.document.player), true);
  assert.equal(physical.blocked([9.5,9.5,1.01], level.document.player), true);
  assert.equal(physical.blocked([.5,5,1.01], level.document.player), true);
});

test('triangulated face seams preserve occupied-solid containment', async () => {
  const { physicalWalk } = await import('../review/physical-walk.ts');
  const level = await compile(parseAml('<architecture version="1" id="seam"><player radius="0.35" height="1.8"/><box id="block" width="10" depth="10" height="5"/></architecture>'), { navigation: false });
  const physical = physicalWalk(level);
  // The middle ray exits on the shared diagonal of two equally oriented triangles; all bodies are inside.
  for (const z of [.5715, .5725, .5735]) {
    assert.equal(physical.blocked([5,3,z], level.document.player), true);
  }
  assert.equal(physical.blocked([12,3,.5725], level.document.player), false);
});

test('runtime geometry without native solid identities retains verified closed-solid collision', async () => {
  const { physicalWalk } = await import('../review/physical-walk.ts');
  const level = await compile(parseAml('<architecture version="1" id="legacy"><box id="block" width="10" depth="10" height="5"/></architecture>'), { navigation: false });
  const unidentified = { ...level, physicalMesh: { ...level.physicalMesh!, solidIds: undefined } };
  const physical = physicalWalk(unidentified);
  assert.equal(physical.blocked([5,5,.01], unidentified.document.player), true);
  assert.equal(physical.blocked([12,5,.01], unidentified.document.player), false);
});
