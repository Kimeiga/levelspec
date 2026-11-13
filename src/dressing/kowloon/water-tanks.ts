import type { V3 } from "../../architecture/types.ts";
import type { Rng } from "../../generate/rng.ts";
import type { Pen } from "../pen.ts";
import { brushedMetal } from "../finish/brushed-metal.ts";
import { createMetalSurface } from "../finish/metal-surface.ts";
import { finishSeed } from "../wall-surface.ts";
import type { Kit } from "./kit.ts";
import { CONCRETE, GALVANIZED, shade, srgb } from "./palette.ts";
import { PipeSystem } from "./pipes.ts";
import { bolt, fixingPlate, member, type Steel } from "./signs/steel.ts";
import { weatheredPen } from "./weathered.ts";

/** Emits a closed turned tank shell with smooth shoulder normals and one continuous, periodic metal finish. */
function vessel(pen: Pen, radius: number, height: number, paint: V3, kit: Kit): void {
  const profile = [[radius * .58, 0], [radius * .84, .035], [radius * .96, .085], [radius, .14],
    [radius, height - .07], [radius * .98, height - .035], [radius * .94, height - .012],
    [radius * .72, height], [radius * .38, height + .008], [radius * .24, height + .01]];
  const distances = [0];
  for (let i = 1; i < profile.length; i++) distances.push(distances[i - 1] + Math.hypot(profile[i][0] - profile[i - 1][0], profile[i][1] - profile[i - 1][1]));
  const sides = 48, circumference = 2 * Math.PI * radius, first = pen.mesh.triangleCount;
  const point = (row: number, side: number) => {
    const angle = side / sides * 2 * Math.PI;
    const previous = profile[Math.max(0, row - 1)], next = profile[Math.min(profile.length - 1, row + 1)];
    const dr = next[0] - previous[0], dz = next[1] - previous[1], length = Math.hypot(dr, dz);
    return { at: [Math.cos(angle) * profile[row][0], Math.sin(angle) * profile[row][0], profile[row][1]] as V3,
      normal: [Math.cos(angle) * dz / length, Math.sin(angle) * dz / length, -dr / length] as V3,
      uv: [side / sides * circumference, distances[row]] };
  };
  for (let row = 0; row + 1 < profile.length; row++) for (let side = 0; side < sides; side++) {
    const corners = [[row, side], [row, side + 1], [row + 1, side + 1], [row + 1, side]].map(([r, s]) => point(r, s));
    const repeat = kit.textureDensity ? 1 : pen.mesh.repeat("brushed-metal");
    pen.face("brushed-metal", corners.map(v => v.at), corners[0].normal, [1, 1, 1],
      corners.map(v => v.uv.map(value => value * repeat)), corners.map(v => v.normal));
  }
  if (kit.textureDensity) {
    const bounds: [number, number, number, number] = [0, 0, circumference, distances.at(-1)!];
    const material = pen.mesh.material("brushed-metal"), coating = pen.mesh.material("paint");
    const settings = { kind: "sheet" as const, bounds, wrapU: circumference, paint, seed: finishSeed("tank-galvanized"),
      paintCoverage: 0, wear: kit.wear, grime: kit.grime, rust: kit.rust * .65,
      edgeAxes: [false, true] as [boolean, boolean], metric: { scale: [1, 1] as [number, number], gravity: [0, -1] as [number, number] },
      folds: [.25, .55, .82].map(t => ({ axis: 1 as const, at: distances[3] + (height - .3) * t, concave: true })),
      substrate: { material, repeat: pen.mesh.repeat("brushed-metal") }, coating: { material: coating, repeat: pen.mesh.repeat("paint") } };
    const finish = createMetalSurface(settings), density = Math.max(128, kit.textureDensity);
    pen.mesh.receive({ id: `${pen.part}/tank/${first}`, firstTriangle: first, triangleCount: pen.mesh.triangleCount - first,
      frame: pen.surfaceFrame(), bounds, materials: [material, coating],
      raster: { coordinates: "uv", scope: "scene", group: `tank/v2/${JSON.stringify([settings, density])}`,
        materialKey: `tank/v2/${JSON.stringify([settings, density])}`, bounds, texelsPerMeter: density, bump: "sample" }, sample: finish.sample });
  }
  const polished = brushedMetal(pen);
  polished.disc("metal", [0, 0, 0], radius * .58, [0, 0, -1], [1, 1, 1], sides);
  polished.disc("metal", [0, 0, height + .01], radius * .24, [0, 0, 1], [1, 1, 1], sides);
}

/** A rooftop tank assembly inside a 2 m square centered on `center`, including ladder, pads, valves and pipes. */
export function roundTank(pen: Pen, center: V3, rng: Rng, kit: Kit): void {
  pen = pen.move(...center);
  const radius = rng.float(.55, .67), height = rng.float(1.05, 1.3), base = rng.float(.42, .53);
  const paint = srgb(rng.pick(["#b6b8ae", "#a5ada5", "#9da9a4"]));
  const steel: Steel = { slot: "metal", tint: srgb("#626d64"), weathering: kit };
  const hardware = weatheredPen(pen, kit, "frame");
  const leg = radius * .63;
  for (const x of [-leg, leg]) for (const y of [-leg, leg]) {
    pen.box("concrete", [x - .12, y - .12, 0], [x + .12, y + .12, .1], shade(CONCRETE, .7), "d");
    fixingPlate(hardware, steel, [x, y, .1], [1, 0, 0], [0, 1, 0], [0, 0, 1], .18, .18, 4);
    member(hardware, steel, [x, y, .11], [x, y, base + .08], [1, 0, 0], .065, .065);
  }
  for (const y of [-leg, leg]) {
    member(hardware, steel, [-leg - .08, y, base - .04], [leg + .08, y, base - .04], [0, 1, 0], .1, .08);
    member(hardware, steel, [-leg, y, .14], [leg, y, base - .07], [0, 1, 0], .025, .025);
  }
  for (const x of [-leg, leg]) member(hardware, steel, [x, -leg, .14], [x, leg, base - .07], [1, 0, 0], .025, .025);
  vessel(pen.move(0, 0, base), radius, height, paint, kit);
  for (const t of [.25, .55, .82]) {
    const z = base + .14 + (height - .3) * t;
    const path: V3[] = Array.from({ length: 49 }, (_, i) => [Math.cos(i / 48 * Math.PI * 2) * (radius + .004), Math.sin(i / 48 * Math.PI * 2) * (radius + .004), z]);
    brushedMetal(pen).tube("metal", path, .009, [.85, .85, .85], 6);
  }
  const hatch = brushedMetal(pen);
  hatch.drum("metal", [0, 0, base + height + .01], .21, .045, [.9, .9, .9], 32);
  for (let i = 0; i < 6; i++) {
    const angle = i * Math.PI / 3;
    bolt(hardware, steel, [.18 * Math.cos(angle), .18 * Math.sin(angle), base + height + .057], [0, 0, 1], .009);
  }
  hardware.tube("metal", [[-.07, 0, base + height + .057], [-.07, 0, base + height + .112], [.07, 0, base + height + .112], [.07, 0, base + height + .057]], .009, steel.tint, 8);
  const ladderX = -radius - .13, top = base + height + .16;
  for (const y of [-.16, .16]) {
    member(hardware, steel, [ladderX, y, .04], [ladderX, y, top], [0, 1, 0], .028, .026);
    for (const z of [base + .25, base + height - .22]) member(hardware, steel, [ladderX, y, z], [-radius + .04, y, z], [0, 1, 0], .022, .025);
  }
  for (let z = .22; z < top - .13; z += .25) hardware.tube("metal", [[ladderX, -.16, z], [ladderX, .16, z]], .012, steel.tint, 8);
  const pipes = new PipeSystem(pen, { radius: .03, color: srgb("#7b8176"), kit, variant: "tank-feed" });
  pipes.run([[radius - .025, 0, base + height - .25], [radius + .16, 0, base + height - .25], [radius + .16, 0, .06]]);
  pipes.coupling([radius + .03, 0, base + height - .25], [1, 0, 0]);
  pipes.run([[0, 0, base + .01], [0, 0, .25], [0, radius + .14, .25], [0, radius + .14, .06]]);
  hardware.drum("metal", [0, radius * .55, .25], .045, .08, steel.tint, 12);
  pen.disc("paint", [0, radius * .55, .34], .07, [0, 0, 1], srgb("#734338"), 12);
}

/** A bolted sectional cistern on concrete bearers, contained inside a 2 m square centered on its origin. */
export function boxTank(pen: Pen, center: V3, rng: Rng, kit: Kit): void {
  pen = pen.move(...center);
  const w = rng.float(1.3, 1.6), d = rng.float(1, 1.3), h = rng.float(.85, 1.1), base = .24;
  const paint = srgb("#b5b39b"), steel: Steel = { slot: "metal", tint: srgb("#757b70"), weathering: kit };
  const hardware = weatheredPen(pen, kit, "sheet");
  for (const x of [-w * .3, w * .3]) pen.box("concrete", [x - .1, -d / 2, 0], [x + .1, d / 2, base], shade(CONCRETE, .72), "d");
  const sides: [V3, V3, V3, number][] = [
    [[-w / 2, -d / 2, base], [1, 0, 0], [0, -1, 0], w], [[w / 2, -d / 2, base], [0, 1, 0], [1, 0, 0], d],
    [[w / 2, d / 2, base], [-1, 0, 0], [0, 1, 0], w], [[-w / 2, d / 2, base], [0, -1, 0], [-1, 0, 0], d],
  ];
  for (const [origin, tangent, normal, width] of sides) {
    const face = hardware.facing(origin, tangent, normal), count = Math.max(1, Math.round(width / .7));
    for (let i = 0; i < count; i++) {
      const x0 = i * width / count, x1 = (i + 1) * width / count;
      const rim: V3[] = [[x0, 0, 0], [x1, 0, 0], [x1, 0, h], [x0, 0, h]];
      const raised: V3[] = [[x0 + .09, .045, .09], [x1 - .09, .045, .09], [x1 - .09, .045, h - .09], [x0 + .09, .045, h - .09]];
      for (let k = 0; k < 4; k++) face.face("metal", [rim[k], rim[(k + 1) % 4], raised[(k + 1) % 4], raised[k]], [0, 1, 0], paint);
      face.face("metal", raised, [0, 1, 0], paint);
      for (const x of [x0 + .025, x1 - .025]) {
        face.box("metal", [x - .012, .002, .02], [x + .012, .016, h - .02], steel.tint);
        for (let z = .07; z < h; z += .2) bolt(face, steel, [x, .017, z], [0, 1, 0], .007);
      }
    }
  }
  hardware.box("metal", [-w / 2 - .035, -d / 2 - .035, base + h], [w / 2 + .035, d / 2 + .035, base + h + .055], paint, "");
  hardware.box("metal", [-.25, -.22, base + h + .055], [.25, .22, base + h + .105], shade(paint, .9), "d");
  pen.face("metal", [[-w / 2, -d / 2, base], [w / 2, -d / 2, base], [w / 2, d / 2, base], [-w / 2, d / 2, base]], [0, 0, -1], paint);
  new PipeSystem(pen, { radius: .03, color: steel.tint, kit }).run([[w / 2 - .01, 0, base + h * .75], [w / 2 + .13, 0, base + h * .75], [w / 2 + .13, 0, .05]]);
}
