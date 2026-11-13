# Plain-wall dressing implementation review

Reviewed 2026-11-09 against the new `src/dressing/walls.ts`,
`wall-surfaces.ts`, `wall-geometry.ts`, `wall-materials.ts`, and their
`apply.ts` integration, with `tests/aml-wall-dressing.test.ts` and the
wall-only AML fixture. The workspace contains simultaneous building and
ground changes; those are outside this review.

## Findings requiring correction

1. **P1 — Batch small decorative subparts.** The 20 m fixture compiles to
   17,242 triangles but 2,053 separate generated objects. The reviewer groups
   by `[surface.object, surface.material, surface.kind]` in `review/scene.ts`,
   making every printed stroke, tile, and cable cylinder a separate mesh,
   material, and draw call, followed by shadow rendering. This multiplies
   across the existing many-wall demo. Emit sensible assembly/material batches
   while retaining source ancestry; this does not require a renderer rewrite.
2. **P2 — Overlapping notices z-fight.** Every notice uses the same depths for
   paste, sheet, heading, and print. `capture-v1/closeup.png` visibly shows
   speckled competing fragments at overlapping red and cream papers, both left
   of the doorway and in the stack near its right side. Give complete notices
   distinct depth layers or fit them without overlap. All subparts of a notice
   must retain their own relative depth ordering and the 0.14 m projection cap.
3. **P2 — Composition repeats too mechanically for the requested reference
   character.** `capture-v1/services.png` repeats one elbowed pipe, three
   cable arcs, and one hanging loop in every bay; three aligned rows of large
   octagonal patches dominate the face. The inspected reference photographs
   instead have broad areas of uneven plaster, localized repairs, and irregular
   utility clusters. Add per-bay omissions and changes in placement/profile,
   vary repair scale and vertical position, and retain quiet wall regions.
   This is a visual finding, distinct from topology or sampled navigation.

## Accepted implementation properties

- Whole-rectangle clipped-area fitting provides a meaningful exclusion check
  for narrow apertures and authored material regions. It is stronger than
  checking only attachment points.
- Vertical planes are handled independently, preserving bent corners and both
  sides. World-space frames avoid applying reflection twice. The explicit
  2 cm margin and 14 cm projection limit make placement inspectable.
- Render mutation is detached from physical geometry. Generated surfaces keep
  source-host provenance, material references, UVs, colors, and visualization
  domain. The budget is shared with previous dressing work and charged before
  emission; transient cylinder buffers are disposed through `finally`.
- Separate wall modules and a small `windows=false` integration keep scope
  apart from existing window recipes and concurrent building/floor work.
- No obsolete compatibility paths or unrequested dependencies were introduced.

## Additional observations

Grime/wear branches consume the same random stream as later placement, so changing
weathering amounts can also rearrange repairs, notices, and shutters. Separate
feature streams would make these controls more predictable. Long compressed
expressions and multiple statements per line in the new modules make geometric
bounds harder to audit; expand those when touching the affected code.

## Evidence and status

- The wall suite completed with **7/7 passing** in `/tmp/wall-tests.log`.
- Independently compiled the wall fixture and inspected its output counts and
  diagnostics; it had no compiler diagnostics.
- Inspected actual browser captures: `generated/wall-dressing/capture-v1/`
  `overview.png`, `closeup.png`, and `services.png`.
- Inspected real reference images `generated/wall-dressing/reference-0.png`
  (Ian Lambot / Blue Lotus Daylight Alley) and `reference-2.png` (AD alley
  photograph), in addition to the supplied image inherited in the brief.

Acceptance remains pending the three findings above and follow-up inspection of
the corrected code and captures. Passing compilation/tests does not establish
visual acceptance or gameplay validity.

## Follow-up: spatial runs and receiving-material variation

Reviewed the later `wall-planning.ts` and `wall-finish.ts` implementation,
`apply.ts` integration, expanded tests, documentation, and actual `capture-v6`
images. The original per-stroke draw-call issue is resolved by family/material
batching. Notice layers now use distinct depths. The large patch grid is removed:
real receiving triangles carry the finish sections, preserve the authored texture
and repeat, and show continuous surface weathering. The v6 material treatment is
substantially closer to the reference direction than v1.

The later wall-only suites independently ran with **12/12 passing** in
`/tmp/wall-review-final.log`. This does not cover all run combinations.

Additional findings from the expanded spatial-run scope:

- **Fixed during review:** Multiple narrow risers on one long segment created
  duplicate generated identities because their batch emitter was reconstructed
  per riser. A public reproduction used path `0 0 0; 12 0 0; 18 1 0`, thickness
  0.2 m, height 3.6 m, `face="side"`, seed `review`, and high detail. The new
  per-segment emitter map addresses the cause; regression coverage is requested.
- **Pending P2:** A run-wide `curved` flag suppresses `decorateSurface` on every
  segment, including long straight faces connected to a curve. In the current
  fixture, appending a curved continuation removes all notices, shutters, ducts,
  and repairs from the original 20 m straight wall. Its only remaining families
  are pipes and cables. Suppress repeated kits on small curved facets without
  removing ordinary detail from broad planar faces within the same run.
- **Pending fixture validity:** The current wall/curve join produces a definite
  `SURFACE_COPLANAR` error (~0.0003 m² near 19.999, 0.066, 0). This is authored
  fixture geometry, not a dressing collision change. It must be corrected before
  treating the integrated fixture as validated. The browser can render it despite
  that diagnostic.
- **Predictability/documentation:** Run-level riser phase, wire rhythm, and loop
  location currently do not depend on the seed. A curved-only receiver therefore
  keeps identical utility geometry across seeds. Seed these choices within the
  existing density/fit bounds, or narrow the statement that seed changes utility
  placement.

Run adjacency uses spatial buckets rather than an all-segment pair scan, stops
ambiguous branches, and checks a common vertical interval. Wire support is checked
against complete exposed strips and retains source-host attribution across joins.
The shared spacing registry is linear per placement; its quadratic worst-case
total remains bounded by generated detail/triangle limits and is reasonable for
the currently tested scale. No collision/navigation mutation was found.

Final visual acceptance remains pending the mixed straight/curved composition fix
and a clean integrated fixture capture.

## Final expanded review: palette, ceramics, and tilted surfaces

Inspected the final expanded implementation through `capture-v9`, including
`wall-tiles.ts`, the declared `wall-materials` palette, copied material/texture
contracts, actual-plane frames, divider reservation, metric divider UVs, and
the revised mixed-run and seeded-run logic. The earlier functional and visual
findings are resolved:

- Long straight faces retain notices, meters, ducts, pipes, and frontage choices
  when connected to a curve. Small curved facets share sparse run-level services.
- The integrated wall/curve source now compiles without diagnostics. Narrow
  risers reuse their batch emitters and run phases respond to the seed.
- Declared palette entries retain their actual image, color, repeat, and surface
  properties. The two new generated cement/render images were visually inspected
  with their saved prompt provenance; they are distinct materials, not recolors.
- Individual ceramic faces and convex fragments are clipped to the exposed
  substrate. Missing regions reveal the real wall mesh. The inspected integrated
  fixture had 32,372 tile triangles, all with positive area and outward winding;
  the current demo had 132,850, also with no degenerate/reversed tile faces or
  compiler diagnostics. This is no claim of unlimited-scale performance.
- Tilted faces use orthonormal plane frames. Sloping/tilted hosts retain one base
  substrate and receive only fitted utilities/ceramics; shutter-like frontages
  require upright geometry and a level base.
- Textured divider boxes now use metric local UVs. Divider footprints are planned
  before shutter placement, fixing the column crossing a shutter in v8.
  Cross-host collinear material changes receive fitted joint dividers.

The four actual v9 captures (`overview`, `closeup`, `services`, `curve`) were
inspected. The final appearance has readable substrate texture, coherent tile
loss and fragments, continuous curved wiring, quieter wall areas, and varied
services. The earlier poster depth fighting, repeated octagonal patch grid, and
shutter/divider intersection are absent. The view remains a procedural theme
study, not a photogrammetric reconstruction or gameplay acceptance result.

The expanded three-file wall suite independently passed **18/18**, including
the final divider assertions (`/tmp/wall-review-accepted.log`).
Whole-repository type/build status is owned by the parent because concurrent
building and ground changes are outside this review.

No material implementation or visual finding remains. Obsolete `repair`
spacing/material entries have been removed; the ceramic system owns the
replacement coverage. Remaining ordinary limitations are
documented: decoration does not modify collision/navigation, does not route
around arbitrary pre-existing props, and uses authored texture quality.

## Realism refinement follow-up (in progress)

Reviewed the new shared-ring pipe sweep, six-cell poster UV mapping, declared
wall finish slots, ceramic and metal albedo/normal assets, skewed chipped tile
silhouettes, and explicit fracture-edge geometry. The atlas contains six distinct
readable notices; the normal images correspond to shallow ceramic crazing and
metal wear. Pipe winding and caps are coherent for the generated service paths.
The 18 existing wall tests passed independently in
`/tmp/wall-review-realism.log`.

The first all-edges-beveled revision is **not accepted**: the integrated fixture
grew from 32,372 to 212,005 tile triangles, and the demo reached 958,367 total
triangles (815,726 tile triangles) before reporting `AML_GEOMETRY: Invalid string
length`. Those tile triangles had finite coordinates, positive area, and
outward winding, so test success did not establish practical usability. The
implementation owner reduced geometry to reserve bevels for broken edges and
use normal maps for intact tiles. Focused `tilePiece` and `tileBevel` helpers now
separate shape emission from seeded layout; material repeat lookup is per run,
and a tile-cell bounds filter avoids irrelevant clipping work. Thin cable paths
retain their sampled shape without another corner-subdivision pass.

The revised fixture independently compiles without diagnostics at **108,000**
total triangles, including **88,850** tile triangles and **18,203** bevel faces.
All emitted wall triangles were independently checked for finite positions and
normals, positive area, and winding agreeing with every vertex normal; none
failed. The parent reports the full demo compiles cleanly at 416,457 triangles.
The numeric/geometry blocker is resolved, subject to successful final delivery
and rendered inspection.

The independent test reviewer found and protected outward poster orientation;
the atlas U coordinate is now flipped to match the wall frame. Exterior cable
ends can retreat within a documented bounded interval to fit a clipped native
joint, while the complete supported band is still required. This does not add
an exception that permits crossing interior holes. Documentation now names the
optional wall finish slots and records the actual generated atlas/normal assets.
No further material code finding remains. New scene captures are still pending.

### Render evidence

The actual default-demo image `generated/wall-dressing/demo-final.png` and its
zero-error capture report were inspected. The inner curved receiver now has
continuous upper wiring and sparse risers. The first three v12 images
(`overview`, `closeup`, `services`) show upright readable notices, continuous
pipe elbows, irregular chipped ceramic remnants, exposed textured substrate,
and preserved openings. No new z-fighting or shutter/divider intersection is
visible. The focused curve and material-detail images were subsequently inspected
from fresh browser pages; their capture report has no browser errors. The curve
retains continuous upper wiring across facets and a narrow riser on the small
isolated fragment. The close view confirms real ceramic/metal surface texture,
exposed coarse substrate, and varied tile silhouettes.

One local visual issue remains in that close view: the uniform wide beige
backing around the red notice reads as a mounted placard, rather than pasted
paper. Reduce its exposed border/depth so the atlas's own torn-paper edges
dominate. The proposed narrow paste trace preserves layering and can remain
above the maximum 9 mm tile fronts. Other v12 visual areas are accepted.

The v10/v11 source-based browser capture route failed with the inline texture
payload. The working production reviewer is therefore being captured from a
validated compiled fixture snapshot, rewriting only relative fixture texture
URLs to the same demo assets. This establishes the rendered compiled result;
it does not establish that the failing source-capture route has been repaired.
The parent and test reviewer report successful demo rebuild, viewer build,
TypeScript check, all 23 wall tests, and full-demo asset/export validation.

### Indexed wall mesh follow-up

Switching the full preview back to Kowloon exposed another practical limit in
the serialized snapshot. The wall emitter now reuses vertices only when world
position, normal, UV, and color are all identical. The cache is local to one
emitter; triangle surface ownership, source provenance, winding, and the shared
triangle budget remain unchanged. Indexed Three geometry is cloned and disposed
without expanding it first. There is no coordinate quantization or modification
of caller-owned geometry. Hard normals and UV seams stay separate, and smooth
pipe rings can share their correct tangent frame. This is a cohesive correction
at the wall mesh's ownership boundary; no code finding remains in the delta.

The poster adjustment is also present: a 0.6%-of-width inset leaves a narrow
paste trace, its base clears the highest tile fronts by 3 mm, and the printed
sheet is 0.7 mm above that backing. The independent test review's before/after
expanded-corner hashes match exactly for all six unchanged wall families,
including material attributes, and the physical mesh hash is unchanged.
Triangle counts are unchanged. Referenced tile vertices fell from 71,373 to
33,414; pipe vertices from 3,060 to 1,022; cable vertices from 9,168 to 1,860 in
that fixture. The final 23 wall tests and TypeScript check passed, including
finite orthonormal exported tangent frames.

### Final accepted state, 2026-11-10

Inspected `capture-v13/services.png` and `capture-v13/material-detail.png` from
the rebuilt indexed fixture. The broad beige notice surround is gone: the
printed torn-paper image now dominates, with only a narrow paste trace. The
notices remain readable and upright, with no visible depth fighting against
the tiles. The indexed service pipes, cable loop, tile fronts, and chipped
edges show no new shading or silhouette artifacts. The v13 capture report
records the fixture and snapshot hashes and has no browser errors.

The actual default-preview browser acceptance passes with the normal timeout
unchanged: default load, theme switching in both directions, camera retention,
downloads, custom-file recovery, failed-load recovery, and mobile controls
(`/tmp/wall-indexed-browser.log`). The indexed default snapshot is approximately
133 MB, down from the previous approximately 216 MB. The demo and viewer were
rebuilt, and the downloadable GLB was produced successfully.

**Implementation and visual review are accepted. No material finding remains.**
The earlier source-based inline-texture capture limitation remains documented;
the accepted visual evidence is the actual production default preview plus
the validated compiled fixture rendered by the same reviewer. This does not
claim the separate failing source-capture route was repaired.

## Boundary-fracture refinement

Reviewed the user's subsequent requirement that retained tiles bordering exposed
plaster or missing tiles break toward that boundary. Run-wide lazy occupancy
retains the original seeded share/wear decisions, includes actual receiving
triangle area and local overrides, and is cached independently of traversal
order. Its binary search uses monotonically increasing run offsets. Staggered
bricks correctly have two overlapping neighbors on each adjacent row. Convex
slanted cuts are applied on missing-neighbor sides before existing skew, erosion,
bevels, and exact receiving-face clipping. The code does not mutate source
geometry or change collision/navigation ownership. It does not recursively
propagate damage through already-generated shards, avoiding visit-order effects.

The related prefix-validation fix derives accepted wall suffixes from the actual
material binding slots. This restores documented wall-only finish prefixes
without accepting arbitrary undeclared prefixes or copying an independent list.

The independent visible-geometry boundary tests are meaningful: they compare
same-seed full and partial tile coverage, identify missing neighbors from actual
glaze, and require visible loss on the outward edge strip. Separate source-host
and unchanged-facet comparisons protect continuity. The test reviewer reports
all **25 wall tests** and TypeScript checks passing without weakened assertions.

The integrated fixture independently compiled without diagnostics in about
1.9 seconds: **110,702 total triangles**, **91,552 tile triangles**, and **175,152
vertices**. Total triangle count rises approximately 2.5% over the previous
accepted fixture. Every tile triangle passed finite-coordinate/normal,
positive-area, and outward-winding checks.

Inspected both actual v14 captures (`services` and `material-detail`), whose
report records source/snapshot hashes and no browser errors. Tiled patches now
end in broken, uneven remnants rather than intact rectangular steps. Interior
tiles retain their larger intact faces; substrate, notices, and utilities remain
clear. **The boundary refinement is accepted; no material finding remains.**

## Subsequent fracture appearance iteration (in progress)

The next user correction asks for broad triangular/trapezoidal remnants and
rougher fracture borders. The first broad-remnant draft (v15) removes multi-shard
templates and uses a shared convex center for radial cuts and inset glaze. Its
geometry is sound in the integrated fixture: 149,005 total triangles, 129,855
tile triangles, 264,795 vertices, no compiler diagnostics, and no invalid tile
triangles in the independent area/winding/finite-value audit.

The v15 close and service images were inspected against the tile-stripped study.
They are **not accepted visually**: the strict alternating deep/shallow cuts
produce regular sawtooth edges, and many broad boundaries still read as shallow
rectangular trims. The user subsequently requested noise texture and layering.
The owner is replacing tooth geometry with a larger rough textured body and
smaller ceramic glaze, with smooth noise controlling outlines.

A read-only material/export audit found no current alpha-mask contract. RGBA
texture content alone does not establish cutouts in the preview or GLB because
neither material path declares alpha testing. Opaque textured layers are the
smallest coherent approach for the requested effect and already survive both
render paths. No alpha or renderer-only workaround is being added. The layered
revision still requires nesting/continuity, performance, and actual visual review.

### Accepted layered revision (v18)

Reviewed the frozen replacement: each broken tile keeps one broad convex
macro-remnant; three-scale continuous noise modifies its fractured contour, and
a separate noise field moves the glaze inward. The contours retain their polar
order about the same interior center. Each glaze edge lies inside the triangle
formed by that center and its corresponding body edge, establishing complete
support rather than merely testing glaze vertices. Contour simplification keeps
the representation bounded without alternating teeth. Original fired edges have
only small chips. The obsolete bevel emitter and facet path are removed.

Both layers are ordinary textured geometry, clipped to the exposed receiving
triangles: rough body at 3 mm and raised glaze at 6–9 mm. Material repeat, normals,
source ownership, collision/navigation separation, run continuity, and triangle
budget accounting retain their existing contracts. The public docs describe the
new layers and no longer promise the removed shard/fringe behavior.

Inspected v18 `material-detail` and `services` against the supplied tile study
and rejected v15. The repaired-plaster body now reads separately beneath the
ceramic, broad remnants survive, and the regular serrated edges are gone. There
is no visible depth fighting or new shading artifact. The capture report has no
browser errors. Independently verified both recorded source/snapshot hashes and
the snapshot's successful validation with no diagnostics. It contains **135,105
triangles**, **152,907 vertices**, and **31,329,475 bytes**; all **115,955** tile
triangles pass finite-value, nondegenerate-area, and outward-winding checks.

The independent test review reports **27/27 wall tests passing**, including
exact glaze/body containment, disjointness within each layer, exposed rough body,
material/normal-map selection, retained broad pieces, nonuniform inset, and seam
continuity. The old sawtooth-specific oracle was superseded by these layered
contracts. The latest whole-repository typecheck reports only concurrent shop
test `DressingRule.shops` errors (lines 501–503); those are outside this review.

**The layered wall implementation and visual result are accepted. No material
wall finding remains.** Final delivery checks by the parent also passed:
`npm run --silent demo:build`, the production viewer build, and
`BASE_URL=http://127.0.0.1:5187 node tests/dressing-browser.mjs`.
The real browser verified theme switching, camera persistence, model/package
downloads, custom-file and failed-load recovery, and mobile controls. The final
whole-project typecheck still reports the unrelated shop-test errors above.
