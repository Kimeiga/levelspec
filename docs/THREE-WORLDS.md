# Three architectural treatments and a persistent walkthrough

## Walkthrough

**Walk in 3D** is available beside the 3D/plan switch in all four demo chapters. It is not confined to the opening chapter. The starting chapter also retains Enter the level.

Desktop walking supports case-insensitive WASD, arrow keys, mouse capture, and drag-look when capture is unsupported or denied. Capture only occurs after pressing a walk control. Escape releases capture and exits walking before exiting presentation. On mobile the walkthrough expands to the available viewport; the movement arrows remain visible while dragging the rest of the viewport looks around.

Recompiling a valid edit pauses movement, then resumes walking on the new navigation surface. Upper-storey positions follow the changed elevation. An invalid route exits walking explicitly with a message, rather than leaving movement active on invalid navigation. Blur, released keys, cancelled pointers and context loss clear movement. Walking is still navigation-constrained inspection, not a game physics engine.

## Three worlds

| Treatment | Materials and light | Authored architectural differences |
| --- | --- | --- |
| Lantern Court | Travertine, terracotta, cedar, brass and glazed green tile; warm afternoon light | Cedar belvedere, screened rooftop volume, pergola and hanging lanterns |
| Chalk Cloister | White limewash/limestone, cobalt ceramic, pale oak and terracotta; bright daylight | Faceted arched openings, pitched ceramic roof forms, garden canopy and ceramic balusters |
| Slate Atelier | Basalt, formwork-panel concrete, steel, charred timber and copper; cool sky with warm accent lights | Sawtooth roof monitors, steel portal and a central copper sculpture |

These are architectural treatments of the same editable circulation layout, not three unrelated maps. Geometry is emitted as SVGX and compiled by LevelSpec; the renderer does not substitute a separate asset for the buildings. Exported styles preserve their geometry, materials and image bindings. Viewer environment lighting is not claimed as baked lighting in the exports.

`website/world-styles.ts` holds material and atmosphere definitions. `website/style-details.ts` authors style-specific source geometry. The texture generator writes 18 original material images, six per treatment. `node tools/site-fixture.ts` regenerates the checked-in default SVGX.

## Surface stability

The baseline had positive-area, same-facing coplanar overlaps between roof trim, roof surfaces and column capitals. Trim now has one owner per run and sits above rather than inside the roof. Column shafts terminate below their capitals. Newly added style details are also audited for coplanar overlap.

The renderer uses one native multisampled forward pass. The previous low-resolution screen-space ambient-occlusion pass is removed. Shadows remain fixed in world coordinates and rebuild only when the scene changes; a deterministic local environment supplies reflection lighting. Camera depth range is reduced to the scale of the building. These changes remove identified instability sources, not a guarantee against aliasing on every device.

The original compiler and runtime-validation gates are unchanged. The intentionally blocked-route example still reports its existing contact warning and disables model export.
