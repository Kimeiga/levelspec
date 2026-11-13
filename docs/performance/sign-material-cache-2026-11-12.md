# Cache complete sign finishes

Implemented November 12, 2026. This extends the material cache to the sign faces
that accounted for all remaining raster misses in the preceding profile. It also
removes constant-returning tint callbacks from textured sign painting. Texture
and shadow resolution, geometry and image encoding are unchanged.

## Changes and dependency boundary

The panel producer gives the completed artwork an explicit identity covering the
complete design: text, typeface, direction, block allocation, ink/shadow/ground/
border colors, shape, dimensions, construction, age and phase. The identity also
includes the atlas layout/advances, lettering mode, and each used material slot's
role, source ID and repeat. The face adds captured grime/wear/rust controls.
The compiler supplies source material properties and image content hashes,
effective output layout/density and receiver frame dependencies; the existing
deposit system supplies any relevant contact-layer identities.

`drawPanel` owns a snapshot of the design. Deferred sign sampling also captures
the aging scalars and artwork material IDs. Later caller edits cannot change the
sampled program while leaving its previously issued identity behind. Translation
can reuse the finish while the receiving geometry remains placement-specific.
No broader rotation/reflection cache-sharing claim is made: existing compiler
frame dependencies still apply.

Arbitrary callers of `paintSignFace` remain uncached unless they explicitly
provide a complete artwork-program identity. Function source and a few sampled
colors are not treated as identities.

Textured signs already applied all aging in the raster compositor. Their earlier
ground, border, ink and shadow callbacks therefore mixed colors with a zero fade
and multiplied them by white. These are now constant owned colors, avoiding
per-sample pen-coordinate construction, callback dispatch, interpolation and
temporary arrays. The non-raster weathering path is unchanged.

## Benchmark method

One frozen comparison, with no repeated timing rounds: optimized cold build to
populate artifacts, baseline warm build with the two prior sign producer files,
then optimized warm build. Both variants include the preceding native decoder,
integrity-only local cache reads, copy removal and quota-sort optimization.
Snapshots differ only in `signs/panel.ts` and `signs/weathering.ts`.

Only this isolated benchmark shares one fixed artifact namespace between the two
revisions, avoiding a redundant second full bake. All other source/assets are
identical. The normal demo cache continues to namespace by compiler source and
lockfile. This experiment does not change that production invalidation rule.

Fresh Node processes use one serial raster executor and include navigation,
source-image loading, material work, geometry and finalization. Module startup,
initial AML file reading, source fingerprinting, export, GPU upload and light
baking are excluded. All inputs are frozen; external machine load is uncontrolled.
No task-owned heavy work overlaps the measurements. Counts of raster jobs and
channel-texels are the primary evidence; individual wall times are observations.

## Results

The updated frozen scene has **859,305 triangles, 2,535,555 vertices, 95,274
receivers and 80,663,088 resident channel-texels**. These newer inputs are not
compared with the older scene's absolute timings. All three runs have identical
render/physical hashes, complete appearance manifests and diagnostics. Both
source snapshots remained stable, and their AML/assets are identical.

| Run | Compile wall | Material-stage wall | Cache hits | Raster jobs | Channel-texels baked |
| --- | ---: | ---: | ---: | ---: | ---: |
| Optimized, empty cache | 88.758 s | 72.646 s | 0 | 9,173 | 80,663,088 |
| Before sign reuse, warm | 26.595 s | 10.117 s | 9,057 | 116 | 3,523,398 |
| With sign reuse, warm | 17.050 s | 2.262 s | 9,173 | **0** | **0** |

The remaining sign raster work is eliminated completely on the warm build.
Both warm runs perform only **14 source PNG decodes** and no artifact writes:
the preceding integrity-validation optimization is active in both variants.
The optimized warm material stage consists of cache lookup, integrity checks and
binding work; the progress label still says “rasterizing materials,” but no raster
executor jobs are dispatched. Resident output remains 87,858,744 encoded bytes at
the same texture density.

Warm compilation was **35.9% shorter in this single comparison**. This is an
observed result under uncontrolled external load, not a repeat-tested speedup
estimate. The zero-job result, exact output equality and unchanged inputs are the
stronger evidence. No baseline cold run was added, so the constant-tint cleanup
has no separate cold-speedup claim. A normal source-namespace change still causes
one cold build before this reuse applies. **The sub-second target is unmet.**

| Pipeline stage | Before: share of warm compile | After: share of warm compile |
| --- | ---: | ---: |
| Material assembly/cache/raster work | 38.0% | 13.3% |
| Procedural dressing | 22.6% | **33.0%** |
| Receiver-edge joining | 21.2% | **27.5%** |
| Source-image loading/decoding | 5.5% | 7.4% |
| Receiver validation | 4.4% | 6.9% |
| Mesh parts/finalization | 5.8% | 8.5% |

The larger percentage for geometry does not mean geometry became slower; the
material denominator shrank. Procedural construction and edge joining now account
for roughly **61%** of warm compilation. Reusing geometry/UV data for repeated
props and avoiding unnecessary global edge work are now better targets than
further procedural-material sampling changes. Source pixels are still decoded
even with every finished material cached; selective input reuse is another smaller
opportunity, subject to height/validation dependencies.

Keep complete role mappings and immutable producer data in future cache keys;
source-image hashes alone cannot identify which material a callback applies.
Update recipe versions or the host namespace when artwork algorithms change.
Do not optimize callback evaluation by sampling a few points and assuming the
rest of the function is constant.

See [machine-readable results](sign-material-cache-2026-11-12.json) for all stage
times, CPU observations, work counts and identity checks. Run the retained
`bench.mjs` from its directory with a variant (`baseline` or `optimized`) and a
new output name to reproduce against the frozen inputs.

## Verification

The focused sign-cache suite has three passing tests covering real bound color,
packed PBR and normal maps, unchanged density, exact cold/warm publication,
translation reuse, owned deferred inputs, and invalidation for eleven changed
artwork/material inputs. Each invalidation case is compared with an uncached
compile of the changed input. An unkeyed arbitrary tint/UV program must perform
zero cache reads/writes. These are compiler/asset contracts, not visual goldens.

Type checking passes. Both independent reviews approved the implementation and
tests. No full test suite or manual visual review was run. Raw frozen code,
runner, logs and reports live under `generated/kowloon-sign-cache-20261112/`.
