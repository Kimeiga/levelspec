import { drawPoster } from "../../posters.ts";
import type { V3 } from "../../../architecture/types.ts";
import type { Rng } from "../../../generate/rng.ts";
import type { KitSlot } from "../../kit-mesh.ts";
import type { Pen } from "../../pen.ts";
import { GALVANIZED, SOOT, shade, srgb } from "../palette.ts";
import { ball, front, lathe, rotated } from "./forms.ts";
import { agedShopTimber } from "./timber.ts";

/**
 * Shop fittings. Each draws in a pen whose X runs along the fitting, Y from
 * its viewer-facing front toward its back and Z up, with the origin at the
 * front-left bottom corner unless a position is given. Faces that could only
 * be seen from behind are left out. All lengths are meters.
 */

/** A level surface that carries goods: its X extent, front edge, usable depth, height and clear height above. */
export interface Shelf {
  x0: number;
  x1: number;
  y: number;
  depth: number;
  z: number;
  clear: number;
}

const BULB: V3 = [1, 0.94, 0.78];
const CARDS = ["#f4e04a", "#f0ece0", "#e8483a", "#f4a030"].map(srgb);
const BAMBOO = srgb("#c8b888");
const ENAMEL = srgb("#e8e6dc");

/**
 * Draws a shelving unit of boards between uprights no more than 0.95 m apart,
 * with a back panel and a kick board, and returns its shelves bottom to top
 * bay by bay. With `above` clear height over the unit, its top is returned
 * last as one more shelf.
 */
export function shelving(
  pen: Pen,
  width: number,
  depth: number,
  height: number,
  levels: number,
  slot: KitSlot,
  tint: V3,
  above = 0,
): Shelf[] {
  pen = agedShopTimber(pen);
  const board = 0.022,
    foot = 0.08;
  const pitch = (height - foot - board) / levels;
  const bays = Math.max(1, Math.round(width / 0.95));
  const bay = (width - board) / bays;
  front(pen, slot, 0, width, 0, height, depth - 0.006, shade(tint, 0.62));
  front(agedShopTimber(pen, 0), slot, board, width - board, 0, foot, 0.02, shade(tint, 0.6));
  for (let i = 0; i <= bays; i++) {
    const x = i * bay, interior = i > 0 && i < bays;
    pen.box(slot, [x, 0, 0], [x + board, depth - 0.006, height], shade(tint, 0.9), interior ? "dfu" : "df");
    // The top shelf covers interior caps except for the upright's exposed 4 mm front lip.
    if (interior) pen.box(slot, [x, 0, 0], [x + board, .004, height], shade(tint, 0.9), "lrbfd");
  }
  const shelves: Shelf[] = [];
  for (let level = 0; level <= levels; level++) {
    const z = foot + level * pitch;
    pen.box(slot, [board, 0.004, z], [width - board, depth - 0.006, z + board], tint, "flr");
    if (level === levels) break;
    for (let i = 0; i < bays; i++)
      shelves.push({ x0: i * bay + board + 0.008, x1: (i + 1) * bay - 0.008, y: 0.012, depth: depth - 0.03, z: z + board, clear: pitch - board - 0.012 });
  }
  if (above > 0.1) shelves.push({ x0: 0.02, x1: width - 0.02, y: 0.02, depth: depth - 0.04, z: height, clear: above });
  return shelves;
}

/**
 * Draws a shop counter with a 4 cm top and returns that top as a shelf. The
 * front is framed timber panels, glazed tiles over grout, or folded steel.
 */
export function counter(
  pen: Pen,
  width: number,
  depth: number,
  height: number,
  finish: "timber" | "tiled" | "steel",
  tint: V3,
  rng: Rng,
): Shelf {
  const top = 0.04,
    body = height - top;
  if (finish === "timber") pen = agedShopTimber(pen, undefined, {
    frontWear: { width: .014, strength: .65 },
  });
  const slot: KitSlot = finish === "timber" ? "timber" : finish === "steel" ? "metal" : "paint";
  pen.box(slot, [0.02, 0.03, 0], [width - 0.02, depth, body], shade(tint, finish === "tiled" ? 0.45 : 0.8), "dfu");
  if (finish === "tiled") {
    const columns = Math.max(2, Math.round((width - 0.04) / 0.15)),
      rows = Math.max(2, Math.round(body / 0.15));
    const w = (width - 0.04) / columns,
      h = body / rows;
    for (let i = 0; i < columns; i++)
      for (let j = 0; j < rows; j++)
        front(pen, "pane", 0.02 + i * w + 0.004, 0.02 + (i + 1) * w - 0.004, j * h + 0.004, (j + 1) * h - 0.004, 0.024, shade(tint, rng.float(0.86, 1)));
  } else if (finish === "timber") {
    const panels = Math.max(2, Math.round(width / 0.55));
    const w = (width - 0.04) / panels;
    for (let i = 0; i <= panels; i++) pen.box("timber", [0.02 + i * w - 0.03, 0.016, 0.06], [0.02 + i * w + 0.03, 0.03, body], tint, "dfu");
    for (const z of [0.06, body - 0.09]) pen.box("timber", [0.02, 0.016, z], [width - 0.02, 0.03, z + 0.09], tint, "flr");
    front(pen, "paint", 0.02, width - 0.02, 0, 0.06, 0.028, shade(SOOT, 1.4));
  } else {
    pen.box("metal", [0.02, 0.018, body * 0.5], [width - 0.02, 0.03, body * 0.5 + 0.03], shade(tint, 0.95), "flr");
    for (const x of [0.03, width - 0.07]) pen.box("metal", [x, 0.03, 0], [x + 0.04, 0.07, 0.1], shade(tint, 0.5), "dfu");
  }
  const slab = finish === "timber" ? shade(tint, 0.7) : finish === "steel" ? shade(GALVANIZED, 1.1) : shade(ENAMEL, 0.95);
  pen.box(finish === "timber" ? "timber" : "metal", [0, 0, body], [width, depth + 0.02, height], slab, "df");
  return { x0: 0.03, x1: width - 0.03, y: 0.03, depth: depth - 0.05, z: height, clear: 1 };
}

/** Draws an open slatted crate and returns its interior support surface in the incoming pen's local meters. */
export function crate(pen: Pen, width: number, depth: number, height: number, tint: V3, rng: Rng): Shelf {
  pen = agedShopTimber(pen, undefined, { frontWear: { width: .006, strength: .75 } });
  const post = 0.022,
    slat = 0.008;
  for (const x of [0, width - post])
    for (const y of [0, depth - post]) pen.box("timber", [x, y, 0], [x + post, y + post, height], shade(tint, 0.85), "d");
  pen.face("timber", [[0, 0, 0.012], [width, 0, 0.012], [width, depth, 0.012], [0, depth, 0.012]], [0, 0, 1], shade(tint, 0.7));
  const rows = 3,
    band = height / rows;
  for (let row = 0; row < rows; row++) {
    const z0 = row * band + 0.006,
      z1 = (row + 1) * band - 0.012;
    const wood = () => shade(tint, rng.float(0.82, 1.08));
    pen.box("timber", [0, -slat, z0], [width, 0, z1], wood(), "dlr");
    pen.box("timber", [0, depth, z0], [width, depth + slat, z1], wood(), "dlr");
    pen.box("timber", [-slat, 0, z0], [0, depth, z1], wood(), "dbf");
    pen.box("timber", [width, 0, z0], [width + slat, depth, z1], wood(), "dbf");
  }
  return { x0: post, x1: width - post, y: post, depth: depth - post * 2, z: .012, clear: height - .012 };
}

/**
 * Draws a molded bottle crate 0.42 × 0.3 × 0.27 m standing on the pen origin.
 * A `loaded` crate shows the necks and caps of its 24 bottles; crates under
 * another crate are drawn unloaded.
 */
export function bottleCrate(pen: Pen, tint: V3, glass: V3, cap: V3, loaded: boolean): void {
  const w = 0.42,
    d = 0.3,
    h = 0.27,
    wall = 0.014;
  pen.box("paint", [0, 0, 0], [w, d, h], tint, "du");
  // The rim and the inner faces make the crate read as hollow from above.
  pen.box("paint", [0, 0, h - 0.001], [w, wall, h], shade(tint, 1.1), "dbf");
  pen.box("paint", [0, d - wall, h - 0.001], [w, d, h], shade(tint, 1.1), "dbf");
  pen.box("paint", [0, wall, h - 0.001], [wall, d - wall, h], shade(tint, 1.1), "dlr");
  pen.box("paint", [w - wall, wall, h - 0.001], [w, d - wall, h], shade(tint, 1.1), "dlr");
  pen.face("paint", [[wall, d - wall, h * 0.45], [w - wall, d - wall, h * 0.45], [w - wall, d - wall, h], [wall, d - wall, h]], [0, -1, 0], shade(tint, 0.6));
  pen.face("paint", [[wall, wall, h * 0.45], [wall, d - wall, h * 0.45], [wall, d - wall, h], [wall, wall, h]], [1, 0, 0], shade(tint, 0.7));
  pen.face("paint", [[w - wall, wall, h * 0.45], [w - wall, d - wall, h * 0.45], [w - wall, d - wall, h], [w - wall, wall, h]], [-1, 0, 0], shade(tint, 0.7));
  pen.face("paint", [[wall, wall, h * 0.45], [w - wall, wall, h * 0.45], [w - wall, d - wall, h * 0.45], [wall, d - wall, h * 0.45]], [0, 0, 1], shade(tint, 0.35));
  // Hand holes and the molded window band.
  front(pen, "paint", w * 0.36, w * 0.64, h * 0.66, h * 0.82, -0.001, shade(tint, 0.25));
  front(pen, "paint", 0.03, w - 0.03, h * 0.12, h * 0.4, -0.001, shade(tint, 0.82));
  if (!loaded) return;
  for (let i = 0; i < 6; i++)
    for (let j = 0; j < 4; j++) {
      const at: V3 = [wall + 0.033 + i * ((w - 2 * wall - 0.066) / 5), wall + 0.033 + j * ((d - 2 * wall - 0.066) / 3), h * 0.45];
      lathe(pen, "pane", at, [[0.028, 0], [0.028, 0.05], [0.012, 0.13], [0.011, 0.17]], glass, 5);
      lathe(pen, "metal", at, [[0.014, 0.17], [0.014, 0.182], [0, 0.182]], cap, 5);
    }
}

/** Draws a hanging rail from `a` to `b` on two rods fixed to the ceiling at height `ceiling`. */
export function rail(pen: Pen, a: V3, b: V3, ceiling: number, tint: V3): void {
  pen.tube("metal", [a, b], 0.012, tint, 6);
  for (const t of [0.06, 0.94]) {
    const p = a.map((v, k) => v + (b[k] - v) * t) as V3;
    pen.bar("metal", [p[0], p[1], p[2] + 0.01], [p[0], p[1], ceiling], 0.012, tint);
  }
}

/** Draws an S-hook over a rail at `at` and returns the point `drop` below that its lower bend carries. */
export function hook(pen: Pen, at: V3, drop: number, tint: V3): V3 {
  const [x, y, z] = at;
  pen.tube(
    "metal",
    [
      [x, y + 0.016, z - 0.004],
      [x, y, z + 0.016],
      [x, y - 0.014, z - 0.006],
      [x, y, z - drop * 0.6],
      [x, y + 0.012, z - drop - 0.012],
      [x, y, z - drop + 0.004],
    ],
    0.003,
    tint,
    4,
  );
  return [x, y, z - drop];
}

/**
 * Draws a bulb on a cord from the ceiling point `at`, hanging `drop` below
 * it, under a conical shade of the given color when one is named. The shade
 * is 0.34 m across.
 */
export function pendant(pen: Pen, at: V3, drop: number, shadeColor?: V3): void {
  const [x, y] = at,
    z = at[2] - drop;
  pen.bar("paint", at, [x, y, z + 0.07], 0.006, SOOT);
  lathe(pen, "paint", [x, y, z + 0.03], [[0.016, 0], [0.016, 0.045], [0, 0.045]], shade(SOOT, 1.5), 6);
  ball(pen, "pane", [x, y, z], 0.03, BULB, 6, [1, 1, 1.2]);
  if (!shadeColor) return;
  lathe(pen, "paint", [x, y, z - 0.03], [[0.17, 0], [0.06, 0.1], [0.028, 0.125]], shadeColor, 10);
  lathe(pen, "paint", [x, y, z - 0.03], [[0.028, 0.123], [0.06, 0.098], [0.168, -0.001]], shade(ENAMEL, 1.05), 10);
}

/** Draws a fluorescent batten under the ceiling from `a` to `b`, which lie on the ceiling along X. */
export function tubeLight(pen: Pen, a: V3, b: V3): void {
  pen.box("paint", [a[0], a[1] - 0.03, a[2] - 0.045], [b[0], a[1] + 0.03, a[2]], shade(ENAMEL, 0.95), "u");
  pen.tube("pane", [[a[0] + 0.03, a[1], a[2] - 0.066], [b[0] - 0.03, a[1], a[2] - 0.066]], 0.016, [1, 1, 0.96], 6);
  for (const x of [a[0] + 0.012, b[0] - 0.042]) pen.box("paint", [x, a[1] - 0.02, a[2] - 0.085], [x + 0.03, a[1] + 0.02, a[2] - 0.045], shade(ENAMEL, 0.8), "u");
}

/** Draws a three-bladed ceiling fan on a rod from the ceiling point `at`; its blades sweep `span` across. */
export function ceilingFan(pen: Pen, at: V3, drop: number, span: number, rng: Rng): void {
  const hub: V3 = [at[0], at[1], at[2] - drop];
  const paint = shade(ENAMEL, rng.float(0.75, 1));
  pen.bar("metal", at, hub, 0.02, shade(GALVANIZED, 0.7));
  lathe(pen, "metal", [hub[0], hub[1], hub[2] - 0.07], [[0, 0], [0.07, 0.01], [0.09, 0.05], [0.05, 0.1], [0.02, 0.11]], paint, 10);
  const start = rng.float(0, Math.PI * 2);
  for (let blade = 0; blade < 3; blade++) {
    const arm = rotated(pen, [hub[0], hub[1], hub[2] - 0.02], "z", start + (blade * Math.PI * 2) / 3);
    arm.box("metal", [0.07, -0.012, -0.004], [0.18, 0.012, 0.004], shade(GALVANIZED, 0.6), "");
    arm.box("paint", [0.16, -0.06, -0.005], [span / 2, 0.06, 0.005], paint, "");
  }
}

/** Draws a round wooden stool 0.45 m high standing on `at`. */
export function stool(pen: Pen, at: V3, tint: V3): void {
  const [x, y, z] = at;
  lathe(pen, "timber", [x, y, z + 0.42], [[0.15, 0], [0.155, 0.03], [0, 0.03]], tint, 10);
  for (let leg = 0; leg < 4; leg++) {
    const angle = Math.PI / 4 + (leg * Math.PI) / 2;
    const c = Math.cos(angle),
      s = Math.sin(angle);
    // Legs start just above the floor: a splayed square leg has no end cap to rest flat.
    pen.bar("timber", [x + c * 0.15, y + s * 0.15, z + 0.004], [x + c * 0.1, y + s * 0.1, z + 0.42], 0.028, shade(tint, 0.85));
    const next = angle + Math.PI / 2;
    pen.bar("timber", [x + c * 0.135, y + s * 0.135, z + 0.14], [x + Math.cos(next) * 0.135, y + Math.sin(next) * 0.135, z + 0.14], 0.018, shade(tint, 0.8));
  }
}

/** Draws a hand-lettered price card on a bamboo stick planted at `at`, facing the viewer. */
export function priceCard(pen: Pen, at: V3, rng: Rng): void {
  const [x, y, z] = at;
  const stick = rng.float(0.1, 0.17),
    w = rng.float(0.09, 0.13),
    h = w * 0.72;
  pen.bar("timber", at, [x, y, z + stick], 0.005, BAMBOO);
  const paper = rng.pick(CARDS),
    ink = paper[1] > 0.5 ? srgb("#b01e1a") : srgb("#f4ecd8");
  const card: V3[] = [
    [x - w / 2, y - 0.004, z + stick - h * 0.15],
    [x + w / 2, y - 0.004, z + stick - h * 0.15],
    [x + w / 2, y - 0.004, z + stick + h * 0.85],
    [x - w / 2, y - 0.004, z + stick + h * 0.85],
  ];
  pen.sheet("paint", card, paper, shade(paper, 0.7));
  front(pen, "paint", x - w * 0.34, x + w * 0.05, z + stick + h * 0.18, z + stick + h * 0.66, y - 0.005, ink);
  front(pen, "paint", x + w * 0.12, x + w * 0.36, z + stick + h * 0.18, z + stick + h * 0.42, y - 0.005, ink);
  front(pen, "paint", x - w * 0.34, x + w * 0.36, z + stick, z + stick + h * 0.08, y - 0.005, shade(ink, 0.8));
}

/** Draws a spring counter scale with its dial toward the viewer and a pan on top, standing on `at`. */
export function counterScale(pen: Pen, at: V3, tint: V3): void {
  const [x, y, z] = at;
  pen.box("metal", [x - 0.13, y - 0.1, z], [x + 0.13, y + 0.1, z + 0.06], tint, "d");
  pen.box("metal", [x - 0.11, y - 0.07, z + 0.06], [x + 0.11, y + 0.07, z + 0.3], shade(tint, 0.92), "d");
  pen.disc("paint", [x, y - 0.071, z + 0.18], 0.092, [0, -1, 0], shade(ENAMEL, 1.05), 14);
  pen.bar("paint", [x, y - 0.073, z + 0.18], [x + 0.045, y - 0.073, z + 0.235], 0.006, srgb("#b01e1a"));
  for (let tick = 0; tick < 8; tick++) {
    const angle = (tick / 8) * Math.PI * 2;
    pen.bar(
      "paint",
      [x + Math.cos(angle) * 0.07, y - 0.072, z + 0.18 + Math.sin(angle) * 0.07],
      [x + Math.cos(angle) * 0.086, y - 0.072, z + 0.18 + Math.sin(angle) * 0.086],
      0.005,
      SOOT,
    );
  }
  pen.bar("metal", [x, y, z + 0.3], [x, y, z + 0.34], 0.03, shade(tint, 0.7));
  lathe(pen, "metal", [x, y, z + 0.34], [[0.03, 0], [0.15, 0.03], [0.16, 0.045], [0.15, 0.04], [0.03, 0.012], [0, 0.012]], shade(GALVANIZED, 1.1), 12);
}

/**
 * Draws a hanging dial scale on a hook from the ceiling point `at`, its pan
 * slung on three chains with its rim `drop` below the ceiling.
 */
export function hangingScale(pen: Pen, at: V3, drop: number, tint: V3): void {
  const [x, y] = at,
    dial = at[2] - Math.min(drop * 0.45, 0.5);
  pen.bar("metal", at, [x, y, dial + 0.11], 0.008, shade(GALVANIZED, 0.6));
  lathe(pen, "metal", [x, y, dial - 0.11], [[0, 0], [0.1, 0.02], [0.12, 0.11], [0.1, 0.2], [0, 0.22]], tint, 10);
  pen.disc("paint", [x, y - 0.118, dial], 0.085, [0, -1, 0], shade(ENAMEL, 1.05), 12);
  pen.bar("paint", [x, y - 0.12, dial], [x - 0.03, y - 0.12, dial + 0.06], 0.006, srgb("#b01e1a"));
  const pan = at[2] - drop;
  pen.bar("metal", [x, y, dial - 0.11], [x, y, dial - 0.16], 0.006, shade(GALVANIZED, 0.6));
  for (let chain = 0; chain < 3; chain++) {
    const angle = Math.PI / 2 + (chain * Math.PI * 2) / 3;
    pen.bar("metal", [x, y, dial - 0.16], [x + Math.cos(angle) * 0.15, y + Math.sin(angle) * 0.15, pan], 0.004, shade(GALVANIZED, 0.7));
  }
  lathe(pen, "metal", [x, y, pan - 0.05], [[0.04, 0], [0.14, 0.03], [0.158, 0.05], [0.15, 0.048], [0.04, 0.01], [0, 0.01]], shade(GALVANIZED, 1.05), 12);
}

/** Draws a tear-off calendar hung on a wall behind the plane Y=`y`, its top edge at `z`, centered on `x`. */
export function calendar(pen: Pen, x: number, y: number, z: number, rng: Rng): void {
  if (!pen.mesh.textured("posters")) return;
  const wall = pen.facing([x,y,z-.225],[1,0,0],[0,-1,0]);
  drawPoster(wall, { design: "calendar", width: .3, rotation: rng.float(-2,2), seed: "shop-calendar" });
}

/** Draws a round wall clock on the plane Y=`y`, centered on (`x`, `z`). */
export function wallClock(pen: Pen, x: number, y: number, z: number, rng: Rng): void {
  pen.disc("paint", [x, y - 0.006, z], 0.15, [0, -1, 0], shade(SOOT, 1.6), 14);
  pen.disc("paint", [x, y - 0.012, z], 0.132, [0, -1, 0], shade(ENAMEL, 1.05), 14);
  const hour = rng.float(0, Math.PI * 2),
    minute = rng.float(0, Math.PI * 2);
  pen.bar("paint", [x, y - 0.016, z], [x + Math.cos(hour) * 0.07, y - 0.016, z + Math.sin(hour) * 0.07], 0.012, SOOT);
  pen.bar("paint", [x, y - 0.018, z], [x + Math.cos(minute) * 0.11, y - 0.018, z + Math.sin(minute) * 0.11], 0.008, SOOT);
}
