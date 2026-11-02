# Lower-route physical wall union: independent pre-test assessment

Disposition: **the proposed explicit collision mode is a clean, bounded extension of the project-local helper**, provided ownership is checked rather than relabeled. This is a preimplementation contract/test assessment, not postimplementation acceptance. No helper, builder, canonical XML, geometry or server was edited.

Read actual `projects/dai2-daiban/union_masonry.mjs`, its seven-case exercise, the local construction builder and frozen v2 addendum; applied maintain-tests, reference-level-authoring and readable-TypeScript guidance. The currently failing builder emits the overlapping Fan wall and outward left return as two physical prisms. Their positive-overlap union is explicitly required by the addendum. Floors must stay outside this union.

## Bounded process contract

Accept no arguments as the existing `none` default, or exactly `--collision none|solid`. Parse before reading stdin/kernel work. Missing value, unknown value/flag, positional argument, repeated flag or trailing argument rejects with nonzero status and no stdout geometry. Every input's explicit `collision` must equal the selected intent; missing, mixed or opposite owners reject. Continue requiring one explicit material, valid positive closed input solids and the existing GLB/domain TRS pipeline. Returning the selected collision intent is useful metadata; it does not set runtime collision by itself.

The caller must nominate the **two exact existing wall props and dedicated assets**, preserving their actual declared collision intent and TRS. It must require one connected successful output, write/verify the replacement asset before retiring exactly those owners, and emit one physical `collision="solid"` owner. Do not force every nomination's collision field to `solid`, select a material-wide neighborhood, or include floors. Existing default-none callers retain their contract unchanged.

## Meaningful added checks

1. An explicit-solid positive-overlap control succeeds and independently verifies emitted triangle volume, exterior area, nondegeneracy, closed oriented welded edges, bounds and connectedness. Concatenated meshes must fail these checks. Explicit-none retains default-none geometry and intent; compare geometry measures, not triangle ordering.
2. Default solid-owner rejection remains. In solid mode, none/missing owners and solid/none mixtures reject in either nomination order; none mode rejects solid. Malformed argument classes reject without geometry. Preserve a valid subsequent control to establish useful recovery.
3. The actual Fan/left-return pair produces one component with the independently derived unequal-height volume and bounds below. Check the high Fan segment survives, return top remains2.40, and the overlap/internal same-facing surfaces are removed. Do not use helper-reported volume alone as the oracle.
4. Final XML has exactly one replacement physical wall, exactly the two nominated old props/dedicated assets retired, unchanged floor owners and geometry, and no unintended sibling retirement. Compile the final XML through the public boundary: no relevant coplanar/contact error; replacement surfaces are collidable and its actual exterior triangles are present in public `collisionMesh`. Metadata `collision:solid` by itself cannot prove preservation.

Retain all seven existing default controls, especially default solid-owner rejection, mathematical exterior-area controls and independent emitted-triangle checks. The new mode should not weaken any of them.

## Actual-pair oracle and precision

The two tops differ: Fan bottom/top−2.07/4.20; left return−2.07/2.40. Independently clipping the explicit return footprint against the Fan rectangle and using shoelace area gives:

| Quantity | Nominal value |
| --- | --- |
| Fan XY area |.8298000000000001m²|
| Return XY area |.1510218697834787m²|
| Positive overlap XY area |.018338302423578645m²|
| Fan/return heights |6.27/4.47m|
| Union volume |**5.795941546098754m³**|
| Union minimum XYZ |[−3.70,0,−2.07]|
| Union maximum XYZ |[1.341878,.8119734428304435,4.20]|

The volume formula is `A_Fan*6.27 + A_return*4.47 - A_overlap*4.47`. Multiplying the complete footprint union by one shared height would be wrong. These values come from frozen addendum coordinates, not actual helper output; output checks must allow justified GLB/Manifold Float32 conversion error. Do not introduce snapping, dilation or a placement offset to pass them.

The retired CLI `--strict` flag is unknown. Runtime surface-contact validation is strict by default (`--surface-contacts error`); `--strict-floor-gaps` is a separate supported option. No CLI/core extension is needed.
