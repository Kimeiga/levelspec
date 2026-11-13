# Fusion review record

## B05 expanded blockout

The expanded blockout is accepted within the independent spatial, section,
architectural/fidelity and strategy scopes linked below. These are blockout
reviews and finite inspection results; live competitive balance remains untested.

Source SHA-256:
`ffb88349afb29e19abc0b2b578e0d7ad93b25a26b8eeedf0de623057bbb56c85`.

Collision inspector SHA-256:
`b55343df25c4303fcd6d838cefb711439f4375324a0ed1f53ce7d36b02b0116a`.
The [evidence snapshot](evidence/b05/) binds source, checker code, compiled geometry,
raw failures, successful alternate trajectories, screenshots and build results.
B05 follows the user's request for substantially more shortcuts and verticality.
Its [four-plane proposal](../planning/layout-l04.svg),
[sections](../planning/layout-l04-sections.svg) and
[compiled interface repairs](../planning/b05-interface-repairs.svg) retain the
spatial development separately from the finished AML.

| Scope | Evidence |
| --- | --- |
| Spatial composition and circulation | [B05 spatial return](b05-spatial.md) |
| Local encounters, standing poses and sight checks | [B05 section return](b05-sections.md), with raw reports/captures in [B05 evidence](evidence/b05/) |
| Architecture, enclosure and ITER correspondence | [Architecture/fidelity return](b05-architecture-fidelity.md) |
| Strategy, population and central-stair comparison | [B05 strategy return](b05-strategy.md) |
| Native collision-inspector repair | [Independent implementation acceptance](physical-containment-implementation.md) |
| Research applied to skills | [Forward application review](skill-forward-review.md) |

All **32 declared navigation connections** pass their requirements, and **64/64
forward/reverse physical replays** pass. All **46 authored markers** admit the
unchanged standing body. The separate local section study passes 29/30 nominal
trajectories, all ten starts and forty nearby start offsets; all 800 tested spawn
rays are blocked. These finite observations do not establish complete spawn safety.

The strategy study passes all 115 directional legs used by 74 planned journeys.
Distances sum independently checked legs with common waypoint endpoints, rather
than uninterrupted multiplayer runs. Removing the central stair leaves 68 of
those journeys admitted; the six failures require the deliberately removed flight.
The separate same-endpoint west-return comparison is 16.79 m via the delivered
stair versus 80.22 m via the tested west detour without it. It does not establish
the globally shortest stair-absent alternative. The [strategy return](b05-strategy.md)
records opening races, support dependencies and phase-specific limits.

The local visual packet contains 52 inspected images from an interrupted batch,
explicitly qualified because its per-frame datasets were not saved. The exact 36
remaining views have a completed, incrementally saved manifest with actual camera
and render identity, zero page errors and two successfully recovered document
reloads. Earlier incomplete batches remain labeled as such. No capture metadata
was reconstructed or invented for the partial batch.

The failed local trajectory is retained: a constant-radius R6.8 reverse walk near
the lower eastern fan misses a sampled navigation strip. Direct physical queries
admit those points, while navigation does not. The complete R6.7 arc passes both
ways, as does a complete reverse journey with a small inward waypoint (15.7373 m,
402 bounded requests). Required native paths also pass both ways. The report does
not relabel the failed R6.8 path as successful or shrink the body to admit it.
One narrow B-shelf observation pose is also unavailable; its rays are not credited.
A separate supported cabinet comparison is retained.

The build succeeds with **70,006 triangles, 433 architectural objects and no
errors**. GLB validation reports zero errors/warnings. The source retains **167
navigation-island, three wall-alignment and one floor-edge warnings**. The last is
at B's basin/rim near X40,Y19.74; actual render/physical faces are inspected in the
architectural return. No warnings were suppressed. Native AML reproduction is
byte-identical.

Type checking and 34 relevant walking tests pass. A real Fusion browser smoke
passes six standing placements across the main levels, keyboard movement and
crouching, with no page errors. The existing general browser suite separately
stopped at a hidden `#walk-yaw` input; that incomplete run is preserved and is not
claimed as passing. The map-specific browser result does not replace the full
suite. No human combat, penetration, audio, grenade, multiplayer movement or
competitive-balance acceptance is claimed.

## B04 baseline

Frozen source SHA-256:
`67e6d4fc42c5262f0b968956dc00ca6b7a90b261b9a41d2b4134b70ecae7f3e6`.
The [evidence snapshot](evidence/b04/README.md) contains the exact AML, captures,
movement traces, placements, optical checks, diagnostics and build summary.

| Independent scope | Result and report |
| --- | --- |
| Spatial composition and physical circulation | [Accepted B04](b03-spatial.md); original filename retains review lineage. |
| Architecture, enclosure and reactor correspondence | [Accepted B04](b03-architecture-fidelity.md), bounded by inferred profile / published envelope fidelity. |
| Strategy and player behavior | [Accepted B04 blockout](b04-strategy.md); retain the central defender-spawn experiment. |
| Section visibility and local encounters | [Accepted B04 baseline](b04-sections.md); includes opposing views, stair follower positions and low-eye comparisons. |
| Skill transfer | [Forward application review](skill-forward-review.md), separate from map acceptance. |

The baseline has 26 successful declared-route directional physical replays plus
two successful directions around the southwest arc. Additional stair traces ground
camera poses. All 19 original and 31 later observation placements pass, as do all
ten authored starts. No sampled start ray to the selected objectives/central
targets is open. These finite checks do not establish complete spawn safety.

Forty-two useful rendered views show the whole assembly, interiors, exterior
roofs, local encounters and supports; one failed camera inside the bioshield is
also retained with its limitation. Source and capture hashes match. Build succeeds
with 79,934 triangles and 509 architectural objects, retaining 194 navigation-island
and four ramp open-side warnings. No compiler changes or warning suppression were
used to pass this map.

The gallery's sampled inner-bridge/plant separation is deliberately qualified:
one prescribed A-landing pose can see A plant and the near W-mouth by turning
118.948°. Those targets exceed the 91.309° horizontal capture frame. See the
[original ray study](evidence/gallery-landing-rays-b04.json); it is not a whole-body
or weapon-cover test.

Earlier S01 and L01/L02 reports preserve proposal alternatives, required repairs
and their returns. No human combat, penetration, sound, grenade, multiplayer
collision or competitive-balance acceptance is claimed.
