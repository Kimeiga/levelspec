# Spillway R08 — current validation and review record

Editable source SHA-256: `cd60767afbdad88df1299b27433242a06b0d2351a62e748aac3eee3a8ff67f63`.

**Accepted for prototype delivery in macro spatial/tactical and focused Reservoir, gallery and Elbow scopes.** This does not establish competitive balance or target-engine falling, combat or multiplayer behavior.

## Design and review sequence

The original R04 review missed offset spawn views. The new R04 area scan reproduced them, including a90.27m sampled line. Its4411 samples and original source are retained as baseline evidence. Center-point protection was insufficient.

R05 repaired major view bundles and added usable low cover. Further user feedback led to a named-space graph, shaped architectural masses, actual dogleg gallery floorplate, offset spawn anchors, local levels and a deliberate drop. R06's planning review caught a building/gallery overlap before modeling. R07 corrected it, shaped the sites/passages and verified all ordinary routes. R08's local Elbow repair added two attached returns: the first proposed return blocked the maximum ray but missed neighboring rays, so a separate tactical reviewer required the opposing return before production.

Independent planning gates preceded production edits. Actual compiled review then used whole-map spatial/tactical reviewers and focused Reservoir, gallery and Elbow/interface reviewers. Local fixes were reconciled with the graph and neighboring geometry. R07 local evidence is reused only for unchanged interfaces, with an explicit [source comparison](evidence/r07-r08-source-comparison.json); it is not relabeled R08 evidence.

## Performed checks

- Strict floor-gap validation at navigation cell.125m: **success, zero diagnostics**. Native required-floor coverage:17,813 samples,17,731 covered,82 physically excluded, zero uncovered. One required walking network. This sampling does not prove continuous gameplay movement.
- Export build: **success**.166 authored objects,12 floor regions,9,049 triangles. GLB,OBJ,SVG,runtime JSON,metadata and reports are in `generated/spillway/build-r08/`. Material UVs/colors retained; lightmap atlas omitted with `--no-uv`.
- All **18 declared routes** replayed through the existing constrained standing-body walker, including A stairs, east ramps, dogleg gallery and the full Splitter→Elbow connection.24 additional standing placements passed. Body settings remained height2m, radius.25m, step.25m, slope42°. No teleport or off-mesh shortcut was added to hide a route failure.
- Final optical audit: **3,782 samples,9,304,300 finite queries**, complete within the declared static opaque scope. Grid spacing1m, eye offsets1.60/1.05m. No omitted dynamic/uncertain-opacity faces, no exhausted budget.1135 unassigned navigation triangles and19 failed standing-body samples were excluded and disclosed. Named samples can duplicate grid locations; counts are not statistical confidence measures.
- Spawn-area121,600, upper→T319,200 and upper→CT268,800 sampled position/height tests each returned **zero visible pairs**. The original wide spawn bounds and eye settings were retained; actual building footprints changed eligible sample counts. This is not continuous visibility proof.
- Three gallery posture studies: standing observers see selected opponents while low-eye observers are screened. The east crest/low-cover study also changes with posture. These are finite optical/capsule studies, not recorded target-engine crouch behavior.
- Independent local Elbow verification: both directions of the authored30.889m route and wider35.193m offset path passed;60 selected standing/crouch-sized body/support placements passed.536 old-bundle and972 supported neighboring optical queries were blocked. Static small-capsule placement does not establish animated crouch traversal.
- Actual source-verified capture sets:33 principal R07 views,12 additional local-gallery R07 views,10 R08 repair/overview/spawn views,4 macro R08 views and4 independent long-lane R08 views. Manifests record loaded input hashes, cameras/canvas state and zero browser errors. Selected images and manifests remain under `reviews/evidence/`.
- Visibility implementation:21 focused tests and TypeScript checks passed. Separate independent test and implementation reviewers accepted the declared sampled scope; reports are in `docs/reviews/fps-visibility-*.md`.

## Warning decisions and retained risks

The final report retains a59.91m northern transit view and a58.55m rear diagonal. They are reviewed warnings, not suppressed failures. Macro reviewers inspected real opposing/rear/site views and finite rays. The northern line's endpoints sacrifice plant views and must react to a close rear/side threat more than100° from the long angle. It is not pixel-only, and low eyes alone do not break it. Retain for prototype testing with sniper, utility, rotation and late-clock scenarios; revise if actual play makes it a compulsory unanswerable duel.

Six compact-entry A warnings remain. They contain partial gate views and do not prove all possible enemy appearances fit a cone. Focused review checked plant targets, raised stair arrival heights and reverse exposure. Retain as prioritized2v2/1v2 postplant risks rather than declaring the map camp-free.

Build retains51 nonblocking suggestions:40 unassigned roof/cover-top navigation islands,5 flight/wall gap suggestions,4 intentional open sides at the shallow A stairs and2 R01 alignment suggestions. Macro spatial review adjudicates them; none was suppressed. Normal required routes/joins pass, while target-engine edge hugging, jumping, boosting and roof access remain checks.

D01 is a planned optional four-meter drop into supported Mid. The source contains no synthetic drop navigation link. Takeoff and landing placements/views were checked, but no falling trajectory, fall damage, recovery or target-engine jump-back test was performed. Existing inspection jump/crouch controls do not establish those game mechanics.

## Source-only construction repairs

East ramp fills are.15m below their walking planes, overlapping ramp thickness so filler ownership cannot erase the actual named walking surface. A north stairs use an ascending source axis while preserving the same physical three-tread shape; independent rays identified the previous warning as a descending-guide audit discrepancy rather than an actual air gap. A small flat R01 collar closes its guard/landing interface. The diagonal wing was adjusted to remove a sub-body-width floor wedge. Player dimensions, source units, native checks and warning thresholds were not weakened.

## Reproduce and inspect

Use commands in the [project README](../README.md). Full generated records: `validation-r08.json`, `build-r08-result.json`, `build-r08/`, `visibility-r08/`, `walk-r08.json`, `capture-r08/`, `capture-macro-r08/`, `capture-longlane-r08/` under `generated/spillway/`. Frozen summaries and local probes are retained separately in `reviews/evidence/`.

No actual multiplayer/weapon/utility/audio playtest was performed. Target-engine setup remains necessary. Broad unrelated code suites were not run for this map/tool change; the focused algorithm/CLI tests, type check, native map checks, real browser captures and independent scoped reviews are the performed evidence.
