# Obstacle and interface inventory — r08

All dimensions in meters. Footprints list southwestX/Y,width,depth. Top=base+height. Named obstacles are opaque native collision unless explicitly scenic. Ballistics, destructibility, audio and utility are unknown. Floor/wall/flight geometry is editable AML.

- **COURT-SERVICE-PAVILION**: footprint [63, 94, 8, 5], base 3, height 4.2. Central service pavilion interrupts the residual end-to-end court diagonal; north aisle 3 m.
- **COURT-GATEHOUSE-W**: footprint [37, 97, 8, 5], base 3, height 4.2. North-edge carriage pavilion breaks long court line; 3 m south aisle.
- **COURT-GATEHOUSE-E**: footprint [87, 94, 8, 5], base 3, height 4.2. South-edge carriage pavilion breaks court line; 3 m north aisle.
- **ORANGERY-PLANTER**: footprint [-3, 53, 5, 2.4], base 3, height 1.25. Low refuge on wider west approach.
- **ORANGERY-TRELLIS**: footprint [15, 58, 3, 4], base 3, height 2.4. Tall screen makes the music-room arrival require an offset.
- **MUSIC-PIANO**: footprint [7, 74, 4, 3], base 3, height 1.25. Preparation and low refuge in the new west wing.
- **MUSIC-CABINET**: footprint [15, 80, 3, 4], base 3, height 2.7. Tall screen splits north gallery and A west arrivals.
- **CELLAR-BARRELS**: footprint [105, 59, 4, 8], base 0, height 2.7. Tall rack splits south/east route and B approach.
- **CELLAR-LOW-RACK**: footprint [116, 68, 5, 1.4], base 0, height 1.25. Low refuge on the long east wing.
- **CELLAR-WINE-RACK**: footprint [100, 74, 6, 3], base 0, height 2.7. Interrupts north cellar stair to B east view.
- **PUMP-MACHINE**: footprint [110, 34, 4, 4], base 0, height 2.7. Separates pump-house entry and wine approach.
- **FOYER-SCREEN**: footprint [51, 38, 11, 2], base 3, height 3.4. Blocks the complete front-stair to hall-arch optical channel; west aisle 3 m, east aisle 2 m.
- **ROCK-SPINE**: footprint [34, 40, 4, 20], base -0.4, height 11.4. Separates cliff garden from hall; no windows or traversal.
- **LIBRARY-CORE**: footprint [56, 64, 12, 12], base -0.4, height 13.4. Reduced solid reading pavilion inside a playable library loop.
- **HALL-FIREPLACE**: footprint [47, 46, 4, 5], base 3, height 2.7. Tall central double-sided hearth splits hall views; 9 m passing width east.
- **A-SCULPTURE**: footprint [33, 66, 4, 4], base 3, height 2.5. Tall sculpture plinth separates salon entry views; flank costs movement.
- **A-CREDENZA**: footprint [27, 72, 4, 1.3], base 3, height 1.25. Crouched refuge against the garden entry; library east and music west can flank it.
- **A-PIANO**: footprint [40, 64, 3, 1.5], base 3, height 1.25. Low salon repositioning east of sculpture; library/music side exposure remains.
- **GARDEN-HEDGE**: footprint [26, 52, 3, 4], base 3, height 2.4. Tall planter screens direct garden-to-salon preview.
- **GARDEN-BENCH**: footprint [14, 46, 4, 1.4], base 3, height 1.25. Low refuge beyond garden stair crest, side exposure remains.
- **B-CISTERN**: footprint [85, 53, 4, 5], base 0, height 2.7. Tall cistern divides central plant views; west/south entry apron is exposed.
- **B-CHEST**: footprint [80, 59, 3, 1.4], base 0, height 1.25. Low same-level refuge; elevated stair sees over it.
- **B-FILTER**: footprint [91, 47, 3, 1.5], base 0, height 1.25. Low drain-side entry preparation.
- **ROAD-VAN**: footprint [64, 18, 4, 4], base 0, height 2.7. Tall equipment van separates spawn exits.
- **ROAD-RETAINING**: footprint [36, 23, 8, 2], base 0, height 1.25. Low intermediate refuge on west road; north side hill.
- **CT-SCREEN**: footprint [58, 80, 5, 3], base 3, height 2.7. Court screen partitions exits; earned A north control exposes parts of court.

Five native reversible stairways each rise3m with20 horizontal0.15mrisers, filled underside and tall cheeks. Garden/Vault/Cellar flights are12m long×8m wide; Front8×6; Service10×6. Roofs and scenery are not claimed playable.

Arch crowns4.2m above local floor; width/door spans are explicit in layout.json. A south garden,west music,east library,north staff; B west service,south drain,east cellar,north vault stair. Retired Hall→A south archX39–44 is sealed. MUSIC-NORTH starts atX6 with absolute doorX8–14. Exterior caps are flush with0.5m walls. No off-mesh links or extra seeds.

Terrain and pines outside the complete boundary walls are visible, noncollidable, nonplayable scenic geometry. Render/collision/navigation remain distinct. The small library gable lies only over the retained12×12m core; the surrounding ring is a real playable room.

Built r09 support: lower slabs are0.35m thick; all+3 floors are3.35m filled podiums down toZ-.35 (not suspended0.35m plates). The library east wall runs fromZ-.45 to10, sealing its foot beside the old vault stair; this keeps its reviewed top and prevents a0.05m overhanging shoulder from catching the unchanged body. The delivered r09 source and all current capture/walk/stance evidence share SHA256 d7bf3349943fbda2fbeef4fcc519b4adf8feb359d3c9da186161bcdbe599de24.
