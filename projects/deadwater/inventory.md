# L05 layout / source contract

All coordinates are meters, right-handed Z-up. The SVG uses +Y north and shared physical thresholds. Sources use floor-<callout>, O01–O17 for thresholds, SW/SA/SB for stairs, and the obstacle names drawn in the SVG. Unoccupied voids between platform modules are sea. Outer edges have 1.25 m steel guards; internal bulkheads rise 4.60 m above the higher adjacent deck. Ceilings/canopies must leave ≥3.6 m standing headroom. Tall machinery and low cover have both optical and physical geometry. Steel labels do not establish bullet resistance or penetration.

| ID | Physical footprint / height | Role and access |
| --- | --- | --- |
| T-container | x18–28, y12–16, top3.2 | Shelters rear cargo spawn from freight; north and south pass around it. |
| W-winch | x7–10, y26–31, top2.6 | Interrupts sea-walk exit view; 4 m passing side. |
| V-filter | x22–30, y24–28, top3 | Divides O03 from O04; requires short clearing turn. |
| V-console | x24–31, y33–36, top1.2 | Crouched preparation / withdrawal toward O03; standing head exposed. |
| C-compressor | x51–56, y12–23, top3 | Breaks freight→B axis; follow-up can pass on east side with support. |
| P-manifold | x46–52, y35–38, top2.8 | Prevents Valve doorway seeing B plant; move north/south to expose different B slices. |
| P-cart | x52–55, y42–44, top1.2 | Local reset against B door; loses protection to side entry. |
| A-derrick | x14–20, y59–65, top5.2 (+2.8) | Opaque base of scenic tower; separates west entry from Short/CT sectors. Both flanks traversable. |
| A-toolhouse | x28–34, y67–71, top5.6 (+3.2) | CT local hold with south and north exits; loses south escape to Short control. |
| A-cable | x9–12, y68–70, top3.6 (+1.2) | Crouched reset west of derrick; exposed from its east side. |
| A-reel | x22–25, y54–56, top3.6 (+1.2) | West-entry / A alcove preparation; protected only against raised A views. |
| B-tank-1/2 | x69–73 /78–82, y34–43, opaque base2 / rounded crown4 | Separate south and west threats; sealed pedestals eliminate foot slits. 5 m between tanks. |
| B-pump | x61–64, y40–43, top1.2 | West-side plant preparation; loses protection to Compressor flank. |
| B-panel | x80–83, y47–49, top2.8 | Stair-foot fallback pocket; can be pressured from either south or west. |
| CT-screen | x50–52, y65–73.75, top5.6 (+3.2) | Shelters five CT spawn positions from A doorway; 2.10 m clear north /2.85 m clear south passages. |
| Q-lockers | x70–73, y66–71, top5.2 (+2.8) | Shelters rear stair view; east side route to SB remains ≥5 m. |

O01 T/W 6 m, O02 T/F 6 m, O03 W/V 6 m, O04 F/V 5 m, O05 F/C 6 m, O06 F/P 4 m, O07 V/P 6 m, O08 P/B 6 m, O09 C/B 5 m, O10 W/SW 6 m, O11 SW/A 6 m, O12 V/SA 7 m, O13 SA/A 6 m, O14 A/R 6 m, O15 R/Q 6 m, O16 B/SB 6 m, O17 SB/Q 6 m. All passages are walking thresholds, not windows; maximum intended overhead portal clearance 3.4 m. SW foot y38–40 / flight40–48 / head48–50; SA foot42–44 / flight44–52 / head52–58; SB foot52–54 / flight54–60 / head60–62. No under-stair route is intended; flanking infill and continuous side guards close the stair voids.

A plant square x21–27,y61–67 at+2.4; B x63–69,y41–47 at0. These are visual area cues plus objective markers, not implemented trigger volumes. Check target-engine plant bounds later. Static marker positions will sit clear of obstacles (A center x24,y64; B centerx66,y44). Five T spawn anchors occupy x10–14,y6–10; five CT spawn anchors x55–61,y71–74. Spawn areas are safe only at round start; after territory loss they are ordinary traversal space.

L03 repairs: CT-screen extends to y73.75 to occlude diagonal views from the full O14 aperture toward all five CT anchors. A-reel belongs to the west-entry/A alcove, not Short. Solid wind baffles (2.80m above +2.40 deck, top5.20) close unintended cross-sea overlook: WX-R-south x44–66 at y62; WX-A-return x40–44 at y58 plus x44,y58–62; WX-A-south x18–28 at y50. Other sea guards remain1.25. These are opaque physical steel screens with no movement aperture. Pink lines on layout.svg show their extents. Compiled opposing standing/crouch checks must verify this closure. No earlier object IDs retired.

R04 / L04 retains the L03 topology, thresholds and tactical footprints. Separator pedestals now seal to z2.0 with a horizontal cylindrical crown to z4.0 (instead of enclosing the complete cylinder in a 4m box). Same-deck standing and crouched body views remain blocked; high-side SB/Control views require the compiled review. A lifeboat suspension member was added outside the playable deck.

R05 / L05 local repair: V-console, A-cable, A-reel, P-cart and B-pump rise1.10→1.20m above their supporting deck. R04 optical probes at0.60m setback showed tiny crouched-eye exposure to standing opponents at three props. Footprints, source IDs, all stairs, thresholds, spawns and tall masses are unchanged. The extra0.10m gives a useful crouch margin while leaving the standing eye exposed. Physical under-step and cover-side routes must be rechecked; target-engine bullet and weapon/body behavior stays unknown.

Stair flanking infill has flat tops at+2.40, adjacent to head landings. These are not intended routes and are excluded from harness walking-floor admission. Occupancy via guard ends / their outer shoulders must be checked in the destination engine. No claim is made that lack of harness navigation proves these tops physically unclimbable.
