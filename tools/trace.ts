/** Validated v2 radar tracing. The Python tracer remains a legacy draft API. */
import { join } from 'node:path';
import { parseRasterTrace, produceTrace } from '../src/tracing/native.ts';
import { argumentsFor, python, writeArtifact } from './producers/io.ts';

const forwarded=['--id','--name','--cells','--bands','--grid','--span','--fill','--white-cut','--bg-tol','--alpha-cut','--smooth','--min-band'];
const { values, rest } = argumentsFor(process.argv.slice(2), ['--out', '--python',...forwarded]);
const legacy = rest.includes('--legacy');
const noCrop=rest.includes('--no-crop');
const args = rest.filter(a => a !== '--legacy'&&a!=='--no-crop');
if (args.length!==1||args[0].startsWith('-')) throw new Error('usage: node tools/trace.ts <image> [tracer options] [--out path] [--legacy]');
if(noCrop)args.push('--no-crop');
for(const name of forwarded)if(values.has(name))args.push(name,values.get(name)!);
const script=join(import.meta.dirname,'trace_radar.py');
let text:string;
if(legacy){
  const plan=python(script,args,values.get('--python'));
  // Compatibility publication keeps both source and native runtime gates.
  const {producePlan}=await import('../src/authoring/producers.ts');
  await producePlan(plan);text=plan;
}else{
  const raster=python(script,[...args,'--format','raster'],values.get('--python'));
  text=(await produceTrace(parseRasterTrace(raster))).text;
}
const out = values.get('--out');
if (out) { writeArtifact(out, text); console.log(`PASS ${out}`); }
else process.stdout.write(text);
