# Independent architectural preview tooling implementation review

2026-11-01. Applied `write-readable-typescript`. Reviewer is separate from the
test reviewer. Reviewed actual working-tree implementations of `review/view.ts`,
`review/scene.ts`, `review/app.ts`, `review/style.css`, `src/cli/main.ts`,
`src/cli/preview.ts`, camera/dimensions additions to `tests/vector-cli.test.ts`
and `tests/preview-browser.mjs`, plus README and `docs/WEBSITE.md`. Existing broad
website overhaul diffs were context, not attributed to this feature.

## Finding requiring correction

**P2 — automatic perspective framing discards explicit orthographic view height.**
`review/app.ts:371–374` applies the initial view and then calls `scene.fit()` for a
perspective URL without camera/target. `ReviewScene.fit()` updates orthographic
bounds even while perspective is active, overwriting a supplied `--view-height`.
Consequently a user who selects Orthographic afterward, or shares the generated
view link, gets framing different from the explicit input. This contradicts the
documented independent orthographic framing setting and weakens repeatability.

Confirmed in real headless Chrome against the current Vite preview:

```js
startPreview('examples/showcase.level.svgx', {
  port: 0,
  view: { projection: 'perspective', fov: 47, viewHeight: 14 }
})
```

Generated URL contained `projection=perspective&fov=47&view-height=14`, but the
actual `#model[data-view]` reported `viewHeight: 23.78036936514125` after readiness.
No source or production files were changed by this reproduction; owned server and
browser were closed.

Correct framing ownership so a perspective auto-fit preserves explicitly supplied
orthographic height, and cover initial perspective without a pose followed by an
orthographic switch. A focused correction at `fit()` or initial-view application
is sufficient; no compatibility layer or generalized state framework is needed.

## Other conclusions

- The browser uses real orthographic and perspective camera classes; projection
  changes retain pose and update OrbitControls' camera owner. Walk remains a
  separate perspective camera and does not mutate authored geometry/navigation.
- Perspective Fit derives distance from all bounding-box corners in camera space
  and handles viewport aspect and near-facing corners, rather than assuming only
  a bounding sphere at the target depth.
- The pure shared view parser has a coherent finite XYZ, paired pose, projection,
  FOV and positive height contract across CLI, URL and form boundaries. Invalid
  form input is parsed before scene mutation. URL serialization uses actual pose
  and effective orthographic zoom and preserves unrelated query parameters.
- Dimensions derive visible compiled triangle bounds and clearly document their
  axis-aligned geometric meaning. Hidden roofs/collision proxies are excluded;
  the UI does not present these as clear passage widths or surveyed dimensions.
- CLI option validation occurs before starting a server, keeping malformed
  camera input in the usage-error boundary. Preview remains loopback and caller
  lifecycle ownership is intact.
- Named new helpers have useful contracts; code is localized to existing scene,
  adapter and UI responsibilities. No new dependencies, old API compatibility
  machinery or unrelated compiler changes were introduced by these tools.
- Existing test additions check matrix type, actual pose, view replay, invalid
  recovery and independent known dimensions. They initially omitted the confirmed
  no-pose perspective case above. Root reports nine CLI tests and preview browser
  passing; this reviewer did not redundantly rerun those suites.

No other material ordinary-use correctness, ownership or scope defect found in
this review. This is a targeted implementation review, not proof over every
numeric camera input, every browser or all preexisting renderer behavior.

## Focused correction re-review

**Resolved.** `ReviewScene.fit()` now changes orthographic frustum/zoom only when
orthographic is the active camera. Perspective fitting retains inactive
orthographic framing at its proper camera owner; this fixes the cause without an
initial-load special case. The new real-browser regression removes camera/target
from the perspective initial URL, checks the requested 14 m survives automatic
fit, then switches to orthographic and checks 14 m again. Expectations are derived
from explicit user options, not implementation calculations.

Independently repeated the previously failing real Chrome reproduction after the
correction: initial perspective auto-fit reported 14 m, and switching to
orthographic retained 14 m. Both assertions passed. Owned preview/browser closed.
No remaining material finding from this targeted implementation review.

## CLI SIGINT lifecycle follow-up

Reviewed the later one-line CLI correction independently: `process.on('SIGINT',
interrupt)` keeps the existing abort owner installed until `main()`'s existing
`finally` removes that exact listener. Rolldown's bundled signal-exit callback
checks registered signal ownership and re-sends the signal when it sees only its
own hooks. A once-listener disappears during dispatch, before that dependency
callback inspects ownership, explaining termination by SIGINT rather than the
launcher setting exitCode 130. Retaining the listener through async server close
fixes ownership at its source. Repeated aborts remain idempotent; cleanup still
removes the listener on all command outcomes. No dependency patch, artificial exit
or global signal swallowing was introduced.

The positive real CLI test starts a child from another working directory, waits
for an actual ready URL, checks every supplied camera option, fetches preview HTML
with the query intact, then sends SIGINT and requires numeric exit 130. Its
watchdog/cleanup handles failure. This meaningfully checks both CLI forwarding and
the declared graceful lifecycle contract. The correction is accepted; no new
material implementation finding. The author/test reviewer owns the suite run.
