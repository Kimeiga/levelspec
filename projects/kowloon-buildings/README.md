# Kowloon building construction study

`level.aml` demonstrates a three-story trapezoid tenement with the shared wall and roof finishes, chamfered story bands, layered windows, service vents and scupper runoff. `views.json` provides repeatable exterior and roof cameras. Textures reference the existing dressing-demo library.

```sh
npm run --silent levelspec -- preview projects/kowloon-buildings/level.aml
node tools/capture-level.mjs projects/kowloon-buildings/level.aml generated/kowloon-building-capture projects/kowloon-buildings/views.json
```

A polygon building is a standalone non-collidable vertical `<extrusion>` of a horizontal convex profile. It preserves the authored silhouette as one tenement. Box hosts retain their row-of-tenements behavior. Polygon profiles currently exclude concavity and holes; closed ground-frontage details are supported, while open shop rooms and `base-wall` attachments still require a box host. Generated architecture remains visual; author physical boundaries separately.

See [reference observations](reference-study.md) for inspected photographs and interpretation.

`windows-day.aml` and `windows-night.aml` share their seed, footprint, and camera
manifest (`window-views.json`). They isolate the physical window recesses and
nighttime emission without wall aging. `finish-study.aml` with
`weathering-views.json` shows the current smaller three-story material experiment,
including close views of the concrete, repairs, runoff and blue door. It opts into
`texture-density="66"`; `level.aml` remains the larger architectural study.
`windows-open.aml` exercises transparent, unobstructed casement leaves.

Set `time-of-day="night"` on the dressing section for the night variant. Dark
recesses are visual chambers, not enterable rooms; geometry and collision do not
change with the lighting mode.

See the [AI concept comparison and follow-up candidates](art-direction/observations.md) and [verification notes](verification.md). The material experiment blends source render textures through procedural coverage maps, with neutral gray color variation, shallow normal-map repair edges and localized weathering. Captures remain visual experiments rather than a full-scene rollout.

`component-views.json` adds shutter, cage, pipe and small roof-panel views.
Those parts use a shared procedural finish with paint coverage, exposed substrate,
oxidation, roughness and normal detail. Member UVs use physical meters; shutter slats and folded roof sheets are
unwrapped by arc length. Geometry-derived contacts and folds guide dirt and
rust, while the base pigment and roughness vary independently. The current
experiment uses `grime="0.9" wear="0.22" rust="0.5"`.
