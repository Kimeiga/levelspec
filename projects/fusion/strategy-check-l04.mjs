/** Read-only, waypoint-constrained L04 strategy journeys. Run only after source freeze. */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, join } from 'node:path';
import { compile, parseAml, bakeNavmesh } from '../../src/architecture/index.ts';
import { prepareInspectionWalk } from '../../review/walk.ts';

const NAVIGATION_CELL = .125;
const MOVE_STEP = .04;
const AUDIT_STEP = .05;
const MAX_PLACEMENT_ERROR = .08;
const MAX_ENDPOINT_ERROR = .18;
const MAX_HORIZONTAL_ERROR = .12;
const MAX_WAYPOINT_HEIGHT_ERROR = .25;
const MAX_LEGS = 240;
const APPROVED_PLAYER = { radius: .35, height: 1.8, step: .3, slope: 42, crouch: 1.1, vault: 0, ladder: false, rappel: false };

const addedMarkers = [
  { id: 'strategy-cooling-rim', position: [42, -25, 0], region: 'cooling-ground' },
  { id: 'strategy-control-rim', position: [42, 29, 0], region: 'control-ground' },
  { id: 'strategy-b-shelf', position: [35, 19.5, 0], region: 'b-plant-shelf' },
  { id: 'strategy-gallery-front', position: [-23.5, 3, 3.2], region: 'a-freight-mezzanine' },
  { id: 'strategy-south-apron', position: [0, -17, 0], region: 'staging-apron' },
];

/** Returns a directional marker-pair key; reversal is never an implicit replay pass. */
function pairKey(from, to) { return `${from}::${to}`; }

/** Returns meters between world Z-up points. */
function distance(a, b) { return Math.hypot(...a.map((value, axis) => value - b[axis])); }

/** Requires all eight approved body and movement settings without permitting stronger abilities. */
function assertApprovedPlayer(player, label) {
  for (const [setting, expected] of Object.entries(APPROVED_PLAYER)) {
    if (player?.[setting] !== expected) throw new Error(`${label} player ${setting} must remain ${expected}`);
  }
}

/** Declares all comparisons as ordered marker chains with shared endpoints per group. */
function journeyPlans() {
  const plans = [];
  const add = (group, id, chain) => plans.push({ group, id, chain });
  const attackers = ['attack-spawn', ...[2, 3, 4, 5].map(n => `attacker-start-${n}`)];
  const defenders = ['defend-spawn', ...[2, 3, 4, 5].map(n => `defender-start-${n}`)];
  for (const origin of attackers) {
    add(`M1:${origin}`, `${origin}-a-south`, [origin, 'a-south-base', 'a-south-top', 'site-a']);
    add(`M1:${origin}`, `${origin}-a-gallery`, [origin, 'gallery-base', 'gallery-top', 'strategy-gallery-front', 'site-a']);
    add(`M1:${origin}`, `${origin}-a-port`, [origin, 'strategy-south-apron', 'ring-south', 'port-west', 'a-east-base', 'a-east-top', 'site-a']);
    add(`M2:${origin}`, `${origin}-b-trench`, [origin, 'trench', 'b-trench-low', 'site-b']);
    add(`M2:${origin}`, `${origin}-b-equator`, [origin, 'strategy-south-apron', 'ring-south', 'port-east', 'b-west-base', 'b-west-low', 'site-b']);
    add(`M2:${origin}`, `${origin}-b-central`, [origin, 'strategy-south-apron', 'ring-south', 'central-stair-top', 'central-stair-bottom', 'lower-east', 'lower-east-room', 'b-workroom', 'site-b']);
  }
  for (const origin of defenders) {
    add(`M1:${origin}`, `${origin}-a-rear`, [origin, 'a-rear-base', 'a-rear-top', 'site-a']);
    add(`M2:${origin}`, `${origin}-b-rear`, [origin, 'b-rear-base', 'b-rear-low', 'site-b']);
    add(`M2:${origin}`, `${origin}-b-west`, [origin, 'b-west-base', 'b-west-low', 'site-b']);
  }
  const lowerWestEast = ['freight-low', 'lower-west', 'lower-east', 'lower-east-room', 'b-workroom', 'site-b'];
  const freightGroundB = ['freight-low', 'freight-top', 'a-east-base', 'port-west', 'ring-north', 'port-east', 'b-west-base', 'b-west-low', 'site-b'];
  add('M3:freight-b', 'freight-b-lower', lowerWestEast);
  add('M3:freight-b', 'freight-b-ground', freightGroundB);
  add('M3:b-freight', 'b-freight-lower', lowerWestEast.toReversed());
  add('M3:b-freight', 'b-freight-ground', freightGroundB.toReversed());
  add('M4:central-freight', 'central-freight-reset', ['central-stair-bottom', 'lower-west', 'freight-low', 'freight-top']);
  add('M4:central-ground', 'central-ground-reset', ['central-stair-bottom', 'central-stair-top', 'ring-south']);
  add('M4:b-ground', 'b-west-ground-reset', ['b-west-low', 'b-west-base', 'port-east']);
  const crossMap = {
    rear: ['site-a', 'a-rear-top', 'a-rear-base', 'defend-spawn', 'b-rear-base', 'b-rear-low', 'site-b'],
    equator: ['site-a', 'a-east-top', 'a-east-base', 'port-west', 'ring-north', 'port-east', 'b-west-base', 'b-west-low', 'site-b'],
    lower: ['site-a', 'a-east-top', 'a-east-base', 'freight-top', ...lowerWestEast],
    crown: ['site-a', 'crown-west-base', 'crown-west-top', 'crown-west-room', 'crown-east-room', 'crown-east-top', 'crown-east-mid', 'crown-east-base', 'b-rear-base', 'b-rear-low', 'site-b'],
  };
  for (const [route, chain] of Object.entries(crossMap)) {
    add('M5:a-b', `a-b-${route}`, chain);
    add('M5:b-a', `b-a-${route}`, chain.toReversed());
  }
  for (const room of ['crown-west-room', 'crown-east-room']) {
    const toWest = room === 'crown-west-room' ? [room] : [room, 'crown-west-room'];
    const toEast = room === 'crown-east-room' ? [room] : [room, 'crown-east-room'];
    add(`M6:${room}:a`, `${room}-a`, [...toWest, 'crown-west-top', 'crown-west-base', 'site-a']);
    add(`M6:${room}:b`, `${room}-b`, [...toEast, 'crown-east-top', 'crown-east-mid', 'crown-east-base', 'b-rear-base', 'b-rear-low', 'site-b']);
  }
  add('M6:west-local', 'crown-west-arrival-a', ['crown-west-base', 'site-a']);
  add('M6:east-mid', 'crown-east-mid-b', ['crown-east-mid', 'crown-east-base', 'b-rear-base', 'b-rear-low', 'site-b']);
  add('M6:east-ground', 'crown-east-ground-b', ['crown-east-base', 'b-rear-base', 'b-rear-low', 'site-b']);
  add('M7:rim-control', 'cooling-control-rim', ['strategy-cooling-rim', 'east-rim', 'strategy-control-rim']);
  add('M7:cooling-b', 'cooling-b-rim-rear', ['strategy-cooling-rim', 'east-rim', 'strategy-control-rim', 'b-rear-base', 'b-rear-low', 'site-b']);
  add('M7:cooling-b', 'cooling-b-trench', ['strategy-cooling-rim', 'trench', 'b-trench-low', 'site-b']);
  add('M7:rim-shelf', 'cooling-shelf-branch', ['strategy-cooling-rim', 'east-rim', 'strategy-b-shelf']);
  add('M8:south-gallery', 'a-south-gallery-substitution', ['a-south-base', 'gallery-base', 'gallery-top', 'strategy-gallery-front']);
  add('M8:south-east', 'a-south-east-substitution', ['a-south-base', 'a-east-base', 'a-east-top']);
  add('M8:east-south', 'a-east-south-substitution', ['a-east-base', 'a-south-base', 'a-south-top']);
  return plans;
}

/** Builds explicit connector reservations; ordinary same-plane legs are bounded by height. */
function connectorRules(markers) {
  const rules = new Map();
  const both = (from, to, rule) => {
    rules.set(pairKey(from, to), rule);
    rules.set(pairKey(to, from), rule);
  };
  const flights = [
    ['freight-low', 'freight-top', 3.5],
    ['a-south-base', 'a-south-top', 1.8], ['a-east-base', 'a-east-top', 1.8],
    ['a-rear-base', 'a-rear-top', 1.8], ['gallery-base', 'gallery-top', 2.1],
    ['crown-west-base', 'crown-west-top', 1.8], ['crown-east-top', 'crown-east-mid', 2],
    ['crown-east-mid', 'crown-east-base', 2], ['b-west-base', 'b-west-low', 1.8],
    ['b-rear-base', 'b-rear-low', 1.8], ['trench', 'b-trench-low', 3.6],
  ];
  for (const [from, to, margin] of flights) {
    const a = markers.get(from)?.position, b = markers.get(to)?.position;
    if (!a || !b) continue;
    both(from, to, {
      kind: 'named flight corridor',
      min: a.map((value, axis) => Math.min(value, b[axis]) - (axis === 2 ? .2 : margin)),
      max: a.map((value, axis) => Math.max(value, b[axis]) + (axis === 2 ? .2 : margin)),
    });
  }
  both('central-stair-top', 'central-stair-bottom', {
    kind: 'central curved flight and landings', min: [-5, -2.5, -3.4], max: [5.5, 2.5, .2],
    radius: [4, 6.3], angles: [200, 335],
  });
  for (const pair of [['lower-west', 'lower-east'], ['central-stair-bottom', 'lower-east'], ['central-stair-bottom', 'lower-west']]) {
    both(...pair, { kind: 'lower internal arc only', min: [-8, -4, -3.4], max: [8, 4.5, -3], radius: [4, 7.5] });
  }
  both('freight-low', 'lower-west', { kind: 'lower west radial corridor', min: [-33, -14, -3.4], max: [-3.5, 3, -2.6] });
  both('lower-east', 'lower-east-room', { kind: 'lower east radial corridor', min: [4, -3, -3.4], max: [30, 4.5, -2.6] });
  both('port-west', 'ring-north', { kind: 'north equatorial arc', min: [-13, 3, -.2], max: [1, 13.5, .2] });
  both('ring-north', 'port-east', { kind: 'north equatorial arc', min: [-1, 3, -.2], max: [14, 13.5, .2] });
  both('strategy-south-apron', 'ring-south', { kind: 'south access bridge', min: [-2.2, -18, -.2], max: [2.2, -2.8, .2] });
  const rearBand = { kind: 'rear services ground band', min: [-31, 26.6, -.2], max: [43, 33.9, .2] };
  both('a-rear-base', 'defend-spawn', rearBand);
  both('defend-spawn', 'b-rear-base', rearBand);
  both('crown-east-base', 'b-rear-base', rearBand);
  both('strategy-control-rim', 'b-rear-base', rearBand);
  for (const pair of [['strategy-cooling-rim', 'east-rim'], ['east-rim', 'strategy-control-rim']]) {
    both(...pair, { kind: 'exposed east ground strip', min: [41.1, -26, -.2], max: [42.9, 30, .2] });
  }
  for (const marker of markers.values()) {
    if (marker.kind === 'defender_spawn') {
      both(marker.id, 'a-rear-base', rearBand);
      both(marker.id, 'b-rear-base', rearBand);
      both(marker.id, 'b-west-base', {
        kind: 'rear to east ground wing', min: [-22, 5.5, -.2], max: [43, 33.9, .2],
        boxes: [{ min: [-22, 26.6, -.2], max: [43, 33.9, .2] }, { min: [22.1, 5.5, -.2], max: [43, 33.9, .2] }],
      });
    }
    if (marker.kind !== 'attacker_spawn' && marker.id !== 'strategy-cooling-rim') continue;
    both(marker.id, 'trench', { kind: 'ground to south trench ramp', min: [-50, -40, -1.4], max: [45, 2, .2] });
  }
  return rules;
}

/** Resolves a leg's allowed floor or named connector, rejecting undeclared mixed-plane links. */
function ruleFor(from, to, markers, rules) {
  const named = rules.get(pairKey(from, to));
  if (named) return named;
  const a = markers.get(from)?.position, b = markers.get(to)?.position;
  if (!a || !b) return undefined;
  if (Math.abs(a[2] - b[2]) > .02) return undefined;
  return { kind: 'same occupied plane', min: [-100, -100, a[2] - .2], max: [100, 100, a[2] + .2] };
}

/** Checks world position against the intended leg's floor/connector reservation. */
function withinRule(point, rule) {
  if (point.some((value, axis) => value < rule.min[axis] || value > rule.max[axis])) return false;
  if (rule.boxes && !rule.boxes.some(box => point.every((value, axis) => value >= box.min[axis] && value <= box.max[axis]))) return false;
  if (rule.radius) {
    const radius = Math.hypot(point[0], point[1] - 4);
    if (radius < rule.radius[0] || radius > rule.radius[1]) return false;
  }
  if (rule.angles) {
    const angle = (Math.atan2(point[1] - 4, point[0]) * 180 / Math.PI + 360) % 360;
    if (angle < rule.angles[0] || angle > rule.angles[1]) return false;
  }
  return true;
}

/** Audits complete straight-path segments, not merely the requested waypoint coordinates. */
function auditPath(points, rule) {
  for (let index = 0; index < points.length; index++) {
    const start = points[Math.max(0, index - 1)], end = points[index];
    const count = Math.max(1, Math.ceil(distance(start, end) / AUDIT_STEP));
    for (let sample = 0; sample <= count; sample++) {
      const point = start.map((value, axis) => value + (end[axis] - value) * sample / count);
      if (!withinRule(point, rule)) return { ok: false, segment: index, point, rule };
    }
  }
  return { ok: true };
}

/** Places an unchanged body near the requested XYZ; large support snapping is a failure. */
function place(level, marker) {
  const placed = prepareInspectionWalk(level, { feet: marker.position, yaw: 0, pitch: 0 });
  if (!placed.ok) return { id: marker.id, requested: marker.position, ok: false, error: placed.message };
  const feet = [...placed.pose.feet], error = distance(feet, marker.position);
  return { id: marker.id, requested: marker.position, feet, error, ok: error <= MAX_PLACEMENT_ERROR };
}

/** Replays one unique leg, checking XYZ endpoints and physical progress without teleporting. */
function replay(level, path, from, to, rule) {
  const prepared = prepareInspectionWalk(level, { feet: from.feet, yaw: 0, pitch: 0 });
  if (!prepared.ok) return { ok: false, error: prepared.message };
  if (distance(prepared.pose.feet, from.feet) > MAX_PLACEMENT_ERROR) return { ok: false, error: 'Replay start moved beyond placement tolerance' };
  let feet = [...prepared.pose.feet], traveled = 0, requests = 0;
  const trace = [[...feet]];
  for (const target of [...path, to.feet]) {
    const start = [...feet];
    const count = Math.max(1, Math.ceil(Math.hypot(target[0] - start[0], target[1] - start[1]) / MOVE_STEP));
    for (let step = 1; step <= count; step++) {
      const request = start.slice(0, 2).map((value, axis) => value + (target[axis] - value) * step / count);
      const next = prepared.surface.move(feet, request[0] - feet[0], request[1] - feet[1]);
      if (!Array.isArray(next) || next.length !== 3 || !next.every(Number.isFinite)) {
        return { ok: false, distance: traveled, requests, trace, failure: { request, next, reason: 'Physical walker returned invalid coordinates' } };
      }
      traveled += distance(next, feet); feet = [...next]; requests++;
      if (requests % 10 === 0) trace.push([...feet]);
      if (Math.hypot(feet[0] - request[0], feet[1] - request[1]) > MAX_HORIZONTAL_ERROR || !withinRule(feet, rule)) {
        return { ok: false, distance: traveled, requests, trace, failure: { request, feet, target, reason: 'Physical progress or corridor mismatch' } };
      }
    }
    if (Math.abs(feet[2] - target[2]) > MAX_WAYPOINT_HEIGHT_ERROR) {
      return { ok: false, distance: traveled, requests, trace, failure: { target, feet, reason: 'Physical waypoint is on a different height' } };
    }
  }
  trace.push([...feet]);
  const endError = distance(feet, to.feet);
  return { ok: endError <= MAX_ENDPOINT_ERROR, distance: traveled, requests, trace, start: from.feet, end: feet, endError };
}

/** Collects directional legs once; existing source route declarations are reused unchanged. */
function collectLegs(plans, document) {
  const markers = new Map(document.markers.map(marker => [marker.id, marker]));
  const rules = connectorRules(markers), legs = new Map();
  for (const plan of plans) {
    for (let index = 1; index < plan.chain.length; index++) {
      const from = plan.chain[index - 1], to = plan.chain[index], key = pairKey(from, to);
      if (legs.has(key)) continue;
      const existing = document.routes.find(route => route.from === from && route.to === to);
      const rule = ruleFor(from, to, markers, rules);
      const leg = { key, from, to, rule, routeId: existing?.id ?? `strategy-leg-${legs.size + 1}` };
      if (!markers.has(from) || !markers.has(to)) leg.unavailable = 'Required authored marker is absent';
      else if (!rule) leg.unavailable = 'No explicit connector rule for mixed-plane leg';
      else if (!existing) document.routes.push({ id: leg.routeId, from, to, minRoutes: 1, movement: 'land' });
      legs.set(key, leg);
    }
  }
  if (legs.size > MAX_LEGS) throw new Error(`Bounded request budget exceeded: ${legs.size} legs`);
  return { legs, markers };
}

/** Aggregates independent leg evidence without calling it a continuous multiplayer traversal. */
function summarizeJourney(plan, legs, placements) {
  const rows = plan.chain.slice(1).map((to, index) => legs.get(pairKey(plan.chain[index], to)));
  const ok = rows.every(row => row.ok);
  return {
    ...plan, from: placements.get(plan.chain[0])?.requested, to: placements.get(plan.chain.at(-1))?.requested,
    ok, status: ok ? 'bounded legs verified' : 'unavailable or failed leg',
    legKeys: rows.map(row => row.key), failures: rows.filter(row => !row.ok).map(row => ({ key: row.key, reason: row.unavailable ?? row.failure })),
    navigationDistance: ok ? rows.reduce((sum, row) => sum + row.navigationDistance, 0) : null,
    physicalDistance: ok ? rows.reduce((sum, row) => sum + row.walk.distance, 0) : null,
    junctionTolerance: MAX_ENDPOINT_ERROR,
  };
}

/** Reads one source, augments only in-memory navigation requests, and writes a fresh evidence directory. */
async function main() {
  const [outputArgument, sourceArgument, ...extraArguments] = process.argv.slice(2);
  if (extraArguments.length) throw new Error('Unexpected argument: sparse prior walk reports are not accepted for strategy replay reuse');
  const plans = journeyPlans();
  if (outputArgument === '--inventory') {
    console.log(JSON.stringify({ plans, addedMarkers, bounds: { maxLegs: MAX_LEGS, navigationCell: NAVIGATION_CELL, moveStep: MOVE_STEP } }, null, 2));
    return;
  }
  if (!outputArgument) throw new Error('Usage: node --experimental-strip-types projects/fusion/strategy-check-l04.mjs <new-output-dir> [frozen-source.aml]');
  const output = resolve(outputArgument), sourcePath = sourceArgument ? resolve(sourceArgument) : new URL('./level.aml', import.meta.url);
  const bytes = await readFile(sourcePath);
  const document = parseAml(bytes.toString());
  const sourcePlayer = JSON.stringify(document.player);
  assertApprovedPlayer(document.player, 'Source');
  await mkdir(output, { recursive: false });
  const level = await compile(document, { uvs: false, navigation: false });
  const identity = { sourceFile: String(sourcePath), sourceSha256: createHash('sha256').update(bytes).digest('hex'), physicalHash: level.physicalHash, renderHash: level.renderHash, player: level.document.player, navigationCell: NAVIGATION_CELL };
  const compileErrors = level.diagnostics.filter(item => item.severity === 'error');
  if (compileErrors.length) {
    await writeFile(join(output, 'report.json'), JSON.stringify({ ...identity, ok: false, compileErrors }, null, 2));
    process.exitCode = 1; return;
  }
  level.document.markers = [...level.document.markers];
  level.document.routes = [...level.document.routes];
  for (const marker of addedMarkers) {
    if (level.document.markers.some(existing => existing.id === marker.id)) throw new Error(`Reserved inspection marker already exists: ${marker.id}`);
    level.document.markers.push({ ...marker, kind: 'inspection', layer: 'architecture', movement: 'land' });
  }
  const { legs, markers } = collectLegs(plans, level.document);
  await bakeNavmesh(level, { cell: NAVIGATION_CELL });
  assertApprovedPlayer(level.navigation?.settings.player, 'Navigation');
  if (level.physicalHash !== identity.physicalHash || level.renderHash !== identity.renderHash || JSON.stringify(level.document.player) !== sourcePlayer) {
    throw new Error('Navigation-only augmentation changed geometry identity or player settings');
  }
  const required = new Set(plans.flatMap(plan => plan.chain));
  const placements = new Map([...required].filter(id => markers.has(id)).map(id => [id, place(level, markers.get(id))]));
  for (const leg of legs.values()) {
    const from = placements.get(leg.from), to = placements.get(leg.to);
    if (leg.unavailable) continue;
    if (!from?.ok || !to?.ok) { leg.unavailable = 'Endpoint body placement failed or snapped too far'; continue; }
    const route = level.navigation.routes.find(item => item.id === leg.routeId);
    if (!route?.reachable || !route.path?.length) { leg.unavailable = 'No reachable navigation path'; continue; }
    if (!Number.isFinite(route.distance) || route.distance < 0 || route.path.some(point => !Array.isArray(point) || point.length !== 3 || !point.every(Number.isFinite))) {
      leg.failure = { reason: 'Navigation returned non-finite distance or invalid path coordinates' };
      continue;
    }
    leg.path = route.path;
    leg.navigationDistance = route.distance;
    const endpointErrors = [distance(route.path[0], from.feet), distance(route.path.at(-1), to.feet)];
    if (endpointErrors.some(error => error > MAX_ENDPOINT_ERROR)) { leg.failure = { reason: 'Navigation endpoint snap', endpointErrors }; continue; }
    const audit = auditPath([from.feet, ...route.path, to.feet], leg.rule);
    if (!audit.ok) {
      leg.failure = { reason: 'Native path candidate leaves intended connector or floor; a conforming alternative has not been searched or disproven', audit };
      continue;
    }
    leg.walk = { ...replay(level, route.path, from, to, leg.rule), evidence: 'new bounded physical replay' };
    leg.ok = leg.walk.ok;
    if (!leg.ok) leg.failure = leg.walk.failure ?? { reason: 'Physical endpoint or placement failure', error: leg.walk.error, endError: leg.walk.endError };
  }
  const journeys = plans.map(plan => summarizeJourney(plan, legs, placements));
  const groups = [...new Set(plans.map(plan => plan.group))].map(id => {
    const members = journeys.filter(journey => journey.group === id);
    const endpoints = members.map(member => JSON.stringify([member.from, member.to]));
    if (new Set(endpoints).size !== 1) throw new Error(`Comparison group ${id} has different endpoint coordinates`);
    return { id, from: members[0].from, to: members[0].to, members: members.map(member => member.id), allAvailable: members.every(member => member.ok) };
  });
  const ok = journeys.every(journey => journey.ok);
  const report = {
    ...identity, ok,
    scope: 'M1–M8 ordered marker chains; native navigation candidates audited against explicit floors/connectors; every unique physical leg receives a fresh strict replay. A rejected unconstrained candidate does not disprove a longer conforming path. Distances sum independent legs, not a continuous end-to-end traversal or multiplayer timing. Unavailable paths are retained; no automatic rerouting is claimed. Saved traces are decimated for inspection, but corridor/progress checks run at every movement request and height checks run at every navigation waypoint; sparse prior reports are never reused.',
    tolerances: { placement: MAX_PLACEMENT_ERROR, navigationEndpoint: MAX_ENDPOINT_ERROR, physicalEndpoint: MAX_ENDPOINT_ERROR, horizontalRequest: MAX_HORIZONTAL_ERROR, waypointHeight: MAX_WAYPOINT_HEIGHT_ERROR, auditStep: AUDIT_STEP, moveStep: MOVE_STEP },
    navigationPassed: level.navigation.passed, navigationDiagnostics: level.navigation.diagnostics,
    placements: [...placements.values()], legs: [...legs.values()], journeys, groups,
  };
  await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2));
  await writeFile(join(output, 'summary.json'), JSON.stringify({ ...identity, ok, groups, journeys, placementFailures: [...placements.values()].filter(item => !item.ok), replayedLegs: [...legs.values()].filter(leg => leg.walk).length }, null, 2));
  console.log(JSON.stringify({ output, ok, journeys: journeys.length, verified: journeys.filter(journey => journey.ok).length, failed: journeys.filter(journey => !journey.ok).map(journey => ({ id: journey.id, failures: journey.failures })) }, null, 2));
  if (!ok) process.exitCode = 1;
}

await main();
