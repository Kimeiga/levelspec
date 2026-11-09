import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, writeFile, rm, truncate } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const launcher = fileURLToPath(new URL('../bin/levelspec.mjs', import.meta.url));

/** Runs the real process/file boundary from an unrelated project directory. */
function cli(args: string[], cwd: string): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [launcher, ...args], { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    child.stdout.on('data', chunk => stdout += chunk); child.stderr.on('data', chunk => stderr += chunk);
    child.once('error', reject); child.once('close', code => resolve({ code, stdout, stderr }));
  });
}

/** Independent PNG bytes make companion snapshots and edits directly reviewable. */
function png(samples: number[]): Uint8Array {
  const image = new PNG({ width: 3, height: 2 }); image.data = Buffer.from(samples);
  return Uint8Array.from(PNG.sync.write(image, { colorType: 0, inputColorType: 0, inputHasAlpha: false, filterType: 0 }));
}

/** Computes the expected published filename independently of exporter hashing. */
function sha256(bytes: Uint8Array): string { return createHash('sha256').update(bytes).digest('hex'); }

/** Enforces the existing finite-command single-result JSON protocol. */
function result(response: Awaited<ReturnType<typeof cli>>, command: string, success: boolean) {
  assert.equal(response.code, success ? 0 : 1, response.stderr || response.stdout);
  const data = JSON.parse(response.stdout);
  assert.equal(data.schemaVersion, 1); assert.equal(data.command, command); assert.equal(data.success, success);
  assert.ok(Array.isArray(data.diagnostics)); return data;
}

test('CLI heightmap validation and builds snapshot exact companion bytes and recover after edits and missing files', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'levelspec-heightmap-cli-'));
  try {
    const file = join(directory, 'level.aml'), companion = join(directory, 'ground.png'), output = join(directory, 'output');
    const source = '<architecture version="1" id="heightmap-cli" validation="premap"><terrain id="ground" heightmap="ground.png" cell-size="3 4" min-height="0" max-height="1"/></architecture>';
    const original = png([0, 32, 64, 96, 128, 255]), changed = png([0, 32, 64, 96, 128, 240]);
    await writeFile(file, source); await writeFile(companion, original);
    result(await cli(['validate', file, '--json'], directory), 'validate', true);
    const artifacts = (bytes: Uint8Array) => ({ hash: sha256(bytes), file: `heightmaps/${sha256(bytes)}.png`, size: bytes.byteLength });
    const checkSnapshot = async (bytes: Uint8Array) => {
      const expected = artifacts(bytes), manifest = JSON.parse(await readFile(join(output, 'heightmap-cli.export.json'), 'utf8'));
      assert.deepEqual(manifest.heightmaps['ground.png'], { sourceSha256: expected.hash, file: expected.file, size: expected.size });
      assert.deepEqual(Uint8Array.from(await readFile(join(output, expected.file))), bytes);
      return JSON.parse(await readFile(join(output, 'heightmap-cli.runtime.json'), 'utf8'));
    };
    const firstBuild = result(await cli(['build', file, '--out', output, '--no-uv', '--json'], directory), 'build', true);
    assert.ok(firstBuild.artifacts.some((name: string) => name.endsWith('heightmap-cli.glb')));
    const first = await checkSnapshot(original);
    await writeFile(companion, changed);
    result(await cli(['build', file, '--out', output, '--no-uv', '--json'], directory), 'build', true);
    const second = await checkSnapshot(changed);
    assert.notEqual(second.physicalHash, first.physicalHash);
    assert.notDeepEqual(second.collision.positions, first.collision.positions);
    const previousRuntime = await readFile(join(output, 'heightmap-cli.runtime.json'));
    const previousGlb = await readFile(join(output, 'heightmap-cli.glb'));
    const previousManifest = await readFile(join(output, 'heightmap-cli.export.json'));
    await rm(companion);
    const failed = result(await cli(['build', file, '--out', output, '--no-uv', '--json'], directory), 'build', false);
    assert.ok(failed.diagnostics.some((d: { objects: string[]; source?: { line: number } }) => d.objects.includes('ground') && d.source?.line === 1));
    assert.deepEqual(await readFile(join(output, 'heightmap-cli.runtime.json')), previousRuntime);
    assert.deepEqual(await readFile(join(output, 'heightmap-cli.glb')), previousGlb);
    assert.deepEqual(await readFile(join(output, 'heightmap-cli.export.json')), previousManifest);
    await writeFile(companion, changed);
    result(await cli(['validate', file, '--json'], directory), 'validate', true);
    assert.equal(await readFile(file, 'utf8'), source, 'Heightmap loading never rewrites authored AML');
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('CLI rejects oversized local heightmap companions and usable input recovers', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'levelspec-heightmap-limit-'));
  try {
    const file = join(directory, 'level.aml'), companion = join(directory, 'ground.png');
    await writeFile(file, '<architecture version="1" id="limit" validation="premap"><terrain id="ground" heightmap="ground.png"/></architecture>');
    const bytes = png([0, 0, 0, 0, 0, 0]); await writeFile(companion, bytes);
    await truncate(companion, 16 * 1024 * 1024 + 1);
    const failed = result(await cli(['validate', file, '--json'], directory), 'validate', false);
    assert.ok(failed.diagnostics.some((d: { objects: string[]; message: string }) => d.objects.includes('ground') && /byte|size|limit|budget/i.test(d.message)));
    await writeFile(companion, bytes);
    result(await cli(['validate', file, '--json'], directory), 'validate', true);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
