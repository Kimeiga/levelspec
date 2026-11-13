import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Ray, Vector3 } from 'three';
import { compile, parseAml, collisionMesh } from 'levelspec';

/** Returns the nearest actual physical face on a ray. */
function distance(level: Awaited<ReturnType<typeof compile>>, origin: number[], direction: number[]): number {
  const mesh = collisionMesh(level), ray = new Ray(new Vector3(...origin), new Vector3(...direction).normalize());
  let result = Infinity;
  for (let t = 0; t < mesh.indices.length; t += 3) {
    const [a, b, c] = mesh.indices.slice(t, t + 3).map(i => new Vector3(...mesh.positions.slice(i * 3, i * 3 + 3)));
    const hit = ray.intersectTriangle(a, b, c, false, new Vector3());
    if (hit) result = Math.min(result, hit.distanceTo(ray.origin));
  }
  return result;
}

const host = '<path id="axis" points="0 0 1; 3 0 0"/><stairs id="stairs" path="axis" width="1" count="5"/>';

test('partial descending-flight enclosures preserve authored left and signed outward offset', async () => {
  const level = await compile(parseAml(`<architecture version="1" id="side">${host}<enclosure id="parapet" host="stairs" side="left" construction="parapet" start="0.6" end="2.4" offset="0.2" thickness="0.1" height="1"/></architecture>`), { navigation: false });
  assert.deepEqual(level.diagnostics.filter(d => d.severity === 'error'), []);
  assert.ok(Math.abs(distance(level, [1.5, 2, 1.3], [0, -1, 0]) - 1.25) < 1e-5);
  assert.equal(distance(level, [.3, 2, 1.3], [0, -1, 0]), Infinity);
  assert.equal(distance(level, [2.7, 2, 1.3], [0, -1, 0]), Infinity);
  assert.equal(distance(level, [-1, 0, 1.5], [1, 0, 0]), Infinity, 'Entrance is never implicitly enclosed');
});

test('railings contain native open gaps rather than a filled collision barrier', async () => {
  const source = `<architecture version="1" id="railing">${host}<profile id="rail-section" points="-0.04 -0.04; 0.04 -0.04; 0.04 0.04; -0.04 0.04"/><profile id="post-section" points="-0.03 -0.03; 0.03 -0.03; 0.03 0.03; -0.03 0.03"/><enclosure id="rail" host="stairs" side="left" construction="railing" height="1"><rail profile="rail-section" top-offset="0"/><posts profile="post-section" maximum-spacing="1"/></enclosure></architecture>`;
  const level = await compile(parseAml(source), { navigation: false });
  assert.deepEqual(level.diagnostics.filter(d => d.severity === 'error'), []);
  assert.equal(distance(level, [.5, 2, 1.3], [0, -1, 0]), Infinity);
  assert.ok(Number.isFinite(distance(level, [1, 2, 1.2], [0, -1, 0])), 'Authored post is physical');
});

test('footprint hole-edge attachments and explicit returns remain hosted native geometry', async () => {
  const level = await compile(parseAml('<architecture version="1" id="footprint"><profile id="floor" points="0 0; 6 0; 6 6; 0 6"><hole points="2 2; 2 4; 4 4; 4 2"/></profile><slab id="slab" profile="floor"/><enclosure id="curb" host="slab" loop="1" edge="0" construction="curb" height="0.3" thickness="0.1" start-return="0.5"/></architecture>'), { navigation: false });
  assert.deepEqual(level.diagnostics.filter(d => d.severity === 'error'), []);
  assert.ok(Number.isFinite(distance(level, [1, 3, .2], [1, 0, 0])));
  assert.equal(distance(level, [3, 3, 1], [0, 0, -1]), Infinity, 'The hole is not filled');
});

test('explicit returns have physical extent away from the main edge', async () => {
  const source = '<architecture version="1" id="return"><profile id="floor" points="0 0; 6 0; 6 6; 0 6"><hole points="2 2; 2 4; 4 4; 4 2"/></profile><slab id="slab" profile="floor"/><enclosure id="curb" host="slab" loop="1" edge="0" construction="curb" height="0.3" thickness="0.1" start-return="0.5"/></architecture>';
  const returned = await compile(parseAml(source), { navigation: false }), plain = await compile(parseAml(source.replace(' start-return="0.5"', '')), { navigation: false });
  assert.deepEqual(returned.diagnostics.filter(d => d.severity === 'error'), []);
  assert.ok(Math.abs(distance(returned, [1.75, 1, .2], [0, 1, 0]) - .95) < 1e-5);
  assert.equal(distance(plain, [1.75, 1, .2], [0, 1, 0]), Infinity);
});

test('absolute profiled enclosure tops remain independent from actual descending tread bottoms', async () => {
  const level = await compile(parseAml(`<architecture version="1" id="top">${host}<path id="top" points="0 1.5 0; 3 1.5 0"/><enclosure id="wall" host="stairs" side="left" top="top" thickness="0.1"/></architecture>`), { navigation: false });
  assert.deepEqual(level.diagnostics.filter(d => d.severity === 'error'), []);
  assert.ok(Math.abs(distance(level, [1.5, .5, 3], [0, 0, -1]) - 1.5) < 1e-5);
  assert.ok(Math.abs(distance(level, [1.5, 2, .5], [0, -1, 0]) - 1.5) < 1e-5, 'Below the tread, the first hit is the stair edge rather than the enclosure');
  assert.ok(Number.isFinite(distance(level, [1.5, 2, .7], [0, -1, 0])));
});

test('explicit start barrier offsets outward and shares its host physical assembly', async () => {
  const level = await compile(parseAml(`<architecture version="1" id="barrier">${host}<enclosure id="barrier" host="stairs" side="start" offset="1" thickness="0.1" height="1"/></architecture>`), { navigation: false });
  assert.deepEqual(level.diagnostics.filter(d => d.severity === 'error'), []);
  assert.ok(Math.abs(distance(level, [-2, 0, 1.5], [1, 0, 0]) - .95) < 1e-5);
  assert.ok(level.provenance.stairs.assembly);
  assert.equal(level.provenance.barrier.assembly, level.provenance.stairs.assembly);
  assert.ok(level.provenance[level.provenance.stairs.assembly!].contributors.includes("stairs"));
  assert.ok(level.provenance[level.provenance.stairs.assembly!].contributors.includes("barrier"));
});

test('right and reflected attachments retain signed authored sides', async () => {
  const source = `<architecture version="1" id="sides">${host.slice(0, host.indexOf('<stairs'))}<definition id="module">${host.slice(host.indexOf('<stairs'))}<enclosure id="wall" host="stairs" side="right" offset="-0.1" thickness="0.1" height="1"/></definition><instance id="i" ref="module" scale="1 -1 1"/></architecture>`;
  const level = await compile(parseAml(source), { navigation: false });
  assert.deepEqual(level.diagnostics.filter(d => d.severity === 'error'), []);
  assert.ok(Math.abs(distance(level, [1.5, 2, 1.3], [0, -1, 0]) - 1.55) < 1e-5);
});

test('enclosure apertures cut complete returns using explicit host-local placement', async () => {
  const body = '<profile id="floor" points="0 0; 6 0; 6 6; 0 6"><hole points="2 2; 2 4; 4 4; 4 2"/></profile><slab id="slab" profile="floor"/><enclosure id="curb" host="slab" loop="1" edge="0" construction="curb" height="0.5" thickness="0.1" start-return="0.5"/>';
  const level = await compile(parseAml(`<architecture version="1" id="cut">${body}<opening id="hole" host="curb" shape="circle" center="1.75 0.25" radius="0.15"/></architecture>`), { navigation: false });
  assert.deepEqual(level.diagnostics.filter(d => d.severity === 'error'), []);
  assert.equal(distance(level, [1.75, 1, .25], [0, 1, 0]), Infinity);
  assert.ok(Number.isFinite(distance(level, [1.55, 1, .25], [0, 1, 0])));
});

test('implicit attachment boundaries obey expansion budgets and recover after failure', async () => {
  const document = parseAml('<architecture version="1" id="budget"><profile id="p" points="0 0; 3 0; 3 3; 0 3"/><slab id="floor" profile="p"/><enclosure id="wall" host="floor" edge="0" height="1"/></architecture>');
  const limited = await compile(document, { navigation: false, limits: { elements: 2 } });
  assert.ok(limited.diagnostics.some(d => d.code === 'AML_COMPLEXITY'));
  const good = await compile(document, { navigation: false });
  assert.deepEqual(good.diagnostics.filter(d => d.severity === 'error'), []);
});

test('invalid enclosure spans, profiled tops and post spacing fail at their source', async () => {
  for (const attributes of ['start="4"', 'start="1" end="0.5"', 'height="0"', 'top="bad"']) {
    const level = await compile(parseAml(`<architecture version="1" id="invalid">${host}<path id="bad" points="0 0 0; 3 0 0"/><enclosure id="wall" host="stairs" ${attributes}/></architecture>`), { navigation: false });
    assert.ok(level.diagnostics.some(d => d.severity === 'error' && d.objects.includes('wall') && d.source?.line));
  }
  const level = await compile(parseAml(`<architecture version="1" id="posts">${host}<profile id="p" points="-0.02 -0.02; 0.02 -0.02; 0.02 0.02; -0.02 0.02"/><enclosure id="rail" host="stairs" construction="railing"><rail profile="p"/><posts profile="p" maximum-spacing="0"/></enclosure></architecture>`), { navigation: false });
  assert.ok(level.diagnostics.some(d => d.severity === 'error' && d.objects.includes('rail')));
});

test('attachment cancellation releases native geometry and the next compilation recovers', async () => {
  const document = parseAml(`<architecture version="1" id="cancel">${host}<enclosure id="wall" host="stairs"/></architecture>`), before = structuredClone(document), controller = new AbortController();
  await assert.rejects(compile(document, { navigation: false, signal: controller.signal, onProgress: stage => { if (stage === 'Composing') controller.abort(); } }), { name: 'AbortError' });
  const good = await compile(document, { navigation: false }); assert.deepEqual(good.diagnostics.filter(d => d.severity === 'error'), []); assert.deepEqual(document, before);
});

test('railing returns retain open gaps and profiled top steps retain vertical rails', async () => {
  const body = '<profile id="floor" points="0 0; 6 0; 6 4; 0 4"/><slab id="slab" profile="floor"/><profile id="rail" points="-0.04 -0.04; 0.04 -0.04; 0.04 0.04; -0.04 0.04"/><profile id="post" points="-0.03 -0.03; 0.03 -0.03; 0.03 0.03; -0.03 0.03"/>';
  const enclosure = '<enclosure id="edge" host="slab" edge="0" construction="railing" height="1" start-return="1"><rail profile="rail"/><posts profile="post" maximum-spacing="1"/></enclosure>';
  const returned = await compile(parseAml(`<architecture version="1" id="returned">${body}${enclosure}</architecture>`), { navigation: false });
  const plain = await compile(parseAml(`<architecture version="1" id="plain">${body}${enclosure.replace(' start-return="1"', '')}</architecture>`), { navigation: false });
  assert.deepEqual(returned.diagnostics.filter(d => d.severity === 'error'), []);
  assert.ok(Math.abs(distance(returned, [-1,.5,1], [1,0,0]) - .96) < 1e-5);
  assert.equal(distance(returned, [-1,.5,.5], [1,0,0]), Infinity);
  assert.equal(distance(plain, [-1,.5,1], [1,0,0]), Infinity);
  const stepped = await compile(parseAml(`<architecture version="1" id="step">${body}<path id="top" points="0 1 0; 1 1 0; 1 1.5 0; 6 1.5 0"/><enclosure id="edge" host="slab" edge="0" construction="railing" top="top"><rail profile="rail"/></enclosure></architecture>`), { navigation: false });
  assert.deepEqual(stepped.diagnostics.filter(d => d.severity === 'error'), []);
  assert.equal(distance(stepped, [.75,-1,1.25], [0,1,0]), Infinity);
  assert.equal(distance(stepped, [.75,-1,1.375], [0,1,0]), Infinity);
  assert.ok(Number.isFinite(distance(stepped, [.75,-1,1], [0,1,0])));
  assert.ok(Number.isFinite(distance(stepped, [1,-1,1.25], [0,1,0])));
  assert.ok(Number.isFinite(distance(stepped, [1.25,-1,1.5], [0,1,0])));
});

test('bent host returns retain authored metric length rather than miter scale', async () => {
  const level = await compile(parseAml('<architecture version="1" id="bend"><path id="axis" points="0 0 0; 2 0 0.5; 2 2 1"/><stairs id="stairs" path="axis" width="1" count="5"/><enclosure id="edge" host="stairs" side="left" start="1.5" end="2.5" thickness="0.1" start-return="0.5"/></architecture>'), { navigation: false });
  assert.deepEqual(level.diagnostics.filter(d => d.severity === 'error'), []);
  const mesh = collisionMesh(level), xs: number[] = [];
  for (let t = 0; t < mesh.surfaces.length; t++) if (level.surfaces[mesh.surfaces[t]].object === 'edge') {
    for (const index of mesh.indices.slice(t*3,t*3+3)) xs.push(mesh.positions[index*3]);
  }
  assert.ok(xs.length > 0);
  assert.ok(Math.abs(Math.min(...xs) - (1.5 - .55 / Math.sqrt(2))) < 1e-5);
});
