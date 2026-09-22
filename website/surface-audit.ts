import type { CompiledLevel } from "../src/vector/types.ts";
type P = [number, number];
type Face = { object: string; surface: string; p: P[]; bounds: number[] };
const cross = (a: P, b: P, c: P) =>
  (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
function intersection(subject: P[], clip: P[]): number {
  let result = subject;
  if (cross(clip[0], clip[1], clip[2]) < 0) clip = [...clip].reverse();
  for (let k = 0; k < 3 && result.length; k++) {
    const a = clip[k],
      b = clip[(k + 1) % 3],
      input = result;
    result = [];
    for (let i = 0; i < input.length; i++) {
      const c = input[i],
        d = input[(i + 1) % input.length],
        sc = cross(a, b, c),
        sd = cross(a, b, d);
      if (sc >= -1e-9) result.push(c);
      if ((sc > 0 && sd < 0) || (sc < 0 && sd > 0)) {
        const t = sc / (sc - sd);
        result.push([c[0] + t * (d[0] - c[0]), c[1] + t * (d[1] - c[1])]);
      }
    }
  }
  return (
    Math.abs(
      result.reduce((s, p, i) => {
        const q = result[(i + 1) % result.length];
        return s + p[0] * q[1] - p[1] * q[0];
      }, 0),
    ) * 0.5
  );
}
/** Diagnostics for same-facing coplanar faces, including architectural cover details. */
export function overlappingSurfaces(level: CompiledLevel) {
  const planes = new Map<string, Face[]>(),
    pairs = new Map<string, number>();
  const { mesh, surfaces } = level;
  for (let t = 0; t < mesh.indices.length; t += 3) {
    const p = mesh.indices
      .slice(t, t + 3)
      .map((i) => mesh.positions.slice(i * 3, i * 3 + 3));
    const a = p[1].map((v, i) => v - p[0][i]),
      b = p[2].map((v, i) => v - p[0][i]);
    const n = [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
      ],
      len = Math.hypot(...n);
    if (len < 1e-10) continue;
    n.forEach((_, i) => (n[i] /= len));
    const d = n.reduce((s, v, i) => s + v * p[0][i], 0),
      key = [...n, d].map((v) => Math.round(v * 1e5)).join(",");
    const drop = n.map(Math.abs).indexOf(Math.max(...n.map(Math.abs))),
      axes = [0, 1, 2].filter((i) => i !== drop);
    const xy = p.map((v) => [v[axes[0]], v[axes[1]]] as P),
      s = surfaces[mesh.surfaces[t / 3]];
    const f: Face = {
      object: s.object,
      surface: s.id,
      p: xy,
      bounds: [
        Math.min(...xy.map((v) => v[0])),
        Math.min(...xy.map((v) => v[1])),
        Math.max(...xy.map((v) => v[0])),
        Math.max(...xy.map((v) => v[1])),
      ],
    };
    const existing = planes.get(key) ?? [];
    for (const other of existing) {
      if (f.object === other.object) continue;
      if (
        f.bounds[0] >= other.bounds[2] - 1e-7 ||
        f.bounds[2] <= other.bounds[0] + 1e-7 ||
        f.bounds[1] >= other.bounds[3] - 1e-7 ||
        f.bounds[3] <= other.bounds[1] + 1e-7
      )
        continue;
      const area = intersection(f.p, other.p);
      if (area > 1e-6) {
        const pair = [f.object, other.object].sort().join(" / ");
        pairs.set(pair, (pairs.get(pair) ?? 0) + area / Math.abs(n[drop]));
      }
    }
    existing.push(f);
    planes.set(key, existing);
  }
  return [...pairs]
    .map(([objects, area]) => ({ objects, area }))
    .sort((a, b) => b.area - a.area);
}
