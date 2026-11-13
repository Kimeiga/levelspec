import type { V3 } from "../../../architecture/types.ts";
import type { KitSlot } from "../../kit-mesh.ts";
import type { Pen, Tint } from "../../pen.ts";
import { ATLAS } from "./atlas.ts";

/** A face of type the lettering atlas holds. */
export type TypeFace = (typeof ATLAS.faces)[number];

/**
 * How a line runs: left to right, right to left as older boards do, or
 * upright from top to bottom.
 */
export type Direction = "ltr" | "rtl" | "ttb";

/** One character placed in a line's box: `x` to the reader's right and `y` up from its bottom-left corner, meters. */
export interface PlacedGlyph {
  /** The character as lettered; small letters become capitals. */
  character: string;
  /** Center of the glyph's em box. */
  x: number;
  y: number;
  /** Size of the glyph's em box. */
  width: number;
  height: number;
}

/** A line fitted to its box. */
export interface LineLayout {
  glyphs: PlacedGlyph[];
  /** Characters the atlas cannot letter, once each; they are left out of `glyphs`. */
  missing: string[];
}

/** Bounds of a rectangle of the atlas in texture coordinates, origin at the bottom left. */
export interface AtlasCell {
  u0: number;
  v0: number;
  u1: number;
  v1: number;
}

/** Ideographs may be drawn this much wider or taller than square to fill their slot. */
const MAXIMUM_STRETCH = 1.25;

const CELL_INDEX = new Map([...ATLAS.characters].map((character, index) => [character, index]));
const LATIN_INDEX = new Map([...ATLAS.latin].map((character, index) => [character, index]));

/** Returns the atlas cell holding `character` in `face`, or undefined when the atlas lacks it. */
export function glyphCell(face: TypeFace, character: string): AtlasCell | undefined {
  const index = CELL_INDEX.get(character);
  if (index === undefined) return undefined;
  const cell = ATLAS.cell / ATLAS.size;
  const column = index % ATLAS.columns,
    row = ATLAS.faces.indexOf(face) * ATLAS.rows + Math.floor(index / ATLAS.columns);
  return { u0: column * cell, v0: 1 - (row + 1) * cell, u1: (column + 1) * cell, v1: 1 - row * cell };
}

/** Returns how far `character` advances a line set in `face`, in ems; ideographs advance one em. */
function advanceOf(face: TypeFace, character: string): number {
  const index = LATIN_INDEX.get(character);
  return index === undefined ? 1 : ATLAS.advances[face][index];
}

/**
 * Fits one line of `text` into a box `width` by `height` meters.
 *
 * Upright lines, and level lines of ideographs alone, are justified: the box
 * is divided into equal slots along the reading direction and each character
 * is centered in its slot, drawn up to a quarter wider or taller than square
 * where the slot allows. Level lines containing capitals, digits or spaces
 * are set left to right at their natural advances and centered. Spaces
 * advance such a line without a glyph and are ignored in justified lines.
 */
export function layoutLine(text: string, face: TypeFace, width: number, height: number, direction: Direction): LineLayout {
  const missing: string[] = [];
  const characters: string[] = [];
  for (const character of text.toUpperCase()) {
    if (character === " " || CELL_INDEX.has(character)) characters.push(character);
    else if (!missing.includes(character)) missing.push(character);
  }
  const inked = characters.filter((character) => character !== " ");
  if (!inked.length) return { glyphs: [], missing };
  const natural = direction !== "ttb" && characters.some((character) => LATIN_INDEX.has(character));
  if (natural) return { glyphs: setAtAdvances(characters, face, width, height), missing };
  const count = inked.length;
  const glyphs: PlacedGlyph[] = [];
  if (direction === "ttb") {
    const slot = height / count;
    const square = Math.min(slot, width);
    for (const [index, character] of inked.entries()) {
      const latin = LATIN_INDEX.has(character);
      glyphs.push({
        character,
        x: width / 2,
        y: height - (index + 0.5) * slot,
        width: latin ? square : Math.min(width, square * MAXIMUM_STRETCH),
        height: latin ? square : Math.min(slot, square * MAXIMUM_STRETCH),
      });
    }
    return { glyphs, missing };
  }
  const slot = width / count;
  const square = Math.min(slot, height);
  for (const [index, character] of inked.entries()) {
    const place = direction === "rtl" ? count - 1 - index : index;
    glyphs.push({
      character,
      x: (place + 0.5) * slot,
      y: height / 2,
      width: Math.min(slot, square * MAXIMUM_STRETCH),
      height: Math.min(height, square * MAXIMUM_STRETCH),
    });
  }
  return { glyphs, missing };
}

/** Sets characters left to right at their advance widths, as large as the box allows, centered in it. */
function setAtAdvances(characters: string[], face: TypeFace, width: number, height: number): PlacedGlyph[] {
  const advances = characters.map((character) => advanceOf(face, character));
  const total = advances.reduce((sum, advance) => sum + advance, 0);
  const em = Math.min(height, width / total);
  const glyphs: PlacedGlyph[] = [];
  let pen = (width - total * em) / 2;
  for (const [index, character] of characters.entries()) {
    const advance = advances[index] * em;
    if (character !== " ") glyphs.push({ character, x: pen + advance / 2, y: height / 2, width: em, height: em });
    pen += advance;
  }
  return glyphs;
}

const subtract = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: V3, b: V3): V3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** One layer of painted artwork in reader-relative meters, before surface aging. */
export interface SignPaint {
  slot: KitSlot;
  points: [number, number][];
  lift: number;
  tint: Tint;
  uv(x: number, y: number): [number, number];
}

/**
 * A flat rectangle of a sign as its reader sees it. Surface coordinates run
 * `x` to the reader's right and `y` up from the bottom-left corner, in
 * meters, whichever way the pen's frame or the host's placement is handed.
 */
export class SignSurface {
  readonly pen: Pen;
  readonly width: number;
  readonly height: number;
  /** Unit vector toward the reader, in the pen's frame. */
  readonly out: V3;
  private readonly origin: V3;
  private readonly right: V3;
  private readonly up: V3;
  /** When supplied, painting appends to this caller-owned list instead of emitting overlay geometry. */
  readonly paints?: SignPaint[];

  /**
   * `corner` is a bottom corner of the rectangle and `across` and `rise` its
   * bottom and side edges from that corner, all in the pen's frame; `rise`
   * must point up the lettering and `out` at the reader. Either bottom corner
   * may be given: the reader's left is found from where the surface faces in
   * the world.
   */
  constructor(pen: Pen, corner: V3, across: V3, rise: V3, out: V3, paints?: SignPaint[]) {
    this.pen = pen;
    this.width = Math.hypot(...across);
    this.height = Math.hypot(...rise);
    this.out = out;
    this.paints = paints;
    this.up = rise.map((value) => value / this.height) as V3;
    const zero = pen.world([0, 0, 0]);
    const world = (direction: V3) => subtract(pen.world(direction), zero);
    // Facing a surface, the reader's right is up cross out.
    const readersRight = cross(world(this.up), world(out));
    const leftToRight = dot(world(across), readersRight) > 0;
    this.origin = leftToRight ? corner : (corner.map((value, axis) => value + across[axis]) as V3);
    this.right = across.map((value) => ((leftToRight ? 1 : -1) * value) / this.width) as V3;
  }

  /** Returns the pen-frame point at surface coordinates (`x`, `y`), `lift` meters toward the reader. */
  at(x: number, y: number, lift = 0): V3 {
    return this.origin.map(
      (value, axis) => value + this.right[axis] * x + this.up[axis] * y + this.out[axis] * lift,
    ) as V3;
  }

  /**
   * Draws the convex polygon through surface points `points` in `slot`,
   * `lift` meters proud of the surface. With `shift` the finish's texture is
   * laid in surface meters offset by that much, so each sign shows a
   * different part of it; without, the pen's own planar mapping applies.
   */
  polygon(slot: KitSlot, points: [number, number][], lift: number, tint: Tint, shift?: [number, number], mapping?: SignPaint["uv"]): void {
    const repeat = this.pen.mesh.repeat(slot);
    const uv: SignPaint["uv"] = mapping ?? ((x, y) => [(x + (shift?.[0] ?? 0)) * repeat, (y + (shift?.[1] ?? 0)) * repeat]);
    if (this.paints) {
      this.paints.push({ slot, points, lift, tint, uv });
      return;
    }
    this.pen.face(
      slot,
      points.map(([x, y]) => this.at(x, y, lift)),
      this.out,
      tint,
      (mapping || shift) && points.map(([x, y]) => uv(x, y)),
    );
  }

  /** Draws the rectangle from (`x0`, `y0`) to (`x1`, `y1`); see `polygon`. */
  fill(slot: KitSlot, x0: number, y0: number, x1: number, y1: number, lift: number, tint: Tint, shift?: [number, number]): void {
    this.polygon(slot, [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], lift, tint, shift);
  }
}

/** How a line of lettering is painted on a surface. */
export interface LetteringStyle {
  face: TypeFace;
  direction: Direction;
  /** Linear RGB of the lettering, constant or evaluated at pen-frame points. */
  ink: Tint;
  /** Meters the lettering stands proud of the surface. */
  lift: number;
  /** A darker copy set behind and below-right of the lettering, as a painted drop shadow or the side of cut letters. */
  shadow?: { ink: Tint; offset: number };
}

/**
 * Letters `text` into the box of `surface` from (`x`, `y`), `width` by
 * `height` meters. With `atlas` each character is one quad sampling its glyph
 * cell in the `lettering` slot; without it each is a painted block standing
 * in for the character. Characters the atlas lacks are left out.
 */
export function letter(
  surface: SignSurface,
  text: string,
  box: { x: number; y: number; width: number; height: number },
  style: LetteringStyle,
  atlas: boolean,
): void {
  const layout = layoutLine(text, style.face, box.width, box.height, style.direction);
  // The quad covers the whole cell: the em box and the margin around it.
  const margin = ATLAS.cell / ATLAS.em;
  const inset = 0.5 / ATLAS.size;
  const layers: { ink: Tint; lift: number; dx: number; dy: number }[] = [];
  if (style.shadow)
    layers.push({ ink: style.shadow.ink, lift: style.lift * 0.5, dx: style.shadow.offset, dy: -style.shadow.offset });
  layers.push({ ink: style.ink, lift: style.lift, dx: 0, dy: 0 });
  for (const glyph of layout.glyphs) {
    const cell = glyphCell(style.face, glyph.character)!;
    for (const layer of layers) {
      const cx = box.x + glyph.x + layer.dx,
        cy = box.y + glyph.y + layer.dy;
      if (!atlas) {
        const hw = glyph.width * 0.36,
          hh = glyph.height * 0.36;
        surface.fill("paint", cx - hw, cy - hh, cx + hw, cy + hh, layer.lift, layer.ink);
        continue;
      }
      const hw = (glyph.width * margin) / 2,
        hh = (glyph.height * margin) / 2;
      surface.polygon(
        "lettering",
        [
          [cx - hw, cy - hh], [cx + hw, cy - hh],
          [cx + hw, cy + hh], [cx - hw, cy + hh],
        ],
        layer.lift,
        layer.ink,
        undefined,
        (x, y) => [cell.u0 + inset + (x - cx + hw) / (2 * hw) * (cell.u1 - cell.u0 - 2 * inset),
          cell.v0 + inset + (y - cy + hh) / (2 * hh) * (cell.v1 - cell.v0 - 2 * inset)],
      );
    }
  }
}
