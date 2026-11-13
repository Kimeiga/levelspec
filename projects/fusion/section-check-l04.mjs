/** L04/B05 section evidence. Run only after the author freezes the candidate source. */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, join } from 'node:path';
import { compile, parseAml } from '../../src/architecture/index.ts';
import { prepareInspectionWalk } from '../../review/walk.ts';
import * as THREE from 'three';

const NAVIGATION_CELL = .125;
const MOVE_STEP = .04;
const MAX_HORIZONTAL_ERROR = .12;
const MAX_END_ERROR = .18;
const MAX_TRACE_SAMPLE_ERROR = .08;
const APPROVED_PLAYER = { radius: .35, height: 1.8, step: .3, slope: 42, crouch: 1.1, vault: 0, ladder: false, rappel: false };

/** Converts reactor polar coordinates to world Z-up meters, around axis (0,4). */
function polar(radius, degrees, z) {
  const radians = degrees * Math.PI / 180;
  return [radius * Math.cos(radians), 4 + radius * Math.sin(radians), z];
}

/** A route contains requested XY motion; only its supported start/end have authored Z. */
function straight(id, start, end) {
  return { id, start, waypoints: [end.slice(0, 2)], expectedEnd: end };
}

/** Uses short XY chords; intermediate heights are supplied exclusively by the physical walker. */
function curved(id, radius, startAngle, endAngle, startZ, endZ) {
  const count = Math.ceil(Math.abs(endAngle - startAngle) / 2);
  const waypoints = Array.from({ length: count }, (_, index) =>
    polar(radius, startAngle + (endAngle - startAngle) * (index + 1) / count, 0).slice(0, 2));
  return { id, start: polar(radius, startAngle, startZ), waypoints, expectedEnd: polar(radius, endAngle, endZ) };
}

/** Reverses the same requested path and endpoints, without substituting navigation shortcuts. */
function reversed(route) {
  const points = [route.start.slice(0, 2), ...route.waypoints];
  return { id: `${route.id}-reverse`, start: route.expectedEnd, waypoints: points.toReversed().slice(1), expectedEnd: route.start };
}

const routes = [
  straight('freight-stair', [-28, -5.6, -3.2], [-28, 3.6, 0]),
  straight('a-south-stair', [-36, -.6, 0], [-36, 8.6, 3.2]),
  straight('a-east-stair', [-24.1, 4.4, 0], [-24.1, 13.6, 3.2]),
  straight('a-rear-stair', [-29, 28.6, 0], [-29, 19.4, 3.2]),
  straight('cask-gallery-stair', [-24, -14.6, 0], [-24, -5.4, 3.2]),
  straight('b-west-stair', [24.5, 15.6, -3.2], [24.5, 6.4, 0]),
  straight('b-trench-stair', [37.5, 7.6, -3.2], [37.5, 1.4, -1.2]),
  straight('b-rear-stair', [38.5, 19.4, -3.2], [38.5, 28.6, 0]),
  straight('crown-west-stair', [-33.6, 25, 3.2], [-25.9, 25, 6.4]),
  straight('crown-east-upper-stair', [26.5, 19.6, 3.2], [26.5, 10.4, 6.4]),
  straight('crown-east-lower-stair', [26.5, 30.6, 0], [26.5, 21.4, 3.2]),
  curved('central-stair', 5.1, 218, 312, 0, -3.2),
  curved('lower-outer-bypass', 6.8, 214, 345, -3.2, -3.2),
  straight('lower-west-port', polar(6.2, 210, -3.2), polar(30.3, 210, -3.2)),
  straight('lower-east-port', polar(6.2, 350, -3.2), polar(27, 350, -3.2)),
];

// Each point is an independently checked standing-body reservation, including optical targets.
const points = [
  ['t-center', [-14, -35, 0]], ['t-west-exit', [-27, -20, 0]],
  ['t-east-exit', [24, -24, 0]], ['d-center', [0, 31, 0]],
  ['d-east-exit', [12, 31, 0]], ['d-west-exit', [-20, 29, 0]],
  ['cask-mouth', [-28, -12, 0]], ['cask-ground', [-34, -9, 0]],
  ['cask-low', [-40, -11, 0]], ['cask-low-opponent', [-40, -5, 0]],
  ['freight-lower', [-30, -10, -3.2]], ['freight-ground', [-28, 4.5, 0]],
  ['gallery-front', [-23.5, 1, 3.2]], ['west-mouth', [-19, 4, 0]],
  ['west-inner-port', [-12, 4, 0]], ['east-mouth', [20, 4.5, 0]],
  ['east-inner-port', [13, 4.5, 0]],
  ['ground-south-arc', polar(7.7, 265, 0)],
  ['a-plant', [-34, 14, 3.2]], ['a-front', [-31, 4, 3.2]],
  ['a-south-arrival', [-36, 9.5, 3.2]], ['a-east-arrival', [-24, 15, 3.2]],
  ['a-rear-arrival', [-29, 19, 3.2]], ['a-west-edge', [-39, 17, 3.2]],
  ['a-low', [-38, 16, 3.2]],
  ['a-west-front', [-39, 2.3, 3.2]], ['a-west-front-offset', [-38.5, 2.3, 3.2]],
  ['a-west-stair-edge', [-38.2, 2.3, 3.2]],
  ['b-plant', [35, 17, -3.2]], ['b-loading', [35, 10.5, -3.2]],
  ['b-west-room', [26.8, 16.5, -3.2]], ['b-west-threshold', [29.7, 16.5, -3.2]],
  ['b-rear-arrival', [38.5, 19, -3.2]], ['b-rim-crossing', [28, 19.5, 0]],
  ['b-shelf', [35, 19.5, 0]], ['b-loading-low', [30.5, 12.3, -3.2]],
  ['b-loading-opponent', [33, 10, -3.2]], ['b-shelf-low', [38, 18, 0]],
  ['b-shelf-opponent', [38, 14.6, 0]], ['ground-bypass', [23.5, -6, 0]],
  ['east-rim-south', [42, -26, 0]], ['east-rim-north', [42, 30, 0]],
  ['trench-bottom', [37.5, -6, -1.2]],
  ['lower-west-inner', polar(5.1, 210, -3.2)],
  ['lower-east-inner', polar(5.1, 340, -3.2)],
  ['lower-bypass-mid', polar(6.8, 265, -3.2)],
  ['lower-west-bridge', polar(13, 210, -2.8)],
  ['lower-east-bridge', polar(13, 350, -2.8)], ['lower-east-room', [27, 2, -3.2]],
  ['crown-west-top', [-25, 25, 6.4]], ['crown-west-transfer', [-25, 11.3, 6.4]],
  ['crown-east-transfer', [24.4, 10.1, 6.4]], ['crown-east-mid', [27.5, 20.5, 3.2]],
  ['crown-north', polar(20, 90, 6.4)],
  ['crown-west-inner-end', polar(20, 157, 6.4)], ['crown-east-inner-end', polar(20, 23, 6.4)],
  ['crown-west-room', polar(19.2, 125, 6.4)], ['crown-west-room-edge', polar(19.2, 131, 6.4)],
  ['crown-east-room', polar(21.6, 55, 6.4)], ['crown-east-room-edge', polar(21.6, 49, 6.4)],
];

// Direct views show paired approaches; stair views below use the same targets from performed treads.
const cameraPairs = [
  ['t-center', 'a-plant'], ['t-west-exit', 'cask-mouth'], ['t-east-exit', 'trench-bottom'],
  ['d-center', 'd-west-exit'], ['d-east-exit', 'b-rear-arrival'],
  ['cask-mouth', 'cask-ground'], ['freight-lower', 'lower-west-bridge'],
  ['gallery-front', 'west-mouth'], ['west-mouth', 'gallery-front'],
  ['gallery-front', 'west-inner-port'], ['west-inner-port', 'gallery-front'],
  ['a-plant', 'a-east-arrival'], ['a-east-arrival', 'a-plant'],
  ['a-rear-arrival', 'a-plant'], ['a-south-arrival', 'a-plant'],
  ['b-plant', 'b-west-threshold'], ['b-west-room', 'b-loading'],
  ['b-rear-arrival', 'b-plant'], ['b-rim-crossing', 'b-loading'],
  ['b-loading', 'b-rim-crossing'], ['ground-bypass', 'east-mouth'],
  ['east-rim-south', 'east-rim-north'],
  ['lower-west-inner', 'lower-west-bridge'], ['lower-east-bridge', 'lower-east-inner'],
  ['lower-bypass-mid', 'lower-east-inner'],
  ['crown-west-transfer', 'west-mouth'], ['crown-west-top', 'a-plant'],
  ['crown-east-transfer', 'b-loading'], ['crown-west-room', 'crown-east-room'],
  ['crown-east-room', 'crown-west-room'],
  ['crown-west-inner-end', 'west-inner-port'], ['west-inner-port', 'crown-west-inner-end'],
  ['crown-east-inner-end', 'east-inner-port'], ['east-inner-port', 'crown-east-inner-end'],
];
const lowCoverPairs = [
  ['cask-low', 'cask-low-opponent'], ['cask-low', 'a-west-edge'],
  ['a-low', 'a-south-arrival'], ['a-low', 'crown-west-top'],
  ['b-loading-low', 'b-loading-opponent'], ['b-loading-low', 'b-rim-crossing'],
  ['b-shelf-low', 'b-shelf-opponent'],
];
const stairViews = [
  ['freight-stair', 'freight-ground'], ['a-south-stair', 'a-plant'],
  ['a-east-stair', 'a-plant'], ['a-rear-stair', 'a-plant'],
  ['cask-gallery-stair', 'gallery-front'], ['b-west-stair-reverse', 'b-plant'],
  ['b-trench-stair-reverse', 'b-loading'], ['b-rear-stair-reverse', 'b-plant'],
  ['crown-west-stair', 'crown-west-top'], ['crown-east-upper-stair', 'crown-east-transfer'],
  ['crown-east-lower-stair', 'crown-east-mid'],
  ['central-stair', 'lower-east-inner'], ['central-stair-reverse', 'west-inner-port'],
];
const highSpawnTargets = [
  'a-plant', 'a-front', 'a-east-arrival', 'gallery-front',
  'a-west-front', 'a-west-front-offset', 'a-west-stair-edge',
  'crown-west-top', 'crown-west-transfer', 'crown-east-transfer', 'crown-north',
  'crown-west-room-edge', 'crown-east-room-edge', 'west-mouth', 'east-mouth', 'b-plant',
];

/** Executes bounded XY requests with the unchanged authored standing body and records every result. */
function replay(level, route) {
  const prepared = prepareInspectionWalk(level, { feet: route.start, yaw: 0, pitch: 0 });
  const result = { id: route.id, requested: route, ok: false, trace: [], distance: 0, requests: 0 };
  if (!prepared.ok) return { ...result, error: prepared.message };
  let feet = [...prepared.pose.feet];
  result.trace.push({ feet, distance: 0 });
  for (const target of route.waypoints) {
    const start = [...feet];
    const steps = Math.max(1, Math.ceil(Math.hypot(target[0] - start[0], target[1] - start[1]) / MOVE_STEP));
    for (let step = 1; step <= steps; step++) {
      const request = start.slice(0, 2).map((coordinate, axis) => coordinate + (target[axis] - coordinate) * step / steps);
      const next = prepared.surface.move(feet, request[0] - feet[0], request[1] - feet[1]);
      result.distance += Math.hypot(...next.map((coordinate, axis) => coordinate - feet[axis]));
      feet = [...next];
      result.requests++;
      result.trace.push({ feet, distance: result.distance });
      const horizontalError = Math.hypot(feet[0] - request[0], feet[1] - request[1]);
      if (horizontalError > MAX_HORIZONTAL_ERROR) return { ...result, failure: { request, feet, horizontalError } };
    }
  }
  const endError = Math.hypot(...feet.map((coordinate, axis) => coordinate - route.expectedEnd[axis]));
  return { ...result, ok: endError < MAX_END_ERROR, endError };
}

/** Uses normal placement validation; failed reservations are retained, never moved to convenient geometry. */
function place(level, id, requested, basis = 'direct standing placement') {
  const result = prepareInspectionWalk(level, { feet: requested, yaw: 0, pitch: 0 });
  if (!result.ok) return { id, requested, basis, ok: false, error: result.message };
  return { id, requested, basis, ok: true, feet: [...result.pose.feet] };
}

/** Picks an existing successful trace sample at a measured distance back from the endpoint. */
function tracePlacement(level, walk, id, distanceBeforeEnd) {
  if (!walk?.ok) return { id, ok: false, basis: 'performed trace', error: 'Required complete replay failed' };
  const wanted = walk.distance - distanceBeforeEnd;
  const sample = walk.trace.reduce((best, next) => Math.abs(next.distance - wanted) < Math.abs(best.distance - wanted) ? next : best);
  const sampleError = Math.abs(sample.distance - wanted);
  if (wanted < 0 || sampleError > MAX_TRACE_SAMPLE_ERROR) {
    return { id, ok: false, basis: 'performed trace', error: 'Requested trace distance unavailable', sampleError };
  }
  const placed = place(level, id, sample.feet, 'actual complete replay trace, rechecked standing body');
  return { ...placed, walk: walk.id, requestedDistanceBeforeEnd: distanceBeforeEnd, traceDistance: sample.distance, sampleError };
}

/** Adds the observation height to a verified standing pose; a low eye does not change its body. */
function eye(placement, height) {
  return [placement.feet[0], placement.feet[1], placement.feet[2] + height];
}

/** Finite two-sided opaque mesh rays are optical evidence, not ballistic or multiplayer simulation. */
function ray(mesh, origin, target) {
  const start = new THREE.Vector3(...origin);
  const delta = new THREE.Vector3(...target).sub(start);
  const distance = delta.length();
  if (distance <= .03) return { unavailable: 'Ray endpoints too close', origin, target, distance };
  const hit = new THREE.Raycaster(start, delta.normalize(), .015, distance - .015).intersectObject(mesh)[0];
  return { origin, target, distance, visible: !hit, firstHit: hit?.point.toArray() };
}

/** Resolves both endpoint bodies before emitting either a ray or a camera. */
function observation(mesh, from, to, height, targetHeight) {
  if (!from?.ok || !to?.ok) return { unavailable: 'Observer or target standing placement failed' };
  return ray(mesh, eye(from, height), eye(to, targetHeight));
}

/** Writes fresh evidence without modifying AML, collision, navigation or player settings. */
async function main() {
  const [outputArgument, sourceArgument] = process.argv.slice(2);
  if (outputArgument === '--inventory') {
    console.log(JSON.stringify({ routes, points, cameraPairs, lowCoverPairs, stairViews, highSpawnTargets }, null, 2));
    return;
  }
  if (!outputArgument) throw new Error('Usage: node --experimental-strip-types projects/fusion/section-check-l04.mjs <new-output-directory> [frozen-source.aml]');
  const output = resolve(outputArgument);
  const sourcePath = sourceArgument ? resolve(sourceArgument) : new URL('./level.aml', import.meta.url);
  await mkdir(output, { recursive: false });
  const bytes = await readFile(sourcePath);
  const checkerBytes = await readFile(new URL(import.meta.url));
  const inspectionFiles = ['review/walk.ts', 'review/physical-walk.ts', 'review/navigation-surface.ts', 'review/navigation-edges.ts', 'src/vector/collision.ts'];
  const inspectionCodeSha256 = Object.fromEntries(await Promise.all(inspectionFiles.map(async file =>
    [file, createHash('sha256').update(await readFile(new URL(`../../${file}`, import.meta.url))).digest('hex')])));
  const level = await compile(parseAml(bytes.toString()), { uvs: false, navigation: { cell: NAVIGATION_CELL } });
  const player = level.navigation?.settings.player;
  const playerMismatches = [];
  for (const [owner, settings] of [['authored', level.document.player], ['navigation', player]]) {
    for (const [key, expected] of Object.entries(APPROVED_PLAYER)) {
      if (settings?.[key] !== expected) playerMismatches.push({ owner, key, expected, actual: settings?.[key] });
    }
  }
  if (playerMismatches.length) throw new Error(`Approved player settings changed: ${JSON.stringify(playerMismatches)}`);
  const identity = {
    checkerSha256: createHash('sha256').update(checkerBytes).digest('hex'), inspectionCodeSha256,
    sourceFile: String(sourcePath), sourceSha256: createHash('sha256').update(bytes).digest('hex'),
    physicalHash: level.physicalHash, renderHash: level.renderHash, player, navigationCell: NAVIGATION_CELL,
  };
  const heights = { standing: player.height * .93, lowEye: player.crouch * .93 };
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(level.mesh.positions, 3));
  geometry.setIndex(level.mesh.indices);
  const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.updateMatrixWorld();
  try {
    const walks = routes.flatMap(route => [replay(level, route), replay(level, reversed(route))]);
    const byWalk = new Map(walks.map(walk => [walk.id, walk]));
    const placements = points.map(([id, feet]) => place(level, id, feet));
    const byId = new Map(placements.map(placement => [placement.id, placement]));
    const views = [], optics = [];

    /** Records missing endpoints as unavailable; cameras are created only with both supported bodies. */
    function inspect(id, fromId, toId, height = heights.standing) {
      const from = byId.get(fromId), to = byId.get(toId);
      const result = observation(mesh, from, to, height, heights.standing);
      optics.push({ id, from: fromId, to: toId, eyeHeight: height, ...result });
      if (result.unavailable) return;
      views.push({
        id, position: result.origin, target: result.target, projection: 'perspective', fov: 75,
        appearance: 'full-render', standingBodyFeet: from.feet, eyeHeight: height,
        targetStandingBodyFeet: to.feet, placementBasis: from.basis,
      });
    }

    for (const [from, to] of cameraPairs) inspect(`${from}-to-${to}`, from, to);
    for (const [from, to] of lowCoverPairs) {
      inspect(`${from}-standing-to-${to}`, from, to);
      inspect(`${from}-low-eye-to-${to}`, from, to, heights.lowEye);
    }
    for (const [walkId, target] of stairViews) {
      for (const [role, beforeEnd] of [['leader', .7], ['follower', 2.2]]) {
        const id = `${walkId}-${role}`;
        const placement = tracePlacement(level, byWalk.get(walkId), id, beforeEnd);
        placements.push(placement);
        byId.set(id, placement);
        inspect(id, id, target);
      }
    }
    for (const [walkId, target] of [['central-stair', 'lower-east-inner'], ['a-rear-stair', 'a-rear-arrival']]) {
      const walk = byWalk.get(walkId);
      const id = `${walkId}-mid-flight`;
      const placement = tracePlacement(level, walk, id, (walk?.distance ?? 0) / 2);
      placements.push(placement);
      byId.set(id, placement);
      inspect(id, id, target);
    }

    const markers = level.document.markers.filter(marker => ['attacker_spawn', 'defender_spawn'].includes(marker.kind));
    const spawnCounts = Object.fromEntries(['attacker_spawn', 'defender_spawn'].map(kind => [kind, markers.filter(marker => marker.kind === kind).length]));
    const spawnChecks = [];
    for (const marker of markers) {
      for (const [label, dx, dy] of [['start', 0, 0], ['left', -.7, 0], ['right', .7, 0], ['forward', 0, .7], ['back', 0, -.7]]) {
        const requested = [marker.position[0] + dx, marker.position[1] + dy, marker.position[2]];
        const placement = place(level, `${marker.id}-${label}`, requested, label === 'start' ? 'actual authored start marker' : 'supported offset from actual start');
        const rays = highSpawnTargets.map(target => ({ targetId: target, ...observation(mesh, placement, byId.get(target), heights.standing, heights.standing) }));
        spawnChecks.push({ marker: marker.id, kind: marker.kind, offset: [dx, dy], ...placement, rays });
      }
    }
    const sourceChanged = createHash('sha256').update(await readFile(sourcePath)).digest('hex') !== identity.sourceSha256;
    const summary = {
      output, views: views.length, spawnCounts, sourceChanged,
      placementFailures: placements.filter(placement => !placement.ok),
      walkFailures: walks.filter(walk => !walk.ok).map(({ trace, requested, ...walk }) => walk),
      spawnFailures: spawnChecks.filter(spawn => !spawn.ok).map(({ rays, ...spawn }) => spawn),
      visibleSpawnRays: spawnChecks.flatMap(spawn => spawn.rays.filter(result => result.visible).map(result => ({ spawn: spawn.id, ...result }))),
      unavailableOptics: optics.filter(result => result.unavailable),
      unavailableSpawnRays: spawnChecks.flatMap(spawn => spawn.rays.filter(result => result.unavailable).map(result => ({ spawn: spawn.id, ...result }))),
      diagnosticErrors: level.diagnostics.filter(diagnostic => diagnostic.severity === 'error'),
    };
    const report = {
      ...identity,
      scope: 'Targeted standing-body placements and bounded .04 m physical walking replays; trace-derived stair leader/follower cameras; finite opaque optical rays. Low eyes are optical variants, not crouch locomotion. No ballistic, utility, audio, multiplayer-body or balance simulation.',
      limits: { moveStep: MOVE_STEP, horizontalError: MAX_HORIZONTAL_ERROR, endpointError: MAX_END_ERROR, traceSampleError: MAX_TRACE_SAMPLE_ERROR, heights },
      summary, placements, walks, spawnChecks, optics, diagnostics: level.diagnostics,
    };
    await writeFile(join(output, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
    await writeFile(join(output, 'views.json'), `${JSON.stringify(views, null, 2)}\n`);
    console.log(JSON.stringify(summary, null, 2));
    if (sourceChanged || Object.values(spawnCounts).some(count => count !== 5) || summary.placementFailures.length || summary.walkFailures.length || summary.spawnFailures.length || summary.unavailableOptics.length || summary.unavailableSpawnRays.length || summary.diagnosticErrors.length) process.exitCode = 1;
  } finally {
    geometry.dispose();
    material.dispose();
  }
}

await main();
