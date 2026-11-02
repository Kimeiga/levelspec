# Source-grounded architectural drawings

For substantial reconstruction, review editable drawings before dependent production
geometry. For an explicit rough concept request, meet the requested level of detail;
otherwise retain CAD-level specificity at the scale relevant to the building.

## Draw supported shapes and relationships

- Establish meters, right-handed Z-up, an origin, shared axes, level elevations and
  view directions. State which dimensions are measured, estimated or assumed;
  photographs do not establish survey precision. Label changed scales/projections.
- Show actual supported profiles, curved or stepped boundaries, reveals, recesses,
  apertures, parapets, slab rims and wall thicknesses. Distinguish outer and inner
  boundaries where known. Boxes and single strokes are adequate only where they
  describe the actual shape; labels cannot replace complex visible geometry.
- Explain floor/wall/roof ownership, landings, stair flights, ramps, passage entries
  and exits, supports and stacked levels. Preserve surrounding material around each
  opening. Enlarge difficult junctions while retaining location marks in a parent
  view. An arrow labeled “connection” does not establish a corridor or stair.
- Draw the main human route through the relevant spaces. Show the floor/threshold
  at each door, both ends of each main flight, connecting landings and halls, usable
  headroom and the walls/guards around open edges. Mark observed, inferred, blocked
  and unknown segments; unexplained holes or stairs to nowhere require a structural
  explanation or repair, not decorative detail.
- Locate section cutting planes and viewing directions in a parent plan/elevation.
  Distinguish intersected material from visible geometry beyond the cut. Hatch only
  intersected solids, leaving cavities/openings clear. Identify removed cutaway
  regions so an omitted roof or wall cannot resemble a real opening.
- Use a readable legend: strong cut boundaries, medium visible edges, light dashed
  known hidden edges, thin axes, and a separate uncertain/inferred treatment. Keep
  hatching, dimensions and callouts clear at delivered sheet size. Corresponding
  contours, levels and opening identities must agree across views.

An explicit bounded unknown is valid evidence handling. Omitted visible geometry,
arbitrary empty areas and generic placeholders are incomplete. Do not fabricate
hidden rooms, connections or construction details to fill a drawing.

When changing a floor level or depth, recheck the connected flights, landings,
soffits and side boundaries together against originals. Retaining an old guard's
absolute height while moving its floor can turn it into a tall screen. Check both
physical passage and the source-visible circulation envelope: substantial floors
and treads visible in references should remain visible in corresponding renders.
Resolve a mismatch through the coupled geometry and camera evidence; hiding guards
or changing the view solely to expose the route does not establish a repair.

Account for the retained area below a cap and beside a frame, not only their top
lines. A thin jamb cannot stand in for a photographed two-faced pier. Labeling a
study boundary “hidden” does not establish its occlusion: check the actual camera
rays and surrounding mass. Simplified storage, omitted returns or changed cameras
can expose a panel bottom or wall cutoff as a false sill/free end. Preserve the
observed lower profile and finite junction; keep unseen floors and rooms separate.

Check every finite construction boundary, including far, top, bottom and both
longitudinal ends. A passing near-cut check does not establish the other caps.
Test representative section interiors as well as edges, and record which cameras
and occluders were checked. A visibility proxy must not leave floating edges or
replace directly observed rear masonry, returns, soffits or overhead glazing with
background. Give a narrow component its own release gate when adjacent context
still needs a complete drawing.

## Author and review before modeling

1. Inspect originals and brief, then save the source-only feature inventory and
   difficult-region questions. Use reviewed
   [native-pixel traces](photo-contour-tracing.md) for ambiguous boundaries. Map
   source landmarks into the building frame without pretending perspective traces
   are measured plans.
2. Author separately editable plans/elevations/sections and focused details from
   that evidence. Cite source IDs/regions, dimension provenance and unresolved
   alternatives. Preserve SVG (or equivalent editable 2D source) and actual rendered
   sheets with the project evidence. Preliminary 3D studies may test hypotheses,
   but their derived sections remain provisional claims against originals.
3. Freeze the drawing revision/hash and build a
   [source/drawing comparison packet](comparison-tools.md). Inspect the actual
   rendered pages at sheet and detail size. Independent critics first save raw-source
   observations in fresh context, then examine every meaningful drawing relationship.
   For substantial work use complementary fidelity/proportion and
   construction/circulation scopes when available; schedule sequentially if needed.
4. Check the drawing standard above, source feature coverage, cross-view consistency,
   openings and retained material, stair/landing relationships, junction ownership,
   support and plausible clearances. Review drawing quality separately from source
   fidelity. A polished drawing cannot settle unsupported construction.
5. Record supported discrepancies and missing coverage, revise and re-review affected
   views plus their interfaces. Keep a feature/detail coverage table and revision
   ledger. Proceed to dependent XML only when relevant drawings were reviewed and
   supported actionable discrepancies are resolved. Unresolved critical relationships
   defer dependent detail; unknown hidden connections remain unverified. If decisive
   evidence or independent review is unavailable, state the limit explicitly.

Once a frozen drawing revision has been handed to a critic, keep its files intact.
Put corrections in a new revision with a short change ledger and fresh identities;
tell active reviewers which successor to inspect. Never silently re-freeze a changed
packet while another agent may be reading the earlier one.

Build from reviewed relationships, then compare actual compiled renders with both
originals and drawings. Originals remain authoritative for visible geometry. A model
and a drawing derived from that model can agree while both are wrong; return to
originals and revise the drawing when later evidence contradicts it.
