import {fields,finite,list,object,rect} from './semantic-check.ts';
import type {SpatialConcept,BandPlan,ZonePlan,LinkPlan} from './concept-layout.ts';

function text(value:unknown,label:string) {if(typeof value!=='string'||!value.trim())throw new Error(`${label} must be a nonempty string.`);}
function id(value:unknown) {text(value,'id');if(!/^[A-Za-z_][\w.:/-]*$/.test(value as string))throw new Error(`Invalid concept id ${value}.`);}
function integer(value:unknown,label:string,min=1,max=1e6) {finite(value,label,min);if(!Number.isSafeInteger(value)||(value as number)>max)throw new Error(`${label} must be an integer <= ${max}.`);}
function optionalBoolean(value:unknown,label:string) {if(value!==undefined&&typeof value!=='boolean')throw new Error(`${label} must be boolean.`);}
function zone(z:ZonePlan) {
  fields(z,['id','label','role','weight','height','open','cover','seal'],'zone');id(z.id);text(z.label,'zone label');finite(z.weight,'weight',.001);
  if(!['room','corridor','lane','stairwell','site','spawn','exterior','balcony','roof'].includes(z.role))throw new Error(`Invalid zone role ${z.role}.`);
  if(z.height!==undefined)finite(z.height,'zone height',.001);optionalBoolean(z.open,'open');
  if(z.cover!==undefined){fields(z.cover,['label','height','as','count'],'cover');text(z.cover.label,'cover label');finite(z.cover.height,'cover height',.001);integer(z.cover.count,'cover count',0,10000);if(!['crate','barrel','vehicle'].includes(z.cover.as))throw new Error(`Invalid cover kind ${z.cover.as}.`);}
  if(z.seal!==undefined)for(const [other,kind] of Object.entries(object(z.seal,'seal'))){id(other);if(kind!=='door'&&kind!=='arch')throw new Error(`Invalid seal ${kind}.`);}
}
function band(b:BandPlan) {
  fields(b,['id','z','height','purpose','roofed','extent','zones'],'band');id(b.id);finite(b.z,'band z');finite(b.height,'band height',.001);text(b.purpose,'band purpose');optionalBoolean(b.roofed,'roofed');rect(b.extent,'extent');
  if(!list(b.zones,'zones').length)throw new Error(`${b.id}: zones cannot be empty.`);b.zones.forEach(zone);
}
type ZoneLookup=Map<string,{zone:ZonePlan;band:BandPlan}>;
function floorZone(id:string,zones:ZoneLookup,band:BandPlan|undefined) {
  const target=zones.get(id);if(!target||target.band!==band||target.zone.open)throw new Error(`Invalid floor zone reference ${id}.`);return target.zone;
}
function sealReferences(b:BandPlan,z:ZonePlan,zones:ZoneLookup) {
  for(const [other,kind] of Object.entries(z.seal??{})){
    const target=floorZone(other,zones,b);if(z.open||other===z.id)throw new Error(`${z.id}: invalid seal reference ${other}.`);
    const reverse=target.seal?.[z.id];if(reverse&&reverse!==kind)throw new Error(`${z.id}: conflicting seal with ${other}.`);
  }
}
function linkReference(l:LinkPlan,bands:Map<string,BandPlan>,zones:ZoneLookup) {
    fields(l,['from','to','fromZone','toZone','width','optional'],'link');finite(l.width,'link width',.001);optionalBoolean(l.optional,'optional');
    const a=bands.get(l.from),b=bands.get(l.to);floorZone(l.fromZone,zones,a);floorZone(l.toZone,zones,b);
    if(!a||!b)throw new Error(`Invalid link reference ${l.fromZone}->${l.toZone}.`);
    if(b.z<=a.z)throw new Error(`${l.fromZone}->${l.toZone}: link must ascend.`);
}
function references(c:SpatialConcept) {
  const bands=new Map(c.bands.map(b=>[b.id,b])),zones=new Map(c.bands.flatMap(b=>b.zones.map(z=>[z.id,{zone:z,band:b}] as const)));
  for(const name of [c.spawn,c.objective])if(!zones.has(name)||zones.get(name)!.zone.open)throw new Error(`Unknown or open marker zone ${name}.`);
  for(const b of c.bands)for(const z of b.zones)sealReferences(b,z,zones);
  for(const l of c.links)linkReference(l,bands,zones);
}
/** Validate caller JSON before layout, allocation or native compilation. */
export function checkConcept(value:unknown):asserts value is SpatialConcept {
  fields(value,['id','name','thesis','built','incident','verb','contrast','grid','size','wall','bands','links','spawn','objective','routes'],'concept');
  const c=value as SpatialConcept;id(c.id);for(const key of ['name','thesis','built','incident','spawn','objective'] as const)text(c[key],key);
  if(!['cross','climb','descend','orbit','thread','infiltrate','escape','emerge'].includes(c.verb))throw new Error(`Invalid concept verb ${c.verb}.`);
  if(list(c.contrast,'contrast').length!==2)throw new Error('contrast requires two strings.');c.contrast.forEach(s=>text(s,'contrast'));
  finite(c.grid,'grid',.001);finite(c.wall,'wall',.001);if(list(c.size,'size').length!==2)throw new Error('size requires two dimensions.');c.size.forEach(n=>integer(n,'size',6,10000));
  const count=list(c.bands,'bands').length;if(!count||count>64||c.size[0]*c.size[1]*count>1e6)throw new Error('Concept requires 1–64 bands and at most one million cells.');
  c.bands.forEach(band);list(c.links,'links');if(c.routes!==undefined)integer(c.routes,'routes');
  const ids=[...c.bands.map(b=>b.id),...c.bands.flatMap(b=>b.zones.map(z=>z.id))];if(new Set(ids).size!==ids.length)throw new Error('Band and zone IDs must be unique.');references(c);
}
