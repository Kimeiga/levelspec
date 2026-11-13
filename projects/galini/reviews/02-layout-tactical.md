# Independent strategy / player-behavior review — L02

**Superseded.** User requested a less grid-like coastal town after this review. L03 must be independently reviewed before production; the L02 verdict below does not accept the revised map.

**Verdict: accepted for blockout development.** No supported tactical defect requires a layout revision at this stage. Acceptance concerns the drawn relationships, not competitive balance or verified 3D visibility.

Inspected `reviews/evidence/layout-l02.png` and `plan.json` before reading `brief.md`, `layout-packet.md`, then the author's `design.md`. Scope: 5v5 one-life defusal with two sites; provisional 115s round / 40s planted clock and 5m/s game run estimate. The harness does not implement those rules or combat. Reviewer did not author geometry.

## Macro relationships

The upper CT lane joins the two sites, while T's outer approaches reconnect through Ferry Square and the middle square. This gives the sides different reinforcement costs. Holding Mid enables an A Short split, a Market split, or the exposed climb toward CT's rotation lane. Those options have distinct consequences: site pressure stays near plant support; climbing Gate can cut reinforcements but separates that player from both sites. Outer paths are commitments until the player returns south. That cost is visible in the drawing and is reasonable under the assumed round clock; it is not a free late pivot.

The CT reinforcement route is plausible but substantial. A→B through the upper lane is roughly 85–95m along the drawn circulation, including the site exits and B stairs: approximately 17–19s at the assumed 5m/s before clearing or utility. This is an informal plan estimate, not a compiled path or measured game timing. A 40s postplant allows a prompt rotation and a kit attempt; a delayed 1v2 rotation can reasonably be too late. Do not describe the upper lane as an instantaneous site switch. Compile its actual path and retain both the game-speed estimate and harness walking time.

## Named scenarios

1. **5v5 opening defaults.** Two CTs at each site plus one at Gate is a feasible allocation. The middle defender can delay the climb and relay square pressure without personally securing both site approaches. Ts can send one Seafront, two Mid, two Harbor, then reinforce a chosen site. T's shorter travel to the square does not itself create a spawn rush: the northern approach climbs through Gate and its screened landing. Compiled timing must confirm the site defenders have setup time and identify where the first opposing pair actually sees one another.

2. **3T / 2CT A attack.** A split through Cliff and Short is materially different from three attackers climbing one stair. Both climbs are exposed frontally; the cistern interrupts portions of an A defender's attention and permits a fallback around its sides. A defender near the cistern can reposition, but cannot assume the same view controls both stair feet and the CT entrance. Attacker support on an individual 6m stair is plausible; a mid-climb leader and lower follower may have different sight to a defender's body. That trade relation is a blockout question, not established by width. A CT rotating from B must commit early enough to influence the fight, or retake through the vestry after planting.

3. **3T / 3CT B execute and plant.** Harbor and Market arrive at neighboring but different site frontiers. They do not provide a deep rear flank. A CT near the stair foot may cover both with limited angular movement, which is a deliberate B hold to test; the salt bins are low and cannot be assumed to defeat this hold. The boathouse denies a west-side attacker immediate information about the eastern pocket. A viable T execute must clear that pocket or spend a player watching its exit, then plant with another player covering the descending CT stair. A two-direction entry and a coordinated utility attempt are credible responses. Actual grenade capability and sound remain unknown.

4. **2v2 postplant A, limited utility.** Ts can hold one stair-side position and a cistern/court position, or contest the CT entrance instead of keeping both outer exits. CTs can approach together through the vestry and clear the cistern sequentially, or spend time taking Gate/Short to change the angle. The latter is a costly response rather than guaranteed counterplay. Site distance and the planted clock make that choice consequential. The chapel must remain a solid mass; no implied playable rear room or roof escape is credited.

5. **2v2 postplant B and 1v2 kit retake.** A Harbor player and Market player can support a plant but cannot automatically see a CT descending the return stair through the boathouse and retaining house. A CT entering B from above must clear the stair bottom, salt bins, boathouse edges and objective in a sensible sequence. A lone CT can use the house to reduce simultaneous views, but has no guaranteed way to isolate both attackers or win. The clock forces a decision. Do not add a gratuitous extra flank solely to make the 1v2 favorable.

6. **CT push after loss of Mid contact.** A CT can descend Gate into the square and threaten T's site-split routes. The movement gives up the upper entrance hold; Ts can punish through Short/Market or wait behind the bakery screen. The single Gate defender cannot push and watch both sites. Capture from the actual elevated Gate head is needed to establish whether it also observes too much of both Mid exits without exposing its body.

7. **Aborted outer attack.** Seafront and Harbor retreat to Ferry before they can switch through Mid. The path is long but physically legible and offers a reset before the late round. A caller who waits until the final seconds has spent that option. Confirm the compile does not create unintended scenic or roof shortcuts that eliminate this commitment.

## Priority blockout checks

- Record actual unchanged-body spawn→site, upper A↔B, Mid→Short and Mid→Market paths and distances. Check the 5m/s estimates against provisional clock decisions; distinguish these from 3.4m/s harness walks.
- At A, inspect both stair heads from at least two defender offsets around the cistern, and leader/follower positions during each climb. Reconcile whether a defender controls both exits or only a partial silhouette, and what repositioning exposes.
- At B, inspect (81,64,0) and nearby stair-foot offsets toward both Harbor and Market, then reverse those views. This is the main single-holder risk to test. Retain a justified strong hold if two-player support/utility can contest it; do not infer indefinite safety from an FOV fit.
- Inspect B Return from upper landing, middle tread and lower court in standing/crouched views. The elevated observer may see over 1.1m salt bins. The bins are preparation cover against level views, not universal protection against the stair.
- Inspect Gate head toward both square branches and the bakery exit; reverse from the square and check visible body versus hidden camera. Inspect upper-lane screen bypass during rotations and CT spawn offset safety.
- Verify all four stairs and full Boat upper landing bidirectionally, including follower space and sidewall endpoints. Confirm scenery and roofs add no unreviewed movement connection.

All tactical outcomes above are drawing hypotheses. Multiplayer crowding, trading, grenade arcs, penetration, audio, clocks and competitive balance remain target-engine/playtest work. Blockout acceptance needs actual paired views and performed movement checks on a source-matched revision.
