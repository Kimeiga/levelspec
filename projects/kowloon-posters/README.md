# Kowloon paper poster library

Sixteen original ImageGen designs for the existing Kowloon streets and shop interiors:
calendar, roast-meat menu, tea, soda, no-smoking, water/electric repairs, room rental,
hiring, herbal tea, opera, fictional detective film, laundry, rice, clinic,
Monday closure and radio repair.

![Poster contact sheet](contact-sheet.jpg)

The built-in `image_gen` tool generated one image per design. Exact prompts are in
[prompts.json](prompts.json); full-size originals are in [source/](source/).
The art uses traditional Chinese headings, period illustrations, colored print,
fibrous paper and existing stains. Main headings were visually inspected; fine
print is decorative AI artwork, not editorially verified historical information.
The closure design includes a restaurant advertising background; its generated
composition is intentionally retained. No paid mesh generation was used.

Production texture: [textures/posters-atlas.jpg](textures/posters-atlas.jpg),
2048×3072, 3,377,068 bytes (3.22 MiB). Sixteen 480×720 images share one texture.
Approximate uncompressed RGBA GPU storage including mipmaps is 32 MiB, once per
shared image. Opaque edges avoid alpha sorting. Each explicit poster costs six
triangles; automatic wall notices also retain their paper backing.

Run `python3 projects/kowloon-posters/pack.py` to repack the saved sources, extrude
the gutters and regenerate the contact sheet. No AI call is made by this step.
[atlas.json](atlas.json) records cells and source/output hashes. The printed field
is 2:3, matching physical width:height; resizing does not squash the illustrations.
The small half-texel sampling inset protects the atlas border.

See [placement documentation](../../docs/DRESSING.md#paper-posters-on-walls).
The native AML example is [level.aml](level.aml). Build its actual GLB with:

```sh
node projects/kowloon-posters/build-gallery.mjs
```

Then open `projects/kowloon-posters/gallery.html` through the repository's Vite
server to orbit the real exported geometry. The chicken-shop reviewer has
`posters` and `poster-left` cameras for wall inspection. These cameras use the
normal live lighting/AO; artwork is not emissive.

Capture the gallery and shop with:

```sh
node projects/kowloon-posters/capture.mjs generated/poster-library/review-03
```

The output directory must not already exist. Captures freeze geometry, art and
viewer inputs, check browser failures, and inspect the normal, alternate and
narrow shop layouts. The shared poster slot replaces the previous six-cell atlas;
existing maintained sources and the Dragon Ford generator now reference this bank.
Old image-generation source files remain as historical evidence.


## Review and validation

Accepted browser evidence: [all 16 exported decals](../../generated/poster-library/review-03/gallery.png),
[whole chicken shop](../../generated/poster-library/review-03/wide-store.png),
[menu and calendar](../../generated/poster-library/review-03/posters.png), and
[soda ad](../../generated/poster-library/review-03/poster-left.png).
The final capture has no browser errors and unchanged input hashes during its run.
The gallery GLB has 96 poster triangles (108 including its wall) and one embedded
poster image. Store presentation remains live-lit with AO.

`npm run check` and the targeted shop-preview type check passed. The poster and
restaurant suites passed together: 21 tests. The eight poster tests cover native
opposite/side faces, transformed attachment centers, mirrored text, every named
atlas cell, opening clearance, spatial diagnostics, layering, repeatability,
physical isolation, real narrow/mirrored store calls, automatic notices and GLB
image sharing. Independent [test](test-review.md) and
[implementation](implementation-review.md) reviews approved the changes.

The broader `aml-wall-details.test.ts` suite still has failures concerning the
concurrently revised service-pipe connectivity and the former wall-tile geometry
role. Its poster UV assertions were updated to 4×4, but that mixed test later
fails on the tile-role expectation. The new dedicated poster suite independently
checks the migrated automatic-notice atlas contract. No wall/pipe assertions were
weakened to hide those failures.
