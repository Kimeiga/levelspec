# Interactive introduction

The website introduces LevelSpec with a real, editable architectural space. It is separate from the full workbench and uses the existing compiler and runtime validator without modifying them.

## The experience

**Enter:** the first view is at human scale inside a clay-colored pavilion. Courtyard, Terrace and Overview provide explicit camera positions. Enter the level enables WASD or on-screen movement and drag-to-look. Escape leaves walking. The optional tour switches between three viewpoints and can be stopped; reduced-motion preferences select a static view instead.

**Reshape:** the first advance deepens the courtyard curve. Visitors can also raise the terrace from 2 to 5 metres in half-metre steps. Shared upper vertices and the objective marker change together. The compiler regenerates the floor, ramp, walls and stair treads. This is not a mesh animation.

**Validate:** Block terrace access closes both approaches in the source. The actual validator reports a disconnected terrace and unmet route requirement. Green and red navigation regions distinguish the spawn-connected component from disconnected components. Restore both approaches recompiles the repair. All diagnostics remain available, including the blocked-ramp wall/floor warning. Failed validation disables model exports.

**Export:** download the current GLB, glTF package with metadata and source, or editable SVGX. Native FBX and BSP2 remain CLI workflows with their documented dependencies. The files are models and metadata, not finished gameplay scenes.

Three optional presets vary the same pavilion's elevation, curve and authored materials. They are parameter sets, not three unrelated maps. URLs retain the curve, elevation, material set, blocked state and chapter.

## Run and verify

Use Node 24, as with the compiler commands.

```sh
npm ci
npm run dev:site
npm run check
npm test
npm run test:site
SITE_BASE=/levelspec/ npm run build:site
SITE_BASE=/levelspec/ npm run preview:site -- --port 48217 --strictPort
```

In a second terminal, run `npx playwright install chromium` once, then `npm run test:site:browser`. The browser suite accepts `BASE_URL`, `BROWSER_PATH` and `QA_OUTPUT`; macOS uses installed Chrome when available. Both the original regression suite and the immersive interaction suite run. The Node suite covers every one of the 175 curve/elevation combinations, route failure and repair, and constrained walking.

The static output is `dist-site/`. `SITE_BASE=/` supports a root-domain deployment; `/levelspec/` supports GitHub Pages. Publishing generated files does not merge source changes. The existing website workflow checks PRs and main without relaxing compiler gates.

## Presentation, mobile and offline

Present removes the surrounding website. Left/right or 1–4 change chapters. Escape exits walking first and presentation second. Reset returns to the original source and camera. Copy link excludes forced presentation mode.

On narrow screens the current visual remains sticky above its controls. 3D space and Floor plan share one viewport instead of being stacked before the controls. Walking provides large on-screen movement buttons. Keyboard, touch, visible focus and reduced-motion alternatives remain available.

The service worker precaches the production site, compiler and browser exporters. Wait for **Ready offline on this device** before disconnecting. External documentation is not cached, and first use still requires connectivity. Previously installed copies need a page reload after their service worker has updated.

## Rendering and movement contract

One perspective Three.js renderer owns the 3D scene. Geometry comes from the current compiled mesh, in canonical Z-up coordinates. The environment plane, shadows and highlighted edge are presentation elements, not additional exported level parts. Camera framing fits compiled bounds at the current aspect ratio. There are no remote assets, fonts, analytics, model APIs or accounts.

The walk controller is a constrained inspection tool, not a general physics engine. It moves on the compiler's Recast navigation triangles, which already incorporate the configured player's clearance. Starting at the spawn, it follows the connected triangle component and subdivides motion into steps no longer than 4 cm. It stops or slides at navigation boundaries. It does not implement gravity, jumping, vaulting, dynamic obstacles or off-mesh links. Regression tests cover the pavilion's walls, well, stairs and terrace at multiple heights.

Editing invalidates exports immediately, cancels older workers, exits walking and discards stale results. Both views and exports update only for the current source. Rendered navigation uses the computed component, not a hardcoded success state. WebGL failure leaves an accessible plan, compilation and exports. Rendering pauses when the view or tab is hidden; pointer cancellation, lost focus and key release clear movement input. Resources are disposed when replaced or unloaded.

This remains the LevelSpec 2 preview. It does not incorporate the draft reference-authoring PR and makes no automatic photo-to-level claim.
