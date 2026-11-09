/** A tile's area-weighted world-space vertex normal sums, owned exclusively by the cache. */
export interface CachedTerrainNormals {
  vertices: Uint32Array;
  normals: Float64Array;
}

/** Byte-bounded LRU of derived terrain data. Reads and writes copy caller-owned arrays. */
export class TerrainTileCache {
  private readonly entries = new Map<string, CachedTerrainNormals>();
  private bytes = 0;
  private readonly maximumBytes: number;
  constructor(maximumBytes = 128 * 1024 * 1024) {
    this.maximumBytes = maximumBytes;
    if (!Number.isSafeInteger(maximumBytes) || maximumBytes < 0)
      throw new RangeError(
        "Terrain cache capacity must be a nonnegative safe integer.",
      );
  }

  /** Returns an independent tile snapshot and makes its entry most recently used. */
  get(key: string): CachedTerrainNormals | undefined {
    const entry = this.entries.get(key);
    if (!entry) return;
    this.entries.delete(key);
    this.entries.set(key, entry);
    return { vertices: entry.vertices.slice(), normals: entry.normals.slice() };
  }

  /** Admits a complete tile, evicting older entries within the configured byte capacity. */
  set(key: string, value: CachedTerrainNormals): void {
    const size =
      value.vertices.byteLength + value.normals.byteLength + key.length * 2;
    if (size > this.maximumBytes) return;
    const previous = this.entries.get(key);
    if (previous) {
      this.bytes -=
        previous.vertices.byteLength +
        previous.normals.byteLength +
        key.length * 2;
      this.entries.delete(key);
    }
    while (this.bytes + size > this.maximumBytes && this.entries.size) {
      const [oldKey, old] = this.entries.entries().next().value!;
      this.entries.delete(oldKey);
      this.bytes -=
        old.vertices.byteLength + old.normals.byteLength + oldKey.length * 2;
    }
    this.entries.set(key, {
      vertices: value.vertices.slice(),
      normals: value.normals.slice(),
    });
    this.bytes += size;
  }
}
