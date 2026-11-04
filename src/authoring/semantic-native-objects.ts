import {projectNativeFloor} from './semantic-native-projection.ts';
import type {LevelDocument,V3} from '../vector/types.ts';

export function transformedNativeObjects(source:LevelDocument,target:LevelDocument,grid:number) {
  const cells=(d:LevelDocument)=>new Map<string,number>(projectNativeFloor(d,grid).areas.flatMap(a=>a.cells!.map(c=>[`${a.layer}:${c}`,a.z!] as const)));
  const old=cells(source),next=cells({...target,layers:target.layers.filter(l=>source.layers.some(s=>s.id===l.id))});
  const delta=(layer:string,x:number,y:number)=>{const key=`${layer}:${x},${y}`,a=old.get(key),b=next.get(key);if(a===undefined||b===undefined)throw new Error(`Native object has no unambiguous retained floor at ${key}.`);return b-a;};
  const point=(layer:string,p:V3):V3=>[p[0],p[1],p[2]+delta(layer,Math.floor(p[0]/grid),Math.floor(p[1]/grid))];
  const markers=source.markers.map(({region,...m})=>({...structuredClone(m),position:point(m.layer,m.position)}));
  const covers=source.covers.map(c=>{
    const shifts=new Set<number>();
    for(let y=Math.floor(c.min[1]/grid);y<Math.ceil(c.max[1]/grid);y++)for(let x=Math.floor(c.min[0]/grid);x<Math.ceil(c.max[0]/grid);x++)shifts.add(delta(c.layer,x,y));
    if(shifts.size!==1)throw new Error(`${c.id}: native cover spans different elevation transforms; split it before annotation.`);
    const shift=[...shifts][0];return {...structuredClone(c),min:[c.min[0],c.min[1],c.min[2]+shift] as V3,max:[c.max[0],c.max[1],c.max[2]+shift] as V3};
  });
  if(source.props?.length&&[...old].some(([key,z])=>next.get(key)!==z))throw new Error('Native elevation annotation with authored props is ambiguous; revise their transforms explicitly or finalize the original SVGX.');
  return {markers,covers};
}
