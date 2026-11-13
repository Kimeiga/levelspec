# Store obstruction surveys as triangle corners

Discarded highest-detail building drawings now use a separate `TriangleSurvey`
instead of constructing a render mesh and then extracting its positions. The
survey retains the exact triangle-corner stream used for sign obstruction.
Normals, UVs, colors, indices and per-triangle surface/solid assignments are not
stored in that intermediate representation. The render mesh stays valid and empty.

For this frozen scene, **654,278 survey triangles** require **5,888,502 position
values**, replacing **21,591,174 position/normal/UV/color values**. That is **72.7%
fewer numeric attribute values stored in the intermediate representation**
(33 → 9 per triangle), plus removal of 1,962,834 indices, 654,278 surface indices
and 654,278 solid-ID slots. This is not a measurement of total allocations or
process memory: callbacks, scratch data and the final Float64 snapshot still exist.

The single paired timing was **slower: 3.257 s → 4.261 s for dressing**. Peak RSS
also increased. **No elapsed-time or whole-process memory improvement is
established.** Other work slowed substantially too, but this experiment does
not establish the cause of that variation or rule out runtime effects of the
change. The measured result is a semantic storage reduction with matching output,
not a claimed compile-speed win.

## Representation and integration

`TriangleSurvey` owns an append-only array of world-space corners, nine numbers
per triangle. All writers share its triangle count. `snapshot()` returns an owned
Float64 array; later appends or caller mutation cannot change previous snapshots.
It is a separate type, never a partially populated `MeshData`.

- `KitMesh` receives an optional survey collector instead of a separate purpose
  string. Survey emission retains its existing 1e-5 m coordinate rounding and
  stores only positions. Ordinary render emission remains complete.
- Roof decks pass the same collector into the shared ground builder. Direct
  ground triangles retain their original raw transformed coordinates and
  degeneracy test. Counts and admission include earlier kit triangles.
- Ground's boxed-litter path passes the collector into `KitGeometry`. It retains
  Float32-derived transformed positions, mirrored winding, weather-driven
  subdivision, callback order and whole-box budget preflight. Decks currently
  disable litter, but the shared ground survey contract covers all its writers.
- Lower-detail building generation snapshots this collector. Highest-detail
  retained generation still extracts its actual render mesh. All hosts still
  participate in the global highest-detail sign-obstruction survey.

The old `purpose` and `collectAppearance` switches are removed from these APIs;
collector presence supplies one authoritative output choice. Receiver/deposit
omission and metal-appearance bypass retain the prior survey semantics. Timber
subdivision, material/height availability, field sampling and all geometry
decisions remain active. Pen tint callbacks and box weather callbacks still run;
they may affect deterministic producer state. This change does not broadly skip
attribute calculation, only unnecessary storage and selected pure ground emission
calculations. Material/surface metadata needed by ground planning remains local.

Kit triangle caps and 2,048-triangle abort checks use the shared survey count.
Ground retains its independent 2,000,000-work limit and abort checks, including
planning and degenerate work. Box admission still checks the entire box before
mutation. Retained rendering still uses its remaining global budget; sketches
keep their existing full sketch allowance. No fidelity setting or geometry
simplification changes, worker, cache, public compiler option or Rust code is added.

## One profiled comparison

| Measure | Original | Positions-only survey |
| --- | ---: | ---: |
| Survey triangles | 654,278 | 654,278 |
| Survey position/normal/UV/color values | 21,591,174 | 5,888,502 positions only |
| Survey render attributes after drawing | 21,591,174 | 0 |
| Survey drawing time | 0.777 s | 0.851 s |
| Retained building drawing time | 1.211 s | 1.730 s |
| Complete dressing time | 3.257 s | 4.261 s |
| Process CPU during dressing | 6.280 s | 8.221 s |
| Process high-water RSS after dressing | 1,686,624 KiB | 1,918,656 KiB |

Survey drawing's share of dressing changed from **23.85% to 19.96%**. This is a
ratio within each observed run, not proof of a speedup. The overall elapsed time
increased 30.84%. Process CPU includes runtime helper threads; procedural drawing
itself runs in one JavaScript isolate.

Selected V8 samples:

| Location | Measure | Original | After |
| --- | --- | ---: | ---: |
| `KitMesh.add` | self | 467.3 ms | 411.2 ms |
| `KitMesh.finished` | self | 101.9 ms | 69.3 ms |
| `Pen.face` | inclusive | 762.7 ms | 739.4 ms |
| `WeatheredPen.face` | self | 170.7 ms | 261.7 ms |
| `BuildingJob.appendTo` | inclusive | 186.3 ms | 254.5 ms |
| Garbage collection | self | 514.7 ms | 546.7 ms |

Inclusive samples overlap, inlining can change attribution, and GC is globally
attributed. These values cannot be summed into a causal explanation. Lower write
counts do not guarantee a lower RSS or latency in a short fresh-process run.
The change is retained for the simpler survey data contract and deterministic
storage reduction; its timing status remains unproven. Do not cite this report as
an additional percentage reduction in compilation time.

## Evidence and boundaries

The two processes use Node 24.12.0 on Apple M4/macOS arm64, the same demo source
and driver, and frozen source snapshots. Both fingerprints stayed stable. The
optimized snapshot changes only the eight production files in this cutover.
Concurrent edits to clean-wall facade/deposit handling in `skin.ts` were preserved
in the workspace but excluded from the optimized benchmark: only our survey guard
was applied to the frozen original skin file. Thus the comparison isolates this
change and does not measure those concurrent facade edits. The other seven
edited production files match the optimized snapshot.

The driver registers library materials, temporarily removes dressing for native
setup, restores it, then profiles `applyDressing`. Native setup disables navigation,
contact and floor-gap audits because undressed proxy buildings overlap walls that
dressing replaces; dressing validation and budgets remain enabled. Timing excludes
startup/native compilation, material decoding, rasterization/cache assembly,
final mesh binding, navigation, exports, output hashing and chart sampling. RSS
includes setup but excludes subsequent hashing. Both variants use identical
lightweight draw/registration instrumentation, which adds overhead.

All recorded equivalence fields match:

- The three highest-detail survey streams, hashed as raw Float64 bytes, including
  triangle order and emitter-specific precision.
- Complete retained mesh, material definitions/identities, surface metadata,
  provenance, ground plans, sign plans, diagnostics and physical mesh JSON digests.
- All **96,623** chart descriptors and center/one-column row samples, appearance
  and vertex tint, and coverage evaluations. These function checks are sampled,
  not proof over every coordinate. JSON hashes normalize signed zero; survey
  hashes and analytic tests retain that distinction.

The original four survey tests pass on the frozen baseline. The updated five
survey cases pass within **21 focused tests** covering surveys, jobs, receiver
plans, face emission and sign caching. **Twelve ground tests** also pass, as does
**`npm run check`**. Tests compare the real retained high-detail stream against
medium and reflected/yawed low-detail surveys, interleave kit/box/deck writers,
check raw versus rounded coordinates, callbacks, snapshot ownership, empty render
buffers, shared caps and recovery. Independent test and implementation reviews
approved the change and assessed its evidence.

One completed before/after drawing pair was run. No full-suite pass, new full-compile
timing, rendered-image comparison, browser acceptance or repeated timing campaign
is claimed. Earlier unrelated full-scene/facade failures were not rewritten or
given relaxed budgets as part of this work.

## Remaining decisions

The survey still executes detailed shape construction and many temporary vector,
UV and color calculations. The new representation separates those responsibilities
without changing the shape algorithm. A future attribute-free drawing interface
must explicitly handle callbacks, weathering subdivision and geometry-sensitive
material settings; blindly suppressing them could change both this and later
geometry. Avoid spreading ad hoc survey branches through every prop producer.

Do not add another storage abstraction, chunk allocator or generalized prefab
cache based on this one run. Likewise, a subsecond target is not demonstrated.
The remaining larger decision is whether to deliberately change the obstruction
algorithm or use transferable building jobs after shared planning. Both need
evidence for sign behavior, host imbalance, transfer cost and final assembly.
The existing raw-corner contract is a useful boundary for such work, but is not
itself a parallel implementation.

Guardrails: retain each emitter's precision; count every writer against one
budget; never pass incomplete render meshes downstream; keep retained output and
sign decisions in differential checks; separate storage counts from elapsed-time
and memory claims. Measure steady execution under controlled conditions before
claiming this representation improves latency or deciding whether to revert it.

Machine-readable evidence: [comparison and profiles](position-survey-2026-11-12.json).
Frozen sources, driver, narrow diff, raw profiles and test logs remain under
`generated/kowloon-position-survey-20261112/`.
