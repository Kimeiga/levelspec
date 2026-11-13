# Phase 2 — supported earlier-model supplements

The Phase 1 optimized courtyard is preserved exactly: every pre-existing XML object,
its identity and all attributes remain unchanged. New geometry is limited to
source-supported architectural details identified during the earlier-model audit.

## Admitted construction

- Three north lower-infill radial braces (225°, 270°, 315°), present in the original
  oblique and DSC04505 photographs and earlier `author.py` C-Fan-brace-1/2/3.
  Native beams retain the existing horizontal diameter rail without duplicates.
  Center (3.151, 5.283272, 8.321), radial length 1.178 m, square section 0.035 m.
  Length retains 10 mm inside the existing 1.188 m infill; thickness and forward
  depth offset are disclosed historical estimates, not surveyed dimensions.
- Two lower SaKi arched-window perimeter frames and springline transoms, visible
  in the original primary photograph. Native frames use an estimated 25 mm border
  and depth inside the existing openings, with matching native beam transoms.
  The closed original glazing/panels remain behind the frames. New dark frame
  appearance is estimated; no room or passage was opened.

## Candidate reconciliation

South-bay/crossing and opposite-frontage variants remain separate because earlier
reviews explicitly withhold their layout/depth relationships. Low-east enclosure,
yellow stair, rear construction and overhead context are already represented.
See `../studies/context-comparison/README.md`. No earlier whole-model union,
nonuniform alignment warp, or unsupported boundary extension was used.

## Checks

Strict validation passes with zero diagnostics and all nine route assertions reachable.
The final model has 9,284 compiled triangles and 179 architectural objects versus
8,863 / 170 before supplementation. All new construction uses native AML primitives.
Phase 1 source, validation and camera baselines are frozen in
`generated/daiban-phase2/baseline`; captures, benchmark samples and independent
checks are under `generated/daiban-phase2/`.

Final independent construction and test reviews passed on source
`3f80fd3bf1b47d8650f14522b33370bf84dc11018ffaff60a160e13597e1389f`.
All old element attributes are exact, all nine routes remain reachable, eight
physical replays pass, and the six matched captures have zero browser errors.
Filled-aperture and missing-landing negative controls remain effective. The
millimeter authoring lattice makes nominal 35/25 mm sections physically 36/26 mm;
these are disclosed estimates. Brace depth has a 2.5 mm panel standoff while the
center joins the existing diameter rail; no new walking-support claim follows.

Median loading changed 1,524 → 1,541 ms and draw calls 235 → 249 on the same setup,
three fresh pages per source. 59 focused tests and type checking pass; export with
`--no-uv` passes. Evidence lives in `generated/daiban-phase2/`.
