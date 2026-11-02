---
name: reference-level-authoring
description: Author or review architectural levels from references using XML LevelSpec, plans, sections, compiled geometry and circulation checks. Use for buildings, corridors, stairs, bridges and overpasses.
---

# Reference-first architectural authoring

Preserve the requested subject, style and output. XML `.level.svgx` is editable
source; runtime JSON and meshes are outputs. Use meters and right-handed Z-up.
Use the repository-local `levelspec` commands in root AGENTS.md. Native exporters
may have optional prerequisites; authoring and this workflow do not require Blender.

Treat inhabited buildings as places people move through. Use a person's route
through rooms, doors, halls, stairs and landings to test the spatial structure.
For each claimed passage, identify the supporting floor on both sides of the
threshold or stair connection. Stranded stairs and unexplained holes or exposed
drops are structural findings; stop at closed or unknown interiors rather than
inventing a connection.

For substantial reconstruction or a restart after a fidelity failure, establish
source-grounded drawings **before dependent production geometry**. A schematic
generated from the same mistaken model cannot validate that model. Reuse reviewed
evidence for a small repair; do not restart unrelated accepted work.

1. Personally inspect raw originals and user-supplied annotations. Save a source-only
   feature inventory, provenance/hashes, view correspondence and difficult-region
   questions before opening model-derived drawings or previous conclusions. Keep
   direct observations, user explanations, estimates and inferred construction
   distinct. Original pixels remain authoritative for visible geometry.
2. For ambiguous openings, overlapping storeys, stairs and junctions, read
   [photo contour tracing](references/photo-contour-tracing.md). Make editable
   native-pixel SVG observations over unchanged originals; keep observed,
   uncertain and inferred paths separate. Unknown hidden connections stay unknown.
   Seek materially different original views when they could settle a critical issue.
   For clutter, deep shadows or difficult stair/window overlaps, optionally use
   [generated reference aids](references/generated-reference-aids.md): a simplified
   CAD-like view, conservative decluttering, or qualitative depth plus outlines.
   Inspect these against originals before review; generated geometry and depth are
   hypotheses, never independent source evidence or measured dimensions.
3. Read [schematic workflow](references/schematic-workflow.md). Draw the plans,
   elevations, sections and enlarged details needed to explain supported building
   relationships, with CAD-level geometric specificity. Generic masses and labels
   cannot replace visible openings, profiles, rims, landings or thickness cues.
   Follow a person's route through the relevant doors, halls, stairs and landings;
   check continuous floors, usable transitions, headroom and bounded open edges.
   Independently review the frozen drawings against originals before modeling
   dependent detail. Unsupported critical relationships defer that detail; continue
   independently supported work elsewhere.
4. Build XML from reviewed relationships. Keep render visibility, collision and
   navigation separate. Compile and inspect source-linked diagnostics, actual
   geometry/sections and land/boat reports as relevant. Check widths, headroom,
   stair rise/run/landings, slab thickness, wall junctions and stacked floors on
   every proposed occupied surface, including the walking tops of overhead stairs.
   Static premap/navigation success does not prove source fidelity,
   gameplay reachability, structural adequacy or building-code compliance.
5. Freeze XML/companions and capture actual renders of that revision. Read
   [paired contour review](references/paired-contour-review.md) and
   [independent review](references/independent-review.md). Critics first record
   source-only observations in fresh context, then author their own paired original
   and candidate contours. For a full reconstruction review, lead with a general
   structural challenge: courtyard/building layout, depth order, stacked levels or
   stair/landing relationships. The implementer must defend it with source evidence
   or revise the structure, and the critic adjudicates that response before smaller
   refinements proceed. Fit and lock cameras with stable landmarks; test held-out
   boundaries. Unmatched critical views remain diagnostic and cannot close fidelity
   acceptance. Regenerate affected evidence after repairs.

Keep originals, editable traces/drawings and review records in the user's chosen
project layout (`projects/<name>/` is supported). Put reproducible outputs under
ignored `generated/`. Hash frozen inputs and retain actual inspected images,
findings, repairs and unexamined regions. Use local
[comparison helpers](references/comparison-tools.md) for source-only packets,
reference/schematic/render boards and contextual contour comparisons. Helpers
compose evidence; they do not infer cameras, extract independent traces or approve
geometry. Disclose self-review when independent review is unavailable.

See [review evidence](references/review-evidence.md) for the evidence ledger and
[provenance](references/provenance.md) for adaptation sources.
