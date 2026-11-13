import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createCompanionStore} from '../tools/reconstruct-assets.ts';

async function fixture(run:(root:string)=>Promise<void>){const root=await mkdtemp(join(tmpdir(),'companion-limits-'));try{await run(root);}finally{await rm(root,{recursive:true,force:true});}}

test('concurrent companion admission shares one byte budget and keeps failed reads frozen',async()=>fixture(async root=>{
  await writeFile(join(root,'a.bin'),Buffer.alloc(6,1));await writeFile(join(root,'b.bin'),Buffer.alloc(6,2));
  const store=createCompanionStore(root,{maximumBytes:10,maximumFiles:4,maximumHeightmapBytes:10});
  const outcomes=await Promise.allSettled([store.read('a.bin'),store.read('b.bin')]);assert.equal(outcomes.filter(result=>result.status==='fulfilled').length,1);
  const failed=outcomes.findIndex(result=>result.status==='rejected');assert.match((outcomes[failed] as PromiseRejectedResult).reason.message,/byte|budget|limit/i);
  const name=failed===0?'a.bin':'b.bin';await writeFile(join(root,name),'x');await assert.rejects(store.read(name),/byte|budget|limit/i);
  assert.equal((await createCompanionStore(root).read(name)).byteLength,1);
}));

test('repeated normalized paths reuse a frozen capture without spending another file or byte allowance',async()=>fixture(async root=>{
  await writeFile(join(root,'a.bin'),'four');await writeFile(join(root,'b.bin'),'b');
  const store=createCompanionStore(root,{maximumBytes:4,maximumFiles:1,maximumHeightmapBytes:4});const first=await store.read('a.bin');first.fill(0);
  await writeFile(join(root,'a.bin'),'changed');assert.equal((await store.read('./a.bin')).toString(),'four');
  await assert.rejects(store.read('b.bin'),/file|path|budget|limit/i);
}));

test('explicit photo binding participates in file and byte limits and retains copied bytes',async()=>fixture(async root=>{
  const store=createCompanionStore(root,{maximumBytes:6,maximumFiles:2,maximumHeightmapBytes:6});const photo=Buffer.from('photo!');await store.bind('photo.png',photo);photo.fill(0);
  assert.equal((await store.read('photo.png')).toString(),'photo!');await store.bind('photo.png',Buffer.from('photo!'));
  await assert.rejects(store.bind('second.png',Buffer.from('x')),/byte|budget|limit/i);
  const recovered=createCompanionStore(root);await recovered.bind('second.png',Buffer.from('x'));assert.equal((await recovered.read('second.png')).toString(),'x');
}));

test('heightmaps share both their own subbudget and the all-companion byte budget',async()=>fixture(async root=>{
  for(const name of ['a.png','b.png'])await writeFile(join(root,name),'four');await writeFile(join(root,'texture.bin'),'tex');
  const subcap=createCompanionStore(root,{maximumBytes:20,maximumFiles:4,maximumHeightmapBytes:7});await subcap.resolveHeightmap({src:'a.png'});await assert.rejects(subcap.resolveHeightmap({src:'b.png'}),/heightmap|byte|budget|limit/i);assert.equal((await subcap.resolveHeightmap({src:'a.png'})).byteLength,4);
  const global=createCompanionStore(root,{maximumBytes:6,maximumFiles:4,maximumHeightmapBytes:6});await global.read('texture.bin');await assert.rejects(global.resolveHeightmap({src:'a.png'}),/byte|budget|limit/i);
}));
