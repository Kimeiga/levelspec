# Independent floor-gap adjacency contract review

Date: 2026-11-03. Reviewer: `h2_test_review`. Read-only production investigation; no implementation selected.

**Recommendation: do not automatically exempt the seven courtyard reports or change the interval algorithm.** The current result follows the documented conservative material-closure contract. What is missing is an explicit distinction between an intended floor join and two separate occupied tiers whose boundaries coincide only in plan. If strict authoring must support that distinction, design a narrow architectural relationship contract and its separate edge-protection checks before changing acceptance. A global distance threshold, layer test, guard-presence shortcut, or model-specific exception is not defensible.

## Existing public contract and its limitation

Reviewed `src/vector/floor-gaps.ts`, `Edge`/`Region`/`Seam` declarations, `docs/SVGX.md`, the complete floor-gap suite, the investigation brief, final r11 diagnostics/actual floor bounds, and the independent r11 circulation review. Applied the TypeScript and test skills.

The documentation expressly defines coincident XY boundaries with opposite filled sides as candidates and warns for unsealed intervals exceeding 1 mm. It also expressly says the default warning permits intentional open edges to remain inspectable; strict mode promotes those same warnings to errors. The implementation matches that definition. Existing `kind="open"` means no ordinary wall on that edge; it does not declare two floor boundaries unrelated. An elevation seam, including an open seam, creates real retaining geometry and therefore cannot represent open interstorey air.

The implementation's phrase “adjacent floors” is stronger than its evidence. It establishes an opposite-side projected boundary pair, not a claimed connection, a necessary retaining wall, a route, or an unsafe fall. Likewise, the documentation's stacked-perimeter exclusion applies to same-filled-side stacked footprints, not every architecture with separate storeys. Separate layers do not encode separation: supported stair/floor joins can cross layers, and an existing test deliberately protects that behavior.

Material closure is otherwise carefully tested: actual static structural wall/floor/stair volume, partial spans, holes, stair undersides, intermediate slabs, and continuous underpasses are evaluated. Guard material above the upper slab cannot close the space below it, which is correct for a retaining-seam question. It is not a reason that every balcony must have a full-height wall beneath it. Props are not part of this audit's documented wall/floor/stair seal set; changing that set would be another contract question and would not resolve the need for intentional open air.

## Small independent public-API reproduction

Created analysis-only fixtures under `generated/floor-gap-adjacency-review/`; none were added to production tests. `probe.mjs` writes XML, reparses it, and compiles the real document with strict floor-gap reporting. Navigation and surface-contact auditing are disabled only to isolate this investigation; no result claims traversal, overlap, guard safety, or model acceptance.

Two rectangular platforms meet in XY at X2 over 4 m of length. Both are 0.2 m thick. Independent expected outcomes:

| Fixture | Actual floor-gap result |
| --- | --- |
| Lower floor Z0, upper Z6, actual 1.1 m walls at each occupied edge | One report: 4 m long, 4.7 m remaining air interval |
| Same floors without those walls | One report: 4 m long, 5.8 m air interval |
| Upper Z1, lower wall height .4, upper wall height 1.1 | One report: 4 m long, .4 m incomplete material seal |
| Upper Z1, lower wall height .8 | No report: complete physical seal to the upper slab underside |
| Same-side stacked footprints at Z0/Z6 | No report |

The first case is geometrically compatible with separate balconies. It is also compatible with an author who intended a solid raised enclosure but forgot its retaining wall. No calculation over these same triangles can recover the missing intent. The wall heights in the fixture are geometric inputs, not a claim about legal or adequate fall protection.

Ran `node --test tests/vector-floor-gaps.test.ts`: **27 passed, 0 failed**. Retain those controls. In particular, real sloped stair sides, partial underpasses, short walls, openings only 2 mm wide, and intermediate slab residuals must not disappear to make the large courtyard fixture pass.

## What the seven r11 reports establish

Inspected final compiled SHA `37b872405e7f59b7db84b7198a6f5cecfd5c5db41610e7245818376df5441536`. These are seven distinct geometric reports, not the repeated messages in combined PR13 validation.

| Pair / reported location | Evidence and current disposition |
| --- | --- |
| Upper Z8.970 / lower tread Z.122, X5.20,Y1.70; .200 m length, 4.918 m largest air interval | Strongest demonstrated overinterpretation of projected adjacency. Actual circulation review and inspected upper cuts show protected occupied upper geometry, a lower guard at its tier, and open air between. The actual floor separation is 8.848 m; the reported 4.918 m is the largest remaining material-free interval. A full infill wall is unsupported. Keep the existing strict report until an explicit relationship is reviewed; do not claim interval math is wrong. |
| Lower bridge Z5.970 / LE2 Z12.973, Y0; 1.150 m length, 2.703 m air interval | Floors differ by 7.003 m and retained intermediate material affects the largest empty interval. Separate-storey relationship is plausible; current evidence does not certify intended full enclosure or full edge protection. Do not infer a missing seven-meter wall or automatically waive it. |
| Upper Z8.970 / LE2 Z12.973, Y0; same length/air interval | Another projected pairing with the same retained upper edge, not proof of an additional connection. Independently review the boundary's intended relationship. Source/circulation acceptance remains open. |
| F-PKT stair / Z1.485 floor, X6.60,Y6.40; .400 m length, 1.600 m air interval | Actual stair tops span Z4.650..5.145. A different tier is plausible, but source-backed boundary ownership is unresolved. Guard contact alone cannot decide whether an enclosure was intended. Retain failure. |
| N-mid stair / Z11.555 upper turn, X5.45,Y8.18; .054 m length, 2.473 m air interval | Distinct elevations alone do not clear this. Independent review finds a real separate concern: the upper guard is only .466 m above its occupied floor. Preserve the structural HOLD and existing strict failure. Do not repair either with an invented multi-storey wall. |
| Ground Z−.267 / tread Z.901 at X5.20,Y2.90; .190 m length, .968 m gap | Closely related ground/stair-side geometry is exactly the sort of missing side closure protected by existing tests. An intended open stair side would need explicit source-backed interpretation. No demonstrated false classification; retain failure. |
| Ground Z−.267 / tread Z.706 at X5.20,Y2.88; .020 m length, .773 m gap | Same caution, despite its short overlap. Do not use a minimum-length exception to hide it. Retain failure. |

The seven errors therefore cannot be treated as a homogeneous bug or a homogeneous mandate to add walls. This review establishes the projected-adjacency ambiguity, not definitive source intent for all seven. The circulation review's limitations remain in force.

## Smallest defensible direction

The immediate safe decision is **no production semantic change**. Improve the diagnostic explanation in a separately reviewed small change if desired: say that projected boundaries leave unsealed material, and recommend verifying whether a retaining join is intended before adding geometry. This improves agent behavior without weakening a single detection. Do not suggest a nonexistent annotation as a current feature.

For strict modeling of deliberate separate tiers, the smallest defensible future contract is an **explicit relation between particular region-boundary occurrences**, distinguishing a required physical join from separate occupied boundaries. This is a design direction, not approved syntax or a hidden suppression:

- Keep current conservative behavior when the relation is absent. Do not infer it from layer names, arbitrary floor elevation differences, player step height, or the presence of one obstacle.
- Identify both region and edge occurrences, because an edge may serve multiple boundaries. Validate references, membership, opposite-side positive-length projected overlap, and the declared scope. Reject conflicting join/separation declarations. A declaration must not silently cover unrelated pairs or the undeclared remainder of a boundary.
- A separate-tier relation changes only the claim of required vertical material closure. It must emit an inspectable classified-boundary record, retain geometry/collision unchanged, and never imply a route or complete-building acceptance. Changing the source should invalidate that record through normal compiled/source identity.
- Occupied-edge protection is a separate required check/review for that relation. Actual guard/support geometry and deliberate openings must be evaluated at each occupied tier; a declaration alone, a capsule touching one obstacle, or a top bar alone cannot establish protection. If those checks are unavailable, report the boundary's protection as unresolved and keep overall acceptance on HOLD. There is no justified new hardcoded legal guard-height threshold in this investigation.
- Preserve ordinary unclassified material-gap diagnostics and all other geometry/navigation checks. Do not convert `floorGaps:false`, a report filter, hidden collision, or wholesale warning downgrades into the architectural representation.

This extension is useful only if the project is willing to represent and validate architectural intent. If not, retain the present warning/strict contract and accept that a physically legitimate open building can intentionally fail this conservative strict audit. Do not falsely label that as model acceptance.

## Coverage required for a future contract

Use small public XML/compile fixtures rather than the building asset. Keep all 27 current tests unchanged unless an intentional public contract change is separately justified. New cases should establish:

1. The separated-tier fixture remains reported without a declaration; an exact valid relation produces its distinct classified result while preserving mesh/collision and leaving protection unresolved until independently checked.
2. A missing/partial/short guard or support at either occupied edge cannot become accepted merely through the declaration. The `.4` m incomplete retaining-seal control remains a failure when authored as a join or left unclassified.
3. Missing references, wrong region membership, nonoverlapping or same-side boundaries, conflicting relations, and partial declarations fail or leave the uncovered remainder reported. Reverse edge directions and rotations must preserve behavior.
4. Unrelated real stair gaps, two-millimeter openings, interrupted seals, different-layer joins, and third-floor comparisons remain visible beside a classified separate-tier pair. Do not remove all pairs touching an annotated edge.
5. Source roundtrip, immutable caller input, metadata identity, and strict versus classified status remain explicit. Removing or invalidating the relation restores conservative reporting; it does not add or remove geometry.

No compiler, production test, authoring model, frozen package, or current acceptance status was changed. Analysis fixtures and this report are the only writes from this investigation.

## Preimplementation review: wording-only follow-up

**Approved test plan.** The proposed diagnostic describes coincident plan boundaries and an unsealed vertical interval, asks the author to verify the intended relationship, and makes retaining-wall advice conditional. The accompanying documentation preserves the existing conservative warning/strict behavior. No classification feature, exemption, calculation, severity, object list, source location, or acceptance rule is being introduced.

No new wording test is warranted. The existing 27 floor-gap tests already exercise observable detection, retained numerical span/height values, source diagnostics, default warnings and strict errors. Their message parsing depends on the retained `along … m` and `about … m high` phrases, not the proposed changed wording. Searched relevant test and reconstruction consumers; no exact-string dependency on the replaced instruction was found. Run that existing suite, `npm run check` for the TypeScript edit, and inspect the final diff for changes outside message/documentation text. Do not weaken existing assertions if they fail.

The seven r11 errors remain errors. A future recompilation can legitimately change the whole compiled-output hash because diagnostics contain the new message; this does not imply a geometry change. Preserve frozen prior evidence and use fresh output identities instead of rewriting its reports. Independent implementation review remains required after the wording change.
