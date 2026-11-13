# Kowloon optimization plan after the texture cutover

**Superseded constraint, November 12:** retain texture and shadow resolution.
Density reductions and lower-resolution masks discussed below are historical
proposals, not the current optimization plan. Use the
[updated profile](kowloon-2026-11-12.md) for the substantially expanded scene.

Status as of November 11, 2026. This is an implementation plan supported by the
existing CPU profile, further call-tree analysis and inspection of its matching
exported demo. This analysis originally made no production changes. The subsequent
implementation now ships shared scheduling, the sRGB table, shared raster rows,
bounded repair painting and per-column wall station reuse. See
[implementation measurements](../PERFORMANCE.md#single-threaded-reuse-implementation).
Density changes, mesh representation changes and runtime layered materials remain
future work. Wall station reuse removes per-row searches while retaining the
existing miter selection once per column, avoiding a new segment-ownership contract.

The baseline remains **9.145 seconds median** over three fresh processes and
**9.175 seconds** in the matching profiled run. Compile includes navigation and
excludes imports, parsing, export and browser upload. All 308 entries in the
frozen source manifest still match the workspace. The sub-second cold-compile
target remains unmet.

## Further findings

### Most texture work serves native walls

The exported GLB contains 341 raster materials. The allocation below counts
pixels separately for each generated color, metallic/roughness or normal map,
matching the compiler's 4,037,444 channel-texel budget. Family classifications
come from generated material names.

| Receiver family | Raster materials | Channel-texels | Receiving triangles |
| --- | ---: | ---: | ---: |
| Native walls | 117 | 2,361,057 | 309 |
| Facade skins | 44 | 898,290 | 9,664 |
| Ground and other surfaces | 78 | 686,781 | 20,924 |
| Small panels | 102 | 91,316 | 204 |

Native walls consume **58.5%** of this allocation. Their cost depends mainly on
surface area, resolution and field evaluation, even though their geometry is
already small. Halving their density from 32 to 16 texels/m would reduce their
allocation to 647,184 channel-texels with the current padding rule. That would
remove **42.4% of the whole scene's allocated channel-texels**. This is a work-count
projection, not a measured time saving or a quality-approved change. Existing
tile filtering must use the new footprint, and normals need visual inspection.
Shared detail textures are the better long-term way to retain close-up resolution.

Panel maps contain 45,658 spatial pixels, of which 27,052, or **59.2%**, are the
two-pixel border. This is real overhead, but panels account for only 2.3% of the
whole channel allocation. Start with their per-map scheduling overhead before
introducing an atlas packer. Packing already-baked images cannot eliminate field
evaluation or its cost.

There are 921 output channel bindings and 903 distinct generated PNGs. Existing
content deduplication happens after baking and encoding. Duplicate bindings
account for just 33,331 allocated channel-texels, under 1% of the total. Moving
that deduplication earlier alone has limited headroom on this cold workload.
Forty-five distinct generated images have constant RGB, including constant normal
and metallic/roughness outputs. Recipe-proven constant channels could use scalar
factors or shared tiny maps. Detecting constancy after a full bake only saves
output work, and dropping a constant normal requires checking its actual vector.

### The field API repeats work that a raster pass could share

`skin.ts` asks `renderRepairSample` independently for tint, repair coating coverage,
deposit retention and normal height. The profile attributes 0.855 seconds to that
function, distributed across those callers. Each evaluation walks every repair
and allocates intermediate region-distance arrays. `renderVariation` is also
requested twice at the same surface point.

The same facade point evaluates `WallCondition.sample` through `plasterSample`,
`renderPatina` and `condition.tint`. `plasterSample` requests dampness and runoff
again for roughness. It first multiplies by the condition tint, then the raster
producer divides that tint out to replace it with patina. Expressing the intended
final appearance directly avoids those repeated evaluations and intermediate
layers. Preserve the arithmetic initially where byte-identical output matters.

Ground normals repeat the complete `GroundSurfaceField.sample` through
`renderedHeight`, including layer construction and UV calculation. The color
pass then samples the field again. The current three-row bump window already
avoids repeated neighbor-height evaluation. Extend that sharing to the material
and height result at each coordinate. A one-entry memo is insufficient because
bump and color currently traverse separate rows.

### Repair placement requires no spatial lookup

Repairs are already planned as unions of rectangles in the receiver's meter
coordinates. Rasterization also knows its exact pixel grid. Process repairs in
their authored order and visit only the pixel rectangles they can affect, expanded
by the existing 0.06 m conservative influence margin. Evaluate each patch once
per pixel even when its component rectangles overlap. Preserve patch overlap
order, ragged boundaries, tint, age, coverage and height composition.

This replaces a per-pixel scan over all patches with direct painting into known
bounds. Approximate work changes from `pixels × patches × regions` to
`pixels + sum(affected patch pixels × regions)`. A row sweep can keep ordered active
patch spans and a small output-row window. It needs no generic nearest-space
index. A full repair atlas is simpler but must count its transient memory against
the resource budget. Choose between these only after measuring real patch and
row counts.

### A remaining ground algorithm enforces an obsolete art policy

`GroundTileErosion.retainedArea` takes a 16×16 sample grid to estimate a tile's
remaining area and compactness. Some tiles repeat that grid after changing the
cutoff. This consumed **0.167 seconds inclusive** in the profile, within 0.418
seconds for tile retention and 0.663 seconds for the broader ground-field category.
Those nested figures must not be added together.

For texture-only recipes, replace the remnant-area policy with deterministic tile
states such as intact, missing and chipped, followed by a bounded local erosion
mask. This changes experimental appearance deliberately. It does not authorize
changes to authored displacement, terrain support or physical geometry. Keep
geometric recipes' coverage semantics until separately redesigned.

### Timer and allocation overhead is measurable

The current raster row rule predicts **561 timer yields** for these 341 maps.
Copying the 222,915 receiving/unaffected triangles requests another **218**, plus
seven during receiver registration. These are counts derived from dimensions
and loops, not measured timer durations. The profile contains 519 observed idle
runs totaling 1.023 seconds, with a 1.5 ms median run. Sampling can miss or merge
waits, and idle includes asynchronous hashing and other work.

Use one compile-scoped elapsed-time scheduling budget across charts, rows and
receiver copying. Start with an 8 ms cooperative work slice, then measure actual
maximum uninterrupted work and cancellation latency. Check the abort signal at
bounded work intervals even between yields. Preserve event-loop turns so a timer
or browser message can deliver cancellation. Do not yield merely because an
image started. Account for synchronous codec calls when evaluating responsiveness.

Color sampling repeatedly computes the same sRGB conversion for byte values.
Prefer a **256-entry Float64 lookup table**, about 2 KiB, to prelinearizing all
source images. The ten decoded inputs contain 12,056,536 pixels, about 46 MiB of
RGBA8 data. Full floating-point copies would substantially increase memory for a
conversion whose sampled self time is 0.142 seconds. Keep alpha, normal and
metallic/roughness channels linear. Reuse fixed numeric sample buffers and avoid
per-tap/per-layer arrays, preserving bilinear wrap and accumulation order.

### Geometry cleanup helps, but cannot carry this optimization

`drawSkin` still subdivides with a 0.9 m panel spacing, and `KitSurfaces.receive`
still partitions merge groups into 0.75 m cells. Its later registration clears
`mergeGroup`, so those kit cells cannot benefit from the preservation-aware merge
in `takeSurfaceCharts`. Preserved raster fields do not require this density of
appearance receivers. Remove artificial cuts and bins while retaining openings,
material/transform boundaries and necessary structural cuts. Continue attaching
all applicable deposits when receivers merge.

However, all facade skins together are only **4.3% of scene triangles**, and
`drawSkin` consumed about **0.066 seconds inclusive** during construction.
Removing its grid is a useful simplification with limited direct time savings.
The complete scene has 621,741 exported vertices for 222,915 triangles, about
2.79 vertices per triangle. Most kit triangles are emitted independently by
`KitMesh.add` and `triangle`. Those builders create short arrays, round/copy
attributes and append unshared vertices. The `triangle` calls beneath `KitMesh.add`
account for about 0.233 seconds inclusive.

The appearance stage also copies every unaffected triangle into a new mesh.
A preservation-only path can retain unchanged positions/normals and copy or
append only attributes that actually change. Keep the staged commit boundary,
source ownership and vertex splits at UV/normal seams. Shared mutable buffers
must not leak partial changes on cancellation or failure.

JSON geometry hashing accounts for 0.424 seconds inclusive. Compact typed buffers
and deterministic bulk writes would benefit building, binding and hashing. This
fits the Rust port, but changing hash serialization needs an explicit version
and cache invalidation. Do not drop physical/render identity checks for speed.

## Implementation sequence

Each numbered item should be independently benchmarkable. Re-profile after each
landed change and reorder the remaining work if its cost moves.

1. **Remove unconditional timer round trips and repeated byte conversion.**
   Add the shared work-slice policy and the byte-to-linear table. These are small,
   broadly applicable changes with bounded memory. Measure them separately before
   combining them. Require unchanged physical/render output and responsive cancel.
2. **Create one raster evaluation per coordinate.** Combine facade repair,
   variation, condition and roughness inputs, then share color/height evaluation
   through a bounded row window. Ground should reuse the same ownership result
   for color and bump. Replace repair scans with ordered bounded painting in the
   same cohesive producer change, rather than adding a general-purpose cache.
   Record field evaluations and patch visits as well as elapsed time.
3. **Bind native walls to their known generating segment.** Carry segment
   ownership from wall generation to the receiver, then compute station and
   local UV coordinates directly. Precompose the frame/inverse transform and
   reuse the condition sample. Preserve the current miter formula
   `station + length × from / (from + to)`. It becomes affine only where the
   denominator is constant on the receiver. Cap, joint, crossing and reversing
   paths need explicit ownership rules. Validate against the existing mapping
   on supported domains before removing the nearest-strip scan there.
4. **Reduce unique appearance work.** First compare 16 versus 32 texels/m on
   native walls using the same frozen scene. Inspect near and distant grout,
   corners, repair boundaries and normals without adding visual goldens. Then
   replace the texture-only ground remnant-area heuristic. Record each intended
   appearance change separately. Do not present output-hash changes as exact
   equivalence.
5. **Simplify retained mesh construction.** Remove obsolete facade spacing and
   receiver bins, then add a preservation-only binding path with explicit buffer
   ownership. Benchmark vertex counts, memory and hashing alongside time. Preserve
   the mixed displaced/preserved path and its edge-closure behavior.
6. **Move reusable detail into material assets.** Build shared tile/plaster/repair
   color, roughness and normal detail once. Per compile, produce low-resolution
   masks and parameters only. This is the major architectural route toward the
   one-second target, coupled with lower scene-construction/output costs. Prototype
   it on native walls first because they dominate the texture allocation.

The sixth item needs a material-contract decision. Current `Material`,
`review/scene.ts` and `src/vector/export.ts` bind one color, one normal and one
metallic/roughness map using the same UV set. They have no layered-mask expression.
A runtime blend therefore requires explicit material data, independent detail/mask
coordinates and renderer support. Standard baked PBR export needs a deliberate
flattening step at export time. Report cold interactive compile and flattened
export times separately. Moving a bake to export does not make the whole pipeline
sub-second. Keep ordinary PBR materials supported for authored inputs.

Do not promise a combined speedup from adding sampled function costs. Several
candidate changes target the same evaluation, and allocation, codecs and waits
interact. Even deleting the entire 6.159-second raster stage would leave about
3.0 seconds of this measured compile. Local kernel changes alone cannot meet the
cold full-scene target.

## Rust and later parallel work

Use immutable plans for hosts, material assets and raster jobs, with stable IDs
assigned before scheduling. Raster jobs can process independent receiver groups,
and mesh jobs can emit independent host buffers. Large maps can use row bands
with the normal-derivative halo and deterministic repair order. Share decoded
source images read-only. Reserve aggregate output and scratch memory before
launching jobs, and commit results in canonical order after successful completion.

Use flat typed buffers and explicit per-job scratch storage. Seed randomness by
stable host/feature identities, avoiding a shared RNG. Preserve cancellation,
source-linked errors and physical/render separation. Balance jobs by estimated
pixel/field work, since 341 maps have very different sizes. Measure the single-thread
Rust build first, then worker counts and peak memory. Sending huge object graphs
or separately decoding every source image per worker could erase the gain.

Persistent asset caches and incremental recompilation remain useful for editing,
but need separate warm-cache metrics. They cannot count as achievement of the
cold demo target.

## Verification and evidence

Use three or more fresh-process runs per variant, alternating frozen baseline and
candidate without concurrent assistant benchmarks or tests. Record source hashes,
median/range, stage times, vertices, receivers, unique raster jobs, channel-texels,
field evaluations, patch visits, yield counts, generated bytes and peak memory.
Use CPU profiling separately from the primary timing series. Add dedicated timer
and maximum-work-slice measurements before attributing all idle time to yielding.

Keep core coverage for real openings, normals/UV seams, winding, collision and
navigation isolation, material/color math, resource limits, source immutability,
abort/failure atomicity and recovery. Use output hashes as temporary experimental
A/B evidence for structural optimizations, not permanent tests of art choices.
For changed appearance algorithms, use stable physical hashes and manual renders.
No new visual golden tests are planned.

Machine-readable evidence is in
[kowloon-2026-11-11-optimization-analysis.json](kowloon-2026-11-11-optimization-analysis.json).
Local analysis scripts and detailed output are under
`generated/kowloon-optimization-plan-20261111/`. The CPU profile and source snapshot
remain under the previously recorded profile and texture directories.
