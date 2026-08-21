/**
 * Whether a laid-out concept is actually the place it claimed to be.
 *
 * A concept says "three bands, a compressed service route, one way between the
 * middle and the bottom". The slicer produces *a* map from that; whether the
 * map it produced still has those properties is a separate question, and one
 * nobody can answer by looking at a drawing. Half the point of generating
 * twenty variants is that nineteen of them will have quietly lost something —
 * a band that ended up with four per cent of the floor, an objective you can
 * see from the spawn, a route with no compression anywhere along it.
 *
 * So each candidate is measured against the concept's own claims rather than
 * against a general idea of a good map. Every term is a fraction and every one
 * points the same way, because the driver's job is to sort them and a scoring
 * function whose terms disagree about direction is one nobody can reason
 * about.
 */

import type { CompiledLevel } from '../core/types.ts';
import { bakeNavmesh, type NavmeshGraph } from '../core/navmesh.ts';
import { validate } from '../core/validate.ts';
import type { SpatialConcept } from './concept.ts';

export interface Score {
  /** Hard gates. A candidate failing either is not a candidate. */
  compiles: boolean;
  reachable: boolean;
  problems: string[];

  /** How much of the map is not on the band you arrive on. */
  verticality: number;
  /** How evenly the floor is spread across the bands the concept declared. */
  spread: number;
  /** Route length from spawn to objective, against the map's own diagonal. */
  journey: number;
  /** How much the route changes width along its length. */
  rhythm: number;
  /** Fraction of the route from which the objective is not visible. */
  mystery: number;
  /** Navmesh samples against the budget. A penalty, never a reward. */
  cost: number;

  total: number;
}

function bfs(g: NavmeshGraph, from: number): Int32Array {
  const dist = new Int32Array(g.count).fill(-1);
  if (from < 0) return dist;
  const q = new Int32Array(g.count);
  let head = 0;
  let tail = 0;
  q[tail++] = from;
  dist[from] = 0;
  while (head < tail) {
    const u = q[head++];
    const du = dist[u] + 1;
    for (let k = g.adjOffset[u]; k < g.adjOffset[u + 1]; k++) {
      const v = g.adjList[k];
      if (dist[v] !== -1) continue;
      dist[v] = du;
      q[tail++] = v;
    }
  }
  return dist;
}

const EMPTY: Omit<Score, 'compiles' | 'reachable' | 'problems'> = {
  verticality: 0, spread: 0, journey: 0, rhythm: 0, mystery: 0, cost: 1, total: -1,
};

export function score(concept: SpatialConcept, level: CompiledLevel): Score {
  const problems: string[] = [];
  const report = validate(level);
  const errors = report.diagnostics.filter((d) => d.severity === 'error');
  for (const e of errors.slice(0, 3)) problems.push(`${e.code} ${e.message.slice(0, 80)}`);
  if (errors.length) return { compiles: false, reachable: false, problems, ...EMPTY };

  const nav = bakeNavmesh(level, { keepGraph: true });
  const g = nav.graph;
  if (!g) {
    problems.push('navmesh produced no graph');
    return { compiles: true, reachable: false, problems, ...EMPTY };
  }
  if (!nav.ok) {
    const islands = (nav.islands ?? []).filter((i) => i.kind === 'playable');
    problems.push(
      `navmesh: ${islands.length} unreachable piece(s)` +
      (islands.length ? `, largest ${Math.max(...islands.map((i) => i.size))} samples in ${islands[0].spaces.join('/') || 'nowhere named'}` : ''),
    );
    return { compiles: true, reachable: false, problems, ...EMPTY };
  }

  /*
   * How much of the map is off the ground, by navmesh sample rather than by
   * declared area — what matters is where a player can stand, and a concept
   * can declare three bands and get a map whose upper two are a gantry and a
   * cupboard without the declaration noticing.
   */
  const ground = Math.min(...concept.bands.map((b) => b.z));
  const perBand = new Map<string, number>();
  let onGround = 0;
  let total = 0;
  for (let i = 0; i < g.count; i++) {
    if (!g.reachable[i]) continue;
    total++;
    const z = g.points[i * 3 + 2];
    let best = concept.bands[0];
    for (const b of concept.bands) if (z >= b.z - 1.2 && b.z >= best.z) best = b;
    perBand.set(best.id, (perBand.get(best.id) ?? 0) + 1);
    if (Math.abs(z - ground) < 1.6) onGround++;
  }
  const verticality = total ? 1 - onGround / total : 0;

  // Even spread across the declared bands, as normalised entropy: one band
  // holding everything scores zero however many bands were declared.
  const n = concept.bands.length;
  let entropy = 0;
  for (const b of concept.bands) {
    const p = (perBand.get(b.id) ?? 0) / Math.max(1, total);
    if (p > 0) entropy -= p * Math.log(p);
  }
  const spread = n > 1 ? entropy / Math.log(n) : 1;

  const markers = level.markers;
  const start = markers.find((m) => m.kind === 'attacker_spawn') ?? markers[0];
  const goal = markers.find((m) => m.kind === 'site') ?? markers[markers.length - 1];
  let journey = 0;
  let rhythm = 0;
  let mystery = 0;
  if (start && goal) {
    const a = g.locate(start.pos[0], start.pos[1], start.pos[2] + 0.2, 6);
    const b = g.locate(goal.pos[0], goal.pos[1], goal.pos[2] + 0.2, 6);
    const ds = bfs(g, a);
    const de = bfs(g, b);
    const hops = a >= 0 && b >= 0 ? ds[b] : -1;
    const span = Math.hypot(concept.size[0], concept.size[1]) * concept.grid;
    // A hop is one bake cell, so hops times the cell size is walked distance;
    // against the map's own diagonal, that is how much of itself it uses.
    journey = hops > 0 ? (hops * 0.25) / span : 0;

    /*
     * Width along the route, sampled at twelve points.
     *
     * Openness at a point is how many reachable samples sit within four metres
     * of it: a corridor has a couple of hundred, a hall a couple of thousand.
     * How much that varies along the route is compression and release measured
     * rather than asserted — a corridor the whole way and a hall the whole way
     * both score zero, which is correct.
     */
    const along: number[] = [];
    const seen: number[] = [];
    for (let i = 0; i < g.count; i++) {
      if (ds[i] < 0 || de[i] < 0) continue;
      const slot = Math.floor((ds[i] / Math.max(1, ds[i] + de[i])) * 12);
      if (along[slot] === undefined) {
        along[slot] = i;
        seen.push(slot);
      }
    }
    const widths: number[] = [];
    for (const slot of seen) {
      const i = along[slot];
      const x = g.points[i * 3];
      const y = g.points[i * 3 + 1];
      const z = g.points[i * 3 + 2];
      let near = 0;
      for (let j = 0; j < g.count; j += 7) {
        if (!g.reachable[j]) continue;
        if (Math.abs(g.points[j * 3 + 2] - z) > 2) continue;
        const dx = g.points[j * 3] - x;
        const dy = g.points[j * 3 + 1] - y;
        if (dx * dx + dy * dy < 16) near++;
      }
      widths.push(near);
    }
    if (widths.length > 3) {
      const lo = Math.min(...widths);
      const hi = Math.max(...widths);
      rhythm = hi > 0 ? (hi - lo) / hi : 0;
    }

    // How much of the route cannot see the end of it. A map you can see the
    // objective from the spawn of has no reveal in it.
    let blind = 0;
    for (const slot of seen) {
      const i = along[slot];
      const dz = Math.abs(g.points[i * 3 + 2] - goal.pos[2]);
      const flat = Math.hypot(g.points[i * 3] - goal.pos[0], g.points[i * 3 + 1] - goal.pos[1]);
      if (dz > 2 || flat > 28) blind++;
    }
    mystery = seen.length ? blind / seen.length : 0;
  }

  const cost = total / 70000;

  /*
   * The weights.
   *
   * Verticality and spread carry the most, because they are the only two that
   * measure whether the *section* — the thing a concept is written as —
   * survived being laid out. Cost is a penalty and never a reward: a map is
   * not better for being small, it is only worse for being enormous.
   */
  const totalScore =
    verticality * 2.4 +
    spread * 2.0 +
    Math.min(1, journey / 0.6) * 1.2 +
    rhythm * 1.2 +
    mystery * 0.8 -
    Math.max(0, cost - 1) * 3;

  return {
    compiles: true, reachable: true, problems,
    verticality, spread, journey, rhythm, mystery, cost, total: totalScore,
  };
}
