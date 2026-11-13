# Phase-two independent implementation review

Scope: XML package-root cutover, retained shared geometry, TypeScript discovery,
package/scripts/lockfile, and CI. Applied local `write-readable-typescript` guidance.
Production changes were inspected independently of their author. This report is
not a review of the pre-existing reviewer UI changes in viewer/website/review.

## Outcome

No blocking implementation finding in the reviewed production cutover.

- Package root resolves directly to the real XML entrypoint; legacy generation
  subpath is removed, while vector/lighting/export/authoring remain supported.
  No obsolete reader, compatibility wrapper, or new standalone CLI was introduced.
- BSP imports a focused internal box-mesh helper rather than legacy core. The
  extracted constructor preserves corner order, positions, normals and triangle
  indices. It does not accept or mutate caller-owned accumulator state. The
  remaining caller only constructs bounded enclosure boxes.
- Independent export tests derive signed volume with a test-local scalar triple
  product and check analytic asymmetric translated volume, outward normals,
  geometric winding and reverse sign. Public-root integration uses actual package
  self-resolution and XML compile/validate/runtime/GLB behavior.
- Typecheck covers retained src/tools/tests/browser configurations and includes
  the user's review directory. `npm run check` passed during this review.
- Root Node execution now bounds concurrency at two; website CI invokes the same
  npm command. Reference-authoring path filters include all retained src/tools/tests.
- Source search found no remaining legacy core/generator/ASCII authoring imports in
  retained src/tools/tests. Asset/docs retirement is separately inventoried.
- Package-lock differences are metadata/order and npm peer annotation, not a
  dependency upgrade. Existing versions remain unchanged.

## Corrected finding

The extracted helper initially retained the old header's inaccurate claim that
all exporters/renderers obtain triangles there. Reported to the coordinator and
rechecked after correction: its documentation now explicitly describes BSP
encapsulation geometry and downstream axis conversion. No numerical change was
needed.

## Review boundaries

The inventory agent was still updating README and retirement documentation during
this pass; their final claims are not established by this report. Existing UI edits
and untracked review assets belong to concurrent/user work and were deliberately
excluded. Typecheck success is not a claim of GPU, native exporter or browser
acceptance. The coordinator records complete acceptance execution separately.

Reviewed package.json, package-lock diff, tsconfig.json, both acceptance workflow
diffs, BSP box call site, full extracted helper, public-root integration test,
volume/winding tests, test-retirement mapping, and retained source import searches.
This bounded review does not re-prove unrelated numerical algorithms or every
legacy deletion's historical semantics.

## Final inventory/documentation follow-up

Re-read the finalized README, XML implementation ledger, retirement ledger and
current command references in SVGX/EXPORTS. The documented 904 asset/tool removals
match the tracked deletion counts: 381 maps, nine JSON levels, nine authored inputs,
three looks inputs, 475 reference files, nine previews and 18 exclusive tools.
The retained XML/reference assets and shared geometry are explicitly distinguished.
Remaining obsolete path mentions in prior audit/plan documents are identified as
historical evidence rather than installed implementation. No additional cutover
blocking finding was established by this follow-up.

The current `website/main.ts` mounts `review/app.ts`; `website/index.html` now
contains only that entry script. The old experience browser test still waits for
`#playground[data-status="ready"]` and reads its data-height/geometry-hash attributes.
Those selectors do not exist in the replacement reviewer UI. This is a direct
source mismatch in the pre-existing/concurrent UI work, unrelated to package-root,
legacy asset or BSP geometry retirement. A timeout against that acceptance suite
must not be reported as a passing UI run, or repaired by weakening the old tests
inside this cutover. The UI owner needs to reconcile its intended acceptance
contract separately. Source inspection establishes the selector mismatch; actual
browser execution/failure details belong in the coordinator's validation record.
