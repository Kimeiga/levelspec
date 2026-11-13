# Frame aspect: independent pre-implementation test assessment

Date: 2026-11-01. Review only, before implementation. Applied repository
`maintain-tests` and `write-readable-typescript` guidance. Read the current shared
reviewer, camera resizing, stylesheet, CLI, capture helper, reference declarations,
existing parser/CLI/browser tests and current documentation. No reviewer, helper,
test, canonical model or running user server was changed or operated.

## Existing capability and observed gap

The capture helper already solves native-image output: it explicitly sizes
`#model`, waits for matching CSS/backing-store dimensions, checks canvas ownership
at a 5×5 grid, and records actual projection matrices and camera state. It does not
solve a live review link whose image composition must survive a different window.
The live reviewer fills its available viewport. Resize preserves camera pose,
vertical FOV/orthographic height and roll but recalculates horizontal projection
from container width/height. Current documentation explicitly requires the same
viewport aspect for comparison. No supported live frame lock exists.

Independently measured the unchanged browser with a known perspective pose, FOV 47°,
roll 31° and neutral inspection, on an isolated random-port preview of the existing
CLI starter. No source edits were made:

| Browser viewport | Actual canvas | W/H | Projection horizontal scale | Vertical scale |
| --- | --- | --- | --- | --- |
| 1400×1000 | 1176×906 | 1.2980132450 | 1.7718174726 | 2.2998425472 |
| 800×1000 | 620×906 | 0.6843267108 | 3.3607376577 | 2.2998425472 |

The complete reported view and world-to-camera matrix were identical between
sizes. This establishes a real composition difference despite unchanged pose,
rather than a need for different source geometry. Evidence and actual PNGs:
`generated/frame-aspect-preassessment-9J9BrG/`; `results.json` SHA256
`88e009028be465b77f5275b1d399ba6e242b85f996f702473a6e30e11cf66b78`.

A bounded reviewer-owned frame aspect is justified for live source comparison.
Native capture remains the sufficient existing capability when the task is only
to produce an image at specified pixel dimensions. No new camera solver, reference
registration, export option or source-level property is needed.

## Smallest coherent contract

- A frame ratio means **image width divided by image height**. Omission means the
  existing responsive viewport behavior. A finite positive numeric ratio locks
  the image frame, centered at the largest size contained by the available 3D
  viewport; unused space is outside the canvas. It does not stretch the image or
  crop a full-viewport render after projection.
- Treat presets and “use selected reference ratio” as conveniences that set the
  same numeric lock. A reference action can copy declared reference width/height
  into a numeric value. This avoids persisting a reference identifier or creating
  a live dependency on image loading, EXIF, reference replacement or selection.
  Disable/explain the action when no declared reference is selected. Do not infer
  a ratio from the small sidebar thumbnail's rendered rectangle.
- Keep lock preference and actual rendered aspect distinct. A responsive viewport
  still has an actual W/H, so publish that actual value alongside composed current
  review state. For an exact **Open this view** link, serialize actual W/H even if
  the originating UI currently follows the viewport; reopening that link applies
  the numeric frame lock. Otherwise a link from default mode still cannot replay
  composition across windows. Document this deliberate distinction. If product
  intent instead preserves responsive preference in copied links, describe those
  links as pose-only rather than promising equal composition.
- One shared optional numeric URL/CLI parameter (for example `frame-aspect` /
  `--frame-aspect`) is sufficient. The live control can release the lock back to
  viewport mode. Releasing must remove any stale lock from current location state;
  subsequent exact-view links must serialize the newly measured actual aspect.
  Preserve unrelated URL context, camera, roll and appearance.
- Layout state belongs to the reviewer, not `ViewOptions`/camera instances. The
  existing composed reviewer view type is an appropriate public reporting
  boundary; scene resize should continue consuming the actual rendering surface.
  Avoid a second aspect controller in the camera or renderer that can disagree
  with canvas dimensions and input coordinates.
- Default 2D plan behavior can remain full viewport. Entering/exiting 2D or walking
  must preserve the chosen 3D lock and overview pose. The simplest walk policy is
  to use the same canvas frame; an intentional temporary full-viewport walk policy
  would need explicit restoration coverage and is unnecessary for this task.
- Reject empty, nonnumeric, zero, negative and nonfinite values without partial
  application. Define representability at extremes: a merely positive value such
  as `1e-300` can produce zero-sized/overflowed renderer dimensions. Either bound
  the documented supported ratio range or safely reject ratios that cannot render
  a useful frame. Do not silently clamp to a different reported/serialized ratio.

## Test ownership

| Existing boundary | Meaningful changes |
| --- | --- |
| `tests/review-view.test.ts` | Parse explicit numeric ratios and omission; reject invalid values; serialize actual aspect, replace stale ratio and preserve unrelated parameters/hash. Test a responsive view's actual ratio separately from an explicit lock preference. |
| `tests/vector-cli.test.ts` | Extend the existing real preview invocation to assert the emitted ratio URL; extend usage cases to reject invalid ratio before source reads/server readiness. No duplicated CLI fixture is necessary. |
| Focused invoked browser scenario | Layout, actual rendering, normalized composition under resize and replay, reference/custom/preset controls, release, fit and input mapping. Invoke it from the existing browser command/CI if a separate script is used. |
| `tests/preview-browser.mjs` | Extend its existing file-watch/malformed-recovery scenario to preserve frame lock and actual camera through an update; direct URL initialization and copied-link replay can share its current setup. Avoid duplicating SSE lifecycle cases. |
| Project capture exercise | Existing native dimensions, pixel corners/bottom, matrix and coverage checks remain authoritative. Rerun the focused native/tall/mixed control when shared frame layout changes; do not rewrite helper DOM manipulation or relax ownership checks to accommodate the new UI. |

The shared browser scenario should test the real reviewer via public controls and
disposable XML/reference companions. No source-text assertions, helper-call counts
or DOM structural mutations are needed. Tests that only read a selected ratio or
`data-view` can accept a renderer still using full-viewport aspect.

## Browser acceptance and independent expectations

1. **Prove the fixture discriminates the defect.** In viewport mode, resizing a
   fixed pose between wide and narrow windows changes canvas W/H and horizontal
   projection while preserving camera position, target, FOV/view height and roll.
   This is a useful positive control, not an expected failure test for a removed
   feature: responsive viewport mode remains supported.
2. **Lock and resize in both containment directions.** Set a known portrait ratio
   such as 3/4 in a wide window, then a sufficiently narrow/tall window so the
   limiting dimension changes. Assert the canvas frame stays inside the available
   viewport and is centered/maximally contained. The frame, not the browser, must
   have W/H = 3/4. Default release must again fill the viewport and restore
   responsive horizontal projection. Include a second ratio or the landscape
   preset so a hardcoded portrait box cannot pass.
3. **Verify projection, not just box size.** For perspective, independently expect
   `P[5] = cot(verticalFov/2)` and `P[0] = P[5]/aspect`; for orthographic, expect
   `P[5] = 2/viewHeight`, `P[0] = P[5]/aspect`. Retain the known rolled camera matrix.
   Compare those terms and independently projected fixture landmarks in normalized
   canvas coordinates across resize and replay. Known colored/ink patches at
   those positions must still appear in PNGs. This catches CSS stretching, cropped
   rendering, blank frames, an ignored ratio and camera compensation used to hide
   wrong layout. Do not require identical pixel-sized screenshots at different
   canvas resolutions.
4. **Replay into a differently sized browser.** Copy the real link after applying
   a custom/reference ratio, open a new page with a different window aspect and
   assert equal ratio, effective projection/framing and pose/roll/appearance.
   Also copy from responsive mode: the exact link should lock its originating
   actual aspect under the recommended contract. Then change/release the lock and
   generate another link, proving stale URL state is replaced. Reload the current
   URL to confirm the documented mode semantics.
5. **Use real reference metadata.** Provide a declared 600×800 reference (small
   valid companion bytes are enough) and assert its action yields 0.75 regardless
   of thumbnail size. Changing the selected reference should not alter the copied
   numeric lock under the proposed copy-action contract. Selecting none must not
   silently reset a valid custom frame. No asset request outside supplied
   companions should be introduced.
6. **Check input and useful content.** Canvas and backing store should agree with
   the actual frame at DPR 1 and a representative DPR 2 case, allowing integer
   backing-store rounding. A click at an independently projected object must
   select that object after letterboxing; orbit/wheel input must still operate
   inside the frame. A known patch near the bottom and the canvas corners must
   remain visible rather than being clipped by sidebar/footer/viewport overflow.
   Intentional ordinary UI overlays should be accounted for, not hidden by
   mutating framework-owned DOM. Capture's separate hidden-HUD path must retain
   its full 5×5 `elementFromPoint` canvas ownership check.
7. **Fit and lifecycle.** Fit both projections with a lock and a nonzero roll;
   independently known fixture bounds must lie within the frame after fitting,
   with visible margin. This catches initial fit running before the frame resize.
   Fit may intentionally change pose but must retain ratio and effective roll.
   Walking plus Escape must restore the exact overview and chosen lock; resize
   while walking must not change overview state. A 2D/3D round trip must preserve
   frame preference. Extend one existing watched-source update and invalid-source
   recovery to prove the lock survives compilation; do not add a second watcher
   suite. Default viewport mode should keep the existing behavior.
8. **Invalid input and recovery.** Invalid form ratio must leave the previous
   useful frame and camera unchanged, show an actionable diagnostic, and allow a
   later valid value. Invalid initial URL/CLI values should follow the existing
   deliberate atomic option-group rejection/default policy. Cover representative
   extremes as well as NaN/Infinity/zero. A hidden 3D view or transient zero-sized
   container must not publish NaN aspect or corrupt its next valid frame.

Use tolerances tied to actual dimensions: `clientWidth` rounds CSS pixels and GPU
backing sizes are integers, so ratio and normalized pixel tolerances must bound
that rounding (roughly a CSS pixel divided by frame height), not arbitrary broad
percentages. Use the actual bounding rectangle for fractional CSS geometry. Wait
for ResizeObserver-driven frame dimensions and a delivered matrix/render that
matches those dimensions, not fixed sleeps or an arbitrary two-frame assumption.
Retain bounding boxes, matrices, projected sample positions, PNGs and browser
errors on failure; use unique ignored output paths and create the output parent
before mkdtemp. Do not mutate the user preview or share its port.

## Capture compatibility and scope

Keep capture-manifest pixel width/height authoritative. The current helper builds
its own query and resizes `#model` directly; omitted frame lock must continue to
allow this. A new wrapper that imposes max dimensions, insets or inherited aspect
can silently shrink, shift or clip its canvas even if the live UI looks correct.
Retain the existing 800×1200 bottom/corner checks and a differently shaped mixed
view with exact CSS/backing-store sizes and independently expected projection.
The existing ownership assertion must still reject a covered tall canvas.

No helper schema extension is necessary merely to add live frame locking. If a
captured URL is newly advertised as reproducing its frame across windows, its
native width/height ratio would need encoding; that is a separate small explicit
contract change, not permission to change the helper's output size or identity
verification. This assessment leaves the helper unchanged.

This feature warrants focused new browser coverage because it changes actual
layout, projection and input mapping. Parser/CLI extensions can remain small.
Compiler, geometry, navigation and export tests do not establish this behavior and
need no expansion for a purely reviewer-owned change. No screenshot can establish
source fidelity, photographic registration or gameplay validity.

## Verification and reviewed identities

Independently ran `node --test tests/review-view.test.ts`: 5/5 passed. Also ran the
isolated current-browser resize measurement above; it demonstrates existing
responsive behavior, not acceptance of an unimplemented lock. No new dependencies,
production/test/helper edits or user-server interaction occurred. Only this review
record and isolated ignored measurement evidence were created.

| File | SHA256 |
| --- | --- |
| `review/app.ts` | `f68fdedd9207fd4cd807c25486e5b252ac82e20a45d3f01dbecad387fd6818dc` |
| `review/scene.ts` | `ae9b28a0cab09d173169b109de83580dd23e0fcce1ff705f2fc370dee5baa676` |
| `review/view.ts` | `1a54799973f96ccf0a232bcacc7347559cb417ebc1292af80e5e01a7bf8ff311` |
| `review/style.css` | `110d129f4013996aba8767d80b12d922ed797319ea2b468ba2f5e933d11a04f8` |
| `src/cli/main.ts` | `8d729335923e504b852b9abe13155522e5c7cb41063d453c0dcc26e93563abcd` |
| `src/cli/preview.ts` | `ae6fdfd269df3e29b7b9be085da0cafd8806e2010de298b32fd4a969cbdb299c` |
| `projects/dai2-daiban/capture.mjs` | `711b16b8297f382025a72379ba664712841574aa670d5076d65e2731480c423b` |
| `projects/dai2-daiban/capture-manifest.exercise.mjs` | `213027dffff73f96c362752351f05266755aef0997de11bdbe9bdcb5096f74da` |

## Post-change independent test assessment

Final disposition: **accepted; no remaining material test finding**.
The preceding sections preserve the pre-implementation assessment. This follow-up
reviews the final implementation after the separate implementation review's
supported-endpoint repair, including the explicitly authorized native-capture URL
contract extension. Read `frame-aspect-change-evidence.md`, the independent
`frame-aspect-implementation-review.md`, actual parser/CLI/app/layout code, invoked
browser tests, capture helper/consumers and current documentation.

### Requirements and coverage disposition

The primary recommendations are resolved. Camera types remain pose/framing only.
The app owns the optional lock and composes actual measured aspect separately from
the preference. Omission retains responsive behavior, reference/preset/custom
actions converge on one number, and an exact link serializes actual aspect even
from a responsive origin. Releasing removes stale current-URL preference without
preventing a subsequently copied exact link. The documented 0.1..10 live range
deliberately rejects numerical extremes; unsupported responsive/native ratios
remain distinguishable from invalid user input.

The frame browser scenario has meaningful independent oracles rather than merely
reading the selected value. It first proves that responsive resizing changes
horizontal projection with a fixed camera. Locked boxes are compared against
independently calculated containment/centering geometry in both limiting axes.
Delivered projection is checked against vertical FOV/view height and fractional
CSS aspect, with separately bounded backing-store rounding. Known world points
are projected through reported matrices and verified against authored colored PNG
patches; normalized locations, pose and matrix remain stable across resize/replay.
The projection equations, literal authored colors and known fixture coordinates
provide independent expectations; no production layout/material builder supplies
the expected answer. Existing preview tests separately check an analytically known
camera basis and real CLI argument transport.

The tests exercise both projections, DPR 2, two real object selections after
letterboxing, orbit/wheel input, fit margin and roll, declared-reference copying
without implicit following, invalid form/initial values and recovery, responsive
release/reload, 2D/walk/resize restoration, and an existing watched-source/malformed
recovery lifecycle. The new script is invoked by the existing browser command and
CI. Scope remains presentation/layout; no new compiler/export/navigation tests are
warranted.

### Supported endpoints and retained failure evidence

The original implementation reviewer found a real supported-input defect:
fractional CSS quantization put requested 0.1/10 frames just outside parser bounds,
so exact links disappeared. Inspected the preserved original results at
`docs/reviews/frame-aspect-endpoints-before.json` (SHA256
`bbbc0e0bc23594428e48ea9c0d5a2787fe76159309180e2631605dc12879bffc`).
Those results remain failure evidence; I did not re-run old production code or
count that earlier normal-case suite as endpoint acceptance.

The final endpoint tests now require a supported measured aspect, actual
fractional-box/projection equality, a usable href containing that measured aspect,
unchanged camera, known clean pixels and usable subsequent links after replay in
a different window. Endpoint containment allows an explicit CSS-pixel correction
in the tested windows and normalized landmark movement has a pixel-derived bound;
the ordinary tighter assertions are retained. This would reject the recorded
missing-href failure rather than weakening the parser or reporting the preferred
ratio as if it were the actual projection. The bounds describe tested layout
quantization, not a universal exact-pixel rendering promise at arbitrary sizes.

Independently observed final original/resized/replayed endpoint values:

| Preference / case | Actual frame | Reported and projection W/H |
| --- | --- | --- |
| 0.1 original | 90.59375×905 | 0.100103591160221 |
| 0.1 resized | 80.59375×805 | 0.1001164596273292 |
| 0.1 replayed | 75.671875×756 | 0.10009507275132275 |
| 10 original | 1175×117.59375 | 9.992027637523252 |
| 10 resized | 875×87.59375 | 9.989297181591152 |
| 10 replayed | 776×77.65625 | 9.992756539235412 |

### Native capture and replay contract

The helper's coherent cutover from ambiguous `url` to `navigationUrl`, actual
aspect and explicit `replay` status is documented and reflected in the focused
consumer. Native sizing navigation omits the live lock. Supported replay uses
actual final camera/appearance/aspect; unsupported native ratios still produce
their requested PNG with a reason and no known-invalid replay URL. Source/companion
identity monitoring, immutable output publication, reserved paths, ownership and
native dimensions retain their prior boundaries. No compatibility alias or
native-aspect clamp was added.

Independently ran the full focused capture/manifest exercise: **44/44 passed,
zero failures/skips/retries**. This includes immutable output reuse, default
appearance/camera behavior, mixed native sizes, invalid manifests, dynamic reserved
outputs, persistent and ABA manifest mutations, aliases, concurrent claims and
successful recovery. The 800×1200 case retains actual PNG/CSS/backing dimensions,
independently expected matrices and authored-color corner/bottom pixels. I also
read its packet: all 25 canvas ownership samples are present and owned. The
32×640 case retains native aspect 0.05 and expected projection, with
`unsupported-aspect` and no replay URL. It does not reject native capture because
the live lock range is narrower.

For an additional consumer-level check, reopened the saved 800×1200 record's
actual replay query in a new isolated preview of the archived source at browser
viewport 1500×850. Only the retired server origin was replaced. The live frame was
504×756 (W/H exactly 2/3); camera position/target, FOV, height, roll −23°, appearance
and all world-to-camera matrix entries matched the captured record within 1e-6.
Orthographic projection terms remained 0.375/0.25. Four corner and bottom-center
pixels retained authored red content. This verifies the full recorded link's
camera and rendering across window sizes, beyond merely checking query fields.

### Independent executions and attribution

Executed once each on the final identities below, without retries:

- `node --test tests/review-view.test.ts tests/vector-cli.test.ts`: **18/18 passed**.
- `node tests/frame-aspect-browser.mjs`: **passed**, evidence
  `generated/frame-aspect-browser-Hkbhby/`. Personally viewed the actual portrait
  PNG. Known blue patches were 79/128/144 and red 200/79/64, within the authored
  channel tolerance; no page errors recorded. Result SHA256:
  `9c12b879412757170a4296af7f5e7f78cd2299e105e8d4771d9ccdca9042f1ed`.
- `node projects/dai2-daiban/capture-manifest.exercise.mjs generated/frame-aspect-test-review-capture`:
  **44/44 passed**, evidence
  `generated/frame-aspect-test-review-capture/run-BV5Gxz/exercise.json`, SHA256
  `b70e4147c880c40d2e9f50c7664be0322954c82543c921a9f1bd825f09cfc2f8`.
  Its recorded helper/default/exercise hashes match the reviewed identities.
- The isolated saved-native-record replay described above: **passed**, evidence
  `generated/frame-aspect-test-review-replay-x0gzs5/`, result SHA256
  `8e6c511d7bae298bbc3cde2d51d4274d6e40557f44c15b9650ae073c35a55a0c`.
- `node tests/preview-browser.mjs`: **passed** the complete live-preview lifecycle,
  including retained explicit lock/actual aspect after watched source edits and
  retained preference through malformed-source recovery.

The author's type check, both builds, complete four-script invoked browser command
and 14-case source/companion integrity exercise remain attributed evidence, not
additional executions by this reviewer. Inspected the integrity artifact
`generated/dai2-daiban-review/capture-integrity/run-g5735N/exercise.json`: 14 passed,
zero failures/skips, recorded helper hash matches the final helper. The endpoint
repair changes live locked layout, so that prior integrity result is kept
revision-scoped. The implementation reviewer's independent endpoint reproducer and
full final frame suite likewise remain separately attributed. Earlier author
fixture/readiness failures and the original endpoint failure were preserved rather
than overwritten or hidden with retries.

No remaining material coverage gap requires more tests for this bounded change.
Pixel/replay acceptance does not establish photographic registration, reference
fidelity, source geometry, exports, collision or gameplay validity. This reviewer
made no production, model, helper, canonical test or default-manifest edits,
installed no dependencies and did not operate user server 5186. All independently
owned preview/browser processes were closed; only this review record and isolated
ignored test evidence were written.

### Final reviewed identities

Source identities were checked before and after the independent runs and remained
unchanged:

| File | SHA256 |
| --- | --- |
| `review/app.ts` | `7c6b463b553472bb2dfebb4c9ab37cff39d5fed6e35835d59d83b67b91a50cc7` |
| `review/scene.ts` | `03b1e5c2be98501e340f528ca391b31b30054a364bf0524c06c4987cb1043713` |
| `review/view.ts` | `c76353f9ad6008b9724f6bc8ba030425c283c137508275f976b643757fe5f259` |
| `review/style.css` | `48c1112d6c94d95b6e5be6f22d0efba755f6b1b26be977c7f65aea80c36ca429` |
| `src/cli/main.ts` | `cde8868b1d40478129bbfb7cdd8981fd81d2375804446589fbb9bc054eb52850` |
| `src/cli/preview.ts` | `c60594e31848201ee0c3456b71683356f7371ab9b6c0f65c739892b67dd6c85f` |
| `tests/frame-aspect-browser.mjs` | `610c7504f587f173ff0466b9b4dcff57173a2cbb5f8435e7339c5ad34775a6cf` |
| `tests/preview-browser.mjs` | `71a7680cb5c9527e91addb3637d9d7423084cfbee4b218e9c8425237f02536e0` |
| `tests/review-view.test.ts` | `b7b139f0ad15bf17f3ffac69ea7b89136ccadd65f02b00a9e12dec9fd2c94ffa` |
| `tests/vector-cli.test.ts` | `0c9185be3ed5940e3d46fe9c19cf6f13a4a667ce49d4a13677ca3738f4287c61` |
| `projects/dai2-daiban/capture.mjs` | `104ab0a8a46861b98079890b5cb49db09c05c551beed76fe7c551fd436a50c09` |
| `projects/dai2-daiban/capture-manifest.exercise.mjs` | `10adbc90385b385edb50cbd7ba631f3a3c195d794ef92e85d9107771d0f4c12c` |
| `projects/dai2-daiban/capture-views.json` | `6d8354a7d153f83d97e579ac3d4f4b35c92dca88cd0f911cc2a29197c09b0b55` |
| `package.json` | `8847c882bacef33d848dd0bf510657f18cdfa7db4d4672a1c342a155b2307a05` |
