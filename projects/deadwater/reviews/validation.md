# R05 validation and review record

Inspected source: `projects/deadwater/level.aml`, SHA-256 `b248be8ed5cff4a5b2ae334b761db2b102a3c7570e7f90ad6c6c9948844bb93f`. L05 layout. [Frozen source and 25 views](evidence/r05/captures/capture.json) match this identity. Current geometry contains 346 authored objects, 19 walking regions, 12,112 render triangles and six composed meshes.

## Performed checks

- Strict CLI build with 0.125 m navigation cells and floor gaps treated as errors: passed with zero diagnostics. [Result](evidence/r05/build-result.json).
- All 25 required routes replayed forward and backward with 0.04 m bounded collision/support movement steps; 24 authored markers accept the unchanged standing body. Five placements inside machinery or sea were rejected. [Physical traces](evidence/r05/inspection/walks.json).
- Real Chrome reviewer: SW, SA and SB walked continuously up and down, plus both passages around CT-screen; actual V-console, A-cable and B-pump crouches published height 1.10 / eye 1.023 above feet. Zero browser errors. Browser controls used default 0.0625 m nav cells; the separate programmatic route checks used 0.125 m. Body radius 0.30 / standing 1.80 / step 0.25 / slope 42° remained unchanged. [Browser traces and states](evidence/r05/inspection/browser.json).
- Sampled 3,960 standing/crouched eye rays from two supported rows across O14 to all five CT anchors with ±0.25 m body offsets: zero visible. Thirty-six selected supported A/R-to-P/Valve sea-gap pairs were also blocked by actual baffles. These are finite optical samples, not continuous or ballistic proofs. [Targeted visibility](evidence/r05/inspection/visibility.json).
- All five repaired 1.20 m low-cover props block the sampled crouched eye against an opposing standing eye and still expose standing eyes. R04 had tiny crouched-eye visibility at A-cable, A-reel and P-cart. The source comparison confirms only five 1.10→1.20 m heights and the revision description changed. [Comparison](evidence/r05/inspection/source-comparison.json).
- Fifteen intermediate stair stations and 2 m follower positions came from actual continuous walk traces, then were placed against compiled geometry for opposing eye/body probes. SW's final entrant can be exposed before its follower sees the defender. This is an intentional committed crest requiring live utility/trade tests, not a claimed safe paired ascent.
- Independent collision-GLB consumer, using its own 0.50 m grid and 60 Hz sphere-stack controller, reached both sites from the common T and CT markers. Its CT→B selected path was 80.00 m /17.32 s via the longer circuit. The 0.50 m planner can skip adjacent 0.375 m SB treads and does not verify the intended rear opening time. Native browser SB walks establish that flight's local traversal. [Consumer results](evidence/r05/inspection/collision-export.json).
- Both exported visual/collision GLBs were checked with glTF Validator: zero errors and zero warnings. [Results](evidence/r05/inspection/gltf-validation.json).

Navigation reports retain one tiny 0.047 m² floor-T corner component beside the crane in addition to the connected playable component. All required regions, marker placements and asserted routes are reachable without extra seeds. This sampled artifact is not an additional claimed route or occupied combat position.

## Arrival and rotation estimates

All twenty spawn-to-site queries use the unchanged source geometry. At the provisional 5 m/s movement speed, shortest-path estimates are:

| Team → site | Distance range | Movement-only time |
| --- | --- | --- |
| T → A |58.43–62.61 m|11.69–12.52 s|
| T → B |66.16–70.93 m|13.23–14.19 s|
| CT → A |33.26–39.25 m|6.65–7.85 s|
| CT → B |35.52–42.16 m|7.10–8.43 s|

These are not first-contact measurements and omit equipment speeds, clearing, utility, body blocking and sound. The shortest A→B path is 62.85 m through contested territory. A conservative rear anchor chain is 88.65 m /17.73 s; it is a distinct rotation family with different ownership and exposure.

Both independent R05 return reviews accepted the revised harness blockout.

## Independent review progression

- [R01 spatial interest](interest-r01.md): promising.
- [L02 spatial / visibility](layout-l02-spatial.md), [L02 strategy](layout-l02-strategy.md), [L03 spatial return](layout-l03-spatial-return.md): production accepted after CT-screen and wind-baffle corrections.
- [R04 compiled spatial review](blockout-r04-spatial.md), [R04 compiled strategy review](blockout-r04-strategy.md): source-matched views, construction, circulation and scenarios assessed independently. The local low-cover finding led to R05.
- [R05 spatial return](blockout-r05-spatial-return.md), [R05 strategy return](blockout-r05-strategy-return.md): focused closure on five repaired cover heights and their interfaces; unchanged R04 macro assessments are reused under the exact source comparison.

## Remaining engine and playtest work

No multiplayer round was simulated. Penetration, bullet/weapon exposure, grenade bounces, smokes, flashes, incendiaries, sound through bulkheads and sea gaps, networking/trades, fuse/plant/defuse rules and actual plant trigger bounds remain unverified. The source defines site markers and painted regions, not defusal logic.

Flat stair infill tops meet the upper landing and are not intended routes. They are absent from admitted harness walking floors, but engine occupancy via guard ends/boosts has not been proven impossible. Check their walkable-top treatment before production gameplay release. The exposed A east hold and single rear retake threshold per site remain deliberate playtest priorities. A valid compile, finite optical rays and successful walks do not establish competitive balance.
