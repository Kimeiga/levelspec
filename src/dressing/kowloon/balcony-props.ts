import type { V3 } from "../../architecture/types.ts";
import type { Rng } from "../../generate/rng.ts";
import type { KitSlot } from "../kit-mesh.ts";
import type { Pen } from "../pen.ts";
import { srgb } from "./palette.ts";
import type { Support } from "./laundry.ts";
import catalog from "./assets/balcony-props.json" with { type: "json" };

export const BALCONY_PLANTS = ["rubber-plant", "trailing-pothos", "snake-plant"] as const;
export const BALCONY_LAUNDRY = ["hanging-shirt", "hanging-trousers", "hanging-bedsheet"] as const;
export type BalconyPlant = (typeof BALCONY_PLANTS)[number];
export type BalconyLaundry = (typeof BALCONY_LAUNDRY)[number];
const WHITE: V3 = [1, 1, 1];
const DYES = ["#f2efe8", "#a9c6cf", "#bdc6a4", "#d0a7a1", "#b8abc8", "#d7c695"].map(srgb);

/** A uniformly sized mesh garment, measured from its two actual suspension vertices. */
export interface MeshGarment {
  kind: "mesh";
  asset: BalconyLaundry;
  width: number;
  drop: number;
  scale: number;
  support: Support;
  tint: V3;
}

/** Draws a shared baked plant with a flat grounded pot base; rotation is around the pot axis, in radians. */
export function balconyPlant(pen: Pen, name: BalconyPlant, at: V3, scale: number, rotation: number): void {
  const asset = catalog[name], cosine = Math.cos(rotation), sine = Math.sin(rotation);
  const turn = ([x, y, z]: number[]): V3 => [cosine * x - sine * y, sine * x + cosine * y, z];
  for (const face of asset.faces) {
    const points = face.map(vertex => turn(vertex.slice(0, 3)).map((value, axis) => at[axis] + value * scale) as V3);
    const normals = face.map(vertex => turn(vertex.slice(3, 6)));
    emit(pen, "balcony-plants", face, points, normals, WHITE);
  }
}

/** Selects a mesh that fits uniformly; folded sheets are clipped to lines; shirts on poles use threaded procedural cuts. */
export function chooseMeshGarment(rng: Rng, room: { width: number; drop: number }, support: Support): MeshGarment | undefined {
  const names = BALCONY_LAUNDRY.filter(name => !(support !== "line" && name === "hanging-bedsheet")
    && !(support === "pole" && name === "hanging-shirt"));
  for (const asset of rng.shuffle([...names])) {
    const source = catalog[asset], hangerDrop = support === "hanger" ? .11 : asset === "hanging-bedsheet" ? .014 : 0;
    const scale = Math.min(rng.float(.76, 1.02), room.width / source.width, (room.drop - hangerDrop - .015) / source.drop);
    if (scale < (asset === "hanging-bedsheet" ? .52 : .65)) continue;
    return { kind: "mesh", asset, width: source.width * scale, drop: source.drop * scale + hangerDrop + .015,
      scale, support, tint: rng.pick(DYES) };
  }
  return undefined;
}

/**
 * Hangs a fitted mesh in a +Y-facing frame along the segment. Cloth follows line slope,
 * while hangers stay level. Sway is a depth shear that leaves suspension vertices fixed.
 */
export function hangMeshGarment(pen: Pen, garment: MeshGarment, left: V3, right: V3, sway: number): void {
  const run = Math.hypot(right[0] - left[0], right[1] - left[1]);
  if (run < 1e-6) return;
  const along: V3 = [(right[0] - left[0]) / run, (right[1] - left[1]) / run, 0];
  const outward: V3 = [-along[1], along[0], 0];
  const center = left.map((value, axis) => (value + right[axis]) / 2) as V3;
  const frame = pen.facing(center, along, outward);
  const source = catalog[garment.asset], hanger = garment.support === "hanger";
  const slope = hanger ? 0 : (right[2] - left[2]) / run;
  const shear = sway / Math.max(garment.drop, .01), drop = hanger ? .11 : 0;
  // Folded linens are clipped below the cord; their narrow crease does not wrap a rigid pole.
  const lift = garment.asset === "hanging-bedsheet" ? -.014 : 0;
  const place = ([x, y, z]: number[]): V3 => [x * garment.scale, (y - shear * z) * garment.scale, (z + slope * x) * garment.scale - drop + lift];
  for (const face of source.faces) {
    const points = face.map(vertex => place(vertex.slice(0, 3)));
    const normals = face.map(vertex => {
      const [x, y, z] = vertex.slice(3, 6), up = z + shear * y;
      const normal: V3 = [x - slope * up, y, up], length = Math.hypot(...normal);
      return normal.map(value => value / length) as V3;
    });
    emit(frame, "balcony-cloth", face, points, normals, garment.tint);
  }
  const anchors = source.anchors.map(place);
  if (hanger) {
    const neck: V3 = [0, 0, -.045];
    frame.tube("paint", [anchors[0], neck, anchors[1], anchors[0]], .003, [.38, .40, .38], 5);
    const hook: V3[] = [neck, [0, 0, -.018]];
    for (let i = 0; i <= 8; i++) {
      const angle = -Math.PI / 2 + i / 8 * Math.PI * 1.7;
      hook.push([.018 * Math.cos(angle), 0, .018 * Math.sin(angle)]);
    }
    frame.tube("paint", hook, .003, [.38, .40, .38], 5);
  } else {
    for (const at of anchors) frame.bar("paint", [at[0], at[1], at[2] - .025], [at[0], at[1], at[2] + .025], .012, [.48, .34, .20]);
  }
}

/** Emits smooth normals and one padded chart for all PBR channels; plain overrides retain sampled albedo. */
function emit(pen: Pen, slot: KitSlot, face: number[][], points: V3[], normals: V3[], tint: V3): void {
  const textured = pen.mesh.textured(slot);
  const hint = normals.reduce((sum, normal) => sum.map((value, axis) => value + normal[axis]) as V3, [0, 0, 0] as V3);
  pen.face(slot, points, hint, textured ? tint : point => {
    const vertex = face[points.indexOf(point)];
    return tint.map((value, axis) => value * vertex[8 + axis]) as V3;
  }, face.map(vertex => vertex.slice(6, 8)), normals);
}
