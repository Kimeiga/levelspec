# Blackglass · Cliffside Array

An original **5v5 CT versus T, two-site bomb-defusal blockout**: a high-tech industrial villain lair cut into a steep mountain, with a suspended data vault, upper reactor hall, cyan machinery, cliff-mounted communications spire and deep foundation supports.

![Blackglass blockout](reviews/evidence/final/blackglass.png)

[Open the live harness](http://127.0.0.1:48247/?nav-cell=0.125&camera=-85+-90+86&target=34+48+4&projection=orthographic&view-height=112&appearance=inspection). The local preview server must be running. Select **Walk**, use WASD/arrows, Space to jump, Ctrl/C to crouch, and Esc to exit. **Show roofs** reveals the two opaque spawn roofs; the default open-roof view is a review cutaway.

- **A — Reactor, +12m:** a circular reactor separates main, short and command-side approaches. The mountain-facing observation window is physically closed with clear safety glazing.
- **B — Data Vault, 0m:** the cantilevered lower room has a central data core, cold-airlock/control approaches, Mid short and a separate rear stair.
- **Mid, +6m:** the atrium links Heat, Cleanroom and the suspended gallery. The gallery crosses above lower circulation and descends toward B; the service spine reaches CT operations.
- **CT Operations, +6m:** five CT placements in the rear service wing provide a descending B deployment and an upper A deployment. Five T placements start at the lower insertion dock.

The playable envelope is approximately70×96m, with24 named spaces,32 movement connections, seven reversible six-meter stair climbs and26 identified equipment/cover fixtures. The mountain continues above the inhabited levels; the lower vault hangs roughly36m above the scenic ravine bed. No required route depends on a jump, boost, drop or crouch-only passage.

Editable source: [level.aml](level.aml). [Layout](layout.svg), [brief](brief.md), [fixture inventory](inventory.md), [design hypotheses](design.md) and [independent reviews](reviews/validation.md) retain the design and verification evidence. L05 / modelR04 is the delivered revision.

```sh
npm run --silent levelspec -- preview projects/blackglass/level.aml --port 48247 --nav-cell 0.125
npm run --silent levelspec -- validate projects/blackglass/level.aml --nav-cell 0.125 --strict-floor-gaps --json
npm run --silent levelspec -- build projects/blackglass/level.aml --out generated/blackglass/new-build --nav-cell 0.125 --strict-floor-gaps --no-uv --json
node projects/blackglass/verify.mjs generated/blackglass/new-walk
node tools/capture-level.mjs projects/blackglass/level.aml generated/blackglass/new-capture projects/blackglass/views.json
node tools/vector-visibility.ts projects/blackglass/level.aml projects/blackglass/audits/visibility.json generated/blackglass/new-visibility
```

[GLB](../../generated/blackglass/build-r04/blackglass.glb), [OBJ](../../generated/blackglass/build-r04/blackglass.obj), [runtime JSON](../../generated/blackglass/build-r04/blackglass.runtime.json), exported vector plan and reports are in `generated/blackglass/build-r04/`. Exports use material colors without a lightmap UV atlas. Optional native Blender/Quake exports were not requested or run.

Final strict validation has zero diagnostics and zero uncovered required samples out of17,202. All39 authored route requirements pass;78 forward/reverse routes replay through the existing standing inspection walker. Thirty source-matched browser views render without errors. Actual browser inspection confirms four standing/crouching pairs and keyboard traversal of S1 in both directions. The unchanged sampled visibility audit completes379,558 queries over759 admitted positions; configured spawn-area and upper-to-T-spawn pairs have zero visibility after the S1 screen repair.

These are geometry and harness checks. Counter-Strike weapons, bomb rules, timers, utility, audio, economy, damage and multiplayer are not implemented by the harness. No competitive balance or human playtest is claimed. B defender setup across spawn extremes, the bounded low-eye V-to-F sightline, A's northeast hold, and late retake travel remain explicit target-engine playtest priorities. Navigation and visibility sampling do not prove continuous collision, exhaustive visibility or team throughput.
