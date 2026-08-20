/**
 * Navmesh bake, derived from the compiled geometry.
 *
 * The navigation graph in `compiler.ts` is built from the spec: occupied cells,
 * boundary records, portal openings. This module does not look at the spec at
 * all. It voxelises the solids the player actually collides with, finds the
 * surfaces an agent of a given radius and height can stand on, and connects
 * them by walking and stepping.
 *
 * That independence is the point. If the spec says two rooms are connected and
 * the geometry disagrees — a stair that lands in a wall, a doorway whose lintel
 * is too low, a hole with nothing under it — the two derivations diverge and
 * this one reports it. A single derivation can only ever agree with itself.
 */

import { DEFAULTS, type CompiledLevel } from './types.ts';

export interface NavmeshOptions {
  /** Horizontal sample spacing, in meters. */
  cell?: number;
  agentHeight?: number;
  agentRadius?: number;
  maxStep?: number;
  /**
   * Bake against the sealed level — barricades up, hatches closed, soft walls
   * intact. Defaults to false, i.e. the breached state, because that is the
   * one that answers "is any space unreachable in principle". A level where
   * the front door is boarded is not a broken level; a level with a room no
   * amount of breaching can reach is.
   */
  includeDynamic?: boolean;
  /** Also return the sample positions, so the bake can be drawn. */
  keepSamples?: boolean;
  /** Also return the connectivity, so agents can path on it. */
  keepGraph?: boolean;
}

/**
 * The baked mesh as something you can walk an agent along: positions, the
 * adjacency in CSR form, and a lookup from a world point to the nearest
 * sample. This is the same structure the reachability report is computed
 * from — enemies path on exactly the surface the validator gated.
 */
export interface NavmeshGraph {
  count: number;
  /** xyz per sample, canonical Z-up meters. */
  points: Float32Array;
  /** 1 where the sample is in the same component as a spawn. */
  reachable: Uint8Array;
  adjOffset: Int32Array;
  adjList: Int32Array;
  /** Nearest sample to a world point, or -1. */
  locate(x: number, y: number, z: number, span?: number): number;
}

/** Per-sample classification, for visualising the bake. */
export const SAMPLE_REACHABLE = 0;
export const SAMPLE_ISLAND = 1;
export const SAMPLE_LEDGE = 2;

export interface NavmeshIsland {
  size: number;
  /** A representative world position, for pointing at it. */
  at: [number, number, number];
  /** Declared spaces the island overlaps, if any. */
  spaces: string[];
  /**
   * `playable` islands sit inside a declared space and are a real defect.
   * `offmesh` islands are roofs, ledges and container tops: walkable in
   * principle, never intended to be reached, and not a failure.
   */
  kind: 'playable' | 'offmesh';
}

export interface SpaceCoverage {
  space: string;
  layer: string;
  covered: number;
  total: number;
  fraction: number;
}

export interface NavmeshReport {
  cell: number;
  agent: { radius: number; height: number; step: number };
  sealed: boolean;
  samples: number;
  components: number;
  reachable: number;
  reachable_fraction: number;
  /** Samples that lie on the floor of a declared space, and how many are reachable. */
  playable_samples: number;
  playable_reachable: number;
  playable_fraction: number;
  seeds: string[];
  islands: NavmeshIsland[];
  playable_islands: number;
  unreachable_markers: string[];
  space_coverage: SpaceCoverage[];
  unreachable_spaces: string[];
  thin_spaces: string[];
  /**
   * Reachable samples with a neighbouring column containing no solid at all:
   * step that way and you leave the world. An open elevation change with
   * nothing sealing its face produces these by the hundred.
   */
  void_edges: number;
  /** Where you would be standing, and where you would step into nothing. */
  void_examples: { from: [number, number, number]; to: [number, number, number] }[];
  ok: boolean;
  ms: number;
  /** Present when `keepSamples` was set: xyz triples in canonical meters. */
  points?: Float32Array;
  /** One `SAMPLE_*` value per point. */
  state?: Uint8Array;
  /** Present when `keepGraph` was set. */
  graph?: NavmeshGraph;
}

interface Column {
  /** Walkable surface elevations in this column, ascending. */
  z: number[];
  /** Index of the first sample of this column in the flat sample arrays. */
  base: number;
}

const CLEAR_EPS = 0.06;

export function bakeNavmesh(level: CompiledLevel, opts: NavmeshOptions = {}): NavmeshReport {
  const t0 = performance.now();
  const player = level.spec.player ?? DEFAULTS.player;
  const cell = opts.cell ?? 0.25;
  const agentHeight = opts.agentHeight ?? player.height;
  const agentRadius = opts.agentRadius ?? player.radius;
  const maxStep = opts.maxStep ?? player.step;
  const sealed = opts.includeDynamic === true;

  const solids = sealed ? level.solids : level.solids.filter((s) => !s.dynamic);
  if (!solids.length) {
    return emptyReport(cell, { radius: agentRadius, height: agentHeight, step: maxStep }, t0);
  }

  // ---- bounds -------------------------------------------------------------
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const s of solids) {
    minX = Math.min(minX, s.box.min[0]);
    minY = Math.min(minY, s.box.min[1]);
    maxX = Math.max(maxX, s.box.max[0]);
    maxY = Math.max(maxY, s.box.max[1]);
  }
  const nx = Math.ceil((maxX - minX) / cell);
  const ny = Math.ceil((maxY - minY) / cell);

  // ---- broad phase --------------------------------------------------------
  const BUCKET = 2.0;
  const bw = Math.ceil((maxX - minX) / BUCKET) + 1;
  const bh = Math.ceil((maxY - minY) / BUCKET) + 1;
  const buckets: number[][] = Array.from({ length: bw * bh }, () => []);
  for (let s = 0; s < solids.length; s++) {
    const b = solids[s].box;
    const i0 = Math.max(0, Math.floor((b.min[0] - minX) / BUCKET));
    const i1 = Math.min(bw - 1, Math.floor((b.max[0] - minX) / BUCKET));
    const j0 = Math.max(0, Math.floor((b.min[1] - minY) / BUCKET));
    const j1 = Math.min(bh - 1, Math.floor((b.max[1] - minY) / BUCKET));
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) buckets[j * bw + i].push(s);
  }
  const at = (x: number, y: number): number[] => {
    const i = Math.floor((x - minX) / BUCKET);
    const j = Math.floor((y - minY) / BUCKET);
    if (i < 0 || j < 0 || i >= bw || j >= bh) return [];
    return buckets[j * bw + i];
  };

  /** Does any solid occupy the vertical segment at this point? */
  const blocked = (x: number, y: number, z0: number, z1: number): boolean => {
    for (const si of at(x, y)) {
      const b = solids[si].box;
      if (x < b.min[0] || x >= b.max[0] || y < b.min[1] || y >= b.max[1]) continue;
      if (b.max[2] > z0 && b.min[2] < z1) return true;
    }
    return false;
  };

  /** Is there a surface here the agent could still be standing on? */
  const supported = (x: number, y: number, z: number): boolean => {
    for (const si of at(x, y)) {
      const b = solids[si].box;
      if (x < b.min[0] || x >= b.max[0] || y < b.min[1] || y >= b.max[1]) continue;
      if (b.max[2] >= z - maxStep - 1e-6 && b.max[2] <= z + maxStep + 1e-6) return true;
    }
    return false;
  };

  // ---- walkable surfaces per column --------------------------------------
  const columns: Column[] = new Array(nx * ny);
  const sampleX: number[] = [];
  const sampleY: number[] = [];
  const sampleZ: number[] = [];
  const sampleCol: number[] = [];
  const spans: [number, number][] = [];

  for (let j = 0; j < ny; j++) {
    const y = minY + (j + 0.5) * cell;
    for (let i = 0; i < nx; i++) {
      const x = minX + (i + 0.5) * cell;
      const ci = j * nx + i;
      spans.length = 0;
      for (const si of at(x, y)) {
        const b = solids[si].box;
        if (x < b.min[0] || x >= b.max[0] || y < b.min[1] || y >= b.max[1]) continue;
        spans.push([b.min[2], b.max[2]]);
      }
      if (!spans.length) {
        columns[ci] = { z: [], base: -1 };
        continue;
      }
      spans.sort((a, b) => a[0] - b[0]);
      const merged: [number, number][] = [];
      for (const sp of spans) {
        const last = merged[merged.length - 1];
        if (last && sp[0] <= last[1] + 1e-6) last[1] = Math.max(last[1], sp[1]);
        else merged.push([sp[0], sp[1]]);
      }

      const zs: number[] = [];
      for (let k = 0; k < merged.length; k++) {
        const top = merged[k][1];
        const ceiling = k + 1 < merged.length ? merged[k + 1][0] : Infinity;
        if (ceiling - top < agentHeight) continue; // no headroom
        // Agent radius, tested exactly rather than by eroding the sample grid,
        // which at this resolution would delete every staircase and doorway.
        //
        // Overhead: anything within a step of the surface is a step, not an
        // obstruction — that is what makes stair treads walkable at all.
        // Support: the foot circle must land on something at a comparable
        // height, which is what makes a 24 cm wall top NOT walkable.
        let clipped = false;
        for (const [dx, dy] of [
          [agentRadius, 0],
          [-agentRadius, 0],
          [0, agentRadius],
          [0, -agentRadius],
        ]) {
          const px = x + dx;
          const py = y + dy;
          if (blocked(px, py, top + maxStep + CLEAR_EPS, top + agentHeight)) {
            clipped = true;
            break;
          }
          if (!supported(px, py, top)) {
            clipped = true;
            break;
          }
        }
        if (clipped) continue;
        zs.push(top);
      }
      columns[ci] = { z: zs, base: zs.length ? sampleX.length : -1 };
      for (const z of zs) {
        sampleX.push(x);
        sampleY.push(y);
        sampleZ.push(z);
        sampleCol.push(ci);
      }
    }
  }

  const n = sampleZ.length;
  if (n === 0) {
    return emptyReport(cell, { radius: agentRadius, height: agentHeight, step: maxStep }, t0);
  }

  // ---- connect ------------------------------------------------------------
  const adjacency: number[][] = Array.from({ length: n }, () => []);
  const link = (a: number, b: number): void => {
    adjacency[a].push(b);
    adjacency[b].push(a);
  };
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const ci = j * nx + i;
      const col = columns[ci];
      if (!col || col.base < 0) continue;
      for (const [di, dj] of [
        [1, 0],
        [0, 1],
      ] as const) {
        const ni = i + di;
        const nj = j + dj;
        if (ni >= nx || nj >= ny) continue;
        const other = columns[nj * nx + ni];
        if (!other || other.base < 0) continue;
        for (let a = 0; a < col.z.length; a++) {
          for (let b = 0; b < other.z.length; b++) {
            const za = col.z[a];
            const zb = other.z[b];
            if (Math.abs(za - zb) > maxStep) continue;
            // A thin wall can sit between two samples without clipping either
            // agent cylinder, so probe the gap itself.
            const mx = (sampleX[col.base + a] + sampleX[other.base + b]) / 2;
            const my = (sampleY[col.base + a] + sampleY[other.base + b]) / 2;
            const top = Math.max(za, zb);
            if (blocked(mx, my, top + maxStep + CLEAR_EPS, top + agentHeight)) continue;
            link(col.base + a, other.base + b);
          }
        }
      }
    }
  }

  // ---- components ---------------------------------------------------------
  const comp = new Int32Array(n).fill(-1);
  const sizes: number[] = [];
  for (let s = 0; s < n; s++) {
    if (comp[s] !== -1) continue;
    const id = sizes.length;
    let count = 0;
    const stack = [s];
    comp[s] = id;
    while (stack.length) {
      const u = stack.pop()!;
      count++;
      for (const v of adjacency[u])
        if (comp[v] === -1) {
          comp[v] = id;
          stack.push(v);
        }
    }
    sizes.push(count);
  }

  // ---- seed from the spawns and flood ------------------------------------
  const g = level.spec.grid ?? 1;
  const columnOf = (x: number, y: number): number => {
    const i = Math.floor((x - minX) / cell);
    const j = Math.floor((y - minY) / cell);
    if (i < 0 || j < 0 || i >= nx || j >= ny) return -1;
    return j * nx + i;
  };
  /** Nearest sample to a world point, searching outward a little. */
  const sampleNear = (p: [number, number, number], span = 3, maxDz = 2.0): number => {
    let best = -1;
    let bestScore = Infinity;
    const i0 = Math.floor((p[0] - minX) / cell);
    const j0 = Math.floor((p[1] - minY) / cell);
    for (let dj = -span; dj <= span; dj++) {
      for (let di = -span; di <= span; di++) {
        const i = i0 + di;
        const j = j0 + dj;
        if (i < 0 || j < 0 || i >= nx || j >= ny) continue;
        const col = columns[j * nx + i];
        if (!col || col.base < 0) continue;
        for (let k = 0; k < col.z.length; k++) {
          const dz = Math.abs(col.z[k] - p[2]);
          if (dz > maxDz) continue;
          const score = dz * 4 + Math.hypot(di, dj) * cell;
          if (score < bestScore) {
            bestScore = score;
            best = col.base + k;
          }
        }
      }
    }
    return best;
  };

  const seedMarkers = level.markers.filter((m) => m.kind === 'attacker_spawn');
  const seedList = seedMarkers.length ? seedMarkers : level.markers;
  const seedSamples: number[] = [];
  const seeds: string[] = [];
  for (const m of seedList) {
    const s = sampleNear(m.pos);
    if (s >= 0) {
      seedSamples.push(s);
      seeds.push(m.id);
    }
  }
  // With no usable marker, fall back to the largest component so the report is
  // still meaningful rather than empty.
  if (!seedSamples.length) {
    let biggest = 0;
    for (let c = 1; c < sizes.length; c++) if (sizes[c] > sizes[biggest]) biggest = c;
    for (let s = 0; s < n; s++)
      if (comp[s] === biggest) {
        seedSamples.push(s);
        seeds.push('largest-component');
        break;
      }
  }

  const reachableComp = new Set<number>();
  for (const s of seedSamples) reachableComp.add(comp[s]);
  const isReachable = (s: number): boolean => reachableComp.has(comp[s]);
  let reachable = 0;
  for (let s = 0; s < n; s++) if (isReachable(s)) reachable++;

  // Floor elevation of each declared space, so a crate top in a sunken lane is
  // not mistaken for the lane itself.
  const spaceFloor = new Map<string, number>();
  for (const layer of level.spec.layers)
    for (const sp of layer.spaces)
      spaceFloor.set(`${layer.id}|${sp.id}`, layer.z + (sp.z_offset ?? 0));

  /** The space a sample stands in, if it is on that space's walking surface. */
  const spaceAt = (s: number): { layer: string; space: string } | null => {
    const cx = Math.floor(sampleX[s] / g);
    const cy = Math.floor(sampleY[s] / g);
    const ck = `${cx},${cy}`;
    for (const [layerId, occ] of level.occupancy) {
      const space = occ.get(ck);
      if (!space) continue;
      const floor = spaceFloor.get(`${layerId}|${space}`);
      if (floor === undefined) continue;
      if (Math.abs(sampleZ[s] - floor) <= maxStep + 0.1) return { layer: layerId, space };
    }
    return null;
  };

  // ---- coverage of the declared spaces ------------------------------------
  const spaceCells = new Map<string, { layer: string; cells: Set<string>; hit: Set<string> }>();
  for (const [layerId, occ] of level.occupancy) {
    for (const [k, space] of occ) {
      const key = `${layerId}|${space}`;
      let rec = spaceCells.get(key);
      if (!rec) spaceCells.set(key, (rec = { layer: layerId, cells: new Set(), hit: new Set() }));
      rec.cells.add(k);
    }
  }
  let playableSamples = 0;
  let playableReachable = 0;
  for (let s = 0; s < n; s++) {
    const where = spaceAt(s);
    if (!where) continue;
    playableSamples++;
    if (!isReachable(s)) continue;
    playableReachable++;
    const cx = Math.floor(sampleX[s] / g);
    const cy = Math.floor(sampleY[s] / g);
    spaceCells.get(`${where.layer}|${where.space}`)?.hit.add(`${cx},${cy}`);
  }

  const space_coverage: SpaceCoverage[] = [];
  for (const [key, rec] of spaceCells) {
    const space = key.slice(key.indexOf('|') + 1);
    space_coverage.push({
      space,
      layer: rec.layer,
      covered: rec.hit.size,
      total: rec.cells.size,
      fraction: rec.cells.size ? rec.hit.size / rec.cells.size : 1,
    });
  }
  space_coverage.sort((a, b) => a.fraction - b.fraction);
  const unreachable_spaces = space_coverage.filter((c) => c.covered === 0).map((c) => c.space);
  const thin_spaces = space_coverage
    .filter((c) => c.covered > 0 && c.fraction < 0.35)
    .map((c) => c.space);

  // ---- islands ------------------------------------------------------------
  const repr = new Map<number, number>();
  for (let s = 0; s < n; s++) if (!repr.has(comp[s])) repr.set(comp[s], s);
  const islands: NavmeshIsland[] = [];
  for (const [c, s] of repr) {
    if (reachableComp.has(c)) continue;
    // Playable only if the island stands on a declared space's own floor. A
    // crate top inside a room is a ledge, not an unreachable room — and in a
    // sunken lane that floor is not the layer elevation.
    const inSpaces: string[] = [];
    let members = 0;
    for (let t = 0; t < n && members < 40; t++) {
      if (comp[t] !== c) continue;
      members++;
      const where = spaceAt(t);
      if (where && !inSpaces.includes(where.space)) inSpaces.push(where.space);
    }
    islands.push({
      size: sizes[c],
      at: [sampleX[s], sampleY[s], sampleZ[s]],
      spaces: inSpaces,
      kind: inSpaces.length ? 'playable' : 'offmesh',
    });
  }
  islands.sort((a, b) => b.size - a.size);
  const playable_islands = islands.filter((i) => i.kind === 'playable').length;

  // ---- void edges ---------------------------------------------------------
  const VOID_DEPTH = 40;
  const somethingBelow = (x: number, y: number, z: number): boolean => {
    for (const si of at(x, y)) {
      const b = solids[si].box;
      if (x < b.min[0] || x >= b.max[0] || y < b.min[1] || y >= b.max[1]) continue;
      if (b.max[2] > z - VOID_DEPTH && b.min[2] < z + agentHeight) return true;
    }
    return false;
  };
  let void_edges = 0;
  const void_examples: { from: [number, number, number]; to: [number, number, number] }[] = [];
  // Walk outward far enough to clear the mesh's own radius erosion, but stop
  // at anything that would stop the player. A railed balcony is not a void
  // edge; an unguarded shaft is, and so is an unsealed cliff face.
  // Step finer than the thinnest wall, or the probe walks straight through a
  // riser and reports the void behind it.
  const probeStep = cell * 0.5;
  const reach = Math.max(1, Math.ceil((agentRadius + cell) / probeStep));
  for (let s = 0; s < n; s++) {
    if (!isReachable(s)) continue;
    const x = sampleX[s];
    const y = sampleY[s];
    const z = sampleZ[s];
    let found = false;
    for (const [ux, uy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      for (let step = 1; step <= reach && !found; step++) {
        const px = x + ux * step * probeStep;
        const py = y + uy * step * probeStep;
        const lo = z + maxStep + CLEAR_EPS;
        const hi = z + agentHeight;
        // Something at body height stops the player before they get there —
        // including to either side, since a body is wider than a point and
        // cannot squeeze through the notch where two walls meet.
        const side = agentRadius * 0.8;
        if (
          blocked(px, py, lo, hi) ||
          blocked(px + uy * side, py + ux * side, lo, hi) ||
          blocked(px - uy * side, py - ux * side, lo, hi)
        )
          break;
        if (!somethingBelow(px, py, z)) {
          found = true;
          if (void_examples.length < 10) void_examples.push({ from: [x, y, z], to: [px, py, z] });
        }
      }
      if (found) break;
    }
    if (found) void_edges++;
  }

  const unreachable_markers: string[] = [];
  for (const m of level.markers) {
    const s = sampleNear(m.pos);
    if (s < 0 || !isReachable(s)) unreachable_markers.push(m.id);
  }

  let points: Float32Array | undefined;
  let state: Uint8Array | undefined;
  if (opts.keepSamples) {
    points = new Float32Array(n * 3);
    state = new Uint8Array(n);
    const playableComp = new Set(islands.filter((i) => i.kind === 'playable').map(() => 0));
    void playableComp;
    const islandComps = new Set<number>();
    for (let s2 = 0; s2 < n; s2++) {
      if (reachableComp.has(comp[s2])) continue;
      if (spaceAt(s2)) islandComps.add(comp[s2]);
    }
    for (let s2 = 0; s2 < n; s2++) {
      points[s2 * 3] = sampleX[s2];
      points[s2 * 3 + 1] = sampleY[s2];
      points[s2 * 3 + 2] = sampleZ[s2];
      state[s2] = reachableComp.has(comp[s2])
        ? SAMPLE_REACHABLE
        : islandComps.has(comp[s2])
          ? SAMPLE_ISLAND
          : SAMPLE_LEDGE;
    }
  }

  let graph: NavmeshGraph | undefined;
  if (opts.keepGraph) {
    const gp = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      gp[i * 3] = sampleX[i];
      gp[i * 3 + 1] = sampleY[i];
      gp[i * 3 + 2] = sampleZ[i];
    }
    const reach = new Uint8Array(n);
    for (let i = 0; i < n; i++) reach[i] = reachableComp.has(comp[i]) ? 1 : 0;
    const adjOffset = new Int32Array(n + 1);
    let total = 0;
    for (let i = 0; i < n; i++) {
      adjOffset[i] = total;
      total += adjacency[i].length;
    }
    adjOffset[n] = total;
    const adjList = new Int32Array(total);
    let w = 0;
    for (let i = 0; i < n; i++) for (const v of adjacency[i]) adjList[w++] = v;
    graph = {
      count: n,
      points: gp,
      reachable: reach,
      adjOffset,
      adjList,
      locate: (x, y, z, span = 3) => sampleNear([x, y, z], span, 3.0),
    };
  }

  void columnOf;
  return {
    cell,
    sealed,
    agent: { radius: agentRadius, height: agentHeight, step: maxStep },
    samples: n,
    components: sizes.length,
    reachable,
    reachable_fraction: reachable / n,
    playable_samples: playableSamples,
    playable_reachable: playableReachable,
    playable_fraction: playableSamples ? playableReachable / playableSamples : 0,
    seeds,
    islands: islands.slice(0, 24),
    playable_islands,
    unreachable_markers,
    space_coverage,
    unreachable_spaces,
    thin_spaces,
    void_edges,
    void_examples,
    ok:
      playable_islands === 0 &&
      unreachable_markers.length === 0 &&
      unreachable_spaces.length === 0 &&
      void_edges === 0,
    ms: performance.now() - t0,
    points,
    state,
    graph,
  };
}

function emptyReport(
  cell: number,
  agent: { radius: number; height: number; step: number },
  t0: number,
): NavmeshReport {
  return {
    cell,
    sealed: false,
    agent,
    samples: 0,
    components: 0,
    reachable: 0,
    reachable_fraction: 0,
    playable_samples: 0,
    playable_reachable: 0,
    playable_fraction: 0,
    seeds: [],
    islands: [],
    playable_islands: 0,
    unreachable_markers: [],
    space_coverage: [],
    unreachable_spaces: [],
    thin_spaces: [],
    void_edges: 0,
    void_examples: [],
    ok: false,
    ms: performance.now() - t0,
  };
}
