# Fusion B04 — compiled strategy and player-behavior review

Date: 2026-11-11. Reviewer: `skill_forward_review`.
Source SHA-256: `67e6d4fc42c5262f0b968956dc00ca6b7a90b261b9a41d2b4134b70ecae7f3e6`.
Physical hash: `7990fe0db0323f5136884b8d9022ac6083b957e98ccef729fd5a3a31d081ed68`.
Render hash: `cf6980d7edddf17cffee6ea456819d06040c332008426a0304ecef252dc8dcb0`.

**Final verdict: accepted as a compiled strategic blockout.** No required
strategic geometry change is identified from the inspected evidence. The
central defender-spawn experiment has achieved its geometric purpose and should
be retained. This reviewer proposed that experiment, so independent assessment of
its gameplay consequences also belongs to the separate spatial reviewer.

## Evidence inspected

First examined the nine actual B04 captures, their camera metadata, the compiled
source, build summary and movement/optical results. Also rendered and inspected
`planning/layout-l03.svg`; the author's `layout-contract.md` was then read as intent,
not as proof. The capture source hash, current AML hash and check-report source hash
match. Overview hides roofs deliberately; the eight perspective views retain roofs.

The return review inspected 27 focused roof-visible captures from
`generated/fusion/capture-b04-sections/`, their metadata, and
`generated/fusion/sections-b04-r2/report.json`. Their source and render hashes match
the B04 identity above. All 31 camera body placements and all ten authored starts
pass. All 60 sampled rays from those starts are blocked. The southwest arc passes
in both directions, approximately 15.45 m each, and both gallery stair traces pass.
These close the specific missing physical and opposing-view evidence; they do not
turn the review into a multiplayer playtest.

The build succeeds. Navigation reports zero uncovered samples and no unreachable
markers. All 26 directional physical-inspection replays pass, using the .35 m radius,
1.8 m height and .3 m step body with bounded .04 m requests over eroded navigation.
All 19 tested placements pass. This is sampled, collision-aware inspection movement,
not continuous swept physics or multiplayer throughput. The 44 optical samples and
40 spawn-offset rays are finite point-to-point checks. No human play, gunfire,
penetration, utility, audio or competitive result was observed.

## What the compiled spaces establish

The reactor is an occupied spatial relationship: a guarded temporary annular deck,
three narrow approaches through actual machine structure, an enclosed northern
interior and an open work arc. The surrounding machine pit does not provide a second
walking circuit. The north interior's curved wall and inner mass hide the sampled
opposite southern point; the rendered interiors show real curved views and a local
weld-cart refuge rather than an abstract circular corridor.

The southern arrival is meaningfully exposed. The checked W-port and E-port points
both see the open-arc point `(0,-2.5)` at standing and lower eye heights. Therefore
S Bridge does not independently grant a safe switch to either site. Its entrant must
deal with port ownership, support or utility before exploiting the ring's choice.
Holding both ports consumes defenders who could otherwise cover the outer routes;
that cost is a useful strategic hypothesis, not an observed balancing fact.

The west gallery has position-dependent support relationships. Its checked standing position
sees the checked standing W-port position, but not A's plant anchor. The A-side
gallery point sees neither the W-port sample nor the plant anchor behind the cask.
The broader 39-position gallery survey chiefly exposes the Cask approach; its
tested points do not expose the plant anchor. That survey is not the full upper
area. The separate six-position landing rays in
`reviews/evidence/gallery-landing-rays-b04.json` find an exception: from assumed
feet `(-27.5,15,3.21)`, a standing eye sees the standing plant-anchor target and
the near W-mouth `(-19,4)`, but not the inner bridge `(-12,4)`. These are finite
optical rays; that exact origin was not independently body-placed in the ray file.
The plant and near-mouth directions are approximately 119 degrees apart, so this
is an alternating attention opportunity, not one forward view controlling both.
Do not claim blanket gallery/plant separation. The actual Hot Cell
view shows a substantial cask dividing the lower space and the gallery/stair volume
above it. A player cannot assume that reaching any upper point settles the plant fight.

At B, the port-entry ray to the plant is blocked by the plinth. The actual southern
approach view and lowered-trench view show the ramp commitment and distinct sides
of the equipment. The bypass-to-port-entry sample is open. Choosing the bypass
therefore avoids a level transition but does not avoid port-side contest.

The two checked rear-arrival points cannot see their plant anchors. This supports
the intended separation between protected travel and objective influence at those
positions. It does not establish every ray across the full plant area or every
possible rear offset. The return rear-arrival and offset captures show the screen
and cask/plinth commitment from both sites. Spawn evidence now includes all five
authored starts on each side, in addition to the original center-offset samples.

## Spawn experiment disposition

**Retain the centered defender start.** Current compiler paths from `(0,30)` are
39.81 m to A and 45.53 m to B, compared with the B02 center paths of 53.89 m and
31.97 m. Current attacker paths are 51.48 m to A and 77.02 m to B. Physical replays
of the current defender paths travel approximately 39.88 m and 45.54 m successfully.
The direction and scale agree with the prior bounded spawn study. B04 also includes
clearance repairs, so every centimetre of change is not attributed solely to spawn.

The edit addresses an east-biased initial allocation without adding a fourth reactor
port or making all later rotations faster. It gives defenders a credible A setup
journey while retaining a shorter journey to B than the attacker's. Site-anchor
distance does not establish first contact, preparation completion or equal site
strength. Earlier Cask/W-port aggression and B-bound switchboard congestion remain
specific playtest questions, not reasons to undo the variant without evidence.

The five defender centers are spread over x=-4..4 at y=30. Their intended bodies do
not initially overlap and all pass placement. The centered-spawn and switchboard
captures show interrupted rear sightlines and a deliberate turn around equipment;
the route replay establishes passage but not two-player follower support in combat.
The separate spatial review is required to assess
the consequences independently of this proposal author.

## Five-versus-five plans and disruption

A concrete hypothesis is two attackers developing the western journey, a vessel
probe, and two developing Cooling/Power. The western pair can choose ground entry
or gallery support; the probe can join W port only after the ring entry has become
usable. A defender pair occupying the ports can contest that probe but relinquishes
presence in the sites or outer approaches. Attackers can exploit that allocation
through an outer commitment rather than being compelled to win the ring every round.

For a coordinated A attack, a Cask entrant and a W-port entrant approach different
faces of the cask. A gallery observer is an additional job, not free information
provided by the architecture. If that observer is suppressed or lost, the ground
entrant must recheck, wait for the port partner, or change plan. If the port partner
is lost, pushing the same clear at the same time is no longer supported. The map
provides regrouping and alternate destination routes but does not guarantee a free
substitution under every casualty state.

At B, a player in the bypass can threaten the port-side entry while a teammate uses
the trench-side arrival. The plinth creates different local duties, but suppressing
one arrival may allow defenders to concentrate on the other. Test the support view
through the ramp transition rather than assuming two entrances produce a simultaneous
crossfire. A single plant-denial holder should not be credited with covering every
side of the plinth without checking actual body and weapon views. In the return
trench leader/follower captures, both cameras see the central rear screen while the
follower's lower and more distant position reveals less of its left side. This
supports a staged exit hypothesis, not an assumption that the trailing player can
immediately trade every duel taken by the leader. The bypass is a separate choice
with a different exposure sequence, not merely a longer duplicate of the ramp.

## Three-versus-three stress case

This is a relevant casualty/population stress case, not a demand that the whole map
be balanced as a separate 3v3 mode. Three players cannot simultaneously staff both
outer fronts, a vessel probe, a gallery observer and a flank watch. A pair committing
to one site with a third player investigating or containing the relevant return is
more plausible than reproducing a five-player execute with missing support.

The ring's changing ports let the third player retain a threat or change destination,
but the approximately 80.18 m physically replayed site-to-site path demonstrates
that a late full-site switch is substantial. A player already in the north arc has
a different opportunity from one still at the old plant anchor. The W-port-to-north
and north-to-E physical replays total roughly 28.19 m; those local transfers only
help a team that has already gained the necessary territory.

Losing one of three players should cause a deliberate simplification: concede an
unwatched port, bypass the gallery, shorten the objective plan or reunite the pair.
There is no claim that every entry can remain continuously watched. The absence of
a rear-to-reactor shortcut preserves that allocation problem rather than making a
single central player an automatic answer to both sites.

## Two-versus-two after an objective interaction

With a plant at A, two attackers can divide immediate objective denial and a likely
arrival, but cannot also occupy the gallery, both ports and the rear exit. A defender
already near a captured port can combine with a rear responder to create separated
arrivals. If both defenders start in Rear Services, the distant-port flank consumes
additional territory acquisition and travel; it is not automatically a timely retake.
The same distinction applies at B.

The blocked plant ray gives a player at the port-support window a reason to
reposition after planting. The A-landing exception offers a possible upper
plant-anchor watch without descending, at the cost of exposure and turning away
from the near port mouth; it does not provide simultaneous inner-bridge control.
Keeping a gallery player may therefore support arrival information or a particular
plant-side duel, but it still sacrifices immediate physical objective presence.
If their ground partner is lost, the survivor must choose among watching the
objective, checking a rear arrival and reaching the interaction; the upper hold
does not perform all three jobs. When the clock is short, retakers may rationally
bypass the upper route. A switch to another side
of the cask/plinth can change the next duel without requiring a complete map rotation.

The available evidence contains no actual round timer, defuse/plant duration or
equipment consumption. Retake feasibility therefore remains conditional on those
mechanics and initial survivor positions. No win probability is assigned.

## Information and reaction constraints

The gallery's checked standing-to-standing W-port ray is open; changing either end
to the configured lower eye height blocks that particular ray. A low eye target
sample does not prove that the target's entire crouched body is concealed. The
observer also loses information when below the aperture sill. Preserve this as a
stance-dependent observation opportunity and verify whole-body visibility in the
target engine.

Information is useful to a staged ground teammate who can act promptly. The observer
having to descend and move around the cask to interact is a different action with
delay. The checked gallery-to-A route alone is about 23.62 m of physical-inspection
travel. The port window lacks a direct plant view, and the A landing's two open
rays still cannot certify the entire site. A port sighting must be updated when the target can turn into an
unseen arc or pass the sampled sightline.

An upper player should abandon or change their hold when the relevant ground
support is lost, the objective phase demands a direct interaction, B becomes the
urgent objective, or the useful arrival has already passed. Conversely, a player
already at the exposed A landing may rationally remain for a plant-side fight.
Low usage of that position would not by itself demonstrate failed geometry.

Rear response similarly needs credible information: a noisy probe, partial sighting
or missing port defender can induce a wrong rotation. Actual sound propagation and
utility behavior are untested, so deception is a scenario hypothesis supported by
separate routes, not a verified mechanic.

## Optional improvements and stopping decision

No new geometry experiment is selected for this delivery. Retain the centered spawn
and current ring/site relationships for playtesting. Two bounded future comparisons
are worthwhile only if observed play identifies the corresponding problem:

- If two port holders repeatedly make the southern bridge arrival unusable despite
  feasible outer pressure, compare a localized work fixture at one side of the
  south junction that permits a staged peek while preserving its exposed commitment.
  Do not shrink or distort the reactor to solve that problem, and do not install a
  full protected central shortcut by default.
- If the B pair repeatedly loses follower support at the switchboard turn, compare
  a small placement change to that baffle while retaining its cross-map sightline
  interruption. Do not remove it merely to equalize route lengths.

These ideas remain deferred. Neither finite rays nor the current route distances
demonstrate those problems. More connections, safer crossings and equal usage are
not acceptance criteria.

## Closure and remaining limits

The requested return evidence is complete: rear A/B arrivals and offsets,
W-port-to-gallery, centered D spawn, switchboard turn, all authored spawn placements,
and both directions of the southwest arc. Stair leader/follower and low-cover
standing/lower-eye captures further qualify the local support relationships.
The lower-eye captures show the observation cost of dropping behind the low cover;
they do not establish full-body concealment, bullet protection or target hitboxes.

The selected spawn variant is retained and no additional geometry experiment is
needed for this gate. Actual first-contact times, coordinated trading, utility,
whole-body stance exposure, casualty recovery and post-plant timing remain
playtest questions. Acceptance here means the compiled map supports coherent,
inspectable strategic hypotheses with the specified routes physically sampled;
it does not certify competitive balance.
