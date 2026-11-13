import type { V3 } from "../../../architecture/types.ts";
import type { KitSlot } from "../../kit-mesh.ts";
import type { Pen, Tint } from "../../pen.ts";
import type { Kit } from "../kit.ts";
import { RUST, blend, mix, mottle, shade } from "../palette.ts";
import { SignSurface, letter, type Direction, type TypeFace, type SignPaint } from "./lettering.ts";
import { bolt, member, toned, type Steel } from "./steel.ts";
import { paintSignFace } from "./weathering.ts";
import { weatheredPen } from "../weathered.ts";
import { materialRecipeKey } from "../../surface/material.ts";
import { ATLAS } from "./atlas.ts";

const SIGN_LAYOUT_KEY = materialRecipeKey("sign-layout/v1", ATLAS);

/**
 * What a panel is made of: a painted steel sheet in an angle frame, a deep
 * light box, a lacquered timber plaque, an enamel plate, a small
 * single-character tile, hung cloth, or a field painted on the wall itself.
 */
export type Construction = "sheet" | "lightbox" | "timber" | "enamel" | "tile" | "cloth" | "painted";

/** The panel's silhouette inside its `width` by `height` rectangle. */
export type Outline = "rectangle" | "diamond" | "round";

/** One block of lettering on a panel. Colors are linear RGB. */
export interface TextBlock {
  text: string;
  face: TypeFace;
  direction: Direction;
  ink: V3;
  /** Share of the lettered area this block takes along the panel's stacking direction. */
  share: number;
  /** Color of a painted drop shadow, when the block has one. */
  shadow?: V3;
}

/** A lettered panel as designed. Lengths are meters, colors linear RGB. */
export interface PanelDesign {
  width: number;
  height: number;
  /** Depth of the body behind the lettered face. */
  depth: number;
  construction: Construction;
  outline: Outline;
  /** Color of the lettered face. */
  ground: V3;
  /** Color of the line painted inside the edge, when there is one. */
  border?: V3;
  /** Whether blocks follow one another down the panel or across it. */
  stack: "down" | "across";
  blocks: TextBlock[];
  /** 0 fresh from the workshop, 1 long neglected. */
  age: number;
  /** Offsets this panel's weathering and texture from every other's. */
  phase: number;
}

/** Lifts of painted layers above a panel face, meters. */
const LINE_LIFT = 0.003;
const LETTER_LIFT = 0.005;
/** Largest edge of a face cell carrying its own weathering colors, meters. */
const TONE_CELL = 0.24;
const CHALK: V3 = [0.72, 0.72, 0.7];

/** The slot a construction's lettered face is drawn in. */
const FACE_SLOT: Record<Construction, KitSlot> = {
  sheet: "board",
  tile: "board",
  lightbox: "paint",
  enamel: "paint",
  cloth: "paint",
  timber: "timber",
  painted: "wall",
};

/** Width of the frame standing proud around each construction's face, meters; zero for none. */
const FRAME_WIDTH: Record<Construction, number> = {
  sheet: 0.028,
  tile: 0.018,
  lightbox: 0.032,
  enamel: 0,
  cloth: 0,
  timber: 0.05,
  painted: 0,
};

/** Returns the corners of an outline inside the rectangle from the origin to (`width`, `height`). */
function outlinePoints(outline: Outline, width: number, height: number): [number, number][] {
  if (outline === "diamond") return [[width / 2, 0], [width, height / 2], [width / 2, height], [0, height / 2]];
  if (outline === "round")
    return Array.from({ length: 16 }, (_, k) => {
      const angle = (k / 16) * Math.PI * 2;
      return [width / 2 + (Math.cos(angle) * width) / 2, height / 2 + (Math.sin(angle) * height) / 2];
    });
  return [[0, 0], [width, 0], [width, height], [0, height]];
}

/**
 * Returns how dirt and fading change a panel's colors: a multiplier for any
 * color at a point of the panel's frame, and how far paint there has faded
 * toward chalk, 0 to 1.
 */
function weathering(design: PanelDesign, kit: Kit) {
  if (kit.textureDensity) return { tone: (_point: V3): V3 => [1, 1, 1], faded: (_point: V3) => 0 };
  const smooth = design.construction === "lightbox" || design.construction === "enamel";
  const grime = kit.grime * (0.35 + 0.65 * design.age) * (smooth ? 0.55 : 1);
  const fade = kit.wear * design.age;
  const { height, phase } = design;
  return {
    tone(point: V3): V3 {
      const noise = mottle(point[0] * 1.9, point[2] * 1.4, phase);
      const underFrame = Math.exp(-(height - point[2]) / 0.2),
        foot = Math.exp(-point[2] / 0.09);
      const dirt = grime * (0.12 + 0.34 * underFrame + 0.26 * foot) * (0.72 + 0.28 * noise);
      const value = Math.max(0.3, 1 - dirt);
      return [value, value * 0.985, value * 0.94];
    },
    faded(point: V3): number {
      return Math.min(1, fade * (0.5 + 0.3 * mottle(point[0] * 3.1, point[2] * 2.3, phase + 9)));
    },
  };
}

/**
 * Draws one designed panel. In the pen's frame the panel spans X from 0 to
 * its width and Z from 0 to its height; its lettered front lies on Y=0
 * facing +Y and its body reaches back to Y=-depth. With `sides` of `both`
 * the back is lettered too, for a reader facing -Y. Frames and fixings use
 * `steel`. Characters the lettering atlas lacks are left out. Design data is
 * snapshotted so deferred material baking cannot observe later caller edits.
 */
export function drawPanel(pen: Pen, design: PanelDesign, sides: "front" | "both", steel: Steel, kit: Kit): void {
  design = structuredClone(design);
  const { width, height, depth, construction } = design;
  const weather = weathering(design, kit);
  const rectangular = design.outline === "rectangle";
  if (construction !== "painted" && construction !== "cloth") body(pen, design, sides, steel);
  const faces: [number, V3][] = sides === "both" ? [[0, [0, 1, 0]], [-depth, [0, -1, 0]]] : [[0, [0, 1, 0]]];
  for (const [y, out] of faces) {
    const paints: SignPaint[] | undefined = kit.textureDensity ? [] : undefined;
    const surface = new SignSurface(pen, [0, y, 0], [width, 0, 0], [0, 0, height], out, paints);
    const ground: Tint = paints ? design.ground
      : (point) => blend(mix(design.ground, CHALK, weather.faded(point) * 0.4), weather.tone(point));
    paintFace(surface, design, ground);
    const frame = FRAME_WIDTH[construction];
    const edge = frame + Math.max(0.012, 0.035 * Math.min(width, height));
    if (design.border && rectangular) {
      const line = Math.max(0.008, 0.012 * Math.min(width, height) + 0.004);
      const border = design.border;
      const tint: Tint = paints ? border
        : (point) => blend(mix(border, design.ground, weather.faded(point) * 0.5), weather.tone(point));
      for (const [x0, y0, x1, y1] of [
        [edge, edge, width - edge, edge + line],
        [edge, height - edge - line, width - edge, height - edge],
        [edge, edge + line, edge + line, height - edge - line],
        [width - edge - line, edge + line, width - edge, height - edge - line],
      ])
        surface.fill("paint", x0, y0, x1, y1, LINE_LIFT, tint);
    }
    // Lettering keeps clear of the frame and border; shaped panels letter their inscribed square.
    const inset = rectangular ? edge + (design.border ? 0.03 * Math.min(width, height) + 0.012 : 0.01) : Math.min(width, height) * 0.22;
    const area = { x: inset, y: inset, width: width - 2 * inset, height: height - 2 * inset };
    const total = design.blocks.reduce((sum, block) => sum + block.share, 0);
    let used = 0;
    for (const block of design.blocks) {
      const from = used / total,
        to = (used + block.share) / total;
      used += block.share;
      const gap = 0.04 * (design.stack === "down" ? area.height : area.width);
      const box =
        design.stack === "down"
          ? { x: area.x, y: area.y + area.height * (1 - to) + gap / 2, width: area.width, height: area.height * (to - from) - gap }
          : { x: area.x + area.width * from + gap / 2, y: area.y, width: area.width * (to - from) - gap, height: area.height };
      if (box.width <= 0 || box.height <= 0) continue;
      const ink: Tint = paints ? block.ink
        : (point) => blend(mix(block.ink, design.ground, weather.faded(point) * 0.55), weather.tone(point));
      const shadow = block.shadow;
      letter(
        surface,
        block.text,
        box,
        {
          face: block.face,
          direction: block.direction,
          ink,
          lift: LETTER_LIFT,
          shadow: shadow && { ink: paints ? shadow : (point) => blend(shadow, weather.tone(point)), offset: 0.035 * Math.min(box.width, box.height) },
        },
        kit.lettering,
      );
    }
    if (paints) {
      const slots = [...new Set<KitSlot>(["paint", "rust", ...paints.map(paint => paint.slot)])].sort();
      const artworkKey = materialRecipeKey("sign-artwork/v1", { layout: SIGN_LAYOUT_KEY, design, lettering: kit.lettering,
        slots: slots.map(slot => [slot, pen.mesh.material(slot), pen.mesh.repeat(slot)]) });
      paintSignFace(surface, design, kit, paints, artworkKey);
    }
    else if (rectangular && design.age > 0.45 && construction === "sheet") rustRuns(surface, design, frame, weather.tone);
  }
}

/** Paints a panel's lettered face in cells small enough to carry its weathering. */
function paintFace(surface: SignSurface, design: PanelDesign, ground: Tint): void {
  const slot = FACE_SLOT[design.construction];
  const shift: [number, number] = [design.phase * 0.37, design.phase * 0.61];
  if (surface.paints || design.outline !== "rectangle") {
    const points = outlinePoints(design.outline, design.width, design.height);
    surface.polygon(slot, points, 0, ground, shift);
    return;
  }
  const columns = Math.max(1, Math.ceil(design.width / TONE_CELL)),
    rows = Math.max(1, Math.ceil(design.height / TONE_CELL));
  for (let i = 0; i < columns; i++)
    for (let j = 0; j < rows; j++)
      surface.fill(
        slot,
        (design.width * i) / columns,
        (design.height * j) / rows,
        (design.width * (i + 1)) / columns,
        (design.height * (j + 1)) / rows,
        0,
        ground,
        shift,
      );
}

/**
 * Draws faint rust runs down a face from the fixings under its top frame:
 * narrow wedges of stained paint that taper to nothing.
 */
function rustRuns(surface: SignSurface, design: PanelDesign, frame: number, tone: (point: V3) => V3): void {
  const count = Math.max(2, Math.round(design.width / 0.22));
  const stained = mix(design.ground, RUST, 0.45 + 0.3 * design.age);
  const top = design.height - frame;
  for (let i = 0; i < count; i++) {
    const wobble = mottle(i * 2.7, design.phase, design.phase);
    if (wobble < -0.25) continue;
    const x = frame + 0.02 + ((design.width - 2 * frame - 0.04) * (i + 0.5 + 0.35 * wobble)) / count;
    const length = Math.min(design.height * 0.45, (0.05 + 0.3 * design.age) * (0.6 + 0.5 * wobble));
    const half = 0.003 + 0.004 * design.age;
    surface.pen.face(
      "paint",
      [surface.at(x - half, top, 0.002), surface.at(x + half, top, 0.002), surface.at(x, top - length, 0.002)],
      surface.out,
      (point) => blend(stained, tone(point)),
    );
  }
}

/** Draws everything of a panel but its lettered faces: edges, frame, rain cap and fixings. */
function body(pen: Pen, design: PanelDesign, sides: "front" | "both", steel: Steel): void {
  const { width, height, depth, construction } = design;
  const edgeSlot: KitSlot = construction === "timber" ? "timber" : construction === "enamel" ? "paint" : steel.slot;
  const edgeTint = construction === "timber" ? shade(design.ground, 0.7) : construction === "enamel" ? shade(design.ground, 0.75) : steel.tint;
  const bodyPen = weatheredPen(pen, steel.weathering, construction === "timber" ? "timber" : "frame", undefined, [edgeSlot]);
  if (design.outline !== "rectangle") {
    const points = outlinePoints(design.outline, width, height);
    for (let k = 0; k < points.length; k++) {
      const [x0, z0] = points[k],
        [x1, z1] = points[(k + 1) % points.length];
      const outward: V3 = [z1 - z0, 0, x0 - x1];
      bodyPen.face(edgeSlot, [[x0, 0, z0], [x1, 0, z1], [x1, -depth, z1], [x0, -depth, z0]], outward, edgeTint);
    }
    if (sides === "front") bodyPen.face(edgeSlot, points.map(([x, z]) => [x, -depth, z] as V3), [0, -1, 0], shade(edgeTint, 0.7));
    return;
  }
  bodyPen.box(edgeSlot, [0, -depth, 0], [width, 0, height], edgeTint, "bf");
  if (sides === "front") bodyPen.face(edgeSlot, [[0, -depth, 0], [width, -depth, 0], [width, -depth, height], [0, -depth, height]], [0, -1, 0], shade(edgeTint, 0.7));
  const frame = FRAME_WIDTH[construction];
  const proud = construction === "timber" ? 0.014 : construction === "lightbox" ? 0.006 : 0.009;
  const frameSteel: Steel = construction === "timber" ? { slot: "timber", tint: shade(design.ground, 0.55), weathering: steel.weathering } : steel;
  const fronts: [number, V3][] = sides === "both" ? [[0, [0, 1, 0]], [-depth, [0, -1, 0]]] : [[0, [0, 1, 0]]];
  if (frame > 0)
    for (const [y, out] of fronts) {
      const middle = y + out[1] * (proud / 2);
      // Top and bottom run through; the sides butt between them.
      for (const z of [frame / 2, height - frame / 2])
        member(pen, frameSteel, [0, middle, z], [width, middle, z], [0, 0, 1], frame, proud);
      for (const x of [frame / 2, width - frame / 2])
        member(pen, toned(frameSteel, 0.92), [x, middle, frame], [x, middle, height - frame], [1, 0, 0], frame, proud);
    }
  if (construction === "lightbox") {
    const cap = toned(steel, 0.85);
    member(pen, cap, [-0.015, -depth / 2, height + 0.006], [width + 0.015, -depth / 2, height + 0.006], [0, 1, 0], depth + 0.04, 0.012);
  }
  if (construction === "enamel" || (steel.weathering && design.outline === "rectangle" && (construction === "sheet" || construction === "tile"))) {
    const screws: Steel = { slot: "metal", tint: steel.weathering ? [0.25, 0.26, 0.24] : shade(RUST, 1.4), weathering: steel.weathering };
    const inset = Math.min(0.03, Math.min(width, height) * 0.12);
    for (const [y, out] of fronts) for (const x of [inset, width - inset]) for (const z of [inset, height - inset])
      bolt(pen, screws, [x, y, z], out, 0.006);
  }
}
