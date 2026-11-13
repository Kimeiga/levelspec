# Exploration verticality — independent test review

2026-11-09. Applied `maintain-tests` and `write-readable-typescript`. This is the preimplementation review of the height-assignment and explicit cross-level connection contract. No production code was edited by this reviewer.

## Contract accepted before implementation

The proposed contract fits the user's request: each area has an assigned floor, and an edge may cross floors only with explicit `crossLevel: true` permission. Permission is distinct from movement mode, geometric fit, enabled player capability, and engine verification. An explicitly permitted edge may currently be flat. A stairs, ladder, ramp, drop, or jump label alone never grants permission.

`verticality` is finite and in [0, 1]. It is the probability that a floor assignment samples the configured elevations instead of keeping its current floor. Zero freezes authored heights and all height-changing search proposals, including stacking; it does not flatten supplied input. One permits sampling all configured elevations, including the current floor, and promises neither a floor count nor a particular final arrangement. The first configured elevation is the automatic starter's base, including when it is nonzero or the array is unsorted. The starter uses its own deterministic seeded stream and explicitly marks generated connectors that cross floors. If no enabled transition mode is available, it omits that connector instead of inventing a capability. Supplied initial graphs are never rewritten.

The shared same-floor tolerance is absolute height difference <= 1e-6 m. Validate proposed, imported, retained, and realized graphs consistently. No implicit packet migration or automatic permission promotion is needed: change the packet version and reject older packets under the new invariant.

Ordinary connection proposals join only equal floors. Separate explicit cross-level proposals may connect different floors or grant permission to a currently flat edge. Height edits move the entire weak component of unmarked edges, regardless of traversal direction or whether its mode is enabled. Any pinned member prevents that component's height change. Ordinary subdivisions inherit their floor. Subdividing a permitted transition may sample a configured floor while inheriting permission. Region stacking requires explicitly permitted boundary edges. Stage expansion preserves any necessary boundary permission while its same-floor internal links begin ordinary. Merge and rewire must not silently grant permission; invalid proposals remain rejected attempts.

Near-grade spatial contacts require special care. Existing realization inferred overlap links for floors separated by up to 0.05 m and used near-grade crossing junctions; both exceed the new floor tolerance. Such contacts remain unresolved rather than becoming implicit transitions. Splits of an existing explicit transition may inherit its permission. This applies to `realizedGraph` as well as the planning graph.

The UI preserves the current graph when running. A separate, explicitly named “Reassign starter floors” action applies current seed, verticality, and configured elevations. Coordinate and connection edits validate an owned draft and commit atomically. Invalid edits leave the last valid graph intact and report the reason. Export/import retains both the parameter and edge permissions.

**Preimplementation verdict: sufficient to proceed. No material contract blocker remains under the above clarifications.** This is approval of the testable design, not acceptance of unwritten production code or tests. The final assertions and failure sensitivity need a return review.

## Meaningful domain cases

| Fixture or action | Independent observable expectation |
| --- | --- |
| Verticality -0.01, 1.01, NaN, Infinity; valid 0, intermediate value, 1 | Invalid values reject; valid boundaries preserve their value. |
| Automatic starter, verticality 0, elevations [8, 0, 4] | Every starter node is exactly at 8 m; no inferred need for cross-level links. Re-normalizing the normalized configuration is stable. |
| Automatic starter, fixed seed, verticality 1, elevations [0, 4, 8] | Every assigned floor belongs to the list; every unequal-floor link is explicitly permitted. A chosen fixed seed or small fixed cohort actually exercises multiple floors. No universal floor-count assertion. |
| Change proposal/restart/trace budgets while keeping starter seed and floor settings | Starter assignment is unchanged; scheduling cannot affect its dedicated stream. |
| Supplied graph at arbitrary authored floor 2.5 m, configured floors [0, 4, 8], verticality 0 | Input is preserved exactly and not rejected merely for using an unconfigured floor. Existing surviving nodes retain authored height throughout retained search states. Newly created nodes inherit a source floor. |
| A at 0 m, B at 4 m, unmarked edge; parameterize movement modes | Reject for every mode, including stairs and ladder. The error identifies the connection and missing explicit permission. |
| Same A/B fixture with permission true | Graph validation accepts the permission independently of enabled modes or fit. A disabled ladder or impossible ramp still fails its existing capability/fit expectations. |
| Unmarked A/B at height difference 1e-6 m and 2e-6 m | First accepts, second rejects. Malformed permission values such as string `"true"` cannot authorize a transition. |
| Flat A/B with permission true | Permission remains on round-trip; it is not erased because the current geometry is flat. False/omitted never authorizes unequal floors. |
| Pinned A connected to B/C by locked unmarked directed links; separate permitted transition | A/B/C remain on their authored floor despite incoming-only or disabled links. Entire pinned node and locked edge definitions, including permission, remain exact. |
| Seeded search with regional growth, splits, merges, rewires, component moves, and stacking | Every retained edge crossing the floor tolerance is marked. Every new assigned height is initial/configured rather than an arithmetic intermediate. Same input has identical output under step sizes 1 and a mixed chunk schedule; rejected attempts still count toward the exact budget. |
| High-verticality search on an editable flat input with a permitted escape | At least one retained state actually exercises an elevated assignment. This prevents a trivially inert implementation from satisfying only invariants. Use a bounded fixed fixture rather than a general quota. |
| Two overlapping areas at z=0 and z=0.02 m without a connector | Realization reports unresolved contact and adds no transfer between them. |
| Two crossing flat routes at z=0 and z=0.02 m | Near-grade appearance does not create a shared junction or unmarked cross-floor link. Existing exact-at-grade crossing behavior still joins correctly. |
| A permitted ramp split by an actual same-grade intersection | Any unequal-floor realized segment retains explicit permission; no marker by itself upgrades engine verification. |
| Valid packet with parameter and mixed ordinary/permitted links | Full normalized round-trip is equal, derived metrics/AML are still recomputed, and caller-owned input remains unchanged. |
| Remove permission from a crossing edge only in an intermediate retained frame | Import rejects the corrupted history, even if candidate/config endpoints remain valid. Separately cover candidate graph and initial graph corruption. |
| Packet with previous version | Reject at the version boundary instead of silently adding permission. |

Keep the seeded integration cases modest. Retained-frame invariants establish the public output contract, not coverage of every private operator. Avoid giant golden packets or expectations calculated by the same height helper under test. Exact mode-selection ordering and mutation names are not required unless they are intentionally documented public replay semantics.

## Browser boundary cases

Use a small authored graph, rather than hoping a search happens to expose the desired connection. Put A/B on one floor and C on another, with an explicitly permitted B/C connector. Attempt a Z edit on A while A/B remains unmarked: the status reports failure, configuration and visible Z remain unchanged, and a subsequent valid edit succeeds. Explicitly grant A/B permission, retry the height edit, and verify it commits. Removing permission from the resulting crossing must reject atomically. Selecting an existing marked edge must display its actual checkbox state; changing an unrelated edge field must not silently drop permission.

Set verticality to a distinct intermediate value and keep one flat permitted edge plus one ordinary edge. Run/export/import and verify the parameter and permissions survive. The graph diagram must expose the explicit marker, including on the currently flat permitted edge, rather than infer it from Z or mode. Exercise the named starter reassignment with nondefault seed/floors; an ordinary run must continue from the edited graph. Preserve existing cancellation, stale-worker rejection, native preview, historical dragging, and mobile-width checks.

The current node editor mutates `config.initial` before validation; transactional editing is therefore an actual changed contract, not already covered by connection-editor tests. The current reset ignores current configuration; the reassignment browser case protects the new behavior.

## Existing fixture adjustments and verification

Authored elevated fixtures in `exploration.test.ts` and `exploration-structure.test.ts` must explicitly mark their cross-floor connectors. Do this at fixture construction or intentional elevation transformation so the test states its authoring intent; do not have a generic validation helper automatically bless every mismatch. Keep geometrically failed/unsupported movement cases, because explicit permission must not hide those failures.

Fixtures testing flat behavior should explicitly use verticality 0 or supplied flat input instead of relying on the old implicit default. The historical browser trace should remain hand-authored and flat; its deleted-node test should not become coupled to starter randomness. Preserve the prior unconfigured-floor regression, but make its allowed-height expectation match the new distinction between supplied initial floors and configured generated assignments.

Run `npm run test:explore`, `npm run check`, the exploration production build, and the real production browser flow after wiring is complete. Retain a bounded multi-seed output report demonstrating both flat and layered proposals, with unresolved fit/contact evidence visible. No test should claim that verticality or explicit labels establish playable geometry, useful tactics, balance, or a Nuke-equivalent map.

## First concrete test return

Reviewed the five tests added to `tests/producers/exploration-levels.test.ts` before production changes. They independently exercise declaration/mode separation, flat permitted edges, malformed markers, the floor tolerance, verticality bounds, deterministic starter assignment with a nonzero base, missing transition capability, v0 inheritance, deterministic retained search output, pins/edge locks/input ownership, replay/version rejection, and near-grade route/area contacts in realization.

Two coverage improvements were requested before implementation: use an authored floor outside the configured list in the zero-verticality case, so unwanted snapping cannot pass; and require an actively changed/configured floor in a bounded high-verticality supplied-input search, so a search that never assigns heights after startup cannot pass merely by preserving a layered fixture. Parameterizing all movement modes, independence of starter assignment from budgets, and corrupting a true intermediate frame are additional focused improvements for the final return.

Independent red run: `node --test tests/producers/exploration-levels.test.ts` on prechange production, **0/5 passed**, 0.48 s. Failures show missing declaration rejection, missing verticality validation, a retained ordinary edge spanning floors, old import/version behavior, and a near-grade realized connection spanning floors without permission. The reviewer did not edit tests or production.

## Implementation return review

The domain fixture now assigns the authored upper pair to 2.5 m at verticality zero while configured floors remain [0, 4, 8]. It verifies every surviving authored height and every newly inherited height. The verticality-one run separately requires an actual changed original floor or assignment to 8 m after startup. These close both material coverage requests. Elevated structure/native fixtures now declare their intended transitions at construction or at an intentional elevation change while retaining their prior metric and failed-fit assertions.

Independent focused green run: `node --test tests/producers/exploration-levels.test.ts`, **5/5 passed**, 2.10 s. Domain coverage is sufficient for the scoped contract; the broader suite/type/build/browser evidence is owned by the parent agent.

The first browser return exposed two material false positives. The new floor-packet import reused the same packet and waited for a status that was already ready, allowing assertions before import completed. Require a distinct imported seed and await that committed value. The starter-reassignment fixture spread the expected normalized configuration into its initial state, so its initial graph already matched the expected result and a no-op reset could pass. Construct the starting graph with the old seed and zero verticality, assert it differs from the expected new graph, then edit controls and invoke reassignment. Final browser signoff awaits those fixture corrections and production-browser execution.

Both browser findings are now closed. The import uses `floor-import-confirmed` and waits for that committed seed. Reassignment starts from a separately normalized old-seed, zero-verticality configuration, explicitly asserts the two starting graphs differ, and checks the resulting graph after the action. I inspected the corrected source and the parent-run production browser evidence in `generated/verticality-browser.log` and `generated/exploration-browser/result.json`: passed, no page errors. The parent reports all 29 exploration tests, type checking, and production build passed; my independent execution was the focused 5/5 run above.

**Final test-review verdict: accepted, with no remaining material coverage finding for this scope.** The new domain checks and browser actions establish explicit floor permission, deterministic height exploration, preservation of supplied floors at zero verticality, transactional editing, and replay/reassignment behavior. They do not certify navigation, gameplay quality, or architectural completeness. No production code or test implementation was edited by this reviewer.

## Custom-graph reassignment follow-up

Implementation review identified that replacing an authored A/B/C graph with the four-area starter left its A→C approach referring to deleted nodes. Reassignment now intentionally restores the default entry→key 2/2 approach while preserving other configuration fields. The browser fixture starts from the actual authored three-node graph and custom query, then checks both the new starter graph and the replacement approach after using edited seed/verticality controls. This is a meaningful regression: the prior handler would reject the action, and a no-op action would retain different nodes and query endpoints. The distinct import sentinel remains in place.

The changed test is accepted with no further coverage finding. The updated parent-run `generated/exploration-browser/result.json` reports `customGraphReset: true`, `crossLevelEditor: true`, `verticalityRoundtrip: true`, `passed: true`, and no page errors. No domain rerun was needed for this UI/query reset refinement; the earlier focused domain evidence remains applicable.
