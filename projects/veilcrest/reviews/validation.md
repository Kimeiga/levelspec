# Expanded Veilcrest r09 — validation and evidence

Delivered editable source: `projects/veilcrest/level.aml`. SHA256 `d7bf3349943fbda2fbeef4fcc519b4adf8feb359d3c9da186161bcdbe599de24`. All current compiled evidence below records this exact source. Historical r05 source/layout and early sketch evidence are retained separately; they do not verify the enlarged map.

The user requested a larger, less simple map after the first version. The estate grew from an 87 × 80 m envelope to 134 × 94 m, with open plan footprint approximately 3,364 → 6,973 m² after obstacle/wall subtraction. Raw combined floor/flight footprint is 3,700 → 7,844 m². It now has 18 floor spaces and 5 stairs, versus 9 and 4. This is new circulation and room space, not uniform scaling.

Independent workflow: [initial interest](01-interest.md); [expanded interest](04-expansion-interest.md); expanded developed-layout [spatial](05-expansion-layout-spatial.md), [strategy](05-expansion-layout-strategy.md), [visibility](05-expansion-layout-visibility.md); compiled r09 [spatial](06-blockout-spatial.md), [strategy](06-blockout-strategy.md), [visibility](06-blockout-visibility.md). The layout gates accepted r08; the compiled source includes the scoped r09 wall-foot repair.

Strict CLI validation passes at 0.125 m navigation cells, `--strict-floor-gaps`, no diagnostics. Coverage samples 29,082 native walking points: 27,358 covered, 1,724 excluded by physical boundaries, 0 uncovered. All 23 authored floor/flight regions are reachable. Thirty-two explicit route requirements pass through real native threshold connections; no off-mesh links, relaxed body or extra seeds were added. Lower slabs are 0.35 m thick; upper +3 floors are 3.35 m filled podiums down to -.35. Slopes/pines outside the closed estate are visible noncollidable/nonplayable scenery. Physical collision remains separate from rendering.

Build: `generated/veilcrest/build-r09`, geometry/runtime/plan/report/metadata export passes. `--no-uv` omits the optional lightmap atlas; no lighting bake, FBX or BSP was requested. Game export also passes through the repository's runtime validation and emits a visual mesh, separate collision mesh and 35 markers (including 10 spawns and 2 site anchors) in Y-up meters. Neither bundle implements bomb rules, weapons or multiplayer.

[52 directed one-body checks](evidence/walk-r09.json) pass. The unchanged radius 0.30 m, standing 2.0 m, crouch 1.1 m, step 0.25 m body moves with WalkMotion at 1/120 s; it follows eroded navigation and bounded physical support/headroom samples, not a continuous engine capsule sweep. Every flight is exercised both ways; the library ring, new wings, court passages, foyer turn and rear flanks are followed continuously. A trial path crossing the existing garden bench was corrected to walk around the bench; geometry/body were not changed to pass that path.

Measured fixed-path times at 3.4 m/s:

| Journey | Seconds |
| --- | ---: |
| T front/library → A | 26.24 |
| T garden → A | 30.93 |
| T orangery/music → A | 39.93 |
| CT central rear hall → A | 13.28 |
| T drain → B | 23.62 |
| T pump/wine/cellar → B | 37.08 |
| CT staff court → B | 20.98 |
| CT outer cellar route → B | 41.16 |
| A ↔ B through staff court | 25.47 |

All five spawn offsets were physically followed to B: T 20.62–23.62 s, CT 20.21–20.99 s. These are fixed routes, not proof of globally optimal times. More relevant first-contact waypoints: T enters the south site at [90,49] after 13.22–16.23 s; CT reaches the upper north flight [82,81] after 12.06–12.84 s and lower interior [82,67] after 16.18–16.96 s. B is contested before both teams reach the plant marker. Under the provisional 40 s planted timer, a 25.47 s no-contact rotation leaves only 9.5 s of clearing before a 5 s kit defuse, 4.5 s before a 10 s non-kit defuse. The 41.16 s outer route is not a late retake response.

Actual browser evidence: [45 revision-matched views](evidence/capture-r09/capture.json), [supported court pair and north overview](evidence/capture-court-r09/capture.json), [focused intermediate/follower views](evidence/capture-focused-r09/capture.json), and [long opposing views](evidence/capture-long-r09/capture.json). Main views include both site sides, retired A door, new wings, library, all transfers and spawn pockets. All capture manifests retain loaded AML/camera identity and report no browser errors. [12 real stance poses](evidence/stances-r09/report.json) plus [6 more](evidence/stances-extra-r09/report.json) show actual standing/crouching helpers at 9 low-cover positions. These exercise body/camera placement, not ballistic cover.

The sampled optical audit uses 3 m XY spacing, standing/low eyes 1.86/1.023 m, unchanged supported bodies and every authored component. It keeps all four site frontiers. Boundary samples at two B portals and a court corner initially lay outside eroded navigation; the final audit uses disclosed adjacent supported B-side points and the court point [113,101]. Source geometry, eye heights, protected spawn bounds and warning thresholds were unchanged. The final complete scan reports 711 samples, 349,948 queries, 31 protected pairs hidden, 256 spawn-offset height pairs with 0 visible. No unsupported entry samples remain in its portal inventory. Static optics are not crouch movement or continuous LOS proof.

Retained hypotheses: the north B anchor sees the three T-side portal centers in a compact sector, while the cistern masks portions of the plant and north retakes widen attention. Long mansion diagonals reach 77.83 m and 75.24 m across multiple thresholds; initial spawns remain optically separated. Outer wings consume time and may be left unoccupied by five defenders. Test five-player control allocation, learned early B contests, smoke/flash utility, 2v2 post-plants and low-utility 1v2 retakes in the target game before claiming balance. No human or bot combat matches were simulated.

Focused long-lane adjudication: the rear hall is cheap for CT to occupy early; it is a dedicated west-watch assignment with manpower cost, not earned territory for CT. Independent actual views and focused rays confirm that the same hold cannot see the garden-south or library-east A frontiers. The library-to-music lane requires library ring control and clips entry edges. Both lanes are retained for playtesting with these specific limits; see the tactical review addendum and retained strategy-lane evidence under `reviews/evidence/strategy-lanes-r09` and `strategy-lane-rays-r09.json`.
