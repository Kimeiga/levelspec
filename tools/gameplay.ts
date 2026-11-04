#!/usr/bin/env node
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {parseGameplayPlan,produceGameplay} from '../src/gameplay/index.ts';
import {writeArtifact} from './producers/io.ts';

const usage='Usage: node tools/gameplay.ts <plan.gameplay.json> [--out file] [--report file]';
function option(argv:string[],index:number,values:Map<string,string>) {
  const flag=argv[index];
  if(!['--out','--report'].includes(flag))throw new Error(`Unknown option ${flag}. ${usage}`);
  if(values.has(flag))throw new Error(`Duplicate option ${flag}.`);
  const value=argv[index+1];if(!value||value.startsWith('-'))throw new Error(`Missing value for ${flag}.`);
  values.set(flag,resolve(value));
}
function requireDistinctPaths(paths:string[]) {
  const comparable=paths.map(p=>process.platform==='win32'?p.toLowerCase():p);
  if(new Set(comparable).size!==comparable.length)throw new Error('Input, output and report must have distinct paths.');
}
function argumentsFor(argv:string[]) {
  let input:string|undefined;const values=new Map<string,string>();
  for(let i=0;i<argv.length;i++) {
    const arg=argv[i];
    if(arg.startsWith('-')) {
      option(argv,i,values);i++;
    } else {if(input)throw new Error(usage);input=resolve(arg);}
  }
  if(!input)throw new Error(usage);
  const out=values.get('--out'),report=values.get('--report');
  requireDistinctPaths([input,...values.values()]);
  return {input,out,report};
}
async function main() {
  const args=argumentsFor(process.argv.slice(2)),plan=parseGameplayPlan(readFileSync(args.input,'utf8'));
  const made=await produceGameplay(plan);
  // Serialize every result before touching artifacts. Runtime/source failure writes nothing.
  const report=JSON.stringify(made.assessment,null,2)+'\n';
  if(args.report)writeArtifact(args.report,report);
  if(args.out)writeArtifact(args.out,made.text);else process.stdout.write(made.text);
}
main().catch(error=>{console.error(error instanceof Error?error.message:String(error));process.exitCode=1;});
