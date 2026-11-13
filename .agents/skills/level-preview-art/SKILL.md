---
name: level-preview-art
description: Create or review orthographic illustrated architectural previews with feature-edge ink, grayscale dithering and directional shadows. Use for LevelSpec preview rendering and visual acceptance, not compiler geometry semantics.
---

# Illustrated architectural preview

Honor the user's latest art direction. Default to pale grayscale architecture,
crisp structural ink, dithered gradients and strong directional/contact shadows.
Treat this as presentation: do not silently rewrite authored materials or exports.

Use an orthographic three-quarter view with sufficient breathing room; check top,
front/side and cutaway views for stacked spaces. Keep interiors readable through
sections/layer isolation. Check camera fit at different building sizes and window
sizes; maintain usable pan/zoom and camera state through recompilation.

Ink silhouettes AND meaningful structural creases, openings, slab rims and junctions.
A backface outline alone misses interior feature edges. Preserve intended creases
through bevels; avoid triangulation wireframes and doubled ink. Choose heavier major
contours and lighter details with consistent apparent weights at delivered scale.

Favor near-white lit faces, distinct midtones and dark recesses. Keep directional
light/shadow separation rather than washing out shadows with ambient light. Dither
smooth shading and received/self-shadow transitions coherently; avoid patterns that
swim with camera motion or change arbitrarily with display density. Use stylized
metal/reflections only where the material calls for them. Water and glass must remain
readable without opaque ink or shadows concealing their intended transparency.

Selection, navigation and diagnostics may use subdued semantic color. Preserve
legibility and accessible control contrast. Keep navigation overlays distinct from
physical geometry. Visual styling must not change collision or route validity.

Inspect the delivered browser renderer at normal size and close-up. Check framing,
openings, line hierarchy, cutaways, water, directional shadows, dither scale and
shader errors, including mobile and reduced-motion behavior. Record exact revision,
viewport, camera and evidence paths. For substantial changes use an independent
appearance critic against the requested style; distinguish aesthetic findings from
geometry defects. No screenshot is proof of runtime navigation correctness.

For structural layout, topology and circulation use
[level-authoring](../level-authoring/SKILL.md). Use
[architectural review](../level-architecture-review/SKILL.md) for enclosure, roof/ceiling
completeness and building plausibility; a presentation cutaway must not conceal a
modeling omission. For source fidelity, follow [reference-level-authoring](../reference-level-authoring/SKILL.md):
review originals before candidate interpretations, retain actual frozen renders
and use matched-camera paired contours where needed. Attractive shading or a
drawing derived from the same model cannot establish architectural fidelity; unmatched views stay diagnostic.

Adapt techniques into the existing Three.js/Vite renderer; no Svelte or sibling
runtime dependency is required. Resource disposal and responsiveness matter at large
level scale. See [provenance](references/provenance.md).
