import type {GameplayPlan,GameplaySpace} from './types.ts';
import {checkFootprint,footprint,floorPosition} from './footprints.ts';
import {connectionMouths,type Mouth} from './ports.ts';

type ObjectValue=Record<string,unknown>;
function object(value:unknown,keys:string,where:string):ObjectValue {
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error(`${where}: expected a gameplay object.`);
  const record=value as ObjectValue;
  for(const key of Object.keys(record))if(!keys.split(' ').includes(key))throw new Error(`${where}: unknown gameplay field ${key}.`);
  return record;
}
function text(value:unknown,where:string) {
  if(typeof value!=='string'||!value.trim())throw new Error(`${where}: expected nonempty text.`);
}
function number(value:unknown,where:string,min=-1e6,strict=false) {
  if(typeof value!=='number'||!Number.isFinite(value)||(strict?value<=min:value<min)||value>1e6)
    throw new Error(`${where}: expected a finite number ${strict?'>':'>='} ${min}, at most 1000000.`);
}
function tuple(value:unknown,length:number,where:string,min=-1e6,strict=false) {
  if(!Array.isArray(value)||value.length!==length)throw new Error(`${where}: expected ${length} coordinates.`);
  value.forEach(v=>number(v,where,min,strict));
}
function array(value:unknown,where:string,limit=512):unknown[] {
  if(!Array.isArray(value)||value.length>limit)throw new Error(`${where}: expected an array of at most ${limit} items.`);
  return value;
}
function optionalArray(record:ObjectValue,key:string):unknown[] {
  return array(record[key]===undefined?[]:record[key],`gameplay.${key}`);
}
function named(value:unknown,keys:string,where:string,ids:Set<string>):ObjectValue {
  const record=object(value,`id ${keys}`,where);text(record.id,`${where}.id`);
  if(!/^[A-Za-z_][\w.:/-]*$/.test(record.id as string))throw new Error(`${where}: invalid gameplay id ${record.id}.`);
  if(ids.has(record.id as string))throw new Error(`${where}: duplicate gameplay id ${record.id}.`);
  ids.add(record.id as string);if(record.label!==undefined)text(record.label,`${where}.label`);
  return record;
}
function physical(record:ObjectValue,where:string) {
  for(const key of ['wallHeight','headroom'])if(record[key]!==undefined)number(record[key],`${where}.${key}`,0,true);
  if(record.roof!==undefined&&typeof record.roof!=='boolean')throw new Error(`${where}: roof must be boolean.`);
}
function spaceShape(value:unknown,ids:Set<string>) {
  const s=named(value,'label role rect footprint z wallHeight headroom roof','space',ids);physical(s,'space');
  if(s.role!==undefined)text(s.role,'space.role');if(s.z!==undefined)number(s.z,'space.z');
  if((s.rect===undefined)===(s.footprint===undefined))throw new Error(`space ${s.id}: choose rect OR footprint.`);
  if(s.rect!==undefined){tuple(s.rect,4,'space.rect');const r=s.rect as number[];number(r[2],'space width',0,true);number(r[3],'space depth',0,true);}
  if(s.footprint!==undefined)array(s.footprint,'space.footprint',128).forEach(p=>tuple(p,2,'space.footprint'));
  checkFootprint(footprint(s as unknown as GameplaySpace),`space ${s.id}`);
}
function portShape(value:unknown) {
  const p=object(value,'space edge side at','port');text(p.space,'port.space');
  if((p.edge===undefined)===(p.side===undefined))throw new Error('port requires edge OR side.');
  if(p.edge!==undefined){number(p.edge,'port.edge',0);if(!Number.isInteger(p.edge))throw new Error('port.edge must be an integer.');}
  if(p.side!==undefined&&!['south','east','north','west'].includes(p.side as string))throw new Error('Unknown port side.');
  if(p.at!==undefined){number(p.at,'port.at',0);if((p.at as number)>1)throw new Error('port.at must be between zero and one.');}
}
function connectionShape(value:unknown,ids:Set<string>) {
  const c=named(value,'label purpose from to kind width wallHeight headroom roof rise','connection',ids);
  physical(c,'connection');portShape(c.from);portShape(c.to);number(c.width,'connection.width',0,true);
  if(c.kind!==undefined&&!['corridor','door','ramp','stairs'].includes(c.kind as string))throw new Error('Unknown gameplay connection kind.');
  if(c.purpose!==undefined)text(c.purpose,'connection.purpose');
  if(c.rise!==undefined){number(c.rise,'connection.rise',0,true);if(c.kind!=='stairs')throw new Error('connection.rise requires stairs.');}
}
function markerShape(value:unknown,ids:Set<string>) {
  const m=named(value,'label space kind team position','marker',ids);text(m.space,'marker.space');text(m.kind,'marker.kind');
  if(m.team!==undefined)text(m.team,'marker.team');if(m.position!==undefined)tuple(m.position,2,'marker.position');
}
function coverShape(value:unknown,ids:Set<string>) {
  const c=named(value,'label space position size role','cover',ids);text(c.space,'cover.space');tuple(c.position,3,'cover.position');tuple(c.size,3,'cover.size',0,true);
  if(c.role!==undefined)text(c.role,'cover.role');
}
function routeShape(value:unknown,ids:Set<string>) {
  const r=named(value,'label from to minRoutes minDistance maxDistance movement','route',ids);text(r.from,'route.from');text(r.to,'route.to');number(r.minRoutes,'route.minRoutes',1);
  if(!Number.isInteger(r.minRoutes))throw new Error('route.minRoutes must be an integer.');
  for(const k of ['minDistance','maxDistance'])if(r[k]!==undefined)number(r[k],`route.${k}`,0);
  if(r.minDistance!==undefined&&r.maxDistance!==undefined&&(r.minDistance as number)>(r.maxDistance as number))throw new Error('route distance interval is empty.');
  if(r.movement!==undefined&&r.movement!=='land')throw new Error('gameplay routes support land movement.');
}
function playerShape(value:unknown) {
  const p=object(value,'radius height step slope crouch vault rappel ladder','player');
  for(const key of ['radius','height','slope','crouch'])if(p[key]!==undefined)number(p[key],`player.${key}`,0,true);
  for(const key of ['step','vault'])if(p[key]!==undefined)number(p[key],`player.${key}`,0);
  for(const key of ['rappel','ladder'])if(p[key]!==undefined&&typeof p[key]!=='boolean')throw new Error(`player.${key} must be boolean.`);
}
function checkMouths(plan:GameplayPlan,spaces:Map<string,GameplaySpace>) {
  const mouths:Mouth[]=[];
  for(const c of plan.connections) {
    const {a,b}=connectionMouths(c,spaces);
    for(const m of [a,b]) {
      if(mouths.some(p=>p.space===m.space&&p.edge===m.edge&&Math.min(p.high,m.high)-Math.max(p.low,m.low)>1e-8))throw new Error(`${c.id}: overlapping port mouths.`);
      mouths.push(m);
    }
  }
}
function checkPlacements(plan:GameplayPlan,spaces:Map<string,GameplaySpace>) {
  const items=[...plan.markers,...plan.covers??[]];
  for(const item of items)if(!spaces.has(item.space))throw new Error(`${item.id}: unknown space ${item.space}.`);
  for(const m of plan.markers)if(m.position&&!floorPosition(m.position,spaces.get(m.space)!))throw new Error(`${m.id}: marker position is outside its space.`);
}
function checkMarkerReferences(plan:GameplayPlan) {
  const markers=new Set(plan.markers.map(m=>m.id));
  for(const r of plan.routes??[])if(!markers.has(r.from)||!markers.has(r.to))throw new Error(`${r.id}: unknown route marker.`);
  for(const pair of plan.noSpawnLos??[])if(!markers.has(pair[0])||!markers.has(pair[1]))throw new Error('Unknown noSpawnLos marker.');
}
export function validateGameplayPlan(value:unknown):asserts value is GameplayPlan {
  const ids=new Set<string>(),p=named(value,'format name description player wallThickness wallHeight floorThickness spaces connections covers markers routes noSpawnLos moveSpeed','gameplay',ids);
  if(p.format!=='levelspec-gameplay/2')throw new Error('Expected gameplay format levelspec-gameplay/2.');text(p.name,'gameplay.name');
  if(p.description!==undefined)text(p.description,'gameplay.description');
  for(const key of ['wallThickness','wallHeight','floorThickness','moveSpeed'])if(p[key]!==undefined)number(p[key],`gameplay.${key}`,0,true);
  if(p.player!==undefined)playerShape(p.player);
  const spaces=array(p.spaces,'gameplay.spaces',256);if(!spaces.length)throw new Error('gameplay needs at least one space.');spaces.forEach(s=>spaceShape(s,ids));
  array(p.connections,'gameplay.connections').forEach(c=>connectionShape(c,ids));
  array(p.markers,'gameplay.markers').forEach(m=>markerShape(m,ids));
  optionalArray(p,'covers').forEach(c=>coverShape(c,ids));
  optionalArray(p,'routes').forEach(r=>routeShape(r,ids));
  optionalArray(p,'noSpawnLos').forEach(pair=>{array(pair,'noSpawnLos pair',2);if((pair as unknown[]).length!==2)throw new Error('noSpawnLos needs marker pairs.');(pair as unknown[]).forEach(id=>text(id,'noSpawnLos marker'));});
  const plan=value as GameplayPlan,byId=new Map(plan.spaces.map(s=>[s.id,s]));
  checkMouths(plan,byId);checkPlacements(plan,byId);checkMarkerReferences(plan);
}
