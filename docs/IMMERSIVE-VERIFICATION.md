# Immersive introduction: verification

Based on main `da4454ac62ea6cb495f2fa5ddc9d0325fe2176f3`, after website PR #3 merged. Compiler source, original repository tests, tools and workbench source are unchanged. Reference-authoring PR #2 is not included.

## Checks performed

- TypeScript: `npm run check` passes.
- Full repository suite: `node --test --test-concurrency=2 'tests/*.test.ts'` passes 368 of 369 tests, with zero failures and the existing optional native BSP2 test skipped. All 43 suites ran. Limiting process concurrency changes scheduling, not test coverage or assertions. The website workflow uses this same command.
- Website Node suite: all 9 tests pass. These include all 175 combinations of 25 curve values and seven elevations, with successful runtime validation and zero diagnostics. Other tests cover blocked/repaired routes, state serialization, material presets, and walking against walls, the well and stairs at several elevations.
- Production website build and existing workbench build pass. Existing bundle-size warnings remain.
- Both browser suites pass: 12 existing regression scenarios plus 9 immersive scenarios. They check real source edits, stale results, actual downloads, presentation keys, offline reload/edit/export, unavailable WebGL, failed-worker recovery, route failure and repair, walking controls, and reduced-motion tour behavior.
- Actual downloaded GLB and glTF pass Khronos validation with zero errors and zero warnings.
- Axe WCAG 2 A/AA and 2.1 AA audits report no violations in the tested desktop, validation, export and mobile states.
- Tested narrow layouts: 375, 390 and 768 pixels. Additional 375/390 checks establish that the terrace slider and affected visual are simultaneously visible. These are browser-emulated viewports, not a claim of physical iPhone testing.
- Cold page requests use only the local site origin. Offline tests reload the site, change elevation, break/repair navigation, walk and download without network access after precaching.
- No uncaught browser errors were recorded in the normal tested scenarios.
- `git diff --check` passes.

Local runs used Node 24.15.0 and installed Chrome on the connected Mac. Logs and screenshots live in ignored `website-qa/`. Browser scripts can also target the public site through `BASE_URL`.

## Scope of the result

The walkthrough is constrained to the computed, radius-eroded navigation surface. It is not a complete character physics implementation. The optional tour changes between named viewpoints rather than claiming to simulate a collision-checked cinematic path. The preview lighting and annotation are view effects; model exports require destination-engine gameplay and lighting configuration.

The deliberately blocked scene reports real errors and disables model exports. It also exposes a wall/floor contact warning at the sealed ramp entrance. Repair restores the valid source, rather than hiding or downgrading the diagnostics. Passing the bounded fixture matrix is not a guarantee about arbitrary authored levels.
