import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compile, parseAml, collisionMesh } from 'levelspec';
import { Ray, Vector3 } from 'three';

/** Measures actual physical support through public collision output. */
function support(level: Awaited<ReturnType<typeof compile>>, x: number, y: number): number {
  const mesh = collisionMesh(level), ray = new Ray(new Vector3(x, y, 4), new Vector3(0, 0, -1));
  let height = -Infinity;
  for (let t = 0; t < mesh.indices.length; t += 3) {
    const points = mesh.indices.slice(t, t + 3).map(i => new Vector3(...mesh.positions.slice(i * 3, i * 3 + 3)));
    const hit = ray.intersectTriangle(points[0], points[1], points[2], false, new Vector3());
    if (hit) height = Math.max(height, hit.z);
  }
  return height;
}

for (const underside of ['filled', 'sloped', 'stepped', 'custom', 'separate']) {
  test(`native ${underside} stairs preserve five independently expected horizontal treads`, async () => {
    const document = parseAml(`<architecture version="1" id="flight" validation="premap">
      <path id="axis" points="0 0 0; 3 0 1"/>
      <path id="soffit" points="0 -0.3 0; 3 0.5 0"/>
      <stairs id="flight" path="axis" width="1" count="5" thickness="0.25" underside="${underside}" ${underside === 'custom' ? 'underside-profile="soffit"' : ''}/>
    </architecture>`);
    const level = await compile(document, { navigation: false });
    assert.deepEqual(level.diagnostics.filter(d => d.severity === 'error'), []);
    for (let i = 0; i < 5; i++) {
      for (const fraction of [.2, .8]) assert.ok(Math.abs(support(level, (i + fraction) * .6, 0) - (i + 1) * .2) < 1e-5);
    }
  });
}

test('descending authored flights retain the intended tread elevations', async () => {
  const level = await compile(parseAml('<architecture version="1" id="descending"><path id="axis" points="0 0 1; 3 0 0"/><stairs id="flight" path="axis" width="1" count="5"/></architecture>'), { navigation: false });
  assert.deepEqual(level.diagnostics.filter(d => d.severity === 'error'), []);
  for (let i = 0; i < 5; i++) assert.ok(Math.abs(support(level, (i + .5) * .6, 0) - (5 - i) * .2) < 1e-5);
});

/** Signed-volume integration is independent of the flight construction algorithm. */
function volume(level: Awaited<ReturnType<typeof compile>>): number {
  const mesh = collisionMesh(level); let result = 0;
  for (let t = 0; t < mesh.indices.length; t += 3) {
    const [a, b, c] = mesh.indices.slice(t, t + 3).map(i => new Vector3(...mesh.positions.slice(i * 3, i * 3 + 3)));
    result += a.dot(new Vector3().crossVectors(b, c)) / 6;
  }
  return result;
}

for (const [underside, thickness, expected] of [['filled', .3, 2.7], ['sloped', .3, 1.2], ['stepped', .3, .9], ['separate', .1, .3], ['custom', .3, 1.65]] as const) {
  test(`${underside} underside has independently derived occupied volume`, async () => {
    const level = await compile(parseAml(`<architecture version="1" id="volume" validation="premap"><path id="axis" points="0 0 0; 3 0 1"/><path id="soffit" points="0 -0.2 0; 3 0.3 0"/><stairs id="stairs" path="axis" width="1" count="5" thickness="${thickness}" underside="${underside}" ${underside === 'custom' ? 'underside-profile="soffit"' : ''}/></architecture>`), { navigation: false });
    assert.deepEqual(level.diagnostics.filter(d => d.severity === 'error'), []);
    assert.ok(Math.abs(volume(level) - expected) < 1e-5, `${volume(level)} != ${expected}`);
  });
}

test('nonlinear ramp retains authored intermediate elevations', async () => {
  const level = await compile(parseAml('<architecture version="1" id="ramp"><path id="axis" points="0 0 0; 1 0 0.2; 3 0 1"/><ramp id="ramp" path="axis" width="1"/></architecture>'), { navigation: false });
  assert.deepEqual(level.diagnostics.filter(d => d.severity === 'error'), []);
  assert.ok(Math.abs(support(level, 1, 0) - .2) < 1e-5);
});

test('stair placements preserve horizontal treads and scaled maximum risers', async () => {
  const body = '<path id="axis" points="0 0 0; 3 0 1"/><definition id="module"><stairs id="stairs" path="axis" width="1" maximum-riser="0.2"/></definition>';
  const level = await compile(parseAml(`<architecture version="1" id="scaled">${body}<instance id="i" ref="module" scale="2 1 2"/></architecture>`), { navigation: false });
  assert.deepEqual(level.diagnostics.filter(d => d.severity === 'error'), []);
  assert.ok(Math.abs(support(level, .3, 0) - .2) < 1e-5);
  const tilted = await compile(parseAml(`<architecture version="1" id="tilted">${body}<instance id="i" ref="module" rotation="10 0 0"/></architecture>`), { navigation: false });
  assert.ok(tilted.diagnostics.some(d => d.objects.includes('i/stairs') && d.severity === 'error'));
});

test('invalid custom undersides, conflicting counts and admission budgets fail without mutating input', async () => {
  for (const attributes of ['count="5" maximum-riser="0.2"', 'count="5" underside="custom" underside-profile="bad"', 'count="5" thickness="0"']) {
    const document = parseAml(`<architecture version="1" id="invalid"><path id="axis" points="0 0 0; 3 0 1"/><path id="bad" points="0 -0.2 0; 1 2 0; 3 0.3 0"/><stairs id="stairs" path="axis" width="1" ${attributes}/></architecture>`), before = structuredClone(document);
    const level = await compile(document, { navigation: false });
    assert.ok(level.diagnostics.some(d => d.objects.includes('stairs') && d.severity === 'error'));
    assert.deepEqual(document, before);
  }
  const document = parseAml('<architecture version="1" id="limit"><path id="axis" points="0 0 0; 3 0 1"/><stairs id="stairs" path="axis" width="1" count="10000"/></architecture>');
  const limited = await compile(document, { navigation: false, limits: { triangles: 100 } });
  assert.ok(limited.diagnostics.some(d => /before allocation/.test(d.message)));
  assert.deepEqual((await compile(parseAml('<architecture version="1" id="next"><box id="box"/></architecture>'), { navigation: false })).diagnostics, []);
});

test('curved custom soffits use the authored center distance and descending sloped audit uses native guides', async () => {
  const bent = await compile(parseAml('<architecture version="1" id="bend"><path id="axis" points="0 0 0; 2 0 0.5; 2 2 1"/><path id="soffit" points="0 -0.3 0; 4 0.4 0"/><stairs id="stairs" path="axis" width="1" count="5" underside="custom" underside-profile="soffit"/></architecture>'), { navigation: false });
  assert.deepEqual(bent.diagnostics.filter(d => d.severity === 'error'), []);
  const descending = await compile(parseAml('<architecture version="1" id="down"><path id="axis" points="0 0 1; 3 0 0"/><stairs id="stairs" path="axis" width="1" count="5" underside="sloped"/></architecture>'), { navigation: false });
  assert.deepEqual(descending.diagnostics.filter(d => d.severity === 'error'), []);
});

test('nonlinear sloped underside follows the actual guide in final collision', async () => {
  const level = await compile(parseAml('<architecture version="1" id="nonlinear"><path id="axis" points="0 0 0; 1 0 0.2; 3 0 1"/><stairs id="stairs" path="axis" width="1" count="5" thickness="0.3" underside="sloped"/></architecture>'), { navigation: false });
  assert.deepEqual(level.diagnostics.filter(d => d.severity === 'error'), []);
  const mesh = collisionMesh(level), ray = new Ray(new Vector3(1, 0, -1), new Vector3(0, 0, 1));
  let nearest = Infinity;
  for (let t = 0; t < mesh.indices.length; t += 3) {
    const [a, b, c] = mesh.indices.slice(t, t + 3).map(i => new Vector3(...mesh.positions.slice(i * 3, i * 3 + 3)));
    const hit = ray.intersectTriangle(a, b, c, false, new Vector3()); if (hit) nearest = Math.min(nearest, hit.z);
  }
  assert.ok(Math.abs(nearest + .1) < 1e-5);
});

test('native width profiles and paired rails retain independently measured taper widths', async () => {
  for (const flight of ['<stairs id="stairs" path="axis" width-profile="width" count="5"/>', '<stairs id="stairs" left="left" right="right" count="5"/>']) {
    const level = await compile(parseAml(`<architecture version="1" id="taper"><path id="axis" points="0 0 0; 3 0 1"/><path id="width" points="0 1 0; 3 2 0"/><path id="left" points="0 0.5 0; 3 1 1"/><path id="right" points="0 -0.5 0; 3 -1 1"/>${flight}</architecture>`), { navigation: false });
    assert.deepEqual(level.diagnostics.filter(d => d.severity === 'error'), []);
    assert.ok(Math.abs(support(level, .3, .54) - .2) < 1e-5); assert.equal(support(level, .3, .56), -Infinity);
    assert.ok(Math.abs(support(level, 2.7, .94) - 1) < 1e-5); assert.equal(support(level, 2.7, .96), -Infinity);
  }
});

test('thin separate treads have no filled collision wedge', async () => {
  const level = await compile(parseAml('<architecture version="1" id="thin"><path id="axis" points="0 0 0; 3 0 1"/><stairs id="stairs" path="axis" width="1" count="5" thickness="0.1" underside="separate"/></architecture>'), { navigation: false });
  const mesh = collisionMesh(level), ray = new Ray(new Vector3(-1,0,.05), new Vector3(1,0,0));
  assert.deepEqual(level.diagnostics.filter(d => d.severity === 'error'), []);
  assert.ok(mesh.indices.length > 0);
  for (let t = 0; t < mesh.indices.length; t += 3) {
    const [a,b,c] = mesh.indices.slice(t,t+3).map(i=>new Vector3(...mesh.positions.slice(i*3,i*3+3)));
    assert.equal(ray.intersectTriangle(a,b,c,false,new Vector3()), null);
  }
});

test('flight inspection retains authored local horizontal tops and custom underside through placement', async () => {
  const level = await compile(parseAml('<architecture version="1" id="inspect"><path id="axis" points="0 0 0; 3 0 1"/><path id="soffit" points="0 -0.2 0; 3 0.3 0"/><definition id="module"><stairs id="flight" path="axis" width="1" count="5" underside="custom" underside-profile="soffit"/></definition><instance id="placed" ref="module" position="5 8 2" rotation="0 0 90"/></architecture>'), { navigation: false });
  const profiles = level.sourceProfiles!.filter(p => p.object === 'placed/flight');
  const top = profiles.find(p => p.role.includes('Walking top'))!;
  assert.equal(top.closed, false);
  for (let i = 0; i < 5; i++) {
    assert.ok(Math.abs(top.points[i*2][0] - i*.6) < 1e-5);
    assert.ok(Math.abs(top.points[i*2+1][0] - (i+1)*.6) < 1e-5);
    for (const point of top.points.slice(i*2,i*2+2)) assert.ok(Math.abs(point[1] - (i+1)*.2) < 1e-5);
  }
  assert.deepEqual(profiles.find(p => p.role.includes('Custom underside'))!.points, [[0,-.2,0],[3,.3,0]]);
});
