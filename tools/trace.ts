/** Validated v2 radar tracing. The Python tracer remains a legacy draft API. */
import { join } from 'node:path';
import { producePlan } from '../src/authoring/producers.ts';
import { argumentsFor, python, writeArtifact } from './producers/io.ts';

const { values, rest } = argumentsFor(process.argv.slice(2), ['--out', '--python']);
const legacy = rest.includes('--legacy');
const args = rest.filter(a => a !== '--legacy');
if (!args.length) throw new Error('usage: node tools/trace.ts <image> [tracer options] [--out path] [--legacy]');
const plan = python(join(import.meta.dirname, 'trace_radar.py'), args, values.get('--python'));
// Even legacy output from this publication command must pass the strict gates.
const produced = await producePlan(plan);
const text = legacy ? plan : produced.text;
const out = values.get('--out');
if (out) { writeArtifact(out, text); console.log(`PASS ${out}`); }
else process.stdout.write(text);
