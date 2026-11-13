import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateLevel} from '../../src/generate/vector.ts';
import {parseAml,compile,validateForRuntime} from 'levelspec';

// Exercise each topology explicitly; a random sweep alone can omit one entirely.
for(const archetype of ['three_lane','ring','stacked','compound','bridges','sky_islands','fightyard']) {
  test(`AML ${archetype} preserves two routes at early and later depths`,{timeout:180000},async()=>{
    for(const depth of [1,4])for(const seed of ['producer-migration','native-decor']) {
      const r=await generateLevel({archetype,depth,seed,attempts:14,minRoutes:2});
      assert.ok(r.ok,JSON.stringify(r));
      assert.ok(r.disjointRoutes>=2);
      assert.equal(parseAml(r.text).version,'1');
      const report=await validateForRuntime(await compile(parseAml(r.text)));
      assert.equal(report.passed,true);
      assert.equal(r.document.routes[0].minRoutes,2);
      assert.deepEqual(report.navigation!.unreachableMarkers,[]);
    }
  });
}

test('impossible route demands exhaust the stated budget without lowering requirements',async()=>{
  const r=await generateLevel({seed:'bounded',archetype:'three_lane',minRoutes:1000,attempts:2});
  assert.equal(r.ok,false);assert.equal(r.attempts,2);
});

test('cancellation and invalid budgets fail before producing geometry',async()=>{
  const signal=AbortSignal.abort();
  await assert.rejects(()=>generateLevel({signal}),{name:'AbortError'});
  await assert.rejects(()=>generateLevel({attempts:0}),RangeError);
});

