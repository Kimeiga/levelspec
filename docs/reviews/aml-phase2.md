# AML phase 2: architecture and CAD

## Delivered contracts

Native AML now completes physical assembly composition, wall base/top profiles and
anchors, hosted openings/details, material partitions/ownership, hollow extrusions
and transported miter sweeps, and explicit closed-solid booleans for this phase.
The public builder, parser/serializer, structural schema, runtime/export metadata,
and shared reviewer use the same contracts. See [authoring details](../AML.md).

Material partitions split exposed render faces without duplicate shells. Collision,
navigation, physical hashes, and standing-body checks use the retained composed
physical mesh. Temporary water/land movement geometry owns its own mesh instead
of accidentally reusing the retained architectural collision. Material-only edits
change render identity while preserving physical identity.

Exposed native material conflicts fail unless an explicit owner/policy resolves
them; buried contacts and equal assignments remain allowed. Nested ownership uses
the nearest applicable explicit decision. An explicit inner error policy blocks
outer preservation. Authored paint conflicts are checked independently.

Migration preserves ordered source objects and declares retained-face ownership
explicitly for historical wall composition. Historical material/plane probes use
the separate legacy compiler as an oracle. Native wall spans use consistent
longitudinal face diagonals; migration does not freeze derived mesh geometry.
Optional historical foot fitting becomes `fit-floor`; strict `contact-floor`
assertions check actual custom bases and full support coverage.

Wall anchors use physical transformed soffits. Apertures use complete named hosts,
host-local placements/frames, unrolled wall silhouettes, and full miter corners.
Recesses leave a web; notches meet a boundary; frame borders are true profile offsets.
Sweeps retain holes, local transported framing, and miter sections, including
reflection/nonuniform scale. Invalid folds, reversals and self-intersections fail.
Admission counts repeated triangulated caps before allocating sweep geometry;
intermediate face fragments, candidate/assignment visits, generated triangles and
kernel lifetimes remain bounded. Nonzero input vertex welding is rejected rather
than silently repairing a meaningful shape.

## Independent reviews

The independent test reviewer assessed contracts and analytic expectations before
production implementation, then reviewed all material test changes. Final review
independently passed all 24 CAD tests and seven migration tests. It also reran the
native browser test and reviewed the example and walkthrough. No material test or
example findings remain in the reviewed scope.

A separate implementation reviewer reviewed geometry, ownership, resources,
interfaces, integration and follow-up fixes. Findings resolved include three-way
and nested ownership, transformed opening admission, collection notch projections,
custom contact bases, scaled soffits, miter aperture residue, repeated-cap admission,
intermediate partition bounds and explicit nested error policy. Final independent
CAD/type checks pass with no remaining material implementation findings.

## Acceptance evidence

- 24 public CAD tests use independent volumes, areas, collision rays, miter
  coordinates, transformed sections and material regions. They cover negative
  controls, cancellation/recovery, source immutability, public builder/round trips,
  runtime/export metadata, retained physical collision and water navigation.
- Seven migration tests retain historical source/asset contracts and independently
  compare old/new exposed face materials and planes, including showcase.
- All sixteen Dust II routes and local limits remain unchanged and pass, with
  physical Short/CT separation and stair elevation probes.
- XML schema validates all six maintained AML examples, including the native CAD
  example. Types, full Node suites, viewer/site builds and diff whitespace pass.
- All eight existing live-preview browser scripts pass. Production site/viewer
  browser checks pass, including accessibility, offline recovery, source failure,
  collision walking, context loss and unavailable WebGL.
- New `npm run test:architecture:browser` verifies rendered materials, selectable
  source sketches/provenance, and a continuous WASD walkthrough of the native
  example around its plinth to the objective. Independent review caught and fixed
  an initially unsupported display base. Saved waypoints keep supported feet near
  Z=0.01 m. Navigation sampling and this finite walkthrough are traversal evidence,
  not a continuous reachability proof.

Logs are under ignored `generated/aml-phase2-*.log`. New screenshots and actual walk
waypoints are in `generated/aml-phase2-browser/`; production browser results are in
`generated/aml-phase2-site-browser/`. Broad browser checks preceded the final explicit
inner-error guard; that guard was independently reviewed and covered by focused and
complete Node checks. Builds and the native CAD browser were repeated afterward.

The existing optional native integration remains skipped. The unrelated stored
Cycles bake-hash failure documented in the foundation record was not regenerated,
weakened or reclassified; the separate long-running site Node suite was not repeated
for this phase. Native BSP integration remains outside this phase's acceptance.

## Later phases

Custom/separate-tread stair undersides, complete side enclosures, concise Daiban and
Dust II rewrites, terrain policies/grading/partitioning, native BSP integration and
final SVGX producer/API retirement remain separate work. Frozen reconstruction
evidence and photographic-fidelity holds remain unchanged.
