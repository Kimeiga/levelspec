import { chooseMeshGarment, hangMeshGarment, type MeshGarment } from "./balcony-props.ts";
import type { V3 } from "../../architecture/types.ts";
import type { Rng } from "../../generate/rng.ts";
import type { PatchVertex, Pen } from "../pen.ts";
import { GALVANIZED, shade, srgb } from "./palette.ts";

/** Parses a space-separated list of sRGB hex colors into linear tints. */
const colors = (list: string) => list.split(" ").map(srgb);
// Washing fades: whites dominate, colors are washed out and nothing is saturated.
const WHITES = colors("#dedbd2 #d9d7d0 #e0dccf #d3d6d8 #dcd6c6");
const PALES = colors("#c3ccd6 #d6c7b4 #d9c4c0 #c6d2c4 #d8d0aa #cfc6d2");
const MIDS = colors("#8fa3b8 #a89a84 #b88f88 #7f9488 #b5a06a #8f8aa0 #9a9c98");
const DARKS = colors("#3f4a5c #50545a #3b3f45 #5a5146 #4a5a52 #6b4542");
/** Plain, washed linens: muted stone, warm gray and off-white. */
const LINENS = colors("#d0cec5 #bfc1bb #c7cbc7 #b8b7b0 #cec9bd");
const CLOTHESPINS = colors("#b89868 #b89868 #9db4c4 #c9a3a3 #a9c2a4 #d6d2c4");
const HANGERS = [shade(GALVANIZED, 0.8), srgb("#d8d6cc"), srgb("#7f97ad"), srgb("#3c3c3a")];

/** Distance between cloth samples across the folds, meters; every fold spans at least four. */
const GRAIN = 0.075;
/** Distance between samples down the fall, where hanging cloth runs nearly straight, meters. */
const FALL_GRAIN = 0.14;
/** Cloth is drawn as two faces this far either side of its middle, meters. */
const HALF_THICKNESS = 0.0035;
// Adult shirt measurements, meters; children's sizes scale them.
const SHOULDER_DROP = 0.035;
const ARMHOLE = 0.2;
const NECK_HALF_WIDTH = 0.085;
/** A hanger holds a garment's neck this far below its support, meters. */
const HANGER_RISE = 0.075;
/** Radius of a hanger's hook around its support, meters. */
const HOOK_RADIUS = 0.019;
/** Cloth folded over a bamboo pole or a cord turns on this radius, meters. */
const POLE_TURN = 0.016;
const CORD_TURN = 0.008;

/**
 * What a garment hangs from: a thin cord that takes clothespins, a bamboo
 * pole that sleeves thread over, or a hanger hooked over a pole.
 */
export type Support = "line" | "pole" | "hanger";

/**
 * A point of a garment's cloth before it folds, in the garment's own hanging
 * plane: meters right of its middle (`x`), below its support (`y`) and in
 * front of the plane (`z`), with the matching point of its atlas cell.
 */
interface Fiber {
  x: number;
  y: number;
  z: number;
  /** Atlas cell position, right and down from the top left in 0..1. */
  s: number;
  t: number;
  /** Half the distance between the garment's two faces, meters. */
  gap: number;
  /** Direction the front face lies in, as (down, forward) components of a unit vector. */
  facing: [number, number];
  /** 0 where the cloth is held taut, 1 where it falls freely into folds. */
  loose: number;
}

/** A rectangular piece of cloth sampled at fractions across and down, both 0..1. */
interface Panel {
  columns: number;
  rows: number;
  fiber(c: number, r: number): Fiber;
}

/** What holds a garment up, positioned in the garment's hanging plane. */
type Fitting =
  | { kind: "pin"; x: number }
  | { kind: "hook"; y: number }
  | { kind: "bar"; x0: number; x1: number; y: number };

/** One garment cut to size: its cloth panels and what it hangs by. */
interface Cut {
  panels: Panel[];
  fittings: Fitting[];
  /** True when the top edge follows a sloping line; a hanger hangs plumb instead. */
  follows: boolean;
  /** Largest distance between samples across the folds, meters. */
  grain: number;
}

/** One washed item chosen for a place on a line: sized, colored, and ready to hang. */
interface CutGarment {
  kind: "cut";
  /** Extent along its support and hanging length below it, meters. */
  width: number;
  drop: number;
  cut: Cut;
  tint: V3;
  /** Color of its clothespins or hanger. */
  fittingTint: V3;
  /** How far a hanger sits off level: meters of drop per meter to the right. */
  tilt: number;
  /**
   * The folds the cloth falls into: two waves across it with the given depth
   * in meters, rates in radians per meter and phases, slanting by `skew`
   * radians per meter of fall.
   */
  folds: { depth: number; rate: [number, number]; phase: [number, number]; skew: number };
}

/** A fitted procedural cut or imported garment; both expose their occupied width and drop. */
export type Garment = CutGarment | MeshGarment;

/** Interpolates from `a` to `b`; `t` of 0 returns `a`. */
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Eases from 0 at `lo` to 1 at `hi`, clamped outside that range. */
const smoothstep = (lo: number, hi: number, value: number) => {
  const t = Math.min(1, Math.max(0, (value - lo) / (hi - lo)));
  return t * t * (3 - 2 * t);
};

/** Returns how many samples at most `grain` apart cover `length`, at least two. */
const steps = (length: number, grain: number) => Math.max(2, Math.ceil(length / grain));

/** Proportions of a shirt, meters and radians. */
interface TopSize {
  body: number;
  length: number;
  /** Sleeve length; 0 cuts a sleeveless undershirt with a scooped neck. */
  sleeve: number;
  cuff: number;
  /** Angle the sleeves hang at below horizontal. */
  droop: number;
  /** Hem width relative to the chest. */
  flare: number;
  /** How far down their atlas strip the sleeves reach, 0..1. */
  sleeveShare: number;
  /** Size relative to an adult's, which scales the shoulders, neck and armholes. */
  scale: number;
}

/**
 * Cuts a shirt pinned at its shoulders, hung on a hanger, or threaded onto a
 * pole through its sleeves. The body fills the middle 60% of the atlas cell
 * and each sleeve a 20% strip beside it, shoulder at the top.
 */
function topCut(size: TopSize, hung: "pins" | "hanger" | "thread"): Cut {
  const half = size.body / 2;
  const sleeveless = size.sleeve === 0;
  const threaded = hung === "thread";
  const shoulder = SHOULDER_DROP * size.scale,
    armhole = ARMHOLE * size.scale,
    neck = NECK_HALF_WIDTH * size.scale;
  // A pole runs through the sleeves 0.03 m below their top edge.
  const raise = { pins: -shoulder + 0.012, hanger: HANGER_RISE, thread: -shoulder - 0.03 }[hung];
  const puff = { pins: 0.006, hanger: 0.016, thread: 0.016 }[hung];
  /**
   * Half the distance between the body's faces `side` of the way from its middle to a side seam
   * (0..1) and `r` of the way down. The faces meet at the seams, except around a pole, which
   * holds the chest open near the top.
   */
  const bodyGap = (side: number, r: number) => {
    const seam = side * side * (threaded ? smoothstep(0.1, 0.35, r) : 1);
    return HALF_THICKNESS + puff * (1 - seam) * (1 - 0.6 * r);
  };
  const body: Panel = {
    columns: steps(size.body, GRAIN),
    rows: steps(size.length, FALL_GRAIN),
    fiber(c, r) {
      const side = 2 * c - 1;
      let top: number;
      if (sleeveless) top = Math.abs(side) < 0.56 ? 0.13 * Math.sqrt(1 - (side / 0.56) ** 2) : 0;
      else top = shoulder * Math.max(0, (Math.abs(side) * half - neck) / (half - neck));
      const sag = hung === "pins" ? 0.022 * (1 - side * side) * (1 - r) ** 2 : 0;
      const y = lerp(top, size.length, r) + sag;
      const strap = sleeveless ? 0.62 + 0.38 * smoothstep(0, armhole, y) : 1;
      return {
        x: side * half * strap * lerp(1, size.flare, r),
        y: y + raise,
        z: 0,
        s: 0.5 + 0.3 * side * strap,
        t: y / size.length,
        gap: bodyGap(side, r),
        facing: [0, 1],
        loose: smoothstep(0.08, 0.5, r),
      };
    },
  };
  const panels = [body];
  /**
   * Returns the middle of a sleeve `out` of the way from shoulder to cuff, and the angle it runs
   * at below horizontal there. A sleeve leaves the armhole square and bends evenly down to
   * `droop`, on a radius wide enough that its inner edge never folds over itself.
   */
  const sleeveAxis = (out: number): { reach: number; fall: number; angle: number } => {
    const bend = Math.max(size.sleeve * 0.4, size.droop * armhole * 0.75);
    /** The angle a sleeve has turned to after `along` meters. */
    const turn = (along: number) => size.droop * Math.min(1, along / bend);
    let reach = 0,
      fall = 0;
    const pieces = 12;
    for (let i = 0; i < pieces; i++) {
      const angle = turn(((i + 0.5) / pieces) * out * size.sleeve);
      reach += (Math.cos(angle) * size.sleeve * out) / pieces;
      fall += (Math.sin(angle) * size.sleeve * out) / pieces;
    }
    return { reach, fall, angle: turn(out * size.sleeve) };
  };
  for (const side of sleeveless ? [] : [-1, 1])
    panels.push({
      columns: steps(size.sleeve, FALL_GRAIN * 0.7),
      rows: 2,
      fiber(c, r) {
        // Columns always run to the right, so the left sleeve starts at its cuff.
        const out = side < 0 ? 1 - c : c;
        const axis = sleeveAxis(out);
        const width = lerp(armhole, size.cuff, out);
        // A threaded sleeve narrows from below so that its top edge stays on the pole.
        const across = threaded ? r * width - armhole / 2 : (r - 0.5) * width;
        // The sleeve opens into a tube from the gap the body's side seam has at the armhole.
        const root = bodyGap(1, Math.max(0, shoulder + armhole / 2 + across) / size.length);
        const tube = HALF_THICKNESS + (threaded ? 0.016 * Math.sqrt(Math.sin(Math.PI * r)) : 0.007 * Math.sin(Math.PI * r));
        return {
          x: side * (half + axis.reach - Math.sin(axis.angle) * across),
          y: shoulder + armhole / 2 + axis.fall + Math.cos(axis.angle) * across + raise,
          z: 0,
          s: side < 0 ? 0.2 * r : 1 - 0.2 * r,
          t: size.sleeveShare * out,
          gap: lerp(root, tube, smoothstep(0, 0.25, out)),
          facing: [0, 1],
          loose: threaded ? 0.15 : 0.25 + 0.5 * out,
        };
      },
    });
  let fittings: Fitting[] = [];
  if (hung === "hanger") fittings = [{ kind: "hook", y: raise + 0.01 }];
  else if (hung === "pins") fittings = [-1, 1].map((side) => ({ kind: "pin", x: side * half * (sleeveless ? 0.5 : 0.9) }));
  return { panels, fittings, follows: hung !== "hanger", grain: GRAIN * Math.max(1, size.flare) };
}

/**
 * Cuts pants or shorts hung by the waistband, pinned or on a clip hanger. The
 * atlas cell holds the garment upright and filling it: waistband on top, a
 * leg either side.
 */
function bottomsCut(size: { hip: number; length: number; rise: number; spread: number }, hung: "pins" | "hanger"): Cut {
  const half = size.hip / 2;
  const raise = hung === "hanger" ? HANGER_RISE : 0.005;
  const hem = half * 0.9;
  /** Half the distance between the faces across the seat, by distance from the middle in 0..1. */
  const seatGap = (side: number) => HALF_THICKNESS + 0.009 * (1 - side * side);
  const seat: Panel = {
    columns: steps(size.hip, GRAIN),
    rows: steps(size.rise, FALL_GRAIN),
    fiber(c, r) {
      const side = 2 * c - 1;
      return {
        x: side * half * lerp(0.92, 1, r),
        y: r * size.rise + raise,
        z: 0,
        s: c,
        t: (r * size.rise) / size.length,
        gap: seatGap(side),
        facing: [0, 1],
        loose: 0.35 * r,
      };
    },
  };
  const panels = [seat];
  for (const side of [-1, 1])
    panels.push({
      columns: steps(half, GRAIN),
      rows: steps(size.length - size.rise, FALL_GRAIN),
      fiber(c, r) {
        // 0 at the inseam, 1 at the outer seam; columns run to the right on both legs.
        const outer = side < 0 ? 1 - c : c;
        const top = side * half * outer;
        const foot = side * (size.spread / 2 + hem * outer);
        const tube = HALF_THICKNESS + 0.008 * Math.sin(Math.PI * outer);
        return {
          x: lerp(top, foot, r),
          y: lerp(size.rise, size.length, r) + raise,
          z: 0,
          s: 0.5 + 0.5 * side * outer,
          t: lerp(size.rise, size.length, r) / size.length,
          gap: lerp(seatGap(outer), tube, smoothstep(0, 0.3, r)),
          facing: [0, 1],
          loose: 0.4 + 0.6 * r,
        };
      },
    });
  const fittings: Fitting[] =
    hung === "hanger"
      ? [{ kind: "hook", y: raise - 0.012 }, { kind: "bar", x0: -half * 0.92, x1: half * 0.92, y: raise - 0.012 }]
      : [-1, 1].map((side) => ({ kind: "pin", x: side * half * 0.8 }));
  return { panels, fittings, follows: hung === "pins", grain: GRAIN };
}

/**
 * Cuts a towel or cloth pinned along its top edge, which sags between the
 * clothespins. The atlas cell holds it upright and filling the cell.
 */
function pinnedCut(width: number, length: number): Cut {
  const pins = Math.max(2, Math.round(width / 0.45) + 1);
  const panel: Panel = {
    columns: steps(width, GRAIN),
    rows: steps(length, FALL_GRAIN),
    fiber(c, r) {
      const between = (c * (pins - 1)) % 1;
      const sag = 0.022 * 4 * between * (1 - between);
      return {
        x: (c - 0.5) * width * lerp(1, 0.94, r * (1 - r) * 4 * 0.5 + r * 0.5),
        y: r * length + sag * (1 - r) ** 2 + 0.004,
        z: 0,
        s: c,
        t: r,
        gap: HALF_THICKNESS,
        facing: [0, 1],
        loose: 0.3 + 0.7 * r,
      };
    },
  };
  const fittings: Fitting[] = Array.from({ length: pins }, (_, i) => ({
    kind: "pin",
    x: (i / (pins - 1) - 0.5) * width * 0.97,
  }));
  return { panels: [panel], fittings, follows: true, grain: GRAIN };
}

/**
 * Cuts a towel, sheet or blanket folded over its support on a turn of
 * `radius`, the front flap `share` of its `total` length. The atlas cell runs
 * the cloth's whole length from the back hem at the top to the front hem at
 * the bottom.
 */
function drapedCut(width: number, total: number, share: number, radius: number, grain: number): Cut {
  const bend = Math.PI * radius;
  const back = total * (1 - share) - bend / 2,
    front = total * share - bend / 2;
  const fall = (grain * FALL_GRAIN) / GRAIN;
  const backRows = steps(back, fall),
    frontRows = steps(front, fall);
  const rows = backRows + 3 + frontRows;
  const panel: Panel = {
    columns: steps(width, grain),
    rows,
    fiber(c, r) {
      const row = Math.round(r * rows);
      const x = (c - 0.5) * width;
      const base = { x, s: c, gap: HALF_THICKNESS };
      if (row <= backRows) {
        const down = back * (1 - row / backRows);
        return { ...base, y: down, z: -radius, t: (back - down) / total, facing: [0, -1], loose: smoothstep(0, 0.3, down) };
      }
      if (row < backRows + 3) {
        const angle = ((row - backRows) / 3) * Math.PI;
        return {
          ...base,
          y: -radius * Math.sin(angle),
          z: -radius * Math.cos(angle),
          t: (back + (bend * (row - backRows)) / 3) / total,
          facing: [-Math.sin(angle), -Math.cos(angle)],
          loose: 0,
        };
      }
      const down = (front * (row - backRows - 3)) / frontRows;
      return { ...base, y: down, z: radius, t: (back + bend + down) / total, facing: [0, 1], loose: smoothstep(0, 0.3, down) };
    },
  };
  return { panels: [panel], fittings: [], follows: true, grain };
}

/** Space a garment may take: meters along its support and hanging below it. */
export interface Room {
  width: number;
  drop: number;
}

/** A kind of garment: the dyes it comes in, and how it is cut for a support. */
interface Design {
  weight: number;
  dyes: V3[];
  /** Cuts one garment, or returns undefined when it does not hang this way or fit the room. */
  tailor(rng: Rng, support: Support, room: Room): Cut | undefined;
}

/** Returns a tailor for shirts of the given proportions; `scale` shrinks them for children. */
function shirts(sleeve: [number, number], sleeveShare: number, scale = 1, flare = 1, length: [number, number] = [0.6, 0.7]): Design["tailor"] {
  return (rng, support) => {
    let hung: "pins" | "hanger" | "thread" = "pins";
    if (support === "hanger") hung = "hanger";
    else if (support === "pole" && sleeve[0] > 0) hung = "thread";
    // Sleeves on a pole lie along it; otherwise short sleeves droop below the shoulder.
    let droop = 0;
    if (hung !== "thread") droop = rng.float(0.66, 0.9);
    return topCut(
      {
        body: rng.float(0.42, 0.5) * scale,
        length: rng.float(...length) * scale,
        sleeve: rng.float(...sleeve) * scale,
        cuff: 0.15 * scale,
        droop,
        flare,
        sleeveShare,
        scale,
      },
      hung,
    );
  };
}

/** Returns a tailor for pants or shorts of the given length range, meters. */
function bottoms(length: [number, number], rise: number): Design["tailor"] {
  return (rng, support) =>
    bottomsCut(
      { hip: rng.float(0.38, 0.45), length: rng.float(...length), rise, spread: rng.float(0.02, 0.09) },
      support === "hanger" ? "hanger" : "pins",
    );
}

/** Returns a tailor for flat goods at least `width[0]` wide whose full length is drawn from `length`, meters. */
function flatGoods(width: [number, number], length: [number, number], grain = GRAIN): Design["tailor"] {
  return (rng, support, room) => {
    if (support === "hanger" || room.width < width[0]) return undefined;
    const wide = Math.min(rng.float(...width), room.width);
    const long = rng.float(...length);
    // Short cloths are pinned by one edge where a cord takes clothespins; the rest fold over.
    if (support === "line" && long <= room.drop && rng.bool(long < 0.8 ? 0.6 : 0.15)) return pinnedCut(wide, long);
    const share = rng.float(0.5, 0.62);
    return drapedCut(wide, Math.min(long, (room.drop - 0.02) / share), share, support === "pole" ? POLE_TURN : CORD_TURN, grain);
  };
}

// Plain vests, shorts and towels complement the imported button shirts, trousers and sheets.
const DESIGNS: Design[] = [
  { weight: 2, dyes: [...WHITES, ...PALES], tailor: shirts([.17, .2], .32) },
  { weight: 3, dyes: [...WHITES, ...PALES], tailor: shirts([0, 0], 0, 0.9, 1, [0.62, 0.7]) },
  { weight: 3, dyes: [...MIDS, ...DARKS], tailor: bottoms([0.4, 0.5], 0.27) },
  { weight: 2, dyes: [...PALES, ...MIDS], tailor: bottoms([0.3, 0.36], 0.24) },
  { weight: 3, dyes: LINENS, tailor: flatGoods([0.32, 0.42], [0.36, 0.5]) },
  { weight: 4, dyes: LINENS, tailor: flatGoods([0.36, 0.6], [0.7, 1.2]) },
];

/** Measures a cut's reach either side of its middle and below its support, meters. */
function extent(cut: Cut): Room {
  let reach = 0,
    drop = 0;
  for (const panel of cut.panels)
    for (let column = 0; column <= panel.columns; column++)
      for (let row = 0; row <= panel.rows; row++) {
        const fiber = panel.fiber(column / panel.columns, row / panel.rows);
        reach = Math.max(reach, Math.abs(fiber.x));
        drop = Math.max(drop, fiber.y);
      }
  return { width: reach * 2, drop };
}

/**
 * Chooses a garment that fits `room` on the given support, or undefined when
 * the few designs tried do not. On a hanger the room's width lies square to
 * whatever carries the hook; flat goods never hang that way.
 */
export function chooseGarment(rng: Rng, room: Room, support: Support): Garment | undefined {
  if (rng.bool(.72)) {
    const garment = chooseMeshGarment(rng, room, support);
    if (garment) return garment;
  }
  for (let attempt = 0; attempt < 5; attempt++) {
    const design = rng.weighted(DESIGNS.map((entry) => [entry, entry.weight] as const));
    const cut = design.tailor(rng, support, room);
    if (!cut) continue;
    const size = extent(cut);
    // Folds and sag reach a little past the flat pattern.
    if (size.width > room.width || size.drop + 0.03 > room.drop) continue;
    return {
      kind: "cut",
      width: size.width,
      drop: size.drop + 0.03,
      cut,
      tint: shade(rng.pick(design.dyes), rng.float(0.86, 1)),
      fittingTint: rng.pick(support === "hanger" ? HANGERS : CLOTHESPINS),
      tilt: cut.follows ? 0 : rng.float(-0.07, 0.07),
      folds: {
        depth: rng.float(0.008, 0.014),
        rate: [(2 * Math.PI) / (cut.grain * rng.float(4.5, 6.5)), (2 * Math.PI) / (cut.grain * rng.float(4, 5))],
        phase: [rng.float(0, 6.28), rng.float(0, 6.28)],
        skew: rng.float(-1.6, 1.6),
      },
    };
  }
  return undefined;
}

/**
 * Hangs a garment from the middle of the segment `left` to `right` on its
 * support, in pen coordinates with Z up. For a support running (dx, dy) its
 * front faces (-dy, dx). Without `lean`, cloth stays within 0.04 m of the
 * vertical plane through the support: its folds, thickness and turn over a
 * pole. `lean` pushes the hem forward by that many meters at its middle and
 * up to 1.7 times that at one end, as a breeze turns it, and beyond 0.01 m
 * also deepens the folds by up to 0.016 m.
 */
export function hangGarment(pen: Pen, garment: Garment, left: V3, right: V3, lean: number): void {
  if (garment.kind === "mesh") {
    hangMeshGarment(pen, garment, left, right, lean);
    return;
  }
  const run = Math.hypot(right[0] - left[0], right[1] - left[1]);
  const along: V3 = [(right[0] - left[0]) / run, (right[1] - left[1]) / run, 0];
  const forward: V3 = [-along[1], along[0], 0];
  const { cut, folds } = garment;
  const depth = folds.depth * (1 + 0.8 * Math.min(1, Math.max(0, (Math.abs(lean) - 0.01) / 0.03)));
  const slope = cut.follows ? (right[2] - left[2]) / run : 0;
  const middle = left.map((value, axis) => (value + right[axis]) / 2) as V3;
  /** Returns the pen position of a point of the hanging plane. */
  const place = (x: number, y: number, z: number): V3 => [
    middle[0] + along[0] * x + forward[0] * z,
    middle[1] + along[1] * x + forward[1] * z,
    middle[2] + slope * x - y,
  ];
  for (const panel of cut.panels) {
    const faces: PatchVertex[][][] = [[], []];
    for (let row = 0; row <= panel.rows; row++) {
      const front: PatchVertex[] = [],
        back: PatchVertex[] = [];
      for (let column = 0; column <= panel.columns; column++) {
        const fiber = panel.fiber(column / panel.columns, row / panel.rows);
        const wave =
          Math.sin(fiber.x * folds.rate[0] + folds.phase[0] + fiber.y * folds.skew) +
          0.4 * Math.sin(fiber.x * folds.rate[1] + folds.phase[1] - fiber.y * folds.skew * 1.7);
        const hang = Math.max(0, fiber.y) / garment.drop;
        // A hem rises a little where a fold pushes it out, and the whole piece turns slightly in the air.
        const y = fiber.y + garment.tilt * fiber.x - fiber.loose * hang * depth * 0.5 * Math.abs(wave);
        const x = fiber.x * (1 - 0.05 * fiber.loose * hang);
        const turn = Math.min(1.7, Math.max(0.3, 1 + 2.5 * x));
        const z = fiber.z + fiber.loose * depth * wave + lean * hang ** 1.3 * turn;
        // Creases shade the face they dent, which is the opposite face from the one they bulge.
        const crease = Math.sign(fiber.facing[1] || 1) * fiber.loose * wave * 0.1;
        front.push({
          at: place(x, y + fiber.gap * fiber.facing[0], z + fiber.gap * fiber.facing[1]),
          uv: [(520.5 + fiber.s * 495) / 1024, 1 - (520.5 + fiber.t * 495) / 1024],
          tint: shade(garment.tint, 0.94 + Math.min(0.06, crease) - Math.max(0, -crease)),
        });
        back.push({
          at: place(x, y - fiber.gap * fiber.facing[0], z - fiber.gap * fiber.facing[1]),
          uv: [(520.5 + fiber.s * 495) / 1024, 1 - (520.5 + fiber.t * 495) / 1024],
          tint: shade(garment.tint, 0.94 + Math.min(0.06, -crease) - Math.max(0, crease)),
        });
      }
      faces[0].push(front);
      faces[1].push(back);
    }
    pen.patch("balcony-cloth", faces[0]);
    pen.patch("balcony-cloth", faces[1], true);
  }
  for (const fitting of cut.fittings) {
    if (fitting.kind === "pin") {
      pen.bar("paint", place(fitting.x, 0.045, 0), place(fitting.x, -0.03, 0), 0.013, garment.fittingTint);
    } else if (fitting.kind === "bar") {
      pen.tube("paint", [place(fitting.x0, fitting.y, 0), place(fitting.x1, fitting.y, 0)], 0.005, garment.fittingTint, 4);
    } else {
      // The stem rises to just under the support; the hook then curls up one side and over the top.
      const hook: V3[] = [place(0, fitting.y, 0)];
      for (let step = 0; step <= 6; step++) {
        const angle = Math.PI / 2 - (step / 6) * Math.PI * 1.25;
        hook.push(place(HOOK_RADIUS * Math.cos(angle), HOOK_RADIUS * Math.sin(angle), 0));
      }
      pen.tube("paint", hook, 0.003, garment.fittingTint, 4);
    }
  }
}

/** How a row of washing is hung. */
export interface WashingOptions {
  /** Share of the row that carries something, 0..1. */
  fill: number;
  /** Longest hanging length allowed below the support, meters. */
  drop: number;
  support: "line" | "pole";
}

/**
 * Hangs a row of washing from a support running along the pen's X axis from
 * `x0` to `x1` at height `z`. Garments face +Y, stay within 0.05 m of the
 * pen's XZ plane, and hang at most `options.drop` below `z`.
 */
export function washing(pen: Pen, x0: number, x1: number, z: number, rng: Rng, options: WashingOptions): void {
  let x = x0 + rng.float(0, 0.12);
  while (x1 - x > 0.3) {
    const garment = chooseGarment(rng, { width: x1 - x, drop: options.drop }, options.support);
    if (!garment) break;
    if (rng.bool(options.fill)) hangGarment(pen, garment, [x, 0, z], [x + garment.width, 0, z], rng.float(-0.005, 0.005));
    x += garment.width + rng.float(0.03, 0.16);
  }
}

/**
 * Hangs a row of garments on hangers from a support running along the pen's
 * X axis from `x0` to `x1`, at height `z` where X is 0 and rising by `slope`
 * meters per meter. Each hangs square to the support, reaching up to `reach`
 * meters either side of it in Y and at most `drop` below it, as clothes on a
 * bamboo pole do.
 */
export function hangers(pen: Pen, x0: number, x1: number, z: number, slope: number, rng: Rng, reach: number, drop: number): void {
  for (let x = x0 + rng.float(0.04, 0.14); x < x1 - 0.04; x += rng.float(0.13, 0.3)) {
    const garment = chooseGarment(rng, { width: reach * 2, drop }, "hanger");
    if (!garment || rng.bool(0.15)) continue;
    const half = garment.width / 2,
      height = z + slope * x;
    hangGarment(pen, garment, [x, -half, height], [x, half, height], rng.float(-0.01, 0.01));
  }
}
