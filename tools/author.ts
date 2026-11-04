/** Compose or annotate Python semantic proposals, then publish through v2 gates. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { producePlan, type ProducedSource } from '../src/authoring/producers.ts';
import { argumentsFor, python, writeArtifact } from './producers/io.ts';

const here=import.meta.dirname;
const {values,rest}=argumentsFor(process.argv.slice(2),['--spec','--traced','--out','--python']);
const [name,traced=name]=rest.filter(a=>!a.startsWith('--')),legacy=rest.includes('--legacy');
if(!name||![name,traced].every(n=>/^[\w-]+$/.test(n)))throw new Error('usage: node tools/author.ts <spec-name> [traced-plan-name] [--out path] [--legacy]');
const specPath=values.get('--spec')??join(here,`../authored/${name}.py`);
const tracedPath=values.get('--traced')??join(here,`../maps/cs/${traced}.plan`);
const out=values.get('--out')??join(here,legacy?`../maps/hand/${name}.plan`:`../generated/vector/authored/${name}.level.svgx`);
const specification=readFileSync(specPath,'utf8'),composed=/["']rects["']\s*:/m.test(specification);
const total=(specification.match(/\{["']between["']\s*:/g)??[]).length;
function propose(skip:number[]) {
  const args=composed?[specPath]:[tracedPath,specPath];
  if(skip.length)args.push('--skip-portals',skip.join(','));
  return python(join(here,composed?'compose.py':'annotate.py'),args,values.get('--python'));
}
async function check(skip:number[]): Promise<{text:string;produced?:ProducedSource;why:string}> {
  const text=propose(skip);
  try{return {text,produced:await producePlan(text),why:''};}
  catch(error){return {text,why:(error as Error).message};}
}
let skip:number[]=[],best=await check(skip);
// These are optional layout proposals, never route/player requirements. Every
// candidate still has to satisfy the unchanged source and v2 runtime gates.
for(let round=0;!best.produced&&round<total;round++) {
  let changed=false;
  for(let i=0;i<total;i++) {
    if(skip.includes(i))continue;
    const trial=await check([...skip,i]);
    if(trial.produced||trial.why!==best.why){skip=[...skip,i];best=trial;changed=true;break;}
  }
  if(!changed)break;
}
if(!best.produced){console.error(`FAIL ${name}: ${best.why}`);process.exitCode=1;}
else {
  writeArtifact(out,legacy?best.text:best.produced.text);
  console.log(`PASS ${name} -> ${out}`);
  if(skip.length)console.log(`Omitted optional portal proposals: ${skip.join(', ')}`);
}
