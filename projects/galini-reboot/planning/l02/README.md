# Galini L02 — developed contour town

**Frozen for independent detailed review; no AML and no physical/gameplay acceptance.** Root's R02 spatial-interest return is in ../../reviews/interest-root-r02.md. The rejected terrace-band L01 remains at ../developed/; do not use its routes.

Review the raw sheets before the author dispositions:

1. [Overview](overview.png), aligned [0](floor-0.png), [2](floor-2.png), [4](floor-4.png), [6](floor-6.png), [8 m](floor-8.png). SVGs accompany each.
2. [Every vertical interface](vertical-sections.png), [shared occupied volumes](shared-volume-sections.png), [observation sections](information-sections.png), [bridge supports](bridge-sections.png), [roofs and context](roof-structure.png).
3. Named encounter sheets below; then [bounded alternatives](variant-comparison.png).
4. Only after independent first response, [author disposition](disposition.md).

| Named scope | Raw sheet | Main interfaces |
| --- | --- | --- |
| Ferry departures | [SEC01](sec01.png) | Five-player T spawn, Laundry/Cooper/shore choices |
| Laundry lower/upper | [SEC02](sec02.png) | D01–D04, S1, undercroft, upper exits |
| Cooper and Press | [SEC03](sec03.png) | S2, bent passage, bridge / house split |
| A and west ascents | [SEC04](sec04.png) | Chapel +6 porch, S3, S4, A, O01 |
| Middle crossing | [SEC05](sec05.png) | Bridge, Taverna return, both receiving exits |
| Shore and B | [SEC06](sec06.png) | Harbor bend, B, Customs, O02 |
| East lower transfers | [SEC07](sec07.png) | Salt loft, S5, R6 turning court |
| School lower reserve | [SEC08](sec08.png) | Lower arcade, S7 foot, Bell-side receiving court |
| School upper / CT | [SEC09](sec09.png) | D19 CT exit, D23 Bell join, S7, S8, W03 |
| Civic crossing | [SEC10](sec10.png) | Bent span, Inn, West Lookout, W02 |

[layout.json](layout.json) owns exact floor polygons/holes, complete building envelopes, wall and aperture contracts, flight/landing/ramp bounds, roofs, obstacles, site footprints and five-body spawns. [encounters.json](encounters.json) owns 10 concrete routes, six 5v5/3v3/2v2 scenarios, predicted leader/follower/opponent/support poses, and later camera/walk requests. Point/eye hypotheses are distinguished from unavailable target-engine behavior.

The retained Galini body is radius .30, standing 1.80, crouch 1.10, step .30, slope 42 degrees; eyes 1.674/1.023 m. All required movement is ordinary reversible walking, stairs or ramps. Floors use meters, Z-up and north +Y. Gray stair holes are empty wells; dark masses are complete opaque buildings; roofed colored interiors are occupied floor. Scenic sea, rock and ravine are inaccessible.

Plan sanity checks found no unsupported route-center samples or undeclared shell-line crossings for the listed routes after corrections. These are narrow analytic checks, **not** capsule clearance, navigation, continuous collision, actual sightlines or measured timings. Exact scopes/results: [floor-support check](plan-centerline-check.json) and [shell-line check](plan-wall-crossings.json). Every body route and camera pose still needs compiled review.

Later capture protocol: freeze AML and source hash, compile first, apply the public camera form after ready, assert actual #model.dataset.view, and capture matched roof-on/cutaway plus opposing/follower/standing/crouched views. URL-only poses are not accepted. Required checks are enumerated in encounters.json; production AML waits for root to close both independent detailed gates.
