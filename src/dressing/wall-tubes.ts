import { BufferGeometry, Float32BufferAttribute, Quaternion, Vector3 } from "three";
import type { V3 } from "../architecture/types.ts";

/** Rounds polyline corners inside their original convex hull; dimensions are local meters. */
function roundedPath(points: V3[], radius: number): Vector3[] {
  const input = points.map(point => new Vector3(...point))
    .filter((point, i, all) => i === 0 || point.distanceToSquared(all[i - 1]) > 1e-12);
  if (input.length < 2) return [];
  // Cable paths already sample their sag and loops; only rigid pipe elbows need fillets.
  if (radius < 0.018) return input;
  const result = [input[0]];
  for (let i = 1; i < input.length - 1; i++) {
    const p = input[i], before = input[i - 1].clone().sub(p), after = input[i + 1].clone().sub(p);
    const distance = Math.min(radius * 2.5, before.length() * 0.35, after.length() * 0.35);
    before.normalize(); after.normalize();
    if (before.dot(after) < -0.9995) { result.push(p); continue; }
    const a = p.clone().addScaledVector(before, distance), b = p.clone().addScaledVector(after, distance);
    for (let step = 0; step <= 4; step++) {
      const t = step / 4;
      result.push(a.clone().multiplyScalar((1 - t) ** 2).addScaledVector(p, 2 * t * (1 - t)).addScaledVector(b, t * t));
    }
  }
  result.push(input.at(-1)!);
  return result;
}

/**
 * Sweeps one closed tube through shared cross-section rings, with rounded bends
 * and caps only at its two ends. UV distances follow circumference and length
 * in meters, so pipe texture scale remains consistent through elbows.
 */
export function wallTube(points: V3[], radius: number, repeat: number): BufferGeometry | undefined {
  const path = roundedPath(points, radius);
  if (path.length < 2) return undefined;
  const sides = radius >= 0.018 ? 12 : 8;
  const positions: number[] = [], normals: number[] = [], uv: number[] = [], indices: number[] = [];
  const tangents = path.map((point, i) => {
    if (i === 0) return path[1].clone().sub(point).normalize();
    if (i === path.length - 1) return point.clone().sub(path[i - 1]).normalize();
    return point.clone().sub(path[i - 1]).normalize().add(path[i + 1].clone().sub(point).normalize()).normalize();
  });
  const axis = Math.abs(tangents[0].z) < 0.9 ? new Vector3(0, 0, 1) : new Vector3(0, 1, 0);
  let normal = new Vector3().crossVectors(tangents[0], axis).normalize(), distance = 0;
  for (let i = 0; i < path.length; i++) {
    if (i > 0) {
      distance += path[i].distanceTo(path[i - 1]);
      normal.applyQuaternion(new Quaternion().setFromUnitVectors(tangents[i - 1], tangents[i])).normalize();
    }
    const binormal = new Vector3().crossVectors(tangents[i], normal).normalize();
    for (let side = 0; side <= sides; side++) {
      const angle = side / sides * Math.PI * 2;
      const radial = normal.clone().multiplyScalar(Math.cos(angle)).addScaledVector(binormal, Math.sin(angle));
      positions.push(...path[i].clone().addScaledVector(radial, radius).toArray());
      normals.push(...radial.toArray());
      uv.push(side / sides * Math.PI * 2 * radius * repeat, distance * repeat);
      if (i > 0 && side < sides) {
        const a = (i - 1) * (sides + 1) + side, b = i * (sides + 1) + side;
        indices.push(a, a + 1, b, a + 1, b + 1, b);
      }
    }
  }
  for (const end of [0, path.length - 1]) {
    const center = positions.length / 3, capNormal = tangents[end].clone().multiplyScalar(end === 0 ? -1 : 1);
    positions.push(...path[end].toArray()); normals.push(...capNormal.toArray()); uv.push(0.5, 0.5);
    for (let side = 0; side <= sides; side++) {
      const index = end * (sides + 1) + side;
      positions.push(...positions.slice(index * 3, index * 3 + 3)); normals.push(...capNormal.toArray());
      uv.push(0.5 + Math.cos(side / sides * Math.PI * 2) * radius * repeat, 0.5 + Math.sin(side / sides * Math.PI * 2) * radius * repeat);
      if (side < sides) {
        const a = center + 1 + side, b = a + 1;
        indices.push(...(end === 0 ? [center, b, a] : [center, a, b]));
      }
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new Float32BufferAttribute(normals, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices);
  return geometry;
}
