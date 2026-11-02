/**
 * First-person character controller: a stack of spheres for walls, downward
 * rays for floors and step-up, gravity, and an optional jump. Positions are
 * feet positions in glTF Y-up metres.
 */
import { closestPointOnTriangle, type CollisionWorld, type Vec3 } from "./collision.ts";

export interface PlayerShape {
  radius: number;
  height: number;
  /** Highest ledge walked up without jumping. */
  step: number;
  /** Steepest walkable slope, degrees. */
  slope: number;
}
export interface PlayerState {
  position: Vec3;
  verticalSpeed: number;
  grounded: boolean;
}
export interface MoveInput {
  /** Desired horizontal direction (x, z); scaled to length <= 1. */
  wish: [number, number];
  jump?: boolean;
}

export const RUN_SPEED = 5;
const GRAVITY = 20, JUMP_SPEED = 5.2, SNAP = 0.3, SUBSTEP = 0.08;

const walkable = (normalY: number, shape: PlayerShape) => normalY >= Math.cos(shape.slope * Math.PI / 180);

/** Sphere centres, from just above step height to the head. */
function sphereHeights(shape: PlayerShape) {
  const low = shape.step + shape.radius, high = shape.height - shape.radius;
  return [low, (low + high) / 2, high];
}

/** Push the body horizontally out of one triangle; returns whether it moved. */
function pushOut(world: CollisionWorld, shape: PlayerShape, p: Vec3, t: number): boolean {
  const [a, b, c] = world.triangles[t];
  let moved = false;
  for (const h of sphereHeights(shape)) {
    const centre: Vec3 = [p[0], p[1] + h, p[2]];
    const q = closestPointOnTriangle(centre, a, b, c);
    const dx = centre[0] - q[0], dz = centre[2] - q[2], horizontal = Math.hypot(dx, dz);
    const distance = Math.hypot(dx, centre[1] - q[1], dz);
    if (distance >= shape.radius || horizontal < 1e-6) continue;
    const push = (shape.radius - distance) + 1e-4;
    p[0] += dx / horizontal * push;
    p[2] += dz / horizontal * push;
    moved = true;
  }
  return moved;
}

/** Push the body out of non-walkable triangles until nothing overlaps. */
function resolveWalls(world: CollisionWorld, shape: PlayerShape, p: Vec3) {
  for (let iteration = 0; iteration < 4; iteration++) {
    let moved = false;
    for (const t of world.near(p[0], p[2], shape.radius + 0.5))
      if (!walkable(world.normals[t][1], shape) && pushOut(world, shape, p, t)) moved = true;
    if (!moved) break;
  }
}

/** Stop a jump at the ceiling instead of letting the head pass through it. */
function hitCeiling(world: CollisionWorld, shape: PlayerShape, p: Vec3, rise: number) {
  return world.raycast([p[0], p[1] + shape.step, p[2]], [0, 1, 0], shape.height - shape.step + rise) !== null;
}

/** Highest walkable floor under the footprint, searched from step height down. */
function groundBelow(world: CollisionWorld, shape: PlayerShape, p: Vec3, reach: number): number | null {
  const r = shape.radius * 0.6;
  let best: number | null = null;
  for (const [ox, oz] of [[0, 0], [r, 0], [-r, 0], [0, r], [0, -r]]) {
    const origin: Vec3 = [p[0] + ox, p[1] + shape.step + 0.05, p[2] + oz];
    const hit = world.raycast(origin, [0, -1, 0], shape.step + 0.05 + reach);
    if (hit && walkable(Math.abs(hit.normal[1]), shape) && (best === null || hit.point[1] > best))
      best = hit.point[1];
  }
  return best;
}

export function stepPlayer(world: CollisionWorld, shape: PlayerShape, state: PlayerState,
  input: MoveInput, dt: number, speed = RUN_SPEED) {
  const length = Math.hypot(...input.wish), k = length > 1 ? 1 / length : 1;
  const vx = input.wish[0] * k * speed, vz = input.wish[1] * k * speed;
  if (input.jump && state.grounded) {
    state.verticalSpeed = JUMP_SPEED;
    state.grounded = false;
  }
  const steps = Math.max(1, Math.ceil(Math.max(Math.hypot(vx, vz), Math.abs(state.verticalSpeed)) * dt / SUBSTEP));
  const h = dt / steps;
  for (let i = 0; i < steps; i++) {
    state.position[0] += vx * h;
    state.position[2] += vz * h;
    resolveWalls(world, shape, state.position);
    moveVertically(world, shape, state, h);
  }
  return state;
}

/** Gravity, ceilings, and landing or step-up for one substep. */
function moveVertically(world: CollisionWorld, shape: PlayerShape, state: PlayerState, h: number) {
  const p = state.position;
  if (state.verticalSpeed > 0 && hitCeiling(world, shape, p, state.verticalSpeed * h)) state.verticalSpeed = 0;
  if (!state.grounded || state.verticalSpeed > 0) state.verticalSpeed -= GRAVITY * h;
  const reach = state.grounded ? SNAP : Math.max(0, -state.verticalSpeed * h);
  const ground = state.verticalSpeed > 0 ? null : groundBelow(world, shape, p, reach);
  state.grounded = ground !== null;
  if (ground !== null) {
    p[1] = ground;
    state.verticalSpeed = 0;
  } else {
    p[1] += state.verticalSpeed * h;
  }
}
