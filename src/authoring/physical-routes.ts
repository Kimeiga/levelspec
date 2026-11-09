import { PhysicalRouteWork } from "./physical-work.ts";
/** Conservative entrance capacities for native assemblies; strict nav remains authoritative. */
import { ProducerValidationError } from "../architecture/producer-errors.ts";
import { ArchitectureResolution } from "../architecture/resolve.ts";
import type { CompiledArchitecture } from "../architecture/types.ts";
import { coordinateKey } from "../vector/precision.ts";
import { pathLength } from "../vector/geometry.ts";
import { physicalComponents } from "./physical-components.ts";
import {
  aborted,
  type Link,
  type NavigationReport,
  type V3,
} from "../vector/types.ts";

interface Run {
  areas: [string, string];
  a: V3;
  b: V3;
  length: number;
  path: V3[];
}
function sharedRuns(
  level: CompiledArchitecture,
  work: PhysicalRouteWork,
): Run[] {
  const native = level;
  const resolution = new ArchitectureResolution(
    native.architecture,
    100_000,
    100_000,
    4096,
  );
  const owners = new Map(
    level.floors.map((floor) => [floor.region, floor.area ?? floor.region]),
  );
  return native.architecture.connections.flatMap((connection) => {
    work.spend();
    if (!connection.path) return [];
    const path = resolution.paths.get(connection.path);
    if (!path || path.length < 2) return [];
    work.spend(path.length);
    const areas: [string, string] = [
      owners.get(connection.from) ?? connection.from,
      owners.get(connection.to) ?? connection.to,
    ].sort() as [string, string];
    return [
      { areas, a: path[0], b: path.at(-1)!, length: pathLength(path), path },
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
function crossings(run: Run, components: Components): [string, string][] {
  return run.path
    .slice(1)
    .flatMap((b, i) =>
      segmentCrossings({ ...run, a: run.path[i], b }, components),
    );
}
function segmentCrossings(
  run: Run,
  components: Components,
): [string, string][] {
  const dx = run.b[0] - run.a[0],
    dy = run.b[1] - run.a[1],
    length = Math.hypot(dx, dy),
    result: [string, string][] = [];
  if (!length) return result;
  for (const fraction of [0.5, 0.25, 0.75, 0.125, 0.875]) {
    const p = run.a.map((v, i) => v + (run.b[i] - v) * fraction) as V3;
    if (!components.locate(p)) continue;
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
function entrances(
  level: CompiledArchitecture,
  components: Components,
  work: PhysicalRouteWork,
  signal?: AbortSignal,
) {
  const runs = sharedRuns(level, work),
    parent = runs.map((_, i) => i),
    endpoints = new Map<string, number>();
  const root = (index: number): number => {
    let result = index;
    while (parent[result] !== result) {
      work.spend();
      result = parent[result];
    }
    while (parent[index] !== index) {
      const next = parent[index];
      parent[index] = result;
      index = next;
    }
    return result;
  };
  for (const [i, run] of runs.entries())
    for (const p of [run.a, run.b]) {
      work.spend();
      const key = JSON.stringify(run.areas) + "|" + coordinateKey(p),
        prior = endpoints.get(key);
      if (prior !== undefined) parent[root(i)] = root(prior);
      else endpoints.set(key, i);
    }
  const groups = new Map<number, Run[]>();
  runs.forEach((run, i) => {
    const id = root(i);
    const group = groups.get(id) ?? [];
    group.push(run);
    groups.set(id, group);
  });
  const areas: [string, string][] = [],
    resources: Resource[] = [];
  for (const group of groups.values()) {
    work.spend(group.length);
    if (
      group.reduce((sum, r) => sum + r.length, 0) <
      level.document.player.radius * 2
    )
      continue;
    const pairs = group.flatMap((run) => crossings(run, components));
    if (!pairs.length) continue;
    areas.push(group[0].areas);
    resources.push(mouthResource(pairs));
  }
  return { areas, resources };
}
interface LinkGroup {
  from: V3;
  to: V3;
  resource: Resource;
}
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
function enabledLinkGroups(
  level: CompiledArchitecture,
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
function authoredLinks(
  level: CompiledArchitecture,
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
/** Physical resource capacities between connected, floor-clipped sealed navigation components. */
export function physicalRouteEvidence(
  level: CompiledArchitecture,
  navigation: NavigationReport,
  signal?: AbortSignal,
  maximumWork = 8_000_000,
) {
  const work = new PhysicalRouteWork(maximumWork, signal);
  const components = physicalComponents(level, navigation, signal, work),
    mouths = entrances(level, components, work, signal);
  const resources = [
      ...mouths.resources,
      ...authoredLinks(level, components, work),
    ],
    areas = new Map(level.floors.map((f) => [f.region, f.area ?? f.region]));
  const markerComponent = (id: string) => {
    work.spend();
    const marker = level.document.markers.find((m) => m.id === id)!;
    return components.locate(
      marker.position,
      marker.region ? (areas.get(marker.region) ?? marker.region) : undefined,
      level.document.player.radius,
    );
  };
  return {
    entrances: mouths.areas,
    components: components.components,
    resources,
    routes: level.document.routes.map((route) => ({
      id: route.id,
      physicalDisjointRoutes: navigation.routes.find((r) => r.id === route.id)
        ?.reachable
        ? independentRoutes(
            resources,
            work,
            markerComponent(route.from),
            markerComponent(route.to),
          )
        : 0,
    })),
    method:
      "One capacity per contiguous native mouth or enabled authored traversal resource. Sealed navigation clipped to floor ownership establishes intra-area components, not triangle-edge capacities. Markers and mouths attach to actual components; coincident links share capacity and retain direction. Crossing samples and retaining only one disconnected crossing cluster per mouth can conservatively undercount; strict runtime validation remains required.",
  };
}
export type PhysicalRouteEvidence = ReturnType<typeof physicalRouteEvidence>;
export function requirePhysicalRoutes(
  level: CompiledArchitecture,
  evidence: PhysicalRouteEvidence,
) {
  const failures = level.document.routes.filter(
    (r) =>
      (evidence.routes.find((a) => a.id === r.id)?.physicalDisjointRoutes ??
        0) < r.minRoutes,
  );
  if (failures.length)
    throw new ProducerValidationError(
      "architecture",
      failures.map((r) => ({
        severity: "error",
        code: "PHYSICAL_ROUTE_REQUIREMENT",
        message: `${r.id}: conservative physical entrances cannot supply ${r.minRoutes} required routes.`,
        objects: [r.id],
      })),
    );
}
