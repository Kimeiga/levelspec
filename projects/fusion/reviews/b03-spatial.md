# Fusion B03 → B04 compiled spatial and circulation review

Verdict: **accepted for the reviewed compiled circulation, reactor and gallery spatial scope**. No blocking physical defect was found in this frozen B04 candidate. This is not a multiplayer balance verdict or a claim that every possible sightline has been checked.

Reviewer: independent spatial-interest / physical-topology review. Raw B04 render observations preceded author explanation. This return review includes an independent assessment of the central defender-spawn change proposed by the strategy reviewer; this reviewer did not propose that change.

## Candidate and evidence

The B03 render capture failed before producing browser evidence. Acceptance therefore applies to **B04**, source SHA-256 `67e6d4fc42c5262f0b968956dc00ca6b7a90b261b9a41d2b4134b70ecae7f3e6`, shared by the frozen capture and both completed check reports:

- `generated/fusion/capture-b04/capture.json` and its frozen `loaded.aml`: all nine named images inspected, including roof-on player views, the reactor assembly view and roof-cut overview.
- `generated/fusion/checks-b04/walk-report.json`: 26 successful directional physical replays, 13 journeys in both directions; no unreachable named marker or region.
- `generated/fusion/checks-b04/view-checks.json`: 19 successful body placements, 44 finite optical rays between selected positions and 40 spawn-to-target offset rays.
- `generated/fusion/checks-b04/diagnostics.json`: 194 unassigned `NAV_ISLAND` warnings and four `FLIGHT_OPEN_SIDE` warnings, reviewed below.
- `planning/layout-l02.svg/png`, `planning/layout-contract.md`, source native geometry and generation script, read after the raw views where applicable.

Body contract is radius .35m, standing height 1.8m, crouch height 1.1m, step .3m and slope 42°. Standing and lowered optical offsets are 1.674m and 1.023m. Replays use .125m navigation cells and bounded movement requests no longer than .04m with physical support checks. These strengthen the route evidence beyond a nav graph alone, but are not continuous collision sweeps or target-engine locomotion.

## Reactor and circular hallway

**Accepted.** The assembly, open work arc, north interior and west-entry renders establish an actual hollow, curved vessel route around an obstructing machine core. The three bridges meet the equatorial deck; there is no competing complete exterior walking annulus. Machine scale is legible through the tall coil structure and pit while the player occupies a much smaller, level deck.

The authored native vessel operand has radial envelope approximately R3.25..9.70m around (0,4), and vertical envelope Z−4.50..6.90m, an 11.40m section height. The section is D-shaped rather than a circular torus. Five 40° sectors retain their full enclosure; the other four retain lower vessel structure beneath the exposed south work arc. This is a credible construction-stage spatial interpretation of the reference, not an engineering reconstruction claim. The equatorial deck is a separate R4.1..8.8m annulus at Z0.

At player height, the enclosed north arc presents a curved ceiling and wall, short successive reveals, and a weld cart that changes local exposure. The open south arc exchanges that enclosure for views across the work deck and port approaches. The contrast is physically visible, not just a plan annotation. The central machine blocks the sampled north-to-south diametric view; it does not imply universal separation of every oblique pair of arc positions.

Both ring directions, both side bridges and the south bridge have completed physical route evidence. The union of the north-west, north-east, south-to-north and A-to-B traces traverses all quadrants of the circular route. West/east port placements and bridge approach replays pass under the installed coil/bioshield crossings. The source provides 3.6m shell apertures and a declared minimum 2.4m width and headroom at these outer crossings; the observed routes are consistent with that intent. The tests demonstrate the traversed paths, not every lateral position within those apertures.

The open arc is **contested territory**. Standing finite rays from both west and east port positions reach the south work-arc sample, at approximately 13.65m and 14.76m. A player entering there cannot assume the core protects both sides. This creates a plausible reason to coordinate an entry with a teammate at a port, stage behind the apron fixture, or spend utility. It does not by itself demonstrate a defective crossfire or prove that utility will make the entry fair. Retain this relationship for actual playtesting.

## Gallery, support and local circulation

**Accepted.** The gallery's +3.2m surface now sits beneath the raised west-wing roof. Filled stair undersides remove the earlier accidental space beneath a flight, and both stair journeys replay in both directions. The hall-side upper window is distinct from the ground port opening; the lower divider below the slab no longer conflicts with the upper walking volume.

The port-support image and finite rays support a bounded role: the selected upper window position sees the west port but not the selected A plant point. Conversely, the selected A-facing gallery position does not see the west port and its direct ray to the A plant point meets the cask. Thus the two gallery jobs require displacement; this evidence does not support a single perch commanding both objectives or all of A. The A-facing gallery still provides a useful elevated look over portions of Hot Cell and a second route around local obstacles. Its actual plant coverage must be described by positions, not by a blanket claim of full-site oversight.

Hot Cell's cask and B's plinth/rear screen visibly separate entry, plant and rear holding positions. Direct rear-to-plant standing rays are blocked at both sites, and the selected B port-entry ray also meets the plinth. These are meaningful occlusion relationships, but finite centre-to-centre rays are not a complete account of body exposure, lateral peeks or weapon cover.

The trench player view shows the depressed path, rising exit and side retaining faces as a continuous volume. Both trench journeys pass in both directions. The nearby upper bypass has its own placement and a visible sampled connection toward B port entry. The route choice therefore changes elevation and exposure rather than duplicating an identical adjacent lane. No new hole, unintended underflight connection or missing principal landing was observed.

## Macro journeys and defender-spawn assessment

All declared macro journeys replay successfully. Representative compiled walking distances are:

| Journey | B04 distance |
| --- | ---: |
| Attacker spawn → A | 51.48m |
| Attacker spawn → B | 77.02m |
| Defender spawn → A | 39.88m |
| Defender spawn → B | 45.54m |
| A → B | 80.18m |
| Gallery ascent | 18.22m |
| Gallery → A descent | 23.62m |

The shortest attacker-to-B route uses the reactor's south/east route. Outer east circulation is separately exercised by trench-access/exit journeys; the distance table should not be presented as though both attacker objective routes stay outside the reactor.

**Independent assessment: adopt the B04 defender centre at (0,30).** Relative to B03's (13,30), it changes defender distance to A from about 53.28m to 39.88m and distance to B from about 32.13m to 45.54m. The westward adjustment gives the A defense room to establish positions before the shortest attacker route arrives, while B retains a substantial route-distance advantage for defenders. It also reduces the imbalance between the two defensive commitments from about 21.15m to 5.65m. The attacker routes are unchanged.

The spatial consequence is useful: the rear hub presents a real initial choice between wings rather than starting the entire defense beside the east wing, while maintaining separate local entrances and screen geometry. It is not a free instantaneous rotation: the compiled A-to-B route remains approximately 80m. The centre also avoids simply making the reactor the mandatory defensive opening. All 40 tested spawn-to-site offset rays are blocked, including the revised defender centre; this is bounded spawn-visibility evidence, not a full omnidirectional spawn-safety proof.

The route lengths are a directional timing proxy. They omit acceleration, player spacing, combat stops, setup positions, utility, sound and alternate contact points. They justify adopting this candidate for playtesting; they do not establish balanced first contact, plant rates or round outcomes.

## Diagnostics and plan agreement

The B04 diagnostic file contains **194 unassigned navigation islands**, not the earlier B03 count of 75. All named play regions and markers are reachable in the tested navigation result. The island distribution includes bioshield tops (87 at Z2.8), pit base surfaces (70 at Z−8.2), and smaller groups on foundations, coil pads, fixtures, roofs and elevated machine parts. These surfaces are consistent with the inaccessible machine/construction and roof volumes seen in the render and source. This is a review disposition for this blockout, not permission to suppress the warnings globally. A later jump, mantle, boost or utility traversal implementation could make some surfaces strategically relevant and must revisit that boundary.

The four ramp open-side warnings belong to the two trench ramps. The source and player-height trench image show custom retaining faces beside the route, while the replay crosses both transitions successfully. The warning does not establish a demonstrated gap in the inspected corridor. The architectural reviewer remains responsible for broader enclosure acceptance.

The current layout contract now agrees with compiled B04 on the gallery slab's .30m thickness, pit base at −8.2m and defender centre (0,30). The source's staging apron is walkable ground at Z0 with the pit edge guarded except at the intended bridge; it remains a staging area, not an additional full route around the machine. No unresolved macro plan/model contradiction was found in this scope.

## Remaining evidence boundaries

The nine initial images do not establish every reverse view, stance-dependent body exposure or leader/follower interaction on the two stairs. Additional view coverage and a separate section-by-section review are being collected; they should be assessed as actual artifacts, not assumed to pass. The present acceptance applies to the inspected reactor/gallery relationships and all declared physical journey replays.

Target-engine movement, weapon penetration, projectiles, smoke, sound, multiplayer collision and human 5v5 behavior remain untested. Lowered optical rays are not proof of crouch locomotion. No claim of final competitive balance follows from this review.
