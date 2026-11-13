# Independent compiled tactical review — L04 / B09

**Verdict: accepted as a compiled blockout for destination-engine integration and playtesting.** No supported tactical geometry defect requires a further repair on the inspected revision. This is not multiplayer balance acceptance. Strong B holding angles, extended rotation time and the greater five-player information burden remain explicit playtest hypotheses.

Source SHA256: `383fc91cd53088ad6c863293a48cea0a00d7fb59559fe5ec3f2d084227fc98bd`. Physical hash: `285d41e1fe71ea3dcad91eb2dc330e83bc63178d09f677e38f9622034072e563`. Inspected native AML and actual images first, then the packet/reports. `generated/galini/capture-b09/capture.json` is complete:38 views, matching source identity and no browser errors. Inspected all38 frames, including the stair opposing/middle views, both sites, new districts and site interiors.

## Evidence and its limits

Strict default.0625m navigation validation reports no diagnostics/uncovered floor samples. `walk-b09/report.json` at.125m records all45 routes in both directions (90 passes), ten supported spawn bodies, and the unchanged radius.3/height1.8/crouch1.1/step.3 player. These are bounded nav/physical support/headroom replays, not continuous capsule sweeps or combat tests.

The former southern Laundry evidence gap is closed without a source change. The ordinary Sea-Laundry path used its upper interface. Independent review additionally replayed direct Sea(22,41.5,0)↔Laundry(29,42,0),201 requests each way at.035m, against the emitted Z-up collision/navigation with the exact B09 physical hash; both passed. Evidence: `generated/galini/tactical-laundry-mouth-b09.json`. Author's separate farther-south audit in `mouths-b09/report.json`, (25,36)↔(30,41), also passes. The Taverna mouth repair is preserved and its local body routes pass.

The38 captures use the reviewer's default **roofs hidden** cutaway state (`review/app.ts` initializes roofs:false; `review/scene.ts` excludes roof-role surfaces). They support the shown eye-level relationships and apertures, but do not visually verify overhead enclosure. Roof/source and physical clearance evidence are separate. The34 occupied camera poses were body-supported before capture; saved frames themselves are overview cameras, not live player motion. The low-eye frames/rays are optical studies, not evidence that an actual crouch animation/body transition was exercised.

## Compiled encounters and team behavior

**Spawns and opening allocation.** Ferry and CT exit frames show screened/bent onward paths rather than a through-map duel. All100 configured mixed-eye rays between the five T and five CT spawn anchors are occluded. This covers those ten authored positions, not every continuous offset or dynamic jump position. CT2A/1Gate/2B remains a credible initial distribution because the extra loops feed the known site fronts. Five players cannot continuously observe every district; CTs can concede outer courts, while Ts choose what they clear and leave watched. Those are decisions to test, not coverage guaranteed by a connected graph.

**Sea/Laundry/Winery and an A split.** The Laundry/Winery/Wine Lane frames show genuine connected space and a route into Bell beside the square corner. A Sea-side player can change toward Bell without first winning all of Olive Piazza, so A cannot rely on the Mid defender to announce every Bell threat. The two-flight Cliff approach changes direction at the +2m landing: the lower-foot frame does not grant one continuous view into A, while the landing and upper-middle frames reveal the cistern and the A exit progressively. A lower follower does not automatically see the upper flight's opponent. This makes a coordinated Cliff/Bell attack plausible, but a rushed independent player can be isolated at a stair head.

The ordinary T→A route measures73.71m and follows Bakery/Olive/Bell. Summing the deliberately Sea/Cliff route legs gives approximately101.2m. At the assumed5m/s these are14.7s versus20.2s before fighting/clearing: a roughly5.5s staging difference. A simultaneous split therefore needs communication or a pause; it is not achieved merely by both groups holding forward from spawn.

**A court, cistern and chapel.** Bell's defender view and the opposed attacker/mid views confirm a committed climb with later site reveal; tall side masses screen lateral threats during most of the rise. The cistern interrupts the central court view rather than every possible A position. The chapel interior frame shows a useful aperture toward the planter/cistern side, and the outside doorway frame shows the opposite exit through the room. It supplies a reposition/clearing problem inside the same site, not an unreviewed rear approach. In3T/2CT, a defending pair can concede a stair head and shift around cistern/chapel, but must then respond to occupation and planting. In2v2 postplant, choosing the chapel relinquishes some immediate court information; CTs still have a time-costly Bell alternative or a coordinated upper-entry clear. No guarantee of favorable retake odds is claimed.

**Olive, Gate and Customs.** Mid shows the fountain and actual stair opening. Gate attacker/mid/defender frames support a bounded high-ground view: a west-plaza wedge is visible, while the east side is screened. Named rays agree: Gate→west target visible; Gate→east target blocked. This is two tested targets, not a complete panorama audit. A CT at Gate can provide partial information and delay the climb, but does not receive proof of every Customs/Market movement. Customs-west is dominated by the office mass; Customs-north reveals the next B-facing space only after rounding it. A forward CT must clear/reposition and give up some upper-lane watch. In a reduced-player state, the unobserved branch is a real information cost.

**Taverna/Arcade/Harbor and B pressure.** The fixed street mouth is a usable entrance to Taverna Court; local paths continue through Arcade to Market. The actual curved views stage the next district rather than reveal the entire coast from B. A T group can change between Harbor and Market from this southern staging area, at the price of travelling/re-clearing; an advanced Harbor player cannot instantly teleport pressure to the opposite frontier. Arcade's eye-level bend has a meaningful clear at its end. Its cutaway capture does not establish grenade shelter or audio isolation.

**B anchor, boathouse and Boat retake.** The strong hold is real: from(107.9,84.5,0), named optical pairs reach both Market and Harbor. The b-anchor frame shows useful coverage around the low salt bins. Reverse Market/Harbor frames also show an exposed court and the Boat stair axis; the same anchor is visible from the tested CT upper position. It is retained as a strong **exposed** hold rather than a solved safe position. Two coordinated entry fronts can threaten it; actual flashes/smokes/trading remain untested. A solo entry can still be difficult, which is not itself a defect in a5v5 map.

Boat-top and middle views show the boathouse doorway and plant area emerging down the descent, with sidewalls limiting lateral information. The boathouse interior frame sees the plant through its west door; the opposing door frame also exposes the second doorway. Holding inside reduces some directions but commits the occupant to checking both exits. In3v3, attackers need to clear or deliberately watch that room before planting. In2v2, a boathouse holder plus Harbor/Market partner can support a plant, while giving CTs a timed clearing/reposition problem. A1v2 kit retaker has no guaranteed safe isolation route. Low salt bins cannot be credited as protection against every elevated Boat view.

**Upper Ribbon/Post Office and rotation.** The lane screen actually interrupts the central view, while Post Office provides a connected northern alternative. Their body routes pass. Gate control threatens the defending district only after taking the ascent and advancing; it does not statically see both plant markers. Rotating CTs must clear whichever lane/interior exit they choose. The two options should be tested against an adapting Gate-cut opponent rather than described as universally safe alternatives.

## Measured distances and clock implications

| Route | Navigation distance | Estimate at5m/s | Estimate at3.4m/s |
| --- | ---: | ---: | ---: |
| T→A |73.71m |14.7s |21.7s |
| T→B |89.59m |17.9s |26.4s |
| CT→A |47.87m |9.6s |14.1s |
| CT→B |57.57m |11.5s |16.9s |
| A↔B |96.95m |19.4s |28.5s |

Distances are compiled/replayed path measurements. Times divide distance by stated speeds; they are not measured target-game travel, and include no clearing, utility, acceleration or combat delay. The shortest T approach reaches A about5.2s after CT and B about6.4s after CT at assumed5m/s, leaving credible setup opportunity without proving actual first-contact timing.

A full site rotation consumes nearly half the provisional40s postplant at5m/s. A prompt rotate can leave time to clear and attempt a5s kit defuse; a10s late call leaves about10.6s for both clearing and defusing—about5.6s of clearing allowance with a5s kit—and a no-kit attempt is tighter. At harness walking speed the same journey uses28.5s before clearing. This is an intended cost of the requested larger/deeper map, not a basis for saying every1v2 remains retakable. Teams can instead contest Gate, preserve a closer defender or concede/save. The115s round gives room for an early aborted-approach reset, but the new local loops do not remove clearing and watch requirements.

## Remaining playtest priorities

1. Test B's combined-frontier hold with coordinated Market/Harbor pressure, then repeat after defenders use the boathouse differently. Record utility/trade behavior and adaptation, not only round wins.
2. Test Cliff/Bell staging and follower support. Does the5.5s route difference produce useful choices or habitual isolated stair deaths? Inspect target-game body/weapon exposure at the crest.
3. Test default information under5v5, then2v2: Winery→Bell, Customs branch, Arcade and Post Office must force deliberate coverage choices rather than require omniscience.
4. Test prompt and delayed postplant rotations, both kit states, with the actual destination-game speed/clock. Interiors add clearing cost; do not extrapolate retake success from nav distance.

Low-cover camera studies, successful exports and bounded body replays do not establish crouch combat, crowd blocking, ballistics, audio, grenade trajectories, networking or competitive balance. Colored no-UV exports are suitable blockout artifacts; UV/lightmap packing failure remains a separately disclosed presentation/export limitation and does not alter this tactical verdict.
