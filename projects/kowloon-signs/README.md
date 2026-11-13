# Kowloon sign street

A review level for the `kowloon-street@1` kit's generated signs: two tenement
rows across a 9 m street and a taller row behind a 2 m side alley. It has no
gameplay, spawns or routes and validates as `premap`.

```sh
npm run --silent levelspec -- preview projects/kowloon-signs/level.aml
node projects/dragon-ford/capture.mjs projects/kowloon-signs/level.aml generated/kowloon-signs/<new-run> projects/kowloon-signs/views.json
```

`views.json` names street-level, frontage, alley and roofline cameras. Change
the dressing `seed` to see another street, `detail` to thin the signs, and
`wear`/`grime` to age them. The compiled level's `signPlans` list every sign
the generator proposed and whether the survey kept it; see
[procedural dressing](../../docs/DRESSING.md#signs).

Textures are shared with the [dressing demo](../dressing-demo/README.md); the
lettering atlas, sign-board and rust finishes are painted by
`tools/kowloon-kit-textures.py`.

## Sign paint experiment

`material-study.aml` is a compact facade for iterating on signs at close range.
It binds the existing seven-face lettering atlas, signboard, rust and timber
finishes. Use `material-views.json` for repeatable front and reverse views:

```sh
npm run --silent levelspec -- preview projects/kowloon-signs/material-study.aml
```

Building `texture-density` also enables sign appearance maps. The existing
shape and text-layout generator remains responsible for sign design; the
compositor layers its background, borders, atlas glyphs, paint loss and localized
corrosion into opaque color, roughness and normal maps. Small screws locate
the short corner streaks. Paint loss is disabled at zero wear, while authored
source texture aging remains visible. The shared `rust` amount controls the new
raster oxide on sign faces and supports independently of paint loss. It cannot
remove rust in authored source images or the simpler treatment used without
texture weathering. Face corrosion follows paint loss, so zero wear also leaves
the sign face free of added oxide.

Intrinsic paint has gentle seeded pigment and roughness variation before dirt
or aging is applied. Hue variation belongs to the paint and lettering layers;
primer and rust retain their own material colors. Added face rust favors chipped
edges and actual screw trails, with restrained coverage inside the panel.

Steel supports retain seeded paint palettes over the shared component weathering
used by the building kit. Physical-meter maps add edge and end wear; small
chamfers on rectangular members let real lighting catch their edges. Paint
patterns add no chip or stain polygons. Signs keep the existing atlas-material
path when texture weathering is omitted. The lettering finish must still be
bound: without it the existing generator intentionally draws placeholder blocks.
The custom chamfered sign members are not yet connected to the shared detector
for intersections between separate support members; their edge and end aging
does not establish automatic detection of every bolted connection.

This is an opt-in visual experiment, with screenshots and lightweight typechecks;
full-street texture-budget acceptance and broader testing are deferred.

The latest captured sign close-ups are retained in `generated/sign-weathering/paint-05`: front,
reverse and facade views. The loaded source/companions and actual cameras are
recorded in `capture.json`; browser errors are empty. `implementation-hashes.json`
identifies the frozen source, including the shared component finish. Earlier
`paint-02`/`paint-03` timed out before compositor and UV-receiver batching fixes;
they are diagnostics, not accepted views. Independent source reviews accepted
the sign mapping/control changes. These captures precede the shared `rust`
control and removal of the sign-specific wear multiplier. No broad suites were
added or run.
