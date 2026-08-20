/**
 * Floorplans you can read.
 *
 * A LevelSpec written by hand is a list of rectangles in metres, and that is a
 * miserable way to copy a map you are looking at: you are converting shapes
 * into coordinates in your head, and you cannot tell whether you got it right
 * until you compile and walk it. So this is the layer above — you draw the
 * map, one character per cell, one block per storey:
 *
 *     ##########################
 *     #TTTTTT#..................
 *     #TTTTTT+......LLLLLLLLLLL#
 *     ########......L###########
 *
 * The rules are the ones you already use when reading a radar image:
 *
 *   - a letter is floor, and all cells sharing that letter are one named area
 *   - `#`, `.` and space are not floor
 *   - where two different areas touch, that is a doorway — exactly as wide as
 *     the run of cells that touch
 *   - where they do not touch, there is a wall
 *
 * That last pair is the whole trick. Openings need no separate declaration,
 * because a gap you draw in a wall *is* the opening, and the compiler's own
 * boundary rule turns the cells that touch into an opening of that width. A
 * map that took three hundred lines of rectangles takes forty lines you can
 * check against the picture at a glance.
 *
 * Areas are not rectangles. Each letter's cells are decomposed into maximal
 * rectangles on the way out, so an L-shaped site or a diagonal-ish corridor
 * costs nothing extra to draw.
 */

import { decomposeToRects, key } from '../core/grid.ts';
import type {
  CoverSpec,
  LayerSpec,
  LevelSpec,
  MarkerSpec,
  Rect,
  SpaceRole,
  SpaceSpec,
  VerticalConnectionSpec,
} from '../core/types.ts';

/** Characters that are never floor. */
const VOID = new Set(['#', '.', ' ', '\t']);

export interface PlanIssue {
  line: number;
  message: string;
}

export class PlanError extends Error {
  readonly issues: PlanIssue[];
  constructor(issues: PlanIssue[]) {
    super(issues.map((i) => `line ${i.line}: ${i.message}`).join('\n'));
    this.name = 'PlanError';
    this.issues = issues;
  }
}

interface LegendEntry {
  char: string;
  id: string;
  label?: string;
  role?: SpaceRole;
  z: number;
  height?: number;
  railing?: number;
  /** Ramp cells: the compiler is told to slope them between their neighbours. */
  ramp?: boolean;
  /** Stair cells that climb to another layer. */
  up?: string;
  /** Cover cells: not an area of their own, but blocks inside the area around them. */
  cover?: number;
  coverMaterial?: CoverSpec['material'];
  /** Marker dropped at the centroid. */
  mark?: MarkerSpec['kind'];
  team?: MarkerSpec['team'];
  line: number;
}

interface ParsedLayer {
  id: string;
  label?: string;
  z: number;
  height: number;
  roof: boolean;
  railing?: number;
  legend: Map<string, LegendEntry>;
  /** Row-major grid of characters, y increasing northward. */
  rows: string[];
  planLine: number;
}

const ROLES = new Set<string>([
  'room', 'corridor', 'lane', 'stairwell', 'site', 'spawn', 'exterior', 'balcony', 'roof',
]);

// -----------------------------------------------------------------------------
// Parsing
// -----------------------------------------------------------------------------

/**
 * A very small line-oriented format. Deliberately not YAML or JSON: the plan
 * blocks are whitespace-significant art, and every general-purpose format
 * either mangles them or demands they be quoted and escaped.
 */
export function parsePlan(text: string): { header: Record<string, string>; layers: ParsedLayer[]; directives: { line: number; parts: string[] }[] } {
  const issues: PlanIssue[] = [];
  const lines = text.split(/\r?\n/);
  const header: Record<string, string> = {};
  const layers: ParsedLayer[] = [];
  const directives: { line: number; parts: string[] }[] = [];

  let mode: 'top' | 'legend' | 'plan' = 'top';
  let layer: ParsedLayer | null = null;
  let planIndent = 0;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const n = i + 1;

    if (mode === 'plan') {
      if (raw.trim() === 'end') {
        mode = 'top';
        continue;
      }
      // Strip only the indentation the block was opened with, so leading
      // wall characters are never eaten.
      layer!.rows.push(raw.slice(planIndent).replace(/\s+$/, ''));
      continue;
    }

    const line = raw.replace(/\/\/.*$/, '').trim();
    if (!line) continue;

    if (mode === 'legend') {
      if (line === 'end') {
        mode = 'top';
        continue;
      }
      const entry = parseLegendLine(raw, n, issues);
      if (entry) {
        if (layer!.legend.has(entry.char)) issues.push({ line: n, message: `duplicate legend character '${entry.char}'` });
        layer!.legend.set(entry.char, entry);
      }
      continue;
    }

    if (line === 'legend') {
      if (!layer) issues.push({ line: n, message: 'legend before any layer' });
      else mode = 'legend';
      continue;
    }
    if (line === 'plan') {
      if (!layer) {
        issues.push({ line: n, message: 'plan before any layer' });
        continue;
      }
      mode = 'plan';
      layer.planLine = n;
      // Indentation is taken from the first non-blank row of the block.
      planIndent = 0;
      for (let j = i + 1; j < lines.length; j++) {
        if (!lines[j].trim()) continue;
        planIndent = lines[j].length - lines[j].replace(/^[ \t]+/, '').length;
        break;
      }
      continue;
    }

    if (line.startsWith('layer ')) {
      layer = parseLayerLine(line, n, issues);
      layers.push(layer);
      continue;
    }

    const kv = /^([a-z_]+):\s*(.*)$/.exec(line);
    if (kv) {
      header[kv[1]] = kv[2].trim();
      continue;
    }

    directives.push({ line: n, parts: splitArgs(line) });
  }

  if (issues.length) throw new PlanError(issues);
  return { header, layers, directives };
}

/** Split on whitespace, keeping "quoted strings" together. */
function splitArgs(line: string): string[] {
  const out: string[] = [];
  const re = /"([^"]*)"|(\S+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) out.push(m[1] ?? m[2]);
  return out;
}

function parseLayerLine(line: string, n: number, issues: PlanIssue[]): ParsedLayer {
  const parts = splitArgs(line).slice(1);
  const id = parts.shift();
  if (!id) issues.push({ line: n, message: 'layer needs an id' });
  const layer: ParsedLayer = {
    id: id ?? `layer_${n}`,
    z: 0,
    height: 4.5,
    roof: true,
    legend: new Map(),
    rows: [],
    planLine: n,
  };
  for (const p of parts) {
    const [k, v] = p.split('=');
    switch (k) {
      case 'z': layer.z = Number(v); break;
      case 'height': layer.height = Number(v); break;
      case 'roof': layer.roof = v !== 'no' && v !== 'false'; break;
      case 'railing': layer.railing = Number(v); break;
      case 'label': layer.label = v; break;
      default: issues.push({ line: n, message: `unknown layer option '${k}'` });
    }
  }
  return layer;
}

function parseLegendLine(raw: string, n: number, issues: PlanIssue[]): LegendEntry | null {
  // The character itself may be whitespace-adjacent punctuation, so take it
  // positionally: first non-space character, then the rest as arguments.
  const trimmed = raw.replace(/\/\/.*$/, '').replace(/^\s+/, '');
  if (!trimmed) return null;
  const char = trimmed[0];
  if (VOID.has(char)) {
    issues.push({ line: n, message: `'${char}' is always empty space and cannot be given a meaning` });
    return null;
  }
  const parts = splitArgs(trimmed.slice(1));
  const id = parts.shift();
  if (!id) {
    issues.push({ line: n, message: `legend entry '${char}' needs an area id` });
    return null;
  }

  const entry: LegendEntry = { char, id, z: 0, line: n };
  for (const p of parts) {
    if (/^[+-][\d.]+$/.test(p)) {
      entry.z = Number(p);
      continue;
    }
    if (ROLES.has(p)) {
      entry.role = p as SpaceRole;
      continue;
    }
    if (p === 'ramp') {
      entry.ramp = true;
      entry.role ??= 'stairwell';
      continue;
    }
    if (!p.includes('=') && !entry.label) {
      entry.label = p;
      continue;
    }
    const [k, v] = p.split('=');
    switch (k) {
      case 'h': entry.height = Number(v); break;
      case 'railing': entry.railing = Number(v); break;
      case 'up': entry.up = v; entry.role ??= 'stairwell'; break;
      case 'cover': entry.cover = Number(v); break;
      case 'as': entry.coverMaterial = v as CoverSpec['material']; break;
      case 'mark': entry.mark = v as MarkerSpec['kind']; break;
      case 'team': entry.team = v as MarkerSpec['team']; break;
      default: issues.push({ line: n, message: `unknown option '${k}' on '${char}'` });
    }
  }
  return entry;
}

// -----------------------------------------------------------------------------
// Emission
// -----------------------------------------------------------------------------

export interface PlanCompileOptions {
  /** Cell size in metres; defaults to the plan's `grid:` header or 2. */
  grid?: number;
}

/** Turn a drawn plan into a LevelSpec the ordinary compiler can take. */
export function planToSpec(text: string, opts: PlanCompileOptions = {}): LevelSpec {
  const { header, layers: parsed, directives } = parsePlan(text);
  const issues: PlanIssue[] = [];
  const grid = opts.grid ?? Number(header.grid ?? 2);

  const layers: LayerSpec[] = [];
  const covers: CoverSpec[] = [];
  const markers: MarkerSpec[] = [];
  const verticals: VerticalConnectionSpec[] = [];
  /** layer id -> space id -> cell keys, for directives that name areas. */
  const index = new Map<string, Map<string, Set<string>>>();

  for (const p of parsed) {
    const height = p.rows.length;
    const cells = new Map<string, Set<string>>();
    const charAt = new Map<string, string>();

    for (let r = 0; r < height; r++) {
      const row = p.rows[r];
      // Rows are drawn top-down but the grid is Y-up, so the first row you
      // write is the *north* edge. Anything else means the map you drew comes
      // out mirrored, which is the kind of bug you find three maps later.
      const y = height - 1 - r;
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        if (VOID.has(ch)) continue;
        const entry = p.legend.get(ch);
        if (!entry) {
          issues.push({ line: p.planLine + 1 + r, message: `'${ch}' at column ${x + 1} is not in the legend` });
          continue;
        }
        const k = key(x, y);
        charAt.set(k, ch);
        let set = cells.get(entry.id);
        if (!set) cells.set(entry.id, (set = new Set()));
        set.add(k);
      }
    }

    // Cover characters are furniture standing inside whatever area surrounds
    // them, not areas of their own — so their cells are handed to that area
    // and re-emitted as blocks on top of it.
    const coverEntries = [...p.legend.values()].filter((e) => e.cover !== undefined);
    for (const e of coverEntries) {
      const own = cells.get(e.id);
      if (!own) continue;
      cells.delete(e.id);
      const host = hostAreaFor(own, charAt, p.legend, cells);
      if (!host) {
        issues.push({ line: e.line, message: `cover '${e.char}' does not touch any area, so there is nothing to stand it on` });
        continue;
      }
      for (const k of own) cells.get(host)!.add(k);
      for (const [i, rect] of decomposeToRects(own).entries()) {
        covers.push({
          id: `${e.id}_${i}`,
          layer: p.id,
          rect: scaleRect(rect),
          height: e.cover!,
          label: e.label,
          material: e.coverMaterial ?? 'crate',
        });
      }
    }

    // A drawn ramp is a note about where the slope goes, not an area of its
    // own. The hand-authored maps put a flight's two ends inside the areas it
    // joins and let the compiler own everything between; a third space sitting
    // at one of the two elevations would only invite a wall across the mouth
    // of the ramp. So the strip is absorbed into whichever end is lower, and
    // the flight is emitted across it.
    for (const e of [...p.legend.values()].filter((x) => x.ramp || x.up)) {
      const set = cells.get(e.id);
      if (!set) continue;
      const built = flightFrom(e, set, p, cells, grid);
      if (!built) {
        issues.push({ line: e.line, message: `'${e.char}' is marked as a climb but does not join two areas` });
        continue;
      }
      verticals.push(built.vertical);
      cells.delete(e.id);
      const host = cells.get(built.absorbInto);
      if (host) for (const k of set) host.add(k);
    }

    const spaces: SpaceSpec[] = [];
    const byId = new Map<string, LegendEntry>();
    for (const e of p.legend.values()) if (!byId.has(e.id) && e.cover === undefined) byId.set(e.id, e);

    for (const [id, set] of cells) {
      const e = byId.get(id);
      const rects = decomposeToRects(set).map(scaleRect);
      if (!rects.length) continue;
      spaces.push({
        id,
        label: e?.label,
        rect: rects[0],
        extra: rects.length > 1 ? rects.slice(1) : undefined,
        role: e?.role,
        z_offset: e?.z || undefined,
        height: e?.height,
        railing: e?.railing,
      });
      if (e?.mark) {
        const c = centroid(set);
        markers.push({ id: `mark_${id}`, layer: p.id, cell: c, kind: e.mark, team: e.team, label: e.label });
      }
    }

    // Touching areas are open to each other, and only where they touch.
    const open = adjacency(cells);
    for (const s of spaces) {
      const nbrs = open.get(s.id);
      if (nbrs?.size) s.open_to = [...nbrs].sort();
    }


    layers.push({
      id: p.id,
      label: p.label,
      z: p.z,
      height: p.height,
      roof: p.roof,
      railing: p.railing,
      spaces,
    });
    index.set(p.id, cells);
  }

  if (issues.length) throw new PlanError(issues);

  const spec: LevelSpec = {
    schema_version: '1.1',
    id: header.id ?? 'untitled',
    name: header.name ?? header.id ?? 'Untitled',
    description: header.description,
    units: 'meters',
    coordinate_system: 'right-handed Z-up',
    grid,
    wall_thickness: header.wall_thickness ? Number(header.wall_thickness) : 0.32,
    floor_thickness: header.floor_thickness ? Number(header.floor_thickness) : 0.25,
    stair_style: (header.stair_style as LevelSpec['stair_style']) ?? 'ramp',
    player: { radius: 0.35, height: 1.8, step: 0.45, crouch: 1.1 },
    layers,
    vertical_connections: verticals.length ? verticals : undefined,
    covers: covers.length ? covers : undefined,
    gameplay: markers.length ? { markers } : undefined,
  };

  applyDirectives(spec, directives, index, grid);
  return spec;
}

// -----------------------------------------------------------------------------

function scaleRect(r: Rect): Rect {
  return r;
}

function centroid(set: Set<string>): [number, number] {
  let sx = 0;
  let sy = 0;
  for (const k of set) {
    const [x, y] = k.split(',').map(Number);
    sx += x;
    sy += y;
  }
  const n = set.size;
  // Snap to a cell that is actually in the set, so a marker in an L-shaped
  // room never lands in the notch.
  const cx = Math.round(sx / n);
  const cy = Math.round(sy / n);
  if (set.has(key(cx, cy))) return [cx, cy];
  let best: [number, number] = [cx, cy];
  let bestD = Infinity;
  for (const k of set) {
    const [x, y] = k.split(',').map(Number);
    const d = (x - cx) ** 2 + (y - cy) ** 2;
    if (d < bestD) {
      bestD = d;
      best = [x, y];
    }
  }
  return best;
}

/** Which area a run of cover cells is standing in. */
function hostAreaFor(
  own: Set<string>,
  charAt: Map<string, string>,
  legend: Map<string, LegendEntry>,
  cells: Map<string, Set<string>>,
): string | null {
  const votes = new Map<string, number>();
  for (const k of own) {
    const [x, y] = k.split(',').map(Number);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nk = key(x + dx, y + dy);
      const ch = charAt.get(nk);
      if (!ch) continue;
      const e = legend.get(ch);
      if (!e || e.cover !== undefined || !cells.has(e.id)) continue;
      votes.set(e.id, (votes.get(e.id) ?? 0) + 1);
    }
  }
  let best: string | null = null;
  let bestN = 0;
  for (const [id, n] of votes) {
    if (n > bestN) {
      bestN = n;
      best = id;
    }
  }
  return best;
}

/** Pairs of areas whose cells touch orthogonally. */
function adjacency(cells: Map<string, Set<string>>): Map<string, Set<string>> {
  const owner = new Map<string, string>();
  for (const [id, set] of cells) for (const k of set) owner.set(k, id);
  const out = new Map<string, Set<string>>();
  for (const [k, id] of owner) {
    const [x, y] = k.split(',').map(Number);
    for (const [dx, dy] of [[1, 0], [0, 1]] as const) {
      const other = owner.get(key(x + dx, y + dy));
      if (!other || other === id) continue;
      (out.get(id) ?? out.set(id, new Set()).get(id)!).add(other);
      (out.get(other) ?? out.set(other, new Set()).get(other)!).add(id);
    }
  }
  return out;
}

/**
 * Turn a drawn ramp or stair into a vertical connection.
 *
 * A ramp is read along its own long axis, not by which areas happen to touch
 * it: the strip you drew has two ends, and what sits beyond each end is what
 * it joins. Reading it by proximity instead means a ramp that runs alongside
 * the platform it climbs — which is most of them — picks the same cell for
 * both ends and produces a flight with no direction at all.
 */
function flightFrom(
  e: LegendEntry,
  set: Set<string>,
  layer: ParsedLayer,
  cells: Map<string, Set<string>>,
  grid: number,
): { vertical: VerticalConnectionSpec; absorbInto: string } | null {
  const pts = [...set].map((k) => k.split(',').map(Number) as [number, number]);
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const horizontal = maxX - minX >= maxY - minY;
  if (horizontal ? maxX === minX : maxY === minY) return null;

  const axis = horizontal ? 0 : 1;
  const endCells = (atLow: boolean): [number, number][] =>
    pts.filter((p) => p[axis] === (atLow ? (horizontal ? minX : minY) : horizontal ? maxX : maxY));
  const middle = (list: [number, number][]): [number, number] =>
    list.sort((a, b) => a[1 - axis] - b[1 - axis])[Math.floor(list.length / 2)];

  const lowEnd = middle(endCells(true));
  const highEnd = middle(endCells(false));

  // What lies just beyond each end, in the direction the strip points.
  const owner = new Map<string, string>();
  for (const [id, s2] of cells) for (const k of s2) owner.set(k, id);
  const beyond = (cell: [number, number], outward: number): string | undefined => {
    for (let step = 1; step <= 2; step++) {
      const probe: [number, number] = horizontal
        ? [cell[0] + outward * step, cell[1]]
        : [cell[0], cell[1] + outward * step];
      const id = owner.get(key(probe[0], probe[1]));
      if (id && id !== e.id) return id;
    }
    return undefined;
  };

  const cellBeyond = (cell: [number, number], outward: number): [number, number] | undefined => {
    for (let step = 1; step <= 2; step++) {
      const probe: [number, number] = horizontal
        ? [cell[0] + outward * step, cell[1]]
        : [cell[0], cell[1] + outward * step];
      const id = owner.get(key(probe[0], probe[1]));
      if (id && id !== e.id) return probe;
    }
    return undefined;
  };

  const aArea = beyond(lowEnd, -1);
  const bArea = beyond(highEnd, +1);
  const aCell = cellBeyond(lowEnd, -1);
  const bCell = cellBeyond(highEnd, +1);
  if (!aArea || !bArea || !aCell || !bCell || aArea === bArea) return null;

  const zOf = (id: string): number => {
    for (const l of layer.legend.values()) if (l.id === id) return l.z;
    return 0;
  };
  // The flight runs uphill, and its ends sit inside the two areas rather than
  // on the strip — the compiler reads the floor elevation at those cells, so
  // ends on the strip itself would report the same height twice and emit a
  // ramp with no rise at all.
  const uphill = zOf(bArea) >= zOf(aArea);
  const width = ((horizontal ? maxY - minY : maxX - minX) + 1) * grid;

  return {
    vertical: {
      id: `climb_${e.id}`,
      label: e.label,
      from_layer: layer.id,
      to_layer: e.up ?? layer.id,
      from_cell: uphill ? aCell : bCell,
      to_cell: uphill ? bCell : aCell,
      kind: e.up ? 'stairs' : 'ramp',
      width,
      direction: horizontal ? (uphill ? 'E' : 'W') : uphill ? 'N' : 'S',
    },
    absorbInto: uphill ? aArea : bArea,
  };
}

// -----------------------------------------------------------------------------
// Directives — the handful of things a picture cannot say
// -----------------------------------------------------------------------------

function applyDirectives(
  spec: LevelSpec,
  directives: { line: number; parts: string[] }[],
  index: Map<string, Map<string, Set<string>>>,
  grid: number,
): void {
  const issues: PlanIssue[] = [];
  const findSpace = (id: string): SpaceSpec | undefined => {
    for (const l of spec.layers) {
      const s = l.spaces.find((x) => x.id === id);
      if (s) return s;
    }
    return undefined;
  };
  const layerOf = (id: string): string | undefined => {
    for (const l of spec.layers) if (l.spaces.some((x) => x.id === id)) return l.id;
    return undefined;
  };

  for (const { line, parts } of directives) {
    const [cmd, ...args] = parts;
    switch (cmd) {
      case 'wall': {
        // `wall a b` — close a boundary the drawing left open.
        const [a, b] = args;
        const sa = findSpace(a);
        if (!sa || !findSpace(b)) {
          issues.push({ line, message: `wall between unknown areas '${a}' and '${b}'` });
          break;
        }
        sa.open_to = sa.open_to?.filter((x) => x !== b);
        const sb = findSpace(b)!;
        sb.open_to = sb.open_to?.filter((x) => x !== a);
        const layer = spec.layers.find((l) => l.spaces.includes(sa))!;
        (layer.wall_overrides ??= []).push({ between: [a, b], type: 'hard' });
        break;
      }
      case 'open': {
        const [a, b] = args;
        const sa = findSpace(a);
        const sb = findSpace(b);
        if (!sa || !sb) {
          issues.push({ line, message: `open between unknown areas '${a}' and '${b}'` });
          break;
        }
        sa.open_to = [...new Set([...(sa.open_to ?? []), b])];
        sb.open_to = [...new Set([...(sb.open_to ?? []), a])];
        break;
      }
      case 'door':
      case 'window':
      case 'arch': {
        // `door a b [width]` — a cut in a boundary that is otherwise solid.
        const [a, b, w] = args;
        const layer = spec.layers.find((l) => l.id === layerOf(a));
        if (!layer) {
          issues.push({ line, message: `${cmd} references unknown area '${a}'` });
          break;
        }
        (layer.portals ??= []).push({
          id: `${cmd}_${a}_${b}`,
          between: [a, b],
          kind: cmd === 'arch' ? 'arch' : cmd === 'window' ? 'window' : 'door',
          width_cells: w ? Number(w) : 2,
        });
        break;
      }
      case 'route': {
        // `route from to [min]` — named by area, because that is what you drew.
        // Routes are checked between markers, so an area name is resolved to
        // the marker standing in it.
        const [from, to, min] = args;
        const markers = spec.gameplay?.markers ?? [];
        const resolve = (name: string): string | undefined =>
          markers.find((m) => m.id === name)?.id ?? markers.find((m) => m.id === `mark_${name}`)?.id;
        const a = resolve(from);
        const b = resolve(to);
        if (!a || !b) {
          issues.push({
            line,
            message: `route needs a marker at each end; '${!a ? from : to}' has none (give its legend entry a mark=)`,
          });
          break;
        }
        const g = (spec.gameplay ??= {});
        (g.required_routes ??= []).push({
          id: `route_${from}_${to}`,
          from: a,
          to: b,
          min_routes: min ? Number(min) : 2,
        });
        break;
      }
      case 'mark': {
        // `mark <kind> <area> [team] [label]` — for markers not worth a legend char.
        const [kind, area, team, label] = args;
        const cells = index.get(layerOf(area) ?? '')?.get(area);
        if (!cells) {
          issues.push({ line, message: `mark on unknown area '${area}'` });
          break;
        }
        const g = (spec.gameplay ??= {});
        (g.markers ??= []).push({
          id: `mark_${kind}_${area}`,
          layer: layerOf(area)!,
          cell: centroid(cells),
          kind: kind as MarkerSpec['kind'],
          team: team as MarkerSpec['team'],
          label,
        });
        break;
      }
      case 'no_spawn_los': {
        const g = (spec.gameplay ??= {});
        (g.no_spawn_los ??= []).push([args[0], args[1]]);
        break;
      }
      case 'stairs':
      case 'ladder':
      case 'hatch': {
        // `stairs <fromLayer> <x>,<y> -> <toLayer> <x>,<y> [width]`
        const cellOf = (s: string): [number, number] => s.split(',').map(Number) as [number, number];
        const arrow = args.indexOf('->');
        if (arrow < 0) {
          issues.push({ line, message: `${cmd} needs '->' between its two ends` });
          break;
        }
        (spec.vertical_connections ??= []).push({
          id: `${cmd}_${line}`,
          from_layer: args[0],
          from_cell: cellOf(args[1]),
          to_layer: args[arrow + 1],
          to_cell: cellOf(args[arrow + 2]),
          kind: cmd,
          width: args[arrow + 3] ? Number(args[arrow + 3]) : 2 * grid,
        });
        break;
      }
      default:
        issues.push({ line, message: `unknown directive '${cmd}'` });
    }
  }
  if (issues.length) throw new PlanError(issues);
}
