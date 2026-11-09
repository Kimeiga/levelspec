import { Matrix3, Vector3 } from "three";
import type { Diagnostic, MeshData, Surface, V3 } from "../vector/types.ts";
import { aborted } from "../vector/types.ts";
import { cross, dot, sub } from "../vector/geometry.ts";
import type { ArchitectureResolution, ResolvedElement } from "./resolve.ts";
import { transform, triangleNormal } from "./geometry.ts";
import type { FaceMaterial } from "./types.ts";

type Polygon = V3[];
type Projection = (point: V3) => [number, number];
interface Fragment { points: Polygon; surface: number; contributors: string[]; sources: number[]; assignment?: string }
/** Precomposition faces are used only where they coincide with final exposed geometry. */
export interface AuthoredFace { points: V3[]; surface: number }

const planeTolerance = 1e-6;
const areaTolerance = 1e-10;

/** Computes a polygon's area without depending on triangulation. */
function polygonArea(points: Polygon): number {
  if (points.length < 3) return 0;
  return points.slice(2).reduce((sum, point, i) => sum + Math.hypot(...cross(sub(points[i + 1], points[0]), sub(point, points[0]))) / 2, 0);
}

/** Clips a convex spatial polygon against one projected half-plane on its own plane. */
function halfPlane(points: Polygon, a: number[], b: number[], project: Projection, keepInside: boolean): Polygon {
  const distance = (point: V3) => { const p = project(point); return (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]); };
  const result: Polygon = [];
  for (let i = 0; i < points.length; i++) {
    const p = points[i], q = points[(i + 1) % points.length], dp = distance(p), dq = distance(q);
    const ip = keepInside ? dp >= 0 : dp <= 0, iq = keepInside ? dq >= 0 : dq <= 0;
    if (ip) result.push(p);
    if (ip !== iq) {
      const t = dp / (dp - dq);
      result.push(p.map((n, axis) => n + (q[axis] - n) * t) as V3);
    }
  }
  return result;
}

/** Splits a convex polygon into its intersection with a triangle and disjoint remainders. */
function partition(points: Polygon, triangle: V3[], project: Projection): { inside: Polygon; outside: Polygon[] } {
  const projected = triangle.map(project), [a, b, c] = projected;
  if ((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]) < 0) projected.reverse();
  let inside = points;
  const outside: Polygon[] = [];
  for (let i = 0; i < 3 && inside.length; i++) {
    const a = projected[i], b = projected[(i + 1) % 3];
    const removed = halfPlane(inside, a, b, project, false);
    if (polygonArea(removed) > areaTolerance) outside.push(removed);
    inside = halfPlane(inside, a, b, project, true);
  }
  return { inside: polygonArea(inside) > areaTolerance ? inside : [], outside };
}

/** Chooses a nondegenerate plane projection for coplanar face intersections. */
function planeProjection(normal: V3): Projection {
  const axis = normal.map(Math.abs).indexOf(Math.max(...normal.map(Math.abs)));
  return point => axis === 0 ? [point[1], point[2]] : axis === 1 ? [point[0], point[2]] : [point[0], point[1]];
}

/** Indexes outward planes; candidate admission still verifies normals and distances. */
function planeKey(points: V3[]): string {
  const normal = triangleNormal(points), distance = dot(normal, points[0]);
  return [...normal, distance].map(n => Math.round(n / 1e-5)).join(",");
}

/** Tests selectors in the host's authored coordinates, including nonuniform placements. */
function selected(face: FaceMaterial["face"], points: Polygon, host: ResolvedElement, surface: Surface, resolution: ArchitectureResolution): boolean {
  if (face === "all") return true;
  if (face === "reveal") {
    const opening = resolution.nodes.get(surface.object);
    return surface.role === "reveal" && opening?.element.kind === "opening" && resolution.reference(opening, opening.element.host).id === host.id;
  }
  const normal = new Vector3(...triangleNormal(points)).applyMatrix3(new Matrix3().setFromMatrix4(host.matrix).transpose()).normalize();
  if (face === "side") return Math.abs(normal.z) < 1 - 1e-6;
  const component = face === "top" ? normal.z : face === "bottom" ? -normal.z : face === "front" ? -normal.y : face === "back" ? normal.y : face === "left" ? -normal.x : normal.x;
  return component > 1 - 1e-6;
}

/** Finds native descendants, preserving organizational groups within the named host. */
function descendants(node: ResolvedElement): Set<string> {
  return new Set([node.id, ...node.children.flatMap(child => [...descendants(child)])]);
}

/** Returns composing ancestors from innermost to outermost, excluding groups and instances. */
function boundaries(node: ResolvedElement | undefined): ResolvedElement[] {
  const result: ResolvedElement[] = [];
  for (let parent = node?.parent; parent; parent = parent.parent) {
    if (["assembly", "union", "subtract", "intersect", "collision"].includes(parent.element.kind)) result.push(parent);
  }
  return result;
}

/**
 * Resolves exposed face ownership and paints profile partitions on render triangles.
 * The caller retains the unpartitioned physical mesh for collision/navigation/hash.
 * Clipping creates coplanar subdivisions only; it never duplicates occupied shells.
 */
export function applyFaceMaterials(mesh: MeshData, surfaces: Surface[], resolution: ArchitectureResolution, authored: AuthoredFace[], diagnostics: Diagnostic[], maximumTriangles: number, signal?: AbortSignal): MeshData {
  const assignments = [...resolution.nodes.values()].filter(node => node.element.kind === "face-material");
  const indexed = new Map<string, AuthoredFace[]>();
  for (const face of authored) {
    const key = planeKey(face.points), bucket = indexed.get(key) ?? [];
    bucket.push(face); indexed.set(key, bucket);
  }
  const scopes = new Map([...resolution.nodes.values()].map(node => [node.id, descendants(node)]));
  const plans = assignments.map(node => {
    const element = node.element as FaceMaterial, host = resolution.reference(node, element.host);
    if (!resolution.document.materials.some(material => material.id === element.material) && element.material !== "default") resolution.fail(node.id, `Unknown material ${element.material}.`);
    const profile = element.profile ? resolution.profiles.get(element.profile) : undefined;
    if (element.profile && !profile) resolution.fail(node.id, `Unknown profile ${element.profile}.`);
    const inverse = host.matrix.clone().invert();
    const project: Projection = point => {
      const local = transform(point, inverse);
      return element.projection === "xy" ? [local[0], local[1]] : element.projection === "xz" ? [local[0], local[2]] : [local[1], local[2]];
    };
    return { node, element, host, profile, project };
  });
  if (!plans.length && mesh.surfaces.every(index => surfaces[index].domain !== 'architecture')) return mesh;
  const terrainVertices = new Map<number,number>();
  const unpartitioned = new Map<number,boolean>();
  const output: MeshData = { positions: [], normals: [], indices: [], uv: [], surfaces: [], ...(mesh.solidIds ? {solidIds: []} : {}) };
  const owners = new Map<string, number>(), conflicts = new Set<string>();
  let checks = 0;
  const check = () => { aborted(signal); if (++checks > maximumTriangles * 32) resolution.fail(resolution.document.id, "Face partition intersection budget exceeded.", "AML_COMPLEXITY"); };
  const conflict = (objects: string[]) => {
    const key = [...objects].sort().join("|");
    if (conflicts.has(key)) return;
    conflicts.add(key);
    diagnostics.push({ severity: "error", code: "AML_MATERIAL_CONFLICT", objects, message: "Exposed coincident faces have conflicting material assignments; declare a material-owner or disjoint face partitions.", source: resolution.nodes.get(objects[0])?.element.source });
  };
  const surfaceFor = (fragment: Fragment): number => {
    const original = surfaces[fragment.surface], key = `${fragment.surface}|${fragment.contributors.join(",")}|${fragment.assignment ?? ""}`;
    const cached = owners.get(key); if (cached !== undefined) return cached;
    const index = surfaces.length;
    surfaces.push({ ...original, id: `${original.id}:face:${index}`, contributors: fragment.contributors, ...(fragment.assignment ? { assignment: fragment.assignment } : {}) });
    owners.set(key, index); return index;
  };
  for (let t = 0; t < mesh.surfaces.length; t++) {
    check();
    const surfaceIndex = mesh.surfaces[t], surface = surfaces[surfaceIndex];
    if (surface.domain === 'terrain') {
      let passthrough = unpartitioned.get(surfaceIndex);
      if (passthrough === undefined) {
        passthrough = !plans.some(plan => scopes.get(plan.host.id)!.has(surface.object)); unpartitioned.set(surfaceIndex,passthrough);
      }
      if (passthrough) {
        for (const old of mesh.indices.slice(t*3,t*3+3)) {
          let vertex = terrainVertices.get(old);
          if (vertex === undefined) {
            vertex = output.positions.length/3; terrainVertices.set(old,vertex);
            output.positions.push(...mesh.positions.slice(old*3,old*3+3)); output.normals.push(...mesh.normals.slice(old*3,old*3+3)); output.uv.push(...mesh.uv.slice(old*2,old*2+2));
          }
          output.indices.push(vertex);
        }
        output.surfaces.push(surfaceIndex);output.solidIds?.push(mesh.solidIds![t]); continue;
      }
    }
    const points = mesh.indices.slice(t * 3, t * 3 + 3).map(i => mesh.positions.slice(i * 3, i * 3 + 3) as V3);
    let fragments: Fragment[] = [{ points, surface: surfaceIndex, contributors: [surface.object], sources: [surfaceIndex] }];
    if (surface.domain === "architecture") {
      const normal = triangleNormal(points), project = planeProjection(normal), currentBoundaries = boundaries(resolution.nodes.get(surface.object));
      for (const candidate of indexed.get(planeKey(points)) ?? []) {
        check();
        const other = surfaces[candidate.surface];
        if (other.object === surface.object || other.dynamic !== surface.dynamic || other.collidable !== surface.collidable || other.visible !== surface.visible || dot(normal, triangleNormal(candidate.points)) < 1 - planeTolerance || candidate.points.some(p => Math.abs(dot(normal, sub(p, points[0]))) > planeTolerance)) continue;
        const common = currentBoundaries.find(boundary => scopes.get(boundary.id)!.has(other.object));
        if (!common) continue;
        if (fragments.length > maximumTriangles) resolution.fail(surface.object, "Face partition fragment budget exceeded.", "AML_COMPLEXITY");
        fragments = fragments.flatMap(fragment => {
          check();
          const cut = partition(fragment.points, candidate.points, project);
          if (!cut.inside.length) return [fragment];
          const contributors = [...new Set([...fragment.contributors, other.object])].sort();
          const sources = [...new Set([...fragment.sources, candidate.surface])];
          return [...cut.outside.map(points => ({ ...fragment, points })), { ...fragment, points: cut.inside, contributors, sources }];
        });
        if (fragments.length > maximumTriangles) resolution.fail(surface.object, "Face partition fragment budget exceeded.", "AML_COMPLEXITY");
      }
      for (const fragment of fragments) {
        check();
        const common = currentBoundaries.filter(boundary => fragment.contributors.every(id => scopes.get(boundary.id)!.has(id)));
        let preferred: number | undefined;
        for (const boundary of common) {
          if ("coincidentMaterial" in boundary.element && boundary.element.coincidentMaterial === "retained-face") { preferred = surfaceIndex; break; }
          if (!("materialOwner" in boundary.element) || !boundary.element.materialOwner) {
            if ("coincidentMaterial" in boundary.element && boundary.element.coincidentMaterial === "error") break;
            continue;
          }
          const owner = resolution.reference(boundary, boundary.element.materialOwner).id;
          const candidates = fragment.sources.filter(index => scopes.get(owner)?.has(surfaces[index].object));
          if (!candidates.length) {
            if (boundary.element.coincidentMaterial === "error") break;
            continue;
          }
          if (new Set(candidates.map(index => surfaces[index].material)).size > 1) conflict(candidates.map(index => surfaces[index].object));
          else preferred = candidates.sort((a, b) => surfaces[a].object.localeCompare(surfaces[b].object))[0];
          break;
        }
        const materials = new Set(fragment.sources.map(index => surfaces[index].material));
        if (materials.size > 1 && preferred === undefined) conflict(fragment.contributors);
        if (preferred !== undefined) fragment.surface = preferred;
      }
      for (const plan of plans) {
        check();
        const openingHost = resolution.nodes.get(surface.object)?.element.kind === "opening" ? resolution.provenance[surface.object].host : undefined;
        if (!scopes.get(plan.host.id)!.has(surface.object) && !(openingHost && scopes.get(plan.host.id)!.has(openingHost))) continue;
        if (!selected(plan.element.face, points, plan.host, surface, resolution)) continue;
        const apply = (fragment: Fragment, points: Polygon): Fragment => {
          if (fragment.assignment && surfaces[fragment.surface].material !== plan.element.material) conflict([fragment.assignment, plan.node.id]);
          const key = `${fragment.surface}|material:${plan.element.material}`, cached = owners.get(key);
          let index = cached;
          if (index === undefined) { index = surfaces.length; surfaces.push({ ...surfaces[fragment.surface], id: `${plan.node.id}:${index}`, material: plan.element.material }); owners.set(key, index); }
          return { ...fragment, points, surface: index, assignment: plan.node.id };
        };
        if (!plan.profile) fragments = fragments.map(fragment => { check(); return apply(fragment, fragment.points); });
        else {
          for (const triangle of plan.profile.triangles) {
            check();
            // Profile coordinates are already in the selected two-dimensional projection.
            const region = triangle.map(i => plan.profile!.points[i]);
            const profileProject: Projection = point => [point[0], point[1]];
            const projected = region.map(profileProject);
            if (fragments.length > maximumTriangles) resolution.fail(plan.node.id, "Face partition fragment budget exceeded.", "AML_COMPLEXITY");
            fragments = fragments.flatMap(fragment => {
              check();
              // Lift projected partition vertices into the host plane used by project().
              const inverseProjection = (p: number[]): V3 => transform(plan.element.projection === "xy" ? [p[0], p[1], 0] : plan.element.projection === "xz" ? [p[0], 0, p[1]] : [0, p[0], p[1]], plan.host.matrix);
              const cut = partition(fragment.points, projected.map(inverseProjection), plan.project);
              if (!cut.inside.length) return [fragment];
              return [...cut.outside.map(points => ({ ...fragment, points })), apply(fragment, cut.inside)];
            });
            if (fragments.length > maximumTriangles) resolution.fail(plan.node.id, "Face partition fragment budget exceeded.", "AML_COMPLEXITY");
          }
        }
      }
    }
    for (const fragment of fragments) {
      const surfaceIndex = surfaceFor(fragment), material = resolution.document.materials.find(material => material.id === surfaces[surfaceIndex].material), repeat = material?.repeat ?? 1;
      for (let i = 1; i + 1 < fragment.points.length; i++) {
        const triangle = [fragment.points[0], fragment.points[i], fragment.points[i + 1]], normal = triangleNormal(triangle);
        if (polygonArea(triangle) <= areaTolerance) continue;
        if (output.surfaces.length >= maximumTriangles) resolution.fail(surfaces[surfaceIndex].object, "Material partition triangle budget exceeded.", "AML_COMPLEXITY");
        const base = output.positions.length / 3, projection = planeProjection(normal);
        output.positions.push(...triangle.flat()); output.normals.push(...triangle.flatMap(() => normal)); output.indices.push(base, base + 1, base + 2); output.surfaces.push(surfaceIndex);output.solidIds?.push(mesh.solidIds![t]);
        output.uv.push(...triangle.flatMap(point => projection(point).map(n => n * repeat)));
      }
    }
  }
  return output;
}
