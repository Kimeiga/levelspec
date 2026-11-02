# Neutral inspection — independent implementation review

Date: 2026-11-01. Disposition: **accepted; no material implementation finding**.
This is separate from the author's change evidence and independent test review.
Applied repository TypeScript, test-maintenance and preview-art guidance. No
production/helper/model/default-manifest/test files were edited by this reviewer;
user preview 5186 was not operated.

Reviewed the [pre-change assessment](neutral-inspection-test-review.md),
[author handoff/evidence](neutral-inspection-change-evidence.md), actual surrounding
reviewer/CLI/capture code and caller searches. Scope includes
`review/{view,app,scene}.ts`, `src/cli/{main,preview}.ts`, their focused tests,
the invoked calibrated browser test, package/CI wiring, website documentation,
project capture parser/exercise and the capture-view contract.

## State and API ownership

The explicit appearance union and parser own the three supported values without
applying a global default. UI omission remains illustrated; capture-manifest
omission remains materials. This retains the different established caller defaults.
Camera-only `ViewOptions`/`ViewState` remain pose/framing contracts. Composed reviewer
types add appearance; the app combines actual camera state with reviewer-owned
appearance when publishing diagnostics and replay links. Three camera instances
do not acquire a separate presentation-state owner.

The selector updates the app state, redraws, and replaces the appearance URL field.
`viewURL()` serializes the current value over a stale query while preserving unrelated
context. CLI parsing and live URL construction use the same strict appearance parser.
Initial URL parsing rejects the group atomically on invalid input and leaves a usable
illustrated default with a visible diagnostic. Same-document source updates preserve
the selected appearance; camera/projection/selection remain separate controls.
Copied suggestion links inherit the selected presentation query while clearing the
existing explicit camera fields. No obsolete materials boolean caller remains.

## Rendering, clipping and resource ownership

Inspection uses authored color and cached texture maps in `MeshBasicMaterial` with
tone mapping disabled. It therefore does not depend on hemisphere/directional
lighting or shadow reception. Its meshes neither cast nor receive shadows; existing
lights and shadow resources need no parallel mode-specific controller. Switching
back rebuilds the standard lit materials or illustrated shaders through the same
display-key invalidation path.

The authored standard-material branch retains its roughness, metalness, map,
double-sided transparency and opacity configuration. Root independently confirmed
that sRGB texture color-space and repeat-wrapping assignments were present in its
direct pre-change source inspection; they are not a new materials-mode correction.
This confirmation is not an immutable historical loaded-render attestation.

Selection/suggestion tint is applied before choosing the material branch, so it
also reaches the unlit material. Visibility/layer/roof filtering, shared section
planes and the opaque geometry outline pass remain unchanged. Glass/water retain
their existing transparency policy and are not added to the opaque outline pass.
No compiled geometry, collision, navigation, authored material or export document
is mutated by an appearance change.

Appearance participates in the existing display key. Rebuilds release old geometry,
materials and outline materials through existing scene ownership; texture maps
remain shared in the scene cache across appearance switches. Asset replacement,
context loss and final disposal retain the existing generation checks and cache/GPU
cleanup. There is no added renderer, texture cache, resource lifetime or fallback
lighting system to synchronize.

## Capture and verification boundaries

The capture-helper diff against the accepted tall-canvas revision consists of
importing the shared appearance parser, using it for manifest appearance and adding
appearance to the captured URL. The held XML/companion/manifest flow, path/alias
checks, exclusive publication, mutation monitoring and canvas isolation/coverage
remain intact. The exercise's pixel expectation deliberately treats inspection as
authored color rather than falling through to grayscale. No default capture data
or main package dependency changed. The calibrated test is part of the invoked
preview-browser command, which the existing website workflow runs.

Independently ran and passed:

- `npm run check`.
- `node --test tests/review-view.test.ts tests/vector-cli.test.ts`: 15 tests.
- `node tests/inspection-browser.mjs`: calibrated real-browser pixels, texture tint
  and repeat, shadows/orientation, transparency, structural ink, sections and
  appearance roundtrip; actual PNG personally inspected. Evidence:
  `generated/inspection-browser-FWCnIA/`.
- A temporary copy of that browser fixture with an additional ordinary keyboard
  plan-selection action. Inspection floor color changed from 112/128/144 to
  164/190/184 while the camera matrix stayed unchanged, demonstrating the actual
  selection cue rather than an unused state flag. No tracked test was modified.
  Probe: `/tmp/neutral-inspection-independent-selection.mjs`; evidence:
  `generated/inspection-browser-PSFM5X/`.

Own measured lit-material control was 113/128/143 on the lit floor, 46/56/64 in its
shadow and 64/73/83 on the perpendicular wall. Inspection produced 112/128/144 for
all three, with authored texture samples 164/59/50 and 50/96/164, matching repeated
placement. Glass retained rear-color contribution at 152/169/196. Page/WebGL errors
were empty. This independently corroborates neutral unlit rendering rather than
merely disabling received shadows or echoing a selector value.

The author's complete preview/suggestions command, 43-case capture run and both
builds were examined as attributed evidence, not claimed as this reviewer's runs.
The separate test review owns its final test disposition. Pixel and replay success
do not establish photographic calibration, source fidelity or gameplay validity.

## Test-only correction follow-up

Reviewed final `tests/inspection-browser.mjs` SHA256
`c09da73344056744e88e042eb089362bb7a8b841ddb318e1828efc102c6be54f`.
Disposition remains **accepted; no material implementation finding**. The reviewed
production and helper identities below remain unchanged.

Creating `generated` recursively before its unique `mkdtemp` child fixes genuine
fresh-checkout/working-directory startup. It preserves existing evidence and adds
no cleanup or overwrite behavior. The glass assertion now checks calibrated RGB
152/169/196 with channel tolerance 7 instead of a broad inequality that could accept
a missing glass layer. This is a stronger observable rendering assertion.

Independently recomputed the fixture expectation: two 0.48-opacity faces give
effective alpha 0.7296. Blending glass 128/192/224 over rear wall 200/60/40 in linear
sRGB and encoding the result gives 151.9297/169.0089/195.6148. The rounded expectation
and tolerance are justified by the existing transparency policy and reject both
bare rear wall and opaque front glass. The two-line comment explains that contract
without depending on a production material-builder call or measured golden alone.

The [test review](neutral-inspection-test-review.md) records successful final normal
and fresh-working-directory executions and a missing-glass mutation that now
correctly fails. These focused executions are attributed to that reviewer, not
additional runs here. No broad rerun was needed for these two test-only corrections;
no production/helper/model/test code was edited by this implementation reviewer.

## Reviewed source identities

| File | SHA256 |
|---|---|
| `review/view.ts` | `1a54799973f96ccf0a232bcacc7347559cb417ebc1292af80e5e01a7bf8ff311` |
| `review/app.ts` | `f68fdedd9207fd4cd807c25486e5b252ac82e20a45d3f01dbecad387fd6818dc` |
| `review/scene.ts` | `ae9b28a0cab09d173169b109de83580dd23e0fcce1ff705f2fc370dee5baa676` |
| `src/cli/main.ts` | `8d729335923e504b852b9abe13155522e5c7cb41063d453c0dcc26e93563abcd` |
| `src/cli/preview.ts` | `ae6fdfd269df3e29b7b9be085da0cafd8806e2010de298b32fd4a969cbdb299c` |
| `projects/dai2-daiban/capture.mjs` | `711b16b8297f382025a72379ba664712841574aa670d5076d65e2731480c423b` |
