# Fusion B03 — focused defender-spawn study

Date: 2026-11-11. Reviewer: `skill_forward_review`.
Scope: compare the existing defender center `(13,30,0)` with a center at `(0,30,0)`
and five proposed starts at x=`-4,-2,0,2,4`, y=`30`. Rear geometry is retained.
No canonical geometry, spawn or skill files were changed by this review.

**Recommendation: adopt the central start as the next bounded blockout variant.**
It offers a credible improvement in A setup access while retaining a shorter
defender journey to B. This is not proof of setup timing or competitive balance;
the final revision needs recomputed routes and physical/visibility inspection.

## Evidence and comparison

Read `generated/fusion/validation-b02.json`, including all thirteen reachable
declared paths, navigation settings and path coordinates. The report's overall
success is still **false** because another sampled coverage issue is unresolved;
reachable paths do not override that failure. B03's clearance repairs were compiling
separately and are not included in this study's geometry evidence.

The existing D-to-A path first goes north around `rear-switchboard` at x=6..9,
y=27..31 before heading west. Moving the starts to x=-4..4 removes that initial
detour from the A journey. B-bound players, conversely, must now negotiate it.

The read-only study joins each proposed start to existing B02 path suffixes. A paths
join the established western rear waypoint `(-21,28)`; B paths pass the existing
northern switchboard waypoints before rejoining the eastern route. Samples at
intervals no greater than .2 m check inclusion on the existing eroded nav surface.
All 2,306 samples across ten candidate polylines were included.

These are deliberately non-optimal candidate polylines, not a fresh pathfinding
result, collision-aware walk, continuous clearance proof or measured play timing.
The check retains the radius .35 m, height 1.8 m and step .3 m settings. Results,
paths and the B02 report hash are in
`generated/fusion/spawn-study-b03.json`; the repeatable calculation is
`generated/fusion/spawn-study-b03.mjs`.

| Evidence | A distance | B distance |
| --- | ---: | ---: |
| B02 attacker compiler path from `(-14,-33)` | 51.70 m | 77.25 m |
| B02 defender compiler path from `(13,30)` | 53.89 m | 31.97 m |
| Proposed center candidate polyline `(0,30)` | 40.37 m | 45.36 m |

| Proposed defender start | A candidate polyline | B candidate polyline |
| --- | ---: | ---: |
| `(-4,30)` | 36.39 m | 49.29 m |
| `(-2,30)` | 38.38 m | 47.32 m |
| `(0,30)` | 40.37 m | 45.36 m |
| `(2,30)` | 42.36 m | 43.43 m |
| `(4,30)` | 44.35 m | 41.64 m |

The center's A candidate is 13.52 m shorter than the former defender path; its B
candidate is 13.39 m longer. Even the longest proposed A candidate remains 7.34 m
shorter than the B02 attacker-to-A path, while the longest B candidate remains
27.96 m shorter than attacker-to-B. These are geometric comparisons to site anchors.
The original numbers did not themselves prove an attacker wins the first fight,
and the revised numbers do not prove a defender completes setup first. The relevant
contact point and preparation task may precede the anchor by different amounts.

At a provisional common 5 m/s, the center's distance margins would correspond to
about 2.27 seconds toward A and 6.38 seconds toward B before considering clearing,
utility, body blocking or different movement speeds. These are distance/speed
estimates only. No universal setup margin or equal A/B timing is required.

## Changed decisions and costs

The move makes an A assignment plausible without demanding that every defender
immediately run west from an east-biased start. It reduces the incentive to stack
B simply because that destination is much cheaper to reach. Teams can still choose
different allocations, and B keeps a substantial geometric setup advantage over
the attacker path.

It also changes first-round aggression. Earlier A access may let a defender reach
the Cask exit, gallery approach or W port before the intended encounter develops.
That could be a valuable forward-control option with a coverage cost, or it could
let defenders dominate the southern reactor junction too cheaply. Site-anchor
distances cannot distinguish those outcomes. Inspect first-contact positions for
both ports and the Cask approach before accepting the spawn arrangement.

All five starts now lie west of `rear-switchboard`. Players assigned to B must use
its northern turn or another physically usable passage. The existing northern
route is included by the nav samples, but two teammates' throughput and supporting
views remain unknown. Preserve the baffle's sightline job initially; do not remove
it merely to make the distance comparison cleaner. A meaningful congestion or
support defect would justify a later local adjustment.

The five centers are 2 m apart, so their intended .7 m body diameters do not initially
overlap. Actual spawn placement, facing, shoulder clearance and early crossing
between A/B assignments still need physical and multiplayer checks. The spread also
creates an approximately 8 m A-path difference between its extreme starts; compare
roles and assignments rather than assuming every defender has the center's timing.

Because the circulation itself is unchanged, the edit does not shorten every
post-plant rear rotation or add a new reactor entrance. It primarily changes initial
allocation and the territories teams may acquire early. Later-round effects must
be evaluated through those changed positions, not by treating spawn distance as a
retake measurement.

## Required return evidence

On the final repaired source, verify all five starts physically, rerun the declared
routes, and walk to actual A/B defensive setup positions and both port-contest
positions. Compare the earliest attacking approach under the same movement
assumptions. Inspect the north switchboard turn with a leader and follower, and
check that moving the starts has not exposed them through a rear exit or other
aperture. Full compiled strategy acceptance remains separate and will use actual
views, walk results and the updated source identity.
