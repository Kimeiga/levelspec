import type { V3 } from '../../../src/architecture/types.ts';
import type { Pen } from '../../../src/dressing/pen.ts';
import type { Kit } from '../../../src/dressing/kowloon/kit.ts';
import type { Lot, Rect } from '../../../src/dressing/kowloon/massing.ts';
import type { LotFinish } from '../../../src/dressing/kowloon/skin.ts';
import { srgb } from '../../../src/dressing/kowloon/palette.ts';

export const SIZE = { width: 9.8, depth: 7, chamfer: .24, ground: 3.35, roof: 12.35, top: 13.1 };
export const FLOORS = [3.35, 6.35, 9.35];
export const COLORS = {
  cream: srgb('#eee2c9'), trim: srgb('#ddd2bc'), green: srgb('#3f554b'),
  plinth: srgb('#343632'), jade: srgb('#7d9185'), oxblood: srgb('#793f32'), ivory: srgb('#dfcfaa'),
};
export const FINISH: LotFinish = { coat: 'wall', bare: 'concrete', cladding: { type: 'plaster', groundTiles: false, seed: 23 } };
export const LOT: Lot = {
  index: 0, kind: 'tenement', x0: 0, x1: SIZE.width, stories: 4,
  ground: SIZE.ground, storyHeight: 3, roof: SIZE.roof, top: SIZE.top, front: 0, back: 0, key: 'reference',
  style: {
    wall: COLORS.cream, trim: COLORS.trim, frame: COLORS.green, accent: COLORS.jade,
    cage: COLORS.green, shutter: COLORS.green, window: 'casement', plan: 'windows', bay: 3,
    hoods: false, canopy: false, balustrade: 'half', bars: 'grid', enclosure: 'open',
    awning: { canvas: true, base: COLORS.oxblood, hem: COLORS.ivory }, repaints: [], repaint: 0, clutter: 1,
  },
};

export interface BuildingContext { root: Pen; kit: Kit; wallKit: Kit }
export interface WindowOpening extends Rect { door?: boolean; lowerRail?: number; interior?: 'screen' | 'left-curtain' | 'right-curtain' }
export interface BuildingFace {
  name: string; pen: Pen; width: number; openings: WindowOpening[]; tiles: Rect[];
}

/** Creates the visible architectural planes; front/right coordinates meet at a 24 cm clipped corner. */
export function buildingFaces(root: Pen): BuildingFace[] {
  const frontWindows: WindowOpening[] = FLOORS.flatMap((base, story) => {
    const banks = story === 0 ? [[.55, 2.65], [3.2, 4.15], [5.95, 9.05]] : [[.55, 2.65], [3.2, 5.4], [5.95, 9.05]];
    return banks.map(([u0, u1], bay) => ({ u0, u1, v0: base + .85, v1: base + 2.72,
      lowerRail: (story + bay) % 2 === 0 ? .38 : undefined,
      interior: story === 2 && bay === 1 ? 'screen' as const : bay === 2 ? 'right-curtain' as const : bay === 0 ? 'left-curtain' as const : undefined,
    }));
  });
  frontWindows.push({ u0: 4.43, u1: 5.4, v0: 3.38, v1: 6.07, door: true });
  const sideWindows = FLOORS.flatMap(base => [[.45, 2.4], [3.05, 5.45]].map(([u0, u1]) => ({ u0, u1, v0: base + .85, v1: base + 2.72 })));
  const tileBands = [6.35, 9.35].map(base => ({ u0: 5.76, u1: 9.56, v0: base + .16, v1: base + .83 }));
  const diagonal = Math.SQRT1_2;
  return [
    { name: 'front', pen: root.facing([0, 0, 0], [1, 0, 0], [0, -1, 0]), width: 9.56,
      openings: [...frontWindows, { u0: .4, u1: 2.7, v0: .12, v1: 2.7 }, { u0: 3.05, u1: 9.05, v0: .12, v1: 2.85 }], tiles: tileBands },
    { name: 'corner', pen: root.facing([9.56, 0, 0], [diagonal, diagonal, 0], [diagonal, -diagonal, 0]), width: Math.SQRT2 * .24,
      openings: [], tiles: tileBands.map(r => ({ ...r, u0: 0, u1: Math.SQRT2 * .24 })) },
    { name: 'right', pen: root.facing([9.8, .24, 0], [0, 1, 0], [1, 0, 0]), width: 6.76,
      openings: [...sideWindows, { u0: .4, u1: 2.55, v0: .12, v1: 2.65 }, { u0: 3.05, u1: 5.9, v0: .12, v1: 2.65 }],
      tiles: tileBands.map(r => ({ ...r, u0: 0, u1: 5.7 })) },
    { name: 'back', pen: root.facing([9.8, 7, 0], [-1, 0, 0], [0, 1, 0]), width: 9.8, openings: [], tiles: [] },
    { name: 'left', pen: root.facing([0, 7, 0], [0, -1, 0], [-1, 0, 0]), width: 7, openings: [], tiles: [] },
  ];
}
