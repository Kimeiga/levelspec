/**
 * The control condition.
 *
 * This is what happens when each room is emitted independently: a loop that
 * creates walls, a floor and a ceiling per space, and "opens" a door by
 * nudging a panel a millimetre in front of the wall it failed to cut.
 *
 * Every box it produces is individually watertight and consistently wound.
 * That is precisely the point — primitive validity says nothing about
 * collection validity, and a screenshot cannot tell you the difference.
 */

import { DEFAULTS, type LevelSpec, type Solid } from './types.ts';
import { rectCells } from './grid.ts';

/** Deterministic per-id jitter, standing in for independently derived numbers. */
function jitter(id: string, scale = 0.006): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (((h >>> 0) % 2000) / 1000 - 1) * scale;
}

export function compileNaive(spec: LevelSpec): { solids: Solid[] } {
  const g = spec.grid ?? DEFAULTS.grid;
  const wt = spec.wall_thickness ?? DEFAULTS.wall_thickness;
  const ft = spec.floor_thickness ?? DEFAULTS.floor_thickness;
  const solids: Solid[] = [];

  for (const layer of spec.layers) {
    for (const space of layer.spaces) {
      const j = jitter(space.id);
      const z = layer.z + (space.z_offset ?? 0);
      const h = space.height ?? layer.height;
      const [cx, cy, cw, cd] = space.rect;
      const x0 = cx * g + j;
      const y0 = cy * g + j;
      const x1 = (cx + cw) * g + j;
      const y1 = (cy + cd) * g + j;

      // Four perimeter walls, derived by this room alone. The room next door
      // derives its own, at almost — but not exactly — the same place.
      const walls: [string, number, number, number, number][] = [
        ['w', x0 - wt / 2, y0 - wt / 2, x0 + wt / 2, y1 + wt / 2],
        ['e', x1 - wt / 2, y0 - wt / 2, x1 + wt / 2, y1 + wt / 2],
        ['s', x0 - wt / 2, y0 - wt / 2, x1 + wt / 2, y0 + wt / 2],
        ['n', x0 - wt / 2, y1 - wt / 2, x1 + wt / 2, y1 + wt / 2],
      ];
      for (const [side, ax0, ay0, ax1, ay1] of walls) {
        solids.push({
          id: `naive_${space.id}_${side}`,
          role: 'static_hard',
          box: { min: [ax0, ay0, z], max: [ax1, ay1, z + h] },
          layer: layer.id,
          spaces: [space.id],
          dynamic: false,
        });
      }

      solids.push({
        id: `naive_${space.id}_floor`,
        role: 'floor',
        box: { min: [x0, y0, z - ft], max: [x1, y1, z] },
        layer: layer.id,
        spaces: [space.id],
        dynamic: false,
      });
      // A decorative floor laid straight on top of the structural one.
      solids.push({
        id: `naive_${space.id}_floor_trim`,
        role: 'floor',
        box: { min: [x0, y0, z - ft * 0.5], max: [x1, y1, z] },
        layer: layer.id,
        spaces: [space.id],
        dynamic: false,
      });
      // A ceiling for this room, coincident with the floor of the storey above.
      solids.push({
        id: `naive_${space.id}_ceiling`,
        role: 'roof',
        box: { min: [x0, y0, z + h], max: [x1, y1, z + h + ft] },
        layer: layer.id,
        spaces: [space.id],
        dynamic: false,
      });
    }

    // Doors: the wall was never cut, so the "door" is a panel placed a
    // millimetre in front of it. This is the fix that hides the symptom.
    for (const portal of layer.portals ?? []) {
      const a = layer.spaces.find((s) => s.id === portal.between[0]);
      const b = layer.spaces.find((s) => s.id === portal.between[1]);
      const host = a ?? b;
      if (!host) continue;
      const hint = portal.hint ?? [host.rect[0], host.rect[1]];
      const z = layer.z + (host.z_offset ?? 0);
      const w = typeof portal.width_cells === 'number' ? portal.width_cells : 1;
      solids.push({
        id: `naive_panel_${portal.id}`,
        role: 'door_panel',
        box: {
          min: [hint[0] * g - 0.001, hint[1] * g - 0.001, z],
          max: [(hint[0] + w) * g + 0.001, hint[1] * g + wt + 0.001, z + 2.1],
        },
        layer: layer.id,
        spaces: [],
        dynamic: false,
        label: portal.id,
      });
    }
  }

  // Cover is emitted the same way in both paths; it is not the problem.
  for (const c of spec.covers ?? []) {
    const layer = spec.layers.find((l) => l.id === c.layer);
    if (!layer) continue;
    const z = layer.z + (c.z_offset ?? 0);
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const [x, y] of rectCells(c.rect)) {
      minX = Math.min(minX, x * g);
      minY = Math.min(minY, y * g);
      maxX = Math.max(maxX, (x + 1) * g);
      maxY = Math.max(maxY, (y + 1) * g);
    }
    solids.push({
      id: `naive_${c.id}`,
      role: 'cover',
      box: { min: [minX, minY, z], max: [maxX, maxY, z + c.height] },
      layer: c.layer,
      spaces: [],
      dynamic: false,
    });
  }

  return { solids };
}
