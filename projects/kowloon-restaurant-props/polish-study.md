# Current-render polish study

The subsequent [aspirational concept](concepts/aspirational-store.png) responds to
the request for greater originality. It freely redesigns the storefront with an
asymmetric glazed meat display, recessed kitchen, layered fascia and awning,
crate-supported bench, clipped orders and a small eating ledge. These are proposed
design ideas, not implemented geometry. Its alley context and lighting establish
an atmosphere; modular adaptation still needs real dimensional and clearance checks.

[Concept](concepts/polish-study.png) · [exact prompt](concepts/polish-study-prompt.txt)
· [provenance and hashes](concepts/polish-study-provenance.json)

Built-in ImageGen transformed the accepted wide-store capture into a Ghost in the
Shell / Cowboy Bebop / Kowloon background-art study. This is a new study of the
completed restaurant, distinct from the earlier pre-implementation store target.
It is concept art, not an updated renderer capture. No production meshes, materials
or lighting were changed for this study.

## Observed directions

1. **Material response:** the concept separates reflective tile glaze and wiped
   steel from dry plaster and wood more clearly. Prioritize low-amplitude glaze
   roughness variation and fine directional steel scratches, preserving clean
   working patches. Do not paint the illustrated highlights into albedo.
2. **Localized wear:** grease gathers at the rear cooking splashback, grout and
   counter joins; small chips punctuate selected tile corners. Use placement-aware
   masks instead of equal damage everywhere or one repeating stain per tile.
3. **Wood and packaging:** the chopping block and stool have more legible grain,
   end grain and handled edges. Labels retain red/yellow accents with varied fading;
   avoid a common brown tint across every material.
4. **Lighting:** warm task pools make the roast skins and serving surface read
   against cooler walls. Evaluate this separately with matched-camera captures;
   retain readable white crockery and restrained contact AO.

## Limits of the concept

The main camera, room silhouette, entrance, counter, rail and fixture arrangement
remain recognizable. The image also invents small details, including a bucket
handle, and changes some tray contents toward rounded pieces. These are not accepted
geometry changes. Its dappled exterior light and strong wall aging are illustrative
choices, not texture data or new requirements. Keep the approved food silhouettes,
fan clearances and support relationships when applying material lessons.

For a later material pass, derive flat unlit fields with aligned roughness and
normal maps, then apply localized wear procedurally. Compare actual renders at the
same camera and exposure before adopting; the concept alone does not demonstrate
improvement in the game scene.
