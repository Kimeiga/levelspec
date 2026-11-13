# Reduce face-emission allocations

`Pen.face` now computes triangle normals with scalar arithmetic and selects
corners directly. This removes temporary edge vectors, intermediate normal
vectors, the corner-order array, and its mapping callbacks from a frequently
called building-geometry path. The change is confined to that method; it adds
no cache, public option, worker, or material/geometry approximation.

One fresh-process, CPU-profiled comparison observed **5.602 s → 4.393 s** for
procedural dressing: **21.6% less elapsed time / 1.275× speedup in this pair**.
This is a phase measurement, not a full-compile result or a repeatable statistical
estimate. Texture and shadow resolutions are unchanged.

## Measurements

| Work | Before | After |
| --- | ---: | ---: |
| Discarded highest-detail survey drawings | 1.391 s | 0.859 s |
| Retained medium-detail drawings | 2.125 s | 1.498 s |
| Complete dressing, including assembly, signs and other dressing | 5.602 s | 4.393 s |
| Process CPU during dressing | 8.839 s | 7.798 s |
| Process high-water RSS immediately after dressing | 1,765,536 KiB | 2,089,936 KiB |

The RSS measure includes setup/native compilation but excludes later output
hashing. It increased; removing these temporary allocations does **not** establish
a lower whole-process memory footprint. Process CPU includes runtime helper
threads even though procedural drawing runs in one JavaScript isolate.

Selected V8 samples:

| Location | Measure | Before | After |
| --- | --- | ---: | ---: |
| `Pen.face` | inclusive | 1.906 s | 1.017 s |
| `KitMesh.add` | self | 0.727 s | 0.614 s |
| Garbage collection | self | 0.651 s | 0.602 s |
| `BuildingJob.appendTo` | self | 0.401 s | 0.375 s |
| `KitSurfaces.receive` | self | 0.221 s | 0.188 s |
| `WeatheredPen.face` | self | 0.165 s | 0.160 s |

Inclusive samples overlap and must not be summed. Function inlining and sample
attribution can change between implementations; helper-frame reductions alone
are not a precise measure of saved work. GC is globally attributed. Unchanged
code also varies, so the full observed difference is not a guaranteed causal
speedup attributable solely to the edit.

## Preserved contracts

The polygon still emits a triangle fan, transforms points before computing face
normals, and uses the outward hint to choose winding. Cross-product and dot-product
arithmetic retain their evaluation order. Normal sign changes happen before
inverse-length multiplication, preserving signed zero. World triangles with
normal length strictly below `1e-9` are skipped independently; later valid fan
triangles still emit. Default UV projection still chooses its plane from the
first valid local fan and remains independent of outward winding.

Explicit UVs, smooth normals and tint callbacks follow emitted corner order.
Tint callbacks receive original local points once per emitted corner; results
are not memoized. Callbacks still run before collector budget/cancellation checks,
and failure preserves already emitted complete triangles. Caller inputs remain
unchanged and emitted values do not alias caller arrays.

The remaining triangle argument arrays and initial world-point array are retained.
Eliminating every allocation would require a broader collector API change; this
local simplification does not introduce that additional contract.

## Verification and experiment boundaries

Both variants use frozen current source, the same demo AML and benchmark driver,
and separate fresh Node 24.12.0 processes on Apple M4/macOS arm64. Only
`src/dressing/pen.ts` differs in production source. Each variant's source
fingerprint stayed stable. The final workspace implementation matches the
optimized snapshot.

The driver reuses the preceding survey experiment's drawing-only method: register
library materials, temporarily remove dressing, compile native setup, restore
dressing, then time/profile `applyDressing`. Setup disables navigation, contact
and floor-gap postcompile checks because undressed proxy buildings overlap the
walls that dressing replaces. Dressing validation and triangle limits remain
active. The measured interval excludes startup, native compilation, image
decoding, rasterization/cache assembly, final mesh binding, navigation, exports,
output hashing and chart sampling.

Before/after checks match:

- Complete retained mesh, material definitions/identities, surface metadata,
  provenance, ground plans, sign plans, diagnostics and physical mesh JSON digests.
- All three highest-detail survey buffers, hashed as raw Float64 bytes, and all
  per-host triangle, attribute, receiver and deposit counts.
- All 96,246 chart descriptors plus center/one-column row samples, appearance and
  vertex tints, and uniform-coverage evaluations. Function equality is sampled,
  not proven over all coordinates. JSON hashes also do not distinguish signed
  zero; focused analytic tests cover that contract separately.

Four new analytic compiler tests pass against both the original and optimized
implementation. They cover transforms/reflections, winding, normals, UVs, local
callback order and ownership, degeneracy thresholds, partial failure, caps and
cancellation/recovery. These are geometry/compiler contracts, not visual golden
tests. All **19 focused tests** and **`npm run check`** pass. Independent test and
implementation reviews found no blocking issues.

This turn ran one completed drawing comparison. No repeated campaign, full-suite
pass, new full-pipeline timing, raster-image equality or browser/visual acceptance
is claimed. The earlier full-scene appearance-budget failures remain outside this
change; budgets were not enlarged.

## Remaining opportunities and stopping rules

The optimized survey takes about 19.6% of dressing and retained building drawings
34.1%. Mesh writes, surface registration and result assembly remain measurable.
These are the next boundaries to investigate before another cache or language
rewrite:

1. **Receiver work:** count receiver/deposit candidate visits and identify known
   local ownership before proposing an index. Late stains still need receiver
   information; removing registration indiscriminately changes appearance.
2. **Result assembly:** inspect copy counts and ownership. Its roughly 0.375 s
   self samples are a finite opportunity, not a reason to replace the whole mesh
   model. Avoid moving arrays that later sign emission or lazy charts still own.
3. **Survey representation:** a genuine positions-only collector could avoid
   attribute work, but must include direct ground emitters and preserve
   geometry-sensitive appearance decisions. Do not use malformed render meshes
   as a shortcut or silently lower sign-obstruction detail.

Small repeated fixtures such as bolts predominantly call the shared primitives
and weathering path already improved here. `bolt` remains about 0.461 s inclusive
in the optimized profile, overlapping face/mesh/material work. A prefab cache
would have to handle transforms, normal/UV conventions, material identities,
receiver and contact behavior. This evidence does not justify that complexity
yet; no fixture cache or geometry redesign was added.

Keep the serial building-job boundary for future parallel work. Job imbalance,
transfer and assembly costs still need accounting; this experiment does not
update the older full-pipeline parallel speedup model. Prefer measured redundant
work over increasingly specialized micro-optimizations, and reconsider the
pipeline once the remaining local opportunities become small.

Machine-readable evidence: [comparison and profiles](face-emission-2026-11-12.json).
Frozen sources, narrow diff, benchmark driver, raw CPU profiles and validation
logs are retained locally in `generated/kowloon-face-emission-20261112/`.
