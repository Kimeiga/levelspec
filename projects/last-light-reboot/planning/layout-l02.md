# Last Light L02 — focused paper repair

**Local spatial and strategy return gates pending. No AML.** L01 and its manifest remain byte-for-byte frozen. Body, control hypotheses, point geometry, retired perimeter routes, all four ascents and upper staging remain unchanged. This revision addresses only LL-L01-SP1 roof enclosure and LL-L01-SP2 shared spawn-frontier pressure from [the independent L01 report](../reviews/spatial-layout-l01.md).

Inspect [local comparison](repair-comparison-l02.png), [repair sections](sections-l02-5.png), [ground plan](layout-l02-ground.png) and [roof plan](layout-l02-roof.png), then [exact L02 data](developed-l02.json). Full upper plan and all earlier coordinate sections have L02 SVG/PNG versions. The author selection below is not review closure.

## Roof-step repair

Seventeen `RC-HL-*`, `RC-HM-*` and `RC-ML-*` fascia segments close the shared boundaries of the external high/medium/low roof zones. Each is 0.30 m thick, opaque and colliding, starting at the lower roof's top and ending at the higher roof's underside:

| Roof interface | Closure Z bounds |
|---|---|
| Low4.4 → high10.8 | 4.75–10.8 |
| Medium7.8 → high10.8 | 8.15–10.8 |
| Low4.4 → medium7.8 | 4.75–7.8 |

`RC-HL-00` closes the reported y30/x26–40 seam. The east/north counterparts and remaining shared boundaries are explicit in `roof_seams`. [repair-audit-l02.json](repair-audit-l02.json) records segment coordinates, vertical bounds and zero uncovered centerline length against their closure prisms. Roof-plan orange lines show these seams; SEC-ROOF-W/E show real coordinate intersections. The shared hall remains open below the low roof; this adds no ground tactical partition. Skylights remain. Lower inserted food-stall/service roofs inside the already enclosed high hall are interior ceilings, not missing external fascias. Physical joints and roof-on proportions still require compiled review.

## Departure comparison and retained changes

The exact experiment is retained in [frontier-comparison-l02.json](frontier-comparison-l02.json).

| Frontier option | Decision and cost |
|---|---|
| V0: L01 | Baseline: W-REG sees 4/5 samples of each departure; E-REG sees 5/5 public and 4/5 service samples. |
| V1: west outer service return x24/y28–32, east return x104/y72–76 | Rejected west part. It blocks the reported ray but seals the existing outside west public/service switch. Both spawn-specific paths alone would not reveal that loss. |
| V2: west inner service-jamb return x16/y28–32 | Rejected. It similarly separates the service frontage from the outside switch; recovering that link would require additional floor/route work outside this repair. |
| **V3: west public vestibule return + east service return** | **Retained.** SW-VR runs x24–28 at y21, thickness .40, Z0–4.4, joining the existing SW-B1 stock frontage. Public movement uses its existing 6 m east aisle. SE-VR runs y72–76 at x104, same thickness/height, joining SE-B2 to the service-wall corner. Both portal widths and internal spawn returns remain. |

The original seven planned body paths still sample clear. West-public is rerouted `(26,16)→(36,16)→(36,30)→(35,30)`, adding 2 m: 110.87 m versus108.87 m. Both original service paths and east-public are unchanged. The west outside switch remains `(26,30)→(22,30)→(12,30)`. The east outside switch now goes around the stock block via `(94,74)→(93,70)→(94,64)→(108,64)→(108,74)`: more movement and lost immediate cross-support, with a genuine different receiving side. It does not pass through the spawn room.

Four explicit escape chains back to the spawn interiors are added as `west/east-public/service-escape`; lengths are 62.12/33.25/47.41/55.03 m. These start at the stated W-REG/E-REG witnesses, not equal-distance scoring positions. All eleven named chains have zero sampled footprint/headroom warnings at 0.35 m spacing with the unchanged radius.40/height2/step.30 body. This remains proposal sampling, not continuous collision proof, measured safe retreat or a harness walk.

## Exact optical scope and retained deep pressure

Five eye targets per eight-metre portal lie at 10/30/50/70/90% of its width. Standing1.86 and crouched1.0695 eyes were tested from the integer-grid neighborhood x24–28/y28–32 west and x92–96/y72–76 east. Admission uses clear standing-body footprints and actual ground floor, giving21 west and22 east positions. L01 had simultaneous nonzero visibility to both frontiers at15/21 west and17/22 east positions. Selected L02 has **0/21 and0/22** at both eye heights. W-REG now sees public0/5, service4/5; E-REG sees public5/5, service0/5. W-PRESS `(36,16)` sees public5/service0; E-PRESS `(108,64)` sees public0/service5. These are named local results, not whole-district immunity.

Deep near-door pressure remains: `(26,16)` west sees public5/service3, and `(108,74)` east sees both5/5. Each is only2 m outside a departure and requires entering that receiving area; it is materially deeper than the reported14 m shared stations. This is explicitly retained as an invasion/close-pressure tradeoff for independent review, not hidden by the witness grid. Candidate friendly counter positions `(21,16)` and `(15,27)` west, `(101,80)` and `(108,78)` east fit the body and have open named standing rays to their respective intruder. They provide a possible body-only paired response from the existing returns; they do not prove firing, trading, successful defense or spawn protection. No barrier or invulnerability is assumed.

## Focused return requested

Spatial review: assess the complete roof-step closure, both repaired frontier neighborhoods, preserved public/service paths, support loss around the returns, and the explicitly retained near-door pressure. Strategy review: assess the west public detour, east outside-switch commitment and full-team/2v5 recovery implications. Reuse the accepted L01 macro scope elsewhere. Optional L01 west-switch/prep-bench ideas remain deferred.

Later captures must include roof-on step closure, the two repaired opposing frontier views and their offsets, public/service follower views around the new returns, and the near-door counter positions. Apply public camera controls after readiness and assert actual `dataset.view`; URL-only poses are insufficient. Independent approval of this paper repair and all compiled gates remain pending.
