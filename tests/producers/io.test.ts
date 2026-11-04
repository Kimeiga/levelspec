import {test} from 'node:test';
import assert from 'node:assert/strict';
import {argumentsFor} from '../../tools/producers/io.ts';

test('value options do not become filters, including paths with spaces',()=>{
  const r=argumentsFor(['room','--out','a path','--legacy'],['--out']);
  assert.deepEqual(r.rest,['room','--legacy']);assert.equal(r.values.get('--out'),'a path');
  assert.throws(()=>argumentsFor(['--out'],['--out']),/Missing value/);
  assert.throws(()=>argumentsFor(['--out','--legacy'],['--out']),/Missing value/);
  assert.equal(argumentsFor(['--out=a path'],['--out']).values.get('--out'),'a path');
});
