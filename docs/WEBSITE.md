# Layout reviewer

Both browser entry points use the shared `review/` implementation. The local
viewer starts with Dust II; the static deployment starts with the curated Lantern
Court snapshot. Both offer **Open AML** for any `.aml` (or identical `.xml`) on your
computer and **Companion assets** for referenced GLBs and PNG/JPEG/WebP images.
Selected files are read and compiled in your browser, without a server upload.
Opening another AML clears the previous file's supplied companions. Reopen the
file after editing it; page reload restores the bundled default.
Both are read-only, full-window review tools.
XML authoring, repairs and exports belong in external editors and CLI workflows.

## Run and verify

Use Node 24 and `npm ci`. `npm run dev` opens the local viewer with Dust II;
`npm run dev:site` opens the curated reviewer with Lantern Court. Build with `npm run build:viewer`
and `SITE_BASE=/levelspec/ npm run build:site` (use `/` for root hosting).

Production acceptance needs both servers, with the same site base used at build:

```sh
SITE_BASE=/levelspec/ npm run preview:site -- --port 48217 --strictPort
node node_modules/vite/bin/vite.js preview --port 48218 --strictPort
npm run test:site:browser
```

The last command belongs in a third terminal. The suite accepts `BASE_URL`,
`VIEWER_URL`, `QA_OUTPUT`, and `BROWSER_PATH`. It uses installed Chrome on macOS
or Playwright Chromium elsewhere. See `.github/workflows/website.yml` and
[the test disposition](reviews/reviewer-test-disposition.md).

## Controls and guarantees

- Switch between full-size 2D and 3D viewports. Camera, plan pan/zoom, selected
  element and floor persist across switching. Fit restores framing; 3D offers
  top/front/side/three-quarter presets and ninety-degree turns.
- Review floors, roofs, section height, dimensions, navigation and spatial issues.
  Dimensions report axis-aligned bounds in meters, not arbitrary point-to-point
  measurements. Navigation and issues are optional read-only overlays.
- Walk uses an authored land spawn or explicit inspection coordinates and compiler-derived land navigation. WASD,
  arrows or touch buttons move; drag looks; Escape returns to the unchanged
  overview. It is constrained inspection, not full gameplay physics.
- Appearance is a presentation layer. Materials shows authored colors and UV
  textures under basic lighting; Full render also uses roughness and metalness. Missing image
  companions are reported; the local viewer never fetches arbitrary source paths.
  Reference images require explicitly supplied companion assets and show their
  declared scale note; camera matching is outside this reviewer version.
- Source loading uses revision-checked workers. Cancellation terminates the worker;
  retry can recover. Failed loads retain visibly stale geometry and disable walking.
  Malformed sources and validation errors never become successful validation claims.
- Plans and validation remain available when WebGL is absent or lost. Restoring a
  lost graphics context enables 3D again. The renderer skips idle/hidden frames and
  owns/disposes its geometry, texture, shadow and input resources.

The production service worker precaches the application, compiler, font and bundled
textures. Wait for **Ready offline on this device**. External GitHub links still need
connectivity. Font and imagery are local, with no runtime CDN requirement.

## Visual provenance

The compact layout uses SuperRec's pale surfaces and Snap Engine's typography.
The Full render look adapts the [Ninefold walkthrough](../projects/ninefold-reboot/play/main.ts):
late-afternoon warm sun, three cool shadowed sky fills, hemisphere light, procedural
sky/reflections, distance haze, GTAO contact occlusion, subtle bloom, and ACES filmic
output at exposure 1.15. The renderer converts its lighting directions to domain
Z-up. Everything is computed on the GPU; no lightmap or lighting bake is required.
Meshes retain their authored textures, colors, roughness, metalness, and vertex
weathering. The walkthrough's extra material normal maps and custom lamp/weather
shaders remain specific to that project's assets.

The bundled `review/assets/SuperPixelBitmap-Regular.woff2` comes from
`font-maker/fonts/super-pixel-bitmap/build/fonts/` at font-maker revision
`a5aee66567ebd46538cebb2b78f1c8f3898f2347`. Its square-pixel outlines differ from
SuperRec's Fluid variant. Design references were inspected at SuperRec revision
`417257a539a0ed264aeb6e619e926dc094c3832e` and Snap Engine revision
`e6a41678b151cb0773cc243c62474393f199d85e`. Existing authored textures retain
repository provenance; preview lighting does not alter source or mesh exports.

## Repeatable architectural views

The shared reviewer offers **Orthographic** and **Perspective** projections.
Expand **Camera / Z-up meters** to enter a position and target in domain XYZ
coordinates, a vertical field of view, an orthographic view height and roll. Apply
validates the complete pose before changing the view. Switching projection keeps
position, target and actual orientation; Fit frames the model using the active
projection and preserves effective roll. Top/front/side presets reset roll to zero. Walking
uses its own perspective camera and returns to the unchanged overview.

**Open this view** encodes the actual camera pose, framing and appearance in a URL. This is
useful for matching a photograph, comparing revisions or asking another agent to
inspect the same junction. Use the same source for an image comparison; exact links lock the measured image
aspect even when the originating review follows its viewport. The URL does not contain source files and does not reproduce selection,
section height or floor filters. A CLI preview URL works while its
server is running; the ordinary local viewer still needs its source opened.

Start a live review at a known view directly:

```sh
npm run --silent levelspec -- preview projects/my-level/level.aml \
  --camera "11 -17 8" --target "2 3 1" --projection perspective --fov 47 --roll 21.49 \
  --appearance materials --frame-aspect 0.75
```

Camera and target must be supplied together and differ. Values are finite Z-up
meters; FOV is greater than zero and below 150 degrees. `--view-height 14` sets
orthographic vertical framing in meters, independent of camera distance. Omitted
pose uses automatic fit; omitted projection uses orthographic.

Appearance has three choices, available through the selector, `appearance` URL
parameter, and `--appearance` CLI flag:

- **Wireframe** (`wireframe`): mesh edges with unfilled triangle interiors.
- **Materials** (`materials`): authored materials under a simple neutral hemisphere
  light, with no shadows, ambient occlusion, haze, bloom, or outlines.
- **Full render** (`full-render`, default): the real-time Ninefold lighting and
  effects described above, with no illustrated ink or dithering.

Appearance is independent of theme. Switching either preserves camera/framing;
view links and reloads retain the selected mode. Invalid initial URL options show
a diagnostic and fall back to the default as a group. Exported geometry and
materials remain unchanged.

Full render fits each shadow frustum to the visible model. Shadow bias follows
world-space texel size, and section cuts refresh shadows and AO. AO runs at half
resolution and excludes transparent objects. Its perspective/orthographic
projection follows the active overview or walking camera. Rendering stays idle
when the view is unchanged and walking is inactive.

Run `node tests/appearance-browser.mjs` for pixel-level mode checks and
`node tests/shadows-browser.mjs` for lit-surface and shadow-contact checks at
different level sizes.

The **Image frame** controls center the largest image of the chosen width/height
ratio inside both workspace axes. Omission or **Viewport** follows the available
viewport. Presets, a custom numeric ratio and **Use selected reference ratio** all
set the same numeric preference. The reference action copies declared width/height;
changing or clearing the reference afterward does not change the lock. It never
uses the thumbnail rectangle or infers camera registration.

`--frame-aspect 0.75` and `frame-aspect=0.75` lock a portrait image. Supported live
ratios run from 0.1 through 10, limiting thin frames and rejecting numerical
extremes without silently clamping. Browsers quantize fractional CSS dimensions.
If that moves a supported lock beyond an endpoint, the frame's long dimension is
rounded inward to a whole CSS pixel and the box is recentered. This can leave a
small pixel margin; replay preserves composition within that layout quantization.
Reported/link aspect remains the actual fractional box used by projection, rather
than the requested preference or rounded canvas client/backing dimensions. Camera pose, vertical FOV, roll and selection
survive resizing; Fit uses the actual image frame. The 2D plan stays full viewport,
and walking shares the chosen 3D frame. **Viewport** removes the preference from
the current URL. **Open this view** instead encodes the newly measured actual ratio,
so reopening an exact link locks its composition in a differently sized window.
A responsive frame outside the supported lock range remains usable but its exact
replay link is unavailable. Invalid form values retain the last useful frame and
show a diagnostic; invalid initial options follow the atomic fallback above.

Roll is finite degrees, default zero, with positive right-hand rotation about
the camera-to-target direction. For a camera looking along +Y, +90° makes image-up
point along +X. Negative CLI values use `--roll=-21.49`. Domain geometry and walking
stay Z-up. The view URL records actual effective roll after orbiting, normalized
to the signed half-turn range; it preserves orientation rather than whole-turn counts.

Dimensions now appear inside the viewport as well as the selection panel.
They are axis-aligned XYZ bounds of the selected geometry, chosen floor or layout,
excluding invisible collision proxies and hidden roofs. Section clipping does not
change these full geometry bounds. They are not room clear widths, surveyed
measurements or building-code assertions. The Dimensions checkbox hides both labels.
For browser automation, `#viewport-dimensions` exposes `data-min`, `data-max`,
`data-extent` and `data-scope`; `#model` exposes the current `data-view` JSON,
`data-projection` and `data-projection-matrix`. The composed `data-view` reports
actual `frameAspect` separately from the optional `frameAspectLock` preference. `data-view-matrix` is the actual
rendered camera's column-major world-to-camera matrix, including roll; during
walking it describes the separate walk camera while `data-view` retains the
overview pose. `data-projection-matrix` also describes the actual rendered camera.
These do not change authored XML, collision or navigation.

**Walk from coordinates** starts an inspection body at feet XYZ in right-handed
Z-up meters. Yaw0 faces+X, yaw90 faces+Y; positive pitch looks up, bounded to±80°.
Feet must be within0.10m of an existing land-navigation surface and resolve to its
actual elevation, shown with the actual body dimensions. The placement checks the
standing capsule against compiled collision geometry; visual-only scenery does not
block it, while hidden solid geometry does. Unsupported height, gaps and blocked
body placements produce feedback without changing the previous mode or pose.
Stale/unready geometry cannot start a walk. No authored marker or nav seed changes.

A reproducible link uses `?walk-feet=3,2,0&walk-yaw=90&walk-pitch=-15` and starts
only after the current layout/navigation is ready. Invalid links stay in overview;
they do not fall back to an authored spawn. **Open this walking pose** encodes the
actual resolved feet and current orientation. `#model.dataset.walk` publishes JSON
with `active`, `feet`, `yaw`, `pitch`, body `height`/`radius` and `collision:"navigation"`.
The returned reviewer API also exposes `startWalk(pose)` and `getWalk()`.
The visible view caption identifies first-person perspective while walking. Leaving
walk restores the saved overview projection caption; the camera form retains that
overview pose throughout.

**Walking grid** changes the horizontal navigation cell size and rebuilds the
current source. The default is 0.0625 m; the control accepts 0.025–0.5 m. Smaller
cells can retain narrow physically clear passages that the coarse grid excludes.
Player dimensions and physical geometry remain unchanged. Walking is disabled
while the previous result is stale, and the control reports the actual applied
grid and body size. Invalid edits leave the applied result unchanged.

The setting survives source refreshes, retry, and shared view/walk links through
`nav-cell=0.0625`. CLI preview uses `--nav-cell 0.0625`. A malformed URL reports an
error until corrected. Finer grids can cost more memory and time; existing build
failures remain visible. Record the setting alongside a walkthrough and use it for
the matching CLI validation and reconstruction run.

Movement retains the existing eroded Recast constraints, including component and
edge boundaries. This is not free flight, a new physics engine, a continuous swept
capsule proof, or validation of connections that are absent from navigation.
Starting inspection on another existing component does not make it reachable from
an authored spawn. Run `npm run test:walk:browser` for the real-browser contract.

The compact [Suggestions panel](SUGGESTIONS.md) opens source-linked geometry findings
in either view, with highlights, cutaway, copyable review links and XML suppression
annotations. It remains separate from validation and never edits the XML.

Spatial Validation errors provide Inspect and Copy review link, with exact overlap
patches highlighted in 2D/3D. Invalid but renderable geometry remains inspectable;
see [surface overlap errors](AML.md).

Dragging the 3D view orbits horizontally around the model at the screen center,
while preserving its current tilt. If the center has no visible surface, orbit
depth follows the model center.
Explicit camera poses, named views, and roll controls can still set tilted review views.
