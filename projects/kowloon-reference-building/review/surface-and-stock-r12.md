# Surface and stock pass — r12

The requested changes cover finer wall deposits, softened exposed masonry trim, shelf-quality counter/crate timber, textured cartons, and supported bottle loads. The clipped vertical corner remains architectural; the new two-segment fillets are on cornices, parapet caps and balcony upstands.

The intermediate r08 vertex refinement was rejected by independent visual review: it increased the scene to 545,086 triangles without resolving the soft grime sufficiently. The retained implementation instead samples local deposits into cached finite material maps at up to 128 texels/m. Canonical 4.8 m cells preserve the intrinsic finish's repeating phase and affine source-normal UVs. Clean walls still share their intrinsic recipe; prepared cell charts also support later pipe/sign deposits. Illumination remains real-time.

Shared counter and crate emitters now use the existing shop-timber atlas and wear. Carton stacks use the approved stock-box asset. The crate returns its interior floor; the reference composition seats complete bottle meshes there, closes inter-crate gaps and places cartons on a lid over an empty crate.

The independent contract reviewer approved the representation and focused coverage. The separate implementation reviewer found and resolved canonical texture-phase and late-deposit fallback issues. Its ignored numerical probe passed fillet closure, reflected winding/normals, matching omitted-face replacements, metric UVs, timber overrides/RNG, crate/bottle support, finite/shared finish equivalence, exact repeat boundaries and actual late-deposit compilation with unchanged collision.

Validation: `npm run check` passed. The existing reusable-material suite passed all eight cases; the adjusted clean/tile-exclusion and exposure-snapshot cases also passed after review. No permanent visual assertions were added. Chrome captured nine final day/night views with no console or page errors and verified the loaded GLB hash.

Compared with r07, r12 has 203,221 triangles (previously 261,190), 33,945,282 texture-channel texels (previously 25,103,226), and a 134,391,344-byte GLB (previously 136,200,004). The tradeoff is more cached image data in exchange for much less wall geometry. Final physical hash is unchanged: `d423092b74b0b9823f8514f65d268e3ba5ca2fa04f298a31acaa8d9b7d8f1042`.

The frozen model, screenshots, comparison and manifests are under `generated/reference-building/r12/`. Earlier obsolete r01–r06 model binaries and the incomplete r09 export were removed after a full-disk error; their source snapshots/review images remain, as do the r07 baseline and r08 comparison model.
