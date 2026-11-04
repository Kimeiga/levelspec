import type {ProducedLevel} from '../authoring/native-producer.ts';
import {rayBlocked} from '../vector/validate.ts';
import {aborted,type V3} from '../vector/types.ts';
import type {GameplayPlan} from './types.ts';
import type {PhysicalRouteEvidence} from '../authoring/physical-routes.ts';

/** Advisory evidence only. Publication has already passed sealed validation. */
export function assessGameplay(plan:GameplayPlan,made:ProducedLevel,physical:PhysicalRouteEvidence,signal?:AbortSignal) {
  const nav=made.report.sealed??made.report.navigation,moveSpeed=plan.moveSpeed??4.6;
  const elevation=made.level.floors.flatMap(f=>f.points.map(p=>p[2]));
  const neighbours=new Map(made.level.semantic.nodes.map(id=>[id,new Set<string>()]));
  for(const [a,b] of physical.entrances){neighbours.get(a)?.add(b);neighbours.get(b)?.add(a);}
  const degree=plan.spaces.map(s=>({id:s.id,degree:neighbours.get(s.id)?.size??0}));
  const samples:{from:string;to:string;visible:boolean}[]=[],markers=made.document.markers;
  const totalPairs=markers.length*(markers.length-1)/2,triangles=made.level.mesh.indices.length/3;
  const limit=Math.min(64,Math.floor(2000000/Math.max(1,triangles)));
  const raised=(p:V3):V3=>[p[0],p[1],p[2]+made.document.player.height*0.9];
  for(let i=0;i<markers.length&&samples.length<limit;i++)for(let j=i+1;j<markers.length&&samples.length<limit;j++) {
    aborted(signal);samples.push({from:markers[i].id,to:markers[j].id,visible:!rayBlocked(made.level,raised(markers[i].position),raised(markers[j].position),true)});
  }
  return {
    advisory:true as const,geometryHash:made.level.geometryHash,moveSpeed,
    routes:(nav?.routes??[]).map(r=>({...r,physicalDisjointRoutes:physical.routes.find(p=>p.id===r.id)!.physicalDisjointRoutes,
      travelSeconds:r.reachable&&Number.isFinite(r.distance)?r.distance/moveSpeed:null})),
    physicalRouteMethod:physical.method,
    structure:{spaces:plan.spaces.length,connections:plan.connections.length,degrees:degree,
      branches:degree.filter(s=>s.degree>=3).map(s=>s.id),deadEnds:degree.filter(s=>s.degree===1).map(s=>s.id),
      basis:'Unique adjacent logical floor areas from conservative physical entrances and sampled native-nav crossings; no tactical quality score.'},
    elevation:{min:Math.min(...elevation),max:Math.max(...elevation)},coverCount:made.document.covers.length,
    sightlines:{samples,totalPairs,truncated:samples.length<totalPairs,
      method:'Deterministic marker pairs at 90% player height against compiled collidable triangles, including sealed dynamic geometry; at most 64 pairs and 2 million triangle tests. Samples are advisory, not bot playtesting.'},
  };
}
