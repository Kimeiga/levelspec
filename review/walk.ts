import { Ray, Triangle, Vector3 } from "three";
import { collisionMesh } from "../src/vector/collision.ts";
import type { CompiledLevel, V3 } from "../src/vector/types.ts";
import { NavigationSurface } from "../website/navigation.ts";

export const MAX_WALK_PITCH = 80;
const SUPPORT_TOLERANCE = 0.1;
export const WALK_PARAMETERS = ["walk-feet", "walk-yaw", "walk-pitch"] as const;

/** Inspection-only pose: feet in Z-up meters; yaw0 faces+X, yaw90 faces+Y, positive pitch looks up. */
export interface WalkPose { feet: V3; yaw: number; pitch: number }
export type WalkStartResult = { ok: true; pose: WalkPose } | { ok: false; message: string };
type PreparedWalk = { ok: true; pose: WalkPose; surface: NavigationSurface } | { ok: false; message: string };

/** Rejects invalid direct API calls as well as parsed URLs before changing active inspection state. */
function validPose(pose: WalkPose): boolean {
  return Array.isArray(pose.feet) && pose.feet.length === 3 && [...pose.feet, pose.yaw, pose.pitch].every(Number.isFinite) && Math.abs(pose.pitch) <= MAX_WALK_PITCH;
}

/** Parses an optional complete feet pose; omitted angles default to zero degrees. */
export function parseWalkPose(parameters: URLSearchParams): WalkPose | undefined {
  const feet = parameters.get("walk-feet");
  if (feet === null) {
    if (parameters.has("walk-yaw") || parameters.has("walk-pitch")) throw new Error("walk-feet is required with walk orientation.");
    return undefined;
  }
  const angles = [parameters.get("walk-yaw") ?? "0", parameters.get("walk-pitch") ?? "0"];
  const pose = { feet: feet.trim().split(/[\s,]+/).map(Number) as V3, yaw: Number(angles[0]), pitch: Number(angles[1]) };
  if (!feet.trim() || angles.some(value => !value.trim()) || !validPose(pose))
    throw new Error(`Walk requires three finite feet coordinates, finite yaw, and pitch between −${MAX_WALK_PITCH} and ${MAX_WALK_PITCH} degrees.`);
  return pose;
}

/** Encodes the actual inspection pose without changing source, overview or presentation URL context. */
export function walkURL(base: string, pose: WalkPose): string {
  if (!validPose(pose)) throw new Error("Cannot share an invalid inspection pose.");
  const url = new URL(base);
  url.searchParams.set("walk-feet", pose.feet.join(" "));
  url.searchParams.set("walk-yaw", String(pose.yaw));
  url.searchParams.set("walk-pitch", String(pose.pitch));
  return url.href;
}

/** Returns distance between finite segments, including parallel and degenerate endpoints. */
function segmentDistance(p: Vector3, q: Vector3, a: Vector3, b: Vector3): number {
  const d = q.clone().sub(p), e = b.clone().sub(a), r = p.clone().sub(a);
  const dd = d.dot(d), ee = e.dot(e), er = e.dot(r), dr = d.dot(r), de = d.dot(e);
  let s = 0, t = 0;
  if (dd <= 1e-16 && ee <= 1e-16) return p.distanceTo(a);
  if (dd <= 1e-16) t = Math.max(0, Math.min(1, er / ee));
  else if (ee <= 1e-16) s = Math.max(0, Math.min(1, -dr / dd));
  else {
    const denominator = dd * ee - de * de;
    s = denominator ? Math.max(0, Math.min(1, (de * er - dr * ee) / denominator)) : 0;
    t = (de * s + er) / ee;
    if (t < 0) { t = 0; s = Math.max(0, Math.min(1, -dr / dd)); }
    else if (t > 1) { t = 1; s = Math.max(0, Math.min(1, (de - dr) / dd)); }
  }
  return p.clone().addScaledVector(d, s).distanceTo(a.clone().addScaledVector(e, t));
}

/** Measures the capsule center segment against actual collision triangles, with tangency allowed. */
function bodyBlocked(level: CompiledLevel, feet: V3, height: number, radius: number): boolean {
  const a = new Vector3(feet[0], feet[1], feet[2] + radius);
  const b = new Vector3(feet[0], feet[1], feet[2] + height - radius);
  const ray = new Ray(a, new Vector3(0, 0, 1)), mesh = collisionMesh(level);
  const interiorRay = new Ray(a.clone().add(b).multiplyScalar(0.5), new Vector3(1, .173, .319).normalize());
  const crossings = new Map<string, number[]>();
  for (let i = 0; i < mesh.indices.length; i += 3) {
    const triangle = new Triangle(...mesh.indices.slice(i, i + 3).map(index => new Vector3(...mesh.positions.slice(index * 3, index * 3 + 3))) as [Vector3, Vector3, Vector3]);
    const crossing = interiorRay.intersectTriangle(triangle.a, triangle.b, triangle.c, false, new Vector3());
    if (crossing) {
      const distance = crossing.distanceTo(interiorRay.origin);
      const shell = level.surfaces[mesh.surfaces[i / 3]].mesh;
      const hits = crossings.get(shell) ?? [];
      if (distance > 1e-8 && !hits.some(hit => Math.abs(hit - distance) < 1e-6)) hits.push(distance);
      crossings.set(shell, hits);
    }
    const hit = ray.intersectTriangle(triangle.a, triangle.b, triangle.c, false, new Vector3());
    if (hit && hit.z <= b.z + 1e-9) return true;
    const distance = Math.min(a.distanceTo(triangle.closestPointToPoint(a, new Vector3())), b.distanceTo(triangle.closestPointToPoint(b, new Vector3())), segmentDistance(a, b, triangle.a, triangle.b), segmentDistance(a, b, triangle.b, triangle.c), segmentDistance(a, b, triangle.c, triangle.a));
    if (distance < radius - 1e-5) return true;
  }
  return [...crossings.values()].some(hits => hits.length % 2 === 1);
}

/**
 * Prepares a read-only constrained walk on any existing land navigation component.
 * Feet within .10m resolve to its actual elevation; other unsupported starts fail.
 * Actual standing-capsule placement is checked, but subsequent motion retains the
 * existing eroded-navigation walker, not a new physics or reachability proof.
 */
export function prepareInspectionWalk(level: CompiledLevel, requested: WalkPose): PreparedWalk {
  if (!validPose(requested)) return { ok: false, message: `Invalid feet/orientation. Pitch must be between −${MAX_WALK_PITCH} and ${MAX_WALK_PITCH} degrees.` };
  const navigation = level.navigation;
  if (!navigation?.indices.length) return { ok: false, message: "Land navigation is unavailable; inspection walking requires an existing navigable surface." };
  const surface = new NavigationSurface(navigation, requested.feet);
  const location = surface.locate(requested.feet, false, SUPPORT_TOLERANCE);
  if (!location) return { ok: false, message: "No land navigation surface within 0.10m of those feet. Choose supported floor coordinates; no teleport across gaps or heights." };
  const { height, radius } = navigation.settings.player;
  if (bodyBlocked(level, location.point, height, radius)) return { ok: false, message: "The standing player body intersects collision geometry at those feet. Choose a clear placement." };
  return { ok: true, pose: { feet: [...location.point], yaw: requested.yaw, pitch: requested.pitch }, surface };
}
