import type { V3 } from "../../architecture/types.ts";
import type { Rng } from "../../generate/rng.ts";
import type { Pen } from "../pen.ts";
import { GLASS_DARK, shade, srgb } from "./palette.ts";
import { profiledStrip } from "./molding.ts";
import { weatheredPen } from "./weathered.ts";
import { bolt } from "./signs/steel.ts";
import type { Kit } from "./kit.ts";

/** How far a window frame stands proud of the plane it is set in, meters. */
const FRAME_DEPTH = 0.07;

/** The construction and household state of one window. */
export interface WindowLook {
  kind: "casement" | "slider" | "timber" | "louver";
  frame: V3;
  /** Tint of the wall finish on the sill and hood. */
  trim: V3;
  curtain: V3;
  /** Clear outward depth for hoods and open leaves, meters. */
  reach: number;
  hood: boolean;
  lit: boolean;
  /** A vacant flat boards its windows up. */
  boarded: boolean;
  /** Exterior guards require the sash to stay within its frame. */
  fixed?: boolean;
  /** Depth of the wall recess the window sits in, meters; 0 on a flush wall. */
  recess?: number;
  /** Building finish controls, when texture weathering is enabled. */
  weathering?: Kit;
  /** Transom height as a fraction of the full opening height; omission keeps the standard layout. */
  transomRatio?: number;
  /** Crossbar centers as fractions of the lower clear pane height; [] leaves uninterrupted tall panes. */
  lowerPaneBars?: readonly number[];
}

const BOARD = srgb("#8a7a5c");

/** Dark, matte room backs avoid baking a view or a sky reflection into a window. */
const ROOM = srgb("#101418");

/**
 * Closes the miniature room behind the frame. The facade owns its four reveals;
 * this back sits 3 mm in front of its sealed backing. Curtains are folded sheets
 * inside the recess, so oblique views show actual depth. Flush wall overlays
 * stay flat: their authored wall is neither cut nor misrepresented as a room.
 */
function windowInterior(pen: Pen, span: [number, number, number, number], look: WindowLook, rng: Rng): void {
  const [x0, x1, z0, z1] = span;
  const depth = look.recess ?? 0;
  pen.panel(look.lit ? "interior-lit" : "pane", x0, x1, z0, z1, depth > 0 ? -depth + 0.003 : 0.012, ROOM);
  const curtained = rng.bool(0.6);
  const width = (x1 - x0) * rng.float(0.12, 0.24);
  if (depth < 0.2 || !curtained) return;
  for (const start of [x0, x1 - width]) {
    for (let fold = 0; fold < 3; fold++) {
      const a = start + width * fold / 3, b = start + width * (fold + 1) / 3;
      const y0 = -depth * 0.65 + (fold % 2) * 0.025;
      const y1 = -depth * 0.65 + ((fold + 1) % 2) * 0.025;
      pen.sheet("paint", [[a, y0, z0], [b, y1, z0], [b, y1, z1], [a, y0, z1]], shade(look.curtain, 0.12));
    }
  }
}

/** Draws an honest flush dark light on an opaque host, with seeded nighttime emission. */
export function glazedLight(
  pen: Pen, x0: number, x1: number, z0: number, z1: number, y: number, rng: Rng,
): void {
  pen.panel(rng.bool(0.55) ? "interior-lit" : "pane", x0, x1, z0, z1, y, ROOM);
}

/** Keeps metal window sections inside their original bounds while chamfering their exposed edges. */
function frameBox(pen: Pen, low: V3, high: V3, color: V3): void {
  const size = high.map((value, i) => value - low[i]);
  const axis = size.indexOf(Math.max(...size));
  const across = axis === 0 ? 2 : 0, depth = [0, 1, 2].find(i => i !== axis && i !== across)!;
  const a = low.map((value, i) => i === axis ? value : (value + high[i]) / 2) as V3;
  const b = [...a] as V3; b[axis] = high[axis];
  const side: V3 = [0, 0, 0]; side[across] = 1;
  pen.beveledBar("paint", a, b, side, size[across], size[depth], color, 0.0009);
}

/**
 * Draws a window whose opening spans `x..x+w` and `z..z+h` on the wall plane:
 * a frame near the wall face, a dark chamber `look.recess` meters deep,
 * folded curtains, a sill at the wall face, and where the look allows a
 * concrete hood and an open leaf. Nothing passes `look.reach`.
 */
export function windowUnit(
  pen: Pen,
  x: number,
  z: number,
  w: number,
  h: number,
  look: WindowLook,
  rng: Rng,
): void {
  const member = look.kind === "timber" ? 0.065 : 0.045;
  const innerBottom = z + member, innerTop = z + h - member;
  const transom = look.transomRatio === undefined ? h >= 1 ? z + h * .72 : innerTop : z + h * look.transomRatio;
  const bars = look.lowerPaneBars ?? (look.kind === "timber" ? [.34, .67] : [.5]);
  if (look.transomRatio !== undefined && (!Number.isFinite(look.transomRatio) || look.transomRatio <= 0 || look.transomRatio >= 1
    || transom <= innerBottom + .04 || transom >= innerTop - .04))
    throw new Error("A window transom must leave positive glazing clearance above and below its frame.");
  if (look.lowerPaneBars !== undefined) {
    const centers = bars.map(ratio => innerBottom + (transom - innerBottom) * ratio).sort((a, b) => a - b);
    if (bars.some(ratio => !Number.isFinite(ratio) || ratio <= 0 || ratio >= 1)
      || centers.some((center, index) => center <= innerBottom + .024 || center >= transom - .024
        || (index > 0 && center - centers[index - 1] <= .024)))
      throw new Error("Window lower-pane bars must be distinct, separated and clear of their perimeter frames.");
  }
  const recess = look.recess ?? 0;
  const d = FRAME_DEPTH;
  const x1 = x + w,
    z1 = z + h;
  profiledStrip(pen, "concrete", x - 0.07, x1 + 0.07,
    [[-recess, z - 0.07], [0.09, z - 0.07], [0.115, z - 0.045], [0.115, z - 0.02], [-recess, z]], look.trim);
  pen.panel("paint", x - 0.04, x1 + 0.04, z - 0.042, z - 0.036, 0.1155, shade(look.trim, 0.5));
  if (look.hood && look.reach >= 0.3) {
    profiledStrip(pen, "concrete", x - 0.12, x1 + 0.12, [[0, z1 + 0.05], [0.25, z1 + 0.05], [0.28, z1 + 0.08], [0.28, z1 + 0.105], [0, z1 + 0.13]], look.trim);
    pen.box("concrete", [x - 0.12, 0.25, z1 + 0.02], [x1 + 0.12, 0.28, z1 + 0.05], shade(look.trim, 0.85), "bu");
  }
  const set = weatheredPen(pen.move(0, recess > 0 ? -0.035 : 0, 0), look.weathering, look.kind === "timber" ? "timber" : "frame");
  frameBox(set, [x, 0, z], [x + member, d, z1], look.frame);
  frameBox(set, [x1 - member, 0, z], [x1, d, z1], look.frame);
  frameBox(set, [x + member, 0, z], [x1 - member, d, z + member], look.frame);
  frameBox(set, [x + member, 0, z1 - member], [x1 - member, d, z1], look.frame);
  const inner: [number, number, number, number] = [x + member, x1 - member, z + member, z1 - member];
  const bead = shade(look.frame, 0.72);
  for (const u of [inner[0] - 0.012, inner[1]])
    frameBox(set, [u, d - 0.015, inner[2]], [u + 0.012, d + 0.008, inner[3]], bead);
  for (const v of [inner[2] - 0.012, inner[3]])
    profiledStrip(set, "paint", inner[0], inner[1], [[d - 0.015, v], [d + 0.008, v], [d + 0.004, v + 0.012], [d - 0.015, v + 0.012]], bead);
  if (look.kind === "casement" || look.kind === "timber")
    for (const v of [z + h * 0.2, z + h * 0.66]) {
      frameBox(set, [x + 0.006, d - 0.004, v - 0.006], [x + member - 0.004, d + 0.002, v + 0.08], look.frame);
      set.tube("metal", [[x + member * 0.5, d + 0.005, v], [x + member * 0.5, d + 0.005, v + 0.075]], 0.009, shade(look.frame, 0.6), 10);
      for (const at of [v + 0.01, v + 0.065])
        bolt(set, { slot: "metal", tint: look.frame, weathering: look.weathering }, [x + member * 0.25, d + 0.002, at], [0, 1, 0], 0.003);
    }
  if (look.boarded) {
    set.panel("timber", inner[0], inner[1], inner[2], inner[3], 0.03, BOARD);
    set.bar("timber", [inner[0], 0.045, inner[2]], [inner[1], 0.045, inner[3]], 0.035, shade(BOARD, 0.8));
    set.bar("timber", [inner[0], 0.045, inner[3]], [inner[1], 0.045, inner[2]], 0.035, shade(BOARD, 0.8));
    return;
  }
  windowInterior(pen, inner, look, rng);
  if (look.kind === "louver") {
    const slats = Math.max(3, Math.round((inner[3] - inner[2]) / 0.11));
    const pitch = (inner[3] - inner[2]) / slats;
    for (let i = 0; i < slats; i++) {
      const base = inner[2] + i * pitch;
      set.sheet(
        "glass",
        [
          [inner[0], 0.02, base + pitch * 0.92],
          [inner[1], 0.02, base + pitch * 0.92],
          [inner[1], d, base + pitch * 0.12],
          [inner[0], d, base + pitch * 0.12],
        ],
        shade(GLASS_DARK[1], 2.6),
      );
    }
    return;
  }
  if (look.kind === "slider") {
    const leaves = w > 1.7 ? 3 : 2;
    const pitch = (inner[1] - inner[0]) / leaves;
    const open = !look.fixed && rng.bool(0.3) ? rng.int(0, leaves - 1) : -1;
    for (const y of [d * 0.3, d * 0.7]) {
      frameBox(set, [inner[0], y - 0.004, inner[2]], [inner[1], y + 0.004, inner[2] + 0.012], bead);
      frameBox(set, [inner[0], y - 0.004, inner[3] - 0.012], [inner[1], y + 0.004, inner[3]], bead);
    }
    for (let i = 0; i < leaves; i++) {
      const l0 = inner[0] + i * pitch,
        l1 = l0 + pitch,
        y = i % 2 ? d * 0.4 : d * 0.8;
      if (i === open) continue;
      frameBox(set, [l0, y - 0.02, inner[2]], [l0 + 0.03, y, inner[3]], look.frame);
      frameBox(set, [l1 - 0.03, y - 0.02, inner[2]], [l1, y, inner[3]], look.frame);
      frameBox(set, [l0, y - 0.02, inner[2]], [l1, y, inner[2] + 0.03], look.frame);
      frameBox(set, [l0, y - 0.02, inner[3] - 0.03], [l1, y, inner[3]], look.frame);
      set.panel("glass", l0 + 0.03, l1 - 0.03, inner[2] + 0.03, inner[3] - 0.03, y - 0.006, [0.88, 0.94, 0.93]);
      const latch = (inner[2] + inner[3]) / 2;
      frameBox(set, [l1 - 0.026, y, latch - 0.045], [l1 - 0.008, Math.min(d, y + 0.008), latch + 0.045], bead);
    }
    return;
  }
  const lights = look.kind === "timber" ? 2 : Math.max(2, Math.round((inner[1] - inner[0]) / 0.5));
  const pitch = (inner[1] - inner[0]) / lights;
  const openLeaf = !look.fixed && look.reach >= 0.6 + recess && rng.bool(0.3) ? rng.int(0, lights - 1) : -1;
  for (let i = 0; i < lights; i++) {
    const l0 = inner[0] + i * pitch,
      l1 = l0 + pitch;
    if (i > 0) frameBox(set, [l0 - 0.017, 0, inner[2]], [l0 + 0.017, d * 0.85, inner[3]], look.frame);
    if (i === openLeaf) {
      const angle = rng.float(0.7, 1.3),
        hinge = i < lights / 2 ? l0 : l1,
        swing = (i < lights / 2 ? 1 : -1) * Math.cos(angle) * pitch;
      const tip: [number, number] = [hinge + swing, d + Math.sin(angle) * pitch];
      set.sheet(
        "glass",
        [
          [hinge, d, inner[2]],
          [tip[0], tip[1], inner[2]],
          [tip[0], tip[1], transom],
          [hinge, d, transom],
        ],
        [0.85, 0.9, 0.9],
      );
      for (const zBar of [inner[2] + 0.015, transom - 0.015])
        set.bar("paint", [hinge, d, zBar], [tip[0], tip[1], zBar], 0.03, look.frame);
      set.bar("paint", [tip[0], tip[1], inner[2]], [tip[0], tip[1], transom], 0.03, look.frame);
    }
    if (transom < inner[3]) set.panel("glass", l0 + 0.018, l1 - 0.018, transom + 0.02, inner[3] - 0.012, d * 0.4 - 0.003, [0.88, 0.94, 0.93]);
    if (i === openLeaf) continue;
    set.panel("glass", l0 + 0.018, l1 - 0.018, inner[2] + 0.012, transom - 0.02, d * 0.4 - 0.003, [0.88, 0.94, 0.93]);
    const latch = inner[2] + (transom - inner[2]) * 0.44;
    frameBox(set, [l1 - 0.024, d * 0.85, latch - 0.032], [l1 - 0.006, d, latch + 0.032], bead);
    for (const t of bars) {
      const bar = inner[2] + (transom - inner[2]) * t;
      frameBox(set, [l0, 0.02, bar - 0.012], [l1, d * 0.6, bar + 0.012], look.frame);
    }
  }
  if (transom < inner[3])
    frameBox(set, [inner[0], 0, transom - 0.018], [inner[1], d * 0.9, transom + 0.018], look.frame);
}

/** Draws welded security bars over an opening, proud of its frame. */
export function securityBars(
  pen: Pen,
  x: number,
  z: number,
  w: number,
  h: number,
  pattern: "bars" | "grid" | "diamond",
  color: V3,
  kit?: Kit,
): void {
  pen = weatheredPen(pen, kit, "cage");
  const y = FRAME_DEPTH + 0.025;
  const rod = (ax: number, az: number, bx: number, bz: number, thickness: number) =>
    pen.bar("paint", [ax, y, az], [bx, y, bz], thickness, color);
  if (pattern === "diamond") {
    const step = 0.24;
    for (let s = -h; s < w; s += step) {
      const a = Math.max(0, s),
        b = Math.min(w, s + h);
      if (b - a < 1e-6) continue;
      rod(x + a, z + (a - s), x + b, z + (b - s), 0.012);
      rod(x + a, z + h - (a - s), x + b, z + h - (b - s), 0.012);
    }
  } else {
    const count = Math.max(2, Math.round(w / (pattern === "grid" ? 0.2 : 0.13)));
    for (let i = 1; i < count; i++) rod(x + (w * i) / count, z, x + (w * i) / count, z + h, 0.012);
    const rails = pattern === "grid" ? Math.max(2, Math.round(h / 0.25)) : 2;
    for (let i = 1; i < rails; i++) rod(x, z + (h * i) / rails, x + w, z + (h * i) / rails, 0.014);
  }
  rod(x, z, x, z + h, 0.02);
  rod(x + w, z, x + w, z + h, 0.02);
  rod(x, z, x + w, z, 0.02);
  rod(x, z + h, x + w, z + h, 0.02);
}
