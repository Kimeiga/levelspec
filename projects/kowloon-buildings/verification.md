# Building verification

Focused geometry checks cover convex/slanted footprints, canonical/reversed loops, rotation and mirroring, polygon roofs, exclusion of missing corners, unsupported inputs, neighbor contact versus a small gap, unchanged collision, and localized runoff. The seven polygon contracts passed during implementation (`generated/building-study/final-tests.log` plus the corrected independent runoff run `runoff-tests.log`).

The current window checks passed across `last-window-tests.log`, `emission-tests.log` and `guard-tests.log`: actual visible dark backs 0.417 m inside the facade, deep oblique side returns and correct winding; identical day/night geometry and collision; different appearance hashes; source validation; linear glTF emission at zero, half, default and HDR strengths; GLB validation; rejection of unsupported native formats; transparent sash export; and fixed sash geometry where a guard is planned across detail levels. The existing flush-wall-window contract also passed. `npm run check` passed. The full repository suite was not completed.

Visual acceptance uses frozen source copies and loaded AML/companion hashes. Final captures verify actual camera position and target against each requested view; browser error arrays are empty. Earlier failed captures and the earlier stale roof-camera attempt are retained as diagnostics and are not acceptance evidence.

- `generated/building-study/final-day`: dark recessed windows.
- `generated/building-study/final-night`: matched selective warm emission with restrained bloom.
- `generated/building-study/final-open-02`: an unobstructed transparent open casement.
- `generated/building-study/final-textured-02`: facade and actual elevated roof views before the user's material correction.
- `generated/building-study/calm-render-01`: matched material correction after removing the overly patterned concrete facade finish.

Independent implementation and test reviews accepted the code and contracts. Architectural review accepted the final day/night, transparent open sash, polygon roof, and calmer material captures. It is limited to visible construction and enclosure, not gameplay, navigation, or photographic fidelity.

## Procedural material experiments

`generated/building-study/texture-patina-07` is the latest matched material
experiment: neutral gray concrete with finer irregular color-region boundaries,
subtle color variation, straighter stepped repairs, normal-only trowel relief,
shorter runoff, and painted-door wear. Its five actual browser captures include
overview, facade, entry, runoff and repair close-ups. `capture.json` records loaded
AML/companion identities and verified cameras with no browser errors;
`implementation-hashes.json` records the frozen dressing implementation.

At the user's request, testing expansion stopped during this visual iteration.
The latest lightweight `npm run check` passed (`weathering-experiment-check.log`).
Earlier focused raster, shared-receiver and real-door checks are retained. The
last combined reviewer run had 27/28 pass: absent and empty coating arrays caused
a shared-group signature mismatch. That source correction was independently
spot-checked, but the suite was intentionally not rerun after the request to
reduce testing. Base-height/coating integration and off-center rejection were
manually reproduced by the implementation reviewer; dedicated additional tests
were deferred. Independent source review found no remaining core blockers.

The current visual controls remain an opt-in on `finish-study.aml`. The larger
architectural study and full shared demo are not evidence of raster rollout.
Appearance density resamples source detail and consumes bounded unique images;
this experiment does not establish full-scene texture-memory acceptance.
