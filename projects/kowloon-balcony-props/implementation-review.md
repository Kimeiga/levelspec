# Independent implementation review — balcony props

Reviewed 2026-11-12 against the approved six-model Tripo batch and the subsequent
request to remove the old rightmost shirt and avoid patterned laundry. Production
code was not edited by this reviewer.

## Resolved findings

1. **Offline rebuild must not replace adopted data with an incomplete catalog.**
   The initial `tools/bake-balcony-props.py` skipped missing or empty result files;
   `tools/pack-balcony-props.py` skipped missing named assets. Since source model files
   live in ignored `generated/`, an ordinary cleanup can make a later rebuild emit
   an empty/partial catalog and blank atlas cells over adopted assets. Preflight
   all six approved result records, successful model files and required PBR maps
   before writing outputs; require the complete named bake catalog in the packer.
   **Resolved:** bake preflights every result/model and matching successful provider
   task before rewriting outputs. Pack preflights the exact six names, nonempty
   geometry, every source channel and plain cotton before touching adopted files.
   Independently checked that all six provider records satisfy the success/ID gate.
2. **Capture provenance should include the code and data actually introduced.**
   The initial `build-context.mjs` hashed four old entry-point files but omitted
   `balcony-props.ts`, its catalog, shared images and builder. The captured GLB is
   hashed correctly, but that alone cannot tie it to the final source revision.
   Include the new emitter, catalog and material maps in source hashes.
   **Resolved:** the new emitter, catalog, all six maps and context builder are hashed.
3. **Document the new authoritative cloth contract.** `docs/DRESSING.md` initially
   describes all washing as procedural cuts in the old 8×4 atlas. Update it for
   the shared `balcony-cloth` PBR atlas, plain vest/short/towel cell, mesh shirt/
   trousers/sheet families and sheet's line-only clipped suspension. Retain the
   old `cloth` role for actual remaining consumers such as curtains.
   **Resolved:** documentation now distinguishes both balcony roles, plain procedural
   cell and line-only sheet support; the project README records local repairs,
   reproduction, memory and triangle costs and the old curtain role.

The plain procedural tee was restored at low weight, making threaded sleeve
support legitimate. Obsolete long-sleeve-specific branches and atlas fields were
removed. The sheet's bake comment now describes clipping below the cord.

## Code and data assessment

- Production integration is real: `pottedPlant` draws the adopted catalog through
  the existing sill/cage/balcony/rooftop callers, while `chooseGarment` and
  `hangGarment` feed the same new mesh forms into both facade fixtures and spans.
- The shared selection boundary keeps span planning independent of how a garment
  was made. Plain vests, shorts and towels remain distinct designs, not a
  material-availability fallback to superseded garments.
- Asset transforms preserve meter/Z-up domain coordinates. The runtime slope/sway
  normal transform is the inverse transpose of the geometry shear. Pen owns
  world transforms and reflected winding, so no extra mirroring workaround is
  needed in the new emitter.
- Static source arrays are read without mutation. Padded base color, normal and
  roughness/metalness maps share chart coordinates. Intrinsic materials and the
  image whitelist use the established shared-library path; ordinary compilation
  makes no paid-generation or network request.
- Cloth is collapsed in depth once offline, documented as a deliberate repair.
  Runtime fitting scales uniformly. The new line-only sheet placement keeps the
  fabric below the cord and puts clips through actual upper mesh vertices,
  avoiding the previously demonstrated invalid draped-pole fit.
- The repaired rubber pot has a complete tapered wall. Its low-poly leaves remain
  angular and some raw source leaf skins are imperfect; this is an art limitation
  rather than evidence of a manifold, print-ready model. Judge it at the intended
  balcony viewing distance. Other plant choices supply different silhouettes.
- The viewer now supports both front-side defect inspection and production-style
  double-sided opaque materials. The final front and close laundry captures were
  inspected: the former rightmost long-sleeved shirt and printed floral/checked
  laundry are absent. Low-poly folds and muted dye variation remain readable.

## Independent validation

`node --test tests/aml-balcony-props.test.ts` passed **7/7** on the final reviewed
revision, and `npm run check` passed. Coverage includes real public AML building
compilation adopting both material roles without changing collision or navigation
floor inputs, deterministic export, shared images, plain procedural UVs, bounded
uniform fit, suspension contact and clipped sheet clearance.

Inspected actual `rubber-fixed-01` front/back/side/clay captures and the sheet's
side capture. The original missing pot wall is repaired. The sheet remains thin.
Those older captures alone do not establish the final plain-fabric or clipped-sheet
revision. Refreshed `review-final/context/front.png`, `context/cloth.png` and
`rubber-plant/side.png` were subsequently inspected alongside their frozen
GLB/viewer hash record and zero browser errors. All eight capture records now
explicitly confirm double-sided materials and shadow normal bias 0.012 / bias
-0.0001. The earlier dense shadow-acne pattern across cloth and walls is gone;
sheet folds and plain cotton remain clear. The repaired rubber pot is complete,
while its deliberately low-budget leaf silhouette remains visibly angular.

Status: **approved**. No unresolved material implementation findings. Close-up
angular leaves and generated shading remain documented art limitations; approval
does not claim manifold geometry, hero-asset quality or gameplay validation.
