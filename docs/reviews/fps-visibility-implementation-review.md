# FPS visibility audit — independent implementation review

2026-11-08. Reviewer independently read the requirements, applicable TypeScript/test skills, preimplementation test review, the new optical geometry/BVH, audit module, CLI, physical body admission, renderer transparency behavior and16 compiled-fixture/CLI tests. No production implementation edits made by this reviewer.

Current verdict after final recheck: **accepted for the declared sampled static-opaque scope**. The original review required changes; findings and their final dispositions are retained below. Acceptance does not certify competitive balance or complete continuous visibility.

## Consequential findings

### IV-01 — transparent renderer objects can be certified opaque

`tools/fps/visibility-geometry.ts` filters texture/alpha-color strings and dynamic faces, but does not include all transparency sources used by the actual reviewer. `review/scene.ts` makes water, semantic glass objects and material IDs matching `/glass/i` transparent at opacity.48 independently of the color. A material such as `glass-panel` with ordinary `#ffffff` is therefore treated as opaque by the optical audit, while the actual renderer permits a view. The report can remain `complete:true` and claim a protected pair is blocked.

Repair the optical admission policy to disclose those nonopaque/uncertain surfaces consistently. Preserve optical-versus-collision separation. Add a real compiled glass-material regression; tests for invisible colliders and visible noncollidable screens are already good coverage but do not catch this mismatch.

### IV-02 — zero sampled locations can report a complete audit

A real supported floor from XY(.2,.2) to(1.2,1.2), provisional player radius.25/height2 and navigation cell.125 compiles with6 navigation indices. Calling `auditVisibility` with spacing2 and no explicit points returns zero samples and `complete:true`. The same holds for the(.3,.3)..(1.3,1.3) fixture. The CLI diagram then computes extents from an empty list, resulting in nonfinite diagram calculations.

Reject an empty admitted observation domain, or produce an explicitly incomplete/unavailable result and valid empty diagram. Valid configured observation points can provide a domain when the grid misses a small floor. Include a meaningful regression; absence of a visible long ray must not masquerade as coverage.

### IV-03 — ray count is not a complete work bound

`maxPairQueries` bounds actual optical casts. The global pair loop still computes every under-threshold pair without spending that budget. At the admitted maximum50,000 samples, a very high long-distance threshold can require about1.25 billion candidate-distance computations with zero counted queries. Likewise, hold-region/portal/configuration counts are not capped; unsupported portal support lookup scans every admitted navigation triangle before any ray budget is spent, and remaining hold loops continue after query exhaustion.

Bound candidate-pair and configuration/admission work, or cap and reject configurations whose requested work exceeds a documented bound. Keep truncated results explicitly incomplete. Test a high threshold as well as a low ray budget, because a ray-count-only test cannot catch candidate work.

### IV-04 — partial portal evidence is lost

An entry is listed in `visibleEntries` if any sample is visible; blocked samples within that same portal are not retained. Its hidden width/bearings therefore disappear from the report, while an observer can still receive `single-sector-candidate` if all entry IDs have at least one visible sample. The result is a reasonable heuristic for the visible portions, but cannot be read as every configured approach portion fitting the field of view.

Retain per-entry visible/occluded/unsupported counts or an explicit partial-entry list, and state that the angular span covers visible entry samples only. The existing partial-portal test correctly prevents dropping a portal whose midpoint is blocked, but needs to assert preservation of its partial evidence too. Do not turn this into a universal camping verdict.

## Smaller correctness/clarity issues

- A configured point named `grid-0` can collide with a generated grid ID; only the configuration IDs are checked for uniqueness. Reserve the generated namespace or validate resulting sample IDs.
- `samples.maxVisibleDistance` and CLI `maximumVisibleDistance` are maxima among pairs at or above the configured long-distance threshold, because shorter pairs are never cast. Zero/null means no detected qualifying long view, not no visibility. Rename or document this directly at the report contract; no extra short-ray work is needed merely to claim an exact maximum.

## Sound design choices

The new tool leaves compiler collision ray checks and public exports alone. Optical rays use actual visible render triangles, including noncollidable native surfaces; physical/navigation geometry only admits plausible standing locations. The median BVH is a useful performance boundary for repeated segments. Two-sided finite rays exclude obstacles beyond the target. Shared XY upper/lower floors stay separate, and height combinations for protected key pairs supplement the same-height-offset global scan.

Configured hostile entry portals are separate from the 360° visible ray universe. Hidden, unsupported, zero/one-visible or explicitly incomplete approach sets do not receive a universal attention verdict. The minimum covering arc handles wraparound, and vertical angular spread is separately reported with a heuristic limitation. Source/configuration/geometry identity is included in CLI output. No new simulator, engine mechanic or compiler compatibility API is introduced.

## Validation performed

`node --test tests/aml-fps-visibility.test.ts`:16 passed,0 failed on the independently inspected version. This covers real opaque walls/openings, finite rays, low/standing and mixed key heights, physical/render separation, unsupported alpha, shared-XY floors, valid long targets, unsupported points, circular bearings, partial/hidden/unverified entries, offset spawn areas, invalid settings, exhausted ray work, deterministic nonmutation, vertical attention, dynamic surfaces and CLI reports/errors.

The empty-domain reproductions above were additional independent real-compiler probes. Passing the16 existing tests does not close IV-01..04. Recheck production and material test changes before final acceptance.

## Final recheck and disposition

Independently re-read the final three production files,21 tests and `docs/FPS_VISIBILITY.md`, then ran the focused tests and type check. No production code changed by this reviewer.

- **IV-01 closed.** Optical admission now treats water surfaces/layers, semantic glass objects and renderer glass material IDs as uncertain, alongside texture/alpha and dynamic omissions. These omissions prevent an unqualified completed scan. The real compiled `glass-panel` regression verifies that an ordinary opaque color string cannot falsely establish protection through renderer glass.
- **IV-02 closed.** An empty sampled observation domain now throws before report/diagram publication. The reproduced tiny-floor regression is in the suite. A supported explicitly configured observer can supply a legitimate finite domain when a coarse grid misses it; the tool does not invent a floor point.
- **IV-03 closed within supported tool limits.** Global candidate-distance pairs now spend a bounded candidate count even when all optical casts are skipped by a high threshold. Ray count remains bounded separately by the same declared setting, and exhausted scans are explicitly incomplete. Configuration collection sizes and total portal points are capped; hold-region processing stops after exhaustion. The high-threshold regression checks the prior bypass. These are work admission limits, not a claim that every arbitrarily large native map will be inexpensive.
- **IV-04 closed.** Each hold preserves `partialEntries` and per-entry visible/occluded/unsupported sample counts. The test asserts the exact two-visible/one-occluded portal evidence. Report scope and guide explicitly restrict the angular span to visible samples, and retain hidden/unsupported/partial approach uncertainty. No camping verdict or complete camera-frustum proof is inferred.
- **Identity issue closed.** Named observation IDs beginning `grid-` are rejected; the regression also exercises configuration admission limits.
- **Maximum-distance clarity closed.** The sample contract, report scope and guide explain that zero means no detected visible target at/above the threshold, not zero visibility. The global list remains threshold-qualified; short pairs are not needlessly cast to imply a different contract.

Final commands performed by this reviewer:

```sh
node --test tests/aml-fps-visibility.test.ts
npm run check -- --pretty false
```

Result:21 tests passed,0 failed; TypeScript check passed. The CLI incomplete-result regression also verifies retained JSON/SVG evidence, one JSON stdout summary and exit1. Source/config/geometry identity and nonmutation remain tested.

Read-only inspection of the baseline Spillway report confirmed a nonempty complete run within its declared scope:4,411 samples and12,126,906 optical queries, with long-view warnings rather than a map acceptance verdict. Map repairs and spatial/tactical reviewer outcomes are independent of this implementation gate.

Inspected implementation/test SHA-256 identities:

- `tools/fps/visibility-geometry.ts`: `1ed08db66f1c31cc57fafeb644d269c75159f0868b9de94f02305b057d8128b1`
- `tools/fps/visibility.ts`: `18627c9c7293b2ed96cb5eeb240994e782aebee38cbc12fbdecbb008f1d6a686`
- `tools/vector-visibility.ts`: `2dea05cf8195f26f66b400a3b925fa9b47df6bb44e2ec7bc4b224fca648e6a41`
- `tests/aml-fps-visibility.test.ts`: `53c733eaca900529e84eb2f3a7bb1008e70114e952f23426677778c2be89d7fc`
