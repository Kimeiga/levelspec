/**
 * Hard gates.
 *
 * A map fails the build for geometry defects, movement defects, or tactical
 * defects. Every finding carries a stable code and measured values so it can
 * be fed straight back to whatever authored the spec.
 */

import { DEFAULTS, type CompiledLevel, type Diagnostic, type Solid } from './types.ts';
import { boxCenter, boxMesh, brushContains, signedVolume, windingConsistent } from './mesh.ts';
import { key, lineCells, unkey } from './grid.ts';
import { bakeNavmesh, type NavmeshOptions, type NavmeshReport } from './navmesh.ts';

export interface GeometryReport {
  solids: number;
  triangles: number;
  /**
   * Coincident faces that share an outward normal direction — the z-fighting
   * class. Two boxes meeting back to back are fine; two boxes presenting the
   * same surface to the same viewer are not.
   */
  zfight_pairs: number;
  zfight_examples: [string, string][];
  /** Solids whose volumes genuinely overlap. */
  intersecting_pairs: number;
  intersecting_examples: [string, string][];
  /** Faces that touch cleanly back to back — reported for information only. */
  touching_pairs: number;
  /** Ids of every solid involved in a defect, so the viewer can paint them. */
  offender_ids: string[];
  degenerate: number;
  nonfinite: number;
  winding_ok: boolean;
  brush_tests_passed: number;
  brush_tests_total: number;
  runtime_ready: boolean;
}

const EPS = 1e-6;

function overlap1(a0: number, a1: number, b0: number, b1: number): number {
  return Math.min(a1, b1) - Math.max(a0, b0);
}

export function checkGeometry(solids: Solid[]): GeometryReport {
  const report: GeometryReport = {
    solids: solids.length,
    triangles: solids.length * 12,
    zfight_pairs: 0,
    zfight_examples: [],
    intersecting_pairs: 0,
    intersecting_examples: [],
    touching_pairs: 0,
    offender_ids: [],
    degenerate: 0,
    nonfinite: 0,
    winding_ok: true,
    brush_tests_passed: 0,
    brush_tests_total: solids.length,
    runtime_ready: false,
  };

  for (const s of solids) {
    for (let i = 0; i < 3; i++) {
      if (!Number.isFinite(s.box.min[i]) || !Number.isFinite(s.box.max[i])) report.nonfinite++;
      if (s.box.max[i] - s.box.min[i] <= EPS) {
        report.degenerate++;
        break;
      }
    }
    const mesh = boxMesh(s.box);
    if (!windingConsistent(mesh) || signedVolume(mesh) <= 0) report.winding_ok = false;
    if (brushContains(s.box, boxCenter(s.box))) report.brush_tests_passed++;
  }

  // Broad phase: bucket by a coarse grid so this stays usable at thousands of
  // solids without giving up exactness in the narrow phase.
  const CELL = 4;
  const buckets = new Map<string, number[]>();
  const bucketsOf = (i: number): string[] => {
    const b = solids[i].box;
    const out: string[] = [];
    for (let x = Math.floor(b.min[0] / CELL); x <= Math.floor(b.max[0] / CELL); x++)
      for (let y = Math.floor(b.min[1] / CELL); y <= Math.floor(b.max[1] / CELL); y++)
        for (let z = Math.floor(b.min[2] / CELL); z <= Math.floor(b.max[2] / CELL); z++)
          out.push(`${x},${y},${z}`);
    return out;
  };
  for (let i = 0; i < solids.length; i++) {
    for (const bk of bucketsOf(i)) {
      let arr = buckets.get(bk);
      if (!arr) buckets.set(bk, (arr = []));
      arr.push(i);
    }
  }

  const seen = new Set<number>();
  const offenders = new Set<string>();
  const pairId = (i: number, j: number): number => i * solids.length + j;
  // Faces nearer than this count as coincident. Z-fighting is caused by
  // near-coincidence, so "I nudged it by a millimetre" is not a fix.
  const TOL = 0.01;

  for (const arr of buckets.values()) {
    for (let ai = 0; ai < arr.length; ai++) {
      for (let bi = ai + 1; bi < arr.length; bi++) {
        const i = Math.min(arr[ai], arr[bi]);
        const j = Math.max(arr[ai], arr[bi]);
        const pid = pairId(i, j);
        if (seen.has(pid)) continue;
        seen.add(pid);
        const A = solids[i].box;
        const B = solids[j].box;
        const ov = [
          overlap1(A.min[0], A.max[0], B.min[0], B.max[0]),
          overlap1(A.min[1], A.max[1], B.min[1], B.max[1]),
          overlap1(A.min[2], A.max[2], B.min[2], B.max[2]),
        ];
        if (ov[0] < -TOL || ov[1] < -TOL || ov[2] < -TOL) continue;

        if (ov[0] > TOL && ov[1] > TOL && ov[2] > TOL) {
          report.intersecting_pairs++;
          offenders.add(solids[i].id).add(solids[j].id);
          if (report.intersecting_examples.length < 12)
            report.intersecting_examples.push([solids[i].id, solids[j].id]);
        }

        // Independently of overlap: do the two solids present a surface on the
        // same plane, facing the same way, over a shared area? That is the
        // z-fighting class, and it is what a screenshot cannot rule out.
        let zfight = false;
        let touching = false;
        for (let a = 0; a < 3 && !zfight; a++) {
          const o1 = ov[(a + 1) % 3];
          const o2 = ov[(a + 2) % 3];
          if (o1 <= TOL || o2 <= TOL) continue; // edge or corner contact only
          const sameMax = Math.abs(A.max[a] - B.max[a]) < TOL;
          const sameMin = Math.abs(A.min[a] - B.min[a]) < TOL;
          const backToBack =
            Math.abs(A.max[a] - B.min[a]) < TOL || Math.abs(A.min[a] - B.max[a]) < TOL;
          if (sameMax || sameMin) zfight = true;
          else if (backToBack) touching = true;
        }
        if (zfight) {
          report.zfight_pairs++;
          offenders.add(solids[i].id).add(solids[j].id);
          if (report.zfight_examples.length < 12)
            report.zfight_examples.push([solids[i].id, solids[j].id]);
        } else if (touching) {
          report.touching_pairs++;
        }
      }
    }
  }

  report.offender_ids = [...offenders];
  report.runtime_ready =
    report.zfight_pairs === 0 &&
    report.intersecting_pairs === 0 &&
    report.degenerate === 0 &&
    report.nonfinite === 0 &&
    report.winding_ok &&
    report.brush_tests_passed === report.brush_tests_total;
  return report;
}

// ---------------------------------------------------------------------------
// Movement and navigation
// ---------------------------------------------------------------------------

export interface RouteResult {
  id: string;
  from: string;
  to: string;
  reachable: boolean;
  distance: number;
  seconds: number;
  disjoint_routes: number;
  ok: boolean;
  note?: string;
}

export interface NavReport {
  nodes: number;
  edges: number;
  components: number;
  largest_component: number;
  unreachable_markers: string[];
  routes: RouteResult[];
  min_opening_width: number;
  headroom_ok: boolean;
  max_step: number;
  step_ok: boolean;
  /** Tread depth of the tightest staircase, in meters. */
  min_tread: number;
  shallowest_stair: string;
  /** Steepest rise-over-run across the flights, and which one. */
  max_gradient: number;
  steepest_stair: string;
}

function componentsOf(level: CompiledLevel): number[] {
  const comp = new Array(level.nav.nodes.length).fill(-1);
  let c = 0;
  for (let s = 0; s < comp.length; s++) {
    if (comp[s] !== -1) continue;
    const stack = [s];
    comp[s] = c;
    while (stack.length) {
      const n = stack.pop()!;
      for (const ei of level.nav.adjacency[n]) {
        const e = level.nav.edges[ei];
        const o = e.a === n ? e.b : e.a;
        if (comp[o] === -1) {
          comp[o] = c;
          stack.push(o);
        }
      }
    }
    c++;
  }
  return comp;
}

export function dijkstra(level: CompiledLevel, source: number): { dist: Float64Array; prev: Int32Array } {
  const n = level.nav.nodes.length;
  const dist = new Float64Array(n).fill(Infinity);
  const prev = new Int32Array(n).fill(-1);
  const visited = new Uint8Array(n);
  dist[source] = 0;
  // Binary heap keyed by distance.
  const heap: [number, number][] = [[0, source]];
  const push = (d: number, v: number): void => {
    heap.push([d, v]);
    let i = heap.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (heap[p][0] <= heap[i][0]) break;
      [heap[p], heap[i]] = [heap[i], heap[p]];
      i = p;
    }
  };
  const pop = (): [number, number] | undefined => {
    if (!heap.length) return undefined;
    const top = heap[0];
    const last = heap.pop()!;
    if (heap.length) {
      heap[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
        if (m === i) break;
        [heap[m], heap[i]] = [heap[i], heap[m]];
        i = m;
      }
    }
    return top;
  };
  for (;;) {
    const top = pop();
    if (!top) break;
    const [d, u] = top;
    if (visited[u]) continue;
    visited[u] = 1;
    if (d > dist[u]) continue;
    for (const ei of level.nav.adjacency[u]) {
      const e = level.nav.edges[ei];
      const v = e.a === u ? e.b : e.a;
      const nd = d + e.cost;
      if (nd < dist[v]) {
        dist[v] = nd;
        prev[v] = u;
        push(nd, v);
      }
    }
  }
  return { dist, prev };
}

/** Edge-disjoint route count via unit-capacity max flow (Edmonds–Karp). */
export function edgeDisjointRoutes(level: CompiledLevel, s: number, t: number, cap = 6): number {
  if (s === t) return 0;
  const n = level.nav.nodes.length;
  const head = new Int32Array(n).fill(-1);
  const to: number[] = [];
  const next: number[] = [];
  const capacity: number[] = [];
  const addEdge = (a: number, b: number): void => {
    to.push(b);
    capacity.push(1);
    next.push(head[a]);
    head[a] = to.length - 1;
    to.push(a);
    capacity.push(1); // undirected corridor: one unit each way
    next.push(head[b]);
    head[b] = to.length - 1;
  };
  for (const e of level.nav.edges) addEdge(e.a, e.b);

  let flow = 0;
  while (flow < cap) {
    const parentEdge = new Int32Array(n).fill(-1);
    const seen = new Uint8Array(n);
    seen[s] = 1;
    const q = [s];
    let found = false;
    for (let qi = 0; qi < q.length && !found; qi++) {
      const u = q[qi];
      for (let ei = head[u]; ei !== -1; ei = next[ei]) {
        if (capacity[ei] <= 0) continue;
        const v = to[ei];
        if (seen[v]) continue;
        seen[v] = 1;
        parentEdge[v] = ei;
        if (v === t) {
          found = true;
          break;
        }
        q.push(v);
      }
    }
    if (!found) break;
    let v = t;
    while (v !== s) {
      const ei = parentEdge[v];
      capacity[ei] -= 1;
      capacity[ei ^ 1] += 1;
      v = to[ei ^ 1];
    }
    flow++;
  }
  return flow;
}

export function checkNavigation(level: CompiledLevel): NavReport {
  const spec = level.spec;
  const player = spec.player ?? DEFAULTS.player;
  const speed = spec.gameplay?.move_speed ?? DEFAULTS.move_speed;
  const comp = componentsOf(level);
  const counts = new Map<number, number>();
  for (const c of comp) counts.set(c, (counts.get(c) ?? 0) + 1);

  const markerNode = new Map<string, number>();
  const unreachable: string[] = [];
  for (const mk of level.markers) {
    const id = level.nav.index.get(`${mk.layer}|${key(mk.cell[0], mk.cell[1])}`);
    if (id === undefined) unreachable.push(mk.id);
    else markerNode.set(mk.id, id);
  }

  const routes: RouteResult[] = [];
  for (const req of spec.gameplay?.required_routes ?? []) {
    const a = markerNode.get(req.from);
    const b = markerNode.get(req.to);
    if (a === undefined || b === undefined) {
      routes.push({
        id: req.id,
        from: req.from,
        to: req.to,
        reachable: false,
        distance: Infinity,
        seconds: Infinity,
        disjoint_routes: 0,
        ok: false,
        note: 'endpoint marker missing',
      });
      continue;
    }
    const { dist } = dijkstra(level, a);
    const d = dist[b];
    const reachable = Number.isFinite(d);
    const disjoint = reachable ? edgeDisjointRoutes(level, a, b, Math.max(2, req.min_routes ?? 2)) : 0;
    let ok = reachable;
    let note: string | undefined;
    if (reachable && req.min_distance !== undefined && d < req.min_distance) {
      ok = false;
      note = `shorter than min_distance (${d.toFixed(1)} < ${req.min_distance})`;
    }
    if (reachable && req.max_distance !== undefined && d > req.max_distance) {
      ok = false;
      note = `longer than max_distance (${d.toFixed(1)} > ${req.max_distance})`;
    }
    if (reachable && req.min_routes !== undefined && disjoint < req.min_routes) {
      ok = false;
      note = `only ${disjoint} edge-disjoint route(s), needs ${req.min_routes}`;
    }
    routes.push({
      id: req.id,
      from: req.from,
      to: req.to,
      reachable,
      distance: reachable ? d : Infinity,
      seconds: reachable ? d / speed : Infinity,
      disjoint_routes: disjoint,
      ok,
      note,
    });
  }

  let minOpening = Infinity;
  for (const b of level.boundaries)
    for (const o of b.openings) minOpening = Math.min(minOpening, o.t1 - o.t0);
  if (!Number.isFinite(minOpening)) minOpening = 0;

  const headroomOk = spec.layers.every((l) => l.height >= player.height + 0.1);
  let maxStep = 0;
  let minTread = Infinity;
  let shallowest = '';
  let maxGradient = 0;
  let steepest = '';
  for (const v of level.verticals) {
    if ((v.spec.kind !== 'stairs' && v.spec.kind !== 'ramp') || v.steps === 0) continue;
    maxStep = Math.max(maxStep, Math.abs(v.rise) / v.steps);
    if (v.tread < minTread) {
      minTread = v.tread;
      shallowest = v.spec.id;
    }
    if (v.gradient > maxGradient) {
      maxGradient = v.gradient;
      steepest = v.spec.id;
    }
  }
  if (!Number.isFinite(minTread)) minTread = 0;

  return {
    nodes: level.nav.nodes.length,
    edges: level.nav.edges.length,
    components: counts.size,
    largest_component: Math.max(0, ...counts.values()),
    unreachable_markers: unreachable,
    routes,
    min_opening_width: minOpening,
    headroom_ok: headroomOk,
    max_step: maxStep,
    step_ok: maxStep <= player.step + 1e-9,
    min_tread: minTread,
    shallowest_stair: shallowest,
    max_gradient: maxGradient,
    steepest_stair: steepest,
  };
}

// ---------------------------------------------------------------------------
// Tactical
// ---------------------------------------------------------------------------

export interface Sightline {
  from: [number, number];
  to: [number, number];
  layer: string;
  length: number;
}

export interface TacticalReport {
  longest_sightline: number;
  p95_sightline: number;
  median_sightline: number;
  samples: number;
  worst: Sightline[];
  spawn_los_violations: [string, string][];
  chokepoints: number;
  vertical_links: number;
  soft_walls: number;
  reinforcement_slots: number;
  hatches: number;
  rappel_surfaces: number;
}

/** Grid ray march using the same boundary records the geometry came from. */
export function traceBlocked(level: CompiledLevel, layer: string, a: [number, number], b: [number, number]): boolean {
  const cells = lineCells(a[0], a[1], b[0], b[1]);
  const occ = level.occupancy.get(layer);
  if (!occ) return true;
  const blockingCover = new Set<string>();
  for (const c of level.spec.covers ?? []) {
    if (c.layer !== layer || c.height < 1.6) continue;
    for (let x = c.rect[0]; x < c.rect[0] + c.rect[2]; x++)
      for (let y = c.rect[1]; y < c.rect[1] + c.rect[3]; y++) blockingCover.add(key(x, y));
  }
  for (let i = 1; i < cells.length; i++) {
    const [px, py] = cells[i - 1];
    const [cx, cy] = cells[i];
    if (!occ.has(key(cx, cy))) return true;
    if (blockingCover.has(key(cx, cy))) return true;
    const dx = cx - px;
    const dy = cy - py;
    let ek: string | null = null;
    if (dx === 1) ek = `V:${cx}:${cy}`;
    else if (dx === -1) ek = `V:${px}:${cy}`;
    else if (dy === 1) ek = `H:${cx}:${cy}`;
    else if (dy === -1) ek = `H:${cx}:${py}`;
    if (ek) {
      const e = level.edges.get(`${layer}|${ek}`);
      if (e && !e.open) return true;
    }
  }
  return false;
}

export function checkTactical(level: CompiledLevel, sampleTarget = 3000): TacticalReport {
  const g = level.spec.grid ?? DEFAULTS.grid;
  const lengths: number[] = [];
  const worst: Sightline[] = [];

  // Deterministic sampling: a fixed-stride walk over the occupied cells.
  for (const [layerId, occ] of level.occupancy) {
    const cells = [...occ.keys()].sort();
    if (cells.length < 2) continue;
    const budget = Math.max(200, Math.floor(sampleTarget / level.occupancy.size));
    const stride = Math.max(1, Math.floor((cells.length * cells.length) / budget / cells.length) || 1);
    for (let i = 0; i < cells.length; i += stride) {
      for (let j = i + 1; j < cells.length; j += Math.max(1, Math.floor(cells.length / 40))) {
        const a = unkey(cells[i]);
        const b = unkey(cells[j]);
        const d = Math.hypot(b[0] - a[0], b[1] - a[1]) * g;
        if (d < 4) continue;
        if (traceBlocked(level, layerId, a, b)) continue;
        lengths.push(d);
        worst.push({ from: a, to: b, layer: layerId, length: d });
      }
    }
  }
  lengths.sort((x, y) => x - y);
  worst.sort((x, y) => y.length - x.length);

  const spawnViolations: [string, string][] = [];
  const byId = new Map(level.markers.map((m) => [m.id, m]));
  for (const [x, y] of level.spec.gameplay?.no_spawn_los ?? []) {
    const A = byId.get(x);
    const B = byId.get(y);
    if (!A || !B) continue;
    if (A.layer !== B.layer) continue;
    if (!traceBlocked(level, A.layer, A.cell, B.cell)) spawnViolations.push([x, y]);
  }

  let chokepoints = 0;
  for (const b of level.boundaries)
    for (const o of b.openings) if (o.t1 - o.t0 <= 1.5 * g) chokepoints++;

  const roleCount = (r: string): number => level.solids.filter((s) => s.role === r).length;

  return {
    longest_sightline: lengths.length ? lengths[lengths.length - 1] : 0,
    p95_sightline: lengths.length ? lengths[Math.floor(lengths.length * 0.95)] : 0,
    median_sightline: lengths.length ? lengths[Math.floor(lengths.length * 0.5)] : 0,
    samples: lengths.length,
    worst: worst.slice(0, 8),
    spawn_los_violations: spawnViolations,
    chokepoints,
    vertical_links: level.verticals.length,
    soft_walls: roleCount('soft_panel'),
    reinforcement_slots: roleCount('reinforcement_slot'),
    hatches: roleCount('hatch'),
    rappel_surfaces: level.spec.layers.reduce(
      (a, l) => a + (l.portals ?? []).filter((p) => p.kind.startsWith('rappel')).length,
      0,
    ),
  };
}

// ---------------------------------------------------------------------------
// Roll-up
// ---------------------------------------------------------------------------

export interface ValidationReport {
  level: string;
  passed: boolean;
  geometry: GeometryReport;
  navigation: NavReport;
  tactical: TacticalReport;
  diagnostics: Diagnostic[];
}

export function validate(level: CompiledLevel): ValidationReport {
  const geometry = checkGeometry(level.solids);
  const navigation = checkNavigation(level);
  const tactical = checkTactical(level);
  const diagnostics = [...level.diagnostics];

  if (geometry.zfight_pairs > 0)
    diagnostics.push({
      severity: 'error',
      code: 'DUPLICATE_COPLANAR',
      objects: geometry.zfight_examples[0] ?? [],
      message: `${geometry.zfight_pairs} coplanar face pair(s) share an outward normal and will z-fight.`,
      measured: geometry.zfight_pairs,
      required: 0,
      suggestions: ['Give the shared boundary a single owner', 'Boolean-union the static shell'],
    });
  if (geometry.intersecting_pairs > 0) {
    const roleOf = new Map(level.solids.map((s) => [s.id, s.role]));
    const wallish = new Set(['static_hard', 'exterior_wall', 'soft_panel', 'reinforcement_slot', 'glass', 'lintel', 'sill']);
    const placed = new Set(['stair', 'ramp', 'ladder', 'cover', 'hatch']);
    for (const [a, b] of geometry.intersecting_examples) {
      const ra = roleOf.get(a);
      const rb = roleOf.get(b);
      if (!ra || !rb) continue;
      const hitsWall = (wallish.has(ra) && placed.has(rb)) || (wallish.has(rb) && placed.has(ra));
      if (!hitsWall) continue;
      const obj = placed.has(ra) ? a : b;
      diagnostics.push({
        severity: 'error',
        code: 'PLACED_SOLID_CLIPS_WALL',
        objects: [a, b],
        message: `"${obj}" runs into a wall. Placed solids must clear the wall band by half the wall thickness.`,
        suggestions: [
          'Move the stair, ramp or cover one cell clear of the boundary',
          'Shorten the run so it stops before the wall plane',
        ],
      });
    }
    diagnostics.push({
      severity: 'error',
      code: 'INTERSECTING_VOLUMES',
      objects: geometry.intersecting_examples[0] ?? [],
      message: `${geometry.intersecting_pairs} solid pair(s) occupy the same volume.`,
      measured: geometry.intersecting_pairs,
      required: 0,
    });
  }
  if (!geometry.winding_ok)
    diagnostics.push({
      severity: 'error',
      code: 'BAD_WINDING',
      objects: [],
      message: 'At least one solid has inconsistent or inward winding.',
    });
  /*
   * The remaining runtime-readiness counters, each as its own hard error.
   *
   * These used to be reported and not gated. `checkGeometry` computed
   * `runtime_ready` from six conditions and `validate` raised errors for
   * three of them, so a level with a solid of zero thickness, or a NaN in a
   * corner, or a brush whose planes did not contain their own centre, could
   * come back `passed: true` while the report next to it said the geometry
   * was not fit to run. A gate that a build can pass while its own evidence
   * says otherwise is not a gate.
   */
  if (geometry.nonfinite > 0)
    diagnostics.push({
      severity: 'error',
      code: 'NONFINITE_GEOMETRY',
      objects: geometry.offender_ids.slice(0, 4),
      message: `${geometry.nonfinite} solid bound(s) are NaN or Infinity.`,
      measured: geometry.nonfinite,
      required: 0,
      suggestions: ['Check for a division by a zero-length run', 'Check for an unresolved height'],
    });
  if (geometry.degenerate > 0)
    diagnostics.push({
      severity: 'error',
      code: 'DEGENERATE_SOLID',
      objects: geometry.offender_ids.slice(0, 4),
      message: `${geometry.degenerate} solid(s) have no thickness on at least one axis.`,
      measured: geometry.degenerate,
      required: 0,
      suggestions: ['Give the run a non-zero span', 'Drop the solid rather than emitting a sliver'],
    });
  if (geometry.brush_tests_passed !== geometry.brush_tests_total)
    diagnostics.push({
      severity: 'error',
      code: 'BRUSH_NOT_CONVEX',
      objects: geometry.offender_ids.slice(0, 4),
      message:
        `${geometry.brush_tests_total - geometry.brush_tests_passed} solid(s) have half-spaces ` +
        'that do not contain their own centre.',
      measured: geometry.brush_tests_passed,
      required: geometry.brush_tests_total,
    });
  if (navigation.components > 1)
    diagnostics.push({
      severity: 'error',
      code: 'NAV_DISCONNECTED',
      objects: [],
      message: `Navigation graph has ${navigation.components} components; the map is not one connected space.`,
      measured: navigation.components,
      required: 1,
      suggestions: ['Add a portal between the isolated spaces', 'Add a stair or hatch to the island'],
    });
  for (const m of navigation.unreachable_markers)
    diagnostics.push({
      severity: 'error',
      code: 'MARKER_UNREACHABLE',
      objects: [m],
      message: `Gameplay marker "${m}" has no navigation node.`,
    });
  for (const r of navigation.routes)
    if (!r.ok)
      diagnostics.push({
        severity: 'error',
        code: r.reachable ? 'ROUTE_CONSTRAINT' : 'ROUTE_UNREACHABLE',
        objects: [r.id, r.from, r.to],
        message: r.reachable
          ? `Route "${r.id}" fails its constraint: ${r.note}.`
          : `Route "${r.id}" is unreachable.`,
        measured: r.distance,
      });
  if (!navigation.step_ok)
    diagnostics.push({
      severity: 'error',
      code: 'STEP_TOO_HIGH',
      objects: [],
      message: `A staircase rises ${navigation.max_step.toFixed(2)} m per step.`,
      measured: navigation.max_step,
      required: (level.spec.player ?? DEFAULTS.player).step,
    });
  // A flight compiled as a ramp has no meaningful tread depth, so the gate is
  // the gradient: rise over run is what decides whether it can be walked.
  if (navigation.max_gradient > 0.9)
    diagnostics.push({
      severity: 'error',
      code: 'SLOPE_TOO_STEEP',
      objects: [navigation.steepest_stair],
      message:
        `Flight "${navigation.steepest_stair}" climbs at ${navigation.max_gradient.toFixed(2)}:1 ` +
        `(${((Math.atan(navigation.max_gradient) * 180) / Math.PI).toFixed(0)}°); it has no room to run.`,
      measured: Number(navigation.max_gradient.toFixed(3)),
      required: 0.9,
      suggestions: [
        'Give the run more cells between from_cell and to_cell',
        'Split it into two flights with a landing',
      ],
    });
  if (!navigation.headroom_ok)
    diagnostics.push({
      severity: 'error',
      code: 'HEADROOM',
      objects: [],
      message: 'A layer is shorter than the player capsule.',
    });
  const minWidth = (level.spec.player ?? DEFAULTS.player).radius * 2;
  if (navigation.min_opening_width > 0 && navigation.min_opening_width < minWidth)
    diagnostics.push({
      severity: 'error',
      code: 'CAPSULE_CLEARANCE',
      objects: [],
      message: `Narrowest opening is ${navigation.min_opening_width.toFixed(2)} m.`,
      measured: navigation.min_opening_width,
      required: minWidth,
    });
  for (const [a, b] of tactical.spawn_los_violations)
    diagnostics.push({
      severity: 'error',
      code: 'SPAWN_LOS',
      objects: [a, b],
      message: `Markers "${a}" and "${b}" can see each other from spawn.`,
      suggestions: ['Insert a sightline blocker', 'Offset one spawn', 'Rotate the approach'],
    });

  const passed = !diagnostics.some((d) => d.severity === 'error');
  /*
   * Belt and braces, deliberately.
   *
   * Every readiness counter above has its own diagnostic, so this should never
   * fire. It exists because the two ways of deciding whether a level is fit to
   * ship — the report and the diagnostics — drifted apart once already, and a
   * disagreement between them should be a loud failure rather than a quiet
   * pass.
   */
  if (passed && !geometry.runtime_ready) {
    diagnostics.push({
      severity: 'error',
      code: 'GEOMETRY_NOT_RUNTIME_READY',
      objects: geometry.offender_ids.slice(0, 4),
      message: 'Geometry failed a runtime-readiness gate that raised no diagnostic of its own.',
    });
    return { level: level.spec.id, passed: false, geometry, navigation, tactical, diagnostics };
  }
  return { level: level.spec.id, passed, geometry, navigation, tactical, diagnostics };
}

// ---------------------------------------------------------------------------
// The gate a build should actually use
// ---------------------------------------------------------------------------

export interface RuntimeValidationOptions {
  /** Passed through to both bakes. */
  navmesh?: NavmeshOptions;
  /**
   * Skip the sealed bake. It doubles the cost and only says something on a
   * level that has dynamic solids to seal.
   */
  skipSealed?: boolean;
  /** Warn above this many solids. Zero disables the check. */
  solidBudget?: number;
}

export interface RuntimeValidationReport extends ValidationReport {
  /** Barricades down, hatches open: can every space be reached in principle? */
  breached: NavmeshReport;
  /** Barricades up: what can be reached before anything is broken. */
  sealed: NavmeshReport | null;
}

/**
 * Structural validation and the physical bake, together, as one answer.
 *
 * `validate` checks the geometry and the *spec-derived* navigation graph —
 * the one the compiler built out of occupancy and portal records. That graph
 * and the geometry come from the same source and can only ever agree with
 * each other. `bakeNavmesh` derives reachability from the compiled solids
 * without looking at the spec at all, which is the only check that can catch
 * a stair landing inside a wall or a doorway whose lintel is too low.
 *
 * Both were available and it was up to each caller to remember to run the
 * second one, which is not a gate, it is a suggestion. This is the gate: a
 * function whose name says runtime, that fails when the level is not fit for
 * one.
 *
 * The two dynamic states are separated on purpose. Breached — barricades
 * down, hatches open — answers "is any space unreachable in principle", and
 * that is the hard failure. Sealed answers "what can be reached before
 * anything is broken", which is a design question rather than a defect: a
 * level where the front door is boarded is a level, and one where a room is
 * behind a wall nobody can break is not.
 */
export function validateForRuntime(
  level: CompiledLevel,
  opts: RuntimeValidationOptions = {},
): RuntimeValidationReport {
  const base = validate(level);
  const diagnostics = [...base.diagnostics];

  const breached = bakeNavmesh(level, { ...opts.navmesh, includeDynamic: false });
  const hasDynamic = level.solids.some((s) => s.dynamic);
  const sealed =
    opts.skipSealed || !hasDynamic
      ? null
      : bakeNavmesh(level, { ...opts.navmesh, includeDynamic: true });

  if (breached.playable_islands > 0)
    diagnostics.push({
      severity: 'error',
      code: 'NAVMESH_ISLAND',
      objects: breached.islands.filter((i) => i.kind === 'playable').flatMap((i) => i.spaces).slice(0, 4),
      message:
        `${breached.playable_islands} patch(es) of declared floor are cut off from spawn in the ` +
        'compiled geometry, whatever the spec graph says.',
      measured: breached.playable_islands,
      required: 0,
      suggestions: ['Check the stair lands where the plan says', 'Check the opening is wide enough for the capsule'],
    });
  for (const space of breached.unreachable_spaces.slice(0, 6))
    diagnostics.push({
      severity: 'error',
      code: 'NAVMESH_SPACE_UNREACHABLE',
      objects: [space],
      message: `Space "${space}" cannot be walked to from any spawn.`,
    });
  for (const m of breached.unreachable_markers.slice(0, 6))
    diagnostics.push({
      severity: 'error',
      code: 'NAVMESH_MARKER_UNREACHABLE',
      objects: [m],
      message: `Marker "${m}" is not standing on walkable floor.`,
    });
  if (breached.void_edges > 0)
    diagnostics.push({
      severity: 'error',
      code: 'NAVMESH_VOID_EDGE',
      objects: [],
      message:
        `${breached.void_edges} reachable place(s) have nothing at all in the next column: ` +
        'step that way and you leave the world.',
      measured: breached.void_edges,
      required: 0,
      suggestions: ['Seal the face of the elevation change', 'Add a parapet along the open edge'],
    });

  /*
   * What breaching buys you.
   *
   * Reported rather than failed: a space you can only reach by taking a wall
   * down is a design, and often the point. What matters is that it is said out
   * loud, because the alternative — baking with every dynamic solid removed
   * and never mentioning it — is what lets an enemy path through an intact
   * panel and appear in a room it has no way into.
   */
  if (sealed) {
    const behind = breached.space_coverage
      .filter((c) => c.fraction > 0.2)
      .map((c) => c.space)
      .filter((space) => sealed.unreachable_spaces.includes(space));
    if (behind.length)
      diagnostics.push({
        severity: 'info',
        code: 'SEALED_BEHIND_BREACH',
        objects: behind.slice(0, 6),
        message: `${behind.length} space(s) can only be reached by breaching: ${behind.slice(0, 4).join(', ')}.`,
      });
  }

  const budget = opts.solidBudget ?? 0;
  if (budget > 0 && level.solids.length > budget)
    diagnostics.push({
      severity: 'warning',
      code: 'SOLID_BUDGET',
      objects: [],
      message: `${level.solids.length} solids, over a budget of ${budget}.`,
      measured: level.solids.length,
      required: budget,
    });

  const passed = !diagnostics.some((d) => d.severity === 'error');
  return { ...base, passed, diagnostics, breached, sealed };
}
