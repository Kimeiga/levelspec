import type { Diagnostic, EdgeRecord, LayerSpec, LevelSpec, SpaceSpec } from './types.ts';
import { CellSet, key } from './grid.ts';

const EPS = 1e-6;

export interface LayerState {
  spec: LayerSpec;
  occ: Map<string, string>;
  edges: Map<string, EdgeRecord>;
  runs: import('./types.ts').BoundaryRun[];
  holes: CellSet;
  heightAt: Map<string, number>;
  zAt: Map<string, number>;
}

type Report = (
  code: string,
  objects: string[],
  message: string,
  extra?: Partial<Diagnostic>,
) => void;

interface OverlapRecord {
  a: string;
  b: string;
  layer: string;
  cells: string[];
}

interface AbsorbedRecord {
  owner: string;
  shadowed: string;
  layer: string;
  cells: string[];
  conflict: boolean;
}

interface RasterState {
  occ: Map<string, string>;
  heightAt: Map<string, number>;
  zAt: Map<string, number>;
}

function validateSpaceId(space: SpaceSpec, layer: LayerSpec, seen: Set<string>, err: Report): void {
  if (seen.has(space.id)) {
    err('DUPLICATE_SPACE_ID', [space.id, layer.id], `Space id "${space.id}" is declared twice.`);
  }
  seen.add(space.id);
}

function rasterCells(space: SpaceSpec, err: Report): CellSet {
  const cells = new CellSet();
  cells.addRect(space.rect);
  for (const rect of space.extra ?? []) cells.addRect(rect);
  for (const rect of space.subtract ?? []) cells.deleteRect(rect);
  if (cells.size === 0) {
    err('EMPTY_SPACE', [space.id], `Space "${space.id}" rasterizes to zero cells.`);
  }
  return cells;
}

function recordBlockedOverlap(
  layer: LayerSpec,
  previous: string,
  spaceId: string,
  cell: string,
  overlapCells: Map<string, OverlapRecord>,
): void {
  const pair = `${layer.id}|${previous}|${spaceId}`;
  let record = overlapCells.get(pair);
  if (!record) {
    record = { a: previous, b: spaceId, layer: layer.id, cells: [] };
    overlapCells.set(pair, record);
  }
  record.cells.push(cell);
}

function recordAllowedOverlap(
  layer: LayerSpec,
  previous: string,
  spaceId: string,
  cell: string,
  height: number,
  z: number,
  state: RasterState,
  absorbed: Map<string, AbsorbedRecord>,
): void {
  const pair = `${layer.id}|${previous}|${spaceId}`;
  let record = absorbed.get(pair);
  if (!record) {
    record = {
      owner: previous,
      shadowed: spaceId,
      layer: layer.id,
      cells: [],
      conflict: false,
    };
    absorbed.set(pair, record);
  }
  record.cells.push(cell);
  const heightConflict = Math.abs((state.heightAt.get(cell) ?? height) - height) > EPS;
  const elevationConflict = Math.abs((state.zAt.get(cell) ?? z) - z) > EPS;
  if (heightConflict || elevationConflict) record.conflict = true;
}

function recordOverlap(
  layer: LayerSpec,
  previous: string,
  spaceId: string,
  cell: string,
  height: number,
  z: number,
  state: RasterState,
  overlapCells: Map<string, OverlapRecord>,
  absorbed: Map<string, AbsorbedRecord>,
): void {
  if (layer.allow_space_overlap) {
    recordAllowedOverlap(layer, previous, spaceId, cell, height, z, state, absorbed);
    return;
  }
  recordBlockedOverlap(layer, previous, spaceId, cell, overlapCells);
}

function claimCell(
  layer: LayerSpec,
  space: SpaceSpec,
  cell: string,
  height: number,
  z: number,
  state: RasterState,
  overlapCells: Map<string, OverlapRecord>,
  absorbed: Map<string, AbsorbedRecord>,
): boolean {
  const previous = state.occ.get(cell);
  if (previous && previous !== space.id) {
    recordOverlap(layer, previous, space.id, cell, height, z, state, overlapCells, absorbed);
    return false;
  }
  state.occ.set(cell, space.id);
  state.heightAt.set(cell, height);
  state.zAt.set(cell, z);
  return true;
}

function rasterizeSpace(
  layer: LayerSpec,
  space: SpaceSpec,
  state: RasterState,
  overlapCells: Map<string, OverlapRecord>,
  absorbed: Map<string, AbsorbedRecord>,
  err: Report,
): void {
  const cells = rasterCells(space, err);
  const height = space.height ?? layer.height;
  const z = layer.z + (space.z_offset ?? 0);
  let owned = 0;

  for (const cell of cells.keys()) {
    if (claimCell(layer, space, cell, height, z, state, overlapCells, absorbed)) owned++;
  }

  if (owned === 0 && cells.size > 0) {
    err(
      'SPACE_FULLY_ABSORBED',
      [space.id, layer.id],
      `Space "${space.id}" is entirely covered by spaces declared before it and owns no cells of its own.`,
      {
        measured: 0,
        required: 1,
        suggestions: [
          `Declare "${space.id}" before the space that covers it`,
          'Move it clear',
          'Merge the two with "extra" rather than overlapping them',
        ],
      },
    );
  }
}

function rasterizeLayer(
  layer: LayerSpec,
  overlapCells: Map<string, OverlapRecord>,
  absorbed: Map<string, AbsorbedRecord>,
  err: Report,
): LayerState {
  const state: RasterState = {
    occ: new Map(),
    heightAt: new Map(),
    zAt: new Map(),
  };
  const seenSpaces = new Set<string>();

  for (const space of layer.spaces) {
    validateSpaceId(space, layer, seenSpaces, err);
    rasterizeSpace(layer, space, state, overlapCells, absorbed, err);
  }

  return {
    spec: layer,
    occ: state.occ,
    edges: new Map(),
    runs: [],
    holes: new CellSet(),
    heightAt: state.heightAt,
    zAt: state.zAt,
  };
}

function reportOverlapCells(overlapCells: Map<string, OverlapRecord>, err: Report): void {
  for (const record of overlapCells.values()) {
    err(
      'SPACE_OVERLAP',
      [record.a, record.b, record.layer],
      `Spaces "${record.a}" and "${record.b}" overlap over ${record.cells.length} cell(s) on layer "${record.layer}", starting at ${record.cells[0]}. The first one declared owns them.`,
      {
        measured: record.cells.length,
        required: 0,
        suggestions: [
          `Move "${record.b}" clear of "${record.a}"`,
          'Merge them into one space using "extra"',
          'Set allow_space_overlap: true if the union is intended',
        ],
      },
    );
  }
}

function reportAbsorbedCells(
  absorbed: Map<string, AbsorbedRecord>,
  err: Report,
  warn: Report,
): void {
  for (const record of absorbed.values()) {
    if (record.conflict) {
      err(
        'OVERLAP_HEIGHT_CONFLICT',
        [record.shadowed, record.owner, record.layer],
        `"${record.shadowed}" overlaps "${record.owner}" over ${record.cells.length} cell(s) and the two disagree about the floor or ceiling there, so one of them is wrong wherever they meet.`,
        {
          measured: record.cells.length,
          required: 0,
          suggestions: [
            'Give both spaces the same height and elevation over the overlap',
            'Split the overlap into a space of its own',
          ],
        },
      );
      continue;
    }

    warn(
      'SPACE_ABSORBED',
      [record.shadowed, record.owner, record.layer],
      `"${record.shadowed}" gives up ${record.cells.length} cell(s) to "${record.owner}", which was declared first. They agree about the floor there, so the union is what was drawn.`,
      { measured: record.cells.length },
    );
  }
}

export function rasterizeLayers(spec: LevelSpec, err: Report, warn: Report): Map<string, LayerState> {
  const layers = new Map<string, LayerState>();
  const overlapCells = new Map<string, OverlapRecord>();
  const absorbed = new Map<string, AbsorbedRecord>();

  for (const layer of spec.layers) {
    layers.set(layer.id, rasterizeLayer(layer, overlapCells, absorbed, err));
  }

  reportOverlapCells(overlapCells, err);
  reportAbsorbedCells(absorbed, err, warn);

  for (const layer of spec.layers) {
    const state = layers.get(layer.id)!;
    for (const rect of layer.floor_holes ?? []) state.holes.addRect(rect);
  }

  return layers;
}
