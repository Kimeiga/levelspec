import { tileCoverage } from "./finish/tile-grid.ts";
import { fractalNoise, latticeHash, smoothStep, valueNoise } from "./finish/noise.ts";
import { TileDamageBlobs } from "./finish/tile-damage.ts";
import type { V3 } from "../architecture/types.ts";

/** Surface-local dimensions and independent ceramic weathering; omitted dimensions retain seeded variety. */
export interface TileSettings {
  seed: number;
  share: number;
  wear: number;
  /** Added ceramic deposits and color variation, 0–1; independent of damage. */
  grime: number;
  /** Tile width in meters. */
  size?: number;
  /** Width divided by height. */
  aspect?: number;
}

/** Ceramic appearance in surface-local meters; coverage and shallow relief never create tile geometry. */
export class TileField {
  private readonly width: number;
  private readonly height: number;
  private readonly halfGap: number;
  private readonly chipWidth: number;
  private readonly seed: number;
  private readonly share: number;
  private readonly wear: number;
  private readonly grime: number;
  private readonly stagger: boolean;
  private readonly damage: TileDamageBlobs;
  private jointCache?: { u: number; v: number; footprint: number; widths: readonly [number, number] };

  constructor({ seed, share, wear, grime, size, aspect }: TileSettings) {
    this.seed = seed;
    this.share = share;
    this.wear = wear;
    this.grime = grime;
    const pattern = seed % 3;
    this.width = size ?? [0.16, 0.24, 0.09][pattern];
    this.height = this.width / (aspect ?? [1, 2, 1][pattern]);
    this.halfGap = Math.min(0.00225, this.width * 0.02, this.height * 0.02);
    this.chipWidth = Math.min(0.004, this.width * 0.035, this.height * 0.035);
    this.stagger = this.width / this.height >= 1.5;
    this.damage = new TileDamageBlobs(seed, wear);
  }

  /** Shares logical tile identity between color and damage, including staggered rows below the origin. */
  private tile(u: number, v: number) {
    const row = Math.floor(v / this.height);
    const shifted = u - (this.stagger && row % 2 !== 0 ? this.width / 2 : 0);
    const column = Math.floor(shifted / this.width);
    return { row, column, shifted, x: shifted - column * this.width, y: v - row * this.height };
  }

  /** Straight grout with sparse corner chips and rare edge nicks; sides 0/1 are left/right and 2/3 bottom/top. */
  private chippedJointWidth(column: number, row: number, side: 0 | 1 | 2 | 3,
    along: number, length: number, footprint: number): number {
    // Chips only widen the gap. Both banks become identical before a texel can span the entire core.
    const coreWidth = 2 * this.halfGap;
    const resolved = 1 - smoothStep(coreWidth * 0.8, coreWidth, footprint);
    if (resolved === 0) return this.halfGap;

    const endpoint = along < length / 2 ? 0 : 1;
    const corner = side < 2 ? side + endpoint * 2 : endpoint + (side - 2) * 2;
    const cornerSeed = this.seed + 307 + corner * 91;
    let cornerChip = 0;
    if (latticeHash(column, row, cornerSeed) < 0.12 + this.wear * 0.2) {
      const span = Math.min(length * 0.14, 0.006 + latticeHash(column, row, cornerSeed + 17) * 0.012);
      const distance = Math.min(along, length - along);
      cornerChip = Math.max(0, 1 - distance / span) * (0.55 + latticeHash(column, row, cornerSeed + 29) * 0.45);
    }

    const edgeSeed = this.seed + 809 + side * 131;
    let edgeChip = 0;
    if (latticeHash(column, row, edgeSeed) < 0.02 + this.wear * 0.04) {
      const center = length * (0.2 + latticeHash(column, row, edgeSeed + 17) * 0.6);
      const span = Math.min(length * 0.045, 0.004 + latticeHash(column, row, edgeSeed + 29) * 0.004);
      edgeChip = Math.max(0, 1 - Math.abs(along - center) / span) * 0.65;
    }
    const chip = Math.max(cornerChip, edgeChip);
    if (chip === 0) return this.halfGap;
    const grainResolved = 1 - smoothStep(0.002, 0.006, footprint);
    const grain = 1 - valueNoise(along * 211, column + row * 19, edgeSeed + 43) * 0.25 * grainResolved;
    return this.halfGap + this.chipWidth * resolved * chip * grain;
  }

  /** Borrowed widths shared by coverage, normals and pigment; logical tile corners anchor each bank's sparse chips. */
  private jointWidths(u: number, v: number, footprint: number): readonly [number, number] {
    const cached = this.jointCache;
    if (cached && cached.u === u && cached.v === v && cached.footprint === footprint) return cached.widths;
    const { column, row, x, y } = this.tile(u, v);
    const widths: readonly [number, number] = [
      this.chippedJointWidth(column, row, x < this.width / 2 ? 0 : 1, y, this.height, footprint),
      this.chippedJointWidth(column, row, y < this.height / 2 ? 2 : 3, x, this.width, footprint),
    ];
    this.jointCache = { u, v, footprint, widths };
    return widths;
  }

  /** Installed area before chipping or grout removal; the plaster bed survives every missing tile. */
  installation(u: number, v: number): number {
    if (this.share <= 0) return 0;
    if (this.share >= 1) return 1;
    return smoothStep(-0.025, 0.025, this.share - valueNoise(u * 0.23, v * 0.31, this.seed));
  }

  /** Concrete-style mineral variation beneath fine combed plaster; all scales are filtered in surface meters. */
  bed(u: number, v: number, footprint: number): { bump: number; tone: number } {
    const sweep = valueNoise(u * 1.7, v * 0.8, this.seed + 101);
    const waviness = valueNoise(u * 4, v * 1.5, this.seed + 103);
    const grit = valueNoise(u * 48, v * 51, this.seed + 109);
    const fine = valueNoise(u * 103, v * 97, this.seed + 113);
    const grainResolved = 1 - smoothStep(0.003, 0.007, footprint);
    const spacing = 0.018;
    const phase = (v + 0.065 * sweep + 0.012 * waviness + (grit - 0.5) * 0.004 * grainResolved) / spacing;
    const resolved = 1 - smoothStep(spacing / 4, spacing / 2, footprint);
    const ridge = (1 + Math.cos(phase * Math.PI * 2)) / 2;
    const comb = ridge * ridge * (1 + (grit - 0.5) * 1.2 * grainResolved);
    const pits = smoothStep(0.67, 0.85, fine);
    const mottling = this.concreteNoise(u * 0.85, v * 0.68, 4.5, footprint, this.seed + 127);
    const mineral = this.concreteNoise(u, v, 28, footprint, this.seed + 131) - 0.5;
    return {
      bump: 0.0016 * resolved * comb + mineral * 0.0012
        + grainResolved * ((grit - 0.5) * 0.0013 + (fine - 0.5) * 0.0015 - pits * 0.0008),
      tone: 0.90 + smoothStep(0.25, 0.75, mottling) * 0.20 + mineral * 0.14
        + ((fine - 0.5) * 0.07 - pits * 0.04) * grainResolved,
    };
  }

  /** Ceramic coverage with locally filtered chipped gaps; a positive footprint approximates area coverage at the current joint width. */
  coverage(u: number, v: number, footprint = 0): number {
    if (this.share <= 0) return 0;
    const { shifted, x, y } = this.tile(u, v);
    const [widthU, widthV] = this.jointWidths(u, v, footprint);
    const edge = Math.min(x - widthU, this.width - x - widthU, y - widthV, this.height - y - widthV);
    const grout = footprint > 0 ? tileCoverage(shifted, this.width, widthU, footprint) * tileCoverage(v, this.height, widthV, footprint)
      : smoothStep(-this.halfGap * 0.45, this.halfGap * 0.45, edge);
    return grout * this.retention(u, v, footprint);
  }

  /** Surviving installed ceramic before grout gaps, recomputing identity across every row or column boundary. */
  private retention(u: number, v: number, footprint: number): number {
    const { column, row } = this.tile(u, v);
    const missing = latticeHash(column, row, this.seed + 31) < this.wear * 0.06;
    if (missing) return 0;
    return this.installation(u, v) * this.damage.retention(u, v, column, row, footprint);
  }

  /** Flat tile face with a narrow millimeter-scale edge bevel; unresolved rim detail fades instead of widening. */
  relief(u: number, v: number, footprint: number): number {
    const { x, y } = this.tile(u, v);
    const size = Math.min(this.width, this.height);
    const thickness = Math.min(0.009, size * 0.08);
    const bevelWidth = Math.min(0.002, size * 0.025);
    const resolved = 1 - smoothStep(bevelWidth / 2, bevelWidth * 2, footprint);
    if (resolved === 0) return thickness;
    const [widthU, widthV] = this.jointWidths(u, v, footprint);
    const edge = Math.min(x - widthU, this.width - x - widthU, y - widthV, this.height - y - widthV);
    const bevel = smoothStep(0, bevelWidth, edge);
    return thickness - Math.min(0.0008, thickness * 0.15) * (1 - bevel) * resolved;
  }

  /** Dark grout only where nearby ceramic survives on both sides; at most four local probes near grid joints. */
  seam(u: number, v: number, footprint: number): number {
    const size = Math.min(this.width, this.height);
    const resolved = 1 - smoothStep(size / 4, size / 2, footprint);
    if (resolved === 0 || this.share <= 0) return 0;
    const { shifted, x, y } = this.tile(u, v);
    const [widthU, widthV] = this.jointWidths(u, v, footprint);
    const edgeU = Math.min(x, this.width - x), edgeV = Math.min(y, this.height - y);
    const maximumWidth = this.halfGap + this.chipWidth;
    const reach = maximumWidth + Math.min(0.006, size * 0.06);
    const margin = maximumWidth + footprint / 2;
    let vertical = 0, horizontal = 0;
    if (edgeU <= margin) {
      const joint = x < this.width / 2 ? u - x : u + this.width - x;
      const gap = 1 - tileCoverage(shifted, this.width, widthU, footprint);
      vertical = gap * Math.min(this.retention(joint - reach, v, footprint), this.retention(joint + reach, v, footprint));
    }
    if (edgeV <= margin) {
      const joint = y < this.height / 2 ? v - y : v + this.height - y;
      const gap = 1 - tileCoverage(v, this.height, widthV, footprint);
      horizontal = gap * Math.min(this.retention(u, joint - reach, footprint), this.retention(u, joint + reach, footprint));
    }
    return Math.max(vertical, horizontal) * resolved;
  }

  /** Concrete study's rotated fractal octaves, fading unresolved detail toward its mean. */
  private concreteNoise(u: number, v: number, frequency: number, footprint: number, seed: number): number {
    let fieldU = u * frequency, fieldV = v * frequency;
    let field = 0.5, amplitude = 1 / (1 + 0.28 + 0.28 ** 2);
    for (let octave = 0; octave < 3; octave++) {
      const resolved = 1 - smoothStep(0.35, 0.8, frequency * footprint);
      field += (valueNoise(fieldU, fieldV, seed) - 0.5) * amplitude * resolved;
      const nextU = (fieldU * 0.8 + fieldV * 0.6) * 2.03 + 13.7;
      fieldV = (-fieldU * 0.6 + fieldV * 0.8) * 2.03 + 9.2;
      fieldU = nextU;
      frequency *= 2.03;
      amplitude *= 0.28;
    }
    return field;
  }

  /** Soft pigment fading uses a separate stable field for each logical tile. */
  private paintFading(u: number, v: number, footprint: number): number {
    if (this.wear === 0) return 0;
    const { column, row } = this.tile(u, v);
    const tileSeed = this.seed + Math.floor(latticeHash(column, row, this.seed + 491) * 65536);
    return smoothStep(0.2, 0.8, this.concreteNoise(u, v, 9, footprint, tileSeed)) * this.wear;
  }

  /** Tile pigment, gentle fading and matte deposits; zero grime leaves fading independent of dirt. */
  appearance(u: number, v: number, footprint: number): { tint: V3; deposit: number; fade: number } {
    const { column, row, x, y } = this.tile(u, v);
    const fade = this.paintFading(u, v, footprint);
    const baseTone = (0.83 + latticeHash(column, row, this.seed + 53) * 0.17) * (1 + fade * 0.28);
    if (this.grime === 0) return { tint: [baseTone, baseTone, baseTone], deposit: 0, fade };
    const patch = fractalNoise(u * 2.1, v * 2.5, this.seed + 211, 3);
    const streak = fractalNoise(u * 8, v * 0.7, this.seed + 223, 2);
    const grain = valueNoise(u * 38, v * 38, this.seed + 227);
    const edge = Math.min(x, this.width - x, y, this.height - y);
    const edgeWidth = Math.min(0.025, this.width * 0.18, this.height * 0.18);
    const joint = 1 - smoothStep(0, edgeWidth, edge);
    const patches = smoothStep(0.62 - this.grime * 0.16, 0.79 - this.grime * 0.16,
      patch * 0.82 + streak * 0.18 + (grain - 0.5) * 0.14);
    const deposit = Math.min(0.9, this.grime * (0.07 + patches * 0.78 + joint * streak * 0.3)) * 0.25;
    const variation = latticeHash(column, row, this.seed + 233) - 0.5;
    const tone = Math.max(0.55, baseTone + this.grime * (variation * 0.07 + (patch - 0.5) * 0.03));
    const warm = this.grime * latticeHash(column, row, this.seed + 239);
    return { tint: [tone, tone * (1 - warm * 0.015), tone * (1 - warm * 0.035)], deposit, fade };
  }
}
