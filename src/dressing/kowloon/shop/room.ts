import type { V3 } from "../../../architecture/types.ts";
import type { Rng } from "../../../generate/rng.ts";
import type { Pen } from "../../pen.ts";
import type { Kit } from "../kit.ts";
import { calendar, ceilingFan, tubeLight, wallClock } from "./fittings.ts";

/**
 * A shop room ready to furnish. Its pen draws into the trade's part from the
 * front-left floor corner: X runs to the right as seen from the street, Y
 * into the room and Z up, so the viewer always stands on the -Y side.
 * Everything a trade draws must stay inside `width` × `depth` × `height`.
 */
export interface Room {
  pen: Pen;
  width: number;
  depth: number;
  height: number;
  kit: Kit;
  /** Seed path of this shop. */
  key: string;
}

/** The washes a trade gives the room's shell, multiplied into the building's wall finish. */
export interface Interior {
  floor: V3;
  ceiling: V3;
  wall: V3;
  /** The lower band of the walls, up to `dadoHeight` meters above the floor. */
  dado: V3;
  dadoHeight: number;
}

/** One kind of shop: how it finishes its room and what it puts in it. */
export interface Trade {
  /** Names the trade in its part, `shop-<name>`, so a shop's trade can be inspected. */
  name: string;
  interior(rng: Rng): Interior;
  /** Draws fittings and stock for the whole room. */
  furnish(room: Room): void;
}

/** Returns the room's random stream named `name`; separate fittings draw from separate streams. */
export function stream(room: Room, name: string): Rng {
  return room.kit.rng(`${room.key}/${name}`);
}

/** Decides an optional extra of the room; like every kit option it only appears as detail rises. */
export function extra(room: Room, name: string, chance: number): boolean {
  return room.kit.has(`${room.key}/${name}`, chance);
}

/**
 * Returns a pen lying `out` meters in front of the left wall, starting `y`
 * deep: its X runs deeper into the room and its Y into the wall.
 */
export function onLeftWall(room: Room, y: number, out = 0): Pen {
  return room.pen.facing([out, y, 0], [0, 1, 0], [-1, 0, 0]);
}

/**
 * Returns a pen lying `out` meters in front of the right wall, starting `y`
 * deep: its X runs back toward the street and its Y into the wall.
 */
export function onRightWall(room: Room, y: number, out = 0): Pen {
  return room.pen.facing([room.width - out, y, 0], [0, -1, 0], [1, 0, 0]);
}

/**
 * Lights the room with a fluorescent batten across it at depth `y`, and adds
 * the extras most shops share: a ceiling fan behind the batten and, when
 * `wallFrom` names the depth where 0.9 m of bare right wall begins, a
 * calendar and a clock on that stretch.
 */
export function amenities(room: Room, y: number, wallFrom?: number): void {
  const { pen, width, depth, height } = room;
  tubeLight(pen, [width * 0.2, y, height], [width * 0.8, y, height]);
  const span = Math.min(1.1, width - 0.7);
  const fanAt = Math.min(depth - 0.9, y + 0.75);
  if (height >= 2.2 && fanAt - y >= 0.62 && extra(room, "fan", 0.45)) ceilingFan(pen, [width / 2, fanAt, height], 0.28, span, stream(room, "fan"));
  if (wallFrom === undefined) return;
  const wall = onRightWall(room, wallFrom + 0.5);
  if (extra(room, "calendar", 0.6)) calendar(wall, 0.18, 0, Math.min(height - 0.25, 1.95), stream(room, "calendar"));
  if (extra(room, "clock", 0.4)) wallClock(wall, -0.2, 0, Math.min(height - 0.3, 1.9), stream(room, "clock"));
}
