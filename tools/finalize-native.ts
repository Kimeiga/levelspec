import {readFileSync,readdirSync} from 'node:fs';
import {join,extname} from 'node:path';
import {argumentsFor,writeArtifact} from './producers/io.ts';
import {decodeSemanticSource} from '../src/authoring/semantic-sources.ts';
import {produceSemantic,publishSemanticDocument} from '../src/authoring/semantic.ts';
import {SEMANTIC_PROFILES,semanticProfile} from '../src/authoring/semantic-profiles.ts';

const {values,rest}=argumentsFor(process.argv.slice(2),['--src','--out']);
if(rest.length>1||rest.some(n=>n.startsWith('-')))throw new Error('usage: node tools/finalize.ts [filter] [--src directory] [--out directory] [--legacy]');
const src=values.get('--src')??join(import.meta.dirname,'../maps/traced'),out=values.get('--out')??join(import.meta.dirname,'../generated/vector/finalized'),filter=rest[0];
const files=readdirSync(src).filter(f=>['.plan','.svgx','.json'].includes(extname(f))&&(!filter||f.includes(filter))).sort();
if(!files.length)throw new Error('No traced sources matched.');
let published=0;
for(const file of files){
  const failures:string[]=[];
  try{
    const source=await decodeSemanticSource(readFileSync(join(src,file),'utf8'),extname(file)),count=source.provisional?SEMANTIC_PROFILES.length:1;
    for(let i=0;i<count;i++){
      try{
        const made=source.kind==='native'?await publishSemanticDocument(source.document):await produceSemantic(source.provisional?semanticProfile(source.plan,i):source.plan);
        writeArtifact(join(out,file.replace(/(?:\.level)?\.(?:plan|svgx|json)$/,'.level.svgx')),made.text);
        console.log(`PASS ${file}: ${source.provisional?SEMANTIC_PROFILES[i].name:'authored'}`);published++;break;
      }catch(error){failures.push(`${source.provisional?SEMANTIC_PROFILES[i].name:'authored'}: ${(error as Error).message}`);}
    }
    if(failures.length===count){console.error(`FAIL ${file}: ${failures.join(' | ')}`);process.exitCode=1;}
  }catch(error){console.error(`FAIL ${file}: ${(error as Error).message}`);process.exitCode=1;}
}
console.log(`${published}/${files.length} maps finished`);
