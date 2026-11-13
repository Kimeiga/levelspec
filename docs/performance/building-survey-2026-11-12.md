# Remove discarded building-survey work

The building phase contained substantial avoidable work. At medium/low detail,
each building was drawn at highest detail for the sign-obstruction survey, then
drawn again at the requested detail. The first drawing created finish receivers,
deposits and metal-weathering metadata that were discarded. Separately, every
kit triangle allocated temporary arrays to round its attributes and sometimes
wrote its vertex normals twice.

The implemented changes remove those costs while preserving the survey geometry,
retained geometry, material behavior and sign decisions. In one current-source,
CPU-profiled comparison, **dressing took 10.257 s before and 5.867 s after**:
an observed **42.8% reduction / 1.748× speedup for this phase**. This is not an
end-to-end compile speedup claim or a statistical timing estimate.

## What the profile found

The frozen source includes the visual updates present at the start of this work,
unlike the older reference scene used in earlier full-pipeline measurements. The
demo requests medium detail and contains three generated building hosts.

| Drawing work | Before | After |
| --- | ---: | ---: |
| Discarded highest-detail survey drawings | 4.399 s | 1.506 s |
| Retained medium-detail drawings | 3.074 s | 2.252 s |
| Complete dressing phase, including assembly, signs and other dressing | 10.257 s | 5.867 s |
| Process CPU during dressing | 15.967 s | 9.695 s |
| Kit receivers in discarded drawings | 78,259 | 0 |
| Kit deposits in discarded drawings | 30 | 0 |
| Survey triangles | 881,409 | 881,409 |

Before the change, survey drawing consumed **42.9% of dressing time**. Its kit
receiver counts were 14,496 for `background-west`, 11,151 for `background-east`,
and 52,612 for `shop-row`. Direct deck receivers are separate from these counters;
their registration is also now omitted in survey mode.

Selected V8 samples explain the opportunity. Self samples before the change
included 1.419 s in garbage collection, 0.795 s in `KitSurfaces.receive`, 0.787 s
in the shared `triangle` emitter and 0.630 s in `WeatheredPen.face`. `KitMesh.add`
accounted for 2.219 s inclusively, including nested rounding maps and emission.
Afterward, its inclusive samples were 0.861 s and GC self samples 0.673 s.
These are sampling observations; inclusive values overlap and must not be added
together. GC samples need not be attributed to the drawing method that incurred
the allocations.

## What changed

### Survey collection has an explicit purpose

`KitMesh` now distinguishes `render` from `survey`; ordinary callers default to
`render`. Only the discarded highest-detail drawing uses `survey`.

- Survey collectors omit receiver and deposit registration. Actual rendering
  retains the existing collectors, lazy getters, late deposits and cache keys.
- The skin producer stops after emitting the survey geometry, before constructing
  its receiver-specific appearance sampler and metadata.
- Survey metal parts use the ordinary `Pen` primitives without the metal
  appearance adapter's UV projection, contact bookkeeping and finish recipes.
  Timber retains its adapter because timber mapping also subdivides geometry.
- Decks pass `collectAppearance: false` to the shared ground producer so its
  direct registrations are omitted too. Ground material fields and geometry
  decisions remain active.

This deliberately does **not** set texture density to zero, remove material/height
availability, lower detail, simplify geometry, or disable the sign desk. Those
shortcuts can alter topology, clearance or sign emission. Skin subdivision still
uses its original finish conditions. Ground height/water decisions still use
their material fields. The no-op sketch sign desk still prevents signs from
being drawn into their own obstruction survey.

Both purposes still emit complete, finite mesh attributes. Discarded metal UVs,
colors and material assignments need not equal rendered ones, but the surveyed
positions and triangle order do. No malformed positions-only `MeshData` is
introduced. Shared planning, source ordering, sketch and retained triangle caps,
cancellation, and the global sign-survey barrier remain unchanged.

### Triangle attributes are rounded directly into their destination

`KitMesh.add` now writes each corner's rounded position, normal and color directly
to the mesh. It avoids rounded point/color arrays, the temporary flat-normal
array, and the initial flat-normal write followed by smooth-normal overwrites.
This benefits both real and survey generation, including non-building kits.

Rounding remains `Math.round(value * scale) / scale`, at 1e-5 m for positions,
1e-4 for normals and 1e-3 for colors. UVs retain their original precision. Flat and
per-corner normals, negative zero, vertex order, surface/solid ownership, input
immutability, and the existing budget/cancellation checks are preserved.

No new material cache, spatial index, worker pool, public compiler option or Rust
code was needed. Texture and shadow resolutions are unchanged.

## Verification and measurement boundaries

The before/after experiment used separate fresh Node 24.12.0 processes on Apple
M4/macOS arm64. Both variants came from one frozen current-source snapshot; only
the six production files in this change differ. Both fingerprints stayed stable.

The benchmark registers material-library references before temporarily removing
dressing, compiles the native source, restores dressing, then profiles
`applyDressing` directly. Native setup disables postcompile contact/floor audits
because the undressed proxy buildings intentionally overlap the walls that
dressing replaces. Actual dressing validation and budgets remain enabled.
This harness isolates procedural work; it does not claim to execute the complete
compiler acceptance pipeline in the measured interval.

The timer and CPU profile exclude native compilation, material image loading,
rasterization/cache assembly, final mesh binding, navigation and exports. They
also exclude subsequent output hashing and receiver sampling. Process high-water
RSS measured immediately after dressing was 2,221,824 KiB before and 2,280,752 KiB
after; that includes setup/native compilation and does **not** establish a memory
reduction. No claim depends on attributing the whole wall-time change to one edit.

The current-scene differential checks match exactly:

- Complete retained mesh arrays, material definitions and identities, surface
  metadata, provenance, ground plans, sign plans, physical mesh and diagnostics.
- All three highest-detail survey buffers, byte for byte, despite bypassing
  discarded metal appearance work.
- Receiver count and descriptors, including sparse triangle ownership and lazy
  recipe identities. Center samples, one-column row samples, appearance/vertex
  tints and coverage evaluations also match. These sampled function checks are
  not proof over every possible coordinate.

Unlike the preceding job-boundary refactor, **this step changes no retained
identifiers**.

A separate fully cached compile of the older reference scene completed in
**22.297 s**, with all 9,173 artifact reads hitting, zero raster jobs, and exact
render/physical hashes, complete image manifest, diagnostics and sign results
matching the preceding version. This is a full-pipeline compatibility check,
**not a fresh A/B timing comparison**: it uses the older scene to reuse its cached
artifacts. It establishes neither new cold-raster throughput nor a full-compile
speedup. No texture/shadow fidelity trade-off is involved.

Fifteen focused tests and `npm run check` pass. Three new baseline-compatible
tests also pass against the unmodified implementation. Coverage includes an
independent high-detail survey comparison at medium detail and reflected/yawed
low detail, direct deck registration, normal render/deposit behavior, complete
survey attributes, cap/cancellation recovery, and literal rounding expectations.
Existing job and sign-cache tests protect assembly and deferred sign behavior.
Independent preimplementation test review, implementation review and evidence
review approved the change. The four older full-scene integration tests with
appearance-budget failures documented in the previous report were not rerun or
silently given larger budgets.

There was one completed drawing-only before/after pair and one cached full-pipeline
compatibility run. Benchmark preparation failures and an interrupted launch of an
unpatched variant are recorded in the machine-readable report and excluded from
results. No repeated timing campaign, cold benchmark, full-suite pass or browser
acceptance is claimed.

## Remaining building headroom

The after profile still assigns about **2.075 s inclusive samples to `Pen.face`**,
0.861 s to `KitMesh.add`, and 0.963 s to retained metal appearance drawing. These
overlap. Face emission still creates short vectors and per-triangle selection
arrays; scalar normal arithmetic and more direct triangle submission are plausible
next local optimizations. Preserve winding, degeneracy thresholds, arithmetic
order and rounding before claiming they are interchangeable.

Repeated small fixtures also amplify that cost: `bolt` accounts for about 0.700 s
inclusively, mostly through ordinary primitive drawing. A small immutable geometry
template might help later, but must separate placement transforms, normals, UVs,
material identities, receiver registration and contact behavior. This profile is
not justification for a generic prefab cache or large mesh-library rewrite.

Survey drawing is now 1.506 s, about 25.7% of this dressing phase. It still computes
full attributes and uses ordinary geometry-producing finish decisions. A dedicated
position-only output contract could remove more work, but needs to cover direct
ground emitters as well as kits; do not pass incomplete render meshes through
ordinary consumers. Removing the highest-detail survey itself would change
cross-detail sign decisions and requires an intentional algorithm redesign.

Retained `KitSurfaces.receive`, `deposit` and `intersects` also remain measurable.
Late stains genuinely need receiver information. Before adding another spatial
index, count actual receiver/deposit candidate work and look for redundant
registration or known local ownership. The current changes keep that behavior
intact. None of these follow-ups is implemented or assigned a promised speedup.

Future guardrails: benchmark survey and retained draws separately; never replace
geometry-sensitive appearance settings with a global “off” switch; retain the
independent high-detail survey check; use output equality alongside timing; and
separate dressing-only gains from end-to-end compile results.

Machine-readable evidence: [profiles and comparison](building-survey-2026-11-12.json).
Local frozen sources, narrow diff, drivers, profiles, reports and validation logs
are under `generated/kowloon-building-survey-20261112/`.
