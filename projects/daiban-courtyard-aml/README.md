# Daiban — native architectural AML

`level.aml` is the detailed M13 courtyard rewritten with native AML primitives.
It retains the detailed layout, floor/stair semantics, nine route contracts, player,
materials, markers, reference images and cameras. It replaces sliced construction
with circular openings, analytic arc profiles, profiled walls and extruded panels
and stair bearings. Curves use a 2 mm chord tolerance. Repeated galleries have
different dimensions and remain distinct architectural objects.

The original mechanical source is frozen under `generated/daiban-native/baseline/`.
`migration-baseline.json` records that earlier translation, not the current source.
The original project resides in `../levelspec-cleanup-archive/2026-11-08/`.
The maintained AML has no dependency on archived generators or project mesh scripts.

## Results

| Measure | Mechanical baseline | Native architecture |
| --- | ---: | ---: |
| Compiled triangles | 30,593 | 8,863 |
| Architectural objects | 2,302 | 170 |
| Matched-view draw calls | 3,941 | 235 |
| Median ready time, three fresh pages | 8,219 ms | 1,515 ms |
| Orbit frame p95 | 16.8 ms | 16.7 ms |
| Walking frame p95 | 16.7 ms | 16.7 ms |

The triangle, object/draw-call and loading reduction targets passed. The planned
50% interaction-frame-p95 reduction was not demonstrated: both versions reached
the display's frame-time floor in most benchmark runs. No renderer batching,
visibility reduction, player changes or weaker validation were used.

Phase 1 source SHA-256: `a4cf7d555c7bd2d65852eace556aa8ddd6d3b9b8645a916987d5e1626a106e0f`.
All nine navigation routes pass; eight previously replayable paths still pass
production collision-aware movement. Six matched views have zero browser errors.
Native assembly composition removes buried surfaces: 37 physical floor patches
remain from 38 source floor identities. All affected old floor samples were already
capsule-blocked; 380 exposed sample points retain matching support. Independent
review verified exact occupied-volume preservation when 176 bearing fragments became
seven native extrusions. Native curves deliberately replace stepped approximations;
this is preservation of the intended M13 architecture, not new photographic acceptance.

Evidence: `generated/daiban-native/` contains baseline, final validation, build,
captures, performance samples and independent structural/test-review outputs.

```sh
npm run --silent levelspec -- preview projects/daiban-courtyard-aml/level.aml
npm run --silent levelspec -- validate projects/daiban-courtyard-aml/level.aml --json
npm run --silent levelspec -- build projects/daiban-courtyard-aml/level.aml --out generated/daiban-native/build --no-uv --json
```

Lightmap-atlas repair and the existing isolated rear-gallery inspection-start
restriction remain outside this rewrite. They were not hidden by changing geometry,
route assertions, player dimensions, or placement tolerance. Use the original
connected landing approach for that gallery.

Independent final tests passed on the frozen source: physical circular-boundary
radial errors are 1.957 mm north and 1.932 mm east; upper host apertures are open,
and surrounding masonry remains present. Filling the north aperture changes actual
collision; removing the SaKi landing's collision produces `AML_CONNECTION_SUPPORT`.
Independent structural and test reviewers approved the result. All 67 relevant
compiler tests, type checking and the viewer build passed.


## Phase 2 — earlier-model supplements

Added three native radial braces to the north circular infill, plus perimeter frames
and springline transoms on both closed lower SaKi arched windows. The courtyard core
is unchanged. The historical dimensions remain estimates: nominal 35/25 mm sections
normalize to 36/26 mm under the authoring lattice; brace layering retains an estimated
2.5 mm panel standoff and attachment to the existing diameter rail.

The south-bay/crossing and opposite-frontage variants remain separate where earlier
reviews hold their layout; low-east enclosure, yellow-stair bay and overhead context
are already represented and were not duplicated. See
[the addition and evidence record](reviews/phase2-supplement.md) and
[the separate context comparison](studies/context-comparison/README.md).

Final Phase 2 SHA-256: `3f80fd3bf1b47d8650f14522b33370bf84dc11018ffaff60a160e13597e1389f`.
Validation/export pass with zero diagnostics; all nine navigation assertions and eight
previously replayable physical paths pass. Six captures have zero browser errors.
Independent construction and test reviews, 59 focused tests and type checking pass.
The existing isolated rear-gallery start restriction remains unchanged.

Same-setup median benchmark (three fresh pages each): ready time 1,524 → 1,541 ms;
draw calls 235 → 249. Compiled triangles 8,863 → 9,284; objects 170 → 179.
Orbit/walking frame times remain near the display floor. No old slice geometry,
visual-mesh physical proxies or renderer changes were introduced.


## Corner repair

The northwest stair corners now have physical receiving landings. The upper join
includes a twelve-riser connector instead of a flat fill across different elevations.
Two detached high wall fragments were removed; supported screens and the overhead
slab remain. Existing stair rises and player dimensions are unchanged.

Both new local routes pass actual collision-aware replay. Validation/export have
zero errors, and41 focused tests plus type checking pass. See
[corner repair evidence and sampling limits](reviews/corner-repair.md).
That revision had 9,567 triangles and 178 architectural objects.


## Wall alignment

North stacked screens and their east corner now use shared planes and matching
ends. The upper rear wall sits on the repaired landing perimeter, and south
return walls meet their adjoining centerlines. Stair and floor geometry is unchanged.
See [wall alignment checks](reviews/wall-alignment.md) for the deliberate design
changes, captures and navigation-sampling limits. That revision had 10,645 triangles.


## Upper stair junction

The upper landing and flight now share their full width. The rear walls meet at
the landing perimeter, the lower wall stays beneath the treads, and the stair's
front edge meets its screen. This supersedes the earlier retained stair setback.
See [junction repair and verification](reviews/upper-junction.md), including the
user-reported defects and remaining route-start sampling limits.
Current model: 10,825 triangles and 178 architectural objects.
