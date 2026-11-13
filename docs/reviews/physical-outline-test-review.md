# Physical outline correction — independent preimplementation test review

**Disposition: the bounded test proposal is ready for the production correction.** I reviewed requirements, current shader/callers, existing browser suites and the actual new `tests/outlines-browser.mjs`. Two material assertion gaps were identified and have been addressed before implementation. This is test-design release, not implementation or architectural acceptance. I changed only this review record; no production code, model or fixture was authored by this reviewer.

## Contract and current coverage

`review/outlines.ts` currently marks any authored-part-ID difference as ink before checking depth or normals. Thus geometrically flush, same-normal faces receive a structural seam merely because their owners differ. I inspected the cited courtyard capture and the new fixture's baseline screenshot. The desired contract is visible physical feature ink: silhouettes, meaningful depth/crease boundaries, openings and slab rims in perspective and orthographic views. A coplanar owner split alone is not a feature. The correction must not erase those positive edges or turn continuous oblique-plane depth gradients into ink.

The existing `website/tests/outlines-browser.mjs` provides useful crossed-block contact, orthographic zoom/DPR width, clean same-part interior, occlusion and full-clipping checks. It should be retained and run as regression. It is not invoked by the inspected package scripts/website workflow. `tests/inspection-browser.mjs` already protects authored color/texture, transparency, a wall-top edge, clipping and appearance roundtrip. Existing preview/context-recovery tests cover surrounding viewer behavior; no new lifecycle suite is warranted for this bounded change unless resource ownership is actually altered.

## Actual proposed test and resolved gaps

The new self-contained real-browser test uses `startPreview`, XML primitive props with distinct real owners, neutral inspection, actual delivered camera matrices, screenshot pixel sampling and cleanup in `finally`. Analytically known primitive dimensions independently establish the sampled features. It does not test shader spelling, private buffers or helper calls.

Its same-material split slab has three clean-seam samples; another interior sample rejects invented wireframe. Positive controls include a genuine1m gap, same-owner rim/crease, and an exact-top same-normal depth step. DPR1/2 and oblique orthographic/perspective views exercise raster/projection differences. Clipping must remove ghost ink. Root's unchanged-production baseline failed at the intended false seam:22/21/22 dark pixels, versus flat0; gap22, step23, rim18; browser errors empty. Evidence inspected: `generated/physical-outlines-browser-Bdyh6b/results.json` and `orthographic-oblique-dpr1.png`. Root ran this baseline; I did not independently rerun it.

Two gaps were material:

1. The original “opening” was floor-backed: occupied geometry existed on both sides. It did not establish foreground/background silhouette preservation. The updated test adds an exterior floor-perimeter silhouette sample at(0,−5,−1), with viewport bounds checked by the sampler.
2. Pure same-normal depth separation was isolated only in orthographic top view. Oblique perspective could pass from the visible riser's normal crease even if perspective depth detection failed. The updated test adds perspective camera(3,0,20), target(3,0,1), lying in the step side plane so the riser is edge-on. It asserts the depth step there as well.

I inspected both additions in the actual test. The resulting eight view/DPR combinations are adequate for this correction; no further fixture expansion is requested. The first baseline's intended failure means later combinations were not executed in that run. The complete updated suite must pass after implementation without retries, alongside the retained crossed-block regression and relevant inspection check. Ensure the new test has an intentional command/CI execution path; merely placing an `.mjs` file beside Node unit tests does not discover it.

The combined assertions reject the important incorrect outcomes: retaining owner-ID seams; disabling all ink; silhouette-only ink that drops internal creases; normal-only ink that drops same-normal depth edges; and projection-dependent false seams on oblique flat surfaces. Existing width regression limits excessive/density-dependent strokes. Preserve exact known world samples and thresholds unless actual raster evidence justifies a change; do not weaken them merely for a green run.

## Coplanar authored detail and scope

A painted door or material patch can be semantically meaningful without a geometric crease. Its authored color/texture must remain visible in materials/inspection; a part name alone should not turn its boundary into structural ink. A real frame, reveal, gap or opening still needs its visible physical edge. If a flush same-color door joint is intended as an explicit drawn feature, that requires a separately specified feature contract; retaining every arbitrary owner boundary is not an adequate substitute.

Illustrated appearance currently replaces ordinary authored colors with pale grayscale. Removing ID-only ink may therefore make a purely painted coplanar feature disappear in that mode. This is an explicit consequence of structural-only ink plus the existing illustrated palette, not permission to alter exported materials or silently invent geometry. Improving illustrated painted-detail semantics is a separate scope decision. Existing authored-color inspection coverage is sufficient for the present shader-only correction unless material handling changes.

Owner IDs still serve selection/source identity elsewhere; this review does not authorize removing those semantics. Source geometry remains reviewer-owned and must not be disposed or mutated by outline cleanup. No new allocation/context-loss redesign is requested. If only outline classification/encoding and its direct call contract change, run existing recovery/regression coverage rather than asserting private disposal counts or adding a broad lifecycle framework.

The requested TypeScript, maintain-tests and preview-art skills informed this review. A separate implementation review remains required after the final diff and complete validation evidence exist. Neither these synthetic rendering tests nor cleaner courtyard captures establish architectural fidelity.

## Follow-up: native-device sampling — accepted

**PASS for the final test change; no material test finding remains.** Reviewed final `tests/outlines-browser.mjs` SHA256 `2c7cc21099a03694d488aa532e90142111aca6a6c92898c62bfa9cddb65a289d`. Device-resolution screenshots now scale the independently projected CSS coordinates by bitmapWidth/canvasWidth. The `<100` ink threshold, zero-ink negatives, all positive features, eight view/DPR cases and clipping assertions remain intact.

The retained CSS failure `generated/physical-outlines-browser-JSOGuj` had zero detected silhouette ink only at orthographic-top DPR2. The independent implementation review measured CSS edge values157/144 from averaging native ink68 with surface221/background247. I checked the retained raster dimensions and palettes: final DPR2 is2432×1972 versus1216×986 CSS, with native68 strokes preserved. This is a measurement correction, not a relaxed threshold or shader compensation. The three-pixel sampling radius now measures native-pixel presence/location; it does not replace the separate CSS-width contract.

I read the completed `generated/physical-outlines-browser-XyCs6v/results.json`: all eight cases pass, all24 flush samples and eight flat samples remain zero, and every positive sample contains at least14 dark pixels; browser errors are empty. The unchanged CSS crossed-block regression reports2.5/2.5px widths at DPR1 and2/2.5px at DPR2, with zoom/occlusion/clipping passing. The retained `generated/inspection-browser-cJksPD/results.json` preserves authored color/texture/transparency with no browser errors. Those runs were performed by root; this follow-up inspected their evidence and final test rather than rerunning browsers. Separate implementation review has passed. No production edit, additional fixture or broader rendering/lifecycle scope is requested.
