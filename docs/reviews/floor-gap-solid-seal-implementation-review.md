# Floor-gap structural solid seals: independent implementation review

Status: **RELEASE for the bounded floor-gap audit correction**. No material correctness finding remains. This verdict is separate from the earlier stepped-underside release and does not accept a courtyard model or its source correspondence.

Reviewer: `stepped_implementation_review`. Applied repository guidance, `write-readable-typescript`, and `maintain-tests`. Read the [independent test review](floor-gap-solid-seal-test-review.md), actual `src/vector/floor-gaps.ts` diff, four appended tests in `tests/vector-floor-gaps.test.ts`, surrounding floor/underpass interval logic, and compiler mesh ownership. No production or courtyard files were edited by this reviewer.

## Assessment

The correction admits static collidable wall, floor, and stair triangles to the existing exact signed cap calculation. It uses actual compiled triangle positions and per-mesh entry/exit signs. Bounds only cull irrelevant triangles; they do not stand in for occupied material. The interval union therefore counts an intermediate slab that physically fills part of a retaining gap, including a slab on the lower floor's occupied side. It does not depend on that slab satisfying the distinct underpass-continuation rule.

Dynamic and explicitly noncollidable surfaces are excluded; visibility does not exclude a real collision seal. Props, water, and ceilings remain outside this bounded selection. The existing geometric partition at triangle endpoints and height-order crossings is preserved. There is no object ID, layer name, courtyard coordinate, height waiver, or diagnostic suppression. The change does not modify compiled geometry or add model filler.

Renaming `wallSpans` to `solidSpans`, and the corresponding local face collection, makes their broader responsibility clear. Reusing the existing per-mesh signed intervals is the simplest coherent correction; no parallel bounding-height path or new abstraction is introduced. Existing underpass continuation semantics remain unchanged and are not being redesigned by this patch.

The four new tests use actual compilation, independently specified slab/tread intervals, residual vertical and horizontal gaps, and explicit surface-flag controls. The narrow compiled-surface mutation is appropriate for exercising audit inputs that native floor authoring does not expose. A successful fixture alone would be insufficient, but the preserved negative controls reject blanket acceptance of an intermediate storey or a single enclosing height range.

## Independent verification

Executed successfully on Node 24.12.0:

```sh
node --test --test-concurrency=2 tests/vector-floor-gaps.test.ts tests/vector-stepped-stairs.test.ts tests/vector-seams.test.ts tests/vector-surface-contacts.test.ts
npm run check
```

All **71 tests pass**, including all 27 floor-gap cases. Existing tiny openings, partial seals, separated wall intervals, sloped and stepped stairs, underpass continuation, retaining seams, and strict surface-contact cases remain green.

Three additional public-API geometry probes also pass. Each has a four-meter shared edge, low floor Z0, high floor Z1 with .2 m thickness, and a wall ending at Z.6:

| Actual additional material | Independently expected remaining low/high gap | Result |
| --- | --- | --- |
| Slab Z.6–.65 and separate slab Z.7–.9, both covering the full edge | .05 m high over 4 m | Reported exactly |
| Slab Z.6–.9 over Y0–1 and another over Y2–4 | .2 m high over 1 m | Reported exactly |
| Slab Z.6–.9 whose footprint ends .01 m before the shared edge | .2 m high over 4 m | Reported exactly |

These probes verify preservation of an internal vertical void, an internal horizontal opening, and physical XY contact requirements, beyond the added suite's single-slab controls. Acceptance rests on these occupied-material semantics, not test counts alone.

The supplied test review independently derives the frozen court's intermediate slab seal, and the builder reports that its immutable compile-03 mesh now audits cleanly. This reviewer did not use that model's diagnostic count as the acceptance oracle and did not independently recompile or approve the courtyard. This release allows the separate model review to proceed; it does not replace it.
