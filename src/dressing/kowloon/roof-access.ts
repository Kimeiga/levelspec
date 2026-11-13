import type { Pen } from "../pen.ts";
import type { Kit } from "./kit.ts";
import type { Lot } from "./massing.ts";
import { WallCondition } from "../finish/wall-condition.ts";
import { drawSkin, lotFinish } from "./skin.ts";
import { CONCRETE, shade, srgb } from "./palette.ts";
import { profiledStrip } from "./molding.ts";
import { fixingPlate, bolt, type Steel } from "./signs/steel.ts";
import { weatheredPen } from "./weathered.ts";
import { PipeSystem } from "./pipes.ts";

/** A roof equipment reservation in local meters. */
export interface RoofPlot { x0: number; x1: number; y0: number; y1: number }

/**
 * A closed visual stair-access bulkhead with a real door reveal, not a playable stairwell.
 * Optional masonry aging leaves the kit's independently worn metal fittings unchanged.
 */
export function stairHut(pen: Pen, plot: RoofPlot, height: number, lot: Lot, kit: Kit,
  masonry?: Pick<Kit, "grime" | "wear" | "textureDensity">): void {
  if (masonry && (![masonry.grime, masonry.wear].every(value => Number.isFinite(value) && value >= 0 && value <= 1)
    || !Number.isFinite(masonry.textureDensity) || masonry.textureDensity <= 0))
    throw new Error("Roof masonry requires aging in [0,1] and positive finite texture density.");
  const aging = masonry ?? kit;
  const width = plot.x1 - plot.x0, depth = plot.y1 - plot.y0;
  const front = pen.facing([plot.x0, plot.y0, 0], [1, 0, 0], [0, -1, 0]);
  const door = { u0: .28, u1: 1.2, v0: .12, v1: 2.15 }, finish = lotFinish(kit, lot, 0);
  const faces = [front, pen.facing([plot.x1, plot.y0, 0], [0, 1, 0], [1, 0, 0]),
    pen.facing([plot.x1, plot.y1, 0], [-1, 0, 0], [0, 1, 0]), pen.facing([plot.x0, plot.y1, 0], [0, -1, 0], [-1, 0, 0])];
  for (const [i, face] of faces.entries()) {
    const span = i % 2 ? depth : width, seed = kit.rng(`${lot.key}/roof-access/${i}`).int(1, 2147483647);
    const openings = i === 0 ? [door] : [];
    drawSkin({ pen: face, rects: [{u0:0,u1:span,v0:0,v1:height}], openings,
      finish, condition: new WallCondition({base:0,ledges:[{u0:0,u1:span,z:height,flow:.85}],
        openings: openings.map(r => ({u0:r.u0,u1:r.u1,z0:r.v0,z1:r.v1}))},{grime:aging.grime,wear:aging.wear,seed}),
      washAt: () => shade(lot.style.wall, .96), washKey: JSON.stringify(["roof-access-wash/v1", lot.style.wall]),
      uMarks: [door.u0,door.u1], zMarks: [door.v0,door.v1], raster:{density:aging.textureDensity,seed} });
    const strips = i === 0 ? [[0,door.u0],[door.u1,span]] : [[0,span]];
    for (const [a,b] of strips) profiledStrip(face,"concrete",a,b,[[.002,0],[.035,0],[.035,.17],[.004,.21]],shade(CONCRETE,.55));
  }
  const lintel = shade(CONCRETE,.9);
  for (const x of [door.u0,door.u1-.07]) front.box("concrete",[x,-.16,.12],[x+.07,.035,door.v1],lintel,"b");
  front.box("concrete",[door.u0,-.16,door.v1-.07],[door.u1,.045,door.v1+.08],lintel,"b");
  const hardware = weatheredPen(front,kit,"frame"), steel: Steel = {slot:"metal",tint:srgb("#59635e"),weathering:kit};
  const leaf = { left: door.u0 + .075, right: door.u1 - .075, bottom: .13, top: door.v1 - .075 };
  const vent = { left: leaf.left + .1, right: leaf.right - .1, bottom: 1.28, top: leaf.top - .12 };
  hardware.box("paint", [leaf.left, -.14, leaf.bottom], [leaf.right, -.105, vent.bottom], steel.tint, "");
  hardware.box("paint", [leaf.left, -.14, vent.top], [leaf.right, -.105, leaf.top], steel.tint, "");
  for (const [left, right] of [[leaf.left, vent.left], [vent.right, leaf.right]])
    hardware.box("paint", [left, -.14, vent.bottom], [right, -.105, vent.top], steel.tint, "");
  front.panel("pane", vent.left, vent.right, vent.bottom, vent.top, -.145, srgb("#171b18"));
  const slats = Math.ceil((vent.top - vent.bottom) / .075), pitch = (vent.top - vent.bottom) / slats;
  for (let i = 0; i < slats; i++) {
    const z = vent.bottom + i * pitch;
    profiledStrip(hardware, "paint", vent.left, vent.right,
      [[-.135, z + pitch], [-.105, z + .008], [-.105, z], [-.135, z + pitch - .008]], steel.tint);
  }
  for (const z of [.43,1.14,1.88]) {
    fixingPlate(hardware,steel,[door.u0+.08,-.1,z],[1,0,0],[0,0,1],[0,1,0],.065,.11,2);
    hardware.tube("metal",[[door.u0+.075,-.07,z-.06],[door.u0+.075,-.07,z+.06]],.012,steel.tint,10);
  }
  hardware.box("metal",[door.u1-.19,-.105,.94],[door.u1-.12,-.085,1.1],shade(steel.tint,1.2));
  hardware.tube("metal",[[door.u1-.155,-.08,1.035],[door.u1-.155,-.035,1.035],[door.u1-.27,-.035,1.035]],.012,steel.tint,10);
  front.box("concrete",[door.u0-.04,-.18,0],[door.u1+.04,.42,.12],shade(CONCRETE,.85),"d");
  for (const z of [1.65,1.72,1.79,1.86]) profiledStrip(faces[1],"metal",.42,Math.min(depth-.3,1.1),[[.006,z+.045],[.05,z],[.05,z-.008],[.006,z+.037]],shade(steel.tint,.9));
  pen.box("concrete",[plot.x0-.1,plot.y0-.12,height],[plot.x1+.1,plot.y1+.1,height+.13],lintel,"");
  pen.box("concrete",[plot.x0-.065,plot.y0-.085,height+.13],[plot.x1+.065,plot.y1+.065,height+.145],shade(CONCRETE,.55),"d");
  const conduit = new PipeSystem(front,{radius:.012,color:srgb("#747b70"),kit});
  conduit.run([[width-.18,.035,.23],[width-.18,.035,height-.16],[width*.65,.035,height-.16]],0);
  hardware.box("metal",[width-.24,.012,1.05],[width-.12,.07,1.22],steel.tint);
  bolt(hardware,steel,[width-.18,.071,1.17],[0,1,0],.006);
}
