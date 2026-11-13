# Switchback L01 — independent layout spatial / visibility review

Reviewer: `switchback_spatial`. Applied `fps-map-review`, its visibility-and-cover guide, and `level-authoring`. Initial assessment used `brief.md`, `layout-data.json` and a visual inspection of `generated/switchback/layout-L01.png`, before reading `design.md`. No other reviewer verdict was used. No compiled geometry existed at this review stage.

**Verdict: changes required for one localized staging-contract discrepancy.** The overall graph and elevation structure are accepted as a blockout hypothesis. Correct or explicitly revise the B staging relationship below, then return that interface for recheck. All 3D findings listed below remain pending rather than passed.

## Supported layout finding

**S-L01-01 — BP does not implement the promised offset crest.** `Cistern-high` ends at `(24,41,20)` and `B-main` begins at `(24,47,20)`; their 4.5m/5m openings are aligned. BP has a six-metre level interval but its incoming and outgoing centerlines coincide. The brief says every ascent ends in a room with an offset onward doorway. The longest climb (+12m, 16m run) is therefore the one whose drawing fails that stated protection mechanism. A B-main holder can contest the crest through this aligned aperture; exact visible flight length is a 3D question.

Repair: move `B-main` laterally within BP/B, with a corresponding check of `BP-bench`, or intentionally retain the aligned crest and revise the brief/design to identify the greater exposure as a deliberate cost. If offset protection remains the chosen contract, inspect diagonal views after compilation; merely moving the centerline is not proof of concealment. The existing A and Mid offsets likewise need that inspection.

## Whole-map assessment

- **Graph / circulation:** every room connects to the declared network. None is an orphan. All routes are bidirectional without an assumed jump/drop. XY crossings are not being used as false vertical connections. Widths of 4–5m plausibly support passing and followers with a .6m body diameter, but that is not multiplayer-throughput evidence.
- **T, W0, E0 and lower street exits:** enclosed rooms and roofed spawn plausibly stop remote upper views. The three lower streets have no sideways transfer until the high junction or a return through T. This is an explicit commitment structure, not accidental disconnected geometry. Scan spawn footprints and exit offsets, not only `(0,0,0)`.
- **W1 / M1 / E1 and second climbs:** landing shifts provide a pause between steep flights. `M1-stall` separates the straight approach; the low W1/E1 objects do not provide equivalent full standing concealment and should not be described as such. The unbroken stair runs have no mid-flight refuge. That is acceptable as a deliberate climbing cost if a pushed crest can be contested from the landing; compiled intermediate views are required.
- **AP / MID / BP:** the level rooms create a useful difference between finishing a climb and entering the next fight. AP/MID doors are offset, though their aperture widths still overlap slightly in projection; BP is aligned as above. Check all three from both incoming edges and the opposing doorway, including a following teammate two metres behind.
- **A:** south main, east short and north retake are spatially distinct. `A-tank` can partition main/short sightlines without fully bisecting the room. The outer 1.25m refuges give several possible changes of position. The high north stair is the important exception: lower cover and tank protection must be evaluated from successive descending stations, not just a same-level defender.
- **Valve and A/B shorts:** `V-divider` blocks a single straight shot through both lateral connectors, while retaining circulation around it. A-short reaches A at equal elevation. B-short must climb four metres and exposes a different crest; it should not be treated as a free second level entrance. The unbroken 10m grade is an inspectable commitment, not automatically a defect.
- **B:** turbine and three low obstacles provide separation within a 20×16m court. The main, west ramp and north ramp are distinct entry frontiers. `B-entry-low` partially overlaps the south edge of the west-frontier fan but leaves a broad passage in plan. Inspect whether its side exposure or turbine edge creates a very small target hold covering both attacker entries.
- **AW / BE / CT road:** road screens plus the +32m central headhouse plausibly remove the panoramic high-ground problem. No initial spawn-to-spawn view is predicted through that mass. Upper outer ramp/stair edges still need diagonal checks toward lower rooms and site cover. All current views are only geometric predictions.

## Cross-scope timing risk

CT reaches Valve only through A or B. Rough centerline distances are approximately 80m for CT→A→Valve versus 60m for T→Market→Mid→Valve, before obstacle detours; these are drawing estimates, not measured navigation or round timings. `design.md`'s defensive 2 A / 1 Valve / 2 B is therefore a contested opening plan, not an established initial deployment. Preserve the useful attacker initiative if intended, but have tactical review and the later measurements address it explicitly.

## Required compiled visibility packet

1. Whole spawn rectangles plus exit offsets; CT road and service shoulders versus both spawn rectangles and lower landings.
2. Each named ascent: toe, middle, crest and opposing landing, forward/reverse; actual standing eye 1.674m and crouched eye 1.023m with supported bodies. Include follower views.
3. AP/MID/BP versus their onward threshold, both doorway edges and diagonal peeks. Establish which parts are actually hidden.
4. A north descent versus `A-tank`, `A-low-west`, `A-low-east`, plant and south/east frontiers. Repeat after objective ownership reverses.
5. B north and west slopes versus `B-turbine`, `B-entry-low`, `B-low-east`, plant and south/west frontiers. Include a crest-to-site intermediate station.
6. All low-cover pieces: at least a representative same-level and relevant elevated threat for each encounter sequence. At low height verify body/foot contact and side exposure, not just an eye ray.
7. Measured local routes in both directions and actual physical walkthroughs; routes must not succeed by silently detouring around a blocked connection.

The drawing's crowded small obstacle labels and overlapping section heading should be cleaned up in the handoff, although the JSON inventory makes the reviewed coordinates unambiguous. Competitive balance, grenade efficacy, gun penetration, real trading, five-player congestion and bomb timing remain untested.
