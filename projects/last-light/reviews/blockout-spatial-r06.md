# R06 focused compiled spatial return

Verdict: **accepted within the LevelSpec spatial/construction/circulation inspection scope**. This supersedes R05 acceptance for the changed kiosk/spawn-to-promenade encounters and reuses unaffected R05 floor, stair, loft and counter evidence. No further geometry repair is required by this scope.

Reviewed source SHA256 `efbd743e587066ec818152217563be275b6b70d248dcbb1f5ec58ce07322b692`; physical hash `f4cfc3768e181b066baecde9fbc5211030f652b6b0029dd41731a58240d6ba7b`. The completed `generated/last-light/verified-r06/capture.json` matches the source, records22 named views and5 walk/posture checks, and has no browser errors. The R06 build passes with zero diagnostics.

## Changed geometry and physical return

A-KIOSK is now X25–30/Y13–17, height3.2. B-KIOSK is X50–55/Y55–59. The compiled witness/reverse PNGs show these screens present between the spawn exits and their Court/opposing-loft sectors. The existing room walls, spawn exit mouths, court contacts and neighboring low cover remain in place. The screens remain free-standing; no unintended floor, wall or overhead closure replaces either bypass.

All nine original motion routes pass with the unchanged radius.40 m/height2 m body and retained endpoints. The changed primary trajectory passes through the real south aisle at approximately Y11, below A-KIOSK, then rounds its east end into staging. Its recorded distance is62.50 m for either team; the side approach is54.51 m. These are walked geometric trajectories, not measured multiplayer arrival times or shortest-path claims.

I additionally compiled the exact R06 source and independently exercised a loop through **both** kiosk bypasses, not just the rerouted main trajectory: A `(22,13)` → `(22,18.5)` → `(32,18.5)` → `(32,11)` → `(22,11)` → `(22,13)`, plus the rotated B loop. Both passed with the unchanged standing body; each retained65 state samples and returned within.075 m of its starting plan position at feet+.01 m. Evidence: `generated/last-light/physical-r06/kiosk-review.json`; the revision-scoped runner is `generated/last-light/kiosk-return-review.mjs`.

These loops corroborate the approximately4.88 m receiving space,2.88 m north aisle and5 m south aisle. They include the turn from the receiving pocket into the narrow aisle, passage behind the screen and return around its opposite end. The north aisle has space for the declared body and a parallel teammate footprint; actual simultaneous players, body blocking, follower timing and trading remain untested. No dimension or collision assertion was weakened to obtain the pass.

## Spawn visibility return

Independently inspected the six new actual views: `spawn-a-low-witness`, `court-to-spawn-a`, `spawn-b-low-witness`, `court-to-spawn-b`, `east-loft-to-spawn`, and `west-loft-to-spawn`. They show the relocated kiosk faces occluding the previously open sectors from those camera positions, with the neighboring wall/core screens retained.

The completed full configuration scan in `generated/last-light/visibility-r06/report.json` matches this source and physical hash. All five protected areas report zero visible pairs, and all30 authored-spawn protected pairs report not visible. The additional opposing-loft-center protected pair is also blocked. Two separate late-ascent study pairs remain visible; those concern the unchanged loft/stair encounter and are not spawn-protection failures or a claim of complete upper-level concealment. This closes the reported R05 witness for the sampled source revision and settings. It is optical evidence over configured standing-admitted samples at eye offsets1.0695/1.86 m; it does not prove every continuous spawn/body offset invisible.

## Limits retained

R05 construction and movement acceptance remains valid for unchanged assemblies. Bounded collision/support/headroom checks are not continuous swept capsule proof. Nav-cell remains.125 m and authored standing/crouched dimensions are unchanged. The scan's finite3 m grid, rejected body samples, static opaque materials and omitted mobile/utility behavior remain limitations. Team spawn barriers/invulnerability are still target-engine requirements; the kiosks are geometric screens rather than implemented team protection. Tanks2.4 m tall, flight/dashes, projectile penetration, damage, audio, respawn/scoring logic and ten-player balance require target-engine tests.
