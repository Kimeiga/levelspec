# Blackglass — user brief

Original 5v5 Counter-Terrorist versus Terrorist, two-site bomb-defusal map. Theme: a high-tech industrial site with the atmosphere of a spy-movie villain's evil lair, nested on a really steep mountain incline. Editable LevelSpec AML and a usable harness preview are the deliverables.

Sketch S01: 24 actual named rooms, courts, galleries or consequential circulation spaces; 32 bidirectional connections, including seven distinct stair journeys. Provisional authoring minimum is 18 nodes / 24 edges. Seed 731904 generated candidate anchor positions; the spatial composition was deliberately packed into three contour wings. `layout-data.json` retains raw anchors, exact final rectangles and the connection list. The section is schematic; production rock will stay outside occupied volumes.

The drawing uses meters and right-handed Z-up. Playable envelope is X2–72, Y0–96, with principal floors at Z0, +6 and +12. Scenic rock rises beyond the eastern facility wall; the valley floor is approximately Z−30. The three inhabited levels bracket a much steeper nonplayable mountainside. B is a supported cantilever over the valley, not a flat-ground courtyard.

## L01 movement and gameplay assumptions

Round-based two-site defusal, five players on each side, no respawns. Conventional rifle/sniper and smoke/flash/HE tactics are provisional design assumptions. Round clocks, weapons, utility, economy, damage, sound and multiplayer blocking require target-engine integration. The harness implements geometry and inspection movement; spawns and objectives are metadata.

Authored standing body1.8m, radius.3m, crouch1.1m, step.25m, slope42°. Harness speeds3.4m/s standing and1.7m/s crouched; eyes are93% of active body height, so1.674m and1.023m. These are declared harness values, not authenticated Counter-Strike metrics. FOV study100° horizontal /75° vertical. All required routes are reversible land routes; no jump, boost, drop or crouch-only dependency.

Scenario review: 5v5 defaults and five-player commits at either site; 4+1 split through Mid; defender information push and retreat; site loss with3v5 retake;2v2 and1v2 postplants. Check time/manpower cost of descending and reascending the rear network. Travel distance divided by harness speed is an estimate, not a match timing.

Review L01 drawing and exact data first, before author strategy notes. `inventory.md` maps individually identified gameplay obstacles to intended source IDs. Whole-map spatial and tactical scopes plus a dedicated height/visibility/interface scope remain required before production. Resolve supported geometry issues; uncertain target-engine combat interactions remain playtest questions.

## L02 changes

CT deploys in R (35,75,+6), with four offsets (32,74), (38,74), (32,76), (38,76), all+6. R receives an opaque roof4.2m above its floor; the original CT summit room is now a nonspawn command pad. R-low is X27–30/Y72.8–74.3. This repairs the L01 late-B opening; timing remains an estimate until compiled routes are measured. Only T and R are spawn rooms.

Q uses an .80m structural transfer slab instead of .35m, closing the lower wall-top+5.2 to slab underside gap. Other slabs remain.35m. Outward observation apertures: B west wall X2/Y59–66, sill+1.1/head+3.2 overB0; A east wallX72/Y63–72, sill+1.1/head+3.2 overA12. These are observation only, bounded by continuous sill and clear nonrendered physical safety panes. The pane blocks movement but is optically transparent in the harness; it does not establish target-engine glass/projectile behavior. Exterior space is scenic, with no floor, spawn or enemy frontier. IDs B-window / B-window-safety and A-window / A-window-safety.

## L03 local sightline repair

D-screen moves toX32–37/Y53–55, base+6/height3.4, anchored to the Cleanroom west wall. It interrupts the collinear M-D / D-W / W-R route at standing eye height; circulation passes on its east with at least4m to the relocated D-low atX41–44/Y54–56. The3m receiving space between the Mid doorY50 and baffleY53 allows a rightward turn. Other footprints, doors, spawns and connections retain L02. Check the ray and the body turn on compiled geometry; the roof alone is not claimed to conceal R from same-height Mid.

## L04 local cover fit

Q-low nowX19–23/Y42–44, stillbase6/height1.25. It joins the north boundary instead of leaving a.45m body trap between its back and the wall. The south passing lane remains3.85m clear to the inside wall face. No graph/door or objective change. This is the only L04 gameplay geometry change; roof source tags and flat floor connection declarations correct implementation metadata to the accepted layout.

## L05 local S1 optical repair

S1-west alone rises5.2m over the stair grade instead of3.4m. No floor, route, stair width, riser, threshold or cover changes. Compiled R03 revealed5 standing-eye rays from feet(42,36,+6.01) over the old west screen and Concourse north wall, then under the T-C door head into T offsets. The taller curtain is predicted to intercept these rays before they leave S1. Retain the original full-spawn audit; no sample area, eye height or threshold reduction. Inspect the changed ascent/reverse views and rerun physical traversal after rebuilding.
