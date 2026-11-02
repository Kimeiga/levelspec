# Neutral inspection: independent pre-implementation test assessment

Date: 2026-11-01. Scope: review only, before production implementation. Read root
`AGENTS.md`, `maintain-tests`, `write-readable-typescript`, current documentation,
shared reviewer, CLI preview boundaries, project capture helper and representative
browser suites. No model, reviewer, capture helper or port 5186 server changed.

## Need and smallest useful contract

The existing reviewer cannot provide this inspection through its supported controls.
Both illustrated and authored-material surfaces are lit standard materials. The
scene supplies hemisphere lighting, a directional sun and received shadows.
Section height and camera controls can reveal occluded geometry but cannot remove
lighting that obscures an otherwise visible doorway or material boundary. A third
bounded appearance is warranted if comparing authored colors/textures without
these lighting cues is the desired outcome.

Use one appearance choice (`illustrated | materials | inspection`, or an equally
clear final name), rather than a second shadow toggle or adjustable light rig.
Inspection should retain the current authored color/texture mapping, structural
outlines, transparent-surface policy, section clipping, visibility filters and
selection cues, while surface color does not depend on lights or cast/received
shadows. Describe it as neutral unlit inspection, not calibrated photographic
color or a simulation of diffuse daylight. Roughness, metalness and exposure do not
need new user controls. Default illustrated and existing materials behavior remain
intentional supported choices.

For repeatable LLM/reference work, the smallest coherent extension is the same
appearance value in the existing selector, an `appearance` URL parameter and
`preview --appearance`, plus the already-present project capture-manifest field.
Do not encode lighting into the domain document or introduce export settings.
Appearance is presentation state; avoid making a Three camera class responsible
for its storage merely because current view serialization lives in `review/view.ts`.
A shared parser/union is useful; a new generic settings system is unnecessary.

Current `Open this view` explicitly excludes appearance in `docs/WEBSITE.md`; making
it replay appearance is a deliberate small contract extension and needs that doc
updated. An omitted URL/CLI value should retain illustrated. An omitted capture
manifest value should retain the helper's existing materials default. These two
defaults serve existing callers and need not be made identical.

## Coverage ownership and meaningful acceptance

| Owner | Minimum useful coverage |
| --- | --- |
| `tests/review-view.test.ts` (or a focused shared presentation parser suite) | Each explicit value parses; omitted appearance stays unspecified until its caller applies a default; invalid/empty values reject; serialization replays the current value while preserving unrelated parameters and fragment. |
| `tests/vector-cli.test.ts` | Extend the existing valid preview invocation to carry inspection into the emitted live URL; extend invalid-argument cases with unknown and empty appearance, asserting usage exit 2 before source reads/server startup. Do not add another whole CLI fixture for one flag. |
| Focused shared-reviewer browser scenario | Real pixel proof of unlit authored surfaces, texture retention and structural edges; selector switching; switching back restores existing materials and illustrated render behavior. Keep default and camera preservation assertions here. |
| `tests/preview-browser.mjs` | URL initialization and actual `Open this view` replay after changing the selector; selected appearance survives one existing file-watch update/recovery path. Extend its existing live-preview lifecycle rather than duplicating SSE tests. |
| `projects/dai2-daiban/capture-manifest.exercise.mjs` | One explicit inspection view accepted, `actualAppearance` recorded accurately and captured PNG contains authored color; invalid appearance remains rejected before output publication. Preserve omitted appearance as materials. |

The focused pixel scenario can live in the existing browser entry point or a new
focused script, but it must be invoked by `package.json`/CI. The current dedicated
`website/tests/outlines-browser.mjs` is useful precedent for analytical pixel
sampling; it is not invoked by `test:site:browser` or the inspected website workflow.
Adding only a dormant script would leave the feature unprotected.

The current browser appearance assertion only checks that materials changes more
than 0.5% of pixels relative to illustrated. It would accept an inspection option
that still receives shadows, drops textures, renders an unrelated solid color or
loses outlines. Keep that broad smoke test if useful, but it cannot own the new
promise.

## Pixel fixture and independent expectations

Use a small disposable XML fixture through the actual reviewer, not the canonical
courtyard. A known floor, a wall/block casting a predictable sun shadow, two
perpendicular surfaces sharing a midtone authored material, and a tiny generated
local two-color texture are enough. Keep camera, framing, viewport and DPR fixed.
Pick sample points analytically from fixture coordinates, away from geometric
edges, texture-cell transitions and antialiasing. Existing outline tests show how
to project known world points using the exposed camera diagnostics.

The core assertion must combine these independent observations:

1. In materials mode, known lit and shadowed patches differ measurably. This
   positive control establishes that the chosen pixels actually exercise shadows
   and prevents a fixture that never exposes the defect from producing a pass.
2. In inspection, those same authored patches match within a modest RGB tolerance,
   and differently oriented patches of the same material do too. This catches
   both leftover shadow reception and directional/hemisphere shading. Merely
   turning off shadow maps does not satisfy the contract.
3. Inspection patch colors remain close to their independently authored midtone
   values, using a tolerant channel/color comparison in output sRGB, rather than
   only checking equality between patches. A blank render or one fallback color
   would otherwise pass. Texture samples must preserve both authored colors and
   repeat placement, including a color tint if the fixture uses one. Do not derive
   expected texture values by calling the production material builder.
4. A known doorway/corner/contact segment retains dark structural ink at its
   projected position; flat interiors stay clean. Sectioning removes both a known
   surface and its corresponding outline. Reuse the existing outline ownership
   and sampling approach; no need to repeat every DPR/zoom case in the new test.
5. Switch inspection → materials → illustrated → inspection at the same pose.
   Materials restores the measured lit/shadow difference, illustrated restores a
   grayscale surface, and inspection restores its neutral colored result. This
   exercises cache invalidation and avoids accepting state leaked across modes.

A single transparent glass/water overlap sample is useful if material construction
is changed: the rear known color must still contribute and opacity must not become
fully opaque. It can be a small additional patch rather than a second scene.

Do not use exact full-image snapshots, CSS/source-string scans, assertions on the
material class or shadow flags, draw-call counts, or a selector value alone as
visual acceptance. Pixel evidence establishes appearance only; it cannot establish
collision, export identity or navigation validity. No new compiler/export tests
are warranted if the change stays entirely in review presentation.

## Replay, capture and readiness pitfalls

- Test a URL opened directly with inspection and a link generated after changing
  the selector from another mode. Test switching back before generating a second
  link; simply preserving an old `appearance` query would pass the first case but
  replay stale state in the second. Confirm camera matrices/framing remain fixed.
- Invalid URL appearance should produce a visible actionable diagnostic and leave
  a usable default review; invalid input must not silently select a mismatched
  DOM value. Define whether the whole initial option group is rejected, following
  the current camera parser's atomic behavior, and test that chosen behavior.
- `capture.mjs` already validates appearance and changes the selector after load.
  Its `capture.json` records requested/actual appearance, but its recorded URL
  currently contains only camera fields. If URL appearance is added, include it
  in captured URLs so those URLs actually replay the captured appearance.
- The capture exercise's `appearancePixels` currently has a binary
  materials-versus-else branch. Inspection would incorrectly be treated as
  illustrated there. Extend its visible authored-color expectation deliberately,
  while keeping the dedicated shadow/texture proof in the reviewer suite.
- Compile-ready and two animation frames do not guarantee asynchronous textures
  have loaded. Arm response/pixel readiness before loading the fixture, await the
  real texture response, then wait for the delivered render and bounded expected
  pixels. Do not solve this with fixed sleeps. Retain PNG and sampled values on
  failure, plus page errors/WebGL diagnostics.
- Use temporary files, a separate random preview port and unique ignored output
  directories. Do not reuse port 5186 or edit the canonical capture manifest to
  make acceptance pass. The full capture-integrity mutation matrix need not be
  expanded for an enum addition.

## Assessment outcome and verification

New tests are warranted because this is a public visual behavior change with
URL/CLI/capture input implications. One strong calibrated browser scenario and
small additions to existing boundary suites are sufficient; no general lighting
test framework or duplicated application harness is necessary.

Ran `node --test tests/review-view.test.ts`: 3/3 passed on the pre-implementation
working tree. This assessment did not launch a browser or claim new visual behavior
has passed: the pixel cases above are acceptance requirements for implementation.
No dependency installation or production edits were performed.

## Post-change independent assessment

Reviewed the actual implementation and tests after reading
`neutral-inspection-change-evidence.md` and the separate
`neutral-inspection-implementation-review.md`. The earlier sections above are
the preserved pre-implementation assessment, not a claim about the current tree.

The implementation resolves the original ownership recommendations: a strict
shared appearance union/parser with caller-specific omitted defaults; app-owned
presentation composed with camera state; current-state URL replacement; CLI input;
and capture URL plus requested/actual metadata. The focused pixel script is invoked
by the existing preview-browser command. Boundary assertions use the actual CLI,
real browser and retained packet outputs rather than source spelling.

The calibrated fixture has independently authored patch colors and coordinates.
Materials produces a positive lit/shadow control; the expected neutral RGB is the
literal authored color, not a result calculated by production code. The additional
wall sample rejects normal-dependent lighting. The texture expectation independently
implements linear-sRGB multiplication and output encoding, then checks both stripe
colors and a repeated cell. Known-coordinate ink, section disappearance, retained
lower floor, grayscale restoration and exact camera-matrix retention cover meaningful
outcomes. Its response wait and bounded delivered-pixel observation address
asynchronous texture readiness without arbitrary sleeps.

Two concrete test findings were reported for correction before final acceptance:

1. The initial glass assertion (`R > 135 && B < 215`) accepted removal of the glass
   geometry. I copied the test into an ignored generated probe and removed only
   the glass edge from its disposable XML fixture. The complete initial test
   incorrectly passed: the claimed glass sample became bare rear-wall RGB
   200/61/38. Probe `generated/neutral-inspection-test-review-no-glass.mjs`, SHA256
   `3771424656467147904007b7257703598d2cb034d5aea0071fbc368d75a0e4a7`;
   retained evidence `generated/inspection-browser-E60SBV/`. This is a weakness in
   the test's negative outcome, not an observed production rendering defect.
2. The initial script calls `mkdtemp('generated/inspection-browser-')` before
   creating its ignored parent directory. An unchanged script imported from a
   fresh temporary working directory failed with ENOENT before browser startup.
   Reproduction directory:
   `/var/folders/61/r756smb95_16p68hfyzwypq40000gn/T/inspection-clean-cwd-fEGJnH`.
   The inspected browser CI builds use `dist`/`dist-site`, and preceding preview
   scripts do not create `generated`, so an existing local directory concealed a
   clean-checkout failure. The correction is to create the parent before mkdtemp.

Independent executions so far, without retries:

- `node --test tests/review-view.test.ts tests/vector-cli.test.ts`: 15/15 passed.
- `node tests/preview-browser.mjs`: passed the full live-preview lifecycle,
  direct inspection initialization, generated URL after switching to materials,
  replay/reload and fixed matrices, invalid initial appearance diagnostic and
  atomic usable default, and watched-source appearance retention.
- `node tests/inspection-browser.mjs`: passed; evidence
  `generated/inspection-browser-Q13Uxx/`. Personally viewed its actual inspection
  PNG. Materials lit/shadow/wall RGB was 113/128/143, 46/56/64, 64/73/83;
  inspection was 112/128/144 for all three. Texture red/blue/repeated-red was
  164/59/50, 50/96/164, 164/59/50; glass was 152/169/196. Page/WebGL errors empty.
- The missing-glass counterexample above passed under the weak initial assertion;
  the fresh-working-directory counterexample exited 1 with ENOENT. Both adverse
  results are retained and must not be counted as successful acceptance.

The author reports type check, both builds, complete invoked preview/suggestions/
inspection command and 43-case capture exercise. I inspected the capture artifact
`generated/dai2-daiban-review/capture-manifest/run-mANrCy/exercise.json`: 43 passed,
zero failures/skips; helper/default/exercise identities match the table below.
Those runs remain attributed author evidence. The implementation reviewer separately
reports type check, 15 Node tests, calibrated browser and an ordinary keyboard
plan-selection pixel probe; that selection evidence is attributed, not my execution.
The source inspection confirms selection tint is applied before the appearance
branch. No new compiler/export/navigation suite is warranted for this presentation
change.

Reviewed identities before test-only corrections:

| File | SHA256 |
| --- | --- |
| `review/view.ts` | `1a54799973f96ccf0a232bcacc7347559cb417ebc1292af80e5e01a7bf8ff311` |
| `review/app.ts` | `f68fdedd9207fd4cd807c25486e5b252ac82e20a45d3f01dbecad387fd6818dc` |
| `review/scene.ts` | `ae9b28a0cab09d173169b109de83580dd23e0fcce1ff705f2fc370dee5baa676` |
| `src/cli/main.ts` | `8d729335923e504b852b9abe13155522e5c7cb41063d453c0dcc26e93563abcd` |
| `src/cli/preview.ts` | `ae6fdfd269df3e29b7b9be085da0cafd8806e2010de298b32fd4a969cbdb299c` |
| `tests/review-view.test.ts` | `c1b3009ce4b4803010a5d1942c0a92e7582ec793f27774e533e59c5275961237` |
| `tests/vector-cli.test.ts` | `b899c361de5270bc09bbeffbeedb9af8a358c99167d496aae1ca1a50473990c5` |
| `tests/preview-browser.mjs` | `a4592bd0d946e6ed814040daa57f72fd7cadd67d8ca19c3b4fe7fdb815ffd085` |
| `tests/inspection-browser.mjs` | `a154c77b3bb412a88842288b391db064c0647d836334851f2fb3a42dc78a4a81` |
| `projects/dai2-daiban/capture.mjs` | `711b16b8297f382025a72379ba664712841574aa670d5076d65e2731480c423b` |
| `projects/dai2-daiban/capture-manifest.exercise.mjs` | `213027dffff73f96c362752351f05266755aef0997de11bdbe9bdcb5096f74da` |
| `projects/dai2-daiban/capture-views.json` | `6d8354a7d153f83d97e579ac3d4f4b35c92dca88cd0f911cc2a29197c09b0b55` |
| `package.json` | `20d670007e66bbd8b52958fb58a96c158839b85ace9676e3dcc7f64dd7088980` |

### Corrections and final disposition

**Accepted; both material test findings resolved, no remaining material test
finding.** Root applied only the two requested test corrections. The final
`tests/inspection-browser.mjs` SHA256 is
`c09da73344056744e88e042eb089362bb7a8b841ddb318e1828efc102c6be54f`.
All other source/test/helper/package/default-manifest identities in the table were
rechecked and remain unchanged.

The script now creates `generated` before mkdtemp. Its glass expectation is RGB
152/169/196 with channel tolerance 7. I independently calculated the known fixture
composite in linear light: two faces with opacity 0.48 have effective alpha
`1 - (1 - 0.48)^2 = 0.7296`; mixing authored glass 128/192/224 with rear wall
200/60/40 and encoding sRGB gives 151.9297/169.0089/195.6148. Thus the expectation
is justified independently of measured production pixels, and rejects both a
missing front layer and an opaque front layer.

Focused follow-up executions on that final test identity, without retries:

- Normal calibrated script: **passed**, retained
  `generated/inspection-browser-uk7yKR/`.
- Unchanged final script imported from a new working directory with no generated
  parent: **passed**, retained
  `/var/folders/61/r756smb95_16p68hfyzwypq40000gn/T/inspection-clean-cwd-fixed-Nkz4Ht/generated/inspection-browser-6bVAqg/`.
  This directly verifies clean-directory startup rather than relying on the
  already-existing workspace output tree.
- Final test with only the disposable fixture glass edge removed: **correctly
  failed** at the composite assertion (200/61/38 versus 152/169/196), retained
  `generated/inspection-browser-KNSTYI/`. Probe
  `generated/neutral-inspection-test-review-no-glass-fixed.mjs` SHA256
  `aec3f8fde936837e2d7244e2570470a2801a40f49c396fb735bf1401787c66af`.
  The old falsely passing probe and its evidence remain retained separately.

The final focused reruns are justified by the test corrections; the earlier
15-test CLI/parser and full preview lifecycle runs remain valid because their
source and production dependencies did not change. The author's complete invoked
command/builds/capture run and implementation reviewer's selection probe remain
attributed evidence as described above, not additional executions by this reviewer.

The final coverage is sufficient for this bounded presentation feature. It cannot
accept a merely lit inspection branch because the authored shadow and perpendicular
patches must independently match unlit RGB; it cannot accept lost textures because
two tinted colors and repeat placement are asserted. Camera diagnostics locate
samples and verify replay; actual PNG pixels establish appearance. Screenshot
success makes no claim about canonical reference fidelity, photographic calibration,
export geometry, collision or gameplay reachability.

No reviewer production/helper/model/default-manifest edits, dependency installation,
retry or interaction with user server 5186 occurred. Reviewer-created files were
this review record and isolated ignored/temporary probes and retained evidence.
