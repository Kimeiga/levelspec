# Exploration complexity implementation review

Date: 2026-11-09. Independent implementation review applying
`write-readable-typescript`; production code was not edited by this reviewer.

## Scope and outcome

Reviewed the current exploration types, configuration, structure analysis,
metrics, search mutations, spatial realization and presentation, the browser
controls/evidence, package commands, and the focused structure tests. These files
include pre-existing untracked work, so review used the current contracts and
surrounding code rather than treating every untracked line as a new change.

One material correctness defect was found and repaired during initial review.
The author subsequently found a separate stack-height defect during visual
inspection; its repair received the follow-up review below. The inspected
implementation has no remaining material finding within the agreed
planning-proxy scope. The documentation cutover was reviewed on follow-up; the
broader visual/browser trial remains the author's completion work and is not
certified by this code review.

## Repaired finding: stacked reachability depended on a member's name

The initial stacked-pair calculation tested round-trip access only between each
eligible territory's lexicographically first member. That is stronger than the
declared any-member relationship and made a geometric/topological metric depend
on node names.

An independent counterexample used two directed fork/rejoin regions, with a
returning ordinary connection between later members. Both territories qualified,
but the stack count changed from zero to one after renaming the first region's
initial member from `Lu` to `ZLu`. No position, connection or movement direction
changed.

The repair lazily caches ordinary reachability per member and accepts a stacked
pair when any cross-region member pair is mutually reachable. The focused test
now checks a bidirectional boundary between otherwise directed regions, reverses
node-array order, renames the initial member, and removes the reverse boundary as
a negative case. Inspection of the repair and the passing regression test close
this finding.

## Contract and design assessment

- Journey analysis filters for enabled, width/slope-plausible ordinary movement.
  Degree-two reduction retains query endpoints, complete route geometry,
  original-node witnesses and the widest constituent segment. Parallel reduced
  routes survive. Decisions require geometric separation and progressing exits
  within the stated detour envelope. Tied shortest journeys use the least depth,
  so a favorable path choice cannot hide a direct equal-cost shortcut.
- Territory credit requires a useful same-height group, an internal underlying
  cycle, and distinct arrival/departure member ports reached without using the
  region as the outside approach. Stacked credit adds nominal floor clearance,
  strict XY disk overlap, and ordinary travel in both directions. These remain
  bounded abstract measurements rather than gameplay or occupied-volume proof.
- New stage and whole-region mutations operate on the proposal's owned clone.
  Existing invariant validation continues to preserve pinned nodes, locked edge
  definitions and semantic/query anchors. Rejected/no-op proposals consume the
  unchanged budget. No independent random stream or wall-clock dependency was
  introduced into these mutations.
- Shared floors now use connected local groups constrained by declared region,
  elevation and diameter, with a four-member cap for unlabeled groups. Internal
  connectivity is deliberately replaced by a common transfer hub and metrics
  are recalculated. Unresolved hull-to-hull and hull-to-unrelated-area contacts
  produce explicit diagnostics without inventing certified movement links.
- The configuration, UI controls, candidate captions, diagram region grouping
  and intended-versus-realized evidence use the same new fields. Derived packet
  evidence is recomputed on import. No duplicate old/new API or compatibility
  branch was added.
- The focused `structure.ts` module owns structural measurements; mutation and
  realization concerns remain with their existing owners. Function contracts
  identify the proxy/coordinate boundaries. The bounded graph limits keep the
  simple reachability implementation understandable; no performance claim for
  arbitrary large graphs is made.

## Independent checks

- `npm run test:explore`: 23 tests passed, zero failures.
- `npm run check`: passed.
- Manually traced the directed stacked-pair counterexample and reviewed its
  rename/order/reverse-direction regression after the source correction.
- Reviewed hand-derived staged-fork, tied-shortcut, query-anchor, route-width,
  excessive-detour, unavailable-mobility and local shared-floor contact cases.

The author owns final matrix, native render comparison, browser verification and
documentation updates. This reviewer has not independently claimed those checks.

## Limits that should remain explicit

The algorithm does not establish visibility, sound propagation, utility use,
round behavior, balance or fun. Regional cycles and stacked disk overlap are
planning proxies, not a physical portal reconstruction. The spatial pass can
still collapse intended choices, and unresolved contacts can make inferred
connectivity incomplete. Generated AML remains premap material requiring
authored architectural/gameplay development and physical/navigation inspection.
The current code and browser evidence preserve those distinctions.

## Follow-up: configured stack elevations and controlled comparison

The author reported that stacking a mixed-height group used an offset from its
mean elevation. That translated existing height differences onto a new mean and
could invent floors outside the configured elevation choices. The reported
regression previously failed at proposal 86 with a 12 m floor despite configured
choices of 0, 4 and 8 m.

The inspected correction limits both source and destination stack candidates to
groups of at least three members sharing one nominal floor. It then assigns one
explicit configured destination height to every source member. Ordinary XY-only
region movement can still move mixed-height groups and does not alter their
heights. Pins/locked-edge exclusion, owned proposal mutation, and deterministic
RNG use are preserved. This addresses the height-averaging cause directly rather
than rounding invalid output afterward.

The new output-invariant regression exercises elevated search output and checks
every node in retained trace frames against the configured elevations. The full
focused suite now passes **24 tests**; `npm run check` and
`node --check tools/fps/complexity-comparison.mjs` also pass independently.

Reviewed the comparison script: four seeds each run connectivity-only, staged and
layered target profiles with the same current engine and 2 × 1,200 proposal
budget. Only structural target demands differ within a seed row. It writes a
complete packet per run, retains all candidates' penalties and unmet demands,
reports realization issues and structure, and records hashes for the exploration
TypeScript modules. The HTML explicitly identifies the output as planning
material and the experiment as a same-engine comparison. No claim of historical
engine equivalence, gameplay validation or complete dependency hashing is made.
This reviewer inspected and syntax-checked the script; the author owns its full
twelve-run execution and resulting visual evidence.

The updated `docs/EXPLORATION.md` and `reference/fps-complexity/README.md` describe
the new targets, compound mutations, local floors and remaining proxy limits.
The reference study distinguishes historical layout evidence, current-version
uncertainty, and design inference. No additional material finding remains from
this follow-up review.
