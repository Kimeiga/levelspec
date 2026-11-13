# Independent blockout spatial / construction / circulation review

Revision: developed layout L03 / model R06, `projects/aftershock/level.aml`.

- Source SHA-256: `3bbcb27ad9f1d32dbc107d84ba92e38f5d0465f53bbb5ddad4a0adb6ff2913e7`.
- Physical hash: `bef90ee7785c41cc7d8e0752fd88ee5a0e0cee56f0d6ae79d27f1d98c4df5c3e`.
- Body: radius .30 m, standing2.0 m, crouch1.1 m, step.25 m, slope42°. No body/check relaxation.

**Disposition: accepted as a geometry blockout in the reviewed spatial/construction/circulation scope.** No consequential physical defect remains in the inspected revision. Separate tactical and dedicated visibility reviews own their findings and playtest questions. This acceptance does not establish competitive balance or target-engine physics.

## Evidence and inspection order

Actual raw overview/reverse/plan and named first-person images were visually inspected against the editable source and reviewed drawing. The failed `capture-r06` run contains useful partial images but is not treated as a completed capture manifest. `capture-final-r06` and the first `capture-independent-r06` were independently rejected: all requested cameras silently retained the same distant overview, despite correct source identity. Their requested labels are not viewpoint evidence.

Corrected main set `capture-verified-r06b` contains16 distinct, actual-camera-checked views with matching loaded AML and no browser errors. I inspected its overview, reverse, plan, all four named A views, T exit, Red Loop, Cable Seam, fan pad, S4 crest/foot and B service/south/retake images. The nearly vertical plan camera differs from the requested Y by approximately.00018 m because of the orbit polar clamp; this does not change its spatial interpretation. Corrected `capture-independent-r06b` adds12 distinct, actual-camera-checked views at the same source hash, including S1/S3/S4 intermediate and follower positions, Fan west passage and Cable Seam. Actual standing/crouching browser captures in `stances-r06` contain12 poses at six positions with the matching source hash and no browser errors. Their recorded feet/eye/stance, rather than arbitrary camera labels, establish stance state.

The author-provided `walk-r06b/report.json` was checked: all22 performed directed movement sequences pass, including all four flights in both directions, both T-to-A journeys, both T-to-B journeys, CT deployment to both sites, and a full A–B east rotation in both directions. The A–B performed route takes28.0 /28.025 seconds at harness speed; that is inspection travel, not a multiplayer timing claim.

I independently compiled the saved AML and queried its physical collision mesh. `generated/aftershock/independent-spatial-r06/report.json` retains19 supported standing-body placements and actual WalkMotion crouch states, plus21 exact physical walking-top probes at the S4 ground interface. Both identities match the source and physical hashes above. The retained `inspect.mjs` reproduces these focused checks.

## Plan / model conformance and whole volume

The actual model retains the selected eccentric broken spiral: upper northern A crescent, lower inboard B collision bowl, long lower Red loop, shorter Cable Seam, distinct western ascents and remote east transfer. It has neither the rejected central overpass nor a defender rear crossbar. The14 m drum is a solid non-occupied mass; the white central/exterior voids are cutaway non-floor, not unmodeled playable rooms.

The actual lower slab no longer includes buried floor beneath filled flights or the spurious ground-level spur beneath the raised turning pad/S3. This is a supported correction to source-floor ownership: it does not admit an under-stair route, change player dimensions, or remove any claimed connection. The native flights and their landings supply the intended walking surfaces.

S1/S4 receive solid side cheeks to ground; side guards are moved inward to contact their supported flight edges. The supported upper crescent has explicit slab thickness, piers and foundation shoes. Station ribs meet boundary floor/wall regions, with crown/fragment heights above the occupied body. The two retained high roof fragments overlap crown beams rather than floating over an unsupported route. The Fan canopy meets remaining posts and its tall switch mass; removal of its west-north post preserves the declared west passage. Decorative rails/panes/markings remain separate from physical collision; closed train bodies do not create traversable window or underbody slits.

Disconnected collapsed slabs, a crushed car and girders remain in the lower void. Their incidental top navigation is scenic/unassigned and does not imply a route to them. No extra link or spawn seed was used to connect them. No consequential unexplained floating assembly or new playable bypass was observed in the inspected volume; structural engineering adequacy is outside this review.

## Named interfaces and actual body evidence

- **T arrival / exit / S1 toe:** the extended T-gate preserves the north turn via y50. The3.2 m-clear roof and rising S1 toe coexist without head collision. Independent supported pose(20,50,0.01) fits; S1 lower/middle/crest samples fit standing2 m and switch to crouch1.1 m. The full outer route passes both ways.
- **Cable Seam / S2 / fan pad:** the flat route now travels south of S2's filled toe before passing east of Cable-screen. Cable-low is flush with the south boundary, outside the rotated flight; west and north supported stances fit. The fan pad's real receiving edge follows S2's full rotated end, then turns into S3. The saved millimeter-serialized AML compiles and both local S2 directions pass. The standing pad pose(29,54,2.01) fits; no hidden rectangular slab intrudes into the lower stair.
- **S3 / inner A receiving walk:** actual intermediate and crest bodies fit, both directions pass, and the extended receiving strip through(42,89) joins the main crescent by usable area. It no longer ends in the guard pinch found during early trial steering. The intermediate/follower views show a real guarded rising route beside the drum and a visible onward receiving space, not a passage under the upper slab.
- **West gallery / A:** outer and inner journeys reach different sides of the derailed car within one broad western frontier. The actual train mass, ticket wall, boundary ribs, A-low and plant sit on the intended floor. The relocated low cover has supported west/north stances; actual browser standing/crouch pairs confirm body state and directional ducking. The cover does not claim protection from every other angle.
- **East arc / CT:** the signal block and inner screen preserve the intended curved path around the drum. CT's gate south opening and3.2 m-clear foyer roof admit both deployment routes. No new central overlook floor or southern upper bypass was introduced.
- **S4 / Fan / B:** intermediate and follower views show the descending flight, supported lower pad and split around the tall switch mass. The actual west passage is no longer blocked by a canopy post. Independent(80,56,0.01) fits standing and crouch, and full CT-B and A-B sequences pass both ways. B's two closed train masses, lower plant and low cover retain the reviewed spatial arrangement.
- **Red loop / impact throat:** actual broad rim and return bend remain distinct from the shorter service seam. It reaches B without entering A or jumping a fracture. The whole long route passes in both directions; collapsed scenic fragments remain inside the non-floor void.

The four4 m-authored flights have approximately3.56 m between inward .22 m guards before local junction details. This provides substantial single-body passage; following players can occupy supported positions behind the lead along the same route. Views were compared at those positions. No multiplayer body-blocking, trading or simultaneous two-body simulation was performed.

## S4 FLOOR_EDGE_GAP warning adjudication

The CLI retains one warning comparing the lower floor edge at y60 with `S4-east:upper`, reporting a hypothetical4.571 m vertical interval along3.560 m. The actual compiled collision surface does not show such a walking gap.

Independent upward-face probes at x82.5,84 and85.5 give the same profile: y59.7/59.95 → top0; y60 → floor0 and the first horizontal tread.178571 m; y60.05/.2/.45 → tread.178571 m; y60.7 → next tread.357143 m. The first actual rise is below the.25 m step contract. The capsule resolves supported feet at the foot; the authored local route and full rotation physically traverse it in both directions.

Therefore this warning is retained as a reported checker candidate, not a demonstrated broken connection. Adding a tall wall across the required foot to silence it would damage a working route. The filled flight and side cheeks are present; no route depends on the warned abstract vertical interval.

Two small construction suggestions also remain nonblocking: a roughly7 cm end fragment in S3's side-guide accounting, and a22 cm S2 side-offset suggestion. Neither establishes a body-sized opening or a lost physical guard/contact in the inspected meshes/views. Scenic unassigned navigation islands are expected on roofs, train tops, slab debris and the non-occupied drum. They are not authored gameplay routes.

## Limits

Validation, bounded capsule movement and point/stance queries are not a continuous swept-capsule proof. The review does not establish weapon/utility penetration, sounds, damage, plant/defuse clocks, multiplayer trades, boosts or target-engine navigation. Jumping to scenic tops and gap crossing were not claimed or tested. Long/vertical views and objective timing risks remain in the independent visibility/tactical records. These limits do not conceal an observed physical defect in the accepted blockout.
