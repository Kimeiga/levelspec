import {readFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {parseConcept,selectConceptCandidates} from '../../src/authoring/native-concept.ts';
import {CONCEPTS} from '../../src/authoring/concepts.ts';
import {writeArtifact} from './io.ts';
import type {conceptOptions} from './concept-options.ts';
type Options=ReturnType<typeof conceptOptions>;
type Winner=Awaited<ReturnType<typeof selectConceptCandidates>>['winners'][number];
function presentWinner(winner:Winner,index:number,id:string,output:string,flags:Set<string>) {
  console.log(`  ${winner.seed}: advisory estimate ${winner.score.total.toFixed(3)}; native area ${winner.score.floorArea.toFixed(1)}m², route distance ${winner.score.routeDistance.toFixed(1)}m`);
  if(flags.has('--why'))for(const d of winner.result.placementDiagnostics)console.log(`  ${d.code}: ${d.message} (${d.placed}/${d.proposed})`);
  if(flags.has('--plan'))console.log(JSON.stringify(winner.result.plan,null,2));
  if(!flags.has('--write'))return 0;
  const name=encodeURIComponent(id)+(index?`~${'bcde'[index-1]}`:'')+'.level.svgx',path=join(output,name);
  writeArtifact(path,winner.result.text);console.log(`  written: ${path}`);return 1;
}
export async function nativeConceptCommand(options:Options) {
  const {values,flags,filters,attempts,variants}=options;
  for(const id of filters)if(!CONCEPTS.some(c=>c.id===id))throw new Error(`Unknown concept ${id}.`);
  const concepts=values.has('--spec')?[parseConcept(readFileSync(values.get('--spec')!,'utf8'))]:CONCEPTS.filter(c=>!filters.length||filters.includes(c.id));
  const output=resolve(values.get('--out')??join(import.meta.dirname,'../../generated/vector/concepts'));let wrote=0;
  for(const c of concepts){
    const {candidates,winners}=await selectConceptCandidates(c,{attempts,variants});
    console.log(`\n${c.name} — ${c.thesis}\n  ${candidates.filter(c=>c.valid).length}/${candidates.length} candidates passed native publication`);
    const failures=new Set(candidates.flatMap(candidate=>candidate.valid?[]:candidate.diagnostics));
    for(const why of failures)console.log(`  ! ${why}`);
    for(const [i,winner] of winners.entries())wrote+=presentWinner(winner,i,c.id,output,flags);
    if(!winners.length)process.exitCode=1;
  }
  console.log(flags.has('--write')?`${wrote} map(s) written`:'dry run — pass --write to keep the winners');
}
