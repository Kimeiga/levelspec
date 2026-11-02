/**
 * Independent traversal proof: build a standability grid by probing the
 * collision mesh (not LevelSpec's navmesh), plan with A*, then walk the
 * physical controller along the plan. Arrival is what counts, not the plan.
 */
import { closestPointOnTriangle, type CollisionWorld, type Vec3 } from "./collision.ts";
import { stepPlayer, RUN_SPEED, type PlayerShape, type PlayerState } from "./controller.ts";

interface Node { x: number; z: number; y: number }
export interface WalkResult {
  reached: boolean;
  planned: boolean;
  seconds: number;
  walked: number;
  end: Vec3;
  reason?: string;
}

const CELL = 0.5;

function fits(world: CollisionWorld, shape: PlayerShape, feet: Vec3): boolean {
  for (const t of world.near(feet[0], feet[2], shape.radius + 0.5)) {
    if (Math.abs(world.normals[t][1]) >= Math.cos(shape.slope * Math.PI / 180)) continue;
    const [a, b, c] = world.triangles[t];
    for (let h = shape.step + shape.radius; h <= shape.height - shape.radius + 1e-6; h += shape.radius) {
      const centre: Vec3 = [feet[0], feet[1] + h, feet[2]];
      const q = closestPointOnTriangle(centre, a, b, c);
      if (Math.hypot(centre[0] - q[0], centre[1] - q[1], centre[2] - q[2]) < shape.radius) return false;
    }
  }
  const head = world.raycast([feet[0], feet[1] + 0.05, feet[2]], [0, 1, 0], shape.height - 0.05);
  return !head;
}

/** Every walkable, unobstructed floor height in one grid column. */
function columnFloors(world: CollisionWorld, shape: PlayerShape, x: number, z: number): number[] {
  const floors: number[] = [];
  let y = world.max[1] + 1;
  for (let guard = 0; guard < 64; guard++) {
    const hit = world.raycast([x, y, z], [0, -1, 0], y - world.min[1] + 1);
    if (!hit) break;
    if (hit.normal[1] >= Math.cos(shape.slope * Math.PI / 180) && fits(world, shape, [x, hit.point[1], z]))
      floors.push(hit.point[1]);
    y = hit.point[1] - 0.01;
  }
  return floors;
}

export class WalkGrid {
  readonly nodes: Node[] = [];
  private readonly byColumn = new Map<string, number[]>();
  private readonly shape: PlayerShape;
  constructor(world: CollisionWorld, shape: PlayerShape) {
    this.shape = shape;
    for (let x = world.min[0]; x <= world.max[0]; x += CELL)
      for (let z = world.min[2]; z <= world.max[2]; z += CELL) {
        const key = `${Math.round(x / CELL)},${Math.round(z / CELL)}`;
        for (const y of columnFloors(world, shape, x, z)) {
          const ids = this.byColumn.get(key) ?? [];
          ids.push(this.nodes.push({ x, z, y }) - 1);
          this.byColumn.set(key, ids);
        }
      }
  }
  nearest(p: Vec3): number | undefined {
    let best: number | undefined, bestD = Infinity;
    for (let i = 0; i < this.nodes.length; i++) {
      const n = this.nodes[i], d = Math.hypot(n.x - p[0], (n.y - p[1]) * 3, n.z - p[2]);
      if (d < bestD) { bestD = d; best = i; }
    }
    return bestD < 2 ? best : undefined;
  }
  private neighbours(i: number): number[] {
    const n = this.nodes[i], cx = Math.round(n.x / CELL), cz = Math.round(n.z / CELL), out: number[] = [];
    for (let dx = -1; dx <= 1; dx++)
      for (let dz = -1; dz <= 1; dz++) {
        if (!dx && !dz) continue;
        for (const j of this.byColumn.get(`${cx + dx},${cz + dz}`) ?? [])
          if (Math.abs(this.nodes[j].y - n.y) <= this.shape.step) out.push(j);
      }
    return out;
  }
  path(from: number, to: number): Node[] | undefined {
    const goal = this.nodes[to], cost = new Map([[from, 0]]), came = new Map<number, number>();
    const h = (i: number) => Math.hypot(this.nodes[i].x - goal.x, this.nodes[i].z - goal.z);
    const open: [number, number][] = [[h(from), from]];
    while (open.length) {
      open.sort((a, b) => a[0] - b[0]);
      const [, i] = open.shift()!;
      if (i === to) {
        const route = [this.nodes[i]];
        for (let k = i; came.has(k);) { k = came.get(k)!; route.unshift(this.nodes[k]); }
        return route;
      }
      for (const j of this.neighbours(i)) {
        const c = cost.get(i)! + Math.hypot(this.nodes[j].x - this.nodes[i].x, this.nodes[j].z - this.nodes[i].z);
        if (c < (cost.get(j) ?? Infinity)) {
          cost.set(j, c);
          came.set(j, i);
          open.push([c + h(j), j]);
        }
      }
    }
    return undefined;
  }
}

/** Skip waypoints already reached, including ones rounded past on a corner. */
function nextTarget(route: Node[], target: number, p: Vec3) {
  while (target < route.length - 1 && Math.hypot(route[target].x - p[0], route[target].z - p[2]) < CELL * 1.5) target++;
  return target;
}

/** Follow a planned route at 60 Hz; returns a failure reason or null on arrival. */
function follow(world: CollisionWorld, shape: PlayerShape, route: Node[], state: PlayerState,
  progress: { seconds: number; walked: number }): string | null {
  const dt = 1 / 60, limit = route.length * CELL / RUN_SPEED * 2 + 10, p = state.position;
  let target = 1, stuck = 0;
  while (progress.seconds < limit) {
    target = nextTarget(route, target, p);
    const w = route[target], dx = w.x - p[0], dz = w.z - p[2];
    if (target === route.length - 1 && Math.hypot(dx, dz) < 0.25) return null;
    const before: Vec3 = [...p];
    stepPlayer(world, shape, state, { wish: [dx, dz] }, dt);
    const moved = Math.hypot(p[0] - before[0], p[2] - before[2]);
    progress.walked += moved;
    progress.seconds += dt;
    stuck = moved < RUN_SPEED * dt * 0.05 ? stuck + 1 : 0;
    if (stuck > 60) return "stuck";
    if (p[1] < world.min[1] - 5) return "fell out of the world";
  }
  return "timed out away from goal";
}

/** Plan on the standability grid, then walk the controller along the plan. */
export function walk(world: CollisionWorld, shape: PlayerShape, grid: WalkGrid, start: Vec3, goal: Vec3): WalkResult {
  const from = grid.nearest(start), to = grid.nearest(goal);
  const fail = (reason: string): WalkResult =>
    ({ reached: false, planned: false, seconds: 0, walked: 0, end: start, reason });
  if (from === undefined || to === undefined) return fail("start or goal is not standable");
  const route = grid.path(from, to);
  if (!route) return fail("no route on the standability grid");
  const n0 = grid.nodes[from];
  const state: PlayerState = { position: [n0.x, n0.y, n0.z], verticalSpeed: 0, grounded: true };
  const progress = { seconds: 0, walked: 0 };
  const failure = follow(world, shape, route, state, progress);
  const p = state.position;
  const reached = !failure && Math.hypot(goal[0] - p[0], goal[2] - p[2]) < 1.5 && Math.abs(goal[1] - p[1]) < 0.6;
  return { reached, planned: true, ...progress, end: [...p],
    reason: reached ? undefined : failure ?? "arrived away from the marker" };
}
