# Veilcrest r02 — independent layout spatial / construction review

**Verdict: changes required at the foyer interface; otherwise accepted to proceed to a compiled blockout with the checks below open.** This is layout acceptance, not a physical route, collision, competitive-balance or visibility measurement pass.

Reviewed the actual `reviews/evidence/layout-r02.png`, SVG and JSON before reading author rationale in `design.md`; then read `brief.md` and `inventory.md`. Scope includes macro organization, body-scale circulation, construction interfaces and important visibility relationships. No compiled AML or 3D evidence existed at this review.

The composition is coherent: lower arrival feeds a long west contour climb, a shorter interior ascent and a diagonal eastern cut. The upper salon and lower vault occupy different sides of a solid library core. The rear court joins the sites without granting a frontal view of the hall. This is a plausible hillside estate with shared thresholds rather than detached node rooms. There is no traverse across the central core and no parallel-route bridge.

## Required decision before production

**L-S1 — HALL / FOYER side bypass.** `FOYER` overlaps `HALL` at X48–60 / Y40–44. `HALL-FOYER` is drawn at Y44 from X48 to X60, but its west end does not meet another boundary. A player can leave the foyer westward at (48,42), continue into the hall's X38–48 southern bay and turn north around the wall end. This bypasses the stated six-meter foyer arch. The intent describes a threshold governing hall entry, so the actual space should either close that west bypass (coordinating floor and wall changes) or explicitly retain it as a second entry and reassess the hearth/entry views. The same-level overlapping slab footprints should compose into one physical union in AML or be partitioned; independent coincident floor faces are not an acceptable implementation. This does not demand a macro redesign.

**L-S2 — claimed T-pocket occlusion is unproven and likely false.** The plan admits a ray from a hall observer approximately (56,45,4.86) to the authored T spawn (58,11,1.86). At the foyer arch Y44 it is around X56.06/Z4.77; at the stair crest Y34 it is around X56.65/Z3.89, above the +3 floor. The hearth and ROAD-VAN lie west/east of this line. This is a geometric prediction, not a compiled ray test, and a CT would first have to win the hall; it is not spawn-to-spawn LOS. Retaining a late-round hall-to-road line can be an intentional tradeoff, but `design.md` should not claim the offset thresholds/van prevent it. Either repair the line if a protected pocket is intended, or document it and include opposing compiled views with spawn offsets. Verify the arch shape itself in 3D.

## Accepted layout relationships

- GARDEN-STAIR is 8 m wide, FRONT-STAIR 6 m, SERVICE-STAIR 6 m and VAULT-STAIR 8 m. Nominal 0.15 m risers are below the 0.25 m step and the 0.4–0.6 m tread runs provide a credible ordinary walking route. There are no required jumps, crouch-only passages or unsupported XY crossings.
- The garden staircase meets a broad +3 garden landing; the front flight reaches a broad foyer; pantry and vault both have room for a follower beside the leading player. Actual centerline end points and slab thickness must be compiled and walked rather than inferred from parameters.
- A's two southern entries are separated by the rock spine and intervening wall segment. The sculpture can plausibly interrupt a northern anchor's simultaneous observation of both entries; low cover leaves side exposure. B's west/south entries are divided by the cistern, while the north stair supplies a height-specific third interface.
- The core (+13) and spine (+11) exceed the highest routine eye (+4.86) and should prevent a panoramic court/hall or garden/hall angle. Any architectural windows added later must preserve these intended solid occluders.
- Exterior edges are explicit boundaries. Garden parapet top +4.25 is only 1.25 m above its +3 floor: it offers low cover and scenic visibility, while the unchanged single-body inspection jump should not establish an automatic bypass. Target-engine boosts remain an open mechanic.

## Required compiled checks

1. Walk all four flights in both directions with the unchanged capsule, including the garden lower-road overlap near Y28–29.78, both stair ends, arch shoulders and the pantry-to-descending-flight turn. Inspect support below and headroom above, not only navigation connectivity.
2. Confirm every drawn traversable arch survives composed walls and outer edges. At B, the Y68 arch must meet the descending north flight without a lintel/riser obstruction; at B west, the low end of SERVICE-STAIR must have full standing headroom through the arch.
3. Inspect the complete outer-wall / stair-cheek unions. The plan often draws both on the same edge, and different heights are intentional; AML must compose them cleanly rather than export duplicate exposed faces.
4. Inspect upper floor undersides, wall bases and library/spine joins from outside as well as a roofless overview. Scenic mountain terrain is not yet modeled, so embedding, nonplayable boundaries and the visual mountain setting remain unverified.
5. Capture opposing standing/crouching views of A-CREDENZA, A-PIANO, GARDEN-BENCH, B-CHEST and B-FILTER; include ascending/descending intermediate stair positions, the follower, and both plant directions. In particular, +3 vault-stair observers can see over level +0 low cover; the author has correctly retained this risk for testing.
6. Recheck the HALL / FOYER decision and the hall-to-T-pocket line after any repair. The dedicated section visibility reviewer covers a finer entrance/hold inventory; this review does not replace that pass.

No play was observed. Multiplayer body blocking, weapons, penetration, utility, acoustics, objective implementation and competitive balance are outside this layout evidence.

## Return review — r03

**Accepted for production blockout, with compiled checks still open.** Visually inspected `reviews/evidence/layout-r03.png` and current `layout.json` after the author repaired L-S1/L-S2. `HALL` now starts at Y44, sharing only that threshold with `FOYER`. `EDGE-30` closes X48 south of Y44 and `EDGE-31` closes the hall south edge west of X48. The former west bypass and coincident floor overlap are removed.

`FOYER-SCREEN` now occupies X51–62 / Y38–40, base +3 and top +6.4. Straight rays between the front flight X54–60 and the hall arch X51–57 cross its footprint at Y38–40 below its top; the previously predicted hall-to-spawn channel is interrupted in the layout. The 3 m west aisle and nominal 2 m east aisle leave plausible body clearance. The east aisle turns beside the diagonal foyer wall, so its actual inner wall thickness, capsule corner clearance and follower movement should be included in the compiled walk. No further layout correction is required from this scope.

Unchanged r02 accepted relationships remain applicable. Earlier r02 required findings are retained as evidence rather than erased. This return accepts the drawing-level repairs and schedules the actual physical/optical checks; it does not claim the unbuilt geometry has passed them.
