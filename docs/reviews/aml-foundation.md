# AML foundation review

## Delivered behavior

The package root exposes native architectural documents, parse/serialize/compile,
and a direct architectural builder. Normal CLI initialization, validation, builds,
and the shared reviewer use AML. SVGX requires explicit migration into a new
project. Source and frozen reconstruction evidence are preserved.

The foundation includes paths/profiles, frames/datums, transformed definitions,
walls/openings/slabs, native solid composition, source provenance, physical/render
identities, and reuse of the existing rail-flight mathematics and runtime
backends. Runtime walking surfaces come from surviving physical faces. Imported
visualization meshes cannot supply physical support or checked CSG operands.

Migration retains existing source approximations, static wall-network boundaries,
constrained floors, flight parameters, retaining contacts, anchors, metadata, and
route limits. Imported physical assets become separate native proxies. Companion
publication uses content-addressed byte snapshots and exclusive destination
creation, with failure recovery.

The maintained AML examples are mechanical translations, except the small native
starter. They are not the final concise architectural rewrites promised by the
broader delivery plan.

## Independent review

An independent test reviewer assessed proposed contracts before production work,
then reviewed the concrete tests and subsequent material changes. Expectations
include actual collision rays, circle-corner negative controls, transformed proxy
geometry, source preservation, independently hashed companion bytes, and the exact
sixteen Dust II route contracts with unchanged player settings.

A separate implementation reviewer reviewed the foundation and follow-up fixes.
Findings resolved include scale/reflection handling, wall profile stations,
vertical paths, static/dynamic composition, physical hash isolation, datum
serialization, CSG operand admission, expansion budgets, partial enclosure spans,
round ends, actual cylinder bounds proxies, ID reservation, primitive anchoring,
link retention, strict floor-gap enforcement, builder ownership, transformed host
cuts, dependency diagnostic attribution, compound-host depth, and wall-span
height conflicts.

Both reviewers reported no remaining material findings in the reviewed foundation
slice. Neither review establishes acceptance of the unfinished later phases.

## Verification

- Node 24.12.0; `npm run check` and `git diff --check` pass.
- `npm test`: 442 pass, no failures, one optional integration skip.
- Focused AML/schema/migration/Dust II/CLI run: 36 pass.
- `xmllint --schema schema/aml.xsd` validates all five maintained AML sources.
- `npm run build:viewer` and `npm run build:site` pass.
- All eight `npm run test:preview:browser` scripts pass against AML-only inputs,
  including watches, malformed/stale recovery, companion loading, matrices,
  contours, inspection, overlap findings, and constrained movement.
- Production site/viewer browser acceptance passes, including offline reload,
  Dust II rendering, accessibility, mobile/reduced-motion behavior, cancellation,
  graphics-context recovery, and WebGL-unavailable fallback.
- Dust II retains all sixteen required routes and local distance bounds. Final
  collision probes retain CT support at Z=0, Short at Z=4 with a 3.8 m underside,
  and the tested Goose stair elevation at Z=4.36.

Logs and browser evidence are under ignored `generated/`, including
`aml-node-tests.log`, `aml-foundation-checks.log`, `aml-preview-browser.log`,
`aml-site-browser.log`, and `aml-site-browser/`. The source-byte manifest is
`generated/aml-foundation-review/manifest.json`.

The legacy site suite passes 23 of 24 cases. Its stored Cycles-bake test fails at
the source-hash assertion: the stored binding begins `ef16dc637ede57ef`, while the
current source hash begins `b8204ff1615c8ed6`. The source-generation inputs and
stored binding are unchanged by this work; no bake was regenerated or assertion
weakened. Remaining site geometry cases pass.

The default Python lacks NumPy. The six tracing/producer-command checks pass with
the existing `generated/dust2-venv/bin/python`, which has NumPy and Pillow. Optional
native BSP tools were not established by the skipped integration; native AML BSP
retained-solid/material integration is itself still unfinished.

## Remaining delivery

The complete five-phase plan is not implemented. Remaining work includes exposed
material ownership/partitions; custom and separate-tread undersides; complete
enclosures; concise native Daiban and Dust II authoring with their full review
packets; heightmaps, grading, spatial terrain compilation and exposure/orientation
policies; complete volume/clearance behavior; native export integration; producer
cutover; and removal of the transitional SVGX authoring APIs outside migration.

Photographic fidelity remains separate from compiler and traversal acceptance.
See [AML delivery status](../AML.md) for current authoring boundaries.
