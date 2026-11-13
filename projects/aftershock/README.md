# Aftershock · Broken Spiral

Original 5v5 CT-versus-T bomb-defusal **geometry blockout** of an earthquake-shattered subway interchange. The user selected Broken Spiral after rejecting the initial three-route/central-overpass proposal and reviewing an originality comparison against the repository's existing maps.

A occupies the outer upper Blue Line crescent (+5m). B is nested in the lower Red Line collision bowl (0m). The solid transfer drum separates views and cannot be occupied. T enters below the western station tail; CT deploys through the eastern upper emergency entrance. Four reversible stair flights, a turning landing at+2m, the long incomplete Red Loop, and the short Cable Seam interweave without a central crossbridge or secure defender rear bar. Derailed train bodies divide the two sites; fractured vault panels, rails, fallen girders and a crushed carriage communicate the fixed earthquake aftermath.

Start the read-only harness:

```sh
npm run --silent levelspec -- preview projects/aftershock/level.aml --nav-cell .125
```

The session preview is running at http://127.0.0.1:48391/. Use Walk or Walk from coordinates, WASD, Ctrl/C to crouch, Space to jump and Esc to exit. Required paths use ordinary standing movement. The reviewer is an inspection harness; bomb interaction, gunplay, train animation, damage, sound and multiplayer rounds require engine integration.

Editable source: `level.aml`, final model R06 / layout L03. Drawing: `layout.svg`; exact floor/landing/stair/cover coordinates: `layout-data.json`. `originality-probe.svg` and `reviews/originality-independent.md` preserve the alternatives/comparison. Early `layout-r01.svg`, S02 and L01/L02 snapshots are historical design evidence, not the delivered layout. The native AML works independently of the optional Python drawing/authoring helpers (which require Shapely).

## Verification and outputs

Playable validation and GLB/glTF/OBJ/runtime export succeed at navigation cell .125m, with zero uncovered floor samples. All 22 performed directed single-body walks pass, including all four flights both ways and the full A–B eastern rotation. Twelve actual browser poses verify standing/crouching at low-cover and ascent positions. Static optical sampling covers 547 admitted positions and 205,098 queries: no visible configured spawn-area pairs; one long upper-tail/Red Loop view remains a documented playtest consideration. This is traversal/geometry evidence, not multiplayer balance proof.

One compiler `FLOOR_EDGE_GAP` warning remains at S4's lower join. Independent measurements and walking inspect the actual ground/first-tread contact; the warning compares source boundary heights and is not an observed walking gap. See `reviews/validation.md` and the independent blockout reviews for the disposition and scope.

Generated artifacts are under `generated/aftershock/build-r06/` (GLB, glTF, OBJ, runtime JSON and reports). Engine-facing render/collision GLBs plus spawn/objective/player metadata are under `generated/aftershock/game-r06/`. Lightmap unwrapping was explicitly skipped for the generic build; optional FBX/BSP exporters were not run.

Reproduce:

```sh
npm run --silent levelspec -- validate projects/aftershock/level.aml --nav-cell .125 --json
npm run --silent levelspec -- build projects/aftershock/level.aml --out generated/aftershock/new-build --formats glb,gltf --no-uv --nav-cell .125 --json
node projects/aftershock/audits/walk.mjs generated/aftershock/new-walk
node tools/vector-visibility.ts projects/aftershock/level.aml projects/aftershock/audits/visibility.json generated/aftershock/new-visibility
```

Independent spatial, tactical and focused visibility findings are recorded in `reviews/04-blockout-*.md`; retained source-matched camera/stance/physical/optical evidence is in `reviews/evidence/`.
