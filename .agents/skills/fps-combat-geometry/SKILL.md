---
name: fps-combat-geometry
description: Author or critique FPS corridors, local elevations, entrances, crates, cover and vantage points for exposure, movement, teamwork and counterplay. Use for local combat-space decisions, not architectural-only detailing or visual styling.
---

# Local FPS combat geometry

Design the encounter a feature enables. The AI chooses its physical realization
within the brief: rooms, corridors, open areas, straight or winding paths, flat ground
and height changes can all be useful. No standard shape, crate height or hallway
width establishes good gameplay.

Use [fps-map-workflow](../fps-map-workflow/SKILL.md) for authored changes and review
stages; keep a local repair scoped to the encounter and its interfaces. A review-only
request produces findings, not an unsolicited geometry edit.

## Ground the encounter

Inspect the space, neighboring connections and known game mechanics. Use actual
body/camera, standing/crouching, speed, step/jump/boost and weapon/utility behavior
where available. Keep consequential unknowns explicit. Distinguish concealment,
ballistic protection, collision and navigation clearance.

Shape architecture, circulation and obstacles together. Consider alternate thresholds,
room/corridor relationships, building projections or an obstacle where they improve
the actual encounter. These are options, not a required palette. Avoid masking an
unresolved spatial problem with repetitive props or gratuitous bends.

Design useful combat views as deliberately as occlusion. Adjacent spaces or platforms
need not be sealed from one another: a bounded opening, low edge or overlook can let
players contest, gather information or support a teammate without a movement link.
Choose the relationship and its counterplay, preserving full-height screens where
needed; more visibility is not automatically better. The
[visibility guide](../fps-map-review/references/visibility-and-cover.md#design-deliberate-combat-connections)
covers positive opportunities as well as unwanted exposure.

## Inspect action from both sides

Trace approach → occupation → use → departure from opposing viewpoints. Check
standing/crouching body exposure, feet/weapon gaps, elevated views and tiny slits.
Which threats appear together, and which can movement, a teammate or utility separate?
A camera pose does not prove body fit or network peeker's advantage.

Distinguish movement openings, firing apertures and information-only views. Give
each consequential opening a concrete user and job; creating an angle can also
expose teammates or make a later retake harder. For a supported hold, inspect the
same position after its ally is absent or suppressed, and name the event that makes
staying, falling back or conceding the area preferable. Do not require every site
to use the same vertical layering or fallback arrangement.

Check the follower as well as the first player: passage, support view, trade opportunity
and escape/commitment. A committed ambush may be intentional; not every hold needs a
safe retreat or solo-clearable entrance. Counterplay must fit actual timing, players
and tools, including what happens when another approach becomes threatened.

Consider preparation, ducking, exposed movement, repositioning and retreat across
the encounter. Where low cover is useful, plan a usable sequence and inspect relative
base/top heights, side exposure and elevated opponents against actual posture and
camera dimensions. Tall screens and low refuges serve different purposes. Integrated
fixtures or freestanding props can both work; preserve readable circulation and
intentional exposure rather than filling every gap.

For a hold, grade or level change, inspect access, intermediate eye/body exposure,
support, the occupied position, reverse views and the onward/return route. Recheck
cover against the changed ground. Guarding, drops and optional movement routes follow
design intent and real mechanics; height alone does not establish one-way movement.

For quarter-turn, half-turn, curved or spiral stairs, check the approach, turn and
arrival separately. A guard, central core or overlapping flight can separate a
leader from a follower's view while exposing either to an adjacent higher or lower
path. Inspect the same opposing position from both teammates as they move around
the turn; do not assume that a bend necessarily breaks or preserves support.

## Propose and verify

Tie consequential changes to stable space/object IDs and a prediction about exposure,
movement, support or commitment. Compare focused alternatives when useful, including
retention or removal. Inspect the changed geometry and adjoining interfaces from
both sides; preserve accepted surroundings when a local correction suffices.

Read [combat patterns](references/combat-patterns.md) for a relevant mechanism or the
[visibility/cover guide](../fps-map-review/references/visibility-and-cover.md) for view
studies. Use [strategy design](../fps-strategy-design/SKILL.md) when a local change
alters territory or rotations. The [review skill](../fps-map-review/SKILL.md) owns
independent assessment and evidence claims; use actual engine checks for mechanics
that the available authoring tools cannot establish.
