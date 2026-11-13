import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { compile, parseAml, type V3 } from 'levelspec';
import {
  auditVisibility,
  minimumBearingArc,
  type VisibilityConfig,
} from '../tools/fps/visibility.ts';

const floorSource = '<profile id="floor-plan" points="0 0; 20 0; 20 12; 0 12"/><slab id="floor" profile="floor-plan" thickness="0.3"/>';
const screenAxis = '<path id="screen-axis" points="10 2 0; 10 10 0"/>';
const pairedPoints = [
  { id: 'west', feet: [5, 6, 0] as V3 },
  { id: 'east', feet: [15, 6, 0] as V3 },
];
const settings = { spacing: 2, eyeHeights: [1.6], longDistance: 8, maxSamples: 1000, maxPairQueries: 100_000 };

/** Compiles a real supported room; partial-width screens preserve an ordinary walking path around their ends. */
async function room(elements = '') {
  return compile(parseAml(`<architecture version="1" id="visibility-test">${floorSource}${elements}<player radius="0.25" height="2" step="0.25" slope="42"/><marker id="start" kind="spawn" element="floor" position="2 2 0"/></architecture>`), { navigation: { cell: .125 } });
}

/** Queries two known, supported feet positions without deriving expected visibility from compiler internals. */
function pairedAudit(level: Awaited<ReturnType<typeof room>>, overrides: VisibilityConfig['settings'] = {}) {
  return auditVisibility(level, {
    settings: { ...settings, ...overrides },
    points: pairedPoints,
    protectedPairs: [
      { id: 'west-east', from: 'west', to: 'east' },
      { id: 'east-west', from: 'east', to: 'west' },
    ],
  });
}

/** Selects a configured pair and makes absence a test failure rather than a silent optional assertion. */
function pair(report: ReturnType<typeof auditVisibility>, id = 'west-east') {
  const result = report.protectedPairs.find(value => value.id === id);
  assert.ok(result, `Missing protected pair ${id}`);
  return result;
}

/** Limits a hold query to the one meter-grid observer at XY(10,6). */
function holdConfig(entries: NonNullable<VisibilityConfig['holdRegions']>[number]['entries'], complete = true): VisibilityConfig {
  return {
    settings: { ...settings, spacing: 1 },
    holdRegions: [{
      id: 'hold', bounds: { min: [9.9, 5.9, -.1], max: [10.1, 6.1, .2] },
      approachesComplete: complete, entries,
    }],
  };
}

/** Requires an actual observer result at the intended XY location. */
function hold(report: ReturnType<typeof auditVisibility>) {
  const result = report.holds.find(value => value.region === 'hold' && Math.abs(value.feet[0] - 10) < .01 && Math.abs(value.feet[1] - 6) < .01);
  assert.ok(result, 'Expected the supported meter-grid observer at (10,6)');
  return result;
}

test('optical audit uses finite, reciprocal segments through real opaque geometry and openings', async () => {
  const open = await room();
  assert.equal(pair(pairedAudit(open)).visible, true);
  const opaque = await room(`${screenAxis}<wall id="screen" path="screen-axis" thickness=".2" height="3"/>`);
  const blocked = pairedAudit(opaque);
  assert.equal(pair(blocked).visible, false);
  assert.equal(pair(blocked, 'east-west').visible, false);
  const aperture = await room(`${screenAxis}<wall id="screen" path="screen-axis" thickness=".2" height="3"/><opening id="view" host="screen" shape="rectangle" center="4 1.5" width="2" height="2"/>`);
  assert.equal(pair(pairedAudit(aperture)).visible, true, 'The authored opening at Y6 passes the eye segment');
  const offOpening = auditVisibility(aperture, { settings, points: [{ id: 'left', feet: [5, 3, 0] }, { id: 'right', feet: [15, 3, 0] }], protectedPairs: [{ id: 'wall', from: 'left', to: 'right' }] });
  assert.equal(pair(offOpening, 'wall').visible, false, 'The remaining wall beside the opening still occludes');
  const beyond = await room('<path id="beyond-axis" points="18 2 0; 18 10 0"/><wall id="beyond" path="beyond-axis" thickness=".2" height="3"/>');
  assert.equal(pair(pairedAudit(beyond)).visible, true, 'An occluder beyond the target cannot block a finite segment');
});

test('low cover distinguishes standing, low-camera and mixed-height pair queries', async () => {
  const level = await room(`${screenAxis}<wall id="low-cover" path="screen-axis" thickness=".2" height="1.2"/>`);
  const result = pair(pairedAudit(level, { eyeHeights: [1, 1.6] }));
  assert.equal(result.heightPairs.length, 4, 'Key pairs include cross-posture combinations');
  assert.equal(result.heightPairs.find(value => value.fromHeight === 1 && value.toHeight === 1)?.visible, false);
  assert.equal(result.heightPairs.find(value => value.fromHeight === 1.6 && value.toHeight === 1.6)?.visible, true);
});

test('invisible collision does not block sight and visible noncollidable geometry does', async () => {
  const invisible = await room(`${screenAxis}<wall id="physical-only" path="screen-axis" thickness=".2" height="3" visible="false"/>`);
  assert.equal(pair(pairedAudit(invisible)).visible, true);
  const optical = await room(`${screenAxis}<wall id="optical-only" path="screen-axis" thickness=".2" height="3" collidable="false"/>`);
  assert.equal(pair(pairedAudit(optical)).visible, false);
});

test('unsupported opacity is explicitly incomplete rather than guaranteed protection', async () => {
  const level = await room(`<material id="uncertain" color="#ffffff80"/>${screenAxis}<wall id="screen" path="screen-axis" thickness=".2" height="3" material="uncertain"/>`);
  const report = pairedAudit(level);
  assert.equal(report.complete, false);
  assert.match(JSON.stringify(report.omissions), /opacity|transparent|material/i);
});

test('sampling retains upper and lower surfaces at shared XY and detects an intervening bridge slab', async () => {
  const level = await room('<profile id="bridge-plan" points="8 4; 12 4; 12 8; 8 8"/><slab id="bridge" profile="bridge-plan" thickness=".3" elevation="4"/><marker id="upper-start" kind="poi" element="bridge" position="10 6 4"/>');
  const report = auditVisibility(level, {
    settings,
    points: [
      { id: 'below', feet: [10, 6, 0] },
      { id: 'above', feet: [10, 6, 4] },
      { id: 'under-east', feet: [11, 6, 0] },
    ],
    protectedPairs: [
      { id: 'levels', from: 'below', to: 'above' },
      { id: 'under', from: 'below', to: 'under-east' },
    ],
  });
  const shared = report.samples.filter(value => Math.abs(value.feet[0] - 10) < .01 && Math.abs(value.feet[1] - 6) < .01);
  assert.ok(shared.some(value => Math.abs(value.feet[2]) < .1), 'Retain the supported lower floor');
  assert.ok(shared.some(value => Math.abs(value.feet[2] - 4) < .1), 'Retain the separately required upper surface');
  assert.equal(pair(report, 'levels').visible, false, 'A vertical line crosses the slab');
  assert.equal(pair(report, 'under').visible, true, 'The lower eye line passes below the slab');
});

test('long-view flags terminate at supported samples and requested unsupported key points fail', async () => {
  const level = await room();
  const report = auditVisibility(level, { settings: { ...settings, longDistance: 16 } });
  assert.ok(report.longLines.some(line => line.distance >= 16));
  for (const line of report.longLines) {
    assert.ok(line.distance <= Math.hypot(20, 12) + .1, 'An empty ray beyond the supported room is not a player sightline');
    for (const end of [line.from, line.to]) assert.ok(end[0] >= 0 && end[0] <= 20 && end[1] >= 0 && end[1] <= 12);
  }
  assert.throws(() => auditVisibility(level, {
    settings, points: [{ id: 'void', feet: [25, 6, 0] }],
  }), /support|navig|point|outside/i);
});

test('bearing coverage handles wraparound, separated approaches and threshold equality without mutation', () => {
  const wrapped = [350, 10];
  assert.equal(minimumBearingArc(wrapped), 20);
  assert.deepEqual(wrapped, [350, 10]);
  assert.equal(minimumBearingArc([0, 120, 240]), 240);
  assert.equal(minimumBearingArc([10, 110]), 100);
});

test('configured visible approaches that wrap north can fit one sector, while separated entries require turning', async () => {
  const level = await room();
  const narrow = hold(auditVisibility(level, holdConfig([
    { id: 'southeast', points: [[14.924, 5.132, 0]] },
    { id: 'northeast', points: [[14.924, 6.868, 0]] },
  ])));
  assert.equal(narrow.status, 'single-sector-candidate');
  assert.ok(Math.abs(narrow.horizontalSpan! - 20) < .02);
  const broad = hold(auditVisibility(level, holdConfig([
    { id: 'east', points: [[13, 6, 0]] },
    { id: 'northwest', points: [[8.5, 8.598, 0]] },
    { id: 'southwest', points: [[8.5, 3.402, 0]] },
  ])));
  assert.equal(broad.status, 'split-attention');
  assert.ok(Math.abs(broad.horizontalSpan! - 240) < .02);
});

test('partial portals retain visible edges while hidden, missing and incomplete approaches prevent certification', async () => {
  const level = await room('<box id="post" position="12 5.5 0" width=".5" depth="1" height="3"/>');
  const partlyVisible = hold(auditVisibility(level, holdConfig([
    { id: 'wide-east', points: [[16, 3, 0], [16, 6, 0], [16, 9, 0]] },
    { id: 'north', points: [[10, 10, 0]] },
  ])));
  assert.ok(partlyVisible.visibleEntries.includes('wide-east'), 'Blocked midpoint does not erase both visible portal edges');
  assert.ok(partlyVisible.partialEntries.includes('wide-east'), 'Visible portal edges do not erase the occluded middle');
  assert.deepEqual(partlyVisible.entrySamples.find(entry => entry.id === 'wide-east'), { id: 'wide-east', visible: 2, occluded: 1, unsupported: 0 });
  const hidden = hold(auditVisibility(level, holdConfig([
    { id: 'east', points: [[16, 6, 0]] },
    { id: 'north', points: [[10, 10, 0]] },
  ])));
  assert.equal(hidden.status, 'insufficient-evidence');
  assert.ok(hidden.hiddenEntries.includes('east'));
  const unsupported = hold(auditVisibility(level, holdConfig([
    { id: 'outside', points: [[25, 6, 0]] },
    { id: 'north', points: [[10, 10, 0]] },
  ])));
  assert.equal(unsupported.status, 'insufficient-evidence');
  assert.ok(unsupported.unverifiedEntries.includes('outside'));
  assert.deepEqual(unsupported.entrySamples.find(entry => entry.id === 'outside'), { id: 'outside', visible: 0, occluded: 0, unsupported: 1 });
  for (const entries of [[], [{ id: 'north', points: [[10, 10, 0] as V3] }]]) {
    assert.equal(hold(auditVisibility(level, holdConfig(entries))).status, 'insufficient-evidence');
  }
  assert.equal(hold(auditVisibility(level, holdConfig([
    { id: 'east', points: [[16, 3, 0]] },
    { id: 'north', points: [[10, 10, 0]] },
  ], false))).status, 'insufficient-evidence');
});

test('protected areas test offset supported spawn positions rather than just center markers', async () => {
  const level = await room('<path id="divider-axis" points="10 4 0; 10 8 0"/><wall id="divider" path="divider-axis" thickness=".2" height="3"/>');
  const report = auditVisibility(level, {
    settings,
    points: pairedPoints,
    protectedPairs: [{ id: 'centers', from: 'west', to: 'east' }],
    protectedAreas: [{ id: 'spawn-areas', from: { min: [3, 1, -.1], max: [7, 11, .1] }, to: { min: [13, 1, -.1], max: [17, 11, .1] } }],
  });
  assert.equal(pair(report, 'centers').visible, false);
  const area = report.protectedAreas.find(value => value.id === 'spawn-areas');
  assert.ok(area && area.testedPairs > 1 && area.visiblePairs > 0, 'Offset spawn-area lines around the divider remain detectable');
});

test('invalid settings and sample limits fail, while exhausted pair work remains explicitly incomplete', async () => {
  const level = await room();
  for (const invalid of [{ spacing: 0 }, { spacing: NaN }, { eyeHeights: [-1] }, { maxSamples: 0 }, { maxPairQueries: -1 }, { fovDegrees: 361 }]) {
    assert.throws(() => auditVisibility(level, { settings: { ...settings, ...invalid } }));
  }
  assert.throws(() => auditVisibility(level, { settings, points: [{ id: 'bad', feet: [NaN, 2, 0] }] }));
  assert.throws(() => auditVisibility(level, { settings, points: [{ id: 'same', feet: [2, 2, 0] }, { id: 'same', feet: [3, 2, 0] }] }));
  assert.throws(() => auditVisibility(level, { settings: { ...settings, maxSamples: 1 } }), /sample|limit|budget/i);
  const limited = auditVisibility(level, { settings: { ...settings, longDistance: 1, maxPairQueries: 1 } });
  assert.equal(limited.complete, false);
  assert.ok(limited.queryCount <= 1);
});

test('repeated audits preserve caller-owned compiled geometry and configuration', async () => {
  const level = await room();
  const config: VisibilityConfig = { settings, points: pairedPoints, protectedPairs: [{ id: 'pair', from: 'west', to: 'east' }] };
  const before = JSON.stringify({ mesh: level.mesh, physicalMesh: level.physicalMesh, navigation: level.navigation, config });
  const first = auditVisibility(level, config);
  assert.deepEqual(auditVisibility(level, config), first);
  assert.equal(JSON.stringify({ mesh: level.mesh, physicalMesh: level.physicalMesh, navigation: level.navigation, config }), before);
});


test('same-bearing approaches on different floors can still require vertical attention', async () => {
  const level = await room('<profile id="raised-plan" points="14 4; 18 4; 18 8; 14 8"/><slab id="raised" profile="raised-plan" elevation="4" thickness=".3"/><marker id="raised-start" kind="poi" element="raised" position="15 6 4"/>');
  const config = holdConfig([
    { id: 'under', points: [[15, 6, 0]] },
    { id: 'upper', points: [[15, 6, 4]] },
  ]);
  config.settings = { ...config.settings, verticalFovDegrees: 20 };
  const result = hold(auditVisibility(level, config));
  assert.deepEqual(result.visibleEntries, ['under', 'upper']);
  assert.ok(result.horizontalSpan! < .01);
  assert.ok(Math.abs(result.verticalSpan! - 38.6598) < .1);
  assert.equal(result.status, 'split-attention');
});

test('dynamic render surfaces are disclosed instead of treated as permanent cover', async () => {
  const level = await room(`${screenAxis}<wall id="moving-screen" path="screen-axis" thickness=".2" height="3" dynamic="true"/>`);
  const report = pairedAudit(level);
  assert.equal(report.complete, false);
  assert.ok(report.omissions.dynamicFaces > 0);
});

test('visibility CLI emits source-identified reports and one JSON failure for invalid input', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'levelspec-visibility-test-'));
  try {
    const source = join(directory, 'room.aml'), configuration = join(directory, 'config.json');
    const xml = `<architecture version="1" id="cli-visibility">${floorSource}<marker id="start" kind="spawn" element="floor" position="2 2 0"/></architecture>`;
    await writeFile(source, xml);
    await writeFile(configuration, JSON.stringify({ settings }));
    const command = resolve('tools/vector-visibility.ts');
    const result = await promisify(execFile)(process.execPath, [command, source, configuration, join(directory, 'output')], { timeout: 45_000 });
    const summary = JSON.parse(result.stdout);
    assert.equal(summary.success, true);
    assert.equal(summary.complete, true);
    const report = JSON.parse(await readFile(summary.report, 'utf8'));
    assert.equal(report.sourceSha256, createHash('sha256').update(xml).digest('hex'));
    assert.ok(report.samples.length > 0 && report.longLines.length > 0);
    assert.match(await readFile(summary.diagram, 'utf8'), /<svg[\s>]/);
    await writeFile(configuration, JSON.stringify({ settings: { spacing: 0 } }));
    await assert.rejects(
      promisify(execFile)(process.execPath, [command, source, configuration, join(directory, 'failed')], { timeout: 45_000 }),
      (error: unknown) => {
        const failure = error as Error & { code?: number; stdout: string };
        assert.notEqual(failure.code, 0);
        assert.equal(JSON.parse(failure.stdout).success, false);
        return true;
      },
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});


test('a complete two-entry hold exactly at the configured horizontal threshold is a candidate', async () => {
  const level = await room();
  const result = hold(auditVisibility(level, holdConfig([
    { id: 'east', points: [[13, 6, 0]] },
    { id: 'northwest', points: [[9.47905546699921, 8.954423259036624, 0]] },
  ])));
  assert.ok(Math.abs(result.horizontalSpan! - 100) < 1e-7);
  assert.equal(result.status, 'single-sector-candidate');
});


test('configured points cannot reuse generated-grid identities or bypass collection bounds', async () => {
  const level = await room();
  assert.throws(() => auditVisibility(level, {
    settings, points: [{ id: 'grid-0', feet: [10, 6, 0] }],
  }), /reserved|grid|identity/i);
  assert.throws(() => auditVisibility(level, {
    settings, points: Array.from({ length: 1001 }, (_, index) => ({ id: `point-${index}`, feet: [10, 6, 0] as V3 })),
  }), /collection|excessive|limit/i);
});

test('an unsampled supported tiny floor fails instead of claiming an empty complete scan', async () => {
  const level = await compile(parseAml('<architecture version="1" id="small-domain"><profile id="tiny-plan" points=".2 .2; 1.2 .2; 1.2 1.2; .2 1.2"/><slab id="tiny-floor" profile="tiny-plan" thickness=".3"/><player radius=".25" height="2" step=".25" slope="42"/><marker id="tiny-start" kind="spawn" element="tiny-floor" position=".7 .7 0"/></architecture>'), { navigation: { cell: .125 } });
  assert.ok(level.navigation!.indices.length > 0, 'The fixture has a real navigation surface');
  assert.throws(() => auditVisibility(level, { settings: { ...settings, spacing: 2 } }), /empty|sampled domain/i);
  const report = auditVisibility(level, {
    settings: { ...settings, spacing: 2 }, points: [{ id: 'tiny-observer', feet: [.7, .7, 0] }],
  });
  assert.equal(report.samples.length, 1);
  assert.equal(report.samples[0].id, 'tiny-observer');
  assert.equal(report.complete, true, 'An explicit supported key point supplies a declared observation domain');
});

test('renderer-style glass material remains optically uncertain even with an opaque color string', async () => {
  const level = await room(`<material id="glass-panel" color="#ffffff"/>${screenAxis}<wall id="glass-screen" path="screen-axis" thickness=".2" height="3" material="glass-panel"/>`);
  const report = pairedAudit(level);
  assert.equal(report.complete, false);
  assert.ok(report.omissions.unknownMaterials.includes('glass-panel'));
  assert.equal(pair(report).visible, true, 'Uncertain glass must not falsely certify the pair as protected');
});

test('candidate-pair work is bounded even when the long-view threshold skips every optical cast', async () => {
  const level = await room();
  const report = auditVisibility(level, { settings: { ...settings, longDistance: 1000, maxPairQueries: 1 } });
  assert.equal(report.queryCount, 0, 'No room pair reaches the configured long-view threshold');
  assert.equal(report.complete, false);
  assert.equal(report.omissions.pairBudgetReached, true, 'Candidate-distance work still exhausts the declared bound');
  assert.deepEqual(report.longLines, []);
});

test('an incomplete CLI scan persists its readable evidence and exits one with one JSON summary', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'levelspec-visibility-incomplete-'));
  try {
    const source = join(directory, 'room.aml'), configuration = join(directory, 'config.json');
    await writeFile(source, `<architecture version="1" id="incomplete-cli">${floorSource}<marker id="start" kind="spawn" element="floor" position="2 2 0"/></architecture>`);
    await writeFile(configuration, JSON.stringify({ settings: { ...settings, longDistance: 1, maxPairQueries: 1 } }));
    let summary: { success: boolean; complete: boolean; report: string; diagram: string } | undefined;
    await assert.rejects(
      promisify(execFile)(process.execPath, [resolve('tools/vector-visibility.ts'), source, configuration, join(directory, 'output')], { timeout: 45_000 }),
      (error: unknown) => {
        const failure = error as Error & { code?: number; stdout: string };
        assert.equal(failure.code, 1);
        assert.equal(failure.stdout.trim().split('\n').length, 1);
        summary = JSON.parse(failure.stdout);
        assert.equal(summary!.success, true, 'Artifact production succeeds while the scan remains incomplete');
        assert.equal(summary!.complete, false);
        return true;
      },
    );
    assert.ok(summary, 'An incomplete audit still returns its evidence paths');
    const report = JSON.parse(await readFile(summary.report, 'utf8'));
    assert.equal(report.complete, false);
    assert.equal(report.omissions.pairBudgetReached, true);
    assert.match(await readFile(summary.diagram, 'utf8'), /<svg[\s>]/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
