# Native PNG decoding for Node hosts

Implemented November 12, 2026, following the
[PNG decoding research](png-decoding-research-2026-11-12.md). Node CLI commands,
demo builds, raster replay workers and the weathering study now use pngjs's Node
entry point and native zlib. The browser compiler retains pngjs's browser build.
No dependency, Rust component, raster worker or texture-resolution reduction was
added by this change.

## Scope and contracts

`ArchitectureCompileOptions.decodeMaterialPng` is a synchronous per-compile host
codec. `src/materials/node-images.ts` supplies the Node implementation; the shared
compiler does not import it. The same option reaches both source companions and
finished-material cache validation. Direct API callers who omit it retain the
browser-safe decoder. There is no process-global mutable decoder selection.

The compiler still checks the 32 MiB encoded-image limit and 16 Mi-pixel PNG limit
before invoking the codec. It verifies returned dimensions and complete RGBA8
length, copies decoder pixels into compiler-owned storage, and charges decoded
source bytes to the existing aggregate budget. Node and browser adapters copy
borrowed encoded views before decoding.

Conversion matches existing pngjs semantics: RGBA and palette alpha preserve
hidden RGB; keyed grayscale/RGB transparency clears matching color. Sixteen-bit
samples scale to RGBA8, including their low-byte contribution. JPEG decoding,
PNG encoding, geometry, texture density and shadows are unchanged.

**Cache integrity has not been relaxed.** A cache hit still validates complete
PNG data and the encoded digest before publication. Decoder failures remain
cache misses; source-image failures retain source-linked diagnostics and atomic
scene state. Cancellation still occurs between synchronous image operations,
not in the middle of native inflation. The separate proposal to avoid decoding
trusted finished artifacts is not implemented here.

## Measurement method

The isolated research experiment measured 26,964 stored PNGs at 7.098 seconds
median for the browser build versus 2.829 seconds for the Node entry point, with
every RGBA byte identical. Those are decoder-only results, not compile timings.

The scene experiment uses a newly frozen copy of the current source, material
assets and demo AML under `generated/kowloon-png-native-20261112/frozen`. It runs
the real compiler with navigation and full-resolution appearance, one synchronous
raster executor, and the same persistent material cache. Fresh processes select
either codec explicitly through the new hook. Both variants use the same frozen
code namespace; the only experimental difference is the decoder selection.

The empty-cache Node run populates artifacts; subsequent runs measure warm cache
reuse. Timed compilation includes preset preparation, source-image loading,
cache reads/validation, geometry, rasterization and finalization. It excludes
module startup, source-file reading, source fingerprinting, GLB/export writing,
browser upload and light baking. The hook also records actual decoder calls,
pixels and elapsed codec time, including its input copy but excluding the common
wrapper's output copy. This instrumentation is identical in both variants.

No task-owned tests, builds or competing benchmarks run alongside scene timings.
Other processes remain uncontrolled. Compare repeated observations and work
counts rather than projecting the previous CPU profile's sampled time into a
guaranteed speedup. Full appearance manifests, render/physical identities and
before/after source fingerprints are compared across runs.

## Results

The frozen scene contains **798,509 triangles, 2,353,167 vertices, 95,130 receivers
and 80,645,061 resident channel-texels**. It includes subsequent visual changes;
older scene timings are not its baseline. Node 24.12.0, pngjs 7.0.0, Apple M4,
macOS arm64. All seven runs completed with identical render and physical hashes,
complete appearance manifests and diagnostics. Source fingerprints stayed fixed.

| Run, in execution order | Compile wall | PNG decoder wall |
| --- | ---: | ---: |
| Native, empty cache | 108.434 s | 1.059 s |
| Browser, warm 1 | 35.915 s | 10.035 s |
| Native, warm 1 | 42.311 s | 6.744 s |
| Native, warm 2 | 29.407 s | 4.579 s |
| Browser, warm 2 | 36.143 s | 11.997 s |
| Browser, warm 3 | 45.688 s | 11.824 s |
| Native, warm 3 | 36.950 s | 5.771 s |

| Warm-run median | Browser | Native |
| --- | ---: | ---: |
| Compile wall | 36.143 s | 36.950 s |
| Process CPU | 70.012 s | 63.772 s |
| PNG decoder wall | 11.824 s | 5.771 s |
| Whole raster interval, including artifact reads/validation | 20.018 s | 15.943 s |

**Median PNG decoding took 51.2% less elapsed time**, and median process CPU fell
8.9%. **These runs do not establish an end-to-end wall-time improvement:** the
native compile median is 0.807 seconds higher, and the ranges overlap substantially.
The first native run spent 10.079 seconds joining receiver edges, compared with
4.856–5.088 seconds across browser runs; procedural dressing also varied before
decoding began. V8/background work contributes to process CPU, which must not be
read as single-thread wall time. Component improvement is supported; a precise
whole-build speedup is not.

Every warm run performed the same **26,981 PNG decodes / 113,295,795 decoded
pixels**, including source inputs and cache validation. Every warm run dispatched
the same **116 raster jobs / 3,523,398 channel-texels**. No work was silently
removed, approximated or downsized. The cold run dispatched all 9,118 jobs and
80,645,061 channel-texels; its 14 PNG decodes were source inputs, since there were
no cached maps to validate yet. There is no cold browser comparison, so no cold
speedup is claimed. The normal cache namespace changes with compiler code and
therefore requires repopulation after this implementation change.

The decoder change is retained for its lower measured decoding cost and exact
behavior. It does not finish the performance task. Reconstructing cached-map
pixels solely for validation remains avoidable work once a trusted artifact
admission contract exists; currently it still consumes part of the native
5.77-second median decoder time. Sign rasterization and geometry processing also
remain. **The sub-second target is unmet.**

See the [machine-readable measurements](png-native-decoder-2026-11-12.json) for
all CPU times, raster intervals, memory observations and identity checks. The
runner is `generated/kowloon-png-native-20261112/bench.mjs`; run from its directory
with `node bench.mjs browser <run-name>` or `node bench.mjs node <run-name>`.

## Validation and review

- 56 focused tests pass, with no skips: codec contracts, cache and large-material
  behavior, atomic failure/cancellation, raster-executor behavior, real replay
  workers and the complete CLI suite in `tests/vector-cli.test.ts`.
- Type checking passes. The seven codec tests also pass after the final fixture
  improvements; these are part of the 56 distinct tests, not seven extra cases.
- The real browser compiler worker bundles successfully with Vite. This is a
  browser dependency check, not a full viewer build or interactive acceptance.
  Initial full-viewer attempts lacked generated demo assets in the snapshot;
  they are not claimed as successful builds. Existing native-WASM dependency
  `node:module` externalization warnings remain.
- Independent test and implementation reviews are complete. Review fixes added
  low-byte-sensitive 16-bit expectations, a non-vacuous buffer-ownership check,
  and explicit keyed-transparency semantics in documentation and tests.

Tests use format/ownership/compiler assertions rather than visual snapshots.
Real worker output is compared to a default-browser-codec serial compilation.
The CLI export test uses an independently encoded 16-bit grayscale companion and
checks generated image packaging and GLB material bindings. A plausible-header
cache image with corrupted payload and a matching recomputed SHA digest must
still be rejected and regenerated.

Raw snapshots, runner, reports and logs are retained under
`generated/kowloon-png-native-20261112/`. No full repository test suite or manual
visual review is claimed. Concurrent user and agent changes are preserved.
