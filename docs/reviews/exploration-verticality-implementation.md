# Exploration verticality implementation review

Date: 2026-11-09. Independent implementation review applying
`write-readable-typescript`. This reviewer did not edit production code.

## Scope and outcome

Compared the saved `generated/verticality-review-baseline` with the new floor
helpers, exploration types/configuration/search/metrics/spatial/presentation,
packet boundary, CLI and browser controls. Reviewed the new domain and browser
contracts and the updated exploration documentation.

No remaining material implementation finding. One editor-flow issue raised by
the author during review was confirmed and repaired: replacing a custom graph
with the four-area starter retained queries naming removed nodes. The follow-up
now resets queries to the documented default entry-to-key demand while retaining
seed, verticality, elevations, scalar targets and bounds. Normalization must
succeed before the new graph is installed. The revised browser case begins with
custom A/B/C nodes and an A-to-C query, so it exercises the original failure.

## Contract assessment

- `sameLevel` defines a shared one-micrometer floor-identity tolerance.
  `permitsLevels` requires either that equality or literal `crossLevel: true`.
  Graph validation rejects nonboolean declarations and undeclared transitions;
  mobility alone cannot confer permission. Config/import, capability-filtered
  connectivity, ordinary structural measurements and realization consistently
  apply the rule.
- `verticality` is a validated finite frequency in 0..1, not a promised floor
  count. The starter uses an independent seeded floor stream before declaring
  connections. Zero starts at the first configured elevation; supplied graphs
  retain their authored elevations. Unsupported transition profiles omit
  cross-floor starter connections and leave connectivity deficits visible.
- Height mutation moves the complete weak component of unmarked edges and
  refuses components containing pinned members. Zero verticality retains its
  existing heights. New ordinary connections require a common floor; explicit
  cross-connect and promotion proposals provide a separate operation. Ordinary
  splits inherit their floor and regional interiors clear cross-level permission.
  Whole-region stacking remains gated by verticality and graph validation, so it
  cannot silently promote an unmarked boundary edge.
- Search proposals retain existing clone ownership, lock/anchor validation and
  attempt budgeting. No caller-owned graph is rewritten during normalization or
  search. The new seeded decisions remain independent of worker step size.
- Spatial realization validates the input graph, preserves declarations on
  reconstructed parts, rejects inferred parts that violate floor permission,
  and reports near-grade contacts instead of adding unmarked floor transfers.
  Shared-floor members remain grouped at one elevation. These checks constrain
  the provisional graph; they do not establish movement or navigation proof.
- Node height edits and connection edits validate an owned draft before replacing
  the saved graph. The checkbox and diagram annotations expose the declaration.
  Reset semantics distinguish a freshly assigned starter from exploring the
  current graph and now handle custom query identities coherently.
- The packet schema changes to `exploration-2`. Version 1 is rejected without
  automatically inventing permissions or a compatibility branch. Existing
  derived evidence still recomputes during import. Documentation explains the
  hard cutover and how to intentionally reuse an authored graph.

## Simplicity and ownership

The small `levels.ts` module owns the shared floor predicate, permission check,
sampling rule and transition-mode proposal. It prevents separate validation and
metric interpretations of the same rule without introducing a generic policy
layer. Mutation helpers remain in search, physical interpretation stays in
spatial, and the UI only stages validated changes. Function comments distinguish
proposal permission, capability and physical fit. The implementation stays within
the exploration feature and does not change AML or publication contracts.

## Validation

Independently executed:

- `npm run test:explore`: **29 tests passed**, zero failures.
- `npm run check`: passed, including after the reset follow-up.

Reviewed the expanded browser assertions for transactional height rejection,
cross-level editing, visible declarations, packet round trips and reset from
custom query identities. The author executed the production build/browser checks.
This reviewer inspected `generated/verticality-browser-final.log` and
`generated/exploration-browser/result.json`: the final browser acceptance passed,
including cross-level editing, verticality round trips and custom-graph reset,
with no page errors.

The author also executed paired CLI demonstrations at verticality zero and one,
each with two restarts of 500 proposals. Inspected
`generated/verticality-verification.json`: both version-2 packets replay
identically, retained flat candidates use only 0 m, layered candidates contain
0/4/8 m floors, and the artifact records exploration source hashes. The author
checked the permission invariant throughout retained and realized graphs. These
are bounded demonstrations, not a promise that every seed attains every floor.

## Remaining limits

Cross-level permission is not a capability or geometric-fit certificate. A
declared stairs, ladder, jump or drop proposal can still fail its physical or
engine checks. Zero verticality preserves assigned floors rather than flattening
an authored multilevel map; full verticality may randomly select the same floor.
Incompatible explicit bounds can reject the four-area reset while preserving the
existing graph. Generated interpretations remain premaps requiring further
architectural, gameplay and navigation work.
