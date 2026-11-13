import { weatheredPen, metalColor } from "../kowloon/weathered.ts";
import { PipeSystem } from "../kowloon/pipes.ts";
import { Matrix4 } from "three";
import type { CompiledArchitecture, V3 } from "../../architecture/types.ts";
import { Rng } from "../../generate/rng.ts";
import type { KitBudget } from "../geometry.ts";
import { KitMesh, type KitSlot } from "../kit-mesh.ts";
import { kitFinishes } from "../kit.ts";
import { Kit } from "../kowloon/kit.ts";
import { hangGarment } from "../kowloon/laundry.ts";
import { GALVANIZED, RUST, mix, shade, srgb } from "../kowloon/palette.ts";
import { inventBusiness } from "../kowloon/signs/copy.ts";
import { drawLook, titlePanel } from "../kowloon/signs/designs.ts";
import { drawPanel } from "../kowloon/signs/panel.ts";
import { Pen } from "../pen.ts";
import type { Dressing } from "../types.ts";
import type { Anchor, SpanHost } from "./anchors.ts";
import { hangingCurve } from "./catenary.ts";
import {
  LINE_DROP,
  LINE_STANDOFF,
  RACK_SLOTS,
  RACK_STANDOFF,
  TRUSS_DEPTH,
  onSign,
  type CableBundle,
  type Clothesline,
  type SpanPlan,
  type StreetSign,
  CONDUIT_BOX,
  CONDUIT_STANDOFF,
  type Rack,
} from "./plan.ts";

const PORCELAIN = [srgb("#d8d2c0"), srgb("#6a3a28"), srgb("#8a8f8a")];
const CONDUIT = srgb("#3a3a36");
const LINE_CORD = srgb("#c9c2aa");
const ROPE = srgb("#b9a97f");

/** Returns the unit vector from `a` toward `b`. */
function toward(a: V3, b: V3): V3 {
  const d: V3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const length = Math.hypot(...d);
  return [d[0] / length, d[1] / length, d[2] / length];
}

/**
 * Draws a round cable through `points`, which must lie in one vertical plane
 * or run straight. Neighboring pieces share their rings, so a sagging line
 * shows no gaps at its bends. `sides` of 3 is enough below a centimeter.
 */
function cable(pen: Pen, slot: KitSlot, points: V3[], radius: number, tint: V3, sides: number): void {
  const overall = toward(points[0], points[points.length - 1]);
  const plan = Math.hypot(overall[0], overall[1]);
  const side: V3 = plan > 1e-6 ? [-overall[1] / plan, overall[0] / plan, 0] : [1, 0, 0];
  const rings = points.map((point, i) => {
    const axis = toward(points[Math.max(0, i - 1)], points[Math.min(points.length - 1, i + 1)]);
    const other: V3 = [
      axis[1] * side[2] - axis[2] * side[1],
      axis[2] * side[0] - axis[0] * side[2],
      axis[0] * side[1] - axis[1] * side[0],
    ];
    return Array.from({ length: sides }, (_, k) => {
      const angle = (k / sides) * Math.PI * 2;
      const normal = side.map((v, axisIndex) => v * Math.cos(angle) + other[axisIndex] * Math.sin(angle)) as V3;
      return { normal, at: point.map((v, axisIndex) => v + normal[axisIndex] * radius) as V3 };
    });
  });
  for (let i = 0; i + 1 < rings.length; i++)
    for (let k = 0; k < sides; k++) {
      const a = rings[i][k],
        b = rings[i + 1][k],
        c = rings[i + 1][(k + 1) % sides],
        d = rings[i][(k + 1) % sides];
      pen.face(
        slot,
        [a.at, b.at, c.at, d.at],
        a.normal.map((v, axis) => v + d.normal[axis]) as V3,
        tint,
        undefined,
        [a.normal, b.normal, c.normal, d.normal],
      );
    }
}

/**
 * Turns span plans into render geometry. Each part is drawn into the mesh of
 * the host it is fixed to, in parts named `span-*`; a part between two hosts
 * belongs to the host it starts from and records the other as a contributor.
 * Nothing drawn here collides or changes navigation.
 */
export class SpanPainter {
  private readonly level: CompiledArchitecture;
  private readonly settings: Dressing;
  private readonly budget: KitBudget;
  private readonly kit: Kit;
  /** One mesh per host ID, shared by every recipe that fixes parts to that host. */
  private readonly meshes = new Map<string, KitMesh>();
  /** Tube facets per cable: 3, 4 or 6 with rising detail. */
  private readonly sides: number;

  constructor(level: CompiledArchitecture, settings: Dressing, budget: KitBudget) {
    this.level = level;
    this.settings = settings;
    this.budget = budget;
    const detail = ["low", "medium", "high"].indexOf(settings.detail);
    this.sides = [3, 4, 6][detail];
    const lettering = true;
    this.kit = new Kit(`${settings.seed}/spans`, detail, settings.grime, settings.wear, lettering, undefined, settings.rust);
  }

  /** Returns a world-space pen drawing into `part` of the host's mesh. */
  private pen(host: SpanHost, part: string): Pen {
    let mesh = this.meshes.get(host.id);
    if (!mesh) {
      const finishes = kitFinishes(this.level, this.settings.finishes, host.wall);
      mesh = new KitMesh(this.level, host.id, host.layer, finishes.materials, this.budget);
      this.meshes.set(host.id, mesh);
    }
    return new Pen(mesh, part, new Matrix4(), false);
  }

  /** Records `to`'s host as a contributor of a part drawn into `from`'s host. */
  private credit(from: Anchor, to: Anchor, part: string): void {
    const record = this.level.provenance[`${from.plane.host.id}/$dressing/${part}`];
    if (record && !record.contributors.includes(to.plane.host.id))
      record.contributors.push(to.plane.host.id);
  }

  /** Returns a pen on an anchor's wall: X along the wall, Y outward, Z up, origin at the fixing. */
  private onWall(anchor: Anchor, part: string): Pen {
    return this.pen(anchor.plane.host, part).facing(anchor.position, anchor.plane.tangent, anchor.plane.normal);
  }

  /** Draws every span of a plan with the fittings that fix it to its walls. */
  draw(plan: SpanPlan, seed: string): void {
    for (const [index, sign] of plan.signs.entries()) this.sign(sign, new Rng(`${seed}/sign/${index}`));
    for (const line of plan.clotheslines) this.clothesline(line);
    for (const bundle of plan.cables) {
      const pen = this.pen(bundle.from.plane.host, "span-cables");
      for (const strand of bundle.strands)
        cable(pen, "paint", strand.points, strand.radius, strand.tint, strand.radius < 0.01 ? 3 : this.sides);
      this.credit(bundle.from, bundle.to, "span-cables");
    }
    for (const [index, rack] of plan.racks.entries()) this.rack(rack, new Rng(`${seed}/rack/${index}`));
  }

  /**
   * Draws the bracket a rack of `slots` cables is fixed to: a porcelain
   * insulator per cable on a steel upright, and the conduit down to a
   * junction box when the plan gave the rack one (not at low detail).
   */
  private rack({ anchor, slots, conduit }: Rack, rng: Rng): void {
    const pen = this.onWall(anchor, "span-fittings");
    const hardware = weatheredPen(pen, this.kit, "frame", undefined, ["metal"]);
    const steel = metalColor(GALVANIZED, rng.float(0.15, 0.75), this.kit);
    const heights = RACK_SLOTS.slice(0, slots);
    const low = Math.min(...heights),
      high = Math.max(...heights);
    const porcelain = rng.pick(PORCELAIN);
    for (const z of heights)
      pen.box("paint", [-0.024, RACK_STANDOFF - 0.03, z - 0.022], [0.024, RACK_STANDOFF + 0.02, z + 0.022], porcelain, "");
    for (const z of slots > 1 ? [low - 0.04, high + 0.04] : [low])
      hardware.bar("metal", [0, 0, z], [0, RACK_STANDOFF - 0.02, z], 0.026, steel);
    if (slots > 1) {
      hardware.bar("metal", [0, RACK_STANDOFF - 0.03, low - 0.05], [0, RACK_STANDOFF - 0.03, high + 0.05], 0.03, steel);
      hardware.box("metal", [-0.04, 0, low - 0.07], [0.04, 0.012, high + 0.07], shade(steel, 0.8));
    }
    if (conduit === undefined || this.kit.detail === 0) return;
    const foot = low - 0.07 - conduit;
    new PipeSystem(pen, { radius: 0.014, color: CONDUIT, kit: this.kit }).run([[0, CONDUIT_STANDOFF, low - 0.07], [0, CONDUIT_STANDOFF, foot]], 0);
    hardware.box("metal", [-0.08, 0, foot - CONDUIT_BOX], [0.08, 0.07, foot], shade(steel, 0.7));
  }

  /** Draws a pulley line with its washing and the two pulley brackets. */
  private clothesline(line: Clothesline): void {
    const pen = this.pen(line.from.plane.host, "span-washing");
    cable(pen, "paint", line.upper, 0.004, LINE_CORD, 3);
    cable(pen, "paint", line.lower, 0.004, LINE_CORD, 3);
    for (const { garment, left, right, sway } of line.garments) hangGarment(pen, garment, left, right, sway);
    this.credit(line.from, line.to, "span-washing");
    for (const anchor of [line.from, line.to]) {
      const wall = weatheredPen(this.onWall(anchor, "span-fittings"), this.kit, "frame", undefined, ["metal"]);
      const steel = shade(GALVANIZED, 0.6);
      wall.bar("metal", [0, 0, 0.02], [0, LINE_STANDOFF, 0.02], 0.02, steel);
      wall.bar("metal", [0, 0, -LINE_DROP - 0.3], [0, LINE_STANDOFF - 0.01, -LINE_DROP / 2], 0.014, steel);
      wall.box("metal", [-0.012, LINE_STANDOFF - 0.05, -LINE_DROP - 0.04], [0.012, LINE_STANDOFF + 0.05, 0.04], steel, "");
    }
  }

  /** Draws a street sign: its lettered faces, what carries them, and the wall fixings. */
  private sign(sign: StreetSign, rng: Rng): void {
    const pen = this.pen(sign.from.plane.host, "span-signs");
    const { direction, length, top } = sign;
    const facingReader: V3 = [-direction[1], direction[0], 0];
    // The sign's own plane: X along the span from its start, Y toward one of its readers, Z world height.
    const plane = pen.facing(onSign(sign, 0, 0), direction, facingReader);
    /** Hangs one panel titled with an invented business, lettered for readers on both sides. */
    const hang = (panel: StreetSign["panels"][number], construction: "cloth" | "sheet") => {
      const look = drawLook(construction, this.kit, rng);
      const depth = construction === "cloth" ? 0.004 : 0.045;
      const design = titlePanel(inventBusiness(rng), panel.s1 - panel.s0, panel.z1 - panel.z0, depth, look, rng);
      drawPanel(plane.move(panel.s0, depth / 2, panel.z0), design, "both", look.steel, this.kit);
    };
    const end = onSign(sign, length, top);
    if (sign.kind === "banner") {
      const [panel] = sign.panels;
      hang(panel, "cloth");
      const rope = (from: V3, to: V3) => cable(pen, "paint", hangingCurve(from, to, 0.004, 3), 0.005, ROPE, 3);
      rope(sign.start, onSign(sign, panel.s0, panel.z1));
      rope(onSign(sign, panel.s1, panel.z1), end);
      rope(onSign(sign, 0, top - sign.mount), onSign(sign, panel.s0, panel.z0));
      rope(onSign(sign, panel.s1, panel.z0), onSign(sign, length, top - sign.mount));
      for (const z of [panel.z0, panel.z1])
        pen.bar("timber", onSign(sign, panel.s0, z), onSign(sign, panel.s1, z), 0.022, srgb("#8a7a58"));
    } else {
      const hardware = weatheredPen(pen, this.kit, "frame", undefined, ["metal"]);
      const steel = metalColor(GALVANIZED, rng.float(0.25, 0.8), this.kit);
      const chord = top - TRUSS_DEPTH;
      hardware.bar("metal", sign.start, end, 0.045, steel);
      hardware.bar("metal", onSign(sign, 0, chord), onSign(sign, length, chord), 0.045, steel);
      const bays = Math.max(2, Math.round(length / 0.55));
      for (let bay = 0; bay <= bays; bay++) {
        const s = (length * bay) / bays;
        hardware.bar("metal", onSign(sign, s, chord), onSign(sign, s, top), 0.022, steel);
        if (bay < bays)
          hardware.bar("metal", onSign(sign, s, bay % 2 ? top : chord), onSign(sign, s + length / bays, bay % 2 ? chord : top), 0.018, steel);
      }
      for (const panel of sign.panels) {
        hang(panel, "sheet");
        for (const s of [panel.s0 + 0.06, panel.s1 - 0.06])
          hardware.bar("metal", onSign(sign, s, panel.z1), onSign(sign, s, chord), 0.016, steel);
      }
    }
    this.credit(sign.from, sign.to, "span-signs");
    for (const anchor of [sign.from, sign.to]) {
      const wall = weatheredPen(this.onWall(anchor, "span-fittings"), this.kit, "frame", undefined, ["metal"]);
      const level = top - anchor.position[2];
      wall.box("metal", [-0.07, 0, level - sign.mount - 0.06], [0.07, 0.014, level + 0.06], shade(GALVANIZED, 0.55));
      for (const z of [level, level - sign.mount])
        wall.bar("metal", [0, 0, z], [0, LINE_STANDOFF, z], 0.03, shade(GALVANIZED, 0.55));
    }
  }
}
