# Interactive introduction

`website/` is an introduction to the existing LevelSpec 2 preview, not a replacement for the workbench or a new compiler. It has four chapters: describe, reshape, validate, and export. Advancing from the starting description to reshape changes the courtyard curve from 3 to 6. Visitors can then drag the slider, compare both views, inspect actual navigation, and download the compiled result.

## Run and verify

Use Node 24, the runtime used for the existing compiler commands.

```sh
npm ci
npm run dev:site
npm run check
npm test
npm run test:site
SITE_BASE=/levelspec/ npm run build:site
SITE_BASE=/levelspec/ npm run preview:site -- --port 48217 --strictPort
# In another terminal. Install the test browser once when needed:
npx playwright install chromium
npm run test:site:browser
```

The build is `dist-site/`. Set `SITE_BASE=/` for a standalone domain, or the repository path for a subdirectory deployment. The browser suite accepts `BASE_URL`, `BROWSER_PATH` and `QA_OUTPUT`. On macOS it uses installed Chrome when present; elsewhere it uses Playwright's Chromium. It checks desktop/mobile layout, real compiled changes, rapid-input races, navigation, actual downloaded GLB/glTF, presentation keys, offline reload, failed-worker recovery and WebGL fallback. Axe checks the introduction, validation, exports and mobile view. Every slider stop is also compiled and runtime-validated in the Node tests.

## Presentation and sharing

Present hides the surrounding introduction. Left/right or 1–4 change chapters; Escape exits. The controls still work with pointer or touch. Reset restores the original source and camera. Copy link records bounded curve and chapter values, with a selectable-link fallback when clipboard access is unavailable. Shared links do not force presentation mode.

The service worker precaches the production build. Wait for **Ready offline on this device** before leaving connectivity. This covers the introduction, compiler and browser exports, not external GitHub documentation. First use still needs the website to load. A fresh build is available after the service worker updates and the page reloads.

## Implementation and limits

- `demo.level.svgx` is the existing showcase with presentation materials and a shorter title. The only interactive geometry edit is `courtyard.e0`'s curve control attribute. The slider is clamped to 0–6 in 0.25 increments.
- Compilation and unchanged runtime validation run in a module worker. Input immediately invalidates exports, increments the revision and cancels any older worker. Only the current validated source may be exported. Timeouts and network failures provide Retry rather than reporting success.
- One Three.js renderer owns the 3D view. Geometry buffers are replaced only after compilation; disposed buffers/materials are released. Orthographic framing, explicit camera controls, a simultaneous 2D plan, text summaries, reduced-motion styles and a WebGL fallback support different viewing conditions. Rendering pauses offscreen and when the document is hidden; there is no automatic orbit.
- GLB and glTF use LevelSpec's exporters. The glTF ZIP also contains source and metadata. No FBX/BSP native service is exposed by the static site. Those formats retain their documented local-tool requirements.
- The page contains no account flow, analytics, remote fonts, runtime CDN, model API or backend. Query parameters are numeric demo inputs, not arbitrary SVG or code. Preview colors are authored in the demo fixture; the orange curve line is a UI annotation.
- This is a LevelSpec 2 preview. Exported models are not finished gameplay scenes; the demo makes no automatic photograph-to-3D claim and does not incorporate draft reference-authoring work.

## Publishing

The initial public introduction is published from built files on the repository's `gh-pages` branch. Its `.nojekyll` file is emitted by the build. Source changes are reviewed separately from generated hosting files, so publishing this introduction does not require merging other compiler work. `.github/workflows/website.yml` checks the source without changing any existing validation requirement.
