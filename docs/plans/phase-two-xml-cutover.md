# Phase two: XML-only cutover

Status: implementation complete; browser acceptance blocked by pre-existing UI/test
mismatch. See [validation](../reviews/phase-two-validation.md).

Branch: `codex/xml-cli-harness-next-phase`, main repository checkout.

## Agreed scope

Make XML `.level.svgx` the only authoring format. Retire ASCII and JSON authoring,
old compiler/generators/library and exclusively used assets. Keep a small acceptance
set: existing XML showcase, Dust II, rooftop references and website fixtures.
Runtime/report JSON, bake manifests and configuration remain supported.

## Implementation

1. Inventory dependencies and continuing test guarantees before removal.
2. Extract BSP box geometry into an internal XML exporter helper; preserve independent
   volume/winding expectations in tests, removing legacy mathematical imports.
3. Point package root at XML API; remove generate export and legacy modules. Keep
   XML vector/authoring/export/lighting subpaths. Make npm compile invoke XML build;
   remove superseded compile:vector, generation and migration commands.
4. Remove tracked old-only maps, levels, generators, tools, docs and references.
   Preserve user untracked files and unrelated UI edits; do not claim candidate
   XML conversions are validated supported examples.
5. Align retained typecheck discovery, bounded test concurrency, CI and documentation.
   No deprecated readers/wrappers, release publication, new CLI or UI redesign.

## Acceptance

Independent test review precedes production changes; separate implementation review
follows. Preserve meaningful XML geometry/navigation/export/recovery coverage and
record removed obsolete contracts. Run public root API integration, affected/full
Node suites, site tests, typecheck, both builds, browser matrix and example exports.
Document optional native skips and defects without weakening assertions.

See [retirement ledger](../reviews/phase-two-retirement-ledger.md) and
[test mapping](../reviews/phase-two-test-retirement.md) for implementation evidence.
