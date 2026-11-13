# Spillway R04 — validation and delivery record

2026-11-08. Editable source SHA-256:
`f8289e0063da85f3466b8124f13a439c9190acb891a7f7e517cda6ac35d9e784`.

## Scope and sequence

User requested an original 5v5 defusal map of roughly Dust II scale, with actual vertical topology. Applied fps-map-workflow, fps-strategy-design, fps-combat-geometry, fps-map-review and level-authoring. R01 drawing was visually inspected before production modeling. Independent spatial and tactical layout reviews requested changes; R02 resolved the overlapping A-02 crate and unspecified upper guards, then both layout scopes accepted. R03/R04 compiled and inspected the actual blockout; later fixes retained obstacle IDs and route intent.

Construction fixes: explicitly resolve contributing materials at joined foundation/cover faces; declare real floor/flight/landing connections; fill the unwanted low ramp pocket using native solid geometry; remove buried ground from that ramp footprint so a spurious inside-solid navigation patch does not remain. Static validation, floor gaps and surface contacts were kept enabled. No player dimensions, route limits or unrelated repository code were weakened to pass.

## Performed checks

- Strict-floor-gap validation at navigation cell .125 m passed with zero diagnostics. 19,686 required surface samples: 19,537 covered,149 excluded by physical obstruction, zero uncovered. One connected network for the required walking surfaces. Sampling does not prove continuous gameplay movement.
- Build passed, producing GLB, OBJ, SVG, runtime JSON, export metadata and validation/suggestion reports. 105 architectural objects,6 authored floor regions,6,454 final triangles. Material UVs retained; lightmap atlas omitted via `--no-uv`.
- All13 authored routes replayed using the existing standing inspection walker:2 m height,.25 m radius,.25 m step,42° slope. Movement requested in .04 m XY increments; actual support/step/standing clearance constrained the result. Sixteen saved standing placements passed. The walker has no continuous capsule sweep, jumping or crouch simulation.
- Five additional routes probed without changing physical geometry. Probe markers/routes were added in memory only. Their source identity and paths are frozen in evidence. A rear connector to siteA:22.46 m. Site-to-site shortest route:64.60 m, through contested mid. A→A-rear→rear-center→B-rear→B via the declared rear checkpoints:72.66 m. All5 replayed. No measured player travel seconds claimed.
- Nineteen principal views,4 support/rear views and1 hero view captured from actual compiled AML. Capture manifests verify loaded source/companion identity across views and record camera/canvas state with no browser errors. Selected PNGs and all3 manifests retained in evidence. Low cameras are visibility studies; no player body or weapon is rendered.

## Nonblocking findings and limits

Build suggestions retain15 unassigned navigation islands on cover/wall tops. No authored step, jump or off-mesh link connects them for the declared body. They are not advertised playable routes; test actual jumping/boosts and wall-top access in a target engine.

The remaining FLIGHT_WALL_GAP suggestion concerns R-01/right guard and the adjacent ground boundary. Independent spatial inspection examined the actual joined collision surfaces. This is the intentional inward guard offset, not an accessible25 cm passage. The warning is retained, not suppressed; see spatial report for ray/contact evidence.

Filled S-02 blocks direct ground access across its side. Retained intentionally; authored notes describe the A rear stair-side connector and its measured detour. It does not count as immediate crossfire into the plant area. Historical layout predictions are corrected by the blockout records.

No bomb logic, round clock, multiplayer, weapon/penetration, smoke/grenade, sound, crouch or human behavior simulation exists here. No live5v5,2v2 or1v2 playtests were performed. Static success and independent prototype review do not establish competitive balance. Target-engine setup and the design.md playtests remain explicit follow-up work.

## Files

Canonical source: `projects/spillway/level.aml`. Current drawing/inventory: same directory. Independent reports: `reviews/layout-spatial.md`, `layout-tactical.md`, `blockout-spatial.md`, `blockout-tactical.md`. Frozen review subset: `reviews/evidence/`.

Complete reproducible generated evidence: `generated/spillway/validation-r04b.json`, `build-r04-result.json`, `build-r04/`, `walk-r04.json`, `probes-r04.json`, `capture-r04/`, `capture-support-r04/`, `capture-hero-r04/`. Earlier revisions retained under the same generated root for traceability. Optional native FBX/BSP exports were not requested. No compiler/renderer code was changed; broad code test suites were not run for this authored-map task.
