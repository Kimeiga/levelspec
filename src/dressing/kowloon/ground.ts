import type { Rng } from "../../generate/rng.ts";
import type { Pen } from "../pen.ts";
import { meterBank, notices } from "./fixtures.ts";
import type { Lot } from "./massing.ts";
import type { Kit } from "./kit.ts";
import { entranceDoor, entranceBounds, pullHandle, doorTimberBoard } from "./doors.ts";
import type { WallOpening } from "../finish/wall-condition.ts";
import {
  GALVANIZED,
  SHUTTERS,
  SOOT,
  shade,
  srgb,
} from "./palette.ts";
import { wallBoard } from "./signs.ts";
import { glazedLight, securityBars, windowUnit } from "./windows.ts";
import { weatheredPen, metalColor } from "./weathered.ts";
import { rollerShutter } from "./shutters.ts";

/** What occupies one ground-story bay. */
export type UnitKind = "shutter" | "gate" | "door" | "shop" | "service";

/** One ground-story bay: its extent along the facade and the story height, meters. */
export interface Unit {
  /** Stable facade/bay identity; independent of world placement and mesh append order. */
  key: string;
  u0: number;
  u1: number;
  height: number;
}

const GOODS = ["#c0392b", "#e8c43c", "#3a6ea8", "#e8e4d8", "#4f8f5a", "#d98a4a"].map(srgb);

/** Shared opening dimensions for the drawn frontage and its receiving wall's soot. */
export function groundOpening(kind: UnitKind, unit: Unit, rng: Rng): WallOpening | undefined {
  if (kind === "door") {
    const door = entranceBounds(unit, rng);
    return { u0: door.x0, u1: door.x1, z0: .045,
      z1: door.h + (unit.height - door.h > .95 ? .36 : 0) };
  }
  if (kind === "service") {
    const width = unit.u1 - unit.u0;
    if (width <= 1.6 || unit.height <= 2.6) return undefined;
    const x = unit.u0 + width * rng.float(.3, .6);
    return { u0: x, u1: x + Math.min(.9, width - 1), z0: 1.45, z1: 2.2 };
  }
  const inset = kind === "shutter" ? .22 : kind === "gate" ? .25 : .2;
  const head = kind === "shop" ? Math.min(2.5, unit.height - .85)
    : Math.min(kind === "shutter" ? 2.7 : 2.6, Math.max(2.1, unit.height - .85));
  return { u0: unit.u0 + inset, u1: unit.u1 - inset, z0: 0, z1: head };
}

/** Draws a lettered fascia in the band between an opening's head and the story above. */
function fascia(pen: Pen, x0: number, x1: number, head: number, unit: Unit, kit: Kit, rng: Rng): void {
  const room = unit.height - head - 0.4;
  const h = Math.min(room, 0.7, (x1 - x0) / 4);
  if (h < 0.28) return;
  wallBoard(pen, (x0 + x1) / 2 - h * 2, head + 0.28, h * 4, h, kit, rng);
}

/** Draws crates and sacks standing just inside a dark opening. */
function goods(pen: Pen, x0: number, x1: number, rng: Rng): void {
  for (let x = x0 + 0.1; x < x1 - 0.45; x += rng.float(0.4, 0.9)) {
    const w = rng.float(0.3, 0.5),
      h = rng.float(0.25, 0.8);
    pen.box("paint", [x, 0.006, 0], [x + w, 0.05, h], shade(rng.pick(GOODS), rng.float(0.5, 0.9)));
  }
}

/** Draws a roller shutter, closed or part raised over stock, with its guides and head box. */
function shutter(pen: Pen, unit: Unit, lot: Lot, kit: Kit, rng: Rng): void {
  const { u0: x0, u1: x1, z1: head } = groundOpening("shutter", unit, rng)!;
  const paint = metalColor(rng.bool(0.5) ? lot.style.shutter : rng.pick(SHUTTERS), rng.float(0, 0.3), kit);
  const raised = rng.pick([0, 0, 0, 0, rng.float(0.5, 1), rng.float(1.5, 2)]);
  pen.panel("paint", x0, x1, 0, head, 0.004, SOOT);
  if (raised) goods(pen, x0, x1, rng);
  rollerShutter(pen, x0, x1, raised, head, paint, kit);
  const hardware = weatheredPen(pen, kit, "frame");
  const ringX = (x0 + x1) / 2, ringZ = raised + 0.065;
  hardware.box("metal", [ringX - 0.02, 0.065, ringZ], [ringX + 0.02, 0.08, ringZ + 0.03], GALVANIZED);
  const ring = Array.from({ length: 12 }, (_, segment) => {
    const angle = segment * Math.PI / 6;
    return Array.from({ length: 6 }, (_, side) => {
      const cross = side * Math.PI / 3;
      const normal: [number, number, number] = [Math.cos(angle) * Math.cos(cross), Math.sin(cross), Math.sin(angle) * Math.cos(cross)];
      const point: [number, number, number] = [ringX + Math.cos(angle) * .035 + normal[0] * .006,
        .083 + normal[1] * .006, ringZ - .02 + Math.sin(angle) * .035 + normal[2] * .006];
      return { point, normal };
    });
  });
  for (let segment = 0; segment < 12; segment++) for (let side = 0; side < 6; side++) {
    const next = (segment + 1) % 12, around = (side + 1) % 6;
    const corners = [ring[segment][side], ring[next][side], ring[next][around], ring[segment][around]];
    const hint: [number, number, number] = [0, 1, 2].map(axis => corners.reduce((sum, corner) => sum + corner.normal[axis], 0)) as [number, number, number];
    pen.face("metal", corners.map(corner => corner.point), hint, GALVANIZED, undefined, corners.map(corner => corner.normal));
  }
  hardware.box("metal", [x1 - 0.13, 0.065, raised + 0.025], [x1 - 0.06, 0.09, raised + 0.085], shade(GALVANIZED, 0.7));
  pen.panel("paint", x1 - 0.099, x1 - 0.091, raised + 0.04, raised + 0.065, 0.091, SOOT);
  fascia(pen, x0, x1, head + 0.22, unit, kit, rng);
}

/** Draws an accordion gate on real tracks, with a recessed inner leaf visible through its folded bars. */
function gate(pen: Pen, unit: Unit, kit: Kit, rng: Rng): void {
  const { u0: x0, u1: x1, z1: head } = groundOpening("gate", unit, rng)!;
  rng.float(0.1, 0.6);
  const steel = srgb("#647a6b");
  const drawn = rng.pick([1, 1, 0.55, 0.35]);
  pen.panel("paint", x0, x1, 0, head, 0.004, SOOT);
  const inner = (low: [number, number, number], high: [number, number, number], tint: [number, number, number]) =>
    doorTimberBoard(pen, low, high, tint, kit.wear);
  const timber = srgb("#554030");
  inner([x0 + 0.06, 0.008, 0.06], [x1 - 0.06, 0.018, head - 0.06], shade(timber, 0.65));
  for (const x of [x0 + 0.06, x1 - 0.13])
    inner([x, 0.018, 0.06], [x + 0.07, 0.035, head - 0.06], timber);
  for (const z of [0.08, 0.85, 1.6, head - 0.13])
    inner([x0 + 0.13, 0.018, z], [x1 - 0.13, 0.035, z + 0.07], timber);
  const gate = weatheredPen(pen, kit, "cage");
  const count = Math.max(5, Math.round((x1 - x0) / 0.14));
  const end = x0 + (x1 - x0 - 0.05) * drawn, pitch = (end - x0) / count;
  for (let i = 0; i <= count; i++) {
    const x = x0 + i * pitch;
    gate.box("paint", [x, 0.065, 0.075], [x + 0.018, 0.085, head - 0.08], steel, "bd");
    for (const z of [0.06, head - 0.07])
      pen.disc("metal", [x + 0.009, 0.086, z], 0.018, [0, 1, 0], GALVANIZED, 6);
    const linkHeight = Math.sqrt(0.52 ** 2 - pitch ** 2);
    for (const center of [0.55, head - 0.55]) for (const z of [center - linkHeight / 2, center + linkHeight / 2]) {
      pen.tube("metal", [[x + .009, .082, z], [x + .009, .117, z]], .006, GALVANIZED, 6);
      pen.disc("metal", [x + .009, .118, z], .009, [0, 1, 0], GALVANIZED, 6);
    }
    if (i === count) continue;
    for (const center of [0.55, head - 0.55]) {
      const low = center - linkHeight / 2, high = center + linkHeight / 2;
      gate.bar("paint", [x + 0.009, 0.094, low], [x + pitch + 0.009, 0.094, high], 0.012, steel);
      gate.bar("paint", [x + 0.009, 0.109, high], [x + pitch + 0.009, 0.109, low], 0.012, steel);
      pen.disc("metal", [x + pitch / 2 + 0.009, 0.117, center], 0.012, [0, 1, 0], GALVANIZED, 6);
    }
  }
  for (const z of [0.015, head - 0.035]) {
    gate.box("metal", [x0 - 0.04, 0.035, z], [x1 + 0.04, 0.115, z + 0.025], shade(steel, 0.65));
    gate.box("paint", [x0 - 0.04, 0.1, z + 0.025], [x1 + 0.04, 0.12, z + 0.05], steel, "bd");
  }
  gate.box("paint", [end + 0.018, 0.055, 0.065], [end + 0.055, 0.09, head - 0.06], steel, "bd");
  pullHandle(pen, end + 0.035, 1.0, 0.09, GALVANIZED);
  gate.box("paint", [x0 - 0.04, 0, head], [x1 + 0.04, 0.1, head + 0.08], steel, "b");
  fascia(pen, x0, x1, head + 0.08, unit, kit, rng);
}

/** Draws a glazed shopfront: tiled riser, framed panes over lit stock, and a shop door. */
function shop(pen: Pen, unit: Unit, lot: Lot, kit: Kit, rng: Rng): void {
  const { u0: x0, u1: x1, z1: head } = groundOpening("shop", unit, rng)!;
  const riser = 0.55,
    frame = rng.bool(0.5) ? lot.style.frame : shade(GALVANIZED, 0.9);
  const framing = weatheredPen(pen, kit, "frame");
  const door = rng.bool(0.5) ? x0 : x1 - 0.85;
  pen.panel("paint", x0, x1, 0, head, 0.004, SOOT);
  for (const [a, b] of door === x0 ? [[x0 + 0.85, x1]] : [[x0, x1 - 0.85]]) {
    pen.box("paint", [a, 0, 0], [b, 0.05, riser], shade(lot.style.accent, 0.8), "bd");
    glazedLight(pen, a, b, riser, head, 0.02, rng);
    for (let shelf = riser + 0.15; shelf < head - 0.4; shelf += 0.5)
      for (let x = a + 0.1; x < b - 0.2; x += rng.float(0.16, 0.34))
        pen.box("paint", [x, 0.024, shelf], [x + rng.float(0.1, 0.16), 0.07, shelf + rng.float(0.15, 0.3)], shade(rng.pick(GOODS), 0.8), "b");
    for (const x of [a, (a + b) / 2 - 0.02, b - 0.04])
      framing.box("paint", [x, 0, riser], [x + 0.04, 0.06, head], frame, "bdu");
    framing.box("paint", [a, 0, head - 0.04], [b, 0.06, head], frame, "blr");
  }
  pen.panel("pane", door + 0.06, door + 0.79, 0.25, head - 0.06, 0.02, srgb("#2a3438"));
  framing.box("paint", [door, 0, 0], [door + 0.06, 0.06, head], frame, "bdu");
  framing.box("paint", [door + 0.79, 0, 0], [door + 0.85, 0.06, head], frame, "bdu");
  framing.box("paint", [door + 0.06, 0, 0], [door + 0.79, 0.05, 0.25], frame, "bd");
  framing.box("metal", [door + 0.68, 0.05, 1.0], [door + 0.71, 0.09, 1.3], GALVANIZED, "b");
  fascia(pen, x0, x1, head, unit, kit, rng);
}

/** Draws a service bay: meters, conduits, a small barred window and pasted notices. */
function service(pen: Pen, unit: Unit, lot: Lot, kit: Kit, rng: Rng): void {
  const width = unit.u1 - unit.u0;
  const opening = groundOpening("service", unit, rng);
  if (opening) {
    const x = opening.u0, w = opening.u1 - opening.u0;
    windowUnit(pen, x, 1.45, w, 0.75, { kind: "louver", weathering: kit, frame: lot.style.frame, trim: lot.style.trim, curtain: lot.style.trim, reach: 0.15, hood: false, lit: false, boarded: false }, rng);
    securityBars(pen, x, 1.45, w, 0.75, "bars", shade(lot.style.frame, 0.7), kit);
  }
  if (kit.detail > 0) {
    const extras = pen.into("fixtures");
    meterBank(extras, unit.u0 + 0.3, 1.2, Math.min(3, Math.floor((width - 0.5) / 0.3)), rng, kit);
    notices(extras, unit.u0 + 0.2, unit.u1 - 0.2, 0.5, 1.15, rng);
  }
}

/** Draws one ground-story bay. Every part stays within 0.15 m of the wall plane. */
export function groundUnit(
  pen: Pen,
  kind: UnitKind,
  unit: Unit,
  lot: Lot,
  kit: Kit,
  rng: Rng,
): void {
  if (kind === "shutter") shutter(pen, unit, lot, kit, rng);
  else if (kind === "gate") gate(pen, unit, kit, rng);
  else if (kind === "shop") shop(pen, unit, lot, kit, rng);
  else if (kind === "door") entranceDoor(pen, unit, lot, kit, rng);
  else service(pen, unit, lot, kit, rng);
}
