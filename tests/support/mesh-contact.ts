import { Box3, Ray, Triangle, Vector3 } from "three";

type Face = [Vector3, Vector3, Vector3];
const ROUNDING = .00002;

/** Rejects penetration while permitting coplanar resting contact and shared boundaries. */
function crosses(left: Triangle, right: Triangle): boolean {
  for (const [face, target] of [[left, right], [right, left]]) {
    const normal = target.getNormal(new Vector3());
    const distances = [face.a, face.b, face.c].map(point => point.clone().sub(target.a).dot(normal));
    if (Math.min(...distances) >= -ROUNDING || Math.max(...distances) <= ROUNDING) return false;
  }
  for (const [face, target] of [[left, right], [right, left]]) {
    const points = [face.a, face.b, face.c];
    for (let index = 0; index < 3; index++) {
      const origin = points[index], direction = points[(index + 1) % 3].clone().sub(origin), length = direction.length();
      const hit = new Ray(origin, direction.normalize()).intersectTriangle(target.a, target.b, target.c, false, new Vector3());
      if (hit && hit.distanceTo(origin) > ROUNDING && hit.distanceTo(origin) < length - ROUNDING) return true;
    }
  }
  return false;
}

/** Finds closest points on two finite edges, including parallel edges and endpoint constraints. */
function closestEdges(p: Vector3, endP: Vector3, q: Vector3, endQ: Vector3): [Vector3, Vector3] {
  const a = endP.clone().sub(p), b = endQ.clone().sub(q), offset = p.clone().sub(q);
  const aa = a.lengthSq(), bb = b.lengthSq(), ab = a.dot(b), ap = a.dot(offset), bp = b.dot(offset);
  const denominator = aa * bb - ab * ab;
  let s = denominator > 1e-18 ? Math.max(0, Math.min(1, (ab * bp - ap * bb) / denominator)) : 0;
  let t = (ab * s + bp) / bb;
  if (t < 0) { t = 0; s = Math.max(0, Math.min(1, -ap / aa)); }
  else if (t > 1) { t = 1; s = Math.max(0, Math.min(1, (ab - ap) / aa)); }
  return [p.clone().addScaledVector(a, s), q.clone().addScaledVector(b, t)];
}

/** Gives a lower bound on surface distance, so distant triangle pairs need no narrow check. */
function boxDistanceSquared(left: Box3, right: Box3): number {
  const x = Math.max(0, left.min.x - right.max.x, right.min.x - left.max.x);
  const y = Math.max(0, left.min.y - right.max.y, right.min.y - left.max.y);
  const z = Math.max(0, left.min.z - right.max.z, right.min.z - left.max.z);
  return x * x + y * y + z * z;
}

/** Reports actual closest surface witnesses within `tolerance`, and any proper triangle crossing. */
export function surfaceContact(left: Face[], right: Face[], tolerance: number) {
  let distance = Infinity;
  let points: [Vector3, Vector3] | undefined;
  const a = left.map(face => ({ face: new Triangle(...face), box: new Box3().setFromPoints(face) }));
  const b = right.map(face => ({ face: new Triangle(...face), box: new Box3().setFromPoints(face) }));
  /** Retains an independently measured contact witness rather than a planner's claimed contact point. */
  function consider(first: Vector3, second: Vector3): void {
    const candidate = first.distanceTo(second);
    if (candidate > tolerance || candidate >= distance) return;
    distance = candidate;
    points = [first.clone(), second.clone()];
  }
  for (const first of a) for (const second of b) {
    if (boxDistanceSquared(first.box, second.box) > tolerance * tolerance) continue;
    if (crosses(first.face, second.face)) return { crosses: true, distance: 0, points };
    const x = [first.face.a, first.face.b, first.face.c], y = [second.face.a, second.face.b, second.face.c];
    for (const vertex of x) consider(vertex, second.face.closestPointToPoint(vertex, new Vector3()));
    for (const vertex of y) consider(first.face.closestPointToPoint(vertex, new Vector3()), vertex);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++)
      consider(...closestEdges(x[i], x[(i + 1) % 3], y[j], y[(j + 1) % 3]));
  }
  return { crosses: false, distance, points };
}
