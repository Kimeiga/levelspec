# Phase-two independent test review and retirement ledger

Reviewed proposed boundary before production changes: XML-only package root,
retirement of ASCII/JSON authoring and exclusive corpus/generator behavior, retention
of XML geometry/navigation/export/runtime behavior. Guidance: local maintain-tests
and write-readable-typescript. Parent coordinator owns production implementation;
this reviewer owns tests and their disposition.

## Independent assessment

The existing XML suites already protect the continuing geometric and navigation
contracts. Porting the old compiler's symbolic traversal model would create a new
product requirement instead of preserving the intended XML contract. No such port
is warranted. The remaining shared box constructor needs an independent analytic
volume/winding test before its old owner is removed. Package-root cutover needs a
real public-import integration test, not a source spelling or removed-symbol check.

## Legacy-suite dispositions

| Removed suite | Continuing coverage | Obsolete contract retired |
| --- | --- | --- |
| core.test.ts | Export box test now checks an asymmetric translated box's analytic volume, outward geometric winding and stored normals, plus reversed sign. vector.test.ts covers closed deterministic geometry, corners, stacked walls and structural separation; vector-export covers brush projections/volume. | Grid decomposition, portal/junction ownership as legacy box algorithms, naive comparison, old exterior-side API and Three.js adapter implementation. |
| gates.test.ts | vector.test.ts rejects invalid XML/nonfinite coordinates and malformed regions; vector-navigation checks actual runtime diagnostics, settings, physical headroom/step/slope and sealed/open state. vector-public-api exercises real runtime JSON serialization. vector-reference tests caller ownership. | Grid ray-cell traversal and symbolic portal vault/crouch/rappel classification; no claim XML walking validates those actions. |
| navmesh.test.ts | vector-navigation covers occupied cover footprint, stair step limits, headroom, narrow floors, disconnected/stacked floors and routes; vector-water covers independent movement. | Independent agreement with retired symbolic graph and full old JSON corpus loop. |
| levels.test.ts | Existing XML showcase/Dust II/reference acceptance plus export tests protect finite mesh/brushes, routes, material/UV output and actual glTF consumers. | Old JSON library completeness, naive comparisons and removed OpenSCAD/CadQuery/DXF interfaces. |
| concept.test.ts | No surviving concept generator is promised. Architectural XML showcase/browser tests remain retained. | ASCII concept generation, seed-selection success, spread scores, generator roof defaults and grid flight fitting. |

All other existing root suites and all website Node/browser tests remain retained.
No assertion was weakened to satisfy cutover. No source-text absence test was added.

## New and adapted tests

- XML export volume oracle is a test-local scalar triple-product sum, independent of
  production brush/box construction. Analytic 3 × 5 × 2 = 30 box volume and winding
  checks preserve the useful legacy numerical guarantee, including translated bounds.
- Public package import (`levelspec`) parses a literal XML premap, compiles geometry
  and navigation, validates it, JSON-roundtrips runtime mesh metadata, and emits a GLB
  with valid container magic. It asserts static premap behavior rather than claiming
  spawn-based gameplay connectivity.

## Focused validation

`node --test --test-concurrency=2 tests/vector-export.test.ts tests/vector-public-api.test.ts`:
14 discovered, 13 passed, zero failed, one optional real-BSP integration skipped.
Full retained root suite (`node --test --test-concurrency=2 tests/*.test.ts`):
179 discovered, 178 passed, zero failed, one optional native-BSP integration skipped;
26 suites, 8.632 seconds. Log: `/tmp/levelspec-phase2-node.log`.

`npm run compile -- examples/showcase.level.svgx --out /tmp/levelspec-phase2-showcase`
and the corresponding rooftop-reference command both passed, emitting GLB/runtime,
report, OBJ, SVG and UV artifacts with no exporter warnings. The remaining site/build/
browser matrix and final implementation review are recorded by the phase coordinator.

## Limitations

This review mapped continuing contracts rather than preserving historical test counts.
It does not prove all numerical algorithms, native importer compatibility or symbolic
traversal actions. Native BSP execution still requires its documented external tools.
