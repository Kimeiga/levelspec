/** Build movement-specific geometry without changing the rendered solids. */
import { DEFAULT_BOAT, type CompiledLevel, type Diagnostic, type FloorPatch, type MeshData, type NavigationOptions, type V3 } from "./types.ts";
import { ClipContext, polygonArea as area, counterclockwise as ccw, ClippingError } from "./clipping.ts";
import { cross, sub, orient } from "./geometry.ts";

const EPS = 1e-7;
type Triangle = [V3, V3, V3];
function height(t: Triangle, p: V3) {
  const n = cross(sub(t[1], t[0]), sub(t[2], t[0]));
  return t[0][2] - (n[0] * (p[0] - t[0][0]) + n[1] * (p[1] - t[0][1])) / n[2];
}
class Index {
  cells = new Map<string, Triangle[]>();
  thickness = new Map<Triangle, number>();
  bounds = new Map<Triangle, number[]>();
  constructor(floors: FloorPatch[], thickness: (floor: FloorPatch) => number = () => 0) {
    const unique = new Set<string>();
    for (const f of floors) for (const indices of f.triangles) {
      const t = indices.map(i => f.points[i]) as Triangle;
      if (Math.abs(orient(...t)) < EPS) continue;
      const depth = thickness(f), id = t.map(v=>v.join(",")).sort().join(";")+":"+depth;
      if (unique.has(id)) continue;
      unique.add(id);
      this.thickness.set(t, depth);
      this.bounds.set(t,[Math.min(...t.map(p=>p[0])),Math.min(...t.map(p=>p[1])),Math.max(...t.map(p=>p[0])),Math.max(...t.map(p=>p[1]))]);
      for (const key of this.keys(t)) {
        const entries = this.cells.get(key) ?? [];
        entries.push(t); this.cells.set(key, entries);
      }
    }
  }
  *keys(poly: V3[]) {
    const x = poly.map(p => p[0]), y = poly.map(p => p[1]);
    for (let a = Math.floor(Math.min(...x) / 8); a <= Math.floor(Math.max(...x) / 8); a++)
      for (let b = Math.floor(Math.min(...y) / 8); b <= Math.floor(Math.max(...y) / 8); b++) yield `${a}:${b}`;
  }
  query(poly: V3[]) {
    const result = new Set<Triangle>();
    const x0=Math.min(...poly.map(p=>p[0])),y0=Math.min(...poly.map(p=>p[1])),x1=Math.max(...poly.map(p=>p[0])),y1=Math.max(...poly.map(p=>p[1]));
    for (const key of this.keys(poly)) for (const t of this.cells.get(key) ?? []) {
      const b=this.bounds.get(t)!;
      if(b[0]>x1 || b[2]<x0 || b[1]>y1 || b[3]<y0)continue;
      result.add(t);
    }
    return [...result];
  }
}
function append(poly: V3[], points: V3[], triangles: number[][], context: ClipContext) {
  if (poly.length < 3 || area(poly) < EPS) return;
  poly = ccw(poly);
  const base = points.length;
  context.allocate(poly.length);
  points.push(...poly);
  for (let i = 1; i + 1 < poly.length; i++)
    if (Math.abs(orient(poly[0], poly[i], poly[i + 1])) > EPS)
      triangles.push([base, base + i, base + i + 1]);
}

/** Trim only unsupported water wholly covered by the millimetre boundary band.
 * The strip union proves the entire fragment is within tolerance, not just its vertices. */
export function repairWaterPrecision(level: CompiledLevel, options: NavigationOptions = {}) {
  if(!level.water?.length)return;
  const context=new ClipContext({...options,movement:"water"}), regions=new Map(level.document.layers.flatMap(l=>l.regions).map(r=>[r.id,r]));
  const beds=new Index(level.floors,f=>regions.get(f.region)?.thickness ?? level.document.floorThickness);
  const repaired:FloorPatch[]=[];
  for(const floor of level.water) {
    let changed=false;
    const points:V3[]=[],triangles:number[][]=[];
    for(const indices of floor.triangles) {
      context.begin(floor.region,regions.get(floor.region)?.source);
      const poly=indices.map(i=>floor.points[i]), z=poly[0][2];
      const candidates=beds.query(poly.flatMap(p=>[p,[p[0]-.001,p[1]-.001,p[2]] as V3,[p[0]+.001,p[1]+.001,p[2]] as V3]));
      let unsupported=[poly],pieces=[poly];
      for(const bed of candidates) {
        const support=context.clip(context.intersect(poly,bed),p=>z-height(bed,p)+(beds.thickness.get(bed)??0)+EPS);
        if(support.length)unsupported=context.subtractMany(unsupported,support);
      }
      for(const fragment of unsupported) {
        let remainder=[fragment];
        for(const bed of candidates)for(let i=0;i<3 && remainder.length;i++) {
          const a=bed[i],b=bed[(i+1)%3],length=Math.hypot(b[0]-a[0],b[1]-a[1]);
          if(length<1e-8)continue;
          const nx=-(b[1]-a[1])*.001/length,ny=(b[0]-a[0])*.001/length;
          const strip:V3[]=[[a[0]+nx,a[1]+ny,z],[b[0]+nx,b[1]+ny,z],[b[0]-nx,b[1]-ny,z],[a[0]-nx,a[1]-ny,z]];
          remainder=context.subtractMany(remainder,strip);
        }
        if(!remainder.length) {
          changed=true;
          pieces=context.subtractMany(pieces,fragment);
          context.repair("WATER_SHORELINE_SNAPPED","Trimmed unsupported water within the 0.001 m terrain boundary band.",1,area(fragment),.001);
        }
      }
      for(const piece of pieces)append(piece,points,triangles,context);
    }
    repaired.push(changed ? {...floor,points,triangles} : floor);
  }
  // Commit atomically: a failed repair leaves the previous geometry untouched.
  level.water.splice(0,level.water.length,...repaired);
  const records=(level.repairs??[]).slice();
  for(const r of context.repairs)if(!records.some(old=>old.movement===undefined && old.code===r.code && old.objects[0]===r.objects[0]))records.push({...r,movement:undefined});
  level.repairs=records;
}

export function movementLevel(level: CompiledLevel, options: NavigationOptions): CompiledLevel & { movementDiagnostics?: Diagnostic[] } {
  const context = new ClipContext(options);
  const clip = context.clip.bind(context), intersect = context.intersect.bind(context);
  const movement = options.movement ?? "land", boat = level.document.boat ?? DEFAULT_BOAT;
  const document = { ...level.document,
    // Recast uses a strict normal > cos(angle) test, so exactly zero rejects flat water.
    player: movement === "water" ? { ...level.document.player, radius: boat.radius, height: boat.height, step: 0, slope: 0.1, vault: 0, ladder: false, rappel: false } : level.document.player,
    markers: level.document.markers.filter(m => (m.movement ?? "land") === movement),
    routes: level.document.routes.filter(r => (r.movement ?? "land") === movement),
    links: level.document.links.filter(l => (l.movement ?? "land") === movement),
  };
  if (!level.water?.length && movement === "land") return { ...level, document };
  for (const [key, value] of Object.entries(boat))
    if (!Number.isFinite(value) || value <= 0) throw new Error(`Boat ${key} must be finite and positive.`);
  const regions = new Map(level.document.layers.flatMap(l => l.regions).map(r => [r.id, r]));
  const waterIndex = new Index(level.water ?? []), bedIndex = new Index(level.floors, f => regions.get(f.region)?.thickness ?? level.document.floorThickness);
  let unknownDepthArea = 0;
  function dry(poly: V3[]): V3[][] {
    let pieces = [poly];
    for (const water of waterIndex.query(poly)) {
      const wet = clip(intersect(poly, water), p => water[0][2] - p[2] - EPS);
      if (wet.length) pieces = context.subtractMany(pieces, wet);
    }
    return pieces;
  }
  function deep(poly: V3[]): V3[][] {
    const z = poly[0][2], beds = bedIndex.query(poly);
    let pieces: V3[][] = [];
    let unsupported = [poly];
    // Union supporting seabed footprints that provide at least the requested draft.
    for (const bed of beds) {
      // A slab intersecting water is known shallow/occupied ground, not missing bathymetry.
      const supported = clip(intersect(poly, bed), p => z - height(bed, p) + (bedIndex.thickness.get(bed) ?? 0) + EPS);
      if (supported.length) unsupported = context.subtractMany(unsupported, supported);
      const footprint = clip(intersect(poly, bed), p => z - boat.draft - height(bed, p));
      if (!footprint.length) continue;
      let fresh = [footprint];
      for (const existing of pieces) fresh = context.subtractMany(fresh, existing);
      context.extend(pieces,fresh);
    }
    unknownDepthArea += unsupported.reduce((sum, p) => sum + area(p), 0);
    // A deeper floor cannot hide a shallower submerged shelf above it.
    for (const bed of beds) {
      const shallow = clip(clip(intersect(poly, bed), p => height(bed, p) - (z - boat.draft) - EPS), p => z - height(bed, p) + EPS);
      if (shallow.length) pieces = context.subtractMany(pieces, shallow);
    }
    return pieces;
  }
  const floors: FloorPatch[] = [];
  const unknownRegions: {region:string;area:number}[]=[];
  for (const floor of movement === "land" ? level.floors : level.water ?? []) {
    const points: V3[] = [], triangles: number[][] = [];
    const previousUnknown=unknownDepthArea;
    for (const t of floor.triangles) {
      context.begin(floor.region, regions.get(floor.region)?.source);
      for (const poly of (movement === "land" ? dry : deep)(t.map(i => floor.points[i]))) append(poly, points, triangles, context);
    }
    if(unknownDepthArea-previousUnknown>1e-8)unknownRegions.push({region:floor.region,area:unknownDepthArea-previousUnknown});
    if (triangles.length) floors.push({ ...floor, points, triangles, loops: floor.loops });
  }
  const mesh: MeshData = { positions: [], indices: [], normals: [], uv: [], surfaces: [] };
  const emit = (poly: V3[], surface: number, flip = false) => {
    const points: V3[] = [], triangles: number[][] = [];
    // Preserve vertical/downward solid faces; append() is for XY polygons only.
    if (poly.length === 3 && Math.abs(orient(poly[0], poly[1], poly[2])) < EPS) {
      context.allocate(poly.length); points.push(...poly); triangles.push([0, 1, 2]);
    } else append(poly, points, triangles, context);
    const start = mesh.positions.length / 3;
    mesh.positions.push(...points.flat());
    for (const tri of triangles) {
      mesh.indices.push(...(flip ? [...tri].reverse() : tri).map(i => i + start));
      mesh.surfaces.push(surface);
    }
  };
  for (let t = 0; t < level.mesh.surfaces.length; t++) {
    const si = level.mesh.surfaces[t], surface = level.surfaces[si];
    if (surface.kind === "water") continue;
    context.begin(surface.object, regions.get(surface.object)?.source);
    const poly = level.mesh.indices.slice(t * 3, t * 3 + 3).map(i => level.mesh.positions.slice(i * 3, i * 3 + 3) as V3);
    const upward = orient(poly[0], poly[1], poly[2]) > EPS;
    if (movement === "land" && upward) {
      const pieces = dry(poly);
      for (const p of pieces) emit(p, si);
      // Submerged geometry remains an obstruction, but never a walking surface.
      let submerged = [poly];
      for (const p of pieces) {
        submerged = context.subtractMany(submerged, p);
      }
      for (const p of submerged) emit(p, si, true);
    } else emit(poly, si, movement === "water" || !upward);
  }
  if (movement === "water") for (const f of floors) {
    const si = level.surfaces.findIndex(s => s.kind === "water" && s.object === f.region);
    for (const tri of f.triangles) {context.begin(f.region, regions.get(f.region)?.source); emit(tri.map(i => f.points[i]), si); }
  }
  return { ...level, document, floors, mesh, navigation: movement === "water" ? level.waterNavigation : level.navigation,
    repairs: [...(level.repairs ?? []).filter(r => r.movement !== movement), ...context.repairs],
    movementDiagnostics: [
      ...unknownRegions.map(({region,area}):Diagnostic=>({severity:"error",code:"WATER_DEPTH_UNKNOWN",message:`Excluded ${area.toPrecision(4)} m² of water without supporting seabed geometry; boat depth is unknown there.`,objects:[region],source:regions.get(region)?.source})),
      ...(movement === "water" ? (level.water??[]).filter(f=>f.triangles.length && !floors.some(p=>p.region===f.region) && !unknownRegions.some(p=>p.region===f.region)).map((f):Diagnostic=>({severity:"error",code:"WATER_DRAFT",message:`Water has no area supporting the ${boat.draft} m draft.`,objects:[f.region],source:regions.get(f.region)?.source})) : []),
    ],
    semantic: { nodes: [...new Set(floors.map(f => f.area ?? f.region))], edges: level.semantic.edges },
  };
}
