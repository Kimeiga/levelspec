/** Publish drawn plans as validated SVGX; --legacy retains JSON spec output. */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { planToSpec } from '../src/authoring/plan.ts';
import { compile } from '../src/core/compiler.ts';
import { validateForRuntime } from '../src/core/validate.ts';
import { producePlan } from '../src/authoring/producers.ts';
import { argumentsFor, writeArtifact } from './producers/io.ts';

const {values,rest} = argumentsFor(process.argv.slice(2), ['--src','--out']);
const legacy = rest.includes('--legacy'), filter = rest.find(a=>!a.startsWith('--'));
const dir = values.get('--src') ?? join(import.meta.dirname,'../maps');
const out = values.get('--out') ?? join(import.meta.dirname,legacy?'../generated/maps':'../generated/vector/plans');
function walk(root:string,prefix=''): {rel:string;abs:string}[] {
  return readdirSync(root).sort().flatMap(name=>{
    const abs=join(root,name),rel=prefix+name;
    return statSync(abs).isDirectory()?walk(abs,rel+'/'):name.endsWith('.plan')?[{rel,abs}]:[];
  });
}
let ok=0,bad=0;
const files=walk(dir).filter(f=>!filter||f.rel.includes(filter));
if(!files.length)throw new Error('No plans matched.');
for(const {rel,abs} of files) {
  try {
    const text=readFileSync(abs,'utf8');
    let artifact:string;
    if(legacy) {
      const spec=planToSpec(text),report=validateForRuntime(compile(spec));
      if(!report.passed||spec.expect_fail)throw new Error(report.diagnostics.filter(d=>d.severity==='error').map(d=>d.code).join(',')||'Expected failure cannot be published.');
      artifact=JSON.stringify(spec,null,2);
    } else artifact=(await producePlan(text)).text;
    writeArtifact(join(out,rel.replace(/\.plan$/,legacy?'.json':'.level.svgx')),artifact);
    ok++;console.log(`PASS ${rel}`);
  } catch(error) {bad++;console.error(`FAIL ${rel}: ${(error as Error).message}`);}
}
console.log(`${ok} passed, ${bad} failed`);
process.exitCode=bad?1:0;
