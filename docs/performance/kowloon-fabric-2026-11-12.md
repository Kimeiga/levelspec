# Kowloon reusable materials and grime: November 12, 2026

## Decision and scope

This investigation tests reusable material sheets, size classes, and shared contact
stains on the current full demo. The user permits deliberate appearance changes
and lower effective detail when contact decals are scaled. Base texture resolution
and shadow resolution must remain unchanged. The one-second target remains unmet. Both visual prototypes below were rejected
for production because neither demonstrated a useful full-scene speedup. Only the
behavior-preserving empty-deposit guard and its test remain in production.

The important distinction is **reusing a material calculation** versus **reusing the
finished material on geometry**. The present compiler samples each unique receiver-specific raster job, blends
its material layers, writes its full output images, and encodes those images even
when its inputs come from a shared stencil. Reusable inputs alone leave that work.

## Experiments

All runs use frozen snapshots, the same AML and assets, Node 24.12.0 on Apple M4,
one total isolate (`--workers 1`), navigation enabled, and the existing appearance/triangle
budgets. Each timing starts a fresh process. Assistant-owned heavy workloads ran
sequentially; external machine load was not controlled. CPU-profile runs are
instrumented and are not mixed into the uninstrumented comparisons. Raw snapshots,
reports, census, tests and prototypes live under
`generated/kowloon-fabric-20261112/`. Compact durable evidence accompanies this
report as `kowloon-fabric-2026-11-12.json`.

| Fresh-process compile | Runs (s) | Median (s) | Production decision |
| --- | --- | ---: | --- |
| Frozen baseline | 76.620, 76.617 | 76.618 | Reference |
| Empty-deposit guard only | 77.150 | — | Retained; no measured whole-scene gain |
| Cropped metal sheets + guard | 75.236 | — | Prototype only; insufficient evidence of useful gain |
| Shared stencils + guard | 79.388, 77.508 | 78.448 | Rejected; 2.4% slower median in this small sample |

The stencil profile (78.902 s) is excluded from that table. Two samples per main
comparison are evidence of no demonstrated win, not a statistical confidence
interval. All runs completed without diagnostics or source drift. Every variant
retained 543,230 triangles, 1,587,448 vertices and the same physical hash. The guard
retained the exact render hash and complete appearance manifest; visual prototypes
intentionally changed them. The stencil variant emitted 13,372 unique PNGs and
93,106,859 bytes, so sharing its input mask did not reduce final image production.

### Cropped metal sheets

The isolated prototype groups frame/cage finish sheets across hosts and seeds.
It rounds sheet width up to 1 cm and length up to 25 cm, crops actual meter UVs,
uses the existing workshop color palettes and two weathering variants, and retains
material IDs/repeats, projected gravity, aging settings and actual-face density in
its recipe identity. Exact geometry and collision remain unchanged. Colors and
contact patterns intentionally change. Mapped folded sheets, timber, and pipe
sweeps retain their existing behavior.

Unique jobs fell from **6,492 to 2,974**, and generated PNGs from **13,048 to 5,579**.
But allocated channel-texels fell only from **90,664,596 to 89,124,444** (1.7%).
Encoded image bytes fell from 93,095,615 to 89,611,728. One observed compile fell
from 76.620 s to 75.236 s; this is not a demonstrated repeatable speedup.
The unchanged large wall/ground maps dominate. Extra unused sheet area can also
cancel sharing: a preliminary power-of-two bucket census that retained every
paint/seed combination forecast *more* component texels, not fewer.

This prototype is not installed in production. Its proposed tests (not executed) and source remain in the
ignored experiment directory; no failing tests for an unshipped API remain in the
normal suite. Future sheet experiments must measure pixels, padding waste and
unique material recipes, not just job count.

### Shared runoff artwork

A second prototype builds a bounded catalog of four scalar grime masks, each
256 columns by 257 rows, spanning a repeating 2 m strip and 1.8 m downward reach.
The total private Float32 storage is 1,052,672 bytes (about 1.004 MiB). Seeds select
only a catalog variant and integer-column phase. Bilinear lookup returns scalars;
callers cannot mutate the masks. The first use bakes each requested variant once
per process. This is **not** a persistent disk bake and repeats in every worker.

The same artwork feeds roof/sill runoff, cropped/scaled fixture stains, and
projected-gravity contact-joint trails. Actual support, finite reach, tint, flow,
repair retention and contact direction remain placement responsibilities. Wall
material-loss bounds and swept-pipe gravity transport remain independent; replacing
those with a vertical UV stamp would lose their physical meaning. The user-approved
tradeoff is repeatable artwork and variable stain detail under scaling, not reduced
base-map density or shadow quality.

In a 500,000-point local benchmark, the four warm iterations had median wall
runoff times of **69.466 ms before versus 22.032 ms after** (3.15× faster). The
corresponding complete contact-patina calls took **179.188 ms versus 182.994 ms**
(2.1% slower). Each pair used identical inputs; artwork differs. One cold/warmup
iteration per case is excluded from those medians and retained in the evidence.
The full-scene timing, not that microbenchmark, determines whether it should ship.
The prototype still allocates the same 90,664,596 channel-texels and still runs the
per-job compositor and PNG encoder. This prototype and its tests were also
archived outside production after measurement.

### Clean receivers

A small production guard returns the original surface sample immediately when a
receiver has no deposits. It avoids point/frame allocations while reading the live
deposit list on every call, so later fixtures are still observed. Its isolated
run preserved the physical/render hashes and complete appearance manifest exactly.
The 77.150 s observation versus 76.620 s baseline establishes no whole-scene speed
benefit; keep this claim separate from the local reduction in needless work.

## Research and application

- **Trim sheets:** SideFX maps input geometry onto prepared trim strips and allows
  translation, rotation and scale. For LevelSpec, select a reusable strip and
  alter UV placement rather than constructing a new texture for each wall length.
  Preserve physical texel density for base PBR; scale only the decal channels where
  that tradeoff is authorized. [SideFX Labs Trim Texture](https://www.sidefx.com/docs/houdini/nodes/sop/labs--trim_texture.html)
- **Late variation:** Adobe recommends putting tweakable parameters near the end
  of a material graph so changes invalidate fewer cached intermediate nodes.
  For LevelSpec, cache intrinsic paint/concrete/ceramic first, then apply tint,
  aging strength and local masks. Avoid baking a tiny RGB variation into thousands
  of independent full PBR images. This is an architectural inference, not an
  Adobe benchmark of this compiler.
  [Substance Designer performance guidelines](https://experienceleague.adobe.com/en/docs/substance-3d-designer/using/best-practices/performance-optimization-guidelines)
- **Decals as placement plus material:** Epic separates the decal material from
  its actor/mesh placement and describes local color, normal and roughness changes.
  A drain prefab can therefore own a stain placement and reference shared artwork.
  LevelSpec currently flattens such deposits into host textures; it does not have
  Unreal's deferred decal passes. Direct binding needs an explicit renderer/export
  contract, not an assumption that a portable glTF material supports that pipeline.
  [Epic decal materials](https://dev.epicgames.com/documentation/unreal-engine/decal-materials-in-unreal-engine)
- **Dependency-aware preprocessing:** SideFX PDG distinguishes clean cached work
  from missing or stale outputs. LevelSpec's durable material cache must identify
  recipe version, all appearance parameters, source image content hashes, channel
  conventions and sampling settings. A file's existence or a chart label is not
  sufficient evidence that it is reusable.
  [SideFX work-item cache states](https://www.sidefx.com/docs/houdini/tops/pdg/workItemCacheState.html)

## Next optimization boundary

1. **Bind finished shared materials directly.** Build a small material catalog,
   bind its PBR images to geometry with crop/repeat UVs, and bypass receiver raster
   jobs for those surfaces. Start with the large repeated wall/ground families,
   not only the numerous but narrow metal members. The full compositor must remain
   available for genuinely geometry-dependent finishes.
2. **Keep variation late.** Separate intrinsic PBR, tint/aging controls, and placed
   grime masks. Rooflines use a repeatable middle strip plus local end pieces;
   fixtures own normalized stain placements. A drain and its grime become one
   reusable assembly, while footprint clipping remains exact.
3. **Use a finite prefab/recipe vocabulary.** Standardize manufactured prop sizes
   where appropriate. Do not round architectural openings or collision to make a
   texture cache hit. Measure dimension frequencies and atlas waste before choosing
   increments. Prefer a crop plus end cap over stretching detailed base normals.
4. **Persist reusable programs, not opaque callbacks.** Current chart labels and
   closures are not safe cross-geometry cache keys. Define serializable material
   recipes with explicit dependencies, then bake/cache encoded artifacts. Geometry
   transforms belong in placement unless a material explicitly depends on them.
   Keep material identity distinct from receiver identity.
5. **Parallelize only the unique remaining recipes.** A Rust implementation can
   bake those recipes independently and share immutable masks/source images. Use
   deterministic output IDs and assembly order, bounded scratch per worker, and
   cancellation before publishing. Replaying the complete scene in each worker
   or baking identical materials in parallel preserves avoidable work.

Guardrails: track allocated channel-texels, actually used atlas area, unique recipes,
output bytes, cold preparation, warm lookup, CPU time and peak memory. Include cache
invalidation and cross-host material isolation tests. Test geometry/collision,
UV scale, ownership, finite support and cancellation; do not freeze experimental
artwork with pixel goldens. A local microbenchmark win is not a compile-time win.

## Profile and verification

The instrumented stencil compile completed in **78.902 s**. Its stage report
still spends most time rasterizing and encoding. Sampled inclusive costs below
are nested; **do not add them** or interpret them as isolated benchmark timers.

| Sampled operation | Inclusive seconds |
| --- | ---: |
| Material field rows | 38.596 |
| Ground raster sampling | 9.857 |
| Source PBR image sampling | 6.854 |
| Metal component patina | 4.951 |
| PNG encoding | 5.154 |
| Final pixel writing | 3.928 |
| Retaining sample objects for derivative rows | 3.580 |
| Ledge runoff pigment | 0.590 |
| Shared stencil lookup, including cold preparation | 0.234 |
| Cold stencil preparation | 0.044 |

The earlier current-workspace profile sampled 0.784 s in ledge runoff pigment.
Replacing that entire operation cannot remove the tens of seconds in complete
material evaluation, sampling, copying, composition and encoding. Small input-mask
reuse is therefore a poor substitute for skipping complete raster jobs.

Before archival, all **20 focused tests passed**, including stencil interpolation,
periodicity/support, real reflected fixture receivers, retention, source UV/height
ownership, contact direction, pipe gravity, and late receiver deposits. Typechecking
passed. These tests deliberately avoid visual goldens. Independent preimplementation
test review, postimplementation review, and rollback/test-cleanup review completed;
no unresolved material findings remain. First-use synchronous mask preparation is
not guaranteed to meet the compiler's cooperative 8 ms scheduling target.

No screenshot/GPU visual acceptance or full repository-suite rerun was performed
for these rejected prototypes. The prior optimization report records the known
full-suite failures; this investigation does not claim to resolve them. Existing
compiler, metal and pipe validation tests remain in the normal suite.

After restoring the prototypes, the **15 remaining focused production tests and
`npm run check` passed**. Only the empty-deposit guard and its behavioral test are
retained from this investigation. No existing core tests were removed.


## Hybrid asset library and procedural assembly

The user's proposed direction is to generate varied walls, props and finish assets
beforehand, cache the completed results, and assemble cities from those assets.
Changing a style parameter can rebuild dependent assets asynchronously. This is a
proposed architecture, **not an implemented or benchmarked cache path**.

### Where reuse can pay off

The existing `baseline-repeat` run completed in 76.617 s. Its disjoint progress
intervals give the following breakdown; the corresponding values are preserved
in the JSON report's `moduleReuseAnalysis`.

| Work | Seconds | Share |
| --- | ---: | ---: |
| Material rasterization and image encoding | 65.478 | 85.5% |
| Procedural dressing planning and emission | 2.963 | 3.9% |
| Appearance geometry reconciliation and reassembly | 3.725 | 4.9% |
| Source image decoding | 1.865 | 2.4% |
| Mesh finalization | 1.210 | 1.6% |
| Receiver validation | 0.885 | 1.2% |
| Other setup, receiver binding and navigation | 0.492 | 0.6% |

These are stage intervals, not pure algorithm timers. Dressing includes planning
and emitting all props, not just flat walls. The stage labeled “joining receiver
edges” also rebuilds mesh data and binds preserved receiver UVs; it is not solely
edge matching. UV computation has no separate timer. No new compile was needed
for this breakdown: it derives from the completed frozen baseline, not the rejected
stencil prototype.

Finished-material reuse targets the dominant cost. Cached mesh/UV modules can
add savings in planning, emission and reassembly, but those savings must be measured
separately. Subtracting all raster work leaves about 11.139 s in this run; that is
arithmetic, not a measured cache-hit time or a promise that all raster work can be
removed. Loading assets, placing them and validating the city still take time.

### Prepared assets and live placement

Use a bounded library of procedural variants: wall fields, roof-edge strips,
corners, window/door surrounds, balcony pieces, pipes, drain-and-stain assemblies,
and other props. Store finished mesh buffers, local UVs/normals, shared PBR image
references, material slots, dimensions and attachment metadata. The map planner
selects variants and supplies placement, dimensions and permitted tint controls.
It does not rerun every prop's weathering recipe or create a new image per instance.

This resembles established modular building tools: SideFX defines wall/corner/ledge
modules, their dimensions, repeated floor patterns and weighted variations.
[SideFX Building Generator Utility](https://www.sidefx.com/docs/houdini/nodes/sop/labs--building_generator_utility-2.0.html)
The LevelSpec architecture below is an application of that pattern, not a claim
that this external tool establishes our performance.

For a flat wall, the “large slab” can be logical: a reusable finished surface plus
a small planar template. Generate or clip its boundary and interpolate meter-based
UVs at the cut. A dense giant mesh and general-purpose solid Boolean operations are
unnecessary for ordinary rectangular pieces. Openings need real geometry cuts,
and exposed ends/reveals need appropriate surfaces. Preserve the existing map's
physical boundaries, collision and navigation independently of visual assembly.
Detailed trim and prop geometry benefit more directly from complete mesh reuse.

Do not rebuild textures or unwrap an entire mesh after a cut. Keep texture density
fixed through metric UVs; scaling a panel should not stretch its brick, tile or
concrete grain. Decal art may be scaled under the user's separate detail allowance.
Identical pieces should retain shared immutable buffers where the runtime/export
format supports it. The current runtime primarily stores a flattened mesh; copying
cached arrays into that mesh still incurs assembly/hash/upload cost. GPU instancing
and compiler-side caching are separate optimizations.

### Parameter changes and asynchronous rebuilds

Split controls by what they invalidate:

- Placement, variant selection and whole-material tint can often change without
  rebaking images. The current reviewer already multiplies material and vertex
  colors. Selective paint/grime tint needs separate material slots or an explicit
  mask-aware renderer; a blanket tint also colors the dirt.
- Grime intensity can be cheap if the renderer blends a cached grime mask and its
  roughness/normal contribution. That richer layered-material path is not currently
  provided by the flattened PBR bake. With portable finished-map materials, a grime
  change rebuilds only grime-dependent recipes or selects an existing baked grade.
- Changing crack structure, erosion, silhouette, or the underlying recipe rebuilds
  the affected material/mesh variants. Unrelated intrinsic concrete, props and other
  recipes retain their cached artifacts.

Represent these dependencies explicitly. Cache keys include generator/schema
version, recipe parameters, deterministic variant seed, source asset hashes,
channel conventions and required density. Receiver IDs and arbitrary object sizes
must not defeat reuse when they only change placement/cropping. Cap variant counts
and storage; generating every color × grime × size combination can be worse than
procedural generation. A finite catalog plus late variation avoids that explosion.

Background rebuilding should produce immutable artifacts and a versioned manifest.
Keep the last complete manifest visible while work proceeds. Coalesce rapid slider
updates, cancel superseded work, and publish only the newest requested generation
once all its dependencies are ready. A failed or stale worker must not replace the
active library or leave half of the city referencing missing images. Offscreen
prewarming and progress reporting are useful; asynchronous work improves interaction
latency but does not by itself reduce total computation.

### Benchmark the migration in independent steps

1. Preserve the completed full-demo baseline. Record planning, unique recipe bake,
   image encoding/loading, clipping/UV assignment, assembly, finalization and
   navigation separately; instrument currently combined stages before making
   claims about pure UV or mesh-cache savings.
2. Introduce direct finished-material reuse while retaining procedural geometry.
   Measure cold catalog creation separately from warm city assembly; count actual
   remaining raster jobs/texels. Cache hits must bypass evaluation and encoding.
3. Reuse the same material library with cached mesh/UV modules. Compare against
   step 2 to isolate the additional geometry benefit. Keep variants, placements,
   clipping and physical boundaries equivalent between those two cases.
4. Measure a second layout, a color-only edit, a grime edit, and a source-texture
   edit. Report cache hits/misses and invalidated recipes. Include fresh-process
   loading, warm in-memory assembly, peak memory, library bytes, and at least three
   isolated runs per timing condition. Report export and first visible frame
   separately from compiler completion.
5. Verify deterministic selection, source ownership, openings, normal/UV transforms,
   physical identity, bounded storage and atomic cancellation/recovery. Judge the
   experimental appearance separately; do not encode its pixels as golden tests.

The intended performance contract is fast assembly from a prepared library, with
explicitly measured preparation and parameter-rebuild costs. Sub-second assembly
is still a target, not a demonstrated result, and should not be presented as
sub-second cold generation of the entire asset library.
