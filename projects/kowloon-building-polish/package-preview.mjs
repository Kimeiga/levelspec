/** Packages the study viewer beside its GLB for ordinary static HTTP serving. */
import { cp } from 'node:fs/promises';
import { resolve } from 'node:path';
import { build } from 'vite';

export async function packagePreview(directory) {
  await build({
    configFile: false,
    logLevel: 'warn',
    build: {
      outDir: resolve(directory),
      emptyOutDir: false,
      lib: {
        entry: resolve('projects/kowloon-building-polish/preview.mjs'),
        formats: ['es'],
        fileName: () => 'preview.js',
      },
    },
  });
  await cp('projects/kowloon-building-polish/preview.html', `${directory}/index.html`);
}
