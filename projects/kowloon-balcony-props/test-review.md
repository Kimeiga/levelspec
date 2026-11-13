# Independent test review — balcony props

Reviewed before production implementation, 2026-11-12. The six approved candidates
are three potted plants and hanging shirt/trousers/bedsheet. This review approves
proceeding with implementation subject to the acceptance contracts below; it is
not final approval of generated meshes or unreviewed tests.

## Existing coverage and important constraints

- `tests/aml-building-dressing.test.ts` owns building repeatability, transforms,
  generated-part categories and unchanged physical geometry.
- `tests/aml-span-dressing.test.ts` owns clothesline clearance, facade attachments,
  deterministic span selection and minimum hang heights.
- `tests/fixtures/kit-props.ts` has strong geometric cloth checks: nonzero areas,
  smooth unit normals, winding, curvature and opposite-facing nearby backs. Some
  are intentionally calibrated to the existing sampled thin cloth; their precise
  area/topology thresholds are not automatically the right acceptance limits for
  a different low-poly asset. Preserve the visual and physical behaviors they
  protect, and explain any replacement with independently measured thresholds.
- Current building/span atlas tests encode an 8×4 cloth atlas and plain fallback
  when an override is absent. `kitFinishes` now binds built-in library materials
  by default, so absence of an override no longer means absence of a texture.
  Do not reintroduce historical fallback behavior to satisfy those assertions.
- `chooseGarment` has line, pole and hanger support modes; `hangGarment` documents
  thin geometry within roughly ±4cm before sway. `washing` promises ±5cm around
  its support plane. Span planning reserves width/drop rectangles, not arbitrary
  inflated model bodies. Generated depth must respect that contract or planning
  needs a deliberate, complete change.
- Most building garment consumers permit only 0.8–0.85m drop; rooftop and alley
  line consumers allow 1.15m. The concept bedsheet is 1.45m. Select a uniformly
  scaled physically plausible sheet or omit it in a constrained space; never
  squash just its height to make it fit. Hangers must not select a folded sheet.
- Pots are used by sills, cages, balconies and rooftops. Existing caller margins
  assume small pots with foliage extending outward by at most approximately
  0.4m. Placement needs actual accepted dimensions, not concept dimensions.

## New tests are warranted

A focused `aml-balcony-props.test.ts` should own the new asset and fitting behavior.
Prefer a handful of parameterized tests over one assertion per asset or a giant
randomized scene. Use real KitMesh/Pen and compile/export entry points. Inspect
emitted triangles independently rather than comparing a placement helper against
itself.

1. **Adopted assets and PBR export:** every accepted named asset emits finite,
   nondegenerate triangles with finite UVs and unit normals. The geometric face
   cross product must agree with its shading normals after rotation/reflection.
   Verify actual triangle counts against the adopted manifest's measured budget,
   not just the requested provider limit. Export actual images through
   `resolveExportAssets` and validate the resulting GLB. Repeated instances must
   reference one shared image per atlas channel, not copies per object. Check
   color, normal and packed roughness/metalness share the same UV island transform
   and that their actual dimensions/padding agree with the manifest.
2. **Grounded plants and fit:** emit each plant at two uniform scales under identity,
   rotated and reflected transforms. Invert the known host transform, independently
   measure actual min/max coordinates, and require the base to touch the given
   support without any vertex below it beyond export precision. Pairwise distances
   on undeformed source points must scale uniformly. Constrained row placement must
   keep pot footprints on the support and foliage within the documented envelope.
   Fixed seeded repetitions should vary silhouettes and rotations without changing
   source assets in place or creating accidental identical grids.
3. **Real suspension, not bounds-center suspension:** for each accepted garment,
   identify attachment vertices/edges in the baked source and verify the emitted
   cloth meets the physical clips, hanger shoulder rests or folded-rail contact.
   Exercise horizontal and sloping support, translated/rotated host, reflected host,
   and positive/negative allowed sway. Check all supports as well as cloth. A test
   that merely compares two metadata anchor arrays can accept floating clothes.
   A hanger should remain gravity-aligned on a sloping pole; clipped laundry should
   meet the local line at both clips. Folded sheets need a real return layer around
   the rod rather than two disconnected cards above it.
4. **Clearance and rejection:** exercise narrow spans, short drop envelopes, and
   the smallest cage/hanger envelopes used by production. Independent bounds must
   stay in the caller's width/drop/depth reservation after all allowed deformations.
   An unsuitable garment must be omitted or uniformly fitted without NaN geometry
   or infinite loops. Use actual production `washing`, `hangers`, and a small AML
   clothesline example, not only a direct mesh emitter.
5. **Determinism and physics:** same seed/source produces identical render output;
   another seed changes at least one meaningful placement or appearance. Compile
   a small actual building/clothesline fixture against its undressed counterpart
   and require identical collision mesh and physical hash. Check every added
   surface is visualization-only, noncollidable and nonnavigable. Where navigation
   is already enabled in an existing fixture, retain its equivalent result; do not
   claim gameplay validation from a screenshot.
6. **Variation and budgets:** cover all accepted plant/cloth variants intentionally;
   a random seed that happens to omit one is insufficient. Count a populated
   representative balcony/line, not only one source mesh. Set a reviewed population
   budget from the actual chosen instance count and measured per-prop counts.
   Do not replace existing general generator budget checks with permissive limits.

## Visual acceptance is separately required

Freeze old/new source and asset hashes; capture matching camera, lighting, exposure,
scale and background. Inspect front, side, rear and underside at close range plus
normal play-view distance, then actual balcony/cage/sill and sloping-line contexts.
Use backface culling, the actual PBR maps and a changed light direction. Check for
inflated torsos, fused trouser legs, thick sheet slabs, floating clips, detached or
solid-blob leaves, pot/soil caps, stretched UVs, baked lighting, and mipmap bleed.
Do not hide defects by framing only the front. Shared base assets can receive
restrained color changes, but recoloring pots must not incorrectly tint leaves,
soil or glazing. Keep successful source geometry; reject unconvincing candidates
without automatic paid rerolls.

## Review status

Preimplementation coverage recommendations complete. Production code and new tests
have not yet been written or reviewed. Final review must assess the actual adopted
contract, not assume every generated candidate was suitable.

## Baseline execution

Ran `node --test --test-name-pattern='washing on a clothesline' tests/aml-span-dressing.test.ts`
before production changes. It fails before any cloth assertions: `AML_SURFACE_APPEARANCE`
reports a surface appearance chart budget of 30137/16384 for the existing alley
fixture. Log: `generated/kowloon-balcony-props/span-test-baseline.txt`. This is a
pre-existing fixture/material budget failure, not evidence about the new props.
Use a smaller bounded acceptance fixture for new contract tests; do not silently
weaken the appearance budget or count this existing failure as a new regression.

## Family adoption recommendation

Replace matching shirt/trousers/sheet families with accepted generated assets;
retain genuinely different procedural families only as intentional current designs.
Do not choose old geometry based on absent textures or a legacy mode. Keep one
selection/fitting boundary with declared support compatibility and measured
width/drop/depth for every design. Dedicated shared plant/garment atlas roles can
coexist with the cloth role still used by curtains and other distinct consumers.
Avoid reducing all washing to three repeated appearances; review silhouette and
print variety independently from seeded size/tint variation.

## Initial implementation follow-up

User steering supersedes the earlier variety recommendation: remove the old
long-sleeve shirt and avoid printed patterns. The current design retains plain
vests, shorts and towels while adopting generated shirts, trousers and sheets.
Plain cotton replacement is therefore intentional; verify the normal and property
channels do not leave the rejected print visible under changed lighting.

Inspected `balcony-props.ts`, `laundry.ts`, `bake-balcony-props.py`,
`pack-balcony-props.py` and the initial baked catalog. The normal transform for
combined sway and support slope is the correct inverse transpose. All six baked
asset bounds are finite. The six garment anchor points coincide with actual mesh
vertices to approximately 5e-8m, so they are suitable inputs to independent contact
tests. Do not stop at this metadata check: the emitted fitting still has to touch
the receiving line or pole.

Material finding before acceptance: the initial packed bedsheet has `maxZ=0`,
all vertices below its two crown anchors, while `hangMeshGarment` places the pole
center at that same height. Thus a finite-radius cage rod (0.013m) cuts into the
fold rather than sitting below a crown wrapped over it. A folded sheet requires
support-specific crown clearance and an actual cross-section/contact check near
the center of its top, in addition to anchor tests. The initial emitter also
places clothespins on every non-hanger mesh, including a sheet folded over a pole;
review whether those pins plausibly reach both cloth and pole after correction.

Recommended focused assertions for the imminent tests:

- Hanger selection never chooses a sheet; pole selection excludes the generated
  shirt because its mesh is not threaded through sleeve openings. Exercise the
  remaining supported asset/mode combinations explicitly.
- Width and downward extent are independently measured from all emitted cloth
  vertices; include source points above the suspension line, hanger offset, slope,
  allowable sway, frame reflection and the real runtime scale range.
- At positive/negative line slopes, each actual cloth anchor and its clip meet the
  independently evaluated line height at that anchor's horizontal position.
- Hanger cloth remains level on a sloping carrier, with the hook contacting the
  carrier and shoulder/waist support touching the mesh anchors.
- For sheets, sample actual geometry around the pole cross-section to reject a
  floating or intersecting crown. Mere equality of stored anchors is insufficient.
- PBR export tests load the new shipped roles by default and explicit overrides;
  model geometry and fit must not depend on whether a texture override is present.

This follow-up is not final test approval; no new test file existed at review time.

A subsequent independent triangle cross-section calculation confirms that a simple
`radius + 0.002m` sheet lift is insufficient: at scale 0.76 and radius 0.008m,
the center slice's top remains -0.00667m below the rod axis and its nearest surface
is 0.00669m from the axis. At radius 0.016m, top becomes +0.00133m, but nearest
surface distance is only 0.00012m. Both intersect the support cylinder. Similar
results occur at slices ±0.2m and ±0.4m. The crown sags along X and the collapsed
depth narrows its cavity. Refitting the local crown around the rod, or using an
explicit pinned-line-only sheet contract with suitable attachment, is needed;
preserve folds below the local repair and inspect the final result visually.

## Final focused test review and additions

Reviewed the revised sheet contract: folded linen is clipped 14mm below a cord,
not draped over a rigid pole. Selection excludes sheets from pole/hanger use. This
resolves the identified crown/rod intersection without claiming an unsupported
wrap. User-requested plain cotton now also occupies the fourth shared cloth chart
for retained procedural garments; old pattern indices are no longer the contract.

Strengthened `tests/aml-balcony-props.test.ts` independently:

- All emitted balcony triangles must remain inside one chart's padded texel-center
  bounds; finite UV values alone were insufficient.
- Retained procedural laundry is drawn and checked against the actual plain-cotton
  chart, rather than asserting obsolete source design fields.
- Added real clip geometry checks across all three mesh garments, scales 0.65 and
  1.02, slopes -0.18/0/+0.18, sway -0.05/+0.05, and identity/reflected frames.
  Rays in both directions must hit clip side faces around an actual emitted cloth
  vertex, the independently evaluated cord point, and the bridge between them.
  This rejects omitted clips, clips on only one of the two contacts, and floating
  sheet attachment despite correct metadata anchors.
- A separating plane through each sheet's emitted triangle vertices establishes
  at least 12mm clearance from the cord center plane. This exceeds the 8mm cord
  radius and catches the previous intersecting-crown placement under both slopes
  and sway directions.
- Export checks now require six shared PBR source images, a common UV set across
  channels, and unique embedded image-byte hashes. The earlier unique-bufferView
  check could accept duplicate copies of identical image bytes.

Validation on the reviewed state: all six focused tests pass; targeted strict
TypeScript checking of the test and imports passes. No production edits were
made by this reviewer. The suite meaningfully covers the new runtime asset/clip
contracts and is approved. Existing generator-wide clearance/physics suites and
frozen real-render visual review remain separate evidence; focused tests do not
establish global architectural or gameplay validity.

Added a seventh test after inspecting the bounded project AML: real public
`parseAml`/`compile` on a 5×3×6.35m, two-story building with density 16. It requires
both new built-in balcony roles to appear through production building consumers,
no error diagnostics, unchanged authored source, identical collision/physical
hash, unchanged navigation floor inputs, and visualization-only/noncollidable prop
surfaces. This avoids the unrelated large-fixture appearance-chart budget failure.
The test embeds that minimal source so later presentation edits to the project do
not silently alter the regression fixture.

Final verification: **7/7 tests pass** on the final plain-shirt/plain-cloth state;
strict targeted TypeScript check passes. Full run retained in
`generated/kowloon-balcony-props/final-test-review.txt`. Test ownership is returned
to the parent agent; no unresolved material test-review findings remain.
