# R08 local Splitter–Elbow proposal — tactical layout review

2026-11-08. **Current gate: accepted for tactical layout stage after the opposing-return revision.** The initial gate was changes required; its findings and their closure remain below. Current R07 source was frozen. Reviewed `audits/elbow-r08-proposal.md` and its labeled SVG before any production model change. This scope is the Splitter–Elbow interface, its real support/retreat relationships and the stated cross-node visibility repair; unchanged map findings are reused.

## Supported repair gap

The proposed `EL-return` X60..68/Y30..35/topZ8 blocks the reported R07 ray(25,42,1.61)→(89,29,1.61),65.31 m. Its first analytic box contact is(60,34.890625,1.61).

It does **not** block the nearby actual R07 clear rays:

- (25,42,1.61)→(89,32,1.61),64.78 m.
- (25,42,1.61)→(89,33,1.61),64.63 m.

Both rays remain in the north pass across the entire proposed wing and continue through the eastern room below E-01. Independent evidence: `generated/spillway/elbow-proposal-rays-r07.json`. The diagnostic compiles the current source's visible mesh, tests finite double-sided segments, then tests the proposed axis-aligned wing analytically. It does not edit or publish new geometry.

This is not a demand for zero35 m warnings. These nearby rays retain the same long SH/stair-court→Splitter→Elbow/East view across multiple decisions that the proposal explicitly identifies as unintended. Clipping only the previously largest pair does not resolve that relationship. Revise an architectural entrance/return to create a genuine offset or overlap, or explicitly defend the entire surviving long corridor as an intentional design change. Do not claim the view bundle fixed from the one endpoint pair.

## Movement and attention assessment

A3 m nominal/2.8 m physical-clear connector is not inherently unsuitable for5v5. It can establish a deliberate commitment and resource/coordination cost while the direct East default remains an alternative. For the unchanged .5 m diameter body, the plan does not by itself imply a single-file body passage. It also does not prove that the follower can see the first contact or that several players can retreat through one another.

The stated western staging rectangle X56..60/Y30..38 is partly occupied by BLD-LE. Its northern face is aroundY34; the usable western mouth is closer to X56..60/Y34..38. Correct that handoff rather than claiming an8 m-deep open staging area. The eastern room X68..82/Y30..38 remains substantial in this initial version before E-01 forces the next turn.

A player holding the narrow pass from one end may only need one forward view while teammates own the rear. That is a legitimate situational allocation, not automatic camping failure. If the rear or opposite route becomes threatened, the same player must turn or receive teammate coverage. Assess the first visible emergence at corners and the objective's timing, not only hidden portal centers or100° counts.

For a west-to-east attack, inspect an entry leaning past the return and the follower's actual view before the entry is fully exposed to the eastern room. From east to west, inspect whether the larger room permits choosing a side, preparing utility and recovering after contact. The pass itself provides no intermediate side escape, so retreat under pressure is an intentional cost that must not be relabeled safe support.

## Focused architectural alternatives

One option is to extend the same attached wing towardX78 so existing E-01 becomes the opposing return. EE's anchor(80,32) can remain in a smaller room. This creates an actual S transition without another freestanding prop, but lengthens the approximately2.8 m-wide commitment to about18 m; review its utility burden, follower support and exit clearing.

Another is a localized opposing projection from the northern building façade into the eastern room, with enough corner overlap to interrupt the bundle and enough width/turning space for the intended body. That retains a larger east staging room but creates another architectural interface to inspect. These are alternatives, not mandatory dimensions or a universal corridor recipe.

## Population and route tests

**5v5:** compare spending two or three attackers to contest this connector with using direct East or another objective. A team should be able to stage a coordinated entry and reset before commitment; it need not clear every hold alone. Check a defender refusing to advance and an attacker switching to the East default. Do not assume a smoke diameter or flash success without the actual engine tools.

**2v2:** holding the pass consumes one player's attention while the other route/objective remains consequential. Test whether the second player can support rather than simply queue behind a blind corner. After a casualty, inspect retreat versus commitment and whether a flank arrives before the objective resolves.

Direct East default from T via the east feed remains independent of the proposed X60..68 wing. It still meets Elbow/East Long near the existing return; the new route is a contested connection into that network, not the only way to B. Protected spawn areas, body dimensions and sightline thresholds stay unchanged.

## Next gate

Update the affected drawing/ledger, independently recheck spatial and tactical consequences, then model. Re-scan nearby pairs and diagonal bundles, re-run protected spawn/upper pairs, replay affected ordinary routes and inspect both mouth/follower/retreat views. A remaining intentional long lane can be defended with actual costs and counterplay; an unperformed fall, grenade or multiplayer test cannot be called passed. No source geometry was edited by this review.


## Opposing-return revision and final local gate

Independently re-read the updated proposal/diagram with `EL-north-return` X72..76/Y33..38/topZ9, attached to BLD-2-0's south face. The corrected western mouth is explicitly X56..60/Y34..38. EE anchor(80,32) and existing route marker(79,32) remain clear; they are not moved to evade the test.

The two returns form an actual S connection: an8 m upper passage, a4×8 m turning room and a4 m lower passage. Both passages have about2.8 m physical clear width. The opposing wings overlap in Y33..35 but remain4 m apart in X, leaving a genuine turn rather than an18 m continuous narrow corridor. The upper passage limits the diagonal that can reach the lower opening; this changes the sightline bundle rather than clipping one extreme endpoint.

Independent analytic revision probes now show the first return blocks the original65.31 m ray and the north return blocks both neighboring64.78/64.63 m rays. Contacts for the latter are(72,34.65625,1.61) and(72,35.390625,1.61). Evidence: `generated/spillway/elbow-proposal-rays-r07-revised.json`. These remain current R07 mesh plus proposed-solid predictions, not an R08 compiled pass.

The turning room gives a small team a real place to choose a side, clear the next corner, prepare or reset. It does not let a follower automatically see around both corners; that support burden is an intentional cost requiring a second position, coordinated timing or available utility. An entrant can retreat toward its original mouth, while a player deep in a pass remains committed. Direct East default still reaches the eastern network without using this contested connector, preserving an allocation choice for5v5 and a consequential alternative for2v2.

A one-sided local hold remains possible when teammates own the rear. It is not an all-map objective hold; the opposite mouth and other routes remain threats when ownership changes. Check both first-appearance corners and the adjacent room after compilation, retaining hidden-threat uncertainty rather than treating fewer visible portal samples as proof against camping.

**Accepted for the local tactical layout stage.** No consequential tactical defect remains in the reviewed proposal. Modeling may proceed after the separate spatial gate. Final acceptance still requires actual R08 visibility/neighbor-bundle scans, unchanged spawn/eye/threshold checks, the full LM→east-elbow local route bounded at44 m (preventing a remote T-feed detour from masking failure), and entry/follower/retreat captures in both directions. No multiplayer, grenade, crouch or combat behavior is certified.
