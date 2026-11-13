import type { V3 } from "../../vector/types.ts";
import type { KitSlot } from "../kit-mesh.ts";
import type { Pen } from "../pen.ts";
import { paintedPatina, type PaintedPatina } from "../finish/patina.ts";
import { materialRecipeKey } from "../surface/material.ts";

/** A shared painted component field; multiple raised rails may sample the same door-leaf image. */
export interface PaintedSurface {
  finish: PaintedPatina;
  group: string;
  density: number;
}

/** Draws a flat part with ordinary geometry and optional color/roughness/normal texture weathering. */
export function paintedPanel(pen: Pen, slot: KitSlot, bounds: [number, number, number, number], depth: number, tint: V3, surface?: PaintedSurface): void {
  paintedFace(pen, slot, [[bounds[0], depth, bounds[1]], [bounds[2], depth, bounds[1]],
    [bounds[2], depth, bounds[3]], [bounds[0], depth, bounds[3]]], tint, surface);
}

/** Maps front-facing bevels and panels into the same leaf-local paint field, preserving modeled normals. */
export function paintedFace(pen: Pen, slot: KitSlot, points: V3[], tint: V3, surface?: PaintedSurface): void {
  const firstTriangle = pen.mesh.triangleCount;
  pen.face(slot, points, [0, 1, 0], surface ? [1, 1, 1] : tint);
  if (!surface || pen.mesh.triangleCount === firstTriangle) return;
  const material = pen.mesh.material(slot), repeat = pen.mesh.repeat(slot);
  const bounds: [number, number, number, number] = [
    Math.min(...points.map(point => point[0])), Math.min(...points.map(point => point[2])),
    Math.max(...points.map(point => point[0])), Math.max(...points.map(point => point[2])),
  ];
  pen.mesh.receive({ id: `${pen.part}/paint/${firstTriangle}`, firstTriangle, triangleCount: pen.mesh.triangleCount - firstTriangle,
    frame: pen.surfaceFrame(), bounds, materials: [material],
    raster: { geometry: "preserve", group: `${surface.group}/${slot}`, bounds: surface.finish.bounds, texelsPerMeter: surface.density,
      bump: "sample", get materialKey() { return materialRecipeKey("painted-material/v1", { finish: surface.finish, repeat }); } },
    sample(u, v) {
      const value = paintedPatina(surface.finish, u, v);
      return { height: 0, bump: value.bump, roughness: value.roughness,
        layers: [{ material, weight: 1, uv: [u * repeat, v * repeat], tint: value.tint }] };
    },
  });
}

/** Retains modeled stiles/rails while their visible front receives the same procedural paint as the leaf. */
export function paintedBox(pen: Pen, slot: KitSlot, low: V3, high: V3, tint: V3, omit: string, surface?: PaintedSurface): void {
  if (!surface || omit.includes("f")) { pen.box(slot, low, high, tint, omit); return; }
  pen.box(slot, low, high, tint, `${omit}f`);
  paintedPanel(pen, slot, [low[0], low[2], high[0], high[2]], high[1], tint, surface);
}
