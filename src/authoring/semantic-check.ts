import type {NativeSemanticPlan} from './semantic-types.ts';

export function object(value:unknown,label:string):Record<string,unknown> {
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error(`${label} must be an object.`);
  return value as Record<string,unknown>;
}
export function fields(value:unknown,allowed:string[],label:string) {
  const o=object(value,label),unknown=Object.keys(o).filter(k=>!allowed.includes(k));
  if(unknown.length)throw new Error(`${label}: unsupported fields ${unknown.join(', ')}.`);
}
export function finite(value:unknown,label:string,min=-Infinity):number {
  if(typeof value!=='number'||!Number.isFinite(value)||value<min)throw new Error(`${label} must be a finite number >= ${min}.`);
  return value;
}
function tuple(value:unknown,length:number,label:string,integer=false) {
  if(!Array.isArray(value)||value.length!==length)throw new Error(`${label} requires ${length} coordinates.`);
  value.forEach(n=>{finite(n,label);if(integer&&!Number.isInteger(n))throw new Error(`${label} must use integer cells.`);});
}
export function rect(value:unknown,label:string) {tuple(value,4,label,true);const r=value as number[];if(r[2]<1||r[3]<1||r[2]*r[3]>1e6)throw new Error(`${label} must have positive dimensions and at most one million cells.`);}
export function list(value:unknown,label:string):unknown[] {if(!Array.isArray(value))throw new Error(`${label} must be an array.`);return value;}
function identifier(id:unknown) {if(typeof id!=='string'||!/^[A-Za-z_][\w.:/-]*$/.test(id))throw new Error(`Invalid semantic id ${id}.`);}
function optionalNumbers(o:object,names:string[],min:number) {for(const k of names){const v=(o as Record<string,unknown>)[k];if(v!==undefined)finite(v,k,min);}}
function boolean(value:unknown,label:string) {if(value!==undefined&&typeof value!=='boolean')throw new Error(`${label} must be boolean.`);}
function checkArea(a:NativeSemanticPlan['areas'][number]) {
  fields(a,['id','label','role','layer','z','height','roof','rects','holes','cells'],'area');
  if((a.rects===undefined)===(a.cells===undefined))throw new Error(`${a.id}: give exactly one of rects or cells.`);
  for(const r of a.rects??[])rect(r,a.id);for(const r of a.holes??[])rect(r,a.id);
  for(const c of a.cells??[])tuple(c,2,a.id,true);
  optionalNumbers(a,['z'],-Infinity);optionalNumbers(a,['height'],.001);boolean(a.roof,'roof');
}
function checkFloors(p:NativeSemanticPlan) {
  for(const l of p.layers){fields(l,['id','label','z','height','roof'],'layer');optionalNumbers(l,['z'],-Infinity);optionalNumbers(l,['height'],.001);boolean(l.roof,'roof');}
  for(const a of p.areas)checkArea(a);
  for(const c of p.covers??[]){fields(c,['id','label','role','layer','rect','height','z'],'cover');rect(c.rect,c.id);finite(c.height,'cover height',.001);optionalNumbers(c,['z'],-Infinity);}
}
function checkFlight(f:NonNullable<NativeSemanticPlan['flights']>[number],grid:number) {
  fields(f,['id','label','kind','from','to','width','rise'],'flight');if(!['stairs','ramp'].includes(f.kind))throw new Error(`Unsupported physical flight ${f.kind}.`);
  for(const end of [f.from,f.to]){fields(end,['layer','cell'],'flight endpoint');tuple(end.cell,2,f.id,true);}optionalNumbers(f,['width','rise'],.001);
  if(f.width!==undefined&&Math.abs(f.width/grid-Math.round(f.width/grid))>1e-7)throw new Error(`${f.id}: exact flight width must be a whole number of grid cells.`);
}
function checkGameplay(p:NativeSemanticPlan) {
  for(const m of p.markers??[]){fields(m,['id','area','kind','team','label','position','movement'],'marker');if(m.position)tuple(m.position,2,m.id);}
  for(const r of p.routes??[]){fields(r,['id','label','from','to','minRoutes','minDistance','maxDistance','movement'],'route');finite(r.minRoutes,'minRoutes',1);if(!Number.isInteger(r.minRoutes))throw new Error('minRoutes must be an integer.');optionalNumbers(r,['minDistance','maxDistance'],0);}
}
function checkPortal(portal:NonNullable<NativeSemanticPlan['portals']>[number]) {
  fields(portal,['id','between','kind','width','at','head','sill'],'portal');
  if(!['door','arch','window'].includes(portal.kind))throw new Error(`Unsupported portal ${portal.kind}.`);
  if(portal.width!=='full')finite(portal.width,'portal width',.001);if(portal.at)tuple(portal.at,2,portal.id);optionalNumbers(portal,['head'],.001);optionalNumbers(portal,['sill'],0);
}
function checkMetadata(p:NativeSemanticPlan) {
  optionalNumbers(p,['wallThickness','floorThickness','moveSpeed'],.001);optionalNumbers(p,['width','height'],1);
  boolean(p.expectFail,'expectFail');if(p.validation!==undefined&&!['premap','playable'].includes(p.validation))throw new Error('Unsupported validation mode.');
  if(p.player){fields(p.player,['radius','height','step','slope','crouch','vault','rappel','ladder'],'player');optionalNumbers(p.player,['radius','height','crouch'],.001);optionalNumbers(p.player,['step','slope','vault'],0);boolean(p.player.rappel,'rappel');boolean(p.player.ladder,'ladder');}
}
function checkIds(p:NativeSemanticPlan) {
  const collections:({id:string}[]|undefined)[]=[p.layers,p.areas,p.covers,p.flights,p.portals,p.markers,p.routes],ids=new Set<string>();
  for(const o of [p,...collections.flatMap(items=>items??[])]){identifier(o.id);if(ids.has(o.id))throw new Error(`Duplicate semantic id ${o.id}.`);ids.add(o.id);}
}
export function checkSemantic(value:unknown):asserts value is NativeSemanticPlan {
  fields(value,['format','id','name','description','grid','width','height','wallThickness','floorThickness','player','layers','areas','covers','flights','portals','boundaries','markers','routes','noSpawnLos','moveSpeed','expectFail','validation','placementDiagnostics'],'semantic plan');
  const p=value as NativeSemanticPlan;
  if(p.format!=='levelspec-semantic/2')throw new Error('Expected levelspec-semantic/2.');identifier(p.id);
  if(typeof p.name!=='string'||!p.name)throw new Error('Semantic name is required.');finite(p.grid,'grid',.001);
  for(const name of ['layers','areas','covers','flights','portals','boundaries','markers','routes','noSpawnLos','placementDiagnostics'] as const)if(p[name]!==undefined)list(p[name],name);
  if(!p.layers?.length||!p.areas?.length)throw new Error('Semantic layers and areas must be nonempty.');
  checkMetadata(p);checkIds(p);checkFloors(p);checkGameplay(p);
  for(const f of p.flights??[])checkFlight(f,p.grid);for(const ptl of p.portals??[])checkPortal(ptl);
  for(const b of p.boundaries??[])fields(b,['between','kind'],'boundary');
}
