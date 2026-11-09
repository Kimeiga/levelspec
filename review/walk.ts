import { physicalWalk, supportWindow } from "./physical-walk.ts";
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

/**
 * Prepares a read-only constrained walk on any existing land navigation component.
 * Requested feet must be within .10m of real capsule support. Navigation heights
 * may be smoothed across steps; physical support and standing clearance are checked
 * at each bounded movement substep. This is inspection movement, not gameplay proof.
 */
export function prepareInspectionWalk(level: CompiledLevel, requested: WalkPose): PreparedWalk {
  if (!validPose(requested)) return { ok: false, message: `Invalid feet/orientation. Pitch must be between −${MAX_WALK_PITCH} and ${MAX_WALK_PITCH} degrees.` };
  const navigation = level.navigation;
  if (!navigation?.indices.length) return { ok: false, message: "Land navigation is unavailable; inspection walking requires an existing navigable surface." };
  const player = navigation.settings.player, physical = physicalWalk(level);
  const surface = new NavigationSurface(navigation, requested.feet, (candidate, previous) => physical.resolve(candidate, previous, player));
  const location = surface.locate(requested.feet, false, Math.max(SUPPORT_TOLERANCE, supportWindow(player)));
  if (!location) return { ok: false, message: "No land navigation surface within 0.10m of those feet. Choose supported floor coordinates; no teleport across gaps or heights." };
  const feet = physical.resolve(location.point, requested.feet, player);
  if (!feet) return { ok: false, message: "The standing player body intersects collision geometry at those feet. Choose a clear placement." };
  if (Math.abs(feet[2] - requested.feet[2]) > SUPPORT_TOLERANCE + 1e-6) return { ok: false, message: "No physical support within 0.10m of those feet. Choose supported floor coordinates." };
  return { ok: true, pose: { feet, yaw: requested.yaw, pitch: requested.pitch }, surface };
}
