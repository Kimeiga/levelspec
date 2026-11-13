import { Matrix4 } from "three";
import { AmlError } from "./format.ts";
import { placement, resolveProfile, samplePath, transform, type ResolvedProfile } from "./geometry.ts";
import type { ArchitectureDocument, ArchitectureElement, ArchitectureProvenance, ElementBase, Elevation, V3 } from "./types.ts";

export interface ResolvedElement {
  id: string;
  element: ArchitectureElement;
  matrix: Matrix4;
  group: string;
  scope: string;
  assembly?: string;
  children: ResolvedElement[];
  parent?: ResolvedElement;
}

/** Resolution retains source relationships separately from physical geometry. */
export class ArchitectureResolution {
  readonly paths = new Map<string, V3[]>();
  readonly profiles = new Map<string, ResolvedProfile>();
  readonly nodes = new Map<string, ResolvedElement>();
  readonly provenance: Record<string, ArchitectureProvenance> = Object.create(null);
  readonly roots: ResolvedElement[] = [];
  private readonly frames = new Map<string, Matrix4>();
  private readonly datums = new Map<string, number>();
  readonly document: ArchitectureDocument;
  private readonly maximumElements: number;
  constructor(document: ArchitectureDocument, maximumElements: number, curveSegments: number, profileVertices = 4096) {
    this.document = document; this.maximumElements = maximumElements;
    for (const frame of document.frames) this.frame(frame.id);
    for (const datum of document.datums) this.elevation({ datum: datum.id, offset: 0 });
    const resolvingPaths = new Set<string>();
    const resolvePath = (id: string): V3[] => {
      const cached = this.paths.get(id); if (cached) return cached;
      const path = document.paths.find(path => path.id === id); if (!path) this.fail(id, `Unknown path ${id}.`);
      if (resolvingPaths.has(id)) this.fail(id, `Cyclic path ${id}.`, "AML_CYCLE");
      resolvingPaths.add(id);
      let points: V3[];
      if (path.paths) {
        if (path.points.length || path.segments.length) this.fail(id, "Choose referenced paths or inline path geometry.");
        points = [];
        for (const reference of path.paths) {
          const reversed = reference.startsWith("-"), member = resolvePath(reversed ? reference.slice(1) : reference), values = reversed ? [...member].reverse() : member;
          if (points.length && Math.hypot(...points.at(-1)!.map((n, i) => n - values[0][i])) > 1e-7) this.fail(id, "Composite path has a broken seam.");
          points.push(...(points.length ? values.slice(1) : values));
          if (points.length > curveSegments) this.fail(id, "Composite path exceeds its curve segment budget.", "AML_COMPLEXITY");
        }
      } else points = samplePath(path, document.curveTolerance, curveSegments);
      const matrix = this.frame(path.frame).clone().multiply(placement(path));
      const result = points.map(point => transform(point, matrix));
      this.paths.set(path.id, result); resolvingPaths.delete(id); return result;
    };
    for (const path of document.paths) resolvePath(path.id);
    for (const profile of document.profiles) {
      try {
      const resolved = resolveProfile(profile, this.paths, profileVertices), matrix = this.frame(profile.frame).clone().multiply(placement(profile));
      this.profiles.set(profile.id, { points: resolved.points.map(point => transform(point, matrix)), triangles: matrix.determinant() < 0 ? resolved.triangles.map(([a, b, c]) => [c, b, a]) : resolved.triangles,
        loops: resolved.loops.map(loop => loop.map(point => transform(point, matrix))) });
      } catch (error) {
        if (error instanceof AmlError) throw error;
        this.fail(profile.id, (error as Error).message, "AML_PROFILE");
      }
    }
    const definitions = new Map(document.definitions.map(definition => [definition.id, definition]));
    const expand = (source: ArchitectureElement, parent: Matrix4, scope: string, instances: string[], assembly: string | undefined, group: string, stack: string[], inherited: Pick<ElementBase, "material" | "visible" | "collidable" | "dynamic"> = {}): ResolvedElement => {
      const element = { ...source, material: source.material ?? inherited.material, dynamic: source.dynamic ?? inherited.dynamic,
        visible: inherited.visible === false ? false : source.visible, collidable: inherited.collidable === false ? false : source.collidable } as ArchitectureElement;
      const id = scope ? `${scope}/${element.id}` : element.id;
      if (this.nodes.size >= maximumElements) this.fail(element.id, "Element expansion budget exceeded.", "AML_COMPLEXITY");
      if (this.nodes.has(id)) this.fail(element.id, `Duplicate resolved identity ${id}.`, "AML_DUPLICATE_ID");
      const matrix = parent.clone().multiply(this.frame(element.frame)).multiply(placement(element));
      const membership = element.kind === "assembly" ? id : assembly;
      const layer = element.group ?? (element.kind === "group" ? id : group);
      const node: ResolvedElement = { id, element, matrix, scope, assembly: membership, group: layer, children: [] };
      this.nodes.set(id, node);
      this.provenance[id] = { id, sourceId: element.id, source: element.source, instances: [...instances], assembly: membership,
        ...("host" in element ? { host: scope ? `${scope}/${element.host}` : element.host } : {}), contributors: [id] };
      if (element.kind === "instance") {
        const definition = definitions.get(element.ref);
        if (!definition) this.fail(element.id, `Unknown definition ${element.ref}.`);
        if (stack.includes(element.ref)) this.fail(element.id, `Cyclic definition ${[...stack, element.ref].join(" → ")}.`, "AML_CYCLE");
        node.children = definition.children.map(child => expand(child, matrix, id, [...instances, id], membership, layer, [...stack, element.ref], element));
      } else if ("children" in element) node.children = element.children.map(child => expand(child, matrix, scope, instances, membership, layer, stack, element));
      for (const child of node.children) child.parent = node;
      return node;
    };
    this.roots = document.elements.map(element => expand(element, new Matrix4(), "", [], undefined, "architecture", []));
    this.attachEnclosures();
    for (const node of this.nodes.values()) {
      const element = node.element;
      const assemblies: string[] = [];
      for (let ancestor: ResolvedElement | undefined = node; ancestor; ancestor = ancestor.parent) if (ancestor.element.kind === "assembly") assemblies.unshift(ancestor.id);
      this.provenance[node.id].assemblies = assemblies;
      if ("host" in element) this.reference(node, element.host);
      if ("opening" in element) {
        const target = this.reference(node, element.opening);
        if (target.element.kind !== "opening") this.fail(node.id, `${element.opening} is not an opening.`);
      }
    }
  }
  /** Composes explicit attachments with their native host while retaining organizational source groups. */
  private attachEnclosures(): void {
    const wrappers = new Map<string, ResolvedElement>();
    for (const node of [...this.nodes.values()]) {
      if (node.element.kind !== "enclosure") continue;
      const host = this.reference(node, node.element.host);
      if (!["stairs", "ramp", "slab", "landing", "roof", "canopy"].includes(host.element.kind)) this.fail(node.id, "Enclosures require a native flight or footprint host.");
      let boundary = host.assembly ? this.nodes.get(host.assembly) : wrappers.get(host.id);
      if (!boundary) {
        if (this.nodes.size >= this.maximumElements) this.fail(node.id, "Attachment assembly exceeds the element expansion budget.", "AML_COMPLEXITY");
        const id = `${host.id}/$attachments`, parent = host.parent;
        if (this.nodes.has(id)) this.fail(host.id, "Attachment boundary identity is already occupied.");
        boundary = { id, element: { id, kind: "assembly", children: [], source: host.element.source }, matrix: new Matrix4(), scope: host.scope, assembly: id, group: host.group, parent, children: [host] };
        this.nodes.set(id, boundary);
        this.provenance[id] = { id, sourceId: host.element.id, source: host.element.source, instances: [...this.provenance[host.id].instances], assembly: id, contributors: [host.id] };
        const siblings = parent?.children ?? this.roots, index = siblings.indexOf(host);
        siblings[index] = boundary; host.parent = boundary;
        const membership = (member: ResolvedElement) => {
          if (member.element.kind === "assembly") return;
          member.assembly = id; this.provenance[member.id].assembly = id; member.children.forEach(membership);
        };
        membership(host); wrappers.set(host.id, boundary);
      }
      if (node.assembly && node.assembly !== boundary.id) this.fail(node.id, "An attachment cannot belong to a different physical assembly than its host.", "AML_ASSEMBLY", [host.id]);
      if (node.parent !== boundary) {
        const siblings = node.parent?.children ?? this.roots, index = siblings.indexOf(node);
        if (index >= 0) siblings.splice(index, 1);
        boundary.children.push(node); node.parent = boundary;
      }
      node.element.dynamic ??= host.element.dynamic;
      node.element.visible ??= host.element.visible;
      node.element.collidable ??= host.element.collidable;
      node.assembly = boundary.id; this.provenance[node.id].assembly = boundary.id;
    }
  }
  /** Resolves frame ancestry with an explicit cycle check. */
  frame(id?: string, visiting = new Set<string>()): Matrix4 {
    if (!id) return new Matrix4();
    const cached = this.frames.get(id);
    if (cached) return cached;
    const frame = this.document.frames.find(frame => frame.id === id);
    if (!frame) this.fail(id, `Unknown coordinate frame ${id}.`);
    if (visiting.has(id)) this.fail(id, `Cyclic coordinate frame ${id}.`, "AML_CYCLE");
    visiting.add(id);
    const result = this.frame(frame.frame, visiting).clone().multiply(placement(frame));
    visiting.delete(id); this.frames.set(id, result); return result;
  }
  /** Resolves explicit datum offsets without an expression language. */
  elevation(value: Elevation, visiting = new Set<string>()): number {
    if (typeof value === "number") {
      if (!Number.isFinite(value)) this.fail(this.document.id, "Elevation must be finite.");
      return value;
    }
    if (this.datums.has(value.datum)) return this.datums.get(value.datum)! + value.offset;
    const datum = this.document.datums.find(datum => datum.id === value.datum);
    if (!datum) this.fail(value.datum, `Unknown elevation datum ${value.datum}.`);
    if (visiting.has(datum.id)) this.fail(datum.id, `Cyclic elevation datum ${datum.id}.`, "AML_CYCLE");
    visiting.add(datum.id);
    const elevation = datum.elevation + (datum.datum ? this.elevation({ datum: datum.datum, offset: 0 }, visiting) : 0);
    visiting.delete(datum.id); this.datums.set(datum.id, elevation); return elevation + value.offset;
  }
  /** Looks up a relationship within an instance before considering document-global objects. */
  reference(node: ResolvedElement, id: string): ResolvedElement {
    const target = this.nodes.get(node.scope ? `${node.scope}/${id}` : id) ?? this.nodes.get(id);
    if (!target) this.fail(node.id, `Unknown architectural object ${id}.`);
    return target;
  }
  /** Produces a path in the element's resolved frame without changing the shared source. */
  path(node: ResolvedElement, id: string): V3[] {
    const path = this.paths.get(id);
    if (!path) this.fail(node.id, `Unknown path ${id}.`);
    return path.map(point => transform(point, node.matrix));
  }
  /** Produces a constrained profile in the element's resolved frame. */
  profile(node: ResolvedElement, id: string, elevation = 0): ResolvedProfile {
    const profile = this.profiles.get(id);
    if (!profile) this.fail(node.id, `Unknown profile ${id}.`);
    const point = (p: V3) => transform([p[0], p[1], p[2] + elevation], node.matrix);
    return { points: profile.points.map(point), triangles: node.matrix.determinant() < 0 ? profile.triangles.map(([a, b, c]) => [c, b, a]) : profile.triangles, loops: profile.loops.map(loop => loop.map(point)) };
  }
  /** Throws a source-linked failure that the compiler can retain as a diagnostic. */
  fail(id: string, message: string, code = "AML_REFERENCE", related: string[] = []): never {
    const named = this.nodes.get(id)?.element ?? [...this.document.paths, ...this.document.profiles, ...this.document.frames, ...this.document.datums, ...this.document.connections].find(object => object.id === id);
    throw new AmlError([{ severity: "error", code, message, objects: [id, ...related], source: named?.source ?? this.document.source }]);
  }
}
