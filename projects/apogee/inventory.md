# L01 obstacle and interface inventory

Domain meters; +Y north; Z up. Each ID is the exact AML object/assembly ID. Floors floor-01..floor-26 map to numbered spaces. P01..P37 are physical thresholds, not windows. All ordinary connections bidirectional.

|ID|XY size / base Z / height|Purpose|
|---|---|---|
|IT-S1|(42,20) 4×6 / 0 / 3.2|Intake dogleg|
|SV-L1|(18,24) 5×1.2 / 0 / 1.25|Service preparation|
|RM-L1|(5,52) 3×2 / 4 / 1.25|Rim refuge|
|AA-L1|(18,55) 2×2 / 4 / 1.25|A airlock preparation|
|OP-S1|(31,53) 2×3 / 4 / 2.8|Spectrometer screen|
|OP-L1|(38,55) 2×2 / 4 / 1.25|Optics duck refuge|
|A-TEL|(23,72) 6×6 / 4 / 5|Telescope and pier|
|A-L1|(15,73) 5×2 / 4 / 1.25|West instrument bench|
|A-L2|(30,83) 4×2 / 4 / 1.25|Rear service bench|
|A-L3|(25,65) 3×2 / 4 / 1.25|Front bench|
|A-S1|(36,74) 3×2 / 4 / 2.6|Electronics rack|
|MD-S1|(47,38) 3×6 / 0 / 3.2|Calibration screen|
|MD-L1|(40,39) 4×2 / 0 / 1.25|Mid repositioning|
|CL-S1|(68,33) 2×7 / 0 / 2.8|Cleanroom instrument island|
|CL-L1|(73,44) 3×2 / 0 / 1.25|B approach prep|
|EQ-S1|(68,17) 5×3 / 0 / 2.8|Shipping instruments|
|SN-L1|(85,25) 5×2 / 0 / 1.25|Snow crossing 1|
|SN-L2|(94,32) 3×2 / 0 / 1.25|Snow crossing 2|
|BA-L1|(79,44) 3×2 / 0 / 1.25|B airlock preparation|
|B-CRYO|(88,54) 4×6 / 0 / 3.2|Cryogenic chamber|
|B-L1|(81,61) 3×2 / 0 / 1.25|West site refuge|
|B-L2|(96,48) 4×2 / 0 / 1.25|Front site refuge|
|B-L3|(96,63) 3×2 / 0 / 1.25|Rear site refuge|
|DA-S1|(64,56) 3×5 / 0 / 3|Server spine|
|DA-L1|(71,62) 4×2 / 0 / 1.25|Data support bench|
|TR-S1|(46,64) 4×4 / 0 / 2.8|Transit offset baffle|
|TR-L1|(53,73) 3×2 / 0 / 1.25|Underpass preparation|
|AR-L1|(60,70) 4×2 / 0 / 1.25|Archive refuge|
|SK-L1|(49,78.18) 3×1.5 / 4 / 1.25|Bridge refuge 1|
|SK-L2|(57,82.32) 3×1.5 / 4 / 1.25|Bridge refuge 2|
|AC-S1|(33,95) 2×4 / 4 / 3.2|Control partition|
|CT-S1|(55,92) 4×3 / 4 / 3.2|Spawn sight screen|
|BC-L1|(86,74) 4×2 / 0 / 1.25|B control refuge|
|DC-S1|(96,77) 3×4 / 0 / 2.8|Decon machinery|

Low objects predict crouch-eye occlusion from same-level opponents; sides and elevated enemies can expose occupants. Tall machines shape views and allow movement on either side; they do not establish bullet resistance. All are visible/static/collidable solids. Penetration, grenades and destructibility are target-engine questions. Roof scenery is inaccessible and does not create routes. Bridge south screen is +2.8m, lower lab enclosures+6.4m; upper eye5.86m cannot see over these tops.

## Physical thresholds

- P01: spaces [1, 2], line [38, 10, 38, 14], base Z=0.
- P02: spaces [1, 13], line [44, 14, 49, 14], base Z=0.
- P03: spaces [1, 16], line [62, 10, 62, 14], base Z=0.
- P04: spaces [2, 3], line [30, 17, 30, 21], base Z=0.
- P05: spaces [2, 13], line [38, 17, 38, 21], base Z=0.
- P06: spaces [3, 4], line [11, 32, 15, 32], base Z=0.
- P07: spaces [4, 5], line [11, 48, 15, 48], base Z=4.
- P08: spaces [5, 6], line [16, 51, 16, 55], base Z=4.
- P09: spaces [6, 7], line [26, 50, 26, 54], base Z=4.
- P10: spaces [6, 8], line [21, 60, 25, 60], base Z=4.
- P11: spaces [7, 8], line [28, 60, 32, 60], base Z=4.
- P12: spaces [7, 15], line [33, 48, 37, 48], base Z=4.
- P13: spaces [8, 9], line [24, 92, 28, 92], base Z=4.
- P14: spaces [8, 12], line [42, 78, 42, 82], base Z=4.
- P15: spaces [9, 10], line [44, 94, 44, 99], base Z=4.
- P16: spaces [10, 11], line [62, 90, 67, 90], base Z=4.
- P17: spaces [10, 25], line [69, 90, 73, 90], base Z=4.
- P18: spaces [11, 12], line [62, 84, 67, 84], base Z=4.
- P19: spaces [13, 14], line [40, 32, 44, 32], base Z=0.
- P20: spaces [14, 15], line [38, 32, 38, 36], base Z=0.
- P21: spaces [14, 18], line [62, 33, 62, 37], base Z=0.
- P22: spaces [14, 21], line [48, 50, 53, 50], base Z=0.
- P23: spaces [16, 17], line [80, 20, 80, 24], base Z=0.
- P24: spaces [16, 18], line [67, 26, 72, 26], base Z=0.
- P25: spaces [17, 19], line [84, 38, 88, 38], base Z=0.
- P26: spaces [18, 19], line [78, 39, 78, 43], base Z=0.
- P27: spaces [18, 22], line [65, 50, 71, 50], base Z=0.
- P28: spaces [19, 20], line [82, 48, 87, 48], base Z=0.
- P29: spaces [20, 22], line [78, 54, 78, 59], base Z=0.
- P30: spaces [20, 24], line [80, 68, 85, 68], base Z=0.
- P31: spaces [20, 26], line [96, 68, 101, 68], base Z=0.
- P32: spaces [21, 22], line [58, 54, 58, 59], base Z=0.
- P33: spaces [21, 23], line [58, 78, 58, 82], base Z=0.
- P34: spaces [22, 23], line [64, 68, 69, 68], base Z=0.
- P35: spaces [23, 24], line [78, 69, 78, 73], base Z=0.
- P36: spaces [23, 25], line [69, 74, 73, 74], base Z=0.
- P37: spaces [24, 26], line [92, 71, 92, 75], base Z=0.

At the Skybridge crossing (x42..68/y78..84), cap lower walls to Z3.65 and assemble the upper slab/enclosure separately. Ordinary lab wall height6.4 applies outside that footprint. No lower wall may continue through upper walking volume.

Upper bridge: south and east enclosure2.8m (top6.8); north x42..60 guard1.35m toward inaccessible ravine; north x60..68 wall2.8m with P18 exit. CT descent both sides2.8m above guide. Operations wall top7.2m blocks spawn panorama. No bridge-to-stair observation or movement seam.

L02: P19 shifted to x40..44/y32 to place IT-S1 between Calibration and the T arrival pocket. CT-S1 is local preparation/repositioning, not a universal spawn screen: CT spawn is intentionally exposed after A Control or Archive is infiltrated. No immunity/safe spawn area is promised after territory loss.

L03 trims Optics southeast 4×2m corner at x38..42/y48..50 to avoid overlapping Calibration below. Stair exit/P12 and all cover stay unchanged. This is a shared-boundary clarification; no route added/removed. Telescope barrel envelope reaches approximately x30.3m above the pier; no approach relies on walking under it.

L04 local clearance repair: SK-L1 y78.18 (south wall inner face); SK-L2 y82.32 (north inner face at83.82 minus depth1.5). Main bridge passage stays ≥4m. CT stair west/left enclosure moves offset−.30m (east/inward) relative to northward71,74→71,90 path. West outer floor edge68; wall guide68.30, intended inner face68.45; stair centerline/doors unchanged, effective width about5.25m. Protects shoulders from neighboring upper floor slab. Inspect exact compiled side/coverage before accepting.

A-TEL compiled envelope: pier radius2.7 and height2.4m; tilted barrel reaches approximately Z12.8 (8.8m above A floor), with plan extremity aboutx30.3. Original 5m height was a coarse obstacle reservation; actual tall instrument remains within the site central equipment zone and does not introduce a walk-under route.

L05 supersedes guard-only L04 stair offset: actual S-CT flight centerX71.15/width5.70 puts west tread edge68.30 and east74; both enclosures offset0 on true tread edges. Removes outer unsupported shoulder ledge; effective between-wall width about5.1m. P36/P17 stay x69..73. Bridge cover flush repairs retained.

L06 compiled-visibility repair: IT-S1 expands west to x42..46/y20..26 (4×6×3.2m). Broad Mid-to-T offset scan in R05 found64visible eye-height pairs despite blocked center; analytical enlarged screen blocks all64. Full postrepair scan required. Nominal Intake lanes4m west/6m east; effective widths slightly reduced by enclosing wall faces. This supersedes the L02 claim that doorway shift alone closed every spawn view.
