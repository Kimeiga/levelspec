# L04 detailed spatial / visibility review

Status: **accepted at the detailed layout stage** for the final L04 packet
identified below. The consequential floor/flight and lower ramp-mouth findings
are resolved in the saved plans, sections and coordinate data. This closes this
reviewer's spatial/visibility layout scope; separate strategy and dedicated
section-review verdicts remain their own gates. Source AML remains B04, and no
compiled L04 clearance, visibility or movement acceptance is implied.

Reviewer scope: independent detailed spatial/visibility, including physical
topology, construction reservations, usable approaches, support/escape, and
plan/section agreement. Dedicated local section coverage and strategy/player
behavior have separate reviewers. No AML, generator, or layout edits made here.

## Evidence and order

Read the expanded user brief and inspected the raw
`planning/complexity-spatial-b.png/svg` and
`planning/section-feasibility-l04.png/svg` before the author rationale in
`planning/layout-l04-contract.md` and `planning/construction-l04-notes.md`.
Then read `planning/brief.md`, `planning/lower-port-clearance-l04.json` and
`reviews/evidence/l04-radial-reservation.json`. No other review verdict was used
for the initial assessment. The assigned organization was already supplied in
the review request; this is not a claim of a blind alternative-selection review.

The developed return additionally inspected `planning/layout-l04.svg`,
`planning/layout-l04-sections.svg` and the exact polygons/endpoints in
`planning/draw-layout-l04.py`. I rendered the first saved SVGs to
`generated/fusion-l04-review/` for visual inspection. Those are an intermediate
snapshot, not the identity of the eventual accepted packet.

Final return: visually inspected the refreshed `planning/layout-l04.png` and
`planning/layout-l04-sections.png`, reread the exact floor/hole/stair arrays and
`planning/layout-l04-detail-notes.md`, and checked the adopted repairs against
their neighboring floor and roof reservations. Final packet SHA-256:

| Artifact | SHA-256 |
| --- | --- |
| `layout-l04.svg` | `cfa6042238e0bf04038c321857c017a7ada90da00e6c61ab7a637a91e60ca794` |
| `layout-l04-sections.svg` | `ca4d46091078d617168c61de8ff79ab5c6b75712540c06198df3d7bf7d144b96` |
| `layout-l04.png` | `6c27b4add28f723f4e99e501101b501e87d343a3055a1e071f94b62155ac5f07` |
| `layout-l04-sections.png` | `7c03d23d593aa806adfc42475f05d5b01a44512b6d1c47c15ad93e2c6c03b0c4` |
| `draw-layout-l04.py` | `df77f84ff6409ceed080f77edb84749d65eb88dd9b7a3b509d3103c9acb3a3d7` |
| `layout-l04-detail-notes.md` | `fe0e014094cb968480bc63ddddda776ddf0f85312b63619ae736db7eafd2d1fb` |

Body assumptions: standing height 1.8 m, radius .35 m, crouch 1.1 m, step .3 m,
slope 42 degrees. No essential jump route. The map is 5v5 with two objectives;
weapon, utility, audio and round-clock behavior remain engine questions.

## Initial spatial assessment

The selected organization warrants development. The raised A freight platform,
lower B basin, ordinary equatorial passage, partial lower internal arc and outer
crown create different approaches to the same machinery at distinct heights.
These are consequential spatial relationships, rather than elevation added only
to otherwise identical routes. The reactor remains the organizing volume.

The partial lower arc gains a different job from the equatorial passage through
its west freight-well and lower B-room arrivals. Its optional middle level transfer
can change the commitment. The crown joins wing service landings, while reaching
the B plant still requires successive descents. Those distinctions should survive
the exact drawing; mere vertical connectivity does not establish useful views,
support, or favorable travel times.

The radial section resolves a real reservation problem: a lower bridge at −3.2
with .3 m slab thickness would intersect the retained outer PF coil. The proposed
−2.8 top / −3.05 underside leaves a nominal .20 m separation from its −3.25 top.
The analytical profile allows consideration of the lower internal strip, and the
nearest installed TF plane check gives a conservative .925 m plan gap for the
2.6 m bridge at its initial radial station. These calculations make the candidate
credible to investigate. They do not certify azimuthal shell cuts, rails,
collars, foundations, support members, player fit, or physical travel.

## Initial developed-layout inspection targets

| ID | Assembly / region | Consequential question and expected layout evidence |
| --- | --- | --- |
| LS-01 | A, x[−40,−22], y[4,24], +3.2; south/east/rear arrivals | Draw the freight opening, floor perimeter and distinct occupied landings with exact stair runs. Establish how the ground Cask and W-port journeys pass below/alongside those transfers, with slab/flight undersides and overhead volumes. Show which view each crest reveals and where an arriving follower can support or remain sheltered. |
| LS-02 | West freight well, x[−32,−23], y[−10,3], −3.2↔0↔+3.2 | Draw actual ground void and both stair interfaces, including intermediate ground exit. A single vertical shaft label cannot establish the three-level journey. Show lower bridge arrival, meaningful turn/landing space, foundation excavation and the return toward A versus ground Cask. |
| LS-03 | B, x[28,40], y[9,23], −3.2; ground rim and Control | Distinguish the roofed plant room from the open loading void using aligned plans and a section. Show the three lower arrivals, their screens and the precise ground rim opening. An upper observer should pressure a selected crossing without inheriting sight to the entire plant room or all descents. Record low-cover top levels relative to the upper eyes. |
| LS-04 | Lower ports at 210° and 350°, R7.3 outward | Show bridge endpoints and their wing-room connections, not only radial rays. Separate the vessel work opening, cryostat notch, bioshield opening and foundation cavity. Mark ramp extent, floor unions, body/guard clear width and actual vertical aperture reservations. |
| LS-05 | Central stair R5.1, 225°/0→305°/−3.2; hatch R4.1..6.2; lower bypass R6.1..7.3 | Coordinate top/bottom landings, hatch start/end and outer ground strip in plan/section. Draw the junction after the bottom turn, rail ends and headroom beside the descending flight; do not treat its centerline as usable width. Record support and opposing views through the hatch as a selected sight connection, and show a plausible return/fallback once either level is contested. |
| LS-06 | Crown R18.6..21.4, 20°..160°, +6.4; endpoints near (±18.8,10.8) | Show the two interrupting work rooms, actual passage widths, protective versus optical edges and exact wing landings. Give the cross-space views concrete targets and reverse exposure. A long arc with two named rooms still needs clear approach/occupation/departure relationships; crown access roofs and supports must be explicit. |
| LS-07 | Changed hall x±22, y−20..27; rear y27..34; occupied wing roofs | Coordinate new hall walls, crown support bases, rear openings and stepped roof/ceiling heights. Show which former B04 walls/slabs are retired; source carryover must not seal new links. Put nearby spawn offsets and elevated targets on the planned view-study list. |

These were the initial evidence requests, not demonstrated geometry defects.

## Developed return findings

| ID | Finding and mechanism | Current disposition |
| --- | --- | --- |
| LS-08 | `crown-east-transfer` initially extended to (26.5,11) at +6.4, overlapping the upper flight for roughly its final 1.4 m while the treads were still below +6.4. The west half of a centered body could meet the upper floor. | **Closed in layout.** Transfer ends at (24.8,10.8), with an L-shaped landing remaining west of x25.1 for y>11. The final image/data show the flight arriving at the landing boundary. The +3.2 work-gallery edge is also trimmed around the flight. |
| LS-09 | `crown-west-top-landing` initially began at x−26.5 while the ascending flight continued to x−25. Its +6.4 floor overlapped the full flight width for 1.5 m. | **Closed in layout.** Adopted endpoint (−26.5,25,+6.4) gives a 6.5 m run meeting the landing's west boundary. The service-walk floor starts beyond it. I proposed this repair; the dedicated section reviewer was separately assigned its arrival/support consequences. |
| LS-10 | `cask-low-fixture`, originally x[−25,−23],y[−11,−8], base0/top1.05, was wholly inside the filled gallery stair where treads rise1.2..2.4. It could not act as the drawn ground refuge. | **Closed in layout.** Final footprint x[−41,−39],y[−10,−7] is clear of the stair and freight hatch. It becomes a west ground preparation/repositioning fixture; its usefulness still requires opposing optical/body views. |
| LS-11 | A prior lower vessel ramp revision began on the straight radial plane R7.3 while the curved lower floor/fans also ended at radius7.3. At half-width1.3 the mouth corners were radius7.415, leaving only a tangent-point union. | **Closed in layout.** Both final ramps startR7.1 and endR9.8. Start corners are radius `sqrt(7.1²+1.3²)=7.218`, insideR7.3; their ±10.38° angular spread lies within the ±12° port fans. The full mouth overlaps. The retained bridge/PF elevation is unchanged. Final physical union and floor trimming remain compiled checks. |
| LS-12 | Initial S2 graphic overlaid S1 and lacked an explicit local X-axis origin. B loading/plant cuts were absent. | **Closed in layout.** Final S2 is separated and labeled as the conservative X/Z overlap envelope, with originX−33 and stated Y extent. B1/B2 distinguish loading/plant and now include upper gallery/flight silhouettes, standing bodies, roof steps and shelf support. |
| LS-13 | `cask-gallery` at+3.2 overlaps the A mezzanine at x[−25,−22],y[1.5,5], supplying a fourth upper arrival in addition to A-S, A-E and A-R. | **Closed in layout inventory.** Final notes explicitly state four ground-fed arrivals plus the crown connection. Retention is spatially coherent; independent strategy must assess the actual five-front attention cost. |

The changed west flight gives nominal corner headroom
`3.2 + 3.2*(2.6/6.5) − .28 − 1.76 = 2.44 m` above the rear stair.
Subtracting one .16 m riser yields a conservative 2.28 m reservation for the
1.8 m body. This is an independently checked drawing calculation, not certification
of native treads, full capsule movement, guards or final floor unions.

## Accepted spatial relationships and remaining hypotheses

LS-01/02: A's void, tooling and separate landing turns make the four ground-fed
arrivals meaningfully different. The rear/crown return approaches the north side
of the tooling; it does not inherit the south plant view without repositioning.
Ground Cask circulation remains under/alongside upper play. The revised freight
hatch leaves 3.1 m gross between its southern east edge and the filled gallery
flight; the ground path can turn under the gallery landing at its 2.9 m underside.
The shield return at Y−14 preserves an 8 m mouth, within which the gallery foot
and ground path occupy distinct portions. Its high wall breaks the former long
western approach; the longer northern ground segment remains a deliberate risk.

LS-03: B1/B2 establish a substantial lower room with 2.9 m nominal headroom under
the retained plant shelf, alongside an open loading volume. The west work-room,
trench and rear descents arrive at different boundaries and have different turns
before plant influence. The ground crossing and shelf edge can influence selected
lower crossings while the floor/partition protects the planted room. The upper
gallery is not an unlimited overlook: the ground rim, shelf and screens intervene.
Standing/crouching and intermediate descent views must establish what is actually
visible; nearby lower blind zones should be retained or revised deliberately.

LS-04/05: Both lower bridges now join actual wing rooms and full-width interior
mouths. Hall portals have separate clear Y/Z reservations for lower, equatorial
and crown crossings. The central stair has identified top/bottom landings and a
real upper hatch, with an outer ground strip and .98 m clear lower bypass. That
narrow bypass is an intentional single-file commitment; two players cannot be
assumed to pass or trade side by side. Its floor, guard ends, turn and follower
views remain the highest-priority compiled feasibility experiment.

LS-06/07: Crown access involves wing stairs, occupied landings and a long partial
arc with two work rooms. The west arrival must turn into the service walk before
using the port view; the east descent reaches the gallery and ground before any
further commitment into B. The Cask window and crown-end port views have concrete
targets and aperture/edge reservations, rather than scenic rays into empty space.
Their reverse exposure and actual coil occlusion remain unproven. Hall/wing roofs,
step walls and retired B04 geometry are explicitly owned. The exposed east ground
strip X41..43 remains a stated long-lane tradeoff, not a presumed hidden shortcut.

No remaining supported drawing-level blocker was found in this scope. These
relationships support moving into the compiled experiment after the other layout
scopes close. Acceptance does not establish practical timing, safe retreats,
teammate trades, ballistic protection or competitive balance.

## Reserved blockout checks

Even after a layout pass, compiled verification must inspect the unchanged body
through both directions of every new branch, particularly the curved stair and
outer lower strip, bridge/coil interfaces, all A crests, B lower landings and crown
transfers. Match plan cuts and sections to the compiled geometry; inspect floor
and slab unions, real cavities, retired geometry, supports and overhead enclosure.
Capture leader/follower/opponent views at approaches, intermediate stair poses and
arrivals, plus all ten spawn positions and offsets against elevated target areas.

Navigation sampling, the inspection walker, analytical reservations, optical rays
and target-engine play remain separate evidence classes. No measured reachability,
support/trading, competitive balance or construction adequacy is claimed here.
