# Reconstruction tool limits — independent implementation review

Reviewer: `/root/r11_layout_author`, 2026-11-02. Applied write-readable-typescript
and maintain-tests. This reviewer is different from both preimplementation
reviewers. **Approve the bounded implementation; detailed-model capture completion
and architectural acceptance remain separate.** No production edits were made by
this review.

## CLI source admission

Reviewed the actual `tools/reconstruct.ts` change, public runner validation,
CLI tests and documentation against
[the adopted contract](reconstruction-cli-budget-test-review.md). The optional
argument is forwarded without clamping or changing omission semantics. Existing
runner validation retains integer limits 1,000–10,000,000 and the 2,000,000 default.
Documentation correctly describes JavaScript string length and explicitly avoids
claiming a preparse memory limit. Geometry, navigation and source acceptance gates
are unchanged.

Independently ran:

```
node --test tests/vector-reconstruction-output.test.ts tests/vector-reconstruction-assets.test.ts tests/vector-reconstruction.test.ts
```

All **37 tests passed**. The new real-process cases verify identical oversized XML
with default rejection versus explicit exact-length admission, both configuration
endpoints, five invalid numeric inputs, unchanged archived source and continuing
rejection for missing photographs. These exercise behavior through the public
CLI and complement existing output/companion contracts without implementation-
mirroring parser tests.

Inspected the retained actual E7 runs under
`generated/dai2-daiban/multiview-model-r07/reconstruct-01` and `reconstruct-02`.
The first retains `5605042 > 2000000` and no attempt report. The second evaluates
all three views, remains `valid:false` / `accepted:false`, retains four distinct
strict floor-edge gaps and navigation failure, and reports reverse-view structural
stroke error 7.431007 pixels. Larger admission is not reconstruction acceptance.

Reviewed CLI SHA-256:
`cde45475c03abf86fe43b6b179d7464d7b399b91837257f663e84bd19e7b4c00`.
Reviewed changed test SHA-256:
`d67c9a68901f2cde336cf3187752f13f89f165d62a4914f1125e7f5b8880501c`.
The coordinator also reports the repository type check passing; this review did
not repeat that broad check.

## Capture readiness

Reviewed the current helper against
[the readiness contract](detailed-model-capture-readiness-test-review.md).
The ready/error predicate is unchanged; a compiler error still rejects, and each
view still requires a verified served source before screenshotting. Disk/input
stability, GPU limits, actual canvas dimensions, coverage, and final browser error
checks remain. There is no automatic retry. Successful capture metadata records
`readiness.timeoutMs` and `readiness.elapsedMs` for each view.

The 120,000 ms timeout applies to the readiness wait after navigation; elapsed
metadata starts before navigation, so it includes navigation time. It is not an
overall process deadline. This is compatible with the requested bounded
readiness change. The retained cold-load timing reaches ready at 58,899 ms and
supports moving away from the old 60-second margin.

Independently inspected the saved exercise outcomes and verified their helper
hash equals the current helper: **14/14 integrity scenarios and 44/44 manifest
scenarios pass**, under `capture-integrity/run-ZX23G6` and
`capture-manifest/run-RN5sTk` in `generated/dai2-daiban-review`.
These were coordinator-run browser exercises, not rerun by this reviewer.
Helper SHA-256:
`215bb9206f3c5acae1f3afd95a3c7a66a16b05da687802cd7ec31fedfc84070e`.

An actual new detailed E7 capture is pending at review time. These checks approve
the helper change, not completion of that capture, FPS traversal, or fidelity to
the building. No additional test that merely asserts the timeout constant is
needed.
