import type { WallLedge } from "../finish/wall-condition.ts";
import type { Pen } from "../pen.ts";
import { inside, type Facade } from "./facade.ts";
import type { Kit } from "./kit.ts";
import type { Rect } from "./massing.ts";
import { GALVANIZED, SOOT, shade } from "./palette.ts";
import { stainedPanel } from "./skin.ts";
import { profiledStrip } from "./molding.ts";
import { subtractRect } from "./massing.ts";
import { srgb } from "./palette.ts";

/** Links coincident exposed facade ends so projecting bands share one miter without overlapping caps. */
export function joinFacadeCorners(facades: Facade[]): void {
  for (const facade of facades) facade.cornerMiter = (zone, u, z0, z1) => {
    const pen = zone === "body" ? facade.pen.move(0, facade.shift, 0) : facade.pen;
    const origin = pen.world([0, 0, 0]), point = pen.world([u, 0, 0]);
    const tangent = pen.world([1, 0, 0]).map((value, axis) => value - origin[axis]);
    const normal = pen.world([0, 1, 0]).map((value, axis) => value - origin[axis]);
    for (const other of facades) {
      if (other === facade) continue;
      const otherPen = zone === "body" ? other.pen.move(0, other.shift, 0) : other.pen;
      for (const rect of other[zone]) for (const end of [rect.u0, rect.u1]) {
        if (rect.v0 > z0 + 1e-6 || rect.v1 < z1 - 1e-6) continue;
        const depth = zone === "ground" ? 0.065 : 0.12;
        if (other.reach(zone, rect.u0, rect.u1, z0, z1, depth) < depth - 1e-6) continue;
        const at = otherPen.world([end, 0, 0]);
        if (Math.hypot(...point.map((value, axis) => value - at[axis])) > 1e-5) continue;
        const zero = otherPen.world([0, 0, 0]);
        const outward = otherPen.world([0, 1, 0]).map((value, axis) => value - zero[axis]);
        const along = outward.reduce((sum, value, axis) => sum + value * tangent[axis], 0);
        const across = outward.reduce((sum, value, axis) => sum + value * normal[axis], 0);
        if (Math.abs(along) < 1e-5) continue;
        const shift = (1 - across) / along;
        if (Math.abs(shift) <= 2.5) return shift;
      }
    }
    return undefined;
  };
}

/** Adds an above-grade concrete base to exposed masonry, stopping at every entrance and shop threshold. */
export function drawPlinth(facade: Facade, thresholds: { u0: number; u1: number }[], kit: Kit): void {
  const height = Math.min(0.42, facade.lot.ground * 0.18);
  const pen = facade.pen.into("fixtures"), tint = srgb("#96968b");
  let pieces = facade.ground.map(rect => ({ ...rect, v0: Math.max(0.005, rect.v0), v1: Math.min(height, rect.v1) }))
    .filter(rect => rect.v1 > rect.v0);
  for (const opening of thresholds) pieces = pieces.flatMap(rect => subtractRect(rect, { ...opening, v0: 0, v1: height + 0.01 }, 0.002));
  for (const r of pieces) {
    if (r.v1 - r.v0 < 0.04 || r.u1 - r.u0 < 0.04 || facade.reach("ground", r.u0, r.u1, r.v0, r.v1, 0.065) < 0.065 - 1e-6) continue;
    const miters: [number | undefined, number | undefined] = [facade.cornerMiter?.("ground", r.u0, r.v0, r.v1), facade.cornerMiter?.("ground", r.u1, r.v0, r.v1)];
    const edges = profiledStrip(pen, "concrete", r.u0, r.u1, [[0.002, r.v0], [0.06, r.v0], [0.06, r.v1 - 0.035], [0.025, r.v1], [0.002, r.v1]], tint, [1], miters, .008);
    stainedPanel(pen, "concrete", { u0: r.u0 + (miters[0] ?? 0) * 0.06, u1: r.u1 + (miters[1] ?? 0) * 0.06, v0: edges[1].a[1], v1: edges[1].b[1] }, 0.06, tint, kit, 0.35, kit.rng(`${facade.key}/base`).int(1, 2147483647));
  }
}

/** Planned construction and its runoff sources share exact facade coordinates. */
export interface FacadeDetails {
  bands: Rect[];
  vents: Rect[];
  outlets: Rect[];
  ledges: WallLedge[];
}

/** Fits permanent construction only on exposed, unobstructed wall; weather sources follow that same plan. */
export function planFacadeDetails(facade: Facade, openings: Rect[], kit: Kit): FacadeDetails {
  const { lot } = facade;
  const result: FacadeDetails = { bands: [], vents: [], outlets: [], ledges: [] };
  if (lot.top <= lot.ground + 0.05) return result;
  const clear = (r: Rect, depth: number): boolean => inside(facade.body, r.u0, r.u1, r.v0, r.v1)
    && !openings.some(o => r.u0 < o.u1 + 0.06 && r.u1 > o.u0 - 0.06 && r.v0 < o.v1 + 0.08 && r.v1 > o.v0 - 0.08)
    && facade.reach("body", r.u0, r.u1, r.v0, r.v1, depth) >= depth - 1e-6;
  for (let story = 1; story < lot.stories; story++) {
    const z = lot.ground + (story - 1) * lot.storyHeight;
    for (const wall of facade.body) {
      const band = { u0: wall.u0, u1: wall.u1, v0: z + 0.015, v1: z + 0.19 };
      let segments = [band];
      for (const opening of openings) {
        if (opening.v0 >= band.v1 + .08 || opening.v1 <= band.v0 - .08) continue;
        segments = segments.flatMap(segment => subtractRect(segment, {
          u0: opening.u0 - .065, u1: opening.u1 + .065, v0: band.v0, v1: band.v1,
        }, .002));
      }
      for (const segment of segments) if (segment.u1 - segment.u0 > .2 && clear(segment, .12)) {
        result.bands.push(segment);
        result.ledges.push({ u0: segment.u0, u1: segment.u1, z: segment.v0, flow: .7 });
      }
    }
    const rng = kit.rng(`${facade.key}/vent-${story}`);
    const u = facade.bodyU0 + (facade.bodyU1 - facade.bodyU0) * rng.float(0.35, 0.65);
    const vent = { u0: u - 0.19, u1: u + 0.19, v0: z + 0.35, v1: z + 0.58 };
    if (clear(vent, 0.09)) {
      result.vents.push(vent);
      result.ledges.push({ u0: vent.u0, u1: vent.u1, z: vent.v0, flow: 0.25 });
    }
  }
  const u = (facade.bodyU0 + facade.bodyU1) / 2;
  const outlet = { u0: u - 0.14, u1: u + 0.14, v0: lot.roof + 0.025, v1: Math.min(lot.top - 0.035, lot.roof + 0.24) };
  if (outlet.v1 - outlet.v0 >= 0.1 && clear({ ...outlet, v0: outlet.v0 - 0.018 }, 0.14)) {
    result.outlets.push(outlet);
    result.ledges.push({ u0: u - 0.07, u1: u + 0.07, z: outlet.v0, flow: 1 });
  }
  return result;
}

/** Draws chamfered slab bands, louver vents and open scupper mouths, plus construction joints. */
export function drawFacadeDetails(pen: Pen, facade: Facade, plan: FacadeDetails, kit: Kit): void {
  const trim = facade.lot.style.trim;
  for (const r of plan.bands) {
    const miters: [number | undefined, number | undefined] = [facade.cornerMiter?.("body", r.u0, r.v0, r.v1), facade.cornerMiter?.("body", r.u1, r.v0, r.v1)];
    const edges = profiledStrip(pen, "concrete", r.u0, r.u1, [[0, r.v0], [0.085, r.v0], [0.12, r.v0 + 0.035], [0.12, r.v1 - 0.04], [0.07, r.v1], [0, r.v1]], trim, [2], miters, .008);
    const face = { u0: r.u0 + (miters[0] ?? 0) * 0.12, u1: r.u1 + (miters[1] ?? 0) * 0.12, v0: edges[2].a[1], v1: edges[2].b[1] };
    stainedPanel(pen, "concrete", face, 0.12, trim, kit, 0.45, kit.rng(`${facade.key}/band-${r.v0}`).int(1, 2147483647));
    if (kit.detail > 0) {
      for (let u = r.u0 + 2.4; u < r.u1 - 0.1; u += 2.4)
        pen.panel("paint", u - 0.006, u + 0.006, face.v0, face.v1, 0.122, shade(trim, 0.3));
    }
  }
  for (const r of plan.vents) {
    const rim = shade(GALVANIZED, 0.65);
    pen.box("metal", [r.u0, 0, r.v0], [r.u1, 0.035, r.v1], rim);
    pen.panel("paint", r.u0 + 0.025, r.u1 - 0.025, r.v0 + 0.025, r.v1 - 0.025, 0.036, SOOT);
    for (let z = r.v0 + 0.045; z < r.v1 - 0.02; z += 0.045)
      profiledStrip(pen, "metal", r.u0 + 0.02, r.u1 - 0.02, [[0.04, z + 0.028], [0.085, z], [0.085, z - 0.008], [0.04, z + 0.02]], rim);
    if (kit.detail > 0)
      for (const u of [r.u0 + 0.012, r.u1 - 0.012])
        for (const z of [r.v0 + 0.012, r.v1 - 0.012]) pen.disc("metal", [u, 0.037, z], 0.006, [0, 1, 0], SOOT, 6);
  }
  for (const r of plan.outlets) {
    const rim = shade(GALVANIZED, 0.6);
    pen.panel("paint", r.u0, r.u1, r.v0, r.v1, 0.003, SOOT);
    for (const u of [r.u0, r.u1 - 0.025]) pen.box("metal", [u, 0, r.v0], [u + 0.025, 0.1, r.v1], rim);
    profiledStrip(pen, "metal", r.u0, r.u1, [[0, r.v0 + 0.035], [0.14, r.v0], [0.14, r.v0 - 0.018], [0, r.v0 + 0.017]], rim);
    pen.box("metal", [r.u0, 0, r.v1 - 0.025], [r.u1, 0.11, r.v1], rim);
  }
}
