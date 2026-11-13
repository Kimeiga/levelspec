import type { V3 } from "../../../architecture/types.ts";
import type { Pen } from "../../pen.ts";
import catalog from "./assets/restaurant-food.json" with { type: "json" };

/** Emits uniformly scaled offline food geometry; material channels share the same padded atlas transform. */
function food(pen: Pen, name: keyof typeof catalog, at: V3, scale: number, pivot: number[], variant: number): void {
  const textured = pen.mesh.textured("restaurant-food");
  const tile = name === "chicken" ? variant % 3 : 3;
  const offset = name === "chicken" ? [tile % 2 * .5, -Math.floor(tile / 2) * .5] : [0, 0];
  for (const face of catalog[name].faces) {
    const points = face.map(vertex => vertex.slice(0, 3)
      .map((value, axis) => at[axis] + (value - pivot[axis]) * scale) as V3);
    const normals = face.map(vertex => vertex.slice(3, 6) as V3);
    const hint = normals.reduce((sum, normal) => sum.map((value, axis) => value + normal[axis]) as V3, [0, 0, 0] as V3);
    pen.face(textured ? "restaurant-food" : "paint", points, hint, textured ? [1, 1, 1] : point => {
      const vertex = face[points.indexOf(point)];
      return vertex.slice(8, 11) as V3;
    }, face.map(vertex => [vertex[6] + offset[0], vertex[7] + offset[1]]), normals);
  }
}

/** Hangs a chicken from an actual upper mesh vertex at the hook tip; scale preserves its proportions. */
export function hangingChicken(pen: Pen, hookTip: V3, scale: number, variant: number): void {
  food(pen, "chicken", hookTip, scale, catalog.chicken.anchor, variant);
}

/** Fits a shared low-profile meat pile uniformly and rests its lowest vertices on the tray floor. */
export function slicedMeat(pen: Pen, at: V3, envelope: V3): void {
  const scale = Math.min(...catalog.slices.size.map((size, axis) => envelope[axis] / size));
  food(pen, "slices", at, scale, [0, 0, 0], 0);
}
