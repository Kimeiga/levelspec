# Deadwater

Original map for 5 Ts attacking two bomb targets and 5 CTs defending an abandoned offshore oil platform. AML source and harness blockout are the deliverables; no existing map is being reconstructed. R01 is the initial spatial proposal; L05 is the developed layout. Theme: decommissioned drilling deck, separators, corroded cargo handling equipment, lifeboat muster and abandoned control room over dark sea.

The harness provides native geometry, collision-aware inspection walking, navigation, static optical tests and exports. It contains no multiplayer combat or defusal simulation. The existing game sample uses exported spawn/objective markers and player dimensions. No destination-engine settings were supplied.

Working target assumptions for design: one life per round; five players per side; T carries a bomb plantable at A or B; CT wins by defusal or preventing a plant; rifles with long lethal sightlines; smokes/flashes/incendiaries available; no wall destruction, ladders, grapples or boosts required. Provisional round 115 s, plant 3.2 s, fuse 40 s, defuse 10 s / 5 s with kit. These are design assumptions, not configured game rules. Distance timing estimates use 5 m/s, with equipment, utility and clearing costs unmodeled. Harness walking uses 3.4 m/s standing and 1.7 crouched.

Authored capsule radius .30 m, height 1.80 m, crouch 1.10 m, step .25 m, slope 42°. Harness eyes are .93 of active height: 1.674 / 1.023 m. Visibility studies use 75° FOV. Jump is optional for inspection only; no intended route requires it. Lower walking deck 0; raised A / CT / control deck +2.40; ocean -15. All required height changes use 16 × .15 m stairs, 6 m wide with full landings and side guards. Standing navmesh remains the basis of crouch movement.

Review full 5v5 opening defaults (2A / 2B / 1 flex), T 4+1 execute on either site, a 2+3 split through Valve, stalled attackers changing site, 3v3 after first casualties, 2v3 postplant and 1v2 save/retake decisions. Separate geometric evidence from behavioral hypotheses and measured multiplayer results.
