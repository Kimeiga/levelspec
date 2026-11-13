# Compiler audit — independent coverage review

Reviewer: `/root/compiler_audit_coverage`. Scope: the user's pause for compiler review, with no changes to map sources or production code. Applied `maintain-tests` and `write-readable-typescript`. This review concerns test ownership and observable contracts, not gameplay acceptance.

## Confirmed validation boundary

The strongest actionable gap is between native compilation/runtime validation and producer publication. The producer already computes conservative physical entrance capacities and rejects insufficient resources (`src/architecture/producer.ts:79`, `src/authoring/physical-routes.ts:37`). Native compilation adds a semantic edge when both named final floor records exist, without inspecting `connection.path` (`src/architecture/compiler.ts:1933`). Runtime `disjointRoutes` then combines one real endpoint navigation path with the declared semantic graph count (`src/vector/validate.ts:560`).

The reproducible three-case control is [coverage-repro.mjs](coverage-repro.mjs). Run:

```sh
node projects/reboot-study/compiler-audit/coverage-repro.mjs
```

Retained XML and exact JSON observations are under `generated/reboot-compiler-audit/connection-coverage/`. Both floors are 4×4 m, adjacent at x=4. One continuous mouth runs along x=4/y=0–4. Markers are (2,2,0) and (6,2,0), with a 4 m direct path.

| Case | Compile + `validateForRuntime` | `produceDocument` | Independent interpretation |
| --- | --- | --- | --- |
| One valid mouth, min-routes=1 | No diagnostics; passes; count 1 | Passes; physical count 1 | Positive control. |
| Same mouth declared twice, min-routes=2 | No diagnostics; passes; count 2 | Rejects `PHYSICAL_ROUTE_REQUIREMENT` | Declaration duplication increases semantic capacity without creating another physical entrance resource. |
| `path="absent"`, min-routes=1 | No diagnostics; passes; count 1 | Rejects `PHYSICAL_ROUTE_REQUIREMENT` | An invalid explicit source reference is ignored by ordinary compilation; the producer fails later with a less specific capacity message. |

The producer's unit is one capacity per contiguous mouth or enabled traversal resource. This is conservative entrance independence, not continuous player-trajectory or gameplay proof. Integration should preserve that stated limitation. Do not implement a second competing capacity algorithm merely to cover the compiler boundary.

Minimum durable coverage for a change here:

1. Public `compile(parseAml(...))` rejects an unknown explicit connection path with a source-linked diagnostic. A missing optional path and an invalid supplied path are different cases under the current vocabulary.
2. The positive one-mouth fixture accepts one required route. Declaring the same contiguous mouth again does not increase **physical** capacity or satisfy a two-resource requirement if the ordinary validation contract is strengthened accordingly.
3. Two genuinely separated valid mouths supply two resources; blocking one reduces capacity with the same player and unchanged requirement. Preserve the valid control so a detector cannot pass by rejecting every multi-route map.
4. World-equivalent transformed path coordinates preserve the result. Existing producer tests already exercise this; reuse their behavior at the authoritative boundary instead of repeating all internal calculations.

## Local itinerary versus endpoint reachability

`<route>` currently accepts endpoints and distance/count limits, with no waypoint, portal, or ordered traversal contract (`src/architecture/format.ts:342`). Existing tests verify copied world-coordinate paths and total distance, then a barrier that removes **every** endpoint path (`tests/aml-route-path.test.ts:5`, `:18`). They do not claim a particular doorway was traversed.

A positive route around a blocked intended doorway is therefore not by itself a regression in endpoint routing. An exact local itinerary or required portal crossing needs an explicit assertion contract. A useful minimal fixture is a two-opening wall where the required local opening is blocked but a longer alternate remains. Ordinary endpoint reachability should remain true; an explicitly required portal assertion should fail. Exact path-length limits alone cannot express all intended itineraries.

The bounded collision-aware movement layer is independently tested for ceilings and unsupported gaps even with deliberately optimistic navigation (`tests/review-physical-step.test.ts:51`). Reusing that existing movement evidence for explicit local traversal checks is preferable to claiming nav connectivity proves the authored journey. Its tests do not establish continuous capsule sweeps.

## Clearance already has useful coverage

There is no evidence here that AML lacks headroom detection. Earlier map reports already emitted `NAV_HEADROOM`/`NAV_WIDTH`. The opportunity is to identify the exact offending interface and express intended clearance, not to add another generic headroom pass.

Existing public-API tests already cover:

- A 2 m clearance exactly touching floor/soffit succeeds, while a 1 cm intrusion fails and identifies the obstruction (`tests/aml-volumes.test.ts:61`).
- A native invisible collision proxy blocks clearance; a visual ceiling does not (`:80`).
- A clearance wholly inside a closed solid fails even without an intersecting boundary face (`:120`).
- Supported perimeter with an unsupported middle opening fails (`:125`).
- Clearance work budgets, source context, input immutability, and recovery are protected (`:139`).

A lintel/underpass reproduction should first add an existing explicit `<clearance>` assertion in an isolated fixture. A new compiler feature is warranted only for an unmet contract, such as a swept body envelope along a nonplanar flight or localized diagnostics for sampled nav failure. Do not duplicate the established flat-prism assertions.

## Stair and wall construction coverage

The compiler already has explicit underside choices. `tests/aml-circulation.test.ts:18` protects horizontal treads for all five underside modes; `:49` checks independently derived occupied volumes; `:92` checks a nonlinear sloped underside against final collision. A low triangular cavity from an intentionally sloped underside is not sufficient evidence that the compiler should fill it. Automatic filling could destroy an intended underpass.

Enclosures preserve actual tread bottoms and independently authored top profiles (`tests/aml-enclosures.test.ts:52`), intentional railing gaps (`:29`), explicit returns (`:44`), reflected/offset sides (`:70`) and apertures through returns (`:77`). Existing suggestions deliberately exclude flight entrances and distinguish nearby wall gaps from completely open sides (`tests/vector-suggestions.test.ts:25`). They retain exact threshold controls and do not mutate geometry.

For a proposed wall/guard junction fix, the minimum new case should demonstrate an explicit common endpoint/attachment contract that still leaves an unintended opening in final collision, alongside a deliberate opening control. Rendering alone cannot show that every small seam should be filled. No such compiler failure was established by this review.

## Roof steps and tall wall remnants

Existing wall anchoring can span an actual lower floor to a transformed soffit. `tests/aml.test.ts:200` measures a 2.8 m wall top below a 3 m slab with 0.2 m thickness and rejects conflicting fixed height. `tests/aml-cad.test.ts:496` covers declared base contact and transformed soffit anchors. These are existing construction tools, not merely visual annotations.

`<room>` intentionally adds metadata without a physical shell; that non-invention is a tested contract (`tests/aml-volumes.test.ts:23`). A literal tall wall or absent roof-step fascia is not automatically a compiler geometry error. A future building-envelope assertion needs explicit expected closure, legitimate openings, setbacks, skylights, and courtyard exceptions. A global automatic wall-height clipping rule could erase intentional parapets or attached taller buildings.

Minimum future envelope-diagnostic cases should include an unclosed stepped roof seam, a closed anchored equivalent, an intentional clerestory/open court, and a nearby independently taller wall. Assertions must target the declared envelope and source objects; broad mesh proximity alone is insufficient. This is a new optional diagnostic/authoring contract, not a reason to change every wall's default geometry.

## Validation performed

The following focused existing suite run passed **87/87**, with no retries or changed production code:

```sh
node --test --test-concurrency=2 tests/aml-route-path.test.ts tests/aml-volumes.test.ts tests/aml.test.ts tests/aml-circulation.test.ts tests/aml-enclosures.test.ts tests/vector-physical-integration.test.ts tests/review-physical-step.test.ts tests/vector-suggestions.test.ts
```

The standalone three-case reproduction also completed and retained its outputs. It records current observations; it does not encode defective behavior as a desired regression-test contract. No full repository suite, browser run, or gameplay test was needed for this read-only compiler audit.
