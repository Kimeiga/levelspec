import type {NativeSemanticPlan} from './semantic-types.ts';
import type {ProducedLevel} from './native-producer.ts';

interface Candidate<T> {plan:NativeSemanticPlan;result?:T;error?:unknown}
function omit(plan:NativeSemanticPlan,ids:string[]) {
  const candidate=structuredClone(plan);candidate.portals=candidate.portals?.filter(p=>!ids.includes(p.id));
  for(const d of candidate.placementDiagnostics??[])if(ids.includes(d.id)){d.placed=0;d.omitted=1;d.message=`${d.id}: optional Python portal proposal omitted during strict native candidate search; its automatic closure and opening were removed together.`;}
  return candidate;
}
async function evaluate<T>(plan:NativeSemanticPlan,publish:(p:NativeSemanticPlan)=>Promise<T>):Promise<Candidate<T>> {
  try{return {plan,result:await publish(plan)};}catch(error){if(error instanceof Error&&error.name==='AbortError')throw error;return {plan,error};}
}
function reason(candidate:Candidate<unknown>) {return candidate.error instanceof Error?candidate.error.message:String(candidate.error);}
/** Historical optional Python portals only. Every candidate retains every hard constraint and exact cover. */
export async function publishPythonCandidates<T extends ProducedLevel>(plan:NativeSemanticPlan,optionalIds:string[],publish:(p:NativeSemanticPlan)=>Promise<T>) {
  const source=structuredClone(plan),ids=optionalIds.filter(id=>source.portals?.some(p=>p.id===id));
  let skip:string[]=[],best=await evaluate(source,publish);
  for(let round=0;!best.result&&round<ids.length;round++){
    const next=await nextCandidate(source,ids,skip,best,publish);if(!next)break;skip=next.skip;best=next.candidate;
  }
  if(!best.result)throw best.error;
  return {...best.result,placementDiagnostics:best.plan.placementDiagnostics??[],omittedPortals:skip};
}
async function nextCandidate<T>(source:NativeSemanticPlan,ids:string[],skip:string[],best:Candidate<T>,publish:(p:NativeSemanticPlan)=>Promise<T>) {
  for(const id of ids.filter(id=>!skip.includes(id))){
    const proposed=[...skip,id],candidate=await evaluate(omit(source,proposed),publish);
    if(candidate.result||reason(candidate)!==reason(best))return {skip:proposed,candidate};
  }
}
