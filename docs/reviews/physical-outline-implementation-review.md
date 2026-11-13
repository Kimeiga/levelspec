# Physical outlines — independent implementation review

**PASS for the bounded renderer correction. No material implementation findings remain.**
This review is separate from the preimplementation test review. I applied the
TypeScript, maintain-tests and preview-art skills, inspected the actual final diff,
sole caller, surrounding geometry pass and browser tests, and examined the retained
pixel evidence. I changed only this record, not production code, tests or model data.

## Scope and implementation

`ScreenOutlines` now distinguishes occupied opaque geometry from background using
alpha, then derives internal ink from the existing normal and reconstructed-depth
tests. The geometry target uses nearest sampling; pass fragments write alpha one
with blending disabled and the background clears to alpha zero. Thus separate
coplanar mesh owners no longer force an edge while background silhouettes retain
their explicit classification. Normal/depth thresholds, projection inversion,
clipping and CSS ink radius remain unchanged.

The obsolete owner-ID map, encoding, uniform and 65,535-part restriction were
removed completely. The only `add` caller now supplies geometry and clipping planes.
Scene object identity remains available for selection; borrowed buffers, material
ownership, rendering colors, transparency and disposal behavior are unchanged.
There is no compatibility branch or per-model workaround. The change does not
modify source geometry, collision, navigation or exports.

The documentation correctly states the intentional semantic change: paint-only
coplanar details remain color/texture features, and the existing illustrated palette
may omit them. Arbitrary mesh names are no longer presented as physical joints.
The new real-browser test is included in `test:preview:browser`, which the website
CI workflow invokes. Existing crossed-block and inspection coverage is retained.

## Validation and raster correction

The root ran the browser suites; I independently read their result files and
inspected representative screenshots. I independently ran `npm run check` and
`git diff --check`; both passed. Root reported all final browser commands exited
zero and their owned browsers/servers closed in `finally`.

- `generated/physical-outlines-browser-Bdyh6b`: unchanged-production baseline
  failed on the intended false seam, with 22/21/22 dark pixels versus zero on a
  continuous flat interior. Real gap, step and rim controls were present.
- `generated/physical-outlines-browser-JSOGuj`: preserved first post-change run.
  Orthographic top DPR 2 failed the strict silhouette pixel assertion because the
  CSS-resolution screenshot averaged thin ink. I independently measured the same
  edge: DPR 1 columns 159/160 were RGB 68/68; DPR 2 CSS samples were RGB 157/144,
  the half-covered averages of ink 68 with background 247 and surface 221.
  This was a test sampling defect, not evidence for changing the shader.
- `generated/physical-outlines-browser-XyCs6v`: the final test retains native
  device pixels and scales projected coordinates accordingly. The threshold stays
  below 100; no assertion was relaxed. All eight projection/DPR combinations pass:
  all 24 flush-boundary samples and eight flat-interior samples are zero; all 32
  real-edge samples contain at least 14 ink pixels. Full clipping checks pass;
  browser errors are empty. Both top-view modes isolate same-normal depth edges.
- `generated/physical-outline-crossing-regression`: the unchanged crossed-block
  suite passes contact, zoom, occlusion and clipping. CSS widths are 2.5/2.5 pixels
  at DPR 1 and 2/2.5 at DPR 2, preserving the independent apparent-width check.
- `generated/inspection-browser-cJksPD`: authored color, texture/tint/repeat,
  transparency, structural ink, section clipping and appearance roundtrip pass;
  browser errors are empty.

Reviewed `review/outlines.ts` SHA-256:
`f08678039bb5aa39aeaec7398d34b41362799124065810955a3f55fc20b7a649`.
Reviewed `tests/outlines-browser.mjs` SHA-256:
`2c7cc21099a03694d488aa532e90142111aca6a6c92898c62bfa9cddb65a289d`.

Fresh courtyard captures should preserve earlier captures and identify the renderer
revision. Cleaner ink does not establish photographic fidelity, plan-to-model
conformance or safe circulation; those remain separate architectural reviews.
