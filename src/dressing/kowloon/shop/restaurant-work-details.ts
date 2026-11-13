import { fractalNoise, smoothStep, valueNoise } from "../../finish/noise.ts";
import { Vector3 } from "three";
import type { V3 } from "../../../architecture/types.ts";
import type { Rng } from "../../../generate/rng.ts";
import type { Pen } from "../../pen.ts";
import { GALVANIZED, shade, srgb } from "../palette.ts";
import { lathe } from "./forms.ts";
import { kitchenMetal } from "./restaurant-surfaces.ts";

/** A counter-supported partial cabinet, glazed toward customers and open to the cook at the rear. */
export function displayCabinet(pen: Pen, width: number, top: number, railHeight: number): void {
  const frame = kitchenMetal(pen.into(`${pen.part}/display`));
  const front = .035, back = .52, ceiling = railHeight + .10;
  for (const x of [.025, width]) {
    frame.bar("metal", [x, front, top], [x, front, ceiling], .018, GALVANIZED);
    frame.bar("metal", [x, back, top], [x, back, ceiling], .018, GALVANIZED);
    frame.bar("metal", [x, front, ceiling], [x, back, ceiling], .018, GALVANIZED);
  }
  for (const y of [front, back]) frame.bar("metal", [.025, y, ceiling], [width, y, ceiling], .018, GALVANIZED);
  frame.bar("metal", [.025, front, top + .045], [width, front, top + .045], .018, GALVANIZED);
  frame.face("display-glass", [[.035,front,top+.055],[width-.01,front,top+.055],
    [width-.01,front,ceiling-.01],[.035,front,ceiling-.01]], [0,-1,0], [1,1,1]);
  frame.face("display-glass", [[.025,front+.01,top+.055],[.025,back-.01,top+.055],
    [.025,back-.01,ceiling-.01],[.025,front+.01,ceiling-.01]], [-1,0,0], [1,1,1]);
}

/** Grease and tea-colored wiping stains follow cloth-local meters and darken its handled lower hem. */
function towelGrime(point: V3, center: number, top: number, pigment: V3): V3 {
  const u = point[0]-center, v = point[1] > .004 ? point[1] : point[2]-top;
  const patches = smoothStep(.32,.72,fractalNoise(u*24+3,v*19,731,3));
  const smear = Math.exp(-(((u+.026)/.044)**2+((v+.12)/.055)**2));
  const hem = (1-smoothStep(0,.038,Math.abs(v+.232))) * (.35+.65*valueNoise(u*60,0,97));
  const stain = Math.min(.8,.12+patches*.38+smear*.28+hem*.32);
  const dirt = srgb("#6e5536");
  return pigment.map((value,channel)=>value*(1-stain)+dirt[channel]*stain) as V3;
}

/** A 1.2 mm cloth shell rests on the beveled counter, with loose folds below its front edge. */
export function counterTowel(pen: Pen, x: number, top: number): void {
  const cloth = pen.into(`${pen.part}/work-towel`);
  const columns = 16, halfThickness = .0006;
  const path: [number, number][] = [.16,.12,.08,.04,.02,.004].map(y => [y, top + halfThickness]);
  for (let step = 1; step <= 4; step++) {
    const angle = step * Math.PI / 8;
    path.push([.004 - .0048 * Math.sin(angle), top - .004 + .0048 * Math.cos(angle)]);
  }
  for (const drop of [.025,.055,.09,.13,.18,.228,.235]) path.push([-.0008, top - drop]);
  const middle = path.map(([y,z]) => Array.from({length: columns + 1}, (_, column) => {
    const u = column / columns;
    const hanging = Math.max(0, Math.min(1, (top - z - .004) / .08));
    const fold = (1 + Math.sin(u * Math.PI * 5 + hanging * .8)) * .0055
      + (1 + Math.sin(u * Math.PI * 9 - hanging)) * .0012;
    const hem = Math.max(0, (top - z - .13) / .105);
    const topWrinkle = y >= .004 ? Math.sin(Math.PI * Math.min(1,(y-.004)/.116)) ** 2
      * Math.sin(u * Math.PI * 3 + y * 14) ** 2 * .002 : 0;
    return new Vector3(x + (u - .5) * .18 + hanging * Math.sin(u * Math.PI) * .001,
      y - hanging * fold, z + topWrinkle + hem * Math.sin(u * 8 + .4) * .006);
  }));
  const normals = middle.map((row, j) => row.map((_, i) => {
    const across = row[Math.min(columns,i+1)].clone().sub(row[Math.max(0,i-1)]);
    const down = middle[Math.min(path.length-1,j+1)][i].clone().sub(middle[Math.max(0,j-1)][i]);
    return down.cross(across).normalize();
  }));
  const outer = middle.map((row,j) => row.map((point,i) => point.clone().addScaledVector(normals[j][i], halfThickness)));
  const inner = middle.map((row,j) => row.map((point,i) => point.clone().addScaledVector(normals[j][i], -halfThickness)));
  for (let j = 0; j + 1 < path.length; j++) for (let i = 0; i < columns; i++) {
    const corners = [[j,i],[j,i+1],[j+1,i+1],[j+1,i]];
    const stripe = i === 2 || i === 3 || i === 12;
    const hem = j === path.length - 2 || i === 0 || i === columns - 1;
    const tint = shade(srgb(stripe ? "#995347" : "#d0c7ad"), hem ? .82 : .97 + Math.sin(i * 1.7 + j * .8) * .025);
    for (const side of [1,-1]) {
      const shell = side === 1 ? outer : inner;
      const faceNormals = corners.map(([row,column]) => normals[row][column].clone().multiplyScalar(side).toArray() as V3);
      cloth.face("paint", corners.map(([row,column]) => shell[row][column].toArray() as V3),
        faceNormals[0], point => towelGrime(point,x,top,tint), undefined, faceNormals);
    }
  }
  // Sew the perimeter so the folded cloth has real thickness rather than coincident backfaces.
  const border = [
    ...Array.from({length: columns}, (_,i) => [0,i]),
    ...Array.from({length: path.length-1}, (_,j) => [j,columns]),
    ...Array.from({length: columns}, (_,i) => [path.length-1,columns-i]),
    ...Array.from({length: path.length-1}, (_,j) => [path.length-1-j,0]),
  ];
  for (let i = 0; i < border.length; i++) {
    const [aj,ai] = border[i], [bj,bi] = border[(i+1)%border.length];
    const points = [outer[aj][ai],outer[bj][bi],inner[bj][bi],inner[aj][ai]];
    const hint = points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0])).normalize();
    cloth.face("paint", points.map(point => point.toArray() as V3), hint.toArray() as V3, point => towelGrime(point,x,top,srgb("#aaa18a")));
  }
}

/** Clips short receipts to a supported rail above the rear workbench, leaving vessels accessible. */
export function orderSlips(pen: Pen, at: V3, width: number, rng: Rng): void {
  const papers = pen.into(`${pen.part}/order-slips`).move(...at);
  const steel = kitchenMetal(papers);
  steel.bar("metal", [0,0,0], [width,0,0], .008, GALVANIZED);
  for (const x of [0,width]) steel.bar("metal", [x,0,0], [x,.072,0], .01, GALVANIZED);
  const count = Math.max(2, Math.floor(width / .13));
  for (let i = 0; i < count; i++) {
    const x = .03 + i * (width - .10) / Math.max(1, count - 1), length = rng.float(.12,.19);
    const dx = rng.float(-.008,.008), y = -.008;
    const points: V3[] = [[x,y,-.012],[x+.075,y,-.012],[x+.075+dx,y-.008,-length],[x+dx,y-.008,-length]];
    papers.face("paint", points, [0,-1,0], srgb(i % 3 === 0 ? "#dbc798" : "#ded7be"));
    papers.face("paint", [...points].reverse(), [0,1,0], srgb("#c7bfa9"));
    steel.box("metal", [x+.027,-.017,-.027], [x+.045,.005,.009], GALVANIZED, "");
    for (let line = 0; line < 4; line++) {
      const z = -.05 - line * .021, t = (z + .012) / (-length + .012);
      const left = x + dx * t + .012, depth = y - .008 * t - .0005;
      papers.face("paint", [[left,depth,z],[left+.036-(line%2)*.012,depth,z],
        [left+.036-(line%2)*.012,depth,z-.002],[left,depth,z-.002]], [0,-1,0], srgb(line === 0 ? "#994b3c" : "#777163"));
    }
  }
}

/** Hollow ceramic cup holds a tight, irregular bundle of inexpensive bamboo chopsticks. */
export function chopstickCup(pen: Pen, at: V3, rng: Rng): void {
  const local = pen.into(`${pen.part}/tableware`).move(...at);
  lathe(local, "pane", [0,0,0], [[.035,0],[.043,.10],[.036,.103],[.029,.012],[0,.012]], srgb("#d3ceba"), 12);
  for (let i = 0; i < 9; i++) {
    const angle = i * 2.4, radius = .012 + i % 3 * .004;
    const x = Math.cos(angle) * radius, y = Math.sin(angle) * radius;
    local.bar("timber", [x,y,.012], [x+rng.float(-.014,.014),y+rng.float(-.014,.014),rng.float(.17,.22)], .004, srgb("#ac8456"));
  }
}
