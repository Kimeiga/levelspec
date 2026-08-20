/**
 * A guarded way to write a LevelSpec.
 *
 * The compiler's validators will reject a bad spec, but a generator that
 * produces one in three attempts is a generator you cannot ship. Everything
 * this builder exposes refuses the mistakes the compiler has already caught
 * once: spaces that overlap, cover buried in a wall, stairs that run into one,
 * markers standing on a crate.
 */

import type {
  CoverSpec,
  LayerSpec,
  LevelSpec,
  MarkerSpec,
  PortalSpec,
  Rect,
  SpaceSpec,
  VerticalConnectionSpec,
  WallType,
} from '../core/types.ts';
import { key, rectCells } from '../core/grid.ts';
import type { Rng } from './rng.ts';

export interface LayerOptions {
  z: number;
  height: number;
  roof?: boolean;
  internalWalls?: boolean;
  railing?: number;
}

export interface SpaceOptions {
  label?: string;
  role?: SpaceSpec['role'];
  zOffset?: number;
  railing?: number;
  extra?: Rect[];
  subtract?: Rect[];
}

interface LayerState {
  spec: LayerSpec;
  headroom: number;
  /** cellKey -> space id */
  occ: Map<string, string>;
  /** cellKey -> what is standing there (cover, stair footprint, marker) */
  taken: Map<string, string>;
}

export class Builder {
  readonly spec: LevelSpec;
  private layers = new Map<string, LayerState>();
  private rng: Rng;

  constructor(
    rng: Rng,
    meta: { id: string; name: string; description?: string; grid?: number; wallThickness?: number },
  ) {
    this.rng = rng;
    this.spec = {
      schema_version: '1.1',
      id: meta.id,
      name: meta.name,
      description: meta.description,
      units: 'meters',
      coordinate_system: 'right-handed Z-up',
      grid: meta.grid ?? 1,
      wall_thickness: meta.wallThickness ?? 0.28,
      floor_thickness: 0.22,
      player: { radius: 0.35, height: 1.8, step: 0.45, crouch: 1.1 },
      layers: [],
      vertical_connections: [],
      covers: [],
      gameplay: { mode: 'roguelike', move_speed: 5.2, markers: [], required_routes: [] },
    };
  }

  // -------------------------------------------------------------------------
  // Structure
  // -------------------------------------------------------------------------

  layer(id: string, opts: LayerOptions, label?: string): this {
    const spec: LayerSpec = {
      id,
      label,
      z: opts.z,
      height: opts.height,
      spaces: [],
      portals: [],
      wall_overrides: [],
    };
    if (opts.roof === false) spec.roof = false;
    if (opts.internalWalls === false) spec.internal_walls = false;
    if (opts.railing !== undefined) spec.railing = opts.railing;
    this.spec.layers.push(spec);
    this.layers.set(id, { spec, occ: new Map(), taken: new Map(), headroom: opts.height });
    return this;
  }

  /** Add a space. Returns false and adds nothing if it would overlap. */
  space(layerId: string, id: string, rect: Rect, opts: SpaceOptions = {}): boolean {
    const st = this.layers.get(layerId);
    if (!st) return false;
    const cells: string[] = [];
    for (const [x, y] of rectCells(rect)) cells.push(key(x, y));
    for (const r of opts.extra ?? []) for (const [x, y] of rectCells(r)) cells.push(key(x, y));
    const drop = new Set<string>();
    for (const r of opts.subtract ?? []) for (const [x, y] of rectCells(r)) drop.add(key(x, y));
    const final = cells.filter((c) => !drop.has(c));
    if (final.some((c) => st.occ.has(c))) return false;

    const sp: SpaceSpec = { id, rect };
    if (opts.label) sp.label = opts.label;
    if (opts.role) sp.role = opts.role;
    if (opts.zOffset) sp.z_offset = opts.zOffset;
    if (opts.railing !== undefined) sp.railing = opts.railing;
    if (opts.extra?.length) sp.extra = opts.extra;
    if (opts.subtract?.length) sp.subtract = opts.subtract;
    st.spec.spaces.push(sp);
    for (const c of final) st.occ.set(c, id);
    return true;
  }

  wall(layerId: string, a: string, b: string, type: WallType, within?: Rect): this {
    const st = this.layers.get(layerId);
    if (st) st.spec.wall_overrides!.push(within ? { between: [a, b], type, within } : { between: [a, b], type });
    return this;
  }

  portal(layerId: string, p: PortalSpec): this {
    this.layers.get(layerId)?.spec.portals!.push(p);
    return this;
  }

  /** A hard wall with a single opening cut in it — the usual chokepoint. */
  gate(
    layerId: string,
    a: string,
    b: string,
    id: string,
    width: number,
    hint: [number, number],
    kind: PortalSpec['kind'] = 'arch',
  ): this {
    this.wall(layerId, a, b, 'hard');
    this.portal(layerId, { id, between: [a, b], kind, width_cells: width, hint });
    return this;
  }

  // -------------------------------------------------------------------------
  // Contents
  // -------------------------------------------------------------------------

  /** Cells of a space that are safe to build on: inset from every edge. */
  interior(layerId: string, spaceId: string, inset = 1): [number, number][] {
    const st = this.layers.get(layerId);
    if (!st) return [];
    const out: [number, number][] = [];
    for (const [k, owner] of st.occ) {
      if (owner !== spaceId) continue;
      const i = k.indexOf(',');
      const x = Number(k.slice(0, i));
      const y = Number(k.slice(i + 1));
      let ok = true;
      for (let dx = -inset; dx <= inset && ok; dx++)
        for (let dy = -inset; dy <= inset && ok; dy++)
          if (st.occ.get(key(x + dx, y + dy)) !== spaceId) ok = false;
      if (ok) out.push([x, y]);
    }
    return out;
  }

  /** Place a box of cover. Refuses if it would touch a wall or anything else. */
  cover(
    layerId: string,
    id: string,
    rect: Rect,
    height: number,
    opts: { material?: CoverSpec['material']; label?: string; zOffset?: number; overhead?: boolean } = {},
  ): boolean {
    const st = this.layers.get(layerId);
    if (!st) return false;
    const cells: string[] = [];
    let space: string | null = null;
    for (const [x, y] of rectCells(rect)) {
      const k = key(x, y);
      if (st.taken.has(k)) return false;
      cells.push(k);
      const owner = st.occ.get(k);
      if (!owner) return false;
      if (space === null) space = owner;
      else if (space !== owner) return false; // straddles a boundary
      // Same space all the way round, not merely occupied: a wall exists
      // between two spaces even where both sides have floor, and a box
      // reaching across it lands inside the wall band.
      for (let dx = -1; dx <= 1; dx++)
        for (let dy = -1; dy <= 1; dy++) if (st.occ.get(key(x + dx, y + dy)) !== space) return false;
    }
    // Never let a pillar or a beam reach the slab above: that is an
    // intersecting pair, and the validator is right to refuse it.
    const lift = opts.zOffset ?? 0;
    const room = st.headroom - lift - 0.25;
    if (room <= 0.2) return false;
    const c: CoverSpec = { id, layer: layerId, rect, height: Math.min(height, room) };
    if (opts.material) c.material = opts.material;
    if (opts.label) c.label = opts.label;
    if (opts.zOffset) c.z_offset = opts.zOffset;
    this.spec.covers!.push(c);
    for (const k of cells) st.taken.set(k, id);
    return true;
  }

  /**
   * A flight between two points. Refuses unless the whole footprint sits at
   * least one cell inside both spaces, which is what keeps it out of walls.
   */
  flight(
    v: Omit<VerticalConnectionSpec, 'kind'> & { kind: VerticalConnectionSpec['kind'] },
  ): boolean {
    const from = this.layers.get(v.from_layer);
    const to = this.layers.get(v.to_layer);
    if (!from || !to) return false;

    const dx = v.to_cell[0] - v.from_cell[0];
    const dy = v.to_cell[1] - v.from_cell[1];
    const dir =
      v.direction ?? (Math.abs(dx) >= Math.abs(dy) && dx !== 0 ? (dx > 0 ? 'E' : 'W') : dy > 0 ? 'N' : 'S');
    const widthCells = Math.max(1, Math.round((v.width ?? 2) / (this.spec.grid ?? 1)));
    const runCells = Math.max(1, Math.abs(dir === 'E' || dir === 'W' ? dx : dy) + 1);
    const halfLeft = Math.floor((widthCells - 1) / 2);
    const foot: Rect =
      dir === 'E'
        ? [v.from_cell[0], v.from_cell[1] - halfLeft, runCells, widthCells]
        : dir === 'W'
          ? [v.from_cell[0] - runCells + 1, v.from_cell[1] - halfLeft, runCells, widthCells]
          : dir === 'N'
            ? [v.from_cell[0] - halfLeft, v.from_cell[1], widthCells, runCells]
            : [v.from_cell[0] - halfLeft, v.from_cell[1] - runCells + 1, widthCells, runCells];

    // The footprint and a one-cell margin round it must sit inside a single
    // space on each layer. Occupied is not enough: a flight that crosses a
    // boundary crosses the wall on it.
    // A flight within one storey exists precisely to cross a boundary, so it
    // may touch two spaces. One that changes storey must stay inside a single
    // space on each, or it cuts the wall it passes.
    const sameLayer = v.from_layer === v.to_layer;
    const seenFrom = new Set<string>();
    const seenTo = new Set<string>();
    for (const [x, y] of rectCells(foot)) {
      for (let ax = -1; ax <= 1; ax++)
        for (let ay = -1; ay <= 1; ay++) {
          // The lower end must be solid ground all the way along.
          const below = from.occ.get(key(x + ax, y + ay));
          if (!below) return false;
          seenFrom.add(below);
          // The upper end need only exist where it exists — a ramp climbing to
          // a platform starts on ground the platform does not cover. But where
          // it does exist it must be one space, or the flight cuts a wall.
          const over = to.occ.get(key(x + ax, y + ay));
          if (over) seenTo.add(over);
        }
      if (from.taken.has(key(x, y)) || to.taken.has(key(x, y))) return false;
    }
    if (seenFrom.size > (sameLayer ? 2 : 1)) return false;
    if (!sameLayer && seenTo.size > 1) return false;
    if (!to.occ.has(key(v.to_cell[0], v.to_cell[1]))) return false;

    this.spec.vertical_connections!.push({ ...v, direction: dir });
    for (const [x, y] of rectCells(foot)) {
      from.taken.set(key(x, y), v.id);
      to.taken.set(key(x, y), v.id);
    }
    return true;
  }

  marker(m: MarkerSpec): boolean {
    const st = this.layers.get(m.layer);
    if (!st) return false;
    const k = key(m.cell[0], m.cell[1]);
    if (!st.occ.has(k) || st.taken.has(k)) return false;
    this.spec.gameplay!.markers!.push(m);
    st.taken.set(k, m.id);
    return true;
  }

  /** A free cell in a space, well inside it and clear of everything placed. */
  freeCell(layerId: string, spaceId: string, inset = 1): [number, number] | null {
    const st = this.layers.get(layerId);
    if (!st) return null;
    const pool = this.interior(layerId, spaceId, inset).filter(([x, y]) => !st.taken.has(key(x, y)));
    if (!pool.length) return null;
    return this.rng.pick(pool);
  }

  /** Every space id on a layer, in declaration order. */
  spaceIds(layerId: string): string[] {
    return this.layers.get(layerId)?.spec.spaces.map((s) => s.id) ?? [];
  }

  layerIds(): string[] {
    return [...this.layers.keys()];
  }

  route(id: string, from: string, to: string, minRoutes = 2): this {
    this.spec.gameplay!.required_routes!.push({ id, from, to, min_routes: minRoutes });
    return this;
  }

  finish(): LevelSpec {
    for (const l of this.spec.layers) {
      if (!l.portals?.length) delete l.portals;
      if (!l.wall_overrides?.length) delete l.wall_overrides;
    }
    if (!this.spec.covers?.length) delete this.spec.covers;
    if (!this.spec.vertical_connections?.length) delete this.spec.vertical_connections;
    return this.spec;
  }
}
