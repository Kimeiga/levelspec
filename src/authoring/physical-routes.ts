/** Conservative entrance capacities for native assemblies; strict nav remains authoritative. */
import {ProducerValidationError} from './native-producer.ts';
import {coordinateKey} from '../vector/precision.ts';
import {pathAt,pathLength} from '../vector/geometry.ts';
import {physicalComponents} from './physical-components.ts';
import {aborted,type CompiledLevel,type Edge,type Link,type NavigationReport,type V3} from '../vector/types.ts';

interface Run {areas:[string,string];a:V3;b:V3;length:number;path:V3[]}
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
  for(const l of level.document.layers)for(const r of l.regions)for(const ref of [r.boundary,...r.holes].flat()) {
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
    for(const [start,end] of intervals(edge,pathLength(path),level))runs.push({areas:pair,a:pathAt(path,start),b:pathAt(path,end),length:end-start,path:span(path,start,end)});
  }
  const edges=new Map<string,Edge>();
  for(const layer of level.document.layers)for(const edge of layer.edges)edges.set(edge.id,edge);
  for(const edge of edges.values()){const refs=owners.get(edge.id);if(refs?.length===2)add(refs[0],refs[1],edge);}
  seamRuns(level,owners,edges,add);
  return runs;
}
type Components=ReturnType<typeof physicalComponents>;
interface Resource {kind:'mouth'|'link';from:string[];to:string[];bidirectional:boolean}
function span(path:V3[],start:number,end:number):V3[] {
  const points=[pathAt(path,start)];let distance=0;
  for(let i=1;i<path.length;i++){
    distance+=Math.hypot(...path[i].map((n,j)=>n-path[i-1][j]));
    if(distance>start&&distance<end)points.push(path[i]);
  }
  points.push(pathAt(path,end));return points;
}
function crossings(run:Run,components:Components):[string,string][] {
  return run.path.slice(1).flatMap((b,i)=>segmentCrossings({...run,a:run.path[i],b},components));
}
function segmentCrossings(run:Run,components:Components):[string,string][] {
  const dx=run.b[0]-run.a[0],dy=run.b[1]-run.a[1],length=Math.hypot(dx,dy),result:[string,string][]=[];
  if(!length)return result;
  for(const fraction of [0.5,0.25,0.75,0.125,0.875]) {
    const p=run.a.map((v,i)=>v+(run.b[i]-v)*fraction) as V3;
    if(!components.locate(p))continue;
    const left:V3=[p[0]-dy/length*.05,p[1]+dx/length*.05,p[2]],right:V3=[p[0]+dy/length*.05,p[1]-dx/length*.05,p[2]];
    for(const [a,b] of [[left,right],[right,left]]) {
      const from=components.locate(a,run.areas[0]),to=components.locate(b,run.areas[1]);
      if(from&&to)result.push([from,to]);
    }
  }
  return result;
}
function mouthResource(pairs:[string,string][]):Resource {
  // A blocker may split both sides of one boundary run. Never join disconnected
  // crossing clusters through the capacity node; retain one cluster conservatively.
  const connected=new Set(pairs[0]);let changed=true;
  while(changed){changed=false;for(const [a,b] of pairs)if(connected.has(a)!==connected.has(b)){connected.add(a);connected.add(b);changed=true;}}
  const retained=pairs.filter(([a,b])=>connected.has(a)&&connected.has(b));
  return {kind:'mouth',from:[...new Set(retained.map(p=>p[0]))],to:[...new Set(retained.map(p=>p[1]))],bidirectional:true};
}
function entrances(level:CompiledLevel,components:Components,signal?:AbortSignal) {
  const runs=sharedRuns(level),parent=runs.map((_,i)=>i),endpoints=new Map<string,number>();
  const root=(index:number):number=>parent[index]===index?index:(parent[index]=root(parent[index]));
  for(const [i,run] of runs.entries())for(const p of [run.a,run.b]) {
    const key=JSON.stringify(run.areas)+'|'+coordinateKey(p),prior=endpoints.get(key);
    if(prior!==undefined)parent[root(i)]=root(prior);else endpoints.set(key,i);
  }
  const groups=new Map<number,Run[]>();
  runs.forEach((run,i)=>{const id=root(i);groups.set(id,[...groups.get(id)??[],run]);});
  const areas:[string,string][]=[],resources:Resource[]=[];
  for(const group of groups.values()) {
    aborted(signal);
    if(group.reduce((sum,r)=>sum+r.length,0)<level.document.player.radius*2)continue;
    const pairs=group.flatMap(run=>crossings(run,components));if(!pairs.length)continue;
    areas.push(group[0].areas);
    resources.push(mouthResource(pairs));
  }
  return {areas,resources};
}
interface LinkGroup {from:V3;to:V3;resource:Resource}
function coincidentLink(group:LinkGroup,link:LinkGroup,radius:number) {
  const near=(a:V3,b:V3)=>Math.hypot(...a.map((v,i)=>v-b[i]))<=radius*2;
  const directed=(a:LinkGroup,b:LinkGroup)=>a.resource.from[0]===b.resource.from[0]&&a.resource.to[0]===b.resource.to[0]&&near(a.from,b.from)&&near(a.to,b.to);
  return directed(group,link)||directed(group,{from:link.to,to:link.from,resource:{...link.resource,from:link.resource.to,to:link.resource.from}});
}
function enabledLinkGroups(level:CompiledLevel,components:Components):LinkGroup[] {
  const player=level.document.player,groups:LinkGroup[]=[];
  const areas=new Map(level.floors.map(f=>[f.region,f.area??f.region]));
  const endpoint=(point:V3,area?:string)=>components.locate(point,areas.get(area??'')??area,player.radius);
  const enabled=(link:Link)=>link.movement!=='water'&&!!link.ability&&player[link.ability as keyof typeof player]===true;
  for(const link of level.document.links.filter(enabled)) {
    const from=endpoint(link.from,link.fromArea),to=endpoint(link.to,link.toArea);
    if(!from||!to||from===to)continue;
    groups.push({from:link.from,to:link.to,resource:{kind:'link',from:[from],to:[to],bidirectional:link.bidirectional}});
  }
  return groups;
}
function authoredLinks(level:CompiledLevel,components:Components):Resource[] {
  const groups:LinkGroup[]=[];
  for(const link of enabledLinkGroups(level,components)) {
    const prior=groups.find(g=>coincidentLink(g,link,level.document.player.radius));
    if(prior)prior.resource.bidirectional||=link.resource.bidirectional||prior.resource.from[0]!==link.resource.from[0];
    else groups.push(link);
  }
  return groups.map(g=>g.resource);
}
function independentRoutes(resources:Resource[],start?:string,end?:string):number {
  if(!start||!end)return 0;
  if(start===end)return 1;
  const capacities=new Map<string,Map<string,number>>();
  const row=(id:string)=>{if(!capacities.has(id))capacities.set(id,new Map());return capacities.get(id)!;};
  const add=(a:string,b:string,n:number)=>row(a).set(b,(row(a).get(b)??0)+n);
  // Every resource has one shared bottleneck, even when its mouth touches several components.
  resources.forEach((r,i)=>{
    const a=`resource/${i}/in`,b=`resource/${i}/out`;add(a,b,1);
    for(const c of r.from){add(c,a,resources.length);if(r.bidirectional)add(b,c,resources.length);}
    for(const c of r.to){add(b,c,resources.length);if(r.bidirectional)add(c,a,resources.length);}
  });
  function augment(at:string,seen:Set<string>):boolean {
    if(at===end)return true;seen.add(at);
    for(const [next,capacity] of row(at))if(capacity>0&&!seen.has(next)&&augment(next,seen)) {
      row(at).set(next,capacity-1);row(next).set(at,(row(next).get(at)??0)+1);return true;
    }
    return false;
  }
  let count=0;while(augment(start,new Set()))count++;return count;
}
/** Physical resource capacities between connected, floor-clipped sealed navigation components. */
export function physicalRouteEvidence(level:CompiledLevel,navigation:NavigationReport,signal?:AbortSignal) {
  const components=physicalComponents(level,navigation,signal),mouths=entrances(level,components,signal);
  const resources=[...mouths.resources,...authoredLinks(level,components)],areas=new Map(level.floors.map(f=>[f.region,f.area??f.region]));
  const markerComponent=(id:string)=>{
    const marker=level.document.markers.find(m=>m.id===id)!;
    return components.locate(marker.position,marker.region?(areas.get(marker.region)??marker.region):undefined,level.document.player.radius);
  };
  return {entrances:mouths.areas,components:components.components,resources,
    routes:level.document.routes.map(route=>({id:route.id,physicalDisjointRoutes:navigation.routes.find(r=>r.id===route.id)?.reachable
      ?independentRoutes(resources,markerComponent(route.from),markerComponent(route.to)):0})),
    method:'One capacity per contiguous native mouth or enabled authored traversal resource. Sealed navigation clipped to floor ownership establishes intra-area components, not triangle-edge capacities. Markers and mouths attach to actual components; coincident links share capacity and retain direction. Crossing samples and retaining only one disconnected crossing cluster per mouth can conservatively undercount; strict runtime validation remains required.'};
}
export type PhysicalRouteEvidence=ReturnType<typeof physicalRouteEvidence>;
export function requirePhysicalRoutes(level:CompiledLevel,evidence:PhysicalRouteEvidence) {
  const failures=level.document.routes.filter(r=>(evidence.routes.find(a=>a.id===r.id)?.physicalDisjointRoutes??0)<r.minRoutes);
  if(failures.length)throw new ProducerValidationError('vector',failures.map(r=>({severity:'error',code:'PHYSICAL_ROUTE_REQUIREMENT',
    message:`${r.id}: conservative physical entrances cannot supply ${r.minRoutes} required routes.`,objects:[r.id]})));
}
