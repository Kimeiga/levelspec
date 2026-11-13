/** Project-local replay of declared journeys, stair width lines and view predictions through the
 *  existing physical inspection walker and optical mesh. Bounded checks, not continuous collision proof.
 *  Usage: node projects/dragon-ford/verify.mjs <layout-data.json> <level.aml> <new-output-dir> */
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {compile, parseAml} from '../../src/architecture/index.ts';
import {prepareInspectionWalk} from '../../review/walk.ts';
import {physicalWalk} from '../../review/physical-walk.ts';
import {VisibilityGeometry} from '../../tools/fps/visibility-geometry.ts';

const [dataPath, amlPath, output] = process.argv.slice(2);
if (!output) throw new Error('Usage: verify.mjs layout-data.json level.aml NEW_DIR');
await mkdir(output, {recursive: true});
const bytes = await readFile(amlPath);
const plan = JSON.parse(await readFile(dataPath, 'utf8'));
const level = await compile(parseAml(bytes.toString()), {navigation: {cell: .125}, floorGaps: 'error'});
const hash = createHash('sha256').update(bytes).digest('hex');
const physical = physicalWalk(level), optical = new VisibilityGeometry(level), player = level.document.player;
const EYE = {stand: 1.86, crouch: 1.023};

const routes = plan.journeys.map(j => ({id: j.id, kind: 'journey: ' + j.name, points: j.waypoints}));
for (const s of plan.stairs) {
  const ux = (s.b[0] - s.a[0]) / s.run, uy = (s.b[1] - s.a[1]) / s.run, half = s.width / 2 - .6;
  for (const lateral of [-half, 0, half]) {
    const p = (d, z) => [s.a[0] + ux * d - uy * lateral, s.a[1] + uy * d + ux * lateral, z];
    const zAt = t => s.z0 + (s.z1 - s.z0) * t;
    routes.push({id: `${s.id}-line-${lateral.toFixed(2)}`, kind: 'stair: landing before foot, mid-flight, landing beyond crest (seams crossed mid-segment)',
      points: [p(-.9, s.z0), p(s.run * .5, zAt(.5)), p(s.run + .9, s.z1)], stair: true});
  }
}
function place(p) {
  for (const dz of [0, .01, .08, .16, -.08, -.16]) {
    const r = prepareInspectionWalk(level, {feet: [p[0], p[1], p[2] + dz], yaw: 0, pitch: 0});
    if (r.ok) return r;
  }
  return null;
}
const results = [];
for (const route of routes) for (const reverse of [false, true]) {
  const points = reverse ? route.points.toReversed() : route.points;
  const prepared = place(points[0]);
  if (!prepared) { results.push({id: route.id, kind: route.kind, reverse, ok: false, error: 'no standing placement at start', start: points[0]}); continue; }
  let feet = prepared.pose.feet, distance = 0, failure;
  for (const target of points.slice(1)) {
    const start = [...feet], steps = Math.max(1, Math.ceil(Math.hypot(target[0] - start[0], target[1] - start[1]) / .035));
    for (let n = 1; n <= steps; n++) {
      const x = start[0] + (target[0] - start[0]) * n / steps, y = start[1] + (target[1] - start[1]) * n / steps;
      const previous = feet; feet = prepared.surface.move(feet, x - feet[0], y - feet[1]);
      distance += Math.hypot(...feet.map((v, i) => v - previous[i]));
      if (Math.hypot(feet[0] - x, feet[1] - y) > .12) { failure = {target, request: [x, y], feet}; break; }
    }
    if (failure) break;
    if (Math.abs(feet[2] - target[2]) > (route.stair ? .45 : .3)) { failure = {target, feet, reason: 'arrived at wrong elevation'}; break; }
  }
  const end = points.at(-1), endError = Math.hypot(feet[0] - end[0], feet[1] - end[1]);
  results.push({id: route.id, kind: route.kind, reverse, ok: !failure && endError < .2, distance: +distance.toFixed(2), seconds: +(distance / 3.4).toFixed(1), failure});
}
const views = [], placementFailures = [];
for (const v of plan.views ?? []) {
  const a = place(v.feet), b = place(v.targetFeet);
  if (!a || !b) { placementFailures.push({id: v.id, observer: !!a, target: !!b}); continue; }
  const A = a.pose.feet, B = b.pose.feet, postures = {};
  for (const [an, ah] of Object.entries(EYE)) for (const [bn, bh] of Object.entries(EYE))
    postures[`${an}->${bn}`] = optical.visible([A[0], A[1], A[2] + ah], [B[0], B[1], B[2] + bh]);
  const feetSeen = optical.visible([A[0], A[1], A[2] + EYE.stand], [B[0], B[1], B[2] + .15]);
  const standing = postures['stand->stand'];
  views.push({id: v.id, note: v.note, expect: v.expect, feet: A, targetFeet: B, distance: +Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]).toFixed(1),
    postures, feetSeen, agrees: v.expect == null ? null : (v.expect === 'visible') === standing,
    observerClear: !physical.blocked(A, player), targetClear: !physical.blocked(B, player)});
}
const errors = level.diagnostics.filter(d => d.severity === 'error');
const counts = {};
for (const d of level.diagnostics) counts[`${d.severity} ${d.code}`] = (counts[`${d.severity} ${d.code}`] ?? 0) + 1;
const report = {sourceSha256: hash, physicalHash: level.physicalHash, renderHash: level.renderHash, player, diagnosticCounts: counts, errors,
  navigation: {passed: level.navigation?.passed, routes: level.navigation?.routes?.map(r => ({id: r.id, passed: r.passed, distance: r.distance, routes: r.routes}))},
  results, views, placementFailures,
  limitations: 'Existing eroded navigation with physical support/step/headroom checks at <=0.035 m requested substeps; not a continuous capsule sweep. Optical finite mesh segments between eye points; not weapons, utility, audio, body blocking or observed play. Crouch eye offsets are optical studies.'};
await writeFile(output + '/verification.json', JSON.stringify(report, null, 1) + '\n');
await writeFile(output + '/loaded.aml', bytes);
const failed = results.filter(r => !r.ok), disagreements = views.filter(v => v.agrees === false);
console.log(JSON.stringify({output, sourceSha256: hash, diagnosticCounts: counts, walks: results.length, walkFailures: failed.map(f => ({id: f.id, reverse: f.reverse, failure: f.failure ?? f.error})),
  views: views.length, viewDisagreements: disagreements.map(v => ({id: v.id, expect: v.expect, postures: v.postures})), placementFailures}, null, 1));
if (failed.length || placementFailures.length || errors.length) process.exitCode = 1;
