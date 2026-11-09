import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseAml} from 'levelspec';
import {produceDocument} from 'levelspec/producers';

/** Huge native support remains authored; only the explicitly playable working domain is small. */
function document(width=8){return parseAml(`<architecture version="1" id="bounded-producer"><profile id="floor" points="0 0; ${width} 0; ${width} ${width}; 0 ${width}"/><slab id="ground" profile="floor"/><profile id="domain" points="0 0; 6 0; 6 6; 0 6"/><zone id="play" profile="domain" height="2" role="playable"/><marker id="start" kind="spawn" position="2 3 0"/><marker id="end" kind="objective" position="4 3 0"/><route id="local" from="start" to="end" min-routes="1" max-distance="4"/></architecture>`);}

test('native publication clips physical-route index work to the actual small playable navigation domain',async()=>{
  const source=document(2_000_000),before=structuredClone(source),made=await produceDocument(source);
  assert.equal(made.report.passed,true);assert.equal(made.report.navigation!.routes.find(route=>route.id==='local')!.reachable,true);
  assert.ok(Math.max(...made.level.physicalMesh!.positions.filter((_,i)=>i%3===0))===2_000_000,'Index clipping never crops authored physical geometry');assert.deepEqual(source,before);
});

test('physical publication budgets reject without poisoning source or the next useful publication',async()=>{
  const source=document(),before=structuredClone(source);
  await assert.rejects(produceDocument(source,{physicalWork:1}),/physical|work|budget|limit/i);
  const recovered=await produceDocument(source);assert.equal(recovered.report.passed,true);assert.deepEqual(source,before);
  await assert.rejects(produceDocument(source,{signal:AbortSignal.abort()}),{name:'AbortError'});
});


test('cancellation at physical-route admission propagates before the gate and preserves later publication',async()=>{
  const source=document(),before=structuredClone(source),controller=new AbortController();let entered=false;
  await assert.rejects(produceDocument(source,{signal:controller.signal,onProgress:stage=>{if(stage==='Physical route evidence'){entered=true;controller.abort();}}}),{name:'AbortError'});
  assert.equal(entered,true);assert.equal((await produceDocument(source)).report.passed,true);assert.deepEqual(source,before);
});
