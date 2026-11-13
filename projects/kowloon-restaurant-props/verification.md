# Restaurant verification

Accepted evidence: `generated/restaurant-props/acceptance/capture.json` and its six
actual browser renders. The capture froze live generator/viewer/maps at run time,
validated the baked GLB, checked its build hash, and reported no browser, HTTP, or
page errors. AO was enabled in every view. The narrow view intentionally uses its
own simple fitted enclosure because the baked 3.6 m enclosure cannot fit a 1.8 m shop.

## Checks

- `npm run check`: passed; `generated/restaurant-props/typecheck-final.log`.
- Seven restaurant tests: passed after the final shelf support change;
  `generated/restaurant-props/tests-acceptance.log`.
- Combined seven restaurant + five existing timber tests: 12/12 passed;
  `generated/restaurant-props/tests-final.log`.
- Skill validation: passed for `.agents/skills/level-prop-assets`.
- Independent test review: approved. Independent implementation and visual review:
  approved after inspecting all six final views.

The tests cover actual emitted room bounds from 1.8 m to 3.6 m widths, shallow 2.4 m
rooms, intermediate widths, low 2.08 m ceilings, rotated/mirrored hosts, valid
normals and triangle winding, fixed-seed repeatability, detail-preserving triangle
multisets, unchanged physical collision, real tray ray intersections, exact
embedded kitchen/food PBR bytes, uniformly fitted food, mesh-vertex hook attachment,
meat resting on its tray floor, stool/box clearance, chopping-block clearance,
continuous takeaway-stack support, and the full ceiling-fan swept bounds against
cooking ducts. The implementation reviewer additionally sampled 32 seeds for
adjacent hanging-chicken bounds, with no intersections observed.

The broad pre-change `aml-shop-dressing.test.ts` baseline produced no completed
test after 857 seconds and was deliberately stopped. It is unverified; its SIGTERM
termination message is not evidence of a product failure. No full-suite pass is
claimed. Navigation or gameplay acceptance is outside this render-dressing task.

## Review repairs

- Wide shallow rooms omit the stool when its measured rotated footprint cannot
  clear floor boxes.
- Tray placement reserves the chopping block's full circular footprint.
- The batten/fan move forward to keep the entire blade sweep clear of the new duct.
- Extra rear cookware fits only where enough width remains; bowl placement follows
  usable bench width.
- Takeaway boxes stack at their actual lid height, removing 6mm air gaps.
- The high pantry shelf meets the wall and rests on a visible wooden cleat.
- Flat procedural red meat strips and the old random-business interior sign were
  removed. Food signage now uses appropriate text from the existing glyph bank.

## Materials and budgets

The accepted wide view has 21,664 prop triangles; narrow 8,018; alternate 22,890.
The independent surface bake has 284,300 triangles, totaling 305,964 in the wide
inspection scene. New source food meshes are 892 and 498 triangles. Kitchen maps
are 512×512; food maps 1024×1024. All are shared and padded. Source/provider and
production hashes are in the project manifests; task billing was 50+50=100 credits.

Actual close views show readable cooked food, attached hooks, open contained trays,
label variation, worn timber, brushed steel, ceramic glaze and end grain. The
concept remains an art-direction target, not evidence of implemented detail.
Three glaze variants share one chicken geometry; stock is merged by the existing
compiler rather than GPU-instanced. Normal compilation is entirely offline.

The standalone enclosure and AO are presentation features, while props, tiles and
fittings are wired into the production roast trade. The capture records the exact
source snapshot it rendered. Concurrent unrelated work changed
`src/dressing/surface/compile.ts` after capture; the retained capture hash remains
authoritative for that snapshot. Restaurant source/assets matched at final review.
