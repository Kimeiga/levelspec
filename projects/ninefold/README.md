# Ninefold / 九重城

A new Kowloon-inspired **5v5 two-site defuse blockout**: tightly packed residential towers, winding alleys, laundry landings, a screened gallery and a waterworks terrace. Native editable AML; no external assets required.

![Ninefold compiled blockout](reviews/evidence/capture-r05/overview.png)

[Open the live reviewer](http://127.0.0.1:48241/?nav-cell=0.125&camera=105+-80+100&target=31+41+5&projection=orthographic&view-height=94&appearance=illustrated). Use **Walk**, WASD/arrows, Space to jump, Ctrl/C to crouch, Esc to exit. The server must be running locally.

- **A — Noodle Works, z0:** street-level factory, press dividing the site, winding Market/Drain approach, Mid short and rear access. The gallery window offers a bounded elevated view.
- **B — Waterworks, z6.4:** terrace among taller towers, a tank dividing local fights, south entry through two Laundry climbs and west entry through Service and a wrapping upper passage.
- **Mid / gallery, z3.2:** control opens A short or a climb toward B; the gallery is a committed observation perch with one access through SM.
- Five stair flights, ten team spawn markers, twelve cover fixtures plus Service infill, three playable elevations, and 18–26 m scenic residential masses. Typical alleys/stairs are 3.4 m wide; working pockets widen for support and turning.

[Layout](layout.svg), [brief](brief.md), [obstacle inventory](inventory.md), and [design / playtest priorities](design.md) explain the intended gameplay. Independent layout and blockout assessments are in [reviews](reviews/validation.md). L01–L04 plan images preserve the repair sequence.

## Source and exports

[Edit level.aml](level.aml). [GLB](../../generated/ninefold/build-r05/ninefold.glb), [OBJ](../../generated/ninefold/build-r05/ninefold.obj), [runtime JSON](../../generated/ninefold/build-r05/ninefold.runtime.json), [vector plan](../../generated/ninefold/build-r05/ninefold.svg) and reports are under `generated/ninefold/build-r05/`. Outputs use material colors and ordinary material UVs; no lightmap UV atlas was requested.

```sh
npm run --silent levelspec -- preview projects/ninefold/level.aml --port 48241 --nav-cell 0.125
npm run --silent levelspec -- validate projects/ninefold/level.aml --nav-cell 0.125 --strict-floor-gaps --json
npm run --silent levelspec -- build projects/ninefold/level.aml --out generated/ninefold/new-build --nav-cell 0.125 --strict-floor-gaps --no-uv --json
node projects/ninefold/verify.mjs generated/ninefold/new-walk
node tools/capture-level.mjs projects/ninefold/level.aml generated/ninefold/new-capture projects/ninefold/views.json
node tools/vector-visibility.ts projects/ninefold/level.aml projects/ninefold/audits/visibility.json generated/ninefold/new-visibility
```

## Validation and gameplay limits

R05 strict validation: **zero diagnostics, zero uncovered required floor samples**. All 21 authored routes pass; 42 forward/reverse routes replay through the unchanged standing inspection body .25 source-matched camera views compile/render without browser errors. The visibility audit covers1,625 supported samples and1,667,440 queries, with no configured spawn-area or upper-to-spawn visible pair. Sampling does not prove continuous collision or visibility.

This is a playable geometry prototype in the harness. Counter-Strike bomb logic, weapons, utility, economy, audio and multiplayer integration are not implemented here. No human multiplayer playtest or competitive balance is claimed. B's center-spawn travel margin and the time spent rotating for a late B retake are explicit engine playtest priorities; low cover and tank geometry do not guarantee bullet protection or deny every stationary hold.
