/** Reusable intent-level operations. Output is ordinary, independently validated SVGX. */
import { createDocument, type LevelDocument, type Layer, type Region, type V3, type Material } from "./types.ts";
import { coordinateKey, snapCoordinate } from "./precision.ts";
import { rotateXYZ, type SceneProp } from "./props.ts";

export interface Frame { origin?: V3; yaw?: number }
export interface PropOptions {
  position: V3;
  size: V3;
  material: string;
  collision: SceneProp["collision"];
  rotation?: V3;
}
function positive(name: string, ...values: number[]) {
  if (!values.every((n) => Number.isFinite(n) && n > 0)) throw new Error(`${name} must be finite and positive.`);
}
function count(name: string, value: number, limit = 1000) {
  if (!Number.isInteger(value) || value < 1 || value > limit) throw new Error(`${name} must be an integer between 1 and ${limit}.`);
}
function identifier(id: string) {
  if (!/^[A-Za-z_][\w.:/-]*$/.test(id)) throw new Error(`Invalid authoring id ${id}.`);
  return id;
}
export class SceneBuilder {
  readonly document: LevelDocument;
  private groups = new Set<string>();
  constructor(id: string) { this.document = createDocument(identifier(id)); this.material("default"); }
  material(id: string, options: Partial<Omit<Material, "id">> = {}) {
    if (this.document.materials.some((m) => m.id === id)) throw new Error(`Duplicate material ${id}.`);
    this.document.materials.push({ id: identifier(id), color: "#b9c7d1", repeat: 1, roughness: 0.8, metalness: 0, ...options });
    return id;
  }
  group(id: string, frame: Frame = {}, layerId = "architecture"): AuthoringGroup {
    identifier(id); identifier(layerId);
    if (this.groups.has(id)) throw new Error(`Duplicate authoring group ${id}.`);
    this.groups.add(id);
    let layer = this.document.layers.find((l) => l.id === layerId);
    if (!layer) { layer = { id: layerId, vertices: [], edges: [], regions: [] }; this.document.layers.push(layer); }
    return new AuthoringGroup(this, id, layer, frame.origin ?? [0,0,0], frame.yaw ?? 0);
  }
}
export class AuthoringGroup {
  private vertices = new Map<string, string>();
  private edges = new Map<string, { id: string; from: string; to: string }>();
  private operations = new Set<string>();
  readonly scene: SceneBuilder;
  readonly id: string;
  readonly layer: Layer;
  readonly origin: V3;
  readonly yaw: number;
  constructor(scene: SceneBuilder, id: string, layer: Layer, origin: V3, yaw: number) {
    this.scene = scene; this.id = id; this.layer = layer; this.origin = [...origin]; this.yaw = yaw;
    if (origin.length !== 3 || ![...origin, yaw].every(Number.isFinite)) throw new Error("A group needs a finite origin and yaw.");
  }
  private name(id: string) {
    identifier(id);
    const full = `${this.id}/${id}`;
    if (this.operations.has(full)) throw new Error(`Duplicate authoring operation ${full}.`);
    this.operations.add(full);
    return full;
  }
  world(point: V3): V3 {
    return rotateXYZ(point, [0,0,this.yaw]).map((n,i) => snapCoordinate(n + this.origin[i])) as V3;
  }
  group(id: string, frame: Frame = {}) {
    return this.scene.group(this.name(id), { origin: this.world(frame.origin ?? [0,0,0]), yaw: this.yaw + (frame.yaw ?? 0) }, this.layer.id);
  }
  private prop(id: string, shape: SceneProp["shape"], options: PropOptions, extra: Partial<SceneProp> = {}) {
    positive("Prop size", ...options.size);
    const rotation = options.rotation ?? [0,0,0];
    const prop: SceneProp = { id: this.name(id), layer: this.layer.id, shape, position: this.world(options.position),
      scale: [...options.size], rotation: [rotation[0], rotation[1], rotation[2] + this.yaw],
      material: options.material, collision: options.collision, ...extra };
    (this.scene.document.props ??= []).push(prop);
    return prop;
  }
  box(id: string, options: PropOptions) { return this.prop(id, "box", options); }
  cylinder(id: string, options: PropOptions & { segments?: number }) {
    return this.prop(id, "cylinder", options, { segments: options.segments ?? 16 });
  }
  asset(id: string, asset: string, options: PropOptions) {
    return this.prop(id, "asset", options, { asset });
  }
  beam(id: string, from: V3, to: V3, diameter: number, material: string, collision: SceneProp["collision"] = "none") {
    const [x,y,z] = to.map((n,i) => n - from[i]), length = Math.hypot(x,y,z);
    positive("Beam length and diameter", length, diameter);
    return this.cylinder(id, { position: from, size: [diameter,diameter,length], material, collision,
      rotation: [0, Math.atan2(Math.hypot(x,y),z)*180/Math.PI, Math.atan2(y,x)*180/Math.PI], segments: 12 });
  }
  /** This explicit assembly owns its shared boundaries; the compiler never welds unrelated groups. */
  polygon(id: string, points: V3[], options: Partial<Pick<Region, "fill" | "thickness" | "material" | "rise" | "underside">> = {}) {
    if (points.length < 3) throw new Error("A floor polygon needs at least three vertices.");
    const full = this.name(id);
    const ids = points.map((point,i) => {
      const world = this.world(point), key = coordinateKey(world);
      let vertex = this.vertices.get(key);
      if (!vertex) {
        vertex = `${full}/v${i}`;
        this.vertices.set(key,vertex);
        this.layer.vertices.push({ id: vertex, x: world[0], y: world[1], z: world[2] });
      }
      return vertex;
    });
    const boundary = ids.map((from,i) => {
      const to = ids[(i+1)%ids.length], key = [from,to].sort().join("|");
      let edge = this.edges.get(key);
      if (!edge) {
        edge = { id: `${full}/e${i}`, from, to };
        this.edges.set(key,edge);
        this.layer.edges.push({ ...edge, kind: "open", openings: [] });
      }
      return edge.from === from ? edge.id : `-${edge.id}`;
    });
    const region: Region = { id: full, fill: "floor", boundary, holes: [], interior: [], creases: [], ...options };
    if (region.fill === "stairs" || region.fill === "ramp") {
      const z = points.map((p) => p[2]), min = Math.min(...z), max = Math.max(...z);
      const flat = (height: number) => points.findIndex((p,i) => Math.abs(p[2]-height)<1e-9 && Math.abs(points[(i+1)%points.length][2]-height)<1e-9);
      const lower = flat(min), upper = flat(max);
      if (max <= min || lower < 0 || upper < 0 || lower === upper) throw new Error("A flight needs distinct horizontal lower and upper landing edges.");
      region.lower = boundary[lower].replace(/^-/, ""); region.upper = boundary[upper].replace(/^-/, "");
    }
    this.layer.regions.push(region);
    return region;
  }
  platform(id: string, options: { origin?: V3; width: number; depth: number; thickness?: number; material: string }) {
    positive("Platform dimensions", options.width, options.depth, options.thickness ?? 0.2);
    const [x,y,z] = options.origin ?? [0,0,0], w = options.width, d = options.depth;
    return this.polygon(id, [[x,y,z],[x+w,y,z],[x+w,y+d,z],[x,y+d,z]], { material: options.material, thickness: options.thickness });
  }
  building(id: string, options: { origin?: V3; size: V3; material: string; usage: "scenery" | "roof"; roofThickness?: number }) {
    positive("Building size", ...options.size);
    const [w,d,h] = options.size, thickness = options.roofThickness ?? 0.25;
    positive("Roof thickness", thickness);
    if (options.usage === "roof" && h <= thickness) throw new Error("A playable roof needs a building taller than its slab.");
    const group = this.group(id, { origin: options.origin });
    group.box("mass", { position: [w/2,d/2,0], size: [w,d,h-(options.usage === "roof" ? thickness : 0)],
      material: options.material, collision: options.usage === "roof" ? "solid" : "none" });
    if (options.usage === "roof") group.platform("roof-deck", { origin: [0,0,h], width: w, depth: d, material: options.material, thickness });
    return new BuildingAssembly(group, options.size);
  }
  /** Repeated switchback flights. Playable flights are real shared-topology stairs, not decorative boxes. */
  staircase(id: string, options: { floors: number; floorHeight?: number; run?: number; width?: number; landing?: number; gap?: number;
    material: string; usage: "playable" | "scenery"; railingMaterial?: string }) {
    count("Stair floors", options.floors, 100);
    const H = options.floorHeight ?? 3.2, R = options.run ?? 3.5, w = options.width ?? 1.3, L = options.landing ?? 1.5, gap = options.gap ?? 0.15;
    positive("Stair dimensions", H,R,w,L);
    if (!Number.isFinite(gap) || gap < 0) throw new Error("Stair gap must be finite and nonnegative.");
    const W = 2*w+gap, g = this.group(id), playable = options.usage === "playable";
    const landing = (name: string, z: number, far: boolean) => {
      const landingWidth = z === 0 ? w : W;
      if (!playable) return g.box(name, { position:[landingWidth/2, far ? R+1.5*L : L/2,z-0.15], size:[landingWidth,L,0.15], material:options.material, collision:"none" });
      // The entry only serves the first flight. Extending it below the returning
      // flight would declare a walkable edge into an unsealed under-stair void.
      const points: V3[] = z === 0 ? [[0,0,z],[w,0,z],[w,L,z],[0,L,z]] : far ? [[0,L+R,z],[w,L+R,z],[w+gap,L+R,z],[W,L+R,z],[W,R+2*L,z],[0,R+2*L,z]] :
        [[0,0,z],[W,0,z],[W,L,z],[w+gap,L,z],[w,L,z],[0,L,z]];
      // With no gap, the two middle vertices coincide and must be represented once.
      return g.polygon(name, points.filter((p,i) => i === 0 || p.some((v,k) => v !== points[i-1][k])), { material:options.material, thickness:0.15 });
    };
    landing("landing0",0,false);
    for (let f=0; f<options.floors*2; f++) {
      const far = f%2===0, low=f*H/2, high=(f+1)*H/2, x=far?0:w+gap;
      if (playable) g.polygon(`flight${f}`, far ? [[x,L,low],[x+w,L,low],[x+w,L+R,high],[x,L+R,high]] :
        [[x,L,high],[x+w,L,high],[x+w,L+R,low],[x,L+R,low]], { fill:"stairs", material:options.material, thickness:0.15, rise:0.18, underside:"sloped" });
      else {
        const n=Math.ceil((high-low)/0.18);
        for(let step=0;step<n;step++) {
          const y=far ? L+(step+0.5)*R/n : L+R-(step+0.5)*R/n;
          g.box(`flight${f}/step${step}`, { position:[x+w/2,y,low+(step+1)*(high-low)/n-0.12], size:[w,R/n,0.12], material:options.material,collision:"none" });
        }
      }
      landing(`landing${f+1}`,high,far);
      if(options.railingMaterial) for(const [side,edge] of [["left",x],["right",x+w]] as const) {
        const a:V3=[edge,far?L:L+R,low+0.95],b:V3=[edge,far?L+R:L,high+0.95];
        g.beam(`flight${f}/rail-${side}`,a,b,0.045,options.railingMaterial);
        for(const [end,p] of [["lower",a],["upper",b]] as const)
          g.beam(`flight${f}/post-${side}-${end}`,[p[0],p[1],p[2]-0.95],p,0.045,options.railingMaterial);
      }
    }
    return g;
  }
}
export class BuildingAssembly {
  readonly roof: AuthoringGroup;
  readonly group: AuthoringGroup;
  readonly size: V3;
  constructor(group: AuthoringGroup, size: V3) {
    this.group = group; this.size = [...size];
    this.roof = group.group("roof", { origin:[0,0,size[2]] });
  }
  /** Surface panels for an exterior mass, deliberately not architectural openings. */
  facade(side: "south" | "north" | "east" | "west", options: { rows: number; columns: number; material: string; window?: [number,number]; margin?: number }) {
    count("Façade rows",options.rows,100); count("Façade columns",options.columns,100);
    if(options.rows*options.columns>4096) throw new Error("A façade is limited to 4096 panels.");
    const [w,d,h]=this.size, across=side==="south"||side==="north"?w:d, margin=options.margin??0.5;
    if(!Number.isFinite(margin)||margin<0||2*margin>=across)throw new Error("Invalid façade margin.");
    const pitch=(across-2*margin)/options.columns, storey=h/options.rows;
    const [ww,wh]=options.window??[Math.min(1.3,pitch*0.65),Math.min(1.5,storey*0.6)];
    positive("Window dimensions",ww,wh);
    if(ww>=pitch||wh>=storey)throw new Error("Window dimensions must fit within each façade bay.");
    for(let row=0;row<options.rows;row++)for(let col=0;col<options.columns;col++){
      const a=margin+(col+0.5)*pitch,z=(row+0.5)*storey-wh/2;
      const position:V3=side==="south"?[a,-0.022,z]:side==="north"?[a,d+0.022,z]:side==="west"?[-0.022,a,z]:[w+0.022,a,z];
      const size:V3=side==="south"||side==="north"?[ww,0.04,wh]:[0.04,ww,wh];
      this.group.box(`facade/${side}/r${row}/c${col}`,{position,size,material:options.material,collision:"none"});
    }
    return this;
  }
}
