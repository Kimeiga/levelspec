import type { V3 } from "../../../architecture/types.ts";
import type { KitSlot } from "../../kit-mesh.ts";
import type { Pen } from "../../pen.ts";
import pile from "./assets/apple-pile.json" with { type: "json" };
import packet from "./assets/snack-packet.json" with { type: "json" };

const WHITE: V3 = [1, 1, 1];
const PACKET_BACK: V3 = [0.55, 0.43, 0.25];

/** Draws baked Z-up triangles in a meter-sized display envelope. */
function drawStock(pen: Pen, faces: number[][][], at: V3, size: V3, slot: KitSlot, tint: V3, variant = 0): void {
  const textured = pen.mesh.textured(slot);
  const xSign = slot === "snack-packet" && pen.mirrored ? -1 : 1;
  for (const face of faces) {
    // The label covers the front skin; side seams and the rear share plain packaging paper.
    const printed = textured && (slot !== "snack-packet" || face.every(vertex => vertex[1] < 0));
    const plain = textured && slot === "snack-packet" ? PACKET_BACK : tint;
    const points = face.map(([x, y, z]): V3 => [
      at[0] + xSign * x * size[0], at[1] + y * size[1], at[2] + z * size[2],
    ]);
    const normals = face.map(([, , , x, y, z]): V3 => {
      const scaled: V3 = [xSign * x / size[0], y / size[1], z / size[2]];
      const length = Math.hypot(...scaled);
      return scaled.map(value => value / length) as V3;
    });
    const hint = normals.reduce((sum, normal): V3 => [
      sum[0] + normal[0], sum[1] + normal[1], sum[2] + normal[2],
    ], [0, 0, 0] as V3);
    pen.face(printed ? slot : "paint", points, hint, printed ? WHITE : plain,
      printed ? face.map(vertex => slot === "snack-packet"
        ? [(variant % 2 * 512 + 4 + vertex[6] * 504) / 1024, ((1 - Math.floor(variant / 2)) * 512 + 4 + vertex[7] * 504) / 1024]
        : vertex.slice(6, 8)) : undefined, normals);
  }
}

/** Fills a display crate with one baked, open-bottom apple pile. */
export function applePile(pen: Pen, at: V3, size: V3, tint: V3): void {
  drawStock(pen, pile, at, size, "market-apple", tint);
}

/** Fits a crimped packet into its shelf envelope, with its label facing -Y. */
export function snackPacket(pen: Pen, at: V3, width: number, height: number, tint: V3, variant = 0): void {
  drawStock(pen, packet, at, [width, Math.min(0.068, width * 0.5), height], "snack-packet", tint, variant);
}
