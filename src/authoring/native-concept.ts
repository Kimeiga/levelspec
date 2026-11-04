/** Native concept publication: source proposals, strict candidates and advisory ranking. */
import {aborted} from '../vector/types.ts';
import {produceSemantic,publishSemanticDocument,type ProducerOptions} from './semantic.ts';
import {createConcept} from './concept-proposal.ts';
import {checkConcept} from './concept-check.ts';
import {guardConceptFlights} from './concept-guards.ts';
import {ProducerValidationError} from './native-producer.ts';
import {apart,type SpatialConcept} from './concept-layout.ts';
export {createConcept};
export type * from './concept-layout.ts';
export type {ProducerOptions};
export function parseConcept(text:string):SpatialConcept {const c:unknown=JSON.parse(text);checkConcept(c);return c;}
export async function produceConcept(concept:SpatialConcept,seed='v0',options:ProducerOptions={}) {
  aborted(options.signal);const proposal=createConcept(concept,seed);
  try {return {...proposal,...await produceSemantic(proposal.plan,options)};}
  catch(error){
    aborted(options.signal);
    if(!(error instanceof ProducerValidationError)||!error.diagnostics.some(d=>d.code==='NAV_HEADROOM')||!proposal.plan.flights?.length)throw error;
    const plan=guardConceptFlights(proposal.plan);
    plan.placementDiagnostics!.push({id:'concept/retry',code:'NATIVE_CANDIDATE_RETRY',message:error.message,proposed:1,placed:1,omitted:0});
    return {...proposal,plan,...await produceSemantic(plan,options)};
  }
}
export type ProducedConcept=Awaited<ReturnType<typeof produceConcept>>;
/** Measured native quantities; the weighted preference is an advisory estimate, not playtesting. */
export function scoreConcept(result:ProducedConcept) {
  const nav=(result.report.sealed??result.report.navigation)!,floors=result.level.floors;
  const byLayer=new Map<string,number>();
  for(const f of floors)for(const t of f.triangles){const [a,b,c]=t.map(i=>f.points[i]);const area=Math.abs((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]))/2;byLayer.set(f.layer,(byLayer.get(f.layer)??0)+area);}
  const area=[...byLayer.values()].reduce((a,b)=>a+b,0),heights=floors.flatMap(f=>f.points.map(p=>p[2]));
  const elevation=Math.max(...heights)-Math.min(...heights),distance=nav.routes.reduce((sum,r)=>sum+r.distance,0);
  const balance=byLayer.size>1?1-Math.max(...byLayer.values())/area:0;
  const total=Math.min(1,distance/Math.max(1,Math.sqrt(area)))*.5+Math.min(1,elevation/10)*.25+balance*.25;
  return {label:'Advisory estimate from native geometry/navigation',total,floorArea:area,elevationRange:elevation,routeDistance:distance,layerBalance:balance,nativeSamples:nav.coverage.sampled,physicalRoutes:result.physical.routes};
}
export type ConceptScore=ReturnType<typeof scoreConcept>;
export type ConceptCandidate={valid:true;seed:string;signature:string[];score:ConceptScore;result:ProducedConcept}|{valid:false;seed:string;diagnostics:string[]};
export interface ConceptSelectionOptions extends ProducerOptions {attempts?:number;variants?:number;seedPrefix?:string}
export function conceptBudget(attempts=24,variants=3) {
  if(!Number.isInteger(attempts)||attempts<1||attempts>256)throw new Error('attempts must be an integer from 1 to 256.');
  if(!Number.isInteger(variants)||variants<1||variants>5)throw new Error('variants must be an integer from 1 to 5.');
  return {attempts,variants};
}
async function renameWinner(candidate:Extract<ConceptCandidate,{valid:true}>,index:number,options:ProducerOptions) {
  if(index===0)return candidate;
  const document=structuredClone(candidate.result.document),metadata=createConcept(candidate.result.source,candidate.seed,index).plan;
  // The source ID is length-framed so another concept's base ID cannot alias a variant.
  document.id=metadata.id;document.name=metadata.name;
  const published=await publishSemanticDocument(document,options),plan={...candidate.result.plan,id:document.id,name:document.name};
  return {...candidate,result:{...candidate.result,...published,plan}};
}
/** Every attempt is bounded and validated; failed candidates have no score or publishable result. */
export async function selectConceptCandidates(concept:SpatialConcept,options:ConceptSelectionOptions={}) {
  checkConcept(concept);const {attempts,variants}=conceptBudget(options.attempts,options.variants),candidates:ConceptCandidate[]=[];
  if(options.seedPrefix!==undefined&&(typeof options.seedPrefix!=='string'||!options.seedPrefix))throw new Error('seedPrefix must be nonempty.');
  for(let i=0;i<attempts;i++){
    aborted(options.signal);const seed=`${options.seedPrefix??'v'}${i}`;
    try {const result=await produceConcept(concept,seed,options);candidates.push({valid:true,seed,signature:result.signature,score:scoreConcept(result),result});}
    catch(error){aborted(options.signal);candidates.push({valid:false,seed,diagnostics:[error instanceof Error?error.message:String(error)]});}
  }
  const good=candidates.filter((c):c is Extract<ConceptCandidate,{valid:true}>=>c.valid).sort((a,b)=>b.score.total-a.score.total),winners:Extract<ConceptCandidate,{valid:true}>[]=[];
  for(const candidate of good){if(winners.length>=variants)break;if(winners.some(w=>apart(w.signature,candidate.signature)<.5))continue;winners.push(await renameWinner(candidate,winners.length,options));}
  return {candidates,winners};
}
