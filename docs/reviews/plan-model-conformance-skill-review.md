# Plan-to-model conformance workflow check

The reference-level-authoring skill now treats a reviewed schematic and its actual
3D translation as separate gates. This coordinator check applies the user's request
for explicit cross-floor overlaps and more complete multi-view schematic coverage.
It is a textual self-review; the architectural candidates have separate reviewers.

For a split-level courtyard, the required output is coordinated conventional plans
on common axes, a stack/overlap sheet and sections through interacting stairs,
landings and halls. Neighboring visible continuations from other original angles
belong in the schematic scope; unseen rooms remain unknown. A circular facade window
is projected and keyed on the plan, not made into an arbitrary circular floor hole.

If a correct plan's stair or door disappears, changes levels, rotates, narrows or is
blocked during translation, an XML owner with the expected name does not pass.
The construction reviewer must inspect actual saved/reloaded compiled cuts and
sections at matching levels, account for every assembly and check both missing and
extra material. The circulation reviewer tests usable endpoints and turns in the
actual model. A new source observation may justify a revised, independently reviewed
plan; redrawing a schematic from a faulty model to produce agreement does not.

The current north-stack work provides concrete regression cases: an inferred profile
axis omitted or misoriented finite walls; separate near/far wall ownership could
refill apertures; wall/stair lattice rounding left narrow full-depth gaps; a stair's
native highest cell could be lost from a deeper landing. These require geometry,
union and saved-source checks, not further facade polishing. Frozen r06 test evidence
records independent actual-mesh controls for these failures; its local acceptance
does not approve unresolved east/south architecture or failed PR13 evaluation.

The instructions explicitly preserve physical guard boundaries between different
levels. A guarded, unclaimed continuation is distinct from an unexplained open step
on a claimed route. Shared floor levels must be reconciled where references establish
a connection; metric uniformity alone does not justify inventing one.

Relevant instructions: reference-level-authoring/SKILL.md steps3–4;
references/schematic-workflow.md, “Mandatory deliverable” and “Verify the
plan-to-model translation”; references/independent-review.md construction scope.

## Native contour ownership follow-up

Added a bounded paragraph to `paired-contour-review.md` requiring enlarged native
edge ownership checks before authorizing structural repairs, including coordinator
inspection and explicit withdrawal of erroneous findings. This follows an actual
E8 review error: a rear arch/background line was mistaken for foreground coping,
and the coordinator initially accepted it. Native close inspection corrected the
finding before any geometry change. The source critic independently reviewed and
supported the added wording; evidence and retained rejected traces are in
`projects/dai2-daiban/studies/multiview-restart/reviews/model-r08-fidelity/CORRECTION.md`.
No runtime behavior changed and no wording-only test was added.

## Existing-owner disposition follow-up

Added the retained/rebuilt/retired mapping requirement to the conformance audit.
The S7 independent construction review found an old floor cap and old bridge guards
that the proposed new layout did not retire, plus replacement E guards that were
only implied. The rule now covers all affected logical contributions before shared
mesh union, including intersecting neighbors, and requires both missing-replacement
and obsolete-survivor checks on saved geometry.

Independent reviewer `/root/n_upper_r03_construction` read and supported the exact
new paragraph; its wording review is recorded in
`projects/dai2-daiban/studies/multiview-restart/reviews/joint-h6-construction/REVIEW.md`.
No runtime behavior changed and no wording-only tests were added. H6 recorded the
older guidance hash; its48 frozen geometric/evidence files remain unchanged.

## Face-orientation follow-up

Photo tracing now explicitly distinguishes horizontal caps, vertical faces and
sloped surfaces before interpreting their edges as wall thickness or height.
An actual upper-bay review misclassified a broad tiled coping band as a vertical
face, then prescribed a thinner wall. Independent source rereading and a fixed-pose
consistency check challenged that assignment; the critic withdrew the diagnosis
before model changes. The new wording requires cross-view/edge-direction checks
while keeping camera-conditioned reasoning separate from direct observation.
The retained correction is in
`projects/dai2-daiban/studies/multiview-restart/reviews/south-upper-return-owner-followup/FINDING.md`.
This is a wording-only refinement; no new wording test was added.

## Retained-intrusion and clear-width follow-up

Independent circulation reviewer `/root/south_upper_circulation` read the exact
addition after “Distinguish clear walking width” in `schematic-workflow.md` and
confirms it matches the actual r10 finding. The retained entry column narrowed the
rear crossing from a 1.40 m slab footprint to 1.10 m of local clear passage. The
normal-body roundtrip succeeded through that passage; an input-overrun attempt
hit the column. Requiring columns, returns and other intrusions on each affected
plan prevents the slab width from being mislabeled as clear without prescribing
removal of valid geometry. The evidence is in
`projects/dai2-daiban/studies/multiview-restart/reviews/model-r10-circulation/REVIEW.md`.
This wording review changed no runtime behavior, tests, frozen architectural
evidence, geometry or browser state.

## Camera-control ownership follow-up

Independent source reviewer `/root/model_r09_photo_critic` read and supports the
new camera-control paragraph in `photo-contour-tracing.md`. It applies the existing
source-owner review before pose estimation and requires the actual consumed points
to be visible over original pixels. In the main courtyard calibration, several
right-arc controls marked rear wall/window surfaces rather than the front inner
masonry cut used in the other view. A numerical fit did not establish common
physical ownership. The independent confirmation and its limits are retained in
`projects/dai2-daiban/studies/multiview-restart/reviews/model-r10-main-calibration-addendum/FINDING.md`.
Preserving the failed calibration and rechecking held-out features after reviewed
source correction prevents an erroneous pose from dictating a building repair;
it does not imply that a corrected pose will rescue the candidate. No replacement
control set or new pose was approved by this wording review. No runtime behavior
changed and no wording-only test was added.


## Reused-camera fitting provenance follow-up

Added a bounded paragraph after the camera-control ownership guidance in
`photo-contour-tracing.md`: inspect the original fit inputs and any jointly estimated
geometry before treating a reused camera as independent evidence. Consumed stair or
door observations are not held-out checks of those same structures. Fixed-pose
comparisons remain useful regression evidence; independent stable-feature controls
resolve consequential camera/geometry ambiguity without fitting a preferred model.

Independent source reviewer `/root/model_r09_photo_critic` read and supported the
exact wording after recording its R04 verdict. The actual A06 calibration had
consumed overhead-face bounds and the terminal underside point later used to
challenge the middle-floor revision. Its recorded pose agrees exactly with the
current capture. Evidence and wording review are retained in
`projects/dai2-daiban/studies/multiview-restart/reviews/e-aperture-r04-fidelity/`.
The source boundary remains real and the fixed-pose regression remains material;
this clarification neither accepts the proposed floor height nor dismisses the
photograph. No runtime behavior or wording-only test was added.


## Complete projected-feature follow-up

Added a short whole-feature check to the camera-control guidance. A successful
fit and reserved samples clustered on one arc cannot certify the complete circle
or justify a building repair inferred elsewhere in the image. In the M15 inside
view, local samples passed while the projected crown/right arc visibly crossed
radial masonry outside the actual opening. The inferred guard-position error
therefore remains a camera/geometry question, not a selected offset wall.

Independent source reviewer `/root/model_r09_photo_critic` read and accepted the
exact new four lines without correction after freezing its R05 source verdict.
It explicitly notes that qualitative whole-feature disagreement is enough to
retain the camera hold; the guidance does not demand inventing precise controls
on ambiguous portions of the rim. The retained adjudication is
`projects/dai2-daiban/studies/multiview-restart/reviews/e-aperture-r05-fidelity/M15-CAMERA-ADJUDICATION.md`.
No runtime behavior changed or wording-only tests were added.

## Active geometry and actual retirement follow-up

The conformance workflow now requires one active geometric definition per assembly,
with superseded snapshots isolated as non-emittable history. Retirements must
resolve to actual child meshes/closures, and retained aliases must not recreate the
obsolete contribution. R07 provided both concrete counterexamples: an old pane was
retained under GLAZING while an alias-free INFILL record was retired, and an old
middle-stair aggregate disagreed with the repaired cells. The independent upper-family
verification reviewer read the exact four-line addition and confirmed it addresses
these defects without adding unnecessary test obligations. See
`upper-family-preimplementation-verification-review.md` and the frozen R07
construction/circulation reviews. No runtime behavior or wording-only tests changed.

## Full-height usable-width follow-up

The schematic workflow now explicitly checks passage width through occupied height, including upper-level wall or stair intrusions at shoulder/head height. Stacked sheets and sections must distinguish the body envelope from a successful centre route. In R12, the retained HOME wall extends70mm beyond the lower return at a short apron band; the tested centre route passes, but a body near the floor-plan western limit collides at its upper end. The separate circulation reviewer read the exact four-line addition and confirmed that it accurately reflects this finding. Its final evidence belongs in `projects/dai2-daiban/studies/multiview-restart/reviews/model-r12-circulation/`. No runtime behavior or wording-only test changed.

## Retained physical contribution follow-up

The R13 independent implementation review exercised the existing retained/rebuilt/retired rule on actual saved geometry. Rebuilding a shared rear host caused a retained side wall to recover180mm of its old nominal box, covering part of a newly drawn arch. A matching logical owner name and unchanged nominal dimensions did not preserve its previously partitioned physical contribution. The corrected build retains the actual old wall residual and restores the intended opening; independent complete-face checks confirm that bounded repair. This example is covered by the existing plan-to-model conformance instructions, so no additional skill rule was added. Full construction, source and circulation acceptance remain separate and open. See `upper-r13-implementation-review.md`.
