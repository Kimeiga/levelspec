import { Matrix4, Vector3 } from "three";
import type { V3 } from "../../../architecture/types.ts";
import type { Rng } from "../../../generate/rng.ts";
import { Pen } from "../../pen.ts";
import { srgb } from "../palette.ts";
import packetMesh from "./assets/snack-packet.json" with { type: "json" };
import { snackPacket } from "./stock-mesh.ts";

const WIDTH = 0.12;
const HEIGHT = 0.16;
const DEPTH = 0.06;
const CLIP_MIN: V3 = [-.005, -.006, -.007];
const CLIP_MAX: V3 = [.005, .006, .019];
const vertices = packetMesh.flat();
const seam = vertices.filter(vertex => vertex[2] > 0.965);

/** A packet's rigid pose in a string's ceiling-local frame, including its actual seam attachment. */
export interface HungPacket {
  matrix: Matrix4;
  clip: V3;
  seam: V3;
  min: V3;
  max: V3;
}

/** Converts a baked packet vertex to the same meter frame used by snackPacket. */
function packetPoint(vertex: number[], mirrored: boolean): V3 {
  return [vertex[0] * WIDTH * (mirrored ? -1 : 1), vertex[1] * DEPTH, vertex[2] * HEIGHT];
}

/** Measures the real pouch after rotation, including its crimped seams. */
function bounds(matrix: Matrix4, mirrored: boolean): { min: V3; max: V3 } {
  const points = vertices.map(vertex => new Vector3(...packetPoint(vertex, mirrored)).applyMatrix4(matrix));
  return {
    min: [Math.min(...points.map(p => p.x)), Math.min(...points.map(p => p.y)), Math.min(...points.map(p => p.z))],
    max: [Math.max(...points.map(p => p.x)), Math.max(...points.map(p => p.y)), Math.max(...points.map(p => p.z))],
  };
}

/** Measures the clothespin and spring in the pouch frame, including the part above its seam. */
function clipBounds(matrix: Matrix4, seam: V3): { min: V3; max: V3 } {
  const points: Vector3[] = [];
  for (const x of [-.0075,.0075]) for (const y of [-.0085,CLIP_MAX[1]])
    for (const z of [CLIP_MIN[2],CLIP_MAX[2]])
      points.push(new Vector3(seam[0]+x,seam[1]+y,seam[2]+z).applyMatrix4(matrix));
  return {
    min: [Math.min(...points.map(p=>p.x)),Math.min(...points.map(p=>p.y)),Math.min(...points.map(p=>p.z))],
    max: [Math.max(...points.map(p=>p.x)),Math.max(...points.map(p=>p.y)),Math.max(...points.map(p=>p.z))],
  };
}

/**
 * Arranges packets below a ceiling-local origin. Real seam vertices stay at their
 * clip bites; pouch and clothespin envelopes have irregular gaps and fit `drop`.
 * Each string occupies at most 0.26 m across; rows use its measured footprint.
 */
export function planPacketString(drop: number, rng: Rng, mirrored = false): HungPacket[] {
  const result: HungPacket[] = [];
  let ceiling = -0.09;
  while (ceiling > -drop) {
    const anchor = packetPoint(rng.pick(seam), mirrored);
    const roll = -anchor[0] * 3 + rng.float(-0.08, 0.08);
    const rotation = new Matrix4().makeRotationZ(rng.float(-0.3, 0.3))
      .multiply(new Matrix4().makeRotationY(roll));
    const matrix = rotation.multiply(new Matrix4().makeTranslation(-anchor[0], -anchor[1], -anchor[2]));
    const local = bounds(matrix, mirrored);
    const pin = clipBounds(matrix,anchor);
    const top = Math.max(local.max[2],pin.max[2]);
    const clip: V3 = [rng.float(-0.012, 0.012), -0.075, ceiling - top];
    matrix.premultiply(new Matrix4().makeTranslation(...clip));
    const measured = bounds(matrix, mirrored);
    if (measured.min[2] < -drop) break;
    result.push({ matrix, clip, seam: anchor, ...measured });
    ceiling = measured.min[2] - rng.float(0.006, 0.018);
  }
  return result;
}

/** Hangs individually clipped snack bags, with the supporting cord behind the pouches. */
export function packetString(pen: Pen, at: V3, drop: number, rng: Rng): void {
  const packets = planPacketString(drop, rng, pen.mirrored);
  drawPackets(pen, at, packets, rng.int(0,3));
}

/** Packs complete strings by their measured rotated bounds, keeping adjacent pouches separate. */
export function packetRow(pen: Pen, x0: number, x1: number, y: number, ceiling: number, rng: Rng): void {
  let left = x0;
  while (left < x1) {
    const packets = planPacketString(rng.float(.5,.85),rng,pen.mirrored);
    if (!packets.length) break;
    const pins = packets.map(pose=>clipBounds(pose.matrix,pose.seam));
    const min = Math.min(-.002,...packets.map(pose=>pose.min[0]),...pins.map(pin=>pin.min[0]));
    const max = Math.max(.002,...packets.map(pose=>pose.max[0]),...pins.map(pin=>pin.max[0]));
    if (left + max - min > x1) break;
    drawPackets(pen,[left-min,y+rng.float(-.025,.025),ceiling],packets,rng.int(0,3));
    left += max-min+rng.float(.006,.018);
  }
}

/** Draws already fitted poses without changing their clips or bounds when choosing labels. */
function drawPackets(pen: Pen, at: V3, packets: HungPacket[], firstVariant: number): void {
  const local = pen.move(...at);
  if (!packets.length) return;
  const cord = srgb("#b29b72");
  local.bar("paint", [0, 0, 0], [0, 0, packets.at(-1)!.clip[2] - 0.015], 0.003, cord);
  for (const [index,pose] of packets.entries()) {
    const body = new Pen(pen.mesh, pen.part, local.matrix.clone().multiply(pose.matrix), pen.mirrored);
    snackPacket(body, [0, 0, 0], WIDTH, HEIGHT, srgb("#bd7b31"), (firstVariant+index)%4);
    local.bar("metal", [0, 0, pose.clip[2]], pose.clip, 0.004, srgb("#77776b"));
    const [x, y, z] = pose.seam;
    body.box("timber", pose.seam.map((value,axis)=>value+CLIP_MIN[axis]) as V3,
      pose.seam.map((value,axis)=>value+CLIP_MAX[axis]) as V3, cord, "");
    body.bar("metal", [x - 0.006, y - 0.007, z + 0.004], [x + 0.006, y - 0.007, z + 0.004], 0.003, srgb("#77776b"));
  }
}
