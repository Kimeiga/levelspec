import type { CompiledLevel, V3 } from "../../src/vector/types.ts";
import { physicalWalk } from "../../review/physical-walk.ts";
import { VisibilityGeometry } from "./visibility-geometry.ts";

export interface Bounds { min: V3; max: V3 }
export interface VisibilitySettings {
  spacing: number; eyeHeights: number[]; longDistance: number;
  fovDegrees: number; verticalFovDegrees: number; maxSamples: number; maxPairQueries: number;
}
export interface VisibilityConfig {
  settings?: Partial<VisibilitySettings>;
  points?: { id: string; feet: V3 }[];
  protectedPairs?: { id: string; from: string; to: string }[];
  protectedAreas?: { id: string; from: Bounds; to: Bounds }[];
  holdRegions?: { id: string; bounds: Bounds; approachesComplete: boolean; entries: { id: string; points: V3[] }[] }[];
}
/** maxVisibleDistance includes only tested targets at/above longDistance; zero means none found. */
interface Sample { id: string; feet: V3; regions: string[]; maxVisibleDistance: number; farthest?: string }
interface Hold {
  region: string; sample: string; feet: V3; eyeHeight: number;
  status: "single-sector-candidate" | "split-attention" | "insufficient-evidence";
  horizontalSpan: number | null; verticalSpan: number | null;
  visibleEntries: string[]; hiddenEntries: string[]; unverifiedEntries: string[];
  partialEntries: string[];
  entrySamples: { id: string; visible: number; occluded: number; unsupported: number }[];
}
export interface VisibilityReport {
  settings: VisibilitySettings; samples: Sample[]; complete: boolean; queryCount: number;
  longLines: { from: V3; to: V3; distance: number; horizontalDistance: number; eyeHeight: number }[];
  protectedPairs: { id: string; visible: boolean; heightPairs: { fromHeight: number; toHeight: number; visible: boolean }[] }[];
  protectedAreas: { id: string; testedPairs: number; visiblePairs: number; maxVisibleDistance: number }[];
  holds: Hold[];
  omissions: { unknownMaterials: string[]; dynamicFaces: number; excludedNavigationTriangles: number; rejectedBodySamples: number; pairBudgetReached: boolean; scope: string };
}
const defaults: VisibilitySettings = { spacing: 1, eyeHeights: [1.6, 1.05], longDistance: 35, fovDegrees: 100, verticalFovDegrees: 75, maxSamples: 15000, maxPairQueries: 30_000_000 };

/** Smallest horizontal covering arc in degrees, including the wrap through north. */
export function minimumBearingArc(degrees: number[]): number {
  if (degrees.some(v => !Number.isFinite(v))) throw new Error("Bearings must be finite");
  if (degrees.length < 2) return 0;
  const angles = degrees.map(v => (v % 360 + 360) % 360).sort((a, b) => a - b);
  let gap = angles[0] + 360 - angles.at(-1)!;
  for (let i = 1; i < angles.length; i++) gap = Math.max(gap, angles[i] - angles[i - 1]);
  return 360 - gap;
}

/** Validates finite Z-up coordinates before any geometry or iteration work. */
function point(value: V3): void {
  if (!Array.isArray(value) || value.length !== 3 || value.some(v => !Number.isFinite(v))) throw new Error("Expected finite XYZ coordinates");
}

/** Validates a closed XYZ query box; it does not declare new playable space. */
function bounds(value: Bounds): void {
  point(value.min); point(value.max);
  if (value.min.some((v, i) => v > value.max[i])) throw new Error("Reversed visibility bounds");
}

/** Rejects ambiguous identities, missing endpoints and unbounded/invalid work settings. */
function settingsFor(config: VisibilityConfig): VisibilitySettings {
  const settings = { ...defaults, ...config.settings };
  for (const key of ["spacing", "longDistance", "fovDegrees", "verticalFovDegrees", "maxSamples", "maxPairQueries"] as const) {
    if (!Number.isFinite(settings[key]) || settings[key] <= 0) throw new Error(`Invalid ${key}`);
  }
  if (settings.fovDegrees > 360 || settings.verticalFovDegrees > 180 || !Number.isInteger(settings.maxSamples) || !Number.isInteger(settings.maxPairQueries) || settings.maxSamples > 50000 || settings.maxPairQueries > 100_000_000) throw new Error("Invalid angular or integer budget setting");
  if (!Array.isArray(settings.eyeHeights) || !settings.eyeHeights.length || settings.eyeHeights.length > 8 || settings.eyeHeights.some(v => !Number.isFinite(v) || v <= 0)) throw new Error("Invalid eyeHeights");
  const collection = (values: unknown, limit: number) => { if (values !== undefined && (!Array.isArray(values) || values.length > limit)) throw new Error("Invalid or excessive visibility configuration collection"); };
  collection(config.points, 1000); collection(config.protectedPairs, 1000); collection(config.protectedAreas, 100); collection(config.holdRegions, 100);
  const ids = new Set<string>();
  for (const value of [...config.points ?? [], ...config.protectedPairs ?? [], ...config.protectedAreas ?? [], ...config.holdRegions ?? []]) {
    if (!value.id || ids.has(value.id)) throw new Error(`Duplicate or empty visibility ID: ${value.id}`);
    ids.add(value.id);
  }
  for (const value of config.points ?? []) {
    if (value.id.startsWith("grid-")) throw new Error("Visibility point IDs beginning grid- are reserved");
    point(value.feet);
  }
  const points = new Set((config.points ?? []).map(p => p.id));
  for (const pair of config.protectedPairs ?? []) if (!points.has(pair.from) || !points.has(pair.to)) throw new Error(`Unknown protected point: ${pair.id}`);
  for (const area of config.protectedAreas ?? []) { bounds(area.from); bounds(area.to); }
  let portalPoints = 0;
  for (const region of config.holdRegions ?? []) {
    bounds(region.bounds); const entries = new Set<string>();
    collection(region.entries, 100);
    if (typeof region.approachesComplete !== "boolean") throw new Error("Declare approachesComplete for each hold region");
    for (const entry of region.entries) {
      if (!entry.id || entries.has(entry.id)) throw new Error("Duplicate or empty entry ID");
      collection(entry.points, 100);
      portalPoints += entry.points.length;
      if (portalPoints > 10000) throw new Error("Visibility portal point budget exceeded");
      entries.add(entry.id); for (const value of entry.points) point(value);
    }
  }
  return settings;
}

/** Whether a supported feet position belongs to an explicitly configured query area. */
function within(p: V3, box: Bounds): boolean { return p.every((v, i) => v >= box.min[i] - .03 && v <= box.max[i] + .03); }

/** Interpolates the real navigation surface Z without flattening overlapping levels. */
function height(p: V3, triangle: V3[]): number | undefined {
  const [a, b, c] = triangle;
  const det = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]);
  if (Math.abs(det) < 1e-12) return;
  const u = ((b[1] - c[1]) * (p[0] - c[0]) + (c[0] - b[0]) * (p[1] - c[1])) / det;
  const v = ((c[1] - a[1]) * (p[0] - c[0]) + (a[0] - c[0]) * (p[1] - c[1])) / det;
  if (u < -1e-7 || v < -1e-7 || u + v > 1 + 1e-7) return;
  return u * a[2] + v * b[2] + (1 - u - v) * c[2];
}

/** Samples required navigation components and admits unchanged standing-body support/clearance. */
function observationSamples(level: CompiledLevel, config: VisibilityConfig, settings: VisibilitySettings) {
  const navigation = level.navigation;
  if (!navigation?.indices.length) throw new Error("Visibility audit requires compiled land navigation");
  const allowed = new Set(navigation.componentDetails.filter(c => c.regions.length).map(c => c.id));
  const physical = physicalWalk(level), triangles: V3[][] = [];
  let excluded = 0, rejected = 0;
  for (let i = 0; i < navigation.indices.length; i += 3) {
    if (!allowed.has(navigation.triangleComponents[i / 3])) { excluded++; continue; }
    triangles.push(navigation.indices.slice(i, i + 3).map(index => navigation.positions.slice(index * 3, index * 3 + 3) as V3));
  }
  const samples: Sample[] = [], seen = new Set<string>();
  const support = (feet: V3): V3 | undefined => {
    const onNavigation = triangles.some(t => { const z = height(feet, t); return z !== undefined && Math.abs(z - feet[2]) < .15; });
    if (!onNavigation) return;
    const resolved = physical.resolve(feet, feet, navigation.settings.player);
    if (resolved && Math.abs(resolved[2] - feet[2]) < .1) return resolved;
  };
  const add = (id: string, feet: V3) => {
    if (samples.length >= settings.maxSamples) throw new Error("Visibility sample budget exceeded");
    samples.push({ id, feet, regions: (config.holdRegions ?? []).filter(r => within(feet, r.bounds)).map(r => r.id), maxVisibleDistance: 0 });
  };
  let visited = 0;
  for (const triangle of triangles) {
    const xs = triangle.map(p => p[0]), ys = triangle.map(p => p[1]);
    for (let x = Math.ceil(Math.min(...xs) / settings.spacing); x <= Math.floor(Math.max(...xs) / settings.spacing); x++) {
      for (let y = Math.ceil(Math.min(...ys) / settings.spacing); y <= Math.floor(Math.max(...ys) / settings.spacing); y++) {
        if (++visited > settings.maxSamples * 100) throw new Error("Visibility grid candidate budget exceeded");
        const at: V3 = [x * settings.spacing, y * settings.spacing, 0], z = height(at, triangle);
        if (z === undefined) continue;
        at[2] = z;
        const key = `${x},${y},${Math.round(z * 100)}`;
        if (seen.has(key)) continue; seen.add(key);
        const resolved = physical.resolve(at, at, navigation.settings.player);
        if (!resolved || Math.abs(resolved[2] - z) >= .1) { rejected++; continue; }
        add(`grid-${samples.length}`, resolved);
      }
    }
  }
  for (const value of config.points ?? []) {
    const resolved = support(value.feet);
    if (!resolved) throw new Error(`Unsupported visibility point: ${value.id}`);
    add(value.id, resolved);
  }
  if (!samples.length) throw new Error("Visibility sampled domain is empty; reduce spacing or add supported key points");
  return { samples, support, excluded, rejected };
}

/** Adds an assumed eye height to supported feet; this is a camera study, not crouch simulation. */
function raised(feet: V3, eyeHeight: number): V3 { return [feet[0], feet[1], feet[2] + eyeHeight]; }

/**
 * Audits sampled player-to-player visibility in meters/Z-up and configured entry angular spans.
 * Pair-budget truncation and unsupported opacity remain explicitly incomplete, never a map pass.
 */
export function auditVisibility(level: CompiledLevel, config: VisibilityConfig = {}): VisibilityReport {
  const settings = settingsFor(config), geometry = new VisibilityGeometry(level);
  const { samples, support, excluded, rejected } = observationSamples(level, config, settings);
  let queries = 0, exhausted = false;
  const visible = (a: V3, b: V3): boolean | undefined => {
    if (queries >= settings.maxPairQueries) { exhausted = true; return; }
    queries++; return geometry.visible(a, b);
  };
  const report: VisibilityReport = { settings, samples, complete: true, queryCount: 0, longLines: [], protectedPairs: [], protectedAreas: [], holds: [], omissions: {
    unknownMaterials: geometry.unknownMaterials, dynamicFaces: geometry.omittedDynamicFaces,
    excludedNavigationTriangles: excluded, rejectedBodySamples: rejected, pairBudgetReached: false,
    scope: "Static opaque render segments. Grid origin XY=(0,0), authored-region navigation components including disconnected components, standing-body admission; unassigned roof tops excluded. Separate sampled surfaces do not imply traversal between them. Global pairs use equal eye offsets at both ends on actual different floor Z; protected pairs/areas use every configured height combination. Sample maxVisibleDistance is threshold-qualified, not an exact all-range maximum. Hidden/unverified entries and occluded portal portions remain unknown. Angular spans cover visible entry samples only, a review heuristic, not a perspective-frustum or campability proof. Grid can miss submeter openings; no human, sound, projectile or utility simulation." } };
  const named = new Map(samples.map(p => [p.id, p]));
  for (const pair of config.protectedPairs ?? []) {
    const heightPairs = [];
    for (const fromHeight of settings.eyeHeights) for (const toHeight of settings.eyeHeights) {
      const result = visible(raised(named.get(pair.from)!.feet, fromHeight), raised(named.get(pair.to)!.feet, toHeight));
      if (result !== undefined) heightPairs.push({ fromHeight, toHeight, visible: result });
    }
    report.protectedPairs.push({ id: pair.id, visible: heightPairs.some(p => p.visible), heightPairs });
  }
  for (const area of config.protectedAreas ?? []) {
    const from = samples.filter(p => within(p.feet, area.from)), to = samples.filter(p => within(p.feet, area.to));
    if (!from.length || !to.length) throw new Error(`Protected area has no supported samples: ${area.id}`);
    let testedPairs = 0, visiblePairs = 0, maxVisibleDistance = 0;
    areaPairs: for (const a of from) for (const b of to) for (const ah of settings.eyeHeights) for (const bh of settings.eyeHeights) {
      const A = raised(a.feet, ah), B = raised(b.feet, bh), result = visible(A, B);
      if (result === undefined) break areaPairs;
      testedPairs++;
      if (result) { visiblePairs++; maxVisibleDistance = Math.max(maxVisibleDistance, Math.hypot(...B.map((v, i) => v - A[i]))); }
    }
    report.protectedAreas.push({ id: area.id, testedPairs, visiblePairs, maxVisibleDistance });
  }
  holdRegions: for (const region of config.holdRegions ?? []) {
    const entries = region.entries.map(e => ({ id: e.id, points: e.points.map(p => support(p)), complete: !!e.points.length }));
    for (const sample of samples.filter(p => p.regions.includes(region.id))) for (const eyeHeight of settings.eyeHeights) {
      const observer = raised(sample.feet, eyeHeight), azimuths: number[] = [], elevations: number[] = [];
      if (exhausted) break holdRegions;
      const visibleEntries: string[] = [], hiddenEntries: string[] = [], unverifiedEntries: string[] = [], partialEntries: string[] = [];
      const entrySamples: Hold["entrySamples"] = [];
      for (const entry of entries) {
        let seen = false, uncertain = !entry.complete;
        let visibleCount = 0, occludedCount = 0, unsupportedCount = 0;
        for (const feet of entry.points) {
          if (!feet || Math.hypot(feet[0] - sample.feet[0], feet[1] - sample.feet[1]) < .5) { uncertain = true; unsupportedCount++; continue; }
          const target = raised(feet, eyeHeight), result = visible(observer, target);
          if (result === undefined) { uncertain = true; unsupportedCount++; continue; }
          if (result) {
            seen = true; visibleCount++; const [x, y, z] = target.map((v, i) => v - observer[i]);
            azimuths.push(Math.atan2(y, x) * 180 / Math.PI); elevations.push(Math.atan2(z, Math.hypot(x, y)) * 180 / Math.PI);
          } else occludedCount++;
        }
        entrySamples.push({ id: entry.id, visible: visibleCount, occluded: occludedCount, unsupported: unsupportedCount });
        if (visibleCount && occludedCount) partialEntries.push(entry.id);
        if (seen) visibleEntries.push(entry.id); else if (!uncertain) hiddenEntries.push(entry.id);
        if (uncertain) unverifiedEntries.push(entry.id);
      }
      const horizontalSpan = azimuths.length ? minimumBearingArc(azimuths) : null;
      const verticalSpan = elevations.length ? Math.max(...elevations) - Math.min(...elevations) : null;
      let status: Hold["status"] = "insufficient-evidence";
      if (region.approachesComplete && visibleEntries.length >= 2 && !hiddenEntries.length && !unverifiedEntries.length) {
        status = horizontalSpan! <= settings.fovDegrees + 1e-8 && verticalSpan! <= settings.verticalFovDegrees + 1e-8 ? "single-sector-candidate" : "split-attention";
      }
      report.holds.push({ region: region.id, sample: sample.id, feet: sample.feet, eyeHeight, status, horizontalSpan, verticalSpan, visibleEntries, hiddenEntries, unverifiedEntries, partialEntries, entrySamples });
    }
  }
  const best = new Map<string, { target: Sample; distance: number; eyeHeight: number }>();
  let candidates = 0;
  outer: for (let i = 0; i < samples.length; i++) for (let j = i + 1; j < samples.length; j++) {
    if (++candidates > settings.maxPairQueries || exhausted) { exhausted = true; break outer; }
    const a = samples[i], b = samples[j], distance = Math.hypot(...b.feet.map((v, k) => v - a.feet[k]));
    if (distance < settings.longDistance) continue;
    for (const eyeHeight of settings.eyeHeights) {
      const result = visible(raised(a.feet, eyeHeight), raised(b.feet, eyeHeight));
      if (result === undefined) break outer;
      if (!result) continue;
      for (const [observer, target] of [[a, b], [b, a]]) if (distance > observer.maxVisibleDistance) {
        observer.maxVisibleDistance = distance; observer.farthest = target.id;
        best.set(observer.id, { target, distance, eyeHeight });
      }
    }
  }
  const retained = new Set<string>();
  for (const sample of [...samples].sort((a, b) => b.maxVisibleDistance - a.maxVisibleDistance)) {
    const line = best.get(sample.id); if (!line) continue;
    const id = [sample.id, line.target.id].sort().join("|"); if (retained.has(id)) continue; retained.add(id);
    report.longLines.push({ from: raised(sample.feet, line.eyeHeight), to: raised(line.target.feet, line.eyeHeight), distance: line.distance, horizontalDistance: Math.hypot(sample.feet[0] - line.target.feet[0], sample.feet[1] - line.target.feet[1]), eyeHeight: line.eyeHeight });
    if (report.longLines.length >= 100) break;
  }
  report.queryCount = queries; report.omissions.pairBudgetReached = exhausted;
  report.complete = !exhausted && !geometry.unknownMaterials.length && !geometry.omittedDynamicFaces;
  return report;
}
