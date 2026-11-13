import { Box3, Ray, Triangle, Vector3 } from "three";
import { collisionMesh } from "../src/vector/collision.ts";
import type { CompiledLevel, MeshData, Player, V3 } from "../src/vector/types.ts";

interface Face { triangle: Triangle; normal: Vector3; box: Box3; center: Vector3; shell: string; closed?: boolean }
interface Branch { box: Box3; faces?: Face[]; left?: Branch; right?: Branch }
interface Crossing { distance: number; entering: boolean; leaving: boolean }
const skin = .01;

/** Indexes immutable compiled collision faces; no source/render geometry is modified. */
function branch(faces: Face[]): Branch | undefined {
  if (!faces.length) return;
  const box = new Box3(); for (const face of faces) box.union(face.box);
  if (faces.length <= 8) return { box, faces };
  const size = box.getSize(new Vector3()), axis = size.x >= size.y && size.x >= size.z ? 'x' : size.y >= size.z ? 'y' : 'z';
  faces.sort((a, b) => a.center[axis] - b.center[axis]);
  const middle = faces.length >>> 1;
  return { box, left: branch(faces.slice(0, middle)), right: branch(faces.slice(middle)) };
}

/** Visits only faces whose spatial bounds intersect the requested region. */
function candidates(node: Branch | undefined, box: Box3, output: Face[]): Face[] {
  if (!node || !node.box.intersectsBox(box)) return output;
  if (node.faces) output.push(...node.faces);
  else { candidates(node.left, box, output); candidates(node.right, box, output); }
  return output;
}

/** Visits forward ray bounds for closed-solid containment checks. */
function rayCandidates(node: Branch | undefined, ray: Ray, output: Face[]): Face[] {
  if (!node || !ray.intersectsBox(node.box)) return output;
  if (node.faces) output.push(...node.faces);
  else { rayCandidates(node.left, ray, output); rayCandidates(node.right, ray, output); }
  return output;
}

/** Returns distance between finite segments, including parallel and degenerate endpoints. */
function segmentDistance(p: Vector3, q: Vector3, a: Vector3, b: Vector3): number {
  const d = q.clone().sub(p), e = b.clone().sub(a), r = p.clone().sub(a);
  const dd = d.dot(d), ee = e.dot(e), er = e.dot(r), dr = d.dot(r), de = d.dot(e);
  let s = 0, t = 0;
  if (dd <= 1e-16 && ee <= 1e-16) return p.distanceTo(a);
  if (dd <= 1e-16) t = Math.max(0, Math.min(1, er / ee));
  else if (ee <= 1e-16) s = Math.max(0, Math.min(1, -dr / dd));
  else {
    const denominator = dd * ee - de * de;
    s = denominator ? Math.max(0, Math.min(1, (de * er - dr * ee) / denominator)) : 0;
    t = (de * s + er) / ee;
    if (t < 0) { t = 0; s = Math.max(0, Math.min(1, -dr / dd)); }
    else if (t > 1) { t = 1; s = Math.max(0, Math.min(1, (de - dr) / dd)); }
  }
  return p.clone().addScaledVector(d, s).distanceTo(a.clone().addScaledVector(e, t));
}

/** Evaluates a nonvertical face plane in Z-up coordinates. */
function plane(face: Face, x: number, y: number): number {
  const a = face.triangle.a, n = face.normal;
  return a.z - (n.x * (x - a.x) + n.y * (y - a.y)) / n.z;
}

/** Admits boundary roundoff within 10 nanometers without expanding physical support spans. */
function containsContact(triangle: Triangle, point: Vector3): boolean {
  return triangle.closestPointToPoint(point, new Vector3()).distanceToSquared(point) <= 1e-16;
}

/** Maximizes physical bottom-hemisphere support over a triangular face. */
function sphereSupport(face: Face, feet: V3, radius: number): number | undefined {
  const triangle = face.triangle, n = face.normal, gx = -n.x / n.z, gy = -n.y / n.z, factor = radius / Math.sqrt(1 + gx * gx + gy * gy);
  const contact = new Vector3(feet[0] + factor * gx, feet[1] + factor * gy, 0); contact.z = plane(face, contact.x, contact.y);
  let height = -Infinity;
  if (containsContact(triangle, contact)) height = plane(face, feet[0], feet[1]) + radius * Math.sqrt(1 + gx * gx + gy * gy) - radius;
  const vertices = [triangle.a, triangle.b, triangle.c];
  for (let i = 0; i < 3; i++) {
    const a = vertices[i], b = vertices[(i + 1) % 3], dx = b.x - a.x, dy = b.y - a.y, length = Math.hypot(dx, dy);
    if (length < 1e-10) continue;
    const along = ((feet[0] - a.x) * dx + (feet[1] - a.y) * dy) / length;
    const perpendicular = ((feet[0] - a.x) * dy - (feet[1] - a.y) * dx) / length;
    const remaining = radius * radius - perpendicular * perpendicular;
    if (remaining < 0) continue;
    const horizontal = Math.sqrt(remaining), low = Math.max(0, along - horizontal), high = Math.min(length, along + horizontal);
    if (high < low) continue;
    const grade = (b.z - a.z) / length, position = Math.max(low, Math.min(high, along + horizontal * grade / Math.sqrt(1 + grade * grade)));
    const contactHeight = a.z + grade * position + Math.sqrt(Math.max(0, remaining - (position - along) ** 2)) - radius;
    height = Math.max(height, contactHeight);
  }
  return Number.isFinite(height) ? height : undefined;
}

/** Marks closed connected shells only; open physical patches cannot imply solid interiors. */
function closedShells(faces: Face[]): void {
  const parents = faces.map((_, i) => i), edges = new Map<string, { face: number; direction: string }[]>();
  const root = (i: number): number => { while (parents[i] !== i) { parents[i] = parents[parents[i]]; i = parents[i]; } return i; };
  faces.forEach((face, id) => {
    const vertices = [face.triangle.a, face.triangle.b, face.triangle.c].map(p => p.toArray().join(','));
    for (let i = 0; i < 3; i++) {
      const a = vertices[i], b = vertices[(i + 1) % 3], key = `${face.shell}:${face.closed}:` + [a, b].sort().join('|'), bucket = edges.get(key) ?? [];
      if (bucket.length) parents[root(id)] = root(bucket[0].face);
      bucket.push({ face: id, direction: `${a}|${b}` }); edges.set(key, bucket);
    }
  });
  const open = new Set<number>();
  for (const owners of edges.values()) if (owners.length !== 2 || owners[0].direction === owners[1].direction) for (const owner of owners) open.add(root(owner.face));
  faces.forEach((face, i) => { if (face.closed === false || open.has(root(i))) face.shell = ''; });
}

/**
 * Preserves complete checked native boundaries, including cavity faces and
 * sheets that meet at an edge. Collision filtering invalidates that guarantee.
 */
function completeNativeSolids(level: CompiledLevel, selected: MeshData): Set<string> {
  const source = level.physicalMesh ?? level.mesh;
  const coverage = new Map<string, { total: number; selected: number; checked: boolean }>();
  source.solidIds?.forEach((id, triangle) => {
    if (!id) return;
    const entry = coverage.get(id) ?? { total: 0, selected: 0, checked: true };
    entry.total++;
    entry.checked &&= level.surfaces[source.surfaces[triangle]].closed === true;
    coverage.set(id, entry);
  });
  for (const id of selected.solidIds ?? []) {
    const entry = coverage.get(id);
    if (entry) entry.selected++;
  }
  return new Set([...coverage].filter(([, entry]) => entry.checked && entry.total === entry.selected).map(([id]) => id));
}

/** Bounds support acquisition and sphere lift without changing physical step permission. */
export function supportWindow(player: Player): number {
  const slope = Math.max(0, Math.min(89, player.slope)) * Math.PI / 180;
  return Math.max(.1, player.step) + player.radius * (1 / Math.cos(slope) - 1) + skin + 1e-5;
}

/** Read-only capsule support and collision queries over a compiled physical mesh. */
export class PhysicalWalk {
  private readonly root?: Branch;
  constructor(level: CompiledLevel) {
    const mesh = collisionMesh(level), complete = completeNativeSolids(level, mesh);
    const faces: Face[] = [], legacy: Face[] = [];
    for (let i = 0; i < mesh.indices.length; i += 3) {
      const points = mesh.indices.slice(i, i + 3).map(index => new Vector3(...mesh.positions.slice(index * 3, index * 3 + 3)));
      const triangle = new Triangle(points[0], points[1], points[2]), box = new Box3().setFromPoints(points);
      const surface = level.surfaces[mesh.surfaces[i / 3]];
      const solid = mesh.solidIds?.[i / 3];
      const shell = solid === undefined ? surface.mesh : complete.has(solid) ? solid : '';
      const face = { triangle, normal: triangle.getNormal(new Vector3()), box, center: box.getCenter(new Vector3()), shell, closed: surface.closed };
      faces.push(face);
      if (solid === undefined) legacy.push(face);
    }
    closedShells(legacy); this.root = branch(faces);
  }
  /** Checks standing clearance against real faces, including the interior of closed solids. */
  blocked(feet: V3, player: Pick<Player, 'height' | 'radius'>): boolean {
    const { height, radius } = player, a = new Vector3(feet[0], feet[1], feet[2] + radius), b = new Vector3(feet[0], feet[1], feet[2] + height - radius);
    const vertical = new Ray(a, new Vector3(0, 0, 1));
    const box = new Box3(new Vector3(feet[0] - radius, feet[1] - radius, feet[2]), new Vector3(feet[0] + radius, feet[1] + radius, feet[2] + height));
    for (const { triangle } of candidates(this.root, box, [])) {
      const hit = vertical.intersectTriangle(triangle.a, triangle.b, triangle.c, false, new Vector3());
      if (hit && hit.z <= b.z + 1e-9) return true;
      const distance = Math.min(a.distanceTo(triangle.closestPointToPoint(a, new Vector3())), b.distanceTo(triangle.closestPointToPoint(b, new Vector3())), segmentDistance(a, b, triangle.a, triangle.b), segmentDistance(a, b, triangle.b, triangle.c), segmentDistance(a, b, triangle.c, triangle.a));
      if (distance < radius - 1e-5) return true;
    }
    const ray = new Ray(a.clone().add(b).multiplyScalar(.5), new Vector3(1, .173, .319).normalize()), crossings = new Map<string, Crossing[]>();
    for (const { triangle, shell, normal } of rayCandidates(this.root, ray, [])) {
      if (!shell) continue;
      const hit = ray.intersectTriangle(triangle.a, triangle.b, triangle.c, false, new Vector3());
      if (!hit) continue;
      const distance = hit.distanceTo(ray.origin), hits = crossings.get(shell) ?? [];
      if (distance <= 1e-8) continue;
      let crossing = hits.find(hit => Math.abs(hit.distance - distance) < 1e-6);
      if (!crossing) { crossing = { distance, entering: false, leaving: false }; hits.push(crossing); }
      const orientation = normal.dot(ray.direction);
      crossing.entering ||= orientation < 0;
      crossing.leaving ||= orientation > 0;
      crossings.set(shell, hits);
    }
    // A triangle seam counts once. Simultaneous exit/entry at touching sheets cancels.
    return [...crossings.values()].some(hits => hits.filter(hit => hit.entering !== hit.leaving).length % 2 === 1);
  }
  /** Returns actual center support below the body, never a higher stacked floor. */
  private datum(previous: V3, player: Player): number | undefined {
    const window = supportWindow(player), box = new Box3(new Vector3(previous[0] - 1e-6, previous[1] - 1e-6, previous[2] - window), new Vector3(previous[0] + 1e-6, previous[1] + 1e-6, previous[2] + .02));
    let result = -Infinity;
    for (const face of candidates(this.root, box, [])) {
      if (face.normal.z <= 1e-8) continue;
      const z = plane(face, previous[0], previous[1]), point = new Vector3(previous[0], previous[1], z);
      if (z <= previous[2] + .02 && z >= previous[2] - window && containsContact(face.triangle, point)) result = Math.max(result, z);
    }
    return Number.isFinite(result) ? result : undefined;
  }
  /** Resolves physical support within the existing nav corridor and authored step/slope limits. */
  resolve(candidate: V3, previous: V3, player: Player): V3 | undefined {
    const datum = this.datum(previous, player); if (datum === undefined) return;
    const { radius } = player, window = supportWindow(player), box = new Box3(new Vector3(candidate[0] - radius, candidate[1] - radius, candidate[2] - window), new Vector3(candidate[0] + radius, candidate[1] + radius, candidate[2] + window));
    let support = -Infinity;
    for (const face of candidates(this.root, box, [])) {
      if (face.normal.z < Math.cos(player.slope * Math.PI / 180) - 1e-6) continue;
      const acquisition = plane(face, previous[0], previous[1]) - datum;
      if (Math.abs(acquisition) > player.step + 1e-5) continue;
      const height = sphereSupport(face, candidate, radius);
      if (height !== undefined && Math.abs(height - candidate[2]) <= window) support = Math.max(support, height);
    }
    if (!Number.isFinite(support)) return;
    const feet: V3 = [candidate[0], candidate[1], support + skin];
    return this.blocked(feet, player) ? undefined : feet;
  }
}

const cache = new WeakMap<CompiledLevel, { mesh: MeshData; surfaces: CompiledLevel['surfaces']; hash: string; physical: PhysicalWalk }>();
/** Caches only immutable compiled geometry; recompilation or mesh replacement invalidates it. */
export function physicalWalk(level: CompiledLevel): PhysicalWalk {
  const mesh = level.physicalMesh ?? level.mesh, prior = cache.get(level);
  if (prior?.mesh === mesh && prior.surfaces === level.surfaces && prior.hash === level.geometryHash) return prior.physical;
  const physical = new PhysicalWalk(level); cache.set(level, { mesh, surfaces: level.surfaces, hash: level.geometryHash, physical }); return physical;
}
