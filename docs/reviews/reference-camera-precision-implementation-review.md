# Reference-camera precision — independent implementation review

**PASS. No material implementation findings remain for the shared precision fix.**
This is separate from `reference-camera-precision-test-review.md`. Applied the
TypeScript and maintain-tests skills, inspected the actual production/test diff
and public parse/serialize/compile callers, and independently ran the relevant
checks. This reviewer did not edit production code or these unit tests.

## Contract and implementation

`normalizeCoordinates` still clones the input and normalizes authored geometry and
landmark world positions on the existing millimeter lattice. Calibrated reference
camera position and target now retain their numbers while undergoing the same
finite and supported-magnitude checks. Up, FOV and clipping values retain their
previous precision and semantic validation.

The private `validateCoordinate` extraction shares the existing rejection rule with
`millimetres`; it does not widen the accepted domain or change the symmetric
rounding calculation. No compatibility flag, model-specific exception, serializer
postprocessing, new cache or alternative representation was added. The correction
occurs at the common public boundary that previously quantized all three paths.
Caller-owned data remains untouched because normalization still uses a clone.

The documentation distinguishes precise camera metadata from snapped geometry and
landmarks and retains vertical-FOV, meter and Z-up conventions. Other existing
dirty SVGX documentation concerns stairs and floor gaps and is outside this review.

## Verification

The independent preimplementation record preserves three intended baseline
failures: a rounded calibrated pose, a collapsed legal short direction, and an
altered accepted near-range coordinate. I inspected the final three new cases:
raw XML and serialization are checked separately, direct compilation is included,
expected pixels come from the original camera configured independently in Three.js,
and well-conditioned visible points use a1e−8-pixel bound. Camera fields, evidence
metadata, immutability, idempotence, retained geometry/landmark snapping and
camera-independent mesh/geometry identity are covered. Finite/range rejection and
the existing degenerate-direction rule remain discriminating negative cases.

Normalizing optional mask labels/source metadata on both sides is a legitimate
semantic comparison correction; it does not weaken camera precision or pixel
assertions. Parsed source locations are not authored geometry.

Independently ran:

- `node --test tests/vector-reference.test.ts`:26 passed, including reference,
  primitive, asset, collision and architectural-authoring behavior.
- `node --test tests/vector.test.ts tests/vector-reference-fit.test.ts`:28 passed,
  including XML, geometry, navigation, floor anchors and fitting.
- `npm run check` and `git diff --check`: both passed.

The actual r11 persistence audit additionally confirms the original failure is
fixed. Saved main position, target, up and FOV equal the frozen corrected source;
normalized-forward delta is2.22e−16. All57 inherited front-depth algebra checks
agree within1.025e−10 pixels. Published saved stair/reverse semantics are preserved
explicitly; only their raw input representation was adjusted to retain the prior
rounded poses. The final source compiles identically in a fresh saved-input replay
while its geometry hash remains unchanged from the pre-fix r11 candidate. This
audit is recorded separately in `model-r11-implementation-review.md` and does not
approve camera calibration or photographic fidelity.

Reviewed `src/vector/precision.ts` SHA-256:
`45ae34d445720831ea8c49e2a77f7bd0c7fcbba77fb4323dadd415e67e16cf24`.
Reviewed `tests/vector-reference.test.ts` SHA-256:
`dc0ab43a3a6a5021b09f6cc9f24ff9aaae2872acf8d088093a1b680f760d5cc3`.
