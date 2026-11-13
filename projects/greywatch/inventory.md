# Cover and architectural inventory — r5

All dimensions in meters. Footprints are `(x, y, width, depth)`. Base + height gives top elevation. Every listed ID is the exact native AML object ID. All are opaque, visible, collidable static geometry. Bullet resistance, penetration, destructibility, sounds and grenade interaction remain target-engine unknowns. Low cover top is 1.15 m above its floor: below standing eyes, above crouch eyes by 0.127 m on equal ground; exposure from higher ground and side edges remains to inspect.

| ID | Footprint | Base / height | Role |
| --- | --- | --- | --- |
| T-cart | 20, 18, 3, 1.7 | 0 / 1.15 | South apron preparation; admits a route switch behind the cart. |
| W-bench | 8.25, 33, 2.75, 3 | 0 / 1.15 | Outer-ward duck and reset before the dogleg. |
| W-rubble | 17, 48, 2, 3 | 0 / 1.15 | Ward exit refuge; exposed from court east. |
| M-well | 43, 34, 2.5, 2.5 | 0 / 1.15 | Prepare for underpass; east side remains open. |
| M-chest | 37, 48, 2.5, 1.5 | 0 / 1.15 | Post-underpass reposition toward either site. |
| A-fountain | 17, 63, 4, 4 | 0 / 1.15 | A plant-facing center cover; exposed from upper west landing. |
| A-stone | 29, 63, 2, 3 | 0 / 2.6 | Tall court screen for an east/south entry reset; north exposes it. |
| A-bench | 8.25, 67, 2.75, 4 | 0 / 1.15 | Western post-plant refuge with retreat along outer wall. |
| E-trough | 71, 29, 1.8, 3 | 0 / 1.15 | East dogleg preparation. |
| E-cask | 61, 44, 2, 2 | 0 / 1.15 | Chapel approach refuge after turn; west transfer can expose it. |
| B-sarcophagus | 68, 64, 2, 4 | 0 / 1.15 | B plant cover separated from north door by nave pillars. |
| B-lectern | 55.5, 66, 2, 2 | 0 / 1.15 | West nave duck and retake preparation; central aisle exposes it. |
| B-pier-west | 60, 63, 1.4, 1.4 | 0 / 7 | Roofless nave pillar; no walkable upper floor. |
| B-pier-east | 73, 63, 1.4, 1.4 | 0 / 7 | Second nave pillar breaks diagonal scanning. |
| B-aisle-bench | 82, 57, 2.2, 3 | 0 / 1.15 | Ambulatory staging before the east nave opening; exposed from north. |
| CT-bench | 50, 77, 3, 1.5 | 0 / 1.15 | Cloister retake setup; not protected from both wings. |
| U-WM | 30.5, 38, 1.5, 1.4 | 3 / 3.1 | Upper west sight break; opponent can switch bridge sides. |
| U-EM | 48, 42.6, 1.5, 1.4 | 3 / 3.1 | Upper east sight break at the opposite parapet. |
| U-WR | 34, 38, 2, 1.7 | 3 / 1.15 | Upper bridge preparation against east traffic. |
| U-CR | 40.5, 42.3, 2, 1.7 | 3 / 1.15 | Middle reposition; opposite edge remains exposed. |
| U-ER | 45, 38, 2, 1.7 | 3 / 1.15 | Eastward bridge reset; short uncovered crossing on either side. |

The `U-parapet-north` and `U-parapet-south` wall-walk guards run along y44/y38, x30–52, 0.3 m thick, top 4.15 m. Tall merlons and alternate-edge low refuges interrupt a single lane without closing a 3 m clear passing strip. Ascending stairs have 1.15 m guards; all ordinary access is reversible. Lower bridge piers occupy x30–35 and48–52, y38–44, top2.65; lower mid remains x36–48. Wall IDs and heights are labeled in layout.svg. `KEEP` occupies x34–54,y60–74 and is solid to10m.

| Wall | Endpoints | Height / thickness |
| --- | --- | --- |
| T-inner-screen | (33, 13.5) → (47, 13.5) | 5 / 0.7 |
| T-gate-west | (30, 16) → (38, 16) | 7 / 0.7 |
| T-gate-east | (43, 16) → (50, 16) | 7 / 0.7 |
| T-mid-screen | (35.7, 28) → (42, 28) | 6 / 0.7 |
| W-ward-turn | (8, 42) → (14, 42) | 5 / 0.6 |
| W-court-west | (8, 56) → (12, 56) | 5 / 0.65 |
| W-court-east | (17, 56) → (23.3, 56) | 5 / 0.65 |
| A-cloister-west | (8, 74) → (22, 74) | 5 / 0.7 |
| A-cloister-east | (27, 74) → (34, 74) | 5 / 0.7 |
| M-keep-cheek | (39, 55) → (39, 60) | 8 / 0.8 |
| E-entry-west | (60, 34) → (67, 34) | 6 / 0.65 |
| E-entry-east | (71, 42) → (74, 42) | 6 / 0.65 |
| B-nave-west | (54, 58) → (62, 58) | 8 / 0.8 |
| B-nave-east | (67, 58) → (78, 58) | 8 / 0.8 |
| B-apse-west | (54, 74) → (60, 74) | 7 / 0.75 |
| B-apse-east | (65, 74) → (78, 74) | 7 / 0.75 |
| B-aisle-screen | (78, 56) → (78, 64) | 7 / 0.7 |
| CT-screen | (38, 79) → (46, 79) | 7 / 0.8 |
