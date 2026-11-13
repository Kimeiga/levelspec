# Large finished-material artifacts

This extends finished-material pre-baking to the large maps left out of the first
implementation: **ground pours, roof decks, native walls, finite tiled/stained
facades, and stained panels**. Painted door panels, frosted glass, and tank shells
also opt in. No geometry is cached, no texture density is reduced, and no new
appearance approximation is introduced. The finite maps retain their complete
cracks, repairs, wetness, layering, roughness, normal detail, and fixture stains.

The previous warm cache still evaluated **501 jobs / 58,394,535 channel-texels**.
The extended warm cache evaluates **116 jobs / 3,523,398 channel-texels**:
**93.97% less remaining pixel work**. All accepted before/after builds have
identical render and physical hashes, complete appearance manifests, map bytes
and geometry counts. Resident output remains full resolution.

Warm elapsed observations are **101.705 s and 66.324 s**, versus **163.026 s** for
the preceding warm cache on the same frozen scene. Machine load varies too much
to claim a precise causal percentage. The eliminated work is stable across runs.
**The sub-second target remains unmet.**

## What the cache contains

The first build evaluates each eligible finish and stores its complete encoded
PBR maps. Subsequent builds bind those artifacts without resampling the procedural
field or re-encoding PNGs. This is material artifact reuse, not a cache of a whole
AML file or compiled scene. Every build still assembles and validates geometry.

Finite maps depend on their footprint and local effects. Resizing a pour or moving
a world-sampled native wall can therefore require another artifact. That is
distinct from the existing periodic facade patches, whose finished maps repeat
over differently sized walls. The extension retains exact finite finishes instead
of silently flattening their local details into one generic tile. Unchanged
finishes can survive unrelated layout changes; tests exercise that behavior.

The dependency boundaries are explicit:

- **Ground and decks:** resolved surface recipe, asphalt/deposit footprints,
  receiving/service edges, unit settings and material mappings, plus the pigment
  program's elevation, seed, grime/wear, relief/wetness, patch tone, phase,
  wetness, asphalt presence, and damage. A flush deck still has relief-dependent
  pigment even though its drawn geometry is flat.
- **Native walls:** station/path program, base and seed, wall condition, tile
  settings, UV mapping, inverse transform, world sampling frame, and weather
  parameters. World-position-dependent noise cannot use a translation-blind key.
- **Finite facades:** full condition and ordered runoff sources, repair program,
  seeds and source repeats, tile settings, and an explicit wash-program identity.
  Panel-center colors do not identify the sampler outside the panel or in its
  normal-map halo.
- **Fixture deposits:** the final ordered stack is added to the key after
  assembly, including each deposit's program, support bounds, and actual relative
  sampling transform. Roughness order and repair retention remain intact.
- **Painted components:** the complete live paint recipe, including late handle
  and recessed-panel additions. Receiver registration preserves getters; it cannot
  accidentally freeze an unfinished assembly's identity.

Source material properties, companion-image content hashes, output dimensions,
density and layer configuration remain compiler-owned key dependencies. The demo
disk namespace includes the compiler/generator source and dependency lockfile.
Unkeyed arbitrary callbacks or touching deposits remain uncached. Serializing a
function is rejected rather than silently losing that dependency from a key.

## Measurement method

The baseline is the preceding material-library implementation on a newly frozen
scene, not the older 84.5-second scene. It has **660,875 triangles, 1,940,265
vertices, 95,130 receivers, and 80,645,061 resident channel-texels**. The earlier
implementation already caches small materials, so its warm run is the useful
comparison for this extension.

Node 24.12.0 on Apple M4/macOS arm64, one raster isolate, fresh process per run.
Navigation, compilation-time parsing, image work and finalization are included.
Module startup, preliminary validation parsing, source-file reading, export,
browser upload and light baking are excluded. All source fingerprints are recorded.
No task-owned heavy tests or benchmarks overlap the timing runs. Other processes
and agents remain active; machine load is uncontrolled, so elapsed observations
are not a precise isolated speedup estimate.

| Variant | Elapsed | Raster interval | Dispatched jobs | Channel-texels baked |
| --- | ---: | ---: | ---: | ---: |
| Previous cache, empty | 256.375 s | 217.102 s | 9,118 | 80,645,061 |
| Previous cache, warm | 163.026 s | 115.806 s | 501 | 58,394,535 |
| Extended cache, empty | 133.500 s | 108.876 s | 9,118 | 80,645,061 |
| Extended cache, warm | 101.705 s | 44.066 s | 116 | 3,523,398 |
| Extended cache, warm repeat | 66.324 s | 35.520 s | 116 | 3,523,398 |

The preliminary optimized cold run, before ownership corrections, took 180.963 s
with identical output. The faster final cold observation is not attributed to
caching: all 80.6 million channel-texels still have to be baked when artifacts
are absent, and the extension adds artifact writes. Source snapshots exclude
concurrent visual changes, but they do not isolate the machine's execution speed.

The extended cache has **9,001 artifact files occupying 124,649,291 bytes** and
satisfies 9,002 planned jobs (one artifact serves more than one job). It reuses
77,121,663 channel-texels, or 95.63% of the full scene's texture work. Generated
output remains 87,842,251 encoded bytes; cache file storage includes metadata and
base64 overhead.

The same 256 MiB best-effort disk quota applies. Cache hits still count toward
resident texture and encoded-byte admission budgets. Cached PNGs are validated
before publication; decode/validation, source image loading, geometry assembly,
receiver joining and output finalization do not disappear when pixel baking does.

## Validation and evidence

**52 focused tests pass** in the first final validation snapshot, including twelve
large-material and constructor-ownership cases. They compare
actual bound artifact bytes, map dimensions, geometry and collision, cold/warm
output, unrelated-layout reuse, and invalidation after changing moisture, relief,
world placement, callback parameters, wash, runoff, and late fixture effects.
Overlapping stains are tested in both orders. Unkeyed producers/deposits remain
uncached and a later keyed build recovers. Mixed worker testing deliberately
evicts artifacts, so broader cache eligibility cannot accidentally turn a sparse
miss test into an all-hit test. No golden-art assertions were added.

TypeScript checking passes. Independent test review identified the callback and
late-deposit requirements before implementation. Independent implementation review
caught separately sampled native-wall base/seed inputs; the key and regression
coverage include them. Review also identified borrowed constructor data that
could change a sampled program under an existing key. Wall paths, ledges, ground
footprints, and resolved mappings now own snapshots; intentionally late-bound
paint/contact inputs retain their separate contract. Final current-code validation
also includes the concurrent opening-soot API and its opening-record snapshots.
Both reviews are closed with no outstanding implementation issue. The fresh
current-code snapshot also passes all 52 tests and type checking; browser bundling
was not rerun for this extension.

Raw frozen sources, manifests, test logs and profiles are under
`generated/kowloon-large-materials-20261112/`; compact measurement evidence is in
the adjacent JSON. Existing changes from other agents are preserved. Benchmark snapshots exclude
the subsequently added opening-soot algorithm to keep the baseline and optimized
scene identical; current-code validation includes that concurrent work. No full
repository-suite run or manual visual acceptance is claimed.

## Rules for subsequent optimizations

Measure **missed channel-texels and actual stage time**, not just how many jobs hit.
Large continuous maps dominated the first cache's remaining work even when most
small jobs were hits. Include complete explicit sampler inputs before making a
producer cacheable; a group name, seed alone, or handful of sampled colors does
not establish equivalence. Finalize contact/deposit programs before lookup, and
keep caches independent of receiver triangles or unrelated AML objects.

A separate instrumented warm run completed in **60.590 s** with identical output
and stable source fingerprints. A recording serial executor exposed the missed
job manifest while retaining original job order; this direct-compiler profile is
not a fresh uninstrumented demo timing replicate. All **116 remaining missed jobs
are sign faces**, totaling 3,523,398 channel-texels. Large ground/deck/wall/stained
facade jobs no longer appear in that list.

Inclusive sampled time attributes about **13.403 s to remaining rasterization**,
including **9.862 s in sign-face sampling**, **11.855 s to cached-artifact
validation**, **15.033 s to PNG decoding overall** (overlapping cache validation),
**0.704 s to PNG encoding**, and **4.817 s to receiver-edge reconciliation**.
Cache artifact-key hashing (`materialArtifactKey`) is about 0.160 s; late
deposit-key composition is 0.028 s. Recipe-key construction is separate.
These sampled categories overlap and asynchronous stacks are incomplete; they are
not additive stage timers or exact predicted savings.

The next focused work is therefore:

1. Give the remaining sign artwork/UV/tint programs complete explicit identities
   and persist their finished faces; do not hash their callback functions or infer
   equivalence from a few samples.
2. Reduce loading/validation overhead for already baked maps. The current safe
   path still parses thousands of JSON/base64 artifacts and fully decodes their
   PNGs to validate them. Preserve corruption detection, ownership and budgets
   when changing storage or validation.
3. Address source-image decoding, receiver-edge joining, and scene-buffer
   construction. In the instrumented run, even deleting the entire raster-stage
   interval would leave roughly **26.4 seconds** elsewhere. Material persistence
   alone does not establish sub-second assembly; geometry/UV asset reuse now has
   a clearer measured motivation.
