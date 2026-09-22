# Rooftop reference acceptance

This directory contains original synthetic reference images for
`examples/rooftop-reference.level.svgx`. They are not photographs or
third-party assets.

Each PNG is a checked-in visual golden produced from one explicitly saved
perspective camera. The acceptance test recompiles the SVGX, renders the final
visible triangle mesh through each camera with LevelSpec's deterministic
CPU reference renderer, and compares the resulting pixels with these files.

Update the fixture intentionally with:

```sh
node tools/vector-rooftop-reference.ts
node --test tests/vector-reference-acceptance.test.ts
```

The pixel comparison is a regression gate for compiled geometry and camera
projection. It is not a photorealism metric.
