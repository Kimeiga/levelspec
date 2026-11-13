# L04 developed interfaces — spatial authoring handoff

Status: **candidate for independent layout/visibility/strategy review; not production acceptance**. This document accompanies `layout-l04.svg`, `layout-l04-sections.svg` and the coordinate arrays in `draw-layout-l04.py`. Canonical AML remains untouched. All coordinates are metres, world Z up; reactor axis (0,4). Source radial sections are extracted from the frozen B04 `vessel-shell-01`'s actual first49 outer / next49 inner vertices.

## Changes resolved while drawing

- A has **four ground-fed upper arrivals, plus the crown connection**: south, east/port, rear, and the retained Cask gallery feeding the front platform. The earlier three-entry shorthand is retired. The fourth arrival needs strategic assessment; it is not hidden as a mere view.
- A's central freight opening is x[−32,−27], y[11,17]. Its east, rear and south landings stay outside it. The lower freight well is a different opening south of this, at −3.2.
- West crown stair now runs from (−33,25,+3.2) to (−26.5,25,+6.4), width2.8, run6.5. It meets the **west edge** of the top landing, avoiding overhead slab overlap. Its underside is **sloped .28**, preserving the rear-stair crossing. It is not filled.
- Rear A stair is (−29,28,0) → (−29,20,+3.2), width2.8. The upper landing is x[−30.5,−27.5], y[17,20]. West crown lower landing x[−36,−33], y[23.5,26.5] meets the mezzanine's north edge without placing normal upper circulation under the low portion of the flight.
- East crown bridge ends at (24.8,10.8,+6.4). Its L-shaped landing is [(23.5,8.2),(27.9,8.2),(27.9,11),(25.1,11),(25.1,12.4),(23.5,12.4)]. It stays west of the flight for Y>11; there is no bridge slab across the ascending player's head.
- Lower vessel ramps refine the separate radial feasibility reservation: R7.1/−3.2 →R9.8/−2.8, width2.6. They meet bridge decks at R9.8. At the start face, both corners lie atR≈7.218, inside the lower floorR7.3: full usable width overlaps instead of touching at one tangent point. Western bridge ends R27.7, eastern R24.3; each has a further2m radial ramp back to −3.2 inside its wing room.
- The Cask low fixture moves to x[−41,−39], y[−10,−7], base0, height1.05. Its old footprint was inside a filled stair and is retired.

## Exact stair and landing inventory

All straight flights use maximum riser .16, .28 thickness, guards1.1 high/.12 thick, and filled undersides **except CW and CE-U**, which are sloped. These are authored run reservations; verify native tread count/end conventions and every body transition after compilation. Do not add a roof, landing or floor across a flight to make the plan appear connected.

| Drawing / source ID | Low end XYZ → high end XYZ | Width | Occupied arrival / consequence |
| --- | --- | ---: | --- |
| FW / `freight-lower-stair` | (−28,−5,−3.2) → (−28,3,0) | 2.8 | Ground landing x[−30,−26],y[3,6]. Can leave at ground or acquire A-E/A-S; there is no separate extra flight through A's central void. |
| A-S / `a-south-stair` | (−36,0,0) → (−36,8,3.2) | 2.8 | Landing x[−37.5,−34.5],y[8,11]. Front screen atY10.8 prompts a side choice. |
| A-E / `a-east-stair` | (−24.1,5,0) → (−24.1,13,3.2) | 2.8 | Landing x[−25.5,−22],y[13,16]. Side screen endsY16.5; the freight void makes crossing to plant territory a separate movement. |
| A-R / `a-rear-stair` | (−29,28,0) → (−29,20,3.2) | 2.8 | North landingY17..20, with a turn and screen. Crosses under CW nearY25. |
| CG / `cask-gallery-stair` | (−24,−14,0) → (−24,−6,3.2) | 2.8 | Turn x[−26,−22],y[−6,−3]; gallery x[−25,−22],y[−3,5] joins A's front platform. |
| B-W / `b-west-stair` | (24.5,15,−3.2) → (24.5,7,0) | 2.8 | Lower landing x[23,27.5],y[15,18]. Shares B's west work-room threshold with the lower reactor route. |
| B-T / `b-trench-descent` | (37.5,7,−3.2) → (37.5,2,−1.2) | 7 | Replaces the old north trench ascent. Bottom landing x[34,41],y[7,10] leads into the open loading area. |
| B-R / `b-rear-stair` | (38.5,20,−3.2) → (38.5,28,0) | 2.8 | Lower landing x[37,40],y[17.5,20], separated from plant by a vertical side screen. |
| CW / `crown-west-stair` | (−33,25,3.2) → (−26.5,25,6.4) | 2.8 | Lower landing x[−36,−33],y[23.5,26.5]; top x[−26.5,−23.5],sameY. Sloped underside .28. |
| CE-U / `crown-east-upper-stair` | (26.5,19,3.2) → (26.5,11,6.4) | 2.8 | L-shaped top landing above; mid landing x[24.5,29],y[19,22]. |
| CE-L / `crown-east-lower-stair` | (26.5,30,0) → (26.5,22,3.2) | 2.8 | Separate flight after a3m-deep mid landing. Its west ground bypass x22..25.1 remains clear. |

The lower crown/ground stair footprint must not become a hidden ground tunnel. Its filled underside occupies the strip; the west bypass is the intended ground route. The east +3.2 gallery is the polygon [(23,16.5),(25.1,16.5),(25.1,19),(29,19),(29,22),(23,22)], deliberately trimmed around CE-U.

## Slabs, openings and machine interfaces

Slabs are .30 unless noted. Lower vessel floors and bridges are .25. Exact polygons/holes are in `floors`; overlapping floor reservations are to be joined as one physical floor, with redundant internal faces removed. Boolean openings must actually remove slabs/foundation solids. Do not use navigation exclusions to manufacture the lower rooms.

- **Equator:** R4.1..8.8 at0, with actual hatch R4.1..6.2 /225°..310°. Guard the free outer hatch edge, leaving the top stair entry open. Top landing205°..225° at0; bottom landing305°..330° at−3.2.
- **Central stair:** centreR5.1, width1.8, 225°/0→305°/−3.2, 20×.16 rises. Approximately7.12m centre going / .293m inner tread going. Filled material stays withinR4.2..6.0. The lower outer bypass is reservedR6.2..7.3; after the outer guard's inner faceR7.18, actual nominal clear width is .98m. Body centreR6.7 has width.70 and height1.8. This is a single-file interface, not a guaranteed side-by-side trade lane. No narrowing of the player is permitted.
- **Lower interior:** main arc210°..350°, R4.1..7.3, with local port fans198°..222° and338°..362° so a2.6m radial crossing does not join only half its width. Trim fan/bridge floor edges at the ramp boundaries, rather than leaving a second walking plane beneath the transitions.
- **LW:** 210° bridge R9.8..27.7 at−2.8, then ramp toR29.7 at−3.2. End approximately(−25.72,−10.85,−3.2), inside freight-well floor x[−33,−23],y[−13,3].
- **LE:** 350° bridge R9.8..24.3 at−2.8, then ramp toR26.3 at−3.2. End approximately(25.90,−.57,−3.2), inside east service room x[22,29],y[−2,5]. A3m neck x[26,29],y[5,12] leads to work room x[23,30],y[11,18].
- **Lower ports:** cut the full2.6m work opening and rising vessel transition through shell/cryostat/bioshield. Outer PF remains atZ−3.8..−3.25; bridge underside−3.05 is .20 above it. These ports use uninstalled TF sectors. No magnet envelope is cut or resized. Actual capsule/shoulder clearance remains a compiled gate.
- **Temporary supports:** retire obstructing equatorial temporary posts atR6.5. Shallow beams can occupy Z−.8..−.3, leaving2.4m above the lower floor. Preserve real magnet/gravity supports. Crown supports bear outside the bioshield, avoid the ports and stay outside clear floor widths; their final columns/brackets require architectural review.
- **Freight ground hatch:** polygon [(−32,−8),(−28.5,−8),(−28.5,−5),(−26.6,−5),(−26.6,3),(−29.4,3),(−29.4,0),(−32,0)]. It combines the freight void and rising lower stair opening into one coherent hole. BetweenY−8 and−6, the narrower southern opening leaves3.1m gross between its eastern edgeX−28.5 and the filled gallery stair edgeX−25.4, retaining a genuine ground bypass on that side. The lower room remains full-size.
- **A slab:** x[−40,−22],y[1.5,24], top3.2, central void x[−32,−27],y[11,17]. Separate stair openings: A-S x[−37.6,−34.4],y[1.5,8]; A-E x[−25.6,−22],y[5,13]; A-R x[−30.6,−27.4],y[20,24]. The crown crossing removes the thin northern overlap x[−33,−25],y[23.6,24]. A-R's upper landing sits south of its opening.
- **B ground:** installation void x[28,40],y[9,23], with a retained plant shelf x[32,40],y[14,22] and ground crossing x[26,33],y[18,21]. The shelf is real floor0/.30 thickness; its underside−.30 provides2.90m over the lower room. B-W slot x[23.1,25.9],y[7,15], B-R slot x[37.1,39.9],y[20,28], and trench transition x[34,41],y[2,9] remove ground slab where the flights pass. Show the part of the lower room beneath the shelf separately from the adjacent open loading void.

## Walls, portals and roof ownership

The expanded hall envelope is x±22, y−20..27, roof16. Old hall walls atx±18 are retired. Portal dimensions below are **clear openings**, with floor/landing/guard endpoints coordinated around them. They are not merely painted door symbols.

| Host | Opening ownership / clear reservation |
| --- | --- |
| Hall west, X−22 | Equatorial portY1.5..6.5,Z0..3.2. Lower210° portY−10.35..−7.05,Z−3.05..−.4. Crown movement portalY9.4..12.5,Z6.4..9.1. Separate Cask-gallery support windowY0..4,Z4.3..6.2. |
| Hall east, X22 | Equatorial portY2..7,Z0..3.2. Lower350° portY−1.35..1.6,Z−3.05..−.4. Crown movement portalY9.3..12.4,Z6.4..9.1. |
| Hall north, Y27 | Solid at ground acrossX−22..22: no direct defender spawn → reactor ground port. Crown remains behind the hall enclosure. |
| Hall south / Receiving, Y−20 | Ground openingsX−10..−4 andX−2..2, with opaque lintel atZ2.8. Complete wall above them to the hall enclosure; Receiving roof4.8 closes the lower exterior volume. |
| Cleanlock/Cask threshold,Y−14 | Selected freight shield returnX−43..−30,Y−14.2..−13.8,Z0..5.8. The remainingX−30..−22 mouth is wide and open; no low lintel crosses it. This supersedes the earlier two-opening threshold. No additionalY8 return is adopted. |
| B work-room threshold | Distinct lower west approach turns into the loading crossing before the sheltered plant room. Screen heights/positions below are mandatory parts of this spatial hypothesis; do not reduce it to an unbounded basin. |

Roof ownership: west freight x[−43,−22],y[−14,30] at10.4; Cleanlock y[−31,−14] at7.2; Receiving4.8; Cooling/bus4.8; Power x[22,43],y[7,25] at7.2 excluding the transfer tower; east tower x[22,30],y[8,32] at10.4; central Rear Services x[−22,22],y[27,34] at4.8; Control x[22,43],y[25,34] at4.8 excluding the tower. All roof slabs .24. Every step gets an actual wall/clerestory from the lower roof plane to the taller roof, with deliberate movement or view openings only. No low roof remains through a newly occupied +6.4 transfer.

## Objective cover and bounded views

| ID | Base / height | Footprint and intended role |
| --- | --- | --- |
| `a-south-arrival-screen` |3.2 /2.2|x[−38,−34.8],y10.8..11.0. First landing offers a side choice before the plant area.|
| `a-east-arrival-screen` |3.2 /2.4|x−26.8..−26.6,y13..16.5. Divides the east arrival from direct west-side influence.|
| `a-rear-arrival-screen` |3.2 /2.4|x−30.5..−27.5,y17.3..17.5. Rear arrival turns; it cannot inherit protected direct plant control.|
| `a-freight-guide-mast` |0 /6.0|x−32.5..−31.5,y13..15, spans the freight opening's edge. Its +3.2-height portion occludes the centre of the across-void view while leaving different local views.|
| `a-cask-tooling` |3.2 /2.6|x−35.5..−32,y15..20. Separates plant(−34,14) from the northern service/crown returns.|
| `b-west-arrival-screen` |−3.2 /2.4|x29..29.25,y12..15. An arriving lower player sees/clears loading before plant territory.|
| `b-south-arrival-screen` |−3.2 /2.4|x34.5..38.5,y12.5..12.75. Breaks the direct trench descent → plant line.|
| `b-rear-arrival-screen` |−3.2 /2.6|x36.8..37.05,y18..22. Separates the rear stair bottom from plant; south corner is the commitment.|
| `b-plant-partition` |−3.2 /2.9|x32..33,y15..19, meets shelf underside−.3. Avoid a tiny overhead firing slit; lower room stays accessible around the partition.|
| `b-rim-crossing-screen` |0 /2.2|x29.5..32.3,y20.7..20.9. Local ground crossing cover, not a wall around the whole basin.|
| `crown-west-blind-screen` |6.4 /2.3|x−26.6..−26.4,y9.4..18. Separates high service-walk travel from unqualified A plant oversight.|
| crown work-room tooling |6.4 /2.3|Two rooms centred aroundangles125°/55°, radial17.8..23.2,tangential±3m. W equipment occupies outer radial20.4..23.2,tangent±1.1; E occupies inner17.8..20.6,tangent±1.1. Passing sides differ. Actual long chords and support windows require ray review.|

All unconnected occupied edges receive opaque1.1m/.12 parapets except declared movement openings. These support standing/crouch differences; they are not certified ballistic cover. Ground and upper followers must be inspected at every stair landing, especially the central curve and crown/rear crossing.

The front A guard is explicit: atY1.5, x[−34.4,−25], base3.2/top4.3, with a separate segmentx[−40,−37.6]. The south stair opening and gallery movement gap remain open. The reported old-geometry ray T(−17,−35,1.684)→A(−34,14,4.884) intersects the new front guard nearX−29.66,Z4.068. This is a drawing-level interception, not a compiled visibility pass. Include high A, crown, gallery and room-edge targets plus all spawn offsets in the revised optics; B04's ground-only targets are insufficient.

## Verification boundaries and retired geometry

The eastern ground stripX41..43 remains an explicit exposed Cooling→Control bypass, with a potential~60m line atX42. It trades exposure for rear pressure and does not look into the roofed lower plant. Independent strategy review must assess that choice and its manpower cost; no unnamed occlusion is assumed. The selected western shielding return breaks the prior Cleanlock→rear line atY−14 while retaining a long northern ground segment after reacquisition.

The central stair is a selected feasibility experiment. The west crown/rear stair crossing has guide-based minimum headroom2.44m over its footprint overlap; allow one .16m riser of conservatism, giving2.28m for the1.8m body. These numeric reservations do not replace native compiled body sweeps/placements, tread/landing inspection or follower views.

Retire B04's old hall side walls, old +3.2 gallery footprint/window atX−18, old gallery-out-stair, old B north ramp, old ground objective markers/covers where they conflict with the new voids, and superseded roof/step faces. Preserve the reactor's dimensions and genuine machine supports. The rear switchboard isX6..9,Y28..32,Z0..3.2, clear of all defender start bodies. D starts centre(0,31), five X offsets−4,−2,0,2,4. T centre(−14,−35), five X positions−18..−10. All opening/contact and rotation measurements are fresh L04 work.

The independent gate must assess the four A arrivals, B's shelf/void relation, the B-biased lower stair exit, crown acquisition/retake costs and whether 5v5 players can meaningfully cover the choices. No promise of final balance, target-engine crouch movement, sound, weapon penetration or utility behavior is made by this plan.

The S2 drawing is an X/Z projection of the whole overlapping footprint, not a claim that the rear stair is flat atY25. Its horizontal lower strip is the conservative highest rear-tread guide bound1.76 across that footprint; the nominal guide atY25 is1.20. The additional.16 riser allowance is retained.
