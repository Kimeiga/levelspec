import type { ArchitectureDocument } from "../architecture/types.ts";
/** Native XML producers and procedural generation. */
export interface GenerateOptions {
  seed?: string | number;
  depth?: number;
  theme?: string;
  archetype?: string;
  attempts?: number;
  minRoutes?: number;
}
export interface GenerateFailure {
  ok: false;
  attempts: number;
  reasons: string[];
}
export interface Pickup {
  id: string;
  kind: "health" | "ammo" | "weapon" | "armor";
  variant?: string;
  at: [number, number, number];
}
export interface AuthoredOptions {
  depth?: number;
  seed?: string | number;
  theme?: string;
}
import { NATIVE_ARCHETYPES, proposeNative } from "./native-archetypes.ts";
import { Rng } from "./rng.ts";
import { THEMES } from "./themes.ts";
import {
  produceDocument,
  ProducerValidationError,
  type ProducerOptions,
  type ProducedLevel,
} from "../architecture/producer.ts";
import { parseAml } from "../architecture/format.ts";
import {
  aborted,
  type V3,
  type NavigationReport,
  type Marker,
} from "../vector/types.ts";
import {
  placementPool,
  roomyPoint,
  spreadPoints,
  identifiers,
  facing,
  distance,
  type Placement,
} from "./placement.ts";

export type GenerationOptions = GenerateOptions & ProducerOptions;
export interface GeneratedLevel extends ProducedLevel {
  theme: (typeof THEMES)[number];
  archetype: string;
  seed: string;
  depth: number;
  spawn: V3;
  spawnFacing: number;
  exit: V3;
  pickups: Pickup[];
  enemyPosts: V3[];
  attempts: number;
  ms: number;
  disjointRoutes: number;
}
export type GenerationResult =
  ({ ok: true } & GeneratedLevel) | GenerateFailure;
export interface AuthoredSource {
  id: string;
  text: string;
  format?: "aml";
}

function positiveInteger(name: string, value: number) {
  if (!Number.isSafeInteger(value) || value < 1)
    throw new RangeError(`${name} must be a positive integer.`);
}
function theme(id: string | undefined, rng: Rng) {
  if (!id) return rng.pick(THEMES);
  const selected = THEMES.find((t) => t.id === id);
  if (!selected) throw new Error(`Unknown theme ${id}.`);
  return selected;
}
function posts(points: Placement[], spawn: V3) {
  const candidates = points.filter((p) => distance(p.position, spawn) > 10),
    stride = Math.max(1, Math.ceil(candidates.length / 96));
  return candidates.filter((_, i) => i % stride === 0);
}
function isLand(marker: Marker) {
  return (marker.movement ?? "land") === "land";
}
function runEnemyPosts(d: ArchitectureDocument, ids: string[]) {
  const allocated = new Set(ids);
  return d.markers.filter((m) => allocated.has(m.id)).map((m) => m.position);
}

function addPosts(d: ArchitectureDocument, points: Placement[], spawn: V3) {
  const id = identifiers(d),
    markers = posts(points, spawn).map((p) => ({
      id: id("run.enemy"),
      kind: "enemy_post",
      layer: p.layer,
      region: p.area,
      position: p.position,
    }));
  d.markers.push(...markers);
  return markers.map((m) => m.id);
}

async function publishCandidate(
  candidate: ReturnType<typeof proposeNative>,
  depth: number,
  options: ProducerOptions,
) {
  const made = await produceDocument(candidate.document, options);
  const spawn = made.document.markers.find((m) => m.kind === "attacker_spawn")!,
    exit = made.document.markers.find((m) => m.kind === "objective")!;
  const pool = await placementPool(made.level, options, spawn.position),
    d = structuredClone(made.document);
  const planned = proceduralPickups(candidate.rng, depth);
  const placed = placePickups(
    d,
    pool.points,
    spawn.position,
    candidate.rng,
    planned,
  );
  const enemyIds = addPosts(d, pool.points, spawn.position);
  const published = await produceDocument(d, options);
  const pickups = placed.map((p) => {
    const marker = published.document.markers.find((m) => m.id === p.id)!;
    return { ...p, id: marker.id, at: marker.position };
  });
  return {
    ...published,
    theme: candidate.theme,
    archetype: candidate.archetype,
    spawn: spawn.position,
    spawnFacing: facing(published.level, spawn.position, pool.points),
    exit: exit.position,
    pickups,
    enemyPosts: runEnemyPosts(published.document, enemyIds),
    disjointRoutes: Math.min(
      ...published.report.navigation!.routes.map((route) =>
        Math.min(
          route.disjointRoutes,
          published.physical.routes.find((r) => r.id === route.id)
            ?.physicalDisjointRoutes ?? 0,
        ),
      ),
    ),
  };
}

function generationSettings(options: GenerationOptions) {
  const attempts = options.attempts ?? 14,
    depth = options.depth ?? 1,
    minRoutes = options.minRoutes ?? 2;
  positiveInteger("attempts", attempts);
  positiveInteger("depth", depth);
  positiveInteger("minRoutes", minRoutes);
  if (
    options.archetype &&
    !NATIVE_ARCHETYPES.some((a) => a.id === options.archetype)
  )
    throw new Error(`Unknown archetype ${options.archetype}.`);
  if (options.theme) theme(options.theme, new Rng(0));
  return { attempts, depth, seed: String(options.seed ?? Date.now()) };
}

export async function generateLevel(
  options: GenerationOptions = {},
): Promise<GenerationResult> {
  const start = performance.now(),
    { attempts, depth, seed } = generationSettings(options),
    reasons: string[] = [];
  for (let attempt = 1; attempt <= attempts; attempt++) {
    aborted(options.signal);
    const candidate = proposeNative(
      `${seed}:v2:${attempt}`,
      depth,
      options.minRoutes ?? 2,
      options.archetype,
      options.theme,
    );
    try {
      return {
        ok: true,
        ...(await publishCandidate(candidate, depth, options)),
        seed,
        depth,
        attempts: attempt,
        ms: performance.now() - start,
      };
    } catch (error) {
      if (!(error instanceof ProducerValidationError)) throw error;
      reasons.push(
        `${candidate.archetype}: ${error.stage}: ${error.diagnostics
          .filter((d) => d.severity === "error")
          .map((d) => d.code)
          .slice(0, 4)
          .join(",")}`,
      );
    }
  }
  return { ok: false, attempts, reasons };
}

/** Publishes authored XML using the same strict native gates as generated candidates. */
async function readSource(
  source: AuthoredSource,
  options: ProducerOptions,
): Promise<ProducedLevel> {
  return produceDocument(parseAml(source.text), options);
}

function placedMarker(
  d: ArchitectureDocument,
  id: string,
  kind: string,
  p: Placement,
): Marker {
  const marker = {
    id,
    kind,
    position: p.position,
    layer: p.layer,
    region: p.area,
  };
  d.markers.push(marker);
  return marker;
}

async function runEndpoints(
  made: ProducedLevel,
  d: ArchitectureDocument,
  rng: Rng,
  options: ProducerOptions,
) {
  const landMarkers = d.markers.filter(isLand);
  const id = identifiers(d),
    declared = landMarkers.find((m) => m.kind === "attacker_spawn");
  let pool = await placementPool(made.level, options, declared?.position);
  const spawn =
    declared ??
    placedMarker(
      d,
      id("run.spawn"),
      "attacker_spawn",
      roomyPoint(pool.points, rng),
    );
  if (!declared)
    pool = await placementPool(made.level, options, spawn.position);
  const declaredExit = landMarkers.find(
    (m) => m.kind === "objective" || m.kind === "site",
  );
  if (!pool.farthest) throw new Error("No supported exit navigation.");
  const exit =
    declaredExit ?? placedMarker(d, id("run.exit"), "objective", pool.farthest);
  return { spawn, exit, pool };
}

type PlannedPickup = Pick<Pickup, "kind" | "variant">;
function placePickups(
  d: ArchitectureDocument,
  points: Placement[],
  spawn: V3,
  rng: Rng,
  kinds: PlannedPickup[],
): Pickup[] {
  const id = identifiers(d),
    placed = spreadPoints(points, kinds.length, spawn, rng, d.player.radius);
  return kinds.map((pickup, i) => {
    const marker = placedMarker(d, id("run.pickup"), "poi", placed[i]);
    marker.label = pickup.variant
      ? `${pickup.kind}:${pickup.variant}`
      : pickup.kind;
    return { id: marker.id, ...pickup, at: marker.position };
  });
}

function proceduralPickups(rng: Rng, depth: number): PlannedPickup[] {
  const out: PlannedPickup[] = [];
  const health = rng.int(2, 3) + (depth > 3 ? 1 : 0),
    ammo = rng.int(3, 5),
    guns = depth === 1 ? 1 : rng.int(1, 2);
  for (let i = 0; i < health; i++) out.push({ kind: "health" });
  for (let i = 0; i < ammo; i++) out.push({ kind: "ammo" });
  if (rng.bool(0.7)) out.push({ kind: "armor" });
  for (let i = 0; i < guns; i++)
    out.push({
      kind: "weapon",
      variant: rng.pick(["smg", "shotgun", "rifle"]),
    });
  return rng.shuffle(out);
}

function pickupKinds(rng: Rng, depth: number, area: number): Pickup["kind"][] {
  const out: Pickup["kind"][] = [];
  for (let i = 0; i < 2 + Math.min(4, Math.floor(depth / 2)); i++)
    out.push("health");
  for (let i = 0; i < 3 + Math.floor(depth / 3); i++) out.push("ammo");
  if (depth >= 2) out.push("armor");
  for (
    let i = 0;
    i < Math.min(5, 2 + Math.floor(area / 1562.5) + (depth >= 4 ? 1 : 0));
    i++
  )
    out.push("weapon");
  return rng.shuffle(out);
}

function navigationArea(nav: NavigationReport): number {
  let area = 0;
  for (let i = 0; i < nav.indices.length; i += 3) {
    const p = nav.indices
      .slice(i, i + 3)
      .map((j) => nav.positions.slice(j * 3, j * 3 + 3));
    area +=
      Math.abs(
        (p[1][0] - p[0][0]) * (p[2][1] - p[0][1]) -
          (p[2][0] - p[0][0]) * (p[1][1] - p[0][1]),
      ) / 2;
  }
  return area;
}

export async function loadAuthored(
  source: AuthoredSource,
  options: AuthoredOptions & ProducerOptions = {},
): Promise<GeneratedLevel> {
  const start = performance.now(),
    depth = options.depth ?? 1;
  positiveInteger("depth", depth);
  const rng = new Rng(options.seed ?? `${source.id}:${depth}`),
    selectedTheme = theme(options.theme, rng);
  const made = await readSource(source, options),
    d = structuredClone(made.document);
  const { spawn, exit, pool } = await runEndpoints(made, d, rng, options);
  const kinds = pickupKinds(
    rng,
    depth,
    navigationArea(made.report.navigation!),
  );
  const pickups = placePickups(
    d,
    pool.points,
    spawn.position,
    rng,
    kinds.map((kind) => ({ kind })),
  );
  const enemyIds = addPosts(d, pool.points, spawn.position);
  const route = identifiers(d)("run.route");
  d.routes.push({ id: route, from: spawn.id, to: exit.id, minRoutes: 1 });
  const published = await produceDocument(d, options),
    actual = published.report.navigation!.routes.find((r) => r.id === route)!;
  const marker = (id: string) =>
    published.document.markers.find((m) => m.id === id)!;
  return {
    ...published,
    theme: selectedTheme,
    archetype: "authored",
    seed: source.id,
    depth,
    spawn: marker(spawn.id).position,
    spawnFacing: facing(published.level, spawn.position, pool.points),
    exit: marker(exit.id).position,
    pickups: pickups.map((p) => ({ ...p, at: marker(p.id).position })),
    enemyPosts: runEnemyPosts(published.document, enemyIds),
    attempts: 1,
    ms: performance.now() - start,
    disjointRoutes: Math.min(
      actual.disjointRoutes,
      published.physical.routes.find((r) => r.id === route)
        ?.physicalDisjointRoutes ?? 0,
    ),
  };
}
