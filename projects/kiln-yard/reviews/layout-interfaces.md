# Kiln Yard L02 / L03 — independent interface layout review

Reviewed `brief.md`, `layout-data.json` revision L02 and the rendered `generated/kiln-yard/layout-L02.png` before author rationale or other review verdicts. Scope: W2/M2/A (P14/P05/P07), R4/B/D (P09/P11/P13), and A-press/B-filter/R4-return/D-store. Applied fps-map-review and level-authoring with the local combat/visibility guidance. This is an independent focused layout review, not either whole-map review or a blockout acceptance.

**Verdict: accept these interfaces for blockout, with the explicit checks below.** No supported layout defect requires moving these portals or machines before modeling. The clustered adjacencies create useful choices without extra remote corridors. Actual wall thickness, capsule motion, cover exposure and support/trading remain unverified. There is one small metadata issue to resolve when implementing plant areas.

## Polygon and portal consistency

The six scoped portal spans lie on matching shared polygon edges. Their measured widths agree with the inventory (rounding only). Boundary continuations are intentionally closed; proximity of spaces is not a connection. The full-height boundary contract must be implemented literally.

| Portal | Connection | Clear span | Remaining shared-edge shoulders |
| --- | --- | ---: | ---: |
| P05 | W2–A | 5.337 m | 2.668 / 5.337 m |
| P07 | M2–A | 5.532 m | 1.844 / 1.844 m |
| P14 | W2–M2 | 4.010 m | 5.013 / 5.013 m |
| P09 | R4–B | 5.000 m | 2.000 / 2.000 m |
| P11 | B–D | 6.519 m | 2.608 / 3.912 m |
| P13 | R4–D | 6.083 m | 2.433 / 3.650 m |

Widths are distances between drawing endpoints, not compiled collision clearance. Shoulder values measure along the shared edge; they are not protected body-pocket widths. A 0.6 m diameter player is compatible with these nominal spans, including paired passage, but multiplayer blocking is not simulated.

Preserve the closed W2–A segment (28,66)–(35,59), closed R4–B segment (65,57)–(72,65), and closed R4–D segment (66,72)–(72,65). Opening any of them would remove the intended corner/reveal order and create an extra attack or retake entrance. At (35,59), three rooms meet: terminate the W2/M2 wall cleanly into both site boundary segments. At (72,65), R4/B/D meet: avoid a seam hole between the two closed diagonal segments and the B–D boundary. The unfilled wedge between M2/A/R4 and K2 is outside circulation, not a shortcut. Nothing in the drawing requires it to be playable.

## W2, Saddle and A

P14 makes the W2/M2 adjacency consequential: a stalled W2 pair can move into Saddle without returning through the attacker spawn. Its 5 m wall shoulders permit preparation on either side rather than making this an open merger. L2 is about 5 m west of the shared wall, leaving room between it and P14; it does not pinch the transfer. A player crossing still needs information about Saddle/P06 and A-short/P07. This is a real territorial transfer, not a free bypass of the A defender.

P05 and P07 approach A from distinguishable directions. Their midpoint separation is about 17.4 m; the intervening closed diagonal wall prevents direct room-boundary leakage. P07's 1.844 m shoulders are enough to justify blockout but are the first jamb pockets to inspect after wall thickness is introduced. A-short-bench is approximately 3–4 m inside P07. An entrant can select either side of the bench; the bench should provide a crouched pause, not be described as standing protection at 1.25 m against a 1.674 m eye.

A-press (28–33,69–73), height 3.2 m, divides the site into meaningful west and east fights. The nearest southern wall vertex (28,66) is 3 m from its southwest corner; there is no plan-level single-body pinch. The press blocks a direct P07-center view toward the west plant-side position (27,73), while P05 can approach that side. A short player must move around a press end to support that fight. Conversely a main player cannot assume a trade on a defender using the press's east face. This split is useful if the coordination cost is intentional; it is not proof that two entrances automatically provide a trade.

Suggested 2v2/4+1 study: main entrant at (23,66), follower at (23,63); short player at (39,63); defenders around (27,74) and (34,74). Trace first appearance, which side of A-press hides the first contact, and whether the follower obtains the same target before the defender relocates. Then reverse ownership and retake through P12. L3 provides a west-side low refuge and the short bench provides an east-side one; the north side remains exposed to P12. This gives the press a bounded advantage rather than universal shelter.

## Inspection, B and service yard

P09 has 2 m shoulders and opens sideways into B, while P13 opens north into D. The closed diagonal R4–B wall means movement toward P13 does not quietly acquire a second B doorway. R4-return's west edge is about 3.21 m from the R4 western boundary, leaving a deliberate bypass on both sides rather than a mandatory squeeze. Its tall silhouette can change the reveal sequence between Saddle/P08 and P13. R4-bench adds a low pause east of that return; an occupant cannot infer full concealment from its 1.25 m height. Inspect the gap between the two objects for body snagging and simultaneous P09/P13 exposure.

B-filter (74–77,57–62) separates the P09 arrival from the eastern plant area and P11 arrival. The northern wall-to-filter clearance is at least about 2.61 m in plan. That is a plausible passing/clearing shoulder, not an accidental tiny slit. The east side is much broader. An Inspection entrant must choose south or north of the filter to reveal the plant-side opponent; a Wash entrant has a more direct eastern view. P09 therefore supplies a second angle without giving a stationary entrant ownership of the whole site.

Suggested paired study: Inspection lead/follower around (66,53)/(63,53), Wash lead around (77,46), and site defender around (79,59). From P09 the filter can interrupt an immediate plant trade, while the Wash player can pressure the filter's eastern side. On a lost B site, D entrants near (79,65) see a different filter face. In a 3v5 retake, the D/R4 pair must clear the northern shoulder and coordinate the P09 swing; the drawing does not establish that these two fronts are simultaneously available or safe.

D-store at (56–62,80–83), height 4 m, leaves broad routes to both sites and P13. It breaks the direct central spawn-to-P13 line while allowing lateral departure. Its west/east bypasses are legible in plan and do not consume the entire shared service yard. A defender using one side cannot assume visibility of both site portals. After site loss, study the cost of moving around the store while an attacker threatens P13; broad open floor is maneuvering room, not verified protected rotation. This question belongs in the whole-map timing/visibility study as well.

## Supported implementation follow-up

Both circular plant markers intersect tall machinery: A's center (27,73), radius 2.5 m overlaps A-press beginning at x=28; B's center (79,58), radius 2.5 m overlaps B-filter ending at x=77. This does not obstruct the remaining playable plant-side floor and need not move the machines. If these circles become triggers or sampling regions, clip admissible plant positions to free supported floor, or reshape the plant metadata. If they remain illustrative markers only, record that explicitly. Do not count area inside a machine as usable planting room.

## Blockout gate questions

1. Do shared walls produce one continuous solid seam, with exactly the listed movement openings and 3 m head clearance? Check both triple junctions, the K2-adjacent wedge, jamb ends and floor support.
2. With the unchanged 0.3 m-radius / 1.8 m body, can a player traverse both sides of each machine and each portal in both directions, including the B-filter north shoulder and R4-return west shoulder? Inspect floor continuity and real wall thickness.
3. From opposing and follower viewpoints, does A-press preserve differentiated main/short fights without creating an untradeable plant ambush? Test P05/P07/P12 with standing and crouched bodies.
4. Does B-filter's northern shoulder offer readable clearance and a meaningful response to P09/P10/P11? Check side/feet exposure and both site ownership states.
5. Does R4-return actually sequence P08/P13 reveals, or can offset positions see all relevant entries around it? Check P09 as an additional threat, not only the two intended ends.
6. Can the D-store bypasses support rotations when P13 or one site is lost? Include offset spawn locations and 2v2/1v2 post-plant pressure; a center ray is insufficient.

These are drawing hypotheses and analytic XY measurements only. No compiled geometry, continuous reachability, actual multiplayer trades, weapon protection, utility performance, plant/defuse interaction or competitive balance has been accepted.

## L03 focused recheck

Inspected `generated/kiln-yard/layout-L03.png` and the updated portal inventory after the first independent L02 inspection. Scoped P05/P07/P09/P11/P13/P14 and the four reviewed machines retain their coordinates and heights. The Forecourt repair changes the approach into Saddle (P06 narrows to x39–43), so the P14 transfer study must now include the west-biased P06 arrival rather than assuming a centered 10 m opening. This is a visibility/support question for blockout; it does not introduce a portal misalignment or invalidate the local shoulder measurements. P06 remains on the shared M1–M2 y=45 edge. The focused verdict remains accept for blockout, subject to the checks above. The whole-map reviewer owns confirmation of the long-view repair.

## L04 plant-area correction

Inspected the L04 data and `generated/kiln-yard/layout-L04.png`. The circles are replaced by rectangles: A x24.8–27.5/y70–76 and B x78–83/y56.5–62. Both rectangles are wholly on their site floor and do not overlap machinery or low cover. A has 0.5 m separation from A-press and 0.8 m from L3; B has 1 m separation from B-filter and 1 m from L8. These exceed the provisional 0.3 m body radius even at the nearest zone boundary, before any rendering/collision inflation. The plant metadata overlap finding is resolved at layout stage. The focused layout verdict remains accepted for blockout; all actual 3D and gameplay limitations remain.
