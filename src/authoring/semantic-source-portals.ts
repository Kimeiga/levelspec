import {key,unkey} from '../core/grid.ts';
import {semanticCells} from './semantic-cells.ts';
import type {NativeSemanticPlan,SemanticPortal} from './semantic-types.ts';

interface Segment {axis:number;fixed:number;start:number;end:number;cell:string}
function segments(plan:NativeSemanticPlan,pair:[string,string]):Segment[] {
  const result:Segment[]=[];
  for(const l of semanticCells(plan).layers.values())result.push(...layerSegments(l.owner,pair));return result;
}
function layerSegments(owner:Map<string,string>,pair:[string,string]) {
  const result:Segment[]=[];
  for(const [k,a] of owner)result.push(...cellSegments(owner,pair,k,a));return result;
}
function cellSegments(owner:Map<string,string>,pair:[string,string],k:string,a:string) {
    const result:Segment[]=[];
    const [x,y]=unkey(k);
    for(const [dx,dy] of [[1,0],[0,1]]){const b=owner.get(key(x+dx,y+dy));if(!matchesPair(pair,a,b))continue;
      result.push({axis:dx?1:0,fixed:dx?x+1:y+1,start:dx?y:x,end:(dx?y:x)+1,cell:k});}
  return result;
}
function matchesPair(pair:[string,string],a:string,b:string|undefined) {return b!==undefined&&a!==b&&pair.includes(a)&&pair.includes(b);}
function runs(parts:Segment[]) {
  const result:Segment[]=[];
  for(const p of [...parts].sort((a,b)=>a.axis-b.axis||a.fixed-b.fixed||a.start-b.start)){
    const prev=result.at(-1);if(prev&&prev.axis===p.axis&&prev.fixed===p.fixed&&prev.end===p.start)prev.end=p.end;else result.push({...p});
  }
  return result;
}
function pieces(parts:Segment[]) {
  const left=new Set(parts.map(p=>p.cell));let count=0;
  while(left.size){count++;const stack=[left.values().next().value!];left.delete(stack[0]);
    while(stack.length){const [x,y]=unkey(stack.pop()!);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const k=key(x+dx,y+dy);if(left.delete(k))stack.push(k);}}
  }
  return count;
}
function selectedRun(parts:Segment[],portal:SemanticPortal,grid:number) {
  const score=(r:Segment)=>{if(!portal.at)return -(r.end-r.start);const along=portal.at[r.axis]/grid,perp=portal.at[1-r.axis]/grid;return Math.hypot(along-Math.max(r.start,Math.min(r.end,along)),perp-r.fixed)-(r.end-r.start)*.01;};
  return runs(parts).sort((a,b)=>score(a)-score(b))[0];
}
/** Historical desired-size portal hints become exact native geometry BEFORE validation. */
export function placeSourcePortals(plan:NativeSemanticPlan,portals:SemanticPortal[],mode:'annotation'|'composition'|'legacy') {
  for(const proposal of portals)placeProposal(plan,proposal,mode);
}
function placeProposal(plan:NativeSemanticPlan,proposal:SemanticPortal,mode:'annotation'|'composition'|'legacy') {
    const parts=segments(plan,proposal.between),id=proposal.id;
    const skip=skipProposal(mode,parts);
    if(skip){(plan.placementDiagnostics??=[]).push({id,code:'PORTAL_PLACEMENT',proposed:1,placed:0,omitted:1,message:`${id}: optional Python portal omitted before validation (${parts.length?'disjoint boundaries':'no shared boundary'}).`});return;}
    if(!parts.length)throw new Error(`${id}: no physical boundary between ${proposal.between.join(' and ')}.`);
    const placed=placement(plan,proposal,parts,mode);(plan.portals??=[]).push(placed);
    (plan.placementDiagnostics??=[]).push({id,code:'PORTAL_PLACEMENT',proposed:1,placed:1,omitted:0,message:`${id}: desired ${proposal.width} m; placed ${placed.width} m on its physical shared run.`});
}
function skipProposal(mode:string,parts:Segment[]) {return mode!=='legacy'&&!parts.length||mode==='annotation'&&pieces(parts)>1;}
function placement(plan:NativeSemanticPlan,proposal:SemanticPortal,parts:Segment[],mode:string):SemanticPortal {
    const run=selectedRun(parts,proposal,plan.grid),requested=proposal.width==='full'?Infinity:proposal.width/plan.grid;
    const full=proposal.width==='full'||mode==='annotation'&&parts.length-requested<3,width=Math.min(full?Infinity:Math.max(1,Math.round(requested)),run.end-run.start);
    const center=proposal.at?proposal.at[run.axis]/plan.grid:(run.start+run.end)/2;
    const start=Math.max(run.start,Math.min(run.end-width,run.start+Math.round(center-width/2-run.start)));
    const at:[number,number]=run.axis===0?[(start+width/2)*plan.grid,run.fixed*plan.grid]:[run.fixed*plan.grid,(start+width/2)*plan.grid];
    return {...proposal,width:width*plan.grid,at};
}
