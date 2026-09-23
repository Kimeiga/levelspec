# Shader and bake verification

Base: merged PR #6 at `b25762cb29475306053d2f110f95ef68f036a5ac`.

The prior website did not load lightmaps, and the native baker rejected textured materials. The new backend packages verified texture bytes and uses them with the original material UVs in Blender.

All three actual textured preset bakes completed with Blender 4.5.9 LTS, CPU/four threads, 32 samples and seed 17. Each has three 1024-square pages and two guarded mip levels. Elapsed time including calibration: Lantern Court 116.5 seconds, Chalk Cloister 105.7 seconds, Slate Atelier 98.1 seconds.

The existing calibration passed unit sky, unit sun, isolated indirect light, colored bounce and linear FLOAT RGBA EXR round trips. All pages have nonzero coverage and finite irradiance. These are 32-sample preview bakes, not a claim of noise-free final rendering.

Packaged revisions carry source, geometry, triangle-corner, UV, material image and EXR checksums. Native raw scenes and logs remain in the ignored verification directory; only runtime lightmaps, bindings and calibration receipts are bundled.

## Automated checks

Original repository tests: 368 pass, zero failures, one existing optional native BSP2 skip (369 tests, 43 suites). Website Node tests: 19 pass, including the existing 525 style/curve/elevation combinations and four new bake-binding regressions.

Production browser coverage: 34 scenarios. The six new cases verify all three bakes load, lightmaps visibly change the image, edits invalidate old lighting, paused motion and Basic mode work, cached bakes reload offline, and corrupted images fall back to live lighting. Shader and WebGL draw errors are collected.

Playwright WebKit at 390 by 844 pixels loaded and displayed all three preset bakes and completed on-screen walkthrough movement and exit without shader or uncaught page errors. This is engine emulation, not a physical iPhone benchmark.

Type checking, the production website build, the existing workbench build and whitespace checks pass. Original model-export validation, accessibility and first-person behavior remain covered. Existing bundle warnings remain.

## Boundaries

The three exact presets have bakes; arbitrary edits use live lighting. Seven tiny unassigned CSG faces in Chalk Cloister retain live shading, and the interface reports the count. Missing atlas coverage on ordinary-sized static faces is rejected. WebKit offline reload is not established by this run. Model exports do not claim to include the custom viewer shaders or baked preview. Native FBX/BSP2 exporters were not rerun.
