# Independent architectural plausibility review — r04

**Verdict: accepted for the stated background-exterior brief, with one nonblocking enclosure uncertainty recorded below.** The inspected model reads as a coherent four-story corner building with recessed commercial ground-floor rooms, a first-floor balcony, and a roof service zone. It is not merely an assembly of disconnected facade panels.

## Brief, independence, and evidence

Brief received before author rationale: four-story exterior/background house with recessed shops and balcony; upper apartment interiors are nonplayable and need not be invented. Review applied `level-architecture-review` and `level-authoring`. This architectural pass is separate from source fidelity and renderer styling.

Inspected actual r04 hero, side, roof, shop, balcony, and upper views; then the frozen `level.aml`, `building-source.ts`, and all four `parts/*.ts` files. Consulted shared `shop/shop.ts`, `ground.ts`, and `roof-access.ts` to understand the emitted room/gate/hut enclosure. Those helper reads supplement the frozen project source; they are not a separately frozen dependency snapshot. The reviewed actual export is SHA-256 `d7c5f1bb2e3cabfc1064d40645adf1577fec79c9f4536e095e864adfc2dd2ad3`, consistently recorded in build/capture manifests.

No author explanation was used to excuse a visible defect. No gameplay walkthrough or collision proof was requested or performed.

## Architectural observations

### Envelope and roof

`composition.ts` defines adjoining front, 24 cm clipped corner, right, rear, and left faces around the approximately 9.8 m × 7 m core. The front/right faces show coherent piers, openings, and continuous floor bands in hero/side. `drawBuildingShell` supplies top and underside roof planes rather than omitting the roof for presentation. The high roof view confirms a full roof surface enclosed by parapets, a capped roof-access hut, and tank support feet meeting the roof. No open-roof interior accidentally exposed in an ordinary view was found.

The roof hut is a small enclosed visual bulkhead with a framed door and cap. An actual connecting stair is not demonstrated; that is compatible with the nonplayable background-building brief. Rear/left faces are defined in source, but there is no dedicated rear/left full exterior capture in this packet, so their complete rendered finish is not independently accepted.

### Stories, balcony, and supports

The declared ground level is 3.35 m, residential levels occur at 3.35/6.35/9.35 m, and the roof is at 12.35 m. This produces four legible occupied stories and a subordinate roof hut. No extra occupied story or contradictory stack is apparent.

The balcony has a top at 3.35 m, soffit at 3.08 m, a shallow left segment joined to a deeper main projection, low perimeter upstand, tubular guards, and concrete corbels. In the actual low balcony view, the underside and corbels remain separate from the shop canopy. The separate balcony doorway begins at 3.38 m with a threshold connecting to deck level; it no longer appears to be a window covered by an unrelated board. The fan divider is attached at the shallow/deep transition. These relationships read as deliberate construction. This is visual plausibility, not a capacity or guard-code calculation.

### Recessed shops and openings

The main shop is an actual recessed volume approximately 6.0 m wide and 3.15 m deep, with floor at 0.12 m and ceiling at 2.85 m. The return shop is approximately 2.85 m wide and 2.4 m deep, with the same floor level and ceiling at 2.65 m. The shared shop shell emits floor, ceiling, side walls, and back wall. Their source placements fit within the core and do not overlap each other: the return shop begins around world y = 3.29 m, beyond the main shop's y = 3.15 m rear plane. Actual shop views show recessed stock and a credible shaded interior, not an unbounded hole through the building.

The main shop has an evident central entrance gap and small threshold relative to the sidewalk. This is sufficient to establish the use visually; it does not verify navigable clearance. The closed left and return gates have inner backing leaves and tracks, subject to the top-strip uncertainty below. Upper window units have reveals and recessed backs; detailed apartment rooms/floors behind them are outside this brief.

### Ground and surroundings

The street/sidewalk is supported by continuous curb/underfill and a ground receiver. Hero/shops no longer show the floating comb-shaped edge from r02. The building base, charcoal plinth, thresholds, pavers, and corner drain meet coherently in the inspected views. The minimal street context is appropriate for a one-building demo; adjacent blocks or an invented full road network are unnecessary.

### Use and attached details

Commercial shelves/racks/crates, closed gate frontage, balcony pots and door, facade ACs/cages, roof tank/hut, downpipes, and bracketed signs communicate the intended mixed commercial/residential function. Their visible supports and attachment points generally meet the host wall/roof/deck. The review found no consequential floating main fixture or unconnected principal sign in r04. Exact service routing and mechanical operation are not established by decorative geometry.

## Nonblocking warning A1 — Closed-gate top strips are not conclusively sealed

**Evidence and location:** Frozen `composition.ts` cuts the front closed-gate opening at x = 0.4–2.7 m up to z = 2.70 m, and the right closed-gate opening at facade u = 0.4–2.55 m up to z = 2.65 m. `groundUnit` receives a 3.35 m unit height; the shared gate helper computes a 2.50 m gate head and a head box ending at about z = 2.58 m. Its backing leaf ends lower. Thus a possible approximately 0.12 m front / 0.07 m return strip above the gate is not covered by that gate assembly. On the right, the corresponding world region is x ≈ 9.8 m, y ≈ 0.64–2.79 m, z ≈ 2.58–2.65 m; the front region is y ≈ 0 m, x ≈ 0.4–2.7 m, z ≈ 2.58–2.70 m.

**Reason for concern:** A fully closed frontage would normally have infill or a deliberate transom/vent here. The canopies hide these strips in the ordinary supplied views, so this review does not demonstrate a visible sight-through defect. An intentional ventilation strip is plausible; the current source does not identify it as such.

**Inspection target:** A low view behind the left muted-green canopy and behind the return closed-gate canopy, aimed at their upper tracks. If those regions will be exposed in future presentation/playable use, inspect and either provide neutral infill or explicitly model the intended ventilated transom. This warning requests review; it does not authorize automatic changes or invalidate the current background-exterior acceptance.

## Limits

No interior stair circulation, upper apartment enclosure, structural loading, building-code compliance, watertight mesh proof, collision alignment, navigation reachability, or competitive gameplay balance is certified. The project source explicitly appends visual dressing outside physics/navigation, and the AML envelope box is invisible/noncollidable. Architectural acceptance applies to the visible exterior and recessed-shop scope of r04 only. Image-fidelity acceptance and residual art differences are recorded in `critic-r04.md`.
