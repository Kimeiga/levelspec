/** Evaluates the existing wall finish lattice hash without changing seeded visual patterns. */
function wallLattice(x: number, y: number, seed: number): number {
  const value = Math.sin(x * 127.1 + y * 311.7 + seed * 17.3) * 43758.5453;
  return value - Math.floor(value);
}

/** Smooth wall noise in [0, 1), continuous across triangles and independent of tessellation. */
export function wallNoise(x: number, y: number, seed: number): number {
  const ix = Math.floor(x), iy = Math.floor(y);
  const tx = x - ix, ty = y - iy;
  const u = tx * tx * (3 - 2 * tx), v = ty * ty * (3 - 2 * ty);
  const low = wallLattice(ix, iy, seed) * (1 - u) + wallLattice(ix + 1, iy, seed) * u;
  const high = wallLattice(ix, iy + 1, seed) * (1 - u) + wallLattice(ix + 1, iy + 1, seed) * u;
  return low * (1 - v) + high * v;
}

/**
 * Binds one seed and reuses the last lattice cell's four corner hashes. Each
 * caller owns its constant-size cache; sampling order cannot change the result.
 */
export function createWallNoise(seed: number): (x: number, y: number) => number {
  let cellX = NaN, cellY = NaN;
  let bottomLeft = 0, bottomRight = 0, topLeft = 0, topRight = 0;
  return (x, y) => {
    const ix = Math.floor(x), iy = Math.floor(y);
    if (ix !== cellX || iy !== cellY) {
      cellX = ix; cellY = iy;
      bottomLeft = wallLattice(ix, iy, seed);
      bottomRight = wallLattice(ix + 1, iy, seed);
      topLeft = wallLattice(ix, iy + 1, seed);
      topRight = wallLattice(ix + 1, iy + 1, seed);
    }
    const tx = x - ix, ty = y - iy;
    const u = tx * tx * (3 - 2 * tx), v = ty * ty * (3 - 2 * ty);
    const low = bottomLeft * (1 - u) + bottomRight * u;
    const high = topLeft * (1 - u) + topRight * u;
    return low * (1 - v) + high * v;
  };
}
