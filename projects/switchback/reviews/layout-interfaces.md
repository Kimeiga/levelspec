# Switchback L01 — independent A/B interface review

Reviewer: `switchback_interfaces`. Scope: Orchard/AP/A, Cistern/BP/B, Valve–site approaches and downhill CT retakes. Applied `fps-map-review` and `level-authoring`. Read brief, exact layout data and the actual rendered L01 drawing before author design rationale. No other review verdict was used. Evidence is drawing-based; production AML was not available.

**Verdict: changes required for the B staging claim; otherwise suitable for structural blockout with the checks below pending.** This is a local interface verdict, not a macro strategy or competitive-balance release.

## Findings

| ID | Relationship and consequence | Required disposition |
| --- | --- | --- |
| IF-01 | `Cistern-high` and `B-main` are both centered at X=24. Their 4.5m/5m openings align across the 6m-deep `BP` room. A B defender can potentially address the final steep flight through the entire nominal staging room; the planned bench at X=29..31 does not interrupt that channel. This directly conflicts with the brief's offset-onward-doorway contract and weakens the only independent main B climb after its long investment. | Offset `B-main` toward X=29, or use a structural baffle/changed room shape. Preserve ≥4m entry width and a usable passing route around `BP-bench`. Then inspect actual toe/crest and diagonal views; moving a doorway is not by itself proof of complete shelter. |
| IF-02 | `Orchard-high` at X=-24 and `A-main` at X=-28 differ by 4m, but half-widths sum to 4.75m. Thus a 0.75m straight overlap remains at X=-26.25..-25.5. Author design notes subsequently claim preparation is hidden by the offset. That is stronger than the drawing supports, even before diagonal views. | Move `A-main` farther west, e.g. X=-29, or qualify the claim and verify the residual view deliberately. A full-body gap must not be dismissed as a tiny ray. Recheck the bench and full doorway turning width. |
| IF-03 | The rendered SVG labels overlap in A/B and at CT; room labels, planting markers and obstacle IDs obscure one another. Exact JSON permits this review, but the drawing is harder to use as a human gameplay handoff. | Improve label placement or add enlarged A/B insets; keep obstacle IDs on the drawing and in the model. Documentation issue, not a topology blocker. |

## Accepted layout relationships

- A-main and A-short arrive at +16m on different sides of A. The 5×4m, 3.2m-high tank divides local views without cutting the room into single-person passages. The main entry has 6m of floor before the tank begins; the side entry has 8m before the tank's east edge. These are useful staging/entry distances for testing, not measured trade windows.
- B-main arrives on +20m after a level staging room; B-short rises 4m in 10m (about 21.8°). The side ramp's only transfer points are Valve +16 and B +20; no false XY junction exists. Its width is 4m. The low obstacle at X18..21/Y52..54 partly narrows the south portion of the side-entry approach, but leaves a substantial northern passing sector in the 4m-wide doorway. Actual radius and head clearance still require compilation.
- CT retakes use independent northern arrivals: A's +24→+16 flight is 12m in plan, B's +24→+20 ramp is 8m. The resulting defender asymmetry is coherent. On an A retake the tank can force a side choice after arrival; on B the turbine separates plant-side versus west-short attention. Both routes are reversible on the intended movement model; no required drop is silently introduced.
- All reviewed flight endpoints exactly meet room boundaries with the intended elevations. Nominal 0.20m risers are below the authored 0.25m step limit; steepest main grade is 36.9°, below the 42° slope setting. Actual horizontal treads, support, navigation and shoulders are not yet verified.
- `V-divider` leaves about 3m to the south boundary and 2m to the north boundary before wall thickness. It blocks the center-to-center A/B ray and creates two local paths. The southern Mid arrival at X=2 still has space on its east side. No obvious disconnected pocket is produced in plan.
- No mandatory mid-flight crates or narrow obstacles clutter the steep lanes. Long exposed ascents are an intentional cost, but low cover on the level landings should not be represented as cover from every uphill observer.

## Required compiled checks

1. Trace every reviewed flight forward and reverse with radius .3m, standing 1.8m and step .25m. Include both stair ends and slab/door/head transitions; centerline teleport checks are insufficient.
2. Inspect A/B main from the site's front, left/right entry offsets, staging bench, stair crest, one-third/two-thirds of each upper ascent and following teammate positions. Repeat standing and crouched studies. Record which staging areas are actually hidden after IF-01/02 repair.
3. Test `A-retake` and `B-retake` views from the upper service landing, intermediate descent and lower arrival. Door lintels may clip elevated sightlines while still permitting bodies; capture both directions. Check that CT cannot bypass the intended screening by looking over site walls.
4. Test B-short toe/crest versus B's turbine, low cover and main entry, and the reverse site-to-Valve view. Confirm there is no accidental low sliver or shoulder contact on the ramp/room thresholds.
5. Inspect both sides of tank/turbine and low cover at actual eye/body heights. Identify the next protected move and which other entrance exposes each position; material color alone gives no bullet-resistance evidence.
6. Five-player staging and 2v2 trades remain target-engine playtest questions. A 4–5m corridor supports a geometric passing hypothesis, not multiplayer throughput or successful trades.

## Author-rationale reconciliation

After initial assessment, read `design.md`. The declared intent—full climb ending in level preparation, distinct A lateral split versus B crest timing, and bounded CT elevation—fits the graph. IF-01 and IF-02 concern whether the currently drawn geometry delivers that intent; they do not demand reducing the requested hillside. Long Cistern commitment and expensive outer-to-outer T rotations are explicit design tradeoffs to test, not automatic defects.
