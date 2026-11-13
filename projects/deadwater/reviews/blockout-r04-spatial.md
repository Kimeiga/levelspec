# R04 / L04 independent spatial, visibility and construction review

**Verdict: changes required locally to low cover.** Construction, claimed
circulation, spawn shelter and baffle closure are accepted at this revision's
evidence level. Three low refuges fail the intended crouched-versus-standing
optical case. A local height repair and return check are required; the accepted
macro layout and unaffected geometry do not need to restart review.

## Revision and evidence

Inspected AML, drawing, brief and inventory before author rationale. Visually
inspected all 25 PNGs in `generated/deadwater/captures-r04/`, including opposing
entries, stair midpoints and reverse views, the CT north spawn offset, low-eye
cover views, and three orthographic volume views. Then considered `design.md`.

`level.aml`, `captures-r04/loaded.aml` and `capture.json` agree on SHA-256
`b68ed1b09a213ad6ea3cab686e13f8791c1a4b4c46b9d098e746e78edad3bb02`.
Capture errors are empty. The strict R04 build succeeds with zero diagnostics;
its report explicitly does not verify gameplay reachability.

The supplied physical inspection record replays 25 routes in both directions
(50 journeys), retains supported trace positions and places all 24 markers with
the authored body unchanged. It rejects five sampled points inside machinery or
in the sea void. These are existing-navigation plus physical support/headroom
checks with bounded substeps, not continuous capsule sweeps. Browser records
add six real stair journeys, both CT-screen passages and actual standing-to-crouch
changes at V-console, A-cable and B-pump, with no browser errors. The browser
walking session used its default 0.0625 m nav cell, whereas capture, strict build
and programmatic route replay use 0.125 m. Neither body dimensions nor step limits
were relaxed.

## Construction and circulation

The three orthographic captures show an integrated raised drilling/rear circuit
and lower process/cargo circuit on visible supports. Slabs have thickness;
stair undersides and flanking infill close the intended volumes; the offshore
voids remain outside the claimed circulation. The source and views show real
portal headers and tall machinery with solid bases rather than foot slits.

SW and SA have 16 rises over 8 m; SB has 16 over 6 m. All rise 2.40 m in
0.15 m increments, with 6 m nominal width and full landings. Browser standing
feet reach the upper landings at about z2.41 and return to z0.01 in both
directions. SW travels from y39 to approximately49.07; SA y43 to55.10; SB y53
to61.05. The reverse records reach the corresponding lower feet. The combined
source/volume views and successful supported passage provide no evidence of a
missing tread, broken landing seam or obstructed occupied headroom along these
routes. Portal clearance is3.4 m; the V/Q canopy undersides stand respectively
4.55/4.15 m over their decks, exceeding the3.6 m contract.

The extended CT-screen retains its intended north and south passages: actual
browser bodies cross x54→approximately 47.96 at y74.8 and y63.4 without changing
height, stance or radius. The baffles are physical opaque members spanning the
slab interfaces: inventory WX-A-south maps to `bulkhead-030`, WX-A-return to
`bulkhead-037`/`bulkhead-073`, and WX-R-south to `bulkhead-041`. Their bottoms
start at z2.05 within the0.35 m upper slab and tops reach z5.20, avoiding a
deliberate feet gap at the examined boundaries.

## Dedicated eight-section visibility pass

| Section | Compiled observations and qualification |
| --- | --- |
| 1 · T/F | `cargo-exit` and `freight-reverse` show the container as a solid turn/occluder with wide routes around it. O02 and nearby bulkheads preserve sequential freight/Valve clearing rather than expose both sites from spawn. The full round-start opponent-spawn exposure check remains part of the optical packet. Container shelter is local; an enemy who earns Freight can pressure the Cargo pocket from its open sides. |
| 2 · W/V | `sea-walk` shows an unobstructed approach to the West stair, with actual doorway depth, a foot landing and side infill. `valve-entry` shows the tall filter separating the lateral entry from the onward sectors, with the console beyond; `valve-low` shows the low-eye reset behind the console. Actual browser stance changes confirm crouch affects body and eye here. This is directional low cover with lateral exposure, not a standing protective wall. |
| 3 · SW/SA | `west-mid`, `west-head`, `short-mid` and `short-reverse` show the actual ascending, occupied and reverse volumes. The open doorway makes the last ascent a commitment, while headers and side masses retain a meaningful clearing threshold. SA's larger upper landing lets the follower pause before O13. Six browser walks establish sampled physical passage, not fairness of these encounters. Intermediate body and2 m follower optical probes remain to be adjudicated. |
| 4 · A | `a-overview` confirms both plinth flanks, the toolhouse, low alcove/rear refuges and a clear plant cue. `a-east-hold` confirms the predicted exposed fan: both T entry sectors and plant can fit in the same75° view from east A. The observer has open incoming lines from those entries, so this is not evidence of a protected all-seeing hold. `west-head` shows the plinth screening the immediate West-entry sector; `short-reverse` confirms the lower retreat/approach visibility. A-cable's actual crouch view is screened at low eye while standing exposure and eastern flank remain meaningful. |
| 5 · C/P | `pipe-entry` and `pipe-reverse` show the manifold actually breaking the direct Valve/B line while leaving different north/south slices. `compressor-exit` shows a south-B entrant meeting the tank field rather than seeing through the entire site. Door widths preserve passing room without removing corner commitment. `rear-baffle` is fully occluded by the intended south screen; the other A/Valve wind-baffle diagonals require the optical packet. |
| 6 · B | `b-overview`, `b-west-entry`, `compressor-exit` and `b-plant-reverse` confirm distinct west/south fronts, sealed tank bases and traversable tank-end spaces. R04's rounded crowns retain the same tactical footprints; opaque2 m pedestals remain above same-deck standing/crouched eyes. No foot slits appear in the examined views. `b-pump-low` and the actual browser crouch show a usable directional low refuge; the source/overview also make clear it can be flanked. The plant cue is clear of the tanks. Unsupported trigger-volume, penetration and weapon exposure claims are excluded. |
| 7 · SB/Q | `b-stair-foot`, `b-stair-mid`, `b-stair-head` and `control-reverse` show clear, broad stairs with real head/foot landings and a reverse view through the tank field. Q-lockers offset the high-side doorway. The upper player gets a downward view into B but does not obtain an unobstructed panorama through both tanks. Actual walks exercise both directions. A pair can physically stage; simultaneous trading and smoke/flash effectiveness remain unmeasured. |
| 8 · R | `ct-spawn-offset` confirms that the formerly exposed north anchor is now behind the extended solid screen. Both passages are physically exercised. The low sea-edge overlook from Muster into Pipe is blocked in `rear-baffle`. Complete aperture/anchor-offset rays and remaining baffle endpoints are retained for targeted optical adjudication rather than inferred from these two pictures alone. |

## Open limits and destination-engine checks

- Flanking stair infill tops are physically at the raised landing elevation.
  The claimed harness routes stay on admitted landing/stair navigation; the
  packet does not establish whether a destination engine lets players step
  around the sloped guard ends onto those side shelves. Treat those tops and
  their outer-edge boundaries as an explicit engine walkable-surface check.
  No alternate side route is accepted or advertised by this review.
- The independent collision-export consumer reaches all four spawn/site pairs,
  but CT→B takes approximately80 m through its sampled planner, compared with
 38.9 m for the intended native route. That record establishes a reachable
  consumer journey, not independent confirmation of the intended SB opening
  route or its timing. The native browser SB walks are separate evidence.
- Static rays and single-player walking do not establish teammate body blocking,
  trading, bullet resistance, grenade behavior, audio, plant bounds, defusal
  rules, fall behavior or competitive balance. Live 5v5 evaluation is still
  required for the proposed exposed climbs and2v3 retakes.

No selected camera pose, screenshot, navigation success or material label is
treated as proof of those unavailable mechanics.

## Targeted optical adjudication

The subsequently delivered `inspection-r04/visibility.json` matches the source
hash above. It uses native opaque render geometry separately from navigation,
with no unknown materials or omitted dynamic faces. Poses are physically
re-placed, and stair samples come from the actual performed walk traces rather
than guessed linear height interpolation. Its rays are targeted finite samples,
not a complete visibility proof.

- CT shelter: 3,960 doorway/anchor-offset eye-ray combinations yield zero visible
  pairs, covering standing/crouched eyes at five CT anchors with ±0.25 m XY
  offsets and two near-door observer strips. The north offset picture and
  screen/passage construction agree with the result. This closes the earlier
  demonstrated diagonal defect at the sampled scope.
- Wind baffles: all 36 upper-A/Muster-to-lower-Valve/Pipe test rays are occluded.
  This agrees with source contact/height and the actual rear-baffle image. No
  tested endpoint escapes a baffle.
- Fifteen actual supported stair stations include feet/low-body/torso/head
  targets and a follower about 2 m behind. SW's chosen A hold sees the entrant
  only near the crest, while the follower at that instant remains occluded.
  Thus the lead can be isolated briefly; this is the stated final-ascent
  commitment and requires utility/team timing playtests, not a claim of easy
  trades. SA's hold sees standing entrants throughout, with crouch hiding only
  the earliest sample; standing followers share its fight. SB's selected upper
  hold sees entrants and followers throughout most of the flight. Intermediate
  low feet often remain screened while torso/head become exposed. These are
  real exposure costs consistent with the authored climbs, not missing stairs.
- **V-R04-01 — supported local cover defect.** At approximately 0.6 m setback,
  A-cable, A-reel and P-cart expose the crouched eye to the selected standing
  opponent despite blocking it when both are crouched. V-console and B-pump
  already block that standing-opponent ray. All five expose standing eyes as
  intended. The three failures are consequential because these props are
  described as preparation/reset refuges; a low-eye camera picture alone
  concealed the failure. Raising low-cover tops from 1.10 to 1.20 m is a focused
  proposed repair, preserving their footprints, passing space and standing
  head exposure. Recheck each from the same supported opposing poses and
  recapture affected low-eye views before closing the finding. This repair
  does not promise protection from every distance, flank or elevated angle.

R05 may reuse this revision's accepted route/stair/spawn/baffle evidence if an
exact AML comparison confirms that only the five specified cover heights and
revision descriptions changed. The low-cover finding requires its own matching
source, compiled and visual return evidence.
