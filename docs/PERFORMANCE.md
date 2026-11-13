# Kowloon generation performance

Latest implementation: [positions-only obstruction surveys](performance/position-survey-2026-11-12.md).
Discarded building surveys now collect exact triangle corners separately from
render meshes. Kit, ground and boxed-litter writers share counts/budgets and retain
their original precision. Intermediate numeric attribute storage falls **72.7%**
(21.59 million values → 5.89 million), with matching survey and retained-output
checks. **No timing or whole-process memory improvement is established:** the one
profiled pair took **3.257 s → 4.261 s**, with higher peak RSS; other work also slowed.
The report records this limitation explicitly. Thirty-three targeted tests,
typechecking and independent reviews pass. Texture/shadow resolution is unchanged.

Previous implementation: [exclude UV charts from spatial stain tracking](performance/uv-registration-2026-11-12.md).
UV charts already reject spatial deposits; they now bypass candidate tracking
and deposit wrappers while retaining material registration, grouping and lazy
intrinsic weathering. **91,438 registrations** bypass this work; deposit candidate
visits fall **94.1%**, from 1,359,140 to 79,674. One current-source dressing pair
observed **3.711 s → 3.438 s**, with identical output checks. This is a phase result,
not a full-compile speedup or a comparison with older scenes. Twenty-six focused
tests pass; one existing facade assertion also fails on the original source.
Final typechecking passes. Texture/shadow resolution is unchanged. Assembly is
now a modest fraction of dressing; no new index, cache or worker was introduced.

Previous implementation: [reduce face-emission allocations](performance/face-emission-2026-11-12.md).
Scalar triangle-normal arithmetic and direct corner selection remove temporary
vectors and mapping callbacks from the shared polygon emitter. One CPU-profiled
dressing pair observed **5.602 s → 4.393 s (21.6% less time)** with matching retained
output, survey buffers and sampled chart behavior. This is not a full-compile
speedup claim; process high-water memory increased. Nineteen focused tests,
typechecking and independent reviews pass. Geometry and texture/shadow resolution
are unchanged. The report prioritizes receiver work and assembly investigation
without introducing a prefab cache or further parallel architecture.

Previous implementation: [remove discarded building-survey work](performance/building-survey-2026-11-12.md).
Highest-detail sign surveys no longer collect discarded finish receivers/deposits
or metal appearance metadata; kit triangles round attributes directly into their
output arrays. One current-source, CPU-profiled dressing comparison observed
**10.257 s → 5.867 s (42.8% less time)**, with identical retained output and survey
buffers. This is a phase result, not an end-to-end speedup claim. Survey kit
receivers fell from **78,259 to zero**. A separate cached reference compile
preserved exact render/physical hashes and image manifests. Fifteen focused tests,
typechecking and independent reviews pass; texture/shadow resolution is unchanged.
The report identifies remaining face-emission allocations and repeated small
fixtures without introducing a new cache or parallel architecture.

Previous implementation: [serial building jobs and bounded parallelism](performance/building-jobs-2026-11-12.md).
Buildings now generate owned results and assemble in source order while retaining
shared planning and the global sign survey. One warm pair observed **23.173 s
before and 17.863 s after**; unchanged stages also sped up, so no causal speedup
is established. Mesh buffers, material definitions/bindings, images and sign plans
match; generated identifiers intentionally change. Assembly costs **0.355 s**.
Three intact jobs are dominated by one host: ideal two-lane generation would save
at most **1.459 s** in the documented fixed-duration model, before transfer costs.
Workers and Rust remain deferred. Eleven focused tests, typechecking and independent
reviews pass; four older integration cases already exceeded appearance budgets
before this change.

Previous implementation and pipeline review: [geometry allocations and parallel boundaries](performance/geometry-pipeline-2026-11-12.md).
Triangle emission and preserved-mesh binding avoid temporary arrays; progress
now separates conformance, binding and final seam closure. Output is identical.
One CPU-profiled pair took **17.630 s before and 29.580 s after** while unchanged
decoding/cache stages also roughly doubled: **no overall speedup is established**.
The report distinguishes actual edge-search cost from whole-mesh reconstruction,
outlines building jobs after shared planning, and records eight passing focused
checks, both independent reviews, and two unrelated current typecheck errors.
No new workers, cache machinery, or Rust port were introduced.

Previous implementation: [cache complete sign finishes](performance/sign-material-cache-2026-11-12.md).
The updated frozen scene's remaining **116 raster jobs / 3.52 million
channel-texels drop to zero** on a warm cache, with identical render/physical
hashes and complete image manifests. One before/after comparison observed warm
compilation of **26.595 s versus 17.050 s**; the material stage's share fell from
38.0% to 13.3%. Procedural construction and the combined edge-conformance/mesh-binding
stage accounted for roughly 61% of warm work. Cold generation remains 88.758 s in this experiment. The report
records the explicit artwork keys, constant-tint cleanup, focused checks and
single-comparison limitations.

Previous implementation: [remove unnecessary material-cache work](performance/material-cache-integrity-2026-11-12.md).
Trusted local cache hits now check encoded integrity without reconstructing pixels;
custom caches retain full decoding by default. For the preceding frozen hit set,
this eliminates **26,967 decodes / 77.12 million reconstructed pixels (68%)**.
Redundant storage copies and below-quota inventory sorting are also removed.
The report uses existing stage shares to prioritize further work; no repeated
timing campaign was run. Twelve focused tests and type checking pass.

Previous implementation: [native PNG decoding for Node hosts](performance/png-native-decoder-2026-11-12.md).
CLI commands, demo compilation and replay workers now use native zlib through the
existing pngjs dependency. Browser compilation retains its portable decoder.
Full PNG validation, image ownership, texture dimensions and shadows are preserved.
The report records frozen-scene comparisons, 56 passing focused tests, type checking,
browser compiler-worker bundling and both independent reviews.
Across three fresh warm processes per codec, median PNG decoding fell from
**11.824 s to 5.771 s**, with identical complete output. Whole-compile medians
were **36.143 s versus 36.950 s** under variable load, so these runs do **not**
establish an end-to-end wall-time improvement. The cold native run took 108.434 s.

Supporting research: [PNG decoding and derived-asset pipelines](performance/png-decoding-research-2026-11-12.md).
Separates avoidable finished-artifact validation from necessary source-pixel
decoding, compares engine import/cache practices, and orders lossless optimization
experiments without reducing texture or shadow resolution.
An isolated comparison of 26,964 cached PNGs found median decoding of **7.098 s
with the browser build versus 2.829 s with pngjs's Node entry point**, with exact
decoded pixels. Those isolated measurements motivated the implemented cutover above;
they are not end-to-end build timings.

Previous implementation: [large finished-material artifacts](performance/kowloon-large-materials-2026-11-12.md).
Ground pours, roof decks, native walls, stained/tiled facade maps, painted doors,
frosted glass and tank shells now persist their full finished maps. On the frozen
updated scene, warm missed work drops from **58.39 million to 3.52 million
channel-texels (94%)**, with identical render/physical hashes and complete image
manifests. Warm runs took **101.705 s and 66.324 s**, versus **163.026 s** with the
preceding cache. Machine load is uncontrolled; these are observations, not a
precise causal speedup estimate. All remaining missed jobs are sign faces. PNG
loading/validation and geometry processing now warrant further attention. The
report includes CPU evidence, ownership fixes, and 52 passing focused tests.

Previous implementation: [finished material reuse and persistent artifacts](performance/kowloon-material-library-2026-11-12.md).
The first frozen single-isolate comparison measured **84.516 s baseline, 78.453 s
with an empty material cache, and 67.808 s warm**. These are individual observations
under variable machine load; later repeats were **167.592 s baseline and 97.362 s
warm**, so no precise causal speedup percentage is claimed. The demo now caches finished PBR maps for eligible
facades, components, and pipes; 7,469 hits avoid 15,957,858 channel-texels on the
same-scene warm build. Cold/warm optimized output is identical. Geometry and
source/output texture density are retained; eligible facade weathering intentionally
uses shared periodic variants. Large uncached ground, deck, wall, and stained-skin
maps were the priority addressed by the extension above. The report includes later
repeats, a changed-layout
reuse check, CPU sampling, and correctness/validation evidence.

The [earlier reusable-input experiments](performance/kowloon-fabric-2026-11-12.md)
remain relevant rejected approaches: size-bucketed metal sheets and shared runoff
masks did not establish a useful whole-scene speedup. Reusing finished maps avoids
work that reusing only their procedural inputs did not. Base texture and shadow
resolution remain fixed.

Prior optimization implementation: [November 12 optimization report](performance/kowloon-optimization-2026-11-12.md).
The frozen full-resolution scene measured **244.777 s originally, 76.193 s with
single-thread improvements, and 54.070 s with four total isolates**. A fresh
snapshot of the subsequently updated workspace completed in **55.801 s**. These are
individual fresh-process runs, not medians. Output is identical after the
intentional pipe-runoff algorithm change. Texture and shadow resolution remain
unchanged. The report records CPU/memory costs, rejected experiments, worker
lifecycle contracts and Rust opportunities. **The sub-second target is unmet.**

The [initial November 12 profile](performance/kowloon-2026-11-12.md) explains the
original bottlenecks. Earlier density-reduction proposals are superseded; the user
authorized algorithm and appearance changes while retaining resolution.

Measured November 11, 2026. The target is a demo scene generated in less than one
second. **That target has not been reached.** The structural scene is already
sub-second. The texture cutover below removes adaptive material-region work
from the common Kowloon path; texture baking and scene construction remain. A Rust port should first reduce the work done by one thread, then
parallelize independent units.

## Single-threaded reuse implementation

The next implementation removes repeated field work while retaining the same
scene geometry, texture resolutions and generated appearance. Both independent
reviews passed, the type check passed, and 87 distinct focused core tests passed.
This is not a full repository-suite run.

| Three fresh processes per variant | Baseline median | Optimized median | Baseline range | Optimized range |
| --- | ---: | ---: | ---: | ---: |
| Initial comparison | 10.527 s | 6.991 s | 10.438–11.801 s | 6.931–7.351 s |
| Final verification | 16.406 s | 9.411 s | 10.570–17.220 s | 9.311–10.166 s |

The initial comparison reduced elapsed time by **33.6%**. Later verification was
much more variable, with a 42.6% median reduction. Keep both series rather than
selecting the fastest observation. External machine load was uncontrolled; no
assistant-owned test or benchmark workloads ran concurrently. All twelve runs
completed without diagnostics and produced **identical physical and render
hashes**, including the generated-map identities. Both variants retain 222,915
triangles, 3,402 receivers and 4,037,444 allocated channel-texels. Imports, parsing,
export and browser upload remain excluded; navigation is included.

Other agents changed material and wall-detail code during this task. Both
comparison variants contain the same frozen visual changes. Consequently the
older 9.145-second scene is not the denominator for this optimization. One initial
smoke snapshot mixed a changed tile-field constructor with its old consumer and
failed; that incomplete run is excluded. Source manifests, both timing series and
the profile snapshot are retained under `generated/kowloon-optimizations-20261111/`.
Later edits to the unrelated shop-timber source and asset manifest are outside
these frozen measurements.

Two additional fresh runs per small-change variant measured scheduling alone at
9.852–9.861 s and scheduling plus the sRGB table at 9.575–9.605 s, with identical
output hashes. These are directional observations under the same variable machine
conditions, rather than a precise isolated speedup claim.

Implemented changes are:

- Appearance jobs share an **8 ms cooperative work-slice target** across raster
  groups and preserved mesh copying. Small maps no longer require an initial
  timer round trip. Abort checks remain active between work batches and before
  raster publication. Producer callbacks and synchronous codecs can exceed the
  target, so it is not a hard cancellation-latency guarantee.
- A **256-entry Float64 sRGB table** replaces repeated byte-to-linear powers.
  Output pixels use scalar writes, avoiding temporary color/normal arrays.
- **Three bounded rows share material and bump samples.** Retained values own
  their nested arrays even when callbacks reuse scratch objects. The memory
  budget includes a conservative row-storage charge, shape checks precede
  retention, and iterators close on failure or cancellation. Fixture deposits
  and authored-height rebinding apply equally to scalar and row sampling.
- **Repairs paint their known row spans directly**, preserving rectangle unions,
  campaign overlap order and conservative influence margins. This removes the
  per-texel full repair-list scan without adding a spatial index.
- Facades reuse repair, variation and wall-condition results. Ground ownership
  also supplies normal-only height. Native walls reuse the condition once and
  precompute the existing station formula **once per raster column** when local
  XY is independent of height. Tilted/nonvertical transforms retain full scalar
  station evaluation. This avoids changing miter ownership or guessing a segment.

A separate CPU-profiled optimized run completed in **6.954 s**, with unchanged
source fingerprints and matching output hashes. Its major elapsed stages were
4.006 s rasterization, 0.996 s procedural construction, 0.764 s input decoding,
0.582 s finalization, 0.293 s receiver binding and 0.169 s navigation. Sampling
attributes about 0.006 s to the combined repair functions, 0.883 s to native wall
fields, 0.483 s to PBR sampling, 0.455 s to ground fields and 0.431 s inclusive to
geometry hashing. These categories and inclusive functions overlap where noted;
they are not exact timers or additive savings. In particular, current native wall
fields include new tile-detail work from the concurrent visual changes.

The one-second target remains unmet. Lower-resolution masks with reusable material
detail, scene-buffer construction and image decoding remain substantial work.
Texture density reductions, the ground remnant heuristic, facade topology changes,
new layered runtime materials and Rust parallelism were not implemented here.
The [implementation measurement record](performance/kowloon-2026-11-11-reuse.json)
contains the numbers, manifests, limitations and validation results.

## Profile after texture conversion

Further call-tree and exported-output analysis is recorded in the
[optimization plan](performance/kowloon-optimization-plan-2026-11-11.md).
It prioritizes shared scheduling, one field evaluation per raster coordinate,
direct bounded repair painting, known wall-segment coordinates and reducing
unique material bakes. Native walls account for 58.5% of generated channel-texel
allocation. The plan includes implementation order, core verification and Rust
job boundaries. Its projected work reductions are not measured speedups.

The final texture implementation completed a CPU-profiled full-demo compile in
**9.175 s**, including navigation. Source fingerprints stayed fixed and both
physical and render hashes match the previous three uninstrumented runs. The
record includes the source fingerprint and CPU-profile digest.

| Stage | Elapsed time | Share of compile |
| --- | ---: | ---: |
| Texture composition and encoding | 6.159 s | 67.1% |
| Procedural scene construction | 0.943 s | 10.3% |
| Source-image decoding | 0.685 s | 7.5% |
| Mesh finalization | 0.576 s | 6.3% |
| Receiver mesh binding | 0.506 s | 5.5% |
| Navigation | 0.169 s | 1.8% |
| Remaining setup and validation | 0.138 s | 1.5% |

The progress label “joining receiver edges” covers the receiver-copy phase in
this scene. Preservation mode bypasses adaptive subdivision and its global edge
structures. Stage intervals are elapsed time. The function figures below are
sampling estimates and should be interpreted at that precision.

The next single-thread changes can address repeated work while preserving the
current material output.

1. **Evaluate a facade sample once.** Repair evaluation consumed 0.855 s of
   sampled time. Its callers separately request repair tint, age, coverage and
   bump through `renderPatina`, coating construction, retention and `renderBump`.
   Compute these fields together and reuse a small row window during normal
   derivatives. A cache containing only the most recent point cannot share work
   between the separate row scans.
2. **Use the wall receiver's known station mapping.** Native wall fields consumed
   1.073 s of sampled time. The wall-path station search alone used 0.262 s in
   self samples. Each texel reconstructs a local point, scans path segments and
   requests overlapping condition samples. Precompute the applicable path segment
   or affine station mapping for each receiving region and share the condition
   result. Preserve station breaks at miters and reversed paths.
3. **Batch cooperative yields across maps.** Idle samples accounted for 1.023 s.
   Rasterization yields at the first row of every image and approximately every
   4,096 pixels. A shared elapsed-time budget can reduce timer round trips while
   retaining cancellation and interactive responsiveness. Idle also includes
   asynchronous hashing and other waits, so the entire second is not guaranteed
   recoverable time.
4. **Reduce pixel conversion and allocation.** PBR source sampling consumed
   0.724 s and output pixel encoding 0.358 s. Source color sampling repeatedly
   converts 8-bit sRGB taps to linear values. Decode that representation once per
   source image and reuse numeric buffers for bilinear samples and output pixels.
   PNG encoding itself consumed 0.368 s, below the cost of evaluating the fields.
5. **Reduce whole-scene serialization.** Geometry hashing used 0.424 s including
   descendants, predominantly JSON serialization. Typed-buffer hashing and fewer
   copied vertex arrays are candidates for the Rust representation, with an
   explicit hash-format version if serialized hash inputs change.

These numbers support prioritizing field evaluation and sampling before codec
replacement or navigation changes. Removing the complete 6.159 s raster stage
would still leave about 3.0 s of measured work. Reaching a one-second cold compile
therefore requires reducing per-build output and construction work as well.
Shared repeating material detail plus compact per-surface masks can eliminate
many unique texture bakes. The current scene produces 903 distinct images.
Parallel raster jobs can follow once those single-thread costs are reduced.

The [post-texture profile record](performance/kowloon-2026-11-11-post-textures.json)
contains measured intervals, mutually exclusive sampled categories and function
samples. Full evidence is in `generated/kowloon-profile-followup-20261111/`.
The findings above define the next implementation and benchmark work.

## Texture cutover: retain the receiver, bake the finish

The common Kowloon path now represents ceramic faces, grout, missing tiles,
shallow plaster loss, ground repairs and pigment with color, roughness and normal
maps. It retains the original receiving triangles and normals. Native openings,
building silhouettes, window recesses, macro pavement relief, manholes and loose
props remain geometry. The old wall-tile contour builder and its three dedicated
union tests were removed with that representation; generic geometry algorithms
and explicit finite-depth compiler tests remain.

`SurfaceRasterSettings.geometry = "preserve"` normalizes source layer weights into
one PBR map set. It bypasses region subdivision and, when no geometric receivers
remain, avoids constructing edge and junction structures. Shared vertices keep
separate UVs when their chart projections differ. Preserved faces still contribute
to closing the edge of an adjacent explicitly displaced surface.

This is an explicit contract: geometric sample heights, finite plate offsets and
authored height textures are rejected in preservation mode. Recipes with authored
height textures retain the existing geometric path. Source materials/images stay
unchanged; composed materials own their baked factors. Different effective source
emissions and emissive coatings are rejected until emission composition exists.

The whole-demo texture allocation initially exceeded the existing 4 Mi-texel
medium-detail limit. Default broad facade maps now use 12 texels/m, pavement 16,
tile patches and native wall maps 32; an explicitly requested building density is still honored.
The limit was not raised. These maps resample source grain, so close-up quality
is limited by those resolutions. They intentionally trade sub-centimeter mesh
contours for normal shading. The next quality/performance step is shared repeating
detail maps plus compact masks, avoiding a unique high-resolution bake for every
surface. Full baked maps are a useful intermediate representation, not the final
answer to a one-second city.

Final frozen measurements (Node 24.12.0, Apple M4) were:

| Workload | Previous geometry path | Texture path |
| --- | ---: | ---: |
| Complete 1 m² tile fixture, median of five fresh processes | 1.293 s | 0.046 s |
| Tile fixture render triangles | 8,466 | 142 |
| Complete demo including navigation | Cancelled after 30.002 s | 9.145 s median |

The fixture is **28.4× faster** (96.5% less time), with the same physical hash.
Each variant reproduced its own render hash in every run. Full-demo times were
9.115–9.232 s over three runs, all without diagnostics and with matching
physical/render hashes. The previous frozen demo spent 29.2 s in dressing before
its 30 s cancellation; that incomplete run is not an exact speedup denominator.
These timings exclude process/import startup, parsing, export and browser upload.
No assistant-owned workloads ran concurrently; external machine load was uncontrolled.
The final demo has 222,915 triangles and 3,402 appearance receivers, with
4,037,444 generated channel-texels and 4.08 MiB encoded map data.

Point sampling initially missed every grout line in an aligned low-resolution
tile fixture. An analytic periodic box filter now preserves the nominal grout
area instead of raising all texture resolutions. Tile patches use 32 texels/m;
other pavement uses 16. The footprint is nominal `1/density`; rounded image
dimensions can make actual texels slightly smaller. Manual paired renders confirm
the grid remains visible, although fine contours are softer than explicit geometry.
The full exported demo was rendered in a real browser without errors. These
renders are inspection evidence, not golden tests. The full city remains above
the one-second target; texture composition, repeated patina evaluation, image
encoding and scene assembly now deserve the next profile.

The completed comparison and full-demo measurements are recorded in
[the texture measurement record](performance/kowloon-2026-11-11-textures.json).
The maintained one-square-meter input is
[`texture-performance.aml`](../tests/fixtures/aml/texture-performance.aml).

The type check and 93 distinct focused core cases passed across completed runs.
Independent test and implementation reviews were completed. Validation covers real holed receivers, actual material bindings and UVs,
analytically derived color/normal blends, mixed displaced/preserved edge closure,
authored-height rejection, source-linked errors, cancellation and atomic recovery.
Selected ground/wall checks cover water support, source/collision isolation and
GLB export. The broad producer batch was stopped after more than two minutes in
a large building-shell fixture; it is not a complete suite pass.

## Follow-up: eliminate material work before indexing it

The November 11 follow-up implements a deliberately slimmer material contract.
The user authorized approximate visual equivalence and a coming material rewrite.
The earlier exact-output comparisons below apply only to their original variants.

- **Removed generic contact-grime searches.** `weatherColor` now produces broad
  seeded mottling without any geometry input. A trial nearest-segment BVH was
  discarded rather than shipped. Wall-specific base dampness/runoff and ground
  wetness remain. Finite contacts still serve ground planning, passage widths and
  low-frequency litter placement; those are separate from pigment evaluation.
- **Removed impossible ground layers.** A plain pour no longer resolves or samples
  unused asphalt, grout and substrate. The layer list remains stable for each
  recipe and preserves the ordering of material IDs and finite elevations.
- **Separated ground pigment from geometry.** `GroundSurfaceField.sample` provides
  ownership and height. Its tint is evaluated through `SurfaceChart.appearanceTint`
  only at final render vertices, or at texels when using the existing raster path.
  Non-raster tint is interpolated on the resolved mesh and no longer asks for
  extra triangles. Existing explicit adaptive layer tint remains supported for
  callers that need it. Raster pigment is composed once, including coatings.

Five fresh processes per variant were alternated on the frozen demo source,
without CPU profiling or concurrent assistant-owned test/benchmark jobs:

| Completed receiver experiment | Previous implementation | Slim materials + deferred pigment |
| --- | ---: | ---: |
| Median compile | 6.916 s | 4.649 s |
| Minimum–maximum | 6.835–7.252 s | 4.634–4.719 s |
| Partition field samples | 428,777 | 424,481 |
| Partition nodes | 114,536 | 112,126 |
| Render triangles in isolated context | 32,401 | 32,089 |

This is a **32.8% reduction**, not a full-city speedup. The workload compiles the
native demo context and courtyard dressing, but finishes only its first 1 m²
receiver (90 initial triangles). Other courtyard receivers remain unprocessed.
Excluded building proxies are removed, native physical walls remain, navigation
is disabled, and the triangle budget is six million. Source reading/parsing,
process/import startup, export and browser upload are excluded. All ten runs
completed without diagnostics, retained the same physical hash, and reproduced
their own variant's render hash. Render hashes differ between variants as intended.
The machine's external workloads were not controlled.

The [material measurement record](performance/kowloon-2026-11-11-materials.json)
contains individual timings, hashes, work counts, environment and the full-scene
profile. Frozen sources, diagnostic harness, manifests, GLBs, paired browser
renders and logs are in `generated/kowloon-algorithms-20261111/`. The diagnostic
receiver harness temporarily selects one registered chart immediately before
appearance compilation; this hook is confined to those snapshots, not production.
Use the supported `profile:dressing --host courtyard` command for a whole-host run.

The complete frozen demo still did **not** finish: a fresh CPU-profiled run was
cancelled at 120.009 s during subdivision. Dressing took 26.852 s, then appearance
began processing 14,727 registered receivers; the last coarse progress marker was
10,312/14,727 at 92.757 s. Source fingerprints remained unchanged. This is partial
evidence, not a new end-to-end timing, and differences from earlier contended
profiles do not establish an additional whole-demo speedup.

### The remaining algorithm problem and texture direction

Removing tint work barely reduced the receiver's sample count (about 1%). Its
remaining 424,481 probes rediscover material boundaries and relief. In the new
120 s profile, field lookup/validation consumed 22.80 s sampled self time,
coordinate projection 7.60 s, barycentric work 7.57 s, tile perimeter reconstruction
9.75 s, and garbage collection 5.65 s. A faster nearest-contact index cannot solve
this work amplification.

For the material rewrite, use shared textures and normal/roughness maps for tile
faces, grout, shallow chips, dirt and small missing-tile patterns. Keep geometry
for actual openings, silhouettes, large exposed thickness and detached pieces.
Normal maps suggest surface relief but do not change silhouettes or real holes.
Prefer a reusable material atlas plus a bounded mask over a unique large bake for
every receiver. Enabling today's raster setting alone is insufficient: it still
keeps geometric layer ownership and subdivision. A texture-first recipe must
actually stop requesting those geometric material regions.

This representation change is the next substantial step toward one second.
At this earlier stage it was not implemented or benchmarked. The texture
cutover above now implements that separation for the common Kowloon recipes. For Rust, keep immutable placement/material plans and emit bounded
per-host buffers before adding worker parallelism. Removing unnecessary regions
and samples matters more than distributing them across threads.

### Experimental visuals are not test contracts

At the user's request, 36 art-policy tests were removed and mixed suites were
trimmed; the [retirement inventory](performance/kowloon-retired-visual-tests.json)
records the cases and surviving coverage. There are no new visual goldens for
mottling, chip distribution, dirt placement, palette diversity, or fixed shallow
mesh depths. Manual exploratory renders remain useful evidence, not locked CI art.

Retained checks cover authored inputs/materials, valid coverage and winding,
nonintersection/support, collision isolation, deterministic transforms, UV and
atlas bounds, compositing/export math, configured budgets, and atomic failure and
recovery. Explicit finite-layer compiler tests still verify a requested geometric
layer correctly; recipe tests do not require tiles or cracks to use that form.
Unused visual helper code was removed with the retired tests.

Before pruning, a painted-patina formula assertion and a fixed-seed requirement
for a particular puddle both failed identically in the frozen baseline. Their art
constraints were intentionally retired; this work does not claim to have fixed
those old appearance expectations. A large tiled-ground recipe check was stopped
after exceeding two minutes; it is not counted as a passing check.

### Follow-up validation

The final type check (`npm run check`) passed. The focused surface/tool/material
batch passed 100 cases; its two old entrance probes were replaced by checks of
actual generated map bindings and local material bounds. The final entrance,
bag, timber and grocer batch passed all 51 cases, and the revised ground
footprint/support and arithmetic wall-containment cases passed separately
(153 distinct passing cases in total).
Door transforms compare material bounds within the kit's 10 μm coordinate grid,
not identical adaptive triangle counts. Independent test-design and implementation
reviews checked the contract changes and pruning. The complete wall-planning
suite was stopped after more than two minutes in its first compile, so its
remaining cases are unverified. No full repository suite or completed whole-demo
generation is claimed.

## Evidence and scope

Measurements used Node 24.12.0 on an Apple M4, macOS arm64. Other agents were
editing the working tree, so the original source, demo assets, and tests were
copied to `generated/kowloon-performance-20261111/baseline/`. The `optimized/`
variant applies only the noise-cache change; `lazy-subdivision/` additionally
defers acceptance checks. The scalar seam comparison calls the frozen original
and the revised function directly. Each experiment identifies its own scope.
Dependencies were shared with the workspace. The machine was not otherwise idle;
these are diagnostic measurements, not isolated hardware performance guarantees.

The compact [measurement record](performance/kowloon-2026-11-11.json) retains
timings, CPU summaries, source identity, and output hashes. Full CPU profiles,
logs, and source snapshots remain under the ignored `generated/` directory.
The record's `baselineManifestSha256` identifies the original per-file manifest;
diagnostic progress markers were subsequently added to the frozen compiler.

All durations below measure compilation after source reading/parsing, unless
explicitly identified as a stage. They exclude process startup, dependency
loading, GLB/glTF export, ZIP compression, browser loading, and GPU upload. CPU
profiling adds overhead. A cancelled run is partial evidence, never a completed
scene benchmark. The reported hour-long build was not reproduced end to end.

| Run | Result |
| --- | --- |
| Structural Blockout, CPU profiling enabled | Complete in 0.289 s, including navigation; 1,388 triangles. |
| Original full Kowloon, 90 s cooperative deadline | Cancellation delivered at 103.519 s. Dressing finished at 103.253 s; appearance had not run. |
| Original full Kowloon, 300 s deadline, CPU profiling enabled | Cancelled at 300.182 s during receiver subdivision. Dressing took 130.105 s in this run. |
| Geometry at the end of dressing in the 300 s run | 979,915 triangles, followed by 14,727 appearance receivers; zero raster appearance receivers. |
| Appearance preparation in that run | About 1.30 s between dressing completion and receiver subdivision. |
| Receiver subdivision in that run | At least 167.7 s; reached the 10,312/14,727 progress marker. Edge joining, final emission, audits, navigation, and exports had not been reached. |
| Noise-cache-only full run, 600 s deadline, CPU profiling enabled | Dressing finished at 60.499 s with the same 979,915 pre-appearance triangles. Cancelled at 600.071 s during subdivision; last progress marker was 10,312/14,727 at 233.047 s. This variant predates the lazy-check and scalar-distance fixes. |

The ten-minute run confirms that accelerating tile dressing alone leaves a large
surface-generation problem. Its later sample identifies ground surface sampling,
contact weathering, and region containment as active work. Coarse progress markers
do not establish which individual receiver consumed the remaining interval.

The progress marker names an interval's beginning. Its elapsed duration includes
all work until the next marker, not necessarily just the named function. The
original "Resolving face materials" interval also contained all dressing work;
the compiler now reports dressing and finalization separately, and separates
appearance validation, image decode, height normals, and rasterization.

## Measured bottlenecks

### Repeated ceramic erosion and lattice hashing

[`wall-tiles.ts`](../src/dressing/wall-tiles.ts) recursively refines uncertain tile
erosion to 3 mm cells, locates crossings to 20 micrometers, reconstructs the union
boundary, simplifies its contour, triangulates it, clips it to receiving faces,
and reconstructs a perimeter again for fracture sides. Small final meshes can
therefore require much larger intermediate meshes and many field evaluations.

The existing wall noise uses four sine-based lattice hashes per evaluation.
Neighboring erosion probes repeatedly calculate the same corner values. In the
300 s profile, the lattice hash alone accounted for 38.94 s of sampled self time;
`tilePerimeter` accounted for 28.13 s. An independent five-second sample during
dressing attributed about 1.71 s to hashing and 1.44 s to perimeter reconstruction.
These are sampled costs, not exact exclusive timers for complete stages.

**Implemented:** [`finish/wall-noise.ts`](../src/dressing/finish/wall-noise.ts)
now owns this noise family. Each tile erosion channel owns a sampler that caches
only the four corners of its last lattice cell. The seed, sine hash, evaluation
order, erosion thresholds, and mesh detail stay the same. Cache memory is
constant and independent between channels. Ground erosion uses the relocated
stateless function and retains its existing behavior.

A frozen [2 m × 1.5 m worn wall](../tests/fixtures/aml/performance-tiled-wall.aml)
comparison produced 7,318 triangles in both cases:

| Measurement | Original | Cached noise |
| --- | ---: | ---: |
| Parse and compile through dressing, excluding output hashing | 2.016 s | 1.532 s |
| Dressing interval alone | 1.975 s | 1.487 s |

This first pair is a 24.7% reduction in the dressing interval, not a whole-demo
speedup claim. The pre-appearance render mesh, surface records, and physical mesh had
identical SHA-256 values; diagnostics were empty. Numeric tests also cover cell
crossings, negative coordinates, fractional seeds, revisits, and interleaved
samplers. The raw hashes are in the measurement record.

After the long profiling/validation jobs finished, five additional runs per
variant were alternated sequentially without CPU profiling. Median dressing time
was **0.894 s original versus 0.608 s cached**, a **32.0% reduction** on this fixture.
Ranges were 0.688–0.997 s and 0.455–0.682 s respectively. All ten runs retained the
same geometry hashes. The difference from the first pair illustrates why one
contended timing should not be treated as a stable performance estimate.

### Adaptive surface discovery repeats expensive work

[`surface/regions.ts`](../src/dressing/surface/regions.ts) discovers material
boundaries through recursive triangle subdivision. Each node probes corners,
midpoints, and centers; checks interpolation and containment; recursively builds
children; then attempts to merge their results. The cost depends on the
intermediate search, not just the final triangle count.

Sampled self time across the incomplete 300 s run:

| File or activity | Sampled time | Share of sampled interval |
| --- | ---: | ---: |
| `surface/regions.ts` | 100.02 s | 33.3% |
| `wall-tiles.ts` | 56.60 s | 18.8% |
| `wall-finish.ts`, including the original noise | 54.33 s | 18.1% |
| `seams.ts` | 24.90 s | 8.3% |
| Garbage collection | 12.30 s | 4.1% |
| Idle | 13.13 s | 4.4% |

Within subdivision, `Field.local` accounted for 36.65 s, coordinate projection
14.51 s, barycentric calculations 12.29 s, and point-in-region checks 10.35 s.
These function times overlap the file totals and must not be added to them.
The field cache builds string coordinate keys and clears its entire cache at
65,536 entries. Later mesh emission constructs another field and resamples.

An independent run of the existing construction-cut fixture provides a useful
algorithm comparison: explicit construction hints used 61,741 field samples and
1.19 s of appearance work, versus 1,041,143 samples and 19.27 s for adaptive
discovery. Output triangle counts were 3,518 and 13,632 respectively. This is a
small fixture comparison, not a prediction of demo speedup; both methods must
continue to satisfy its independent coverage and geometry assertions.

**Implemented:** acceptance checks now run only when cheap scale and variation
conditions permit accepting the current cell. Large cells that must subdivide
no longer pay for attribute interpolation and point-in-region tests at that stage.
Child coalescing, contour accuracy, finite-layer depth, and material/UV rules remain
unchanged. Field sampling order and budget consumption may change. The existing
construction fixture retained its 3,518/13,632 output triangle counts; an initial
contended experiment took 11.31 s for adaptive discovery versus 19.27 s in the
earlier baseline. This is preliminary evidence, not an isolated speedup estimate.
A separate curved two-material receiver with finite coat thickness produced an
identical final appearance mesh and surface-record hash before and after the
change: 54 triangles and 19,939 field samples. Existing tests cover additional
off-lattice islands, height envelopes, tapered finite layers, microscopic
multi-material junctions, and cancellation/recovery.

**Next single-thread work:** retain construction boundaries and reusable field
values through planning and emission; use conservative coverage proofs to avoid
exploring uniform regions; measure samples, nodes, cache hits, and temporary
cells by receiver. Preserve actual fracture boundaries, holes, and displacement
tolerances. Raising sample or triangle budgets is not an optimization.

### Weathering recomputes contact-segment data

The original [`seamDistance`](../src/dressing/seams.ts) reconstructed a segment's
direction and squared length using temporary arrays for every query. Weathering repeated these
queries at the surface samples above. Its function alone consumed 17.22 s of
sampled time in the partial profile.

**Implemented:** distance calculations use scalars without temporary arrays,
preserving the original arithmetic order and finite endpoint clamp. There is no
new cache over caller-owned mutable segments. A later six-second ground-appearance
sample attributed 22.2% to `seamDistance` itself and another 11.8% to its array
callbacks, so this addresses measured repeated work.
An exact same-runtime comparison of 100,000 point/segment queries matched the
original, and the finite-door contact-weathering test passed.
In the longer noise-cache-only profile, the original distance function and its
array callbacks accounted for about 172 s of sampled self time combined (28.7%
of that 600 s interval). That run does not measure the revised scalar function.

**Superseded for generic pigment:** the follow-up above removes those contact
queries entirely. Only index immutable segment data if a remaining planning
consumer demonstrates a measurable need. Preserve finite segments and doorway
gaps wherever those contacts represent actual spatial constraints.

### Scheduling, edge joining, and delivery need separate treatment

Subdivision yields with `setTimeout(0)` once per non-UV receiver and every 1,024
subdivision nodes. Thousands of timer round trips have a real cost: zero is not
an immediate yield. The profile measured 13.13 s idle but does not establish
that every idle sample came from those timers. A time-budgeted cooperative yield
policy can reduce round trips while preserving cancellation responsiveness.
Conversely, synchronous dressing delayed the 90 s cancellation until 103 s;
polling an AbortSignal alone cannot service a timer on the blocked thread.

[`ReceiverEdges`](../src/dressing/surface/conform.ts) constructs a global 5 cm
spatial index over input and refined vertices. Each edge walks nearby cells and
their 27-cell neighborhoods. The finishing pass then builds junction records and
copies retained geometry. These are **code-inspection candidates**, not measured
dominant costs in the original 300 s run, which stopped before them. Profile the
joining/emission interval before choosing its replacement. An adjacency-based
approach must retain T-junction correctness and cross-receiver boundaries.

The demo builder additionally validates, exports GLB and glTF, serializes preview
and runtime JSON, rereads exported files, and creates a ZIP. Those costs were not
measured by the compile profiles. They should have their own benchmark, separate
from time to usable scene. Large output buffers and repeated serialization can
remain expensive after geometry generation improves.

## Algorithm replacements worth prototyping

Visual style and effects may remain approximately equivalent without requiring
the same triangulation. This permits larger changes than the conservative fixes
above. Evaluate these on frozen paired renders before adoption:

1. **Extract damage contours directly.** Use a bounded 2D field grid, conservative
   coarse rejection, and contour tracing around uncertain bands. Triangulate
   retained regions once, preserving islands and holes. The current tile path
   constructs many interior cells and then cancels their edges to recover a
   boundary it could have generated directly. Keep explicit construction cuts
   and geometric fracture rims. Grid pitch must follow the visible error target;
   a uniformly fine grid over the entire city would repeat the existing mistake.
2. **Separate finish signals.** Keep geometry for holes, chipped silhouettes,
   displacement, and real thickness. Put pigment mottling, dampness, roughness,
   and fine relief into shared material maps or runtime shader fields. This can
   remove color-driven subdivision and repeated contact queries while retaining
   the visual effect. Texture memory, export portability, and close-view quality
   need acceptance criteria; the current raster path is not yet a proven solution
   for the full demo.
3. **Reuse a varied tile/fixture library.** Precompute a bounded set of chipped
   ceramic forms and instance them with seeded selection, orientation, and tint.
   Keep placement and broad loss spatially correlated so the wall does not become
   random confetti. This trades exact unique erosion for approximately equivalent
   style and may support a much smaller scene-generation budget. Measure visible
   repetition and export behavior before selecting a library size.
4. **Construct adjacency with geometry.** Emit canonical shared edge identities
   during subdivision instead of finding collinear neighbors in a global vertex
   cloud afterward. This is a data-model change; test translated/rotated receivers,
   T-junctions, concave corners, and coincident but unrelated hosts.

Direct contour extraction, reusable tile libraries, and constructed adjacency remain
proposals. The follow-up above implements the first separation of ground pigment
from geometry refinement; it does not yet replace tile geometry with textures.
Benchmark one-thread work and visual quality together. Do not attribute a speedup
to an algorithm if it merely dropped the requested effect.

## Organization and repeatable measurements

`tools/build-dressing-demo.ts` remains the publication orchestrator. Its helpers
now separate preset preparation, cache identity, and portable packaging under
[`tools/dressing-demo/`](../tools/dressing-demo/). Staging, validation, and rollback
stay in the orchestrator. Cache identity includes extracted build helpers, but
excludes profiling-only code. Visual recipes were not reorganized while the other
agents were editing them.

Run one benchmark at a time. Use separate output directories for comparisons:

```sh
npm run --silent profile:dressing -- --preset blockout --out generated/perf/blockout
npm run --silent profile:dressing -- --seconds 600 --cpu --out generated/perf/kowloon
npm run --silent profile:dressing -- --host courtyard.e0 --seconds 120 --cpu --out generated/perf/wall
```

The command does not publish or overwrite demo presets. `--source` selects another
AML file. `--host` isolates one dressing rule, omits span recipes, and removes
visual building proxies whose recipes were excluded. Native physical boundaries
and unrelated visual objects remain. It changes context and is a diagnostic
experiment, not an additive estimate of each host's share. `--seconds` is a cooperative deadline,
not a hard process timeout. CPU profiles are readable in Chrome DevTools.

`report.json` records milliseconds, stage intervals, diagnostics, triangle and
vertex counts on completion, source and compiler fingerprints, environment,
optional CPU summaries, and `completed`, `failed`, or `cancelled` status. Non-complete
runs exit with code 1. A changed source fingerprint invalidates comparisons.
Reusing an output directory without `--cpu` removes the previous CPU profile.
Record CPU-enabled runs as instrumented; use uninstrumented repeated runs for
speed comparisons. Report median and spread instead of selecting the best run.

## Rust and later parallel execution

First establish comparable **one-thread** baselines and operation counts. Rust
can reduce allocation and dispatch costs, but porting millions of unnecessary
probes preserves the primary algorithm problem. Keep separate targets for
source-to-usable geometry, full validation, artifact packaging, cached loading,
and browser upload. No completed decorated-scene result yet establishes that the
current representation can meet a one-second cold-generation budget.

Useful future ownership boundaries:

| Work | Parallel unit after planning | Coordination needed |
| --- | --- | --- |
| Tile erosion | Logical tile or wall-run chunk | Immutable run seed/grid, stable tile ordering, host clipping, bounded output buffers. |
| Appearance subdivision | Receiver or connected receiver group | Read-only fields/materials; return local regions and boundary records. |
| Raster composition | Unique raster group | Decode each source once; deduplicate group signatures and generated images. |
| Building parts | Planned facade/lot | Freeze massing, obstacles, support, and sign reservations before workers emit geometry. |
| Edge reconciliation | Connected physical/surface component | Reconcile shared boundaries and assign deterministic final indices. |
| Export formats | Independent outputs after finalized geometry | Shared immutable buffers; bound peak memory and avoid duplicate conversions. |

Current writers append to shared meshes, material lists, surface IDs, and chart
registries. Replace that ownership with worker-local outputs and deterministic
assembly, rather than a lock around every append. Keep caches worker-local and
bounded. Reserve work/memory budgets at job granularity; a global atomic increment
on every sample can become the next bottleneck. Cancellation must interrupt work
at useful chunk boundaries and leave the previous published scene intact.

Spans and some fixture placement are order-dependent: each placement tests
previously accepted geometry. They are not automatically independent jobs. Plan
and freeze decisions, or retain a deterministic sequential acceptance phase.
The TypeScript sine hash also needs an explicit cross-language numerical policy:
Rust floating-point precision, transcendental functions, and reassociation may
change seeded contours. Preserve reference outputs or deliberately version the
generator when changing those rules.

## Guardrails for future changes

- Track field samples, subdivision nodes, temporary cells, final triangles,
  generated texels/bytes, and peak memory alongside time. A compact output can
  hide a large construction cost.
- Preserve construction information instead of rediscovering it from triangles.
  Cache invariant work at the owner with the correct seed and coordinate space.
- Treat pigment, roughness, and normal detail separately from silhouette and
  actual fracture geometry. Rasterization or shaders may carry fine material
  variation, but require visual validation and explicit budget/quality decisions;
  simply enabling texture-density is not a proven drop-in optimization here.
- Do not silently lower detail, remove weathering, weaken geometry assertions,
  or increase budgets to make a performance test pass.
- Test topology, holes, finite contacts, collision isolation, deterministic
  output, cancellation/recovery, and cache invalidation. Use exact same-runtime
  output comparisons for behavior-preserving optimizations.
- Benchmark isolated frozen code with a fixed AML seed. Keep profiles and source
  identities; distinguish partial profiles, cache hits, and completed builds.
- Measure sequential scaling before adding threads. Parallel throughput does not
  excuse redundant work or excessive memory per job.

Validation for the initial conservative optimization included the type checker, 59 focused tests covering
profiling, noise, contact distance, tiles, wall dressing, and surface behavior,
independent test and implementation review, and the frozen output comparisons
above. There is no claim of full-demo export,
browser visual acceptance, or sub-second decorated generation from these checks.
