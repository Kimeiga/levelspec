/**
 * Playing a map somebody actually designed.
 *
 * The generator makes floors that are provably fair — connected, cycle-rich,
 * two ways round everything — and they are still obviously generated. Real
 * competitive maps have a quality no rule set produces: they were tuned by
 * people, over years, against players. So the run draws from a library of them
 * instead, and the generator becomes the fallback rather than the source.
 *
 * What a hand-drawn plan does not carry is the run's furniture — where you
 * come in, where the way out is, where the pickups sit. That is derived here
 * from the baked navmesh, so a map needs nothing but its floorplan to be
 * playable, and anything it *does* declare is honoured instead.
 */

import { compile } from '../core/compiler.ts';
import { validate } from '../core/validate.ts';
import { bakeNavmesh, type NavmeshGraph } from '../core/navmesh.ts';
import { planToSpec } from '../authoring/plan.ts';
import type { CompiledLevel, LevelSpec } from '../core/types.ts';
import { Rng } from './rng.ts';
import { THEMES, themeById } from './themes.ts';
import type { GeneratedLevel, Pickup, PickupKind } from './index.ts';

export interface AuthoredSource {
  /** Stable id, usually the file stem. */
  id: string;
  /** The plan text. */
  text: string;
}

export interface AuthoredOptions {
  depth?: number;
  seed?: string | number;
  theme?: string;
}

/** Distance in metres between two canonical points. */
const dist = (a: number[], b: number[]): number =>
  Math.hypot(a[0] - b[0], a[1] - b[1], (a[2] - b[2]) * 0.5);

/**
 * Two points far apart on the mesh, by walking distance rather than straight
 * line — the exit should be a journey, not something across a wall you can
 * see from the door.
 */
function farthestPair(graph: NavmeshGraph): [number, number] {
  const bfs = (start: number): { dist: Int32Array; far: number } => {
    const d = new Int32Array(graph.count).fill(-1);
    const q = new Int32Array(graph.count);
    let head = 0;
    let tail = 0;
    q[tail++] = start;
    d[start] = 0;
    let far = start;
    while (head < tail) {
      const u = q[head++];
      if (d[u] > d[far]) far = u;
      for (let k = graph.adjOffset[u]; k < graph.adjOffset[u + 1]; k++) {
        const v = graph.adjList[k];
        if (d[v] === -1) {
          d[v] = d[u] + 1;
          q[tail++] = v;
        }
      }
    }
    return { dist: d, far };
  };
  // Double sweep: the far end of the far end is a diameter of the graph.
  let seed = 0;
  for (let i = 0; i < graph.count; i++) {
    if (graph.reachable[i]) {
      seed = i;
      break;
    }
  }
  const a = bfs(seed).far;
  const b = bfs(a);
  return [a, b.far];
}

const pointAt = (g: NavmeshGraph, i: number): [number, number, number] => [
  g.points[i * 3],
  g.points[i * 3 + 1],
  g.points[i * 3 + 2],
];

function planPickups(rng: Rng, depth: number): { kind: PickupKind; variant?: string }[] {
  const out: { kind: PickupKind; variant?: string }[] = [];
  const health = 2 + Math.min(4, Math.floor(depth / 2));
  for (let i = 0; i < health; i++) out.push({ kind: 'health' });
  for (let i = 0; i < 3 + Math.floor(depth / 3); i++) out.push({ kind: 'ammo' });
  if (depth >= 2) out.push({ kind: 'armor' });
  out.push({ kind: 'weapon' });
  if (depth >= 4) out.push({ kind: 'weapon' });
  return rng.shuffle(out);
}

/**
 * Compile a drawn plan into a floor the run can use.
 *
 * Throws if the map does not pass its gates, so a broken plan can never reach
 * a player — the same contract the generator works under.
 */
export function loadAuthored(src: AuthoredSource, opts: AuthoredOptions = {}): GeneratedLevel {
  const depth = opts.depth ?? 1;
  const rng = new Rng(opts.seed ?? `${src.id}:${depth}`);
  const spec: LevelSpec = planToSpec(src.text);
  const level: CompiledLevel = compile(spec);
  const report = validate(level);
  if (!report.passed) {
    const first = report.diagnostics.find((d) => d.severity === 'error');
    throw new Error(`${src.id} failed validation: ${first?.code} ${first?.message ?? ''}`);
  }
  const navmesh = bakeNavmesh(level, { keepGraph: true });
  const graph = navmesh.graph;
  if (!navmesh.ok || !graph) throw new Error(`${src.id} failed its navmesh bake`);

  const theme = opts.theme ? themeById(opts.theme) : rng.pick(THEMES);

  // Reachable samples, thinned so pickups and enemies are spread rather than
  // clustered wherever the mesh happens to be dense.
  const open: number[] = [];
  for (let i = 0; i < graph.count; i++) if (graph.reachable[i]) open.push(i);

  // Spawn and exit: whatever the map declared, else chosen from the mesh.
  //
  // Not the ends of the graph diameter, which is the obvious choice and the
  // wrong one — the two most distant points on a map are always the deepest
  // corner of one dead end and the deepest corner of another, so the player
  // opens their eyes wedged into a nook facing a wall. Openness is what a
  // spawn actually wants: somewhere with room around it.
  const attacker = level.markers.find((m) => m.kind === 'attacker_spawn');
  const objective = level.markers.find((m) => m.kind === 'objective' || m.kind === 'site');
  const [ai, bi] = farthestPair(graph);

  /**
   * How much room a spot actually has.
   *
   * Counting navmesh neighbours is a decent proxy and it is not the same
   * question: a cell flush against a wall can have four neighbours and still
   * put the player's nose in the plaster. So this walks outward along eight
   * headings and asks how far the floor keeps going, which is the thing that
   * decides whether you open your eyes in a room or in a corner.
   */
  const clearance = (i: number): number => {
    const p = pointAt(graph, i);
    let total = 0;
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      const dx = Math.cos(a);
      const dy = Math.sin(a);
      for (let step = 1; step <= 4; step++) {
        const n = graph.locate(p[0] + dx * step * 1.5, p[1] + dy * step * 1.5, p[2] + 0.2, 2);
        if (n < 0 || !graph.reachable[n]) break;
        total++;
      }
    }
    return total;
  };

  const roomy = (candidates: number[]): number => {
    let best = candidates[0];
    let bestScore = -Infinity;
    // Sampled rather than exhaustive: `clearance` is thirty-two mesh lookups
    // and a big map has tens of thousands of candidates.
    const step = Math.max(1, Math.floor(candidates.length / 260));
    for (let idx = 0; idx < candidates.length; idx += step) {
      const i = candidates[idx];
      const score = clearance(i);
      if (score > bestScore) {
        bestScore = score;
        best = i;
      }
      // 32 is the maximum: floor in every direction for six metres.
      if (bestScore >= 30) break;
    }
    return best;
  };

  // Look near the far end of the map, then take the roomiest spot around there.
  const seedEnd = pointAt(graph, ai);
  const near = open.filter((i) => dist(pointAt(graph, i), seedEnd) < 14);
  const spawnNode = roomy(near.length > 8 ? near : open);
  const spawn = attacker ? attacker.pos : pointAt(graph, spawnNode);
  const exit = objective ? objective.pos : pointAt(graph, bi);

  const pickups: Pickup[] = [];
  const plan = planPickups(rng, depth);
  const taken: [number, number, number][] = [];
  for (const [i, p] of plan.entries()) {
    let best: [number, number, number] | null = null;
    let bestScore = -Infinity;
    for (let t = 0; t < 40; t++) {
      const at = pointAt(graph, open[rng.int(0, open.length - 1)]);
      if (dist(at, spawn) < 12) continue;
      // Spread them out and keep them off the exit.
      const near = taken.reduce((m, q) => Math.min(m, dist(at, q)), Infinity);
      const score = Math.min(near, 30) + Math.min(dist(at, exit), 25) * 0.4;
      if (score > bestScore) {
        bestScore = score;
        best = at;
      }
    }
    if (!best) continue;
    taken.push(best);
    pickups.push({ id: `pick_${i}`, kind: p.kind, variant: p.variant, at: best });
  }

  const enemyPosts: [number, number, number][] = [];
  const stride = Math.max(1, Math.floor(open.length / 900));
  for (let i = 0; i < open.length; i += stride) {
    const at = pointAt(graph, open[i]);
    if (dist(at, spawn) > 10) enemyPosts.push(at);
  }

  return {
    spec,
    level,
    report,
    navmesh,
    theme,
    archetype: 'authored',
    seed: src.id,
    depth,
    spawn: spawn as [number, number, number],
    /**
     * Which way to look on arrival.
     *
     * Averaging the direction of nearby floor sounds right and points you at a
     * wall whenever the open space is lopsided. What a player wants is the
     * longest thing they can see down, so this walks the mesh outward along
     * sixteen headings and takes whichever stays on floor longest.
     */
    spawnFacing: (() => {
      let best = 0;
      let bestRun = -1;
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2;
        const dx = Math.cos(a);
        const dy = Math.sin(a);
        let run = 0;
        for (let step = 1; step <= 22; step++) {
          const node = graph.locate(spawn[0] + dx * step * 1.6, spawn[1] + dy * step * 1.6, spawn[2] + 0.2, 3);
          if (node < 0 || !graph.reachable[node]) break;
          run = step;
        }
        if (run > bestRun) {
          bestRun = run;
          best = a;
        }
      }
      return best;
    })(),
    exit: exit as [number, number, number],
    pickups,
    enemyPosts,
    attempts: 1,
    ms: 0,
    disjointRoutes: 0,
  };
}
