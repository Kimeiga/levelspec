import type { V3 } from "../../../architecture/types.ts";
import type { Pen } from "../../pen.ts";
import { GALVANIZED, shade, srgb } from "../palette.ts";
import { lathe, limb, type Profile } from "./forms.ts";
import { kitchenFace, kitchenMetal } from "./restaurant-surfaces.ts";

import atlas from "./assets/shop-timber.json" with { type: "json" };

/**
 * Closed rounded wood body with vertical fibers and a shared chart across all rings.
 * The .2 m outer radius sets circumferential scale; the narrower rim compresses it by at most 7%.
 */
function boardBody(board: Pen): void {
  const profile: Profile = [[.188,0],[.195,.004],[.199,.015],[.2,.035],[.199,.103],[.195,.114],[.186,.12]];
  const region = atlas.regions[0], radius = .2;
  const fieldWidth = (region.width - atlas.padding * 2 - 1) / atlas.texelsPerMeter;
  const circumference = 2 * Math.PI * radius;
  const distances = Array.from({length: 41}, (_,i) => i / 40 * circumference);
  for (let seam = fieldWidth; seam < circumference; seam += fieldWidth) distances.push(seam);
  distances.sort((a,b) => a-b);
  const slopes = profile.slice(1).map(([r,z],i) => {
    const [beforeR,beforeZ] = profile[i], length = Math.hypot(r-beforeR,z-beforeZ);
    return [(z-beforeZ)/length,(beforeR-r)/length];
  });
  const normals = profile.map((_,i) => {
    const before = slopes[Math.max(0,i-1)], after = slopes[Math.min(slopes.length-1,i)];
    const radial = before[0]+after[0], up = before[1]+after[1], length = Math.hypot(radial,up);
    return [radial/length,up/length];
  });
  let length = 0;
  const heights = profile.map(([r,z],i) => {
    if(i) length += Math.hypot(r-profile[i-1][0],z-profile[i-1][1]);
    return length;
  });
  const rings = profile.map(([r,z]) => distances.map(distance => {
    const angle = distance/radius + Math.PI/2;
    return [Math.cos(angle)*r,Math.sin(angle)*r,z] as V3;
  }));
  const textured = board.mesh.textured("shop-timber")
    && board.mesh.material("shop-timber") !== board.mesh.material("timber");
  for(let ring=0;ring+1<profile.length;ring++) for(let side=0;side+1<distances.length;side++) {
    const corners = [[ring,side],[ring,side+1],[ring+1,side+1],[ring+1,side]];
    const crop = Math.floor((distances[side]+distances[side+1])/2/fieldWidth)*fieldWidth;
    const uv = corners.map(([j,i]) => [
      (region.x+atlas.padding+.5+(distances[i]-crop)*atlas.texelsPerMeter)/atlas.width,
      1-(region.y+region.height-atlas.padding-.5-(.37+heights[j])*atlas.texelsPerMeter)/atlas.height,
    ]);
    const shading = corners.map(([j,i]): V3 => {
      const angle=distances[i]/radius+Math.PI/2;
      return [Math.cos(angle)*normals[j][0],Math.sin(angle)*normals[j][0],normals[j][1]];
    });
    const tint = (point: V3): V3 => {
      const edge = Math.max(0,(point[2]-.10)/.02), foot = Math.max(0,1-point[2]/.025);
      const brightness = 1.04 + edge*.32 - foot*.2;
      const gain = brightness / atlas.albedoGain;
      return textured ? [gain,gain,gain] : shade(srgb("#9c754c"),brightness);
    };
    board.face(textured?"shop-timber":"paint",corners.map(([j,i])=>rings[j][i]),shading[0],tint,uv,shading);
  }
  for(let side=0;side+1<distances.length;side++) {
    board.face("paint",[[0,0,0],rings[0][side],rings[0][side+1]],[0,0,-1],srgb("#67462e"));
    const points: V3[] = [[0,0,.12],rings.at(-1)![side],rings.at(-1)![side+1]];
    kitchenFace(board,points,[0,0,1],2,points.map(([x,y])=>[.5+x/.186*.48,.5+y/.186*.48]));
  }
}

/** A solid, worn chopping block stays within a 40 cm footprint, with a flat work plane 12 cm above its base. */
export function choppingBlock(pen: Pen, at: V3): void {
  const board = pen.into(`${pen.part}/chopping-board`).move(...at);
  boardBody(board);
  const scoring = pen.into(`${pen.part}/board-scoring`).move(...at);
  for (let i = 0; i < 9; i++) {
    const y = -.115 + i * .026, x = -.065 + Math.sin(i * 2.1) * .035;
    scoring.face("paint", [[x,y,.12005],[x+.07,y+.013,.12005],[x+.018,y+.002,.12005]],
      [0,0,1], srgb(i % 3 === 0 ? "#c49d6d" : "#805c39"));
  }
  const cleaver = pen.into(`${pen.part}/cleaver`).move(...at);
  const steel = kitchenMetal(cleaver);
  steel.box("metal", [-.1,-.05,.12], [.08,.04,.126], shade(GALVANIZED,1.2), "");
  steel.box("metal", [.075,.009,.123], [.18,.031,.128], GALVANIZED, "");
  limb(cleaver,"timber",[[.078,.02,.133],[.089,.02,.133],[.184,.02,.133],[.2,.02,.133]],
    [0,.013,.012,0],srgb("#4a2f1c"),8,.65);
  for (const x of [.109,.164]) {
    const handleTop = .133 + .013 - (x - .089) / .095 * .001;
    lathe(steel,"metal",[x,.02,handleTop-.0003],[[.0025,0],[.0025,.001],[0,.001]],GALVANIZED,8);
  }
}
