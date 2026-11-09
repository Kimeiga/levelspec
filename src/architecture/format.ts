import { SaxesParser } from "saxes";
import { DEFAULT_PLAYER, type Diagnostic, type SourceLocation, type Named } from "../vector/types.ts";
import { validateReference, type ReferenceView } from "../vector/reference.ts";
import type {
  ArchitectureDocument, ArchitectureElement, ArchitecturePath, ArchitectureProfile,
  PathSegment, Placement, V2, V3, Elevation, ProfileLoop,
} from "./types.ts";

interface XmlElement {
  tag: string;
  attributes: Record<string, string>;
  children: XmlElement[];
  source: SourceLocation;
}

/** Invalid AML includes machine-readable diagnostics tied to the original XML. */
export class AmlError extends Error {
  readonly diagnostics: Diagnostic[];
  constructor(diagnostics: Diagnostic[]) {
    super(diagnostics.map(d => `${d.source?.line ?? "?"}:${d.source?.column ?? "?"} ${d.message}`).join("\n"));
    this.name = "AmlError";
    this.diagnostics = diagnostics;
  }
}

/** Creates an empty architectural source document with existing movement defaults. */
export function createArchitecture(id = "untitled"): ArchitectureDocument {
  return {
    id, name: id, version: "1", units: "meters", validation: "playable", curveTolerance: .01,
    frames: [], datums: [], paths: [], profiles: [], definitions: [], elements: [], materials: [],
    player: { ...DEFAULT_PLAYER }, lights: [], markers: [], routes: [], links: [], connections: [], references: [],
    reviewSuppressions: [], noSpawnLos: [], sky: { color: "#dce8f5", intensity: .5 },
  };
}

/** Parses XML without DTDs, entities, network I/O, or unbounded nesting. */
function readXml(text: string): XmlElement {
  const starts = [0];
  for (let i = 0; i < text.length; i++) if (text[i] === "\n") starts.push(i + 1);
  const location = (offset: number): SourceLocation => {
    let low = 0, high = starts.length;
    while (low + 1 < high) {
      const middle = (low + high) >> 1;
      if (starts[middle] <= offset) low = middle;
      else high = middle;
    }
    return { line: low + 1, column: offset - starts[low] + 1, offset };
  };
  const stack: XmlElement[] = [];
  let root: XmlElement | undefined;
  const parser = new SaxesParser({ xmlns: false });
  parser.on("doctype", () => { throw new Error("DOCTYPE and entity declarations are not supported."); });
  parser.on("opentag", tag => {
    if (stack.length >= 128) throw new Error("XML nesting exceeds 128 elements.");
    const element: XmlElement = {
      tag: tag.name, attributes: tag.attributes as Record<string, string>, children: [],
      source: location(text.lastIndexOf("<", parser.position - 1)),
    };
    if (stack.length) stack.at(-1)!.children.push(element);
    else root = element;
    stack.push(element);
  });
  parser.on("closetag", () => { const element = stack.pop(); if (element) element.source.end = parser.position; });
  parser.on("text", value => { if (value.trim()) throw new Error("AML values use attributes, not element text."); });
  try {
    if (text.length > 10_000_000) throw new Error("AML source exceeds 10000000 characters.");
    parser.write(text).close();
    if (!root) throw new Error("Expected an architecture document.");
    return root;
  } catch (error) {
    throw new AmlError([{ severity: "error", code: "XML_SYNTAX", message: (error as Error).message, objects: [], source: location(Math.max(0, parser.position - 1)) }]);
  }
}

/** One element reader owns attribute admission and source-linked value errors. */
class Attributes {
  private readonly used = new Set<string>();
  readonly element: XmlElement;
  constructor(element: XmlElement) { this.element = element; }
  /** Rejects invalid values at their original element. */
  fail(message: string, code = "AML_ATTRIBUTE"): never {
    throw new AmlError([{ severity: "error", code, message, objects: this.element.attributes.id ? [this.element.attributes.id] : [], source: this.element.source }]);
  }
  /** Reads an optional attribute without interpreting its contents. */
  text(key: string, fallback?: string): string | undefined {
    this.used.add(key);
    return this.element.attributes[key] ?? fallback;
  }
  /** Reads a required, nonempty attribute. */
  required(key: string): string {
    const value = this.text(key);
    if (!value?.trim()) this.fail(`<${this.element.tag}> requires ${key}.`);
    return value;
  }
  /** Reads a finite scalar, preserving derived values until compilation. */
  number(key: string, fallback?: number): number {
    const text = this.text(key);
    const value = text === undefined ? fallback : Number(text);
    if (value === undefined || !Number.isFinite(value) || text?.trim() === "") this.fail(`${key} must be finite.`);
    return value;
  }
  /** Reads an optional finite scalar. */
  optionalNumber(key: string): number | undefined { return this.text(key) === undefined ? undefined : this.number(key); }
  /** Reads an explicit boolean. */
  boolean(key: string, fallback = false): boolean {
    const value = this.text(key);
    if (value === undefined) return fallback;
    if (value !== "true" && value !== "false") this.fail(`${key} must be true or false.`);
    return value === "true";
  }
  /** Reads a closed vocabulary value. */
  choice<const T extends string>(key: string, choices: readonly T[], fallback: T): T {
    const value = this.text(key, fallback);
    if (!choices.includes(value as T)) this.fail(`${key} must be ${choices.join(", ")}.`);
    return value as T;
  }
  /** Reads a finite vector of the requested dimension. */
  vector(key: string, size: 2, fallback?: V2): V2;
  vector(key: string, size: 3, fallback?: V3): V3;
  vector(key: string, size: number, fallback?: number[]): number[] {
    const text = this.text(key);
    if (text === undefined && fallback) return [...fallback];
    const values = text?.trim().split(/[\s,]+/).map(Number);
    if (!values || values.length !== size || values.some(n => !Number.isFinite(n))) this.fail(`${key} requires ${size} finite numbers.`);
    return values;
  }
  /** Reads semicolon-separated XY or XYZ points. */
  points(key = "points", dimensions: 2 | 3 = 3): V3[] {
    const text = this.text(key);
    if (!text?.trim()) return [];
    return text.split(";").map(value => {
      const point = value.trim().split(/[\s,]+/).map(Number);
      if (point.length !== dimensions || point.some(n => !Number.isFinite(n))) this.fail(`${key} requires semicolon-separated ${dimensions}D points.`);
      return dimensions === 2 ? [point[0], point[1], 0] : point as V3;
    });
  }
  /** Consumes common identity without assigning compiler-generated identities. */
  named(): Named {
    const id = this.required("id");
    if (!/^[A-Za-z_][\w.:/-]*$/.test(id)) this.fail("An id must start with a letter or underscore and contain no whitespace.");
    return { id, ...(this.text("label") ? { label: this.text("label") } : {}), source: this.element.source };
  }
  /** Reads a local placement; referenced frames resolve during compilation. */
  placement(): Placement {
    return {
      ...(this.text("frame") ? { frame: this.text("frame") } : {}),
      ...(this.text("position") ? { position: this.vector("position", 3) } : {}),
      ...(this.text("rotation") ? { rotation: this.vector("rotation", 3) } : {}),
      ...(this.text("scale") ? { scale: this.vector("scale", 3) } : {}),
    };
  }
  /** Reads absolute elevation or an explicit datum and offset. */
  elevation(): Elevation {
    const datum = this.text("datum");
    if (datum && this.text("elevation") !== undefined) this.fail("Choose elevation or datum, not both.");
    return datum ? { datum, offset: this.number("offset", 0) } : this.number("elevation", 0);
  }
  /** Rejects unknown attributes and unexpected children. */
  finish(children: readonly string[] = []): void {
    for (const key of Object.keys(this.element.attributes)) if (!this.used.has(key)) this.fail(`Unknown attribute ${key} on <${this.element.tag}>.`);
    for (const child of this.element.children) if (!children.includes(child.tag)) this.fail(`<${child.tag}> is not allowed inside <${this.element.tag}>.`, "AML_CHILD");
  }
}

/** Reads a referenced or inline profile loop. */
function readLoop(a: Attributes): ProfileLoop {
  const dimensions = a.choice("dimensions", ["2", "3"], "2");
  const points = a.points("points", dimensions === "2" ? 2 : 3);
  const paths = a.text("paths")?.trim().split(/\s+/);
  if (points.length && paths?.length) a.fail("Choose points or paths for one loop.");
  return paths ? { paths } : { points };
}

/** Reads one native architectural element, recursively preserving collections. */
function readElement(element: XmlElement): ArchitectureElement {
  const a = new Attributes(element);
  if (element.tag === "face-material") {
    const assignment: ArchitectureElement = { ...a.named(), kind: "face-material", host: a.required("host"), material: a.required("material"),
      face: a.choice("face", ["all", "top", "bottom", "front", "back", "left", "right", "side", "reveal"], "all"),
      profile: a.text("profile"), projection: a.choice("projection", ["xy", "xz", "yz"], "xy") };
    a.finish(); return assignment;
  }
  const base = {
    ...a.named(), ...a.placement(), material: a.text("material"), group: a.text("group"),
    ...(a.text("visible") !== undefined ? { visible: a.boolean("visible") } : {}),
    ...(a.text("collidable") !== undefined ? { collidable: a.boolean("collidable") } : {}),
    ...(a.text("dynamic") !== undefined ? { dynamic: a.boolean("dynamic") } : {}),
  };
  let result: ArchitectureElement;
  switch (element.tag) {
    case "assembly": case "group": case "union": case "subtract": case "intersect": case "collision":
      result = { ...base, kind: element.tag, children: element.children.map(readElement), materialOwner: a.text("material-owner"), coincidentMaterial: a.text("coincident-material") === undefined ? undefined : a.choice("coincident-material", ["error", "retained-face"], "error") };
      a.finish(element.children.map(child => child.tag));
      return result;
    case "wall": {
      const spanFloors = a.boolean("span-floors");
      result = { ...base, kind: "wall", path: a.required("path"), thickness: a.number("thickness", .22), height: spanFloors ? a.optionalNumber("height") : a.number("height", 3),
        alignment: a.choice("alignment", ["center", "left", "right"], "center"), base: a.text("base"), top: a.text("top"),
        baseFloor: a.text("base-floor"), contactFloor: a.text("contact-floor"), fitFloor: a.text("fit-floor"), topFloor: a.text("top-floor"), spanFloors, join: a.choice("join", ["miter", "round"], "miter") };
      break;
    }
    case "slab": case "landing": case "roof": case "canopy":
      result = { ...base, kind: element.tag, profile: a.required("profile"), elevation: a.elevation(), thickness: a.number("thickness", .2), ceiling: a.optionalNumber("ceiling"), area: a.text("area"), flat: a.boolean("flat"), playable: a.boolean("playable", element.tag === "slab" || element.tag === "landing") };
      break;
    case "opening":
      result = { ...base, kind: "opening", host: a.required("host"), shape: a.choice("shape", ["rectangle", "circle", "ellipse", "arch", "profile"], "rectangle"),
        mode: a.choice("mode", ["through", "recess", "notch"], "through"), center: a.vector("center", 2, [0, 0]),
        width: a.number("width", 1), height: a.number("height", 2), radius: a.number("radius", .5), radii: a.vector("radii", 2, [.5, .5]),
        profile: a.text("profile"), depth: a.optionalNumber("depth"), offset: a.number("offset", 0), revealMaterial: a.text("reveal-material") };
      break;
    case "panel": case "glazing": case "infill": case "frame":
      result = { ...base, kind: element.tag, opening: a.required("opening"), depth: a.number("depth", .03), offset: a.number("offset", 0), border: a.number("border", .05) };
      break;
    case "box": case "wedge": case "cylinder": case "cone": case "sphere":
      result = { ...base, kind: element.tag, width: a.number("width", 1), depth: a.number("depth", 1), height: a.number("height", 1),
        radius: a.number("radius", .5), topRadius: a.number("top-radius", 0), segments: a.optionalNumber("segments"), anchor: a.choice("anchor", ["corner", "bottom-center"], "corner") };
      break;
    case "extrusion":
      result = { ...base, kind: "extrusion", profile: a.required("profile"), distance: a.number("distance") };
      break;
    case "sweep": case "beam": case "column":
      result = { ...base, kind: element.tag, profile: a.required("profile"), path: a.required("path") };
      break;
    case "stairs": case "ramp":
      result = { ...base, kind: element.tag, path: a.text("path"), width: a.optionalNumber("width"), widthProfile: a.text("width-profile"), left: a.text("left"), right: a.text("right"),
        count: a.optionalNumber("count"), maximumRiser: a.optionalNumber("maximum-riser"), thickness: a.number("thickness", .2),
        underside: a.choice("underside", ["filled", "sloped", "stepped", "custom", "separate"], "filled"), undersideProfile: a.text("underside-profile"),
        area: a.text("area") };
      break;
    case "enclosure":
      result = { ...base, kind: "enclosure", host: a.required("host"), side: a.choice("side", ["left", "right", "start", "end"], "left"),
        loop: a.optionalNumber("loop"), edge: a.optionalNumber("edge"), startReturn: a.optionalNumber("start-return"), endReturn: a.optionalNumber("end-return"),
        construction: a.choice("construction", ["wall", "parapet", "curb", "railing"], "wall"), start: a.number("start", 0), end: a.optionalNumber("end"),
        offset: a.number("offset", 0), thickness: a.number("thickness", .15), height: a.number("height", 1), top: a.text("top") };
      if (result.kind === "enclosure") {
        result.rails = [];
        for (const entry of element.children) {
          const child = new Attributes(entry);
          if (entry.tag === "rail") result.rails.push({ profile: child.required("profile"), topOffset: child.number("top-offset", 0) });
          else if (entry.tag === "posts") {
            if (result.posts) child.fail("Only one posts description is allowed.");
            result.posts = { profile: child.required("profile"), maximumSpacing: child.number("maximum-spacing") };
          } else child.fail("Enclosures accept rail and posts descriptions only.");
          child.finish();
        }
      }
      a.finish(["rail", "posts"]); return result;
    case "retaining-wall":
      result = { ...base, kind: "retaining-wall", lower: a.required("lower"), upper: a.required("upper"), lowerFloor: a.text("lower-floor"), upperFloor: a.text("upper-floor"),
        thickness: a.number("thickness", .22), height: a.number("height", 3), mode: a.choice("mode", ["open", "wall"], "open") }; break;
    case "instance": result = { ...base, kind: "instance", ref: a.required("ref") }; break;
    case "visual-mesh": result = { ...base, kind: "visual-mesh", src: a.required("src") }; break;
    case "faceted-solid": case "collision-surface": {
      const positions = a.points();
      const raw = a.text("triangles", "")!;
      const triangles = raw.trim() ? raw.split(";").map(value => value.trim().split(/\s+/).map(Number) as [number, number, number]) : [];
      result = { ...base, kind: element.tag, geometry: { positions, triangles } }; break;
    }
    case "terrain": {
      const raw = a.text("triangles", "")!;
      result = { ...base, kind: "terrain", profile: a.text("profile"), heightmap: a.text("heightmap"), tileSize: a.optionalNumber("tile-size"), minHeight: a.optionalNumber("min-height"), maxHeight: a.optionalNumber("max-height"), flipY: a.boolean("flip-y"), points: a.points(),
        triangles: raw.trim() ? raw.split(";").map(value => value.trim().split(/\s+/).map(Number) as [number, number, number]) : [],
        columns: a.optionalNumber("columns"), rows: a.optionalNumber("rows"), heights: a.text("heights", "")!.trim().split(/\s+/).filter(Boolean).map(Number),
        cellSize: a.vector("cell-size", 2, [1, 1]), base: a.optionalNumber("base"),
        orientation: a.choice("orientation", ["up", "down", "authored", "unknown"], "up"), playable: a.boolean("playable") };
      break;
    }
    case "shared-edge": result={...base,kind:"shared-edge",from:a.required("from"),to:a.required("to"),path:a.required("path")};break;
    case "grade":
      if (a.text('width-profile') && a.text('width') !== undefined) a.fail('Choose grade width or width-profile.');
      result = {...base,kind:'grade',host:a.required('host'),path:a.required('path'),width:a.number('width',1),widthProfile:a.text('width-profile'),crossSlope:a.number('cross-slope',0),transition:a.number('transition',1),
        startTransition:a.optionalNumber('start-transition'),endTransition:a.optionalNumber('end-transition'),order:a.optionalNumber('order')}; break;
    case "water": result = { ...base, kind: "water", profile: a.required("profile"), elevation: a.elevation() }; break;
    case "room": case "zone": case "volume": case "clearance": {
      const properties: Record<string,string> = {};
      for (const child of element.children) {
        const property = new Attributes(child), name = property.required('name'), value = property.required('value');
        if (Object.hasOwn(properties,name)) a.fail(`Duplicate volume property ${name}.`);
        Object.defineProperty(properties,name,{ value,enumerable:true,writable:true,configurable:true }); property.finish();
      }
      result = { ...base, kind: element.tag, profile: a.required("profile"), elevation: a.elevation(), height: a.number("height", 3), role: a.text("role"),
        movement: a.choice('movement',['land','water'],'land'), requireSupport: a.boolean('require-support'), properties };
      a.finish(['property']); return result;
    }
    default: return a.fail(`Unknown architectural element <${element.tag}>.`, "AML_ELEMENT");
  }
  a.finish();
  return result;
}

/** Parses the same AML vocabulary regardless of the filename extension. */
export function parseAml(text: string): ArchitectureDocument {
  const root = readXml(text), a = new Attributes(root);
  if (root.tag !== "architecture") a.fail('Expected <architecture version="1">. Use levelspec migrate for SVGX sources.', "AML_ROOT");
  if (a.required("version") !== "1") a.fail("Unsupported AML version; expected 1.", "AML_VERSION");
  const document = createArchitecture(a.required("id"));
  Object.assign(document, a.named(), { name: a.text("name", document.id), description: a.text("description"),
    units: a.choice("units", ["meters"], "meters"), validation: a.choice("validation", ["premap", "playable"], "playable"), curveTolerance: a.number("curve-tolerance", .01) });
  for (const element of root.children) {
    const child = new Attributes(element);
    switch (element.tag) {
      case "path": {
        const path: ArchitecturePath = { ...child.named(), ...child.placement(), points: child.points(), paths: child.text("paths")?.trim().split(/\s+/), segments: [], closed: child.boolean("closed") };
        if (child.text("elevation")) path.elevation = child.vector("elevation", 2);
        for (const segment of element.children) {
          const s = new Attributes(segment);
          let value: PathSegment;
          if (segment.tag === "line") value = { kind: "line", to: s.vector("to", 3) };
          else if (["quadratic", "cubic", "bezier"].includes(segment.tag)) {
            const controls = s.points("controls");
            if (segment.tag === "quadratic" && controls.length !== 1 || segment.tag === "cubic" && controls.length !== 2 || !controls.length) s.fail("Curve control count does not match its degree.");
            value = { kind: "bezier", controls, to: s.vector("to", 3) };
          } else if (segment.tag === "arc") value = { kind: "arc", center: s.vector("center", 3), radii: s.vector("radii", 2), start: s.number("start", 0), sweep: s.number("sweep"), rotation: s.number("rotation", 0) };
          else value = s.fail(`Unknown path segment <${segment.tag}>.`);
          s.finish(); path.segments.push(value);
        }
        child.finish(["line", "quadratic", "cubic", "bezier", "arc"]); document.paths.push(path); break;
      }
      case "profile": {
        const profile: ArchitectureProfile = { ...child.named(), ...child.placement(), outer: readLoop(child), holes: [], interior: child.points("interior"), breaklines: [] };
        for (const entry of element.children) {
          const item = new Attributes(entry);
          if (entry.tag === "hole") profile.holes.push(readLoop(item));
          else if (entry.tag === "breakline") profile.breaklines.push(item.points());
          else item.fail(`Unknown profile child <${entry.tag}>.`);
          item.finish();
        }
        child.finish(["hole", "breakline"]); document.profiles.push(profile); break;
      }
      case "datum": document.datums.push({ ...child.named(), elevation: child.number("elevation", 0), datum: child.text("datum") }); child.finish(); break;
      case "coordinate-frame": document.frames.push({ ...child.named(), ...child.placement() }); child.finish(); break;
      case "definition": document.definitions.push({ ...child.named(), children: element.children.map(readElement) }); child.finish(element.children.map(e => e.tag)); break;
      case "material": document.materials.push({ ...child.named(), color: child.text("color", "#b9c7d1")!, repeat: child.number("repeat", 1), roughness: child.number("roughness", .8), metalness: child.number("metalness", 0), texture: child.text("texture") }); child.finish(); break;
      case "player": {
        const p = document.player;
        p.radius = child.number("radius", p.radius); p.height = child.number("height", p.height); p.step = child.number("step", p.step);
        p.slope = child.number("slope", p.slope); p.crouch = child.number("crouch", p.crouch); p.vault = child.number("vault", p.vault);
        p.rappel = child.boolean("rappel", p.rappel); p.ladder = child.boolean("ladder", p.ladder); child.finish(); break;
      }
      case "boat": document.boat = { radius: child.number("radius", 1), height: child.number("height", 1), draft: child.number("draft", .25) }; child.finish(); break;
      case "marker": document.markers.push({ ...child.named(), layer: child.text("group", "architecture")!, region: child.text("element"), position: child.vector("position", 3), kind: child.required("kind"), team: child.text("team"), movement: child.choice("movement", ["land", "water", "none"], "land") }); child.finish(); break;
      case "route": document.routes.push({ ...child.named(), from: child.required("from"), to: child.required("to"), minRoutes: child.number("min-routes", 1), minDistance: child.optionalNumber("min-distance"), maxDistance: child.optionalNumber("max-distance"), movement: child.choice("movement", ["land", "water"], "land") }); child.finish(); break;
      case "link": document.links.push({ ...child.named(), from: child.vector("from", 3), to: child.vector("to", 3), kind: child.text("kind", "walk")!, bidirectional: child.boolean("bidirectional", true), ability: child.text("ability"), fromArea: child.text("from-area"), toArea: child.text("to-area"), movement: child.choice("movement", ["land", "water"], "land") }); child.finish(); break;
      case "connection": document.connections.push({ ...child.named(), from: child.required("from"), to: child.required("to"), path: child.text("path") }); child.finish(); break;
      case "light": document.lights.push({ ...child.named(), kind: child.choice("kind", ["directional", "point", "spot"], "directional"), position: child.vector("position", 3), target: child.vector("target", 3, [0, 0, 0]), color: child.text("color", "#ffffff")!, intensity: child.number("intensity", 1), angle: child.optionalNumber("angle") }); child.finish(); break;
      case "sky": document.sky = { color: child.text("color", "#dce8f5")!, intensity: child.number("intensity", .5) }; child.finish(); break;
      case "reference": {
        const reference: ReferenceView = { ...child.named(), image: child.required("image"), width: child.number("width"), height: child.number("height"),
          scale: child.choice("scale", ["assumed", "measured"], "assumed"), scaleNote: child.required("scale-note"),
          camera: { position: child.vector("position", 3), target: child.vector("target", 3), up: child.vector("up", 3, [0, 0, 1]), fov: child.number("fov", 45), near: child.number("near", .05), far: child.number("far", 2000) }, landmarks: [], masks: [] };
        for (const entry of element.children) {
          const item = new Attributes(entry);
          if (entry.tag === "landmark") reference.landmarks.push({ ...item.named(), position: item.vector("position", 3), image: item.vector("image", 2) });
          else if (entry.tag === "mask") reference.masks.push({ ...item.named(), points: item.points("points", 2).map(point => [point[0], point[1]]) });
          else item.fail(`Unknown reference child <${entry.tag}>.`);
          item.finish();
        }
        child.finish(["landmark", "mask"]);
        const findings = validateReference(reference); if (findings.length) throw new AmlError(findings);
        document.references.push(reference); break;
      }
      case "review-suppression": {
        const suggestion=child.required("suggestion");
        if(document.reviewSuppressions.some(item=>item.suggestion===suggestion))child.fail("Duplicate review suppression for one suggestion.");
        document.reviewSuppressions.push({suggestion,fingerprint:child.required("fingerprint"),reason:child.required("reason")});child.finish();break;
      }
      case "no-spawn-los": { const markers = child.required("markers").split(/\s+/); if (markers.length !== 2) child.fail("no-spawn-los requires two markers."); document.noSpawnLos.push(markers as [string, string]); child.finish(); break; }
      default: document.elements.push(readElement(element));
    }
  }
  a.finish(root.children.map(e => e.tag));
  const ids = new Set<string>();
  const check = (named: Named) => {
    if (ids.has(named.id)) throw new AmlError([{ severity: "error", code: "AML_DUPLICATE_ID", message: `Duplicate id ${named.id}.`, objects: [named.id], source: named.source }]);
    ids.add(named.id);
  };
  const visit = (element: ArchitectureElement) => { check(element); if ("children" in element) element.children.forEach(visit); };
  [...document.paths, ...document.profiles, ...document.frames, ...document.datums, ...document.materials, ...document.definitions, ...document.markers, ...document.routes, ...document.links, ...document.lights].forEach(check);
  document.elements.forEach(visit);
  for (const definition of document.definitions) {
    const localIds = new Set<string>();
    const local = (element: ArchitectureElement) => {
      if (localIds.has(element.id)) throw new AmlError([{ severity: "error", code: "AML_DUPLICATE_ID", message: `Duplicate definition member ${element.id}.`, objects: [definition.id, element.id], source: element.source }]);
      localIds.add(element.id); if ("children" in element) element.children.forEach(local);
    };
    definition.children.forEach(local);
  }
  return document;
}

/** XML escaping belongs to AML serialization, independent of the retired SVGX writer. */
function escape(value: unknown): string {
  return String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

/** Canonical attribute output omits undefined values and never serializes source offsets. */
function tag(name: string, attributes: Record<string, unknown>, children: string[] = []): string {
  const values = Object.entries(attributes).filter(([, value]) => value !== undefined).map(([key, value]) => ` ${key}="${escape(Array.isArray(value) ? value.join(" ") : value)}"`).join("");
  return children.length ? `<${name}${values}>\n${children.map(child => child.split("\n").map(line => `  ${line}`).join("\n")).join("\n")}\n</${name}>` : `<${name}${values}/>`;
}

/** Serializes coordinate lists without reducing precision. */
function points(values: number[][]): string { return values.map(p => p.join(" ")).join("; "); }
/** Converts public camel-case property names to XML attribute names. */
function attributes(value: object, omitted: string[] = []): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !["source", "kind", ...omitted].includes(key)).map(([key, entry]) => [key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`), entry]));
}
/** Serializes a datum elevation independently of a node's placement offset. */
function elevation(value: Elevation): Record<string, unknown> { return typeof value === "number" ? { elevation: value } : { datum: value.datum, offset: value.offset }; }
/** Serializes one profile loop, including nonplanar constrained profiles. */
function loop(value: ProfileLoop): Record<string, unknown> { return value.paths ? { paths: value.paths.join(" ") } : { dimensions: 3, points: points(value.points ?? []) }; }

/** Serializes typed architectural objects, never a retained XML syntax tree. */
function writeElement(element: ArchitectureElement): string {
  const a = attributes(element, ["elevation"]);
  if ("children" in element) return tag(element.kind, attributes(element, ["children"]), element.children.map(writeElement));
  if (element.kind === "enclosure") {
    delete a.rails; delete a.posts;
    return tag("enclosure", a, [...(element.rails ?? []).map(rail => tag("rail", attributes(rail))), ...(element.posts ? [tag("posts", attributes(element.posts))] : [])]);
  }
  if ("elevation" in element) Object.assign(a, elevation(element.elevation));
  if (['room','zone','volume','clearance'].includes(element.kind) && 'properties' in element) {
    delete a.properties;
    return tag(element.kind,a,Object.entries(element.properties ?? {}).map(([name,value]) => tag('property',{name,value})));
  }
  if (element.kind === "faceted-solid" || element.kind === "collision-surface") {
    delete a.geometry; a.points = points(element.geometry.positions); a.triangles = points(element.geometry.triangles);
  }
  if (element.kind === "terrain") { a.points = points(element.points); a.triangles = points(element.triangles); }
  return tag(element.kind, a);
}

/** Writes canonical AML. Source locations are regenerated by parsing the result. */
export function serializeAml(document: ArchitectureDocument): string {
  const children: string[] = [];
  for (const frame of document.frames) children.push(tag("coordinate-frame", attributes(frame)));
  for (const datum of document.datums) children.push(tag("datum", attributes(datum)));
  for (const path of document.paths) {
    const segments = path.segments.map(segment => segment.kind === "bezier"
      ? tag("bezier", { to: segment.to, controls: points(segment.controls) })
      : tag(segment.kind, attributes(segment)));
    children.push(tag("path", { ...attributes(path, ["points", "segments"]), points: points(path.points) }, segments));
  }
  for (const profile of document.profiles) children.push(tag("profile", { ...attributes(profile, ["outer", "holes", "interior", "breaklines"]), ...loop(profile.outer), interior: profile.interior.length ? points(profile.interior) : undefined }, [
    ...profile.holes.map(hole => tag("hole", loop(hole))), ...profile.breaklines.map(line => tag("breakline", { points: points(line) })),
  ]));
  for (const material of document.materials) children.push(tag("material", attributes(material)));
  for (const definition of document.definitions) children.push(tag("definition", attributes(definition, ["children"]), definition.children.map(writeElement)));
  children.push(...document.elements.map(writeElement), tag("player", attributes(document.player)));
  if (document.boat) children.push(tag("boat", attributes(document.boat)));
  for (const marker of document.markers) children.push(tag("marker", { ...attributes(marker, ["layer", "region"]), kind: marker.kind, group: marker.layer, element: marker.region }));
  for (const route of document.routes) children.push(tag("route", attributes(route)));
  for (const link of document.links) children.push(tag("link", { ...attributes(link), kind: link.kind }));
  for (const connection of document.connections) children.push(tag("connection", attributes(connection)));
  for (const light of document.lights) children.push(tag("light", { ...attributes(light), kind: light.kind }));
  for (const reference of document.references) children.push(tag("reference", { ...attributes(reference, ["camera", "landmarks", "masks"]), ...reference.camera }, [
    ...reference.landmarks.map(landmark => tag("landmark", attributes(landmark))),
    ...reference.masks.map(mask => tag("mask", { ...attributes(mask, ["points"]), points: points(mask.points) })),
  ]));
  for (const suppression of document.reviewSuppressions) children.push(tag("review-suppression", attributes(suppression)));
  for (const markers of document.noSpawnLos) children.push(tag("no-spawn-los", { markers }));
  children.push(tag("sky", attributes(document.sky)));
  return `<?xml version="1.0" encoding="UTF-8"?>\n${tag("architecture", { version: "1", id: document.id, name: document.name, description: document.description, units: "meters", validation: document.validation, "curve-tolerance": document.curveTolerance }, children)}\n`;
}
