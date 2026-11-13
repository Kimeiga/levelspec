# Apogee

An original Counter-Terrorists versus Terrorists **5v5 bomb-defusal blockout** in a snowy mountain observatory. A surrounds the summit telescope at +4 m; B occupies the lower cryogenic instrument laboratory. A cable-car station, instrument rooms, a rim ascent, and a skybridge above a service underpass give the two sites distinct approaches.

![Apogee mountain observatory blockout](reviews/evidence/r06/hero/overview-clean.png)

[Open the running local preview](http://127.0.0.1:48235/?nav-cell=0.125&camera=165+-145+150&target=50+52+-1&projection=orthographic&view-height=155&appearance=flat&frame-aspect=1.5). Switch 2D/3D or use Walk; WASD/arrows move, Space jumps, Ctrl/C crouches, Esc exits. The preview provides geometry inspection; plant/defuse logic, weapons and multiplayer matches require target-engine integration.

- [Editable AML source](level.aml), [current layout](layout.svg), [brief](brief.md), [obstacle/doorway inventory](inventory.md) and [design/playtest hypotheses](design.md).
- [Final verification record](reviews/validation.md), [spatial review](reviews/03-blockout-spatial.md), [tactical review](reviews/03-blockout-tactical.md) and [visibility review](reviews/03-blockout-visibility.md).
- [GLB export](../../generated/apogee/build-r06/apogee.glb), [OBJ export](../../generated/apogee/build-r06/apogee.obj), [runtime JSON](../../generated/apogee/build-r06/apogee.runtime.json) and [vector plan](../../generated/apogee/build-r06/apogee.svg).

The final revision passes strict playable validation, 26 bidirectional route replays, 74 doorway traversals and 4 actual crouch checks. The complete sampled visibility audit found no visible pairs in the tested opposing-spawn or Mid-to-T-spawn areas. These are geometry/harness results; competitive balance remains a multiplayer playtest question.

Reproduce from the repository root with new output directories:

```sh
npm run --silent levelspec -- preview projects/apogee/level.aml --port 48235 --nav-cell 0.125
npm run --silent levelspec -- validate projects/apogee/level.aml --nav-cell 0.125 --strict-floor-gaps --json
npm run --silent levelspec -- build projects/apogee/level.aml --out generated/apogee/new-build --nav-cell 0.125 --strict-floor-gaps --no-uv --json
node projects/apogee/verify.mjs generated/apogee/new-walk
node projects/apogee/audits/portals.mjs generated/apogee/new-portals
node tools/vector-visibility.ts projects/apogee/level.aml projects/apogee/audits/visibility.json generated/apogee/new-visibility
node tools/capture-level.mjs projects/apogee/level.aml generated/apogee/new-capture projects/apogee/views.json
```

Initial source sketch and seeded graph are retained in `sketch.svg` and `sketch-data.json`; current exact footprints and IDs are in `plan-data.json`. Generated exports remain disposable; final compiled review evidence is retained under `reviews/evidence/r06/`.
