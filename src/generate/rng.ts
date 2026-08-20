/**
 * Seeded randomness.
 *
 * A generated level has to be reproducible: the same seed must give the same
 * map, or a bug found in play cannot be brought back to the compiler. Nothing
 * in the generator is allowed to call `Math.random`.
 */

export class Rng {
  private s: number;

  constructor(seed: number | string) {
    this.s = typeof seed === 'number' ? seed >>> 0 : hashString(seed);
    if (this.s === 0) this.s = 0x9e3779b9;
  }

  /** xorshift32 — small, fast, and good enough to lay out a map with. */
  next(): number {
    let x = this.s;
    x ^= x << 13;
    x >>>= 0;
    x ^= x >> 17;
    x ^= x << 5;
    x >>>= 0;
    this.s = x;
    return x / 0x100000000;
  }

  /** Integer in `[lo, hi]`. */
  int(lo: number, hi: number): number {
    return lo + Math.floor(this.next() * (hi - lo + 1));
  }

  float(lo: number, hi: number): number {
    return lo + this.next() * (hi - lo);
  }

  bool(chance = 0.5): boolean {
    return this.next() < chance;
  }

  pick<T>(items: readonly T[]): T {
    return items[Math.floor(this.next() * items.length)];
  }

  /** Pick `count` distinct items, or all of them if there are fewer. */
  sample<T>(items: readonly T[], count: number): T[] {
    const pool = [...items];
    const out: T[] = [];
    while (out.length < count && pool.length) out.push(...pool.splice(Math.floor(this.next() * pool.length), 1));
    return out;
  }

  shuffle<T>(items: T[]): T[] {
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
  }

  /** A weighted pick: `[item, weight]` pairs. */
  weighted<T>(entries: readonly (readonly [T, number])[]): T {
    const total = entries.reduce((a, [, w]) => a + w, 0);
    let roll = this.next() * total;
    for (const [item, w] of entries) {
      roll -= w;
      if (roll <= 0) return item;
    }
    return entries[entries.length - 1][0];
  }
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** A short, human-sayable seed, so a run can be shared or replayed. */
export function seedWord(rng: Rng): string {
  const a = ['iron', 'cold', 'red', 'deep', 'salt', 'ash', 'glass', 'dry', 'black', 'high', 'low', 'far'];
  const b = ['gate', 'yard', 'vault', 'span', 'works', 'reach', 'hollow', 'ridge', 'well', 'quarter', 'basin', 'line'];
  return `${rng.pick(a)}-${rng.pick(b)}-${rng.int(100, 999)}`;
}
