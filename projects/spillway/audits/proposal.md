# R05 LOS layout proposal — pre-3D review

SourceR04 is unchanged during this review. Coordinates meters,Z-up. User requires spawn-area protection, shorter chained encounters, fewer stationary keyholds covering all approaches, and height-aware planned/compiled review. The diagram is a proposed affected-map revision.

| New ID | XY footprint / base | Height |
|---|---|---|
| M-02 | 45..56,60..62 / Z0 | 3.6 |
| W-03 | 10..14,34..37 / Z0 | 4.5 |
| E-02 | 86..90,48..51 / Z0 | 4.5 |
| T-02 | 32..35,12..18 / Z0 | 4.5 |
| T-03 | 66..69,16..22 / Z0 | 4.5 |
| CT-02 | 34..36,82..87 / Z0 | 4.5 |
| CT-03 | 62..64,85..90 / Z0 | 4.5 |
| A-04 | 10..12,76..79 / Z0 | 3.4 |
| B-04 | 84..86,78..82 / Z0 | 3.4 |
| U-B01 | 44..45.5,58.4..61.4 / Z4 | 2.4 |
| U-B02 | 56..57.5,60.6..63.6 / Z4 | 2.4 |
| U-LB | 24.4..31.0,61.8..63.0 / Z4 | 2.4 |
| BLD-0-0 | footprint hole portion, vertices [(44.0, 78.0), (44.0, 82.0), (36.0, 82.0), (36.0, 78.0)] / Z-.30 | top Z8 |
| BLD-1-0 | footprint hole portion, vertices [(40.0, 44.0), (36.0, 44.0), (36.0, 57.6), (40.0, 57.6)] / Z-.30 | top Z9 |
| BLD-1-1 | footprint hole portion, vertices [(36.0, 72.0), (40.0, 72.0), (40.0, 64.4), (36.0, 64.4)] / Z-.30 | top Z9 |
| BLD-2-0 | footprint hole portion, vertices [(82.0, 38.0), (60.0, 38.0), (60.0, 44.0), (56.0, 44.0), (56.0, 57.6), (82.0, 57.6)] / Z-.30 | top Z9 |
| BLD-2-1 | footprint hole portion, vertices [(56.0, 68.0), (70.0, 68.0), (70.0, 64.4), (56.0, 64.4)] / Z-.30 | top Z9 |
| BLD-3-0 | footprint hole portion, vertices [(56.0, 28.0), (56.0, 22.0), (82.0, 22.0), (82.0, 30.0), (60.0, 30.0), (60.0, 28.0)] / Z-.30 | top Z8 |
| BLD-4-0 | footprint hole portion, vertices [(40.0, 22.0), (40.0, 28.0), (36.0, 28.0), (36.0, 36.0), (30.0, 36.0), (30.0, 38.0), (24.0, 38.0), (24.0, 48.0), (14.0, 48.0), (14.0, 30.0), (28.0, 30.0), (28.0, 22.0)] / Z-.30 | top Z9 |
| BLD-5-0 | footprint hole portion, vertices [(70.0, 82.0), (52.0, 82.0), (52.0, 78.0), (56.0, 78.0), (56.0, 74.0), (70.0, 74.0)] / Z-.30 | top Z8 |

Existing adjustments: M-01 width8→7 (x40..47); W-01/E-01 widths4→4.5m. U-V height1→2.4m closes the observation bay. S-01/S-02/R-01 sideguards1.1→2.4m above actual flight guide; endpoints stay open. No floor,spawn,plant,routewidth orbody change proposed. Existing under-bridge route may require a longer bounded assertion because of the intentional new mid dogleg; measure its new path rather than force a direct ray.

Review each section in plan and predicted3D: ground long/diagonal sightlines; fromdeckZ4+eyes1.6/1.05 against8–9m building masses; fromdescending stairs/ramp against siteapproaches; portal-width bearings and bothends ofnewbaffles. Upperbypasses2.2m clear, stairclear3.5m, groundlongbypasses3.3m+ afterboundary/bodyinset. Dimensions are designchoices, not certifiedteamthroughput.

100° flags: only configured feasible entryfrontiers, with visible/occluded/unsupported portions explicit. Transitcorners/spawnprotection are not automaticdefects; keyholds must be judged for objectivecoverage and response. No claims of humanbalance.

## Low cover additions requested by user

Pale green blocks are low cover at1.1m, with standing exposure retained. These are camera/body hypotheses; target-engine crouch/weapon tests remain open.

| ID | XY footprint | BaseZ | Height |
|---|---|---|---|
| W-L01 | 7..9, 30..32 | 0 | 1.1 |
| W-L02 | 18..21, 58..60 | 0 | 1.1 |
| E-L01 | 82.2..84.6, 42..44 | 0 | 1.1 |
| E-L02 | 87..89, 54..56 | 0 | 1.1 |
| M-L01 | 36.2..39.6, 31..33 | 0 | 1.1 |
| M-L02 | 50..53, 69..71 | 0 | 1.1 |
| A-L01 | 21..24, 67..69 | 0 | 1.1 |
| B-L01 | 74..77, 67..68.3 | 0 | 1.1 |
| U-C01 | 48..51, 61.8..63.599999999999994 | 4 | 1.1 |
| U-C02 | 60..63, 58.4..60.199999999999996 | 4 | 1.1 |

W-L01/M-L01 support approach preparation; W-L02/A-L01 support the exposed A forecourt/site transition. E-L01/E-L02 give intermediate stops on the east approach; M-L02 supports mid-to-short repositioning; B-L01 supports a B take/retake at the gate. U-C01/U-C02 alternate after the high bridge baffles, leaving3.4m local passage; the high baffle pinch points remain2.2m. No numerical cover quota or claim that every gap is safe. LongLOS flags are reviewer suggestions, not automaticrejection; retain justified intentionalranges. The revised upper route is protected movement/routecontrol, not a panoramicguardtower.

Spatial review repair: E-L01 and M-L01 are wall-attached, near faces X82.2/X36.2 flush with the actual wall inner faces; their0.4m unusable rear slits are removed. Far edges stay84.6/39.6. No rear-body passage advertised.
