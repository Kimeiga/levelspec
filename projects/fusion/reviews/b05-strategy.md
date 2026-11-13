# B05-04 compiled strategy review

Reviewer: `skill_forward_review`. **Accepted for the compiled strategy/player
behavior scope of B05-04.** Retain the central stair. The equatorial reactor
route competes with the outer B approach, the lower route supports a meaningful
freight redirect, and the new stair changes lower commitment/recovery. The
crown has specific prepared support, workroom and wing-arrival roles with
measured return costs. No further geometry change is required by this review.
This is blockout acceptance with the target-engine/playtest limits below,
not a competitive-balance finding. No canonical geometry was changed by this
review.

## Revision and evidence contract

Canonical source SHA256:
`ffb88349afb29e19abc0b2b578e0d7ad93b25a26b8eeedf0de623057bbb56c85`.
Its immutable measurement copy is
`generated/fusion/strategy-source-b05-04.aml`.
Compiled physical hash:
`b7894bb7b1cb61a2cac76253026f1f210fc38d3d2b2100b432cd3531038fb85e`;
render hash:
`9c183721e1026d9fddbde9c5bb6b35bc6e8c8a045bc87d7cd0828daa7bf2dacd`.
Accepted strategy helper SHA256:
`13398bff87b8ea0e4e4556fda6007f449f0c452affe4b0e1607e1712aa315d59`.
Repaired physical inspector SHA256:
`b55343df25c4303fcd6d838cefb711439f4375324a0ed1f53ce7d36b02b0116a`.

The separate native stair-absent source is
`generated/fusion/variants/no-central-stair.aml`, SHA256
`45bbe2c58941b7a30716b5e3344e519a66e9a0d1224ec61a6ecad53edd4c1816`.
The semantic audit in `generated/fusion/strategy-variant-audit.json` confirms
removal of the central flight/guards/curve, restoration of the equatorial hatch,
and clipping of two local hatch-edge guards. The script also resamples the
equatorial polygon: maximum outer-boundary difference is 0.000651 m, with
0.01388 m² of symmetric difference outside the local hatch mask. This small
precision difference is retained explicitly; the variant is not described as
byte-identical outside the hatch.

The body contract remains radius 0.35 m, height 1.8 m, step 0.3 m, slope 42°,
crouch 1.1 m, vault 0, ladder/rappel false. The strategy helper checks all eight
settings, actual endpoint placement, whole native-path floor/connector bounds,
every 0.04 m physical request, navigation-waypoint height and final XYZ error.
It replays every unique directional leg freshly; sparse prior traces are not
reused. Reported journey distances sum verified independent legs, not a single
uninterrupted multiplayer journey. A native candidate leaving its requested
connector is inconclusive about other conforming paths, not proof of isolation.

## Compiled observations

I inspected the actual overview, north cutaway, reactor-hall and crown images
in `generated/fusion/capture-b05-04-overview` before the final review prose, then
the grounded browser views in `generated/fusion/browser-b05-final`. These show
the reactor's equatorial and lower occupied levels, the crown inside the upper
hall beneath its 16 m roof,
A's freight platform, and B's covered lower chamber. They establish the visible
arrangement, not support rays or complete playable routes by themselves.

The exact-source final section data in
`generated/fusion/sections-b05-final/report.json` gives the following bounded
relationships. The final visual return below closes the corresponding selected
opposing and stair views.

- A's sampled south, east and rear arrivals are screened from the plant. Four
  ground-fed upper arrivals plus the crown connection are therefore competing
  acquisition territories, not five simultaneous direct plant angles. The
  retained gallery feeds the front platform and has a clear sampled reciprocal
  connection to the inner west port at 12.31 m. Its nearby outer west-mouth pair
  is blocked. Credit the actual inner-port target, not blanket west-wing vision.
- At B, the sampled ground rim crossing and lower loading pair are blocked,
  but the distinct west-rim pose `(26.8,12,0)` sees the loading pose
  `(35,10.5,-3.2)` reciprocally at 8.93 m. That west-rim pose cannot see the
  sheltered plant; the partition/shelf intercepts those rays. This is a useful
  upper/lower relationship with a specific position requirement. Moving above
  the site does not perform the lower objective task.
- The east rim has a clear sampled 56 m axial line. It is a deliberate exposed
  pressure route, not evidence that its receiver controls every B descent.
  Keep its approach, shelf branch and lower objective tasks distinct.
- Crown workrooms have clear reciprocal sampled eye rays at 23.48 m. The near
  west/east transfer offsets cannot see the tested inner ground ports. A
  separate admitted east pose at R19.2/30°,
  `(16.627688,13.6,6.4)`, has a clear reciprocal ray to `(13,4.5,0)`;
  the corresponding west R19.2/150° pose is unavailable. This supports a
  **position-specific east-port relationship**, not panoramic crown overwatch
  or a symmetric west support claim. See `detail-report.json` and
  `supplemental-r19.4-report.json` beside the main section report. The separate
  archived `crown-view-access.json` performs the local centerline-to-view-offset
  acquisition and return in 3.24 m each way with the unchanged body. The
  opposing workroom images show why this is meaningful: the view cuts across
  the hall while walking follows the longer north arc, and the east tooling
  requires looking around a particular side.
- The central stair's trace-derived leader and follower samples both see the
  sampled lower receiver. This supports a possible shared optical task; the
  test includes no teammate collision, firing or human reaction. The outer
  lower bypass is still a single-file movement alternative. The section's
  reverse fixed-radius sample initially fails near `(6.35,1.72,-3.19)`; the
  R6.8 reverse trajectory remains a failed sample. The independent native
  strategy paths now pass in both directions, as does the section's explicit
  small inward return (15.74 m). These establish performed alternatives with
  the same geometry/body, not a retroactive pass for the failed trajectory.

## Plausible plans and responses

These are testable player-behavior hypotheses, not observed matches. The target
is 5v5, two objectives; no weapon, utility, audio or objective-clock simulation
is supplied by this inspector. T and D below mean attackers and defenders.

In 5v5, an attack can place two players in the west acquisition space, one at
the southern equatorial decision, and two in the east approach. The west pair
choose a front/gallery acquisition and a relevant port or neighboring crest
task rather than attempting every A stair. The central actor can probe,
rejoin ground, or commit to the lower route; choosing the latter removes their
immediate ground contribution. At B, a lower entrant and a ground-rim observer
have different jobs: the proven rim/loading view can support the open crossing,
but a lower player must clear and occupy the sheltered chamber. A crown player
replaces one of these actors; there is no sixth free scout. Defense can begin
with two players responsible for each objective and one flexible player, then
concede unused territory rather than staffing each connector separately.

After an A support player's loss, surviving front players can keep their local
hold, substitute through a controlled neighboring acquisition, or disengage.
They cannot infer a clear plant just because the gallery has checked an inner
west-port target. A teammate already in the freight well can redirect through
the lower reactor or regain ground; measured M3/M4 costs decide how quickly
that becomes a useful substitute. At B, losing the rim observer removes the
proven loading support. A lower pair can continue with a narrower clearing
plan or wait for a nearby replacement; a distant crown player cannot instantly
replace either the rim angle or lower objective presence. Conversely, losing
the lower player leaves useful information above B but no objective actor.

Count the final front, not just the acquisition route. The lower east reactor
route and the ground-fed B west stair join the same lower workroom. Sending
one survivor through each can reinforce or replace that task, but does not
create two independent plant angles. A separated B arrival needs territory
such as the trench/loading or rear descent as well. Similarly, the east crown
transfer returns through ground rear territory before descending to B; it is
not a fourth direct lower-site entrance. These convergences keep the extra
connections consequential without assigning an additional guard to every
named route.

In 3v3, use a local pair and one relevant third task. A third player already in
east crown territory may update the inner-port picture from the proven offset,
but that report ages while the observer travels through the wing levels.
The information is most useful to a teammate already able to act at the port;
it is not a permanent statement about the lower B room. After another casualty,
collapse toward a held connector or the objective rather than preserving the
full early-round spread. The central stair now has a measured local recovery
benefit against the actual stair-absent west detour, described below. That
creates a possible simplification of a lower commitment; opponent control
still determines whether the survivor can use it.

In 2v2 after A is planted, a survivor already at the west crown landing can
contain a northern arrival while their partner maintains objective presence.
Leaving for the full crown crossing gives up that local contribution. Two
retakers beginning in eastern ground territory still owe travel and ascent;
the existence of a high connection is not a timely flank. After B is planted,
a crown or rim survivor must decide whether information/support remains useful
or whether to descend to the actual interaction. A distant pair cannot claim
both a prompt lower contact and a late rear/crown flank without enough clock.
The measured same-origin routes bound travel distance; clearances,
opponents, weapon readiness and objective actions remain additional costs.

Strong-position abandonment is consequently part of the design. The west
gallery loses value when its checked port is irrelevant or its A partner is
gone. An east crown observer should leave when nobody can act on the port
report, when B needs lower presence, or when the opponent changes objective.
A rim holder may retain a useful loading angle after a B plant, but must move
when the sheltered interaction becomes the decisive task. None of these roles
requires every high position to see a plant.

## Canonical route measurements

`generated/fusion/strategy-b05-04/report.json` verifies **74/74 journeys,
115/115 directional legs and 51/51 requested placements**. All native candidates
remain inside their declared connector/floor reservations, all physical replays
pass, maximum placement offset is 0.010001 m, and maximum final leg endpoint
error is zero. The source/physical/render hashes match those above. The native
lower arc passes in both directions independently of the section's fixed-radius
reverse sample; no geometry or body repair was needed.

The table reports sums of performed physical leg distances in meters. These are
same-origin comparisons where alternatives share a row; they are not round
times. Native distances and all authored start offsets remain in the report.

| Comparison | Performed distance (m) |
| --- | --- |
| Center T→A: gallery / south / port | 57.19 / 62.00 / 96.64 |
| Five T starts→A gallery; five D starts→A rear | 55.90–59.85; 51.97–59.91 |
| Center D→A rear | 55.92 |
| Center T→B: equator / trench / central | 87.82 / 89.97 / 101.99 |
| Center D→B: rear / west descent | 54.30 / 70.51 |
| Freight-low→B: lower / ground; reverse | 85.01 / 94.86; same values in reverse |
| Central-bottom→S-ground / freight-ground | 16.79 / 53.09 |
| B-west-low→inner E ground port | 23.10 |
| A→B: equator / rear / lower / crown | 108.67 / 110.22 / 137.79 / 147.49 |
| B→A: equator / rear / lower / crown | 108.67 / 110.22 / 137.79 / 147.57 |
| Crown west room→A / B | 52.46 / 95.03 |
| Crown east room→A / B | 76.79 / 70.78 |
| West crown A arrival→A | 12.54 |
| East crown mid-level / ground arrival→B | 39.10 / 27.56 |
| Cooling→B: exposed rim/rear / trench | 72.89 / 45.11 |
| Cooling→Control along rim / shelf branch | 54.00 / 48.83 |
| A-south-base→gallery-front / A-east-crest | 43.12 / 24.96 |
| A-east-base→A-south-crest | 24.96 |

A is a close, spawn-dependent acquisition contest, not a proven generous
defensive setup. From the center starts, T reaches gallery-front in 41.64 m and
D reaches the rear crest in 40.67 m; these are different territories, not a
same-target race. The nearest west D start reaches that crest in 36.71 m,
whereas the farthest east D start takes 44.66 m. The earliest T gallery-front
arrival is 40.35 m. This warrants first-contact testing with actual spawn
assignments, clearing and weapons before any fairness claim. It does not alone
prove a geometry defect: both sampled arrivals are screened from the plant,
and the opponent's route and first exposed contact are different tasks.

B retains substantial defender distance advantage through the rear. The central
route is approximately 14.16 m longer than the equatorial B route from the same
center T start; it is not a dominant fast opening. Its prospective value is a
change of level/arrival territory and a local lower escape. Once in freight-low,
the lower redirect to B saves 9.85 m against the tested ground return. From A's
plant anchor, however, acquiring that lower route makes it substantially longer
than the equatorial or rear return. This is why the player's initial territory
matters; the lower route is useful without being the universal A/B shortcut.

Crown remains a meaningful prepared territory, workroom encounter and alternate
upper A arrival, with the bounded east-port support position already established.
It is **not a fast objective rotation**: its A→B route adds 38.82 m against the
tested equatorial route. The direct local A arrival is only 12.54 m from the
plant, but a west workroom occupant still owes 52.46 m. The east mid-level and
ground arrivals owe another 39.10 m and 27.56 m respectively to B. These actual
returns support abandoning a remote high hold when the objective phase changes.
They also preclude treating a rare crown flank as automatically timely in 2v2.
Its asymmetry is acceptable at this evidence level: the west gallery already
supplies the demonstrated west-port support relationship; crown need not
duplicate it symmetrically.

The east rim costs 27.78 m more than the trench from the same Cooling start to
B. It purchases different rear/shelf pressure while accepting the proven long
axial exposure. It should not be advertised as a faster safe B entry. Likewise,
substituting from A's south base to its east crest is approximately 18.16 m less
travel than reacquiring the gallery-front route; that option is only useful
when the intervening ground remains controlled.

## Selected central-stair experiment

The stair-absent main run verifies 68/74 journeys and 113/115 directional legs.
All 51 placements pass. The only two rejected legs request the removed flight
in opposing directions: their native candidates leave the reserved central
connector and are retained as unavailable. Consequently the five T→B central
chains and direct central-ground reset are unavailable in this control. This
is not a claim that those endpoints are globally disconnected; the native
queries find longer routes outside the requested central connector.

The parent independently accepted a narrow supplementary M4 helper, SHA256
`f755306a8045a45f6045dbd53df4cfdf646452512a364f3f68cbaa5d1573b1ca`,
which retains the strict replay/body semantics and compares two identical
central-bottom/S-ground endpoint pairs: direct flight versus
lower-west→freight-low→freight-ground→A-east-base→west-port→S-ground. After
memory-pressure interruptions, the successful runs were performed sequentially
in `strategy-b05-04-m4-west-r2` and `strategy-b05-04-no-stair-m4-west-r2` under
`generated/fusion`. All eight supplemental placements pass in each source;
both canonical chains pass, and the control's west detour passes while the
absent direct flight remains unavailable. Initial interrupted runs and partial
captures are excluded, as documented by `strategy-interruption-note.json`.

| Same endpoints and ordered route | Stair present (m) | Stair absent (m) |
| --- | --- | --- |
| Center T→B via trench | 89.97 | 89.97 |
| Center T→B via ground equator | 87.82 | 87.33 |
| Center T→B via central flight | 101.99 | Unavailable as requested |
| Freight-low→B via lower arc | 85.01 | 82.73 |
| B→freight-low via lower arc | 85.01 | 82.73 |
| Freight-low↔B via ground | 94.86 each way | 94.86 each way |
| Central-bottom→freight-ground via west | 53.09 | 50.16 |
| Central-bottom→S-ground via central flight | 16.79 | Unavailable as requested |
| Central-bottom→S-ground via west freight/port | 83.31 | 80.22 |
| B-west-low→E ground port | 23.10 | 23.10 |

**Retain the central stair on the measured strategic evidence.** Against the
tested stair-absent west detour, it reduces the same-endpoint lower-to-ground
recovery by 63.43 m. The price is a 2.28 m increase in the tested through-lower
freight/B journey, a narrow bypass, and an additional entrance that a lower
holder must account for. The ground B journey grows by about 0.49 m around the
hatch. These are consequential differences; the feature changes commitment and
recovery rather than merely adding visual height. The control's restored floor
and removed flight are real native geometry, not a disabled graph edge.

The 80.22 m west detour is **one tested substitute, not a proven global minimum**
for stair-absent escape. The direct stair is also not automatically safe: a
player recovering upward may encounter someone at the southern equator, and
the new three-way lower junction requires a different information task from the
two-ended control. The central opening does not create an overwhelmingly fast
initial B attack, as the same-origin opening-route measurements show. In 3v3 or
after support loss, however, it lets a lower survivor simplify and rejoin
ground without the tested full west excursion. This is a credible reason to
choose the added complexity, with match-specific timing still to test.

The compact retained comparison is
[`evidence/b05-strategy-measurements.json`](evidence/b05-strategy-measurements.json).
It preserves all journey endpoints/distances, unchanged body settings, rejected
legs and SHA256 links to full path/replay reports. Full evidence is also archived
by the author under `evidence/b05`.

## Final visual return and playtest limits

The source-off restored-hatch view is complete in
`generated/fusion/capture-strategy-central-off-r2`. Its loaded AML and render
hash match the validated variant, roofs are visible, and the capture has no
browser errors. The actual image shows continuous equatorial floor over the
former central hatch from the admitted S-ground eye position.

The source-on r3 run produced 52 individually camera-checked images before a
browser execution-context interruption. That run remains recorded as partial.
I inspected its completed A arrivals, B chamber/rim, gallery opposing, crown
workroom and transfer, east-rim, A-south leader/follower and B-loading low-eye
images. The remaining 36 views completed in
`generated/fusion/capture-b05-final-sections-r4`; its loaded source matches the
canonical SHA, every recorded view has the canonical render hash, and its
manifest records two successfully recovered navigation interruptions. I
inspected the central leader/follower views in both directions, the west/east
crown stair transfers, the exact east crown/inner-port pair, and the B
west-rim/loading/plant views. The capture helper
for r4 is SHA256
`387bb63c1dab87b4ec419394e8943a5894681c3fa1df6fe5ce800a02dac4deba`.

The central down-flight images expose the eastern lower junction from both
sampled stair positions; the up-flight images reveal the ground west-port
relationship as the player emerges. They do not show simultaneous whole-ring
control or a guaranteed teammate trade. The crown support images frame the
tested port through the parapet/coil geometry, confirming a specific optical
connection rather than general overhead coverage. The west crown stair arrives facing a
wall/parapet before turning along the service walk; it does not grant immediate
broad support. The east transfer likewise has distinct guarded landing and
stair stages. The B west-rim pair shows
the loading opening while the solid shelf/partition still screens the plant.
The selected low-eye loading comparison changes the foreground masking without
eliminating its tested standing-target ray; it does not establish complete
crouched cover. No inspected view requires reversing the measured feature
disposition or the scenario assumptions above.

The retained image/manifest identity record is
[`evidence/b05-strategy-visual-return.json`](evidence/b05-strategy-visual-return.json).
No capture or measurement job remains pending for this strategy scope. The
consequential target-engine scenarios remain:

- A's gallery/front versus rear-crest first contact across actual start
  assignments, including the close center-start distances. Preserve the
  distinction between reaching a plant anchor and preparing the first duel.
- A 3v3 lower commitment, loss of its ground support, and a central-stair
  recovery with an opponent able to take the top. Test actual attention,
  sound, utility and teammate throughput; single-body success does not prove
  a reliable two-player trade through the narrow bypass.
- A 2v2 objective transition with one player already in a crown room versus
  both players far from the relevant wing. Test the actual clock and departure
  decision against the measured return costs, not a hypothetical instant flank.
- The east rim's north receiver against the shelf, BR-low, trench/loading and
  axial approach. The current evidence proves the axial view only; it proves
  neither simultaneous denial of all branches nor safety from that receiver.

No additional geometry experiment is selected solely to equalize route lengths
or to make both crown ends perform the same job. If actual A first-contact
tests expose a compulsory early duel, a focused comparison of its front landing
screen/next corner is the appropriate next experiment before another whole-map
connection. If a crown player consistently arrives too late to affect any
relevant task, revise that specific transfer or support relationship using
observed departures; rare use by itself is not a defect.
