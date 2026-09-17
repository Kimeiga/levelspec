# Dust II — complete visual layout review

Reviewed and implementation status updated 16 September 2026.

This report records the original visual findings and their subsequent authored corrections: floor connections, dividing walls, stair direction, stair proportions, and A/Goose elevation. The original review used online CS2 screenshots and renders of compiled geometry; it did not edit geometry. The implementation described below is now in the generator. Final render comparison and strict compiler/navigation verification are pending, so “implemented” does not yet mean visually accepted. Historical images and mesh measurements remain evidence of the reviewed revision, not the latest map.

[Open latest refinement comparisons](/Users/tomokif/code/levelspec/generated/dust2-refinement/index.html) · [Open historical side-by-side visual comparisons](/Users/tomokif/code/levelspec/generated/dust2-critique-2026-09-16/index.html) · [Live report preview](http://127.0.0.1:8766/)

## Findings at a glance

All seven review items have authored corrections or a resolved reference interpretation. The entries below distinguish the original defect from the implemented geometry; verification of the latest build is still pending.

| Original priority | Location | Implemented resolution | Status |
| --- | --- | --- | --- |
| High | CT Mid / B approach | B approach reaches Z0 at radar X444; CT Mid stays level | Implemented; verification pending |
| High | B Doors / Window | 4.5 m divider with distinct door and raised window openings | Implemented; verification pending |
| High | B tunnel threshold | B courtyard Z1.46 climbs three steps into tunnel Z2 | Implemented; verification pending |
| Medium | A Short stairs | Twelve steps climb 2 m to the connected A/Short plateau | Implemented; verification pending |
| Medium | Mid incline | Narrow sixteen-step side flight beside the central ramp | Implemented; verification pending |
| Lower | Pit Plat stairs | Eight steps rise south from Long Z2 to Pit Plat Z3.2 | Implemented; verification pending |
| Recheck | A / Goose / Long ramp | Coordinate evidence resolves Goose above A; Long connects to the higher north landing | Reference direction resolved; latest geometry verification pending |

The following finding text and linked images describe the **pre-correction review** unless marked “Implemented.” Dimensions in the implementation notes are authored blockout values, not surveyed CS2 measurements.

## 1. CT Mid meets the B approach with an abrupt sloping lip

**Implemented:** `b_approach` now slopes from Z1.46 at radar X267 to Z0 at X444, and `ct_mid` is flat at Z0. Ending the incline before the CT passage removes the previously authored sloping lip. Verify the compiled join and both approach views in the latest refinement comparison.

**Confirmed in the sampled mesh.** Just beyond Mid Doors, the flat CT Mid floor meets the side of the rising B approach. The join is not smooth: its vertical lip tapers across the passage. The immediate Mid Door floor remains level; the break is farther toward B.

Sampled historical mesh across radar Y328: X450 jumps from Z0 to Z0.456 m; X460 to 0.342 m; X475 to 0.171 m. Maximum at X444 is about 0.524 m. Geometry revision cf0203aa1c31e617de2a089d2c882fb40aad9ec282068fd3037f22b4cd408042.

Adjustment: Blend the B approach into CT Mid using a shared floor profile. Avoid ending the sloping patch against an unrelated flat patch. Recheck the join from Mid Doors and from B.

Source: `tools/vector-dust2.py: b_approach and ct_mid`. [Reference image](https://storage.ghost.io/c/b8/b8/b8b826c7-272b-46e7-b30d-6ad6d0b36223/content/images/2025/08/9-4.webp).

**Visual acceptance:** From Mid Doors and from B, inspect the floor at standing eye height and a low grazing angle. It should form a continuous surface across the join, without the current wedge-shaped vertical face.

[Model evidence](/Users/tomokif/code/levelspec/generated/dust2-critique-2026-09-16/ct-mid-join.svg).

## 2. B is missing its tall Doors / Window dividing wall

**Implemented:** `wall.b_divider` runs along radar X267, Y118–255, with 4.5 m wall height and 0.5 m thickness. The raised Window occupies Y126–148 (2.2 m width), with a 0.9 m sill and 3 m head above the B floor. Doors occupy Y214–252 (3.8 m width), with a 3.2 m head. These are provisional architectural dimensions. The historical edge ID below is revision-specific; the stable authored wall ID is the current reference.

**Clear mismatch.** The B courtyard flows directly into the CT approach. The reference has a substantial wall, a door opening and a separate raised Window opening. This is the strongest wall-height discrepancy: the dividing wall is effectively zero height in the blockout.

The reviewed B/east boundary is open for 13.7 m. The short wall farther north does not divide these spaces.

Adjustment: Restore the wall mass first, then cut Doors and the elevated Window into it. Match the sill and wall silhouette from both sides.

Source: `reference/dust2/walls.json; examples/dust2.level.svgx, edge e282`. [Reference image](https://storage.ghost.io/c/b8/b8/b8b826c7-272b-46e7-b30d-6ad6d0b36223/content/images/2025/08/8-5.webp).

**Visual acceptance:** From the B courtyard and CT side, verify that the wall separates the spaces and that Doors and Window read as distinct openings. Check the elevated Window sill and the wall silhouette against both reference views.

[Model evidence](/Users/tomokif/code/levelspec/generated/dust2-critique-2026-09-16/b-overview.png).

## 3. Tunnel-threshold steps are reversed; Dog/Close should stay flat

**Implemented:** B courtyard and Dog/Close are Z1.46; the tunnel stays Z2.00. Three 0.18 m risers climb into the tunnel over a 1.8 m doorway flight. The B approach was adjusted with the courtyard, preserving the tunnel floor and flat pocket. See the [focused threshold report](/Users/tomokif/code/levelspec/docs/dust2-b-tunnel-stairs-report.md).

**Clear mismatch.** Dog/Close is the flat pocket beside the tunnel exit. The short flight visible in the reference belongs at the tunnel mouth, not across that pocket. Look at the tunnel entrance on the right: its threshold is above the B courtyard. In the model view from inside the tunnel, the stairs climb toward B instead of descending out to the courtyard.

Reviewed heights: tunnel 2.00 m → B courtyard 2.54 m. The reference establishes the opposite direction; its exact rise is not measured.

Adjustment: **From B site, the steps must go UP into the tunnel.** From the tunnel, they must go DOWN into B. Keep Dog/Close flat and confine the flight to the doorway. Correct the adjacent floor elevations with the stairs so neither landing acquires a lip. The reference does not support adding a separate Dog/Close staircase.

Source: `tools/vector-dust2.py: b_exit_stairs, b_tunnel, b_site`. [Reference image](https://storage.ghost.io/c/b8/b8/b8b826c7-272b-46e7-b30d-6ad6d0b36223/content/images/2025/08/8-5.webp).

**Visual acceptance:** Capture the doorway from both sides: risers should face a player entering from B, both landings should meet their floors, and the adjacent Dog/Close pocket should remain flat.

[Model evidence](/Users/tomokif/code/levelspec/generated/dust2-critique-2026-09-16/b-exit-from-tunnel.png).

## 4. Short stairs look too shallow, with oversized treads

**Implemented:** Catwalk and ordinary Long remain at Z2. The connected Short bridge, site connection, and A platform move together to Z4. The flight rises 2 m over 4 m in twelve risers (approximately 0.167 m rise and 0.333 m tread). The CT floor remains Z0, leaving 3.8 m beneath the 0.2 m bridge slab. This preserves lower Short and Long at the same elevation, supported by the coordinate evidence below; the absolute heights remain blockout estimates.

**Strong visual mismatch.** The model has six broad steps and a low overall rise. The reference flight is visibly denser, with roughly a dozen steps, and reads as a steeper climb.

Model: 1.00 m rise over 4.00 m run, six risers, about 0.67 m tread depth. Reference step count is a visual estimate, not a survey.

Adjustment: Rework the rise/run and tread rhythm together. Check the landing against the A platform and CT underpass before choosing final heights.

Source: `tools/vector-dust2.py: a_short_stairs`. [Reference image](https://storage.ghost.io/c/b8/b8/b8b826c7-272b-46e7-b30d-6ad6d0b36223/content/images/2025/08/12-2.webp).

**Visual acceptance:** Compare the stair silhouette, number of visible treads, and overall rise from the foot of the flight. Check the upper landing against A and the CT space beneath it; changing stair height alone is insufficient.

[Model evidence](/Users/tomokif/code/levelspec/generated/dust2-critique-2026-09-16/short-stairs.png).

## 5. Mid is a featureless wedge where the reference has a stepped edge

**Implemented:** A 1.4 m side strip at radar X490–504, Y485–545 rises 2 m in sixteen 0.125 m risers, with 0.375 m treads. A central ramp shares the 6 m run, with level lower and upper ends. Inspect both ends and the wall-side silhouette; this replaces the original full-length smooth wedge.

**Clear missing shape.** The uphill Mid reference has a staircase along the Catwalk-side wall. The model replaces the entire width with one smooth incline, losing the characteristic stepped edge.

Model: one 2.00 m rise over 17.90 m. This establishes its current profile; the images do not establish an exact replacement angle.

Adjustment: Keep the central incline, add the narrow side flight, and match where its upper and lower ends meet the street.

Source: `tools/vector-dust2.py: mid, lower_mid`. [Reference image](https://storage.ghost.io/c/b8/b8/b8b826c7-272b-46e7-b30d-6ad6d0b36223/content/images/2025/08/10-3.webp).

**Visual acceptance:** View uphill from Lower Mid and downhill from Top Mid. The narrow stair strip should follow the wall, sit beside the main incline, and meet the street at both ends without an extra lip.

[Model evidence](/Users/tomokif/code/levelspec/generated/dust2-critique-2026-09-16/mid.png).

## 6. Pit Plat steps also appear too shallow

**Implemented, including a correction to the original interpretation:** Pit Plat is **above** Long. The flight now rises south from Long Z2 to Pit Plat Z3.2 over 3.2 m, using eight 0.15 m risers and 0.4 m treads. The central Pit stays at Z0.2. Same-provider CS2 setup coordinates corroborate the elevation ordering; the earlier phrase “dropping toward Pit Plat” below was a mistaken perspective inference and is retained only as historical evidence.

**Likely; check a closer view.** The reference shows a denser flight dropping toward Pit Plat. The model uses just four unusually deep treads, repeating the flattened stair proportions seen at Short.

Model: 0.60 m rise over 3.20 m run, four risers and about 0.80 m tread depth. The reference supports the visual concern, but not an exact target height.

Adjustment: Check the flight from both landings; adjust its rise/run after confirming Pit Plat versus Long elevation. Preserve the central Pit depression.

Source: `tools/vector-dust2.py: pit_stairs, pit_platform`. [Reference image](https://storage.ghost.io/c/b8/b8/b8b826c7-272b-46e7-b30d-6ad6d0b36223/content/images/2025/08/2-4.webp).

**Visual acceptance:** Obtain a closer image of the flight from each landing before choosing a new height. Check step rhythm and the relationship among Long, Pit Plat, and the lower central Pit.

[Model evidence](/Users/tomokif/code/levelspec/generated/dust2-critique-2026-09-16/pit-stairs.png).

## 7. A / Goose / Long ramp — direction resolved with coordinate evidence

**Implemented:** A and the connected Short platform are now Z4.00; Goose is Z4.54. Three shallow 0.18 m risers descend **south from Goose onto A**, as the user described. Long rises north from Cross Z2 at radar Y220 to the Goose landing Z4.54 at Y110. The connected plateau moved upward with the Short-stair correction; this is not a reversal of the confirmed Goose/A ordering.

The first comparison interpreted the oblique reference as placing Goose below A Default. The reviewed blockout then had Goose Z3.54 and A Z3.00; an intermediate export lowered Goose to Z2.46 before the higher Goose elevation was restored. That history explains the conflicting earlier status, but the initial visual inference is superseded by same-provider setup coordinates: [Goose Z192.253](https://cs2nades.gg/en/map/dust2/molotov/goose-to-short) versus [A Site Z161.09](https://cs2nades.gg/en/map/dust2/smoke/a-site-to-long-2). Goose is approximately 31 game units higher at these positions.

The direction is resolved; the 0.54 m rise, three risers, and exact road profile remain blockout estimates. Final acceptance still requires a close view across the steps and a section through A, Goose, and Long, confirming their actual compiled contacts.

[Online A-site reference](https://storage.ghost.io/c/b8/b8/b8b826c7-272b-46e7-b30d-6ad6d0b36223/content/images/2025/08/1-4.webp) · [Historical model comparison](/Users/tomokif/code/levelspec/generated/dust2-critique-2026-09-16/a-goose.png).

Authoring: `a_north_stairs`, `a_back_platform`, `a_goose_side`, `a_site`, and `long_height` in [vector-dust2.py](/Users/tomokif/code/levelspec/tools/vector-dust2.py).

## Coordinate evidence for Short and Pit

These CS2Util setup commands were checked on 16 September 2026. Comparing positions from the same provider is useful for relative height; the commands are player setup positions, not surveyed floor vertices. The indicated setup precedes any jump throw.

| Setup | Command Z, game units | Observation |
| --- | ---: | --- |
| [Lower Short](https://www.cs2util.com/dust2/smoke/a-site-smoke-from-a-short) | 64.076363 | Approximately level with ordinary Long |
| [Upper Short](https://www.cs2util.com/dust2/molotov/goose-molotov) | 160.031250 | About 96 units above lower Short |
| [Long](https://www.cs2util.com/dust2/molotov/default-molotov-from-long) | 64.696663 | Lower landing comparison for Pit Plat |
| [Pit Plat](https://www.cs2util.com/dust2/molotov/a-site-elevator-plat-molotov-from-pit) | 119.822784 | About 55 units above Long |

The inspected Short image shows approximately twelve steps. The Long/Pit image shows the straight eastern flight leading to a raised platform extending south. Together with the coordinates, these observations support the corrected directions and denser flights. They do not establish a uniform conversion from game units to metres, exact riser counts, or the complete floor profiles between setup points.

## Remaining acceptance

The original recommendation was to fix the adjoining CT/B floors, threshold, and divider together, then Short and Mid, and finally resolve A/Goose and Pit against closer evidence. Those changes are now authored. The [latest refinement comparisons](/Users/tomokif/code/levelspec/generated/dust2-refinement/index.html) are the target for current render evidence; the older comparison page remains historical.

Final checks are pending: strict compilation and navigation, local routes through each changed flight and B Doors, and renders from both sides of the affected passages. Compare stair silhouettes, landing continuity, wall openings, and bridge clearance on the actual geometry with normal wall visibility. A matching overhead footprint is insufficient evidence of a smooth floor connection. No final pass count, geometry hash, or visual acceptance is claimed here until those checks complete.

## Reference authority and limits

The main [CS2 screenshot collection](https://skinrave.gg/en/blog/all-cs2-dust-2-map-callouts) is dated September 2025. It supports visible architecture and relative elevation, but does not establish every subsequent map revision. [Valve’s CS2 CT-ramp image](https://cdn.akamai.steamstatic.com/apps/csgo/images/csgo_react/cs2/maps/dust2_ct_ramp_s2.jpg) was also inspected. [Downloaded image provenance](/Users/tomokif/code/levelspec/generated/dust2-critique-2026-09-16/references/sources.json) records the original URLs.

Model dimensions in this report are measurements or authored values, not surveyed CS2 dimensions. The project uses a provisional 0.1 metres per radar pixel. Step counts in reference images are visual estimates. The comparisons do not prove an exact replacement angle or that CT’s ramp ends a particular number of metres too early. No broad claim that all map walls are too tall or too short is made; the B divider is the demonstrated wall omission.

Clay renders hide optional ceilings for inspection. Missing roofs in those images are not findings. Existing floor, stair, retaining, and wall triangles remain visible. Cameras are illustrative rather than exact photogrammetric matches.

## Evidence revisions

The workspace changed during review, so the images and measurements refer to named revisions rather than a single immutable current build:

- Initial overview, Short, Mid, and B renders: `f8e3471927a84d4dc75b1630ce8f5d37c9ffcc2ef0e93e903d10beae78e529dd`.
- Saved intermediate runtime: `7b40434ad966b15014c2a6866884aa6ce4654899c4dbb67d8f55fadcde982e83`.
- Sampled CT Mid floor discontinuity: `cf0203aa1c31e617de2a089d2c882fb40aad9ec282068fd3037f22b4cd408042`.

[Render cameras and initial revision](/Users/tomokif/code/levelspec/generated/dust2-critique-2026-09-16/render-manifest.json) · [Detail render revision](/Users/tomokif/code/levelspec/generated/dust2-critique-2026-09-16/detail-render-manifest.json) · [Saved source snapshot](/Users/tomokif/code/levelspec/generated/dust2-critique-2026-09-16/reviewed/dust2.level.svgx).
