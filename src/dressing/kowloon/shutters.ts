import type { V3 } from "../../architecture/types.ts";
import type { Pen } from "../pen.ts";
import type { Kit } from "./kit.ts";
import { weatheredPen } from "./weathered.ts";

/**
 * Shared roller curtain, guides, bottom rail and housing for closed bays and open shops.
 * The corrugation unwrap follows its physical arc length; paint, rust relief and gravity
 * share one continuous field across the slats. Coordinates are facade-local meters.
 */
export function rollerShutter(pen: Pen, x0: number, x1: number, raised: number, head: number, paint: V3, kit: Kit): void {
  const width = x1 - x0, height = head - raised, pitch = .09, rise = .022;
  const stretch = Math.hypot(pitch / 2, rise) / (pitch / 2);
  const local = pen.move(x0, 0, raised);
  const curtain = weatheredPen(local, kit, "sheet", {
    key: `curtain/${width}/${height}`, bounds: [0, 0, width, height * stretch],
    uv: point => [point[0], point[2] * stretch], gravity: [0, -1], paint,
  });
  for (let z = 0; z < height - 1e-6; z += pitch) {
    const top = Math.min(height, z + pitch), crest = (z + top) / 2;
    curtain.face("metal", [[0,.03,z],[width,.03,z],[width,.052,crest],[0,.052,crest]], [0,1,-.4], paint);
    curtain.face("metal", [[0,.052,crest],[width,.052,crest],[width,.03,top],[0,.03,top]], [0,1,.4], paint);
  }
  const hardware = weatheredPen(pen, kit, "frame");
  hardware.box("metal", [x0,.02,raised], [x1,.065,raised+.07], paint, "b");
  for (const x of [x0-.06,x1]) {
    hardware.box("metal", [x,0,0], [x+.06,.075,head], paint, "bd");
    hardware.box("metal", [x+.012,.075,0], [x+.025,.092,head], paint, "bd");
  }
  hardware.box("metal", [x0-.06,0,head], [x1+.06,.13,head+.22], paint, "b");
}
