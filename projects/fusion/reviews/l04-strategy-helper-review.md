# L04 strategy measurement helper — independent implementation return

**Accepted for the later frozen-source run.** Reviewed `strategy-check-l04.mjs` SHA-256 `13398bff87b8ea0e4e4556fda6007f449f0c452affe4b0e1607e1712aa315d59`.

The material reuse finding is resolved by removing prior-report reuse entirely. Every unique directional leg now receives the same per-request corridor/progress checks and per-waypoint height checks. Decimated output traces are explicitly identified as inspection artifacts, not reuse evidence. The removed third CLI argument is rejected rather than silently ignored.

The authored and baked player settings enforce all eight approved fields. Native paths/distances and returned walker coordinates are checked for finite values; a re-snapped starting pose cannot exceed placement tolerance. Ordered waypoint legs, shared-endpoint comparison groups, failed/unavailable results and the distinction between an unconstrained candidate failure and an impossible route remain intact. Source augmentation is confined to in-memory markers/routes, with physical/render/player identity checked afterward.

Validation performed by this reviewer: Node syntax check and inventory mode, confirming 74 journeys over 115 unique directional legs. No canonical compilation, movement measurement or geometry mutation was performed. No new test suite was warranted for this project-only evidence helper; the actual frozen run must still establish the reported route results.

This acceptance covers implementation semantics. It does not accept the map, certify continuous collision sweeps, turn summed legs into an end-to-end traversal, or establish multiplayer timing/balance.
