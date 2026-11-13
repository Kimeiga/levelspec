# Independent architecture and preview skill exercises

Reviewer: browser-audit agent, independent of skill author. Production baseline `0bd3d76`; exercised the newly adapted `reference-level-authoring` and `level-preview-art` instructions without editing XML or renderer code.

## Architectural authoring exercise

Request: review existing architectural fixtures and identify the evidence needed before accepting a reference-driven revision.

Inputs read: both adapted skills and their local references; `examples/rooftop-reference.level.svgx`, `examples/showcase.level.svgx`, `reference/rooftop/README.md`; inspected the actual oblique and south rooftop PNG originals. Ran `node --test tests/vector-reference-acceptance.test.ts`: one test passed, matching all checked-in views using the compiled visible mesh. The east image is covered by that automated comparison but was not personally opened in this exercise.

Applying the skill yields a useful distinction: the rooftop images are synthetic perspective goldens, not measured photographs of a building. Their declared meter coordinates are fixture truth, not evidence of structural adequacy. The oblique original shows a six-column/four-row south facade, rooftop equipment and mast; the south original confirms repeated window arrangement and the different visible roof-equipment heights. The XML records perspective cameras and landmarks, and the fixture test establishes projection/geometry regression fidelity rather than photorealism or gameplay circulation.

The showcase establishes a useful circulation brief: a ground courtyard, ramp and stairs rising from Z=0 to Z=3, an upper bridge at Z=3, explicit open seams, and a spawn-to-objective route. Its 9 m ramp run and 3 m rise give an independently derived slope of about 18.4 degrees, below its declared 42-degree navigation limit; that arithmetic alone does not establish step, headroom or route validity. Its upper platform is 4 m wide in X, but authored width is not guaranteed usable width after walls and erosion. An acceptance revision would require actual compiled plan/section views, diagnostics, and route results. No claim that this exercise validated all showcase clearances is made.

The skill correctly prevented several misleading shortcuts: treating a render as connectivity proof, declaring synthetic scale a surveyed dimension, making Blender source authoritative, or inventing hidden rooms from the exterior golden. Plans/sections are appropriately requested for substantial new construction rather than every small repair.

Limitations: no new construction was authored, no independent real-world reference reconstruction was attempted, and no complete section packet was generated. A complete new architectural workflow still needs the later worked project. The instruction to inspect orthographic views is a desired evidence requirement; the current workbench uses perspective, so agents must record that gap or use an explicit supported external proof rather than falsely claiming the preview already supplies orthographic presets.

## Preview art exercise

Request: evaluate delivered browser evidence against the future illustrated architectural preview brief.

Inspected `/tmp/levelspec-phase1-browser/immersive-terrace.png` from the production browser run, 1440 × 1000, raised-terrace overview; the browser script fixes reduced motion and records the scenario. Source inspection confirms the camera is perspective. This is a comparison against the new style direction, not acceptance of a style implementation that has not happened.

The delivered scene has readable massing, a recognizable elevated terrace, roof, stair/courtyard relationships and directional ground shadows. It uses colored/textured pale materials; the screenshot does not establish an intentional silhouette/feature-edge ink hierarchy or consistent dither pattern. Therefore it is useful baseline evidence but does not pass the proposed orthographic grayscale illustrated preview contract. The skill identifies concrete next checks: structural edges around openings and slab rims, readable recesses, camera-fit/cutaway behavior, stable apparent line weights, and shadows at the actual delivered size. It also correctly keeps subdued navigation/selection colors and authored export materials separate from the grayscale presentation.

The exercise found no material routing or self-containment defect in either adapted skill. Both resolve their local references and avoid sibling runtime requirements. No art constants, shader changes, or source-material edits are justified by this review alone; these belong to the visual-slice milestone. The actual dither stability, water transparency, stacked-floor cutaways and large-level responsiveness remain untested future acceptance items.

## Outcome

Both skills provide actionable guidance for these tasks, with honest limits on current tooling and evidence. This exercise validates practical review use, not every possible authoring or visual-production path. Use the later worked project and approved visual slice to expand evidence; do not make the skill entrypoints an accumulating list of fixture-specific corrections.
