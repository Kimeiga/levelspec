import { PipeSystem } from "./pipes.ts";
import { metalColor } from "./weathered.ts";
import type { V3 } from "../../architecture/types.ts";
import type { Rng } from "../../generate/rng.ts";
import type { Pen } from "../pen.ts";
import { CONDENSER_HEIGHT, CONDENSER_ROOM, airConditioner, condenser } from "./aircon.ts";
import {
  awning,
  cage,
  dryingPole,
  dryingRack,
  plantRow,
  stain,
} from "./fixtures.ts";
import { washing } from "./laundry.ts";
import { balconySlab, balconyEdges, balconyParapet, antiClimbFan, type BalconyOutline } from "./balconies.ts";
import { weatheredPen } from "./weathered.ts";
import { profiledStrip } from "./molding.ts";
import { groundUnit, groundOpening, type UnitKind } from "./ground.ts";
import { entranceBounds } from "./doors.ts";
import type { Lot, Rect } from "./massing.ts";
import {
  ACCENTS,
  ALUMINUM,
  CONCRETE,
  GALVANIZED,
  RUST,
  SOOT,
  blend,
  flat as drawFlat,
  mix,
  shade,
  srgb,
  type Flat,
} from "./palette.ts";
import type { Kit } from "./kit.ts";
import { WallCondition, type WallLedge } from "../finish/wall-condition.ts";
import type { KitSlot } from "../kit-mesh.ts";
import { drawShop, planShop, type ShopPlan } from "./shop/shop.ts";
import { drawSkin, stainedPanel, type LotFinish } from "./skin.ts";
import { balconyBoard, streetSigns, wallAdvertisement } from "./signs.ts";
import { glazedLight, securityBars, windowUnit, type WindowLook } from "./windows.ts";
import { drawFacadeDetails, drawPlinth, planFacadeDetails } from "./facade-details.ts";

/** Below this height above the building base, parts stay within FLUSH of the footprint. */
export const CLEAR_HEIGHT = 2.5;
/** Largest projection allowed where people may walk beneath, meters. */
export const FLUSH = 0.15;
/** Largest distance any part may reach outside the footprint, meters. */
const MAX_OVERHANG = 1.6;

export type Zone = "ground" | "body";

/**
 * One side of a lot, ready to dress. U runs to the right as seen from outside
 * with its origin at the left end of the ground story; Z is height above the
 * building base. The upper body lies on a parallel plane `shift` further out.
 */
export interface Facade {
  role: "front" | "back" | "side" | "party" | "well";
  lot: Lot;
  /** The wall finishes the lot is built in, the same on all its sides. */
  finish: LotFinish;
  /** Seed path for this facade. */
  key: string;
  /** Pen on the ground-story plane drawing into the `envelope` part. */
  pen: Pen;
  /** The ground story spans U from 0 to `width`. */
  width: number;
  shift: number;
  /** Extent of the upper body along U; jetties widen side facades. */
  bodyU0: number;
  bodyU1: number;
  /** Wall rectangles left exposed after neighboring volumes are removed, in (U, Z). */
  ground: Rect[];
  body: Rect[];
  /**
   * Returns the largest clear outward depth, at most `limit`, for a part
   * occupying the given rectangle of a zone's wall plane; 0 when even flush
   * parts would run into other geometry.
   */
  reach(zone: Zone, u0: number, u1: number, z0: number, z1: number, limit: number): number;
  /** Chance that a shop bay opens onto a stocked room; 0 on buildings too small for shops. */
  shops: number;
  /**
   * Returns the depth a room may be cut into this lot behind the ground wall
   * over `u0..u1`, from the base up to `height`: `limit`, or less where the
   * building keeps its rear solid. All of that depth is clear, or the result
   * is 0: the space meets level collision or another building.
   */
  hollow(u0: number, u1: number, height: number, limit: number): number;
  /** Optional grounded street display patch, including a clear standing strip beyond it. */
  frontage?(u0: number, u1: number, depth: number, height: number): boolean;
  /** Signed along-facade shift per meter of projection at a joined, exposed convex corner. */
  cornerMiter?(zone: Zone, u: number, z0: number, z1: number): number | undefined;
}

type ColumnKind = "window" | "balcony" | "band" | "stair" | "service" | "blank";

/** A vertical stack of like bays; the construction type repeats on every story. */
interface Column {
  kind: ColumnKind;
  u0: number;
  u1: number;
}

/** A recess cut into the wall for a window or stair, relative to its bay's lower-left corner. */
interface Opening {
  x: number;
  z: number;
  w: number;
  h: number;
  /** How far the recess is set into the wall, meters. */
  depth: number;
}

/** One bay of one upper story, with pens at its lower-left corner on the wall plane. */
interface Cell {
  kind: ColumnKind;
  /** The wall recess this bay's window or stair sits in, when it has one. */
  opening?: Opening;
  /** Upper stories counted from 0 at the first floor. */
  story: number;
  role: Facade["role"];
  openings: Pen;
  fixtures: Pen;
  width: number;
  height: number;
  /** Clear outward depth, meters. */
  reach: number;
  lot: Lot;
  flat: Flat;
  kit: Kit;
  key: string;
  /** The tenement's wall wash, which run-off stains darken. */
  wash: V3;
  /** Balcony depth this tenement builds, meters. */
  balcony: number;
  top: boolean;
}

/** True when the disjoint rectangles of `rects` together cover the whole given area. */
export function inside(rects: Rect[], u0: number, u1: number, z0: number, z1: number): boolean {
  let covered = 0;
  for (const r of rects)
    covered +=
      Math.max(0, Math.min(r.u1, u1) - Math.max(r.u0, u0)) *
      Math.max(0, Math.min(r.v1, z1) - Math.max(r.v0, z0));
  return covered >= (u1 - u0) * (z1 - z0) - 1e-4;
}

/**
 * Returns how much water the line between the ground story and the body sheds
 * onto the ground-story wall, 0–1. A lot without upper stories ends in a roof
 * edge there and a stepped-back body leaves a ledge that drains down the
 * wall; under a jetty or a flush body only the slab edge leaves a line.
 */
function storyLineFlow(facade: Facade): number {
  const { lot } = facade;
  if (lot.top - lot.ground <= 0.05) return 0.9;
  if (facade.shift < 0) return 0.8;
  return 0.2;
}

/** Chooses the bay rhythm one tenement repeats up a facade of the given role. */
function layoutColumns(facade: Facade, rng: Rng): Column[] {
  const { lot, role } = facade;
  const total = facade.bodyU1 - facade.bodyU0;
  if (role === "party" || role === "well" || lot.kind === "well")
    return [{ kind: role === "well" ? "service" : "blank", u0: facade.bodyU0, u1: facade.bodyU1 }];
  const sequence: { kind: ColumnKind; width: number }[] = [];
  if (role === "side") {
    const count = Math.max(1, Math.floor(total / 3.4));
    for (let i = 0; i < count; i++)
      sequence.push({ kind: rng.bool(0.3) ? "blank" : "window", width: total / count });
  } else {
    const front = role === "front";
    const stair = total >= 5.2 && rng.bool(front ? 0.45 : 0.25) ? rng.float(1.5, 2) : 0;
    const service = total - stair >= 4 && rng.bool(front ? 0.35 : 0.75) ? rng.float(0.95, 1.25) : 0;
    const primary = total - stair - service;
    const count = Math.max(1, Math.round(primary / (front ? lot.style.bay : lot.style.bay * 1.15)));
    const plan = front ? lot.style.plan : rng.pick(["windows", "windows", "mixed"] as const);
    const offset = rng.int(0, 1);
    const repeated: Record<string, ColumnKind> = { windows: "window", bands: "band", balconies: "balcony" };
    for (let i = 0; i < count; i++) {
      const alternating: ColumnKind = (i + offset) % 2 ? "balcony" : "window";
      sequence.push({ kind: repeated[plan] ?? alternating, width: primary / count });
    }
    if (stair)
      sequence.splice(rng.pick([0, sequence.length, Math.floor(sequence.length / 2)]), 0, { kind: "stair", width: stair });
    if (service) sequence.splice(rng.pick([0, sequence.length]), 0, { kind: "service", width: service });
  }
  const columns: Column[] = [];
  let u = facade.bodyU0;
  for (const { kind, width } of sequence) {
    columns.push({ kind, u0: u, u1: u + width });
    u += width;
  }
  return columns;
}

/** The stair-core idiom a tenement repeats on every landing. */
function stairVariant(lot: Lot, kit: Kit): "open" | "grid" | "strip" {
  return kit.rng(`${lot.key}/stair`).pick(["open", "grid", "strip"] as const);
}

/**
 * Sizes the wall recess of a bay from its column type, or returns undefined
 * when the bay keeps a flush wall. Bays of one column get equal openings on
 * every story, so windows stack.
 */
function openingFor(kind: ColumnKind, role: Facade["role"], w: number, h: number, lot: Lot, kit: Kit): Opening | undefined {
  if (kind === "window") {
    const small = role !== "front";
    const ww = Math.min(w - 0.7, small ? 0.9 : lot.style.window === "timber" ? 1.3 : 1.7);
    const sill = small ? 1.2 : 0.95,
      wh = Math.min(small ? 0.9 : 1.3, h - sill - 0.45);
    return ww < 0.6 || wh < 0.5 ? undefined : { x: (w - ww) / 2, z: sill, w: ww, h: wh, depth: 0.42 };
  }
  if (kind === "band") {
    const wh = Math.min(1.3, h - 0.95 - 0.42);
    return w - 0.32 < 0.9 || wh < 0.5 ? undefined : { x: 0.16, z: 0.95, w: w - 0.32, h: wh, depth: 0.42 };
  }
  if (kind === "stair") {
    const variant = stairVariant(lot, kit);
    if (variant === "strip") return h < 2.2 ? undefined : { x: w / 2 - 0.32, z: 0.55, w: 0.64, h: h - 1.05, depth: 0.42 };
    const z = variant === "open" ? 1.1 : 0.45;
    return h - 0.32 - z < 0.6 ? undefined : { x: 0.28, z, w: w - 0.56, h: h - 0.32 - z, depth: 0.4 };
  }
  if (kind === "service") return w >= 0.85 && h > 2.4 ? { x: (w - 0.5) / 2, z: 1.45, w: 0.5, h: 0.6, depth: 0.1 } : undefined;
  return undefined;
}

/** Builds the window look a household's bay uses. */
function look(cell: Cell, kind: WindowLook["kind"], rng: Rng): WindowLook {
  return {
    kind,
    weathering: cell.kit,
    frame: cell.flat.replaced ? ALUMINUM : cell.lot.style.frame,
    trim: cell.lot.style.trim,
    curtain: cell.flat.curtain,
    reach: cell.reach,
    hood: cell.lot.style.hoods,
    lit: rng.bool(0.55),
    boarded: cell.flat.vacant,
    recess: cell.opening?.depth ?? 0,
  };
}

/** Deposits brown runoff on the receiving wall directly beneath an emitted cooling unit. */
function coolingRunoff(pen: Pen, unit: { x0: number; x1: number; z: number }, kit: Kit, wash: V3): void {
  stain(pen, unit.x0, unit.x1, unit.z - 0.01, Math.max(0.02, unit.z - 1.1), wash, kit.grime * 0.85);
}

/**
 * Dresses a punched-window bay and whatever its household hangs around the
 * window. A cage excludes bars, racks, pots and awnings; an air conditioner
 * above the window excludes an awning.
 */
function windowCell(cell: Cell): void {
  const { height: h, flat, kit, key, fixtures } = cell;
  if (!cell.opening) return;
  const rng = kit.rng(key);
  const { x, z: sill, w: ww, h: wh } = cell.opening;
  const kind = cell.flat.replaced ? "slider" : cell.lot.style.window;
  const bars = kit.option(`${key}/bars`, 0.3);
  const caging = kit.option(`${key}/cage`, 0.34 * flat.clutter);
  windowUnit(cell.openings, x, sill, ww, wh, { ...look(cell, kind, rng), fixed: bars.planned || caging.planned }, rng);
  if (flat.vacant) return;
  const busy = flat.clutter;
  if (cell.reach >= 0.5 && caging.planned) {
    if (caging.shown) {
      const cageRng = kit.rng(`${key}/cage`);
      cage(fixtures, x - 0.1, x + ww + 0.1, sill - 0.3, sill + wh + 0.08, Math.min(cell.reach - 0.05, cageRng.float(0.4, 0.6)), cell.lot.style.cage, cageRng, kit.detail > 0, kit);
    }
    return;
  }
  if (bars.shown)
    securityBars(fixtures, x + 0.02, sill + 0.02, ww - 0.04, wh - 0.04, cell.lot.style.bars, shade(cell.lot.style.frame, 0.8), kit);
  const acRng = kit.rng(`${key}/ac`);
  const above = h - sill - wh >= 0.62 && acRng.bool(0.5);
  const cooling = kit.option(`${key}/ac`, 0.7 * busy);
  const cooled = cell.reach >= 0.45 && cooling.planned;
  if (cooled && cooling.shown) {
    if (above) {
      coolingRunoff(fixtures, airConditioner(fixtures, x + ww * acRng.float(0.3, 0.7), sill + wh + 0.14, 0.1, acRng, kit), kit, cell.wash);
    } else {
      const center = x + (acRng.bool() ? 0.38 : ww - 0.38);
      coolingRunoff(fixtures, airConditioner(fixtures.move(0, -0.1, 0), center, sill + 0.03, sill - 0.1, acRng, kit), kit, cell.wash);
    }
  }
  const racking = kit.option(`${key}/rack`, 0.34 * busy);
  if (cell.reach >= 0.65 && racking.planned) {
    if (racking.shown) {
      const rackRng = kit.rng(`${key}/rack`);
      dryingRack(fixtures, x - 0.05, x + ww + 0.05, sill - 0.16, Math.min(cell.reach - 0.05, rackRng.float(0.5, 0.75)), rackRng, kit);
    }
  } else if (cell.reach >= 1 && kit.has(`${key}/pole`, 0.25 * busy)) {
    const poleRng = kit.rng(`${key}/pole`);
    dryingPole(fixtures, x + ww * poleRng.float(0.2, 0.8), sill - 0.12, Math.min(cell.reach - 0.05, poleRng.float(0.9, 1.3)), poleRng, kit);
  }
  if (kit.detail > 0 && cell.reach >= 0.6 && kit.has(`${key}/pots`, 0.3 * busy)) {
    fixtures.box("wall", [x, 0, sill - 0.02], [x + ww, 0.26, sill + 0.005], cell.lot.style.trim);
    plantRow(fixtures, x, x + ww, 0.17, sill + 0.005, kit.rng(`${key}/pots`));
  }
  if (!(cooled && above) && cell.reach >= 0.6 && kit.has(`${key}/awning`, 0.22 * busy))
    awning(fixtures, x - 0.12, x + ww + 0.12, sill + wh + 0.32, Math.min(cell.reach - 0.05, 0.7), 0.28, cell.lot.style.awning, `${key}/awning`, kit);
}

/** Dresses a ribbon-window bay: a painted spandrel under glazing across the whole bay. */
function bandCell(cell: Cell): void {
  const { flat, kit, key, fixtures, openings } = cell;
  if (!cell.opening) return;
  const rng = kit.rng(key);
  const x0 = cell.opening.x,
    x1 = x0 + cell.opening.w,
    sill = cell.opening.z,
    wh = cell.opening.h;
  const accent = cell.lot.style.accent;
  openings.box("wall", [x0, 0, 0.06], [x1, 0.035, sill - 0.09], accent, "bf");
  stainedPanel(openings, "wall", { u0: x0, u1: x1, v0: 0.06, v1: sill - 0.09 }, 0.035, accent, kit, 0.6, kit.rng(`${key}/spandrel`).int(1, 2147483647));
  const kind = cell.lot.style.window === "timber" ? "casement" : cell.lot.style.window;
  const caging = kit.option(`${key}/cage`, 0.22 * flat.clutter);
  windowUnit(openings, x0, sill, x1 - x0, wh, { ...look(cell, kind, rng), hood: false, fixed: caging.planned }, rng);
  if (cell.lot.style.hoods && cell.reach >= 0.35)
    openings.box("wall", [x0 - 0.06, 0, sill + wh + 0.06], [x1 + 0.06, 0.3, sill + wh + 0.13], cell.lot.style.trim);
  if (flat.vacant) return;
  const busy = flat.clutter;
  // A cage claims its stretch of the bay first; the unit under the windows stands clear of it.
  const caged = cell.reach >= 0.5 && x1 - x0 > 1.6 && caging.planned;
  const cageRng = kit.rng(`${key}/cage`);
  const cageStart = caged ? x0 + cageRng.float(0, x1 - x0 - 1.3) : x1;
  const beside = cageStart - x0 >= x1 - cageStart - 1.3 ? [x0, cageStart] : [cageStart + 1.3, x1];
  const [free0, free1] = caged ? beside : [x0, x1];
  const cooling = kit.option(`${key}/ac`, 0.65 * busy);
  // Units are fixed to the spandrel panel, which stands 0.035 m proud of the wall.
  const panel = fixtures.move(0, 0.035, 0);
  const cooled = cell.reach >= 0.49 && free1 - free0 >= CONDENSER_ROOM && sill - 0.4 >= CONDENSER_HEIGHT && cooling.planned;
  if (cooled && cooling.shown) {
    const acRng = kit.rng(`${key}/ac`);
    // A spandrel has room for either kind of unit: a split system's condenser, or one through the wall.
    if (acRng.bool(0.4)) coolingRunoff(panel, condenser(panel, free0, free1, 0.38, sill - 0.4, acRng, kit), kit, accent);
    else {
      // A window unit with its cover stays within 0.44 m of its center.
      const center = free0 + 0.44 + (free1 - free0 - 0.88) * acRng.next();
      coolingRunoff(panel, airConditioner(panel, center, 0.36, 0.3, acRng, kit), kit, accent);
    }
  }
  if (caged) {
    if (caging.shown)
      cage(fixtures, cageStart, cageStart + 1.3, sill - 0.3, sill + wh + 0.08, Math.min(cell.reach - 0.05, 0.5), cell.lot.style.cage, cageRng, kit.detail > 0, kit);
  } else if (!cooled && cell.reach >= 0.65 && kit.has(`${key}/rack`, 0.3 * busy))
    // Washing would hang through a unit below the sill, so a rack takes only a bare spandrel.
    dryingRack(fixtures, x0 + 0.1, x1 - 0.1, sill - 0.16, Math.min(cell.reach - 0.05, 0.7), kit.rng(`${key}/rack`), kit);
}

/** Shared door/window fit respects the narrow back edge of a splayed balcony. */
function balconyFit(cell: Cell): { door: { x: number; top: number }; splay: number; window?: Opening } {
  const splay = cell.story === 0 && cell.kit.rng(`${cell.lot.key}/splayed-balcony`).bool(.7) ? Math.min(.22, cell.width * .08) : 0;
  const left = .12 + splay, right = cell.width - .12 - splay;
  const x = left + .10 + cell.kit.rng(cell.key).float(0, Math.max(0, right - left - 2.4));
  const windowWidth = Math.min(1.25, right - x - 1.1);
  return { door: { x, top: Math.min(2.05, cell.height - .35) }, splay,
    window: windowWidth > .6 && cell.height > 2.6 ? { x: x + .95, z: .95, w: windowWidth, h: 1.2, depth: 0 } : undefined };
}

/** Dresses a projecting balcony: slab, balustrade, the household's enclosure and belongings. */
function balconyCell(cell: Cell): void {
  const { width: w, height: h, flat, kit, key, fixtures: f, openings: o, lot } = cell;
  const rng = kit.rng(key);
  const depth = Math.min(cell.reach - 0.02, cell.balcony);
  const x0 = 0.12,
    x1 = w - 0.12,
    rail = 1;
  const trim = lot.style.trim,
    accent = lot.style.accent,
    frame = lot.style.frame;
  const { door: { x: doorX, top: doorTop }, splay, window } = balconyFit(cell);
  const outline: BalconyOutline = [[x0+splay,0,0],[x1-splay,0,0],[x1,depth,0],[x0,depth,0]];
  balconySlab(f,outline,-.18,.02,trim);
  const edges=balconyEdges(f,outline), railing=weatheredPen(f,kit,"cage");

  rng.next(); // Door fit owns the first design draw; later household choices retain their stream.
  o.box("paint", [doorX - 0.05, 0, 0.02], [doorX + 0.8, 0.04, doorTop + 0.05], shade(frame, 0.7));
  o.panel("timber", doorX, doorX + 0.75, 0.03, doorTop, 0.045, frame);
  glazedLight(o, doorX + 0.1, doorX + 0.65, 0.95, doorTop - 0.15, 0.05, rng);
  for (const x of [doorX + 0.08, doorX + 0.65])
    o.box("paint", [x, 0.045, 0.93], [x + 0.02, 0.058, doorTop - 0.13], shade(frame, 0.8), "bdu");
  for (const z of [0.93, doorTop - 0.15])
    o.box("paint", [doorX + 0.08, 0.045, z], [doorX + 0.67, 0.058, z + 0.02], shade(frame, 0.8), "blr");
  o.box("metal", [doorX + 0.66, 0.045, 0.98], [doorX + 0.69, 0.085, 1.1], GALVANIZED, "b");
  if (window)
    windowUnit(o, window.x, window.z, window.w, window.h, { ...look(cell, lot.style.window, rng), hood: false, reach: 0.15, recess: 0 }, rng);
  const solid = lot.style.balustrade === "solid" ? rail : lot.style.balustrade === "half" ? 0.55 : 0;
  const steel = mix(shade(lot.style.cage, 0.9), RUST, 0.2);
  /** Follows the shared slab edges, including both splayed returns. */
  const strips = (z0: number, z1: number, pitch: number, color: V3) => {
    for(const edge of balconyEdges(railing,outline)) {
      const count=Math.max(1,Math.ceil(edge.length/pitch));
      for(let i=1;i<count;i++) edge.pen.beveledBar("paint",[i*edge.length/count,-.025,z0],[i*edge.length/count,-.025,z1],[1,0,0],.014,.014,color,.001);
    }
  };
  /** Each continuous rail uses the same perimeter as the slab and infill. */
  const ring = (z: number, color: V3) => {
    for(const edge of balconyEdges(railing,outline)) {
      edge.pen.tube("paint",[[0,-.025,z],[edge.length,-.025,z]],.02,color,10);

    }
  };
  if (solid) balconyParapet(f,outline,solid,accent,trim,kit,key);
  if (solid < rail) {
    strips(Math.max(0.02, solid), rail, 0.13, steel);
    ring(rail, steel);
  }
  const enclosure = flat.vacant ? "open" : flat.enclosure;
  const head = h - 0.14;
  if (enclosure === "caged") {
    strips(rail, head, 0.13, steel);
    ring(head, steel);
    ring((rail + head) / 2, steel);
  } else if (enclosure === "glazed") {
    for(const edge of edges) {
      const lights=Math.max(1,Math.round(edge.length/.6)), pitch=edge.length/lights;
      for(let i=0;i<lights;i++) {
        const a=i*pitch;
        glazedLight(edge.pen,a+.025,a+pitch-.025,rail+.02,head,-.025,rng);
        edge.pen.beveledBar("paint",[a+.012,-.025,rail],[a+.012,-.025,head],[1,0,0],.024,.035,frame);
      }
      edge.pen.beveledBar("paint",[edge.length-.012,-.025,rail],[edge.length-.012,-.025,head],[1,0,0],.024,.035,frame);
      edge.pen.beveledBar("paint",[0,-.025,head],[edge.length,-.025,head],[0,1,0],.04,.055,frame);
    }
  }
  if (solid < rail || enclosure === "caged") {
    const postHeight = enclosure === "caged" ? head : rail;
    for (const point of outline) railing.beveledBar("paint", [point[0], point[1], .02], [point[0], point[1], postHeight], [1,0,0], .035, .035, steel);
  }
  if (cell.top) balconySlab(f,outline,h-.1,h-.02,trim);
  if(enclosure === "open" && head-rail>.8 && kit.has(`${key}/anti-climb`,.5))
    antiClimbFan(f,x0+splay+.05,(rail+head)/2,Math.min(depth*.8,(head-rail)*.43),steel,kit);
  const boardKey = `${key}/board`;
  const board = kit.option(boardKey, 0.2);
  if (solid >= 0.5 && cell.role === "front" && cell.story < 3 && x1 - x0 > 1.8 && cell.reach >= depth + 0.08 && board.planned) {
    const height = Math.min(0.42, solid - 0.14),
      width = height * kit.rng(`${boardKey}/size`).float(3, 4);
    const start = x0 + 0.1 + kit.rng(`${boardKey}/place`).float(0, x1 - x0 - 0.2 - width);
    balconyBoard(f.move(0, depth, 0), start, 0.1, width, height, lot.ground + cell.story * lot.storyHeight, kit, boardKey, board.shown);
  }
  if (flat.vacant) return;
  const busy = flat.clutter;
  // Foliage spreads about 0.4 m past its pot; pots stand on the parapet only where that stays clear.
  if (kit.detail > 0 && kit.has(`${key}/pots`, 0.5 * busy)) {
    const potRng = kit.rng(`${key}/pots`);
    if (solid >= rail && cell.reach >= depth + 0.4) plantRow(f, x0 + 0.1, x1 - 0.1, depth - 0.035, rail + 0.04, potRng);
    else if (depth >= 0.7) plantRow(f, x0 + splay + 0.4, x1 - splay - 0.4, depth - 0.5, 0.03, potRng);
  }
  if (enclosure !== "glazed" && kit.has(`${key}/wash`, 0.5 * busy)) {
    f.bar("paint", [x0 + splay * .45, depth * 0.55, head - 0.2], [x1 - splay * .45, depth * 0.55, head - 0.2], 0.01, SOOT);
    washing(f.move(0, depth * 0.55, 0), x0 + splay + 0.15, x1 - splay - 0.15, head - 0.2, kit.rng(`${key}/wash`), { fill: 0.8, drop: 0.85, support: "line" });
  }
  if (cell.reach >= depth + 0.5 && kit.has(`${key}/pole`, 0.3 * busy)) {
    const poleRng = kit.rng(`${key}/pole`);
    dryingPole(f.move(0, depth, 0), x0 + (x1 - x0) * poleRng.float(0.2, 0.8), rail + 0.03, Math.min(cell.reach - depth - 0.05, 0.8), poleRng, kit);
  }
  if (h >= 2.75 && kit.has(`${key}/ac`, 0.55 * busy))
    coolingRunoff(f, airConditioner(f, doorX + 0.38, doorTop + 0.14, 0.1, kit.rng(`${key}/ac`), kit), kit, cell.wash);
  if (kit.detail > 0 && enclosure !== "glazed" && kit.has(`${key}/boxes`, 0.3 * busy)) {
    const boxRng = kit.rng(`${key}/boxes`);
    for (let x = x1 - splay - 0.2; x > x1 - 1 && x > doorX + 1; x -= 0.4) {
      const size = boxRng.float(0.25, 0.36);
      f.box("paint", [x - size, 0.1, 0.02], [x, 0.1 + size, 0.02 + size * boxRng.float(0.8, 1.6)], shade(srgb("#a8845a"), boxRng.float(0.7, 1.2)), "d");
    }
  }
}

/** Dresses a stair bay in the tenement's stair-core idiom: open landings, breeze blocks or a glazed strip. */
function stairCell(cell: Cell): void {
  const { kit, lot, openings: o } = cell;
  if (!cell.opening) return;
  const variant = stairVariant(lot, kit);
  const { x, z, w, h, depth } = cell.opening;
  const trim = lot.style.trim;
  if (variant === "strip") {
    windowUnit(o, x, z, w, h, { ...look(cell, "casement", kit.rng(cell.key)), hood: false, boarded: false }, kit.rng(cell.key));
    return;
  }
  o.box("wall", [x - 0.06, -depth, z - 0.09], [x + w + 0.06, 0.07, z], trim);
  o.box("wall", [x - 0.06, 0, z + h], [x + w + 0.06, 0.06, z + h + 0.08], trim);
  if (variant === "open") {
    // The flight's stringer crossing the opening and a handrail give the dark recess a stair.
    o.box("wall", [x, -depth + 0.02, z], [x + w, -depth + 0.1, z + 0.35], shade(trim, 0.6), "b");
    o.bar("paint", [x, -0.05, z + 0.5], [x + w, -0.05, z + 0.5], 0.03, shade(lot.style.frame, 0.7));
    return;
  }
  const block = shade(trim, 0.92);
  const columns = Math.max(2, Math.round(w / 0.2)),
    rows = Math.max(2, Math.round(h / 0.2));
  for (let i = 1; i < columns; i++) {
    const u = x + (w * i) / columns;
    o.box("wall", [u - 0.025, -0.1, z], [u + 0.025, 0, z + h], block, "bdu");
  }
  for (let j = 1; j < rows; j++) {
    const v = z + (h * j) / rows;
    o.box("wall", [x, -0.1, v - 0.025], [x + w, -0.005, v + 0.025], block, "blr");
  }
}

/** Dresses a narrow service bay: a small louvered window and plant hung on the wall. */
function serviceCell(cell: Cell): void {
  const { width: w, kit, key, fixtures, openings } = cell;
  const rng = kit.rng(key);
  if (cell.opening)
    windowUnit(openings, cell.opening.x, cell.opening.z, cell.opening.w, cell.opening.h, { ...look(cell, "louver", rng), hood: false, boarded: false }, rng);
  // The soil stack takes the bay's first 0.22 m and sends a branch across it up to 0.65 m above the floor.
  const beside = 0.22,
    base = 0.72;
  // A well is all service bay, so its rainwater pipe may come down the far end as well.
  const end = cell.role === "well" ? w - 0.24 : w;
  const height = (cell.opening?.z ?? cell.height - 0.3) - base - 0.06;
  if (cell.reach >= 0.5 && end - beside >= CONDENSER_ROOM && height >= CONDENSER_HEIGHT && kit.has(`${key}/condenser`, 0.8))
    coolingRunoff(fixtures, condenser(fixtures, beside, end, base, height, kit.rng(`${key}/condenser`), kit), kit, cell.wash);
}

/** Draws the entry and blank bars of a narrow alley mouth at the foot of a service well. */
function alley(facade: Facade, rng: Rng): void {
  const openings = facade.pen.into("openings");
  const x0 = 0.12,
    x1 = facade.width - 0.12,
    head = Math.min(2.3, facade.lot.ground - 0.4);
  openings.panel("paint", x0, x1, 0, head, 0.004, SOOT);
  openings.box("paint", [x0 - 0.05, 0, head], [x1 + 0.05, 0.08, head + 0.1], CONCRETE);
  securityBars(openings.move(0, -0.05, 0), x0, 0.03, (x1 - x0) * rng.pick([1, 0.5]), head - 0.06, "diamond", mix(shade(GALVANIZED, 0.6), RUST, 0.5));
}

/**
 * Dresses one lot facade: skins its exposed wall with the tenement wash and
 * each household's repainting, fills every upper bay by its column type, lays
 * out the ground story, and adds the pipes and signs that run across bays.
 */
export function dressFacade(facade: Facade, kit: Kit): void {
  const { lot, role } = facade;
  const rng = kit.rng(facade.key);
  const columns = layoutColumns(facade, rng);
  const floors = Array.from({ length: Math.max(0, lot.stories - 1) }, (_, j) => lot.ground + j * lot.storyHeight);
  const dressed = role === "front" || role === "back" || role === "side";
  const flats: Flat[][] = floors.map((_, j) => {
    const row: Flat[] = [];
    let household = 0,
      shared = 0;
    for (const column of columns) {
      if (column.kind === "stair" || column.kind === "service" || shared === 0) {
        household++;
        shared = column.kind === "stair" || column.kind === "service" ? 0 : rng.int(1, 2);
      }
      if (shared > 0) shared--;
      row.push(drawFlat(lot.style, kit.rng(`${facade.key}/s${j}/h${household}`)));
    }
    return row;
  });
  const dado = role === "front" && lot.kind === "tenement" && rng.bool(0.45) ? shade(rng.pick(ACCENTS), 0.8) : undefined;
  const gloom = role === "well" ? 0.6 : role === "party" ? 0.86 : 1;
  const base = shade(lot.style.wall, gloom);
  const seed = rng.int(1, 2147483647);

  /** The wash of the wall at a point: tenement color, household repaint, or shop dado. */
  const washAt = (zone: Zone, u: number, z: number): V3 => {
    if (zone === "ground") return dado && z < 1.15 ? blend(base, dado) : base;
    if (!dressed || !floors.length) return base;
    const j = Math.min(floors.length - 1, Math.max(0, Math.floor((z - lot.ground) / lot.storyHeight)));
    const c = columns.findIndex((column) => u >= column.u0 && u < column.u1);
    const household = flats[j]?.[c];
    if (!household?.paint || z >= lot.roof) return base;
    if (columns[c].kind === "stair" || columns[c].kind === "service") return base;
    return household.band === "full" || z - floors[j] < 0.95 ? blend(base, household.paint) : base;
  };
  const groundWashKey = JSON.stringify(["facade-ground-wash/v1", base, dado]);
  const bodyWashKey = JSON.stringify(["facade-body-wash/v1", base, dressed, floors, lot.ground, lot.storyHeight, lot.roof,
    columns.map(({ u0, u1, kind }) => ({ u0, u1, kind })), flats.map(row => row.map(({ paint, band }) => ({ paint, band })))]);
  const aging = { grime: kit.grime, wear: kit.wear, seed };

  const bodyPen = facade.pen.move(0, facade.shift, 0);
  const balcony = kit.rng(`${lot.key}/balcony`).float(0.7, 1);
  const limit = Math.min(1.3, MAX_OVERHANG - 0.05 - Math.max(0, facade.shift));
  const openings = bodyPen.into("openings"),
    fixtures = bodyPen.into("fixtures");
  const cells: { cell: Cell; u: number; z: number }[] = [];
  for (const [j, floor] of floors.entries())
    for (const [c, column] of columns.entries()) {
      if (column.kind === "blank") continue;
      const top = j === floors.length - 1 ? lot.roof : floor + lot.storyHeight;
      if (!inside(facade.body, column.u0, column.u1, floor, top)) continue;
      const reach = facade.reach("body", column.u0, column.u1, column.kind === "balcony" ? floor - .18 : floor, top, limit);
      if (!reach) continue;
      const width = column.u1 - column.u0;
      const kind = column.kind === "balcony" && reach < 0.6 ? "window" : column.kind;
      cells.push({
        u: column.u0,
        z: floor,
        cell: {
          kind,
          opening: openingFor(kind, role, width, top - floor, lot, kit),
          story: j,
          role,
          openings: openings.move(column.u0, 0, floor),
          fixtures: fixtures.move(column.u0, 0, floor),
          width,
          height: top - floor,
          reach,
          lot,
          flat: flats[j][c],
          kit,
          key: `${facade.key}/s${j}/c${c}`,
          wash: base,
          balcony,
          top: j === floors.length - 1,
        },
      });
    }
  const recesses = cells.flatMap(({ cell, u, z }) =>
    cell.opening
      ? [{ u0: u + cell.opening.x, u1: u + cell.opening.x + cell.opening.w, v0: z + cell.opening.z, v1: z + cell.opening.z + cell.opening.h, depth: cell.opening.depth }]
      : [],
  );
  const uMarks = [...columns.flatMap((column) => [column.u0, column.u1]), ...recesses.flatMap((r) => [r.u0, r.u1])];
  const zMarks = [1.15, lot.roof, ...floors.flatMap((z) => [z, z + 0.95]), ...recesses.flatMap((r) => [r.v0, r.v1])];
  // Sills and balcony slabs shed water onto the wall below them; the roofline sheds the most.
  const sills: WallLedge[] = recesses.map((r) => ({ u0: r.u0, u1: r.u1, z: r.v0, flow: 0.6 }));
  const slabs: WallLedge[] = cells
    .filter(({ cell }) => cell.kind === "balcony")
    .map(({ cell, u, z }) => ({ u0: u + 0.12, u1: u + cell.width - 0.12, z: z - 0.1, flow: 0.7 }));
  const roofline: WallLedge = { u0: facade.bodyU0, u1: facade.bodyU1, z: lot.top, flow: 1 };
  const balconies = cells.filter(({ cell }) => cell.kind === "balcony").map(({ cell, u, z }) => ({ fit: balconyFit(cell), u, z }));
  const balconyThresholds = balconies.map(({ fit: { door }, u, z }) => {
    return { u0: u + door.x - .06, u1: u + door.x + .81, v0: z + .02, v1: z + door.top };
  });
  const balconyWindows = balconies.flatMap(({ fit: { window }, u, z }) => window
    ? [{ u0: u + window.x, u1: u + window.x + window.w, v0: z + window.z, v1: z + window.z + window.h }] : []);
  const construction = planFacadeDetails(facade, [...recesses, ...balconyThresholds], kit);
  const bodyCondition = new WallCondition({ ledges: [...sills, ...slabs, roofline, ...construction.ledges],
    openings: [...recesses, ...balconyThresholds, ...balconyWindows].map(r => ({ u0: r.u0, u1: r.u1, z0: r.v0, z1: r.v1 })) }, aging);
  const bays = planGround(facade, kit, rng);
  const shops = bays.flatMap((bay) => (bay.room ? [bay.room] : []));
  const groundSurrounds = bays.flatMap(bay => {
    if (bay.room) return [{ u0: bay.room.x0, u1: bay.room.x1, z0: bay.room.floor, z1: bay.room.head }];
    const key = `${facade.key}/unit-${bay.index}`;
    const opening = groundOpening(bay.kind, { key, u0: bay.u0, u1: bay.u1, height: lot.ground }, kit.rng(key));
    return opening ? [opening] : [];
  });
  const groundCondition = new WallCondition(
    { base: 0, ledges: [{ u0: 0, u1: facade.width, z: lot.ground, flow: storyLineFlow(facade) }], openings: groundSurrounds },
    aging,
  );
  const { finish } = facade;
  // The ground story is skinned on its own so a shop's edges never re-cut the stories above.
  drawSkin({
    pen: facade.pen,
    rects: facade.ground,
    openings: shops.map((shop) => ({ u0: shop.x0, u1: shop.x1, v0: shop.floor, v1: shop.head })),
    condition: groundCondition,
    tiles: finish.cladding?.groundTiles ? { seed: finish.cladding.seed, wear: kit.wear * 0.5, grime: kit.grime } : undefined,
    raster: { density: kit.textureDensity ?? 12, seed },
    washAt: (u, z) => washAt("ground", u, z),
    washKey: groundWashKey,
    uMarks: [...uMarks, ...shops.flatMap((shop) => [shop.x0, shop.x1])],
    zMarks: [...zMarks, ...shops.flatMap((shop) => [shop.floor, shop.head])],
    finish,
  });
  drawSkin({
    pen: bodyPen,
    rects: facade.body,
    openings: recesses,
    condition: bodyCondition,
    raster: { density: kit.textureDensity ?? 12, seed },
    washAt: (u, z) => washAt("body", u, z),
    washKey: bodyWashKey,
    uMarks,
    zMarks,
    finish,
  });
  for (const r of recesses) {
    const wash = shade(blend(washAt("body", (r.u0 + r.u1) / 2, r.v0 - 0.05), bodyCondition.tint(r.u0, r.v0)), 0.82);
    const corner = (u: number, y: number, z: number): V3 => [u, y, z];
    bodyPen.face(finish.coat, [corner(r.u0, 0, r.v0), corner(r.u0, -r.depth, r.v0), corner(r.u0, -r.depth, r.v1), corner(r.u0, 0, r.v1)], [1, 0, 0], wash);
    bodyPen.face(finish.coat, [corner(r.u1, 0, r.v0), corner(r.u1, -r.depth, r.v0), corner(r.u1, -r.depth, r.v1), corner(r.u1, 0, r.v1)], [-1, 0, 0], wash);
    bodyPen.face(finish.coat, [corner(r.u0, 0, r.v0), corner(r.u1, 0, r.v0), corner(r.u1, -r.depth, r.v0), corner(r.u0, -r.depth, r.v0)], [0, 0, 1], wash);
    bodyPen.face(finish.coat, [corner(r.u0, 0, r.v1), corner(r.u1, 0, r.v1), corner(r.u1, -r.depth, r.v1), corner(r.u0, -r.depth, r.v1)], [0, 0, -1], shade(wash, 0.8));
    bodyPen.panel("paint", r.u0, r.u1, r.v0, r.v1, -r.depth, SOOT);
  }
  for (const { cell } of cells) {
    if (cell.kind === "window") windowCell(cell);
    else if (cell.kind === "band") bandCell(cell);
    else if (cell.kind === "balcony") balconyCell(cell);
    else if (cell.kind === "stair") stairCell(cell);
    else serviceCell(cell);
  }

  drawFacadeDetails(bodyPen.into("fixtures"), facade, construction, kit);

  const thresholds = bays.filter(bay => bay.kind !== "service").map(bay => {
    if (bay.room) return { u0: bay.room.x0 - .07, u1: bay.room.x1 + .07 };
    if (bay.kind === "door") {
      const key=`${facade.key}/unit-${bay.index}`;
      const bounds=entranceBounds({key,u0:bay.u0,u1:bay.u1,height:lot.ground},kit.rng(key));
      return {u0:bounds.x0-.11,u1:bounds.x1+.11};
    }
    return {u0:bay.u0+.15,u1:bay.u1-.15};
  });
  if (role !== "well") drawPlinth(facade, thresholds, kit);

  drawGround(facade, bays, kit, rng, finish.coat);
  if (dressed) services(facade, columns, shops, kit, rng, bodyPen);
  if (role === "front" && lot.kind === "tenement") streetSigns(facade, columns, floors, kit, bodyPen, limit);
  if ((role === "party" || role === "side") && lot.kind === "tenement") wallAdvertisement(facade, kit, bodyPen);
}

/**
 * One ground-story bay and the closed front it was built with. A bay that
 * opens onto a stocked shop instead carries that shop's room.
 */
interface Bay {
  index: number;
  u0: number;
  u1: number;
  kind: UnitKind;
  room?: ShopPlan;
}

/** True for the bay kinds that trade onto the street. */
const isShopfront = (kind: UnitKind) => kind === "shutter" || kind === "shop" || kind === "gate";

/**
 * Lays out the ground-story bays of a street-facing facade and decides what
 * each holds, drawing nothing. Bays whose wall is covered or blocked are left
 * out. Party walls and wells have no bays.
 */
function planGround(facade: Facade, kit: Kit, rng: Rng): Bay[] {
  const { lot, role } = facade;
  if (role === "party" || role === "well") return [];
  const count = Math.max(1, Math.round(facade.width / rng.float(2.6, 3.6)));
  const entrance = role === "side" ? (rng.bool(0.3) ? rng.int(0, count - 1) : -1) : rng.int(0, count - 1);
  const bays: Bay[] = [];
  for (let i = 0; i < count; i++) {
    const u0 = (facade.width * i) / count,
      u1 = (facade.width * (i + 1)) / count;
    if (!inside(facade.ground, u0, u1, 0, lot.ground)) continue;
    if (!facade.reach("ground", u0, u1, 0, Math.min(lot.ground, CLEAR_HEIGHT), FLUSH)) continue;
    const kind: UnitKind =
      i === entrance
        ? "door"
        : role === "front"
          ? rng.pick(["shutter", "shutter", "shutter", "shutter", "shop", "shop", "gate", "gate", "service"] as const)
          : "service";
    const room = isShopfront(kind) ? planShop(facade, u0, u1, `${facade.key}/unit-${i}`, kit) : undefined;
    bays.push({ index: i, u0, u1, kind, room });
  }
  return bays;
}

/**
 * Draws the planned ground story: each bay's closed unit or open shop, shop
 * awnings where they clear heads, and the alley mouth at the foot of a well.
 * `coat` is the finish of the lot's walls, which shop rooms continue.
 */
function drawGround(facade: Facade, bays: Bay[], kit: Kit, rng: Rng, coat: KitSlot): void {
  const { lot, role } = facade;
  if (role === "well") {
    if (inside(facade.ground, 0, facade.width, 0, lot.ground) && facade.reach("ground", 0, facade.width, 0, lot.ground, FLUSH)) alley(facade, rng);
    return;
  }
  const openings = facade.pen.into("openings"),
    fixtures = facade.pen.into("fixtures");
  for (const { index, u0, u1, kind, room } of bays) {
    if (room) drawShop(facade, room, coat, kit);
    else groundUnit(openings, kind, { key: `${facade.key}/unit-${index}`, u0, u1, height: lot.ground }, lot, kit, kit.rng(`${facade.key}/unit-${index}`));
    if (!isShopfront(kind) || facade.shift > 0 || lot.ground < 3.2 || (lot.style.canopy && facade.shift === 0)) continue;
    if (!kit.has(`${facade.key}/unit-${index}/awning`, 0.45)) continue;
    const reach = facade.reach("ground", u0, u1, CLEAR_HEIGHT + 0.02, lot.ground, 1.1);
    if (reach >= 0.7)
      awning(fixtures, u0 + 0.15, u1 - 0.15, lot.ground - 0.12, reach - 0.05, lot.ground - 0.12 - 2.72, lot.style.awning, `${facade.key}/unit-${index}/awning`, kit);
  }
}

/** Draws what runs across bays: the shop canopy, jetty corbels, rainwater pipes and soil stacks. */
function services(facade: Facade, columns: Column[], shops: ShopPlan[], kit: Kit, rng: Rng, bodyPen: Pen): void {
  const { lot, role, width } = facade;
  const fixtures = facade.pen.into("fixtures");
  const trim = lot.style.trim;
  const hasBody = lot.top - lot.ground > 0.05;
  if (role === "front" && lot.kind === "tenement" && hasBody) {
    if (facade.shift === 0 && lot.style.canopy && inside(facade.ground, 0, width, lot.ground - 0.2, lot.ground)) {
      const reach = facade.reach("ground", 0, width, lot.ground - 0.2, lot.ground, 0.75);
      if (reach >= 0.4) fixtures.box("wall", [0, 0, lot.ground - 0.13], [width, reach, lot.ground], trim);
    }
    if (facade.shift >= 0.25)
      for (const u of [0.18, width - 0.18])
        if (facade.reach("ground", u - 0.12, u + 0.12, lot.ground - 0.3, lot.ground, facade.shift) >= facade.shift - 1e-6)
          fixtures.box("wall", [u - 0.1, 0, lot.ground - 0.28], [u + 0.1, facade.shift, lot.ground], trim, "bu");
  }
  if (!hasBody) return;
  const iron = rng.pick([srgb("#3a3c3a"), shade(lot.style.wall, 0.6), metalColor(GALVANIZED, 0.4, kit)]);
  const bodyFixtures = bodyPen.into("fixtures");
  /** Runs a pipe down the body and, where the wall plane steps, on down the ground story. */
  const drop = (u: number, radius: number, top: number): boolean => {
    if (!inside(facade.body, u - 0.1, u + 0.1, lot.ground, top) || !inside(facade.ground, u - 0.1, u + 0.1, 0, lot.ground)) return false;
    if (!facade.reach("ground", u - 0.1, u + 0.1, 0, lot.ground, FLUSH) || !facade.reach("body", u - 0.1, u + 0.1, lot.ground, top, FLUSH)) return false;
    const y = radius + 0.03;
    // An opening is 0.06 m wider on each side with its shutter guides.
    if (shops.some((shop) => u + radius > shop.x0 - 0.06 && u - radius < shop.x1 + 0.06)) {
      // No pipe crosses an open shop: it turns into the wall above the story line instead.
      new PipeSystem(bodyFixtures, { radius: radius, color: iron, kit }).run([[u, y, top], [u, y, lot.ground + 0.16], [u, 0.005, lot.ground + 0.08]], 0);
    } else if (Math.abs(facade.shift) < 1e-6) {
      new PipeSystem(fixtures, { radius: radius, color: iron, kit }).run([[u, y, top], [u, y, 0.1]], 0);
    } else if (facade.shift > 0) {
      new PipeSystem(bodyFixtures, { radius: radius, color: iron, kit }).run([[u, y, top], [u, y, lot.ground + 0.2], [u, y - facade.shift, lot.ground - 0.2], [u, y - facade.shift, 0.1]], 0);
    } else {
      new PipeSystem(bodyFixtures, { radius: radius, color: iron, kit }).run([[u, y, top], [u, y, lot.ground + 0.08]], 0);
    }
    return true;
  };
  if (role !== "side" || rng.bool(0.5)) {
    const order = rng.bool() ? [0.16, width - 0.16] : [width - 0.16, 0.16];
    /** True where a service bay, which has a soil stack and plant of its own, takes that end. */
    const serviced = (u: number) => columns.some((column) => column.kind === "service" && u > column.u0 && u < column.u1);
    // The rainwater pipe keeps to an end away from a service bay; a well, all service bay, offers either.
    const clear = order.filter((u) => !serviced(u));
    const ends = clear.length ? clear : order;
    for (const u of ends)
      if (drop(u, 0.05, lot.roof - 0.1)) {
        bodyFixtures.box("paint", [u - 0.1, 0, lot.roof - 0.12], [u + 0.1, 0.16, lot.roof + 0.08], iron);
        const supply = rng.bool(0.6);
        if (kit.detail > 0 && supply) drop(u + (u < width / 2 ? 0.16 : -0.16), 0.022, lot.roof - 0.4);
        break;
      }
  }
  if (kit.detail === 0) return;
  for (const column of columns) {
    if (column.kind !== "service" || column.u0 < 0 || column.u1 > width) continue;
    const u = column.u0 + 0.14;
    if (!drop(u, 0.055, lot.roof - 0.1)) continue;
    for (let floor = lot.ground + 0.5; floor < lot.roof - 1; floor += lot.storyHeight)
      new PipeSystem(bodyFixtures, { radius: 0.03, color: iron, kit }).run([[u, 0.085, floor], [u + Math.min(0.5, column.u1 - column.u0 - 0.3), 0.085, floor + 0.12]], 0);
  }
}
