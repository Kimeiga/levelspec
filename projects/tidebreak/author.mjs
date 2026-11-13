import { writeFile } from 'node:fs/promises';
import { ArchitectureBuilder, serializeAml } from '../../src/architecture/index.ts';

const output = process.argv[2];
if (!output) throw new Error('Usage: node projects/tidebreak/author.mjs NEW_SOURCE.aml [baseline|offset]');
const variant = process.argv[3] ?? 'offset';
if (!['baseline', 'offset'].includes(variant)) throw new Error('Unknown portal variant');
const b = new ArchitectureBuilder(`tidebreak-${variant}`);
b.document.name = 'Tidebreak';
b.document.description = `Reference-informed repair yard. R02 ${variant} portal experiment. Ordinary movement; gameplay hypotheses require playtesting.`;
b.document.validation = 'playable';
b.document.player = { ...b.document.player, radius: .35, height: 1.8, crouch: 1.1, step: .25, slope: 42 };
for (const [id, color, roughness, metalness] of [
  ['ground', '#b4b0a0', .95, 0], ['stone', '#8c9793', .9, 0], ['concrete', '#c1beb0', .9, 0],
  ['timber', '#8c745b', .9, 0], ['roof', '#626f6d', .8, .25], ['iron', '#4d6266', .65, .5],
  ['hull', '#52686b', .65, .35], ['hull-deck', '#8a7a65', .85, 0], ['water', '#789eaa', .3, .25],
]) b.document.materials.push({ id, color, roughness, metalness, repeat: 1 });

/** Creates an XY floor footprint at an explicit Z, with real thickness. */
function slab(id, points, z, area, material = 'concrete', thickness = .35, roof = false) {
  b.profile(`profile-${id}`, points.map(p => [p[0], p[1], p[2] ?? z]));
  const element = b.slab(id, `profile-${id}`, { thickness, area, material, playable: !roof });
  if (roof) element.kind = 'roof';
  return element;
}
/** Adds a closed physical mass with its base in meters. */
function box(id, x, y, z, width, depth, height, material = 'concrete', extra = {}) {
  return b.box(id, { position: [x, y, z], width, depth, height, material, ...extra });
}
/** Draws a wall path with an explicit base and top; source paths remain editable. */
function wall(id, points, base, height, thickness = .3, material = 'stone') {
  b.path(`path-${id}`, points.map(p => [p[0], p[1], p[2] ?? base]));
  return b.wall(id, `path-${id}`, { height, thickness, material });
}
/** Adds ordinary treads with filled support beneath the flight. */
function stairs(id, start, end, width) {
  b.path(`path-${id}`, [start, end]);
  return b.stairs(id, { path: `path-${id}`, width, maximumRiser: .18, thickness: .3, underside: 'filled', area: id, material: 'stone' });
}
/** Returns the rounded dock head, with endpoints included. */
function dockArc(reverse = false) {
  return Array.from({ length: 13 }, (_, i) => {
    const t = (reverse ? 12 - i : i) * Math.PI / 12;
    return [-12 + 10 * Math.cos(t), 18 + 10 * Math.sin(t)];
  });
}
/** Extrudes a rounded hull footprint as a primary occluding mass, not a playable floor. */
function hull(id, x, y, rx, ry, base, height) {
  const points = Array.from({ length: 28 }, (_, i) => [x + rx * Math.cos(i * Math.PI / 14), y + ry * Math.sin(i * Math.PI / 14), base]);
  b.profile(`profile-${id}`, points);
  b.extrusion(id, `profile-${id}`, height, { material: 'hull' });
  b.profile(`profile-${id}-deck`, points.map(p => [x + (p[0] - x) * .87, y + (p[1] - y) * .92, base + height]));
  b.extrusion(`${id}-deck`, `profile-${id}-deck`, .18, { material: 'hull-deck' });
}

const dock = [[-22, -32], [-2, -32], [-2, 6], [10, 6], [10, 10], [-2, 10], ...dockArc(), [-22, -18], [-32, -18], [-32, -22], [-22, -22]];
const yard = [[-46, -40], [-22, -40], [-22, -32], [-22, -22], [-32, -22], [-32, -18], [-22, -18],
  ...dockArc(true), [-2, 10], [10, 10], [10, 6], [-2, 6], [-2, -32], [-2, -40], [48, -40], [48, 44], [-46, 44]];
slab('yard', yard, 0, 'yard', 'ground', .4);
b.profile('profile-ground-mass', yard.map(p => [...p, -4.5]));
b.extrusion('ground-mass', 'profile-ground-mass', 4.1, { material: 'stone' });
slab('dock-floor', [[-22, -32], [-2, -32], ...dockArc()], -4, 'dock', 'stone', .5);
wall('dock-retaining', [...dock, dock[0]], -4, 4, .7, 'stone');
for (let i = 0; i < dock.length; i++) {
  const a = dock[i], next = dock[(i + 1) % dock.length];
  if (a[0] === next[0] && (a[0] === -32 || a[0] === 10)) continue;
  wall(`dock-guard-${i}`, [a, next], 0, 1.2, .25, 'stone');
}
stairs('D1', [-22, -20, -4], [-32, -20, 0], 4);
stairs('D2', [-2, 8, -4], [10, 8, 0], 4);
box('caisson', -22, -33.3, -4.3, 20, 1.3, 6, 'iron');
slab('service-bridge', [[-24, -39], [0, -39], [0, -35], [-24, -35]], 0, 'service-bridge', 'iron', .55);
for (const y of [-39, -35]) {
  wall(`bridge-guard-${Math.abs(y)}`, [[-24, y], [0, y]], 0, 1.2, .15, 'iron');
  box(`bridge-girder-${Math.abs(y)}`, -24, y - .15, -1.2, 24, .3, .65, 'iron');
}
for (const x of [-23, -1]) b.solid('cylinder', `bridge-pivot-${Math.abs(x)}`, { position: [x, -37, -4.5], radius: .7, height: 4, material: 'stone', anchor: 'bottom-center', segments: 12 });
box('water-context', -56, -52, -3.1, 112, 20, .2, 'water', { collidable: false });


hull('H1', -12, -4, 4.5, 17, -4, 6);
hull('H2', 28, -5, 5.5, 17, 0, 5.5);
for (const y of [-15, -5, 5]) {
  box(`H2-cradle-${y + 20}`, 21.5, y, 0, 13, .5, .7, 'timber');
}
const portal = variant === 'baseline' ? [6, 14] : [0, 4];
const west = wall('hall-west', [[12, -26], [12, 24]], 0, 7, .35, 'stone');
b.opening('west-south-door', west.id, { center: [12, 1.6], width: 8, height: 3.2 });
b.opening('D2-hall-portal', west.id, { center: [26 + (portal[0] + portal[1]) / 2, 1.6], width: portal[1] - portal[0], height: 3.2 });
const east = wall('hall-east', [[44, -26], [44, 24]], 0, 7, .35, 'stone');
b.opening('E1', east.id, { center: [27.5, 1.6], width: 7, height: 3.2 });
const apse = Array.from({ length: 17 }, (_, i) => [28 + 16 * Math.cos(i * Math.PI / 16), 24 + 16 * Math.sin(i * Math.PI / 16)]);
wall('hall-apse', apse, 0, 7, .35, 'stone');
for (const side of ['west', 'east']) for (const y of [-20, -8, 4, 16]) {
  b.opening(`clerestory-${side}-${y + 24}`, `hall-${side}`, { center: [y + 26, 5.6], width: 5, height: 1.5 });
}
slab('hall-roof-west', [[11.5, -26.5, 7.1], [28, -26.5, 10], [28, 24, 10], [11.5, 24, 7.1]], 0, undefined, 'roof', .25, true);
slab('hall-roof-east', [[28, -26.5, 10], [44.5, -26.5, 7.1], [44.5, 24, 7.1], [28, 24, 10]], 0, undefined, 'roof', .25, true);
for (let i = 1; i < apse.length; i++) slab(`apse-roof-${i}`, [[28, 24, 10], [...apse[i - 1], 7.1], [...apse[i], 7.1]], 0, undefined, 'roof', .25, true);

b.profile('truss-section', [[-.16, -.16, 0], [.16, -.16, 0], [.16, .16, 0], [-.16, .16, 0]]);
for (const y of [-24, -16, -8, 0, 8, 16, 24]) {
  for (const x of [12.15, 43.85]) box(`column-${x}-${y + 24}`, x - .2, y - .2, 0, .4, .4, 7, 'timber');
  b.path(`truss-path-${y + 24}`, [[12.15, y, 6.8], [28, y, 9.7], [43.85, y, 6.8]]);
  b.sweep(`truss-${y + 24}`, 'truss-section', `truss-path-${y + 24}`, { material: 'timber' });
  box(`tie-${y + 24}`, 12.15, y - .12, 6.5, 31.7, .24, .24, 'timber');
}
slab('gallery', [[14, 18], [20, 18], [20, 21], [42, 21], [42, 30], [14, 30]], 4, 'gallery', 'timber', .35);
stairs('G1', [17, 5, 0], [17, 18, 4], 4);
stairs('G2', [40, 8, 0], [40, 21, 4], 4);
wall('gallery-west-guard', [[14, 18], [14, 30]], 4, 1.1, .15, 'iron');
wall('gallery-north-guard', [[14, 30], [42, 30]], 4, 1.1, .15, 'iron');
wall('gallery-east-guard', [[42, 30], [42, 21]], 4, 1.1, .15, 'iron');
wall('gallery-front-guard', [[20, 21], [38, 21]], 4, 1.1, .15, 'iron');
wall('gallery-west-return', [[20, 18], [20, 21]], 4, 1.1, .15, 'iron');
for (const [id, x, y0, y1] of [['G1-west', 15, 5, 18], ['G1-east', 19, 5, 18], ['G2-west', 38, 8, 21], ['G2-east', 42, 8, 21]]) {
  wall(`${id}-guard`, [[x, y0, 0], [x, y1, 4]], 0, 1.1, .12, 'iron');
}
for (const x of [14.4, 27.5, 41.6]) for (const y of [21.5, 29.5]) box(`gallery-pier-${x}-${y}`, x - .2, y - .2, 0, .4, .4, 3.65, 'timber');
box('gallery-front-beam', 14, 21, 3.35, 28, .35, .3, 'timber');
box('gallery-rear-beam', 14, 29.5, 3.35, 28, .35, .3, 'timber');

box('pump-house', -41, 16, 0, 14, 18, 5, 'stone');
slab('pump-roof-west', [[-41.3, 15.7, 5.1], [-34, 15.7, 6.6], [-34, 34.3, 6.6], [-41.3, 34.3, 5.1]], 0, undefined, 'roof', .22, true);
slab('pump-roof-east', [[-34, 15.7, 6.6], [-26.7, 15.7, 5.1], [-26.7, 34.3, 5.1], [-34, 34.3, 6.6]], 0, undefined, 'roof', .22, true);
b.profile('pump-gable-profile', [[-7, 0, 0], [7, 0, 0], [0, 1.6, 0]]);
for (const y of [16.1, 34]) b.extrusion(`pump-gable-${y}`, 'pump-gable-profile', .3, { position: [-34, y, 5], rotation: [90, 0, 0], material: 'stone' });
box('pump-service-door', -34, 15.9, 0, 4, .15, 3, 'iron');
box('winch-house', 0, 20, 0, 8, 14, 5, 'stone');
slab('winch-roof', [[-.3, 19.7], [8.3, 19.7], [8.3, 34.3], [-.3, 34.3]], 5.2, undefined, 'roof', .25, true);
box('gantry-foot', -40, -7, 0, 6, 13, 2.7, 'concrete');
box('west-workbench', 15, -5, 0, 3, 5, 1.2, 'timber');
box('east-machinery', 34.5, 14, 0, 2.5, 3, 2.1, 'iron');
for (const [id, points] of [['west', [[-46, -40], [-46, 44]]], ['north', [[-46, 44], [48, 44]]], ['east', [[48, 44], [48, -40]]], ['south-west', [[-46, -40], [-22, -40]]], ['south-east', [[-2, -40], [48, -40]]]]) wall(`yard-perimeter-${id}`, points, 0, 2.2, .3, 'stone');
for (const [i, x] of [-42, -20, 5, 28].entries()) {
  box(`town-mass-${i}`, x, 48, 0, 15, 12, 6 + i, 'stone');
  slab(`town-roof-${i}`, [[x, 48], [x + 15, 48], [x + 15, 60], [x, 60]], 6.2 + i, undefined, 'roof', .3, true);
}
const mouths = [
  ['yard', 'D1', [[-32, -21.6, 0], [-32, -18.4, 0]]],
  ['dock-floor', 'D1', [[-22, -21.6, -4], [-22, -18.4, -4]]],
  ['yard', 'D2', [[10, 6.4, 0], [10, 9.6, 0]]],
  ['dock-floor', 'D2', [[-2, 6.4, -4], [-2, 9.6, -4]]],
  ['yard', 'G1', [[15.2, 5, 0], [18.8, 5, 0]]],
  ['gallery', 'G1', [[15.2, 18, 4], [18.8, 18, 4]]],
  ['yard', 'G2', [[38.2, 8, 0], [41.8, 8, 0]]],
  ['gallery', 'G2', [[38.2, 21, 4], [41.8, 21, 4]]],
  ['yard', 'service-bridge', [[-22, -38.7, 0], [-22, -35.3, 0]]],
  ['yard', 'service-bridge', [[-2, -38.7, 0], [-2, -35.3, 0]]],
];
for (const [i, [from, to, points]] of mouths.entries()) {
  b.path(`mouth-path-${i}`, points);
  b.document.connections.push({ id: `mouth-${i}`, from, to, path: `mouth-path-${i}` });
}
const markers = [
  ['S1', [-39, -32, 0], 'spawn'], ['S2', [44, 36, 0], 'spawn'], ['A', [-12, 18, -4], 'objective'], ['B', [28, 17, 0], 'objective'],
  ['D1-top', [-34, -20, 0], 'checkpoint'], ['D1-bottom', [-20, -20, -4], 'checkpoint'], ['D2-top', [10.8, 8, 0], 'checkpoint'], ['D2-bottom', [-4, 8, -4], 'checkpoint'],
  ['G1-foot', [17, 3, 0], 'checkpoint'], ['G2-foot', [40, 6, 0], 'checkpoint'], ['gallery-west', [17, 20, 4], 'checkpoint'], ['gallery-east', [40, 25, 4], 'checkpoint'],
];
for (const [id, position, kind] of markers) b.document.markers.push({ id, position, kind, movement: 'land', layer: 'architecture', team: id === 'S1' ? 'one' : id === 'S2' ? 'two' : undefined });
for (const [from, to] of [['S1', 'A'], ['S2', 'A'], ['S1', 'B'], ['S2', 'B'], ['D1-top', 'D1-bottom'], ['D2-top', 'D2-bottom'], ['G1-foot', 'gallery-west'], ['G2-foot', 'gallery-east']]) b.document.routes.push({ id: `route-${from}-${to}`, from, to, minRoutes: 1 });
b.document.noSpawnLos.push(['S1', 'S2']);
b.assembly('yard-fabric', [...b.document.elements], { coincidentMaterial: 'retained-face' });
await writeFile(output, serializeAml(b.document), { flag: 'wx' });
console.log(output);
