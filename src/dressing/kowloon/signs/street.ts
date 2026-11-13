import type { Pen } from "../../pen.ts";
import { FLUSH, inside, type Facade } from "../facade.ts";
import type { Kit } from "../kit.ts";
import { offerSign } from "./book.ts";
import { inventBusiness, type Business } from "./copy.ts";
import { bladeSign, flatSign, hungSign, paintedSign, type SignSite } from "./mounts.ts";

/** One bay of a facade's upper stories: its type and extent along the facade, meters. */
interface Bay {
  kind: string;
  u0: number;
  u1: number;
}

/** Signs fixed flat to an upper wall stand at most this far off it, meters. */
const FLAT_LIMIT = 0.13;
/** Trades that take rooms upstairs. */
const UPSTAIRS = ["medical", "medical", "service", "retail", "industry"] as const;

/**
 * Proposes the signs of one street frontage, in the body's wall plane:
 * projecting signs on the piers between bays of the lower stories, small
 * plates fixed flat to piers, and long boards across the bays under a
 * story's windows. Each proposal is checked only against collision geometry
 * and other buildings through `facade.reach`; the survey decides later which
 * are built. `limit` is the deepest projection the facade allows, meters.
 */
export function streetSigns(facade: Facade, bays: Bay[], floors: number[], kit: Kit, bodyPen: Pen, limit: number): void {
  const { lot } = facade;
  const pen = bodyPen.into("signage");
  const site = (key: string, shown: boolean): SignSite => ({ pen, kit, key, shown, wash: lot.style.wall });
  /** The business a sign at facade point (`u`, `z`) on upper story `story` speaks for. */
  const tenant = (u: number, z: number, story: number, rng: ReturnType<Kit["rng"]>): Business => {
    const shop = story === 0 && rng.bool(0.6) ? kit.signs?.shopNear(pen.world([u, 0, z]), 2.4) : undefined;
    return shop ?? inventBusiness(rng, { sectors: [...UPSTAIRS], floor: Math.min(story + rng.int(1, 2), 9) });
  };

  const piers = [...new Set(bays.flatMap((bay) => [bay.u0, bay.u1]))].filter((u) => u > 0.3 && u < facade.width - 0.3);
  piers.push(0.22, facade.width - 0.22);
  const balconies = bays.filter((bay) => bay.kind === "balcony");
  for (const [p, u] of piers.entries()) {
    if (balconies.some((bay) => u > bay.u0 - 0.3 && u < bay.u1 + 0.3)) continue;
    let free = lot.ground + 0.2;
    for (let story = 0; story < Math.min(floors.length, 4); story++) {
      const key = `${facade.key}/sign-${p}-${story}`;
      const hanging = kit.option(key, story === 0 ? 0.62 : 0.42);
      if (!hanging.planned) continue;
      const rng = kit.rng(key);
      const foot = Math.max(free, floors[story] + 0.25);
      const ceiling = Math.min(lot.roof - 0.2, foot + rng.float(2.2, 4.6));
      if (ceiling - foot < 1.3 || !inside(facade.body, u - 0.1, u + 0.1, foot, ceiling)) continue;
      const room = { u, foot, ceiling, reach: facade.reach("body", u - 0.12, u + 0.12, foot, ceiling, limit) };
      const business = tenant(u, foot, story, rng);
      const hung = rng.bool(0.24);
      const sign = (hung ? hungSign(site(key, hanging.shown), room, business, rng) : undefined) ?? bladeSign(site(key, hanging.shown), room, business, rng);
      if (!sign) continue;
      offerSign(kit, sign.proposal);
      free = sign.top + 0.5;
    }
  }

  for (const [b, bay] of bays.entries()) {
    const next = bays[b + 1];
    // Plates take the plain pier between two window bays; other bays carry pipes, slabs or glazing there.
    if (!next || bay.kind !== "window" || next.kind !== "window") continue;
    for (let story = 0; story < Math.min(floors.length, 3); story++) {
      const key = `${facade.key}/plate-${b}-${story}`;
      const fixed = kit.option(key, 0.22);
      if (!fixed.planned) continue;
      const rng = kit.rng(key);
      const width = rng.float(0.28, 0.44),
        height = width * rng.float(1.5, 3.2),
        z0 = floors[story] + rng.float(0.5, 0.9);
      const rect = { x0: bay.u1 - width / 2, z0, width, height };
      if (!clearWall(facade, rect, lot.roof - 0.1)) continue;
      const business = inventBusiness(rng, { sectors: ["medical", "medical", "service"], floor: Math.min(story + 1, 9) });
      offerSign(kit, flatSign(site(key, fixed.shown), rect, "plate", FLAT_LIMIT, business, rng));
    }
  }

  for (let story = 0; story < Math.min(floors.length, 3); story++) {
    const key = `${facade.key}/long-${story}`;
    const fixed = kit.option(key, 0.34);
    if (!fixed.planned) continue;
    const rng = kit.rng(key);
    // A long board lies on the plain wall under a run of window bays.
    const runs: Bay[] = [];
    for (const bay of bays) {
      const last = runs[runs.length - 1];
      if (bay.kind !== "window") continue;
      if (last && Math.abs(last.u1 - bay.u0) < 1e-6) last.u1 = bay.u1;
      else runs.push({ ...bay });
    }
    // Rainwater pipes run down the ends of the lot, and cages and racks hang from 0.65 m above the floor.
    const clear = runs
      .map((run) => ({ u0: Math.max(run.u0, 0.5), u1: Math.min(run.u1, facade.width - 0.5) }))
      .filter((run) => run.u1 - run.u0 >= 2.4);
    if (!clear.length) continue;
    const run = rng.pick(clear);
    const width = Math.min(run.u1 - run.u0, rng.float(2.2, 6.5));
    const rect = { x0: run.u0 + rng.float(0, run.u1 - run.u0 - width), z0: floors[story] + 0.08, width, height: rng.float(0.38, 0.52) };
    if (!clearWall(facade, rect, lot.roof - 0.1)) continue;
    const business = tenant(rect.x0 + width / 2, rect.z0, story, rng);
    offerSign(kit, flatSign(site(key, fixed.shown), rect, "long", FLAT_LIMIT, business, rng));
  }
}

/** True when `rect` and its fixings lie on exposed body wall below `ceiling` with flat-sign depth clear in front. */
function clearWall(facade: Facade, rect: { x0: number; z0: number; width: number; height: number }, ceiling: number): boolean {
  const u0 = rect.x0 - 0.02,
    u1 = rect.x0 + rect.width + 0.02,
    z0 = rect.z0 - 0.06,
    z1 = rect.z0 + rect.height + 0.06;
  return z1 <= ceiling && inside(facade.body, u0, u1, z0, z1) && facade.reach("body", u0, u1, z0, z1, FLAT_LIMIT) > 0;
}

/**
 * Proposes a large painted advertisement on a blank wall of the body: the
 * largest exposed rectangle of a party or end wall, where it is big enough
 * to be read from down the street.
 */
export function wallAdvertisement(facade: Facade, kit: Kit, bodyPen: Pen): void {
  const key = `${facade.key}/painted`;
  const painted = kit.option(key, 0.6);
  if (!painted.planned) return;
  const area = (rect: { u0: number; u1: number; v0: number; v1: number }) => (rect.u1 - rect.u0) * (rect.v1 - rect.v0);
  const [largest] = [...facade.body].sort((a, b) => area(b) - area(a));
  if (!largest || largest.u1 - largest.u0 < 2.4 || largest.v1 - largest.v0 < 2.4) return;
  const rng = kit.rng(key);
  const room = { width: largest.u1 - largest.u0 - 0.8, height: largest.v1 - largest.v0 - 0.8 };
  // An upright field suits a tall slot and a level one a broad slot; either keeps a sign painter's proportions.
  const upright = room.height > room.width * 1.2;
  const width = upright ? Math.min(room.width, rng.float(1.1, 1.8)) : Math.min(room.width, rng.float(3.2, 6)),
    height = upright ? Math.min(room.height, width * rng.float(3.2, 4.4)) : Math.min(room.height, width / rng.float(3, 4.2));
  const rect = {
    x0: largest.u0 + 0.4 + rng.float(0, room.width - width),
    z0: largest.v1 - 0.4 - height - rng.float(0, Math.min(1, room.height - height)),
    width,
    height,
  };
  if (!facade.reach("body", rect.x0, rect.x0 + width, rect.z0, rect.z0 + height, FLUSH)) return;
  const business = inventBusiness(rng, { sectors: ["food", "retail", "industry", "service"] });
  offerSign(kit, paintedSign({ pen: bodyPen.into("signage"), kit, key, shown: painted.shown }, rect, business, rng));
}
