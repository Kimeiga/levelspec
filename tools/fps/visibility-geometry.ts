import type { CompiledLevel, V3 } from "../../src/vector/types.ts";

interface Face { a: V3; e: V3; f: V3; min: V3; max: V3 }
interface Branch { min: V3; max: V3; faces?: Face[]; left?: Branch; right?: Branch }

/** Builds a median BVH over immutable opaque render triangles for repeated finite segments. */
function branch(faces: Face[]): Branch {
  const min: V3 = [Infinity, Infinity, Infinity], max: V3 = [-Infinity, -Infinity, -Infinity];
  for (const face of faces) for (let axis = 0; axis < 3; axis++) {
    min[axis] = Math.min(min[axis], face.min[axis]);
    max[axis] = Math.max(max[axis], face.max[axis]);
  }
  if (faces.length <= 8) return { min, max, faces };
  const extent = max.map((v, i) => v - min[i]);
  const axis = extent.indexOf(Math.max(...extent));
  faces.sort((a, b) => a.min[axis] + a.max[axis] - b.min[axis] - b.max[axis]);
  const middle = faces.length >>> 1;
  return { min, max, left: branch(faces.slice(0, middle)), right: branch(faces.slice(middle)) };
}

/** Rejects BVH boxes outside the finite segment; parallel axes retain boundary contact. */
function crossesBox(node: Branch, a: V3, delta: V3): boolean {
  let low = 0, high = 1;
  for (let axis = 0; axis < 3; axis++) {
    if (Math.abs(delta[axis]) < 1e-14) {
      if (a[axis] < node.min[axis] - 1e-8 || a[axis] > node.max[axis] + 1e-8) return false;
    } else {
      let first = (node.min[axis] - a[axis]) / delta[axis];
      let last = (node.max[axis] - a[axis]) / delta[axis];
      if (first > last) [first, last] = [last, first];
      low = Math.max(low, first); high = Math.min(high, last);
      if (low > high + 1e-12) return false;
    }
  }
  return true;
}

/** Two-sided triangle intersection; one micrometer at segment endpoints is query tolerance only. */
function crossesFace(face: Face, a: V3, d: V3, margin: number): boolean {
  const [ex, ey, ez] = face.e, [fx, fy, fz] = face.f;
  const px = d[1] * fz - d[2] * fy, py = d[2] * fx - d[0] * fz, pz = d[0] * fy - d[1] * fx;
  const det = ex * px + ey * py + ez * pz;
  if (Math.abs(det) < 1e-12) return false;
  const tx = a[0] - face.a[0], ty = a[1] - face.a[1], tz = a[2] - face.a[2];
  const u = (tx * px + ty * py + tz * pz) / det;
  if (u < -1e-10 || u > 1 + 1e-10) return false;
  const qx = ty * ez - tz * ey, qy = tz * ex - tx * ez, qz = tx * ey - ty * ex;
  const v = (d[0] * qx + d[1] * qy + d[2] * qz) / det;
  if (v < -1e-10 || u + v > 1 + 1e-10) return false;
  const t = (fx * qx + fy * qy + fz * qz) / det;
  return t > margin && t < 1 - margin;
}

/** Traverses only intersected branches and stops at the first opaque surface. */
function blocked(node: Branch, a: V3, delta: V3, margin: number): boolean {
  if (!crossesBox(node, a, delta)) return false;
  if (node.faces) return node.faces.some(face => crossesFace(face, a, delta, margin));
  return blocked(node.left!, a, delta, margin) || blocked(node.right!, a, delta, margin);
}

/**
 * Optical audit scope: visible, static, opaque native or visualization render faces.
 * Textured/alpha/dynamic faces are omitted and disclosed as unknown, never certified cover.
 */
export class VisibilityGeometry {
  private readonly root: Branch;
  readonly unknownMaterials: string[];
  readonly omittedDynamicFaces: number;
  readonly opaqueFaces: number;
  constructor(level: CompiledLevel) {
    const materials = new Map(level.document.materials.map(m => [m.id, m]));
    const glassObjects = new Set(level.document.layers.flatMap(l => l.edges.filter(e => e.kind === "glass").map(e => e.id)));
    const unknown = new Set<string>(), faces: Face[] = [];
    let dynamic = 0;
    const mesh = level.mesh;
    for (let i = 0; i < mesh.indices.length; i += 3) {
      const surface = level.surfaces[mesh.surfaces[i / 3]];
      if (surface.visible === false) continue;
      if (surface.dynamic) { dynamic++; continue; }
      const material = materials.get(surface.material);
      const color = material?.color ?? "";
      if (surface.kind === "water" || surface.layer === "water" || glassObjects.has(surface.object) || /glass/i.test(surface.material) || material?.texture || /transparent|rgba|hsla/i.test(color) || /^#[\da-f]{8}$/i.test(color) && !/ff$/i.test(color)) {
        unknown.add(surface.material); continue;
      }
      const points = mesh.indices.slice(i, i + 3).map(index => mesh.positions.slice(index * 3, index * 3 + 3) as V3);
      const [a, b, c] = points;
      faces.push({ a, e: b.map((v, k) => v - a[k]) as V3, f: c.map((v, k) => v - a[k]) as V3,
        min: a.map((_, k) => Math.min(...points.map(p => p[k]))) as V3,
        max: a.map((_, k) => Math.max(...points.map(p => p[k]))) as V3 });
    }
    this.root = branch(faces); this.unknownMaterials = [...unknown].sort();
    this.omittedDynamicFaces = dynamic; this.opaqueFaces = faces.length;
  }
  /** Tests a finite XYZ segment, independently of collision and navigation settings. */
  visible(a: V3, b: V3): boolean {
    const delta = b.map((v, k) => v - a[k]) as V3;
    const distance = Math.hypot(...delta);
    return distance < 1e-6 || !blocked(this.root, a, delta, 1e-6 / distance);
  }
}
