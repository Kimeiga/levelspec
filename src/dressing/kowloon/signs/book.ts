import type { SignPlan, V3 } from "../../../architecture/types.ts";
import type { Pen } from "../../pen.ts";
import type { Obstructions } from "../../spans/scene.ts";
import type { Kit } from "../kit.ts";
import type { Business } from "./copy.ts";
import { drawPanel, type PanelDesign } from "./panel.ts";
import type { Steel } from "./steel.ts";
import { solidCorners, surveySigns, type SignFace, type SignSolid, type SurveyedSign } from "./survey.ts";

/** A designed panel and the frame it is drawn in; see `drawPanel` for the frame. */
export interface PlacedPanel {
  pen: Pen;
  design: PanelDesign;
  sides: "front" | "both";
}

/** A sign as proposed: enough to judge it, and how to draw it if it is kept. */
export interface SignProposal {
  /** Seed path of the sign, unique within its host. */
  key: string;
  mount: SignPlan["mount"];
  form: SignPlan["form"];
  /** The lettered panels, in reading order. */
  panels: PlacedPanel[];
  steel: Steel;
  /** Whether this build's detail level shows the sign when the survey keeps it. */
  shown: boolean;
  /** How far the sign's middle stands above its readers' eyes, meters; 0 for signs read from their own level. */
  above: number;
  /** The business the sign belongs to, for neighboring signs that should say the same. */
  business?: Business;
  /** Draws everything but the panels: arms, frames, stays and wall fixings. */
  fixings(): void;
}

/** Where one host's kit proposes its signs. */
export interface SignDesk {
  propose(proposal: SignProposal): void;
  /**
   * Returns the business of the nearest sign already proposed over a
   * shopfront within `radius` meters in plan of the world point `at`.
   */
  shopNear(at: V3, radius: number): Business | undefined;
}

/** Readers look up at a sign from this many times its longer side away, within these bounds, meters. */
const READING_DISTANCE = { perSide: 5, nearest: 6, farthest: 40 };
/** Readers are never assumed to look up more steeply than this, radians. */
const STEEPEST_LOOK = (35 * Math.PI) / 180;
/** Panels thinner than this are judged as if this thick, meters. */
const THINNEST_SOLID = 0.02;
/** How much each mount's signs matter when two compete: a shop's own fascia first. */
const MOUNT_WEIGHT: Record<SignPlan["mount"], number> = { fascia: 3, roof: 2, blade: 1.5, hung: 1.2, wall: 1, balcony: 0.8 };

const subtract = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: V3, b: V3): V3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

/** Returns a placed panel's body and lettered faces in world space. */
function panelGeometry(panel: PlacedPanel, above: number): { solid: SignSolid; faces: SignFace[] } {
  const { pen, design } = panel;
  const origin = pen.world([0, 0, 0]);
  const axis = (direction: V3) => subtract(pen.world(direction), origin);
  const across = axis([1, 0, 0]),
    out = axis([0, 1, 0]),
    up = axis([0, 0, 1]);
  const { width, height, depth } = design;
  // A field painted on a wall has no depth; it is judged as a thin slab in front of the wall.
  const back = -depth,
    front = Math.max(0, THINNEST_SOLID - depth);
  const away = Math.min(READING_DISTANCE.farthest, Math.max(READING_DISTANCE.nearest, READING_DISTANCE.perSide * Math.max(width, height)));
  const lookDown = Math.min(STEEPEST_LOOK, Math.atan2(Math.max(0, above), away));
  const face = (y: number, normal: V3): SignFace => ({
    center: pen.world([width / 2, y, height / 2]),
    right: cross(up, normal),
    up,
    normal,
    width,
    height,
    lookDown,
  });
  const faces = [face(0, out)];
  if (panel.sides === "both") faces.push(face(-depth, out.map((value) => -value) as V3));
  return {
    solid: {
      center: pen.world([width / 2, (back + front) / 2, height / 2]),
      axes: [across, out, up],
      half: [width / 2, (front - back) / 2, height / 2],
    },
    faces,
  };
}

/** Returns what the survey judges a proposal by. */
function surveyed(proposal: SignProposal, order: number): SurveyedSign {
  const parts = proposal.panels.map((panel) => panelGeometry(panel, proposal.above));
  const area = Math.max(...proposal.panels.map((panel) => panel.design.width * panel.design.height));
  return {
    // Larger signs are decided first; the order of proposal settles exact ties.
    priority: area * MOUNT_WEIGHT[proposal.mount] - order * 1e-9,
    solids: parts.map((part) => part.solid),
    faces: parts.flatMap((part) => part.faces),
  };
}

/** Draws a proposal into its pens: fixings first, then each panel. */
function draw(proposal: SignProposal, kit: Kit): void {
  proposal.fixings();
  for (const panel of proposal.panels) drawPanel(panel.pen, panel.design, panel.sides, proposal.steel, kit);
}

/**
 * Offers a sign for placement. A kit that collects signs holds it until the
 * survey has judged every proposal; any other kit draws it at once if the
 * build's detail level shows it.
 */
export function offerSign(kit: Kit, proposal: SignProposal): void {
  if (kit.signs) kit.signs.propose(proposal);
  else if (proposal.shown) draw(proposal, kit);
}

/**
 * Collects the signs every building of a compilation proposes, then settles
 * them together: the survey keeps the signs that fit and can be read, and
 * only those are drawn.
 */
export class SignBook {
  private readonly entries: { host: string; kit: Kit; proposal: SignProposal }[] = [];

  /** Moves one completed host's proposals into the global survey in assembly order. */
  append(source: SignBook): void {
    for (const entry of source.entries) this.entries.push(entry);
    source.entries.length = 0;
  }

  /** Returns the desk `kit` proposes the signs of `host` to. */
  desk(host: string, kit: Kit): SignDesk {
    return {
      propose: (proposal) => {
        this.entries.push({ host, kit, proposal });
      },
      shopNear: (at, radius) => {
        let nearest: Business | undefined,
          least = radius;
        for (const entry of this.entries) {
          if (entry.host !== host || entry.proposal.mount !== "fascia" || !entry.proposal.business) continue;
          const [panel] = entry.proposal.panels;
          const center = panel.pen.world([panel.design.width / 2, 0, panel.design.height / 2]);
          const distance = Math.hypot(center[0] - at[0], center[1] - at[1]);
          if (distance < least) [nearest, least] = [entry.proposal.business, distance];
        }
        return nearest;
      },
    };
  }

  /**
   * Judges every proposal against `scenery`, draws the signs that are kept
   * and shown, and returns one plan per proposal in the order proposed.
   * `triangles` reports the render mesh's current triangle count, from which
   * each sign's own share is measured.
   */
  settle(scenery: Obstructions, triangles: () => number): SignPlan[] {
    const judged = this.entries.map((entry, order) => surveyed(entry.proposal, order));
    const verdicts = surveySigns(judged, scenery);
    return this.entries.map(({ host, kit, proposal }, index) => {
      const corners = judged[index].solids.flatMap(solidCorners);
      const bound = (pick: (...values: number[]) => number) => [0, 1, 2].map((axis) => pick(...corners.map((corner) => corner[axis]))) as V3;
      const before = triangles();
      let status: SignPlan["status"] = verdicts[index] === "clear" ? "built" : verdicts[index];
      if (status === "built" && !proposal.shown) status = "withheld";
      if (status === "built") draw(proposal, kit);
      return {
        id: `${host}/${proposal.key}`,
        host,
        mount: proposal.mount,
        form: proposal.form,
        lines: proposal.panels.flatMap((panel) => panel.design.blocks.map((block) => block.text)),
        bounds: { min: bound(Math.min), max: bound(Math.max) },
        status,
        triangles: triangles() - before,
      };
    });
  }
}
