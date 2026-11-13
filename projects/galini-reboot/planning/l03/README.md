# Galini L03 — focused School support and route repair

Frozen paper proposal for independent strategy and local return review. No production AML, collision walk or gameplay acceptance. L02 is preserved byte-for-byte; its independent local report is [spatial-layout-l02.md](../../reviews/spatial-layout-l02.md).

Read raw drawings before [the disposition](disposition.md):

- Whole-map strategy: [overview](overview.png), aligned floors [0](floor-0.png), [2](floor-2.png), [4](floor-4.png), [6](floor-6.png), [8](floor-8.png), then SEC01–SEC10 below.
- Focused local return: [School support repair](support-repair.png), [route witness repair](route-repair.png), [turns and neighboring paths](turns-and-neighbors.png). Matching SVGs are retained.
- Construction and comparisons: [vertical sections](vertical-sections.png), [shared volumes](shared-volume-sections.png), [information apertures](information-sections.png), [bridge supports](bridge-sections.png), [roof structure](roof-structure.png), [arrival/information alternatives](variant-comparison.png).

| Named scope | Raw sheet | Interfaces |
| --- | --- | --- |
| Ferry departures | [SEC01](sec01.png) | T spawn, Laundry/Cooper/shore choices |
| Laundry | [SEC02](sec02.png) | D01–D04, S1 return, lower/upper occupation |
| Cooper / Press | [SEC03](sec03.png) | S2 quarter-turn, bent through-passage, advanced follower |
| Chapel / A | [SEC04](sec04.png) | Occupied +6 porch, S3, S4 return, A precinct |
| Middle / Taverna | [SEC05](sec05.png) | Bridge, shallow return, two district choices |
| Shore / B | [SEC06](sec06.png) | Harbor bend, B, surviving named F→O support |
| Salt / Customs | [SEC07](sec07.png) | S5 quarter-turn, loft, cart-road reserve |
| Lower School | [SEC08](sec08.png) | D17–D18 arcade and suspended outside interfaces |
| Upper School / CT | [SEC09](sec09.png) | D19, D23, S7 return, S8 quarter-turn, W03 |
| Civic / Inn | [SEC10](sec10.png) | Bent span, arch, W02, receiving streets |

[layout.json](layout.json) owns actual floors, walls, openings, members, roofs, stairs and support precedence. SS01–SS03 explicitly replace retaining fill at the named School edges with suspended slabs, beams and discrete bearings. Their lowest beams are Z7.25 over the +4 outside routes; the interior arcade remains 3.7 m clear and D17/D18 retain 3 m door height. The normalized floor polygons, existing shell walls, doors, stairs, sites and spawns are unchanged.

[encounters.json](encounters.json) retains ten reversible routes and six population scenarios; it adds exact landing/follower/opponent/neighbor camera requests for six turning systems. Radius remains .30 m; height1.80, crouch1.10, step.30, slope42°, standing/crouch eye1.674/1.023. No spiral or new route was selected for variety alone.

[repair-checks.json](repair-checks.json) records the bounded radius-aware projected checks and support intersections. [Center support](plan-centerline-check.json) and [shell crossings](plan-wall-crossings.json) are retained as narrower checks. All are analytic paper checks; none proves actual capsule motion, tread/doorway joins, headroom, visibility or balance. No timing claim was added.

Later native review must walk all routes both ways; inspect all crests, quarter/half-turn landings, D09, four slab wells and SS01–SS03. Capture roof-on/cutaway and actual opposing/follower/standing/crouch views. Compile first, apply the public camera form after ready, assert actual `#model.dataset.view`, and verify source hash. URL-only camera requests are insufficient. Production authoring waits for root to close both independent detailed gates.
