import { POSTER_DESIGNS, posterUv } from "./posters.ts";
import { Kit } from "./kowloon/kit.ts";
import { srgb } from "./kowloon/palette.ts";
import type { CompiledArchitecture, V3 } from "../architecture/types.ts";
import { Rng } from "../generate/rng.ts";
import { Matrix4, Vector3 } from "three";
import { aborted } from "../vector/types.ts";
import type { KitBudget } from "./geometry.ts";
import type { Dressing, DressingRule } from "./types.ts";
import { WallGeometry } from "./wall-geometry.ts";
import { wallFits, type WallSurface } from "./wall-surfaces.ts";
import { planWallRuns, wallCenter, WallSpacing, type WallReceiver, type WallRun, type WallSegment } from "./wall-planning.ts";
import { wallSectionLayout, wallSectionFinish } from "./wall-finish.ts";
import { wallBaseMaterial } from "./wall-materials.ts";

const material = (name: string) => `$kowloon/wall-${name}`;

/** Carries authored wall aging into the shared plumbing finish without consuming placement randomness. */
function pipeKit(rule: DressingRule, settings: Dressing): Kit {
  return new Kit(`${settings.seed}/${rule.host}/pipes`, ["low", "medium", "high"].indexOf(settings.detail),
    rule.grime ?? settings.grime, rule.wear ?? settings.wear, false, rule.textureDensity,
    rule.rust ?? settings.rust ?? rule.wear ?? settings.wear);
}

/** A convex chipped perimeter keeps every decal within its independently fitted rectangle. */
function chipped(x: number, z: number, width: number, height: number, rng: Rng): number[][] {
  const cut = Math.min(width, height) * rng.float(0.015, 0.09);
  return [[x + cut, z], [x + width - cut * 2, z + cut * 0.2], [x + width, z + cut * 3],
    [x + width - cut * 0.3, z + height - cut], [x + width - cut, z + height],
    [x + cut * 3, z + height - cut * 0.3], [x, z + height - cut * 2], [x + cut * 0.2, z + cut]];
}

/** Modest per-piece variation stays in linear color space and responds to finish wear. */
function finishTint(rng: Rng, wear: number): V3 {
  const value = rng.float(0.76, 0.93) + wear * 0.06;
  return [value, value * rng.float(0.96, 1), value * rng.float(0.88, 0.97)];
}

/** Torn paper crops the shared padded poster atlas; lettering lives in the texture. */
function notice(kit: WallGeometry, name: string, x: number, z: number, width: number, height: number, rng: Rng, wear: number, layer: number) {
  const design = rng.pick(POSTER_DESIGNS);
  const depth = 0.012 + layer * 0.003;
  kit.panel(`${name}/paste`, chipped(x, z, width, height, rng), depth, material("paper"), [0.62, 0.63, 0.55]);
  const inset = width * 0.006;
  kit.panel(`${name}/sheet`, chipped(x + inset, z + inset, width - inset * 2, height - inset * 2, rng), depth + 0.0007,
    material("posters"), finishTint(rng, wear), point => posterUv(design, 1 - (point[0] - x - inset) / (width - inset * 2),
      (point[1] - z - inset) / (height - inset * 2)));
}

/** A closed, shallow corrugated frontage sits on solid wall; it is never a functional opening. */
function shutter(kit: WallGeometry, name: string, x: number, z: number, width: number, height: number, rng: Rng, wear: number) {
  const tint = finishTint(rng, wear);
  kit.box(`${name}/back`, [x, 0.012, z], [width, 0.035, height], material("cable"));
  const count = Math.floor((height - 0.18) / 0.073);
  for (let i = 0; i < count; i++) {
    kit.box(`${name}/slat-${i}`, [x + 0.065, 0.048, z + 0.07 + i * 0.073],
      [width - 0.13, 0.018, 0.061], material("shutter"), tint);
  }
  for (const [i, px] of [x, x + width - 0.055].entries())
    kit.box(`${name}/guide-${i}`, [px, 0.015, z], [0.055, 0.085, height], material("pipe"), tint);
  kit.box(`${name}/hood`, [x, 0.008, z + height - 0.09], [width, 0.115, 0.09], material("shutter"), tint);
  kit.box(`${name}/bottom-rail`, [x + 0.06, 0.045, z + 0.025], [width - 0.12, 0.04, 0.04], material("rust"));
}

/** A jointed riser and its clamps stay inside a 30 cm wide, 14 cm deep utility strip. */
function pipe(kit: WallGeometry, name: string, x: number, z: number, height: number, rng: Rng, aging: Kit) {
  const color = srgb(rng.bool(0.45) ? "#705340" : "#7a8077");
  const bend = rng.float(0.35, 0.62), upperX = rng.bool(0.4) ? x + 0.09 : x + 0.21;
  const points: V3[] = [[x + 0.09, 0.058, z + 0.04], [x + 0.09, 0.058, z + height * bend],
    [upperX, 0.058, z + height * bend + 0.14], [upperX, 0.058, z + height - 0.04]];
  kit.pipe(`${name}/riser`, points, { radius: 0.026, color, kit: aging });
}

/** Shallow galvanized duct with seams and straps; the terminal grille stays on solid wall. */
function duct(kit: WallGeometry, name: string, x: number, z: number, width: number, rng: Rng) {
  const tint = finishTint(rng, 0.3);
  kit.box(`${name}/body`, [x, 0.012, z + 0.06], [width, 0.108, 0.18], material("pipe"), tint);
  for (let i = 0; i <= Math.floor(width / 0.42); i++) {
    const px = x + 0.035 + i * (width - 0.07) / Math.max(1, Math.floor(width / 0.42));
    kit.box(`${name}/seam-${i}`, [px, 0.018, z + 0.047], [0.018, 0.11, 0.206], material("metal"), tint);
  }
  kit.box(`${name}/terminal`, [x + width - 0.19, 0.015, z], [0.19, 0.11, 0.3], material("pipe"), tint);
  for (let i = 0; i < 5; i++)
    kit.rect(`${name}/vent-${i}`, x + width - 0.165, z + 0.045 + i * 0.041,
      0.14, 0.013, 0.127, material("cable"), [0.7, 0.7, 0.7]);
}

/** Builds layered finishes first, then coherent service/notice clusters in each bounded bay. */
function decorateSurface(kit: WallGeometry, surface: WallSurface, rule: DressingRule, settings: Dressing, budget: KitBudget, spacingRegistry: WallSpacing, dividerXs: number[]) {
  const wear = rule.wear ?? settings.wear;
  const width = surface.right - surface.left, height = surface.top - surface.bottom;
  if (width < 0.8 || height < 0.16) return;
  const count = Math.max(1, Math.ceil(width / 2.6)), spacing = width / count;
  for (let cell = 0; cell < count; cell++) {
    aborted(budget.signal);
    const seed = `${settings.seed}/${rule.host}/${surface.key}/${cell}`;
    const x = surface.left + cell * spacing + 0.045, available = spacing - 0.09;
    const bottom = surface.bottom + 0.045;
    if (available < 0.38 || height < 0.8) continue;
    const shutterRng = new Rng(`${seed}/shutter`);
    const shutterWidth = Math.min(1.8, available - 0.3), shutterHeight = Math.min(2.24, height - 0.18);
    const hasShutter = surface.vertical && surface.levelBase && available > 1.6 && height > 2 && shutterRng.bool(0.27)
      && dividerXs.every(px => px + 0.08 < x + 0.15 || px - 0.08 > x + 0.15 + shutterWidth)
      && wallFits(surface, x + 0.15, bottom, shutterWidth, shutterHeight)
      && !!spacingRegistry.choose(["shutter"], wallCenter(surface, x + 0.15, bottom, shutterWidth, shutterHeight));
    if (hasShutter)
      shutter(kit, `cell-${cell}/shutter`, x + 0.15, bottom, shutterWidth, shutterHeight, shutterRng, wear);
    const notices = settings.detail === "low" ? 1 : settings.detail === "high" ? 3 : 2;
    if (!hasShutter) for (let i = 0; i < notices; i++) {
      const rng = new Rng(`${seed}/notice-${i}`);
      const w = Math.min(available * 0.65, rng.float(0.2, 0.38)), h = w * 1.5;
      const px = x + rng.float(0.02, Math.max(0.02, available - w - 0.02));
      const z = bottom + rng.float(height * 0.22, Math.max(height * 0.22, Math.min(height * 0.65, height - h - 0.12)));
      if (wallFits(surface, px, z, w, h)) {
        const choice = spacingRegistry.choose(["notice", "meter"], wallCenter(surface, px, z, w, h));
        if (choice === "notice") notice(kit, `cell-${cell}/notice-${i}`, px, z, w, h, rng, wear, i);
        if (choice === "meter") {
          kit.box(`cell-${cell}/meter-${i}/case`, [px + w * 0.1, 0.012, z + h * 0.15], [w * 0.8, 0.065, h * 0.7], material("pipe"));
          kit.rect(`cell-${cell}/meter-${i}/dial`, px + w * 0.12, z + h * 0.38, w * 0.56, h * 0.16, 0.078, material("cable"));
        }
      }
    }
    const pipeRng = new Rng(`${seed}/pipe`);
    const pipeX = hasShutter ? x + 0.15 + shutterWidth + 0.04 : x + pipeRng.float(0, available - 0.3);
    const serviceHeight = Math.min(height - 0.12, 3.8);
    // The highest offset needs room for its socketed elbow and a terminal barrel.
    if (serviceHeight >= 0.6 && pipeX + 0.3 <= x + available && pipeRng.bool(settings.detail === "low" ? 0.3 : 0.65) && wallFits(surface, pipeX, bottom, 0.3, serviceHeight)
      && spacingRegistry.choose(["pipe"], wallCenter(surface, pipeX, bottom, 0.3, serviceHeight)))
      pipe(kit, `cell-${cell}/pipe`, pipeX, bottom, serviceHeight, pipeRng, pipeKit(rule, settings));
    const ductRng = new Rng(`${seed}/duct`);
    const ductWidth = Math.min(available - 0.06, ductRng.float(0.7, 1.8));
    const ductZ = surface.top - ductRng.float(0.4, 0.75);
    const hasDuct = settings.detail !== "low" && available > 0.8 && ductRng.bool(0.3)
      && wallFits(surface, x, ductZ, ductWidth, 0.3)
      && !!spacingRegistry.choose(["duct"], wallCenter(surface, x, ductZ, ductWidth, 0.3));
    if (hasDuct) duct(kit, `cell-${cell}/duct`, x, ductZ, ductWidth, ductRng);
  }
}

/** Finds a run-distance location while retaining the receiving host and local coordinates. */
function alongRun(run: WallRun, distance: number): { segment: WallSegment; x: number } {
  let offset = 0;
  for (const segment of run.segments) {
    if (distance <= offset + segment.length)
      return { segment, x: segment.surface.left + distance - offset };
    offset += segment.length;
  }
  const segment = run.segments.at(-1)!;
  return { segment, x: segment.surface.right };
}

/** A narrow riser fits small fragments; density is measured along the complete curved run. */
function narrowRisers(level: CompiledArchitecture, run: WallRun, budget: KitBudget, spacing: WallSpacing, curved: boolean, settings: Dressing) {
  const seed = settings.seed;
  const emitters = new Map<WallSegment, WallGeometry>();
  const rng = new Rng(`${seed}/${run.segments[0].rule.host}/riser-run`);
  for (let distance = Math.min(rng.float(0.35, 0.8), run.length / 2); distance < run.length; distance += rng.float(3.8, 4.8)) {
    const { segment, x } = alongRun(run, distance);
    const surface = segment.surface;
    if (segment.length >= (curved ? 2.6 : 0.8) || segment.length < 0.12) continue;
    const height = Math.min(2.8, surface.top - surface.bottom - 0.12), z = surface.bottom + 0.06;
    const center = Math.max(surface.left + 0.055, Math.min(surface.right - 0.055, x));
    if (height < 0.5 || !wallFits(surface, center - 0.04, z, 0.08, height)) continue;
    if (!spacing.choose(["pipe"], wallCenter(surface, center, z, 0, height))) continue;
    let kit = emitters.get(segment);
    if (!kit) {
      kit = new WallGeometry(level, segment.rule.host, surface.frame, segment.layer, budget, surface.key);
      emitters.set(segment, kit);
    }
    kit.pipe("small/pipe/riser", [[center, 0.047, z + 0.025], [center, 0.047, z + height - 0.025]],
      { radius: 0.019, color: srgb("#7a8077"), kit: pipeKit(segment.rule, settings) });
  }
}

/**
 * Fits a complete high utility band. Only the two exterior ends may retreat,
 * by at most 30 cm or a quarter segment, to follow clipped native wall joints.
 * Interior gaps and openings still reject the complete cable run.
 */
function wireMargins(run: WallRun, z: number): { left: number; right: number }[] | undefined {
  const margins: { left: number; right: number }[] = [];
  for (const [index, segment] of run.segments.entries()) {
    const first = index === 0, last = index === run.segments.length - 1;
    const margin = { left: first ? 0.04 : 0, right: last ? 0.04 : 0 };
    const fits = () => segment.length > margin.left + margin.right
      && wallFits(segment.surface, segment.surface.left + margin.left, z - 0.32,
        segment.length - margin.left - margin.right, 0.36, 0);
    if (!fits()) {
      const limit = Math.max(0.04, Math.min(0.3, segment.length / 4));
      if (first) margin.left = limit;
      if (last) margin.right = limit;
      if (!fits()) return undefined;
      for (const side of ["left", "right"] as const) {
        if (side === "left" ? !first : !last) continue;
        let low = 0.04, high = margin[side];
        for (let step = 0; step < 24; step++) {
          margin[side] = (low + high) / 2;
          if (fits()) high = margin[side]; else low = margin[side];
        }
        margin[side] = high;
      }
    }
    margins.push(margin);
  }
  return margins;
}

/** Continuous utility bundles use shared world-space seam points, including gentle curves. */
function wireRun(level: CompiledArchitecture, run: WallRun, settings: Dressing, budget: KitBudget, runIndex: number) {
  if (settings.detail === "low" || run.length < 1.2 || run.top - run.bottom < 1) return;
  const z = run.top - 0.12;
  const rng = new Rng(`${settings.seed}/${run.segments[0].rule.host}/wire-run`);
  const anchorSpacing = rng.float(3.2, 4.5), phase = rng.float(0, 0.5), sag = rng.float(0.09, 0.14);
  const margins = wireMargins(run, z);
  if (!margins) return;
  const emitters = new Map<string, WallGeometry>();
  const cableCount = settings.detail === "high" ? 3 : 2;
  for (let cable = 0; cable < cableCount; cable++) {
    const depth = 0.043 + cable * 0.017;
    let distance = 0;
    for (const [index, segment] of run.segments.entries()) {
      aborted(budget.signal);
      let kit = emitters.get(segment.rule.host);
      if (!kit) {
        kit = new WallGeometry(level, segment.rule.host, new Matrix4(), segment.layer, budget, `run-${runIndex}`);
        emitters.set(segment.rule.host, kit);
      }
      const steps = Math.max(1, Math.ceil(segment.length / 0.25));
      const points: V3[] = [];
      for (let step = 0; step <= steps; step++) {
        const margin = margins[index];
        const localDistance = margin.left + (segment.length - margin.left - margin.right) * step / steps;
        const t = ((distance + localDistance + phase) / anchorSpacing) % 1;
        const elevation = z - cable * 0.028 - (sag + cable * 0.035) * 4 * t * (1 - t);
        const world = wallCenter(segment.surface, segment.surface.left + localDistance, elevation);
        const previous = run.segments[index - 1], next = run.segments[index + 1];
        let offset = segment.normal.clone().multiplyScalar(depth);
        if (step === 0 && previous) {
          world.copy(previous.end).add(segment.start).multiplyScalar(0.5);
          world.z += elevation;
          offset = previous.normal.clone().add(segment.normal).multiplyScalar(depth / (1 + previous.normal.dot(segment.normal)));
        } else if (step === steps && next) {
          world.copy(segment.end).add(next.start).multiplyScalar(0.5);
          world.z += elevation;
          offset = segment.normal.clone().add(next.normal).multiplyScalar(depth / (1 + segment.normal.dot(next.normal)));
        }
        world.add(offset);
        points.push(world.toArray() as V3);
      }
      kit.tube(`run/cable/strand-${cable}-segment-${index}`, points, 0.007, material("cable"));
      distance += segment.length;
    }
  }
  for (let distance = Math.max(0.06, anchorSpacing - phase); distance < run.length - 0.04; distance += anchorSpacing) {
    const { segment, x } = alongRun(run, distance);
    if (!wallFits(segment.surface, x - 0.012, z - 0.12, 0.024, 0.14)) continue;
    const kit = new WallGeometry(level, segment.rule.host, segment.surface.frame, segment.layer, budget, `clip-${runIndex}-${distance}`);
    kit.box(`run/cable/clip`, [x - 0.012, 0.01, z - 0.12], [0.024, 0.084, 0.14], material("rust"));
  }
  const { segment, x } = alongRun(run, run.length * rng.float(0.35, 0.75));
  const bottom = z - 0.72;
  if (wallFits(segment.surface, x - 0.14, bottom, 0.28, 0.72)) {
    const kit = new WallGeometry(level, segment.rule.host, segment.surface.frame, segment.layer, budget, `loop-${runIndex}`);
    kit.box(`run/cable/junction`, [x - 0.07, 0.014, z - 0.16], [0.14, 0.075, 0.16], material("pipe"));
    const points: V3[] = [];
    for (let i = 0; i <= 16; i++) {
      const t = i / 16;
      points.push([x + Math.sin(t * Math.PI * 2) * 0.1, 0.09,
        z - 0.12 - Math.sin(t * Math.PI) * 0.55]);
    }
    kit.tube(`run/cable/loop`, points, 0.008, material("cable"));
  }
}

/**
 * Plans all plain walls together so curves and adjoining AML hosts share wiring
 * and world-space spacing. Decorations remain on exposed receiving geometry,
 * within 0.14 m of the wall, without mutating source, collision or navigation.
 */
export function dressPlainWalls(level: CompiledArchitecture, receivers: WallReceiver[], settings: Dressing, budget: KitBudget) {
  const spacing = new WallSpacing();
  for (const [index, run] of planWallRuns(receivers, budget.signal).entries()) {
    const curved = run.segments.some(segment => segment.normal.dot(run.segments[0].normal) < 0.9999);
    for (const segment of run.segments) {
      aborted(budget.signal);
      if (curved && segment.length < 2.6) continue;
      const kit = new WallGeometry(level, segment.rule.host, segment.surface.frame, segment.layer, budget, segment.surface.key);
      const dividerXs = finishDividerPositions(segment, settings);
      decorateSurface(kit, segment.surface, segment.rule, settings, budget, spacing, dividerXs);
      finishDividers(kit, segment, dividerXs);
    }
    jointDividers(level, run, settings, budget, index);
    narrowRisers(level, run, budget, spacing, curved, settings);
    wireRun(level, run, settings, budget, index);
  }
}

/** Reserves structural seam positions before frontage props are placed. */
function finishDividerPositions(segment: WallSegment, settings: Dressing): number[] {
  const count = settings.wallMaterials?.length ?? 1;
  const surface = segment.surface, host = segment.rule.host;
  if (count < 2 || segment.continuous || !surface.vertical || !surface.levelBase) return [];
  const { width, phase } = wallSectionLayout(settings.seed, host);
  const coordinate = (x: number) => {
    const p = new Vector3(x, 0, 0).applyMatrix4(surface.frame).applyMatrix4(segment.inverse);
    return p.x * 0.83 + p.y * 0.67 + phase;
  };
  const a = coordinate(surface.left), b = coordinate(surface.right);
  if (Math.abs(a - b) < 1e-6) return [];
  const positions: number[] = [];
  for (let section = Math.ceil(Math.min(a, b) / width); section * width < Math.max(a, b); section++) {
    if (wallSectionFinish(settings.seed, host, section - 1, count) === wallSectionFinish(settings.seed, host, section, count)) continue;
    const x = surface.left + (section * width - a) / (b - a) * segment.length;
    const z = surface.bottom + 0.03, height = surface.top - surface.bottom - 0.06;
    if (!wallFits(surface, x - 0.08, z, 0.16, height)) continue;
    positions.push(x);
  }
  return positions;
}

/** Shallow pilasters explain substrate changes on broad, upright, level wall sections. */
function finishDividers(kit: WallGeometry, segment: WallSegment, positions: number[]) {
  const z = segment.surface.bottom + 0.03, height = segment.surface.top - segment.surface.bottom - 0.06;
  for (const [index, x] of positions.entries()) {
    kit.box(`region/divider/${index}`, [x - 0.06, 0.008, z], [0.12, 0.075, height], wallBaseMaterial(segment.rule.host, 0));
    kit.box(`region/divider/cap-${index}`, [x - 0.08, 0.008, z + height - 0.09], [0.16, 0.083, 0.09], wallBaseMaterial(segment.rule.host, 0));
  }
}

/** Reads the substrate at a run joint using the same assignment as the receiving mesh. */
function jointFinish(segment: WallSegment, x: number, settings: Dressing): number {
  const count = settings.wallMaterials?.length ?? 1, host = segment.rule.host;
  if (count === 1 || segment.continuous) return new Rng(`${settings.seed}/${host}/surface`).int(0, count - 1);
  const p = new Vector3(x, 0, 0).applyMatrix4(segment.surface.frame).applyMatrix4(segment.inverse);
  const { width, phase } = wallSectionLayout(settings.seed, host);
  return wallSectionFinish(settings.seed, host, Math.floor((p.x * 0.83 + p.y * 0.67 + phase) / width), count);
}

/** Covers a real texture change at a collinear joint between separately authored walls. */
function jointDividers(level: CompiledArchitecture, run: WallRun, settings: Dressing, budget: KitBudget, runIndex: number) {
  for (let i = 1; i < run.segments.length; i++) {
    const a = run.segments[i - 1], b = run.segments[i];
    if (a.rule.host === b.rule.host || a.normal.dot(b.normal) < 0.9995) continue;
    const aId = wallBaseMaterial(a.rule.host, jointFinish(a, a.surface.right - 0.01, settings));
    const bId = wallBaseMaterial(b.rule.host, jointFinish(b, b.surface.left + 0.01, settings));
    const am = level.document.materials.find(material => material.id === aId)!;
    const bm = level.document.materials.find(material => material.id === bId)!;
    if (am.texture === bm.texture && am.color === bm.color) continue;
    const z = Math.max(a.surface.bottom, b.surface.bottom) + 0.03;
    const height = Math.min(a.surface.top, b.surface.top) - z - 0.03;
    if (height < 0.5 || !wallFits(a.surface, a.surface.right - 0.08, z, 0.08, height, 0)
      || !wallFits(b.surface, b.surface.left, z, 0.08, height, 0)) continue;
    const kit = new WallGeometry(level, a.rule.host, a.surface.frame, a.layer, budget, `joint-${runIndex}-${i}`);
    kit.box(`region/divider/joint`, [a.surface.right - 0.08, 0.008, z], [0.16, 0.075, height], wallBaseMaterial(a.rule.host, 0));
  }
}
