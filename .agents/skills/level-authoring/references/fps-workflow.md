# LevelSpec tools for FPS authoring and review

Use this adapter when building or verifying LevelSpec geometry. The
[FPS workflow](../../fps-map-workflow/SKILL.md) owns the process;
[level-authoring](../SKILL.md) owns construction and circulation.
Repository contracts, coordinates, project paths and CLI commands live in
[AGENTS.md](../../../../AGENTS.md). Use stable authored IDs to track retained,
changed and retired features between drawings, AML and evidence.

## Compiled geometry and captures

Use the current CLI/help for validate, build and preview. Inspect diagnostics as
well as the actual volume. The [structural guide](structural-review.md) covers
physical transitions and [repeatable captures](structural-review.md#repeatable-captures).
Capture loaded source/companions and camera state for the inspected revision;
generated outputs belong under ignored `generated/`, with retained review evidence
separate from disposable runs.

Choose meaningful opposing and supporting views from known or explicitly provisional
body/eye/FOV settings. An arbitrary camera pose does not verify body placement or
simulate the target game's posture. Keep render visibility, physical collision,
navigation and material/gameplay behavior distinct.

## Optional visibility scanner

For a requested sampled audit:

```sh
node tools/vector-visibility.ts projects/my-level/level.aml \
  projects/my-level/audits/visibility.json generated/my-level/visibility-01
```

Use a new output directory and an explicit
[query configuration](../../../../docs/FPS_VISIBILITY.md#configuration). Retain source/config
identity, supported levels, sample spacing, eye offsets, omitted opacity/state and
incomplete work budgets. Include protected spawn areas and offsets rather than only
center pairs. Optical occlusion uses rendered opaque geometry independently of
collision/navigation admission. Configured low eye offsets are optical studies,
not simulated crouch states. Interpret warnings using the
[visibility/cover guide](../../fps-map-review/references/visibility-and-cover.md).

## Inspection movement

The reviewer checks standing-body placement, then follows existing navigation with
physical support and step/headroom checks on bounded substeps. It is not a continuous
capsule sweep. Use WASD/arrows, Space to jump, Ctrl/C to crouch and Esc to exit.
Movement helpers reset on placement, exit, focus loss, visibility changes and reload.

For browser checks, select `#walk-helper` values `jump`, `crouch` or `off` after a
successful walk start. Read
`JSON.parse(document.querySelector('#model').dataset.walk)` for Z-up `feet`/`eye`,
active `height`, `stance`, `grounded` and `helper`; the mountReviewer API also exposes
`setWalkHelper` and `getWalk`. Wait for the requested stance or airborne state before
capturing, and sample full launch/landing cycles for repeated jumps. Standing up
requires headroom. The inspection eye is 93% of active body height above feet.

Jump impulse is 5.2m/s under 20m/s² gravity; standing/crouching speeds are 3.4/1.7m/s.
Crouching uses the authored crouch height. Horizontal movement remains on the existing
standing-eroded navigation: crouch does not admit excluded low passages, and jumps
cannot establish gap crossing. These controls do not simulate multiplayer body
blocking, weapons, grenades, audio or combat. Distance/speed calculations are estimates.

An intentional crouch-only duct or passage can still be authored, but its traversal
needs crouch-compatible movement verification in the intended engine when this
standing-eroded navigation excludes it. Check that standing is blocked and crouching
passes through the entrances, interior and exits; do not shrink the standing body
or weaken clearance checks to manufacture a pass.

For an intended drop or other directed transition, inspect takeoff, landing support,
clearance, exposure and the return route, then exercise the actual supported movement.
Nearby navigation polygons or a jump control do not prove reachability, fall damage
or one-way behavior. Do not add seeds/off-mesh links to disguise a broken route.

Retain unavailable target-engine checks as explicit limitations. Sampled navigation,
optical rays and successful exports do not establish continuous gameplay reachability
or configured destination-engine collision/gameplay.
