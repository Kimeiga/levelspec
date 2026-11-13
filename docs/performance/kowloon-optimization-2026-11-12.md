# Kowloon optimization implementation: November 12, 2026

The full-resolution frozen demo fell from **244.777 seconds to 76.193 seconds**
in fresh-process serial measurements. This is about 3.2× faster, with one measured
run at each of those endpoints, not a controlled median. External machine load
was uncontrolled. The sub-second target remains unmet.

Texture dimensions, allocated channel-texels, shadow settings, collision,
navigation inputs and receiving geometry were retained. The intentional visual
change is the pipe runoff transport model. On that frozen workload, all later serial optimizations and the
worker prototype produced exactly the same physical/render identities and
ordered generated-image manifest as that revised transport implementation.

See the [initial profile](kowloon-2026-11-12.md) for the original workload and CPU
evidence. The machine was an Apple M4 with 16 GiB RAM, macOS arm64 and Node 24.12.0.
All assistant-owned benchmarks ran sequentially. Sources and material assets were
frozen to avoid mixing concurrent visual development into comparisons.

## What changed

1. **Replace upstream pipe tracing with ordered transport.** Each surface cell's
   world position and gravity direction are evaluated once. Cells are sorted by
   height, then accumulate bounded contributions from higher neighbors. Analytic
   ring derivatives replace four finite-difference evaluations. The field retains
   its 96–192 columns and 9–385 rows, periodic seam and gravity dependence, while
   removing up to 64 upstream steps per cell. Rust streak connectivity can change. The
   original partial CPU profile spent 79.576 sampled seconds here; the completed
   optimized profile spent 0.523 seconds. These are separate profiles of different
   durations, so the numbers identify the removed hot path, not an isolated ratio.
2. **Evaluate one material sample once.** Metal, painted signs and panels share
   pigment/PBR and normal-relief sampling. Ground pigment combines intrinsic and
   field tint after coatings, preserving the previous compositing equation.
   Asphalt distance and native-edge distance are reused only where coordinates
   and semantics agree. Geometry sampling remains independent of pigment.
3. **Remove allocation and lookup work inside pixel loops.** Source sampling owns
   reusable scratch; live normal-derivative rows own independent snapshots and
   recycle only expired rows. Optional fields are reset on every reuse. Tile
   damage retains the current cell's nine candidates. Receiver vertex sharing uses
   numeric vertex indices under chart identity instead of enormous recipe strings.
   Plaster noise bands and UV transforms are prepared once per field.
4. **Keep cooperative scheduling without timer clamping.** Node yields to ready
   tasks with `setImmediate`; browser workers use `MessageChannel`. The 8 ms target
   and cancellation checks remain. Sampled idle time fell from 15.121 seconds in
   one optimized profile to 0.336 seconds after this change. Individual synchronous
   recipe preparations can still exceed the target; it is not a hard latency bound.
5. **Use a faster lossless PNG writer.** RGBA8 uses the Sub predictor and fflate
   compression level 1. Decoded pixels are unchanged by encoding, including hidden
   RGB under zero alpha. Encoded size grew from 86,894,322 to 93,055,755 bytes across
   the full algorithm/encoder change; the runoff change also affects those bytes,
   so this difference does not isolate the compressor's cost.
6. **Separate raster planning, execution and publication.** The compiler validates
   and deduplicates jobs before execution, enforces global budgets, copies returned
   raw byte views, encodes/hashes itself, and binds in recipe order. Independent
   workers can finish in any order without changing image/material ordering.
   Incomplete or invalid results publish nothing. Failure cancels and drains local
   bakes; workers waiting for ACKs are terminated and awaited.

The benchmark still contains **505,382 triangles, 1,474,018 vertices, 74,491
receivers, 90,610,824 channel-texels and 12,961 generated images**. A receiver is a
geometry patch carrying an appearance recipe; multiple receivers already share a
raster job. The frozen scene has 6,453 unique raster groups. Removing receiver
bookkeeping alone cannot remove the cost of evaluating those pixels.

## Measurement ledger

| Frozen variant | Seconds | Interpretation |
| --- | ---: | --- |
| Original completed compile | 244.777 | Baseline, full resolution |
| Shared metal only | 446.799 | Noisy run; unchanged preparation rose to 135 s. Not evidence of a regression or speedup |
| Ordered runoff + shared samples + PNG/scratch | 127.163 | Intentional runoff appearance change |
| Numeric receiver binding + tile candidates + scheduler/rows | 86.753 | Exact revised output |
| Ground tint/distance + panel bump reuse | 79.066 | Exact revised output |
| Prepared plaster/UV fields | 78.710 | Exact revised output; small difference is within run noise |
| Production executor, serial | 76.193 | Exact revised output; includes helper overhead described below |
| Production executor, two total isolates | 63.639 | Exact revised output |
| Production executor, four total isolates | 54.070 | Exact revised output |
| Replay prototype, two workers | 56.650 | Disposable experiment; separate final main replay |
| Replay prototype, four workers | 50.581 | Disposable experiment; separate final main replay |

The four-worker prototype used 220.261 CPU seconds and 3.915 GiB peak process RSS;
the two-worker prototype used 144.071 CPU seconds and 4.005 GiB peak RSS. Peak RSS
is not per worker. These prototypes proved deterministic parallelism but duplicated
scene setup and retained a complete result cache before a second main compilation.
The production pool instead uses the main isolate as a shard and streams one raw
result per remote worker with consumption acknowledgments. Its measured serial,
two-isolate and four-isolate peaks were 2.575, 4.411 and 3.531 GiB respectively;
CPU times were 94.632, 128.863 and 219.702 seconds. GC and scheduling make peak RSS
non-monotonic here; more workers did not imply a measured linear memory increase.
The reported admission estimate is not a prediction of measured RSS.

Earlier measurements exclude module loading, parsing, export and browser/GPU work,
and include navigation. The production helper measurements also include a second
parse/preset preparation, per-call source hashing, worker startup/replay/disposal,
and final source checking. Initial validation parsing and module-load hashing stay
outside the timer. `process.cpuUsage` includes worker CPU; inspector profiles cover
only the main isolate. `maxRSS` is the whole process lifetime's high-water mark;
each benchmark launches a fresh process. Do not compare a main-thread-only CPU
profile to aggregate worker CPU as if they measured the same thing.

Changing the main shard's nominal capacity to 0.65 of a remote measured 52.536
and 55.162 s; capacity 1.5 measured 56.867 s. Completion traces showed that the
smaller main shard finished far ahead of the remotes. Neither weighting established
a reliable gain, so neither shipped. A six-isolate experiment took 60.085 s and
327.546 CPU seconds, slower and more CPU-intensive than four. The production cap
remains four. All experiments retained exact revised output; their source and
measurement identities are included in the evidence JSON.

## Current workspace confirmation

After freezing the concurrent visual changes separately, the current workspace
completed in **55.801 seconds** with four total isolates and no diagnostics.
It contains 543,230 triangles, 1,587,448 vertices, 74,811 receivers,
6,492 unique raster jobs and 90,664,596 channel-texels. The 13,048
generated images occupy 93,095,615 bytes. CPU use was 225.074 seconds and
peak process RSS was 5.020 GiB. Physical identity matches the earlier scene, but the
render identity and geometry differ because of those visual edits. This is a
successful current-workload confirmation, not another sample of the original
before/after comparison. Its source fingerprint was unchanged during the run.

## Execution policy and memory

The native compiler stays sequential unless its host supplies `rasterExecutor`.
The Node demo builder/profile can select 1–4 total isolates, including the main
thread. Automatic mode uses one for small workloads and admits a bounded pool for
large ones. Hardware concurrency, a half-physical-memory admission estimate and
aggregate row-scratch allowance can reduce the requested count. The count actually
used appears in the report. Texture and shadow resolution are never adjusted.

Each replay receives the same AML, preset/host, budget settings and copied material
byte snapshots. Input and job manifests are verified before any worker emits a
texture. The helper pins a code fingerprint at module load and checks observed
source drift before and after parallel compilation. These checks detect ordinary
concurrent edits; they are not a cryptographic proof of every byte loaded during a
concurrent module import. Use frozen sources for reproducible benchmarks.

The memory admission estimate reserves 1 GiB per replica plus encoded inputs and
raw/copy/encoder working storage. Each worker has a 1,536 MiB V8 old-generation limit. Neither
that estimate nor the appearance byte budget is a hard RSS limit: JavaScript
geometry, typed arrays, native buffers and GC overhead also consume memory.
Maximum appearance bytes bound resident mip/row accounting and encoded outputs;
all unique channel-texels remain globally charged once. Never interpret per-worker
budgets as permission to multiply the scene's total texture budget.

## Remaining work and Rust direction

The final single-thread CPU profile of the current workspace completed in
**76.913 s**, with exactly the same output as its 55.801 s four-isolate run:

| Phase | Seconds |
| --- | ---: |
| Rasterization, validation of returned maps, hashing and PNG encoding | 65.478 |
| Edge joining | 3.890 |
| Dressing construction | 2.930 |
| Source-image decoding | 1.910 |
| Mesh finalization | 1.263 |
| Receiver validation and lazy finish preparation | 0.954 |
| Navigation | 0.177 |

Sample categories include 6.585 s source PBR sampling, 4.822 s PNG encoding,
3.931 s component patina, 3.740 s tile fields, 2.267 s GC, 0.523 s pipe runoff
preparation and 0.376 s idle. These are sampled categories within the profile,
not extra time to add to the phase table. `fieldRow` accounts for 38.253 s of
inclusive sampled time: procedural field evaluation and retention remain the
main work. Raster sampling, source filtering and per-pixel/row object contracts
are now the primary kernel targets. The rejected generic noise cache illustrates
why a narrower-looking hot function is not automatically a useful caching target.

There is no evidence that a new spatial index or collision lookup is the main
remedy. Even eliminating the measured raster/encoding phase would leave about
11.4 s in this profile. Reaching one second therefore also requires reducing scene
setup, mesh processing and input preparation, or reusing them incrementally.

Rust alone cannot execute the current JavaScript recipe closures. A useful native
boundary would carry a declarative material program, compact geometry/receiver
buffers, source images and job descriptors. Native workers could share immutable
inputs and bake without rebuilding the entire scene per isolate. The optional
executor is that orchestration boundary, but the recipes themselves still need a
portable representation. The Rust toolchain was unavailable locally; no native
speedup is claimed.

The largest further algorithm change would be explicit reusable finish atlases or
material programs with a bounded number of variants, while preserving map size,
texel density and normal-map detail. Context-dependent runoff, repairs and contact
masks must remain receiver-specific overlays. Reusing outputs merely because
bounds/material IDs match is incorrect: closures can depend on seed, world frame,
contacts and source bytes. Broad low-frequency fields could also be computed once
and reused across aligned receiver patches. Benchmark those changes against both
appearance intent and total output work before introducing another index/cache.

A last-cell value-noise cache was also tested in a disposable microbenchmark.
Across four million samples per pass, direct arithmetic took roughly 29–32 ms;
the cache took 31–32 ms at low frequency, 44 ms at medium frequency and 100–106 ms
at high frequency, with equal checksums. It was rejected. V8 already makes the
small integer hash cheap; branch/state overhead can cost more than recomputation.
These microbenchmarks are not end-to-end speed measurements.

A one-second cold full-scene build is not established by these results. Warm reuse
already exists at the demo package level. For near-instant iteration, the stronger
next step is explicit dependency-based reuse of unchanged finish jobs, together
with a portable raster kernel; its identity must include all material inputs and
context, not just callback names or geometry bounds.

## Reproduce

```sh
npm run profile:dressing -- --workers 1 --seconds 300 --out generated/profile-serial
npm run profile:dressing -- --workers 4 --seconds 300 --out generated/profile-pool
npm run profile:dressing -- --workers 1 --cpu --seconds 300 --out generated/profile-cpu
```

Use the same frozen source/assets for both runs and keep other assistant-owned
tests/builds stopped. `--workers` counts the main thread. Omitting it selects the
bounded demo default. `--cpu` profiles the main isolate only. The existing demo
builder uses the same helper and appearance budgets; the native `compile()` API
keeps its sequential default. Runtime exports and GPU/shadow rendering remain
outside these compile measurements.

## Guardrails for future edits

- Count receivers, unique jobs, total channel-texels, generated bytes, geometry and
  peak process memory alongside elapsed time. An expanded scene is a new workload.
- Profile lazy field preparation separately from validation labels. Moving work
  between phases is not an optimization.
- Preserve independent ownership of neighboring row samples and source scratch.
  Mutable callbacks and omitted optional fields must not leak into the next pixel.
- Copy exact byte views before hashing/publishing worker results. Never detach
  caller-owned image buffers or trust a worker's supplied content hash.
- Bound in-flight results and cancellation lifetime as well as worker count.
  Failed compiles must leave no partial textures, active recipes or worker threads.
- Keep field caches local to their dependencies and bounded. Optimize eliminated
  evaluations before adding a general spatial index or cross-scene cache.
- Separate runtime contracts from visual experiments. Core tests cover geometry,
  ownership, compositing, determinism, budgets and cancellation; they do not freeze
  the experimental city art through screenshot or recipe-ID goldens.

## Validation and outstanding suite failures

- `npm run check` passed.
- The browser bundle built successfully with `npx vite build` into an ignored
  output directory. Existing optional-native `node:module` externalization and
  chunk-size warnings remain. This checks bundling, not browser/GPU visual output.
- The full `npm test` run completed in 399.171 s: **915 tests, 868 passes, 46
  failures, one skip, zero cancellations**. New raster-executor and real-worker
  tests passed, including exact serial/parallel bytes, ownership, cancellation,
  local-work draining, frozen inputs, invalid manifests and natural process exit.
- A separate copied-source probe confirmed that a long-lived helper rejects a
  compiler file edit before starting a replay pool.
- Independent test and implementation reviews approved the changes after the
  cancellation-draining and module-lifetime fingerprint corrections.

The full suite is **not green**. Its 46 failures comprise 45 failing leaves plus
one failed parent container. Of those leaves, 32 stop at appearance budgets
(10 chart limits and 22 texel limits), often before their named structural
assertions execute. Native compiler defaults were deliberately not enlarged to
make large art fixtures pass. The demo builder/profile supply explicit shared
budgets for the experimental scene.

The other failures include schema/serializer drift (`time-of-day`), hierarchical
shop-name parsing, assertions tied to former geometry/UV representations, two
spatial/precision checks, a pipe-connectivity prerequisite, a draw-count bound,
and an optional-placement prerequisite. They were not deleted or relaxed to make
this performance work appear green.

A [12-case control ledger](kowloon-2026-11-12-test-controls.json) repeats selected
failures against the current visual sources with this performance work reverted.
**All 12 reproduced the same root assertion/diagnostic**, with no timeouts or
harness errors. This includes the 0.15265 m fixture projection, the -2.849 μm pipe
projection, native-ground/roof/chart budget cases, pipe-connectivity prerequisite,
schema failure, trade parsing, material-repeat assumption, ground anchors,
draw-count bound and missing tiny-wall riser. Total case time was 97.634 s.
That directly establishes these selected cases, not every untested failure.
Remaining suite failures still need their own owner-specific repair or fixture
simplification; structural, collision and ownership checks remain valuable.

The [durable evidence ledger](kowloon-optimization-2026-11-12.json) records timing,
source overlays, source drift, output identities, memory, and rejected experiments.
Full profiles, frozen sources and logs remain under the ignored
`generated/kowloon-profile-20261112/` directory. The current-workspace snapshot is
separate from the original comparison workload.
