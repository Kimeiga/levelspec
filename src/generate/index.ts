/**
 * Level generation.
 *
 * The generator proposes; the compiler and the gates dispose. A candidate that
 * has a room you cannot walk to, a spawn that can see the exit, or a single
 * route between them is thrown away and re-rolled — the player never sees it.
 * That is the whole reason the validators exist: they turn "probably fine"
 * into a precondition.
 */

import { compile } from '../core/compiler.ts';
import { validate, edgeDisjointRoutes, type ValidationReport } from '../core/validate.ts';
import { bakeNavmesh, type NavmeshReport } from '../core/navmesh.ts';
import { key } from '../core/grid.ts';
import type { CompiledLevel, LevelSpec } from '../core/types.ts';
import { Rng, seedWord } from './rng.ts';
import { THEMES, themeById, type Theme } from './themes.ts';
import { archetypeFor, ARCHETYPES, type Archetype } from './archetypes.ts';

export * from './rng.ts';
export * from './themes.ts';
export { LOOKS } from './looks.ts';
export { ARCHETYPES } from './archetypes.ts';
export { loadAuthored, type AuthoredSource, type AuthoredOptions } from './authored.ts';

export type PickupKind = 'health' | 'ammo' | 'weapon' | 'armor';

export interface Pickup {
  id: string;
  kind: PickupKind;
  /** For weapon crates: which weapon. */
  variant?: string;
  at: [number, number, number];
}

export interface GeneratedLevel {
  spec: LevelSpec;
  level: CompiledLevel;
  report: ValidationReport;
  navmesh: NavmeshReport;
  theme: Theme;
  archetype: string;
  seed: string;
  depth: number;
  spawn: [number, number, number];
  /** Canonical heading to face on arrival, radians. */
  spawnFacing?: number;
  exit: [number, number, number];
  pickups: Pickup[];
  /** Points well away from the player, for spawning enemies. */
  enemyPosts: [number, number, number][];
  attempts: number;
  ms: number;
  /** Routes from spawn to exit that share no corridor. */
  disjointRoutes: number;
}

export interface GenerateOptions {
  seed?: string | number;
  depth?: number;
  theme?: string;
  archetype?: string;
  /** How many candidates to try before giving up. */
  attempts?: number;
  /** Require at least this many edge-disjoint spawn→exit routes. */
  minRoutes?: number;
}

export interface GenerateFailure {
  ok: false;
  attempts: number;
  reasons: string[];
}

export type GenerateResult = ({ ok: true } & GeneratedLevel) | GenerateFailure;

const WEAPON_DROPS = ['smg', 'shotgun', 'rifle'] as const;

export function generateLevel(opts: GenerateOptions = {}): GenerateResult {
  const t0 = performance.now();
  const depth = opts.depth ?? 1;
  const master = new Rng(opts.seed ?? `${Date.now()}`);
  const maxAttempts = opts.attempts ?? 14;
  const minRoutes = opts.minRoutes ?? 2;
  const reasons: string[] = [];

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const rng = new Rng(master.int(1, 2 ** 30));
    const seed = seedWord(rng);
    const theme = opts.theme ? themeById(opts.theme) : rng.pick(THEMES);
    const arch: Archetype = opts.archetype
      ? ARCHETYPES.find((a) => a.id === opts.archetype) ?? archetypeFor(rng, depth)
      : archetypeFor(rng, depth);

    const built = arch.build({ rng, theme, depth, id: `gen_${arch.id}_${seed}` });
    if (!built) {
      reasons.push(`${arch.id}: layout gave up`);
      continue;
    }
    const { builder, spawn, exit, rooms } = built;

    // Spawn and exit are markers so the gates check them like anything else.
    if (!builder.marker({ id: 'spawn', layer: spawn.layer, cell: spawn.cell, kind: 'attacker_spawn', label: 'Insertion' })) {
      reasons.push(`${arch.id}: no room for the spawn`);
      continue;
    }
    if (!builder.marker({ id: 'exit', layer: exit.layer, cell: exit.cell, kind: 'objective', label: 'EXIT' })) {
      reasons.push(`${arch.id}: no room for the exit`);
      continue;
    }
    builder.route('run', 'spawn', 'exit', minRoutes);

    // Pickups, placed as markers so an unreachable one fails the build.
    const pickupPlan = planPickups(rng, depth);
    const placed: { id: string; kind: PickupKind; variant?: string; layer: string; cell: [number, number] }[] = [];
    const pool = rng.shuffle([...rooms]);
    for (let i = 0; i < pickupPlan.length; i++) {
      const room = pool[i % pool.length];
      const cell = builder.freeCell(room.layer, room.space, 1);
      if (!cell) continue;
      const p = pickupPlan[i];
      const id = `pick_${i}`;
      if (builder.marker({ id, layer: room.layer, cell, kind: 'poi', label: p.variant ? `${p.kind}:${p.variant}` : p.kind }))
        placed.push({ id, kind: p.kind, variant: p.variant, layer: room.layer, cell });
    }

    const spec = builder.finish();
    const level = compile(spec);
    const report = validate(level);
    if (!report.passed) {
      reasons.push(`${arch.id}/${seed}: ${report.diagnostics.filter((d) => d.severity === 'error').map((d) => d.code).slice(0, 3).join(',')}`);
      continue;
    }

    const navmesh = bakeNavmesh(level, { keepGraph: true });
    if (!navmesh.ok) {
      reasons.push(
        `${arch.id}/${seed}: navmesh ${navmesh.playable_islands} island(s), ${navmesh.void_edges} void edge(s)`,
      );
      continue;
    }

    // The property that makes these maps worth using: more than one way round.
    const spawnNode = level.nav.index.get(`${spawn.layer}|${key(spawn.cell[0], spawn.cell[1])}`);
    const exitNode = level.nav.index.get(`${exit.layer}|${key(exit.cell[0], exit.cell[1])}`);
    const disjoint =
      spawnNode !== undefined && exitNode !== undefined
        ? edgeDisjointRoutes(level, spawnNode, exitNode, minRoutes + 1)
        : 0;
    if (disjoint < minRoutes) {
      reasons.push(`${arch.id}/${seed}: only ${disjoint} route(s) to the exit`);
      continue;
    }

    const at = (layer: string, cell: [number, number]): [number, number, number] => {
      const m = level.markers.find((mk) => mk.layer === layer && mk.cell[0] === cell[0] && mk.cell[1] === cell[1]);
      const g = spec.grid ?? 1;
      const l = spec.layers.find((x) => x.id === layer)!;
      return m ? m.pos : [(cell[0] + 0.5) * g, (cell[1] + 0.5) * g, l.z];
    };

    return {
      ok: true,
      spec,
      level,
      report,
      navmesh,
      theme,
      archetype: arch.id,
      seed,
      depth,
      spawn: at(spawn.layer, spawn.cell),
      exit: at(exit.layer, exit.cell),
      pickups: placed.map((p) => ({ id: p.id, kind: p.kind, variant: p.variant, at: at(p.layer, p.cell) })),
      enemyPosts: postsFrom(level, spawn.layer, spawn.cell),
      attempts: attempt,
      ms: performance.now() - t0,
      disjointRoutes: disjoint,
    };
  }

  return { ok: false, attempts: maxAttempts, reasons };
}

function planPickups(rng: Rng, depth: number): { kind: PickupKind; variant?: string }[] {
  const out: { kind: PickupKind; variant?: string }[] = [];
  const health = rng.int(2, 3) + (depth > 3 ? 1 : 0);
  for (let i = 0; i < health; i++) out.push({ kind: 'health' });
  for (let i = 0; i < rng.int(3, 5); i++) out.push({ kind: 'ammo' });
  if (rng.bool(0.7)) out.push({ kind: 'armor' });
  const guns = depth === 1 ? 1 : rng.int(1, 2);
  for (let i = 0; i < guns; i++) out.push({ kind: 'weapon', variant: rng.pick(WEAPON_DROPS) });
  return rng.shuffle(out);
}

/** Nav nodes a good distance from the spawn, for putting enemies down. */
function postsFrom(level: CompiledLevel, layer: string, cell: [number, number]): [number, number, number][] {
  const start = level.nav.index.get(`${layer}|${key(cell[0], cell[1])}`);
  const nodes = level.nav.nodes;
  if (start === undefined) return nodes.filter((_, i) => i % 37 === 0).map((n) => n.pos);
  const dist = new Int32Array(nodes.length).fill(-1);
  const queue = [start];
  dist[start] = 0;
  for (let qi = 0; qi < queue.length; qi++) {
    const u = queue[qi];
    for (const ei of level.nav.adjacency[u]) {
      const e = level.nav.edges[ei];
      const v = e.a === u ? e.b : e.a;
      if (dist[v] !== -1) continue;
      dist[v] = dist[u] + 1;
      queue.push(v);
    }
  }
  const out: [number, number, number][] = [];
  for (let i = 0; i < nodes.length; i += 3) if (dist[i] > 12) out.push(nodes[i].pos);
  return out.length ? out : nodes.map((n) => n.pos);
}
