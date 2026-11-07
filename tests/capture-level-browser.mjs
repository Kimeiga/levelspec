/** Real renderer checks for capture source identity, fresh outputs and companion provenance. */
import assert from 'node:assert/strict';
import {mkdtemp, readFile, writeFile, rm, access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {captureLevel, validateViews} from '../tools/capture-level.mjs';
const view = {id: 'overview', position: [11,-17,8], target: [2,3,1], projection: 'orthographic', viewHeight: 20};
for (const id of ['../escape', '/absolute', '', 'a/b']) assert.throws(() => validateViews([{...view,id}]));
assert.throws(() => validateViews([view,view]));
assert.throws(() => validateViews([{...view,position:[NaN,0,0]}]));
const directory = await mkdtemp(join(tmpdir(),'levelspec-capture-'));
try {
  const original = await readFile(new URL('../examples/cli-starter.level.svgx', import.meta.url),'utf8');
  const {SceneBuilder, compile, toGLB} = await import('../src/vector/index.ts');
  const fixture = new SceneBuilder('capture-companion');
  fixture.group('mesh').box('crate', {position:[0,0,0],size:[1,1,1],material:'default',collision:'none'});
  const companion = toGLB(await compile(fixture.document,{navigation:false}));
  await writeFile(join(directory,'crate.glb'), companion);
  const text = original.replace('</level>', '<asset id="crate" src="crate.glb"/><prop id="crate-prop" layer="ground" shape="asset" asset="crate" position="2 2 0" rotation="0 0 0" scale="1 1 1" collision="none"/></level>');
  const broken = join(directory, 'broken.level.svgx');
  await writeFile(broken, text.replace('crate.glb', 'missing.glb'));
  const failed = join(directory, 'failed');
  await assert.rejects(captureLevel(broken, failed, [view]));
  await access(join(failed, 'failure.json'));
  await assert.rejects(access(join(failed, 'capture.json')), {code: 'ENOENT'});
  const hashes = [];
  for (let i=0;i<2;i++) {
    const source = join(directory,`source-${i}.level.svgx`);
    const bytes = text.replace('</level>',`<!-- distinct source ${i} --></level>`);
    await writeFile(source,bytes);
    const output = join(directory,`capture-${i}`);
    const result = await captureLevel(source,output,[view]);
    const hash = createHash('sha256').update(bytes).digest('hex');
    assert.equal(result.source,hash);
    assert.ok(Object.values(result.companions).includes(createHash('sha256').update(companion).digest('hex')));
    assert.ok((await readFile(join(output,'overview.png'))).length>1000);
    assert.deepEqual(result.errors,[]);
    assert.ok(result.views[0].state.viewMatrix);
    assert.ok(result.views[0].state.projectionMatrix);
    await assert.rejects(captureLevel(source,output,[view]),{code:'EEXIST'});
    hashes.push(hash);
  }
  assert.notEqual(hashes[0],hashes[1]);
  console.log('Capture browser checks passed');
} finally {await rm(directory,{recursive:true,force:true});}
