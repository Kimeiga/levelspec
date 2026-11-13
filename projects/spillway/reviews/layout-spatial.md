# Spillway — independent layout spatial/visibility review

Current status: **accepted for layout stage, R02**. Rechecked 2026-11-08. The original R01 findings and evidence remain below; acceptance closes only LS-01/02, not the deferred actual-blockout checks.

R01 review status was **changes required**. The reviewer was independent of the author and first assessed brief/artifacts before seeing author tactical rationale or another verdict.

Evidence: `brief.md`, `inventory.md`, `layout.svg`, and visual inspection of `generated/spillway/layout-r01/plan.png`. No compiled AML, movement run or actual eye-view captures existed at this review. Statements below are drawing observations or hypotheses, not confirmed gameplay.

## Findings requiring resolution before production

1. **LS-01 — A-02 intrudes into S-02.** A-02 occupies X24..27/Y78..80 at Z0..1.1; S-02 occupies X26..30/Y66..82 and descends north from Z4 to0. Their footprints overlap by1 ×2 m. The nominal stair top within this overlap descends from roughly1.0 to0.5 m, so the crate protrudes across the left stair edge, introduces a lateral snag/ledge and alters its nominal4 m width. This is a supported plan conflict, not merely an unknown sightline. Move A-02 west (for example X22..25) while retaining its ID, or deliberately integrate it with the stair and specify the resulting route/cover assembly. Reinspect the changed stair-side and A-short exposure.
2. **LS-02 — unspecified landing and flight guards prevent a complete visibility handoff.** U-W and the bridge's main north/south screens have dimensions, but the remaining west-landing perimeter guards and flight/ramp enclosures are only promised for later. At Z4, whether these are1.1 m guards or2.4 m screens determines views over the3 m ground walls into forecourt/site/approaches; their endpoints also determine whether an entry is obstructed. Label their extents/heights and explicitly leave S-01, S-02 and bridge/R-01 interfaces open in the drawing/inventory before modeling. This need not redesign accepted ground routes.

## Relationships inferred at the layout stage

Subsequent compiled review corrected the A-short/direct threat-direction hypothesis below: the filled S-02 body blocks a direct ground opening into A. The accepted R04 design instead uses a22.461 m A-gallery/rear detour around its north toe. See `blockout-spatial.md`, BS-01. The original prediction is retained here as stage-specific evidence, not a current verified relationship.

- The upper bridge and lower mid cross at different levels without a junction. Nominal underside Z3.7 leaves1.7 m above the provisional2 m body. Floor thickness, underside attachments and actual support remain blockout checks.
- The corrected R-01 ends at X86, leaving a4 m nominal east-long landing to the X90 boundary. Its footprint includes a ground under-ramp bay; determine actual accessible versus inaccessible under-ramp volume in3D rather than advertising a second route through the low underside.
- A-gate-W/E create a6 m nominal entry between X14..20; nominal centerline-wall offsets and actual guards still need compilation. A-short provides another threat direction through X30/Y72..78. A-01 can therefore be useful against a south entry without concealing its user from all east entries. No balanced-duel claim follows.
- E-01 forces east-long movement to its eastern side above Y34; the lower-mid elbow can pass south of it at Y30..34. Neither opening is closed in the plan. Following-player visibility around this dogleg is a blockout/engine question.
- M-01 blocks the western half of mid at Y46..52, leaving an8 m nominal east passage. U-V's predicted ray at X49..50 runs east of M-01; the latter does not automatically conceal this approach from the upper bay.
- CT-01 leaves a3 m nominal east-side passage to X52. That is a deliberate choke candidate, not a population-throughput pass; inspect sidewall erosion and support views.

## Paired-view and behavior probes for the blockout

- **U-V versus lower mid:** use standing-eye poses around(49,59,5.6) and(50,40,1.6), then a follower and a northern underpass approach. The1 m parapet top isZ5, below the provisional upper eye; expect partial occupant exposure from south and screening from north by U-N. Inspect both directions and foot/muzzle/body geometry separately. A low inspection camera is not crouch simulation.
- **A entry and stair-side:** inspect gate entry toward both A-01 sides, A-short entry toward its reverse face, and S-02 down/up across the repaired A-02 region. Include a second player's possible trade view. Do not infer trade timing from a connected plan.
- **B approaches:** inspect B-01 from east-long, B-short and rear-gallery approaches; inspect whether B-02 conceals a committed close holder or produces a thin accidental gap at the east wall. R-01 occupants must also be viewed from below/east.
- **Stair/ramp interfaces:** run unchanged standing body over every landing, both stairs and ramp; verify head/shoulder clearance beside boundaries, guards and sloping underside. Native navigation success alone is not continuous collision proof.
- **Assembly:** compose overlapping bridge/west-landing slabs so their2 m plan overlap does not survive as duplicate coplanar walking faces. Inspect bridge support/bearing and all walls underneath it; do not leave unexplained floating pieces or introduce unlabeled support obstacles during3D construction.

Target population is5v5;2v2 and1v2 post-plant are relevant stress cases. No25v5 acceptance is implied. No smoke, penetration, grenade, audio, actual CS2 clock, human strategy, balance or multiplayer movement tests have been performed. After LS-01/02 are resolved, this layout can advance while the specifically listed height/view/movement checks remain open for actual blockout review.

## R02 local recheck and disposition

Independently inspected updated `brief.md`, `inventory.md` and `generated/spillway/layout-r02/plan.png` first, then read `design.md`. No other reviewer's conclusions were used to reach this verdict. Ground topology and unchanged object findings are reused.

- **LS-01 closed on R02 drawing.** A-02 moved to X21..24/Y78..80; S-02 remains X26..30. The2 m nominal separation removes the original footprint overlap and unexpected stair intrusion. Its new position remains a low-cover hypothesis and must be viewed from gate, short, rear and stair once compiled.
- **LS-02 closed on R02 drawing/inventory.** U-LN1/LN2/LNE/LS1/LS2 now have explicit footprints and2.4 m heights above Z4. They leave the S-02 north gap X26..30 and S-01 south gap X28..32 open. U-N now starts at X36, avoiding an internal screen across the landing-to-bridge interface. Flight/ramp guards have stable IDs, .25 m thickness inside the declared widths and1.1 m height above their guide; ends remain open. Nominal clear widths are therefore3.5 m on stairs and5.5 m on the ramp before physical compilation. These are dimensional observations, not team throughput validation.

The full-height landing screens reduce the previously unspecified above-wall viewing opportunities. Low guards along descending flights still permit views over adjacent walls/cover at some heights; the design ledger acknowledges those as traversal boundaries rather than visibility protection. That intentional distinction is acceptable at layout stage. The claim that upper control is answerable remains a hypothesis requiring paired-view and timing/playtest evidence.

Production blockout can proceed. The earlier blockout probes remain open, including both directions across U-V, actual stair/ramp/landing body clearance, accessible under-ramp volume, slab composition/supports, and consequences of low flight guards. Layout acceptance is not competitive or3D acceptance.
