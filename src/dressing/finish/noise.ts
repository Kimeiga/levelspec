/**
 * Deterministic scalar fields shared by the wall condition, the ground pass
 * and contact weathering. Each is a pure function of its coordinates and
 * seed, so a value never depends on which triangle, host or tessellation
 * asked for it.
 */

/** Hashes an integer lattice point and seed to a uniform value in [0, 1). */
export function latticeHash(x: number, y: number, seed: number): number {
  let h =
    Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ (seed | 0);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Smooth value noise in [0, 1] with one lattice cell per coordinate unit. */
export function valueNoise(x: number, y: number, seed: number): number {
  const ix = Math.floor(x),
    iy = Math.floor(y);
  let u = x - ix,
    v = y - iy;
  u = u * u * (3 - 2 * u);
  v = v * v * (3 - 2 * v);
  const low =
    latticeHash(ix, iy, seed) * (1 - u) + latticeHash(ix + 1, iy, seed) * u;
  const high =
    latticeHash(ix, iy + 1, seed) * (1 - u) +
    latticeHash(ix + 1, iy + 1, seed) * u;
  return low * (1 - v) + high * v;
}

/** Lists endpoints and lattice crossings; smooth bilinear cells attain extrema at these clipped corners. */
function latticeCoordinates(low: number, high: number): number[] {
  const values = [low];
  for (let value = Math.floor(low) + 1; value < high; value++) values.push(value);
  if (high !== low) values.push(high);
  return values;
}

/** Bounds every value of smooth noise over a finite rectangle, including partial lattice cells. */
export function valueNoiseRange(bounds: readonly [number, number, number, number], seed: number): [number, number] {
  const [x0, y0, x1, y1] = bounds;
  if (!bounds.every(Number.isFinite) || x0 > x1 || y0 > y1) throw new Error("Noise bounds require a finite ordered rectangle.");
  // A loose global interval remains a proof for enormous rectangles without unbounded planning work.
  if (bounds.some(value => Math.abs(value) >= Number.MAX_SAFE_INTEGER - 1)
    || (Math.floor(x1) - Math.floor(x0) + 2) * (Math.floor(y1) - Math.floor(y0) + 2) > 4096) return [0, 1];
  let minimum = Infinity, maximum = -Infinity;
  const xs = latticeCoordinates(x0, x1), ys = latticeCoordinates(y0, y1);
  for (const x of xs) for (const y of ys) {
    const value = valueNoise(x, y, seed);
    minimum = Math.min(minimum, value); maximum = Math.max(maximum, value);
  }
  return [Math.max(0, minimum - Number.EPSILON * 16), Math.min(1, maximum + Number.EPSILON * 16)];
}

/**
 * Smooth value noise in [0, 1] over three coordinates, one lattice cell per
 * unit. Unlike noise on coordinate planes it varies in every direction on
 * floors, walls and slopes of any heading.
 */
export function valueNoise3(x: number, y: number, z: number, seed: number): number {
  const iz = Math.floor(z);
  let w = z - iz;
  w = w * w * (3 - 2 * w);
  // Layers of a 3D lattice are 2D lattices with a seed offset per layer.
  const low = valueNoise(x, y, seed + iz * 7919);
  const high = valueNoise(x, y, seed + (iz + 1) * 7919);
  return low * (1 - w) + high * w;
}

/**
 * Sums `octaves` layers of value noise, each twice as fine and half as strong
 * as the one before, normalized to [0, 1]. Unlike a product of sines it has no
 * period, so large surfaces do not repeat a recognizable blotch.
 */
export function fractalNoise(
  x: number,
  y: number,
  seed: number,
  octaves = 3,
): number {
  let sum = 0,
    weight = 0,
    amplitude = 1,
    frequency = 1;
  for (let octave = 0; octave < octaves; octave++) {
    // Offsetting each octave keeps their lattices from lining up at the origin.
    sum +=
      amplitude *
      valueNoise(
        x * frequency + octave * 17.31,
        y * frequency + octave * 9.73,
        seed + octave * 131,
      );
    weight += amplitude;
    amplitude /= 2;
    frequency *= 2;
  }
  return sum / weight;
}

/** Conservatively combines each octave's interval using the same positive amplitudes and phase offsets as the field. */
export function fractalNoiseRange(bounds: readonly [number, number, number, number], seed: number, octaves = 3): [number, number] {
  if (!Number.isInteger(octaves) || octaves < 1) throw new Error("Noise ranges require a positive octave count.");
  let minimum = 0, maximum = 0, weight = 0, amplitude = 1, frequency = 1;
  for (let octave = 0; octave < octaves; octave++) {
    const range = valueNoiseRange([
      bounds[0] * frequency + octave * 17.31, bounds[1] * frequency + octave * 9.73,
      bounds[2] * frequency + octave * 17.31, bounds[3] * frequency + octave * 9.73,
    ], seed + octave * 131);
    minimum += amplitude * range[0]; maximum += amplitude * range[1]; weight += amplitude;
    amplitude /= 2; frequency *= 2;
  }
  return [Math.max(0, minimum / weight - Number.EPSILON * 16), Math.min(1, maximum / weight + Number.EPSILON * 16)];
}

/** Eases from 0 at `low` to 1 at `high`; the bounds may be given in either order. */
export function smoothStep(low: number, high: number, value: number): number {
  const t = Math.max(0, Math.min(1, (value - low) / (high - low)));
  return t * t * (3 - 2 * t);
}
