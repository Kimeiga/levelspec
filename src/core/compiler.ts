/**
 * The deterministic geometry compiler.
 *
 * Compiler passes:
 *   1. normalize units and coordinate convention
 *   2. rasterize spaces onto the integer lattice
 *   3. assign exactly one owner to every boundary edge
 *   4. group edges into maximal wall runs
 *   5. resolve portals onto actual shared runs
 *   6. split walls around openings
 *   7. generate floors / roofs and their holes
 *   8. generate stairs, ramps, ladders, hatches
 *   9. emit cover and gameplay volumes
 *  10. split static shell versus dynamic surfaces
 *  11. build the navigation graph from the same boundary records
 *
 * Nothing here consults the spec for a coordinate that it can derive itself.
 */

import {
  DEFAULTS,
  OUTSIDE,
  PORTAL_PROFILE,
  type Box,
  type BoundaryRun,
  type Cell,
  type CompiledLevel,
  type CompiledVertical,
  type Diagnostic,
  type LayerSpec,
  type LevelSpec,
  type NavEdge,
  type NavGraph,
  type NavNode,
  type Opening,
  type Rect,
  type Solid,
  type SolidRole,
  type WallType,
  type EdgeRecord,
} from './types.ts';
import { CellSet, decomposeToRects, key, rectCells, rectContains, unkey } from './grid.ts';

const EPS = 1e-6;
const MAX_STEP_RISE = 0.19;
/**
 * Rise per slice when a flight is compiled as a ramp. Small enough that the
 * player controller never has to step, so walking up is continuous.
 */
const RAMP_SLICE_RISE = 0.055;

export type { EdgeRecord } from './types.ts';

interface LayerState {
  spec: LayerSpec;
  occ: Map<string, string>;
  edges: Map<string, EdgeRecord>;
  runs: BoundaryRun[];
  holes: CellSet;
  heightAt: Map<string, number>;
  zAt: Map<string, number>;
}

export function compile(spec: LevelSpec): CompiledLevel {
  const g = spec.grid ?? DEFAULTS.grid;
  const wt = spec.wall_thickness ?? DEFAULTS.wall_thickness;
  const ft = spec.floor_thickness ?? DEFAULTS.floor_thickness;
  const diagnostics: Diagnostic[] = [];
  const solids: Solid[] = [];
  const boundaries: BoundaryRun[] = [];
  const layers = new Map<string, LayerState>();

  const err = (
    code: string,
    objects: string[],
    message: string,
    extra: Partial<Diagnostic> = {},
  ): void => {
    diagnostics.push({ severity: 'error', code, objects, message, ...extra });
  };
  const warn = (
    code: string,
    objects: string[],
    message: string,
    extra: Partial<Diagnostic> = {},
  ): void => {
    diagnostics.push({ severity: 'warning', code, objects, message, ...extra });
  };

  // -------------------------------------------------------------------------
  // Pass 2 — rasterize
  // -------------------------------------------------------------------------
  // One diagnostic per offending space pair, not one per cell.
  const overlapCells = new Map<string, { a: string; b: string; layer: string; cells: string[] }>();

  for (const layer of spec.layers) {
    const occ = new Map<string, string>();
    const heightAt = new Map<string, number>();
    const zAt = new Map<string, number>();
    const seenSpaces = new Set<string>();

    for (const space of layer.spaces) {
      if (seenSpaces.has(space.id)) {
        err('DUPLICATE_SPACE_ID', [space.id, layer.id], `Space id "${space.id}" is declared twice.`);
      }
      seenSpaces.add(space.id);
      const cells = new CellSet();
      cells.addRect(space.rect);
      for (const r of space.extra ?? []) cells.addRect(r);
      for (const r of space.subtract ?? []) cells.deleteRect(r);
      if (cells.size === 0) {
        err('EMPTY_SPACE', [space.id], `Space "${space.id}" rasterizes to zero cells.`);
      }
      const h = space.height ?? layer.height;
      const z = layer.z + (space.z_offset ?? 0);
      for (const k of cells.keys()) {
        const prev = occ.get(k);
        if (prev && prev !== space.id) {
          if (!layer.allow_space_overlap) {
            const pk = `${layer.id}|${prev}|${space.id}`;
            let rec = overlapCells.get(pk);
            if (!rec) overlapCells.set(pk, (rec = { a: prev, b: space.id, layer: layer.id, cells: [] }));
            rec.cells.push(k);
          }
          continue; // first writer owns the cell
        }
        occ.set(k, space.id);
        heightAt.set(k, h);
        zAt.set(k, z);
      }
    }
    layers.set(layer.id, {
      spec: layer,
      occ,
      edges: new Map(),
      runs: [],
      holes: new CellSet(),
      heightAt,
      zAt,
    });
  }

  for (const rec of overlapCells.values()) {
    err(
      'SPACE_OVERLAP',
      [rec.a, rec.b, rec.layer],
      `Spaces "${rec.a}" and "${rec.b}" overlap over ${rec.cells.length} cell(s) on layer ` +
        `"${rec.layer}", starting at ${rec.cells[0]}. The first one declared owns them.`,
      {
        measured: rec.cells.length,
        required: 0,
        suggestions: [
          `Move "${rec.b}" clear of "${rec.a}"`,
          'Merge them into one space using "extra"',
          'Set allow_space_overlap: true if the union is intended',
        ],
      },
    );
  }

  for (const layer of spec.layers) {
    const st = layers.get(layer.id)!;
    for (const r of layer.floor_holes ?? []) st.holes.addRect(r);
  }

  // -------------------------------------------------------------------------
  // Pass 3 — one owner per boundary edge
  // -------------------------------------------------------------------------
  const openPairs = new Set<string>();
  const pairKey = (a: string, b: string): string => (a < b ? `${a}|${b}` : `${b}|${a}`);

  for (const layer of spec.layers) {
    const st = layers.get(layer.id)!;
    for (const space of layer.spaces) {
      for (const other of space.open_to ?? []) openPairs.add(pairKey(space.id, other));
    }

    const overrides = layer.wall_overrides ?? [];
    const resolveType = (a: string, b: string, cx: number, cy: number): WallType => {
      let found: WallType | undefined;
      for (const o of overrides) {
        if (pairKey(o.between[0], o.between[1]) !== pairKey(a, b)) continue;
        if (o.within && !rectContains(o.within, cx, cy)) continue;
        found = o.type;
      }
      if (found) return found;
      if (openPairs.has(pairKey(a, b))) return 'open';
      if (a === OUTSIDE || b === OUTSIDE) return 'hard';
      return layer.internal_walls === false ? 'open' : 'hard';
    };

    const at = (x: number, y: number): string => st.occ.get(key(x, y)) ?? OUTSIDE;

    for (const k of st.occ.keys()) {
      const [x, y] = unkey(k);
      const sides: [string, 'x' | 'y', number, number, string, string, number, number][] = [
        // edgeKey, axis, line, cross, left(-), right(+), representative cell
        [`V:${x + 1}:${y}`, 'x', x + 1, y, at(x, y), at(x + 1, y), x, y],
        [`V:${x}:${y}`, 'x', x, y, at(x - 1, y), at(x, y), x, y],
        [`H:${x}:${y + 1}`, 'y', y + 1, x, at(x, y), at(x, y + 1), x, y],
        [`H:${x}:${y}`, 'y', y, x, at(x, y - 1), at(x, y), x, y],
      ];
      for (const [ek, axis, line, cross, left, right, cx, cy] of sides) {
        if (st.edges.has(ek)) continue;
        if (left === right) continue;
        const type = resolveType(left, right, cx, cy);
        st.edges.set(ek, {
          layer: layer.id,
          axis,
          line,
          cross,
          left,
          right,
          type,
          exterior: left === OUTSIDE || right === OUTSIDE,
          open: type === 'open',
          sill: 0,
          head: Infinity,
        });
      }
    }
  }

  // -------------------------------------------------------------------------
  // Pass 4 — maximal wall runs
  // -------------------------------------------------------------------------
  const cellRange = new Map<string, [number, number]>();
  for (const layer of spec.layers) {
    const st = layers.get(layer.id)!;
    const groups = new Map<string, EdgeRecord[]>();
    for (const e of st.edges.values()) {
      if (e.type === 'open') continue;
      const gk = `${e.axis}:${e.line}:${e.left}:${e.right}:${e.type}`;
      let arr = groups.get(gk);
      if (!arr) groups.set(gk, (arr = []));
      arr.push(e);
    }
    const sortedKeys = [...groups.keys()].sort();
    for (const gk of sortedKeys) {
      const arr = groups.get(gk)!.sort((a, b) => a.cross - b.cross);
      let i = 0;
      while (i < arr.length) {
        let j = i;
        while (j + 1 < arr.length && arr[j + 1].cross === arr[j].cross + 1) j++;
        const first = arr[i];
        const last = arr[j];
        const id = `${layer.id}/${first.axis}${first.line}@${first.cross}`;
        const run: BoundaryRun = {
          id,
          layer: layer.id,
          axis: first.axis,
          coord: first.line * g,
          start: first.cross * g,
          end: (last.cross + 1) * g,
          emitStart: first.cross * g,
          emitEnd: (last.cross + 1) * g,
          sides: [first.left, first.right],
          type: first.type,
          openings: [],
          exterior: first.exterior,
        };
        for (let k2 = i; k2 <= j; k2++) arr[k2].run = id;
        cellRange.set(id, [first.cross, last.cross]);
        st.runs.push(run);
        boundaries.push(run);
        i = j + 1;
      }
    }
  }

  // -------------------------------------------------------------------------
  // Pass 4b — one owner per junction square
  //
  // Two wall runs that meet at a corner both want the little square where
  // their thickness bands cross. Left alone that is an intersecting-volume
  // pair at every corner of the map — the same class of error as two rooms
  // each emitting the wall between them, one dimension down. So the square
  // gets a single deterministic owner: runs along X claim it, runs along Y
  // yield, and a run that has no neighbour behind it claims backwards too so
  // outside corners stay closed.
  // -------------------------------------------------------------------------
  for (const layer of spec.layers) {
    const st = layers.get(layer.id)!;
    const xRunAt = new Map<string, BoundaryRun>();
    const yRunAt = new Map<string, BoundaryRun>();
    for (const r of st.runs) {
      const [c0, c1] = cellRange.get(r.id)!;
      const target = r.axis === 'x' ? xRunAt : yRunAt;
      const line = Math.round(r.coord / g);
      for (let c = c0; c <= c1; c++) target.set(`${line}:${c}`, r);
    }
    const bandOf = (r: BoundaryRun): [number, number] => wallExtent(r, wt);
    /** Union of the bands of the runs crossing `line` at grid point `at`. */
    const crossBand = (
      map: Map<string, BoundaryRun>,
      line: number,
      cells: [number, number],
    ): [number, number] | null => {
      let lo = Infinity;
      let hi = -Infinity;
      for (const c of cells) {
        const r = map.get(`${line}:${c}`);
        if (!r) continue;
        const [a, b] = bandOf(r);
        lo = Math.min(lo, a);
        hi = Math.max(hi, b);
      }
      return lo === Infinity ? null : [lo, hi];
    };

    for (const r of st.runs) {
      const [c0, c1] = cellRange.get(r.id)!;
      const line = Math.round(r.coord / g);
      if (r.axis === 'x') {
        // Yields at both ends to whichever run along Y crosses there.
        const atStart = crossBand(yRunAt, c0, [line - 1, line]);
        if (atStart) r.emitStart = Math.max(r.emitStart, atStart[1]);
        const atEnd = crossBand(yRunAt, c1 + 1, [line - 1, line]);
        if (atEnd) r.emitEnd = Math.min(r.emitEnd, atEnd[0]);
      } else {
        // Claims the square ahead of it; claims the one behind only when no
        // collinear run is already there to claim it.
        const atEnd = crossBand(xRunAt, c1 + 1, [line - 1, line]);
        if (atEnd) r.emitEnd = Math.max(r.emitEnd, atEnd[1]);
        const atStart = crossBand(xRunAt, c0, [line - 1, line]);
        if (atStart) {
          const predecessor = yRunAt.get(`${line}:${c0 - 1}`);
          r.emitStart = predecessor ? Math.max(r.emitStart, atStart[1]) : Math.min(r.emitStart, atStart[0]);
        }
      }
      if (r.emitEnd < r.emitStart) r.emitEnd = r.emitStart;
    }
  }

  // -------------------------------------------------------------------------
  // Pass 5 — resolve portals onto real shared runs
  // -------------------------------------------------------------------------
  for (const layer of spec.layers) {
    const st = layers.get(layer.id)!;
    for (const portal of layer.portals ?? []) {
      const want = pairKey(portal.between[0], portal.between[1]);
      let candidates = st.runs.filter((r) => pairKey(r.sides[0], r.sides[1]) === want);
      if (portal.side) {
        candidates = candidates.filter((r) => runSide(r) === portal.side);
      }
      if (candidates.length === 0) {
        const anyPair = st.runs.some((r) => pairKey(r.sides[0], r.sides[1]) === want);
        err(
          anyPair ? 'PORTAL_SIDE_UNMATCHED' : 'PORTAL_NOT_ADJACENT',
          [portal.id, ...portal.between],
          anyPair
            ? `Portal "${portal.id}" asked for side ${portal.side} but no shared boundary faces that way.`
            : `Portal "${portal.id}" has no shared boundary between "${portal.between[0]}" and "${portal.between[1]}".`,
          {
            suggestions: [
              `Move the two spaces until they touch`,
              `Insert a corridor space between them`,
              `Change the intended adjacency`,
            ],
          },
        );
        continue;
      }

      const hint = portal.hint;
      const hintPos: [number, number] | null = hint ? [(hint[0] + 0.5) * g, (hint[1] + 0.5) * g] : null;
      candidates.sort((a, b) => runScore(a, hintPos) - runScore(b, hintPos));
      const run = candidates[0];

      const profile = PORTAL_PROFILE[portal.kind];
      const sill = portal.sill ?? profile.sill;
      const head = portal.head ?? profile.head;
      const runLen = run.end - run.start;
      let t0: number;
      let t1: number;

      const full =
        portal.width_cells === 'full' || (portal.width_cells === undefined && portal.kind === 'open');
      if (full) {
        t0 = run.start;
        t1 = run.end;
      } else {
        const wcells = Math.max(1, Math.round((portal.width_cells ?? 1) as number));
        const w = Math.min(wcells * g, runLen);
        const along = hintPos ? (run.axis === 'x' ? hintPos[1] : hintPos[0]) : (run.start + run.end) / 2;
        let s = along - w / 2;
        s = run.start + Math.round((s - run.start) / g) * g;
        s = Math.min(Math.max(s, run.start), run.end - w);
        t0 = s;
        t1 = s + w;
        // Slide clear of any opening already placed on this run.
        let guard = 0;
        while (run.openings.some((o) => t0 < o.t1 - EPS && t1 > o.t0 + EPS) && guard++ < 64) {
          const hit = run.openings.find((o) => t0 < o.t1 - EPS && t1 > o.t0 + EPS)!;
          const right = hit.t1;
          if (right + w <= run.end + EPS) {
            t0 = right;
            t1 = right + w;
          } else {
            const left = hit.t0 - w;
            if (left >= run.start - EPS) {
              t0 = left;
              t1 = hit.t0;
            } else break;
          }
        }
        if (run.openings.some((o) => t0 < o.t1 - EPS && t1 > o.t0 + EPS)) {
          err(
            'PORTAL_OVERLAP',
            [portal.id, run.id],
            `Portal "${portal.id}" cannot fit on boundary ${run.id} without overlapping another opening.`,
            { measured: runLen, suggestions: ['Widen the shared wall', 'Reduce width_cells'] },
          );
          continue;
        }
      }

      const opening: Opening = { portal: portal.id, kind: portal.kind, t0, t1, sill, head };
      run.openings.push(opening);
      run.openings.sort((a, b) => a.t0 - b.t0);

      // Mirror the cut back onto the edge records so navigation and the
      // minimap read the same truth as the geometry.
      const traversable = sill <= 1.25;
      for (const e of st.edges.values()) {
        if (e.run !== run.id) continue;
        const c0 = e.cross * g;
        const c1 = (e.cross + 1) * g;
        const overlap = Math.min(c1, t1) - Math.max(c0, t0);
        if (overlap > g * 0.5) {
          e.open = traversable;
          e.sill = sill;
          e.head = head;
          e.portal = portal.id;
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // Pass 8a — vertical connections punch holes before floors are emitted
  // -------------------------------------------------------------------------
  const verticals: CompiledVertical[] = [];
  for (const vc of spec.vertical_connections ?? []) {
    const from = layers.get(vc.from_layer);
    const to = layers.get(vc.to_layer);
    if (!from || !to) {
      err('VERTICAL_BAD_LAYER', [vc.id], `Vertical connection "${vc.id}" references an unknown layer.`);
      continue;
    }
    if (!from.occ.has(key(vc.from_cell[0], vc.from_cell[1]))) {
      err(
        'VERTICAL_ENDPOINT_UNOCCUPIED',
        [vc.id, vc.from_layer],
        `"${vc.id}" starts at ${vc.from_cell} which is not inside any space on layer "${vc.from_layer}".`,
      );
      continue;
    }
    if (!to.occ.has(key(vc.to_cell[0], vc.to_cell[1]))) {
      err(
        'VERTICAL_ENDPOINT_UNOCCUPIED',
        [vc.id, vc.to_layer],
        `"${vc.id}" ends at ${vc.to_cell} which is not inside any space on layer "${vc.to_layer}".`,
      );
      continue;
    }

    const zFrom = from.zAt.get(key(vc.from_cell[0], vc.from_cell[1])) ?? from.spec.z;
    const zTo = to.zAt.get(key(vc.to_cell[0], vc.to_cell[1])) ?? to.spec.z;
    const rise = zTo - zFrom;
    const widthCells = Math.max(1, Math.round((vc.width ?? 1.6) / g));

    const dx = vc.to_cell[0] - vc.from_cell[0];
    const dy = vc.to_cell[1] - vc.from_cell[1];
    let dir: 'N' | 'S' | 'E' | 'W' | null = vc.direction ?? null;
    if (!dir) {
      if (Math.abs(dx) >= Math.abs(dy) && dx !== 0) dir = dx > 0 ? 'E' : 'W';
      else if (dy !== 0) dir = dy > 0 ? 'N' : 'S';
    }

    let footprint: Rect;
    if (vc.kind === 'stairs' || vc.kind === 'ramp') {
      if (!dir) {
        err(
          'STAIR_NO_DIRECTION',
          [vc.id],
          `Stair "${vc.id}" has identical from/to cells and no explicit direction.`,
        );
        continue;
      }
      const runCells = Math.max(1, Math.abs(dir === 'E' || dir === 'W' ? dx : dy) + 1);
      footprint = stairFootprint(vc.from_cell, dir, runCells, widthCells);
    } else {
      const [sw, sd] = vc.size_cells ?? [1, 1];
      footprint = [vc.from_cell[0], vc.from_cell[1], sw, sd];
    }

    // The upper layer's floor (and the lower layer's roof) open over the link.
    for (const [x, y] of rectCells(footprint)) to.holes.add(x, y);
    if (vc.kind === 'stairs' || vc.kind === 'ramp') {
      // Keep the bottom-most tread solid so the stairwell reads as a stairwell.
      const alongCells = dir === 'E' || dir === 'W' ? footprint[2] : footprint[3];
      const run = alongCells * g;
      const perSlice = spec.stair_style === 'stepped' ? MAX_STEP_RISE : RAMP_SLICE_RISE;
      const steps = Math.max(1, Math.ceil(Math.abs(rise) / perSlice));
      verticals.push({
        spec: vc,
        footprint,
        steps,
        rise,
        tread: run / steps,
        gradient: run > 0 ? Math.abs(rise) / run : Infinity,
      });
    } else {
      verticals.push({ spec: vc, footprint, steps: 0, rise, tread: 0, gradient: 0 });
    }
  }

  // -------------------------------------------------------------------------
  // Pass 6 — walls, split around openings
  // -------------------------------------------------------------------------
  for (const layer of spec.layers) {
    const st = layers.get(layer.id)!;
    for (const run of st.runs) {
      // The wall proper sits on the higher of the two floors it separates and
      // reaches the higher of the two ceilings.
      const [floorA, floorB] = sideFloors(run, layer, st, g);
      const zLo = Math.min(floorA, floorB);
      const z = Math.max(floorA, floorB);
      const owner = run.sides[0] === OUTSIDE ? run.sides[1] : run.sides[0];
      const railing = layer.spaces.find((sp) => sp.id === owner)?.railing ?? layer.railing;
      // A balcony or catwalk edge is a railing, not a wall.
      // Under a roof every wall reaches it, so nothing can be seen or shot
      // over. Outdoors a wall is only as tall as the spaces it separates.
      const ceiling = layer.roof === false ? runTop(run, layer, st, g) : layerTop(st, layer);
      const h = run.exterior && railing !== undefined ? railing : ceiling - z;
      const [lo, hi] = wallExtent(run, wt);
      const dyn = isDynamic(run.type);
      const role = wallRole(run);

      // The body covers the run's own cells; the junction squares it claimed
      // from a crossing run are emitted separately, because they sit over that
      // run's cells and must start at *their* floor, not this one's.
      const bodyStart = Math.max(run.start, run.emitStart);
      const bodyEnd = Math.min(run.end, run.emitEnd);
      for (const cap of junctionCaps(run, st, g)) {
        const top = Math.max(runTop(run, layer, st, g), cap.base + 0.01);
        solids.push({
          id: `${run.id}#cap_${cap.t0.toFixed(2)}`,
          role,
          box: wallBox(run, lo, hi, cap.t0, cap.t1, cap.base, top),
          layer: layer.id,
          spaces: run.sides.filter((x) => x !== OUTSIDE),
          boundary: run.id,
          dynamic: dyn,
        });
      }

      // Where one side sits lower, a skirt closes the gap under the wall — on
      // the lower side only, so it never meets the higher side's floor slab.
      if (z - zLo > EPS) {
        const lowerIsMinus = floorA < floorB;
        const [slo, shi] = lowerIsMinus ? [run.coord - wt / 2, run.coord] : [run.coord, run.coord + wt / 2];
        solids.push({
          id: `${run.id}#skirt`,
          role: role === 'exterior_wall' ? 'exterior_wall' : 'static_hard',
          box: wallBox(run, slo, shi, bodyStart, bodyEnd, zLo, z),
          layer: layer.id,
          spaces: run.sides.filter((x) => x !== OUTSIDE),
          boundary: run.id,
          dynamic: false,
        });
      }

      const segments = subtractIntervals(bodyStart, bodyEnd, run.openings);
      let n = 0;
      for (const [s, e] of segments) {
        if (e - s < EPS) continue;
        solids.push({
          id: `${run.id}#${n++}`,
          role,
          box: wallBox(run, lo, hi, s, e, z, z + h),
          layer: layer.id,
          spaces: run.sides.filter((x) => x !== OUTSIDE),
          boundary: run.id,
          dynamic: dyn,
        });
      }
      for (const o of run.openings) {
        const headAbs = Math.min(o.head === Infinity ? h : o.head, h);
        const ot0 = Math.max(o.t0, bodyStart);
        const ot1 = Math.min(o.t1, bodyEnd);
        if (ot1 - ot0 < EPS) continue;
        if (o.sill > EPS) {
          solids.push({
            id: `${run.id}#sill_${o.portal}`,
            role: 'sill',
            box: wallBox(run, lo, hi, ot0, ot1, z, z + o.sill),
            layer: layer.id,
            spaces: run.sides.filter((x) => x !== OUTSIDE),
            boundary: run.id,
            dynamic: false,
          });
        }
        if (headAbs < h - EPS) {
          solids.push({
            id: `${run.id}#lintel_${o.portal}`,
            role: 'lintel',
            box: wallBox(run, lo, hi, ot0, ot1, z + headAbs, z + h),
            layer: layer.id,
            spaces: run.sides.filter((x) => x !== OUTSIDE),
            boundary: run.id,
            dynamic: false,
          });
        }
        // A barricadable opening becomes a dynamic panel filling the hole.
        // The static shell already lacks geometry there — no duplicate surface.
        const portalSpec = (layer.portals ?? []).find((p) => p.id === o.portal);
        if (portalSpec?.barricade) {
          const panelRole: SolidRole =
            o.kind === 'window' || o.kind === 'rappel_window' ? 'window_barricade' : 'door_panel';
          solids.push({
            id: `panel_${o.portal}`,
            role: panelRole,
            box: wallBox(run, lo + wt * 0.3, hi - wt * 0.3, ot0, ot1, z + o.sill, z + headAbs),
            layer: layer.id,
            spaces: run.sides.filter((x) => x !== OUTSIDE),
            boundary: run.id,
            dynamic: true,
            label: portalSpec.id,
          });
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // Pass 6b — risers seal open elevation changes
  //
  // A boundary with no wall between two spaces at different heights leaves the
  // cliff face open: from the lower side you walk straight in under the higher
  // slab, where there is no floor at all, and out of the world. A wall gets a
  // skirt for this; an open boundary has no wall to skirt, so it gets a riser
  // of its own. Emitted on the lower side only, so it never meets the higher
  // slab, and never taller than the drop it closes.
  // -------------------------------------------------------------------------
  // Cells a stair or ramp passes through: the drop there is the route.
  const rampCells = new Set<string>();
  for (const v of verticals) {
    if (v.spec.kind !== 'stairs' && v.spec.kind !== 'ramp') continue;
    for (const [x, y] of rectCells(v.footprint)) {
      rampCells.add(`${v.spec.from_layer}|${key(x, y)}`);
      rampCells.add(`${v.spec.to_layer}|${key(x, y)}`);
    }
  }

  for (const layer of spec.layers) {
    const st = layers.get(layer.id)!;
    const onRamp = (e: EdgeRecord): boolean => {
      const a = e.axis === 'x' ? key(e.line - 1, e.cross) : key(e.cross, e.line - 1);
      const b = e.axis === 'x' ? key(e.line, e.cross) : key(e.cross, e.line);
      return rampCells.has(`${layer.id}|${a}`) || rampCells.has(`${layer.id}|${b}`);
    };
    const edgeFloors = (e: EdgeRecord): [number, number] => {
      const a = e.axis === 'x' ? key(e.line - 1, e.cross) : key(e.cross, e.line - 1);
      const b = e.axis === 'x' ? key(e.line, e.cross) : key(e.cross, e.line);
      return [st.zAt.get(a) ?? layer.z, st.zAt.get(b) ?? layer.z];
    };
    /**
     * Is something crossing this run's axis at that grid line — a wall, or
     * another riser? Two risers meeting at the corner of a sunken area both
     * want the same square, which is the junction problem one more time.
     */
    const crossing = (axis: 'x' | 'y', line: number, at: number): { wall: boolean; riser: boolean } => {
      const probe: string[] =
        axis === 'x'
          ? [`H:${line - 1}:${at}`, `H:${line}:${at}`]
          : [`V:${at}:${line - 1}`, `V:${at}:${line}`];
      let wall = false;
      let riser = false;
      for (const k of probe) {
        const e = st.edges.get(k);
        if (!e) continue;
        if (e.type !== 'open') wall = true;
        else {
          const [zm, zp] = edgeFloors(e);
          if (Math.abs(zm - zp) >= 0.02 && !onRamp(e)) riser = true;
        }
      }
      return { wall, riser };
    };

    const groups = new Map<string, EdgeRecord[]>();
    for (const e of st.edges.values()) {
      if (e.type !== 'open') continue;
      if (onRamp(e)) continue; // the flight is the way through; do not wall it
      const [zm, zp] = edgeFloors(e);
      if (Math.abs(zm - zp) < 0.02) continue;
      const gk = `${e.axis}:${e.line}:${zm.toFixed(4)}:${zp.toFixed(4)}`;
      let arr = groups.get(gk);
      if (!arr) groups.set(gk, (arr = []));
      arr.push(e);
    }
    for (const gk of [...groups.keys()].sort()) {
      const arr = groups.get(gk)!.sort((a, b) => a.cross - b.cross);
      let i = 0;
      while (i < arr.length) {
        let j = i;
        while (j + 1 < arr.length && arr[j + 1].cross === arr[j].cross + 1) j++;
        const first = arr[i];
        const [zm, zp] = edgeFloors(first);
        const lowerIsMinus = zm < zp;
        const zLo = Math.min(zm, zp);
        const zHi = Math.max(zm, zp);
        const coord = first.line * g;
        // Full wall thickness, on the low side: this is a retaining wall
        // holding back a drop, and a thin one is easy to clip through.
        const [lo, hi] = lowerIsMinus ? [coord - wt, coord] : [coord, coord + wt];
        let start = first.cross * g;
        let end = (arr[j].cross + 1) * g;
        // Runs along X yield the corner; runs along Y keep it. One owner per
        // junction square, the same rule the walls follow.
        for (const [at, sign] of [[first.cross, 1], [arr[j].cross + 1, -1]] as const) {
          const c = crossing(first.axis, first.line, at);
          let back = 0;
          if (c.wall) back = wt / 2;
          if (c.riser && first.axis === 'x') back = Math.max(back, wt);
          if (sign > 0) start += back;
          else end -= back;
        }
        if (end - start > EPS) {
          solids.push({
            id: `${layer.id}/riser_${first.axis}${first.line}@${first.cross}`,
            role: 'riser',
            box:
              first.axis === 'x'
                ? { min: [lo, start, zLo], max: [hi, end, zHi] }
                : { min: [start, lo, zLo], max: [end, hi, zHi] },
            layer: layer.id,
            spaces: [first.left, first.right].filter((x) => x !== OUTSIDE),
            dynamic: false,
          });
        }
        i = j + 1;
      }
    }
  }

  // -------------------------------------------------------------------------
  // Pass 7 — floors and roofs
  // -------------------------------------------------------------------------
  const layerOrder = [...spec.layers].sort((a, b) => a.z - b.z);
  for (const layer of spec.layers) {
    const st = layers.get(layer.id)!;
    const byZ = new Map<number, Set<string>>();
    for (const [k, sid] of st.occ) {
      const [x, y] = unkey(k);
      if (st.holes.has(x, y)) continue;
      const z = st.zAt.get(k) ?? layer.z;
      let set = byZ.get(z);
      if (!set) byZ.set(z, (set = new Set()));
      set.add(k);
      void sid;
    }
    let n = 0;
    for (const [z, cells] of byZ) {
      for (const r of decomposeToRects(cells)) {
        solids.push({
          id: `floor_${layer.id}_${n++}`,
          role: 'floor',
          box: rectBox(r, g, z - ft, z),
          layer: layer.id,
          spaces: [],
          dynamic: false,
        });
      }
    }

    if (layer.roof === false) continue;
    // One roof elevation for the whole storey. Per-cell tops would sit below
    // the walls wherever two spaces at different floor heights meet, and the
    // wall would come straight up through the slab.
    const above = layerOrder.filter((l) => l.z > layer.z + EPS).map((l) => layers.get(l.id)!);
    const roofCells = new Set<string>();
    for (const [k] of st.occ) {
      if (above.some((a) => a.occ.has(k))) continue;
      const [x, y] = unkey(k);
      if (st.holes.has(x, y)) continue;
      roofCells.add(k);
    }
    let m = 0;
    const top = layerTop(st, layer);
    for (const r of decomposeToRects(roofCells)) {
      solids.push({
        id: `roof_${layer.id}_${m++}`,
        role: 'roof',
        box: rectBox(r, g, top, top + ft),
        layer: layer.id,
        spaces: [],
        dynamic: false,
      });
    }
  }

  // -------------------------------------------------------------------------
  // Pass 8b — stairs, ramps, ladders, hatches
  // -------------------------------------------------------------------------
  for (const v of verticals) {
    const vc = v.spec;
    const from = layers.get(vc.from_layer)!;
    const to = layers.get(vc.to_layer)!;
    const zFrom = from.zAt.get(key(vc.from_cell[0], vc.from_cell[1])) ?? from.spec.z;
    const zTo = to.zAt.get(key(vc.to_cell[0], vc.to_cell[1])) ?? to.spec.z;

    if (vc.kind === 'stairs' || vc.kind === 'ramp') {
      const steps = v.steps;
      const dir = stairDir(vc, v.footprint, g);
      const alongLen = dir.axis === 'x' ? v.footprint[2] * g : v.footprint[3] * g;
      const tread = alongLen / steps;
      const riseStep = (zTo - zFrom) / steps;
      const base = rectBox(v.footprint, g, zFrom, zFrom);
      // Treads sit on the lower floor slab, never inside it.
      const bottom = Math.min(zFrom, zTo);
      const player = spec.player ?? DEFAULTS.player;
      const sideFloorsAt = (cx: number, cy: number): number[] =>
        [from.zAt.get(key(cx, cy)), to.zAt.get(key(cx, cy))].filter(
          (v2): v2 is number => v2 !== undefined,
        );
      /** The floor on the far side of the flight edge nearest a given height. */
      const nearestFloor = (cx: number, cy: number, z: number): number | undefined => {
        const found = sideFloorsAt(cx, cy);
        if (!found.length) return undefined;
        return found.reduce((a, b) => (Math.abs(b - z) < Math.abs(a - z) ? b : a));
      };
      /** The lowest floor above a height — whatever the stringer must stop under. */
      const floorAbove = (cx: number, cy: number, z: number): number | undefined => {
        const above = sideFloorsAt(cx, cy).filter((v2) => v2 > z + 0.05);
        return above.length ? Math.min(...above) : undefined;
      };
      const sideCells: [number, number] =
        dir.axis === 'x'
          ? [v.footprint[1] - 1, v.footprint[1] + v.footprint[3]]
          : [v.footprint[0] - 1, v.footprint[0] + v.footprint[2]];

      for (let i = 0; i < steps; i++) {
        // Treads abut along the run and never overlap: each one owns exactly
        // one tread-length slice, so the staircase adds no intersecting volume.
        const a0 = dir.positive ? i * tread : alongLen - (i + 1) * tread;
        const lo = (dir.axis === 'x' ? base.min[0] : base.min[1]) + a0;
        const hi = lo + tread;
        const top = zFrom + (i + 1) * riseStep;
        const perp = dir.axis === 'x' ? 1 : 0;

        // A flight climbing over open ground is a ledge on both sides, and each
        // side is really two separate questions.
        //
        // Does the tread have to give up half a wall thickness? Yes whenever
        // something already stands on that boundary — a wall, or the parapet
        // this flight is about to raise. Otherwise the tread runs into the
        // wall band beside it and the two share a volume.
        //
        // Does this flight have to raise that parapet itself? Only where the
        // neighbour is floor at a height you would fall off or onto. Where the
        // neighbour is void, the boundary is the edge of the space and the
        // exterior wall already owns it — one owner per boundary, the same
        // rule the wall passes obey.
        const midAlong = (lo + hi) / 2;
        const inset: boolean[] = [false, false];
        const guard: boolean[] = [false, false];
        for (let sideIdx = 0; sideIdx < 2; sideIdx++) {
          const cellPerp = sideCells[sideIdx];
          const [nx, ny] =
            dir.axis === 'x'
              ? [Math.floor(midAlong / g), cellPerp]
              : [cellPerp, Math.floor(midAlong / g)];
          const neighbour = nearestFloor(nx, ny, top);
          const walkable = neighbour !== undefined && Math.abs(neighbour - top) <= player.step;
          inset[sideIdx] = !walkable;
          guard[sideIdx] = !walkable && neighbour !== undefined;
        }

        const p0 = base.min[perp] + (inset[0] ? wt / 2 : 0);
        const p1 = base.max[perp] - (inset[1] ? wt / 2 : 0);
        if (p1 - p0 < 0.3) {
          inset[0] = false;
          inset[1] = false;
          guard[0] = false;
          guard[1] = false;
        }
        const lowP = base.min[perp] + (inset[0] ? wt / 2 : 0);
        const highP = base.max[perp] - (inset[1] ? wt / 2 : 0);

        const box: Box =
          perp === 1
            ? { min: [lo, lowP, bottom], max: [hi, highP, top] }
            : { min: [lowP, lo, bottom], max: [highP, hi, top] };
        solids.push({
          id: `${vc.id}_step_${i}`,
          role: vc.kind === 'ramp' ? 'ramp' : 'stair',
          box,
          layer: vc.from_layer,
          spaces: [],
          dynamic: false,
          label: vc.label ?? vc.id,
        });

        for (let sideIdx = 0; sideIdx < 2; sideIdx++) {
          if (!guard[sideIdx]) continue;
          const [s0, s1] =
            sideIdx === 0 ? [base.min[perp], lowP] : [highP, base.max[perp]];
          const cellPerp = sideCells[sideIdx];
          const [nx2, ny2] =
            dir.axis === 'x'
              ? [Math.floor(midAlong / g), cellPerp]
              : [cellPerp, Math.floor(midAlong / g)];
          // Stop under whatever storey is overhead, or the parapet punches up
          // through the floor slab and railings of the level above.
          // Never above the flight's own destination: past that you are on
          // the floor it lands on, and a parapet there would collide with
          // whatever that storey already has along the same line.
          const ceilingAbove = floorAbove(nx2, ny2, top);
          const guardTop = Math.min(top + 1.0, Math.max(zFrom, zTo), ceilingAbove ?? Infinity);
          if (guardTop - bottom < 0.05) continue;
          solids.push({
            id: `${vc.id}_stringer_${i}_${sideIdx}`,
            role: 'riser',
            box:
              perp === 1
                ? { min: [lo, s0, bottom], max: [hi, s1, guardTop] }
                : { min: [s0, lo, bottom], max: [s1, hi, guardTop] },
            layer: vc.from_layer,
            spaces: [],
            dynamic: false,
          });
        }
      }
    } else if (vc.kind === 'ladder') {
      const b = rectBox(v.footprint, g, zFrom, zTo + 0.6);
      solids.push({
        id: `${vc.id}_ladder`,
        role: 'ladder',
        box: { min: [b.min[0] + 0.3, b.min[1] + 0.3, b.min[2]], max: [b.max[0] - 0.3, b.min[1] + 0.45, b.max[2]] },
        layer: vc.from_layer,
        spaces: [],
        dynamic: false,
        label: vc.label ?? vc.id,
      });
    } else if (vc.kind === 'hatch') {
      const top = to.zAt.get(key(vc.to_cell[0], vc.to_cell[1])) ?? to.spec.z;
      solids.push({
        id: `${vc.id}_hatch`,
        role: 'hatch',
        box: rectBox(v.footprint, g, top - ft, top),
        layer: vc.to_layer,
        spaces: [],
        dynamic: vc.destructible !== false,
        label: vc.label ?? vc.id,
      });
    }
  }

  // -------------------------------------------------------------------------
  // Pass 9 — cover
  // -------------------------------------------------------------------------
  for (const c of spec.covers ?? []) {
    const st = layers.get(c.layer);
    if (!st) {
      err('COVER_BAD_LAYER', [c.id], `Cover "${c.id}" references unknown layer "${c.layer}".`);
      continue;
    }
    // Sit on the floor of the cell the cover starts in: `z_offset` is a lift
    // above that floor, not an absolute elevation.
    const ground = st.zAt.get(key(c.rect[0], c.rect[1])) ?? st.spec.z;
    const z = ground + (c.z_offset ?? 0);
    solids.push({
      id: c.id,
      role: 'cover',
      box: rectBox(c.rect, g, z, z + c.height),
      layer: c.layer,
      spaces: [],
      dynamic: false,
      label: c.label ?? c.material ?? 'cover',
    });
  }

  // -------------------------------------------------------------------------
  // Pass 11 — navigation graph, built from the same boundary records
  // -------------------------------------------------------------------------
  const nav = buildNav(spec, layers, verticals, g);

  // Gameplay markers snap to traversable cells.
  const markers: CompiledLevel['markers'] = [];
  for (const mk of spec.gameplay?.markers ?? []) {
    const st = layers.get(mk.layer);
    if (!st) {
      err('MARKER_BAD_LAYER', [mk.id], `Marker "${mk.id}" references unknown layer "${mk.layer}".`);
      continue;
    }
    const k = key(mk.cell[0], mk.cell[1]);
    if (!st.occ.has(k)) {
      err(
        'MARKER_UNREACHABLE_CELL',
        [mk.id, mk.layer],
        `Marker "${mk.id}" sits at ${mk.cell}, outside every space on layer "${mk.layer}".`,
        { suggestions: ['Move the marker inside a space', 'Extend the space to cover it'] },
      );
      continue;
    }
    const z = st.zAt.get(k) ?? st.spec.z;
    markers.push({ ...mk, pos: [(mk.cell[0] + 0.5) * g, (mk.cell[1] + 0.5) * g, z] });
  }

  const occupancy = new Map<string, Map<string, string>>();
  for (const [id, st] of layers) occupancy.set(id, st.occ);

  const edgeIndex = new Map<string, EdgeRecord>();
  for (const [id, st] of layers) for (const [ek, e] of st.edges) edgeIndex.set(`${id}|${ek}`, e);

  const stats: Record<string, number> = {
    layers: spec.layers.length,
    spaces: spec.layers.reduce((a, l) => a + l.spaces.length, 0),
    portals: spec.layers.reduce((a, l) => a + (l.portals?.length ?? 0), 0),
    boundaries: boundaries.length,
    openings: boundaries.reduce((a, b) => a + b.openings.length, 0),
    solids: solids.length,
    dynamic_solids: solids.filter((s) => s.dynamic).length,
    triangles: solids.length * 12,
    nav_nodes: nav.nodes.length,
    nav_edges: nav.edges.length,
    verticals: verticals.length,
    covers: (spec.covers ?? []).length,
  };

  for (const s of solids) {
    for (let i = 0; i < 3; i++) {
      if (s.box.max[i] - s.box.min[i] <= EPS) {
        warn('DEGENERATE_SOLID', [s.id], `Solid "${s.id}" has a non-positive dimension on axis ${i}.`);
        break;
      }
    }
  }

  return {
    spec,
    solids,
    boundaries,
    nav,
    occupancy,
    markers,
    verticals,
    diagnostics,
    stats,
    edges: edgeIndex,
  };
}

// ---------------------------------------------------------------------------
// Geometry helpers — every coordinate in the build comes from these.
// ---------------------------------------------------------------------------

function runSide(r: BoundaryRun): 'N' | 'S' | 'E' | 'W' | null {
  if (!r.exterior) return null;
  if (r.axis === 'x') return r.sides[0] === OUTSIDE ? 'W' : 'E';
  return r.sides[0] === OUTSIDE ? 'S' : 'N';
}

function runScore(r: BoundaryRun, hint: [number, number] | null): number {
  if (!hint) return -(r.end - r.start);
  const [hx, hy] = hint;
  const along = r.axis === 'x' ? hy : hx;
  const perp = r.axis === 'x' ? hx : hy;
  const clamped = Math.min(Math.max(along, r.start), r.end);
  const d = Math.hypot(along - clamped, perp - r.coord);
  return d - (r.end - r.start) * 0.01;
}

/**
 * The stretches this run claimed beyond its own cells at a junction, each with
 * the floor elevation of the cells it actually sits over.
 */
function junctionCaps(
  r: BoundaryRun,
  st: LayerState,
  g: number,
): { t0: number; t1: number; base: number }[] {
  const out: { t0: number; t1: number; base: number }[] = [];
  const line = Math.round(r.coord / g);
  const floorAt = (cross: number): number | undefined => {
    const a = st.zAt.get(r.axis === 'x' ? key(line - 1, cross) : key(cross, line - 1));
    const b = st.zAt.get(r.axis === 'x' ? key(line, cross) : key(cross, line));
    if (a === undefined) return b;
    if (b === undefined) return a;
    return Math.max(a, b);
  };
  if (r.emitStart < r.start - EPS) {
    const base = floorAt(Math.round(r.start / g) - 1);
    if (base !== undefined) out.push({ t0: r.emitStart, t1: r.start, base });
  }
  if (r.emitEnd > r.end + EPS) {
    const base = floorAt(Math.round(r.end / g));
    if (base !== undefined) out.push({ t0: r.end, t1: r.emitEnd, base });
  }
  return out;
}

/** Lowest floor elevation on each side of the run: `[-axis side, +axis side]`. */
function sideFloors(r: BoundaryRun, layer: LayerSpec, st: LayerState, g: number): [number, number] {
  let minus: number | undefined;
  let plus: number | undefined;
  const c0 = Math.round(r.start / g);
  const c1 = Math.round(r.end / g) - 1;
  const line = Math.round(r.coord / g);
  for (let c = c0; c <= c1; c++) {
    const a = st.zAt.get(r.axis === 'x' ? key(line - 1, c) : key(c, line - 1));
    const b = st.zAt.get(r.axis === 'x' ? key(line, c) : key(c, line));
    if (a !== undefined) minus = minus === undefined ? a : Math.min(minus, a);
    if (b !== undefined) plus = plus === undefined ? b : Math.min(plus, b);
  }
  // An exterior run has occupancy on one side only; the outside matches it.
  const known = minus ?? plus ?? layer.z;
  return [minus ?? known, plus ?? known];
}

/** The one ceiling elevation for a storey: the highest any space reaches. */
function layerTop(st: LayerState, layer: LayerSpec): number {
  let top = layer.z + layer.height;
  for (const [k, z] of st.zAt) {
    const h = st.heightAt.get(k);
    if (h !== undefined) top = Math.max(top, z + h);
  }
  return top;
}

/** Highest ceiling elevation on either side of the run. */
function runTop(r: BoundaryRun, layer: LayerSpec, st: LayerState, g: number): number {
  return probeRun(r, g, layer.z + layer.height, (k: string) => {
    const z = st.zAt.get(k);
    const h = st.heightAt.get(k);
    return z === undefined || h === undefined ? undefined : z + h;
  }, Math.max);
}

function probeRun(
  r: BoundaryRun,
  g: number,
  fallback: number,
  read: (k: string) => number | undefined,
  pick: (a: number, b: number) => number,
): number {
  let out: number | undefined;
  const take = (cx: number, cy: number): void => {
    const v = read(key(cx, cy));
    if (v === undefined) return;
    out = out === undefined ? v : pick(out, v);
  };
  const c0 = Math.round(r.start / g);
  const c1 = Math.round(r.end / g) - 1;
  const line = Math.round(r.coord / g);
  for (let c = c0; c <= c1; c++) {
    if (r.axis === 'x') {
      take(line - 1, c);
      take(line, c);
    } else {
      take(c, line - 1);
      take(c, line);
    }
  }
  return out ?? fallback;
}


/**
 * Every wall straddles its boundary plane, interior and exterior alike. One
 * rule keeps storeys aligned: a ground-floor wall against an outdoor space and
 * the first-floor wall above it against open air land on the same two planes.
 */
function wallExtent(r: BoundaryRun, wt: number): [number, number] {
  return [r.coord - wt / 2, r.coord + wt / 2];
}

function wallBox(
  r: BoundaryRun,
  lo: number,
  hi: number,
  s: number,
  e: number,
  z0: number,
  z1: number,
): Box {
  return r.axis === 'x'
    ? { min: [lo, s, z0], max: [hi, e, z1] }
    : { min: [s, lo, z0], max: [e, hi, z1] };
}

function rectBox(rect: Rect, g: number, z0: number, z1: number): Box {
  return {
    min: [rect[0] * g, rect[1] * g, z0],
    max: [(rect[0] + rect[2]) * g, (rect[1] + rect[3]) * g, z1],
  };
}

/**
 * Remove every opening interval from the run. Openings with a sill or a head
 * get dedicated sill/lintel boxes elsewhere; the full-height band beside them
 * is removed here exactly once, so no two solids can claim the same volume.
 */
function subtractIntervals(start: number, end: number, openings: Opening[]): [number, number][] {
  const all = openings.map((o) => [o.t0, o.t1] as [number, number]).sort((a, b) => a[0] - b[0]);
  const out: [number, number][] = [];
  let cursor = start;
  for (const [a, b] of all) {
    if (a > cursor + EPS) out.push([cursor, Math.min(a, end)]);
    cursor = Math.max(cursor, b);
  }
  if (cursor < end - EPS) out.push([cursor, end]);
  return out;
}

function isDynamic(t: WallType): boolean {
  return t === 'soft' || t === 'reinforced' || t === 'glass';
}

function wallRole(r: BoundaryRun): SolidRole {
  switch (r.type) {
    case 'soft':
      return 'soft_panel';
    case 'reinforced':
      return 'reinforcement_slot';
    case 'glass':
      return 'glass';
    default:
      return r.exterior ? 'exterior_wall' : 'static_hard';
  }
}

function stairFootprint(from: Cell, dir: 'N' | 'S' | 'E' | 'W', runCells: number, widthCells: number): Rect {
  const halfLeft = Math.floor((widthCells - 1) / 2);
  if (dir === 'E') return [from[0], from[1] - halfLeft, runCells, widthCells];
  if (dir === 'W') return [from[0] - runCells + 1, from[1] - halfLeft, runCells, widthCells];
  if (dir === 'N') return [from[0] - halfLeft, from[1], widthCells, runCells];
  return [from[0] - halfLeft, from[1] - runCells + 1, widthCells, runCells];
}

function stairDir(
  vc: { from_cell: Cell; to_cell: Cell; direction?: 'N' | 'S' | 'E' | 'W' },
  footprint: Rect,
  g: number,
): { axis: 'x' | 'y'; positive: boolean } {
  void footprint;
  void g;
  const dx = vc.to_cell[0] - vc.from_cell[0];
  const dy = vc.to_cell[1] - vc.from_cell[1];
  const dir = vc.direction ?? (Math.abs(dx) >= Math.abs(dy) && dx !== 0 ? (dx > 0 ? 'E' : 'W') : dy > 0 ? 'N' : 'S');
  if (dir === 'E') return { axis: 'x', positive: true };
  if (dir === 'W') return { axis: 'x', positive: false };
  if (dir === 'N') return { axis: 'y', positive: true };
  return { axis: 'y', positive: false };
}

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

function buildNav(
  spec: LevelSpec,
  layers: Map<string, LayerState>,
  verticals: CompiledVertical[],
  g: number,
): NavGraph {
  const nodes: NavNode[] = [];
  const edges: NavEdge[] = [];
  const index = new Map<string, number>();
  const player = spec.player ?? DEFAULTS.player;

  // Cover you cannot simply step over blocks the cell. Vaulting is a gameplay
  // affordance, not a navigation guarantee, so the graph routes around it.
  const blocked = new Set<string>();
  for (const c of spec.covers ?? []) {
    // Something lifted above stepping height is a beam or an arch: you walk
    // under it, so it must not block the graph.
    if ((c.z_offset ?? 0) > player.step) continue;
    if (c.height <= player.step) continue;
    for (const [x, y] of rectCells(c.rect)) blocked.add(`${c.layer}|${key(x, y)}`);
  }

  for (const layer of spec.layers) {
    const st = layers.get(layer.id)!;
    for (const [k, space] of st.occ) {
      if (blocked.has(`${layer.id}|${k}`)) continue;
      const [x, y] = unkey(k);
      const id = nodes.length;
      const z = st.zAt.get(k) ?? layer.z;
      nodes.push({ id, layer: layer.id, cell: [x, y], space, pos: [(x + 0.5) * g, (y + 0.5) * g, z] });
      index.set(`${layer.id}|${k}`, id);
    }
  }

  const link = (a: number, b: number, cost: number, kind: NavEdge['kind'], via?: string): void => {
    edges.push({ a, b, cost, kind, via });
  };

  for (const layer of spec.layers) {
    const st = layers.get(layer.id)!;
    for (const [k] of st.occ) {
      const a = index.get(`${layer.id}|${k}`);
      if (a === undefined) continue;
      const [x, y] = unkey(k);
      const neighbours: [number, number, string][] = [
        [x + 1, y, `V:${x + 1}:${y}`],
        [x, y + 1, `H:${x}:${y + 1}`],
      ];
      for (const [nx, ny, ek] of neighbours) {
        const b = index.get(`${layer.id}|${key(nx, ny)}`);
        if (b === undefined) continue;
        const e = st.edges.get(ek);
        let kind: NavEdge['kind'] = 'walk';
        let via: string | undefined;
        if (e) {
          if (!e.open) continue;
          if (e.portal) {
            kind = 'portal';
            via = e.portal;
          }
        }
        const za = st.zAt.get(k) ?? layer.z;
        const zb = st.zAt.get(key(nx, ny)) ?? layer.z;
        if (Math.abs(za - zb) > player.step) continue;
        link(a, b, g + Math.abs(za - zb), kind, via);
      }
    }
  }

  for (const v of verticals) {
    const a = index.get(`${v.spec.from_layer}|${key(v.spec.from_cell[0], v.spec.from_cell[1])}`);
    const b = index.get(`${v.spec.to_layer}|${key(v.spec.to_cell[0], v.spec.to_cell[1])}`);
    if (a === undefined || b === undefined) continue;
    v.fromNode = a;
    v.toNode = b;
    const cost = Math.abs(v.rise) * 1.5 + Math.max(1, v.footprint[2] + v.footprint[3]) * g;
    link(a, b, cost, 'vertical', v.spec.id);
    // Stairs and ramps also join every cell of their footprint on both layers,
    // so a wide staircase is not a single-cell pinch point in the graph.
    if (v.spec.kind === 'stairs' || v.spec.kind === 'ramp') {
      for (const [x, y] of rectCells(v.footprint)) {
        const lower = index.get(`${v.spec.from_layer}|${key(x, y)}`);
        const upper = index.get(`${v.spec.to_layer}|${key(x, y)}`);
        if (lower !== undefined && lower !== a) link(a, lower, g, 'vertical', v.spec.id);
        if (upper !== undefined && upper !== b) link(b, upper, g, 'vertical', v.spec.id);
      }
    }
  }

  const adjacency: number[][] = nodes.map(() => []);
  for (let i = 0; i < edges.length; i++) {
    adjacency[edges[i].a].push(i);
    adjacency[edges[i].b].push(i);
  }
  return { nodes, edges, index, adjacency };
}
