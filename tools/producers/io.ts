import { mkdirSync, writeFileSync, renameSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';

/** Options with values are removed before selecting positional filters. */
export function argumentsFor(argv: string[], names: string[]) {
  const values = new Map<string, string>(), rest: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    if (!names.includes(argv[i])) { rest.push(argv[i]); continue; }
    const value = argv[++i];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${argv[i-1]}.`);
    values.set(argv[i-1], value);
  }
  return { values, rest };
}

/** Call only after validation; a failed write leaves the previous artifact intact. */
export function writeArtifact(path: string, text: string) {
  path = resolve(path);
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${randomUUID()}.tmp`;
  try { writeFileSync(temporary, text); renameSync(temporary, path); }
  finally { rmSync(temporary, { force: true }); }
}

export function python(script: string, args: string[], executable = process.env.PYTHON ?? 'python3') {
  try { return execFileSync(executable, [script, ...args], { encoding: 'utf8', maxBuffer: 1 << 24, stdio: ['ignore', 'pipe', 'pipe'] }); }
  catch (error) {
    const failure = error as Error & { stderr?: string | Buffer };
    throw new Error(`Python source proposal failed. Set PYTHON to a working interpreter (tracing requires numpy and Pillow). ${failure.stderr?.toString().trim() || failure.message}`);
  }
}
