# Frame aspect — implementation handoff and validation

Read `frame-aspect-test-review.md` before production edits and sent the bounded implementation plan to root. Root approved reviewer-owned layout, numeric0.1..10 bounds, and a subsequent explicit native-capture replay correction. No dependencies, canonical model/XML, source CAD, author.py or default camera manifest changed. User5186 was not stopped, navigated or operated. Root confirmed no capture was active before the helper edit; no capture/browser process from these tests remains running.

## Behavior and ownership

- Shared `parseFrameAspect` validates optional `frame-aspect` / CLI `--frame-aspect` as numeric image width/height from0.1 through10. Omission remains responsive. Empty/nonfinite/nonpositive/numerically extreme/unsupported values reject before partial application. The finite range limits thin live frames instead of allowing zero/overflow dimensions or silently clamping.
- Camera-only types remain pose/framing only. Composed reviewer state publishes **actual** `frameAspect` separately from optional `frameAspectLock`. The app owns the preference and a ResizeObserver on the existing viewport. It sizes/centers `#model` to the largest contained frame in both axes only when locked. No wrapper, crop-after-render, second camera aspect or domain property was added.
- Viewport/preset/custom controls and selected-reference-ratio copy all set that same preference. Reference copying uses declared width/height and has no continuing dependency on selected reference or thumbnail/image size. No reference means a disabled action. Invalid form input preserves the prior frame/camera with a diagnostic; a subsequent valid input recovers.
- Releasing the lock clears the app-owned inline sizing and stale URL preference. Exact view links always encode measured actual aspect, including from responsive mode; reopening locks composition. A responsive actual ratio outside supported live bounds stays usable but does not advertise a known-invalid exact replay link. Current URL reload retains the chosen lock or responsive mode. Unrelated URL state, camera, FOV, roll and appearance survive.
- The scene still consumes its actual host dimensions. An initial call to the existing resize path initializes that aspect before first fit. The 2D plan remains full viewport, walking shares the 3D frame, and hidden zero-sized frames do not publish NaN or corrupt the next visible frame. The app disconnects its own observer during disposal/page exit.

## Native capture contract

Unspecified live lock leaves helper-owned native `#model` sizing untouched. Capture navigation remains unlocked; actual native dimensions/backing store/projection and full25-point DOM ownership checks are preserved.

The old ambiguous per-view `url` field was replaced coherently by `navigationUrl`, `actualFrameAspect` and a `replay` record. Supported ratios publish `{status:"available",url:...}` from actual final camera/appearance/aspect. Native ratios outside the live range still capture normally, retaining native aspect/navigation, but publish `{status:"unsupported-aspect",reason:...}` with no invalid locked URL. There is no compatibility alias, clamping or new native acceptance restriction. The focused consumer and `capture-view-contract.md` were updated together; searched active code consumers do not depend on the removed field. Frozen historical packets remain unchanged.

## Verification

Passed:

- `npm run check` and18 parser/CLI tests, including emitted real CLI ratio, invalid argument rejection, responsive omission, stale-ratio replacement, preserved URL context and refusal to serialize an unsupported actual lock.
- Complete invoked `npm run test:preview:browser`: existing preview lifecycle, suggestions, calibrated neutral inspection and new `frame-aspect-browser.mjs`. The new scenario is part of the existing command/CI, not dormant.
- Both viewer and site builds. Existing native/WASM externalization, ineffective dynamic-import and chunk-size warnings remain unchanged in kind.
-44/44 focused native capture/manifest cases, no skips/retries, `generated/dai2-daiban-review/capture-manifest/run-tovoTl/exercise.json`.
-14/14 unchanged source/companion integrity cases, no skips, `generated/dai2-daiban-review/capture-integrity/run-g5735N/exercise.json`.

Final invoked browser evidence: `generated/frame-aspect-browser-uMmPaq/results.json` plus actual PNGs, personally inspected. A disposable XML fixture with authored red wall/blue floor, known world landmarks, spawn and600×800/800×600 references establishes actual rendering rather than DOM echoes. Responsive mode first demonstrates changing horizontal projection with a fixed pose. Locking3:4 then exercises both limiting axes:

| Case | Actual CSS frame | Actual W/H | ProjectionP0 /P5 |
|---|---|---|---|
| wide window |679.5×906|.75|3.06645673 /2.29984255|
| narrow window |620×826.65625|.75000945|3.06641809 /2.29984255|
| reference-link new window |567×756|.75|3.06645673 /2.29984255|
| landscape preset |620×465|1.33333333|1.72488191 /2.29984255|

The~.00000945 ratio difference is fractional CSS quantization, explicitly bounded by the test's geometric tolerances; independent projection equations and normalized known-patch positions remain within tolerance. Known pixels still render authored blue(80,128,144) and red(200,80,64) at independently projected locations. The test checks centered maximal containment, pose/matrix/FOV/roll preservation, copied-reference and responsive-origin links across different windows, release/reload, invalid initial/form extremes and recovery, no implicit reference-following, actual object clicks after letterboxing, orbit/wheel input, both projection fits with margin,2D/walk/resize restoration and DPR2 backing-store agreement. Existing watched-source and malformed recovery now retain the explicit lock.

An early fixture assertion incorrectly assumed clicking empty sky deselects (existing selection behavior does not promise that); it was replaced with a second independently projected floor selection. A test readiness issue after projection selection read the previous delivered projection before the new frame; waiting for the actual reported projection to match the real selector resolves it. No screenshot delay or relaxed fit assertion was retained. The corrected scenario passed twice independently (`frame-aspect-browser-S0sNF7`, `frame-aspect-browser-XU5oHX`) and then in the full invoked suite. Earlier failed evidence remains for audit.

Native compatibility verifies800×1200 authored red pixels at all corners and bottom center, exact PNG/CSS/backing sizes, actual matrices and ownership, plus mixed shapes/appearances. The added32×640 native case succeeds with actual aspect.05 and explicitly unavailable locked replay. Ordinary replay URLs encode exact requested native width/height ratio while `navigationUrl` has no frame lock. All existing dynamic-name/manifest-archive/mutation/alias/output-claim checks remain intact.

Frozen capture identities: helper `104ab0a8a46861b98079890b5cb49db09c05c551beed76fe7c551fd436a50c09`; default manifest `6d8354a7d153f83d97e579ac3d4f4b35c92dca88cd0f911cc2a29197c09b0b55`; focused exercise `10adbc90385b385edb50cbd7ba631f3a3c195d794ef92e85d9107771d0f4c12c`. Hashes stayed fixed during their runs.

## Review status

Independent pre-implementation test assessment is complete. Separate final implementation review and independent test follow-up are requested from root and pending at handoff. This report records implementation/validation evidence, not self-approval, photographic registration, architectural fidelity or gameplay validity.

## Supported-endpoint repair after independent review

The independent implementation reviewer found a real supported-input defect:0.1/10 preferences produced measured ratios.0999931015/10.00053149 after fractional CSS quantization, so exact serialization correctly rejected the measured values and removed the links. The original review/result remains untouched; a durable copy is `docs/reviews/frame-aspect-endpoints-before.json`. This supersedes the original handoff's normal-case coverage as sufficient endpoint acceptance.

After root approved the repair plan, `layoutFrame` was corrected only at that ownership boundary. It first measures the CSS box. If a supported lock's measured ratio crosses a shared bound, it rounds the **long dimension inward to a whole CSS pixel**, then recenters. Ordinary interior fractional layouts retain their measured dimensions. Bounds are shared constants; parser semantics and native capture acceptance are unchanged. The final actual fractional box still owns camera projection, reported aspect and serialized link; neither the preferred lock nor separately rounded client/backing sizes is substituted. The small inward pixel margin and bounded composition quantization are documented in `WEBSITE.md`.

The full invoked four-script browser command,18 parser/CLI cases, type check and both builds pass after repair. Final endpoint/normal browser evidence is `generated/frame-aspect-browser-CFrhZd/`, personally inspected. Endpoint controls/resize/link replay independently check containment/centering, no more than one CSS pixel plus fractional-layout rounding of correction in the tested windows, usable subsequent links, exact encoded measured aspect, projectionP5/P0 equal to the fractional CSS ratio, fixed camera/framing and known projected colored landmarks. Horizontal normalized landmark movement is bounded by a CSS-pixel-derived budget; vertical normalized positions remain unchanged. Existing normal-case tighter assertions were preserved.

| Supported preference / case | Actual CSS frame | Reported and projection aspect |
|---|---|---|
|0.1 original |90.59375×905|.100103591160221|
|0.1 resized |80.59375×805|.1001164596273292|
|0.1 link replay |75.671875×756|.10009507275132275|
|10 original |1175×117.59375|9.992027637523252|
|10 resized |875×87.59375|9.989297181591152|
|10 link replay |776×77.65625|9.992756539235412|

The endpoint pixel fixture uses orthographic at0.1 and perspective at10, complementing the existing both-projection fit/resize coverage. An initial new0.1 perspective/very-distant-fit pixel-average fixture sampled dense existing outline ink; its failed evidence remains at `generated/frame-aspect-browser-hFcYXS/`. No renderer/outline change or existing assertion relaxation was made. The final endpoint fixture checks known clean authored patches as well as independently projected landmarks.

Native/default/manifest regression:44/44 pass, no skips/retries, at `generated/dai2-daiban-review/capture-manifest/run-bl8n3r/exercise.json`. This retains actual800×1200 corner/bottom colors, exact dimensions/projection/ownership, omitted live lock behavior and the32×640 native aspect.05 capture with explicitly unavailable locked replay. Helper bytes remain unchanged at`104ab0a8a46861b98079890b5cb49db09c05c551beed76fe7c551fd436a50c09`. The prior14-case source/companion result remains revision-scoped above; the endpoint repair changes live locked layout only.

Final repair identities: app`7c6b463b553472bb2dfebb4c9ab37cff39d5fed6e35835d59d83b67b91a50cc7`; shared view`c76353f9ad6008b9724f6bc8ba030425c283c137508275f976b643757fe5f259`; browser test`610c7504f587f173ff0466b9b4dcff57173a2cbb5f8435e7339c5ad34775a6cf`. No canonical files or user-server controls were touched. Focused independent implementation re-review and test follow-up remain required; this author evidence does not close them.

After completed execution, only the layout JSDoc was clarified to describe whole-pixel inward rounding without a universal one-pixel claim; runtime code is unchanged. The app identity above includes that comment-only clarification.
