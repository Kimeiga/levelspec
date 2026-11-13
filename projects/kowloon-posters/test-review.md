# Poster decals: preimplementation test review

Reviewed the proposed poster library and placement contract against
`src/dressing/apply.ts`, `wall-surfaces.ts`, `wall-geometry.ts`, `pen.ts`,
`src/architecture/format.ts`, and the existing wall/restaurant tests.

New coverage is warranted: existing notice coverage assumes a six-cell atlas and
automatic exterior placement. It does not establish explicit authoring,
independent interior placement, a new atlas, or mirrored text.

## Contract decisions

- Define `at` in meters, whether it marks center or lower corner, its coordinate
  origin, and positive rotation as seen by the reader. Current `WallSurface`
  local +X is screen-left when looking toward a +Y-facing surface; tests must
  derive reader direction from the surface normal rather than assume local +X.
- Define ambiguous curved/multiplane selection. Do not silently choose an
  unrelated plane merely because it has sufficient area.
- Explicit native-wall placement and procedural shop-interior `Pen` placement
  are separate callers of the same drawing contract. A native wall fixture alone
  cannot substantiate the shop-interior requirement.
- If automatic notices adopt the new atlas, update their documented material
  contract, callers and tests together. Do not silently infer atlas formats from
  image filenames or dimensions.
- Missing atlas, unknown designs, invalid dimensions and non-fitting explicit
  placements need an intentional diagnostic policy. A blank paper fallback is
  not equivalent to a requested illustrated poster.

## Required focused coverage

1. Public `parseAml` / `serializeAml` / `compile`: multiple posters on a wall
   without a wall-dressing rule, and alongside an independent wall finish;
   known designs, positions, dimensions and rotations round-trip unchanged.
   Caller document remains unchanged.
2. A small 2:3 design at a known width on front/back and an orthogonal side:
   emitted width/height, attachment plane and outward normals independently
   match expected values. Include a yawed/reflected frame. In each triangle,
   increasing V points toward the printed top and increasing U toward the
   reader's right; inspect UV/position relationships, not only UV bounds.
3. Rotated placement beside a wall edge and across an opening: choose one case
   whose center and corners fit but whose triangle interior crosses a narrow
   hole, and another whose unrotated bounds fit while a rotated corner escapes.
   Both must fail the documented fit contract. A valid nearby placement still
   succeeds afterward. No silent clamping/stretching.
4. Explicit unknown host/design, invalid numeric sizes/rotation/coordinates,
   missing texture binding, hidden/no exposed receiver and unsupported face:
   actionable source-linked diagnostics. Exercise native API nonfinite numbers
   where XML parser already rejects the equivalent text.
5. Same seed reproduces poster geometry; chosen seed variation changes only
   intended weathering/angle fields. Exact design selection remains exact.
   Poster additions preserve collision mesh/physical hash and do not acquire
   navigable/collidable roles. Reuse existing budget/cancellation coverage where
   the same emitter path is used; add a focused case if it bypasses that path.
6. Atlas UVs stay inside the selected padded content rectangle independent of
   material repeat. Use manifest bounds or a synthetic asymmetric test image
   with distinct corners to detect wrong row, mirrored art, swapped designs,
   upside-down V, and cross-cell bleed. Check at least corner and middle cells.
7. Actual shop production call: select an interior poster, establish attachment
   to its intended rear/side wall and readable orientation under mirrored shop
   layout. Include a narrow room if production placement is conditional.
8. Export multiple posters through real GLB material resolution. Require valid
   GLB, retained texture UVs and one shared image resource rather than embedded
   copies per poster. Do not assert incidental object names or exact vertex
   count; bound geometry cost proportionally to poster count.

## Visual acceptance

Inspect the complete library contact sheet, a close readable poster, a cluster
on a nonrestaurant wall and the actual chicken-shop interior. Review real
browser output with stable source hashes, no missing textures or console errors.
Check that printed art does not look stretched, float above tile, disappear
through concrete or display as mirrored text. Include a view from a distance to
check atlas filtering; unit UV checks cannot establish absence of visual bleed.

No paid generation or exact pixel snapshot belongs in the deterministic test
suite. Retain image prompts/source provenance separately from generated runtime
captures. This plan is sufficient to proceed once coordinate/selection and
diagnostic policies above are made explicit.

## Implemented coverage review

Reviewed `tests/aml-posters.test.ts` after the implementation and follow-up fixes.
The eight tests pass locally. The suite now establishes front/back attachment
planes and screen-right centers under transformed placement, source immutability,
readable reflected UVs, native side-wall placement, actual narrow and mirrored
restaurant placement, each named design's padded manifest cell, shared-image GLB
export, nondefault control round-tripping with independent wall dressing,
opening/overhang rejection, nonfinite native inputs and ambiguous receivers.

Explicit overlap layers are covered by measured 0.6 mm plane separation;
conservative same-layer overlap warns with a source-linked spatial review target
while retaining both posters. Automatic
wall notices exercise the new shared atlas through the ordinary wall recipe.
The existing wall-detail suite retains broader atlas extent/readability checks;
unrelated service-pipe failures in that suite are outside this review.

The three material gaps from the first implemented-test review were resolved:
attachment location, per-design image identity, and nondefault controls alongside
wall dressing. No blocking coverage finding remains. Exact Z-center assertion
was added alongside the tested height extent. Visual art
quality and real-browser texture filtering remain separate acceptance evidence.

The warning-preservation contract was reviewed after the successful eight-test
run. A rerun at that moment could not load because an unrelated concurrent edit
introduced a TypeScript parameter property in `spans/neighbor-index.ts`, which
Node's strip-only loader rejects. That loader failure does not assess the new
test assertions; a final stable-source run is still needed after its correction.


Final integrator verification: the concurrent Node loader issue was corrected
by its active workflow. The unchanged poster work was then rerun with
`node --test tests/aml-posters.test.ts tests/aml-restaurant-props.test.ts`: **21/21
passed**, including all eight poster tests on the final implementation. Root and
shop-preview type checks passed. Frozen browser capture `review-03` has no errors.
