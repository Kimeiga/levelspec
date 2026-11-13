# Last Light Galleria reboot — raw brief S01

The user requested a reboot of three existing maps using the latest workflow. This is the Last Light branch. The original is preserved at `projects/last-light/`. Two architectural alternatives are intentionally unselected; inspect their SVG/PNG plans before reading the author's comparison in `planning/alternatives.md`.

## User constraints and inherited hypotheses

The original brief records three user requirements: an invented **5v5 hero-shooter map**, a **dead mall** setting, and no source-reconstruction requirement. The current request adds exploration that disrupts an early simple sketch, purposeful verticality, architectural reference study, and independent review of macro and local gameplay.

Single-point Control, two respawning teams, one tank/two damage/two support, run speed 5.5 m/s, an 8-second respawn wave, 20-second objective unlock, score to 100 and best-of-three rounds were the original author's design hypotheses. They remain provisional for a comparable reboot. The old 72×64 m extent, mirrored diagonal home loops, four central mouths, +3 m isolated lofts, octagonal court and central lift were author choices, not user constraints. Neither alternative must preserve those shapes.

The inspection body is preserved: radius 0.40 m, standing height 2.0 m, crouch height 1.15 m, step 0.30 m, maximum slope 42°. Harness speeds remain 3.4/1.7 m/s, eye height 93% of body height (1.86/1.0695 m), FOV 75° vertical at 4:3. Essential circulation must work without jumps, ladders, crouch passages, boosts or hero abilities. Larger 2.4 m tanks and flying heroes remain target-engine stress cases.

LevelSpec does not supply the destination game's combat, healing, abilities, scoring, spawn barriers or invulnerability. No multiplayer balance, reachability or population claim follows from these drawings. The previous hypothesis of supports plus regroup routes, rather than required health packs, is retained provisionally.

## Raw architectural alternatives

- **A / Department After Hours:** [SVG](planning/proposal-a-s01.svg), [PNG](planning/proposal-a-s01.png), [coordinates](planning/proposal-a-s01.json). Ground control occupies a large store interior; public promenade and service circulation continue around it. A continuous partial +3.6 m gallery crosses the north frontage. Upper occupancy does not score.
- **B / Twin Atrium Exchange:** [SVG](planning/proposal-b-s01.svg), [PNG](planning/proposal-b-s01.png), [coordinates](planning/proposal-b-s01.json). A +3.6 m food-court exchange connects two atria. A real lower passage continues below the scoring floor. Grand stairs and service stairs approach different upper edges. Only the upper control floor scores.

Units are meters, right-handed Z-up. Floor separation is 3.6 m with a proposed 0.35 m slab, giving 3.25 m clear below. Stair footprints are 6 m wide and 18 m long; their arrows explicitly name 0→3.6 transitions. Landing footprints receive the full stair width. Control circles are geometric zone extents, not navigation anchors; adjacent accessible anchors are separately recorded in JSON. Guard rails, partitions, wall depths, vestibule baffles, detailed stair landings, roof forms and exact objective bands remain development work after interest review.

Thin outlines subdivide spatial programs, not automatically walls. Dark shapes are solid masses. Pale shapes on the upper plan are ground below, not an upper walking surface. Pink dashed outlines on the ground show overhead slabs. The height diagram is schematic and is not a coordinate-projected section. Future detailed drawings must identify actual section planes and ceiling heights.

## Review scope and current state

Phase A only: real-image study, original provenance, three deterministic exploration runs, two coordinated raw alternatives. No production AML or preferred option exists. The first gate compares spatial interest and architectural organization independently. Root coordinates that review, then development, independent detailed layout/construction/visibility and strategy/player-behavior gates. Production AML follows those gates.

At development, compare opening 5v5, 3+2 split entry, full rush, tank-led occupy with paired supports, ranged upper hold versus grounded retake, 2v5 stagger, 3v3 after losses and full-team regroup. Both alternatives require further spawn exposure, outer-loop time, ascent commitment, crossfire and support visibility review. Roof-on mass, cutaway plan and opposing interior views must demonstrate actual enclosure when compiled.
