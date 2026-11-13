# B10 focused repair layout review

Initial verdict: **one small drawing correction required**; stair-overlap proposal accepted. Review only the two B09 findings and their immediate interfaces; retain the rest of the B09 assessment.

Inspected `repair-b10.svg` / `reviews/evidence/repair-b10.png`, updated `layout.svg`, plan data and the cap-cut construction before production AML. Reviewed initial plan SHA-256 `df060bd71a0252374f1015d2be0a83efb5854e4662a0605e93ebc49120b521ac`; AML was still B09.

The screen footprint initially used the reviewer's earlier four-vertex candidate. An exact containment check caught that this candidate clips a small triangle from the old screen's northern edge, contrary to the requirement to retain all old opaque mass. Correct it by retaining the original northwest vertex, producing this five-vertex polygon:

`(71.535,88.275); (72.544,92.043); (66.265,93.725); (65.465,93.725); (64.456,89.957)`.

This corrected footprint fully contains the old screen, adds3.6872m², keeps base4/top7.2, and blocks both identified spawn-offset ray families with the intended .8m west extension. Its western edge is the same as the initial repair; the previous intersection calculations and minimum .58115m required extension remain applicable. It does not remove an old opaque region and cannot reopen a previously blocked line by subtraction. The expanded screen remains approximately3.62m from the nearest upper-floor boundary in the relevant plan study, preserving both bypasses. Geometry and all supported offset/posture queries still need compiled recheck.

The stair cut now stops .006m before each canonical endpoint, approximately .0078m in the scaled world plan. Independent checks against the new polygons found all ten end caps supported across their full7.8m width, including a parallel cap line4mm inside each stair. This is a real positive slab/flight overlap rather than a tolerance change. Tops, risers, foundations, body dimensions and sidewell clearances remain unchanged. The repair is appropriate for the sub-millimeter oblique-cut gaps observed in B09.

After the five-vertex drawing correction, this local layout is suitable for production. Compile and rerun strict validation, prior failed Cliff2 lanes in both directions and neighboring stair lanes, complete authored routes, supported offset spawns with standing/crouch eyes, Gate bypass/upper-entry opposing views and explicit roof-on/crouch evidence. No whole-map redesign or renewed interest review is needed.

## Return review — accepted

Re-inspected the corrected raw plan and repair drawing. Plan SHA-256 `421e13d13c5628dabcfe7c7291cb8e3a1151ae27f68d06becc7aacd8c36f7129` now contains the five vertices above, and an exact polygon containment check confirms the entire old screen is retained. **Focused layout gate: accepted for production.** The cap-overlap assessment is unchanged. Compiled return checks remain required; no other layout issue is introduced by these local repairs.
