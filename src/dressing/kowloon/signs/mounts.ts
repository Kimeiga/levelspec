import type { V3 } from "../../../architecture/types.ts";
import { weatheredPen } from "../weathered.ts";
import type { Rng } from "../../../generate/rng.ts";
import type { Pen } from "../../pen.ts";
import { stain } from "../fixtures.ts";
import type { Kit } from "../kit.ts";
import type { PlacedPanel, SignProposal } from "./book.ts";
import { companyTitle, inventBusiness, titleOf, type Business } from "./copy.ts";
import { drawLook, paintedField, tilePanels, titlePanel, type SignLook } from "./designs.ts";
import type { Construction } from "./panel.ts";
import { angle, bolt, chain, fixingPlate, gusset, lattice, member, rod, toned, turnbuckle } from "./steel.ts";

/**
 * Where a sign is fixed. The pen lies on the wall plane and draws into the
 * part the sign belongs to: X runs to the right as seen from outside, Y
 * outward and Z up, in meters.
 */
export interface SignSite {
  pen: Pen;
  /** Elevation of the pen's origin above the building base, meters; 0 when omitted. */
  elevation?: number;
  kit: Kit;
  /** Seed path of the sign. */
  key: string;
  /** Whether the build's detail level shows the sign. */
  shown: boolean;
  /** Wash of the wall behind the sign, which rust from its fixings darkens. */
  wash?: V3;
}

/** The clear space a projecting sign may use on a pier at facade coordinate `u`. */
export interface PierRoom {
  u: number;
  /** Lowest and highest elevation any part of the sign may reach. */
  foot: number;
  ceiling: number;
  /** Clear depth in front of the wall over that height. */
  reach: number;
}

/** A rectangle of wall in facade coordinates, from its lower-left corner. */
export interface WallRect {
  x0: number;
  z0: number;
  width: number;
  height: number;
}

/** Readers' eyes are this far above the building base, meters. */
const EYE_LEVEL = 1.6;
/** Flat signs stand this far off their wall, so they never share its plane, meters. */
const WALL_GAP = 0.01;
/** Depth of each construction's body when fixed flat, meters. */
const FLAT_DEPTH: Record<Construction, number> = {
  sheet: 0.04,
  timber: 0.05,
  lightbox: 0.1,
  enamel: 0.012,
  tile: 0.04,
  cloth: 0.004,
  painted: 0,
};
/** The plan form each construction is reported as. */
const FORM_OF: Record<Construction, SignProposal["form"]> = {
  sheet: "board",
  cloth: "board",
  lightbox: "lightbox",
  timber: "plaque",
  enamel: "plaque",
  tile: "tiles",
  painted: "painted",
};

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

/** Returns the frame of a panel standing square to the wall at `u`: its front faces +X, its foot is at `z`. */
function bladePen(site: SignSite, u: number, standoff: number, z: number, depth: number): Pen {
  return site.pen.facing([u + depth / 2, standoff, z], [0, 1, 0], [1, 0, 0]);
}

/** Draws a wall plate at facade point (`u`, `z`) and, under an old sign, the rust it has shed down the wall. */
function wallFixing(site: SignSite, look: SignLook, u: number, z: number, height = 0.15): void {
  fixingPlate(site.pen, look.steel, [u, 0, z], [1, 0, 0], [0, 0, 1], [0, 1, 0], 0.11, height, site.kit.detail > 0 ? 4 : 2);
  if (site.wash && look.age > 0.5)
    stain(site.pen, u - 0.05, u + 0.05, z - height / 2, z - height / 2 - (0.2 + 0.5 * look.age), site.wash, 0.25 + 0.25 * look.age);
}

/** What carries panels standing square to a wall: where they sit and the room for bracing. */
interface Carriage {
  u: number;
  /** Distances from the wall of the panels' near and far edges. */
  inner: number;
  outer: number;
  /** Elevations of the lowest panel's foot and the highest panel's head. */
  bottom: number;
  top: number;
  /** Height of the stay's wall fixing above the top arm, or 0 for none. */
  stay: number;
  /** Drop of the strut's wall fixing below the bottom arm, or 0 for none. */
  strut: number;
  /** Uprights join the arms at both edges of the panels. */
  uprights: boolean;
}

/**
 * Draws the steel that carries panels standing square to the wall: an angle
 * arm above and below on wall plates, a gusset, optional uprights, and a
 * stay rod from above or a strut from below.
 */
function carry(site: SignSite, look: SignLook, carriage: Carriage): void {
  const { kit } = site;
  const { steel } = look;
  const pen = weatheredPen(site.pen, steel.weathering, "frame", undefined, [steel.slot]);
  const { u, inner, outer } = carriage;
  const length = outer + 0.04,
    high = carriage.top + 0.012,
    low = carriage.bottom - 0.012;
  angle(pen, steel, [u - 0.02, 0, high], [u - 0.02, length, high], [1, 0, 0], [0, 0, 1], 0.04, 0.005);
  angle(pen, steel, [u - 0.02, 0, low], [u - 0.02, length, low], [1, 0, 0], [0, 0, -1], 0.04, 0.005);
  wallFixing({ ...site, pen }, look, u, high + 0.02);
  wallFixing({ ...site, pen }, look, u, low - 0.02);
  for (const [at, direction] of [[high, -1], [low, 1]]) {
    gusset(pen, toned(steel, 0.9), [[u, 0.012, at], [u, 0.14, at], [u, 0.012, at + direction * 0.12]], [1, 0, 0]);
    for (const offset of [0.035, 0.095])
      bolt(pen, steel, [u + 0.003, 0.025, at + direction * offset], [1, 0, 0], 0.007);
  }
  if (carriage.uprights)
    for (const y of [inner - 0.012, outer + 0.012]) member(pen, toned(steel, 0.95), [u, y, low], [u, y, high], [1, 0, 0], 0.035, 0.006);
  if (carriage.top - carriage.bottom > 2.2) {
    const middle = (carriage.top + carriage.bottom) / 2;
    angle(pen, steel, [u - 0.02, 0, middle], [u - 0.02, inner - 0.012, middle], [1, 0, 0], [0, 0, 1], 0.04, 0.005);
    wallFixing({ ...site, pen }, look, u, middle + 0.02);
  }
  if (carriage.stay > 0) {
    const from: V3 = [u, inner + (outer - inner) * 0.8, high + 0.045],
      to: V3 = [u, 0.012, high + carriage.stay];
    rod(pen, steel, [from, to], 0.006, 5);
    if (kit.detail > 0) turnbuckle(pen, toned(steel, 0.85), from, to, 0.006);
    fixingPlate(pen, steel, [u, 0, high + carriage.stay], [1, 0, 0], [0, 0, 1], [0, 1, 0], 0.07, 0.09, 2);
  } else if (carriage.strut > 0) {
    member(pen, steel, [u, 0.006, low - carriage.strut], [u, inner + (outer - inner) * 0.55, low - 0.02], [1, 0, 0], 0.035, 0.006);
    wallFixing({ ...site, pen }, look, u, low - carriage.strut, 0.1);
  }
}

/** How a carriage will be braced, decided before its panels are sized. */
interface Bracing {
  /** Elevation of the lowest panel's foot. */
  bottom: number;
  /** Drop of the strut's wall fixing below the bottom arm, or 0 for a carriage stayed from above. */
  strut: number;
  /** Height the stay's wall fixing would like above the top arm. */
  rise: number;
}

/** Chooses a strut from below for some carriages with room to lift their panels, and a stay from above otherwise. */
function chooseBracing(room: PierRoom, rng: Rng): Bracing {
  const strutted = rng.bool(0.3) && room.ceiling - room.foot >= 2.3;
  return { bottom: room.foot + (strutted ? 0.52 : 0.12), strut: strutted ? 0.38 : 0, rise: rng.float(0.45, 0.9) };
}

/** Returns the stay's height above the top arm for panels ending at `top`: 0 beside a strut or where none fits. */
function stayAbove(room: PierRoom, bracing: Bracing, top: number): number {
  const above = room.ceiling - top - 0.07;
  return bracing.strut === 0 && above >= 0.4 ? Math.min(above, bracing.rise) : 0;
}

/** Assembles a proposal from its panels; `middle` is the pen-frame elevation readers look up to. */
function proposal(
  site: SignSite,
  mount: SignProposal["mount"],
  form: SignProposal["form"],
  panels: PlacedPanel[],
  look: SignLook,
  middle: number,
  business: Business | undefined,
  fixings: () => void,
): SignProposal {
  return {
    key: site.key,
    mount,
    form,
    panels,
    steel: look.steel,
    shown: site.shown,
    above: mount === "roof" ? 0 : (site.elevation ?? 0) + middle - EYE_LEVEL,
    business,
    fixings,
  };
}

/**
 * Proposes a sign standing square to the wall on a pier: one tall board or
 * light box, a string of single-character tiles, a ladder of several
 * tenants' boards, or a short wide board. Returns the proposal and the
 * highest elevation it reaches, or undefined when the room fits none.
 */
export function bladeSign(site: SignSite, room: PierRoom, business: Business, rng: Rng): { proposal: SignProposal; top: number } | undefined {
  if (room.ceiling - room.foot < 1.6 || room.reach < 0.68) return undefined;
  const { u } = room;
  const bracing = chooseBracing(room, rng);
  const { bottom, strut } = bracing;
  // Room for panels between the bottom arm and the top arm's wall plate.
  const height = room.ceiling - bottom - 0.18;
  const title = titleOf(business);
  let kind = rng.weighted([
    ["board", 3.4],
    ["lightbox", 1.6],
    ["tiles", height >= 1.3 ? 1.7 : 0],
    ["ladder", height >= 1.1 && room.reach >= 0.86 ? 1.4 : 0],
    ["wide", room.reach >= 1 ? 1.1 : 0],
  ] as const);

  if (kind === "tiles") {
    const text = [business.trade, title, business.name].find((candidate) => candidate.length >= 3 && candidate.length <= 5) ?? business.trade;
    const gap = 0.035;
    const size = Math.min(0.62, room.reach - 0.24, (height + gap) / text.length - gap);
    if (size >= 0.36) {
      const look = drawLook("tile", site.kit, rng);
      const standoff = Math.min(rng.float(0.12, 0.2), room.reach - size - 0.06);
      const top = bottom + text.length * (size + gap) - gap;
      const designs = tilePanels(text, size, 0.05, look, rng);
      const panels = designs.map((design, index): PlacedPanel => ({
        pen: bladePen(site, u, standoff, top - (index + 1) * size - index * gap, design.depth),
        design,
        sides: "both",
      }));
      const stay = stayAbove(room, bracing, top);
      const carriage: Carriage = { u, inner: standoff, outer: standoff + size, bottom, top, stay, strut, uprights: designs[0].outline === "rectangle" };
      return {
        proposal: proposal(site, "blade", "tiles", panels, look, (bottom + top) / 2, business, () => {
          carry(site, look, carriage);
          rod(site.pen, look.steel, [[u, standoff + size / 2, bottom - 0.012], [u, standoff + size / 2, top + 0.012]], 0.007, 5);
        }),
        top: top + 0.012 + Math.max(stay, 0.1),
      };
    }
    kind = "board";
  }

  if (kind === "ladder") {
    const width = Math.min(1.05, room.reach - 0.22);
    const rung = rng.float(0.3, 0.42),
      gap = 0.07;
    const count = Math.min(rng.int(2, 4), Math.floor((height + gap) / (rung + gap)));
    if (width >= 0.62 && count >= 2) {
      const standoff = Math.min(rng.float(0.12, 0.2), room.reach - width - 0.06);
      const top = bottom + count * (rung + gap) - gap;
      const first = drawLook("sheet", site.kit, rng);
      const panels = Array.from({ length: count }, (_, index): PlacedPanel => {
        const tenant = inventBusiness(rng, { sectors: ["medical", "service", "retail"], floor: rng.int(1, 4) });
        const look = index === 0 ? first : { ...drawLook("sheet", site.kit, rng), steel: first.steel };
        const design = titlePanel(tenant, width, rung, 0.04, look, rng);
        return { pen: bladePen(site, u, standoff, top - (index + 1) * rung - index * gap, design.depth), design, sides: "both" };
      });
      const stay = stayAbove(room, bracing, top);
      const carriage: Carriage = { u, inner: standoff, outer: standoff + width, bottom, top, stay, strut, uprights: true };
      return {
        proposal: proposal(site, "blade", "ladder", panels, first, (bottom + top) / 2, undefined, () => carry(site, first, carriage)),
        top: top + 0.012 + Math.max(stay, 0.1),
      };
    }
    kind = "board";
  }

  const lit = kind === "lightbox" || (kind === "wide" && rng.bool(0.3));
  const look = drawLook(lit ? "lightbox" : "sheet", site.kit, rng);
  const depth = lit ? rng.float(0.15, 0.2) : 0.045;
  let width: number, tall: number;
  if (kind === "wide") {
    width = Math.min(1.25, room.reach - 0.18);
    tall = rng.float(0.42, 0.6);
  } else {
    width = rng.float(0.42, Math.min(lit ? 0.7 : 0.85, room.reach - 0.2));
    tall = clamp(title.length * width * rng.float(0.95, 1.15) + 0.25, 1.2, Math.min(3.8, height));
  }
  const standoff = Math.min(rng.float(0.12, 0.3), room.reach - width - 0.06);
  const top = bottom + tall;
  const design = titlePanel(business, width, tall, depth, look, rng);
  const stay = stayAbove(room, bracing, top);
  const carriage: Carriage = { u, inner: standoff, outer: standoff + width, bottom, top, stay, strut, uprights: !lit };
  const trussed = kind === "wide" && stay > 0 && site.kit.detail > 0;
  return {
    proposal: proposal(site, "blade", lit ? "lightbox" : "board", [{ pen: bladePen(site, u, standoff, bottom, depth), design, sides: "both" }], look, (bottom + top) / 2, business, () => {
      carry(site, look, carriage);
      const reach = standoff + width + 0.04;
      if (trussed) lattice(site.pen, look.steel, [u, 0.01, top + 0.05], [u, reach, top + 0.05], [u, 0.01, top + 0.2], [u, reach, top + 0.2], Math.max(3, Math.round(reach / 0.22)), 0.028, 0.018);
      // A light box takes its supply through a flexible lead sagging from the wall.
      if (lit) rod(site.pen, { slot: "paint", tint: [0.03, 0.03, 0.03] }, [[u + 0.05, 0.01, top + 0.3], [u + 0.05, standoff * 0.5, top + 0.12], [u + 0.03, standoff + 0.08, top]], 0.009, 5);
    }),
    top: top + 0.012 + Math.max(stay, 0.1),
  };
}

/**
 * Proposes a board hanging by two links from a single bracket arm over the
 * street. Returns the proposal and the highest elevation it reaches, or
 * undefined when the room is too small.
 */
export function hungSign(site: SignSite, room: PierRoom, business: Business, rng: Rng): { proposal: SignProposal; top: number } | undefined {
  const height = room.ceiling - room.foot;
  if (height < 1.3 || room.reach < 0.8) return undefined;
  const construction = rng.weighted([["sheet", 3], ["timber", 2], ["lightbox", 1]] as const);
  const look = drawLook(construction, site.kit, rng);
  const depth = construction === "lightbox" ? rng.float(0.13, 0.17) : construction === "timber" ? 0.05 : 0.04;
  const width = rng.float(0.5, Math.min(0.9, room.reach - 0.26));
  const tall = rng.float(0.5, Math.min(1.1, height - 0.7));
  const { u } = room;
  const standoff = Math.min(rng.float(0.14, 0.3), room.reach - width - 0.12);
  const bottom = room.foot + 0.08,
    top = bottom + tall,
    arm = top + 0.1;
  const design = titlePanel(business, width, tall, depth, look, rng);
  const fixings = () => {
    const { pen } = site;
    const reach = standoff + width + 0.08;
    angle(pen, look.steel, [u - 0.02, 0, arm], [u - 0.02, reach, arm], [1, 0, 0], [0, 0, 1], 0.04, 0.005);
    member(pen, look.steel, [u, 0.006, arm - 0.3], [u, Math.min(0.36, standoff + 0.1), arm - 0.01], [1, 0, 0], 0.035, 0.006);
    wallFixing(site, look, u, arm - 0.14, 0.4);
    member(pen, toned(look.steel, 0.8), [u, reach, arm - 0.02], [u, reach, arm + 0.07], [1, 0, 0], 0.03, 0.03);
    for (const y of [standoff + 0.08, standoff + width - 0.08]) {
      rod(pen, look.steel, [[u, y, arm], [u, y, top]], 0.004, 4);
      if (site.kit.detail > 0) chain(pen, look.steel, [u, y, arm], [u, y, top], 0.035);
    }
  };
  return {
    proposal: proposal(site, "hung", FORM_OF[construction], [{ pen: bladePen(site, u, standoff, bottom, depth), design, sides: "both" }], look, (bottom + top) / 2, business, fixings),
    top: arm + 0.1,
  };
}

/** Which flat signs a wall position takes. */
export type FlatKind = "fascia" | "long" | "plate" | "balcony";

/**
 * Proposes a sign fixed flat over `rect`: a shop fascia, a long board across
 * several bays, a small plate on a pier, or a board on a balcony front. Its
 * face stands at most `limit` meters off the wall.
 */
export function flatSign(site: SignSite, rect: WallRect, kind: FlatKind, limit: number, business: Business, rng: Rng): SignProposal {
  const roomy = limit >= WALL_GAP + FLAT_DEPTH.lightbox + 0.02;
  const construction =
    kind === "plate"
      ? rng.weighted([["enamel", 3], ["sheet", 2], ["timber", 1.5]] as const)
      : kind === "balcony"
        ? "sheet"
        : rng.weighted([["sheet", 4], ["timber", kind === "fascia" ? 2.5 : 1], ["lightbox", roomy ? (kind === "fascia" ? 2 : 1.5) : 0]] as const);
  const look = drawLook(construction, site.kit, rng);
  const depth = FLAT_DEPTH[construction];
  const design = titlePanel(business, rect.width, rect.height, depth, look, rng);
  const fixings = () => {
    if (construction === "enamel") return;
    const head = rect.z0 + rect.height,
      count = Math.max(2, Math.round(rect.width / 1.2));
    for (let i = 0; i < count; i++) {
      const x = rect.x0 + (rect.width * (i + 0.5)) / count;
      if (construction === "lightbox") {
        member(site.pen, look.steel, [x, 0, rect.z0 - 0.02], [x, WALL_GAP + depth, rect.z0 - 0.02], [1, 0, 0], 0.04, 0.03);
        continue;
      }
      for (const z of [head + 0.012, rect.z0 - 0.012])
        fixingPlate(site.pen, look.steel, [x, 0, z], [1, 0, 0], [0, 0, 1], [0, 1, 0], 0.045, 0.06, 2);
    }
  };
  const mount = kind === "fascia" ? "fascia" : kind === "balcony" ? "balcony" : "wall";
  const pen = site.pen.move(rect.x0, WALL_GAP + depth, rect.z0);
  return proposal(site, mount, FORM_OF[construction], [{ pen, design, sides: "front" }], look, rect.z0 + rect.height / 2, business, fixings);
}

/** Proposes a large advertisement painted straight onto blank wall over `rect`. */
export function paintedSign(site: SignSite, rect: WallRect, business: Business, rng: Rng): SignProposal {
  const look = drawLook("painted", site.kit, rng);
  const design = paintedField(companyTitle(business, rng), rect.width, rect.height, look, rng);
  const pen = site.pen.move(rect.x0, 0.004, rect.z0);
  return proposal(site, "wall", "painted", [{ pen, design, sides: "front" }], look, rect.z0 + rect.height / 2, business, () => {});
}

/**
 * Proposes a hoarding behind a roof parapet, as one large board or as a row
 * of single-character panels, on a braced steel frame. The site's pen lies on
 * the parapet's outer plane with Z up from the roof deck; the sign spans X
 * from `x0` to `x1`, stands on the parapet top at `base` and stays below
 * `ceiling`. Returns undefined when the span or the height is too small.
 */
export function roofSign(site: SignSite, x0: number, x1: number, base: number, ceiling: number, business: Business, rng: Rng): SignProposal | undefined {
  const span = x1 - x0,
    foot = base + 0.35,
    headroom = ceiling - foot - 0.1;
  if (span < 3.2 || headroom < 0.8) return undefined;
  const look = drawLook(rng.bool(0.6) ? "sheet" : "tile", site.kit, rng);
  const title = titleOf(business);
  const set = -0.12;
  let panels: PlacedPanel[], tall: number, left: number, width: number;
  const gap = 0.14;
  const size = Math.min(1.3, headroom, (span + gap) / title.length - gap);
  if (look.construction === "tile" && size >= 0.8) {
    tall = size;
    width = title.length * (size + gap) - gap;
    left = (x0 + x1 - width) / 2;
    const designs = tilePanels(title, size, 0.05, look, rng).map((design) => ({ ...design, outline: "rectangle" as const, border: look.palette.border }));
    // Panels follow the reader's left to right, which a mirrored host reverses along X.
    panels = designs.map((design, index) => {
      const place = site.pen.mirrored ? designs.length - 1 - index : index;
      return { pen: site.pen.move(left + place * (size + gap), set, foot), design, sides: "front" };
    });
  } else {
    const board: SignLook = look.construction === "sheet" ? look : { ...look, construction: "sheet" };
    tall = Math.min(1.5, headroom, span / 3.6);
    width = Math.min(span, tall * rng.float(3.2, 4.6));
    left = (x0 + x1 - width) / 2;
    panels = [{ pen: site.pen.move(left, set, foot), design: titlePanel(business, width, tall, 0.05, board, rng), sides: "front" }];
  }
  const fixings = () => {
    const { pen } = site;
    const { steel } = look;
    const behind = set - 0.05 - 0.03,
      head = foot + tall + 0.05;
    const posts = Math.max(2, Math.ceil(width / 1.6) + 1);
    for (let i = 0; i < posts; i++) {
      const x = left + 0.1 + ((width - 0.2) * i) / (posts - 1);
      angle(pen, steel, [x, behind, 0.02], [x, behind, head], [1, 0, 0], [0, -1, 0], 0.05, 0.005);
      member(pen, toned(steel, 0.9), [x + 0.02, behind - 0.03, foot + tall * 0.75], [x + 0.02, behind - 1.1, 0.03], [1, 0, 0], 0.04, 0.006);
      fixingPlate(pen, steel, [x + 0.02, behind - 1.1, 0.02], [1, 0, 0], [0, 1, 0], [0, 0, 1], 0.12, 0.12, 4);
    }
    for (const share of [0.18, 0.82]) {
      const z = foot + tall * share;
      angle(pen, toned(steel, 0.95), [left, behind + 0.03, z], [left + width, behind + 0.03, z], [0, 0, 1], [0, -1, 0], 0.04, 0.005);
    }
  };
  return proposal(site, "roof", FORM_OF[look.construction === "tile" && panels.length > 1 ? "tile" : "sheet"], panels, look, 0, business, fixings);
}
