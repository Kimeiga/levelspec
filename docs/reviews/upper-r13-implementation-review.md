# Independent R13 implementation review

**Status: development-03 resolves the identified structural regressions and is suitable for provisional source capture; complete conformance remains open.** The small arch-contour deviation is now traced to the compiler's existing bounded cleanup, with the actual frame/pane contact still exact. The seven strict floor-gap findings remain unwaived.

## Scope and independence

Reviewed `model-r13/upper-family.ts`, the changes to `author.ts` and `selected-assembly.ts`, and surrounding native floor, keeper, enclosure and serialization code. The immutable release is `reviews/model-r13-drawing-release.json`, SHA256 `62f7233a57dcc76c498084147a593824aacd123cc608bf27e0864ee308c53d3f`, under `projects/dai2-daiban/studies/multiview-restart`.

The adapter binds exact R08 inputs before geometry allocation, chooses the new upper family before shared unions, excludes the old rear arch from emission and hence its attached glazing, and handles the finite rear pair and HOME throat explicitly. Old context is not fed back as a second upper emitter. At code-review stage, no additional concrete structural blocker was found beyond the actual failure below. This is not proof of complete physical replacement or preservation: retained R12 geometry is regenerated through the prior pipeline and must pass the independent whole-union comparison.

## Development-02 actual correction and remaining structural finding

Saved subject: `generated/dai2-daiban/multiview-model-r13/development-02/compiled.json`, SHA256 `9e16b83a83cc629ea8ea6c54ead6736092f7f97a88d9a4ab75f30dd2a07a16e1`, geometry `bc51b2f88c60da4c4fbd1db925331823a7ef527b05e2371be7cfc5efe6528bd2`. The new direct YZ extrusion normalizes front/back X planes before CSG and preserves Y/Z orientation. The three coplanar diagnostics are gone; seven strict floor-gap errors remain.

Independent [correction-audit.py](../../projects/dai2-daiban/studies/multiview-restart/reviews/upper-r13-implementation-intake/correction-audit.py) compares complete actual front/back triangle polygons for both frames and infills, separately visible/collision, with encoded frozen opening polygons. It also checks triangle multiplicity and intersection with rear-host faces. All tested frame/host intersections and duplicate-triangle areas are zero. The rectangular frame, including the canopy subtraction, and rectangular infill match the complete expected faces. Development-01→02 changes actual oriented triangle/physical-contract signatures for only four rear objects: two infills and two hosts. All other actual triangle contracts are unchanged between these two subjects.

However, the arch infill is missing approximately0.1521m² at Y5.82..6.00/Z8.00..8.845; its bottom frame is missing approximately0.0063m² at Y5.82..6.00/Z7.965..8.00. Actual rays identify `mv-w-pkt-s/mv-w-pkt-s/piece0/partition0/screen-part0` in this area. Initial whole-opening expectations did not subtract this keeper; rather than silently fitting the expectation, I compared the implicated actual retained owner against frozen R12.

**The retained crosswall has expanded180mm west:** its R12 saved bounds start at X6.78000021, whereas development-02 starts at X6.59999990, with unchanged Y5.82000017..6.000 and Z4.28499985..8.84500027. Complete oriented planar-patch comparison confirms added/changed faces, not merely a changed name or tessellation. Its regeneration after the shared rear-host retirement has reclaimed material inside the new opening. R08 explicitly retains its actual alias; preserving the logical old box is not proof of preserving the intended shared physical contribution. Reconcile this regeneration with the full new aperture cut and retained-context contract before treating the arch as implemented. Do not remove the retained crosswall wholesale or change the reviewed opening to match the accidental clipping.

The same [retained-intake.py](../../projects/dai2-daiban/studies/multiview-restart/reviews/upper-r13-implementation-intake/retained-intake.py) independently compares the complete HOME-left exterior. All73 oriented planes and physical semantics match R12 despite changed triangle partitioning, so the known shoulder/head intrusion is preserved. This is bounded two-owner evidence, not whole-model retained-union acceptance. The scripts and their JSON results preserve exact input identities and confirm those inputs did not change during execution.

A provisional source capture can expose the actual arch clipping provided this finding accompanies it. It is not an accepted source hypothesis or a successful full-conformance result. A correction requires a fresh saved subject and new captures as appropriate.

## Development-03 bounded correction verdict

Saved subject: `generated/dai2-daiban/multiview-model-r13/development-03/compiled.json`, SHA256 `bf53476e7c6fcde882ade7298d335c14ecd5c47427d9e6c7e3366ef62936b34b`, geometry `a6babd6c24c43c110a0e1a3ef8e4945ef884cc39b562177e68f910c2546157e5`. Read the narrow adapter change: it binds the exact R12 XML and compiled identities before selecting W-PKT-S's actual retained X6.78..9.08 residual, with a precondition on its old nominal box. It changes neither the released opening nor the retained wall's remaining finite extent.

Repeated the bounded actual-geometry audits with fresh `CORRECTION-AUDIT-DEV03.json` and `RETAINED-INTAKE-DEV03.json`. The large missing arch regions are restored. All tested frame/host intersections and duplicate-triangle areas remain zero, and the rectangular frame/infill faces still match. W-PKT-S's original exterior planes now match R12; the sole additional plane is its necessary closing face at X6.78, where the retired shared host formerly concealed the interface. That is an exposed boundary of the preserved residual, not the prior180mm volume expansion. HOME-left's complete73 exterior planes and physical semantics still match.

The direct arch comparison does **not** yet pass its strict raw polygon thresholds: frame/infill symmetric-difference areas are approximately6.10×10⁻⁶/4.02×10⁻⁶m², with maximum boundary distance approximately51.23µm from independently millimeter-normalized frozen loops. These small curved-contour differences must be explained by the declared encoding/Boolean/simplification contract or corrected; do not enlarge a tolerance to fit them. They do not resemble the previous180mm structural clipping. The raw failed comparisons remain visible in the JSON evidence.

There is no remaining identified coarse structural blocker to **provisional diagnostic freezing and source capture** from this bounded implementation review. This does not approve the complete model, full retained union, all stair contacts, source fidelity, normal-body passage or strict PR13 results. The independent checker's numerical oracle and physical-semantic coverage review is still pending, and the full checker must run on the exact final saved subject after its review.

### Existing cleanup explains the small curved exterior deviation

The coordinator identified the existing `staticSolids` shell cleanup in `src/vector/compiler.ts`: `.simplify(0.0001)` before hashing/export/navigation. Independently read that code and Manifold's installed declaration, which specifies surface movement below the supplied tolerance. The new arch assets are static, collidable props, so they enter this path; no new runtime rule or candidate-fitted tolerance was introduced.

Parsed the exact frozen `source-package-02` frame/infill GLBs through the same GLB reader, then compared them with saved pre-shell `exportSolids` and final actual triangles. Both parsed asset positions and triangle arrays exactly equal their pre-shell export records. Complete front/back boundary deviation from the independently encoded drawing is only0.524µm for the frame and0.286µm for the infill before shell cleanup. The compiled boundary moves51.2265µm from each asset, within the existing100µm cleanup bound; frame triangles reduce444→412 and infill220→204.

Crucially, the actual compiled frame's inner profile and pane's outer profile coincide exactly: boundary distance0, projected gap area0 and overlap area0. Thus this explanation does not waive a physical joint defect. The previous raw polygon differences remain preserved as measurements, now explained by the existing exterior-deviation contract. The independently hash-bound [cleanup audit](../../projects/dai2-daiban/studies/multiview-restart/reviews/upper-r13-implementation-intake/ARCH-CLEANUP-AUDIT.json) and [script](../../projects/dai2-daiban/studies/multiview-restart/reviews/upper-r13-implementation-intake/arch-cleanup-audit.py) retain this evidence. This bounded arch finding is closed without a model change; complete-model conformance is still a separate pending gate.

## Saved development-01 finding

Subject: `generated/dai2-daiban/multiview-model-r13/development-01/compiled.json`, SHA256 `2e785267352605ffa3296749fd71e0eb0f3936ff9993750cfb0c72d30c51326c`.

Actual saved diagnostics report same-facing duplicate surface areas approximately 0.1939 and 0.2085 m² between the new arch frame and two rear hosts, and 0.3042 m² between the rectangular frame and north frontage. Reported rear-plane positions are X6.7800002098. These failures cannot be waived as small endpoint differences: the duplicate face areas are substantial.

Independent code inspection identified a plausible precision mismatch: the initial YZ helper used an already float32-normalized extrusion depth but translated it by raw double `snapCoordinate(depth[1])`, while host boxes use float32-normalized endpoints. A residual host skin can collapse onto the frame plane when finally encoded. The author independently proposed the same cause and is preserving development-01 before a fresh revision. The bounded correction should construct both host and cut from identical normalized front/back planes before Boolean operations, preserving world Y/Z orientation. Actual full-depth cuts, missing/extra material and surface semantics must verify the result; diagnostic disappearance alone is insufficient. No tolerance, reviewed dimension or suppression change is authorized by this finding.

## Stair encoding checks already performed

Independently read `normalizeCoordinates` and `buildFlight`: `rise` encodes a maximum, not the actual equalized riser. Compared all 21 adapter-generated cell intervals against independent arithmetic without emitting geometry. N12 uses maximum0.170, complete X1.900..5.773, actual going0.32275 and total rise2.030. Its high cell is X5.45025..5.773 at11.000. FE2 uses maximum0.158, complete Y6.000..3.480 and actual high12.418/soffit12.218; its nine equal risers are1.418/9. Every compared cell matches.

Then extracted the actual saved development-01 upward horizontal triangles, independently of native stair metadata, for each native flight. Found exactly 12 N and nine FE2 tread elevations. For every tread, compared actual XY coverage bounds, top elevation and summed oriented horizontal area with the independently encoded rectangular cell; no mismatch above2 micrometers in coordinates or2×10⁻⁶m² in area. This bounded check establishes count, horizontal extent and total tread area only. It does not establish nonoverlapping full coverage, underside/contact material, landing support or body clearance; those belong to the complete checker.

## Remaining acceptance evidence

Review the corrected source and saved subject; run the independently reviewed checker on actual visible and collision geometry. Require old upper pane/frame/backfill absence, new complete paired openings/pier/canopy, HOME throat/roof, fractional stair contacts and all retained physical unions/semantics. Full upper and retained-middle normal-body walkthroughs, source comparisons and the strict PR13 workflow remain separate gates. No broad runtime test rerun is needed for this project-only implementation review.

This reviewer has not changed model/runtime code, generated geometry or the frozen verification plan. No source-fidelity, circulation or whole-model acceptance is given.
