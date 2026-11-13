# Poster implementation review

Independent review of `posters.ts`, `poster-placement.ts`, AML parsing/serialization,
kit bindings, exterior notices, shop callers, source image packing, and the new
poster tests. The review excludes unrelated concurrent pipe/tile changes.

## Findings requiring correction

1. **Native box receivers were excluded.** Native `<box>` walls compile to
   `kind: "prop", role: "solid"` surfaces, so excluding all prop surfaces prevents
   their side faces from receiving posters. The existing host-object equality
   already excludes generated dressing objects. Exclude visualization dressing
   rather than native solid geometry.
2. **PosterRule seed contract was inconsistent.** Extending all of `PosterOptions`
   allows a native `seed` field, but serialization emits it while AML rejects it,
   and placement ignores it. Omit the field from `PosterRule`, or support it
   consistently across parser, serializer and placement.
3. **Geometric failures need inspection targets.** Known-host no-fit and ambiguous
   receiver errors include source/object identity but not spatial bounds and a
   review target, as required by AGENTS.md. Use the existing spatial diagnostic
   helper for geometric failures.
4. **Overlapping paper shares a plane.** All explicit sheets use a fixed 2 mm
   offset. Intentional overlap causes z-fighting. Provide a bounded authored
   layer offset or explicitly reject overlapping same-layer sheets.

## Positive findings

The geometry is inexpensive and appropriately scoped: a convex eight-point paper
outline, six triangles, no collision, one shared matte atlas, and correct physical
aspect ratio. Padded atlas coordinates agree with the packer's extruded gutters.
Image color remains untinted in the explicit/native path. Determinant-based UV
orientation preserves text under reflected frames without relying on a caller's
mirrored flag. Receiver coverage uses the complete rotated bounds and existing
area clipping, so narrow holes cannot be missed by point sampling. Generation is
offline and ordinary compilation does not depend on an image service.

The new tests inspect world-space reader directions, source-linked failures,
physical isolation, exported image sharing and native/store integration rather
than merely checking source text. Review was performed while the parent was
expanding the suite; final validation must use a stable snapshot.

Status: awaiting corrections and follow-up review.

## Follow-up review

The four original findings were corrected: native box receivers now work,
`PosterRule` omits the emitter-only seed, geometric failures carry spatial review
metadata, and explicit layers 0–8 provide 0.6 mm separation. Independently ran
`node --test tests/aml-posters.test.ts`: all eight tests passed, including native
side faces and eight mirrored/narrow/wide production shop cases.

One follow-up remains: the same-layer overlap detector compares conservative
axis-aligned bounds. Such overlap is possible rather than demonstrated sheet
intersection; classify it as a non-blocking spatial warning or compute exact
sheet intersection before emitting an error. Also align the two emitter comments
with native solid receivers and base-plus-layer clearance.

## Final approval

Approved after the overlap finding became a non-blocking `AML_POSTER_OVERLAP`
spatial warning, retaining both sheets. The emitter comments now match native
solid receivers and base-plus-layer clearance. The canonical atlas and both
portable project copies have identical SHA-256:
`b2710134751286610fdb5908b9fdec5850ddf126273f4a40a269d97f5c2d1988`.
AML and the Dragon Ford generator reference their local `textures/posters-atlas.jpg`.
The packer refreshes these exact copies; exported instances still share one image.

No unresolved poster implementation findings. The latest independent rerun was
blocked before test execution by an unrelated concurrent change in
`src/dressing/spans/neighbor-index.ts`: constructor parameter properties are not
supported by Node 24's strip-only TypeScript loader. The earlier independent
8/8 passing run is recorded above; the parent should report its final stable run
separately after that external blocker is resolved.


Final integrator verification: the concurrent Node loader issue was corrected
by its active workflow. The unchanged poster work was then rerun with
`node --test tests/aml-posters.test.ts tests/aml-restaurant-props.test.ts`: **21/21
passed**, including all eight poster tests on the final implementation. Root and
shop-preview type checks passed. Frozen browser capture `review-03` has no errors.
