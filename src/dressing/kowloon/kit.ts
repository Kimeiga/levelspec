import { Rng } from "../../generate/rng.ts";
import type { SignDesk } from "./signs/book.ts";

/** How strongly each detail level scales the chance of an optional part. */
const DETAIL_SCALE = [0.4, 1, 1.4];

/**
 * Shared generation settings. Every optional part decides its presence from a
 * random stream named by its own path and draws its geometry from another, so
 * raising `detail` only adds parts: nothing already present moves or changes.
 */
export class Kit {
  readonly seed: string;
  /** 0 low, 1 medium, 2 high. */
  readonly detail: number;
  readonly grime: number;
  readonly wear: number;
  readonly rust: number;
  /** True when a glyph atlas material is available for lettering. */
  readonly lettering: boolean;
  /** Appearance-map density in texels per meter; defaults to 64 independently of mesh detail. */
  readonly textureDensity: number;
  /**
   * Where this kit's signs are proposed for the survey that decides which
   * are built. Without a desk every sign is drawn as soon as it is offered.
   */
  signs?: SignDesk;

  constructor(
    seed: string,
    detail: number,
    grime: number,
    wear: number,
    lettering: boolean,
    textureDensity?: number,
    rust = wear,
  ) {
    this.seed = seed;
    this.detail = detail;
    this.grime = grime;
    this.wear = wear;
    this.rust = rust;
    this.lettering = lettering;
    this.textureDensity = textureDensity ?? 64;
  }

  /** Returns the independent random stream named by `key`. */
  rng(key: string): Rng {
    return new Rng(`${this.seed}/${key}`);
  }

  /**
   * Decides whether the optional part named by `key` is present. `chance` is
   * its medium-detail probability; low detail thins and high detail thickens.
   */
  has(key: string, chance: number): boolean {
    return this.rng(`${key}?`).next() < chance * DETAIL_SCALE[this.detail];
  }

  /**
   * Decides an optional part that excludes others or reserves space. `shown`
   * is `has`; `planned` tells whether it is present at the highest detail.
   * Choosing alternatives by `planned` means a part that appears at higher
   * detail never displaces one shown at lower detail.
   */
  option(key: string, chance: number): { planned: boolean; shown: boolean } {
    const roll = this.rng(`${key}?`).next();
    return {
      planned: roll < chance * DETAIL_SCALE.at(-1)!,
      shown: roll < chance * DETAIL_SCALE[this.detail],
    };
  }
}
