import type { V3 } from "../../../architecture/types.ts";
import { Pen } from "../../pen.ts";
import { finishSeed } from "../../wall-surface.ts";
import { shade, srgb } from "../palette.ts";
import { brushedMetal } from "../../finish/brushed-metal.ts";
import { front } from "./forms.ts";

/** Maps unit coordinates to one of four padded kitchen material fields, with matching PBR channels. */
export function kitchenUv(tile: number, u: number, v: number): number[] {
  return [(tile % 2 * 256 + 4.5 + u * 247) / 512,
    1 - (Math.floor(tile / 2) * 256 + 4.5 + (1 - v) * 247) / 512];
}

/** Draws a material field with explicit UVs; untextured projects retain the intended base color. */
export function kitchenFace(pen: Pen, points: V3[], hint: V3, tile: number, uv: number[][], brightness = 1, normals?: V3[]): void {
  const fallback = ["#aaa69d", "#dfd8be", "#a9763d", "#b8c9b0"][tile];
  const textured = pen.mesh.textured("restaurant-surfaces");
  pen.face(textured ? "restaurant-surfaces" : "paint", points, hint,
    textured ? [brightness, brightness, brightness] : shade(srgb(fallback), brightness),
    uv.map(([u, v]) => kitchenUv(tile, u, v)), normals);
}

/** Uses the shared physical-scale stainless finish for kitchen equipment. */
export function kitchenMetal(pen: Pen): Pen {
  return brushedMetal(pen);
}

/** Makes inset ceramic faces over a continuous grout backing, with localized lower-edge wear. */
export function kitchenTiles(pen: Pen, width: number, height: number, y: number, seed: number, backsplash = false): void {
  if (pen.mesh.textured("restaurant-tiles")) {
    const offset = (seed % 7) * .18;
    const points: V3[] = [[0,y,0],[width,y,0],[width,y,height],[0,y,height]];
    pen.face("restaurant-tiles", points, [0,-1,0], [1,1,1], points.map(point => [(point[0]+offset)/3.6,point[2]/1.8]));
    return;
  }
  front(pen, "paint", 0, width, 0, height, y + .001, srgb("#77786b"));
  const columns = Math.max(1, Math.round(width / .15));
  const rows = Math.max(1, Math.round(height / .15));
  const dx = width / columns, dz = height / rows;
  for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) {
    const hash = finishSeed(`${seed}/${row}/${column}`);
    const x = column * dx, z = row * dz;
    const tile = row < 2 || backsplash  &&  row % 7 === 0 ? 3 : 1;
    const brightness = .91 + hash % 13 / 100 - (row === 0 ? .12 : 0);
    const shift = hash % 7 / 50;
    const uv = [[shift, shift], [.85 + shift, shift], [.85 + shift, .85 + shift], [shift, .85 + shift]];
    kitchenFace(pen, [[x + .002, y, z + .002], [x + dx - .002, y, z + .002],
      [x + dx - .002, y, z + dz - .002], [x + .002, y, z + dz - .002]], [0, -1, 0], tile, uv, brightness);
  }
}
