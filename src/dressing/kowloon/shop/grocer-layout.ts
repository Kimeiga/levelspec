import type { V3 } from "../../../architecture/types.ts";
import type { Rng } from "../../../generate/rng.ts";
import { propSize } from "./grocer-props.ts";

/** A fixture's local front-left origin, yaw and occupied dimensions in meters. */
export interface GrocerFixture {
  id: string;
  origin: V3;
  turn: number;
  size: V3;
}
export interface GrocerShelf extends GrocerFixture {
  levels: number;
  above: number;
}
/** Canonical room placements; `mirrored` reflects the entire arrangement about the room's centerline. */
export interface GrocerLayout {
  kind: "front-counter" | "side-counter" | "recessed-counter";
  mirrored: boolean;
  counter: GrocerFixture;
  cooler?: GrocerFixture;
  shelves: GrocerShelf[];
  crates: GrocerFixture;
  sacks: GrocerFixture;
  stool: GrocerFixture;
  hanging: { x0: number; x1: number; y: number };
}

/** Reserves a fixture whose geometry starts at its own front-left floor corner. */
function fixture(id: string, x: number, y: number, size: V3, turn = 0, z = 0): GrocerFixture {
  return { id, origin: [x,y,z], turn, size };
}

/**
 * Chooses a compact shop arrangement independently of stocking and detail.
 * Floor zones reserve complete rotated props; elevated racks clear counter goods.
 * This describes decorative fixtures, not a navigable room or collision layout.
 */
export function planGrocerLayout(width: number, depth: number, height: number, rng: Rng): GrocerLayout {
  const kind = width < 2.2 ? "front-counter" : rng.pick(["front-counter","side-counter","recessed-counter"] as const);
  const mirrored = rng.bool(.5);
  const counterWidth = Math.max(.9, Math.min(1.9, width-1.25));
  const counterX = width-.06-counterWidth;
  const recessed = kind === "recessed-counter";
  const side = kind === "side-counter";
  const counterY = recessed ? rng.float(.75,.95) : rng.float(.08,.17);
  const counter = side
    ? fixture("counter",width-.56,depth-.42,[Math.min(1.9,depth-1.1),.5,1.3],-Math.PI/2)
    : fixture("counter",counterX,counterY,[counterWidth,.5,1.3]);
  const unit = Math.min(height-.3,1.95);
  const shelves: GrocerShelf[] = [];
  const cooled = width >= 2.5;
  const coolerSize = propSize("drinks-cooler",[.7,.6,Math.min(1.85,height-.25)]);
  const cooler = !cooled ? undefined : fixture("cooler",
    side || recessed ? .05 : width-.05-coolerSize[0],
    recessed ? .03 : depth-.01-coolerSize[1],coolerSize);
  const backStart = side && cooled ? .81 : .05;
  const backWidth = width-.1-(cooled && !recessed ? .76 : 0);
  shelves.push({...fixture("back-shelves",backStart,depth-.36,[backWidth,.35,unit]),levels:6,above:height-unit-.03});
  const leftStart = recessed ? counterY+.53 : .65;
  const leftEnd = depth-(side && cooled ? .66 : .41);
  if (leftEnd-leftStart >= .65)
    shelves.push({...fixture("left-shelves",.285,leftStart,[leftEnd-leftStart,.28,unit],Math.PI/2),levels:6,above:height-unit-.03});
  const rackStart = recessed ? counterY+.55 : .66;
  const rackEnd = depth-(cooled && !side && !recessed ? .66 : .41);
  shelves.push({...fixture("right-rack",width-.17,rackEnd,[rackEnd-rackStart,.165,Math.min(.7,height-1.45)],-Math.PI/2,1.35),levels:3,above:0});
  const crates = fixture("crates",.05,recessed ? counterY+.03 : .04,
    [(side ? width-.72 : counterX-.04)-.05,.44,1.15]);
  const sackX = recessed && cooled ? .82 : .36;
  const sackEnd = side ? width-.85 : recessed ? width-.06 : backStart+backWidth-.04;
  const sacks = fixture("sacks",sackX,recessed ? .06 : side ? .68 : depth-.98,[sackEnd-sackX,.58,.65]);
  const stoolCenter: V3 = side ? [width-.84,depth-.9,0] : [counterX+counterWidth*.5,counterY+.85,0];
  const stool = fixture("stool",stoolCenter[0]-.2,stoolCenter[1]-.2,[.4,.4,.45]);
  const hanging = recessed
    ? {x0:cooled ? .9 : .2,x1:width-.15,y:.66}
    : {x0:.2,x1:side ? width-.75 : counterX-.15,y:.57};
  return {kind,mirrored,counter,cooler,shelves,crates,sacks,stool,hanging};
}
