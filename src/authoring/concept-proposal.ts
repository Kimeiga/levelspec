import {layout,rng,headroom,flightCells,stairBetween,footprintOf,touching,type SpatialConcept,type PlacedZone,type Cells} from './concept-layout.ts';
import {checkConcept} from './concept-check.ts';
import type {NativeSemanticPlan,PlacementDiagnostic} from './semantic-types.ts';

function identifiers(c:SpatialConcept) {
  const used=new Set([c.id,...c.bands.map(b=>b.id),...c.bands.flatMap(b=>b.zones.map(z=>z.id))]);
  return (base:string)=>{let id=base,n=1;while(used.has(id))id=`${base}.${n++}`;used.add(id);return id;};
}
function flights(c:SpatialConcept,placed:PlacedZone[],plan:NativeSemanticPlan,fresh:(s:string)=>string) {
  const taken:Cells[]=[],occupied:{band:string;foot:Cells}[]=[],at=new Map(placed.map(z=>[z.id,z]));
  for(const [i,l] of c.links.entries()){
    const lower=c.bands.find(b=>b.id===l.from)!,upper=c.bands.find(b=>b.id===l.to)!,wide=Math.max(1,Math.round(l.width/c.grid));
    const flight=stairBetween(at.get(l.fromZone)!.at,at.get(l.toZone)!.at,flightCells(upper.z-lower.z,c.grid),wide,taken),id=fresh(`concept/flight/${i}`);
    if(!flight){if(!l.optional)throw new Error(`${id}: required link ${l.fromZone}->${l.toZone} has no room.`);plan.placementDiagnostics!.push({id,code:'OPTIONAL_LINK_OMITTED',message:`Optional link ${l.fromZone}->${l.toZone} has no room.`,proposed:1,placed:0,omitted:1});continue;}
    let [fx,fy,tx,ty]=flight;const half=Math.floor((wide-1)/2);if(fx===tx){fx+=half;tx+=half;}else{fy+=half;ty+=half;}
    plan.flights!.push({id,kind:'stairs',from:{layer:l.from,cell:[fx,fy]},to:{layer:l.to,cell:[tx,ty]},width:wide*c.grid});
    occupied.push({band:l.from,foot:footprintOf([flight[0],flight[1]],[flight[2],flight[3]],wide)},{band:l.to,foot:footprintOf([flight[0],flight[1]],[flight[2],flight[3]],wide)});
    plan.placementDiagnostics!.push({id,code:'FLIGHT_GRID_WIDTH',message:`${l.fromZone}->${l.toZone}: requested ${l.width}m; historical grid footprint ${wide*c.grid}m (${wide} cells).`,proposed:1,placed:1,omitted:0});
  }
  return occupied;
}
function covers(c:SpatialConcept,placed:PlacedZone[],plan:NativeSemanticPlan,occupied:{band:string;foot:Cells}[],seed:string,fresh:(s:string)=>string) {
  const roll=rng(`${c.id}:${seed}:cover`),used=new Set<string>();
  for(const z of placed){
    if(z.open||!z.cover)continue;const [x,y,w,h]=z.at;let count=0;
    for(let i=0;i<z.cover.count&&w>=6&&h>=6;i++){
      const cx=x+2+Math.floor(roll()*(w-4)),cy=y+2+Math.floor(roll()*(h-4)),key=`${z.band}:${cx},${cy}`;
      if(used.has(key)||occupied.some(f=>f.band===z.band&&cx>=f.foot[0]&&cx<f.foot[0]+f.foot[2]&&cy>=f.foot[1]&&cy<f.foot[1]+f.foot[3]))continue;
      used.add(key);count++;plan.covers!.push({id:fresh(`concept/cover/${z.id}/${i}`),label:z.cover.label,role:z.cover.as,layer:z.band,rect:[cx,cy,1,1],height:z.cover.height});
    }
    const d:PlacementDiagnostic={id:z.id,code:'COVER_PROPOSAL',message:'Cover count is a bounded placement proposal; occupied flight/cover cells are omitted.',proposed:z.cover.count,placed:count,omitted:z.cover.count-count};plan.placementDiagnostics!.push(d);
  }
}
function seals(placed:PlacedZone[],plan:NativeSemanticPlan,fresh:(s:string)=>string) {
  const at=new Map(placed.map(z=>[z.id,z])),done=new Set<string>();
  for(const z of placed)for(const [other,kind] of Object.entries(z.seal??{})){
    const target=at.get(other)!,key=[z.id,other].sort().join('|');if(done.has(key))continue;done.add(key);
    if(!touching(z.at,target.at))throw new Error(`${z.id}->${other}: required ${kind} seal has no shared boundary.`);
    plan.portals!.push({id:fresh(`concept/seal/${done.size}`),between:[z.id,other],kind,width:kind==='door'?2:3});
  }
}
/** An unvalidated source proposal. Hard declarations survive unchanged into semantic publication. */
export function createConcept(concept:SpatialConcept,seed='v0',variant=0) {
  checkConcept(concept);if(typeof seed!=='string'||!seed)throw new Error('seed must be a nonempty string.');
  if(!Number.isInteger(variant)||variant<0||variant>4)throw new Error('variant must be 0–4.');
  const c=structuredClone(concept),placed=layout(c,seed),fresh=identifiers(c),spawn=fresh('concept/spawn'),objective=fresh('concept/objective');
  const documentId=`concept/${c.id.length}/${c.id}/variant/${variant}`;
  if(c.bands.some(b=>b.id===documentId||b.zones.some(z=>z.id===documentId)))throw new Error(`Source ID conflicts with reserved document ID ${documentId}.`);
  const plan:NativeSemanticPlan={format:'levelspec-semantic/2',id:documentId,name:c.name+(variant?` ${['','II','III','IV','V'][variant]}`:''),description:`${c.name}. ${c.thesis} Built as ${c.built}; ${c.incident}.`,grid:c.grid,width:c.size[0],height:c.size[1],wallThickness:c.wall,player:{radius:.35,height:1.8,step:.45,crouch:1.1},layers:[],areas:[],flights:[],covers:[],portals:[],placementDiagnostics:[],markers:[{id:spawn,area:c.spawn,kind:'attacker_spawn',team:'attack'},{id:objective,area:c.objective,kind:'site',team:'neutral'}],routes:[{id:fresh('concept/route'),from:spawn,to:objective,minRoutes:c.routes??2}]};
  for(const b of c.bands){const room=headroom(c,b),roof=b.roofed??c.bands.some(other=>other.z>b.z);plan.layers.push({id:b.id,label:b.purpose,z:b.z,height:Math.min(b.height,room),roof});
    for(const z of placed.filter(z=>z.band===b.id&&!z.open))plan.areas.push({id:z.id,label:z.label,role:z.role,layer:b.id,rects:[z.at],height:Math.min(z.height??b.height,room),roof});}
  const occupied=flights(c,placed,plan,fresh);covers(c,placed,plan,occupied,seed,fresh);seals(placed,plan,fresh);
  return {source:c,plan,placed,seed,signature:placed.map(z=>`${z.id}@${z.at.join(',')}`)};
}
