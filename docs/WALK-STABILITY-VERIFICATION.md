# Three-world and walkthrough verification

Base: merged PR #5, `9b89ef1f2467389bca290b3baec66003b05f328e`. Executed on the connected Mac with Node 24.

## Findings and changes

The original walkthrough passed its existing browser tests but its entry was only in the opening chapter. Recompilation explicitly exited walking, and uppercase movement keys were not recognized. The new persistent Walk in 3D control, normalized input, mouse-capture/drag fallback and validated walk-state restoration address these behaviors.

The new triangle audit found 18 same-facing coplanar object-pair conflicts in the previous default scene. The largest involved roof cornices against roof slabs; column shafts also overlapped their capitals' top faces. The corrected trim and detail geometry is checked independently of the original wall/floor auditor. No compiler gate was disabled.

## Results

- Original repository suite: 369 tests, **368 pass, 0 fail, 1 existing optional native BSP2 skip**, using the unchanged bounded-concurrency command. Original compiler, workbench and test sources are untouched.
- Website Node suite: **15 pass, 0 fail**. Includes all **525** style/curve/elevation combinations (three styles, 25 curve values, seven elevations) with successful runtime validation and zero diagnostics on valid states.
- Independent face-overlap audit: zero positive-area, same-facing cross-object coplanar conflicts across **63 sampled style/elevation/curve states**. A synthetic overlap test verifies the audit detects overlap without flagging opposite faces.
- Browser suites: **28 scenarios pass on the local production build**, including entry from every chapter, first-person movement, valid-edit preservation, invalid-route interruption, mouse-capture denial, mobile viewport sizing and on-screen movement, and context-loss recovery.
- Native mouse capture was also observed successfully in Chrome. Drag-look remains available when capture is denied or unsupported.
- Every style's downloaded GLB passes Khronos validation with zero errors and warnings. Tests verify style-specific geometry, distinct material definitions and six embedded images per model. Existing glTF and source-ZIP checks pass.
- The deterministic camera-return test reports zero changed pixels above the comparison threshold in all three styles. It is a regression check for repeatable rendering, not proof against every possible aliasing artifact during motion.
- Type checking, production website build, existing workbench build and whitespace checks pass. Existing bundle-size/dynamic-import warnings remain.
- Actual first-person mobile and three-style rendered screenshots were visually reviewed. No generated concept images substitute for compiled output.

## Limits

Navigation-constrained walking is not full physical collision simulation. The deliberately blocked-route state retains its documented contact warning and disables model export. Native FBX/BSP2 backends were not rerun. Lighting and environment reflections in the preview are not represented as baked lighting in model exports. Physical-device coverage is not implied by browser emulation.

## Additional WebKit check

Playwright WebKit at a 390 × 844 mobile viewport rendered all three treatments, entered first-person mode from the export chapter, moved with the on-screen forward control, and exited with the visible control. All three cases passed with no uncaught page errors. This is browser-engine emulation, not a physical-iPhone test. The older WebKit offline-reload limitation was not reclassified or claimed fixed here.
