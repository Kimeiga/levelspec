import { createArchitecture } from "./format.ts";
import type {
  ArchitectureDocument, ArchitectureElement, ArchitecturePath, ArchitectureProfile,
  Terrain, TerrainGrade, MetadataVolume, SharedEdge, Aperture, Collection, FaceMaterial, Extrusion, Sweep, OpeningDetail, Flight, SideEnclosure, Primitive, Slab, V3, Wall,
} from "./types.ts";

/** Creates native architectural source objects without manufacturing edges or regions. */
export class ArchitectureBuilder {
  readonly document: ArchitectureDocument;
  constructor(id: string) { this.document = createArchitecture(id); }
  /** Adds one independently editable architectural object. */
  add<T extends ArchitectureElement>(element: T): T { this.document.elements.push(element); return element; }
  /** Creates a shared 3D polyline; analytic segments can be added to the returned path. */
  path(id: string, points: V3[], options: Partial<Omit<ArchitecturePath, "id" | "points">> = {}): ArchitecturePath {
    const path: ArchitecturePath = { id, points: structuredClone(points), segments: [], closed: false, ...options };
    this.document.paths.push(path); return path;
  }
  /** Creates an editable footprint or height surface, with explicit holes and breaklines. */
  profile(id: string, points: V3[], options: Partial<Omit<ArchitectureProfile, "id" | "outer">> = {}): ArchitectureProfile {
    const profile: ArchitectureProfile = { id, outer: { points: structuredClone(points) }, holes: [], interior: [], breaklines: [], ...options };
    this.document.profiles.push(profile); return profile;
  }
  /** Creates a wall whose geometry remains linked to a shared source path. */
  wall(id: string, path: string, options: Partial<Omit<Wall, "kind" | "id" | "path">> = {}): Wall {
    return this.add({ id, kind: "wall", path, height: options.spanFloors ? undefined : 3, thickness: .22, alignment: "center", join: "miter", ...options });
  }
  /** Creates a slab with a real underside and optional datum elevation. */
  slab(id: string, profile: string, options: Partial<Omit<Slab, "kind" | "id" | "profile">> = {}): Slab {
    return this.add({ id, kind: "slab", profile, elevation: 0, thickness: .2, ...options });
  }
  /** Creates an aperture independently of optional frames, glazing, or infill. */
  opening(id: string, host: string, options: Partial<Omit<Aperture, "kind" | "id" | "host">> = {}): Aperture {
    return this.add({ id, kind: "opening", host, shape: "rectangle", mode: "through", center: [0, 0], width: 1, height: 2,
      radius: .5, radii: [.5, .5], offset: 0, ...options });
  }
  /** Adds a dimensioned native box rather than an imported mesh. */
  box(id: string, options: Partial<Omit<Primitive, "id" | "kind">> = {}): Primitive {
    return this.solid("box", id, options);
  }
  /** Adds an explicit physical composition boundary. Children are not also root objects. */
  assembly(id: string, children: ArchitectureElement[], options: Partial<Omit<Collection, "kind" | "id" | "children">> = {}): Collection {
    return this.compose("assembly", id, children, options);
  }
  /** Creates a native boolean or an organizational group, adopting its source children. */
  compose(kind: Collection["kind"], id: string, children: ArchitectureElement[], options: Partial<Omit<Collection, "kind" | "id" | "children">> = {}): Collection {
    const adopted = new Set<ArchitectureElement>();
    const visit = (element: ArchitectureElement) => {
      if (adopted.has(element)) throw new Error(`Assembly ${id} repeats object ${element.id}; use distinct instances.`);
      adopted.add(element); if ("children" in element) element.children.forEach(visit);
    };
    children.forEach(visit);
    const checkOwnership = (element: ArchitectureElement) => {
      if ("children" in element) for (const child of element.children) {
        if (adopted.has(child) && !adopted.has(element)) throw new Error(`Object ${child.id} already belongs to ${element.id}.`);
        checkOwnership(child);
      }
    };
    this.document.elements.forEach(checkOwnership);
    this.document.elements = this.document.elements.filter(element => !adopted.has(element));
    return this.add({ id, kind, children, ...options });
  }
  /** Creates a dimensioned native primitive in its authored placement. */
  solid(kind: Primitive["kind"], id: string, options: Partial<Omit<Primitive, "id" | "kind">> = {}): Primitive {
    return this.add({ id, kind, width: 1, depth: 1, height: 1, radius: .5, topRadius: 0, ...options });
  }
  /** Extrudes a shared profile, including its holes, along local positive Z. */
  extrusion(id: string, profile: string, distance: number, options: Partial<Omit<Extrusion, "kind" | "id" | "profile" | "distance">> = {}): Extrusion {
    return this.add({ id, kind: "extrusion", profile, distance, ...options });
  }
  /** Sweeps a shared XY section along a local path using transported miter sections. */
  sweep(id: string, profile: string, path: string, options: Partial<Omit<Sweep, "kind" | "id" | "profile" | "path">> = {}): Sweep {
    return this.add({ id, kind: "sweep", profile, path, ...options });
  }
  /** Assigns exposed host materials without creating physical shells. */
  faceMaterial(id: string, host: string, material: string, options: Partial<Omit<FaceMaterial, "kind" | "id" | "host" | "material">> = {}): FaceMaterial {
    return this.add({ id, kind: "face-material", host, material, face: "all", projection: "xy", ...options });
  }
  /** Adds an independently collidable opening detail in host-local coordinates. */
  detail(kind: OpeningDetail["kind"], id: string, opening: string, options: Partial<Omit<OpeningDetail, "kind" | "id" | "opening">> = {}): OpeningDetail {
    return this.add({ id, kind, opening, depth: .03, offset: 0, border: .05, ...options });
  }
  /** Adds an explicitly selected side or footprint edge; entrances remain open. */
  enclosure(id: string, host: string, options: Partial<Omit<SideEnclosure, "kind" | "id" | "host">> = {}): SideEnclosure {
    return this.add({ id, kind: "enclosure", host, side: "left", construction: "wall", start: 0, offset: 0, thickness: .15, height: 1, ...options });
  }
  /** Adds a native ramp retaining authored nonlinear height samples. */
  ramp(id: string, options: Omit<Flight, "kind" | "id" | "thickness" | "underside" | "count" | "maximumRiser"> & Partial<Pick<Flight, "thickness" | "underside">>): Flight {
    return this.add({ id, kind: "ramp", thickness: .2, underside: "sloped", ...options });
  }
  /** Adds real horizontal treads with an independently selected underside construction. */
  stairs(id: string, options: Omit<Flight, "kind" | "id" | "maximumRiser" | "thickness" | "underside"> & Partial<Pick<Flight, "maximumRiser" | "thickness" | "underside">>): Flight {
    return this.add({ id, kind: "stairs", thickness: .2, underside: "filled", ...options });
  }
  /** Adds native ground from a grid, PNG, constrained profile, or explicit patch. */
  terrain(id: string, options: Partial<Omit<Terrain, "kind" | "id">>): Terrain {
    return this.add({ id, kind: "terrain", points: [], triangles: [], heights: [], cellSize: [1, 1], orientation: "up", playable: false, ...options });
  }
  /** Deforms the named terrain host; no separate road shell is introduced. */
  grade(id: string, host: string, path: string, options: Partial<Omit<TerrainGrade, "kind" | "id" | "host" | "path">> = {}): TerrainGrade {
    return this.add({ id, kind: "grade", host, path, width: 1, crossSlope: 0, transition: 1, ...options });
  }
  /** Adds an inert spatial declaration or an executable native clearance assertion. */
  spatialVolume(kind: MetadataVolume["kind"], id: string, profile: string, options: Partial<Omit<MetadataVolume, "kind" | "id" | "profile">> = {}): MetadataVolume {
    return this.add({ id, kind, profile, elevation: 0, height: 3, movement: "land", requireSupport: false, properties: {}, ...options });
  }
  /** Requires continuous physical contact on both named native hosts. */
  sharedEdge(id: string, from: string, to: string, path: string, options: Partial<Omit<SharedEdge, "kind" | "id" | "from" | "to" | "path">> = {}): SharedEdge {
    return this.add({ id, kind: "shared-edge", from, to, path, ...options });
  }

}
