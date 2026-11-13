# Ninefold R08 — compiled review packet

**Independent compiled strategy, local visibility and architecture decisions remain open.** This is a bounded native blockout, not balance or target-game acceptance. Current AML SHA-256: `d44fb0afd227ac731300adc53726895efc51cf4f2cc4aa5d18172cb29c20d075`.

For raw-first review: open [roof-on architecture](evidence/compiled-r08/architecture-roofs.png), [factory roof-on](evidence/compiled-r08/factory-roofs.png), [global roof-off](evidence/compiled-r08/global-roof-off.png), [native plan](evidence/compiled-r08/native-plan.png), then actual player-view boards in [board index](evidence/compiled-r08/boards/index.json). The [native AML](../level.aml), [exact derived geometry](../production-layout/layout-data-r08.json), and frozen [L02 plans/sections](../layout-l02/review-packet.md) supply coordinates. The [repair overlay](../production-layout/physical-repairs-r08.png) and [exact repairs](../production-layout/physical-repairs-r08.json) disclose differences from L02. Full-size source-locked capture batches are in `generated/ninefold-reboot-r08-{overview,interiors,coverage,low-cover,table}/`; the retained boards cover every actual walking capture.

## Construction and identity

The selected occupied factory, ground street, open lightwell, separate Boiler receiving volume, A/Sign stack and all six stairs are native physical geometry. F1–F6 have real roofs; C01–C08 retain separate heights and building identities. Roof-off evidence uses the supported **global roof toggle**, hiding all roof/canopy objects, not selective F1/F2/F5 visibility. Inaccessible contextual extrusions remain visible.

L02→production repairs realize intended links: Awning paving joins its chamfer to the underpass; Paper's lintel clears S1; S3's waypoint turns inside its landing; low underflight remnants are enclosed without blocking the claimed S3/S5/S6 underpasses; guards receive bearing strips and sub-body corner seams receive caps. The factory courtyard's former 9.5 m ground-wall fins now stop at z3.2 and attach through real nonplayable setback returns. CORE reaches ground. V-WELL, its upper wall, roof hole and the player body remain unchanged. The repair overlay identifies dimensions and stable IDs rather than silently replacing L02.

R06 before evidence is retained alongside the final evidence. R07 resolves the courtyard finding. R08 changes descriptive metadata only: [identity comparison](../production-layout/r07-r08-identity.json) confirms identical physical hash, render mesh arrays and material values. The compiler render hash differs because material source byte offsets moved with the longer description; it is not claimed identical.

## Verification and intended-link coverage

Strict validation and build passed with zero diagnostics, nav cell0.125 m and `--strict-floor-gaps`. Build artifacts are in `generated/ninefold-reboot-r08-build/`. Optional UV baking was skipped with `--no-uv` because Blender is unavailable. Read [verification.json](evidence/compiled-r08/verification.json), [validation](evidence/compiled-r08/validation.json), and [build result](evidence/compiled-r08/build-result.json).

**108/108 forward/reverse physical walk checks pass.** Every request uses the existing inspection walker at at most0.035 m requested horizontal substeps, r0.25/h2.0/step0.25/slope42; no body shrinking or off-nav teleport crosses a failed interface. Stair chains include foot, quarter, middle, three-quarter, crest and receiving landing at center and ±1.3 m lateral offsets. All142 view/target placements have standing and crouch clearance. This verifies the available physical/navigation method, not a continuous capsule sweep or a2.35 m headroom certificate. The script records actual positions, distance and endpoint error; travel-time numbers in L02 remain estimates, not measured round timings.

| Intended relationship | Performed direct coverage, both directions |
|---|---|
| Canal→Awning / Canal→Butcher | J02 / J01; portal-D-BUTCHER |
| Awning→dogleg→factory street | J10, including repaired(36,22)→(40,28); portal-D-UNDER-W |
| Butcher→Paper→underpass | J03; portal-D-PAPER and portal-D-UNDER-W |
| Butcher→Drain→Boiler ground→Dye | J04; portal-D-DYE-W |
| Underpass→Well→Dye→Water | J03; portal-D-UNDER-N, portal-D-DYE-S, portal-D-DYE-N |
| Dye→A-west | J04; portal-D-DYE-E, portal-D-A-W; three full under-S3 landing crossings |
| Tailor ground→A-south | J02; portal-D-A-S |
| CT→A-rear ground, separate from Sign climb | portal-CT-ground-A; portal-D-A-N; west-S4-ground |
| School→B / East→B / Boiler→North→west aisle | J01/J08/J05; portal-D-B-W, portal-D-B-E, portal-D-B-N, portal-D-NORTH |
| East↔Sign and CT→Sign foot | J06; portal-D-SIGN; sign-bottom portion of J06 |
| North receiving→inspection pocket | J09 through the actual north-pocket bends |
| Tailor→S2 / Water→S3 / A-rear→S4 | J08/J05/J06 plus each S*-width-{-1.3,0,1.3} chain |
| Butcher→S1 / School→S5 / Boiler→S6 | J01/J07 plus each S*-width-{-1.3,0,1.3} chain |
| Roof fold / School-to-Boiler bypass | J07, real two-flight ascent/descent and folded roof waypoints |
| Ground beneath S5 / Water beneath S6 | two under-S5 cross-sections; three under-S6 cross-sections |
| V-WELL / V-SIGN | Observation holes only; no movement connection claimed |

There are16 individually walked movement portals, all19 intended level links represented above, and ten journey chains. Native nav suggestions remain informational: five short `FLIGHT_OPEN_SIDE` intervals coincide with full-height J-* joint caps rather than an intended unguarded edge; other wall alignment suggestions are butt-joint heuristics. `NAV_ISLAND` includes inaccessible context/prop tops, nonplayable setback caps and one residual sealed under-S1 pocket; none is credited as a usable route. Independent reviewers should inspect these suggestions in the retained build result rather than treating zero diagnostics as proof of every possible surface.

## Actual camera and encounter evidence

Camera forms are applied **after ready**, then the actual published camera position, target, projection, FOV and frame aspect are asserted. Camera-form optical views use vertical60° / horizontal75.178° at4:3. Paired `*-actualwalk.png` images assert real standing/crouching mode, actual feet, yaw/pitch and rendered eye from the view matrix; the walking camera uses **vertical65°**, with actual horizontal FOV recorded from its projection matrix. Roof state and source hash are recorded per capture. Earlier L02's90h/60v notation is not reused as a claim about these images.

| Scope | Actual evidence and bounded finding |
|---|---|
| T / CT, both exits | Coverage1–2 boards; ten spawn positions tested against two approach targets each. T(11,11) sees Awning(36,23), CT(79.5,75)/(79.5,80) see A-rear(82,61). These are real local exposures, not protected-spawn claims. Central opposite-team spawn LOS check passes; full spawn-to-spawn offset envelope is untested. |
| Butcher/School, Tailor/East | S1/S2 boards and School leader/follower/East leader both postures; turn and covered receiving volume are physically distinct from the stair flight. Ground Tailor continues to A while S2 commits upward. |
| Factory underpass / Well / Dye, C1–C2 | Underpass opposing images show real low enclosure beneath B. WELL-UP/DOWN standing pair is reciprocal; crouched upper eye loses the view, standing upper still sees the chosen crouched lower eye. Well ±0.5 m upper offsets retain those lower center views; sampled Underpass/Dye doorway eyes stay occluded. This is a finite set, not all-offset exclusion. |
| B three approaches and support | B-E/B-N/B-SUPPORT both postures; North first clears a receiving room and west aisle. B-SUPPORT reaches that aisle but its occupied western mouth is exposed to School/East; PRESS prevents direct plant supervision. The original B-low-cover north-facing view is blocked by the well facade, not credited as support. Supplemental B-table-west/opposing images and `table-optics.json` instead test the real west approach: the standing table-side eye sees both opponent postures, while its crouched eye loses both. |
| A / Sign, C3 | A-SOUTH/A-REAR, Sign upper/lower, offsets and low-cover postures. Sign's standing shoulder ray exists but has a narrow usable slice near the sill; crouched upper and crouched lower mixed pair lose it. Tested plant/south rays stay blocked. A-rear does not directly see the selected plant-side target; south does. Low cover lowers the eye's available view and is not certified bullet protection. |
| S1–S6, C4–C9 | All flights have foot/follower/crest/reverse images, with follower and opposing crest crouch pairs. S3 crest faces a return and requires a west turn; its direct forward image is intentionally a wall. S4 crest first enters Sign; it is not a free A panorama. Some reverse crouch support rays close, so standing support is not generalized to all postures. |
| Roof and lower parallel paths | School/Reservoir/Fold images plus4 roof positions×12 lower targets×2 observer postures. All96 sampled roof-to-lower rays are blocked, including Well/Pocket/Underpass/B-mouth after the fin repair. The on-roof route remains a committed bypass; absence of those rays is not a universal roof-isolation proof. |

The optical queries use30,188 actual opaque faces, no unknown materials and no omitted dynamic faces. Images contain no opponent models: target locations in the JSON and finite eye-segment tests supply the opposing-position evidence. Firing volume, penetration, utility, audio, economy, multiplayer body blocking, trading, observed behavior and competitive balance remain untested.

## Latest shared-volume request

Factory street and occupied B genuinely share one building envelope/floor-ceiling assembly; there is no direct vertical sight through the solid factory slab. The lightwell introduces bounded reciprocal contact at V-WELL. Dye ground and Boiler upper gallery also share a structural volume, while A and Sign share an occupied works interior with a limited shoulder aperture. S5 crosses over the ground Boiler court; S3's landing crosses Dye–A and S6 crosses Water.

S3 atx68 and S6 atx62 are parallel/oppositely oriented flights6 m apart, at different height intervals, but adjoining walls and guards mostly separate their sight pictures. They should not be sold as continuously interacting parallel combat paths. Paper, Tailor's southern bends, west work aisle and much of the Boiler upper gallery remain isolated linear connectors; all six production flights remain straight. Thus R08 only partially implements the finer-grained request.

A [small local comparison](../production-layout/shared-volume-option.png) nominates **NF-V01**: split S5 into two10-riser flights with a90° midlanding, then a short upper gallery over Boiler's west ground passage. The same School→roof edge would acquire staged clearing and parallel lower/upper occupation. It costs School staging space, increases roof commitment and requires rebuilding the adjoining School mass; new court/gallery exposure may be harmful. Exact proposed coordinates are in its companion JSON. **Unselected and uncompiled: preserve R08; compare those costs independently before any edit.** Previously deferred School–North window and Tailor-court alternatives remain deferred.

## Requested independent return

Assess compiled strategy through the existing opening/contact/plant scenarios, local spatial evidence across the complete C1–C9 inventory, and complete roof-on architecture (including actual interior wall/roof junctions). Retain, propose or reject NF-V01 separately from R08 acceptance. Author self-inspection does not close these gates. Original Ninefold and both frozen L01/L02 packets remain intact.
