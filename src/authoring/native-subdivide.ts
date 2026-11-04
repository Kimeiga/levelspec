import type {Edge,LevelDocument,V3} from '../vector/types.ts';

/** Split a native boundary and all of its region references; return ordered edges. */
export function subdivideNativeEdge(d:LevelDocument,edge:Edge,cuts:number[],fresh:(s:string)=>string):Edge[] {
  if(edge.openings.length)throw new Error(`${edge.id}: cannot subdivide an existing opening; align source boundaries first.`);
  const layer=d.layers.find(l=>l.edges.includes(edge))!,a=layer.vertices.find(v=>v.id===edge.from)!,b=layer.vertices.find(v=>v.id===edge.to)!,length=cuts.at(-1)!;
  const vertices=[edge.from];
  for(const distance of cuts.slice(1,-1)){const t=distance/length,id=fresh('split/vertex');layer.vertices.push({id,x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t});vertices.push(id);}vertices.push(edge.to);
  const pieces=cuts.slice(1).map((_,i)=>({...edge,id:fresh('split/edge'),from:vertices[i],to:vertices[i+1],openings:[]}));
  const replace=(refs:string[])=>refs.flatMap(ref=>ref.replace(/^-/,'')===edge.id?(ref.startsWith('-')?pieces.map(e=>'-'+e.id).reverse():pieces.map(e=>e.id)):[ref]);
  for(const r of layer.regions){if(r.lower===edge.id||r.upper===edge.id)throw new Error(`${r.id}: cannot split a native flight landing.`);r.boundary=replace(r.boundary);r.holes=r.holes.map(replace);}
  layer.edges.splice(layer.edges.indexOf(edge),1,...pieces);return pieces;
}
export function nativeBoundaryPoints(d:LevelDocument,edge:Edge):[V3,V3] {
  const layer=d.layers.find(l=>l.edges.includes(edge))!;
  return [edge.from,edge.to].map(id=>{const v=layer.vertices.find(v=>v.id===id)!;return [v.x,v.y,v.z] as V3;}) as [V3,V3];
}
