/** Isolated v1 adapter: resolve implicit geometry once, then emit native SVGX. */
import { compile as compileLegacy } from '../core/compiler.ts';
import { planToSpec } from './plan.ts';
import { DEFAULTS, type LevelSpec, type CompiledLevel } from '../core/types.ts';
import { createDocument } from '../vector/types.ts';
import { serializeLevelSvgx } from '../vector/format.ts';
import { migrationCrossings } from './legacy-crossings.ts';
import { LegacyGeometry } from './legacy-geometry.ts';

function gameplay(geometry:LegacyGeometry,old:CompiledLevel,spec:LevelSpec) {
  const {document:d,layers,id}=geometry;
  d.markers=old.markers.map(m=>({id:id(m.id),label:m.label,layer:layers.get(m.layer)!.id,position:m.pos,kind:m.kind,team:m.team,
    region:old.nav.nodes.find(n=>n.layer===m.layer&&n.cell[0]===m.cell[0]&&n.cell[1]===m.cell[1])?.space}));
  const markerIds=new Map(old.markers.map((m,i)=>[m.id,d.markers[i].id]));
  d.routes=(spec.gameplay?.required_routes??[]).map(r=>({id:id(r.id),from:markerIds.get(r.from)??r.from,to:markerIds.get(r.to)??r.to,
    minRoutes:r.min_routes??1,minDistance:r.min_distance,maxDistance:r.max_distance}));
  d.noSpawnLos=(spec.gameplay?.no_spawn_los??[]).map(([a,b])=>[markerIds.get(a)??a,markerIds.get(b)??b]);
  for(const e of migrationCrossings(old)) {
    const a=old.nav.nodes[e.a],b=old.nav.nodes[e.b];
    d.links.push({id:id(e.via??`link${d.links.length}`),from:a.pos,to:b.pos,kind:e.kind,bidirectional:true,fromArea:a.space,toArea:b.space});
  }
}

export function migrateSpec(spec:LevelSpec) {
  const old=compileLegacy(spec),d=createDocument(spec.id);
  d.name=spec.name;d.description=spec.description;d.expectFail=spec.expect_fail;
  d.wallThickness=spec.wall_thickness??0.22;d.floorThickness=spec.floor_thickness??0.2;
  d.player={...d.player,...DEFAULTS.player,...spec.player};
  const geometry=new LegacyGeometry(d,old,spec);
  for(const s of old.solids)geometry.add(s);
  geometry.splitCrossings();
  gameplay(geometry,old,spec);
  return {document:d,legacy:old,text:serializeLevelSvgx(d)};
}
export function migrateText(text:string,json=false) {return migrateSpec(json?JSON.parse(text):planToSpec(text));}
