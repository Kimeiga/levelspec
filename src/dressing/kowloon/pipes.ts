import type { V3 } from "../../architecture/types.ts";
import type { Pen } from "../pen.ts";
import { createPipeRunoff, PipeRunoffSurface, type RunoffRing } from "../finish/pipe-runoff.ts";
import { createMetalSurface } from "../finish/metal-surface.ts";
import { finishSeed } from "../wall-surface.ts";
import { Kit } from "./kit.ts";
import { bolt, member } from "./signs/steel.ts";

const add = (a: V3, b: V3): V3 => a.map((v, i) => v + b[i]) as V3;
const sub = (a: V3, b: V3): V3 => a.map((v, i) => v - b[i]) as V3;
const scale = (a: V3, s: number): V3 => a.map(v => v * s) as V3;
const dot = (a: V3, b: V3): number => a.reduce((sum, v, i) => sum + v * b[i], 0);
const cross = (a: V3, b: V3): V3 => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
const unit = (v: V3): V3 => scale(v, 1 / Math.hypot(...v));
const micrometers = (value: number): number => Math.round(value * 1e6) / 1e6;

/** Axial socket extent, shared by fitting geometry and its weathering rims. */
function socketLength(radius: number): number { return radius * 1.4; }

/** Axial strap extent, shared by fitting geometry and its weathering rims. */
function strapLength(radius: number): number { return Math.max(0.024, radius * 0.65); }

/** Pipe dimensions are meters in the pen frame; color is linear RGB. A variant shares its finish across instances. */
export interface PipeOptions {
  radius: number;
  color: V3;
  /** Supplies aging controls; pipes default to 128 texels/m even when the building has no explicit density. */
  kit?: Kit;
  sides?: number;
  variant?: string;
}

const runoffCache = new WeakMap<object, Map<string, (u: number, v: number) => number>>();

interface Ring { center: V3; radial: V3; tangent: V3; distance: number }

/** Rejects invalid positions before appending a component. */
function point(p: V3): void {
  if (p.length !== 3 || !p.every(Number.isFinite)) throw new Error("Pipe positions must be finite 3D points.");
}

/** Returns a stable perpendicular direction for a straight cylinder. */
function perpendicular(axis: V3): V3 {
  return unit(cross(axis, Math.abs(axis[2]) > 0.9 ? [1, 0, 0] : [0, 0, 1]));
}

/**
 * Modular visual plumbing: straight barrels, tangent circular elbows, socket
 * couplings and bolted wall straps. Connections, not mesh facets, receive grime.
 * Receivers reuse complete PBR maps within a compile, including across hosts.
 */
export class PipeSystem {
  private readonly pen: Pen;
  private readonly options: PipeOptions;
  private readonly sides: number;

  constructor(pen: Pen, options: PipeOptions) {
    if (!Number.isFinite(options.radius) || options.radius <= 0
      || options.color.length !== 3 || options.color.some(v => !Number.isFinite(v) || v < 0)
      || (options.sides !== undefined && (!Number.isInteger(options.sides) || options.sides < 8 || options.sides > 64)))
      throw new Error("Pipes require a positive radius, finite nonnegative color and 8–64 radial segments.");
    this.pen = pen;
    const kit = options.kit;
    this.options = { ...options, color: [...options.color], kit };
    this.sides = options.sides ?? 16;
  }

  /** Draws one straight barrel. Optional seam distances identify the rims of fitted collars along its axis. */
  straight(a: V3, b: V3, seams: number[] = []): void {
    point(a); point(b);
    const length = Math.hypot(...sub(b, a));
    if (length < 1e-6) throw new Error("A pipe barrel needs distinct endpoints.");
    if (seams.some(s => !Number.isFinite(s) || s < 0 || s > length)) throw new Error("Pipe seams must lie on the barrel.");
    const tangent = unit(sub(b, a)), radial = perpendicular(tangent);
    this.sweep([{ center: a, radial, tangent, distance: 0 }, { center: b, radial, tangent, distance: length }], this.options.radius, seams);
  }

  /**
   * Draws a circular elbow between tangent points a/b whose tangent lines meet
   * at corner. Both setbacks must agree; the centerline radius must exceed the bore's outer radius.
   * Socketed elbows receive drip sources beneath the fitted socket rims.
   */
  bend(a: V3, corner: V3, b: V3, socketed = false): void {
    [a, corner, b].forEach(point);
    const incoming = sub(corner, a), outgoing = sub(b, corner);
    const setback = Math.hypot(...incoming), next = Math.hypot(...outgoing);
    if (setback < 1e-6 || Math.abs(setback - next) > 1e-6) throw new Error("Elbow tangent setbacks must be equal and positive.");
    const start = unit(incoming), end = unit(outgoing);
    const angle = Math.acos(Math.max(-1, Math.min(1, dot(start, end))));
    const radius = setback / Math.tan(angle / 2);
    if (angle < 1e-4 || angle > Math.PI - 1e-4 || radius <= this.options.radius * 1.05)
      throw new Error("Elbow must turn without reversing and have clearance inside its bend.");
    const normal = unit(cross(start, end));
    const towardCenter = cross(normal, start);
    const center = add(a, scale(towardCenter, radius));
    const radial = scale(towardCenter, -1);
    const steps = Math.max(4, Math.ceil(angle / (Math.PI / 24)));
    const rings: Ring[] = [];
    for (let i = 0; i <= steps; i++) {
      const theta = angle * i / steps;
      const direction = add(scale(radial, Math.cos(theta)), scale(start, Math.sin(theta)));
      const tangent = add(scale(start, Math.cos(theta)), scale(radial, -Math.sin(theta)));
      rings.push({ center: add(center, scale(direction, radius)), radial: direction, tangent, distance: radius * theta });
    }
    const socketHalf = socketLength(this.options.radius) / 2;
    const rims = socketed ? [socketHalf, radius * angle - socketHalf].filter(at => at > 0 && at < radius * angle) : [];
    this.sweep(rings, this.options.radius, rims);
  }

  /** Draws a raised socket with beveled shoulders; center and axis define its reusable connection frame. */
  coupling(center: V3, axis: V3): void {
    point(center); point(axis);
    if (Math.hypot(...axis) < 1e-6) throw new Error("Coupling axis must be nonzero.");
    this.sleeve(center, unit(axis), this.options.radius * 1.23, socketLength(this.options.radius));
  }

  /** Draws a strap, standoff, two mounting ears and bolts, on a wall perpendicular to the center-to-wall direction. */
  mount(center: V3, axis: V3, wallPoint: V3): void {
    [center, axis, wallPoint].forEach(point);
    const gap = Math.hypot(...sub(center, wallPoint));
    if (Math.hypot(...axis) < 1e-6 || gap < this.options.radius * 1.15)
      throw new Error("Pipe mount requires a nonzero axis and wall clearance.");
    const tangent = unit(axis), out = unit(sub(center, wallPoint));
    if (Math.abs(dot(tangent, out)) > 1e-4) throw new Error("Pipe mount axis must run parallel to its wall.");
    const across = unit(cross(tangent, out)), r = this.options.radius;
    const steel = { slot: "metal" as const, tint: this.options.color, weathering: this.options.kit };
    this.sleeve(center, tangent, r * 1.12, strapLength(r));
    member(this.pen, steel, add(wallPoint, scale(out, 0.006)), add(center, scale(out, -r * 0.9)), across, r * 0.6, Math.max(0.018, r * 0.45));
    const plateCenter = add(wallPoint, scale(out, 0.006));
    member(this.pen, steel, add(plateCenter, scale(across, -r * 1.9)), add(plateCenter, scale(across, r * 1.9)), tangent, Math.max(0.045, r * 0.9), 0.012);
    for (const sign of [-1, 1]) bolt(this.pen, steel, add(add(wallPoint, scale(out, 0.012)), scale(across, sign * r * 1.5)), out, Math.max(0.006, r * 0.14));
  }

  /**
   * Rounds a polyline into barrels and socketed elbows. Mounts fit vertical runs
   * against local Y=wallY; omit wallY for freestanding plumbing. Tight corners
   * are rejected rather than emitting self-intersecting elbows.
   */
  run(path: V3[], wallY?: number): void {
    if (path.length < 2) throw new Error("Pipe route needs at least two points.");
    path.forEach(point);
    if (wallY !== undefined && !Number.isFinite(wallY)) throw new Error("Pipe wall plane must be finite.");
    const route = path.filter((p, i) => !i || Math.hypot(...sub(p, path[i - 1])) > 1e-6);
    if (route.length < 2) throw new Error("Pipe route needs distinct points.");
    const starts = route.map(p => [...p] as V3), ends = route.map(p => [...p] as V3);
    const bends: { a: V3; corner: V3; b: V3 }[] = [];
    for (let i = 1; i + 1 < route.length; i++) {
      const before = sub(route[i], route[i - 1]), after = sub(route[i + 1], route[i]);
      const a = unit(before), b = unit(after), angle = Math.acos(Math.max(-1, Math.min(1, dot(a, b))));
      if (angle < 1e-4) continue;
      const setback = Math.min(this.options.radius * 2.5 * Math.tan(angle / 2), Math.hypot(...before) * 0.4, Math.hypot(...after) * 0.4);
      if (angle > Math.PI - 1e-4 || setback / Math.tan(angle / 2) <= this.options.radius * 1.05)
        throw new Error("Pipe route corner is too tight for its diameter.");
      ends[i] = add(route[i], scale(a, -setback));
      starts[i] = add(route[i], scale(b, setback));
      bends.push({ a: ends[i], corner: route[i], b: starts[i] });
    }
    for (let i = 1; i + 2 < route.length; i++) {
      const hasStartSocket = Math.hypot(...sub(starts[i], route[i])) > 1e-6;
      const hasEndSocket = Math.hypot(...sub(ends[i + 1], route[i + 1])) > 1e-6;
      if (hasStartSocket && hasEndSocket && Math.hypot(...sub(ends[i + 1], starts[i])) < socketLength(this.options.radius))
        throw new Error("Pipe route leaves insufficient room between elbow sockets.");
    }
    for (let i = 0; i + 1 < route.length; i++) {
      const a = starts[i], b = ends[i + 1], length = Math.hypot(...sub(b, a)), axis = unit(sub(b, a));
      const mounts: number[] = [];
      if (wallY !== undefined && Math.abs(axis[2]) > 0.999 && a[1] - wallY >= this.options.radius * 1.15)
        for (let distance = 0.6; distance < length - 0.2; distance += 1.5) mounts.push(distance);
      const seams: number[] = [];
      for (let distance = 2.4; distance < length - 0.3; distance += 2.4) seams.push(distance);
      const socketHalf = socketLength(this.options.radius) / 2;
      const strapHalf = strapLength(this.options.radius) / 2;
      const rims = [
        ...mounts.flatMap(at => [at - strapHalf, at + strapHalf]),
        ...seams.flatMap(at => [at - socketHalf, at + socketHalf]),
      ];
      if (Math.hypot(...sub(a, route[i])) > 1e-6) rims.push(socketHalf);
      if (Math.hypot(...sub(b, route[i + 1])) > 1e-6) rims.push(length - socketHalf);
      this.straight(a, b, rims.filter(at => at >= 0 && at <= length));
      for (const distance of seams) this.coupling(add(a, scale(axis, distance)), axis);
      for (const distance of mounts) {
        const center = add(a, scale(axis, distance));
        this.mount(center, axis, [center[0], wallY!, center[2]]);
      }
    }
    for (const bend of bends) {
      this.bend(bend.a, bend.corner, bend.b, true);
      this.coupling(bend.a, sub(bend.corner, bend.a));
      this.coupling(bend.b, sub(bend.b, bend.corner));
    }
  }

  /** Builds an annular fitting with sloped shoulders, avoiding coplanar barrel overlays. */
  private sleeve(center: V3, tangent: V3, outer: number, length: number): void {
    const r = this.options.radius, radial = perpendicular(tangent);
    const profile = [[-length / 2, r * 1.005], [-length * 0.38, outer], [length * 0.38, outer], [length / 2, r * 1.005]];
    const rings = profile.map(([z]) => ({ center: add(center, scale(tangent, z)), tangent, radial, distance: z + length / 2 }));
    this.sweep(rings, outer, [], profile.map(([, radius]) => radius));
  }

  /** Emits a smooth cylinder/torus strip and one periodic, scene-shared appearance receiver for the entire piece. */
  private sweep(rings: Ring[], radius: number, seams: number[], radii?: number[]): void {
    const pen = this.pen, { kit, color } = this.options;
    const circumference = 2 * Math.PI * radius, length = micrometers(rings.at(-1)!.distance);
    const firstTriangle = pen.mesh.triangleCount;
    const vertex = (ring: Ring, side: number, r: number) => {
      const angle = side / this.sides * Math.PI * 2;
      const normal = add(scale(ring.radial, Math.cos(angle)), scale(cross(ring.tangent, ring.radial), Math.sin(angle)));
      return { at: add(ring.center, scale(normal, r)), normal, uv: [circumference * side / this.sides, micrometers(ring.distance)] };
    };
    for (let row = 0; row + 1 < rings.length; row++) for (let side = 0; side < this.sides; side++) {
      const slope = radii ? (radii[row + 1] - radii[row]) / (rings[row + 1].distance - rings[row].distance) : 0;
      const corners = [[row, side], [row, side + 1], [row + 1, side + 1], [row + 1, side]].map(([r, s]) => vertex(rings[r], s, radii?.[r] ?? radius));
      if (slope) for (let i = 0; i < corners.length; i++) {
        const ring = rings[i < 2 ? row : row + 1];
        corners[i].normal = unit(sub(corners[i].normal, scale(ring.tangent, slope)));
      }
      pen.face("metal", corners.map(v => v.at), corners[0].normal, kit?.textureDensity ? [1, 1, 1] : color, corners.map(v => v.uv), corners.map(v => v.normal));
    }
    if (!kit?.textureDensity) return;
    const bounds: [number, number, number, number] = [0, 0, circumference, length];
    const material = pen.mesh.material("metal"), coating = pen.mesh.material("paint");
    const origin = pen.world(rings[0].center), zero = pen.world([0, 0, 0]);
    const direction = (vector: V3): V3 => sub(pen.world(vector), zero).map(micrometers) as V3;
    const runoffRings: RunoffRing[] = rings.map((ring, i) => ({
      center: sub(pen.world(ring.center), origin).map(micrometers) as V3,
      radial: direction(ring.radial), across: direction(cross(ring.tangent, ring.radial)),
      radius: radii?.[i] ?? radius, distance: micrometers(ring.distance),
    }));
    const seed = finishSeed(this.options.variant ?? "pipe-standard");
    const runoffSeams = seams.map(micrometers);
    const runoffKey = JSON.stringify([runoffRings, circumference, runoffSeams, seed]);
    let cache = runoffCache.get(pen.mesh);
    if (!cache) { cache = new Map(); runoffCache.set(pen.mesh, cache); }
    const runoff = (u: number, v: number): number => {
      let field = cache.get(runoffKey);
      if (!field) { field = createPipeRunoff(new PipeRunoffSurface(runoffRings, circumference), runoffSeams, seed); cache.set(runoffKey, field); }
      return field(u, v);
    };
    const settings = { kind: "pipe" as const, bounds, wrapU: circumference, paint: color, seed, runoff: radii || !seams.length ? undefined : runoff,
      wear: Math.min(1, kit.wear * 1.6), grime: kit.grime, rust: kit.rust,
      edgeAxes: [false, true] as [boolean, boolean], metric: { scale: [1, 1] as [number, number], gravity: [0, 0] as [number, number] },
      folds: seams.map(at => ({ axis: 1 as const, at: micrometers(at), concave: true })),
      substrate: { material, repeat: pen.mesh.repeat("metal") }, coating: { material: coating, repeat: pen.mesh.repeat("paint") } };
    const metal = createMetalSurface(settings), density = Math.max(128, kit.textureDensity);
    pen.mesh.receive({ id: `${pen.part}/pipe/${firstTriangle}`, firstTriangle, triangleCount: pen.mesh.triangleCount - firstTriangle,
      frame: pen.surfaceFrame(), bounds, materials: [material, coating],
      raster: { coordinates: "uv", scope: "scene", group: `pipe/v6/${JSON.stringify([settings, density, runoffKey])}`, bounds, texelsPerMeter: density,
        get materialKey() { return this.group; },
        bump: "sample" },
      sample: metal.sample });
  }
}
