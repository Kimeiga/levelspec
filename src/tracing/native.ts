/** Native radar proposals. Raster cells describe evidence, never legacy plan syntax. */
import { ArchitectureBuilder } from "../architecture/builder.ts";
import { aborted, type V3 } from "../vector/types.ts";
import {
  produceDocument,
  type ProducerOptions,
} from "../architecture/producer.ts";

/** Tracing bounds derived native objects before compilation. */
export interface TraceOptions extends ProducerOptions {
  maximumElements?: number;
}

export interface RasterTrace {
  format: "levelspec-raster/1";
  id: string;
  name: string;
  sourceImage: string;
  grid: number;
  colors: [number, number, number][];
  /** North-first rows; null is void and numbers index colors. */
  rows: (number | null)[][];
}

function metadata(t: RasterTrace) {
  return (
    t.format === "levelspec-raster/1" &&
    [t.id, t.name, t.sourceImage].every(
      (v) => typeof v === "string" && v.length > 0,
    ) &&
    Number.isFinite(t.grid) &&
    t.grid >= 0.001
  );
}
function rgb(c: unknown) {
  return (
    Array.isArray(c) &&
    c.length === 3 &&
    c.every((n) => Number.isFinite(n) && n >= 0 && n <= 255)
  );
}
function bandCell(c: unknown, bands: number) {
  return (
    c === null ||
    (typeof c === "number" && Number.isInteger(c) && c >= 0 && c < bands)
  );
}
function rowMatches(row: unknown, width: number, bands: number) {
  return (
    Array.isArray(row) &&
    row.length === width &&
    row.every((c) => bandCell(c, bands))
  );
}
function rectangular(rows: unknown, bands: number): boolean {
  if (
    !Array.isArray(rows) ||
    !rows.length ||
    rows.length > 1024 ||
    !Array.isArray(rows[0])
  )
    return false;
  const width = rows[0].length;
  return (
    width > 0 &&
    width <= 1024 &&
    rows.every((row) => rowMatches(row, width, bands)) &&
    rows.some((row) => row.some((c: unknown) => c !== null))
  );
}
function checked(value: unknown): RasterTrace {
  const fail = (): never => {
    throw new Error(
      "Invalid raster trace: expected levelspec-raster/1 metadata, positive grid, RGB colors and rectangular band rows containing floor.",
    );
  };
  if (!value || typeof value !== "object") return fail();
  const t = value as RasterTrace;
  if (
    !metadata(t) ||
    !Array.isArray(t.colors) ||
    !t.colors.length ||
    !t.colors.every(rgb) ||
    !rectangular(t.rows, t.colors.length)
  )
    return fail();
  return t;
}

interface Tile {
  band: number;
  x: number;
  y: number;
  w: number;
  h: number;
}
/** Merge identical horizontal runs vertically. Voids stay absent, including enclosed courtyards. */
function tiles(
  t: RasterTrace,
  maximumElements: number,
  signal?: AbortSignal,
): Tile[] {
  const result: Tile[] = [],
    width = t.rows[0].length;
  let active = new Map<string, Tile>();
  let admitted = 0;
  for (let y = 0; y < t.rows.length; y++) {
    aborted(signal);
    const row = t.rows[t.rows.length - 1 - y],
      next = new Map<string, Tile>();
    for (let x = 0; x < width;) {
      const band = row[x],
        start = x++;
      while (x < width && row[x] === band) x++;
      if (band === null) continue;
      const w = x - start,
        key = `${band}:${start}:${w}`,
        previous = active.get(key);
      if (!previous && ++admitted > maximumElements)
        throw new Error("Trace element budget exceeded.");
      const tile = previous ?? { band, x: start, y, w, h: 0 };
      tile.h++;
      next.set(key, tile);
      active.delete(key);
    }
    result.push(...active.values());
    active = next;
  }
  return [...result, ...active.values()];
}

function boundary(
  { x, y, w, h }: Tile,
  grid: number,
  signal?: AbortSignal,
): V3[] {
  // Retain cell-boundary vertices so neighbouring tiles share exactly the same
  // edges, including partial runs and T junctions. No inferred links.
  const points: V3[] = [],
    point = (x: number, y: number) => {
      aborted(signal);
      points.push([x * grid, y * grid, 0]);
    };
  for (let dx = 0; dx < w; dx++) point(x + dx, y);
  for (let dy = 0; dy < h; dy++) point(x + w, y + dy);
  for (let dx = w; dx > 0; dx--) point(x + dx, y + h);
  for (let dy = h; dy > 0; dy--) point(x, y + dy);
  return points;
}

function allocator(documentId: string) {
  const used = new Set([documentId]);
  return (base: string) => {
    let id = base;
    while (used.has(id)) id = "_" + id;
    used.add(id);
    return id;
  };
}

/** Proposal only; use produceTrace to establish runtime readiness. */
export function traceToDocument(
  input: RasterTrace,
  options: TraceOptions = {},
) {
  aborted(options.signal);
  const maximumElements = options.maximumElements ?? 100_000;
  if (!Number.isSafeInteger(maximumElements) || maximumElements < 1)
    throw new RangeError(
      "Trace element budget must be a positive safe integer.",
    );
  const t = checked(input),
    id = t.id.replace(/[^\w.:/-]/g, "_");
  const scene = new ArchitectureBuilder(
      /^[A-Za-z_]/.test(id) ? id : "id_" + id,
    ),
    d = scene.document;
  // The builder's unused default material can itself collide with a document
  // named "default". Reserve the document ID before allocating trace objects.
  d.materials = [];
  const allocate = allocator(d.id),
    namespace = d.id.startsWith("trace/") ? "_trace" : "trace";
  d.name = t.name;
  d.description = `Footprint traced from ${t.sourceImage}. Color bands are provisional areas; elevations and gameplay require authoring.`;
  // Preserve the tracer's historical capsule, rather than the smaller native default.
  d.player = {
    ...d.player,
    radius: 0.35,
    height: 1.8,
    step: 0.45,
    crouch: 1.1,
    vault: 0,
  };
  const owners = new Map<string, { a: V3; b: V3; count: number }>(),
    floorTiles = tiles(t, maximumElements, options.signal),
    materials = new Map<number, string>();
  if (
    1 +
      floorTiles.reduce(
        (count, tile) => count + 1 + 2 * tile.w + 2 * tile.h,
        0,
      ) >
    maximumElements
  )
    throw new Error("Trace element budget exceeded.");
  for (const band of new Set(floorTiles.map((tile) => tile.band))) {
    const id = allocate(`band_${band}`);
    materials.set(band, id);
    d.materials.push({
      id,
      repeat: 1,
      roughness: 1,
      metalness: 0,
      color:
        "#" +
        t.colors[band]
          .map((n) => Math.round(n).toString(16).padStart(2, "0"))
          .join(""),
    });
  }
  for (const [i, tile] of floorTiles.entries()) {
    const id = `${namespace}/floor_${i}`,
      points = boundary(tile, t.grid, options.signal),
      profile = scene.profile(`${id}:profile`, points);
    scene.slab(id, profile.id, {
      material: materials.get(tile.band),
      thickness: 0.2,
      area: `area_${tile.band}`,
      label: `Area ${tile.band + 1}`,
    });
    for (let j = 0; j < points.length; j++) {
      const a = points[j],
        b = points[(j + 1) % points.length],
        key = [a.join(","), b.join(",")].sort().join("|");
      const prior = owners.get(key);
      if (prior) prior.count++;
      else owners.set(key, { a, b, count: 1 });
    }
  }
  let wall = 0;
  for (const edge of owners.values())
    if (edge.count === 1) {
      const id = `${namespace}/wall_${wall++}`,
        path = scene.path(`${id}:path`, [edge.a, edge.b]);
      scene.wall(id, path.id, { height: 5, thickness: 0.32 });
    }
  scene.assembly(allocate("ground"), [...d.elements]);
  return d;
}

export async function produceTrace(
  trace: RasterTrace,
  options: TraceOptions = {},
) {
  aborted(options.signal);
  return produceDocument(traceToDocument(trace, options), options);
}
