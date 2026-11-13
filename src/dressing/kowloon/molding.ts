import type { V3 } from "../../architecture/types.ts";
import type { KitSlot } from "../kit-mesh.ts";
import type { Pen } from "../pen.ts";

type ProfilePoint = [number, number];
/** Trimmed endpoints of an original section edge, in depth/height meters. */
export interface ProfileEdge { a: ProfilePoint; b: ProfilePoint }
interface RoundedEdge extends ProfileEdge { na: V3; nb: V3; original?: number }

/** Two-segment tangent fillets inside a convex section, retaining original edge identities. */
function roundedProfile(section: ProfilePoint[], setback: number): { edges: RoundedEdge[]; faces: ProfileEdge[] } {
  const area = section.reduce((sum, a, i) => {
    const b = section[(i + 1) % section.length];
    return sum + a[0] * b[1] - a[1] * b[0];
  }, 0);
  const sign = Math.sign(area);
  const normal = (a: ProfilePoint, b: ProfilePoint): V3 => {
    const dy = b[0] - a[0], dz = b[1] - a[1], length = Math.hypot(dy, dz);
    return [0, sign * dz / length, -sign * dy / length];
  };
  const corners = section.map((point, i) => {
    const previous = section[(i + section.length - 1) % section.length], next = section[(i + 1) % section.length];
    const before = Math.hypot(point[0] - previous[0], point[1] - previous[1]);
    const after = Math.hypot(next[0] - point[0], next[1] - point[1]);
    const cut = Math.min(setback, before * .24, after * .24);
    const a = point.map((value, axis) => value + (previous[axis] - value) * cut / before) as ProfilePoint;
    const b = point.map((value, axis) => value + (next[axis] - value) * cut / after) as ProfilePoint;
    const middle = point.map((value, axis) => (a[axis] + 2 * value + b[axis]) / 4) as ProfilePoint;
    return { a, b, middle, na: normal(previous, point), nb: normal(point, next) };
  });
  const edges: RoundedEdge[] = [], faces: ProfileEdge[] = [];
  for (const [i, corner] of corners.entries()) {
    const next = corners[(i + 1) % corners.length];
    const face = { a: corner.b, b: next.a };
    faces.push(face);
    edges.push({ ...face, na: corner.nb, nb: corner.nb, original: i });
    if (setback > 0) {
      const nm = normal(next.a, next.b);
      edges.push({ a: next.a, b: next.middle, na: next.na, nb: nm },
        { a: next.middle, b: next.b, na: nm, nb: next.nb });
    }
  }
  return { edges, faces };
}

/**
 * Extrudes a convex depth/height section with two-segment smooth fillets inside
 * its original envelope. Setback is meters; zero keeps a sharp profile. Signed
 * miters shift each end by depth and omit joined caps. Returned original-edge
 * endpoints let omitted faces and their textured replacements meet exactly.
 */
export function profiledStrip(pen: Pen, slot: KitSlot, u0: number, u1: number, section: ProfilePoint[], tint: V3, omittedEdges: number[] = [], miters: [number | undefined, number | undefined] = [undefined, undefined], setback = 0): ProfileEdge[] {
  if (!Number.isFinite(setback) || setback < 0) throw new Error("Profile setback must be finite and nonnegative.");
  const { edges, faces } = roundedProfile(section, setback);
  let distance = 0;
  const repeat = pen.mesh.repeat(slot);
  for (const { a, b, na, nb, original } of edges) {
    const start = distance;
    distance += Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (original !== undefined && omittedEdges.includes(original)) continue;
    const hint = na.map((value, axis) => value + nb[axis]) as V3;
    const points: V3[] = [[u0 + (miters[0] ?? 0) * a[0], ...a], [u1 + (miters[1] ?? 0) * a[0], ...a], [u1 + (miters[1] ?? 0) * b[0], ...b], [u0 + (miters[0] ?? 0) * b[0], ...b]];
    pen.face(slot, points, hint, tint, points.map((point, index) => [point[0] * repeat, (index < 2 ? start : distance) * repeat]), [na, na, nb, nb]);
  }
  const outline = edges.map(edge => edge.a);
  for (const [index, [u, normal]] of [[u0, -1], [u1, 1]].entries()) {
    if (miters[index] !== undefined) continue;
    for (let i = 1; i + 1 < outline.length; i++)
      pen.face(slot, [[u, ...outline[0]], [u, ...outline[i]], [u, ...outline[i + 1]]], [normal, 0, 0], tint);
  }
  return faces;
}
