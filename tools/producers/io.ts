import { mkdirSync, writeFileSync, renameSync, rmSync,existsSync,realpathSync } from 'node:fs';
import { dirname, resolve,join,basename } from 'node:path';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';

/** Options with values are removed before selecting positional filters. */
export function argumentsFor(argv: string[], names: string[]) {
  const values = new Map<string, string>(), rest: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const equal=argv[i].indexOf('='),name=equal<0?argv[i]:argv[i].slice(0,equal);
    if (!names.includes(name)) { rest.push(argv[i]); continue; }
    const value = equal<0?argv[++i]:argv[i].slice(equal+1);
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${name}.`);
    values.set(name, value);
  }
  return { values, rest };
}

/** Resolve existing ancestors as well as files, including directory aliases. */
export function canonicalArtifactPath(path:string):string {
  const absolute=resolve(path),resolved=existsSync(absolute)?realpathSync(absolute):join(canonicalArtifactPath(dirname(absolute)),basename(absolute));
  return process.platform==='win32'?resolved.toLowerCase():resolved;
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
