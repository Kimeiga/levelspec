import type { V3 } from "../../../architecture/types.ts";
import type { Rng } from "../../../generate/rng.ts";
import type { Pen } from "../../pen.ts";
import { GALVANIZED, shade, srgb } from "../palette.ts";
import { ball, lathe, limb, rotated } from "./forms.ts";

/**
 * Cookware and household wares shared by the hardware store and the kitchens
 * of other trades. Standing wares rest on the given point; hanging ones are
 * named so and hang below it. All lengths are meters.
 */

const BAMBOO = srgb("#c8b888");
const BRISTLE = srgb("#b89a5a");

/** Draws an iron wok resting on `at`, bowl up, with two loop handles along X. */
export function wok(pen: Pen, at: V3, radius: number, tint: V3): void {
  const r = radius;
  lathe(
    pen,
    "metal",
    at,
    [[r * 0.22, 0], [r * 0.7, r * 0.13], [r, r * 0.33], [r * 1.03, r * 0.35], [r * 0.98, r * 0.335], [r * 0.68, r * 0.145], [r * 0.2, r * 0.02], [0, r * 0.02]],
    [tint, tint, tint, shade(tint, 1.2), shade(tint, 0.7), shade(tint, 0.6), shade(tint, 0.6)],
    12,
  );
  for (const side of [-1, 1])
    limb(
      pen,
      "metal",
      [
        [at[0] + side * r, at[1] - r * 0.22, at[2] + r * 0.33],
        [at[0] + side * r * 1.2, at[1] - r * 0.12, at[2] + r * 0.4],
        [at[0] + side * r * 1.2, at[1] + r * 0.12, at[2] + r * 0.4],
        [at[0] + side * r, at[1] + r * 0.22, at[2] + r * 0.33],
      ],
      [0.006, 0.006, 0.006, 0.006],
      tint,
      4,
    );
}

/** Hangs a wok by one handle from `at`, its bowl turned toward the viewer or away. */
export function hangingWok(pen: Pen, at: V3, radius: number, tint: V3, bowlOut: boolean): void {
  const center: V3 = [at[0], at[1] + (bowlOut ? radius * 0.2 : -radius * 0.2), at[2] - radius * 1.2];
  const turned = rotated(rotated(pen, center, "x", bowlOut ? Math.PI / 2 : -Math.PI / 2), [0, 0, 0], "z", Math.PI / 2);
  wok(turned, [0, 0, 0], radius, tint);
}

/**
 * Draws a straight-sided cooking pot standing on `at` with two side handles.
 * A lidded pot shows a domed lid and knob; an open one shows what is in it.
 */
export function pot(pen: Pen, at: V3, radius: number, height: number, tint: V3, content?: V3): void {
  const r = radius,
    h = height;
  if (content) {
    lathe(
      pen,
      "metal",
      at,
      [[r * 0.94, 0], [r, 0.015], [r, h], [r * 1.05, h + 0.008], [r * 0.97, h + 0.004], [r * 0.96, h * 0.78]],
      [tint, tint, shade(tint, 1.15), shade(tint, 0.8), shade(tint, 0.6)],
      12,
    );
    lathe(pen, "pane", at, [[r * 0.96, h * 0.78], [0, h * 0.78]], content, 12);
  } else
    lathe(
      pen,
      "metal",
      at,
      [[r * 0.94, 0], [r, 0.015], [r, h], [r * 1.05, h + 0.008], [r * 0.6, h + 0.05], [r * 0.14, h + 0.065], [0.016, h + 0.07], [0.028, h + 0.1], [0, h + 0.1]],
      [tint, tint, shade(tint, 1.15), shade(tint, 1.05), shade(tint, 1.05), shade(tint, 0.5), shade(tint, 0.5), shade(tint, 0.5)],
      12,
    );
  for (const side of [-1, 1]) {
    // Each lug runs from just inside the wall of the pot to 5 cm beyond it.
    const inner = at[0] + side * (r - 0.012),
      outer = at[0] + side * (r + 0.052);
    pen.box("metal", [Math.min(inner, outer), at[1] - 0.04, at[2] + h * 0.72], [Math.max(inner, outer), at[1] + 0.04, at[2] + h * 0.72 + 0.014], shade(tint, 0.6), "");
  }
}

/** Draws a kettle standing on `at` with its spout along +X and a bail handle over the lid. */
export function kettle(pen: Pen, at: V3, radius: number, tint: V3): void {
  const r = radius;
  const [x, y, z] = at;
  lathe(
    pen,
    "metal",
    at,
    [[r * 0.7, 0], [r, r * 0.3], [r * 0.96, r * 0.95], [r * 0.5, r * 1.35], [r * 0.3, r * 1.4], [0.014, r * 1.42], [0.024, r * 1.55], [0, r * 1.55]],
    [tint, tint, tint, shade(tint, 1.1), shade(tint, 0.5), shade(tint, 0.5), shade(tint, 0.5)],
    10,
  );
  limb(pen, "metal", [[x + r * 0.8, y, z + r * 0.5], [x + r * 1.35, y, z + r * 0.95], [x + r * 1.6, y, z + r * 1.4]], [r * 0.2, r * 0.13, r * 0.09], tint, 6);
  limb(
    pen,
    "metal",
    [[x - r * 0.75, y, z + r * 1.1], [x - r * 0.7, y, z + r * 1.9], [x, y, z + r * 2.15], [x + r * 0.7, y, z + r * 1.9], [x + r * 0.75, y, z + r * 1.1]],
    [0.006, 0.007, 0.01, 0.007, 0.006],
    shade(tint, 0.6),
    4,
  );
}

/** Draws a tapered pail standing on `at`, its wire handle folded down along the rim. */
export function bucket(pen: Pen, at: V3, radius: number, height: number, tint: V3): void {
  const r = radius,
    h = height;
  lathe(
    pen,
    "paint",
    at,
    [[r * 0.72, 0], [r, h], [r * 1.05, h + 0.012], [r * 0.96, h + 0.004], [r * 0.7, 0.02], [0, 0.02]],
    [tint, shade(tint, 1.15), shade(tint, 0.75), shade(tint, 0.6), shade(tint, 0.5)],
    12,
  );
  limb(
    pen,
    "metal",
    [
      [at[0] - r * 1.02, at[1], at[2] + h - 0.01],
      [at[0] - r * 0.8, at[1] - r * 0.8, at[2] + h - 0.06],
      [at[0] + r * 0.8, at[1] - r * 0.8, at[2] + h - 0.06],
      [at[0] + r * 1.02, at[1], at[2] + h - 0.01],
    ],
    [0.004, 0.004, 0.004, 0.004],
    shade(GALVANIZED, 0.8),
    4,
  );
}

/** Draws a wide washing basin standing on `at`. */
export function basin(pen: Pen, at: V3, radius: number, tint: V3): void {
  const r = radius;
  lathe(
    pen,
    "pane",
    at,
    [[r * 0.6, 0], [r * 0.95, r * 0.36], [r * 1.04, r * 0.38], [r * 0.93, r * 0.355], [r * 0.58, 0.016], [0, 0.016]],
    [tint, shade(tint, 1.15), shade(tint, 0.8), shade(tint, 0.7), shade(tint, 0.6)],
    12,
  );
}

/** Draws a woven basket standing on `at`, open at the top. */
export function basket(pen: Pen, at: V3, radius: number, height: number, tint: V3): void {
  const r = radius,
    h = height;
  lathe(
    pen,
    "timber",
    at,
    [[r * 0.7, 0], [r * 0.98, h * 0.5], [r, h], [r * 1.05, h + 0.012], [r * 0.95, h], [r * 0.68, 0.015], [0, 0.015]],
    [tint, shade(tint, 0.92), shade(tint, 1.15), shade(tint, 0.7), shade(tint, 0.6), shade(tint, 0.5)],
    10,
  );
}

/** Draws a clay cooking pot with a lid and one stub handle, standing on `at`. */
export function clayPot(pen: Pen, at: V3, radius: number, rng: Rng): void {
  const r = radius,
    clay = shade(srgb("#b0703a"), rng.float(0.8, 1.15));
  lathe(
    pen,
    "paint",
    at,
    [[r * 0.6, 0], [r, r * 0.5], [r * 0.92, r * 0.9], [r * 0.98, r * 0.95], [r * 0.5, r * 1.2], [0.02, r * 1.26], [0.03, r * 1.36], [0, r * 1.36]],
    [clay, clay, shade(clay, 1.1), shade(clay, 0.75), shade(clay, 0.75), shade(clay, 0.6), shade(clay, 0.6)],
    9,
  );
  limb(pen, "paint", [[at[0] + r * 0.9, at[1], at[2] + r * 0.75], [at[0] + r * 1.5, at[1], at[2] + r * 0.85]], [r * 0.14, r * 0.12], clay, 5);
}

/** Draws a stack of `count` molded stools nested on `at`: square seats on four splayed legs. */
export function stoolStack(pen: Pen, at: V3, count: number, tints: V3[]): void {
  for (let i = 0; i < count; i++) {
    const tint = tints[i % tints.length];
    const [x, y] = at,
      z = at[2] + i * 0.085;
    pen.box("paint", [x - 0.14, y - 0.14, z + 0.4], [x + 0.14, y + 0.14, z + 0.43], tint, "");
    const corners = [[1, 1], [-1, 1], [-1, -1], [1, -1]];
    for (const [k, [sx, sy]] of corners.entries()) {
      const [nx, ny] = corners[(k + 1) % 4];
      pen.bar("paint", [x + sx * 0.17, y + sy * 0.17, z + 0.004], [x + sx * 0.125, y + sy * 0.125, z + 0.4], 0.035, shade(tint, 0.85));
      pen.bar("paint", [x + sx * 0.147, y + sy * 0.147, z + 0.2], [x + nx * 0.147, y + ny * 0.147, z + 0.2], 0.014, shade(tint, 0.75));
    }
  }
}

/** Stands a broom on `foot` with its handle rising to `top` and its bristles up, as brooms are stored. */
export function broom(pen: Pen, foot: V3, top: V3, rng: Rng): void {
  limb(pen, "timber", [foot, top], [0.012, 0.012], shade(BAMBOO, rng.float(0.8, 1.1)), 5);
  const bristle = shade(rng.bool(0.6) ? BRISTLE : rng.pick([srgb("#3f8a5a"), srgb("#c8281e"), srgb("#2f5f9a")]), rng.float(0.85, 1.1));
  const lean = [top[0] - foot[0], top[1] - foot[1]];
  const crown: V3 = [top[0] + lean[0] * 0.18, top[1] + lean[1] * 0.18, top[2] + 0.3];
  limb(pen, "paint", [top, [top[0], top[1], top[2] + 0.06], crown], [0.02, 0.05, 0.11], bristle, 7, 0.28);
}

/** Stands a string mop on `foot` with its handle rising to `top` and its head up. */
export function mop(pen: Pen, foot: V3, top: V3, rng: Rng): void {
  limb(pen, "timber", [foot, top], [0.012, 0.012], shade(BAMBOO, rng.float(0.8, 1.1)), 5);
  const yarn = shade(srgb("#b8b4a4"), rng.float(0.75, 1));
  ball(pen, "paint", [top[0], top[1], top[2] + 0.02], 0.085, yarn, 7, [1, 0.7, 0.85]);
  for (let strand = 0; strand < 7; strand++) {
    const angle = (strand / 7) * Math.PI * 2;
    const out = [Math.cos(angle) * 0.09, Math.sin(angle) * 0.06];
    limb(
      pen,
      "paint",
      [
        [top[0] + out[0] * 0.7, top[1] + out[1] * 0.7, top[2] + 0.03],
        [top[0] + out[0] * 1.3, top[1] + out[1] * 1.3, top[2] - 0.08],
        [top[0] + out[0] * 1.2, top[1] + out[1] * 1.2, top[2] - 0.2 - rng.float(0, 0.06)],
      ],
      [0.016, 0.015, 0.008],
      shade(yarn, rng.float(0.85, 1.05)),
      4,
    );
  }
}

/** Hangs a feather duster by its loop from `at`, feathers down. */
export function duster(pen: Pen, at: V3, rng: Rng): void {
  const [x, y, z] = at;
  limb(pen, "timber", [[x, y, z], [x, y, z - 0.3]], [0.008, 0.009], shade(BAMBOO, 0.9), 5);
  const feather = rng.pick([srgb("#7a4a2a"), srgb("#3a2a22"), srgb("#c8502a"), srgb("#d8c8a0")]);
  for (let ring = 0; ring < 4; ring++)
    for (let k = 0; k < 6; k++) {
      const angle = (k / 6) * Math.PI * 2 + ring * 0.5;
      const top = z - 0.26 - ring * 0.07;
      const c = Math.cos(angle),
        s = Math.sin(angle);
      pen.sheet(
        "paint",
        [
          [x - s * 0.012, y + c * 0.012, top],
          [x + s * 0.012, y - c * 0.012, top],
          [x + c * 0.07 + s * 0.02, y + s * 0.07 - c * 0.02, top - 0.13],
          [x + c * 0.07 - s * 0.02, y + s * 0.07 + c * 0.02, top - 0.13],
        ],
        shade(feather, rng.float(0.75, 1.2)),
      );
    }
}

/**
 * Hangs a coil of rope or hose facing the viewer, its top resting on `at`:
 * `turns` loops of the given section radius around a ring of `radius`.
 */
export function coil(pen: Pen, at: V3, radius: number, section: number, turns: number, tint: V3): void {
  const center: V3 = [at[0], at[1], at[2] - radius];
  for (let turn = 0; turn < turns; turn++) {
    const r = radius - (turn % 2) * section * 0.9,
      y = center[1] + (turn - (turns - 1) / 2) * section * 1.7;
    const path: V3[] = [];
    for (let k = 0; k <= 14; k++) {
      const angle = (k / 14) * Math.PI * 2 + turn;
      path.push([center[0] + Math.cos(angle) * r, y, center[2] + Math.sin(angle) * r]);
    }
    limb(pen, "paint", path, path.map(() => section), shade(tint, 0.9 + (turn % 3) * 0.08), 5);
  }
}

/** Hangs a bunch of ladles and strainers by their handles from `at`. */
export function ladles(pen: Pen, at: V3, rng: Rng): void {
  const steel = shade(GALVANIZED, 1.05);
  for (let i = 0; i < 3; i++) {
    const x = at[0] + (i - 1) * 0.05,
      y = at[1] + rng.float(-0.02, 0.02),
      length = rng.float(0.3, 0.42);
    pen.bar("metal", [x, y, at[2]], [x, y, at[2] - length], 0.008, steel);
    lathe(
      pen,
      "metal",
      [x, y - 0.03, at[2] - length - 0.04],
      [[0, 0], [0.04, 0.015], [0.05, 0.04], [0.045, 0.038], [0, 0.02]],
      [steel, steel, shade(steel, 0.7), shade(steel, 0.6)],
      8,
    );
  }
}

/** Leans a bamboo ladder from `foot` to `top`; its rails stand `width` apart along Y. */
export function ladder(pen: Pen, foot: V3, top: V3, width: number, rng: Rng): void {
  const cane = shade(BAMBOO, rng.float(0.8, 1.05));
  const length = Math.hypot(top[0] - foot[0], top[2] - foot[2]);
  for (const side of [-1, 1]) limb(
    pen,
    "timber",
    [[foot[0], foot[1] + (side * width) / 2, foot[2]], [top[0], top[1] + (side * width) / 2, top[2]]],
    [0.022, 0.019],
    cane,
    6,
  );
  for (let s = 0.28; s < length - 0.1; s += 0.3) {
    const t = s / length;
    const x = foot[0] + (top[0] - foot[0]) * t,
      z = foot[2] + (top[2] - foot[2]) * t;
    limb(pen, "timber", [[x, foot[1] - width / 2, z], [x, foot[1] + width / 2, z]], [0.013, 0.013], shade(cane, 0.9), 5);
  }
}
