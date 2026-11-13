# Ninefold / Loft Street — developed L02

**Requested gates:** independent strategy/player behavior and dedicated spatial/visibility review. This packet is a proposed layout, not production AML or balance acceptance. B/Loft Street was selected by root after the four S01 panels. Original Ninefold and the engine remain unchanged.

Read the actual [ground](ground-l02.png), [middle](middle-l02.png), [roof](roof-l02.png), [C1–C9 sections](sections-l02.png) and [aperture comparison](aperture-comparison-l02.png). SVG companions are editable. [Exact data](layout-data.json) supplies all floor rings/holes, wall intervals and heights, apertures, roofs, separate contextual buildings, plinths, stairs/guards, obstacles, section axes, cameras and journeys. [Planning checks](planning-checks.json) are limited geometry self-inspection. Artifact identities are frozen in `freeze.json`.

## Consequential assumptions and construction

5v5 one-life defusal; ground A/Porcelain and middle B/Machine Floor. Body radius0.25, standing2/crouch1.1 m, eyes1.86/1.023, step0.25, slope42°, inspection speed3.4/1.7 m/s unchanged. Provisional115/40-second clocks are scenario assumptions. Weapon penetration, utility, audio, economy, exact objective rules and multiplayer behavior are unavailable. No required jump, boost, ladder, drop or crouch passage.

Floors0/3.2/6.4; slabs0.24. All six stairs are4 m wide,20×0.16 m rises,0.60 m treads,12 m run, with3 m landings and1.1 m solid guards following grade. Upper slabs have explicit flight cutouts. Ordinary portals are3–4 m wide,2.6 m high; D-SIGN is2.5 m wide. Every opening's width/sill/head is in data. Observation apertures V-WELL/V-SIGN are physical window holes with opaque sills/heads, **not movement links**. The minimum specified stair clearance2.35 m is an acceptance requirement to verify, not a measured result.

Factory F1 has one complete roof at6.9 and an open lightwell through x46–56,y41–52. Its lower through-street has a real2.96 m ceiling; the occupied loft clear height is3.46 m. North Receiving is reached from the enclosed Boiler gallery through D-B-N at(50,59), then the west work aisle. East enters at(62,41), beside the southeast production floor. CORE separates that floor from the northern observation pocket. School is an open-sky walled neighborhood terrace; Boiler is a roofed service gallery. F2/Porcelain has a6.65 roof and the real Sign gallery above its west shoulder; A-KILN ends2.75, below the gallery slab. F3–F6 roofs close the shops and annexes. C01–C08 are separate inaccessible adjoining buildings with roof heights9.4–16 m, never one uniform extrusion. Render roof-on first, then explicitly hide F1/F2/F5 roofs for inspection.

The last actual reference revisit used the retained primary-gallery photos [service space14](../references/images/gallery-14.png) and [roof addition04](../references/images/gallery-04.png): overhead utility density, roof rooms and unequal adjoining volumes informed the core/annex and service roof. Their exact access and dimensions are invented; [source/credits](../references/study.md) remain in the S01 study. No new historical-floorplan claim is made.

## Dispositions of substantive proposals

| Proposal | L02 disposition and cost |
|---|---|
| M2 distinct Boiler/East arrivals | Adopted structurally. S3 now ends at(68,61); Boiler reaches the north door. East reaches southeast floor. North then clears a16 m west aisle; plant defenders can concede Receiving and hold its next threshold. Distinct fronts add clearing time, not extra graph edges. |
| M3 School-side lower information vs OP-NF-01 east/north pocket | Compared, selected the east/north pocket only. See actual aperture comparison. The west candidate sees both the underpass target and well from the work-aisle hold. Selected V-WELL sees the well-center target but excludes the two tested doorway targets at its wall plane. A northern teammate must commit; this is far from the plant, not free anchor information. |
| NF-SP-01 complete factory/shared void | Adopted F1, real floor/roof void and opaque well edges, single V-WELL. No open U balcony. Lower well player can reciprocate the chosen eye; underpass and Dye offer onward retreat. |
| NF-SP-02 School versus Boiler identity | Adopted open-sky School / enclosed4 m Boiler gallery. Cost: Boiler's doorway and west aisle require staged clearing; School retains an exposed crest before its southward door approach. |
| NF-SP-03 separate contextual identities | Adopted C01–C08, F1–F6 and roof additions. Different roof levels and commercial bases are exact data, not a texture instruction. |
| OP-NF-03 optional committed roof | Retained as early School→Boiler approach switch when the direct loft is contested. Omitted an extra roof observation aperture; parapets, R-HUT/R-WATER and a tall service screen bound its influence. Later offsets must check residual roof sightlines. |
| A-only M1, NF-SP-04, OP-NF-02 | Not carried into selected B. Sign's separate information stop belongs to B's existing A relationship; no Tea/Clinic graph was transplanted. |

## Section and encounter coverage

All positions are **feet XYZ**, predicted. Blue view IDs in JSON add1.86 m eye; camera study FOV90° horizontal/60° vertical. Repeat standing/crouched, lateral offsets and ownership reversal. L=leader, F=follower/support, O=opponent. These are plausible test positions, not observed players.

| Scope / named sections | Positions and prediction to test | Preparation, escape and next decision |
|---|---|---|
| T spawn / Canal exits, ground | L(11,28,0), F(11,23,0), O(15,33,0); alternate L(24,15,0), O(37,24,0). T-RETURN and AWNING-STALL break direct spawn exposure, offsets still need views. | Canal→Butcher or Awning; teammates can hold the old contact boundary during a switch. Both spawn exits and offsets must be captured. |
| CT spawn / Water exits, ground | L(80.5,69,0), F(79,74,0), O(82,61,0); alternative L(68,76,0), O(59,69,0). CT-RETURN screens the center but is not a universal safe pocket. | Choose A rear, S3, or Dye ground; inspect offset spawn views down both exits. |
| Butcher / Paper / Drain / Boiler | L(24,38,0), F(20,37,0), O(31,34,0); Boiler L(30,60,0), F(29,54,0), O(43,58,0). Counter low cover differs from tall BOILER-TANK. | School climb, lower Drain push or Paper transfer; tank has north/south passing space, no promised ballistic cover. |
| Awning / Tailor / underpass, C1/C5 | L(43,34,0), F(40,34,0), O(52,38,0); Tailor L(70,38,0), F(70,34,0), O(78,44,0). Factory pier breaks a diagonal, low ceiling prevents a direct loft view. | Tailor passes around S2's foot then keeps ground A access. Fork to S2 changes level; underpass continues to Well/Dye. |
| Lift Well / Dye transfer, C1/C2 | WELL-DOWN(50,49,0), WELL-UP(57,48.6,3.2); support(52,40,0), opposite Dye(52,54,0). Selected center rays are reciprocal; window visibility from other offsets is open. | W-CART gives a low pause but not immunity to upper eyes. Both doorways are candidate retreat thresholds; Dye shelf forces a readable transfer around its north end. |
| B site / three fronts / north hold, C1 | East L(60,40,3.2), F(64,41,3.2), O(55,39.5,3.2). North L(44,50,3.2), F(44,54,3.2), O(46,39.5,3.2). School L(43,35.5,3.2), F(40,35.5,3.2), O(55,35,3.2). | B-PRESS tall occlusion, B-TABLE low refuge and N-SORT staging require different teammate coverage. Plant(57,35,3.2) cannot also occupy the information pocket. Test a2v2 plant hold after losing North. |
| A site / Sign hold, C3 | South L(78,43,0), F(78,39,0), O(87,44,0); rear L(78,57,0), F(70,58,0), O(79,46,0). SIGN-UP(80.75,52,3.2) vs SIGN-DOWN(76,52,0). | A-KILN separates shoulder from plant; A-BENCH low cover is defeated by Sign's height. A-PALLET needs teammate coverage on its exposed side. Sign observes a shoulder, with plant behind its wall/core geometry. |
| S1, C4 | Mid L(30,42,2.4), F(27,42,1.6), O(36,42,3.2). | Crest support is different from support into B. Top apron allows a south turn around SCH-RETURN; reverse climb remains available until lost. |
| S2, C5 | Mid L(65,32,2.4), F(65,29,1.6), O(65,38,3.2). | Complete receiving apron; East doorway is a further turn and commitment. Ground Tailor can keep A pressure after an upper probe. |
| S3, C6 | Mid L(68,64,2.4), F(68,67,1.6), O(66,61,3.2). | Top landing→west gallery→north B door. F can support crest, not the north doorway before reaching the gallery; ground Dye–A has2.96 m beneath this landing. |
| S4, C7 | Mid L(88,55,2.4), F(88,58,1.6), O(84,50,3.2). | Gallery window requires a westward stop after the top landing; onward East path remains. A ground route passes west of the flight. |
| S5, C8 | Mid L(36,58,5.6), F(36,55,4.8), O(36,64,6.4). | Roof hut screens onward choice; climb passes over Boiler ground with at least2.96 m planned underside clearance at its lowest point. |
| S6 / roof seam, C9 | Mid L(62,72,5.6), F(62,69,4.8), O(66,77,6.4). Roof seam L(54,73,6.4), F(54,69,6.4), O(58,76,6.4). | Reversible early approach switch; R-WATER prevents a free arrival panorama. Loss of the middle ends can strand a roof lurker; not an emergency retake promise. |

## Opposing plans and exact journeys

`journeys` contains9 physical waypoint chains for later unchanged-body collision walks; capture actual applied camera, not a filename/URL pose. Both roof-on overall and opposing interiors are reserved in `cameras`.

| Scenario | Testable plan, response and cost |
|---|---|
| Opening5v5 B | T School J01 is84.4 m /24.8 s pure motion; CT Boiler J05 is92.0 m /27.1 s; CT Sign/East J06 is74.8 m /22.0 s. These different routes cannot establish first-contact fairness; test actual spawn offsets, clearing and final threshold timing. |
| Opening5v5 A | T Tailor J02 is115.5 m /34.0 s; a defender starts much closer. T can instead establish lower territory and approach via Dye/J04, supported by a Tailor player. The cost is split attention and a long cross-map commitment. |
|3v3 after School contact | One T holds School while two retain Paper/Drain. The lower player can cross beneath B toward Dye without entering the objective. CT must choose a north-window observer or preserve direct plant coverage; the window does not magically identify objective commitment. |
|3v3 B planted | CT pressure from Boiler/North and East reaches different receiving territories. Plant team can concede North, hold the work aisle, and retain an East-side partner; verify the PRESS/TABLE do not create an effortless single-position hold over all three doors. |
|2v2 A planted | One CT pressures Dye, the other chooses A rear or pays S4/Sign cost. T can challenge the Sign aperture from the western shoulder while a plant-side partner retains the southern bay. Choosing Sign sacrifices immediate ground presence. |
|2v2 B planted | A CT already at School can cooperate with Boiler/East. A CT starting at Water should use S3 or Sign; sending one around both roof flights is not credited as automatic40-second counterplay. |
|Optional roof before plant | J07 School→roof→Boiler→north door is83.7 m /24.6 s pure motion, before clearing. It bypasses the contested machine floor while teammates retain lower pressure. Direct passage through B is shorter but requires that territory. Keep only if actual play finds this state useful. |

These are polyline distance/speed estimates, **not measured travel times**. J03/J04 cover the lower alternatives; J08 the Tailor ascent; J09 the17.7 m north-pocket commitment from North Receiving. Round/utility/audio claims remain untested.

## Self-inspection and open review questions

Inspected the three actual plan PNGs, all9 coordinate sections and aperture comparison. The0.25 m path-center sampling found and repaired the Tailor/stair overlap, upper-facade transfer blocks and several corner-cutting waypoint predictions. Current nine samples have no listed wall/prop/surface/analytic-flight conflicts for r0.25/h2; this is **not** native collision, tread, roof-mesh or continuous reachability proof. New tests were not added to the shared engine.

Priorities for the independent gates: distinct B fronts and recoverable prep; School/Boiler support across the work aisle; both spawns/exits; A's ground/Sign crossfire; every intermediate stair pose; roof residual sightlines; and the lightwell's offset visibility. The selected center ray misses the Dye-side aperture jamb by only0.08 m, so that one ray does not prove the doorway hidden from all positions. The whole roof/door geometry and lateral offsets must be reviewed. No production source is authorized by this self-inspection.

Reproduction: run `draw-layout.py`, `check-plan.py`, then `draw-sections.py` using the isolated Shapely environment under ignored `generated/ninefold-reboot-layout-venv/`; rasterize the five SVGs at their viewBox sizes. The scripts and JSON are project evidence, not a new authoring API.

## Focused L02 correction

Physical geometry is byte-equivalent as structured data to frozen L01; only nominated view/camera positions and their predictions changed. B-SUPPORT is now (44.5,39.7,3.2) at the west aisle mouth. This player commits west. The exact eye ray to East remains open, while PRESS blocks the plant ray; north-aisle attention must not be counted as simultaneous control of every front. Both School and East can challenge this exposed mouth, so a second teammate still needs to retain plant-side attention. SIGN-UP is now (80.75,52,3.2), with the reciprocal lower eye unchanged. The standing pair clears both faces of the existing 0.30 m sill; the upper crouched eye remains below the sill. No aperture is added or enlarged. See focused-corrections.md and focused-views-l02.png for exact checks and opposing relationships. The independent L01 strategy acceptance is reused for unchanged geometry; a focused spatial return remains required.
