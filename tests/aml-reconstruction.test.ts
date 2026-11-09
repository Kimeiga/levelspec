import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PNG} from 'pngjs';
import {mkdtemp,writeFile,readFile,readdir,rm} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile,parseAml,serializeAml} from 'levelspec';
import {runReconstruction} from 'levelspec/reconstruction';

const source='<architecture version="1" id="native-reconstruction" validation="premap"><profile id="floor" points="0 0; 8 0; 8 8; 0 8"/><slab id="ground" profile="floor"/><marker id="spawn" kind="spawn" position="4 4 0"/></architecture>';

test('reconstruction inspects native AML and retains its best valid candidate without inventing photo acceptance',async()=>{
  const document=parseAml(source),before=structuredClone(document);const result=await runReconstruction(serializeAml(document),[],async()=>null,{maxRevisions:1});
  assert.equal(result.accepted,false);assert.equal(result.status,'stopped');assert.equal(result.attempts[0].valid,true,result.attempts[0].diagnostics.join('\n'));assert.ok(result.level);
  assert.equal(parseAml(result.source!).id,document.id);assert.deepEqual(document,before);
  const compiled=await compile(document);assert.equal(result.level.physicalHash,compiled.physicalHash);
});

test('a reviser can repair invalid AML and a later invalid edit cannot replace the retained valid candidate',async()=>{
  const broken='<architecture version="1" id="broken"><box id="bad" width="NaN"/></architecture>';let calls=0;
  const repaired=await runReconstruction(broken,[],async feedback=>{assert.ok(feedback.lastAttempt?.diagnostics.length);return ++calls===1?source:null;},{maxRevisions:2});
  assert.equal(repaired.attempts[0].valid,false);assert.equal(repaired.attempts[1].valid,true);assert.equal(repaired.source,source);
  const retained=await runReconstruction(source,[],async()=>broken,{maxRevisions:1});assert.equal(retained.source,source);assert.equal(retained.attempts.at(-1)!.valid,false);
});

test('native reconstruction cancellation and source limits stop further revision work and recover',async()=>{
  const controller=new AbortController();let revisions=0;
  const aborted=await runReconstruction(source,[],async()=>{revisions++;return source;},{signal:controller.signal,onAttempt:()=>controller.abort(),maxRevisions:2});
  assert.equal(aborted.status,'aborted');assert.equal(revisions,0);
  const oversized=await runReconstruction(source+' '.repeat(1100),[],async()=>null,{maxSourceCharacters:1000,maxRevisions:0});assert.equal(oversized.attempts[0].valid,false);assert.match(oversized.attempts[0].diagnostics.join(' '),/limit|character|large/i);
  assert.equal((await runReconstruction(source,[],async()=>null,{maxRevisions:0})).attempts[0].valid,true);
});

test('old SVGX reconstruction input requires explicit migration instead of implicit authoring acceptance',async()=>{
  const result=await runReconstruction('<level version="2" id="old"/>',[],async()=>null,{maxRevisions:0});assert.equal(result.attempts[0].valid,false);assert.match(result.attempts[0].diagnostics.join(' '),/migrat/i);
});

test('reconstruction CLI archives native AML revisions and preserves unrelated evidence files',async()=>{
  const root=await mkdtemp(join(tmpdir(),'aml-reconstruction-'));
  try{
    const input=join(root,'level.aml'),out=join(root,'out');await writeFile(input,source);
    const run=spawnSync(process.execPath,['tools/reconstruct.ts','--source',input,'--out',out],{cwd:process.cwd(),encoding:'utf8',timeout:30000});
    assert.equal(run.status,1,run.stderr||run.stdout);const entries=await readdir(out);assert.ok(entries.includes('iteration-00.aml'));assert.ok(entries.includes('best.aml'));assert.ok(!entries.some(name=>name.endsWith('.svgx')));
    assert.equal(parseAml(await readFile(join(out,'best.aml'),'utf8')).id,'native-reconstruction');assert.equal(await readFile(input,'utf8'),source);
    await writeFile(join(out,'review-evidence.json'),'independent');
    const again=spawnSync(process.execPath,['tools/reconstruct.ts','--source',join(out,'best.aml'),'--out',out],{cwd:process.cwd(),encoding:'utf8',timeout:30000});
    assert.equal(again.status,1,again.stderr||again.stdout);assert.equal(await readFile(join(out,'review-evidence.json'),'utf8'),'independent');assert.equal(parseAml(await readFile(join(out,'iteration-00.aml'),'utf8')).id,'native-reconstruction');
  }finally{await rm(root,{recursive:true,force:true});}
});


test('reconstruction resolves external AML heightmap companions before physical evaluation',async()=>{
  const image=new PNG({width:4,height:4});image.data=Buffer.alloc(16);const bytes=Uint8Array.from(PNG.sync.write(image,{colorType:0,inputColorType:0,inputHasAlpha:false,filterType:0}));
  const terrainSource='<architecture version="1" id="external-ground" validation="premap"><terrain id="ground" heightmap="ground.png" cell-size="2 2"/><profile id="domain" points="0 0; 6 0; 6 6; 0 6"/><zone id="play" profile="domain" height="2" role="playable"/><marker id="spawn" kind="spawn" position="3 3 0"/></architecture>';
  let loads=0;
  const loaded=await runReconstruction(terrainSource,[],async()=>null,{maxRevisions:0,resolveHeightmap:async request=>{assert.equal(request.src,'ground.png');loads++;return bytes;}});
  assert.equal(loaded.attempts[0].valid,true,loaded.attempts[0].diagnostics.join(' '));assert.ok(loads>0);assert.ok(loaded.level?.terrainTiles?.length);
  const missing=await runReconstruction(terrainSource,[],async()=>null,{maxRevisions:0,resolveHeightmap:async()=>{throw new Error('missing ground.png');}});
  assert.equal(missing.attempts[0].valid,false);assert.match(missing.attempts[0].diagnostics.join(' '),/ground|heightmap/i);
});
