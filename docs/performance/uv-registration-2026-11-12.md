# Keep UV material charts out of spatial stain tracking

The receiver system explicitly rejects UV-space charts when testing spatial
deposits. Nevertheless, it retained these charts in its candidate list, wrapped
their scalar/row samplers, and cloned their lazy raster-key descriptors. Every
later fixture stain scanned them again, only to reject them immediately.

`KitSurfaces.receive` now preserves their chart registration and grouping but
bypasses this unnecessary deposit machinery. In the current demo, **91,438 of
97,815 chart registrations** take that path. Receiver visits made by `deposit`
fall from **1,359,140 to 79,674: 94.1% fewer**. No spatial index is needed to remove
work for surfaces that cannot participate in the operation.

## Observed result

One fresh-process, CPU-profiled pair measured **3.711 s → 3.438 s** for dressing,
an observed **7.35% reduction / 1.079× speedup**. This is not a full-compile timing
or a statistical throughput guarantee. The source includes concurrent visual
updates since the previous face-emission experiment; compare this pair internally,
not its absolute times against that older scene.

| Measure | Before | After |
| --- | ---: | ---: |
| Chart registration calls | 97,815 | 97,815 |
| UV chart registration calls | 91,438 | 91,438 |
| Deposit calls | 55 | 55 |
| Receiver visits inside deposit calls | 1,359,140 | 79,674 |
| Final charts | 96,025 | 96,025 |
| Survey drawings | 0.834 s | 0.894 s |
| Retained building drawings | 1.443 s | 1.195 s |
| Complete dressing | 3.711 s | 3.438 s |
| Process CPU during dressing | 6.590 s | 5.992 s |
| Process high-water RSS immediately after dressing | 1,765,136 KiB | 1,867,392 KiB |

The visit count sums the receiver-list length at each `deposit` call, matching
that method's loop. It excludes matching work done during new/merged receiver
registration. The new path also avoids that registration-side matching for UV
charts, but no separate count is claimed for those savings.

At the end of retained building drawing, tracked receivers fell from 11,776 to
677 for `background-west`, 9,839 to 681 for `background-east`, and 50,388 to 2,924
for `shop-row`. All removed entries were UV charts. These counters precede later
deferred drawing and do not equal the whole-phase registration count. Survey
tracking stays empty. All geometry/attribute counts and deposit counts match.

| Profile location | Self before | Self after | Inclusive before | Inclusive after |
| --- | ---: | ---: | ---: | ---: |
| `KitSurfaces.receive` | 206.6 ms | 29.0 ms | 233.5 ms | 37.1 ms |
| `KitSurfaces.deposit` | 122.9 ms | 5.3 ms | 178.5 ms | 15.7 ms |
| Intersection testing | 55.9 ms | 9.3 ms | 76.3 ms | 18.4 ms |
| `BuildingJob.appendTo` | 168.3 ms | 191.5 ms | 169.7 ms | 192.9 ms |

These are sampled observations; inclusive values overlap. GC self samples rose
from 496.5 to 562.2 ms, and high-water RSS rose too. No whole-process memory
reduction is established. Unchanged survey work also varied. The deterministic
reduction in candidate visits is stronger evidence than assigning every elapsed
millisecond to the edit. Process CPU includes runtime helper threads; procedural
drawing remains in one JavaScript isolate.

## Implementation and preserved behavior

Only `src/dressing/kit-surfaces.ts` changes in production. Group lookup and merging
still use the existing complete key. Grouped UV charts keep the same owned chart,
bounds and sparse triangle-index copies, and remain discoverable for later
patches. Once grouped or registered, UV charts skip spatial receiver tracking,
deposit sampler wrappers and raster-key descriptor wrapping. Their material
charts still reach appearance compilation.

Component contact/joint weathering is intrinsic producer state, separate from
`SurfaceDeposit`. Its lazy raster group/material keys and original samplers remain
live. The fast path must not eagerly spread the raster object or seal these
closures during registration. World-space receivers retain their prior stain
matching, ordered composition, late deposits and reusable-material invalidation.
Existing retargeting still directs later charts to the assembled destination.

This is an algorithmic exclusion of impossible candidates, with no new cache,
spatial index, worker, public option or asset approximation. Texture/shadow
resolution, mesh topology, UVs and material output are unchanged.

## Verification and measurement limits

Both processes use Node 24.12.0 on Apple M4/macOS arm64 and frozen snapshots of
the same current source. A recursive comparison found only `kit-surfaces.ts`
different in production source/tools/projects. Both source fingerprints stayed
stable, and the final edited file matches the optimized snapshot.

The drawing-only driver follows the preceding experiment: native setup registers
library materials and temporarily removes dressing, then restores it and profiles
`applyDressing`. Native setup disables navigation/contact/floor-gap audits because
undressed proxy buildings overlap walls dressing replaces. Dressing validation
and budgets remain active. Timing excludes native setup, image decoding,
rasterization/cache assembly, final binding, navigation, exports, output hashing
and chart sampling. RSS includes setup but excludes subsequent hashing.

Both variants have identical instrumentation: wrappers count chart registrations
and deposit receiver-list visits; draw summaries also count tracked UV receivers.
Instrumentation adds some overhead. No production telemetry or benchmark-specific
branch was introduced.

All recorded equivalence fields match: complete mesh, material definitions and
identities, surfaces, provenance, ground/sign plans, diagnostics and physical mesh
JSON digests; raw Float64 survey buffers; and all 96,025 chart descriptors plus
center/one-column row samples, tint and coverage evaluations. These function
checks are sampled, not proof over every coordinate; JSON hashes do not distinguish
signed zero. This turn does not claim new rendered-image or full-pipeline equality.

The six kit-plan tests, including a new analytic mixed UV/world test, pass against
the frozen original implementation. The optimized focused run passes **26 of 27**
tests. The sole failure is the existing normal-bearing facade reusable-material
eligibility assertion in `surface-reusable-material.test.ts:451`; the same failure
reproduces against the frozen original source. No expectation or budget was
weakened. The new test covers sparse UV grouping, lazy keys using `this.group`,
late intrinsic scalar/row state, deposits before/between/after registration,
unchanged world-space composition and producer/mesh ownership.

Final **`npm run check` passes**. An initial check caught an unrelated in-flight
balcony-test reference to the removed `CutGarment.front` property. After concurrent
work updated that test, a final check passed; this change did not edit it.
Independent test and implementation review are recorded in the companion JSON.
No full-suite or browser/visual acceptance claim is made.

One completed benchmark pair was run. An optional assembly-instrumentation script
had a working-directory path error before modifying the driver; the comparison
therefore uses CPU samples for assembly, not a new assembly wall timer. A baseline
failure-reproduction setup also needed its path corrected; only the completed
assertion reproduction is cited above. Neither setup error adds a timing sample.

## Next decisions

The receiver work targeted here is now small: approximately 37 ms inclusive in
registration and 16 ms in deposit placement. More indexing complexity would have
little demonstrated benefit on this scene. Keep impossible-candidate exclusion
at the semantic boundary rather than adding a general lookup system.

Assembly is about 193 ms inclusive in the after profile, roughly 5.6% of this
dressing interval, and consists mainly of moving owned output into ordered
destination arrays. Avoid a new mesh representation merely to chase this fraction;
any future bulk-copy change must preserve pending pens, lazy charts, offsets and
retryable budget/material failures. No assembly changes were made here.

Mesh accumulation (529 ms self), geometry generation and allocation/GC remain
larger. A distinct positions-only survey output may remove more work than another
small local loop edit, but needs its own coherent contract across kits and direct
ground emitters. Parallel work still needs to account for building imbalance,
transfer cost and the global sign survey. No new worker or Rust rewrite is
justified by the receiver result alone.

Guardrail: a chart needed for material compilation does not automatically need to
be a spatial stain candidate. Preserve lazy producer state when separating those
responsibilities, and verify output as well as work counts.

Machine-readable evidence: [comparison and profiles](uv-registration-2026-11-12.json).
Frozen sources, driver, narrow diff, raw profiles and validation logs remain under
`generated/kowloon-uv-registration-20261112/`.
