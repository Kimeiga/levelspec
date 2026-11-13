import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { compile, parseAml, validateForRuntime } from '../../src/architecture/index.ts';
import { physicalRouteEvidence, requirePhysicalRoutes } from '../../src/authoring/physical-routes.ts';
import { physicalWalk } from '../../review/physical-walk.ts';
import { WalkMotion } from '../../review/walk-motion.ts';
import { VisibilityGeometry } from '../../tools/fps/visibility-geometry.ts';

const out = process.argv[2];
if (!out) throw new Error('Provide a new output directory');
await mkdir(out);
const journeys = {
  'D1-to-A': [[-34, -20, 0], [-20, -20, -4], [-19, -12, -4], [-19, 8, -4], [-12, 18, -4]],
  'D2-to-A': [[10.8, 8, 0], [-4, 8, -4], [-5, 14, -4], [-12, 18, -4]],
  'D2-turn-G1': [[10.8, 8, 0], [10.8, 2, 0], [14, 2, 0], [17, 3, 0], [17, 20, 4]],
  'G2-gallery': [[40, 6, 0], [40, 25, 4], [28, 25, 4], [17, 25, 4], [17, 20, 4]],
  'south-service-bridge': [[-39, -32, 0], [-27, -37, 0], [-24, -37, 0], [0, -37, 0], [14, -32, 0], [18, -24, 0]],
  'north-rotation': [[-43, 12, 0], [-43, 38, 0], [-23, 38, 0], [2, 38, 0], [19, 42, 0], [35, 42, 0], [44, 36, 0], [46, 6, 0], [46, 2, 0], [40, 2, 0]],
  'hall-west-bow': [[18, -24, 0], [20.5, -12, 0], [20.5, 5, 0], [23, 13, 0], [28, 17, 0]],
  'hall-east-bow': [[38, -24, 0], [37, 4, 0], [34, 12, 0], [28, 17, 0]],
};
const samples = {
  'D2-lower': [-1, 8, -3.7], 'D2-middle': [4, 8, -2], 'D2-top': [10.8, 8, 0], 'D2-apron': [10.8, 3, 0],
  'old-hall-hold': [13.4, 8, 0], 'new-hall-hold': [16, 2, 0], 'new-threshold': [12.5, 2, 0],
  'G1-foot': [17, 3, 0], 'G1-mid': [17, 12, 2.15], 'G1-landing': [17, 20, 4],
  'gallery-west-rail': [14.5, 19.5, 4], 'gallery-front': [28, 21.5, 4], 'gallery-rear': [28, 25, 4], 'G2-foot': [40, 6, 0],
  A: [-12, 18, -4], 'A-west-shoulder': [-19, 10, -4], 'rim-north-near': [-12, 28.7, 0], 'rim-north-back': [-12, 30, 0], 'rim-west': [-24, 18, 0],
  B: [28, 17, 0], 'B-west-bow': [21, 10, 0], 'B-east-bow': [35, 10, 0], 'bridge-west': [-25, -37, 0], 'bridge-east': [1, -37, 0],
};

/** Resolves approximate tread feet against unchanged collision; no synthetic navigation link is added. */
function feetAt(physical, player, approximate) {
  for (const lift of [0, .08, .16, .24]) {
    const p = [approximate[0], approximate[1], approximate[2] + lift];
    const resolved = physical.resolve(p, p, player);
    if (resolved && Math.abs(resolved[2] - approximate[2]) < .3) return resolved;
  }
  return undefined;
}
/** Performs collision-aware walking over existing navigation, retaining an exact stopped position on failure. */
function walk(level, points) {
  const physical = physicalWalk(level), start = feetAt(physical, level.document.player, points[0]);
  if (!start) return { passed: false, reason: 'Unsupported start', point: points[0] };
  const motion = new WalkMotion(level, start); let seconds = 0, steps = 0;
  for (const target of points.slice(1)) {
    let stuck = 0;
    for (let i = 0; i < 6000; i++) {
      const before = motion.state.feet, dx = target[0] - before[0], dy = target[1] - before[1], distance = Math.hypot(dx, dy);
      if (distance < .06) break;
      const dt = Math.min(.05, distance / 3.4);
      motion.advance({ forward: 1, right: 0, yaw: Math.atan2(dy, dx), jump: false, crouch: false }, dt);
      seconds += dt; steps++;
      const after = motion.state.feet;
      if (Math.hypot(after[0] - before[0], after[1] - before[1]) < .0001) stuck++; else stuck = 0;
      if (stuck > 10) return { passed: false, target, stopped: after, seconds, steps };
    }
    if (Math.hypot(motion.state.feet[0] - target[0], motion.state.feet[1] - target[1]) > .1 || Math.abs(motion.state.feet[2] - target[2]) > .3) return { passed: false, target, stopped: motion.state.feet, seconds, steps };
  }
  return { passed: true, seconds, steps, end: motion.state.feet };
}

const results = [];
for (const [variant, path] of [['offset', 'projects/tidebreak/level.aml'], ['baseline', 'projects/tidebreak/planning/baseline.aml']]) {
  console.log(`Compiling ${variant}`);
  const source = await readFile(path, 'utf8'), sourceSha256 = createHash('sha256').update(source).digest('hex');
  const level = await compile(parseAml(source));
  const report = await validateForRuntime(level, { sealed: true });
  assert.ok(report.passed, JSON.stringify(report.diagnostics));
  const physical = physicalWalk(level), optics = new VisibilityGeometry(level), resolved = {};
  for (const [id, point] of Object.entries(samples)) resolved[id] = feetAt(physical, level.document.player, point) ?? null;
  const rays = [];
  for (const from of ['old-hall-hold', 'new-hall-hold', 'new-threshold', 'G1-landing', 'gallery-west-rail', 'gallery-front', 'gallery-rear', 'rim-north-near', 'rim-north-back', 'rim-west']) {
    for (const to of ['D2-lower', 'D2-middle', 'D2-top', 'D2-apron', 'G1-foot', 'G1-mid', 'G2-foot', 'A', 'B', 'B-west-bow', 'B-east-bow']) {
      if (!resolved[from] || !resolved[to]) { rays.push({ from, to, unsupported: true }); continue; }
      for (const eyeHeight of [1.674, 1.023]) {
        const eye = [...resolved[from]]; eye[2] += eyeHeight;
        const visibleBodySamples = [];
        for (const height of [.3, .9, 1.674]) for (const side of [-.3, 0, .3]) {
          const target = [...resolved[to]]; target[0] += side; target[2] += height;
          if (optics.visible(eye, target)) visibleBodySamples.push({ height, side });
        }
        rays.push({ from, to, eyeHeight, visible: visibleBodySamples.length, tested: 9, visibleBodySamples });
      }
    }
  }
  const walks = {};
  if (variant === 'offset') for (const [id, points] of Object.entries(journeys)) {
    walks[id] = { forward: walk(level, points), reverse: walk(level, [...points].reverse()) }; console.log(id, walks[id]);
  }
  const physicalEvidence = physicalRouteEvidence(level, report.sealed ?? report.navigation, undefined, 32000000);
  requirePhysicalRoutes(level, physicalEvidence);
  const result = { variant, sourceSha256, physicalHash: level.physicalHash, passed: report.passed, diagnostics: report.diagnostics,
    player: level.document.player, navigation: { components: report.navigation.components, routes: report.navigation.routes.map(({ path, ...r }) => r), uncovered: report.navigation.coverage.uncoveredCount },
    physical: physicalEvidence, walks, resolved, rays,
    scope: 'Ordinary inspection walking and finite opaque optical samples. No target-engine combat, audio, projectile, utility, network or playtest claims.' };
  results.push(result); await writeFile(`${out}/${variant}.json`, JSON.stringify(result, null, 2));
  assert.equal(createHash('sha256').update(await readFile(path)).digest('hex'), sourceSha256, 'Source changed during verification');
}
const offset = results[0], baseline = results[1];
const comparison = offset.rays.filter(r => r.eyeHeight === 1.674).map(r => ({ from: r.from, to: r.to, offset: r.visible,
  baseline: baseline.rays.find(b => b.from === r.from && b.to === r.to && b.eyeHeight === r.eyeHeight)?.visible }));
await writeFile(`${out}/comparison.json`, JSON.stringify(comparison, null, 2));
console.log(JSON.stringify({ variants: results.map(r => ({ variant: r.variant, passed: r.passed })), walks: Object.values(offset.walks).every(w => w.forward.passed && w.reverse.passed) }));
