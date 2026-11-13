import { latticeHash, smoothStep, valueNoise } from "./noise.ts";

interface Contour {
  radiusU: number;
  radiusV: number;
  cosine: number;
  sine: number;
  seed: number;
}

interface DamageBlob {
  u: number;
  v: number;
  seed: number;
  contours: [Contour, Contour, Contour];
}

const CELL = 1.6;
const CACHE_SIZE = 64;

/**
 * Localized ceramic loss in surface meters. Every blob has three contours sharing
 * one center; each logical tile chooses one contour independently for each blob.
 * Only the surrounding nine cells can contribute, and cached plans stay bounded.
 */
export class TileDamageBlobs {
  private readonly seed: number;
  private readonly wear: number;
  private readonly blobs = new Map<string, DamageBlob | undefined>();
  private neighborhood?: { column: number; row: number; blobs: DamageBlob[] };

  constructor(seed: number, wear: number) {
    this.seed = seed;
    this.wear = wear;
  }

  /** Plans all three related shapes once; no contour variant changes the blob's center. */
  private blob(column: number, row: number): DamageBlob | undefined {
    const key = `${column}/${row}`;
    if (this.blobs.has(key)) return this.blobs.get(key);
    const random = (stream: number) => latticeHash(column, row, this.seed + stream);
    let blob: DamageBlob | undefined;
    if (random(107) < this.wear * 0.95) {
      const seed = Math.floor(random(109) * 0x7fffffff);
      const angle = random(113) * Math.PI * 2;
      const growth = 0.55 + this.wear * 0.45;
      const radiusU = (0.32 + random(127) * 0.34) * growth;
      const radiusV = (0.25 + random(131) * 0.34) * growth;
      const contour = (variant: number): Contour => {
        const shape = (stream: number) => latticeHash(variant, stream, seed);
        const rotation = angle + (shape(3) - 0.5) * 0.5;
        return { radiusU: radiusU * (0.8 + shape(5) * 0.38), radiusV: radiusV * (0.8 + shape(7) * 0.38),
          cosine: Math.cos(rotation), sine: Math.sin(rotation), seed: seed + variant * 3571 };
      };
      blob = { u: (column + 0.18 + random(137) * 0.64) * CELL,
        v: (row + 0.18 + random(139) * 0.64) * CELL, seed,
        contours: [contour(0), contour(1), contour(2)] };
    }
    if (this.blobs.size >= CACHE_SIZE) this.blobs.clear();
    this.blobs.set(key, blob);
    return blob;
  }

  /** Retains at most nine immutable candidates while adjacent texels stay in the same physical cell. */
  private candidates(column: number, row: number): DamageBlob[] {
    const cached = this.neighborhood;
    if (cached?.column === column && cached.row === row) return cached.blobs;
    const blobs: DamageBlob[] = [];
    for (let x = column - 1; x <= column + 1; x++) for (let y = row - 1; y <= row + 1; y++) {
      const blob = this.blob(x, y);
      if (blob) blobs.push(blob);
    }
    this.neighborhood = { column, row, blobs };
    return blobs;
  }

  /** Returns retained ceramic coverage, with one stable contour choice throughout a logical tile. */
  retention(u: number, v: number, tileColumn: number, tileRow: number, footprint = 0): number {
    if (this.wear === 0) return 1;
    const column = Math.floor(u / CELL), row = Math.floor(v / CELL);
    const feather = Math.max(0.002, Math.min(footprint, 0.05) * 0.5);
    let damage = 0;
    for (const blob of this.candidates(column, row)) {
      const variant = Math.floor(latticeHash(tileColumn, tileRow, blob.seed + 151) * 3);
      const contour = blob.contours[variant];
      const du = u - blob.u, dv = v - blob.v;
      const a = (du * contour.cosine + dv * contour.sine) / contour.radiusU;
      const b = (-du * contour.sine + dv * contour.cosine) / contour.radiusV;
      const radius = Math.hypot(a, b);
      // Maximum shape radius including filtering is below CELL; farther cells cannot reach this point.
      const minimumRadius = Math.min(contour.radiusU, contour.radiusV);
      if ((radius - 1.31) * minimumRadius > feather) continue;
      const shared = (valueNoise(u * 4.5, v * 4.5, blob.seed) - 0.5) * 0.24;
      const fractured = (valueNoise(u * 9, v * 9, contour.seed + 163) - 0.5) * 0.3
        + (valueNoise(u * 31, v * 31, contour.seed + 167) - 0.5) * 0.08;
      const distance = (1 + shared + fractured - radius) * minimumRadius;
      damage = Math.max(damage, smoothStep(-feather, feather, distance));
    }
    return 1 - damage;
  }
}
