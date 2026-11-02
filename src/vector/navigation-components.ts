import { Detour, type NavMesh } from "recast-navigation";
import type { CompiledLevel, NavigationComponent, V3 } from "./types.ts";
import { aborted } from "./types.ts";
import { heightAt, orient } from "./geometry.ts";

type Polygon = { ref: number; links: number[]; triangles: number };

/**
 * Describes weakly connected Detour polygon networks while the native mesh is
 * alive. Triangle membership follows getNavMeshPositionsAndIndices export order;
 * positions supplied by the caller are already canonical right-handed Z-up meters.
 * Enabled one-way traversal links count as connections, not bidirectional routes.
 */
export function navigationComponents(
  mesh: NavMesh,
  level: CompiledLevel,
  positions: number[],
  indices: number[],
  heightTolerance: number,
  signal?: AbortSignal,
): { componentDetails: NavigationComponent[]; triangleComponents: string[] } {
  const polygons: Polygon[] = [];
  const parents = new Map<number, number>();
  for (let i = 0; i < mesh.getMaxTiles(); i++) {
    aborted(signal);
    const tile = mesh.getTile(i),
      header = tile.header();
    if (!header) continue;
    const base = mesh.getPolyRefBase(tile);
    for (let j = 0; j < header.polyCount(); j++) {
      const poly = tile.polys(j),
        ref = base + j;
      const links: number[] = [];
      if (poly.flags()) {
        for (let linkIndex = poly.firstLink(); linkIndex !== Detour.DT_NULL_LINK;) {
          const link = tile.links(linkIndex);
          if (link.ref()) links.push(link.ref());
          linkIndex = link.next();
        }
        parents.set(ref, ref);
      }
      polygons.push({
        ref,
        links,
        triangles: poly.getType() === 1 ? 0 : tile.detailMeshes(j).triCount(),
      });
    }
  }
  /** Resolves and compresses one polygon's disjoint-set representative. */
  function root(ref: number): number {
    const parent = parents.get(ref)!;
    if (parent === ref) return ref;
    const result = root(parent);
    parents.set(ref, result);
    return result;
  }
  for (const polygon of polygons)
    for (const other of polygon.links) {
      if (parents.has(polygon.ref) && parents.has(other))
        parents.set(root(other), root(polygon.ref));
    }
  const components = new Map<number, NavigationComponent>();
  const triangleRoots: (number | undefined)[] = [];
  let triangle = 0;
  for (const polygon of polygons) {
    aborted(signal);
    for (let i = 0; i < polygon.triangles; i++, triangle++) {
      if (!parents.has(polygon.ref)) {
        triangleRoots.push(undefined);
        continue;
      }
      const key = root(polygon.ref);
      triangleRoots.push(key);
      let component = components.get(key);
      if (!component) {
        component = {
          id: "",
          area: 0,
          bounds: {
            min: [Infinity, Infinity, Infinity],
            max: [-Infinity, -Infinity, -Infinity],
          },
          position: [0, 0, 0],
          regions: [],
          layers: [],
        };
        components.set(key, component);
      }
      const points = indices
        .slice(triangle * 3, triangle * 3 + 3)
        .map((index) => positions.slice(index * 3, index * 3 + 3) as V3);
      component.area += Math.abs(orient(points[0], points[1], points[2])) / 2;
      const center = [0, 1, 2].map((axis) =>
        points.reduce((sum, p) => sum + p[axis] / 3, 0),
      ) as V3;
      if (component.bounds.min[0] === Infinity) component.position = center;
      for (const point of points)
        for (let axis = 0; axis < 3; axis++) {
          component.bounds.min[axis] = Math.min(
            component.bounds.min[axis],
            point[axis],
          );
          component.bounds.max[axis] = Math.max(
            component.bounds.max[axis],
            point[axis],
          );
        }
      for (const floor of level.floors) {
        const z = heightAt(floor, center[0], center[1]);
        if (z === undefined || Math.abs(z - center[2]) > heightTolerance)
          continue;
        if (!component.regions.includes(floor.region))
          component.regions.push(floor.region);
        if (!component.layers.includes(floor.layer))
          component.layers.push(floor.layer);
        break;
      }
    }
  }
  if (triangle !== indices.length / 3)
    throw new Error(
      "Navigation component membership does not match exported triangles.",
    );
  const details = [...components.values()];
  for (const component of details) {
    component.regions.sort();
    component.layers.sort();
  }
  details.sort(
    (a, b) =>
      a.regions.join("|").localeCompare(b.regions.join("|")) ||
      a.bounds.min[0] - b.bounds.min[0] ||
      a.bounds.min[1] - b.bounds.min[1] ||
      a.bounds.min[2] - b.bounds.min[2],
  );
  const counts = new Map<string, number>();
  for (const component of details) {
    const key = component.regions.join("|") || "unassigned";
    const index = counts.get(key) ?? 0;
    component.id = `${key}:${index}`;
    counts.set(key, index + 1);
  }
  return {
    componentDetails: details,
    triangleComponents: triangleRoots.map((key) =>
      key === undefined ? "" : components.get(key)!.id,
    ),
  };
}
