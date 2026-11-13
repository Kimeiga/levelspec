# Serial building jobs and the case for bounded parallelism

Building generation now produces an owned result before appending it to the city.
Shared site planning and the global sign survey remain authoritative. This is the
serial extraction proposed in the [previous pipeline review](geometry-pipeline-2026-11-12.md),
with no new scheduler, worker pool, Rust dependency, or resolution reduction.

The frozen demo preserves exact mesh buffers, ordered material definitions apart
from their identifiers, material assignments, image manifests, physical geometry,
navigation, provenance, ground plans, and sign decisions. Generated material and
surface labels intentionally change because receivers no longer depend on the
city-wide triangle ordinal during building generation.

One fresh-process warm comparison observed **23.173 s before and 17.863 s after**.
This does **not** establish a causal speedup: unchanged decoding, cache assembly,
binding and finalization also ran faster. The purpose of this step is an explicit
ownership boundary and a measured parallelism decision, not a claimed 23% speedup.

## The implemented boundary

`KowloonBuildings` still plans every site's lots, physical obstacles, street
support, foreign extents and polygon exposure together. `generate(host)` reads
that plan and returns a `BuildingJob`. `applyDressing` generates and appends each
job at its existing rule position, so intervening floor and wall rules retain
their original order. There is no parallel dispatch yet.

`building-job.ts` owns the render arrays and registration containers for one
building. It borrows architecture, physical input and existing material/provenance
records read-only; it does not deep-copy the city's physical mesh. Assembly:

1. Checks cancellation, the cumulative triangle budget and conflicting shared
   material definitions before changing the destination.
2. Appends attributes and offsets vertex/surface indices in source order. Material
   definitions remain shared by identity; diagnostics, provenance and inspection
   plans retain their source ownership and order.
3. Moves the original receiver objects and rebases both contiguous and sparse
   triangle ranges. It deliberately does **not** call `takeSurfaceCharts`, which
   finalizes/coalesces recipes and can evaluate lazy material getters too early.
4. Retargets the live `KitMesh`, its cached surface indices and its `KitSurfaces`
   collector. Old pens then draw accepted signs into the destination; later
   fixings can still stain receivers registered before assembly.
5. Releases the local mesh reference, including the copy otherwise retained by
   ground-sampling closures. A successful job is consumed once. Budget, material
   conflict and cancellation rejection leave the job retryable and the destination
   unchanged by that append.

Actual generation receives the remaining serial triangle allowance, including
direct deck/ground emitters. Assembly rechecks the aggregate cap, and deferred
signs use the global budget after retargeting. The highest-detail survey sketch
keeps its previous separate work allowance. This does not make the entire compiler
transactional: an error may still return diagnostics with earlier compiled output.

Each job has a local sign book. Books move to the global survey in assembly order,
preserving tie-breaking and host-local shop lookup. At medium/low detail, the
temporary highest-detail geometry still supplies the obstruction survey; its
materials and receivers are discarded. Signs are decided only after all building
geometry is available. Spans and posters keep their existing later positions.

### Intentional identity change

`KitMesh.receive` scopes receiver IDs and merge groups to the host. Two independent
building meshes can both start at triangle zero without colliding. Intrinsic
material recipe keys, seeds, texture density and scene-shared raster groups are
unchanged. The ordinary ground/deck receiver IDs were already host-specific.

Some host-local raster group labels include the starting triangle ordinal, so
generated material/surface IDs and the render hash change. This is a complete
internal identity cutover; no legacy identity mode is retained. The differential
checks below verify appearance and ownership separately from these labels. Any
consumer depending on those generated labels must regenerate them.

Not every receiver is order-independent yet: signs and fixtures drawn **after**
retargeting still derive their suffixes from the assembled mesh's triangle count.
That preserves deterministic serial assembly, but must be addressed explicitly
before moving deferred drawing to independent execution lanes.

## One frozen comparison

Both runs used Node 24.12.0 on Apple M4/macOS arm64, fresh processes, navigation
enabled, a serial raster executor and the same warm artifact directory. These
runs were not CPU-profiled. The benchmark wraps building methods only to measure
generation, append and sign-survey durations; no production telemetry API was added.

The source is the preceding geometry experiment's frozen demo. Only this step's
production changes were overlaid. Nine concurrent visual source changes in the
current working tree are excluded from both variants. Current-tree focused tests
and typechecking are reported separately below. Both frozen source fingerprints
were stable during their runs.

| Measurement | Before | After |
| --- | ---: | ---: |
| Compile wall time | 23.173 s | 17.863 s |
| Process CPU during compile | 37.884 s | 29.407 s |
| Building generation, including survey sketches | 5.563 s | 4.514 s |
| New explicit assembly | — | 0.355 s |
| Global sign survey and accepted sign drawing | 0.816 s | 0.685 s |
| Source image decoding stage | 1.729 s | 1.257 s |
| Cached-material assembly stage | 3.336 s | 2.453 s |
| Preserved binding and adjacent-face registration | 4.860 s | 3.651 s |
| Cache reads / hits / writes | 9,173 / 9,173 / 0 | 9,173 / 9,173 / 0 |
| Raster jobs / generated channel-texels | 0 / 0 | 0 / 0 |
| Render triangles / vertices | 859,305 / 2,535,555 | 859,305 / 2,535,555 |

Assembly costs **2.0%** of this after-run's compile time. It copies owned local
geometry into the current contiguous output representation; this is real extra
work to include in a future parallel comparison. Production currently generates
and assembles one job at a time rather than retaining all local meshes at once.
More in-flight jobs would add memory pressure and require bounded admission.

The compile timer excludes startup/imports, initial AML reading, fingerprints,
postcompile equivalence hashing, export, GPU upload and lighting. Reported process
peak RSS was 2.049 GiB before and 3.390 GiB after, but includes the large postcompile
JSON digests and final fingerprint. It is **not a compile-only memory comparison**
or evidence that parallel execution would fit a given memory budget.

### Equivalence evidence

The following match exactly by SHA-256 or full report comparison:

- Complete mesh arrays, including indices, normals, UVs, vertex colors, numeric
  surface assignments and solid ownership.
- Ordered material definitions with only `id` omitted, and ordered surface
  metadata with material IDs resolved to their material-array ordinal and surface
  `id` omitted. This preserves the definition-to-triangle binding check while
  allowing the intentional label change.
- Physical hash, navigation, source provenance, ground and sign plans, all three
  highest-detail obstruction-survey buffers, and empty diagnostics.
- The full surface appearance manifest: 95,274 charts, 80,663,088 resident
  channel-texels, 87,858,744 encoded image bytes, source hashes and all generated
  image hashes. Source PNG decode calls remain 14.

Material-ID and surface-ID hashes differ, as does the render hash. Identifier
compatibility is not claimed. The warm runs exercise cached artifacts, not cold
material generation. The isolated benchmark deliberately keeps the artifact
namespace fixed across producer revisions; it does not override normal production
cache or bundle invalidation rules.

## Should these jobs run in workers now?

| Host | Generated triangles | Generation | Assembly |
| --- | ---: | ---: | ---: |
| background-west | 107,457 | 0.857 s | 0.054 s |
| background-east | 96,069 | 0.602 s | 0.091 s |
| shop-row | 493,623 | 3.055 s | 0.210 s |

Building generation accounts for **25.3%** of the after run, but `shop-row` alone
takes **67.7% of generation**. With these three intact jobs, fixed measured job
durations, assembly and other stages outside the overlap, ideal two-lane scheduling
takes `max(3.055, 0.857 + 0.602) = 3.055 s`. The maximum generation saving in that
model is **1.459 s**, or **8.17% of compilation**, for **1.089×** total speedup.
A third generation lane cannot shorten the dominant intact job.

This is an optimistic scheduling calculation, **not a worker benchmark or a
universal limit**. Transfer, worker startup, extra GC and contention reduce the
saving. Overlapping append with ongoing generation, splitting the largest host,
or overlapping other stages changes the model. Do not present the earlier
all-procedural-work Amdahl estimate as achievable building-job throughput.

The result does not justify immediately rewriting every material callback merely
to dispatch three building jobs. Current results contain sampler closures, lazy
deposits and sign-fixing callbacks, and shared planning uses live objects with
identity. They are in-process jobs, not transferable messages. Replaying the whole
city in each geometry worker would duplicate the expensive work. Rust does not
remove these data-flow requirements.

The next bounded investigation should separate actual-detail drawing from the
discarded highest-detail survey drawing within the dominant host. The latter
currently constructs full attributes and receiver metadata although the survey
consumes positions/indices only. A survey-specific output path may remove real
work, but must be measured and checked against the same survey buffers before
adoption. It is not implemented or assigned a speedup here. If that offers little,
measure a smaller shared kernel or split the dominant host's independent work
before investing in transferable recipe descriptors and a two-lane trial.

## Validation and guardrails

Eleven focused tests pass across `surface-building-job`, `surface-kit-plans` and
`surface-sign-cache`. The three new cases cover source-order assembly, exact
attributes and sparse ranges, shared materials and provenance, live late deposits
and row samplers, new registrations through old pens, global sign tie-breaking,
cumulative budgets, material conflicts, cancellation and retry. These are compiler
behavior tests, not visual-style snapshots. `npm run check` passes. Independent
preimplementation test review, final implementation review and evidence review
approved this scope.

Four older integration checks failed **before** production edits on the current
visual source: the abutting/collision building case exceeded 32,768 charts
(37,441); the sign-survey case exceeded 32,768 (67,176); the detail-stability case
exceeded 16,384 (44,828); and the source/collision/navigation roundtrip exceeded
its 4,194,304-texel allowance. Their budgets and assertions were left unchanged.
They are a known acceptance limitation, not passing evidence for this change.
No full-suite pass, browser acceptance, cold benchmark or real worker speedup is
claimed. We did not repeat whole-scene runs to seek favorable timings.

Future changes must preserve shared planning, deterministic append order, global
budgets, live receiver identity through sign settlement, and the global highest-
detail obstruction survey. Do not infer transferability from the `BuildingJob`
name or assume every host provides equally sized work. Measure memory during
compilation separately from report generation before choosing worker concurrency.

Machine-readable evidence: [comparison and scheduling model](building-jobs-2026-11-12.json).
Ignored local evidence is under `generated/kowloon-building-jobs-20261112/`:
frozen variants, original files, narrow implementation diff, instrumented benchmark
driver, complete reports, source fingerprints, and validation logs.
