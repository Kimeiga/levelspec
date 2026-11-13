import type { V3 } from "../../architecture/types.ts";
import { Rng } from "../../generate/rng.ts";

/** Converts an sRGB `#rrggbb` color to the linear multipliers vertex colors use. */
export function srgb(hex: string): V3 {
  return [1, 3, 5].map((offset) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  }) as V3;
}

/** Scales a linear color, clamped to the displayable range. */
export const shade = (color: V3, factor: number): V3 =>
  color.map((value) => Math.min(1, value * factor)) as V3;

/** Multiplies two linear colors, as paint over a tinted finish does. */
export const blend = (a: V3, b: V3): V3 => [a[0] * b[0], a[1] * b[1], a[2] * b[2]];

/** Interpolates two linear colors; `t` of 0 returns `a`. */
export const mix = (a: V3, b: V3, t: number): V3 =>
  a.map((value, axis) => value + (b[axis] - value) * t) as V3;

/** Smooth deterministic variation in [-1, 1] over a facade, in meters. */
export function mottle(u: number, z: number, phase: number): number {
  return (
    Math.sin(u * 0.73 + phase) * Math.sin(z * 0.61 + phase * 1.7) * 0.6 +
    Math.sin(u * 1.91 - z * 1.13 + phase * 0.3) * 0.4
  );
}

const colors = (list: string) => list.split(" ").map(srgb);

/** Pale washes that multiply the rule's textured wall finish. */
export const WALL_TINTS = colors(
  "#f2ead8 #ecd5c8 #d6e4d4 #d4e0ea #eadfbd #e0e0da #cfcbc0 #f0e8de #dccfb6 #e8ccb4 #c8d8d0 #f4f0e6",
);
/** Opaque paints for balcony fronts, spandrels and other owner-painted parts. */
export const ACCENTS = colors(
  "#5fa8a0 #6f9fd0 #5f9a6a #e8dfc0 #e9e6dc #d99a84 #a9a79c #3f8f9a #8fbfd8 #c8b070",
);
export const FRAMES = colors(
  "#2f4f43 #e4e2d8 #5a4030 #3f7f7a #2a2c2e #7a3a2c #3a5f8f #8a8f92 #d8d4c4",
);
export const TRIMS = colors("#e6e2d6 #d6d2c4 #f0ece2 #c8c4b8");
export const ALUMINUM = srgb("#b4b8ba");
export const CAGES = colors("#3f6f55 #7fb0c8 #dcdad0 #7a4a30 #8a8c8a #2f5f7a #4f8f6a");
export const SHUTTERS = colors("#8f969a #4a6f95 #4f7a5f #7a4038 #d8d2c0 #5a6268 #9a8a5a");
export const DOORS = colors("#2f5f4a #6a2c28 #2f4f7a #5a4030 #8a8f92 #3a3c40 #a05a2c #3f7f7a");
export const GREENS = colors("#3f6f35 #5a8f40 #2f5a30 #7aa04a #4a7a3a");
export const FLOWERS = colors("#d8344a #f0c030 #f08aa0 #f4f0e8 #e06a20");
export const POTS = colors("#b0603a #3f5f9a #e8e4dc #8a4a30 #4a8f8a");
export const AC_BODIES = colors("#e0ddd2 #cfc8b4 #b8bcc0 #d8d0bc");
export const CURTAINS = colors(
  "#e8e0c8 #c8a878 #d8b8b0 #a8c0d0 #ececec #b8c8a0 #d0a060 #8898b0 #e8d0d8",
);
export const AWNINGS = colors("#3f7f5f #c0392b #2f5f8f #e8dfc0 #d8a030 #7a4a30");
export const GLASS_DARK = colors("#1f2a30 #2a3a40 #18242c #26323a");
export const RUST = srgb("#7a4a2a");
export const GALVANIZED = srgb("#a4a9aa");
export const CONCRETE = srgb("#b4b0a4");
export const SOOT = srgb("#2a2927");
export const WHITE: V3 = [1, 1, 1];

/** The construction habits one tenement keeps on every floor. */
export interface LotStyle {
  /** Wash multiplied into the textured finish. */
  wall: V3;
  /** Tint of the finish on sills, hoods, slabs and other cast or rendered trim. */
  trim: V3;
  frame: V3;
  /** Paint on balcony fronts and spandrels. */
  accent: V3;
  cage: V3;
  shutter: V3;
  window: "casement" | "slider" | "timber";
  /** Which bay type the frontage repeats. */
  plan: "windows" | "balconies" | "bands" | "mixed";
  /** Preferred primary bay width in meters. */
  bay: number;
  hoods: boolean;
  /** A concrete canopy over the shopfronts of a flush frontage. */
  canopy: boolean;
  balustrade: "solid" | "rail" | "half";
  /** Pattern of the security bars this building was fitted with. */
  bars: "bars" | "grid" | "diamond";
  /** How most households here closed in their balconies. */
  enclosure: "open" | "caged" | "glazed";
  /** The awnings sold on this street corner: canvas with contrasting hems or sheet metal. */
  awning: { canvas: boolean; base: V3; hem: V3 };
  /** The few washes households here repaint with, relative to the tenement wash, and how often they do. */
  repaints: V3[];
  repaint: number;
  /** Scales how much each household hangs on the facade. */
  clutter: number;
}

/** Draws one tenement's construction habits from its own random stream. */
export function lotStyle(rng: Rng): LotStyle {
  const canvas = rng.bool(0.6);
  const awning = canvas ? rng.pick(AWNINGS) : mix(GALVANIZED, RUST, rng.float(0.1, 0.6));
  const style = lotHabits(rng, canvas, awning);
  // Households repaint in a fresher coat of the building's own color, or its one accent.
  const pastel = mix(WHITE, style.accent, 0.45);
  const peak = Math.max(...pastel) / 1.08;
  style.repaints = [[1.1, 1.1, 1.08], [1.04, 1.07, 1.1], pastel.map((value) => value / peak) as V3];
  return style;
}

/** Draws the independent choices of a tenement style; repaint colors are derived afterwards. */
function lotHabits(rng: Rng, canvas: boolean, awning: V3): LotStyle {
  return {
    wall: rng.pick(WALL_TINTS),
    trim: rng.pick(TRIMS),
    frame: rng.pick(FRAMES),
    accent: rng.pick(ACCENTS),
    cage: rng.pick(CAGES),
    shutter: rng.pick(SHUTTERS),
    window: rng.pick(["casement", "casement", "slider", "timber"] as const),
    plan: rng.pick(["windows", "balconies", "bands", "mixed", "mixed"] as const),
    bay: rng.float(2.3, 3.3),
    hoods: rng.bool(0.45),
    canopy: rng.bool(0.5),
    balustrade: rng.pick(["solid", "solid", "rail", "half"] as const),
    bars: rng.pick(["bars", "grid", "diamond"] as const),
    enclosure: rng.pick(["open", "open", "caged", "glazed"] as const),
    awning: {
      canvas,
      base: awning,
      hem: canvas && rng.bool(0.6) ? srgb("#ece6d4") : shade(awning, 0.85),
    },
    repaints: [],
    repaint: rng.float(0.04, 0.2),
    clutter: rng.float(0.55, 1.15),
  };
}

/**
 * What one household changed about its own part of the facade. Construction
 * stays the tenement's; households differ in what they hang, draw and store.
 */
export interface Flat {
  /** A fresh coat over the tenement wash, when the household repainted. */
  paint?: V3;
  /** Repainting covers the whole story or only the band below the sills. */
  band: "full" | "spandrel";
  curtain: V3;
  /** 0 keeps a bare facade; 1 hangs everything a household can. */
  clutter: number;
  vacant: boolean;
  enclosure: "open" | "caged" | "glazed";
  /** The rare household that swapped its windows for aluminum sliders. */
  replaced: boolean;
}

/** Draws one household from its own stream, inheriting the tenement's habits. */
export function flat(style: LotStyle, rng: Rng): Flat {
  return {
    paint: rng.bool(style.repaint) ? rng.pick(style.repaints) : undefined,
    band: rng.pick(["full", "spandrel", "spandrel"] as const),
    curtain: rng.pick(CURTAINS),
    clutter: Math.min(1, rng.float(0, 1) ** 0.8 * style.clutter),
    vacant: rng.bool(0.025),
    enclosure: rng.bool(0.75)
      ? style.enclosure
      : rng.pick(["open", "caged", "glazed"] as const),
    replaced: style.window !== "slider" && rng.bool(0.07),
  };
}
