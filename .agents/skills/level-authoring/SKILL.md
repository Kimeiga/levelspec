---
name: level-authoring
description: Author or review invented or reference-based LevelSpec maps for coherent layout, clean physical topology and usable circulation. Use for blockouts, buildings, stairs, corridors, bridges and complete maps.
---

# Map structure and circulation

Preserve the requested extent, style and gameplay intent. Use editable XML
`.aml` and native authoring helpers where appropriate; runtime JSON and
meshes are outputs. Domain coordinates are meters and right-handed Z-up;
exporters own axis conversion. Read current root AGENTS.md for commands.

## Architectural interest

By default, proactively ask: what interesting architecture could this place have?
Develop ideas through volumes, circulation, views and relationships between indoor
and outdoor space, appropriate to the brief and setting. Real reference images can
help discover possibilities, not just verify details. Invent beyond these illustrations:

- Occasional rooms spanning two or more storeys, relating upper and lower occupied
  spaces through a shared volume. Keep these relatively rare rather than repeating
  them throughout the map.
- Ducts, vents or service passages that require crouching, where the setting and
  intended movement mechanics support that route.
- Balconies or galleries overlooking neighboring patios, courts, arenas or rooms,
  creating spatial relationships beyond the room they occupy.
- Open-space sequences such as inner courtyards, streets, avenues and neighboring
  plazas at markedly different levels; long halls or paths can also run through
  buildings and link distinct rooms or outdoor spaces.
- Neighboring routes running in parallel at different heights, sharing a hall,
  courtyard or stairwell for part of their length. A passage can also cut through
  a larger occupied room instead of remaining a separately enclosed corridor.
  Develop the actual views, thresholds and separation along that shared journey.

Choose features for the place and experience; none is required in every map. Check
usable access, body clearance and onward/return movement. In gameplay spaces, also
consider exposure, support and opposing responses to a vantage or constrained route.

Actively explore expressive room outlines, changing passage widths and less routine
connections where the setting permits. A rectangular structural bay can contain an
irregular playable space shaped by equipment, setbacks, damage or rubble. Circulation
can emerge onto a gallery inside a larger volume, wrap around another space, or pass
through a building. Favor purposeful departures from box-and-tube composition over
unexamined rectangles; retain coherent construction rather than deforming every wall.
Plausibility allows modest departures from literal realism for spatial interest and
play. Judge the relationships these choices create, not irregularity alone.

Consider the shape of the ascent as part of the architecture. Quarter-turn or
half-turn stairs with occupied landings, sweeping curved flights and spiral stairs
can relate neighboring routes and reveal a space gradually. Choose them where
their approach, turn and arrival create a useful experience; retaining a straight
flight is valid. Use native AML circulation paths/rails and explicit landings
appropriate to the construction. Check inner and outer walking lines, usable tread
width, turning clearance, overlapping-flight headroom and the final connection.
For gameplay, inspect leader, follower and opponent views before, during and after
the turn, including any path alongside or below the flight. Curvature alone does
not establish occlusion, support or quality.

## Build the structure first

For built outdoor settings, normally sketch the site, streets and building masses
first; develop the map as usable space between and around them. Indoor settings can
start from room volumes and halls. Mix approaches as needed instead of forcing
outdoor maps into adjoining interior cells; natural sites can be terrain-led.

For FPS gameplay work, [fps-map-workflow](../fps-map-workflow/SKILL.md) owns the
process and [fps-map-review](../fps-map-review/SKILL.md) owns review scopes. Include
physical construction/circulation explicitly in the spatial review packet. The
[LevelSpec adapter](references/fps-workflow.md) documents the available tools.
Architectural-only work uses the proportional workflow here.

Establish spaces, levels, voids and intended route connections, then make a simple
structural blockout with real floor/slab thickness. Add enclosure and requested
details after the layout works. Include walls and overhead obstacles early when
they determine routes or clearance; stages are a useful order, not separate
approval ceremonies. A small map can go directly from a brief to XML.

Include roofs/ceilings and appropriate enclosure for indoor spaces unless the brief
calls for open, ruined or unfinished construction. Use cutaways to inspect interiors
rather than omitting real overhead geometry. Outdoor circulation can remain open sky;
visible building masses should still read as complete architecture. Integrate levels,
rooflines and contextual props with the place's function, even at coarse blockout detail.

Use coordinated plans or sections when stacked spaces, ambiguous interfaces or
scope make them useful. Independently review consequential uncertain relationships
before committing extensive dependent geometry. Diagnostic 3D studies can help
resolve them. Do not demand a full drawing package before every trial or repair.

Validate, build and inspect actual compiled geometry. For repeatable browser views
use [capture-level](references/structural-review.md#repeatable-captures). Follow claimed routes with
the unchanged player body; inspect the whole volume beyond the selected route.
Use [structural review](references/structural-review.md) for stairs, landings,
headroom, floor continuity, wall junctions and plan/model conformance. Navigation
sampling is not continuous proof or a substitute for collision-aware walkthroughs.
Keep visual geometry, physical collision and navigation distinct. Do not weaken
checks or add seeds merely to hide a broken physical connection.

## Proportional independent review

For ordinary architectural-only work use one independent reviewer covering topology,
construction and circulation. Give the brief, intended routes, editable source and actual
compiled views/results. For complex stacked spaces, difficult collision issues or
large maps, split construction and circulation scopes or assign focused specialists.
Respect any stronger reviewer requirements requested by the user.
For whole maps/buildings and broad architectural revisions, explicitly assign the
independent [architectural review](../level-architecture-review/SKILL.md); it can share
a reviewer with structural/circulation work while retaining its own findings.

Resolve supported structural findings before polish. Reviewers should prioritize
consequential defects, not invent flaws or alignment quotas. Recheck changed
assemblies and their interfaces after repairs; reuse unaffected accepted work.
Record the inspected revision, findings, repairs, remaining limits and actual
check results. If independent review is unavailable, disclose self-review rather
than claiming independent acceptance.

For themed invention, ground the place in real-image study during planning
and targeted lookup as details develop through
[reference-level-authoring](../reference-level-authoring/SKILL.md). Use its reconstruction
mode when source correspondence is required. Inspiration alone does not require
contours, fitted cameras, a fidelity gate or a reconstruction runner. Use
[level-preview-art](../level-preview-art/SKILL.md) for illustrated presentation.
Keep project source/evidence in the user's layout and reproducible outputs under
ignored `generated/`; do not turn project-specific scripts or thresholds into
universal requirements.
