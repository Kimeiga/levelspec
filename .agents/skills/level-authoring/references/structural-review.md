# Structural and human-scale review

Use this for invented and reference-based maps. Judge the requested design and
intended routes, not an assumed real-world building code. Evidence of an unusual
but intentional layout can explain irregularity; regularity is not correctness.

## Whole physical assembly

Inspect actual compiled volume from several sides and useful sections, including
surfaces navigation omitted or rejected. Account for floor thickness, stair
undersides, wall ends, finite caps, supports and intended open boundaries. Check
floating pieces, unexplained gaps, narrow wedges, accidental intersections,
inconsistent levels and duplicate geometry. A disconnected component may be
intentional; require an explanation appropriate to the brief rather than forcing
all surfaces into one navigation island.

Review complete physical unions. Several logical regions can form one landing,
and one compiled mesh can contain several logical assemblies. A region boundary
is not necessarily a physical end. Check transverse sections through floor/wall
and landing/guard joints; matching top edges or touching bounds can conceal an
unattached slab. Track changed and retired pieces so obsolete walls or floors do
not survive a replacement and block a route.

## Follow the person

Follow every claimed route through actual doors, thresholds, halls, stairs and
landings. At transitions identify support below, the next reachable surface,
clearance above and boundaries at the sides. Check both stair ends, direction,
rise/run, turns and usable landing width. Use the actual body radius/height and
step/slope settings; a clear centerline or vertical ray can miss shoulder/head
contact with an adjacent slab or next risen tread.

Exercise continuous collision-aware movement, not merely plotted points or
teleports. Use valid separate starts for intentionally disconnected portions and
label them as separate route audits. Check that closed barriers block and intended
openings pass. Guard/drop requirements follow gameplay intent and declared scope;
do not hide an accidental hole under an uncertainty label. Include upper walking
tops of overhead stairs when they are claimed occupied surfaces.

Record meaningful starts/stops and results. A screenshot, static premap or extra
navigation seed cannot demonstrate physical reachability. If a tool cannot
exercise the route, retain that limitation and repair the tool or geometry rather
than declaring a virtual pass. Do not claim structural engineering adequacy or
building-code compliance from these checks.

## When drawings are used

Compare actual compiled plan cuts and sections to the intended drawings at common
axes, scale and elevations. Check presence and absence: intended floors, landings,
openings and voids exist, and extra slabs or walls do not block them. Verify clear
width through the occupied body height, not just slab width. Label section axes,
origins and cut heights explicitly; do not infer a profile axis from its bounds.

Audit saved/reloaded XML through the same compiler used for delivery. Numeric
serialization, millimeter quantization and stair rise/run conventions can affect
tread counts, endpoints and landing ownership. Check physical results instead of
assuming matching parameter names prove conformance. Update drawings only for an
intentional design revision, not to conceal an implementation discrepancy.

## Findings and completion

Prioritize overall layout and route failures over trim or tiny tolerances. Each
finding identifies the affected assembly, observed result, consequence and concrete
repair target. An author can defend an intentional relationship with evidence or
revise it; the reviewer then adjudicates the response. After repairs inspect the
changed interfaces and rerun relevant checks. Keep unresolved limitations explicit;
passing one selected path does not certify the whole modeled volume.
