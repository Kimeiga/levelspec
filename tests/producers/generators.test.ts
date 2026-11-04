import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateLevelV2} from '../../src/generate/vector.ts';
import {parseLevelSvgx} from '../../src/vector/format.ts';
import {compile} from '../../src/vector/compiler.ts';
import {validateForRuntime} from '../../src/vector/validate.ts';
import {generateLevel} from '../../src/generate/index.ts';
import {produceSpec} from '../../src/authoring/producers.ts';

// Exercise each topology explicitly; a random sweep alone can omit one entirely.
for(const archetype of ['three_lane','ring','stacked','compound','bridges','sky_islands','fightyard']) {
  test(`v2 ${archetype} preserves two routes at early and later depths`,{timeout:180000},async()=>{
    for(const depth of [1,4]) {
      const r=await generateLevelV2({archetype,depth,seed:'producer-migration',attempts:14,minRoutes:2});
      assert.ok(r.ok,JSON.stringify(r));
      assert.ok(r.disjointRoutes>=2);
      assert.equal(r.legacy!.report.passed,true);
      const report=await validateForRuntime(await compile(parseLevelSvgx(r.text)));
      assert.equal(report.passed,true);
      assert.equal(r.document.routes[0].minRoutes,2);
      assert.deepEqual(report.navigation!.unreachableMarkers,[]);
    }
  });
}

test('impossible route demands exhaust the stated budget without lowering requirements',async()=>{
  const r=await generateLevelV2({seed:'bounded',archetype:'three_lane',minRoutes:1000,attempts:2});
  assert.equal(r.ok,false);assert.equal(r.attempts,2);
});

test('cancellation and invalid budgets fail before producing geometry',async()=>{
  const signal=AbortSignal.abort();
  await assert.rejects(()=>generateLevelV2({signal}),{name:'AbortError'});
  await assert.rejects(()=>generateLevelV2({attempts:0}),RangeError);
});

test('bridge ramps retain their supporting plane after SVGX millimetre rounding',async()=>{
  const source=generateLevel({seed:'producer-migration',depth:4,archetype:'bridges',attempts:3});
  assert.ok(source.ok);
  const produced=await produceSpec(source.spec);
  assert.equal(produced.report.passed,true);
  assert.equal(produced.document.player.height,source.spec.player!.height);
});
