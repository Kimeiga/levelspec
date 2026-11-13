import type { V3 } from "../../architecture/types.ts";
import { Rng } from "../../generate/rng.ts";
import type { Pen } from "../pen.ts";
import type { Kit } from "./kit.ts";
import { offerSign } from "./signs/book.ts";
import { inventBusiness } from "./signs/copy.ts";
import { flatSign, roofSign } from "./signs/mounts.ts";

export { streetSigns, wallAdvertisement } from "./signs/street.ts";

/** Shop fascias stand at most this far off their wall, inside the kit's flush limit, meters. */
const FASCIA_LIMIT = 0.13;
/** A fascia board is this much smaller all round than the slot it is given, leaving room for its fixings, meters. */
const FASCIA_INSET = 0.02;

/** Names a sign by where it stands in the world, to the millimeter, for callers without a seed path. */
function placeKey(pen: Pen, point: V3): string {
  return pen
    .world(point)
    .map((value) => Math.round(value * 1000))
    .join(",");
}

/** Returns a stream of its own drawn from `rng`, so a sign's design never shifts what its caller draws next. */
function fork(rng: Rng): Rng {
  return new Rng(Math.floor(rng.next() * 0x100000000));
}

/**
 * Offers a shop fascia fixed flat to the wall inside `x0..x0+w`,
 * `z0..z0+h` of the pen's wall plane: a painted board, a lacquered plaque or
 * a shallow light box titled with an invented business. It is drawn into
 * the `signage` part and projects at most 0.13 m.
 */
export function wallBoard(pen: Pen, x0: number, z0: number, w: number, h: number, kit: Kit, rng: Rng): void {
  const design = fork(rng);
  const site = { pen: pen.into("signage"), kit, key: `fascia@${placeKey(pen, [x0, 0, z0])}`, shown: true };
  const business = inventBusiness(design, { sectors: ["food", "retail", "service", "industry"] });
  const rect = { x0: x0 + FASCIA_INSET, z0: z0 + FASCIA_INSET, width: w - 2 * FASCIA_INSET, height: h - 2 * FASCIA_INSET };
  offerSign(kit, flatSign(site, rect, "fascia", FASCIA_LIMIT, business, design));
}

/**
 * Offers a board on a balcony front over `x0..x0+w`, `z0..z0+h` of the pen's
 * plane, which lies on the balustrade's outer face with its origin
 * `elevation` meters above the building base. `key` is the sign's seed path
 * and `shown` whether the build's detail level shows it.
 */
export function balconyBoard(pen: Pen, x0: number, z0: number, w: number, h: number, elevation: number, kit: Kit, key: string, shown: boolean): void {
  const rng = kit.rng(key);
  const business = inventBusiness(rng, { sectors: ["medical", "service", "retail"] });
  const site = { pen: pen.into("signage"), kit, key, shown, elevation };
  offerSign(kit, flatSign(site, { x0, z0, width: w, height: h }, "balcony", FASCIA_LIMIT, business, rng));
}

/**
 * Offers a hoarding along a roof parapet. The pen lies on the parapet's
 * outer plane with X along it and Z up from the roof deck; the hoarding
 * spans X from `x0` to `x1`, stands on the parapet top at `base` and stays
 * below `ceiling`. Nothing is offered where the roof is too small for one.
 */
export function roofHoarding(pen: Pen, x0: number, x1: number, base: number, ceiling: number, kit: Kit, key: string, shown: boolean): void {
  const rng = kit.rng(key);
  const business = inventBusiness(rng, { sectors: ["food", "retail", "industry", "service"] });
  const sign = roofSign({ pen, kit, key, shown }, x0, x1, base, ceiling, business, rng);
  if (sign) offerSign(kit, sign);
}
