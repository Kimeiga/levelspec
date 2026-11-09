# Daiban courtyard

Detailed courtyard sample authored with native AML walls, curved openings, profiled
screens, stairs, galleries, planters, panels and an overhead slab. The upper corner
has a full-width landing, continuous stair edges and walls fitted beneath the treads.

```sh
npm run --silent levelspec -- preview projects/daiban-courtyard-aml/level.aml
npm run --silent levelspec -- validate projects/daiban-courtyard-aml/level.aml --json
npm run --silent levelspec -- build projects/daiban-courtyard-aml/level.aml --out generated/daiban --no-uv --json
```

Dimensions are estimated; the connected corner includes deliberate design completion.
Photographic fidelity is not established by geometry validation. Reference photographs,
experimental studies and generated review outputs are excluded from this sample.

All eleven navigation assertions pass. Nine constrained walking replays complete,
including both corner turns; two historical isolated rear-gallery start placements
remain limited by navigation/support sampling. Two separate-storey floor-gap warnings
remain. The player dimensions and movement tolerances are unchanged.

Use `--no-uv` for export; lightmap-atlas repair is outside this sample update.
