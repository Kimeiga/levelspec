import {semanticCells} from './semantic-cells.ts';
import {semanticFlights} from './semantic-flights.ts';
import type {NativeSemanticPlan} from './semantic-types.ts';
import type {LevelDocument} from '../vector/types.ts';

/** Source projection stays strict. Only flights built from this annotation are excluded. */
export function horizontalAnnotation(document:LevelDocument,plan?:NativeSemanticPlan):LevelDocument {
  const flights=new Map(plan?.flights?.map(f=>[f.id,f.kind]));
  const layers=document.layers.map(l=>{
    const regions=l.regions.filter(r=>flights.get(r.area??'')!==r.fill);
    const ids=new Set(regions.flatMap(r=>[r.boundary,...r.holes].flat()).map(ref=>ref.replace(/^-/,'')));
    return {...l,regions,edges:l.edges.filter(e=>ids.has(e.id))};
  });
  const ids=new Set(layers.flatMap(l=>l.edges.map(e=>e.id)));
  return {...document,layers,seams:document.seams.filter(s=>s.edges.every(id=>ids.has(id)))};
}
export function annotationPunches(plan?:NativeSemanticPlan):Set<string> {
  if(!plan?.flights?.length)return new Set();
  const state=semanticCells(plan),before=[...state.layers].flatMap(([id,l])=>[...l.owner.keys()].map(cell=>({id,cell})));
  semanticFlights(state);
  return new Set(before.filter(({id,cell})=>!state.layers.get(id)!.owner.has(cell)).map(({id,cell})=>`${id}:${cell}`));
}
