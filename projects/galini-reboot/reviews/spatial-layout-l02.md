# Galini L02 — independent spatial / visibility and construction review

## Raw-first spatial-interest record

Recorded after the brief, actual overview and all five aligned floor PNGs, and exact layout inventory, before README/dispositions or other verdicts.

Initial response: **promising**. The map has a legible shore, middle working street and upper civic district on opposing ravine shoulders. Those levels are connected through a varied architectural journey: a Laundry undercroft/internal return, a public Cooper stair, a Chapel-side porch, a Press stair house, a School lower arcade/upper room, a Bell public return and a coastal cart road. Buildings now govern actual through-routes and bends, rather than being merely labels on occupied pads. The two crossings lead through gateways and have different arrival responsibilities.

The strongest relationships are the lower/upper uses of Laundry and School, and the choice between a public street climb and an enclosed building climb to the same broader district. These create decisions about approach, information and commitment without requiring an ability or jump. The street's continuity around masses is as important as the stair count. I have not inferred novelty against uninspected earlier plans.

The open shore and upper civic crossing remain broad exposed commitments. The Cistern and Boat sites have very different local enclosures; five obstacle objects alone do not establish useful refuge/support. The bounded bridge/School apertures, entrance offsets, guard effects at returned stairs and actual slab/ceiling cuts require the detailed pass. In particular, the drawing distinguishes floor levels but cannot prove that the six-metre flights, three-metre landings and interior doors fit a moving body with overhead slabs present.

Raw inspected SHA-256 identities:

- `brief.md`: `e5fb1cd3982ff293174bb229010dea0af1d2b6de19d4d1dd6215b0a9cd678a56`
- `planning/l02/manifest.json`: `6c1afb2331f13d1969926ac32617cddd40e36fc669ba5a7d3e8a547ac1b1f766`
- `planning/l02/layout.json`: `18d54230bef43d6ab64070f84d46532b0c1032327576aa4a27325a394ea345eb`
- `planning/l02/encounters.json`: `c485b456deae5f6da3abeb242ab68797c1c4a6ff821e7fadd3391ad607ee8f1a`
- `planning/l02/overview.png`: `b39eb8685104832822b0d31aade697a6a41d6a73691d0bbb63f7321f5b0f2d12`
- `planning/l02/floor-0.png`: `89f88e53b95752bc54296f6802ae2dbf9027cc65dad7863c5ddeb58145020b44`
- `planning/l02/floor-2.png`: `14b467a972004b2392919bcc59fa43ba1e591ebc033e6a598f18c8c88439aa64`
- `planning/l02/floor-4.png`: `19954de274172ae68bc1582085f27ef9d8da1861f8759ab2d50bfce60eb442ad`
- `planning/l02/floor-6.png`: `f0d9de1ed0f4973579cdc5e550f4e6bcbd272f75343a6264594c5886cfcec4a7`
- `planning/l02/floor-8.png`: `5b36afbfa0b2a699cc1e93913e6151d3711e0c334d496b1f3ab30018f6f5a056`

## Dedicated paper verdict

**Changes required, locally bounded.** The recomposed spatial design is worth taking into native authoring. Resolve the support-contract conflict and correct the route witnesses below first; neither requires another map-wide redesign. Physical movement, exact headroom, rendered visibility and gameplay balance remain pending compiled review.

Scope: actual SEC01–SEC10 PNGs; vertical, shared-volume, information, bridge and roof-structure sections; variant comparison; all 23 portals, 14 flights, two ramp runs, ten routes, both five-body spawn groups and both objective footprints. README/disposition were read only after the raw-first record. All 51 files in the supplied manifest match their recorded hashes. Applied FPS map review, combat geometry, level authoring/structural review and architectural review guidance. This is an independent geometry/design assessment, not an engine simulation.

### Required findings

**GA-L02-SP1 — reconcile suspended School edges with lower occupied routes.** The prose and section explicitly retain the lower arcade and colonnade, but three upper boundary records still specify `kind: retaining crest / parapet`, `baseSupport: -6`, with no lower opening:

| Boundary | Exact conflicting lower journey |
| --- | --- |
| `B-F08-01-0-2`, (94,82)→(94,89), +8 | R08 crosses at (94,84,+4), immediately outside D17; SEC08 F→L and F→O also cross this edge. |
| `B-F08-01-0-64`, (111,63)→(98,63), +8 | R05 crosses the balcony frontage at (107.714,63,+4) between D16 and Fountain. W03 only opens the wall at +9.1…+10.1. |
| `B-F08-01-0-54`, (126,81)→(124,80), +8 | R08 crosses at (125.68,80.84,+4), on the lower court’s Bell return. |

A continuous retaining interpretation would close these journeys. This is a contradictory paper construction contract, not a claim that an unbuilt mesh already fails. Give these suspended edges explicit soffit/support limits and place piers outside the body corridors; correct the records or provide named exceptions that clearly supersede them. Preserve D17’s useful straight-arcade support and the two outside routes. Generic “do not fill the arcade” prose does not identify all three interfaces.

**GA-L02-SP2 — correct three local walk witnesses to fit the retained radius.** Independent projected radius-.30 checks and finite .45 m shell checks find:

- R02 segment (27,27)→(36,26) passes only **.1104 m** from the quay edge. A nearby alternative via (27,26.2) retains **.7428 m** minimum plan-edge clearance along the checked approach.
- R07 segment (30,50)→(28,55) passes **.1857 m** from Press shell `WX-M05-12`, whose half-thickness alone is .225 m. This is more than a hypothetical capsule concern. Replacing (30,50) with (28,50) leaves the local witness at least **1 m** from the normalized floor boundary and clears that corner.
- R05/R10 turn directly east at S5a’s foot, (103,29)→(109,29), clipping the outside of the apron/stair corner in a radius-.30 projection. Continue to (103,28.6), then (109,28.6), before (111,25); the checked corridor has **.40 m** minimum projected edge clearance. This is a witness correction, not evidence that the whole Salt route is impassable.

These alternatives fit the supplied planar floor/flight footprints. Update the actual route records and affected drawings; native collision still decides the final tread and wall joins. The Salt crest/D09 sill interaction, where a body straddles a descending tread and the doorway threshold, remains a compiled step/threshold check rather than an additional paper defect.

### Section-by-section encounter assessment

The following compares named leader, follower, opponent and support poses. “Clear” means the supplied geometric hypothesis survives this paper pass, not verified visibility. Standing/crouch eye comparisons use 1.674/1.023 m; full walls remain opaque at both heights.

| Section | Useful support, exposure and response |
| --- | --- |
| SEC01 — Ferry departures | All five T bodies fit the spawn floor, with 2 m minimum separation. F can follow L toward Laundry while Cooper mass screens their direct relation to O. S on the shore/Cooper approach can engage O; the initial choices have different information. Laundry retreat is possible, but reconnecting to shore requires giving ground. There is no evidence of a protected spawn or guaranteed opening timing. |
| SEC02 — Laundry | D01→D02 feeds the return stair; D03 and D04 have different outside fronts. L at the stair head is staging, not already engaging O: the gallery corner blocks that diagonal. Moving toward (26,44.5,+4) earns D03’s view. F must finish the climb and shift laterally before trading; S watches the north door rather than assisting through the facade. Retreat down S1 remains reversible but exposes the separate undercroft entry. Crouching does not bypass the walls. |
| SEC03 — Cooper / Press | S2’s quarter-turn enters south of Press; D05→D06 is a bent receiving passage. F can cover L’s first segment, but neither current F nor L has an immediate ray to O through the bend. Advancing to the (37,59,+4) passage mouth creates useful support through D06. S on the widened east street covers the next house approach. Middle crossing and S4 remain distinct commitments after contact. |
| SEC04 — Chapel / A | S3 uses the +6 porch, then a separate Chapel-side flight and circumambulation; S4 instead emerges into A’s southern street. Chapel blocks the named L/F from O, requiring another clear. Bridge-side S can support the open A precinct but cannot shoot through West Homes into the southern approach. O01 is useful crouch preparation north of A against a southern ground-level view; standing eyes and a bridge-side flank defeat it. A’s full 6×6 m footprint is supported. |
| SEC05 — Middle / Taverna | O03 blocks L0/F0 from O at both eye heights. **L1 and F1 both have useful clear rays to O** after advancing south of the return; the leader is not left permanently unsupported. S through D15 covers the east part of the room. The return adds a clearing decision and withdrawal corner, while the bridge stays exposed. Keep selected M1 rather than reopening the direct M0 sweep without evidence. |
| SEC06 — Shore / B | The approach pauses north of Boat Shed, then turns into the plant area. Refine the packet’s support wording: named F (84,25) can still see named O (110,23), as can L; support is lost only for particular deeper/southerly movements around the shed, not automatically at the shown bend. Customs S can challenge the site through D11 or guard D12. O02 protects selected crouched positions north of it from the southern ground front; Salt height and Customs flanking bypass that protection. B’s 6×6 m footprint is supported. |
| SEC07 — Salt / cart road | D10 reaches a real upper loft; D09 frames the stair head. L can challenge the lower stair approach, while F’s more distant diagonal is interrupted by the upper side/crest, especially crouched. Advance the follower into the loft before counting a trade. The road’s intermediate S position offers a longitudinal view and a retreat in either direction, but little enclosure. Salt’s short turning stages and the longer exposed road are meaningful different reserves. |
| SEC08 — Lower School | Subject to SP1, D17↔D18 supplies a useful reciprocal straight arcade: L and O can engage and F can trade after entering the west mouth. The next outdoor turn toward Bell interrupts support. D16’s S watches the stair approach, not the arcade through solid interior boundaries. The arcade stays north of the +6 landing, avoiding its 1.7 m soffit clearance. Columns are actual opaque/collidable structure, not merely visual decoration. |
| SEC09 — Upper School / CT / Bell | All five CT bodies fit with 2 m minimum spacing. D19 is a clear north challenge for L/O; current F cannot trade O through the facade from (98,84). A follow-up position around (102,86,+8) can cover D19 without crossing the well. D23 gives S an actual Bell stair join; D20 requires leaving the CT-facing frontage for W03. Upper-floor occupation does not grant vision through the slab into the lower arcade. |
| SEC10 — Civic span / Inn | L/F/O retain useful direct support along the named bent-span rays, including F inside the 6 m Inn arch. S at (94,99) covers the east receiving street but cannot immediately trade across the Inn facade. Rounding West Homes changes that relationship again. W02 costs a standing position on the span and attention away from both ends; selected U1 bounds information without eliminating every useful upper/lower relation. |

### Every vertical interface and portal

All flights specify 6 m horizontal run, 2 m rise, ten .20 m risers and nine .667 m goings; the body’s .30 m step limit is compatible on paper. Clear flight widths are 3.5–4 m; intermediate landings are at least 3 m deep. Guard height 1.1 m does not guarantee crouched sight or ballistic protection. Actual guard ends must leave full movement openings at both arrivals.

| Transfer | Interfaces, enclosure and local combat consequence |
| --- | --- |
| S1a/S1b, 0→2→4 | D01 undercroft→D02 lower room→two 3.5 m flights/L1→D03 east or D04 north gallery. H-L clears both flights and the landing. The .30 m upper slab leaves 3.7 m over the undercroft; the stair ceiling must respect the open well. Returning direction and gallery corner delay trades without making withdrawal one-way. |
| S2a/S2b, 0→2→4 | 4 m public flights and 5×4 m L2 turn; full end aprons. The upper apron leads into Press street rather than directly into its door. Open sky removes an overhead conflict, while the corner/crest bounds lower-to-upper support. |
| S3a/S3b, 4→6→8 | First 4 m flight, broad occupied Chapel porch/L3, then offset 3.5 m edge flight. These are two traversable stages rather than a single stair icon. Chapel mass makes the final approach a circumambulation; a follower on the last flight does not already control A. |
| S4a/S4b, 4→6→8 | D07→vestibule→3.5 m return flights/L4→upper passage→D08. H-P clears the +6 landing; full-height passage walls explain the limited lateral support. Keep the wall/roof assembly outside this well and avoid putting the upper slab across the return. |
| S5a/S5b, 0→2→4 | 4 m external flights/L5 turn into D09; loft exits D10. Adequate plan landing/apron area, with SP2’s foot witness and the compiled D09 threshold check noted. The turn and loft provide staged exposure, not simultaneous vision from both districts. |
| R6a/R6b, 0→2→4 | 5 m cart road, 10.52°/11.26° grades, LR6 connecting their differently oriented mouths, plus explicit full-width end aprons. Both directions fit the paper slope allowance. The upper street wraps East Homes; D12→Customs porch→D11 gives a sheltered final bend to B after the exposed road. |
| S7a/S7b, 4→6→8 | D16→3.5 m return flights/L7→upper School, then D19/D20/D23. H-S opens y71–81; the lower through-arcade y82–86 stays beyond its landing, with 3.7 m clearance under the +8 slab. The upper west/east galleries are real routes around the hole. Do not replace the occupied lower volume with foundation fill. |
| S8a/S8b, 8→6→4 | D23 and the upper porch join the 4 m public flight directly; L8 turns to the second flight and lower court. H-B prevents the upper terrace closing the descent. Both directions retain an explicit endpoint apron; the lower return through the east court depends on SP1’s suspended support exception. |

Portal audit: D01–D04 Laundry; D05–D06 Press passage; D07–D08 stair house; D09–D10 Salt loft; D11–D12 Customs; D13–D15 Taverna; D16–D18 lower School; D19/D20/D23 upper School; D21–D22 Inn. Every portal midpoint admits a radius-.30 disk in the adjacent projected floor/flight footprints. Widths are 3–6 m; clear heights are 3 m, or 4 m for the Inn. This checks drawing fit only; jamb thickness, threshold continuity and overhead lintels still require native assembly inspection. W02/W03 are observation openings, never movement substitutes.

### Architecture, bounded apertures and optional improvements

The 20 complete, nonwalkable roof volumes provide a credible inhabited town hierarchy: work buildings at the waterfront/middle street, Chapel/civic ground above, and a different east-side School/Inn sequence. Laundry and School have actual shared occupied levels. The two 6 m clear bridges have declared decks (.60/.70 m), bank abutments and masonry piers to the scenic ravine; their reference-informed vocabulary is plausible as invention, not measured structural certification. Actual roof ridges, irregular-footprint roof closures and pier/abutment joins remain native visual obligations. The roof-on plan is a design drawing, not proof of built enclosure.

W02’s standing eye ray crosses its wall plane around +9.546, between sill +9.1 and head +10.1; crouching falls below the sill. W03 similarly gives a nominal standing crossing near +9.310, with crouch below. W03 has little margin if its .35 m wall is placed wholly outside the clear balcony edge: the lower-facing surface would put the standing-to-standing ray near +9.098. **Carry its exact wall placement and finite sill faces into compiled review.** An optional observer shift from y63.6 to y63.5 increases that margin without changing architecture. Do not infer visibility to a crouched lower opponent from the standing witness.

Optional improvements, not acceptance conditions: annotate SEC06’s surviving F→O trade explicitly; add the advanced Press and School follower poses identified above to make useful support as legible as occlusion; retain the open-vs-bounded bridge and direct-vs-return Taverna alternatives as focused playtest experiments. No extra prop or cover quota is justified by this paper pass.

### Compiled handoff obligations

After the two local findings close, reuse this unaffected section coverage. Compile the frozen AML, then physically walk all ten journeys in both directions with the retained body; inspect every flight crest/foot, quarter/return landing, D09 threshold, guards, and all four slab wells. Verify the three suspended School interfaces with ordinary interior and roof-on views. Capture actual matched leader/opponent/follower/standing/crouch views, including the advanced useful-support poses and finite W02/W03 sill faces. Check the five-body starts, whole plant footprints and retreat paths; measure timing only then. No current polygon, sampled centerline, or analytic ray certifies continuous collision, navigation, combat usefulness, utility, sound, penetration or balance.
