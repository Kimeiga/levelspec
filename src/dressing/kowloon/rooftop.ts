import { PipeSystem } from "./pipes.ts";
import type { V3 } from "../../architecture/types.ts";
import type { Rng } from "../../generate/rng.ts";
import type { Pen } from "../pen.ts";
import { plantRow } from "./fixtures.ts";
import { washing } from "./laundry.ts";
import type { Lot } from "./massing.ts";
import type { Kit } from "./kit.ts";
import {
  CONCRETE,
  GALVANIZED,
  RUST,
  SOOT,
  blend,
  mix,
  shade,
  srgb,
} from "./palette.ts";
import { roofHoarding } from "./signs.ts";
import { weatheredPen, metalColor } from "./weathered.ts";
import { roundTank, boxTank } from "./water-tanks.ts";
import { stairHut } from "./roof-access.ts";

/** A reserved rectangle of roof deck, in roof coordinates. */
interface Plot {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

/** Draws a television aerial: a mast with one or two fishbone arrays, `height` tall. */
function aerial(pen: Pen, base: V3, height: number, rng: Rng, kit: Kit): void {
  pen = weatheredPen(pen, kit, "frame", undefined, ["metal"]);
  const steel = shade(GALVANIZED, rng.float(0.6, 0.95));
  const top: V3 = [base[0], base[1], base[2] + height];
  pen.bar("metal", base, top, 0.03, steel);
  for (let array = 0; array < (height > 1.8 && rng.bool(0.5) ? 2 : 1); array++) {
    const z = top[2] - 0.08 - array * 0.55,
      yaw = rng.float(0, Math.PI),
      reach = rng.float(0.7, 1.1);
    const along: V3 = [Math.cos(yaw), Math.sin(yaw), 0],
      across: V3 = [-along[1], along[0], 0];
    const at = (a: number, c: number): V3 => [
      base[0] + along[0] * a + across[0] * c,
      base[1] + along[1] * a + across[1] * c,
      z,
    ];
    pen.bar("metal", at(-reach * 0.35, 0), at(reach * 0.65, 0), 0.018, steel);
    for (let i = 0; i < 5; i++) {
      const a = -reach * 0.3 + (i * reach * 0.9) / 4,
        half = 0.3 - i * 0.04;
      pen.bar("metal", at(a, -half), at(a, half), 0.012, steel);
    }
  }
}

/** Draws a lean-to of patched corrugated sheet: the squatter hut common on these roofs. */
function shack(pen: Pen, plot: Plot, height: number, rng: Rng, kit: Kit): void {
  const base = metalColor(rng.pick([GALVANIZED, srgb("#4f7a6a"), srgb("#5a7a9a"), srgb("#8a6a4a")]), rng.float(0.2, 0.6), kit);
  const walls: [V3, V3, V3][] = [
    [[plot.x0, plot.y0, 0], [1, 0, 0], [0, -1, 0]],
    [[plot.x1, plot.y0, 0], [0, 1, 0], [1, 0, 0]],
    [[plot.x1, plot.y1, 0], [-1, 0, 0], [0, 1, 0]],
    [[plot.x0, plot.y1, 0], [0, -1, 0], [-1, 0, 0]],
  ];
  for (const [index, [origin, tangent, outward]] of walls.entries()) {
    const face = weatheredPen(pen.facing(origin, tangent, outward), kit, "sheet", undefined, ["sheet"]);
    const length = index % 2 ? plot.y1 - plot.y0 : plot.x1 - plot.x0;
    const sheets = Math.max(2, Math.round(length / 0.8));
    for (let i = 0; i < sheets; i++)
      face.panel("sheet", (i * length) / sheets, ((i + 1) * length) / sheets, 0, height, 0, shade(base, rng.float(0.7, 1.15)));
    if (index === 0) {
      const x = length * rng.float(0.15, 0.5);
      face.panel("paint", x, x + 0.75, 0, 1.85, 0.006, SOOT);
      face.panel("pane", x + 1, Math.min(length - 0.2, x + 1.7), 1, 1.6, 0.006, srgb("#2a3a40"));
    }
  }
  weatheredPen(pen, kit, "sheet", undefined, ["sheet"]).sheet(
    "sheet",
    [
      [plot.x0 - 0.2, plot.y0 - 0.3, height - 0.25],
      [plot.x1 + 0.2, plot.y0 - 0.3, height - 0.25],
      [plot.x1 + 0.2, plot.y1 + 0.2, height + 0.2],
      [plot.x0 - 0.2, plot.y1 + 0.2, height + 0.2],
    ],
    shade(base, 0.8),
  );
}

/** Draws two T-posts with lines of washing strung between them along X. */
function dryingLines(pen: Pen, x0: number, x1: number, y: number, rng: Rng, kit: Kit): void {
  pen = weatheredPen(pen, kit, "frame", undefined, ["metal"]);
  const steel = GALVANIZED;
  for (const x of [x0, x1]) {
    pen.bar("metal", [x, y, 0], [x, y, 1.9], 0.04, steel);
    pen.bar("metal", [x, y - 0.4, 1.9], [x, y + 0.4, 1.9], 0.03, steel);
  }
  for (const offset of [-0.35, 0, 0.35]) {
    pen.bar("paint", [x0, y + offset, 1.88], [x1, y + offset, 1.88], 0.008, SOOT);
    washing(pen.move(0, y + offset, 0), x0 + 0.1, x1 - 0.1, 1.88, rng, { fill: 0.7, drop: 1.15, support: "line" });
  }
}

/**
 * Furnishes one tenement roof. The pen sits on the roof deck at the corner
 * nearest the building's front left, X along the front and Y toward the rear;
 * `width` by `depth` is the deck, `parapet` the height of its edge walls, and
 * nothing rises more than `ceiling` meters above the deck. The roof is laid
 * out as at the highest detail, and each level draws the parts it has.
 * With `perimeter=false`, the rectangle is an interior equipment court: poles
 * start on its deck and no fixtures assume walls around that court.
 */
export function rooftop(
  pen: Pen,
  lot: Lot,
  width: number,
  depth: number,
  parapet: number,
  ceiling: number,
  kit: Kit,
  perimeter = true,
): void {
  if (lot.kind !== "tenement") return;
  const stream = (name: string) => kit.rng(`${lot.key}/roof/${name}`);
  const plots: Plot[] = [];
  /** Reserves a free plot of the given size, or returns undefined when the deck is full. */
  const claim = (name: string, w: number, d: number, rear = false): Plot | undefined => {
    if (w > width - 0.9 || d > depth - 0.9) return undefined;
    const rng = stream(`${name}/plot`);
    for (let attempt = 0; attempt < 14; attempt++) {
      const x0 = rng.float(0.45, width - 0.45 - w),
        y0 = rear ? depth - 0.45 - d - rng.float(0, Math.min(0.6, depth - 0.9 - d)) : rng.float(0.45, depth - 0.45 - d);
      const plot = { x0, x1: x0 + w, y0, y1: y0 + d };
      if (plots.every((p) => plot.x1 + 0.3 < p.x0 || plot.x0 - 0.3 > p.x1 || plot.y1 + 0.3 < p.y0 || plot.y0 - 0.3 > p.y1)) {
        plots.push(plot);
        return plot;
      }
    }
    return undefined;
  };
  const center = (p: Plot): V3 => [(p.x0 + p.x1) / 2, (p.y0 + p.y1) / 2, 0];
  const fine = kit.detail > 0;

  const hutRng = stream("hut");
  const access = claim("hut", hutRng.float(2, 2.6), hutRng.float(2.4, 3) + 0.85, true);
  const hut = access ? { ...access, y0: access.y0 + 0.85 } : undefined;
  if (hut) stairHut(pen, hut, 2.3, lot, kit);
  const tanks = stream("tanks").int(1, 3);
  for (let i = 0; i < tanks; i++) {
    const tankRng = stream(`tank-${i}`);
    const round = tankRng.bool(0.6);
    const plot = claim(`tank-${i}`, 2, 2);
    if (!plot) break;
    if (i > 0 && !fine) continue;
    if (round) roundTank(pen, center(plot), tankRng, kit);
    else boxTank(pen, center(plot), tankRng, kit);
  }
  const squatting = kit.option(`${lot.key}/shack`, 0.4);
  if (squatting.planned) {
    const shackRng = stream("shack");
    const plot = claim("shack", shackRng.float(2.4, 3.4), shackRng.float(2.2, 3));
    if (plot && squatting.shown) shack(pen, plot, shackRng.float(2, 2.3), shackRng, kit);
  }
  const drying = kit.option(`${lot.key}/lines`, 0.45);
  if (drying.planned) {
    const linesRng = stream("lines");
    const plot = claim("lines", linesRng.float(2.4, 3.6), 1.2);
    if (plot && fine && drying.shown)
      dryingLines(pen, plot.x0, plot.x1, (plot.y0 + plot.y1) / 2, linesRng, kit);
  }
  if (fine && kit.has(`${lot.key}/roof-plants`, 0.5)) {
    const plantRng = stream("plants");
    plantRow(pen, 0.3, Math.min(width - 0.3, plantRng.float(1.5, 4)), 0.4, 0.01, plantRng);
  }
  if (fine) {
    const ventRng = stream("vents");
    const vents = ventRng.int(1, 3);
    for (let i = 0; i < vents; i++) {
      const p: V3 = [ventRng.float(0.4, width - 0.4), ventRng.float(0.4, depth - 0.4), 0];
      if (plots.some((q) => p[0] > q.x0 - 0.15 && p[0] < q.x1 + 0.15 && p[1] > q.y0 - 0.15 && p[1] < q.y1 + 0.15)) continue;
      new PipeSystem(pen, { radius: 0.05, color: shade(GALVANIZED, 0.6), kit }).run([p, [p[0], p[1], 0.55]]);
      pen.drum("paint", [p[0], p[1], 0.55], 0.09, 0.05, shade(GALVANIZED, 0.5), 5);
    }
  }
  // Six aerials thin out with detail; two more belong to households that kept adding them.
  const shown = [1, 3, 6][kit.detail];
  for (let i = 0; i < 8; i++) {
    if (i < 6 ? i >= shown : !kit.has(`${lot.key}/more-aerials`, 0.5)) continue;
    const aerialRng = stream(`aerial-${i}`);
    const edge = aerialRng.int(0, 3),
      t = aerialRng.float(0.1, 0.9);
    const alongEdges: V3[] = [
      [0.08, t * depth, parapet],
      [width - 0.08, t * depth, parapet],
      [t * width, 0.08, parapet],
      [t * width, depth - 0.08, parapet],
    ];
    const base: V3 = i === 0 && hut ? [hut.x0 + 0.5, hut.y0 + 0.5, 2.42] : alongEdges[edge];
    if (!perimeter && !(i === 0 && hut)) base[2] = 0;
    const height = Math.min(aerialRng.float(1.6, 3.2), ceiling - base[2] - 0.05);
    if (height > 0.9) aerial(pen, base, height, aerialRng, kit);
  }
  const hoarding = kit.option(`${lot.key}/hoarding`, 0.3);
  if (perimeter && width >= 4.6 && hoarding.planned)
    roofHoarding(pen.facing([0, 0, 0], [1, 0, 0], [0, -1, 0]), 0.3, width - 0.3, parapet, ceiling, kit, `${lot.key}/hoarding`, fine && hoarding.shown);
  if (perimeter && fine && parapet < 0.75 && kit.has(`${lot.key}/fence`, 0.4)) {
    const steel = blend(shade(GALVANIZED, 0.8), mix([1, 1, 1], RUST, 0.4));
    for (let x = 0.08; x <= width - 0.07; x += (width - 0.16) / Math.max(2, Math.round(width / 1.3)))
      pen.bar("metal", [x, 0.08, parapet], [x, 0.08, parapet + 0.75], 0.03, steel);
    for (const z of [0.4, 0.74])
      pen.bar("metal", [0.08, 0.08, parapet + z], [width - 0.08, 0.08, parapet + z], 0.025, steel);
  }
}
