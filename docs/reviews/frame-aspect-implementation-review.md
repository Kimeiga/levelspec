# Frame aspect — independent implementation review

Date: 2026-11-01. Current disposition: **accepted** after the supported-endpoint
repair; no material implementation finding remains.
No production/helper/model/default-manifest/test files were edited by this reviewer;
user preview 5186 was not operated. This implementation review is separate from
the [test assessment](frame-aspect-test-review.md) and
[author evidence](frame-aspect-change-evidence.md).

## Final endpoint follow-up: accepted

Reviewed final app SHA256
`7c6b463b553472bb2dfebb4c9ab37cff39d5fed6e35835d59d83b67b91a50cc7`, shared view
`c76353f9ad6008b9724f6bc8ba030425c283c137508275f976b643757fe5f259` and browser test
`610c7504f587f173ff0466b9b4dcff57173a2cbb5f8435e7339c5ad34775a6cf`.
The capture helper remains unchanged at the identity recorded below.

The repair is at the layout owner: after measuring fractional CSS geometry, a
supported lock that crosses a shared endpoint rounds its long dimension inward
to a whole CSS pixel and recenters. Ordinary interior fractional sizing is retained.
The shared bounds remain unchanged. Actual CSS geometry still determines scene
projection, reported aspect and the link; neither the preferred ratio nor rounded
client/backing-store sizes are substituted. This resolves the supported-input
defect without widening acceptance or clamping a reported value. The small inward
pixel margin and layout quantization are documented.

Independently reran the exact original endpoint reproducer at 1400×1000/DPR 1:

| Supported lock | Final CSS frame | Client / backing size | Projection aspect (`P5/P0`) | Exact link |
|---|---|---|---|---|
|0.1|90.59375×905|91×905 /90×905|0.100103591160221|Available; encodes this measured value|
|10|1175×117.59375|1175×118 /1175×117|9.992027637523252|Available; encodes this measured value|

Both retained their accepted preference and camera, with empty link diagnostics.
The app identity was unchanged before/after. The exact current outcomes remain in
`/tmp/frame-aspect-endpoints-review-results.json`; the failing outcomes are retained
in `/tmp/frame-aspect-endpoints-before-repair-results.json`.

Also independently reran the complete updated `tests/frame-aspect-browser.mjs`:
**passed**, with evidence at `generated/frame-aspect-browser-mdvXjC/`. This exercises
ordinary responsive/portrait/reference replay and adds both supported endpoints,
resize/replay into different windows, actual projection-to-CSS equality, encoded
measured aspect and subsequent usable links. Endpoint landmark differences use
the explicit CSS-pixel-derived quantization budget; ordinary tighter assertions
remain intact. Source/appearance/pose and native-capture ownership have no new
controller or resource lifetime. Observer cleanup and first-fit initialization
remain unchanged and coherent.

The original material finding is closed. Independent post-test review is a separate
gate; the author's type/build/full-capture results remain attributed evidence rather
than additional executions here. No production, helper, model or test code was edited
by this reviewer, and all independent previews were closed.

## Original material finding (resolved): supported endpoint replay

**Medium priority.** `parseFrameAspect()` accepts 0.1 through 10 inclusively.
`layoutFrame()` requests that ratio with fractional CSS dimensions, which the
browser quantizes. `currentView()` correctly reports measured geometry, but
`viewURL()` revalidates that measured ratio against the exact input bounds. A valid
boundary lock can consequently be classified as unsupported after layout.

Reproduced through ordinary UI controls on an isolated CLI preview at browser
viewport 1400×1000/DPR 1, with unchanged camera and helper:

| Requested supported lock | Actual CSS frame | Canvas client / backing size | Projection aspect (`P5/P0`) | Exact link |
|---|---|---|---|---|
|0.1|90.59375×906|91×906 /90×906|0.09999310154525386|No href; “Frame replay unavailable”|
|10|1176×117.59375|1176×118 /1176×117|10.000531490831783|No href; “Frame replay unavailable”|

Both controls retain the accepted lock preference and render a useful frame; the
diagnostic is `frame-aspect must be a width/height ratio from 0.1 through 10.`
These are documented supported live inputs, not intentionally unsupported native
capture ratios. The measured aspect is used by the delivered camera projection;
using the requested preference blindly instead would conceal the quantization.
The camera aspect matches fractional CSS geometry, not the separately rounded
client/backing-store sizes in the table. A repair must preserve that distinction
when reporting/replaying actual projection.

Required repair outcome: supported endpoints must retain composition replay with
an explicit pixel-quantization policy. The recorded/serialized aspect must reflect
the actual projection within that policy, while genuinely unsupported native or
responsive ratios remain explicitly unavailable. Do not silently substitute a
different claimed ratio or weaken unrelated capture acceptance. Recheck both
endpoints and their actual box/projection/link behavior.

Exact reproducer: `/tmp/frame-aspect-endpoints-review.mjs`.
Results: `/tmp/frame-aspect-endpoints-review-results.json`; the initial result is
retained at `/tmp/frame-aspect-endpoints-review-initial-results.json`.
The app's before/after hash was unchanged during the exercise. All independent
preview/browser processes were closed.

## Ownership and lifecycle assessment

Outside that boundary, the implementation is cohesive. The app owns one optional
numeric layout preference; camera classes consume actual host dimensions instead
of acquiring a second frame controller. Responsive omission leaves the existing
absolute host sizing alone. Locked sizing contains/centers the existing host in
both axes, so input/ray coordinates and projection use the same rendering surface.
Preset, custom and copied-reference actions converge on this same numeric lock.

Actual measured aspect and lock preference are separate reporting fields. Release
clears owned inline sizing and stale URL preference. Exact links serialize actual
aspect; unsupported measured ratios remove the link rather than advertise a known
invalid URL. Initial option parsing remains atomic. The app observer watches the
stable parent and disconnects on disposal/page exit; scene host observation remains
separate. Initial synchronous scene resize supplies aspect before first fit.
Hidden-host handling retains the last nonzero actual aspect and scene framing.
No geometry, navigation, exports or authored material state is changed.

The capture-helper change keeps native navigation unlocked, preserving helper-owned
integer CSS/backing-store dimensions and existing held-input/coverage/publication
checks. `navigationUrl`, `actualFrameAspect` and explicit `replay` state replace the
old ambiguous URL field coherently. Unsupported native ratios remain accepted as
native captures with unavailable locked replay. No clamp or compatibility alias
was introduced. Active consumers and the capture-view contract were checked.

## Independent validation and limits

Passed independently:

- `npm run check`.
- `node --test tests/review-view.test.ts tests/vector-cli.test.ts`: 18 cases.
- `node tests/frame-aspect-browser.mjs`: containment in both axes, responsive
  projection control, known normalized pixel patches/replay, reference/custom/
  release, real object selection/orbit/wheel, both projection fits, 2D/walk restoration
  and DPR 2. Personally inspected the portrait PNG. Evidence:
  `generated/frame-aspect-browser-Z0N4Ex/`.

Those original normal cases did not exercise the supported 0.1/10 replay endpoints
and did not close the initial finding. The focused repair review above closes it.
The author's complete invoked browser command, builds, 44 capture cases and
14 integrity cases remain attributed evidence, not this reviewer's executions.
Independent post-test review remains a separate gate. None of these checks accepts
source fidelity, photographic registration or gameplay validity.

## Initially reviewed identities

| File | SHA256 |
|---|---|
| `review/app.ts` | `8c041e52df17ec8dd6091ccbd41db7e48b972d9a1651ef81bbc5352ae4326e77` |
| `review/view.ts` | `ab201c60a5d3af92d0885c4af648f028f8c33f02bf26b7d65325ecd75c18e36e` |
| `review/scene.ts` | `03b1e5c2be98501e340f528ca391b31b30054a364bf0524c06c4987cb1043713` |
| `review/style.css` | `48c1112d6c94d95b6e5be6f22d0efba755f6b1b26be977c7f65aea80c36ca429` |
| `src/cli/main.ts` | `cde8868b1d40478129bbfb7cdd8981fd81d2375804446589fbb9bc054eb52850` |
| `src/cli/preview.ts` | `c60594e31848201ee0c3456b71683356f7371ab9b6c0f65c739892b67dd6c85f` |
| `projects/dai2-daiban/capture.mjs` | `104ab0a8a46861b98079890b5cb49db09c05c551beed76fe7c551fd436a50c09` |
