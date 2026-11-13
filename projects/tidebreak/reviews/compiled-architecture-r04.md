# Tidebreak R04 — independent architectural review

Status: **accepted as a coarse architectural blockout**. No required source-geometry repair remains. The capture defect below was corrected and rechecked against the unchanged R04 source.

Scope: architectural plausibility, enclosure, major supports and structural circulation of the invented repair-yard blockout. This is not gameplay acceptance, structural engineering certification or a source-fidelity reconstruction. Reviewed independently from the brief, source and actual images before earlier author/reviewer rationale.

Source: `projects/tidebreak/level.aml`, SHA-256 `e1bcad31f8af49485acce4a10c4aa88c377979885ded9ef8bcda52adbe724e03`. The native validation evidence in `generated/tidebreak-evidence-r04/offset.json` carries this same hash, reports no diagnostics and records sixteen successful directional collision-aware journeys with the unchanged player body. Those are corroborating bounded movement checks, not continuous proof.

## Findings

**ARC-04-01 — closed evidence correction.** The initial `generated/tidebreak-captures-r04/capture.json` records repeated actual cameras under different intended view names: the purported top view remained the overview, and the purported hall/gallery/D2 views remained the dock-approach camera. Those images cannot establish their named viewpoints. The author corrected form submission and now asserts applied camera coordinates before recapture. I checked `generated/tidebreak-captures-r04c/capture.json`: its source hash matches R04, the actual positions/targets/projections match the intended views, and browser errors are empty. I directly inspected its overview, roof-on architecture, hall, gallery and dock-head images. This was a capture defect, not missing model geometry.

**The major architectural organization is coherent.** The dock is a negative volume in a continuous solid yard rather than an isolated lower floor floating between walls. The retaining assembly and recessed D1/D2 stairs belong to that mass. H1 occupies the sunken dock while H2 divides one shared hall, so their convex outlines shape actual circulation. The caisson separates the dry basin from the visible water; the service bridge has a distinct deck, guards, girders and abutment/pivot masses over the mouth. The southern opening therefore reads as waterfront infrastructure rather than unexplained solid ground across the water.

**Roofs are modeled, not omitted for the cutaway.** Native roof elements close the longitudinal hall and rounded apse. The ordinary roof-on exterior clearly differs from the roof-hidden overview. The pump-house gable ends and two roof slopes form a complete mass, the winch house has a cap, and the scenic town masses have roofs. The open south end of the covered hall is legible as a large industrial entrance; it is not an accidental missing enclosed-room wall. Side doors and clerestory openings belong to the wall envelope.

**Levels and primary support agree in source.** Gallery floor at +4 m has slab thickness, piers and front/rear beams. G1 and G2 terminate at its actual edge openings; their filled flights and guards rise from the yard. The roof rises from approximately +7.1 m eaves to +10 m ridge, preserving an overhead volume above the occupied gallery. Repeated columns, rafters and ties give the long shed a structural direction. Exact member sizing and moving-bridge machinery are outside the blockout claim.

The corrected hall interior shows the side work lane continuing toward G1 and the partial gallery under a continuous roof. The gallery image shows the taller H2 hull interrupting the shared volume rather than the hall becoming a stack of rooms. Its rail and stairs occupy the expected height relationship below the visible framing. The dock-head view shows D2 recessed into the retaining mass and the hull shoulder occupying the foreground, with no floating floor, missing retaining wall or unintended sky opening in the inspected interfaces.

## Reference interpretation and optional development

I directly inspected the original Chatham longitudinal interior, Turks working slip, and Rochefort stair and full-dock photographs in `generated/exploration-reference/`, with credits and URLs preserved in `references/study.md`. They support the shared roofed volume, partial upper occupation, ships as large occluders, and masonry dock circulation. They do not establish Tidebreak's dimensions or invented adjacency.

The hulls and roof framing are deliberately coarse. A later art pass could add hull flare/keel and diagonal truss or apse ribs to strengthen the working-yard identity, while preserving the inspected collision envelope. These are optional architectural development opportunities, not repairs required to complete this planning prototype. Any altered body clearance or view obstruction would need the affected gameplay checks. Do not scatter unrelated props simply to fill the broad service apron.

## Presentation and limits

For a final hero image, widening the 108 m overview framing would keep the far scenic building and outer perimeter from touching/crossing the image edges. This is a presentation suggestion, not a source repair. The materials-mode interiors are dark but sufficient to inspect the envelope; this review does not certify final lighting or renderer art quality.

Acceptance belongs to the R04 hash above and the corrected R04c evidence. It does not claim exact correspondence to a real dock, construction feasibility, working hydraulic/mechanical systems, target-engine behavior or competitive balance. The simplified hull sections, broad work apron and sparse machinery remain intentional prototype detail. No additional architectural change is required for delivery of this planning experiment.

## Final build suggestion disposition

Bounded return review of `generated/tidebreak-final/tidebreak-offset.suggestions.json`, with the source hash above rechecked unchanged. The twenty-two advisory suggestions do not overturn architectural acceptance:

- **Four `FLIGHT_OPEN_SIDE` suggestions, D1/D2 left and right — no repair required.** These flights are cut into the yard. `path-dock-retaining` explicitly includes D1's long sides at y−22/−18 and D2's at y6/10; `dock-retaining` rises from −4 to 0 m with 0.7 m thickness. Grade-level guards continue above those retaining faces. The warning's comparison against the grade-level guards does not establish an open side along the lower flight. The retaining geometry, inspected dock-head view and completed bidirectional walks support keeping the assembly. No redundant railing or wall is added to satisfy the heuristic.
- **Seventeen `NAV_ISLAND` suggestions, `unassigned:0..16` — intentional unassigned surfaces, not required connections.** Their bounds identify four scenic town roofs (0,4,7,15), pump roof (1), gantry-foot top (2), caisson top (3), H1 deck (5), winch roof (6), hall/apse roof (8), workbench top (9), five H2 deck patches (10–14), and east-machinery top (16). None is an intended walking destination in this ordinary-movement brief. The playable route evidence separately verifies the yard/dock/gallery/stair/bridge network. Adding access to these surfaces would change the map's gameplay and architecture without a design reason; retain them as advisory evidence rather than inventing routes or suppressing the output.
- **`WALL_ALIGNMENT:G2-east-guard|gallery-east-guard` — accepted thickness transition.** Both centerlines meet at `(42,21,4)`. The 0.12 m stair guard joins the 0.15 m gallery guard, producing the reported 0.015 m face step. Their solids meet/overlap; this is not a gap or a broken landing. It is a harmless coarse-detail transition, so no source revision is required.

The final hero overview in `generated/tidebreak-hero-r04/overview.png` was also inspected. Its manifest preserves the same source hash and actual camera pose with viewHeight128; the playable perimeter and scenic buildings now fit within the image. The wider framing closes the presentation suggestion. No repeated full-map review or new geometry checks were necessary for these unchanged-source dispositions.
