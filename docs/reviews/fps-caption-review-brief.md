# First-person camera caption — review brief

Observed in actual Daiban walkthrough: first-person rendering correctly uses the perspective walk camera, while `#view-label` still says orthographic because the saved overview projection owns the caption. This makes evidence screenshots misleading.

Required behavior: the visible caption describes the active viewport: 2D plan, perspective first-person walk, or saved orthographic/perspective overview. Exiting walk restores the overview caption; switching to 2D labels the plan. Invalid starts must not change the existing mode/caption. URL, form and authored-spawn entry all share this behavior. Camera transforms, source geometry, navigation and saved overview settings remain unchanged.

Proposed assertions extend `tests/walk-inspection-browser.mjs`, using its real compiled fixture, Chrome, actual rendered matrices and UI transitions. They check URL entry, invalid active start, Escape, authored spawn, 2D and both overview projections. Before production changes, the scenario fails with actual `ORTHOGRAPHIC / Z-UP METERS` against expected first-person/perspective at the valid URL start. Recorded run: `generated/walk-inspection-browser-4OUikH`, exit1, no browser page errors.

Independent test review is required before production implementation; a separate implementation reviewer follows the actual fix. This brief is not either review. Existing broader FPS coverage remains; this change is caption correctness, not a new physics or walking feature.
