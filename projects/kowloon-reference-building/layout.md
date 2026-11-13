# Bounded reference-building composition

Source: `../kowloon-building-polish/concepts/01-building.png`, read together with the independent `review/source-inventory.md`. This is an exterior reference reconstruction. Metric dimensions, hidden rear details and unobserved room layout are estimates; no playable apartment interiors are claimed.

The explicit footprint is 9.8 m along X and 7 m along Y, with a 0.24 m chamfer at the front-right corner. Front points toward -Y, right return toward +X, and Z is up. The four occupied stories are ground shops (0–3.35 m), balcony residence (3.35–6.35 m), second residence (6.35–9.35 m), and top residence (9.35–12.35 m). A 0.75 m capped parapet finishes the block at 13.1 m. The small roof hut and cylindrical tank remain subordinate equipment above that line.

| Assembly | Fixed composition |
| --- | --- |
| Front facade | Three broad multi-pane window banks: X 0.55–2.65, 3.2–5.4 and 5.95–9.05 m; cream piers and continuous story ledges; first-floor central balcony door |
| Corner and return | Chamfer joins front/right finishes, ledges and charcoal plinth. Two window banks per floor along the right return; secondary gated/shop fronts below |
| Ceramic | Muted jade square tile spandrels below the top two front-right window banks, continuing around the corner and right return; other facade fields remain aged cream |
| Balcony | One dominant deeper trapezoid over the center/right shop, plus the visibly connected shallow left gallery; thick fascia, low solid upstand, green horizontal tubes, four supporting brackets and conspicuous radial fan divider at the step |
| Ground commerce | Closed accordion gate at left beneath a muted green draped awning; wide recessed stocked central/right general shop beneath a faded red/cream striped awning; smaller secondary right shop and gate |
| Roof | Left-biased cream access hut with green door, central silver round tank, a short ladder, sparse aerial and pipework, closed roof surface and complete parapet |
| Signs/services | Left ivory/red vertical pharmacy sign; right oxblood/ivory hardware sign and smaller ivory repair sign; selected front/right AC units, localized hoods, attached downpipes/conduits |
| Ground | Thin worn sidewalk/curb and clipped corner drain; charcoal plinth up to approximately 1 m; no display pedestal |

Production boundary: `dressReferenceBuilding(level: CompiledArchitecture): void` appends visual-only KitMesh/Pen geometry and surface receivers. `building.ts` coordinates cohesive project parts. It uses shared `kitFinishes`, `drawSkin`, `windowUnit`, balcony emitters, shop trade furnishers, `PipeSystem`, `stairHut`, `roundTank`, sign panels, and canvas awnings. There is no project raster/material generator, baked scene lighting, whole-building random planner, seed search, or AML schema addition. Named deterministic streams vary only secondary part aging or stock. Layout, opening extents, floor count and feature presence are explicit.

Native `level.aml` carries a hidden non-collidable host and the simple street/ground definition. The visual shell is independently cut for real window recesses and deep shop openings, sealed at window backs and roof; it never sits over a solid visible box. The root build owns detachment, appearance compilation, export, camera/capture provenance and independent acceptance. A baseline render is required before fine detail acceptance. The first gates are four-story silhouette, window/ledge/tile hierarchy, balcony construction, distinct shops, and cream-versus-teal-versus-charcoal material hierarchy.
