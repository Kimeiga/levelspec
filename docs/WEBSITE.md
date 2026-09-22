# Interactive introduction

The current featured scene is **Lantern Court**, a two-storey architectural courtyard with 15 declared floor regions. See [COURTYARD.md](COURTYARD.md) for authoring, materials, exports and limits.

`website/architecture.ts` emits the SVGX source for the same compiler used by the workbench. `website/demo.level.svgx` is a tested default-state snapshot. The page follows Enter / Reshape / Validate / Export: enter at eye level, change the curve or shared elevation, inspect actual navigation, deliberately disconnect and repair access, then export the compiled result.

## Run and verify

Use Node 24. Run `npm ci`, then `npm run dev:site`. Run `npm run check`, `node --test --test-concurrency=2 'tests/*.test.ts'`, and `npm run test:site`.

Build with `SITE_BASE=/levelspec/ npm run build:site`; output is `dist-site/`. For a root domain use `SITE_BASE=/`. Start `SITE_BASE=/levelspec/ npm run preview:site -- --port 48217 --strictPort`, then run `npm run test:site:browser`. The browser suites accept `BASE_URL`, `QA_OUTPUT`, and `BROWSER_PATH`. They use installed Chrome on macOS or Playwright's installed Chromium elsewhere.

## Presentation and sharing

Present hides the surrounding introduction. Arrow keys or 1–4 change chapters. Escape leaves walking before exiting presentation. Reset restores the initial source and camera. Shared links preserve bounded curve, elevation, material and validation-demo state without forcing presentation mode.

The production service worker precaches compiler code, assets and exports. Wait for **Ready offline on this device**. External GitHub documentation still needs connectivity. An existing tab may need a reload after the service worker updates.

## Contracts

The 25 curve settings and seven elevations (3–6 m) are compiled and validated in the Node suite. New inputs cancel previous workers and immediately invalidate model exports. Failed validation, stale results, network errors and timeouts do not become successful exports.

One Three.js scene owns the 3D preview, using compiled normals and material UVs. Rendering pauses when idle/offscreen. The plan and text remain available without WebGL. Walking follows compiler-derived navigation, not full gameplay physics. Material images are original and bundled locally, not fetched from a CDN. GLB embeds them; glTF and editable-source ZIPs include the required companion images.

Native FBX and BSP2 exports remain CLI workflows with external dependencies. The site does not claim automatic photo reconstruction or finished gameplay scenes. Source, browser tests and generated publishing files are separate; built artifacts are hosted on `gh-pages` and source changes are reviewed through pull requests.
