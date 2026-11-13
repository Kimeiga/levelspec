# Spillway R08 — source-linked inventory

All units meters,Z-up. Native source is level.aml. Visibility/collision/navigation are distinct. Opaque static shapes are compiled; weapon penetration, destruction, utility and actual target-engine crouch/fall behavior remain unverified.

## Low and central combat features

| ID | XY and baseZ | Width×depth×height | Role |
|---|---|---|---|
| A-01 | 14 74 0 | 4×3×2.6 | Central plant shield; rear/side pressure removes protection |
| A-02 | 18 80 0 | 3×2×1.1 | Low rear hold; raised plant eyes see over it |
| B-01 | 80 72 0 | 4×3×2.6 | Central plant shield; East view requires a peek |
| B-03 | 72 78 0 | 3×2×1.1 | Low hold near rear/short interface; standing exposure remains |
| W-L01 | 7 30 0 | 2×2×1.1 | West preparation stop |
| W-L02 | 18 58 0 | 3×2×1.1 | Forecourt preparation/crossing stop |
| E-L01 | 82.2 44 1.2 | 2.4×2×1.1 | Low crest cover, based on raised plateau |
| E-L02 | 87 54 0 | 2×2×1.1 | East approach repositioning stop |
| M-L01 | 36.2 34 0 | 3.4×2×1.1 | Splitter preparation beside building wing |
| M-L02 | 50 69 0 | 3×2×1.1 | Mid-to-short repositioning stop |
| A-L01 | 12 68 0 | 3×2×1.1 | Gate/stair preparation cover |
| B-L01 | 74 67 0 | 3×1.3×1.1 | B gate/short take and retake support |
| U-C01 | 40.2 66 4 | 1.8×3×1.25 | Directional low refuge on west gallery leg; rear/end threats remain |
| U-C02 | 53 73 4 | 3×1.8×1.25 | Directional low refuge at north gallery wall; standing peek stays visible |
| U-C03 | 65 65 4 | 1.8×3×1.25 | Directional low refuge on east gallery leg; rear coverage required |

## Architecture and levels

| ID | Footprint/profile | Base/top or transition |
|---|---|---|
| BLD-0-0 | [(44.0, 78.0), (44.0, 82.0), (36.0, 82.0), (36.0, 78.0)] | -.30 → 8 |
| BLD-1-0 | [(40.0, 44.0), (36.0, 44.0), (36.0, 57.6), (40.0, 57.6)] | -.30 → 9 |
| BLD-1-1 | [(36.0, 72.0), (40.0, 72.0), (40.0, 64.4), (36.0, 64.4)] | -.30 → 9 |
| BLD-2-0 | [(82.0, 38.0), (60.0, 38.0), (60.0, 44.0), (56.0, 44.0), (56.0, 57.6), (82.0, 57.6)] | -.30 → 9 |
| BLD-2-1 | [(61.0, 64.4), (61.0, 68.0), (56.0, 68.0), (56.0, 64.4)] | -.30 → 9 |
| BLD-2-2 | [(70.0, 64.4), (70.0, 68.0), (67.0, 68.0), (67.0, 64.4)] | -.30 → 9 |
| BLD-3-0 | [(56.0, 28.0), (56.0, 22.0), (82.0, 22.0), (82.0, 30.0), (60.0, 30.0), (60.0, 28.0)] | -.30 → 8 |
| BLD-4-0 | [(40.0, 22.0), (40.0, 28.0), (36.0, 28.0), (36.0, 36.0), (30.0, 36.0), (30.0, 38.0), (24.0, 38.0), (24.0, 48.0), (14.0, 48.0), (14.0, 30.0), (28.0, 30.0), (28.0, 22.0)] | -.30 → 9 |
| BLD-5-0 | [(70.0, 75.4), (56.0, 75.4), (56.0, 78.0), (52.0, 78.0), (52.0, 82.0), (70.0, 82.0), (70.0, 78.0)] | -.30 → 8 |
| BLD-T | [(50.0, 12.0), (50.0, 22.0), (46.0, 22.0), (46.0, 12.0)] | -.30 → 7 |
| W-03 | [(14.0, 34.0), (14.0, 37.0), (10.0, 37.0), (10.0, 34.0)] | -.30 → 9 |
| W-01 | [(10.5, 40.0), (10.5, 46.0), (6.0, 46.0), (6.0, 40.0)] | -.30 → 8 |
| W-02 | [(24.0, 48.0), (24.0, 56.0), (14.0, 56.0), (14.0, 48.0)] | -.30 → 9 |
| E-01 | [(86.5, 34.0), (86.5, 39.0), (82.0, 39.0), (82.0, 34.0)] | -.30 → 9 |
| E-02 | [(90.0, 48.0), (90.0, 53.0), (86.0, 53.0), (86.0, 48.0)] | -.30 → 8 |
| B-02 | [(90.0, 68.0), (90.0, 73.0), (86.0, 73.0), (86.0, 68.0)] | -.30 → 8 |
| B-04 | [(90.0, 78.0), (90.0, 84.0), (84.0, 84.0), (84.0, 78.0)] | -.30 → 8 |
| CT-02 | [(40.0, 82.0), (40.0, 86.0), (34.0, 86.0), (34.0, 82.0)] | -.30 → 8 |
| CT-03 | [(66.0, 85.0), (66.0, 90.0), (60.0, 90.0), (60.0, 85.0)] | -.30 → 8 |
| T-02 | [(38.0, 12.0), (38.0, 18.0), (32.0, 18.0), (32.0, 12.0)] | -.30 → 7 |
| T-03 | [(70.0, 17.0), (70.0, 22.0), (64.0, 22.0), (64.0, 17.0)] | -.30 → 8 |
| BLD-LW | [(42.0, 28.0), (42.0, 34.0), (36.0, 34.0), (36.0, 28.0)] | -.30 → 9 |
| BLD-LE | [(54.0, 28.0), (60.0, 28.0), (60.0, 34.0), (57.0, 34.0), (54.0, 31.0)] | -.30 → 8 |
| BLD-AW | [(14.0, 70.0), (6.0, 70.0), (6.0, 86.0), (14.0, 86.0), (18.0, 86.0), (18.0, 80.0), (14.0, 80.0)] | -.30 → 8 |
| EL-return | [(60.0, 30.0), (68.0, 30.0), (68.0, 35.0), (60.0, 35.0)] | -.30 → 8 |
| EL-north-return | [(72.0, 33.0), (76.0, 33.0), (76.0, 38.0), (72.0, 38.0)] | -.30 → 9 |
| ground | ground-footprint | elevation profile/path; thickness .30; width profile |
| bridge | bridge-footprint | elevation 4; thickness .30; width profile |
| west-landing | west-landing-footprint | elevation 4; thickness .30; width profile |
| A-dais | A-dais-footprint | elevation .6; thickness .9; width profile |
| E-crest | E-crest-footprint | elevation 1.2; thickness 1.5; width profile |
| S-01 | S-01-axis | elevation profile/path; thickness .30; width 4 |
| S-02 | S-02-axis | elevation profile/path; thickness .30; width 4 |
| A-south-stairs | A-south-stairs-axis | elevation profile/path; thickness .3; width 6 |
| A-north-stairs | A-north-stairs-axis | elevation profile/path; thickness .3; width 6 |
| R-01 | R-01-axis | elevation profile/path; thickness .30; width 6 |
| E-rise | E-rise-axis | elevation profile/path; thickness .3; width 8 |
| E-fall | E-fall-axis | elevation profile/path; thickness .3; width 8 |

T-01/T-04 are7m vestibule returns. U-LB is the attached upper-landing service wall with near faceX24.2. Boundary IDs are in boundary-map.md; upper guard paths are in upper-boundary-map.md. P01 supports the west span; P02 moved beneath the east leg; round P03/P04 support the turns.

Retired/replaced objects: A-03/A-04 are absorbed into A-West building mass. U-B01/U-B02 were removed when the gallery floor itself became a dogleg. Former U-N/SW/SE/W/V/LN/LS screens were replaced by upper-guard boundary walls. W/E/CT/T return IDs now identify attached architectural wings rather than freestanding combat boxes.

D01 takeoff(48.5,69.5,4) and landing(48.5,67.5,0) define an open three-meter edge. Ordinary return routes remain; no artificial drop/off-mesh link was added. The A north stair source axis points upward for compatible floor-gap auditing while preserving its physical three-tread shape. East fill tops sit.15m below walking planes, overlapping native ramp thickness without taking ownership of exposed walking faces. R01 has a.5m flat collar before descent; its floor/guard interfaces physically overlap.
