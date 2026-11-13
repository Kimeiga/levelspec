# Spillway R06 — independent spatial / height-aware layout review

**Current status: changes required.** Reviewed the neutral proposed drawing, dimensional handoff and existing geometry relationships before production R06 modeling. Applied fps-map-review and level-authoring. Source remains R05 at this gate. This is a layout assessment, not an actual R06 geometry or gameplay pass.

Artifacts: `audits/layout-r06-proposal.svg`, `audits/proposal-r06.md`, and visual inspection of `generated/spillway/proposal-r06/plan.png`.

## Consequential conflict requiring repair

**R06-LS-01 — north gallery overlaps retained tall building BLD-5-0.** The new north span is X43..64/Y69..75 and the east leg is X61..67/Y61..75. The retained BLD-5-0 footprint includes X56..70/Y74..78 and reaches Z8. Therefore the northern1 m of the span at X56..64 and the eastern leg at X61..67 is occupied by a tall mass. The orange proposed gallery overlay hides this overlap in plan; it does not make the physical relationship valid. The occupied gallery cannot simultaneously be5.6 m clear there.

Explicitly carve/trim that building out of the gallery and its guards, or revise the floor/guards/low cover consistently. For example, a mass edge at Y75.4 along the affected X range would leave the intended gallery and guard band clear; the exact repair belongs to the author and needs a local drawing recheck. Do not rely on the compiler to silently clip a building through a walking floor.

## Handoff clarifications

The proposed plans omit retained S-01/S-02 stair flights and R-01 ramp footprints/IDs. Overlay or clearly annotate those retained access interfaces so the new west-landing and east-stub joins can be reviewed without inferring floating endpoints. Their established footprints are S-01 X28..32/Y42..58; S-02 X26..30/Y66..82; R-01 X70..86/Y58..64. The R-01 top remains X70/Z4. No redesign of these retained flights is requested.

The1.8 m deep gallery low covers leave **3.8 m**, rather than the stated“4m+,” nominal principal bypass:5.6 m inner gallery width minus1.8 m cover depth. Correct the dimension claim. This does not itself require moving the cover.

## Relationships supported by the plan

- **Structural dogleg:** the five-rectangle union is connected. West/east legs and the northern span overlap in real plan area; their joints are not point contacts. Guards must follow the complete union perimeter, leaving the retained stair/ramp access edges open; guarding each rectangle separately would incorrectly close internal joins.
- **Tall masses:** splitting BLD-2-1 into X56..61 and X67..70 leaves the6 m eastern leg slot. Tall masses exceed the provisional Z5.6 standing eye on the gallery and can prevent over-wall regional views. The BLD-5 conflict above must be resolved before that claim is accepted throughout the route.
- **Supports:** P-01 remains under the west stub. The relocated P-02 lies under the east leg. P-03/P-04 are centered under the two northern bends; the overlapping leg/span floor union provides actual slab above their radius. At ground level the new round supports enter the A/mid and B-short circulation regions, so route, shoulder and paired-view checks must include them.
- **Low gallery cover:** U-C01/U-C02/U-C03 do not overlap each other or the proposed ordinary route. Their1.25 m heights permit a provisional low eye1.05 m above the deck to sit below the top while standing eye1.6 m remains above. Inspect occupied sides and opposite views; this is not verified engine crouching or weapon exposure.
- **D-01:** the south gap at Y69/X47..50 opens onto a3 m wide edge. The intended landing(48.5,67.5,0) lies outside the gallery footprint, clear of M-02, the round supports and M-L02 in plan. The ordinary gallery route still reaches both ends. The4 m drop is deliberate and unsupported by the inspection walker; falling, damage, body clearance across the slab edge and one-way behavior require target-engine verification. No off-mesh link or teleport should substitute for that missing test.
- **T courtyard:** BLD-T shapes a two-sided approach while T-01/T-04 form opposing7 m returns. The west gap beside T-01 and lateral space between returns remain positive. These7 m surfaces exceed elevated gallery eyes and are plausible spawn/deck view blockers, including from the drop gap. Test whole protected regions and shoulder diagonals after compilation. Because the new core occupies part of the formerly supported T protected-region footprint, reports must disclose eligible sample counts/common supported pairs; identical configuration bounds alone do not mean identical tested placements.
- **A dais:** the+.60 m slab and two6 m wide,2 m run/3-riser flights provide ordinary access. Three .20 m risers fit the provisional .25 m step. A-02's relocated footprint clears the north stair's end; A-L01 clears the south flight. A-01 top2.6 m stays above the new standing eye2.2 m; low ground cover changes value against elevated occupants and must not retain old flat-floor protection assumptions. Rehost the plant paint and marker, and remove only buried floor replaced by real support.
- **East saddle:** two4 m ramps rise/fall1.2 m (about16.7° nominal) with a2 m crest. The shifted E-L01 is flush at the west boundary and belongs at base Z1.2. E-02 intentionally occupies the eastern part of the descending ramp at Y48..50, leaving the western bypass. Include this intersecting wall/ramp assembly in actual support/head/shoulder review, rather than checking the ramp centerline alone.

## Required compiled review

1. Match the repaired layout to native compiled floor, guard, mass and support IDs; inspect actual volume from both directions and sections. Verify BLD-5 clearance and no surviving straight bridge/baffle/guard remnants.
2. Replay the unchanged standing body through every new join, A stair and east ramp/crest transition. Inspect support/clearance beyond the centerline. Retain a bounded upper route that cannot pass through a remote ground detour; report the measured changed distance before adjusting its assertion.
3. Scan both standing and low cameras at correct local feet elevations, including protected spawn regions, descending ramps/stairs, all gallery bends and D-01. Long-ray and100° findings remain contextual review flags; do not demand a universal absence of longer strategic shots.
4. Inspect actual first-appearance frontiers around bends and low-cover ends. Hiding an old entry portal does not prove a defender needs to turn around; account for objective relevance, feasible enemy routes, support and clock.
5. Capture opposing standing/low views at all gallery cover and the altered A/E cover relationships. No camera study is a crouch/weapon/body or multiplayer balance pass.

No source/model edits by this reviewer. The intended drop remains an engine-dependent hypothesis, not a required standing-walker route or a verified fall mechanic.
