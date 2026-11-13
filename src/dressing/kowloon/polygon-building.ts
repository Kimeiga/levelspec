import type { V3 } from "../../architecture/types.ts";
import { Rng } from "../../generate/rng.ts";
import type { Pen } from "../pen.ts";
import { dressFacade, type Facade } from "./facade.ts";
import { insetFootprint, withinFootprint, type BuildingFootprint } from "./footprint.ts";
import type { Decks } from "./deck.ts";
import type { Kit } from "./kit.ts";
import { ROOF_RESERVE, type Lot, type Rect } from "./massing.ts";
import { lotStyle, shade } from "./palette.ts";
import { rooftop } from "./rooftop.ts";
import type { LotFinish } from "./skin.ts";
import { joinFacadeCorners } from "./facade-details.ts";

/** A polygon host is one coherent tenement, with the authored perimeter at every story. */
export function polygonLot(footprint: BuildingFootprint, stories: number, seed: string): Lot {
  const roof = footprint.height - ROOF_RESERVE;
  const ground = stories === 1 ? roof : Math.min(3.6, roof / stories);
  return {
    index: 0, kind: "tenement", x0: 0, x1: footprint.width, stories,
    ground, storyHeight: stories > 1 ? (roof - ground) / (stories - 1) : 0,
    roof, top: footprint.height, front: 0, back: 0,
    style: lotStyle(new Rng(`${seed}/lot-0/style`)), key: "lot-0",
  };
}

/** Shared obstruction queries in each polygon edge's local facade frame. */
export interface PolygonContext {
  exposed(pen: Pen, rect: Rect): Rect[];
  reach(pen: Pen, u0: number, u1: number, z0: number, z1: number, limit: number): number;
}

/**
 * Dresses a convex perimeter and closes its roof with mitered parapets. Windows,
 * weathering and floor finishes use the same passes as rectangular tenements.
 */
export function polygonBuilding(root: Pen, footprint: BuildingFootprint, lot: Lot, kit: Kit, decks: Decks, finish: LotFinish, context: PolygonContext): void {
  const points = footprint.points;
  const facades: Facade[] = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    const width = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const tangent: V3 = [(b[0] - a[0]) / width, (b[1] - a[1]) / width, 0];
    const outward: V3 = [tangent[1], -tangent[0], 0];
    const pen = root.facing(a, tangent, outward);
    const facade: Facade = {
      role: width < 2 ? "party" : i === 0 ? "front" : "side",
      lot, finish, key: `${lot.key}/edge-${i}`, pen, width, shift: 0,
      bodyU0: 0.5, bodyU1: width - 0.5,
      ground: context.exposed(pen, { u0: 0, u1: width, v0: 0, v1: lot.ground }),
      body: context.exposed(pen, { u0: 0, u1: width, v0: lot.ground, v1: lot.top }),
      reach: (_zone, u0, u1, z0, z1, limit) => context.reach(pen, u0, u1, z0, z1, limit),
      shops: 0,
      hollow: () => 0,
    };
    facades.push(facade);
  }
  joinFacadeCorners(facades);
  for (const facade of facades) dressFacade(facade, kit);
  const inner = insetFootprint(points, 0.14);
  decks.lay(`${lot.key}/deck`, inner.map(p => root.world([p[0], p[1], lot.roof])));
  const cap = shade(lot.style.wall, 0.92);
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length, a = points[i], b = points[j], c = inner[j], d = inner[i];
    const at = (p: V3, z: number): V3 => [p[0], p[1], z];
    root.face("concrete", [at(a, lot.top), at(b, lot.top), at(c, lot.top), at(d, lot.top)], [0, 0, 1], cap);
    const inward: V3 = [a[1] - b[1], b[0] - a[0], 0];
    root.face("concrete", [at(d, lot.roof), at(c, lot.roof), at(c, lot.top), at(d, lot.top)], inward, cap);
  }
  furnishRoof(root, points, lot, kit);
}

/** Finds a wholly contained equipment court; corner wedges remain open paved terrace. */
function furnishRoof(root: Pen, points: V3[], lot: Lot, kit: Kit): void {
  const center: V3 = [points.reduce((sum, p) => sum + p[0], 0) / points.length, points.reduce((sum, p) => sum + p[1], 0) / points.length, 0];
  let halfWidth = (Math.max(...points.map(p => p[0])) - Math.min(...points.map(p => p[0]))) / 2;
  let halfDepth = (Math.max(...points.map(p => p[1])) - Math.min(...points.map(p => p[1]))) / 2;
  while (halfWidth >= 1.5 && halfDepth >= 1.5) {
    const fits = [-1, 1].every(x => [-1, 1].every(y => withinFootprint(points, [center[0] + x * halfWidth, center[1] + y * halfDepth, 0], 0.35)));
    if (fits) {
      rooftop(root.move(center[0] - halfWidth, center[1] - halfDepth, lot.roof).into("rooftop"), lot, 2 * halfWidth, 2 * halfDepth, lot.top - lot.roof, 3.85, kit, false);
      return;
    }
    halfWidth *= 0.9;
    halfDepth *= 0.9;
  }
}
