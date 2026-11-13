import {ArchitectureBuilder,type V3} from 'levelspec';

/** Adds one explicit native floor; fixtures keep logical area ownership separate from geometry. */
export function floor(builder:ArchitectureBuilder,id:string,points:V3[],area=id,holes:V3[][]=[]){
  const profile=builder.profile(`${id}:profile`,points,{holes:holes.map(points=>({points}))});return builder.slab(id,profile.id,{area});
}
/** Declares one authored mouth path, whose real clearance still comes from compiled collision. */
export function mouth(builder:ArchitectureBuilder,id:string,from:string,to:string,points:V3[]){builder.path(id,points);builder.document.connections.push({id,from,to,path:id});}
/** Explicit markers avoid any frontend's automatic placement or inferred rooms. */
export function route(builder:ArchitectureBuilder,from:V3,to:V3,fromArea:string,toArea:string,minRoutes=1){
  builder.document.markers=[{id:'start',kind:'spawn',layer:'architecture',region:fromArea,position:from},{id:'end',kind:'objective',layer:'architecture',region:toArea,position:to}];
  builder.document.routes=[{id:'walk',from:'start',to:'end',minRoutes}];
}
export const rectangle=(x:number,y:number,w:number,h:number,z=0):V3[]=>[[x,y,z],[x+w,y,z],[x+w,y+h,z],[x,y+h,z]];
