/**
 * Level archetypes.
 *
 * Every one of these is cycle-rich on purpose. A dungeon of branching corridors
 * makes you walk the same hallway twice: you reach a dead end, turn round, and
 * the game is asking you to re-tread ground you have already cleared. A lane
 * map does not have that problem — the routes reconnect, so there is always a
 * way onward rather than back, and "which way round" is a real decision.
 *
 * So the shapes here are lanes, rings, and stacked floors joined at both ends.
 * The generator then *checks* the property rather than trusting it: every
 * archetype must yield at least two edge-disjoint routes from spawn to exit.
 */

import type { Rect } from '../core/types.ts';
import { Builder } from './builder.ts';
import type { Rng } from './rng.ts';
import type { Theme } from './themes.ts';

export interface ArchetypeContext {
  rng: Rng;
  theme: Theme;
  depth: number;
  id: string;
}

export interface ArchetypeResult {
  builder: Builder;
  /** Where the run starts and where it ends. */
  spawn: { layer: string; cell: [number, number] };
  exit: { layer: string; cell: [number, number] };
  /** Rooms the generator may drop pickups and enemies into. */
  rooms: { layer: string; space: string }[];
}

export type Archetype = {
  id: string;
  name: string;
  build(ctx: ArchetypeContext): ArchetypeResult | null;
};

const H = (rng: Rng, theme: Theme): number => rng.float(theme.ceiling[0], theme.ceiling[1]);

/** Scale the map with depth, but keep it walkable in a couple of minutes. */
function sizeFor(rng: Rng, depth: number): number {
  return Math.min(1.55, 0.95 + depth * 0.055 + rng.float(-0.06, 0.1));
}

// ---------------------------------------------------------------------------
// Three lanes: the classic. Two ends, three ways between them, cross-links.
// ---------------------------------------------------------------------------

const threeLane: Archetype = {
  id: 'three_lane',
  name: 'Three Lanes',
  build({ rng, theme, depth, id }) {
    const s = sizeFor(rng, depth);
    const b = new Builder(rng, { id, name: 'Three Lanes', wallThickness: theme.wallThickness });
    const h = H(rng, theme);
    b.layer('ground', { z: 0, height: h, roof: rng.bool(0.45), internalWalls: false }, 'Ground');

    const laneW = Math.round(rng.int(9, 13) * s);
    const gap = Math.round(rng.int(4, 7) * s);
    const runY = Math.round(rng.int(30, 40) * s);
    const endD = Math.round(rng.int(9, 12) * s);
    const x0 = 0;
    const xs = [x0, x0 + laneW + gap, x0 + 2 * (laneW + gap)];
    const totalW = xs[2] + laneW - x0;

    const yStart = 0;
    const ySpawnTop = yStart + endD;
    const yExitBottom = ySpawnTop + runY;
    const yEnd = yExitBottom + endD;

    // Both ends span the full width, so every lane reaches both.
    b.space('ground', 'start_hall', [x0, yStart, totalW, endD], { label: 'Muster', role: 'spawn' });
    b.space('ground', 'end_hall', [x0, yExitBottom, totalW, endD], { label: 'Terminus', role: 'site' });

    const laneIds: string[] = [];
    const elev = [0, rng.pick([0, 0.4]), rng.pick([0, -0.4, 0.4])];
    for (let i = 0; i < 3; i++) {
      const lid = `lane_${i}`;
      b.space('ground', lid, [xs[i], ySpawnTop, laneW, runY], {
        label: ['West Lane', 'Centre Lane', 'East Lane'][i],
        role: 'lane',
        zOffset: elev[i],
      });
      laneIds.push(lid);
    }

    // Cross-links between neighbouring lanes: these are what make the cycles.
    const links = rng.int(2, 3);
    const linkIds: string[] = [];
    for (let i = 0; i < links; i++) {
      const t = (i + 1) / (links + 1);
      const y = Math.round(ySpawnTop + runY * t) - 2;
      for (let side = 0; side < 2; side++) {
        const lid = `link_${i}_${side}`;
        const lx = xs[side] + laneW;
        if (b.space('ground', lid, [lx, y, gap, rng.int(4, 6)], { label: 'Connector', role: 'corridor' }))
          linkIds.push(lid);
      }
    }

    // The dead space between lanes becomes solid: that is what makes them lanes.
    for (const a of laneIds) {
      b.wall('ground', a, 'start_hall', 'hard');
      b.wall('ground', a, 'end_hall', 'hard');
    }
    for (let i = 0; i < 3; i++) {
      const cx = xs[i] + Math.floor(laneW / 2);
      b.portal('ground', {
        id: `mouth_s_${i}`,
        between: ['start_hall', laneIds[i]],
        kind: 'arch',
        width_cells: Math.max(3, Math.round(laneW * 0.5)),
        hint: [cx, ySpawnTop],
      });
      b.portal('ground', {
        id: `mouth_n_${i}`,
        between: [laneIds[i], 'end_hall'],
        kind: 'arch',
        width_cells: Math.max(3, Math.round(laneW * 0.5)),
        hint: [cx, yExitBottom],
      });
    }

    decorate(b, rng, theme, 'ground', [...laneIds, 'start_hall', 'end_hall', ...linkIds]);
    addFloaters(b, rng, theme, 'ground', laneIds, h);

    const spawnCell = b.freeCell('ground', 'start_hall', 2) ?? [x0 + 2, yStart + 2];
    const exitCell = b.freeCell('ground', 'end_hall', 2) ?? [x0 + totalW - 3, yEnd - 3];
    return {
      builder: b,
      spawn: { layer: 'ground', cell: spawnCell },
      exit: { layer: 'ground', cell: exitCell },
      rooms: [...laneIds, ...linkIds, 'start_hall', 'end_hall'].map((sp) => ({ layer: 'ground', space: sp })),
    };
  },
};

// ---------------------------------------------------------------------------
// A ring around a sealed core. Pure cycle: you can always keep going.
// ---------------------------------------------------------------------------

const ring: Archetype = {
  id: 'ring',
  name: 'Ring',
  build({ rng, theme, depth, id }) {
    const s = sizeFor(rng, depth);
    const b = new Builder(rng, { id, name: 'Ring', wallThickness: theme.wallThickness });
    const h = H(rng, theme);
    b.layer('ground', { z: 0, height: h, roof: rng.bool(0.5), internalWalls: false }, 'Ground');

    const core = Math.round(rng.int(12, 18) * s);
    const band = Math.round(rng.int(7, 10) * s);
    const o = 0;
    const inner = o + band;
    const far = inner + core;
    const outer = far + band;

    b.space('ground', 'core', [inner, inner, core, core], { label: 'Core', role: 'room' });
    b.space('ground', 'ring_s', [o, o, outer - o, band], { label: 'South Walk', role: 'lane' });
    b.space('ground', 'ring_n', [o, far, outer - o, band], { label: 'North Walk', role: 'lane', zOffset: rng.pick([0, 0.4]) });
    b.space('ground', 'ring_w', [o, inner, band, core], { label: 'West Walk', role: 'lane' });
    b.space('ground', 'ring_e', [far, inner, band, core], { label: 'East Walk', role: 'lane', zOffset: rng.pick([0, 0.4]) });

    // Side chambers hanging off the ring, each with two doors so they are
    // pass-through rather than pockets.
    const bays: string[] = [];
    const bayD = Math.round(rng.int(7, 10) * s);
    const sides: [string, Rect, [number, number], [number, number]][] = [
      ['bay_s', [inner, o - bayD, core, bayD], [inner + 2, o], [far - 3, o]],
      ['bay_n', [inner, outer, core, bayD], [inner + 2, outer], [far - 3, outer]],
      ['bay_w', [o - bayD, inner, bayD, core], [o, inner + 2], [o, far - 3]],
      ['bay_e', [outer, inner, bayD, core], [outer, inner + 2], [outer, far - 3]],
    ];
    for (const [bid, rect, hintA, hintB] of rng.sample(sides, rng.int(2, 4))) {
      if (!b.space('ground', bid, rect, { label: 'Bay', role: 'room' })) continue;
      const host = bid === 'bay_s' ? 'ring_s' : bid === 'bay_n' ? 'ring_n' : bid === 'bay_w' ? 'ring_w' : 'ring_e';
      b.wall('ground', bid, host, 'hard');
      b.portal('ground', { id: `${bid}_a`, between: [bid, host], kind: 'arch', width_cells: 3, hint: hintA });
      b.portal('ground', { id: `${bid}_b`, between: [bid, host], kind: 'door', width_cells: 2, hint: hintB });
      bays.push(bid);
    }

    // The core is a solid island unless we cut it — two doors keeps the cycle.
    for (const side of ['ring_s', 'ring_n', 'ring_w', 'ring_e']) b.wall('ground', 'core', side, 'hard');
    const coreDoors = rng.sample(
      [
        ['ring_s', [inner + Math.floor(core / 2), inner]],
        ['ring_n', [inner + Math.floor(core / 2), far]],
        ['ring_w', [inner, inner + Math.floor(core / 2)]],
        ['ring_e', [far, inner + Math.floor(core / 2)]],
      ] as [string, [number, number]][],
      2,
    );
    coreDoors.forEach(([side, hint], i) =>
      b.portal('ground', {
        id: `core_${i}`,
        between: ['core', side],
        kind: i === 0 ? 'arch' : 'door',
        width_cells: i === 0 ? 3 : 2,
        hint,
      }),
    );

    decorate(b, rng, theme, 'ground', ['core', 'ring_s', 'ring_n', 'ring_w', 'ring_e', ...bays]);
    addFloaters(b, rng, theme, 'ground', ['ring_s', 'ring_n'], h);

    const spawnSpace = 'ring_s';
    const exitSpace = bays.length ? rng.pick(bays) : 'ring_n';
    const spawnCell = b.freeCell('ground', spawnSpace, 2) ?? [o + 2, o + 2];
    const exitCell = b.freeCell('ground', exitSpace, 2) ?? [inner + 2, far + 2];
    return {
      builder: b,
      spawn: { layer: 'ground', cell: spawnCell },
      exit: { layer: 'ground', cell: exitCell },
      rooms: ['core', 'ring_s', 'ring_n', 'ring_w', 'ring_e', ...bays].map((sp) => ({ layer: 'ground', space: sp })),
    };
  },
};

// ---------------------------------------------------------------------------
// Two floors, joined at both ends. The cycle runs vertically.
// ---------------------------------------------------------------------------

const stacked: Archetype = {
  id: 'stacked',
  name: 'Stacked',
  build({ rng, theme, depth, id }) {
    const s = sizeFor(rng, depth);
    const b = new Builder(rng, { id, name: 'Stacked', wallThickness: theme.wallThickness });
    const h = Math.max(3.4, H(rng, theme) * 0.82);
    const ft = 0.22;
    b.layer('lower', { z: 0, height: h, roof: false }, 'Lower');
    b.layer('upper', { z: h + ft, height: h, roof: true }, 'Upper');

    const w = Math.round(rng.int(30, 40) * s);
    const d = Math.round(rng.int(22, 30) * s);
    const midX = Math.floor(w / 2);

    for (const [layer, prefix] of [
      ['lower', 'l'],
      ['upper', 'u'],
    ] as const) {
      b.space(layer, `${prefix}_west`, [0, 0, midX, d], { label: 'West Floor', role: 'room' });
      b.space(layer, `${prefix}_east`, [midX, 0, w - midX, d], { label: 'East Floor', role: 'room' });
      b.wall(layer, `${prefix}_west`, `${prefix}_east`, rng.bool(0.4) ? 'soft' : 'hard');
      const cuts = rng.int(2, 3);
      for (let i = 0; i < cuts; i++) {
        const y = Math.round((d * (i + 1)) / (cuts + 1));
        b.portal(layer, {
          id: `${prefix}_split_${i}`,
          between: [`${prefix}_west`, `${prefix}_east`],
          kind: i === 0 ? 'arch' : 'door',
          width_cells: i === 0 ? 4 : 2,
          hint: [midX, y],
        });
      }
    }

    // Two flights at opposite corners: go up one, come down the other.
    const run = 7;
    const flights: [string, string, [number, number], [number, number]][] = [
      ['stair_a', 'N', [4, 3], [4, 3 + run]],
      ['stair_b', 'S', [w - 5, d - 4], [w - 5, d - 4 - run]],
    ];
    let made = 0;
    for (const [fid, dirn, from, to] of flights) {
      if (
        b.flight({
          id: fid,
          label: 'Stairs',
          from_layer: 'lower',
          to_layer: 'upper',
          from_cell: from,
          to_cell: to,
          kind: 'stairs',
          width: 2.4,
          direction: dirn as 'N' | 'S',
        })
      )
        made++;
    }
    if (made < 2) return null;

    // Hatches make extra one-way shortcuts downward, which is a real choice.
    for (let i = 0; i < rng.int(1, 3); i++) {
      const cell = b.freeCell('upper', rng.pick(['u_west', 'u_east']), 2);
      if (!cell) continue;
      b.flight({
        id: `hatch_${i}`,
        label: 'Hatch',
        from_layer: 'lower',
        to_layer: 'upper',
        from_cell: cell,
        to_cell: cell,
        kind: 'hatch',
        size_cells: [1, 1],
        destructible: true,
      });
    }

    decorate(b, rng, theme, 'lower', ['l_west', 'l_east']);
    decorate(b, rng, theme, 'upper', ['u_west', 'u_east']);

    const spawnCell = b.freeCell('lower', 'l_west', 2) ?? [2, 2];
    const exitCell = b.freeCell('upper', 'u_east', 2) ?? [w - 3, d - 3];
    return {
      builder: b,
      spawn: { layer: 'lower', cell: spawnCell },
      exit: { layer: 'upper', cell: exitCell },
      rooms: [
        { layer: 'lower', space: 'l_west' },
        { layer: 'lower', space: 'l_east' },
        { layer: 'upper', space: 'u_west' },
        { layer: 'upper', space: 'u_east' },
      ],
    };
  },
};

// ---------------------------------------------------------------------------
// A building in a yard. The yard is a ring, the building is the puzzle.
// ---------------------------------------------------------------------------

const compound: Archetype = {
  id: 'compound',
  name: 'Compound',
  build({ rng, theme, depth, id }) {
    const s = sizeFor(rng, depth);
    const b = new Builder(rng, { id, name: 'Compound', wallThickness: theme.wallThickness });
    const h = Math.max(3.4, H(rng, theme) * 0.85);
    const ft = 0.22;
    const twoStorey = depth >= 2 && rng.bool(0.7);
    b.layer('ground', { z: 0, height: h, roof: false }, 'Ground');
    if (twoStorey) b.layer('upper', { z: h + ft, height: h, roof: true }, 'Upper');

    const bw = Math.round(rng.int(18, 24) * s);
    const bd = Math.round(rng.int(16, 22) * s);
    const yard = Math.round(rng.int(8, 12) * s);
    const bx = 0;
    const by = 0;
    const halfX = Math.floor(bw / 2);
    const halfY = Math.floor(bd / 2);

    // Yard first: one space wrapping the building, so it is a ring by shape.
    b.space('ground', 'yard', [bx - yard, by - yard, bw + yard * 2, bd + yard * 2], {
      label: 'Yard',
      role: 'exterior',
      subtract: [[bx, by, bw, bd]],
    });

    const quads: [string, Rect][] = [
      ['hall_sw', [bx, by, halfX, halfY]],
      ['hall_se', [bx + halfX, by, bw - halfX, halfY]],
      ['hall_nw', [bx, by + halfY, halfX, bd - halfY]],
      ['hall_ne', [bx + halfX, by + halfY, bw - halfX, bd - halfY]],
    ];
    for (const [qid, rect] of quads) b.space('ground', qid, rect, { label: 'Hall', role: 'room' });

    // Interior walls with two openings each: the inside is a ring too.
    const pairs: [string, string, [number, number], [number, number]][] = [
      ['hall_sw', 'hall_se', [bx + halfX, by + 2], [bx + halfX, by + halfY - 3]],
      ['hall_nw', 'hall_ne', [bx + halfX, by + halfY + 2], [bx + halfX, by + bd - 3]],
      ['hall_sw', 'hall_nw', [bx + 2, by + halfY], [bx + halfX - 3, by + halfY]],
      ['hall_se', 'hall_ne', [bx + halfX + 2, by + halfY], [bx + bw - 3, by + halfY]],
    ];
    pairs.forEach(([a, c, h1, h2], i) => {
      b.wall('ground', a, c, rng.weighted([['hard', 3], ['soft', 2]] as const));
      b.portal('ground', { id: `in_${i}_a`, between: [a, c], kind: 'arch', width_cells: 3, hint: h1 });
      if (rng.bool(0.75))
        b.portal('ground', { id: `in_${i}_b`, between: [a, c], kind: 'door', width_cells: 2, hint: h2 });
    });

    // Ways in from the yard — at least three, on different faces.
    const doors: [string, [number, number]][] = [
      ['hall_sw', [bx + 3, by]],
      ['hall_se', [bx + bw, by + 3]],
      ['hall_ne', [bx + bw - 4, by + bd]],
      ['hall_nw', [bx, by + bd - 4]],
    ];
    rng.sample(doors, rng.int(3, 4)).forEach(([host, hint], i) => {
      b.portal('ground', {
        id: `breach_${i}`,
        between: [host, 'yard'],
        kind: i === 0 ? 'arch' : 'door',
        width_cells: i === 0 ? 3 : 2,
        hint,
      });
    });
    // Windows on the rest, so the building leaks sightlines but not bodies.
    for (const [host] of doors)
      b.portal('ground', {
        id: `win_${host}`,
        between: [host, 'yard'],
        kind: 'window',
        width_cells: 2,
        hint: [bx + rng.int(2, bw - 3), rng.bool() ? by : by + bd],
      });

    if (twoStorey) {
      for (const [qid, rect] of quads) b.space('upper', `up_${qid.slice(5)}`, rect, { label: 'Upper', role: 'room' });
      const up = ['up_sw', 'up_se', 'up_nw', 'up_ne'];
      const upPairs: [string, string, [number, number]][] = [
        ['up_sw', 'up_se', [bx + halfX, by + 3]],
        ['up_nw', 'up_ne', [bx + halfX, by + bd - 4]],
        ['up_sw', 'up_nw', [bx + 3, by + halfY]],
        ['up_se', 'up_ne', [bx + bw - 4, by + halfY]],
      ];
      upPairs.forEach(([a, c, hint], i) => {
        b.wall('upper', a, c, rng.weighted([['hard', 2], ['soft', 3]] as const));
        b.portal('upper', { id: `up_${i}`, between: [a, c], kind: i % 2 ? 'door' : 'arch', width_cells: i % 2 ? 2 : 3, hint });
      });

      // Two staircases at opposite quadrants, so the building loops vertically.
      const run = 6;
      const a = b.flight({
        id: 'stair_a', label: 'Stairs', from_layer: 'ground', to_layer: 'upper',
        from_cell: [bx + 3, by + 3], to_cell: [bx + 3, by + 3 + run], kind: 'stairs', width: 2.2, direction: 'N',
      });
      const c = b.flight({
        id: 'stair_b', label: 'Stairs', from_layer: 'ground', to_layer: 'upper',
        from_cell: [bx + bw - 4, by + bd - 4], to_cell: [bx + bw - 4, by + bd - 4 - run], kind: 'stairs', width: 2.2, direction: 'S',
      });
      if (!a && !c) return null;
      for (let i = 0; i < rng.int(1, 2); i++) {
        const cell = b.freeCell('upper', rng.pick(up), 2);
        if (cell)
          b.flight({
            id: `hatch_${i}`, label: 'Hatch', from_layer: 'ground', to_layer: 'upper',
            from_cell: cell, to_cell: cell, kind: 'hatch', size_cells: [1, 1], destructible: true,
          });
      }
      decorate(b, rng, theme, 'upper', up);
    }

    decorate(b, rng, theme, 'ground', ['yard', ...quads.map(([q]) => q)]);

    const spawnCell = b.freeCell('ground', 'yard', 2) ?? [bx - yard + 2, by - yard + 2];
    const exitLayer = twoStorey && rng.bool(0.7) ? 'upper' : 'ground';
    const exitSpace = exitLayer === 'upper' ? rng.pick(['up_ne', 'up_nw', 'up_se']) : rng.pick(['hall_ne', 'hall_nw']);
    const exitCell = b.freeCell(exitLayer, exitSpace, 2);
    if (!exitCell) return null;
    const rooms = [
      ...quads.map(([q]) => ({ layer: 'ground', space: q })),
      { layer: 'ground', space: 'yard' },
    ];
    if (twoStorey) for (const u of ['up_sw', 'up_se', 'up_nw', 'up_ne']) rooms.push({ layer: 'upper', space: u });
    return { builder: b, spawn: { layer: 'ground', cell: spawnCell }, exit: { layer: exitLayer, cell: exitCell }, rooms };
  },
};

// ---------------------------------------------------------------------------
// Bridges: two land masses over a drop, joined at several heights. Aztec.
// ---------------------------------------------------------------------------

const bridges: Archetype = {
  id: 'bridges',
  name: 'Bridges',
  build({ rng, theme, depth, id }) {
    const s = sizeFor(rng, depth);
    const b = new Builder(rng, { id, name: 'Bridges', wallThickness: theme.wallThickness });
    const h = H(rng, theme);
    const ft = 0.22;
    const drop = rng.float(3.8, 4.6);

    const bank = Math.round(rng.int(15, 20) * s);
    const chasm = Math.round(rng.int(12, 17) * s);
    const d = Math.round(rng.int(28, 36) * s);
    const eastX = bank + chasm;
    const rampRun = 7;
    const rampW = 5;

    // The gorge is its own storey, tucked under each bank where the ramps
    // come down. The high road and the low road are genuinely different
    // places, and both of them go all the way across.
    // The gorge's ceiling *is* the ground floor slab, so the two storeys stack
    // the way any two storeys do rather than growing through each other.
    b.layer('gorge', { z: -drop, height: drop - ft, roof: false, internalWalls: false }, 'Gorge');
    b.layer('ground', { z: 0, height: h, roof: false, internalWalls: false }, 'Ground');

    const wy = 4;
    const ey = d - 4 - rampW;
    if (
      !b.space('gorge', 'gorge', [bank, 2, chasm, d - 4], {
        label: 'Gorge',
        role: 'lane',
        extra: [
          [bank - rampRun - 2, wy, rampRun + 2, rampW],
          [eastX, ey, rampRun + 2, rampW],
        ],
      })
    )
      return null;

    b.space('ground', 'west_bank', [0, 0, bank, d], { label: 'West Bank', role: 'room' });
    b.space('ground', 'east_bank', [eastX, 0, bank, d], { label: 'East Bank', role: 'room' });

    // Spans across the top at ground level, so the high road is a straight
    // walk and the choice is which crossing to take.
    const spanCount = rng.int(2, 3);
    const spanIds: string[] = [];
    for (let i = 0; i < spanCount; i++) {
      const y = Math.round((d * (i + 1)) / (spanCount + 1)) - 2;
      const sid = `span_${i}`;
      if (b.space('ground', sid, [bank, y, chasm, rng.int(4, 6)], { label: 'Span', role: 'lane' })) spanIds.push(sid);
    }
    if (spanIds.length < 2) return null;

    const downW = b.flight({
      id: 'down_w', label: 'Descent', from_layer: 'gorge', to_layer: 'ground',
      from_cell: [bank - 2, wy + 2], to_cell: [bank - rampRun - 1, wy + 2], kind: 'ramp', width: 3, direction: 'W',
    });
    const downE = b.flight({
      id: 'down_e', label: 'Descent', from_layer: 'gorge', to_layer: 'ground',
      from_cell: [eastX + 1, ey + 2], to_cell: [eastX + rampRun, ey + 2], kind: 'ramp', width: 3, direction: 'E',
    });
    if (!downW || !downE) return null;

    decorate(b, rng, theme, 'ground', ['west_bank', 'east_bank']);
    decorate(b, rng, theme, 'gorge', ['gorge']);

    const spawnCell = b.freeCell('ground', 'west_bank', 2);
    const exitCell = b.freeCell('ground', 'east_bank', 2);
    if (!spawnCell || !exitCell) return null;
    return {
      builder: b,
      spawn: { layer: 'ground', cell: spawnCell },
      exit: { layer: 'ground', cell: exitCell },
      rooms: [
        { layer: 'ground', space: 'west_bank' },
        { layer: 'ground', space: 'east_bank' },
        { layer: 'gorge', space: 'gorge' },
      ],
    };
  },
};

// ---------------------------------------------------------------------------
// Sky islands: platforms in nothing, joined in a loop. Mind the edges.
// ---------------------------------------------------------------------------

const skyIslands: Archetype = {
  id: 'sky_islands',
  name: 'Sky Islands',
  build({ rng, theme, depth, id }) {
    const s = sizeFor(rng, depth);
    const b = new Builder(rng, { id, name: 'Sky Islands', wallThickness: theme.wallThickness });
    const h = H(rng, theme);
    // One storey with a railing on every outside edge: the pads are the world
    // and everything else is a long way down.
    b.layer('sky', { z: 0, height: h, roof: false, railing: 1.15, internalWalls: false }, 'Sky');

    const cols = rng.int(3, 4);
    const rows = 2;
    const pad = Math.round(rng.int(12, 16) * s);
    const gap = Math.round(rng.int(7, 11) * s);
    const pitch = pad + gap;
    const walk = 4;
    const off = Math.floor((pad - walk) / 2);

    const islands: string[] = [];
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const iid = `pad_${c}_${r}`;
        const lift = rng.weighted([[0, 6], [0.4, 2], [-0.4, 2]] as const);
        if (!b.space('sky', iid, [c * pitch, r * pitch, pad, pad], { label: 'Platform', role: 'room', zOffset: lift }))
          return null;
        islands.push(iid);
      }

    // Causeways along every row, and down both outside columns. That is a
    // loop: whichever way you set off, you come back round.
    let joins = 0;
    for (let r = 0; r < rows; r++)
      for (let c = 0; c + 1 < cols; c++)
        if (b.space('sky', `walk_h_${c}_${r}`, [c * pitch + pad, r * pitch + off, gap, walk], { label: 'Causeway', role: 'lane' }))
          joins++;
    for (const c of [0, cols - 1])
      for (let r = 0; r + 1 < rows; r++)
        if (b.space('sky', `walk_v_${c}_${r}`, [c * pitch + off, r * pitch + pad, walk, gap], { label: 'Causeway', role: 'lane' }))
          joins++;
    if (joins < cols) return null;

    decorate(b, rng, theme, 'sky', islands);

    const spawnCell = b.freeCell('sky', 'pad_0_0', 2);
    const exitCell = b.freeCell('sky', `pad_${cols - 1}_${rows - 1}`, 2);
    if (!spawnCell || !exitCell) return null;
    return {
      builder: b,
      spawn: { layer: 'sky', cell: spawnCell },
      exit: { layer: 'sky', cell: exitCell },
      rooms: islands.map((sp) => ({ layer: 'sky', space: sp })),
    };
  },
};

// ---------------------------------------------------------------------------
// Fightyard: one readable arena with a raised middle. Pool Day.
// ---------------------------------------------------------------------------

const fightyard: Archetype = {
  id: 'fightyard',
  name: 'Fightyard',
  build({ rng, theme, depth, id }) {
    const s = sizeFor(rng, depth);
    const b = new Builder(rng, { id, name: 'Fightyard', wallThickness: theme.wallThickness });
    const h = H(rng, theme);
    b.layer('ground', { z: 0, height: h, roof: false, internalWalls: false }, 'Yard');

    const w = Math.round(rng.int(34, 44) * s);
    const d = Math.round(rng.int(28, 36) * s);
    const sunkW = Math.round(w * rng.float(0.34, 0.46));
    const sunkD = Math.round(d * rng.float(0.34, 0.46));
    const sx = Math.round((w - sunkW) / 2);
    const sy = Math.round((d - sunkD) / 2);
    const drop = rng.float(1.4, 2.2);

    // A doughnut of deck round a sunken pit: cover, sightlines, and one big
    // decision every time you cross.
    b.space('ground', 'deck', [0, 0, w, d], { label: 'Deck', role: 'room', subtract: [[sx, sy, sunkW, sunkD]] });
    b.space('ground', 'pit', [sx, sy, sunkW, sunkD], { label: 'The Pit', role: 'site', zOffset: -drop });

    // Ramps in and out at opposite corners, so the pit is a through-route.
    const run = Math.max(5, Math.round(drop / 0.35));
    const a = b.flight({
      id: 'pit_in', label: 'Ramp', from_layer: 'ground', to_layer: 'ground',
      from_cell: [sx + 2, sy + 2], to_cell: [sx + 2, sy - run + 1], kind: 'ramp', width: 3, direction: 'S',
    });
    const c = b.flight({
      id: 'pit_out', label: 'Ramp', from_layer: 'ground', to_layer: 'ground',
      from_cell: [sx + sunkW - 3, sy + sunkD - 3], to_cell: [sx + sunkW - 3, sy + sunkD + run - 2], kind: 'ramp', width: 3, direction: 'N',
    });
    if (!a && !c) return null;

    // Corner rooms hanging off the deck, each with two ways in.
    const rooms: string[] = ['deck', 'pit'];
    const rd = Math.round(rng.int(8, 11) * s);
    const corners: [string, Rect, [number, number], [number, number]][] = [
      ['nook_sw', [-rd, -rd, rd, rd + 6], [0, 2], [2, 0]],
      ['nook_ne', [w, d - 6, rd, rd + 6], [w, d - 3], [w + 2, d]],
    ];
    for (const [nid, rect, h1, h2] of rng.sample(corners, rng.int(1, 2))) {
      if (!b.space('ground', nid, rect, { label: 'Nook', role: 'room' })) continue;
      b.wall('ground', nid, 'deck', 'hard');
      b.portal('ground', { id: `${nid}_a`, between: [nid, 'deck'], kind: 'arch', width_cells: 3, hint: h1 });
      b.portal('ground', { id: `${nid}_b`, between: [nid, 'deck'], kind: 'door', width_cells: 2, hint: h2 });
      rooms.push(nid);
    }

    decorate(b, rng, theme, 'ground', rooms);
    const spawnCell = b.freeCell('ground', 'deck', 2) ?? [2, 2];
    const exitCell = b.freeCell('ground', rooms.length > 2 ? rooms[2] : 'pit', 2) ?? [sx + 2, sy + 2];
    return {
      builder: b,
      spawn: { layer: 'ground', cell: spawnCell },
      exit: { layer: 'ground', cell: exitCell },
      rooms: rooms.map((sp) => ({ layer: 'ground', space: sp })),
    };
  },
};

// ---------------------------------------------------------------------------
// Decoration — all of it built from cover boxes the compiler already knows.
// ---------------------------------------------------------------------------

function decorate(b: Builder, rng: Rng, theme: Theme, layer: string, spaces: string[]): void {
  const d = theme.decor;
  let n = 0;
  for (const sp of spaces) {
    const cells = b.interior(layer, sp, 1);
    if (cells.length < 12) continue;

    // A colonnade: pillars in a line, which reads as an arcade and breaks up
    // a long sightline without closing it.
    if (rng.bool(d.colonnade) && cells.length > 40) {
      const xs = [...new Set(cells.map((c) => c[0]))].sort((a, c) => a - c);
      const ys = [...new Set(cells.map((c) => c[1]))].sort((a, c) => a - c);
      const along = rng.bool() ? 'x' : 'y';
      const fixed = along === 'x' ? rng.pick(ys) : rng.pick(xs);
      const span = along === 'x' ? xs : ys;
      const step = rng.int(3, 5);
      for (let i = 1; i < span.length - 1; i += step) {
        const [px, py] = along === 'x' ? [span[i], fixed] : [fixed, span[i]];
        b.cover(layer, `pil_${layer}_${n++}`, [px, py, 1, 1], rng.float(d.pillarHeight[0], d.pillarHeight[1]), {
          material: 'crate',
          label: 'Pillar',
        });
      }
    }

    // Overhead beams: a cover lifted above head height blocks nothing you walk
    // through, but it does cut the room up visually and catches the light.
    if (rng.bool(d.beams) && cells.length > 30) {
      const inner = b.interior(layer, sp, 2);
      if (!inner.length) continue;
      const ys = [...new Set(inner.map((c) => c[1]))].sort((a, c) => a - c);
      const xs = [...new Set(inner.map((c) => c[0]))].sort((a, c) => a - c);
      const lift = 2.5;
      for (let i = 2; i < ys.length - 1; i += rng.int(4, 7)) {
        b.cover(layer, `beam_${layer}_${n++}`, [xs[0], ys[i], xs[xs.length - 1] - xs[0] + 1, 1], 0.35, {
          material: 'crate',
          label: 'Beam',
          zOffset: lift,
          overhead: true,
        });
      }
    }

    // A spine of waist-high cover down a lane: something to fight around.
    if (rng.bool(d.centreCover) && cells.length > 24) {
      const xs = [...new Set(cells.map((c) => c[0]))].sort((a, c) => a - c);
      const ys = [...new Set(cells.map((c) => c[1]))].sort((a, c) => a - c);
      const vertical = ys.length > xs.length;
      const mid = vertical ? xs[Math.floor(xs.length / 2)] : ys[Math.floor(ys.length / 2)];
      const span = vertical ? ys : xs;
      for (let i = 1; i < span.length - 2; i += rng.int(4, 8)) {
        const len = rng.int(2, 4);
        const rect: Rect = vertical ? [mid, span[i], 2, len] : [span[i], mid, len, 2];
        b.cover(layer, `spine_${layer}_${n++}`, rect, rng.float(d.crateHeight[0], d.crateHeight[1]), {
          material: rng.pick(['crate', 'barrel', 'planter'] as const),
        });
      }
    }

    // Scatter.
    const clutter = Math.round(cells.length * 0.018 * d.clutter);
    for (let i = 0; i < clutter; i++) {
      const c = b.freeCell(layer, sp, 1);
      if (!c) break;
      const w = rng.int(1, 3);
      const dd = rng.int(1, 2);
      b.cover(layer, `junk_${layer}_${n++}`, [c[0], c[1], w, dd], rng.float(d.crateHeight[0], d.crateHeight[1]), {
        material: rng.pick(['crate', 'barrel', 'desk', 'vehicle'] as const),
      });
    }
  }
}

/** Raised platforms with a ramp up: high ground you can actually take. */
function addFloaters(b: Builder, rng: Rng, theme: Theme, layer: string, hosts: string[], ceiling: number): void {
  if (!rng.bool(theme.decor.floaters)) return;
  const host = rng.pick(hosts);
  const cells = b.interior(layer, host, 2);
  if (cells.length < 40) return;
  const anchor = rng.pick(cells);
  const lift = Math.min(2.4, ceiling * 0.45);
  const pad = 4;
  const deck = `deck_${host}`;
  b.layer(deck, { z: lift, height: Math.max(2.2, ceiling - lift), roof: false, railing: 1.1, internalWalls: false }, 'Deck');
  if (!b.space(deck, deck, [anchor[0], anchor[1], pad, pad], { label: 'Platform', role: 'balcony' })) return;
  // A ramp up from the floor beside it, or the platform is scenery.
  // The railing runs right round the platform, including across the mouth of
  // the ramp — where it would meet the slope at head height and seal the
  // platform off. Open that stretch of it.
  b.portal(deck, {
    id: `${deck}_mouth`,
    between: [deck, '__outside__'],
    kind: 'open',
    width_cells: 3,
    side: 'S',
    hint: [anchor[0] + 1, anchor[1]],
  });
  const ok = b.flight({
    id: `${deck}_ramp`,
    label: 'Ramp',
    from_layer: layer,
    to_layer: deck,
    from_cell: [anchor[0] + 1, anchor[1] - 7],
    to_cell: [anchor[0] + 1, anchor[1] + 2],
    kind: 'ramp',
    width: 2,
    direction: 'N',
  });
  if (!ok) {
    // Roll it back rather than leaving an island the validator will reject.
    b.spec.layers = b.spec.layers.filter((l) => l.id !== deck);
  }
}

export const ARCHETYPES: Archetype[] = [threeLane, ring, stacked, compound, bridges, skyIslands, fightyard];

export function archetypeFor(rng: Rng, depth: number): Archetype {
  // Early runs stay flat and legible; verticality arrives once you know the game.
  if (depth <= 1) return rng.pick([threeLane, fightyard]);
  return rng.weighted([
    [threeLane, 3],
    [ring, 3],
    [fightyard, 2],
    [bridges, depth >= 2 ? 2 : 0],
    [stacked, depth >= 3 ? 2 : 0],
    [compound, depth >= 3 ? 3 : 0],
    [skyIslands, depth >= 4 ? 2 : 0],
  ] as const);
}
