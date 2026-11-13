import type { V3 } from "../../../architecture/types.ts";
import { Rng } from "../../../generate/rng.ts";
import type { Pen } from "../../pen.ts";
import { GALVANIZED, mix, shade, srgb } from "../palette.ts";
import type { Shelf } from "./fittings.ts";
import { ball, front, lathe, limb, rotated } from "./forms.ts";
import { snackPacket } from "./stock-mesh.ts";
import { grocerProp } from "./grocer-props.ts";

/**
 * Packaged goods and produce shared by several trades. Every item stands on
 * or hangs from the given point and shows its face toward -Y, the viewer's
 * side of a room or shelf. All lengths are meters.
 */

/** Converts a space-separated list of sRGB `#rrggbb` colors to linear tints. */
const colors = (list: string) => list.split(" ").map(srgb);

/** Printed label and packaging colors. */
export const LABELS = colors(
  "#c8281e #e8b82c #1f5fa8 #2f8f4f #f0ece0 #e87a1e #7a2a8a #d8486a #1e8a8a #f4d03c #a81e2c #204080 #f08a9a #5a3a1c",
);
/** Bottle glass: green, amber, clear and dark. */
export const GLASS = colors("#3f6a38 #6a431c #cfd8d2 #1f3a2a #8a5a22 #d8d0b8");
/** Molded plastic. */
export const PLASTICS = colors("#d8281e #1f6fc8 #e8b020 #2f9f5f #e86aa0 #f0ece0 #e87020");
/** Preserves, sweets and dried goods seen through glass. */
export const CONTENTS = colors("#a83a1e #d8a02c #7a8a2c #5a2a1a #e8d8a0 #c84a5a #3a2a1e #e8862c #f0e0b0");
export const CARDBOARD = srgb("#a8845a");
const PAPER = srgb("#ece6d2");
const CAPS = colors("#c8281e #e8e4d8 #d8a82c #2a2a2c #1f5fa8");

/** Draws a labeled tin can with a seamed steel lid. */
export function tin(pen: Pen, at: V3, radius: number, height: number, label: V3): void {
  lathe(pen, "paint", at, [[radius, 0], [radius, height - 0.006]], label, 6);
  lathe(pen, "metal", at, [[radius * 1.04, height - 0.006], [radius * 1.04, height], [0, height]], GALVANIZED, 6);
}

/** Draws a glass bottle with a shoulder, neck and cap, and a paper label when one is given. */
export function bottle(pen: Pen, at: V3, radius: number, height: number, glass: V3, cap: V3, label?: V3): void {
  lathe(pen, "pane", at, [[radius, 0], [radius, height * 0.56], [radius * 0.42, height * 0.8], [radius * 0.36, height * 0.93]], glass, 6);
  lathe(pen, "paint", at, [[radius * 0.44, height * 0.93], [radius * 0.44, height], [0, height]], cap, 6);
  if (label) lathe(pen, "paint", at, [[radius * 1.04, height * 0.16], [radius * 1.04, height * 0.44]], label, 6);
}

/** Draws a jar with tinted contents, a paper label and a screw lid. */
export function jar(pen: Pen, at: V3, radius: number, height: number, content: V3, lid: V3): void {
  const glass = shade(content, 0.65);
  lathe(pen, "pane", at, [
    [radius * 0.89, 0], [radius, height * 0.09], [radius, height * 0.70],
    [radius * 0.89, height * 0.82], [radius * 0.84, height * 0.87],
  ], [glass, point => shade(content, 0.84 + 0.15 * Math.cos(point[0] * 430 + point[2] * 690)), glass], 8);
  lathe(pen, "paint", at, [
    [radius * 0.9, height * 0.86], [radius * 0.94, height * 0.90],
    [radius * 0.94, height * 0.98], [radius * 0.88, height], [0, height],
  ], [shade(lid, 0.7), lid, shade(lid, 1.12), lid], 8);
  const [x, y, z] = at;
  const labelRadius = radius + 0.001;
  for (const side of [-1, 1]) {
    const edge = side * labelRadius * 0.49;
    const depth = -labelRadius + Math.abs(edge) * (Math.SQRT2 - 1);
    pen.face("paint", [
      [x, y - labelRadius, z + height * 0.27],
      [x + edge, y + depth, z + height * 0.27],
      [x + edge, y + depth, z + height * 0.48],
      [x, y - labelRadius, z + height * 0.48],
    ], [side * (Math.SQRT2 - 1), -1, 0], shade(PAPER, 0.88));
  }
}

/** Draws a printed carton centered on `at`, with a contrasting band across its face. */
export function carton(pen: Pen, at: V3, width: number, depth: number, height: number, color: V3, band: V3): void {
  const [x, y, z] = at;
  pen.box("paint", [x - width / 2, y - depth / 2, z], [x + width / 2, y + depth / 2, z + height], color, "df");
  front(pen, "paint", x - width / 2, x + width / 2, z + height * 0.3, z + height * 0.62, y - depth / 2 - 0.001, band);
}

/** Draws a sealed snack packet standing on its lower crimp. */
export function packet(pen: Pen, at: V3, width: number, height: number, color: V3, print: V3): void {
  snackPacket(pen, at, width, height, mix(color, print, 0.15));
}

/** Draws an open cloth sack heaped with loose goods, its mouth rolled down. */
export function sack(pen: Pen, at: V3, radius: number, height: number, cloth: V3, content: V3): void {
  lathe(
    pen,
    "paint",
    at,
    [[radius * 0.78, 0], [radius, height * 0.2], [radius * 0.97, height * 0.78], [radius * 0.9, height], [radius * 0.98, height + 0.015], [radius * 0.94, height - 0.04], [radius * 0.84, height - 0.03]],
    [cloth, cloth, cloth, shade(cloth, 1.08), shade(cloth, 1.08), shade(cloth, 0.8)],
    9,
  );
  lathe(pen, "paint", at, [[radius * 0.85, height - 0.035], [radius * 0.45, height + 0.02], [0, height + 0.04]], content, 9);
}

/** One kind of round produce: its radius, proportions, finish and the colors it ripens through. */
export interface Fruit {
  radius: number;
  stretch: V3;
  glossy: boolean;
  colors: V3[];
}

export const FRUITS = {
  orange: { radius: 0.038, stretch: [1, 1, 0.94], glossy: false, colors: colors("#e8821e #f09428 #e07818") },
  apple: { radius: 0.036, stretch: [1, 1, 0.95], glossy: true, colors: colors("#b81e22 #c8322a #d8483a #a81a2a") },
  greenApple: { radius: 0.036, stretch: [1, 1, 0.95], glossy: true, colors: colors("#8ab83a #9cc44a #a4c84a") },
  pear: { radius: 0.034, stretch: [1, 1, 1.3], glossy: false, colors: colors("#c8c05a #d4c868 #b8b450") },
  tomato: { radius: 0.032, stretch: [1, 1, 0.85], glossy: true, colors: colors("#d8281e #e03a24 #c82a1a") },
  lemon: { radius: 0.028, stretch: [1.3, 1, 1], glossy: false, colors: colors("#f0d030 #e8c828") },
  pomelo: { radius: 0.075, stretch: [1, 1, 1.08], glossy: false, colors: colors("#c8c860 #b8c058 #d8d070") },
  plum: { radius: 0.026, stretch: [1, 1, 1], glossy: true, colors: colors("#5a2a5a #6a2a4a #4a2a60") },
  potato: { radius: 0.036, stretch: [1.35, 1, 0.8], glossy: false, colors: colors("#b89a6a #a88a5a #c4a878") },
  onion: { radius: 0.034, stretch: [1, 1, 0.92], glossy: true, colors: colors("#c8904a #b87a3a #8a3a5a") },
  egg: { radius: 0.024, stretch: [1, 1, 1.3], glossy: false, colors: colors("#e8d8c0 #d8b890 #f0e8dc #c8a078") },
} satisfies Record<string, Fruit>;

/** Draws one piece of round produce resting on `at`. */
export function fruit(pen: Pen, at: V3, kind: Fruit, rng: Rng): void {
  const center: V3 = [at[0], at[1], at[2] + kind.radius * kind.stretch[2]];
  ball(pen, kind.glossy ? "pane" : "paint", center, kind.radius, shade(rng.pick(kind.colors), rng.float(0.9, 1.08)), 5, kind.stretch);
}

/**
 * Piles items over an ellipse of semi-axes `rx` and `ry` around `center`:
 * close-packed courses of `size`-radius items, each course smaller and higher
 * than the one below. `draw` places one item resting on the given point.
 */
export function heap(pen: Pen, center: V3, rx: number, ry: number, size: number, courses: number, rng: Rng, draw: (at: V3) => void): void {
  for (let course = 0; course < courses; course++) {
    const shrink = 1 - course * 0.34;
    const ax = rx * shrink - size * 0.6,
      ay = ry * shrink - size * 0.6;
    if (ax < size * 0.3 || ay < size * 0.3) break;
    const pitch = size * 2.05;
    for (let row = -Math.ceil(ay / pitch); row <= Math.ceil(ay / pitch); row++)
      for (let column = -Math.ceil(ax / pitch); column <= Math.ceil(ax / pitch); column++) {
        const x = (column + (row % 2 ? 0.5 : 0) + course * 0.5) * pitch + rng.float(-0.12, 0.12) * size,
          y = (row * 0.87 + course * 0.3) * pitch + rng.float(-0.12, 0.12) * size;
        if ((x / ax) ** 2 + (y / ay) ** 2 > 1) continue;
        draw([center[0] + x, center[1] + y, center[2] + course * size * 1.55]);
      }
  }
}

/** Draws a striped watermelon lying on `at`, `length` long. */
export function melon(pen: Pen, at: V3, length: number, rng: Rng): void {
  const radius = length * 0.4;
  const center: V3 = [at[0], at[1], at[2] + radius];
  const dark = srgb("#1f4a22"),
    light = srgb("#5a9a48");
  const phase = rng.float(0, Math.PI);
  ball(pen, "pane", center, radius, (p) => (Math.sin(Math.atan2(p[2] - center[2], p[1] - center[1]) * 6 + phase) > 0 ? dark : light), 12, [1.25, 1, 1], 5);
}

/** Draws half a watermelon lying on `at` with its red cut face up. */
export function melonHalf(pen: Pen, at: V3, radius: number): void {
  lathe(pen, "pane", at, [[0, 0], [radius * 0.7, radius * 0.25], [radius, radius * 0.75]], srgb("#2a5a28"), 10);
  lathe(pen, "paint", at, [[radius, radius * 0.75], [radius * 0.92, radius * 0.76], [0, radius * 0.76]], [srgb("#dfe8c0"), srgb("#d8323a")], 10);
}

/** Hangs a hand of bananas by its crown from `at`. */
export function bananas(pen: Pen, at: V3, rng: Rng): void {
  const ripe = mix(srgb("#e8c838"), srgb("#9ab040"), rng.float(0, 0.5));
  const count = rng.int(5, 8);
  limb(pen, "paint", [at, [at[0], at[1], at[2] - 0.04]], [0.012, 0.016], srgb("#6a5a2a"), 5);
  for (let i = 0; i < count; i++) {
    const azimuth = -Math.PI * 0.85 + (i / (count - 1)) * Math.PI * 0.7 + rng.float(-0.08, 0.08);
    const reach = rng.float(0.85, 1.1);
    const path: V3[] = [];
    for (let s = 0; s <= 4; s++) {
      const t = s / 4;
      const out = 0.015 + 0.075 * Math.sin(t * Math.PI * 0.85) * reach;
      path.push([at[0] + Math.cos(azimuth) * out, at[1] + Math.sin(azimuth) * out, at[2] - 0.04 - 0.17 * t * reach]);
    }
    const tip = path[4][2];
    limb(pen, "paint", path, [0.008, 0.017, 0.019, 0.015, 0.005], (p) => (p[2] < tip + 0.02 ? shade(ripe, 0.45) : ripe), 5);
  }
}

/** Draws a pineapple standing on `at` under its crown of leaves. */
export function pineapple(pen: Pen, at: V3, rng: Rng): void {
  lathe(pen, "paint", at, [[0.03, 0], [0.058, 0.035], [0.062, 0.1], [0.05, 0.17], [0.022, 0.2]], shade(srgb("#b8862a"), rng.float(0.85, 1.1)), 7);
  const green = srgb("#4a7a3a");
  for (let leaf = 0; leaf < 7; leaf++) {
    const angle = (leaf / 7) * Math.PI * 2 + rng.float(-0.2, 0.2);
    const out = rng.float(0.05, 0.09),
      c = Math.cos(angle),
      s = Math.sin(angle);
    pen.sheet(
      "paint",
      [
        [at[0] - s * 0.015, at[1] + c * 0.015, at[2] + 0.195],
        [at[0] + s * 0.015, at[1] - c * 0.015, at[2] + 0.195],
        [at[0] + c * out, at[1] + s * out, at[2] + 0.2 + rng.float(0.08, 0.14)],
      ],
      shade(green, rng.float(0.8, 1.2)),
    );
  }
}

/** Draws a head of cabbage resting on `at` with a few loose outer leaves. */
export function cabbage(pen: Pen, at: V3, radius: number, rng: Rng): void {
  const green = shade(srgb("#a8c878"), rng.float(0.85, 1.1));
  const center: V3 = [at[0], at[1], at[2] + radius * 0.85];
  ball(pen, "paint", center, radius, green, 7, [1, 1, 0.85]);
  for (let leaf = 0; leaf < 4; leaf++) {
    const angle = rng.float(0, Math.PI * 2);
    const c = Math.cos(angle),
      s = Math.sin(angle);
    pen.sheet(
      "paint",
      [
        [center[0] + c * radius * 0.5 - s * radius * 0.6, center[1] + s * radius * 0.5 + c * radius * 0.6, at[2] + 0.004],
        [center[0] + c * radius * 0.5 + s * radius * 0.6, center[1] + s * radius * 0.5 - c * radius * 0.6, at[2] + 0.004],
        [center[0] + c * radius * 1.12 + s * radius * 0.4, center[1] + s * radius * 1.12 - c * radius * 0.4, center[2] + radius * 0.2],
        [center[0] + c * radius * 1.12 - s * radius * 0.4, center[1] + s * radius * 1.12 + c * radius * 0.4, center[2] + radius * 0.2],
      ],
      shade(srgb("#5a8a3a"), rng.float(0.85, 1.15)),
    );
  }
}

/** Draws a bunch of leafy greens lying on `at`, stalks toward the viewer, `length` long. */
export function greens(pen: Pen, at: V3, length: number, rng: Rng): void {
  const [x, y, z] = at;
  const leafy = srgb("#3f7a34"),
    stalk = srgb("#dfe8c8");
  for (let i = 0; i < 6; i++) {
    const offset = (i - 2.5) * 0.018 + rng.float(-0.005, 0.005),
      lift = 0.012 + Math.abs(i - 2.5) * 0.004 + rng.float(0, 0.012);
    limb(pen, "paint", [[x + offset * 0.5, y, z + lift], [x + offset, y + length * 0.45, z + lift + 0.01]], [0.009, 0.007], stalk, 4);
    pen.sheet(
      "paint",
      [
        [x + offset - 0.006, y + length * 0.4, z + lift + 0.008],
        [x + offset * 1.6 - 0.035, y + length * 0.75, z + lift + 0.02],
        [x + offset * 1.9, y + length, z + lift + 0.004],
        [x + offset * 1.6 + 0.035, y + length * 0.75, z + lift + 0.02],
        [x + offset + 0.006, y + length * 0.4, z + lift + 0.008],
      ],
      shade(leafy, rng.float(0.8, 1.2)),
    );
  }
}

/** Draws a tapered root lying along X from `at`: a white radish, or a carrot when `orange`. */
export function root(pen: Pen, at: V3, length: number, orange: boolean, rng: Rng): void {
  const [x, y, z] = at;
  const thick = orange ? 0.016 : 0.032;
  const tint = orange ? shade(srgb("#e8782a"), rng.float(0.9, 1.1)) : shade(srgb("#ece8dc"), rng.float(0.92, 1.04));
  limb(
    pen,
    "paint",
    [[x, y, z + thick], [x + length * 0.12, y, z + thick], [x + length * 0.55, y, z + thick], [x + length, y, z + thick * 0.5]],
    [thick * 0.5, thick, thick * 0.9, 0.003],
    tint,
    6,
  );
  for (let leaf = 0; leaf < 3; leaf++)
    pen.sheet(
      "paint",
      [[x, y - 0.008, z + thick], [x, y + 0.008, z + thick], [x - rng.float(0.06, 0.12), y + (leaf - 1) * 0.04, z + thick + rng.float(0, 0.03)]],
      shade(srgb("#4a8a3a"), rng.float(0.8, 1.2)),
    );
}

/** Hangs a string of garlic or shallots from `at`, `length` long. */
export function garlicString(pen: Pen, at: V3, length: number, rng: Rng): void {
  const bulb = rng.bool(0.7) ? srgb("#ece4d0") : srgb("#9a4a5a");
  pen.bar("paint", at, [at[0], at[1], at[2] - length], 0.006, srgb("#c8b888"));
  for (let z = 0.08; z < length; z += 0.05) {
    const angle = rng.float(0, Math.PI * 2);
    ball(pen, "paint", [at[0] + Math.cos(angle) * 0.022, at[1] + Math.sin(angle) * 0.022, at[2] - z], 0.024, shade(bulb, rng.float(0.88, 1.05)), 5, [1, 1, 1.15]);
  }
}

/** Hangs a tied pair of cured sausages from `at`. */
export function sausages(pen: Pen, at: V3, rng: Rng): void {
  const cured = shade(srgb("#8a2a1e"), rng.float(0.8, 1.15));
  for (const side of [-1, 1]) {
    const length = rng.float(0.17, 0.22);
    const path: V3[] = [at, [at[0] + side * 0.012, at[1], at[2] - 0.04]];
    for (let s = 1; s <= 4; s++) path.push([at[0] + side * (0.016 + s * 0.003), at[1], at[2] - 0.04 - (s / 4) * length]);
    limb(pen, "pane", path, [0.002, 0.003, 0.014, 0.016, 0.016, 0.004], cured, 5);
  }
}

/** Hangs a split salted fish by its tail from `at`, `length` long. */
export function saltedFish(pen: Pen, at: V3, length: number, rng: Rng): void {
  const skin = shade(srgb("#a89a78"), rng.float(0.8, 1.1));
  const [x, y, z] = at;
  pen.sheet("paint", [[x - length * 0.11, y, z], [x + length * 0.11, y, z], [x, y, z - length * 0.16]], shade(skin, 0.8));
  limb(
    pen,
    "paint",
    [[x, y, z - length * 0.1], [x, y, z - length * 0.3], [x, y, z - length * 0.6], [x, y, z - length * 0.88], [x, y, z - length]],
    [0.012, length * 0.1, length * 0.15, length * 0.11, 0.004],
    skin,
    6,
    0.24,
  );
}

/** One product line on a shelf: the room a unit takes and how to draw it standing on a point. */
export interface Line {
  width: number;
  depth: number;
  height: number;
  /** How many units may stand on one another. */
  stack: number;
  draw(pen: Pen, at: V3): void;
}

/** Chooses a product category and shared dimensions; successive units may vary their artwork. */
export type LineMaker = (rng: Rng) => Line;

/** Returns a label color and a contrasting band for one brand. */
function brand(rng: Rng): [V3, V3] {
  const [color, band] = rng.sample(LABELS, 2);
  return [color, band];
}

export const LINES = {
  tins: (rng) => {
    const radius = rng.float(0.033, 0.05),
      height = rng.float(0.08, 0.125),
      [label] = brand(rng);
    return { width: radius * 2.1, depth: radius * 2.1, height, stack: 3, draw: (pen, at) => tin(pen, at, radius, height, label) };
  },
  bottles: (rng) => {
    const radius = rng.float(0.028, 0.04),
      height = rng.float(0.2, 0.3);
    const glass = rng.pick(GLASS),
      cap = rng.pick(CAPS),
      label = rng.bool(0.8) ? rng.pick(LABELS) : undefined;
    return { width: radius * 2.15, depth: radius * 2.15, height, stack: 1, draw: (pen, at) => bottle(pen, at, radius, height, glass, cap, label) };
  },
  jars: (rng) => {
    const radius = rng.float(0.04, 0.058),
      height = rng.float(0.11, 0.17);
    const content = rng.pick(CONTENTS),
      lid = rng.pick(CAPS);
    return { width: radius * 2.12, depth: radius * 2.12, height, stack: 1, draw: (pen, at) => jar(pen, at, radius, height, content, lid) };
  },
  bigJars: (rng) => {
    const radius = rng.float(0.075, 0.1),
      height = rng.float(0.22, 0.3);
    const content = rng.pick(CONTENTS),
      lid = rng.pick([srgb("#c8281e"), srgb("#b8862a"), srgb("#2a2a2c")]);
    return { width: radius * 2.1, depth: radius * 2.1, height, stack: 1, draw: (pen, at) => jar(pen, at, radius, height, content, lid) };
  },
  cartons: (rng) => {
    const width = rng.float(0.07, 0.19),
      depth = rng.float(0.05, 0.12),
      height = rng.float(0.09, 0.24),
      [color, band] = brand(rng);
    return { width: width + 0.004, depth, height, stack: height < 0.14 ? 3 : 1, draw: (pen, at) => carton(pen, at, width, depth, height, color, band) };
  },
  packets: (rng) => {
    const width = rng.float(0.1, 0.16),
      height = rng.float(0.15, 0.22),
      [color, print] = brand(rng);
    return { width: width + 0.006, depth: 0.07, height, stack: 1, draw: (pen, at) => packet(pen, at, width, height, color, print) };
  },
  rolls: (rng) => {
    const tint = rng.pick([srgb("#f0ece4"), srgb("#f0c8d0"), srgb("#c8dcf0")]);
    return {
      width: 0.118,
      depth: 0.118,
      height: 0.1,
      stack: 3,
      draw: (pen, at) => lathe(pen, "paint", at, [[0.055, 0], [0.055, 0.098], [0.02, 0.098], [0.02, 0.07]], [tint, shade(tint, 0.92), shade(CARDBOARD, 0.8)], 8),
    };
  },
  thermoses: (rng) => {
    const body = rng.pick(PLASTICS);
    return {
      width: 0.21,
      depth: 0.13,
      height: 0.34,
      stack: 1,
      draw: (pen, at) => {
        lathe(pen, "pane", at, [[0.055, 0], [0.06, 0.02], [0.06, 0.24], [0.045, 0.28]], body, 8);
        lathe(pen, "metal", at, [[0.047, 0.28], [0.047, 0.325], [0.02, 0.34], [0, 0.34]], shade(GALVANIZED, 1.15), 8);
        limb(
          pen,
          "metal",
          [[at[0] + 0.058, at[1], at[2] + 0.22], [at[0] + 0.095, at[1], at[2] + 0.2], [at[0] + 0.095, at[1], at[2] + 0.09], [at[0] + 0.058, at[1], at[2] + 0.07]],
          [0.007, 0.007, 0.007, 0.007],
          shade(GALVANIZED, 1.1),
          4,
        );
      },
    };
  },
  mugs: (rng) => {
    const enamel = rng.pick([srgb("#ece8dc"), srgb("#2f5f9a"), srgb("#c8281e"), srgb("#3f8a5a")]);
    return {
      width: 0.15,
      depth: 0.1,
      height: 0.09,
      stack: 2,
      draw: (pen, at) => {
        lathe(
          pen,
          "pane",
          at,
          [[0.04, 0], [0.043, 0.085], [0.046, 0.09], [0.04, 0.086], [0.037, 0.01], [0, 0.01]],
          [enamel, srgb("#1f2f5a"), srgb("#1f2f5a"), srgb("#ece8dc"), srgb("#ece8dc")],
          6,
        );
        limb(
          pen,
          "pane",
          [[at[0] + 0.042, at[1], at[2] + 0.07], [at[0] + 0.068, at[1], at[2] + 0.045], [at[0] + 0.042, at[1], at[2] + 0.02]],
          [0.005, 0.005, 0.005],
          enamel,
          4,
        );
      },
    };
  },
  bowls: (rng) => {
    const glaze = rng.pick([srgb("#ece8dc"), srgb("#dfe8e8"), srgb("#e8d8b8")]),
      rim = rng.pick([srgb("#2f4f9a"), srgb("#b02a22"), srgb("#3a7a5a")]);
    const nested = rng.int(3, 6);
    // One unit is a whole nest: lower bowls show only their walls, the top one its hollow as well.
    return {
      width: 0.16,
      depth: 0.17,
      height: 0.06 + (nested - 1) * 0.03,
      stack: 1,
      draw: (pen, at) => {
        for (let i = 0; i < nested; i++) lathe(pen, "pane", [at[0], at[1], at[2] + i * 0.03], [[0.03, 0], [0.07, 0.05], [0.074, 0.058]], [glaze, rim], 8);
        lathe(pen, "pane", [at[0], at[1], at[2] + (nested - 1) * 0.03], [[0.074, 0.058], [0.068, 0.054], [0.03, 0.014], [0, 0.014]], [rim, glaze, glaze], 8);
      },
    };
  },
  paintTins: (rng) => {
    const paint = rng.pick(PLASTICS);
    return {
      width: 0.17,
      depth: 0.17,
      height: 0.18,
      stack: 2,
      draw: (pen, at) => {
        lathe(pen, "metal", at, [[0.08, 0], [0.08, 0.17], [0.083, 0.178], [0.07, 0.178], [0.07, 0.17], [0, 0.17]], shade(GALVANIZED, 1.05), 9);
        lathe(pen, "paint", at, [[0.0815, 0.03], [0.0815, 0.13]], paint, 9);
        limb(
          pen,
          "metal",
          [
            [at[0] - 0.08, at[1], at[2] + 0.15],
            [at[0] - 0.06, at[1] - 0.06, at[2] + 0.1],
            [at[0] + 0.06, at[1] - 0.06, at[2] + 0.1],
            [at[0] + 0.08, at[1], at[2] + 0.15],
          ],
          [0.003, 0.003, 0.003, 0.003],
          shade(GALVANIZED, 0.8),
          4,
        );
      },
    };
  },
  ceramicJars: (rng) => {
    const glaze = rng.pick([srgb("#ece8e0"), srgb("#dfe8ec"), srgb("#7a4a2a"), srgb("#3a5a4a")]),
      band = rng.pick([srgb("#2f4f9a"), srgb("#1f3a7a"), srgb("#b8862a")]);
    const radius = rng.float(0.07, 0.095);
    return {
      width: radius * 2.15,
      depth: radius * 2.15,
      height: radius * 2.9,
      stack: 1,
      draw: (pen, at) =>
        lathe(
          pen,
          "pane",
          at,
          [[radius * 0.6, 0], [radius, radius * 0.9], [radius * 0.95, radius * 1.6], [radius * 0.55, radius * 2.3], [radius * 0.6, radius * 2.45], [radius * 0.62, radius * 2.5], [radius * 0.3, radius * 2.75], [0.012, radius * 2.9], [0, radius * 2.9]],
          [glaze, band, glaze, glaze, glaze, shade(glaze, 0.9), shade(glaze, 0.9), band],
          9,
        ),
    };
  },
} satisfies Record<string, LineMaker>;

/** Chooses a fitting product for the remaining shelf width, trying each category at most once. */
function fittingLine(makers: LineMaker[], shelf: Shelf, available: number, rng: Rng): Line | undefined {
  for (const make of rng.shuffle([...makers])) {
    const product = make(rng);
    if (product.width <= available && product.height <= shelf.clear && product.depth <= shelf.depth) return product;
  }
  return undefined;
}

/**
 * Stocks a shelf from end to end. Goods stand in runs of one product line,
 * each a few units wide and stacked where the line stacks; a few front units
 * have been sold. A second row stands behind where it can be seen: on shelves
 * below eye level and behind a sold unit. `fill` thins the runs: 1 leaves no
 * gaps between them. `maximumRows=1` keeps distant storefront stock to one
 * visible facing row instead of building concealed inventory behind it.
 * Packed stocking instead uses millimeter gaps, mostly full stacks, and tries
 * other fitting categories before leaving unused capacity at the end of a run.
 */
export function stockShelf(pen: Pen, shelf: Shelf, makers: LineMaker[], rng: Rng, fill = 0.9, maximumRows = 2, density: "varied" | "packed" = "varied"): void {
  const packed = density === "packed";
  let x = shelf.x0;
  let stocked = false;
  while (x < shelf.x1 - 0.05) {
    const line = packed ? fittingLine(makers, shelf, shelf.x1 - x, rng) : rng.pick(makers)(rng);
    if (!line) break;
    const placement = new Rng(rng.next() * 0xffffffff);
    const facings = rng.int(1, 4);
    const rows = Math.max(1, Math.min(maximumRows, Math.floor(shelf.depth / (line.depth + 0.006))));
    const levels = Math.max(1, Math.min(line.stack, Math.floor(shelf.clear / line.height)));
    if (line.height > shelf.clear || line.depth > shelf.depth) {
      x += 0.02;
      continue;
    }
    const rowDepth = shelf.depth / rows;
    const setback = placement.float(0.05, packed ? 0.4 : 0.85);
    for (let facing = 0; facing < facings && x + line.width <= shelf.x1; facing++) {
      let turn = placement.float(packed ? -0.25 : -0.38, packed ? 0.25 : 0.38);
      if (placement.bool(0.16)) turn += placement.pick([-1, 1]) * Math.PI / 2;
      let width = Math.abs(Math.cos(turn)) * line.width + Math.abs(Math.sin(turn)) * line.depth;
      let depth = Math.abs(Math.sin(turn)) * line.width + Math.abs(Math.cos(turn)) * line.depth;
      if (width > shelf.x1 - x || depth > rowDepth) {
        turn = 0;
        width = line.width;
        depth = line.depth;
      }
      const gap = Math.min(packed ? placement.float(0.001, 0.003) : placement.float(0.003, 0.012), shelf.x1 - x - width);
      const sold = rng.bool(packed ? 0.005 : 0.04) && stocked;
      for (let row = 0; row < rows; row++) {
        if (row === 0 ? sold : !sold && shelf.z > 1) continue;
        const high = packed ? (rng.bool(.85) ? levels : Math.max(1,levels-1)) : row === 0 ? rng.int(1, levels) : levels;
        const depthSlack = rowDepth - depth;
        const offset = Math.max(0, Math.min(1, setback + placement.float(-0.22, 0.22))) * depthSlack;
        const stack = rotated(pen, [
          x + width / 2 + placement.float(0, gap),
          shelf.y + row * rowDepth + depth / 2 + offset,
          shelf.z,
        ], "z", turn);
        for (let level = 0; level < high; level++) line.draw(stack, [0, 0, level * line.height]);
        stocked = true;
      }
      x += width + gap;
    }
    x += packed ? rng.float(0.002,0.006) : rng.bool(fill) ? rng.float(0.006, 0.018) : rng.float(0.035, 0.07);
  }
}

/** Draws a stack of sealed cartons standing on `at`, no taller than `height`, each `size` wide. */
export function cartonStack(pen: Pen, at: V3, size: number, height: number, rng: Rng): void {
  let z = at[2];
  while (true) {
    const h = size * rng.float(0.55, 0.8);
    if (z + h > at[2] + height) break;
    const x = at[0] + rng.float(-0.02, 0.02),
      y = at[1] + rng.float(-0.015, 0.015);
    const brightness = rng.float(.86, 1.06);
    grocerProp(pen, "stock-box", [x, y, z], [size, size * .72, h], 0,
      { variant: rng.int(1, 4), base: "supported", tint: [brightness, brightness, brightness] });
    z += h;
  }
}
