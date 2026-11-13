/** Open the frozen C11 artifact without rerunning the work-limited CLI compiler. */
import { access } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const artifact = 'generated/galini-reboot-c11-walk';
for (const name of ['loaded.aml', 'compiled.json', 'verification.json']) {
  await access(resolve(root, artifact, name));
}

const server = await createServer({
  configFile: false,
  root,
  server: { host: '127.0.0.1', port: 0 },
  optimizeDeps: { exclude: ['manifold-3d', 'recast-navigation', 'xatlas-wasm'] },
});
await server.listen();
const url = new URL('projects/galini-reboot/reviewer.html', server.resolvedUrls.local[0]);
url.searchParams.set('artifact', artifact);
url.searchParams.set('nav-cell', '0.0625');
console.log(`Frozen Galini C11 inspection: ${url}`);
console.log('Native diagnostics are retained. This is not a successful CLI build.');
process.once('SIGINT', async () => {
  await server.close();
  process.exit(0);
});
process.once('SIGTERM', async () => {
  await server.close();
  process.exit(0);
});
