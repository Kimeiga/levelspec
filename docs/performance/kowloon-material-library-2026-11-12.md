# Finished material reuse: first implementation

Initial full-resolution, single-isolate Kowloon measurements were **84.516 seconds
baseline, 78.453 seconds with an empty material cache, and 67.808 seconds with
populated artifacts in a fresh process**. A later identical baseline took 167.592
seconds, followed by a **97.362-second warm repeat**. This substantial variability
prevents a dependable end-to-end speedup percentage; report the observed runs and
removed work separately. Warm and cold optimized builds have identical render,
physical, and generated-image identities. **The one-second target remains unmet.**

This implements material reuse first. It does not cache generated geometry, change
shadow settings, or lower source-image resolution or requested output texel density.
Eligible facade weathering intentionally changes to a small periodic variant
catalog; per-panel color remains adjustable through vertex tint.

## What was expensive, and what is now reused

Our material rasterization evaluates procedural coating, grime, repairs, source
image sampling, roughness/metalness, and normal-map composition at output texels,
then encodes PNGs. Reusing an input concrete image alone does not skip those steps.

Finished recipes now bind their baked PBR maps directly through repeating,
meter-based UVs. Eligible facades use a 1.8-meter patch with two weathering variants
per intrinsic style. Six actual recipes in this scene occupy 242,208 channel-texels.
Different wall dimensions can use the same finished patch without cutting or
rebaking the image. Existing openings, vertex positions, normals, and triangles
are retained. Household tint boundaries remain separate even when adjacent
panels otherwise qualify for one shared raster group.

Components and pipes additionally persist their complete finished maps. These
recipes still include dimensions and seeds: this is exact artifact reuse, not
automatic standardization of differently shaped props. Their identities include
aging, material mappings, assembly contacts/folds, and pipe gravity/runoff data.
Late assembly changes are resolved before cache lookup.

Local fixture deposits, tiled facades, and height-bearing skins remain specialized
bakes. Applying a shared patch to these indiscriminately would erase location,
roughness, repair retention, or displacement. The implementation does not guess
equivalence from similar colors or one sample point.

## Measurements

The comparison uses isolated snapshots of the updated scene: 649,873 triangles
and 1,907,395 vertices. Earlier 76-second reports used an older scene and are not
the denominator here. Node 24.12.0, Apple M4, macOS arm64; one raster isolate;
navigation and parsing inside `compileDemo` included; source-file reading, the
preliminary validation parse, module startup, export, GPU upload, and light baking
excluded. External machine load was uncontrolled. No assistant-owned heavy tests
or benchmarks ran concurrently with these timing runs.

| Variant | Compile | Raster-stage interval | Dispatched jobs | Dispatched channel-texels |
| --- | ---: | ---: | ---: | ---: |
| Frozen baseline | 84.516 s | 70.910 s | 8,029 | 90,403,554 |
| Shared facade prototype, no persistence | 79.722 s | 66.024 s | 7,986 | 78,817,527 |
| Final implementation, empty disk cache | 78.453 s | 64.525 s | 7,986 | 78,817,527 |
| Final implementation, warm disk cache | 67.808 s | 53.904 s | 517 | 62,859,669 |
| Frozen baseline, later repeat | 167.592 s | 134.760 s | 8,029 | 90,403,554 |
| Final implementation, later warm repeat | 97.362 s | 79.422 s | 517 | 62,859,669 |

In the initial series, the cold observation is 7.2% below baseline. Warm is 19.8%
below baseline and 13.6% below optimized cold. These describe that timing series,
not a stable effect estimate. Both later repeats retain their respective original
output hashes and job/texel counts. No source edits occurred during accepted runs.
Do not attribute the small difference between the prototype and final cold
observation solely to caching; these are single runs,
and the final implementation also fixes placement-tint grouping.

The warm run skips **7,469 jobs (93.5%)**, but only **15,957,858 channel-texels
(20.2%)**. Job count alone is a misleading performance metric. Total resident
optimized maps still occupy 78,817,527 channel-texels and 85,486,276 encoded bytes;
cache hits do not relax resource budgets. The 7,469 disk artifacts occupy
30,099,065 bytes, including JSON/base64 overhead.

In the first warm run, work outside the raster interval includes 3.868 s of
procedural construction, 1.031 s of receiver validation, 2.217 s of source-image decoding,
4.485 s of receiver-edge joining, and 1.692 s of mesh finalization. Eliminating
the entire raster-stage interval would still leave about **13.9 seconds** in
other stages in this observation. Material caching alone cannot establish the
sub-second target. The raster interval includes planning, cache reads/validation, remaining pixel evaluation,
encoding, and bindings; it is not a pure sampler timer.

## Correctness and cache contract

- Only explicit versioned `raster.materialKey` recipes are persistent-cache
  eligible. Arbitrary callbacks and ordinary shared raster groups are not.
- The artifact key includes recipe identity, layout/density/layers, source
  material properties, and content hashes of all companion images. The demo
  additionally namespaces disk storage by compiler/generator source and lockfile.
- Cached PNGs are checked for dimensions, complete decoding, and digest identity.
  Cache reads and writes own independent byte copies. Corruption or non-abort I/O
  failure becomes a miss or skipped write. Cancellation remains observable.
- All jobs pass admission budgets before lookup. Hits and misses publish in
  deterministic plan order; sparse worker misses retain the full replay manifest.
- Scene output is atomic. Valid independent material artifacts can survive a
  later scene validation failure. Disk replacement is atomic, with a best-effort
  256 MiB quota across namespaces; concurrent processes can temporarily exceed it.
- The demo compiler uses `generated/material-cache` automatically. Native API
  hosts opt in through `ArchitectureCompileOptions.materialCache`; the core has
  no filesystem dependency. No background material-regeneration service was added.

## Evidence and next decisions

Raw reports, source snapshots, manifests, and the job census are retained under
`generated/kowloon-material-library-20261112/`; the compact adjacent JSON records
the permanent measurement evidence. Source fingerprints were stable throughout
each accepted run. The baseline and optimized physical hash, triangle count, and
vertex count match. Cold/warm optimized render and entire appearance manifests
match exactly. Receiver count rises from 92,553 to 92,575 because household tint
boundaries require separate groups with the new per-panel vertex colors; mesh
counts do not change.

Concurrent built-in material-library and shutter changes were preserved in the
working tree. Benchmark snapshots selectively exclude the new built-in image
resolver to keep the original scene/assets fixed. Subsequent default appearance
budget increases are also outside these snapshots; benchmark budgets are explicit. The first facade prototype
failed affine-normal-UV validation and was corrected; two incomplete cache
snapshot startup attempts failed on a missing concurrent module. None counts as
a successful timing result.

A separate CPU-instrumented warm run completed in 114.056 s with identical
output and the same 517 missed jobs. Instrumentation and uncontrolled machine load
make this unsuitable as an uninstrumented timing replicate. Inclusive sampled
time was 64.184 s under `rasterizeSurface`, including 17.442 s in ground sampling
and 7.689 s in facade skin sampling. PNG encoding accounted for 6.351 s, cache
artifact validation 2.449 s, and edge reconciliation 4.733 s. These categories
can overlap; asynchronous stacks and sampling are not exact timers. They identify
remaining pixel work as the main target, rather than cache lookup or geometry
construction alone.

A second layout increases the noncollidable `shop-row` building width from 30 to
31 meters. It completes in 102.142 s with 674,727 triangles and 1,981,921 vertices,
versus 649,873 / 1,907,395 in the original layout. It dispatches 65,789,242 of
80,016,037 resident channel-texels, reusing **14,226,795 channel-texels despite the
layout change**. Its physical hash stays equal because this building is excluded
from collision; its render hash changes. This run establishes cross-layout reuse,
not a speedup percentage: it has no corresponding cold alternate-layout control.

The final isolated validation batch passes **40/40 focused tests**, including
real two-isolate replay with mixed hits/misses, byte ownership, invalidation,
corruption, cancellation/recovery, quota/atomic replacement, admission budgets,
periodic normals, unchanged geometry/openings, placement tint, GLB repeat/vertex
color behavior, and exact local-deposit retention. These are compiler contracts,
not golden-art assertions. Both independent test and implementation reviews found
no remaining blocker. TypeScript checking and the viewer production bundle pass in the validation snapshot.
The bundle uses existing published demo assets; it does not establish a new
visual acceptance or a fresh export of the benchmark scene.

An initial validation snapshot captured a concurrent duplicate `thresholds`
declaration in facade generation and could not import the compiler. The other
agent's corrected facade file was copied into validation before the passing run;
no benchmark source was altered. A duplicate export import captured during
concurrent editing was similarly refreshed from its corrected source before the
passing type check. The initial bundle attempt lacked generated demo files; the
final check reads the existing published assets without changing them. No full-suite run or manual visual acceptance is
claimed for this stage.

The next material step should target the large remaining maps before assuming
geometry caching is the main opportunity. Separate reusable base finish from
localized stains/repairs, then represent the latter as bounded overlays or
pre-baked contact patches. Preserve source/output density, world scale, layer
roughness, and normal composition. Large ground and deck maps are also candidates
for explicit intrinsic recipes, provided their complete dependencies are known.
Measure missed pixel area and actual CPU time, not the number of cached props.

Avoid whole-scene cache keys for intrinsic materials: they prevent reuse after
layout changes. Conversely, never omit dimensions, seams, gravity, contacts, or
source-image contents when those affect a particular recipe. The current broad
code namespace intentionally invalidates on unrelated compiler changes; narrower
dependency versions are a future improvement, not an excuse to accept stale maps.

This resembles the reuse benefit of engine material instances, but Unreal's
material compilation chiefly concerns shader programs. Our avoided work is CPU
texture baking. Unreal supports parameter changes through material instances
without recompiling their parent shader; that distinction is why a reusable
recipe plus placement tint is useful here. [Epic material-instance documentation](https://dev.epicgames.com/documentation/en-us/unreal-engine/instanced-materials-in-unreal-engine).
