# Test inputs

These inputs exercise focused contracts; they are not maintained gallery examples.

- `aml/`: CAD, circulation, export/showcase, terrain and reference-calibration sources. Keep companion files beside their owning source. The terrain raster path is relative to its AML source.
- `migration/`: historical SVGX inputs used by explicit decoder/translation acceptance. Normal reviewer fixtures use native AML.
- `courtyard/`: independent geometry/material evidence for the site bake fixture.
- `kit-props.ts`: shared assertions for generated dressing props (hung cloth, atlas cells, separate objects), used by the building and span dressing suites.

The CLI owns its project template at `src/cli/templates/starter.aml`. Daiban and Dust II remain under `examples/` and receive map-level acceptance.

- `lighting/courtyard/`: real native bake outputs, calibration and bindings used as integration evidence. Regenerate via `bake:site` and `package:site-bakes`; they are not runtime website assets.

Regenerate the exact native bake evidence with Blender installed:

```sh
npm run bake:site -- clay
npm run bake:site -- chalk
npm run bake:site -- night
npm run package:site-bakes
node --test website/tests/bakes.test.ts
```

Both bake and package commands default to `generated/site-bakes`; an explicit destination/input overrides it. Preset source recipes live in `tools/fixtures/courtyard/bake-presets.ts`.
