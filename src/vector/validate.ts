import { collisionMesh } from "./collision.ts";
import {
  init,
  NavMeshQuery,
  getNavMeshPositionsAndIndices,
  freeHeightfield,
  freeCompactHeightfield,
  freeContourSet,
  freePolyMesh,
  freePolyMeshDetail,
} from "recast-navigation";
import { generateSoloNavMesh } from "recast-navigation/generators";
import {
  aborted,
  type CompiledLevel,
  type Diagnostic,
  type NavigationReport,
  type NavigationOptions,
  type ValidationReport,
  type V3,
} from "./types.ts";
import { cross, sub, heightAt, dot, hash } from "./geometry.ts";
import { auditNavigationCoverage } from "./navigation-coverage.ts";
let initialized: Promise<void> | undefined;
const NAVIGATION_REVISION = 5;
const up = (p: V3) => ({ x: p[0], y: p[2], z: -p[1] });
const down = (p: { x: number; y: number; z: number }): V3 => [p.x, -p.z, p.y];
function disjoint(
  nodes: string[],
  edges: [string, string][],
  from: string,
  to: string,
): number {
  if (from === to) return 1;
  const capacity = new Map<string, Map<string, number>>();
  for (const n of nodes) capacity.set(n, new Map());
  for (const [a, b] of edges) {
    capacity.get(a)?.set(b, (capacity.get(a)?.get(b) ?? 0) + 1);
    capacity.get(b)?.set(a, (capacity.get(b)?.get(a) ?? 0) + 1);
  }
  let flow = 0;
  for (;;) {
    const parent = new Map<string, string>(),
      q = [from];
    parent.set(from, from);
    for (let i = 0; i < q.length && !parent.has(to); i++)
      for (const [v, c] of capacity.get(q[i]) ?? [])
        if (c > 0 && !parent.has(v)) {
          parent.set(v, q[i]);
          q.push(v);
        }
    if (!parent.has(to)) break;
    for (let v = to; v !== from;) {
      const u = parent.get(v)!;
      capacity.get(u)!.set(v, capacity.get(u)!.get(v)! - 1);
      capacity.get(v)!.set(u, (capacity.get(v)!.get(u) ?? 0) + 1);
      v = u;
    }
    flow++;
  }
  return flow;
}
export function rayBlocked(
  level: CompiledLevel,
  a: V3,
  b: V3,
  sealed = false,
): boolean {
  const dir = sub(b, a),
    m = level.mesh;
  for (let t = 0; t < m.surfaces.length; t++) {
    const surface = level.surfaces[m.surfaces[t]];
    if (surface.collidable === false || (!sealed && surface.dynamic)) continue;
    const [A, B, C] = m.indices
        .slice(t * 3, t * 3 + 3)
        .map((i) => m.positions.slice(i * 3, i * 3 + 3) as V3),
      e1 = sub(B, A),
      e2 = sub(C, A),
      p = cross(dir, e2),
      det = dot(e1, p);
    if (Math.abs(det) < 1e-10) continue;
    const T = sub(a, A),
      u = dot(T, p) / det;
    if (u < 0 || u > 1) continue;
    const q = cross(T, e1),
      v = dot(dir, q) / det;
    if (v < 0 || u + v > 1) continue;
    const distance = dot(e2, q) / det;
    if (distance > 1e-5 && distance < 1 - 1e-5) return true;
  }
  return false;
}
function sourceDiagnostic(
  level: CompiledLevel,
  code: string,
  message: string,
  objects: string[] = [],
  severity: "error" | "warning" = "error",
): Diagnostic {
  const sources = [
      ...level.document.layers.flatMap((l) => [
        ...l.regions,
        ...l.edges,
        ...l.vertices,
      ]),
      ...level.document.markers,
      ...level.document.routes,
      ...level.document.links,
    ],
    areaRegions = new Set(
      level.floors
        .filter((f) => objects.includes(f.area ?? f.region))
        .map((f) => f.region),
    );
  return {
    severity,
    code,
    message,
    objects,
    source:
      sources.find((o) => objects.includes(o.id))?.source ??
      sources.find((o) => areaRegions.has(o.id))?.source,
  };
}

/** One formatter serves automatic compilation, cached reports and runtime validation. */
function navigationDiagnostics(
  level: CompiledLevel,
  navigation: NavigationReport,
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [],
    add = (
      code: string,
      message: string,
      objects: string[] = [],
      severity: "error" | "warning" = "error",
    ) =>
      diagnostics.push(
        sourceDiagnostic(level, code, message, objects, severity),
      );
  for (const id of navigation.unreachableRegions)
    add(
      "NAV_DISCONNECTED",
      "Declared playable floor is missing from navigation or contains unreachable areas.",
      [id],
    );
  for (const id of navigation.unreachableMarkers)
    add("MARKER_UNREACHABLE", "Marker is outside reachable navigation.", [id]);
  for (const row of navigation.coverage.regions)
    for (const [reason, count] of Object.entries(row.reasons)) {
      const code: Record<string, string> = {
        headroom: "NAV_HEADROOM",
        width: "NAV_WIDTH",
        slope: "NAV_SLOPE",
        step: "NAV_STEP",
        disconnected: "NAV_DISCONNECTED",
        uncovered: "NAV_UNCOVERED",
      };
      add(
        code[reason],
        `${count} floor samples fail ${reason} clearance or navigation for the ${navigation.settings.player.height} m tall, ${2 * navigation.settings.player.radius} m diameter agent.`,
        [row.region],
      );
    }
  if (!level.document.markers.some((m) => m.kind.includes("spawn")))
    add(
      "NO_SPAWN",
      "No spawn declared; connectivity is measured from the first navigable floor.",
      [],
      "warning",
    );
  for (const r of level.document.routes) {
    const actual = navigation.routes.find((x) => x.id === r.id);
    if (
      !actual?.reachable ||
      actual.disjointRoutes < r.minRoutes ||
      (r.minDistance !== undefined && actual.distance < r.minDistance) ||
      (r.maxDistance !== undefined && actual.distance > r.maxDistance)
    )
      add(
        "ROUTE_REQUIREMENT",
        `Route ${r.id} does not meet its reachability, distance, or disjoint-route requirements.`,
        [r.id],
      );
  }
  return diagnostics;
}

export async function bakeNavmesh(
  level: CompiledLevel,
  options: NavigationOptions = {},
): Promise<NavigationReport> {
  aborted(options.signal);
  const cell = options.cell ?? 0.125,
    ch = options.cellHeight ?? 0.05,
    spacing = options.sampleSpacing ?? 0.5,
    p = level.document.player;
  for (const [name, value] of Object.entries({
    cell,
    cellHeight: ch,
    sampleSpacing: spacing,
    height: p.height,
    radius: p.radius,
  }))
    if (!Number.isFinite(value) || value <= 0)
      throw new Error(`Navigation ${name} must be finite and positive.`);
  const cacheKey = await hash({
    revision: NAVIGATION_REVISION,
    geometryHash: level.geometryHash,
    player: p,
    cell,
    ch,
    spacing,
    sealed: !!options.sealed,
    markers: level.document.markers.map(
      ({ id, layer, region, position, kind }) => ({
        id,
        layer,
        region,
        position,
        kind,
      }),
    ),
    routes: level.document.routes.map(
      ({ id, from, to, minRoutes, minDistance, maxDistance }) => ({
        id,
        from,
        to,
        minRoutes,
        minDistance,
        maxDistance,
      }),
    ),
    links: level.document.links.map(
      ({ id, from, to, kind, bidirectional, ability }) => ({
        id,
        from,
        to,
        kind,
        bidirectional,
        ability,
      }),
    ),
    semantic: level.semantic,
    floors: level.floors.map(({ area, region, layer }) => ({
      area,
      region,
      layer,
    })),
  });
  aborted(options.signal);
  if (level.navigation?.settings.cacheKey === cacheKey) {
    // Source offsets can change without changing geometry or navigation settings.
    level.navigation.diagnostics = navigationDiagnostics(
      level,
      level.navigation,
    );
    return level.navigation;
  }
  await (initialized ??= init());
  aborted(options.signal);
  const m = collisionMesh(level, !!options.sealed),
    positions: number[] = [],
    indices = [...m.indices];
  for (let i = 0; i < m.positions.length; i += 3)
    positions.push(m.positions[i], m.positions[i + 2], -m.positions[i + 1]);

  const failed: NavigationReport = {
    diagnostics: [],
    settings: {
      revision: NAVIGATION_REVISION,
      geometryHash: level.geometryHash,
      cacheKey,
      player: { ...p },
      sealed: !!options.sealed,
      cell,
      cellHeight: ch,
      sampleSpacing: spacing,
    },
    coverage: {
      sampleSpacing: spacing,
      sampled: 0,
      covered: 0,
      excluded: 0,
      uncoveredCount: 0,
      uncovered: [],
      regions: [],
    },
    passed: false,
    components: 0,
    reachableRegions: [],
    unreachableRegions: [
      ...new Set(level.floors.map((f) => f.area ?? f.region)),
    ],
    unreachableMarkers: level.document.markers.map((m) => m.id),
    positions: [],
    indices: [],
    routes: level.document.routes.map((r) => ({
      id: r.id,
      reachable: false,
      distance: Infinity,
      disjointRoutes: 0,
    })),
  };
  if (!indices.length || !level.floors.length) {
    failed.passed =
      !level.floors.length &&
      !level.document.markers.length &&
      !level.document.routes.length;
    failed.diagnostics = navigationDiagnostics(level, failed);
    if (!options.sealed) level.navigation = failed;
    return failed;
  }
  const result = generateSoloNavMesh(
    positions,
    indices,
    {
      cs: cell,
      ch,
      walkableSlopeAngle: p.slope,
      walkableHeight: Math.ceil(p.height / ch),
      walkableClimb: Math.floor(p.step / ch),
      walkableRadius: Math.ceil(p.radius / cell),
      minRegionArea: 0,
      mergeRegionArea: 0,
      maxSimplificationError: 0.5,
      detailSampleDist: 6,
      detailSampleMaxError: 1,
      offMeshConnections: level.document.links
        .filter((l) => (l.ability ? (p as any)[l.ability] === true : false))
        .map((l, i) => ({
          startPosition: up(l.from),
          endPosition: up(l.to),
          radius: p.radius,
          bidirectional: l.bidirectional,
          userId: i + 1,
        })),
    },
    true,
  );
  const intermediates = result.intermediates,
    empty = intermediates.polyMesh?.npolys() === 0;
  if (intermediates.heightfield) freeHeightfield(intermediates.heightfield);
  if (intermediates.compactHeightfield)
    freeCompactHeightfield(intermediates.compactHeightfield);
  if (intermediates.contourSet) freeContourSet(intermediates.contourSet);
  if (intermediates.polyMesh) freePolyMesh(intermediates.polyMesh);
  if (intermediates.polyMeshDetail)
    freePolyMeshDetail(intermediates.polyMeshDetail);
  if (!result.success) {
    if (!empty) throw new Error(`Navigation bake failed: ${result.error}`);
    failed.coverage = auditNavigationCoverage(level, options, () => undefined);
    failed.diagnostics = navigationDiagnostics(level, failed);
    if (!options.sealed) level.navigation = failed;
    return failed;
  }
  const query = new NavMeshQuery(result.navMesh, { maxNodes: 32768 });
  try {
    const [np, ni] = getNavMeshPositionsAndIndices(result.navMesh),
      canonical: number[] = [];
    for (let i = 0; i < np.length; i += 3)
      canonical.push(np[i], -np[i + 2], np[i + 1]);
    const samples = new Map<string, V3[]>();
    for (const f of level.floors) samples.set(f.area ?? f.region, []);
    for (let i = 0; i < ni.length; i += 3) {
      const at: V3 = [0, 0, 0];
      for (let k = 0; k < 3; k++)
        for (let axis = 0; axis < 3; axis++)
          at[axis] += canonical[ni[i + k] * 3 + axis] / 3;
      for (const f of level.floors) {
        const h = heightAt(f, at[0], at[1]);
        if (h !== undefined && Math.abs(h - at[2]) <= Math.max(0.22, ch * 3)) {
          samples.get(f.area ?? f.region)!.push(at);
          break;
        }
      }
    }
    const near = (
      at: V3,
      horizontal = Math.max(cell, p.radius),
      vertical = 0.25,
    ) => {
      const r = query.findNearestPoly(up(at), {
        halfExtents: {
          x: horizontal,
          y: vertical,
          z: horizontal,
        },
      });
      return r.success &&
        r.nearestRef &&
        Math.hypot(r.nearestPoint.x - at[0], r.nearestPoint.z + at[1]) <=
          horizontal &&
        Math.abs(r.nearestPoint.y - at[2]) <= vertical
        ? { ...r.nearestPoint, ref: r.nearestRef }
        : undefined;
    };
    const path = (a: V3, b: V3) => {
      const A = near(a),
        B = near(b);
      if (!A || !B) return undefined;
      const result = query.computePath(A, B, {
        maxPathPolys: 32768,
        maxStraightPathPoints: 32768,
        halfExtents: { x: cell * 2, y: 0.25, z: cell * 2 },
      });
      const end = result.path.at(-1);
      if (
        !result.success ||
        !end ||
        Math.hypot(end.x - B.x, end.y - B.y, end.z - B.z) > cell * 2
      )
        return undefined;
      return result.path;
    };
    const declaredSeeds = level.document.markers
      .filter((m) => m.kind.includes("spawn"))
      .map((m) => m.position);
    const seeds = declaredSeeds.length
      ? declaredSeeds
      : ([[...samples.values()].find((a) => a.length)?.[0]].filter(
          Boolean,
        ) as V3[]);
    const reachablePolys = new Map<number, boolean>();
    const reaches = (v: V3) => {
        const nav = near(v);
        if (!nav) return false;
        if (!reachablePolys.has(nav.ref))
          reachablePolys.set(
            nav.ref,
            seeds.some((s) => path(s, v) !== undefined),
          );
        return reachablePolys.get(nav.ref)!;
      },
      reachableRegions: string[] = [],
      unreachableRegions: string[] = [],
      representatives: V3[] = [];
    for (const [id, ss] of samples) {
      aborted(options.signal);
      let okay = ss.length > 0;
      for (const v of ss) {
        if (!representatives.some((r) => path(r, v))) representatives.push(v);
        if (!reaches(v)) okay = false;
      }
      (okay ? reachableRegions : unreachableRegions).push(id);
    }
    const unreachableMarkers = level.document.markers
      .filter((m) => !reaches(m.position))
      .map((m) => m.id);
    const markerRegion = (id: string) => {
      const marker = level.document.markers.find((m) => m.id === id);
      const floor = level.floors.find(
        (f) =>
          marker &&
          f.layer === marker.layer &&
          Math.abs(
            (heightAt(f, marker.position[0], marker.position[1]) ?? Infinity) -
              marker.position[2],
          ) <=
            ch * 3,
      );
      return marker?.region ?? floor?.area ?? floor?.region;
    };
    const routes = level.document.routes.map((r) => {
      const a = level.document.markers.find((m) => m.id === r.from),
        b = level.document.markers.find((m) => m.id === r.to),
        walk = a && b ? path(a.position, b.position) : undefined;
      const distance = walk
        ? walk
            .slice(1)
            .reduce(
              (s, v, i) =>
                s +
                Math.hypot(v.x - walk[i].x, v.y - walk[i].y, v.z - walk[i].z),
              0,
            )
        : Infinity;
      return {
        id: r.id,
        reachable: !!walk,
        distance,
        disjointRoutes: walk
          ? disjoint(
              level.semantic.nodes,
              level.semantic.edges,
              markerRegion(r.from) ?? "",
              markerRegion(r.to) ?? "",
            )
          : 0,
      };
    });
    const coverage = auditNavigationCoverage(
      level,
      { ...options, cell, cellHeight: ch, sampleSpacing: spacing },
      (at, distance) => {
        // Recast smooths steps and nearby slopes into a continuous walking surface.
        // The configured climb plus one voxel bounds that approximation; independent
        // solid/headroom checks prevent a nearby upper floor from hiding an obstruction.
        const nav = near(at, distance, Math.max(0.25, p.step + ch));
        if (!nav) return undefined;
        const position = down(nav);
        return { position, reachable: reaches(position) };
      },
    );
    // Tiny nav polygons beside walls can survive rasterization while lying entirely
    // in the normal capsule margin. Only independently required floor samples should
    // make an authored area unreachable; raw nav centroids are insufficient.
    const areas = new Map<
      string,
      { covered: number; uncovered: number; disconnected: number }
    >();
    for (const row of coverage.regions) {
      const area =
          level.floors.find((f) => f.region === row.region)?.area ?? row.region,
        counts = areas.get(area) ?? {
          covered: 0,
          uncovered: 0,
          disconnected: 0,
        };
      counts.covered += row.covered;
      counts.uncovered += row.uncovered;
      counts.disconnected += row.reasons.disconnected ?? 0;
      areas.set(area, counts);
    }
    reachableRegions.length = 0;
    unreachableRegions.length = 0;
    for (const [area, counts] of areas)
      (counts.disconnected || !counts.covered
        ? unreachableRegions
        : reachableRegions
      ).push(area);
    const report: NavigationReport = {
      diagnostics: [],
      settings: failed.settings,
      coverage,
      passed:
        unreachableRegions.length === 0 &&
        unreachableMarkers.length === 0 &&
        coverage.uncoveredCount === 0 &&
        routes.every((actual, i) => {
          const r = level.document.routes[i];
          return (
            actual.reachable &&
            actual.disjointRoutes >= r.minRoutes &&
            (r.minDistance === undefined || actual.distance >= r.minDistance) &&
            (r.maxDistance === undefined || actual.distance <= r.maxDistance)
          );
        }),
      components: representatives.length,
      reachableRegions,
      unreachableRegions,
      unreachableMarkers,
      positions: canonical,
      indices: ni,
      routes,
    };
    aborted(options.signal);
    report.diagnostics = navigationDiagnostics(level, report);
    if (!options.sealed) level.navigation = report;
    return report;
  } finally {
    query.destroy();
    result.navMesh.destroy();
  }
}
export async function validateForRuntime(
  level: CompiledLevel,
  options: NavigationOptions = {},
): Promise<ValidationReport> {
  const diagnostics = [...level.diagnostics],
    add = (
      code: string,
      message: string,
      objects: string[] = [],
      severity: "error" | "warning" = "error",
    ) =>
      diagnostics.push(
        sourceDiagnostic(level, code, message, objects, severity),
      );
  if (!level.mesh.indices.length)
    add("EMPTY_GEOMETRY", "No geometry was produced.");
  for (let t = 0; t < level.mesh.indices.length; t += 3) {
    const p = level.mesh.indices
      .slice(t, t + 3)
      .map((i) => level.mesh.positions.slice(i * 3, i * 3 + 3) as V3);
    if (
      p.flat().some((v) => !Number.isFinite(v)) ||
      Math.hypot(...cross(sub(p[1], p[0]), sub(p[2], p[0]))) < 1e-10
    ) {
      add("INVALID_TRIANGLE", "Nonfinite or degenerate triangle.");
      break;
    }
  }
  if (diagnostics.some((d) => d.severity === "error"))
    return { passed: false, diagnostics };
  for (const f of level.floors)
    for (const t of f.triangles) {
      const [a, b, c] = t.map((i) => f.points[i]),
        n = cross(sub(b, a), sub(c, a)),
        slope =
          (Math.atan2(Math.hypot(n[0], n[1]), Math.abs(n[2])) * 180) / Math.PI;
      if (slope > level.document.player.slope + 0.1) {
        add(
          "SLOPE_TOO_STEEP",
          `Floor slope ${slope.toFixed(1)}° exceeds ${level.document.player.slope}°.`,
          [f.region],
        );
        break;
      }
    }
  let navigation: NavigationReport;
  try {
    navigation = await bakeNavmesh(level, { ...options, sealed: false });
  } catch (error) {
    if ((error as Error).name === "AbortError") throw error;
    add("NAV_BAKE", (error as Error).message);
    return { passed: false, diagnostics };
  }
  diagnostics.push(...navigation.diagnostics);
  for (const [a, b] of level.document.noSpawnLos) {
    const A = level.document.markers.find((m) => m.id === a),
      B = level.document.markers.find((m) => m.id === b);
    if (!A || !B)
      add("MARKER_REFERENCE", "Unknown no-spawn-los marker.", [a, b]);
    else if (
      !rayBlocked(
        level,
        [
          A.position[0],
          A.position[1],
          A.position[2] + level.document.player.height * 0.9,
        ],
        [
          B.position[0],
          B.position[1],
          B.position[2] + level.document.player.height * 0.9,
        ],
      )
    )
      add("SPAWN_LOS", "Protected spawn markers can see each other.", [a, b]);
  }
  const sealed =
    options.sealed && level.surfaces.some((s) => s.dynamic)
      ? await bakeNavmesh(level, { ...options, sealed: true })
      : undefined;
  return {
    passed: !diagnostics.some((d) => d.severity === "error"),
    diagnostics,
    navigation,
    sealed,
  };
}
