# Lantern Court verification

Base: merged PR #4, `e97d149f50ff4d06c89e1e624ac51af823d5a242`. Checks performed on the connected Mac with Node 24.

- Original repository suite: 369 tests, 368 pass, 0 fail, 1 existing optional native BSP2 integration skip. Command: `node --test --test-concurrency=2 'tests/*.test.ts'`. Compiler source, workbench source and original tests are unchanged.
- Existing website Node suite: 9 passes, including all 175 combinations (25 curve values and seven elevations from 3–6 m), with zero validation diagnostics on valid states.
- New courtyard suite: 2 passes. The generated default equals the checked-in SVGX. Named rooms and skybridge are reachable; roof, railing and shelf geometry survives compilation; all authored texture references resolve to bundled original images.
- Browser suites: 21 passing scenarios on the local production build. Coverage includes desktop/mobile layouts, real structural edits, navigation failure/repair, stale export prevention, keyboard/touch walking, presentation, reduced motion, worker failure, WebGL fallback and Chrome offline use.
- Downloaded GLB and glTF: Khronos validation reports zero errors and zero warnings. Six material images are embedded in GLB and included in glTF. The editable-source ZIP contains the referenced original image paths.
- Type checking, website build, existing workbench build and whitespace checks pass. Bundle-size and ineffective dynamic-import warnings remain; no limit was raised to hide them.
- Desktop, upper-gallery, and mobile renders were visually inspected. These are actual compiled-mesh renders, not concept art.

## WebKit scope

Playwright WebKit 26.6 rendered the textured scene at 390 px, completed an elevation edit and downloaded the GLB. Its automated offline reload returned `WebKit encountered an internal error`. Offline reload is verified in Chrome, not claimed as verified in WebKit or on a physical iPhone. The failed WebKit attempt is not classified as a proven product or browser defect.

## Limits

Walking remains a navigation-constrained inspection tool, not full game physics. The intentionally blocked scene retains the existing wall/floor warning, and exports remain disabled when navigation fails. Native FBX/BSP2 tools were not exercised for this change. Viewer ambient occlusion, sky and lighting are not baked into the portable model exports.
