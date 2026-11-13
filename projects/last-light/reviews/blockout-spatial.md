# R05 independent spatial, construction and circulation review

Verdict: **accepted within the LevelSpec inspection scope**. No consequential construction or required-route defect found. This acceptance covers the inspected R05 blockout and performed paths/views; it does not establish hero mechanics, competitive balance, complete optical occlusion or continuous swept collision.

Source: `projects/last-light/level.aml`, SHA256 `5ef0fe4181a9adbb54bb70754a8b1139b8c11ef94c1040364f85787812983132`. Independently examined source, the L02 layout, actual browser PNGs and motion records before reading `design.md` or other reviewers' verdicts. The completed `generated/last-light/verified-r05b/capture.json` has the matching source SHA256 and no browser errors. Earlier `verified-r05` was an incomplete run and is not the acceptance manifest.

Evidence examined: both overviews, Court, opposing lofts, both under-loft mouths, both intermediate stair views, both spawn views, opposing point-to-loft views, north/south standing/crouched staging pairs, plus browser walk stills. Motion evidence is `generated/last-light/physical-r05b/routes.json` and the completed browser capture's five walk/posture records. The build result `generated/last-light-build-r05.json` passes with zero diagnostics. All evidence uses radius .40 m, standing height2 m, crouch1.15 m, step.30 m and nav-cell.125 m.

## Plan/model agreement and construction

The actual blockout retains the diagonal anchors, two separate ground approach loops, octagonal court and two local lofts. The compiled shared interfaces remain open. No central overhead bridge or unintended shortcut replaces the L02 organization. The illustrated overview and under-loft views show physical slab thickness, filled stair bodies and positive support at the occupied volumes.

The four .26 m-radius court columns occupy the corners/ends of the promenade mouths. They locally reduce entrance clearance but do not eliminate the widened 6 m contacts; the matching ground-route samples pass. The small rear loft piers are under the rear edge and leave the intended front ground corridors open. Actual point-to-loft views show those supports reaching the slab underside without a gap or another low ceiling crossing the main mouth.

Both stairs have contiguous horizontal treads, side parapets, full-width top receiving areas and a level onward turn. Stair tops join the lofts at +3; no unsupported corner-only connection remains. The browser west walk moves from `(13,21,.01)` to approximately `(13,35.04,3.01)` then back to `(13,20.97,.01)`. The east counterpart reaches `(67,36.96,3.01)` from `(67,51,.01)` and returns to `(67,51.05,.01)`. Body dimensions remain unchanged and the recorded end states are grounded.

The ground passages beneath the lofts are actual openings, visible from both sides. Browser motion traverses west `(24,36,.01)` to approximately `(30.03,36,.01)` and east `(56,36,.01)` to `(49.97,36,.01)`. The floor remains level throughout. Slab soffit+2.65 m supplies the intended standing headroom; the body was not crouched to pass. No route through the filled body beneath either stair is claimed.

WEST-COUNTER/EAST-COUNTER now meet their rear guards. Recorded placements in the former rear slots are physically blocked, while front placements `(20,38,3)` and `(60,34,3)` are clear. This closes the L01 concern without a false narrow passage claim. The counters leave the stair receiving and front occupation areas usable. Views show a coherent rear-guard/counter relationship; no additional interface repair is needed.

## Performed circulation and solid checks

All nine bounded motion paths pass: both spawn-to-point choices for each team, both stair-and-loft return loops, both under-loft ground excursions, and a circuit around the LIFT. Each sample retains the 2 m/.4 m body and is grounded; ordinary ground paths stay at feet+.01 m and stair loops span+.01 to+3.01 m. These records corroborate the selected routes rather than relying only on static navigation connectivity.

The LIFT and both spawn-core face probes are blocked. Placements inside their solid footprints are rejected. The visible opaque core and LIFT therefore have physical collision rather than merely visual screening in these checks. The whole runtime navigation also contains ten unassigned prop-top island suggestions; those are not required walking destinations. The main authored routes sharing usable navigation must not be described as proof that every top is reachable. Mobile heroes' use of those tops remains target-engine work.

## Visibility and cover observations

Both loft aperture views show the LIFT interrupting the central opposite gallery view, with court sectors visible around it. Both ground-to-loft views show the low central guard and taller end cheeks as modeled. Intermediate stair views show the side parapets screening lower lateral views while the user approaches a receiving landing. These support the intended bounded hold rather than proving all offset rays blocked.

The under-loft views preserve a separate ground approach, with the LIFT dividing its forward view; the overhead slab is visible and does not visually seal the mouth. Spawn views show the service cores and staggered screens breaking the immediate central view. They do not prove protected spawns against every enemy offset or a flying hero. Target-engine team barriers remain required by the brief.

The north/south staging pairs visibly change from a standing view over the low block to a crouched eye hidden behind it. The browser posture record confirms an actual crouched body at feet `(36,16.5,.01)`, eye+1.0795, height1.15; standing eye returns to+1.87. The separate 1.1 m fountain rims and loft guards remain lower than the crouched body top and are not certified as full-body refuges. Elevated enemies can defeat some low cover; the source and brief correctly preserve this qualification.

## Remaining limits

The motion harness checks bounded support/headroom/collision samples on existing navigation; it is not a continuous swept capsule proof. The author performed the saved runs; this independent review inspected their source-matched results and actual images. Offset spawn/body visibility, follower trading, ballistics, utility, sound, 2.4 m tanks, flight/dashes, damage/falling, team barriers and actual ten-player play remain unverified here. Detailed section visibility assessment is a separate scope; central sample views must not be expanded into a whole-map occlusion claim.

The open-top depiction and missing-skylight frame are intentional presentation/architecture choices. This review does not claim a complete enclosed building, engineering adequacy or building-code compliance. Architectural appearance/enclosure review remains separate from required-route acceptance.
