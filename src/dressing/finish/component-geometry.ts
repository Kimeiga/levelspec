import type { V3 } from "../../vector/types.ts";

export interface WeatheringMember { a: V3; b: V3; radius: number }
export interface WeatheringFold { axis: 0 | 1; at: number; concave: boolean }
const dot = (a: V3, b: V3): number => a.reduce((sum, value, axis) => sum + value * b[axis], 0);
const subtract = (a: V3, b: V3): V3 => a.map((value, axis) => value - b[axis]) as V3;
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const clamp = (value: number): number => Math.max(0, Math.min(1, value));

/** Finds nearby points on two finite centerlines; their radii approximate the member envelopes. */
function contact(a: WeatheringMember, b: WeatheringMember): [V3, V3] | undefined {
  const u = subtract(a.b, a.a), v = subtract(b.b, b.a), w = subtract(a.a, b.a);
  const aa = dot(u, u), bb = dot(u, v), cc = dot(v, v), dd = dot(u, w), ee = dot(v, w);
  const determinant = aa * cc - bb * bb;
  let s = determinant > 1e-12 ? clamp((bb * ee - cc * dd) / determinant) : 0;
  let t = cc > 1e-12 ? clamp((bb * s + ee) / cc) : 0;
  s = aa > 1e-12 ? clamp((bb * t - dd) / aa) : 0;
  t = cc > 1e-12 ? clamp((bb * s + ee) / cc) : 0;
  const pa = a.a.map((value, axis) => value + u[axis] * s) as V3;
  const pb = b.a.map((value, axis) => value + v[axis] * t) as V3;
  return Math.hypot(...subtract(pa, pb)) <= a.radius + b.radius + 0.001 ? [pa, pb] : undefined;
}

/** Detects joints within one generated assembly; no global scene or imported-mesh inference is implied. */
export class ComponentGeometry {
  private readonly members: WeatheringMember[] = [];
  private readonly contacts = new Map<WeatheringMember, V3[]>();
  private resolvedCount = -1;
  private readonly edges = new Map<string, { normal: V3; direction: V3; uv: [number, number][] }>();
  private front?: V3;
  private sealed = false;
  readonly folds: WeatheringFold[] = [];

  /** Records actual emitted member endpoints and half-width in world meters. */
  member(a: V3, b: V3, radius: number): WeatheringMember {
    if (this.sealed) throw new Error("Cannot add geometry after weathering sampling begins.");
    const length = Math.hypot(...subtract(b, a));
    const inset = Math.min(radius, length / 2);
    const original = a;
    a = original.map((value, axis) => value + (b[axis] - value) * (length ? inset / length : 0)) as V3;
    b = b.map((value, axis) => value + (original[axis] - value) * (length ? inset / length : 0)) as V3;
    radius = Math.min(radius, Math.max(inset, 0.001));
    const member = { a, b, radius };
    this.members.push(member);
    return member;
  }

  /** Resolves after drawing so later collars and crossing bars can weather earlier members. */
  joints(member: WeatheringMember): V3[] {
    this.seal();
    if (this.resolvedCount !== this.members.length) {
      this.contacts.clear();
      for (const item of this.members) this.contacts.set(item, []);
      for (let i = 0; i < this.members.length; i++) for (let j = i + 1; j < this.members.length; j++) {
        const pair = contact(this.members[i], this.members[j]);
        if (!pair) continue;
        this.contacts.get(this.members[i])!.push(pair[0]);
        this.contacts.get(this.members[j])!.push(pair[1]);
      }
      this.resolvedCount = this.members.length;
    }
    return this.contacts.get(member) ?? [];
  }

  /** Detects front-side folds from shared geometric edges and changing outward normals. */
  face(points: V3[], hint: V3, uv: [number, number][]): void {
    if (this.sealed) throw new Error("Cannot add geometry after weathering sampling begins.");
    const length = Math.hypot(...hint);
    if (length < 1e-9) return;
    const normal = hint.map(value => value / length) as V3;
    this.front ??= normal;
    if (dot(normal, this.front) <= 0) return;
    const geometric = cross(subtract(points[1], points[0]), subtract(points[2], points[0]));
    const winding = Math.sign(dot(geometric, normal));
    for (let i = 0; i < points.length; i++) {
      const next = (i + 1) % points.length;
      const key = [points[i], points[next]].map(point => point.map(value => Math.round(value * 1e5)).join(",")).sort().join("/");
      const previous = this.edges.get(key);
      const direction = subtract(points[next], points[i]).map(value => value * winding) as V3;
      if (!previous) { this.edges.set(key, { normal, direction, uv: [uv[i], uv[next]] }); continue; }
      if (dot(previous.normal, normal) > 0.995) continue;
      const axis = Math.abs(uv[i][0] - uv[next][0]) < 1e-5 ? 0 : Math.abs(uv[i][1] - uv[next][1]) < 1e-5 ? 1 : undefined;
      if (axis === undefined) continue;
      const at = (uv[i][axis] + uv[next][axis]) / 2;
      if (!this.folds.some(fold => fold.axis === axis && Math.abs(fold.at - at) < 1e-5))
        this.folds.push({ axis, at, concave: dot(cross(previous.normal, normal), previous.direction) < 0 });
    }
  }

  /** The appearance compiler samples only after generation, freezing complete assembly exposure. */
  seal(): void { this.sealed = true; }
}
