import type {NativeSemanticPlan} from './semantic-types.ts';
import {sourceJitter as hash} from './source-jitter.ts';

export const SEMANTIC_PROFILES=[
  {name:'stepped',step:(i:number)=>i*.44},
  {name:'terrace',step:(i:number)=>i*.42},
  {name:'basin',step:(i:number)=>i===0?-.42:(i-1)*.4},
  {name:'plateau',step:(i:number,n:number)=>i>=n-2?.42*(i-(n-3)):0},
  {name:'kerb',step:(i:number)=>i*.28},
  {name:'lip',step:(i:number,n:number)=>i>=n-1?.4:0},
  {name:'flat',step:()=>0},
];
/** Profiles are permitted only for explicitly provisional traced evidence. */
export function semanticProfile(source:NativeSemanticPlan,index:number):NativeSemanticPlan {
  const p=structuredClone(source),profile=SEMANTIC_PROFILES[index],n=p.areas.length,scale=.78+hash(`${p.id}:ceiling`)*.5;
  p.wallThickness=Math.round((.26+hash(p.id)*.16)*100)/100;
  p.areas.forEach((a,i)=>{a.z=Math.round(profile.step(i,n)*100)/100;a.height=Math.round((n<=1?5:7.6-i/(n-1)*4)*scale*10)/10;});return p;
}
