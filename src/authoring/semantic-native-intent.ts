import type {Edge,LevelDocument} from '../vector/types.ts';
import type {NativeSemanticPlan} from './semantic-types.ts';
import {semanticCells} from './semantic-cells.ts';
import {projectNativeFloor} from './semantic-native-projection.ts';
import {horizontalAnnotation} from './semantic-native-flights.ts';

/** Only explicit boundary/portal declarations constrain restoration of default edges. */
function boundaryOwners(document:LevelDocument,names:Map<string,string>) {
  const owners=new Map<string,string[]>();
  for(const l of document.layers)for(const r of l.regions)for(const ref of [r.boundary,...r.holes].flat()){
    const id=ref.replace(/^-/,'');owners.set(id,[...owners.get(id)??[],names.get(r.id)??r.area??r.id]);
  }
  return owners;
}
function regionNames(document:LevelDocument,plan?:NativeSemanticPlan) {
  if(!plan)return new Map<string,string>();
  const state=semanticCells(plan),areas=projectNativeFloor(horizontalAnnotation(document,plan),plan.grid).areas;
  return new Map(areas.map(a=>[a.id,state.layers.get(a.layer!)!.owner.get(a.cells![0].join(','))!]));
}
export function requiredNativeBoundaries(document:LevelDocument,plan?:NativeSemanticPlan) {
  const pairs=[...plan?.boundaries??[],...plan?.portals??[]].map(p=>[...p.between].sort().join('|'));
  if(!pairs.length)return new Set<string>();
  const owners=boundaryOwners(document,regionNames(document,plan));
  const required=new Set<string>();
  for(const [id,areas] of owners)if(pairs.includes([...areas].sort().join('|')))required.add(id);
  for(const seam of document.seams)if(pairs.includes(seam.edges.flatMap(id=>owners.get(id)??[]).sort().join('|')))for(const id of seam.edges)required.add(id);
  return required;
}
export function requireCompatibleBoundary(expected:Edge,retained:Edge) {
  const intent=(e:Edge)=>JSON.stringify([e.kind,e.openings.map(o=>[o.kind,o.start,o.end,o.sill,o.head]).sort()]);
  if(intent(expected)!==intent(retained))throw new Error(`${expected.id}: annotation conflicts with an authored native boundary; edit the native source directly.`);
}
