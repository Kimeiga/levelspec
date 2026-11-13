# Independent capture-view manifest implementation review

Date: 2026-11-01. Current disposition: **accepted for the documented manifest/capture
contract, including the tall-canvas correction at helper
`e873614c55bc5e639dab905afe431cd0eeeeae5ba75d7424bf88e10691a946aa`; no material
implementation finding.** This implementation review is
separate from the pre/post test review and from architectural camera-fit/fidelity
acceptance. No helper, manifest defaults, model, fixtures or user preview 5186 were
modified/operated by this reviewer.

Initial reviewed identities:

- `projects/dai2-daiban/capture.mjs`:
  `57573442a4b0276b56d47583b4e55170c3a7f80450252f7f0a9a6054c26f2742`.
- `projects/dai2-daiban/capture-views.json`:
  `6d8354a7d153f83d97e579ac3d4f4b35c92dca88cd0f911cc2a29197c09b0b55`.

Read the [view contract](../../projects/dai2-daiban/studies/r02/capture-view-contract.md),
[independent test assessment](../../projects/dai2-daiban/studies/r02/porthole-connections-source/capture-manifest-test-review.md),
actual helper/default data, previous accepted helper and relevant reviewer controls.
Compared the change directly with the independently reviewed
[capture-integrity implementation](reference-capture-implementation.md).

## Tall-canvas follow-up: accepted

Reviewed the correction from the initial helper above to SHA256
`e873614c55bc5e639dab905afe431cd0eeeeae5ba75d7424bf88e10691a946aa`.
The reproduced defect was in HTML layout ownership: an 800×1200 backing store and
correct PNG dimensions did not prevent the fixed 1300×1200 browser layout from
ancestor-clipping or covering the canvas with its footer. Native dimensions alone
were insufficient evidence of complete visible canvas capture.

The correction addresses that cause. After native GPU-limit validation it enlarges
the browser viewport to leave layout room, isolates HTML visibility to the model
and actual canvas, and checks 25 viewport hit points before screenshotting. Appearance
is selected before isolation, preserving normal UI-driven material selection. The
existing CSS/backing-store readiness checks remain; coverage observations are retained
beside actual camera/matrix state. A sampled hit-test failure rejects the attempt.
This changes temporary capture presentation, not authored geometry/materials or
the verified source/companion/manifest ownership flow.

Independently executed a new actual 800×1200 capture on an isolated valid XML/GLB
fixture with roll 17°, FOV 55° and illustrated appearance. It succeeded with matching
PNG, CSS canvas and backing-store dimensions; all 25 recorded hit points belonged
to the canvas, including points at viewport Y 1266.8, beyond the former 1200-pixel
viewport. The actual native-aspect projection and requested pose/roll were checked
independently within 1e-6. The held manifest snapshot matched exactly. The saved
native image was personally inspected: no reviewer footer or UI covered the render.

Helper identity was held before/after and unchanged. Exact probe/results:
`/tmp/daiban-capture-tall-independent.mjs` and
`/tmp/daiban-capture-tall-independent-results.json`. Reviewed helper copy:
`/tmp/daiban-capture-tall-reviewed.mjs`. Retained fixture/capture root:
`/var/folders/61/r756smb95_16p68hfyzwypq40000gn/T/daiban-capture-manifest-review-svYKGm`.
The independent server was closed. The separate test reviewer owns the complete
regression exercise; its execution is not claimed here. No material cause, scope,
lifecycle or ownership defect remains in this correction. Canvas coverage is capture
evidence, not proof of architectural fidelity or calibrated camera correspondence.

## Ownership and validation

Camera hypotheses now belong to held JSON data rather than executable preset
edits. The optional second positional argument resolves from the working directory;
the omitted argument resolves the default JSON beside the helper. Excess arguments
reject. The default data preserves the prior four poses, native sizes and appearances.
Appearance is a view field independent of its ID; no construction-ID branch remains.

The loader owns strict schema validation before browser creation: nonempty array,
record objects, supported keys, unique lowercase safe IDs, finite numeric XYZ arrays
at distinct points, positive safe-integer native dimensions, supported projection
and appearance, bounded FOV, finite roll, positive orthographic view height and
descriptive string fields. Defaults are applied once per record. Strings, booleans,
null and overflowed JSON numeric values cannot silently become camera numbers.
Native dimensions receive an actual browser renderbuffer/viewport capability check
before resizing. Requested and actual state remain separate in packet metadata.

The manifest's held bytes, real path and SHA256 enter the same ownership record as
XML/companions. Its lexical/physical paths and linked components participate in the
existing write/identity stamps and replacement checks, including the earlier
case-alias repair. Successful archival writes those held bytes verbatim as
`capture-views.json`; it does not reread mutable data for publication. Metadata records
the manifest source/hash/snapshot. Adding a separate manifest monitor or alternate
snapshot path was unnecessary and was avoided.

Dynamic view PNG names and the manifest archive name join reserved packet ownership.
The existing canonical archive-relative paths, case-folded reserved-name check,
exclusive writes, fresh-directory claim, actual upstream XML/companion verification
and held-buffer archive flow remain intact. The feature changes no source-serving
or browser compiler contract. Watcher setup failures close partial ownership;
browser/watch cleanup remains in the established `finally` path.

## Independent narrow execution

Executed the real helper against temporary valid XML/GLB fixtures on a separate
ephemeral CLI preview, without changing canonical project inputs:

- One explicit custom record with novel ID `solo-native`, 321×211 native dimensions,
  position `[0,-10,0]`, target `[0,0,0]`, FOV 39°, roll +90° and `illustrated` appearance
  produced exactly one native PNG and one recorded view. The archived manifest was
  byte-identical to the nominated held file. The PNG was personally inspected and
  showed the illustrated renderer rather than an absent/blank scene.
- Independently anchored actual matrix rows were screen-right `[0,0,-1]`,
  screen-up `[1,0,0]` and backward `[0,-1,0]`, within 1e-6. Actual projection scale
  matched `1/tan(39°/2)` and the 321/211 aspect independently of helper calculations.
- A finite-component pose whose subtraction/Three arithmetic overflows was also
  exercised. The browser-error path rejected it with exit 1 and no successful
  `capture.json`; it did not publish nonfinite camera metadata as a valid packet.

Helper SHA256 was held before/after these executions and remained identical.
The independent preview was closed. Exact probe/results are retained at
`/tmp/daiban-capture-manifest-independent.mjs` and
`/tmp/daiban-capture-manifest-independent-results.json`; the reviewed helper copy is
`/tmp/daiban-capture-manifest-reviewed.mjs`. Fixture root:
`/var/folders/61/r756smb95_16p68hfyzwypq40000gn/T/daiban-capture-manifest-review-rZ7teB`.

The separate test reviewer owns the custom multi-view/appearance, invalid-schema,
manifest mutation/alias/collision and retained 14-case integrity suite. Those full
runs are not represented as this reviewer's executions. Their final result must be
read in the linked test report for its exact helper/exercise identities. No material
simplicity, lifecycle, source-ownership, validation or packet-boundary defect was
found in this reviewed feature. Manifest labels and successful packet identity do
not establish matched cameras, source fidelity or gameplay reachability.
