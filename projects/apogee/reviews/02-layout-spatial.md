# Apogee L01 — independent spatial layout review

**Stage: accepted for modeling with the explicit crossing-wall construction contract below.** Compiled geometry, body traversal and actual visibility remain open blockout checks. This is an independent review of the author, not a playtest or balance verdict.

Inspected `brief.md`, `inventory.md`, `plan-data.json` and the actual `generated/apogee/layout-L01.png` rendering before `design.md` or other review verdicts. Scope: whole-map arrangement; focused Rim/Optics/A interfaces, all three height transfers and northern stacked crossing. Dedicated visibility and tactical reviewers provide their own gates.

## Arrangement and approaches

The 26 named spaces and 37 drawn distinct connections provide sufficient developed scope for this 5v5 brief, exceeding the provisional 18/24 authoring floors. The eastern equipment/cleanroom/data/lab suite shares boundaries and thresholds, while the western dome has a recognizable architectural volume and front/rear service rooms. Calibration offers choices during progression: up Optics, east through Cleanroom, or north through Transit. These are materially different journeys rather than detached rooms and connector tubes. The quieter Boot/Service and rear Operations sequences retain preparation space.

A is legible as a large octagonal telescope hall. A-TEL divides west/front, east plant and northern return views; A-L1/L2/L3 and A-S1 provide planned repositioning around it. Front entries P10/P11 are close enough to support one another, so they should be treated as a related front rather than independent flanks. The rear P13 and bridge P15 create the different contest directions. Optics' spectrometer is offset from both stair arrival and A threshold: a following player has room to choose a side rather than being required to stack in a tiny pocket. B's airlock and Data entrance reach different sides of B-CRYO; its east plant strip and Control/Decon exits remain distinct.

## Findings and disposition

1. **P14/P15 source mapping — corrected by author.** The first L01 JSON attached P14's line at x44/y94..99 to 8→12 and P15's line at x42/y78..82 to 9→10. The actual drawing clearly showed the opposite. Author confirms corrected mappings: P14=9→10 (A Control/Operations); P15=8→12 (Dome/Skybridge). Geometry did not move. Keep this corrected identity in AML/route assertions.

2. **Transit/Archive walls crossing the upper route — construction contract accepted, compiled verification required.** Lower enclosures nominally rise to Z6.4. Unmodified lower wall runs at x46 and x58 across y78..84 would pass through the bridge walking volume; the Archive north wall at y84 would also block the bridge→Upper Spine exit. The author explicitly commits to cap every lower Transit/Archive wall within the bridge footprint x42..68/y78..84 at the soffit Z3.65, retain the slab walking top Z4 with thickness0.35, and start separate bridge enclosures at Z4. P33 remains a lower doorway. This resolves the predicted obstruction without changing the accepted routes. Blockout review must check both crossing directions, lower P33, and the Upper Spine receiving threshold.

3. **Stair arrival/lower landing — accepted layout, body checks deferred.** Optics15 has a flat y32..36 receiving pocket before its flight y36..48 climbs0→4. P20 enters that flat pocket from Mid; P12 meets the top at Z4. Rim4 and CT25 have16m runs for4m rises; their endpoints meet drawn floors. These fit the intended movement on paper, but the compiler must retain actual tread support, receiving-floor headroom and shoulder clearance with the unchanged 0.30m-radius/2m standing body. No route is accepted merely because two edge lines meet.

## Blockout checks retained open

- Replay both directions through P06/P07, P20/P12 and P36/P17 with collision-aware movement, including first/last tread and receiving turn.
- Inspect bridge against the capped lower perimeter walls, P33 and Upper Spine; verify at least3.65m lower headroom and no phantom transfer at the crossing.
- Inspect paired A front/rear/bridge views around the actual telescope assembly; the schedule's6×6×5 envelope must bound any telescope barrel/support parts that affect play.
- Check low-cover body/eye positions at Rim, A front/west/rear, and the staggered bridge refuges. Their1.25m height predicts optical crouch refuge only from appropriate same-level directions; sides and elevated enemies can defeat it.
- Check support/passing widths after wall thickness and enclosure construction. Four-meter portals are nominal drawing spans, not measured final clearance.

No compiled evidence, continuous collision proof, target-engine utility/weapon behavior or multiplayer balance has been claimed at this stage.

## L03 local footprint clarification — accepted before modeling

Independently inspected the updated `plan-data.json` and rendered the current `layout.svg` to `generated/apogee/layout-L03-spatial-check.png`. Floor7 is now `[(26,48),(38,48),(38,50),(42,50),(42,60),(26,60)]` at Z4. The removed southeast4×2m patch previously overlapped the plan of lower Calibration14. The trim leaves P12 at x33..37/y48 fully on the stair receiving boundary, retains P09/P11, and leaves OP-S1/OP-L1 inside the upper footprint. It removes the accidental podium/overhead overlap without altering graph connectivity, stair direction or the accepted west-side journeys. **This local L03 repair is accepted for modeling.** Recheck the reentrant corner, upper wall/support join and physical stair receiving clearance in compiled geometry.

Current L03 portal identities supersede the earlier proposed mapping repair wording: the author retained the graph identities and corrected their coordinates instead. P14 is8→12 at x42/y78..82 (Dome/Skybridge); P15 is9→10 at x44/y94..99 (Control/Operations). These now agree between JSON and drawing.

## L04 local bridge/stair clearance proposal — accepted before modeling

Inspected `generated/apogee/layout-L04.png`, updated plan-data/inventory and the frozen R03 compiled bridge/underpass/CT-ascent views. **Accepted for this focused repair:** move SK-L1 to y78.18 and SK-L2 to y82.32, with original sizes, heights and IDs. These positions close the approximately0.32m unusable strips against the inner bridge guards; each occupied station retains about4.14m geometric cross-passage (before player erosion), with the obstacles staggered in X. The adjustment preserves the two refuges and approach choices without adding hiding pockets.

The northward S-CT path has its left enclosure on the west. Offset−0.30m moves that enclosure inward/east to guide x68.30, intended inner face x68.45. This is a reasonable focused exclusion of the shoulder position `[68.16,84.34,2.667]` below the neighboring upper slab, while retaining more than5m nominal flight width and unchanged receiving doors. The exact compiled enclosure convention and full edge/headroom result must be rechecked; acceptance of the drawing does not certify that result.

Adding declarations for the existing37portal connections and the Optics lower landing connection is consistent with the accepted physical layout. It does not establish new movement, waive existing route assertions or justify adding navigation seeds through a broken interface. Final compiled evidence must show those declarations agree with actual source geometry.

## L05 stair footprint refinement — accepted before modeling

The R04 result exposed a narrow tread strip outside the inward-shifted enclosure, so the enclosure-only L04 stair repair is superseded. Independently inspected `layout-L05.png`, plan-data and inventory: S-CT now occupies x68.30..74/y74..90, with centerX71.15, width5.70 and both enclosures at offset0 on the actual flight edges. P36/P17 remain x69..73 and are wholly within both receiving edges. SK-L1/L2 retain their accepted flush positions. **L05 is accepted for this local physical footprint repair.** It removes the leftover western tread geometry rather than suppressing its clearance samples, and keeps substantial flight/passing width. Final compiled side clearance, lower/upper receiving turns and bidirectional body traversal remain required evidence.

## L06 Intake visibility correction — accepted before modeling

Independently inspected `layout-L06.png`, exact plan-data and inventory. IT-S1 expands west to x42..46/y20..26, retaining height3.2, its ID and the existing P02/P05/P19 thresholds. Intake's surrounding x38..52 walls leave approximately3.82m west and5.82m east of the screen after a0.18m wall inset. The wider screen preserves the dogleg, room circulation and Boot fallback while addressing the dedicated reviewer's R05 offset Mid→T arrival exposure. **Accepted for this focused layout repair.** Full postrepair optical sampling and actual Intake views are required; the reported analytical closure of64previously visible pairs is a prediction, not final compiled acceptance. The scenic gondola panel's opaque-blue material clarification is outside playable circulation and adds no route.
