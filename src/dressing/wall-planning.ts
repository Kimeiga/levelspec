import { Matrix4, Vector3 } from "three";
import { aborted } from "../vector/types.ts";
import type { V3 } from "../architecture/types.ts";
import type { DressingRule } from "./types.ts";
import { wallSurfaces, type WallSurface } from "./wall-surfaces.ts";

/** Authored receiving geometry retained for source ownership after spatial grouping. */
export interface WallReceiver {
  rule: DressingRule;
  faces: V3[][];
  layer: string;
  inverse: Matrix4;
  continuous: boolean;
}

/** One exposed plane in a connected run; distances run along its local positive X. */
export interface WallSegment extends WallReceiver {
  surface: WallSurface;
  start: Vector3;
  end: Vector3;
  normal: Vector3;
  length: number;
}

/** Contiguous receiving planes with compatible outward normals and a shared height range. */
export interface WallRun {
  segments: WallSegment[];
  length: number;
  bottom: number;
  top: number;
}

/** A stable spatial order makes generation independent of AML recipe ordering. */
function compareSegments(a: WallSegment, b: WallSegment): number {
  return a.start.x - b.start.x || a.start.y - b.start.y || a.surface.bottom - b.surface.bottom
    || a.normal.x - b.normal.x || a.normal.y - b.normal.y || a.rule.host.localeCompare(b.rule.host);
}

/** Joins real shared edges, allowing smooth bends but avoiding endcaps and sharp corners. */
function connects(a: WallSegment, b: WallSegment): boolean {
  return a !== b && a.layer === b.layer && a.surface.vertical && b.surface.vertical && a.normal.dot(b.normal) > 0.5
    && Math.hypot(a.end.x - b.start.x, a.end.y - b.start.y) < 0.025
    && Math.min(a.surface.top, b.surface.top) - Math.max(a.surface.bottom, b.surface.bottom) > 0.5;
}

/**
 * Finds continuous wall runs across host boundaries. Curved mesh facets are
 * construction details, not independent decoration opportunities. Branches stop
 * a run rather than choosing an arbitrary continuation.
 */
export function planWallRuns(receivers: WallReceiver[], signal?: AbortSignal): WallRun[] {
  const segments = receivers.flatMap(receiver => wallSurfaces(receiver.faces).map(surface => ({
    ...receiver, surface,
    start: new Vector3(surface.left, 0, 0).applyMatrix4(surface.frame),
    end: new Vector3(surface.right, 0, 0).applyMatrix4(surface.frame),
    normal: new Vector3(0, 1, 0).transformDirection(surface.frame),
    length: surface.right - surface.left,
  }))).sort(compareSegments);
  const successors = new Map<WallSegment, WallSegment[]>();
  const predecessors = new Map<WallSegment, WallSegment[]>();
  const startsByCell = new Map<string, WallSegment[]>();
  for (const segment of segments) {
    const key = `${Math.floor(segment.start.x / 0.025)},${Math.floor(segment.start.y / 0.025)}`;
    const bucket = startsByCell.get(key) ?? [];
    bucket.push(segment);
    startsByCell.set(key, bucket);
    predecessors.set(segment, []);
  }
  for (const segment of segments) {
    aborted(signal);
    const x = Math.floor(segment.end.x / 0.025), y = Math.floor(segment.end.y / 0.025);
    const next: WallSegment[] = [];
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++)
      for (const candidate of startsByCell.get(`${x + dx},${y + dy}`) ?? [])
        if (connects(segment, candidate)) {
          next.push(candidate);
          predecessors.get(candidate)!.push(segment);
        }
    successors.set(segment, next);
  }
  const visited = new Set<WallSegment>(), runs: WallRun[] = [];
  const starts = [...segments.filter(segment => predecessors.get(segment)!.length !== 1), ...segments];
  for (const start of starts) {
    if (visited.has(start)) continue;
    const run: WallRun = { segments: [], length: 0, bottom: start.surface.bottom, top: start.surface.top };
    let segment: WallSegment | undefined = start;
    while (segment && !visited.has(segment)) {
      const bottom = Math.max(run.bottom, segment.surface.bottom), top = Math.min(run.top, segment.surface.top);
      if (run.segments.length && top - bottom < 0.5) break;
      visited.add(segment);
      run.segments.push(segment);
      run.length += segment.length;
      run.bottom = bottom; run.top = top;
      const next: WallSegment[] = successors.get(segment)!;
      segment = next.length === 1 && predecessors.get(next[0])!.length === 1 ? next[0] : undefined;
    }
    runs.push(run);
  }
  return runs;
}

/** Shared world-space spacing prevents nearby hosts from repeating the same decorative motif. */
export class WallSpacing {
  private placements: { family: string; center: Vector3; spacing: number }[] = [];

  /** Reserves the first allowed alternative at a world-space center; returns no choice when crowded. */
  choose(families: string[], center: Vector3): string | undefined {
    const distances: Record<string, number> = { notice: 1.1, shutter: 5, pipe: 2.5, duct: 4, meter: 2.5 };
    for (const family of families) {
      const spacing = distances[family];
      if (this.placements.some(placed => placed.family === family
        && placed.center.distanceTo(center) < Math.max(spacing, placed.spacing))) continue;
      this.placements.push({ family, center, spacing });
      return family;
    }
    return undefined;
  }
}

/** Converts a proposed assembly center into the shared world-space placement registry. */
export function wallCenter(surface: WallSurface, x: number, z: number, width = 0, height = 0): Vector3 {
  return new Vector3(x + width / 2, 0, z + height / 2).applyMatrix4(surface.frame);
}
