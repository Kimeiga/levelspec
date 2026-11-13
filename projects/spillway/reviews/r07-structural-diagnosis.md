# Spillway R07 — independent ramp ownership and stair join diagnosis

No production source edits made by this reviewer. Independently compiled frozen source variants and intersected rays against final collidable triangles. Geometry checks were retained; no compiler/audit tolerance was weakened. This diagnostic does not replace route replay or full blockout review.

## East descending ramp

The initial source gives the triangular E-fall-fill exactly the same upper plane as E-fall. In the composed result, finite vertical rays at(84,46.001),(84,48),(84,49.999) hit the walking plane with **E-fall-fill** ownership. `level.floors` contains E-rise but no E-fall, so the declared E-crest→E-fall→ground connections lack their named walking support even though a visible physical slope exists. The connection diagnostic is therefore a real source/ownership contract failure, rather than evidence of absent render geometry.

Lowering the two fills by .15 m places their tops inside the .30 m ramp body. Actual compiled rays then identify E-fall on the exterior slope, its floor region returns, and both connection support failures disappear. At Y46.001 the ray hits E-fall at Z1.1997; Y48 hits Z.6000; Y50 meets ground at Z0. The fill/ramp bodies still overlap, so the repair does not open an underside pocket. This is an appropriate native source repair: the ramp slab owns walking geometry, while the fill supports it below.

## A north descending stair

The initial north flight is physically filled and joined: at(21,78.8), vertical rays hit the last tread at Z.2000 and the underside at Z-.3000. At Y79 the ground is Z0 and the stair's final .20 m riser is solid. Horizontal rays from Y79.5 toward78.5 at Z0,.05,.10,.15,.19 all hit that riser. The same relationship appears at the side/toe checks. I did **not** observe an actual .10 m air gap.

The discrepancy arises in the floor-gap contract for a descending filled stair: `src/vector/floor-gaps.ts`'s non-sloped stair-bottom fallback uses the first lower-guide elevation minus thickness. For this descending guide that is .60-.30=.30, while the native filled body in `src/architecture/flights.ts` uses min(start,end)-thickness =0-.30=-.30. The audit's .30 baseline extends .10 above the physical .20 final tread and produces the reported interval. This explains why increasing thickness to .60 removes the warning without repairing any previously observed air gap.

A source-only normalization avoids unnecessary deeper footing: keep the intended .30 thickness and write the same north flight's axis ascending, `21 79 0; 21 77 .6`. Three equal treads then occupy exactly the same physical positions/heights as the descending source, but the audited lower guide starts at the actual low end. The independent variant compiled with **zero geometry/floor-gap diagnostics**, retained the same toe top/underside and continuous-riser ray results, and retained both east walking-floor regions after the fill repair. It changes no layout, body, stair ID, riser count, route endpoint or portal coordinates. The separate descending-audit limitation remains documented rather than falsely described as a physical hole.

## Evidence variants

- `generated/spillway/diagnose-r07-original.json` / `diagnose-r07-original-loaded.aml`: reconstructed initial .30 descending flight / unlowered fills. SHA-256 `6f459659d2aa5771b0e5a2fdbbe6744f752a12d9ecd6c95d3d5464b92d143144`; reproduces all initial support/gap diagnostic IDs.
- `diagnose-r07-joins.json` / `diagnose-r07-joins-loaded.aml`: captured root experiment with .60 descending flight / fills lowered .15. SHA-256 `ced1f1c4ffff829d5f970ee4ed64342c5e3ea6dfd1cc7004f6e544eda557227b`; no geometry diagnostics, actual footing extends to Z-.60.
- `diagnose-r07-ascending.json` / `diagnose-r07-ascending-loaded.aml`: .30 ascending equivalent / fills lowered .15. SHA-256 `f402bcced0b9cac44dceda4d4e59a43ea2e57898a29441cdebc861cf8c2cfdf0`; no geometry diagnostics and physical toe retained at top .20 / underside-.30.

Frozen files and ray records preserve the inspected variant independently of concurrent authoring. These were geometry-focused compilations with navigation disabled; actual standing-body walking, compiled captures and final source identity must still be checked after the author selects the repair.
