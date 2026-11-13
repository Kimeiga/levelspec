import type { V3 } from "../../../architecture/types.ts";
import type { Rng } from "../../../generate/rng.ts";
import { Kit } from "../kit.ts";
import { GALVANIZED, SOOT, WHITE, shade, srgb } from "../palette.ts";
import { floorLine, phoneLine, titleOf, wayUp, type Business } from "./copy.ts";
import type { Direction, TypeFace } from "./lettering.ts";
import type { Construction, Outline, PanelDesign, TextBlock } from "./panel.ts";
import type { Steel } from "./steel.ts";

/** The colors one sign is painted in, linear RGB. */
export interface Palette {
  ground: V3;
  ink: V3;
  /** A second ink for the smaller lines. */
  accent: V3;
  border: V3;
}

/** Reads `ground ink accent border` hex colors. */
function palette(colors: string): Palette {
  const [ground, ink, accent, border] = colors.split(" ").map(srgb);
  return { ground, ink, accent, border };
}

/** Painted boards with how often each occurs; white boards dominate the reference streets. */
const PAINTED: (readonly [Palette, number])[] = [
  [palette("#ece8dc #b21e1c #1e1e22 #b21e1c"), 5],
  [palette("#eeece4 #1e1e22 #b21e1c #1e1e22"), 3],
  [palette("#eae8e0 #1c3e8c #b21e1c #1c3e8c"), 3],
  [palette("#e8c43c #aa1c1a #1c1c1e #aa1c1a"), 2.5],
  [palette("#e8c43c #1c1c1e #aa1c1a #1c1c1e"), 1],
  [palette("#b01e1e #f0e8d6 #ecc448 #f0e8d6"), 3],
  [palette("#a81a1c #ecc448 #f0e8d6 #ecc448"), 2],
  [palette("#22468e #eeece4 #ecc448 #eeece4"), 2],
  [palette("#1e5c46 #ece8d6 #ecc448 #ece8d6"), 2],
  [palette("#1a1a1c #e2ba4e #e6e2d6 #e2ba4e"), 1],
  [palette("#e2d6ba #1e543e #b21e1c #1e543e"), 2],
];
/** Lacquered timber with gilt or painted lettering. */
const LACQUER = [
  palette("#17110e #e0b64a #d8c9a0 #e0b64a"),
  palette("#5a1410 #e6bc50 #f0e4c8 #e6bc50"),
  palette("#16382a #e0b64a #ece4c8 #e0b64a"),
  palette("#c49a62 #17100c #6a1810 #17100c"),
];
/** Acrylic faces of light boxes. */
const ACRYLIC = [
  palette("#f2f0e8 #c01c1c #1c1c20 #c01c1c"),
  palette("#f2f0e8 #1c3e9c #c01c1c #1c3e9c"),
  palette("#f0d040 #b01818 #1c1c1e #b01818"),
  palette("#f2f0e8 #166a3c #c01c1c #166a3c"),
  palette("#c41c1c #f4f0e4 #f0d040 #f4f0e4"),
];
/** Vitreous enamel plates. */
const ENAMEL = [palette("#f0eee6 #1a2c6c #a01818 #1a2c6c"), palette("#f0eee6 #18181c #a01818 #18181c"), palette("#1c3a7c #f0eee6 #f0d870 #f0eee6")];

const PALETTES: Record<Construction, (rng: Rng) => Palette> = {
  sheet: (rng) => rng.weighted(PAINTED),
  tile: (rng) => rng.weighted(PAINTED),
  cloth: (rng) => rng.weighted(PAINTED),
  painted: (rng) => rng.weighted(PAINTED),
  timber: (rng) => rng.pick(LACQUER),
  lightbox: (rng) => rng.pick(ACRYLIC),
  enamel: (rng) => rng.pick(ENAMEL),
};

/** The faces of type each construction is usually lettered in. */
const FACES: Record<Construction, TypeFace[]> = {
  sheet: ["kai", "kai", "brush", "song", "hei", "heavy"],
  tile: ["heavy", "kai", "hei", "brush"],
  cloth: ["brush", "kai", "heavy"],
  painted: ["heavy", "hei", "kai", "brush"],
  timber: ["kai", "brush", "song"],
  lightbox: ["hei", "round", "heavy", "slim", "round"],
  enamel: ["song", "hei", "kai"],
};

/** Paints steelwork is given before it rusts. */
const STEEL_PAINTS = [srgb("#2a2c2e"), srgb("#3a3c3a"), srgb("#2f4f43"), srgb("#6a2c22"), shade(GALVANIZED, 0.85), shade(GALVANIZED, 0.6)];

/** What one sign keeps across all its panels: colors, type, age and steel. */
export interface SignLook {
  construction: Construction;
  palette: Palette;
  face: TypeFace;
  /** 0 fresh from the workshop, 1 long neglected. */
  age: number;
  phase: number;
  steel: Steel;
}

/**
 * Draws a sign's look from `rng`. Its age rises with the dressing's wear
 * and grime. Texture-weathered steel retains its paint palette, with corrosion
 * determined by the component finish rather than replacing the whole material.
 */
export function drawLook(construction: Construction, kit: Kit, rng: Rng): SignLook {
  const age = Math.min(1, rng.float(0.05, 1) * (0.5 + kit.wear + 0.3 * kit.grime));
  const painted = age < 0.42;
  const look: SignLook = {
    construction,
    palette: PALETTES[construction](rng),
    face: rng.pick(FACES[construction]),
    age,
    phase: rng.float(0, 100),
    steel: painted
      ? { slot: "metal", tint: shade(rng.pick(STEEL_PAINTS), rng.float(0.85, 1.1)) }
      : { slot: "rust", tint: shade(WHITE, rng.float(0.7, 1)) },
  };
  if (kit.textureDensity) {
    const paint = kit.rng(`sign-steel/${look.phase}`);
    const weathering = new Kit(`${kit.seed}/sign-paint`, kit.detail, kit.grime, kit.wear, false, kit.textureDensity, kit.rust);
    look.steel = { slot: "metal", tint: shade(paint.pick(STEEL_PAINTS), paint.float(0.85, 1.1)), weathering };
  }
  return look;
}

/** Fills in the fields every panel of a sign shares. */
function panelOf(
  look: SignLook,
  width: number,
  height: number,
  depth: number,
  stack: PanelDesign["stack"],
  blocks: TextBlock[],
  options: { outline?: Outline; ground?: V3; border?: boolean } = {},
): PanelDesign {
  return {
    width,
    height,
    depth,
    construction: look.construction,
    outline: options.outline ?? "rectangle",
    ground: options.ground ?? look.palette.ground,
    border: options.border === false ? undefined : look.palette.border,
    stack,
    blocks: blocks.filter((block) => block.text.length > 0),
    age: look.age,
    phase: look.phase,
  };
}

/** How a level title reads: right to left on some traditionally painted boards, when it has no capitals. */
function levelDirection(text: string, look: SignLook, rng: Rng): Direction {
  const traditional = look.construction === "sheet" || look.construction === "timber";
  return traditional && !/[A-Z0-9]/i.test(text) && rng.bool(look.construction === "timber" ? 0.6 : 0.3) ? "rtl" : "ltr";
}

/** The drop shadow some painted and gilt lettering is given. */
function shadowFor(look: SignLook, rng: Rng): V3 | undefined {
  const chance = look.construction === "timber" ? 0.5 : look.construction === "sheet" || look.construction === "painted" ? 0.3 : 0;
  return rng.bool(chance) ? shade(SOOT, 0.9) : undefined;
}

/**
 * Designs a board that titles a business, composed for the board's
 * proportions. Upright boards letter the title from top to bottom, with a
 * floor or slogan above and a telephone number below where there is room;
 * level boards letter it across, with capitals or the telephone number
 * beneath, a slogan above, or the halves of a slogan upright at the ends;
 * squarish plates set name over trade, with the way upstairs below.
 */
export function titlePanel(business: Business, width: number, height: number, depth: number, look: SignLook, rng: Rng): PanelDesign {
  const { face, palette } = look;
  const shadow = shadowFor(look, rng);
  const title = titleOf(business);
  const floor = floorLine(business);
  const blocks: TextBlock[] = [];
  if (height >= width * 1.5) {
    const slender = height / width;
    const head = floor ?? (business.tagline.length <= 2 ? business.tagline : undefined);
    if (head && slender >= 2.6 && rng.bool(0.6)) blocks.push({ text: head, face, direction: "ltr", ink: palette.accent, share: 0.6 });
    if (business.name.length === 3 && slender >= 3) {
      blocks.push({ text: business.name, face, direction: "ttb", ink: palette.ink, share: 3, shadow });
      blocks.push({ text: business.trade, face, direction: "ttb", ink: palette.accent, share: business.trade.length * 0.72 });
    } else blocks.push({ text: title, face, direction: "ttb", ink: palette.ink, share: title.length, shadow });
    if (slender >= 3.2 && rng.bool(0.45)) blocks.push({ text: business.phone, face, direction: "ltr", ink: palette.accent, share: 0.42 });
    return panelOf(look, width, height, depth, "down", blocks);
  }
  if (width >= height * 1.5) {
    const broad = width / height;
    const direction = levelDirection(title, look, rng);
    const composition = rng.weighted([
      ["plain", 2],
      ["capitals", broad >= 2.2 ? 3 : 0],
      ["ends", broad >= 4 && business.tagline.length === 4 ? 2.5 : 0],
      ["slogan", broad >= 2.5 && broad < 6 ? 1.5 : 0],
      ["telephone", broad >= 3 ? 1 : 0],
    ] as const);
    const main: TextBlock = { text: title, face, direction, ink: palette.ink, share: 1, shadow };
    if (composition === "capitals")
      return panelOf(look, width, height, depth, "down", [{ ...main, share: 0.68 }, { text: business.english, face, direction: "ltr", ink: palette.accent, share: 0.32 }]);
    if (composition === "telephone")
      return panelOf(look, width, height, depth, "down", [{ ...main, share: 0.72 }, { text: phoneLine(business), face, direction: "ltr", ink: palette.accent, share: 0.28 }]);
    if (composition === "slogan")
      return panelOf(look, width, height, depth, "down", [{ text: business.tagline, face, direction, ink: palette.accent, share: 0.26 }, { ...main, share: 0.74 }]);
    if (composition === "ends") {
      const end = (text: string): TextBlock => ({ text, face, direction: "ttb", ink: palette.accent, share: 0.12 });
      // A four-character slogan splits into the two halves that flank the title.
      const ends = [business.tagline.slice(0, 2), business.tagline.slice(2)];
      return panelOf(look, width, height, depth, "across", direction === "rtl" ? [end(ends[1]), { ...main, share: 0.76 }, end(ends[0])] : [end(ends[0]), { ...main, share: 0.76 }, end(ends[1])]);
    }
    return panelOf(look, width, height, depth, "across", [main]);
  }
  blocks.push({ text: business.name, face, direction: "ltr", ink: palette.ink, share: 0.5, shadow });
  blocks.push({ text: business.trade, face, direction: "ltr", ink: palette.accent, share: business.trade.length > 2 ? 0.32 : 0.5 });
  const upstairs = wayUp(business);
  if (upstairs && rng.bool(0.5)) blocks.push({ text: upstairs, face, direction: "ltr", ink: palette.ink, share: 0.2 });
  return panelOf(look, width, height, depth, "down", blocks);
}

/**
 * Designs one panel per character of `text`, each `size` square: plain
 * squares, diamonds or discs, in one color or two alternating.
 */
export function tilePanels(text: string, size: number, depth: number, look: SignLook, rng: Rng): PanelDesign[] {
  const outline = rng.weighted([["rectangle", 3], ["diamond", 2], ["round", 2]] as const);
  const alternate = rng.bool(0.35);
  return [...text].map((character, index) => {
    const swapped = alternate && index % 2 === 1;
    return panelOf(look, size, size, depth, "down", [{ text: character, face: look.face, direction: "ttb", ink: swapped ? look.palette.ground : look.palette.ink, share: 1 }], {
      outline,
      ground: swapped ? look.palette.ink : look.palette.ground,
      border: outline === "rectangle",
    });
  });
}

/** Designs a field painted on a wall: a large title, upright or level to suit the field. */
export function paintedField(text: string, width: number, height: number, look: SignLook, rng: Rng): PanelDesign {
  const upright = height > width;
  return panelOf(look, width, height, 0, "down", [
    { text, face: look.face, direction: upright ? "ttb" : levelDirection(text, look, rng), ink: look.palette.ink, share: 1, shadow: shadowFor(look, rng) },
  ]);
}
