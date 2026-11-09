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
  const original = await readFile(new URL('../examples/cli-starter.aml', import.meta.url),'utf8');
  const {ArchitectureBuilder, compile, toGLB} = await import('levelspec');
  const fixture = new ArchitectureBuilder('capture-companion');
  fixture.box('crate', {position:[0,0,0],width:1,depth:1,height:1,material:'default',collidable:false});
  const companion = toGLB(await compile(fixture.document,{navigation:false}));
  await writeFile(join(directory,'crate.glb'), companion);
  const text = original.replace('</architecture>', '<visual-mesh id="crate-prop" src="crate.glb" position="2 2 0"/></architecture>');
  const broken = join(directory, 'broken.aml');
  await writeFile(broken, text.replace('crate.glb', 'missing.glb'));
  const failed = join(directory, 'failed');
  await assert.rejects(captureLevel(broken, failed, [view]));
  await access(join(failed, 'failure.json'));
  await assert.rejects(access(join(failed, 'capture.json')), {code: 'ENOENT'});
  const hashes = [];
  for (let i=0;i<2;i++) {
    const source = join(directory,`source-${i}.aml`);
    const bytes = text.replace('</architecture>',`<!-- distinct source ${i} --></architecture>`);
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
