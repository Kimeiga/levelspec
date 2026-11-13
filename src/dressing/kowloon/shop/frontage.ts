import type { V3 } from "../../../architecture/types.ts";
import { Rng } from "../../../generate/rng.ts";
import type { Pen } from "../../pen.ts";
import type { Kit } from "../kit.ts";
import { DISPLAY_SIZES, drawDisplay, type DisplayKind, type DisplayTrade } from "./display-assemblies.ts";
import { rotated } from "./forms.ts";

/** Tests a street-facing patch at building-base height; ground and standing access must both be available. */
export type FrontageAvailable = (x0: number, x1: number, depth: number, height: number) => boolean;
export interface FrontagePlan {
  side: "left" | "right";
  kind: DisplayKind;
  center: V3;
  yaw: number;
  width: number;
  depth: number;
  height: number;
}

/**
 * Reserves two independent edge patches outside a shop, leaving a one-meter central entry.
 * Each full rotated assembly stays in its own half-bay and projects at most 0.65 m.
 */
export function planFrontage(width: number, rng: Rng, available: FrontageAvailable): FrontagePlan[] {
  if (width < 1 || !available(width / 2 - .5, width / 2 + .5, .65, 2.2)) return [];
  const result: FrontagePlan[] = [];
  for (const side of ["left", "right"] as const) {
    const local = new Rng(rng.next() * 0xffffffff);
    const x0 = side === "left" ? .05 : width / 2 + .5;
    const x1 = side === "left" ? width / 2 - .5 : width - .05;
    if (x1 <= x0) continue;
    const kinds = local.shuffle(Object.keys(DISPLAY_SIZES) as DisplayKind[]);
    for (const kind of kinds) {
      const [w, d, height] = DISPLAY_SIZES[kind];
      let yaw = local.float(-.14, .14);
      let turnedWidth = w * Math.cos(yaw) + d * Math.abs(Math.sin(yaw));
      let depth = d * Math.cos(yaw) + w * Math.abs(Math.sin(yaw));
      if (turnedWidth > x1 - x0 || depth + .04 > .65) {
        yaw = 0;
        turnedWidth = w;
        depth = d;
      }
      if (turnedWidth > x1 - x0 || depth + .04 > .65) continue;
      const x = side === "left" ? x0 + turnedWidth / 2 : x1 - turnedWidth / 2;
      if (!available(x - turnedWidth / 2, x + turnedWidth / 2, depth + .04, height)) continue;
      result.push({side,kind,center:[x,depth/2+.04,0],yaw,width:turnedWidth,depth,height});
      break;
    }
  }
  return result;
}

/** Draws the optional street assemblies in their own render-only part, separate from room furnishings. */
export function drawFrontage(context: {
  pen: Pen; width: number; trade: DisplayTrade; kit: Kit; key: string; available: FrontageAvailable;
}): FrontagePlan[] {
  const {pen,width,trade,kit,key,available} = context;
  const planned = planFrontage(width,kit.rng(`${key}/frontage-plan`),available);
  const shown = planned.filter(plan => kit.has(`${key}/frontage/${plan.side}`, .85));
  for (const plan of shown) {
    const local = rotated(pen.into("shop-frontage"),plan.center,"z",plan.yaw);
    drawDisplay(local,plan.kind,trade,kit.rng(`${key}/frontage/${plan.side}/goods`));
  }
  return shown;
}
