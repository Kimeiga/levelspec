# Rivergate / review brief R01

Original terrorist-versus-counter-terrorist 5v5 two-site defusal map with a large flowing river in the middle. User leaves other design choices open. Setting: river port, customs court A north, turbine yard B south. Editable LevelSpec AML and inspectable compiled geometry are the deliverables, rather than a shipping game map.

Provisional game contract: one attacking bomb, either site, round-based, no respawns. Target rifles, sniper rifles and smoke/flash/incendiary utility in a Counter-Strike-style engine; exact weapon/utility/economy/clock rules are unconfigured. Test initial 5v5, 3+2 split, defender 2A/1mid/2B and 2v2 / 1v2 post-plant states. No swimming, boats, destructible geometry or scripted flood. River flow is communicated visually; simulation is not required. Map topology must not depend on jumping or boosting.

Study body: radius .30m, standing height1.75m, crouch1.10m, step .20m; walker standing/crouch speeds3.4/1.7m/s; eyes93% body height =1.6275/1.023m. Perspective captures use horizontal90° / vertical73.74° FOV at4:3. Target-engine running speed provisionally5m/s; distance/speed predictions are estimates, not measured CS timings. Unknown penetration/audio/grenades/body-blocking remain engine checks.

Dimensions: banks atZ0, river X44–62 and Y0–96 atZ−3. The playable outer envelope is X4–104,Y8–88 with inset corners. Only A rear hold rises toZ1.2, with two stair accesses; no stacked mid crossing or invisible swimming route. W/E masses are inaccessible architecture, not orphan interior rooms. The complete floor outside solid masses and guards is traversable; route arrows are examples, not invisible route boundaries.

Review raw layout.svg and inventory.md before design rationale. Give macro spatial and tactical verdicts separately; a dedicated visibility/local reviewer checks N,M,S,E sections and interfaces at both stages. Assess approach choices, cover, spawn exits, offensive/defensive timings and post-plants. Return consequential defects with named IDs and concrete revisions, and distinguish predictions from observed checks. Layout acceptance leaves actual 3D/collision/body/LOS checks open.
