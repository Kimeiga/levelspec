# Dragon Ford — raw brief

**User request (verbatim intent):** using this harness's tools and skills, make a Counter-Strike Terrorist vs. Counter-Terrorist 5v5 defuse map themed after the Kowloon Walled City ("Fort City").

## Explicit constraints

- Counter-Strike-style bomb defusal, 5 attackers (T) vs 5 defenders (CT), two bomb sites, one bomb.
- Theme: Kowloon Walled City. An invented place informed by real-image study; not a reconstruction, no source-fidelity gate.
- Everything else (name, topology, extent, levels, site placement) is the author's provisional choice and open to challenge.

## Relationship to earlier maps in this repository

`projects/ninefold` and `projects/ninefold-reboot` are earlier Kowloon-inspired maps. They are not templates. Their macro arrangements (south-to-north three-feed with a west ground factory and northeast roof site; "Loft Street" factory above a through-street with a lightwell and roof switch) should **not** be repeated under new names. This map uses a different reference packet and must find a different organization.

## Provisional mechanics (shared by every reviewer)

Inspection body, identical to earlier harness projects: radius 0.25 m, standing height 2.0 m, crouch 1.1 m, step 0.25 m, slope limit 42°. Inspection speeds 3.4 m/s standing, 1.7 m/s crouched; eye offsets 1.86 m / 1.023 m. No mandatory jump, boost, ladder, crouch-only passage or drop; any such feature must be optional and flagged for target-engine verification.

Mode assumptions for scenario discussion only: one life per round, attackers plant at either site, rifles/SMGs/AWP-class sniper, conventional smoke / flash / incendiary / HE utility, about 115 s round and 40 s bomb timer, defuse 5–10 s. Counter-Strike running speed (~6.3 m/s with knife, ~5.4 m/s with rifle) differs from the inspection walker; timings quoted from the harness are relative estimates, not CS timings. Weapon penetration, utility lineups, audio, economy and balance require a target engine and are not claimed.

## Evidence limits

The LevelSpec harness supplies native geometry, navigation sampling, collision-aware inspection walks and optical ray studies. It does not establish competitive balance, continuous reachability, grenade behaviour or audio.
