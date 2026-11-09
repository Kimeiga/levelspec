import { Matrix4, Quaternion, Vector3 } from "three";
import { dot, norm, sub } from "../vector/geometry.ts";
import { aborted } from "../vector/types.ts";
import type { AssetGeometry } from "../vector/props.ts";
import { loft, transform, type ResolvedProfile } from "./geometry.ts";
import type { V3 } from "./types.ts";

/** A segment solid permits bounded, local self-intersection validation before union. */
export interface SweepGeometry { geometry: AssetGeometry; segments: AssetGeometry[] }

/** Rotates an oriented section with the minimum rotation between successive tangents. */
function transport(axis: V3, from: V3, to: V3): V3 {
  return new Vector3(...axis).applyQuaternion(new Quaternion().setFromUnitVectors(new Vector3(...from), new Vector3(...to))).toArray() as V3;
}

/**
 * Builds capped, hollow miter sweeps in the authored coordinate system, then places
 * them. Profile XY is the section; parallel transport avoids world-frame twist.
 */
export function sweepGeometry(profile: ResolvedProfile, path: V3[], matrix: Matrix4, signal?: AbortSignal): SweepGeometry {
  if (profile.points.some(point => Math.abs(point[2]) > 1e-7)) throw new Error("Sweep profiles must lie in their local XY plane at Z=0.");
  if (path.length < 2 || Math.hypot(...sub(path[0], path.at(-1)!)) < 1e-8) throw new Error("Sweeps require an open nonzero path.");
  const directions = path.slice(1).map((point, i) => {
    const delta = sub(point, path[i]);
    if (Math.hypot(...delta) < 1e-8) throw new Error("Sweep path has a zero-length segment.");
    return norm(delta);
  });
  const first = new Vector3(...directions[0]), horizontal = new Vector3(0, 0, 1).cross(first);
  let x = (horizontal.length() < 1e-8 ? new Vector3(1, 0, 0) : horizontal.normalize()).toArray() as V3;
  const sections: V3[][] = [];
  for (let i = 0; i < path.length; i++) {
    aborted(signal);
    const incoming = directions[Math.max(0, i - 1)], outgoing = directions[Math.min(i, directions.length - 1)];
    if (dot(incoming, outgoing) < -1 + 1e-7) throw new Error("Sweep path reverses at a cusp.");
    const normal = norm(incoming.map((n, axis) => n + outgoing[axis]) as V3);
    const y = new Vector3(...incoming).cross(new Vector3(...x)).normalize().toArray() as V3;
    sections.push(profile.points.map(point => {
      const offset = x.map((n, axis) => point[0] * n + point[1] * y[axis]) as V3;
      const correction = -dot(offset, normal) / dot(incoming, normal);
      return path[i].map((n, axis) => n + offset[axis] + incoming[axis] * correction) as V3;
    }));
    x = transport(x, incoming, outgoing);
  }
  for (let i = 1; i < sections.length; i++) {
    if (sections[i].some((point, vertex) => dot(sub(point, sections[i - 1][vertex]), directions[i - 1]) <= 1e-8)) {
      throw new Error("Sweep sections fold or overlap along a segment; reduce the section or change the path.");
    }
  }
  const placed = sections.map(section => section.map(point => transform(point, matrix)));
  const geometry = loft(placed, profile.triangles), segments = placed.slice(1).map((section, i) => loft([placed[i], section], profile.triangles));
  if (matrix.determinant() < 0) for (const mesh of [geometry, ...segments]) mesh.triangles = mesh.triangles.map(([a, b, c]) => [c, b, a]);
  return { geometry, segments };
}

/** Checks nonadjacent swept pieces locally before they can be hidden by composition. */
export function validateSweep(sweep: SweepGeometry, session: import('./geometry.ts').SolidSession, original: number, budget: (triangles: number) => void, maximumChecks: number, signal?: AbortSignal): void {
  const solids = sweep.segments.map(mesh => { budget(mesh.triangles.length); return session.mesh(mesh, original); });
  let comparisons = 0;
  for (let i = 0; i < solids.length; i++) for (let j = i + 2; j < solids.length; j++) {
    aborted(signal);
    if (++comparisons > maximumChecks) throw new Error('Sweep intersection-check budget exceeded.');
    const a = solids[i].boundingBox(), b = solids[j].boundingBox();
    if ([0, 1, 2].some(axis => a.max[axis] <= b.min[axis] + 1e-7 || b.max[axis] <= a.min[axis] + 1e-7)) continue;
    if (session.keep(session.kernel.Manifold.intersection([solids[i], solids[j]])).volume() > 1e-9) throw new Error('Sweep intersects itself.');
  }
}
