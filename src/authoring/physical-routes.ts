/** Conservative entrance capacities for native assemblies; strict nav remains authoritative. */
import {ProducerValidationError} from './native-producer.ts';
import {coordinateKey} from '../vector/precision.ts';
import {heightAt,pathAt,pathLength} from '../vector/geometry.ts';
import {aborted,type CompiledLevel,type Edge,type FloorPatch,type NavigationReport,type V3} from '../vector/types.ts';

interface Run {areas:[string,string];a:V3;b:V3;length:number}
function intervals(edge:Edge,length:number,level:CompiledLevel) {
  if(edge.kind==='open')return [[0,length]];
  const openings=[...edge.openings];
  if(['door','arch','breach','rappel_door','window','rappel_window'].includes(edge.kind))
    openings.push({id:'implicit',kind:edge.kind,start:0,end:length,sill:edge.kind.includes('window')?0.9:0,head:edge.kind==='arch'?2.4:2.1});
  const player=level.document.player;
  return openings.filter(o=>o.sill<=Math.max(player.step,player.vault)&&o.head-o.sill>=player.crouch).map(o=>[o.start,o.end]);
}
function boundaryOwners(level:CompiledLevel) {
  const areas=new Map(level.floors.map(f=>[f.region,f.area??f.region])),owners=new Map<string,string[]>();
  for(const l of level.document.layers)for(const r of l.regions)for(const ref of r.boundary) {
    const id=ref.replace(/^-/,'');owners.set(id,[...owners.get(id)??[],areas.get(r.id)??r.id]);
  }
  return owners;
}
function seamRuns(level:CompiledLevel,owners:Map<string,string[]>,edges:Map<string,Edge>,add:(a:string,b:string,edge:Edge)=>void) {
  for(const seam of level.document.seams) {
    const [a,b]=seam.edges.map(e=>owners.get(e));
    if(seam.kind==='open'&&a?.length===1&&b?.length===1)add(a[0],b[0],{...edges.get(seam.edges[0])!,kind:'open'});
  }
}
function sharedRuns(level:CompiledLevel):Run[] {
  const owners=boundaryOwners(level),runs:Run[]=[],semantic=new Set(level.semantic.edges.map(e=>[...e].sort().join('|')));
  function add(a:string,b:string,edge:Edge) {
    const pair:[string,string]=a<b?[a,b]:[b,a],path=level.curves[edge.id];
    if(a===b||!path||!semantic.has(pair.join('|')))return;
    for(const [start,end] of intervals(edge,pathLength(path),level))runs.push({areas:pair,a:pathAt(path,start),b:pathAt(path,end),length:end-start});
  }
  const edges=new Map<string,Edge>();
  for(const layer of level.document.layers)for(const edge of layer.edges)edges.set(edge.id,edge);
  for(const edge of edges.values()){const refs=owners.get(edge.id);if(refs?.length===2)add(refs[0],refs[1],edge);}
  seamRuns(level,owners,edges,add);
  return runs;
}
function navSupports(point:V3,nav:FloorPatch,tolerance:number):boolean {
  // Check all triangles so vertically overlapping storeys cannot alias a height.
  return nav.triangles.some(t=>{
    const z=heightAt({...nav,triangles:[t]},point[0],point[1]);
    return z!==undefined&&Math.abs(z-point[2])<=tolerance;
  });
}
function crossing(run:Run,nav:FloorPatch,tolerance:number):boolean {
  const dx=run.b[0]-run.a[0],dy=run.b[1]-run.a[1],length=Math.hypot(dx,dy);
  if(!length)return false;
  for(const fraction of [0.5,0.25,0.75,0.125,0.875]) {
    const p=run.a.map((v,i)=>v+(run.b[i]-v)*fraction) as V3;
    const offset:V3=[-dy/length*0.05,dx/length*0.05,0];
    if([-1,0,1].every(sign=>navSupports(p.map((v,i)=>v+offset[i]*sign) as V3,nav,tolerance)))return true;
  }
  return false;
}
function entrances(level:CompiledLevel,navigation:NavigationReport,signal?:AbortSignal) {
  const runs=sharedRuns(level),parent=runs.map((_,i)=>i),endpoints=new Map<string,number>();
  const root=(index:number):number=>parent[index]===index?index:(parent[index]=root(parent[index]));
  for(const [i,run] of runs.entries())for(const p of [run.a,run.b]) {
    const key=run.areas.join('|')+'|'+coordinateKey(p),prior=endpoints.get(key);
    if(prior!==undefined)parent[root(i)]=root(prior);else endpoints.set(key,i);
  }
  const groups=new Map<number,Run[]>();
  runs.forEach((run,i)=>{const id=root(i);groups.set(id,[...groups.get(id)??[],run]);});
  const points:V3[]=[],triangles:number[][]=[];
  for(let i=0;i<navigation.positions.length;i+=3)points.push(navigation.positions.slice(i,i+3) as V3);
  for(let i=0;i<navigation.indices.length;i+=3)triangles.push(navigation.indices.slice(i,i+3));
  const nav:FloorPatch={region:'navigation',layer:'',points,triangles,loops:[]},result:[string,string][]=[];
  const tolerance=level.document.player.step+navigation.settings.cellHeight*2;
  for(const group of groups.values()) {
    aborted(signal);
    if(group.reduce((sum,r)=>sum+r.length,0)<level.document.player.radius*2)continue;
    if(group.some(run=>crossing(run,nav,tolerance)))result.push(group[0].areas);
  }
  return result;
}
function independentRoutes(edges:[string,string][],start:string,end:string):number {
  if(!start||!end)return 0;
  if(start===end)return 1;
  const capacities=new Map<string,Map<string,number>>();
  const row=(id:string)=>{if(!capacities.has(id))capacities.set(id,new Map());return capacities.get(id)!;};
  for(const [a,b] of edges){row(a).set(b,(row(a).get(b)??0)+1);row(b).set(a,(row(b).get(a)??0)+1);}
  function augment(at:string,seen:Set<string>):boolean {
    if(at===end)return true;seen.add(at);
    for(const [next,capacity] of row(at))if(capacity>0&&!seen.has(next)&&augment(next,seen)) {
      row(at).set(next,capacity-1);row(next).set(at,(row(next).get(at)??0)+1);return true;
    }
    return false;
  }
  let count=0;while(augment(start,new Set()))count++;return count;
}
/** Uses real floor ownership, contiguous opening runs and sampled native nav crossings. */
export function physicalRouteEvidence(level:CompiledLevel,navigation:NavigationReport,signal?:AbortSignal) {
  const edges=entrances(level,navigation,signal),areas=new Map(level.floors.map(f=>[f.region,f.area??f.region]));
  const markerArea=(id:string)=>{
    const marker=level.document.markers.find(m=>m.id===id)!;
    if(marker.region)return areas.get(marker.region)??marker.region;
    const floor=level.floors.find(f=>f.layer===marker.layer&&Math.abs((heightAt(f,marker.position[0],marker.position[1])??Infinity)-marker.position[2])<0.01);
    return floor?.area??floor?.region??'';
  };
  return {entrances:edges,routes:level.document.routes.map(route=>({id:route.id,
    physicalDisjointRoutes:navigation.routes.find(r=>r.id===route.id)?.reachable?independentRoutes(edges,markerArea(route.from),markerArea(route.to)):0})),
    method:'One capacity per contiguous shared native boundary/opening run between logical floor areas. Separated openings need a real wall pier. Candidate crossings are sampled in the native nav mesh; this conservative guard can undercount, and never replaces strict runtime validation.'};
}
export type PhysicalRouteEvidence=ReturnType<typeof physicalRouteEvidence>;
export function requirePhysicalRoutes(level:CompiledLevel,evidence:PhysicalRouteEvidence) {
  const failures=level.document.routes.filter(r=>(evidence.routes.find(a=>a.id===r.id)?.physicalDisjointRoutes??0)<r.minRoutes);
  if(failures.length)throw new ProducerValidationError('vector',failures.map(r=>({severity:'error',code:'PHYSICAL_ROUTE_REQUIREMENT',
    message:`${r.id}: conservative physical entrances cannot supply ${r.minRoutes} required routes.`,objects:[r.id]})));
}
