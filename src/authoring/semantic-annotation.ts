import {key,unkey,rectCells} from './cell-grid.ts';
import type {Cell,CellRect,SemanticArea} from './semantic-types.ts';

export interface SeedArea extends Omit<SemanticArea,'rects'|'cells'> {seeds:CellRect[]}
function seedFloor(floor:Set<string>,areas:SeedArea[],owner:Map<string,string>):Cell[] {
  const queue:Cell[]=[];
  for(const a of areas)for(const [x,y] of a.seeds.flatMap(r=>[...rectCells(r)]))if(floor.has(key(x,y))&&!owner.has(key(x,y))){owner.set(key(x,y),a.id);queue.push([x,y]);}
  return queue;
}
/** South-up, multi-source four-neighbour flood; ties follow declaration order. */
export function assignSemanticFloor(floor:Set<string>,areas:SeedArea[]):Map<string,string> {
  const owner=new Map<string,string>(),queue=seedFloor(floor,areas,owner);
  for(let i=0;i<queue.length;i++){
    const [x,y]=queue[i],id=owner.get(key(x,y))!;
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,k=key(nx,ny);if(floor.has(k)&&!owner.has(k)){owner.set(k,id);queue.push([nx,ny]);}}
  }
  missingSeeds(floor,areas,owner);
  if(owner.size!==floor.size)throw new Error(`${floor.size-owner.size} occupied floor cells are unreachable from all seeds; add a seed in each disconnected component.`);
  return owner;
}
function missingSeeds(floor:Set<string>,areas:SeedArea[],owner:Map<string,string>) {
  const got=new Set(owner.values()),missing=areas.filter(a=>!got.has(a.id));
  if(missing.length){
    const hints=missing.map(a=>{const seed=a.seeds[0],nearest=[...floor].map(unkey).sort((p,q)=>Math.hypot(p[0]-seed[0],p[1]-seed[1])-Math.hypot(q[0]-seed[0],q[1]-seed[1])).slice(0,4);return `${a.id}: seed missed the floor entirely; nearest floor ${JSON.stringify(nearest)}`;});
    throw new Error(hints.join('; '));
  }
}
