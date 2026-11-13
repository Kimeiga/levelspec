# Geometry allocations and the next parallel boundary

The remaining warm compile cost is spread across procedural construction,
receiver validation, source decoding, cached-material assembly, mesh binding,
edge conformance, and finalization. There is no remaining dominant material
rasterization workload on this frozen scene: all **9,173 artifacts hit**, with
**zero raster jobs**. Adding more raster workers cannot accelerate these hits.

This change removes small, demonstrated allocation costs and separates misleading
phase measurements. It introduces no cache, worker pool, new geometry algorithm,
or texture/shadow resolution change. The next substantial architectural step is
to establish independently executable building jobs after shared planning, with
deterministic assembly. Rust remains a later option for isolated measured kernels.

## What changed

- `src/dressing/geometry.ts`: append each triangle's three corners directly instead
  of flattening four temporary arrays for positions, normals, UVs, and colors.
- `src/dressing/surface/regions.ts`: copy preserved/untouched vertex attributes
  directly. UV receivers no longer allocate positions and relative coordinates
  that their authored UV path does not use. Untouched triangles construct their
  junction geometry only when their source owner actually participates in seams.
- Add progress boundaries for **binding preserved geometry** and **closing
  displaced seams**. The old **joining receiver edges** interval included both.

Arithmetic order, source order, receiver-specific vertex sharing, material and
solid ownership, triangle limits, cancellation checkpoints, and detached input
ownership remain unchanged. Projected dot products retain the original initial
`+0` and left-to-right additions. Zero color components remain zero. There is no
new runtime option or compatibility path.

## One frozen comparison

Both runs used Node 24.12.0 on Apple M4/macOS arm64, fresh processes with V8 CPU
sampling, a serial raster executor, navigation enabled, and the same warm artifact
directory. The scene is the prior sign-cache experiment's frozen source; it is
not a snapshot of every concurrent visual edit in the shared working tree.
Only the two production files above differ between variants. Saved pre-edit
files matched that frozen source byte for byte.

The timer covers compilation, including material work and navigation. It excludes
startup/imports, initial AML file reading, fingerprinting, artifact export, GPU
upload, and light baking. CPU profiles also include startup and report work, so
their sample totals are not interchangeable with compile-stage wall durations.

| Measurement | Before | After |
| --- | ---: | ---: |
| Compile wall time | 17.630 s | 29.580 s |
| Process CPU during compile | 27.792 s | 43.710 s |
| Cache reads/hits | 9,173 / 9,173 | 9,173 / 9,173 |
| Raster jobs / channel-texels generated | 0 / 0 | 0 / 0 |
| Source PNG decodes | 14 | 14 |
| Output triangles | 859,305 | 859,305 |
| Output vertices | 2,535,555 | 2,535,555 |

**These runs do not establish an end-to-end speedup.** The after run was slower;
unchanged source decoding grew from 1.310 to 2.819 seconds, and unchanged
cached-material assembly from 2.579 to 5.120 seconds. Load/runtime variability is
a plausible confound, not a proven explanation for the entire difference. We did
not repeat whole-scene runs to chase a favorable result. The retained changes
remove known temporary work with simple code and identical output; timing benefit
remains unestablished.

The profile's self samples in `triangle` fell from **1.133 to 0.797 seconds** even
in the slower after run. `ReceiverEdges.points` inclusive samples rose from
2.212 to 3.202 seconds; its implementation did not change. Main-isolate GC samples
were 1.133 and 2.410 seconds. These observations support distinguishing allocation
work from actual edge-search work, but do not prove a whole-pipeline GC reduction.
Inclusive samples overlap callers and must not be summed. Process CPU also
includes runtime/background work; serial raster execution does not imply the
entire Node process uses only one operating-system thread.

Both runs have identical render and physical hashes, the complete surface
appearance manifest, diagnostics, and source hash. Each source fingerprint stayed
unchanged during its run. Image dimensions, encoded image hashes and resident
channel-texel counts match, so the change does not trade fidelity for speed.

## Where warm time goes

The after run provides a finer breakdown. Percentages are from this individual
observation and will vary with load and scene content.

| Stage | Time | Compile share |
| --- | ---: | ---: |
| Procedural dressing | 8.400 s | 28.4% |
| Receiver validation | 2.780 s | 9.4% |
| Source image decoding | 2.819 s | 9.5% |
| Cached-material assembly (progress says rasterizing) | 5.120 s | 17.3% |
| Edge index and displaced-record conformance | 1.621 s | 5.5% |
| Preserved geometry binding and adjacent-face registration | 6.062 s | 20.5% |
| Final seam closure | 0.091 s | 0.3% |
| Mesh parts and finalization | 1.691 s | 5.7% |
| Remaining setup, receiver preparation and navigation | 0.996 s | 3.4% |

**Binding still includes edge searches on unchanged neighbors of displaced
surfaces.** Its 20.5% is not solely array copying. Likewise, the old report's
roughly 28% “edge joining” was not solely spatial lookup. The actual query kernel
is still material: `ReceiverEdges.points` accounts for about 3.2 seconds of
inclusive samples in the after process, with `candidates` about 2.1 seconds self.
Final seam closure itself is small on this scene.

`ReceiverEdges` exists to insert already-existing vertices along long source edges
before nonlinear displacement; omitting it can create cracks. Its current query
walks a segment in 5 cm stations, visiting 27 neighboring cells and deduplicating
cell keys. Construction indexes the full input positions when displaced records
exist. Preserved material-only scenes already avoid this entire index. This is
not a reason to add a second spatial index blindly.

## A bounded optimization order

1. **Small remaining waste, only with a local justification.** Receiver validation
   still constructs temporary coordinate arrays and separately checks UV and
   preserve conditions. A scalar validation pass is a plausible follow-up, but
   must retain both contracts, their different bounds tolerances, malformed-input
   rejection, and source-linked errors. Do not remove validation because inputs
   came from a built-in producer. Avoid turning this into a broad array rewrite.
2. **Measure repeated edge work before redesigning it.** Count unique/repeated
   queried segments, occupied bucket visits, and owner sizes in an isolated
   instrumented run when this stage is revisited. That distinguishes repeated
   topology queries from poor bucket occupancy. Reuse of exact shared-edge results
   or bounded relevant-component processing may be simpler than a new index.
   Neither is implemented or proven here. Cross-owner vertices currently affect
   conformance, even though seam welding is owner-limited; an owner-only index
   must not silently discard those constraints.
3. **Establish a building job boundary before adding workers.** This is the next
   substantial pipeline improvement after these narrow cleanups. First make one
   building produce an owned result under the existing serial orchestration.
   Prove identical assembly, then compare one versus two execution lanes once.
   Do not build a generic scheduler or whole-scene incremental cache first.
4. **Consider Rust only for a measured kernel after transfer costs are known.**
   Edge candidate/conformance processing or dense geometry emission are better
   candidates than porting all AML, diagnostics, materials, and orchestration at
   once. Keep the deterministic data boundary useful to either JS workers or a
   native/WASM implementation. Porting JSON hashing alone would leave much of its
   serialization cost unless the hash contract also changed deliberately.

## Parallelism opportunities and dependencies

### Building generation: strongest first candidate

`KowloonBuildings` plans all sites together: obstacle volumes, ground support,
foreign building extents, lot recipes and clearance decisions depend on the
whole scene. Keep that shared planning phase authoritative and freeze its results.
Then each host's facade/roof/prop drawing can become a job using its existing
host-derived random seed. The profile attributes 3.783 seconds before and 4.783
seconds after, inclusively, to building drawing; this is a measured useful slice,
not a promise that all procedural dressing is independent.

Current drawing mutates the level's mesh, surfaces, materials, provenance,
diagnostics, receiver registrations, and shared sign book. These are the required
boundary changes, not incidental thread-safety details. A job should return local
geometry and local identities plus material/receiver descriptions and proposed
signs. Assemble in source/rule order with explicit index offsets and deterministic
identity resolution. Retain one global triangle budget, failure attribution,
cancellation, and atomic publication; per-worker budgets cannot each consume the
whole scene allowance.

The sign survey must remain after all building geometry is available. Lower detail
settings currently also draw highest-detail geometry for that survey: a useful
future cost to examine independently, not something removed here. Cross-building
spans and contact-dependent placement need their own ordering review.

Receiver recipes currently contain closures and live in a `WeakMap`, and sign
proposals may capture drawing context. These cannot simply be posted to a worker.
The first extraction should reveal the smallest explicit descriptors needed;
avoid shipping a complete `CompiledArchitecture` or rerunning all buildings in
each worker. Keep arbitrary callback-based compiler inputs supported through
their current serial path rather than attempting to serialize functions.

### Binding and seams: possible second boundary

Preserved receiver mapping can compute local attribute ranges, but chart-specific
vertex sharing and deterministic surface assignment must survive assembly. A
memory-heavy worker copy of the complete mesh could outweigh its arithmetic.
Separate per-chart work from adjacency registration before estimating speedup.

Seam matching is confined to source owners, suggesting owner/component jobs after
a shared conformance pass. Preserve the global coordinate-scale tolerance used by
`SurfaceJunctions`, ambiguity handling, and original boundary context. Arbitrary
triangle chunks would lose cross-chunk edges and corner fans. The final closure
phase is only 0.3% here, so parallelizing closure alone has little value.

### Existing raster pool and other stages

The current cold-raster pool replays scene generation in each worker to recover
callback recipes. It reserves roughly 1 GiB per scene replica before image and
scratch allowances. That design can amortize replay against expensive uncached
raster work; it is dormant for these zero-job warm builds. Extending it by replaying
the city to parallelize city generation would duplicate the work we want to save.

Source decodes are independent but account for only 7–10% in recent warm runs;
prefer a bounded batch if pursued, accounting for decoded-image ownership and
transfer cost. Cache reads use asynchronous I/O already; more CPU workers are not
the first remedy for file latency. Navigation uses the separate physical mesh and
is only 0.7% here; overlapping it is low priority and must preserve publication
and cancellation behavior.

Node's guidance supports pools for CPU-intensive work, warns that worker creation
can exceed task benefit, and distinguishes buffer transfer from shared memory.
Those are relevant implementation constraints, not evidence of a LevelSpec
speedup. [Node 24 worker documentation](https://nodejs.org/docs/latest-v24.x/api/worker_threads.html#worker-threads).

Even the generous assumption that all 28.4% of procedural dressing could run
perfectly on four lanes gives only `1 / (0.716 + 0.284 / 4) = 1.27×` total speedup,
before transfer, merge, imbalance, and memory costs. Real building-only gains are
smaller. No single worker change makes this scene sub-second; avoid designing
around that unsupported expectation.

## Validation and retained evidence

Eight focused tests pass: receiver sharing, mixed bound/untouched attributes,
holes/collision preservation, distinct projected UVs, preserved/displaced
adjacency, retained native caps, and closure triangle budgets. The new mixed-face
case also passed against the pre-change implementation, with independently
calculated UVs and authored colors including zero. These are compiler contracts,
not visual-style snapshots. Existing checkpoint cadence was retained.

Independent preimplementation test review and final implementation review both
approved; the added test received follow-up review. Whole-repository type checking
currently fails at `tests/surface-reusable-material.test.ts:322` and `:350` because
`grime` is absent from `FacadeMaterialSettings`. Those files were not changed in
this work; no type errors were reported in the changed files. This is not a clean
whole-repository typecheck result.

Machine-readable evidence: [comparison and profiles](geometry-pipeline-2026-11-12.json).
Ignored local evidence is under `generated/kowloon-geometry-pipeline-20261112/`:
the frozen optimized source, original files, narrow implementation diff, benchmark
driver, CPU profiles, logs and full reports. Baseline source and the shared warm
cache remain under `generated/kowloon-sign-cache-20261112/`. No second timing
campaign, cold-cache run, browser visual acceptance, parallel speedup experiment,
or Rust implementation is claimed.
