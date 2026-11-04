import {coordinateKey} from '../vector/precision.ts';
import type {V3} from '../vector/types.ts';

function segmentParameter(p:V3,a:V3,b:V3):number|undefined {
  const d=b.map((n,i)=>n-a[i]),length=d.reduce((s,n)=>s+n*n,0);
  const t=d.reduce((s,n,i)=>s+n*(p[i]-a[i]),0)/length;
  if(t<=1e-8||t>=1-1e-8)return;
  return p.every((n,i)=>Math.abs(n-a[i]-t*d[i])<1e-7)?t:undefined;
}
/** Split partial boundary runs in 3D; coincident XY storeys remain separate. */
export function junctions(points:V3[],all:V3[]):V3[] {
  return points.flatMap((a,i)=>{
    const b=points[(i+1)%points.length],cuts=new Map<string,{p:V3;t:number}>();
    for(const p of all){const t=segmentParameter(p,a,b);if(t!==undefined)cuts.set(coordinateKey(p),{p,t});}
    return [a,...[...cuts.values()].sort((x,y)=>x.t-y.t).map(c=>c.p)];
  });
}
