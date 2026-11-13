import { RouteDomains } from "./route-domains.ts";
import { PhysicalRouteWork } from "./physical-work.ts";
import { blockedMouthSegment, StandingSupports } from "./connection-clearance.ts";
import { spatialDiagnostic } from "./diagnostics.ts";
import { PhysicalGeometryIndex } from "./spatial-geometry.ts";
import { heightAt, pathLength } from "./geometry.ts";
import { physicalComponents } from "./physical-components.ts";
import {
  type CompiledLevel,
  type Diagnostic,
  type Link,
  type NavigationReport,
  type V3,
} from "./types.ts";

interface Run {
  id: string;
  areas: [string, string];
  a: V3;
  b: V3;
  length: number;
  path: V3[];
}
/** Reads immutable resolved world-space mouths and maps floor identities to logical areas. */
function sharedRuns(
  level: CompiledLevel,
  work: PhysicalRouteWork,
): Run[] {
  const owners = new Map(
    level.floors.map((floor) => [floor.region, floor.area ?? floor.region]),
  );
  return (level.connections ?? []).flatMap((connection) => {
    work.spend();
    if (!connection.path) return [];
    const path = connection.path;
    if (!path || path.length < 2) return [];
    work.spend(path.length);
    const areas: [string, string] = [
      owners.get(connection.from) ?? connection.from,
      owners.get(connection.to) ?? connection.to,
    ].sort() as [string, string];
    return [
      { id: connection.id, areas, a: path[0], b: path.at(-1)!, length: pathLength(path), path },
    ];
  });
}

type Components = ReturnType<typeof physicalComponents>;
interface Resource {
  kind: "mouth" | "link";
  from: string[];
  to: string[];
  bidirectional: boolean;
}
/** Collects witnessed crossings along each segment of a declared mouth. */
function crossings(run: Run, components: Components, index: PhysicalGeometryIndex, height: number): [string, string][] {
  return run.path
    .slice(1)
    .flatMap((b, i) =>
      segmentCrossings({ ...run, a: run.path[i], b }, components, index, height),
    );
}
/** Samples both sides of a mouth on eroded navigation; missing samples are inconclusive. */
function segmentCrossings(
  run: Run,
  components: Components,
  index: PhysicalGeometryIndex,
  height: number,
): [string, string][] {
  const dx = run.b[0] - run.a[0],
    dy = run.b[1] - run.a[1],
    length = Math.hypot(dx, dy),
    result: [string, string][] = [];
  if (!length) return result;
  for (const fraction of [0.5, 0.25, 0.75, 0.125, 0.875]) {
    const p = run.a.map((v, i) => v + (run.b[i] - v) * fraction) as V3;
    if (!components.locate(p) || index.contains([p[0], p[1], p[2] + height / 2])) continue;
    const left: V3 = [
        p[0] - (dy / length) * 0.05,
        p[1] + (dx / length) * 0.05,
        p[2],
      ],
      right: V3 = [
        p[0] + (dy / length) * 0.05,
        p[1] - (dx / length) * 0.05,
        p[2],
      ];
    for (const [a, b] of [
      [left, right],
      [right, left],
    ]) {
      const from = components.locate(a, run.areas[0]),
        to = components.locate(b, run.areas[1]);
      if (from && to) result.push([from, to]);
    }
  }
  return result;
}
/** Retains one connected crossing cluster so a mouth cannot bridge disconnected components. */
function mouthResource(pairs: [string, string][]): Resource {
  // A blocker may split both sides of one boundary run. Never join disconnected
  // crossing clusters through the capacity node; retain one cluster conservatively.
  const connected = new Set(pairs[0]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const [a, b] of pairs)
      if (connected.has(a) !== connected.has(b)) {
        connected.add(a);
        connected.add(b);
        changed = true;
      }
  }
  const retained = pairs.filter(
    ([a, b]) => connected.has(a) && connected.has(b),
  );
  return {
    kind: "mouth",
    from: [...new Set(retained.map((p) => p[0]))],
    to: [...new Set(retained.map((p) => p[1]))],
    bidirectional: true,
  };
}
/** Whether two spans form one contiguous mouth, including overlapping or reversed declarations. */
function touchingRuns(first: Run, second: Run): boolean {
  if (first.areas.some((area, i) => area !== second.areas[i])) return false;
  for (let i = 1; i < first.path.length; i++) for (let j = 1; j < second.path.length; j++) {
    const a = first.path[i - 1], b = first.path[i], c = second.path[j - 1], d = second.path[j];
    const vector = b.map((value, axis) => value - a[axis]) as V3;
    const lengthSquared = vector.reduce((sum, value) => sum + value * value, 0);
    if (lengthSquared < 1e-12) continue;
    const station = (point: V3) => point.reduce((sum, value, axis) => sum + (value - a[axis]) * vector[axis], 0) / lengthSquared;
    const onLine = (point: V3) => Math.hypot(...point.map((value, axis) => value - a[axis] - vector[axis] * station(point))) <= 1e-6;
    if ([a, b].some(p => [c, d].some(q => Math.hypot(...p.map((v, axis) => v - q[axis])) <= 1e-6))) return true;
    if (onLine(c) && onLine(d) && Math.max(Math.min(station(c), station(d)), 0) <= Math.min(Math.max(station(c), station(d)), 1) + 1e-7) return true;
  }
  return false;
}

/** Separates witnessed crossings from complete-obstruction proofs and uncertain mouths. */
function entrances(
  level: CompiledLevel,
  components: Components,
  work: PhysicalRouteWork,
  index: PhysicalGeometryIndex,
  domains: RouteDomains,
) {
  const runs = sharedRuns(level, work), parent = runs.map((_, i) => i);
  const supports = runs.length ? new StandingSupports(level, () => work.spend()) : undefined;
  const root = (index: number): number => {
    while (parent[index] !== index) { work.spend(); index = parent[index]; }
    return index;
  };
  for (let i = 0; i < runs.length; i++) for (let j = 0; j < i; j++) {
    work.spend(runs[i].path.length * runs[j].path.length);
    if (touchingRuns(runs[i], runs[j])) parent[root(i)] = root(j);
  }
  const groups = new Map<number, Run[]>();
  runs.forEach((run, i) => {
    const id = root(i), group = groups.get(id) ?? [];
    group.push(run); groups.set(id, group);
  });
  const areas: [string, string][] = [], resources: Resource[] = [], optimistic: Resource[] = [];
  const connections: { id: string; status: "verified" | "blocked" | "unverified"; blockers: string[]; path: V3[] }[] = [];
  for (const group of groups.values()) {
    const pairs: [string, string][] = [];
    let possible = false;
    for (const run of group) {
      work.spend(run.path.length);
      const blockers = new Set<string>();
      const elevation = run.path[0][2];
      const bodyPlane = supports!.plane(elevation, run.path);
      let blocked = bodyPlane !== undefined && run.path.every(point => Math.abs(point[2] - elevation) < 1e-6);
      for (let i = 1; i < run.path.length; i++) {
        if (!blocked) break;
        const raise = (p: V3): V3 => [p[0], p[1], bodyPlane!];
        const evidence = blockedMouthSegment(index, raise(run.path[i - 1]), raise(run.path[i]));
        if (!evidence) { blocked = false; break; }
        evidence.forEach(id => blockers.add(id));
      }
      const witnessed = blocked ? [] : crossings(run, components, index, level.document.player.height);
      pairs.push(...witnessed);
      possible ||= !blocked;
      connections.push({ id: run.id, status: blocked ? "blocked" : witnessed.length ? "verified" : "unverified", blockers: blocked ? [...blockers] : [], path: run.path });
    }
    if (possible) optimistic.push({
      kind: "mouth",
      from: [...new Set(group.flatMap(run => domains.along(run.path, run.areas[0])))],
      to: [...new Set(group.flatMap(run => domains.along(run.path, run.areas[1])))],
      bidirectional: true,
    });
    if (pairs.length && group.some(run => run.length >= level.document.player.radius * 2)) {
      areas.push(group[0].areas); resources.push(mouthResource(pairs));
    }
  }
  return { areas, resources, optimistic, connections };
}
interface LinkGroup {
  from: V3;
  to: V3;
  resource: Resource;
}
/** Tests whether authored links use the same physical endpoints and component pair. */
function coincidentLink(group: LinkGroup, link: LinkGroup, radius: number) {
  const near = (a: V3, b: V3) =>
    Math.hypot(...a.map((v, i) => v - b[i])) <= radius * 2;
  const directed = (a: LinkGroup, b: LinkGroup) =>
    a.resource.from[0] === b.resource.from[0] &&
    a.resource.to[0] === b.resource.to[0] &&
    near(a.from, b.from) &&
    near(a.to, b.to);
  return (
    directed(group, link) ||
    directed(group, {
      from: link.to,
      to: link.from,
      resource: {
        ...link.resource,
        from: link.resource.to,
        to: link.resource.from,
      },
    })
  );
}
/** Locates enabled traversal endpoints without granting unsupported abilities. */
function enabledLinkGroups(
  level: CompiledLevel,
  components: Components,
): LinkGroup[] {
  const player = level.document.player,
    groups: LinkGroup[] = [];
  const areas = new Map(
    level.floors.map((f) => [f.region, f.area ?? f.region]),
  );
  const endpoint = (point: V3, area?: string) =>
    components.locate(point, areas.get(area ?? "") ?? area, player.radius);
  const enabled = (link: Link) =>
    link.movement !== "water" &&
    !!link.ability &&
    player[link.ability as keyof typeof player] === true;
  for (const link of level.document.links.filter(enabled)) {
    const from = endpoint(link.from, link.fromArea),
      to = endpoint(link.to, link.toArea);
    if (!from || !to || from === to) continue;
    groups.push({
      from: link.from,
      to: link.to,
      resource: {
        kind: "link",
        from: [from],
        to: [to],
        bidirectional: link.bidirectional,
      },
    });
  }
  return groups;
}
/** Groups coincident traversal resources while preserving one-way direction. */
function authoredLinks(
  level: CompiledLevel,
  components: Components,
  work: PhysicalRouteWork,
): Resource[] {
  const groups: LinkGroup[] = [];
  for (const link of enabledLinkGroups(level, components)) {
    const prior = groups.find((g) => {
      work.spend();
      return coincidentLink(g, link, level.document.player.radius);
    });
    if (prior)
      prior.resource.bidirectional ||=
        link.resource.bidirectional ||
        prior.resource.from[0] !== link.resource.from[0];
    else groups.push(link);
  }
  return groups.map((g) => g.resource);
}
/** Computes edge-resource capacity between already established component identities. */
function independentRoutes(
  resources: Resource[],
  work: PhysicalRouteWork,
  start?: string,
  end?: string,
): number {
  if (!start || !end) return 0;
  if (start === end) return 1;
  const capacities = new Map<string, Map<string, number>>();
  const row = (id: string) => {
    if (!capacities.has(id)) capacities.set(id, new Map());
    return capacities.get(id)!;
  };
  const add = (a: string, b: string, n: number) =>
    row(a).set(b, (row(a).get(b) ?? 0) + n);
  // Every resource has one shared bottleneck, even when its mouth touches several components.
  resources.forEach((r, i) => {
    work.spend(r.from.length + r.to.length + 1);
    const a = `resource/${i}/in`,
      b = `resource/${i}/out`;
    add(a, b, 1);
    for (const c of r.from) {
      add(c, a, resources.length);
      if (r.bidirectional) add(b, c, resources.length);
    }
    for (const c of r.to) {
      add(b, c, resources.length);
      if (r.bidirectional) add(c, a, resources.length);
    }
  });
  let count = 0;
  while (true) {
    const parents = new Map<string, string>(),
      queue = [start];
    parents.set(start, start);
    for (let i = 0; i < queue.length && !parents.has(end); i++)
      for (const [next, capacity] of row(queue[i])) {
        work.spend();
        if (capacity > 0 && !parents.has(next)) {
          parents.set(next, queue[i]);
          queue.push(next);
        }
      }
    if (!parents.has(end)) return count;
    for (let at = end; at !== start;) {
      work.spend();
      const previous = parents.get(at)!;
      row(previous).set(at, row(previous).get(at)! - 1);
      row(at).set(previous, (row(at).get(previous) ?? 0) + 1);
      at = previous;
    }
    count++;
  }
}
/**
 * Counts verified entrance resources and an optimistic bound over grouped declarations.
 * Navigation must describe the current level, route endpoints and player settings.
 * Navigation establishes intra-area components; exact closed-solid interval checks can
 * rule out a whole mouth. Unobserved crossings remain possible in the upper bound.
 */
export function physicalRouteEvidence(
  level: CompiledLevel,
  navigation: NavigationReport,
  signal?: AbortSignal,
  maximumWork = 8_000_000,
) {
  const work = new PhysicalRouteWork(maximumWork, signal);
  work.spend(level.document.routes.length + (level.connections?.length ?? 0) + level.document.links.length);
  const hasResources = !!level.connections?.length || level.document.links.length > 0;
  const components: Components = hasResources ? physicalComponents(level, navigation, signal, work) : {
    components: [], locate: () => undefined,
  };
  const physical = { ...level, surfaces: level.surfaces.map(surface => surface.dynamic && !navigation.settings.sealed ? { ...surface, collidable: false } : surface) };
  const index = new PhysicalGeometryIndex(physical, signal, maximumWork);
  const domains = new RouteDomains(level, work);
  const mouths = entrances(physical, components, work, index, domains);
  const resources = [...mouths.resources, ...authoredLinks(level, components, work)];
  const areas = new Map(level.floors.map(floor => [floor.region, floor.area ?? floor.region]));
  const componentAreas = new Map(components.components.map(component => [component.id, component.area]));
  const optimisticComponents = {
    components: components.components,
    locate: (point: V3, area?: string) => {
      if (area) {
        const matches = domains.at(point, areas.get(area) ?? area);
        return matches.length === 1 ? matches[0] : undefined;
      }
      const floor = level.floors.find(floor => Math.abs((heightAt(floor, point[0], point[1]) ?? Infinity) - point[2]) <= level.document.player.step + 0.02);
      const matches = floor ? domains.at(point, floor.area ?? floor.region) : [];
      return matches.length === 1 ? matches[0] : undefined;
    },
  };
  const optimisticLinks = authoredLinks(level, optimisticComponents, work);
  const optimistic = [...mouths.optimistic, ...optimisticLinks];
  const incomplete = (level.connections ?? []).some(connection => !connection.path) ||
    level.document.links.some(link => link.ability && level.document.player[link.ability as keyof typeof level.document.player] === true &&
      (!optimisticComponents.locate(link.from, link.fromArea) || !optimisticComponents.locate(link.to, link.toArea)));
  const markerComponent = (id: string) => {
    work.spend();
    const marker = level.document.markers.find(marker => marker.id === id);
    return marker ? components.locate(marker.position, marker.region ? areas.get(marker.region) ?? marker.region : undefined, level.document.player.radius) : undefined;
  };
  return {
    entrances: mouths.areas, components: components.components, resources, connections: mouths.connections,
    routes: level.document.routes.filter(route => route.movement !== "water").map(route => {
      const from = markerComponent(route.from), to = markerComponent(route.to);
      const fromArea = from && componentAreas.get(from), toArea = to && componentAreas.get(to);
      const fromMarker = level.document.markers.find(marker => marker.id === route.from);
      const toMarker = level.document.markers.find(marker => marker.id === route.to);
      const fromDomains = fromArea && fromMarker ? domains.at(fromMarker.position, fromArea) : [];
      const toDomains = toArea && toMarker ? domains.at(toMarker.position, toArea) : [];
      const reachable = navigation.routes.find(row => row.id === route.id)?.reachable;
      const verified = reachable ? Math.max(1, independentRoutes(resources, work, from, to)) : 0;
      const maximum = !incomplete && fromDomains.length === 1 && toDomains.length === 1 && fromDomains[0] !== toDomains[0]
        ? independentRoutes(optimistic, work, fromDomains[0], toDomains[0]) : undefined;
      return {
        id: route.id,
        physicalDisjointRoutes: verified,
        ...(maximum !== undefined && maximum >= verified ? { maximumDisjointRoutes: maximum } : {}),
      };
    }),
    method: "One resource per contiguous native mouth or enabled traversal. A reachable endpoint path establishes one route; additional verified crossings use floor-clipped navigation and can undercount. The optimistic bound retains unverified mouths and only partitions flat declared domains using independent closed-solid sections; other intra-area connectivity stays unrestricted. Neither bound is continuous gameplay proof.",
  };
}
export type PhysicalRouteEvidence = ReturnType<typeof physicalRouteEvidence>;

/** Formats local connection evidence independently of endpoint-route requirements. */
export function connectionDiagnostics(level: CompiledLevel, evidence: PhysicalRouteEvidence): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  for (const connection of level.connections ?? []) {
    const result = evidence.connections.find(row => row.id === connection.id);
    if (result?.status === "verified") continue;
    const blocked = result?.status === "blocked";
    const points = connection.path ?? level.floors.filter(floor => [connection.from, connection.to].includes(floor.region)).flatMap(floor => floor.points);
    diagnostics.push(spatialDiagnostic(level, blocked ? "CONNECTION_BLOCKED" : "CONNECTION_UNVERIFIED",
      blocked ? "Closed collision blocks the entire declared standing mouth. A remote endpoint detour does not satisfy this connection." :
        connection.path ? "No crossing was verified through this mouth. Sampling may miss usable clearance; inspect support, headroom and the declared span." :
          "This connection has no mouth span, so its local passage and physical capacity cannot be checked.",
      [connection.id, connection.from, connection.to, ...(result?.blockers ?? [])],
      points.flatMap(point => [point, [point[0], point[1], point[2] + level.document.player.height] as V3]), blocked ? "error" : "warning"));
  }
  return diagnostics;
}
