# Plain-wall dressing: preimplementation test review

Reviewed 2026-11-09 against `src/dressing/{apply,geometry,kit,types}.ts`,
`tests/aml-dressing.test.ts`, the compiler dressing boundary, and the proposed
plain-wall contract. This is an independent test-plan review, not implementation
or visual acceptance.

## Assessment

New coverage is warranted. Existing dressing tests establish repeatability,
caller immutability, collision/navigation separation, export validity, weathering,
window fitting, and building transforms. They do not exercise decoration when
`windows="false"`, coverage around arbitrary excluded wall regions, several wall
planes in one host, or transformed shallow wall-mounted props.

The proposed scope is coherent: enrich existing exposed vertical wall surfaces
without changing authored openings or physical geometry. Keep windows=true behavior
covered by the existing suite. Top-only wall dressing can retain material treatment
without vertical props; document that rather than inventing an error.

## Required observable coverage

1. Compile a generously sized plain wall with a known opening and a supporting
   floor through the public API. Compare its input document, collision mesh,
   physical hash, navigation, and route outcome with the undressed baseline.
   Require actual generated render geometry; equality checks alone would accept a
   no-op. Repeated builds must reproduce mesh/export bytes. Reseeding must change
   generated decoration itself, not merely the existing host weathering.
2. Verify complete projected decoration footprints remain on receiving wall area.
   Use independently known rectangular openings and an explicit face-material
   exclusion. Vertex-only membership is insufficient: a long pipe, cable, poster,
   or shutter can bridge an opening while every vertex lies on solid wall. Use
   triangle-versus-hole overlap or a conservative per-part projected bound for
   these fixtures. Include an off-center narrow opening that a few sampled
   attachment points would miss. Confirm props actually occur near eligible
   regions, so dropping all props is not a passing strategy.
3. Exercise front/back, a yawed and translated wall, horizontal reflection, and
   a bent wall with `face="side"`. Independently check which side of each physical
   plane receives geometry, bounded outward projection, finite coordinates,
   positive triangle area, winding/normal agreement, and decoration on multiple
   eligible planes. Reuse the public mesh output rather than private fit helpers.
4. Compare low/medium/high detail for a fixed, sufficiently large fixture. Require
   meaningful decoration at every setting and increased visible detail at high.
   Avoid exact triangle counts or named generated-part snapshots. Across a small
   fixed seed set, require multiple materials and recognizable prop families;
   visual captures remain necessary to judge visual quality and repetition.
5. Vary grime/wear and per-rule overrides on the same seed. Establish changes to
   wall finish/decoration colors while generated positions stay valid. In a zero
   grime case, do not accidentally retain a mandatory grime decal. Existing floor
   seam expectations should remain unchanged.
6. Hidden hosts and entirely assigned receiving faces produce no wall props;
   an undressed wall has none. Small or interrupted receiving areas either fit
   complete small details or omit them safely. No new windows or real doorway
   geometry should appear for windows=false.
7. Generated surfaces retain the host's source provenance, remain visualization
   domain/noncollidable, have valid material references and complete UV/color
   arrays, and export through GLB with zero validator errors. Test any actual new
   texture asset resolution through the public exporter if assets are introduced.
8. A budget between the completed plain receiving mesh and the fully detailed
   result must fail during prop generation while staying within the public limit.
   Merely using a tiny budget that fails during host subdivision does not test the
   new generator. After the failure, an unrestricted recompile must succeed with
   unchanged input. Retain AbortError propagation and subsequent successful
   compilation; a pre-aborted compile is only outer-boundary coverage, not proof
   of interruption inside a synchronous decoration loop.

## Boundaries to settle before implementation

- State a maximum outward projection in meters. "Shallow" alone is not testable,
  and render-only props can still create visual obstruction or visible clipping.
- Ensure each complete assembly is checked, including cable sag, pipe elbows,
  clamps, and poster tears, against exclusions. Fitting only its anchor or main
  panel is inadequate.
- Preserve a single shared render budget across old and new generated geometry.
  New mesh emitters must not bypass budget, cancellation, provenance, or winding
  rules already supplied by `KitGeometry`.
- Keep fixtures and screenshots isolated from the simultaneous building/floor
  work. Use a new wall test file and a wall-only visual fixture rather than
  broadening the shared building tests or editing their expected results.

No production changes were made in this review. Implementation may proceed after
these cases and the projection limit are adopted; this record makes no assertion
that tests not yet written pass.

## Material, ceramic, and utility refinement review — 2026-11-10

The expanded requirements need checks beyond triangle validity and a changed
render hash. `tests/aml-wall-details.test.ts` now checks these contracts through
public compilation and GLB export:

- A tall bent riser is one edge-connected closed surface. Every welded edge has
  exactly two incident triangles, preventing a chain of independently capped
  cylinders from passing as a continuous pipe. Separate clamps and collars are
  allowed. Winding agrees with every vertex normal at curved elbows.
- Mostly intact tiles have long skewed edges, separate rough exposed ceramic
  bodies, valid triangles, and no projected triangle overlaps. Short diagonal
  corner cuts alone do not establish skew. A split coplanar wall retains the same
  ceramic area and matching UVs at shared fragment vertices across the host seam.
- Explicit finish materials, using virtual asset references, reach ceramic tops,
  edges, pipes, ducts, shutters, rust and paper surfaces. Texture, normal map,
  strength, repeat and PBR parameters survive material selection and GLB export;
  normal-mapped primitives carry tangent attributes.
- Poster artwork fills one inset cell of a six-image, 3-by-2 atlas even with
  authored repeat seven. Multiple cells appear. Orientation checks require
  lettering to face outward without mirroring and stand upright.

Independent investigation found two causes of the missing inner cable in the
courtyard demo. Its first segment rejected a mathematically equal endpoint due to
Float64 addition roundoff (5.55e-17 m). Its final segment's upper silhouette ends
0.056547 m before the base silhouette because of the adjoining east wall; the
original fixed 0.04 m end margin actually protruded beyond that receiving band.
The latter is a real coverage failure, not an epsilon issue.

`tests/aml-wall-planning.test.ts` now separates those regressions. A small public
Bézier-plus-adjoining-wall fixture requires connected inner and outer wiring. A
pure containment test requires the mathematically equal `0.1 + 0.2` endpoint to
fit, while a real 1e-7 m protrusion remains invalid. Existing public opening tests
continue to prohibit bridging authored holes. Endpoint trimming must remain
bounded to exterior run ends and preserve complete strip containment.

Visual captures remain necessary for artistic judgments: test success does not
establish that ceramic chips look natural, texture scale is convincing, or nearby
materials form a visually coherent composition.

## Final validation of the refinement

- `node --test --test-concurrency=1 tests/aml-wall-dressing.test.ts tests/aml-wall-planning.test.ts tests/aml-wall-finishes.test.ts tests/aml-wall-details.test.ts`:
  **23/23 passed**, 42.636 s. The newly added detail suite also passed an isolated
  follow-up run. The outward poster check caught the original mirrored mapping;
  the corrected within-cell U direction passes.
- `node --test --test-name-pattern='saved demo embeds' tests/aml-dressing.test.ts`:
  **1/1 passed**, 81.641 s. This includes unchanged physical hash/navigation,
  exact embedded image-byte hashes for all declared color and normal textures,
  image deduplication, and zero GLB validator errors.
- `npm run check`: passed.

An earlier unoptimized full-demo compile returned `AML_GEOMETRY: Invalid string
length`; it did not reach the texture assertion. After tile geometry reduction,
that same public demo compile/export acceptance passes. The suite retains the
compiler's explicit budget-exhaustion/recovery checks and full-demo acceptance;
no new arbitrary per-square-meter tessellation cap was introduced.

The independent implementation reviewer also reviewed the added tests and found
pipe connectivity, outward poster UVs, split-host ceramic continuity, and normal-map
export assertions meaningful. Browser and visual acceptance are owned by the
parent and implementation-review agents; this test review does not substitute
for their visual judgment. The entire unrelated repository suite was not rerun.

## Indexed wall geometry review — 2026-11-10

The large snapshot reload exposed a distinct serialization/memory concern.
Emitter-local exact vertex reuse is compatible with existing contracts when the
reuse key includes world position, normal, UV, and color. Triangle surface IDs,
provenance, solid IDs, and the triangle budget remain per triangle. Hard-normal
edges and tube UV seams must stay split even at coincident positions.

The existing detail tests now require actual shared indices for bent pipe and
ceramic front geometry. Both assertions failed before implementation, confirming
that the old fully duplicated output cannot pass. Export checks also read the
real GLB tangent attributes and verify finite, unit, normal-orthogonal directions
and signed-unit handedness. This protects the tangent averaging that changes
when vertices are shared. Poster backing inset/depth refinements required no
relaxed expectations.

A one-off before/after public compile compared expanded per-triangle positions,
normals, UVs, colors, and materials for a 14 m wall. All compared role hashes,
triangle counts, and the physical hash were identical; notices were excluded
because their backing geometry intentionally changed. Referenced vertices fell
from 86,631 to 38,316 (55.77%). This is measured fixture evidence, not a new global
geometry-density requirement or a claim about browser reload completion.

After indexing, the complete four-file wall suite passed **23/23 in 16.736 s**,
including the additional index/tangent assertions, and `npm run check` passed.
The browser snapshot-toggle check remains a separate required acceptance step.

The full-demo texture/hash/GLB-validator test reported above passed **before**
vertex indexing. After indexing, the focused explicit-finish GLB test passes with
zero validator errors and numeric tangent-frame checks, while the one-off
expanded-attribute comparison establishes exact geometry equivalence for the
comparison fixture. The parent owns the current demo exporter rebuild and browser
reload acceptance; the full-demo test was not repeated during those resource-heavy
checks.

## Tile-to-substrate boundary review — 2026-11-10

The previous tests allowed rectangular surviving tiles to border missing cells.
Some fractures anywhere on a wall do not establish that exposed tile-field edges
are broken. The new `tests/aml-wall-boundaries.test.ts` compares same-seed complete
and partial ceramic coverage through public AML compilation. It derives intact
control tiles and their edge neighbors from visible mesh bounds, rather than
calling production occupancy/noise code or fixing tile dimensions.

A control neighbor is considered absent below 1% of its original glaze area; a
surviving tile retains at least 10%. Its outer 40% strip facing that missing
neighbor must lose more than 15% of control glaze area. This distinguishes visible
breakage from the tiny corner chips already present on intact tiles. The fixtures
exercise square tiles and staggered rectangles, including offset neighbors above
and below a brick. Layout selection inspects rendered geometry over a bounded,
heterogeneous seed list.

Separate comparisons require partial-coverage silhouettes to remain unchanged
when straight and gently curved runs are split into adjoining AML hosts. A third
comparison holds the first facet constant while bending its neighbor: the bend
must not create fake missing-neighbor damage on the unchanged receiving facet.
The probes require visible ceramic coverage near the bend to prevent vacuous
empty-region equality.

The preimplementation geometry diagnostic fails the new directional-boundary
assertion on the old full-edge behavior and passes the seam/facet continuity
invariants. The source fixture also exposed a separate validation regression:
`finishes` accepted only building finish roles and rejected a valid wall-ceramic-only
prefix. The committed test does not add an unused building finish to conceal it;
a temporary diagnostic copy was used only to isolate old geometry behavior.

After the run-wide neighborhood and directional breakage implementation, the new
boundary suite passes **2/2** without changing its assertions. The wall-only
ceramic prefix compiles successfully. The complete five-file wall acceptance run
(`aml-wall-dressing`, `aml-wall-planning`, `aml-wall-finishes`, `aml-wall-details`,
and `aml-wall-boundaries`) passes **25/25 in 39.215 s**; `npm run check` passes.
Existing exclusion clipping, nonoverlapping triangulation, outward normals,
material/normal-map export, source/physics/navigation preservation, repeatability,
and budget/recovery checks remain intact. These checks establish geometric
behavior; the new boundary's artistic appearance still requires visual review.

## Broad shattered-remnant refinement — 2026-11-10

Compared `reference/kowloon-walls/tile-stripped-study.png` with
`generated/wall-dressing/capture-v14/material-detail.png`. The supplied study has
broad surviving tile portions and visibly rough broken borders. The v14 render
contains many narrow strips and needles, with repeated clean diagonal cuts.
Those observations inform relative shape checks, not exact reconstruction or
physical dimensions inferred from the image.

The prior boundary area-loss test was insufficient: excessive removal into tiny
pieces could pass. Two new public geometry tests now measure wholly interior
boundary cells against intact same-seed controls, excluding physical-source
clipping as a cause of small remnants:

- Every connected survivor retains at least 8% of its control tile area, and its
  area divided by diagonal is at least 8% of the control's shorter dimension.
  A cell with only one exposed side retains a primary piece of at least 25% area.
  These relative thresholds distinguish broad remnants from tiny or needle-like
  debris without prescribing vertex counts or exact fracture presets.
- At least half the substantial boundary pieces contain two separated concave
  bites along an exposed fracture edge. Each bite exceeds 4% of the control's
  shorter dimension, and the pair is separated by at least 15%. The measurement
  excludes original grout edges. An initial chord-deviation oracle was rejected
  because ordinary macro triangle corners could satisfy it; actual inward
  notches distinguish rough fracture edges from clean diagonal slicing.

An isolated source copy using the v14 generator passes the two older boundary
checks but fails both new tests: one surviving interior fragment has only 5.54%
of its control tile area, and 0/13 substantial square boundary pieces have the
required rough edge geometry. The first revised draft passes all four boundary
checks. Full acceptance was deliberately stopped when subsequent visual tuning
began; it must be rerun on the final frozen implementation.

## Opaque layered-edge direction — supersedes the notch oracle

The user rejected the alternating zigzag appearance. The accepted replacement
uses broad macro remnants with continuous noise contours and two opaque textured
layers: a larger rough body at 3 mm and a smaller ceramic surface at 6–9 mm.
An alpha-mask pipeline was considered but is not part of the chosen contract.
The previous concave-bite test was therefore replaced; it is historical evidence,
not a requirement on the final implementation.

The current layered test asserts:

- Actual flat body and ceramic surfaces use separate declared color and normal
  textures, at separate outward depths. Intact tiles need not emit a rough body;
  containment and visible-body assertions target interior fractured boundary
  remnants where the new treatment applies.
- Every complete projected ceramic triangle is covered by the actual body
  triangles, using independently calculated triangle-intersection areas.
  Bounds or anchor membership alone would not establish containment.
- Each layer is internally nonoverlapping. Intended overlap between two different
  depth layers is tested as containment instead of being incorrectly rejected.
- A body retains more than 5% additional projected area around its substantial
  ceramic remnant, and belongs to that tile rather than covering the whole wall.
- Directional footprint profiles, normalized to remove translation and uniform
  scale, differ meaningfully between the top and body on at least half the
  substantial boundary remnants. This checks independent contour variation
  without prescribing alternating dips, vertex counts, or the noise algorithm.

The broad-remnant and all prior neighborhood/continuity checks remain. The
finish suite now identifies glaze through an explicit authored ceramic finish;
flat outward normals alone would incorrectly include legitimate underlayers.
Its six tests and the four focused boundary tests passed on the layered draft.

An isolated v14 control still passes the old boundary/continuity tests, but fails
the broad-remnant check and the new layer check: its former beveled fringe does
not supply an outward body plane. No production file was swapped for the control.

On the final frozen layered implementation, the complete five-file wall suite
passes **27/27 in 61.903 s**. The final TypeScript check reports only three
concurrent shop-test errors: `tests/aml-shop-dressing.test.ts` at lines 501–503
references `DressingRule.shops`, which is absent from the current type. No wall or
wall-test errors were reported; the unrelated shop work was not edited. Earlier
clean typecheck results in this record apply to their earlier shared-workspace
snapshots, not this final check.
