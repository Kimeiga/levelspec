# Reconstruction CLI source budget — preimplementation test review

Reviewer: `/root/cli_budget_test_review`, 2026-11-02. Applied the repository
TypeScript and test-maintenance skills. **Approve the bounded test contract below
before production implementation.** No CLI, compiler, model or production docs
were modified. A different reviewer must assess the final implementation.

## Contract and ownership

Expose the existing `ReconstructionLoopOptions.maxSourceCharacters` through
`--max-source-characters`. Preserve omission as the existing 2,000,000 default;
preserve the existing integer range 1,000 through 10,000,000 inclusive. The CLI
must pass the requested value to the real runner. Do not clamp, round, silently
fall back on invalid input, change geometry/navigation thresholds, or turn a
larger accepted input into an accepted reconstruction.

The current loop counts JavaScript string length, not UTF-8 file bytes. Describe
this as the source character budget, not a byte or triangle limit. This option
controls evaluation admission; it is not a guaranteed preparse memory limit:
the CLI companion capture currently parses source before entering the loop.
That existing ordering does not need a redesign for this narrow option.

Read `tools/reconstruct.ts`, `src/reconstruction/loop.ts`, companion/output helpers,
and the reconstruction output/assets/domain tests. Existing tests cover output
cleanup, source capture before cleanup, ordinary reconstruction validity and
reference gates. They do not verify the CLI forwarding this source-budget option.
New behavior tests are warranted; private `parseArgs` tests or source-text scans
would not establish it.

## Minimal meaningful coverage

Extend an existing reconstruction CLI test file, preferably
`tests/vector-reconstruction-output.test.ts`, with a cohesive budget describe
block. Use the real child-process CLI and public `SceneBuilder`/serializer for a
small valid floor and supported spawn. Keep temporary files isolated and clean
them in `finally`; retain the existing bounded child-process timeout.

1. **Default versus explicit admission, on identical bytes.** Pad valid XML with
   an inert XML comment to exactly 2,000,001 JavaScript characters. With the option
   omitted, require exit 1, a budget diagnostic containing the actual/default
   lengths, `valid:false`, no attempt report, `accepted:false`, and no `best.*`
   geometry export. Run the same source with explicit budget equal to its exact
   length. Require a real attempt report with geometry and navigation passing,
   no source-budget diagnostic, and unchanged archived iteration source. This
   also verifies the inclusive `source.length === limit` boundary. With no
   photographs, the result must remain `accepted:false`, with zero verified views
   and the missing-view issue. A mere different error or non-null output file is
   not proof that the option reached evaluation.
2. **Both valid configuration endpoints.** On the small unpadded source, 1,000
   must be accepted as a configuration and reject the oversized source with the
   ordinary budget diagnostic; 10,000,000 must reach ordinary evaluation. This
   distinguishes configuration validity from model admission and prevents an
   accidentally exclusive bound. These can be parameterized in one test.
3. **Invalid numeric configurations.** Parameterize `999`, `10000001`, `1000.5`,
   `NaN`, and `Infinity`. Require exit 1 and the existing descriptive
   `maxSourceCharacters` range diagnostic, not `Unknown option` or a generic XML
   failure. No best/accepted export may result. Do not require an attempt report:
   invalid configuration throws before the loop. Missing-value handling is already
   shared with other options and needs no duplicate test solely for this flag.

The sufficiently sized run is allowed to create `best.*` artifacts despite
`accepted:false`: the existing CLI exports a geometrically/navigation-valid best
candidate even when source-reference acceptance fails. **Do not mistake those
artifacts for an accepted reconstruction or change that established behavior.**
The no-export assertion belongs to budget-rejected/invalid cases, not to every
case lacking photographs.

## Independent fixture check and validation

I exercised the existing public runner read-only with an 8 × 8 m platform and
supported attacker spawn. Its serialized source was 1,413 characters. With no
photographs and ordinary budget, the actual result was `valid:true`, geometry and
navigation passing, `accepted:false`, zero verified views, and the issue
`Only 0 verified view(s); 1 required.` This establishes a suitable fixture and
the expected distinction between admission, geometry validity and source approval.

Run the changed CLI suite plus existing reconstruction output/assets/domain tests
and the appropriate type check. No browser matrix or new engine geometry fixtures
are required for forwarding an existing public option. Retain the real detailed
model's initial 2 MB rejection, then rerun it with an explicit sufficient bounded
budget; its geometry/navigation/reference diagnostics must remain independently
visible. The actual new CLI tests and implementation are still pending.
