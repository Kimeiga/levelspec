# Exploration complexity — independent preimplementation test review

2026-11-09. Scope: requirements, existing test coverage, observable contracts and failure cases before the next production change. No production code changed in this review. Applied `maintain-tests` and `write-readable-typescript`.

The user wants materially richer planning alternatives, informed by actual FPS maps such as Nuke. More random coordinates, more graph edges, or more unverified heights would not by themselves meet that request. The first two passes remain planning aids, not a map-quality oracle or an engine simulation.

## Existing baseline and gap

I read `src/generate/exploration/{types,config,metrics,search,spatial,index}.ts`, the 13 domain/native tests, the production browser test and the seed-matrix runner. `npm run test:explore` independently passes **13/13** on the prechange source.

Existing coverage protects directed flow and shared throats; degree-two subdivision of route-length variation; crossing-region identity and clearance; pins, locks, budget accounting and scheduling independence; import recomputation; spatial randomness ownership; failed fits and unimplemented mobility; ordinary reverse movement; physical blockers; shared hall collapse; and exclusive output ownership. Preserve those contracts.

It does not protect developed intermediate decisions or regional structure. The default four-node graph can become a complete graph with three cycles and satisfy the relevant minimum topology demand. That is not a bug under the current contract. Tests must change the contract rather than merely change the seed until one visually busy candidate appears.

The second pass has a separate simplification mechanism: `addSharedSpace` puts all areas at the most common elevation into one convex shared yard/hall, without a regional or distance boundary. A richer graph can therefore lose its intended stages during interpretation. Any new hierarchy contract should survive that conversion explicitly.

## Required behavior tests for the chosen contract

The precise public fields and numerical formulas remain the author's design decision. The following independently derived cases should constrain them before implementation.

| Case | Observable expectation | Incorrect implementation it rejects |
| --- | --- | --- |
| Four-node complete graph, entry S and key T | Three cycles do not by themselves satisfy a developed-journey target. There is a direct S→T route and no required intermediate decision. | Renaming the cycle count as complexity, or rewarding degree alone. |
| Staged alternatives: S–A, A–X, A–B, B–X, X–C, X–D, D–C, C–T | Distinguish a journey through A, X and C from the complete graph, despite both having three cycles. The shortest topological route is S–A–X–C–T; side paths provide later rejoins. | Treating all graphs with equal cycle rank as equally developed. |
| Insert ordinary degree-two points into every edge, preserving geometry and direction | No new decision-depth, regional or route-choice credit merely for subdivision. Genuine metric path length remains unchanged within numerical tolerance. | Raw node count, raw hop count or per-edge length entropy. |
| Add a remote disconnected cluster or a loop that only returns to the same arrival | It cannot satisfy entry-to-key journey demands. Any reported general topology statistic remains clearly separate. | Counting unrelated ornament as useful route substance. |
| Add many edges to a local clique or bipartite tangle | Do not obtain unbounded quality/complexity credit from local connectivity. A bounded interval/penalty or separately exposed saturation is preferable to an unlimited reward. | “More edges is always better.” A bipartite counterexample also catches triangle-only density penalties. |
| Reverse the only exit from an otherwise rich region | Direction-aware journey evidence changes; an unreachable key remains an unmet demand. | Undirected reduction used accidentally for strategic reachability. |
| Put a required alternative behind an unsupported ladder/jump or impossible ordinary slope | Do not claim physically supported decision or stacking evidence. Separate assumed capability, geometric fit and engine status. | Random Z/mobility labels producing easy complexity credit. |
| Two upper/lower territories with overlapping XY footprints and separate usable approaches | Distinguish useful layered territory from a crossing of two unrelated lines. Report the measured relationship as a proxy, not as visibility, sound or playable-area proof. | Counting only nonincident edge crossings, or treating any different height as occupied layering. |
| Same XY/Z arrangement with inaccessible upper territory or insufficient body/deck clearance | The useful-layer evidence must fall or show an explicit unresolved/failed status. | Stacked decoration receiving the same reward as a usable relationship. |
| Two same-height regional clusters joined through one controlled connection | If regional hierarchy is introduced, spatial interpretation keeps separate shared volumes and the controlled connection. Within one selected shared volume, existing shared-throat collapse still applies. | A global convex hull silently erasing the new graph hierarchy. |

Do not make a test assert “Nuke-like,” “fun,” “balanced” or a specific named map's route recipe. Those are not executable contracts. Reference study and visual comparison must assess the scope that graph metrics cannot.

## Search, locks and diversity acceptance

Use new hand-authored graph fixtures for metric expectations. A minimum scalar or interval should have exact boundary tests, including malformed/nonfinite inputs. Avoid calculating expected values with the function under test. If one metric deliberately uses an abstraction such as reduced paths or region membership, document that abstraction and test a small graph by hand.

For the search itself, retain deterministic same-input output across chunk sizes and interpretation order. Use a fixed, modest seed cohort to verify that the *retained set* contains materially different structural alternatives under the new default profile. Record structural evidence separately from cosmetic movement, so jittering all positions or changing generated IDs cannot be the only cause of a diversity pass. Avoid one large golden packet tied to private mutation ordering.

Keep an intentionally impossible, fully pinned/locked case: the exact proposal budget must still be exhausted, the locks must survive every retained frame, no target should be silently reduced, and fewer alternatives are valid when the constraints prevent diversity. New compound mutations should either preserve all involved locks/anchors or be rejected as one attempted proposal.

If a larger default node budget is chosen, test that a minimal starting graph can grow toward it rather than requiring the author to pre-draw the complex network. Conversely, raising the hard minimum must not make an existing small explicit input silently invalid merely because a UI preset changed. Choose and document the new contract; do not introduce an accidental compatibility layer.

## Existing assertions likely to need deliberate revision

- The alternatives test assumes two candidates and exactly six AML outputs after a 100-proposal search. Retain meaningful alternative/interpretation assertions, but do not require an accidental count when the revised selection legitimately returns fewer states. If exact retention under this fixture is a declared contract, explain why it is achievable.
- The browser's `history-edit` fixture searches one seed for a node that appears in an old frame and is deleted by the end. New operators/defaults may remove that coincidence without breaking historical editing. Prefer a small manually authored valid packet/trace to test the historical-node promotion behavior; do not weaken the pointer-drag assertion.
- Existing hand-authored two-/four-node native fixtures are deliberately small. New developed-map defaults should not force those fixtures to fabricate additional gameplay structure. Supply explicit low-complexity test targets where their contract is unrelated to planning richness.
- Import currently recomputes derived metrics and AML. New fields need corruption/recomputation coverage and full normalized round-trip equality. If packet semantics change, make a complete versioned cutover or state the explicitly retained import contract. Archived initial packets remain historical evidence.
- The matrix currently reports nodes, edges, deficits and signatures. Add the actual new evidence dimensions and preserve failures/unmet demands so the report can reveal whether added entropy only produces invalid geometry.

## Verification proportional to this change

Run the focused suite and type check after the metric/search changes. Run the existing production browser flow after new controls, packet fields or preview data are wired. Use a bounded seed/profile matrix with all failures retained and actual plan/height/native views from contrasting candidates. Inspect at least a small and a larger retained interpretation through native compilation; raising complexity can increase geometric contacts even when topology looks stronger.

Performance is part of usability, but avoid brittle millisecond thresholds. Confirm bounded work and completion under a realistic default cohort; record elapsed wall time as evidence. Pairwise crossings already scale with edge count and sampled strip intersections. Exhaustive simple-path enumeration can grow exponentially on dense graphs; any new route-sequence analysis needs an explicit bound or polynomial definition.

This review is a preimplementation contract plan, not final approval of an unspecified metric. A concrete design and proposed assertions need a focused return review before production implementation, followed by an independent implementation review and final test review.

## Concrete contract return review

The author proposes optional explicit area regions; progressive decision-depth, eligible territory and optional stacked-region targets; compound stage/fork/rejoin and region-moving mutations; a larger permitted search envelope; and spatial shared volumes limited to regions or geographically bounded unlabeled clusters. The scope is generated planning alternatives, not a new finished map or a full visibility/acoustic model.

The narrowed semantics are reviewable: progressive choices use enabled, ordinary, body-fitting edges and strict decrease in shortest target distance, with a 1.75× shortest-trip envelope. The least depth among equal-cost shortest journeys avoids favorable tie selection. Eligible territories require at least three same-height members, connected internal ordinary geometry with an underlying-undirected cycle, distinct incoming/outgoing member ports, and every member within one approach's same detour envelope. Stacked-region pairs require clearance between nominal floors, strict XY disk overlap, and ordinary travel in both directions; they remain an abstract occupied-layer proxy.

Three distinctions must stay in the documentation and evidence: strict progress misses initially lateral/away detours; a directed acyclic internal graph can still have an underlying-undirected cycle; and shared-volume interpretation can legitimately erase intended cycle/depth credit. Recompute and display that loss rather than preserving region labels as proof.

The first concrete draft exposed a **material counterexample, now resolved in the contract**: deciding whether two exits differ using their immediate successor-area disks is sensitive to pure subdivision. Insert two ordinary degree-two nodes very close to a fork, one along each outgoing route. Their disks overlap even though the original farther successors did not, so the fork loses credit. Naively suppressing the chains to terminal successor nodes is insufficient: two deliberately distinct routes that rejoin at the same terminal would then have the same successor disk and also lose credit.

The positive paired fixture is planar, radius 2 m throughout: S(−30,0), A(−20,0), X(0,0), B(−10,10), C(20,0), D(10,−10), T(30,0), with edges S–A, A–X, A–B, B–X, X–C, X–D, D–C, C–T. The shortest distance is 60 m. A and X each offer two strictly progressing routes within the 105 m envelope, giving progressive depth **2**. C is a rejoin, not a further progressing choice. Pure subdivisions along both exits must not erase those two decisions. A four-node clique with direct S–T remains depth zero.

The revised contract reduces ordinary degree-two transit chains while retaining parallel directed arcs, concatenated route polylines and actual path costs. Two progressing, budgeted reduced arcs count as different only when symmetric maximum vertex-to-other-polyline separation exceeds the half-sum of their widths plus 0.2 m. This preserves the two distinct A→X routes while ignoring collinear duplicate alternatives and near-departure subdivisions. It is a sampled geometric proxy, not visibility or physical portal proof.

Preserve every configured approach endpoint during reduction, including endpoints whose role is ordinary `area`, alongside semantic anchors and directional stops. Define reduced-arc width conservatively, such as the maximum constituent width. Strict progress is between retained junctions: an initially away bend inside a reduced route can still count if its next retained junction progresses.

**Preimplementation return verdict: sufficient to proceed with these hand-derived assertions before production changes.** No material design finding remains under those boundary clarifications. This is not implementation acceptance; final test review must inspect the actual fixtures, failure sensitivity and resulting code evidence.

## Initial implementation test review

The new five tests in `tests/producers/exploration-structure.test.ts` encode the hand-derived two-stage depth, direct-clique and tied-shortcut negatives, near-fork subdivision, coincident routes, dead ends, unavailable/implausible mobility, directed reversal, regional ports, one stacked pair and separate same-height shared envelopes. Their expectations come from small explicit graphs rather than the new metric. The existing 13 tests remain useful.

One missing boundary exposed a material implementation defect: stacked reachability was checked from each territory's lexicographically first node instead of an eligible member pair. Make the two region triangles directed forward but retain a bidirectional connection from the first region's exit to the second region's arrival. Both regions remain eligible, and those two boundary members have ordinary round-trip access, yet the initial implementation reports no stack because the second arrival cannot return to the first region's initial member. Changing member names can change the answer. Add this positive, a renamed-identity invariant and removal of the reverse connection as a negative before accepting the repair.

Further requested contract coverage is bounded and nonredundant:

- Query B→D in the staged fixture, with both query endpoints still ordinary degree-two areas: expected distance `2 * sqrt(200)`, zero progressive depth, and a witness starting B and ending D. Merely changing S/T roles would not exercise suppression because those nodes each have one neighbor.
- Change B to (−10,6), the A→B width to 1 m, and B→X width to 12 m. Conservative maximum chain width makes the first route pair insufficiently separate, leaving depth 1. Returning B→X to 3 m restores depth 2.
- Move B to (−10,60). The reduced alternate still ends at progressing X but exceeds the 1.75 trip envelope, so depth stays 1. This independently exercises the detour budget after reduction.
- Start a seeded search from explicit regions with a pinned whole node and a locked edge, retaining every frame and comparing different chunk schedules. Preserve exact declared locks, original inputs and output equality. Do not silently strengthen an edge-definition lock into a pin on both endpoint positions; the current ordinary move operator permits unpinned endpoints to move.
- For shared-space contact diagnostics, require a warning naming both actual hall IDs in an edge-only perpendicular overlap, and a separate warning naming an isolated unrelated area inside a hull. A broad assertion that any issue exists could incorrectly pass on old route-crossing warnings. Assert no certified links are invented, own members are excluded, and 2.0 m versus 2.1 m vertical separation exercises the 1.8 m body plus 0.3 m deck threshold.
- Exercise unlabeled local grouping's maximum member count and all-pairs distance bound independently of explicit region separation.

Final acceptance remains pending the stacking repair and these requested behavior cases.

## Final test return review

**Accepted for this bounded engine change.** The stacking repair now considers any mutually reachable member pair; the regression fixture verifies the directed-region positive, reversed member order, a renamed member and a one-way negative. The query-endpoint, conservative width and detour-envelope cases are present with independently derived expectations. A regional-input search test preserves pinned nodes, locked edge definitions, caller ownership, exact proposal accounting and chunk-scheduling determinism.

The locality fixtures exercise the four-member cap and 28 m all-pairs diameter separately. Shared-hull contact tests identify the actual two hall surfaces, an isolated interior area and the 2.0/2.1 m clearance boundary. They exclude own-member warnings and now explicitly reject invented hall-to-hall as well as hall-to-isolated-area links. Separate regional volumes retain their gap, while realized cycle collapse remains visible.

I independently reran the final focused suite: **23/23 pass**. This comprises ten new structure/region cases and the original thirteen domain/native contracts. No material test-coverage finding remains for the implemented scope.

The browser trace fixture has been changed from seed-dependent search history to a small authored valid trace, retaining the real deleted-node drag/pin check. Its new UI assertions set distinguishable depth/region/stacking demands, check exported values, verify import restores the controls and require the before/after structure heading. I reviewed those browser changes; the root agent owns the production-browser execution and retained evidence. This review does not substitute a passing unit suite for that browser run or for visual inspection of generated alternatives.

## Follow-up: preserve configured floors during region stacking

Visual inspection subsequently exposed a further search defect: translating a mixed-height region by a delta computed from its average elevation can produce floors absent from the configured choices. The new seeded integration test is a meaningful regression: it starts on zero with configured heights 0/4/8, observes nonzero output, then checks every retained frame against those choices with a 1e-6 m numerical tolerance. The author confirmed the pre-fix test fails at proposal 86 on an invented 12 m floor. It therefore does not merely duplicate the proposed correction.

**Pre-fix contract accepted:** only homogeneous source and destination regions participate in stacking, and the chosen destination floor comes from the configured elevations. Mixed-height regions may still move in XY. Preserve whole-node pins and locked-edge constraints. This fixture's configured-only invariant must not become an accidental global restriction on arbitrary user-authored starting heights; the general search contract permits initial heights as well as configured choices.

Follow-up acceptance is pending inspection of the correction and the new regression passing.

**Follow-up closed.** I inspected the corrected `moveRegion`: both source and destination IDs are filtered to homogeneous groups of at least three members for stacking; the selected configured height is assigned directly to each moved member; ordinary XY movement retains mixed-height groups; and existing pin/locked-edge guards remain. No global configured-only restriction was added to graph validation. I independently ran the new regression after the correction: **1/1 passes**, following the earlier independently passing 23-case suite. The root agent owns the final full 24-case rerun and matrix evidence. No material test-review issue remains for the revised engine.
