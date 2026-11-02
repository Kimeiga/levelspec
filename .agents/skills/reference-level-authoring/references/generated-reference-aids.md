# Generated reference aids for complex architecture

After personally inspecting originals and recording source-only observations,
consider image-generation edits when texture, clutter, shadows or overlapping
stairs make the structure difficult to read. Use an available image-generation
tool or skill and the original photo as the edit target. This is optional support
for native traces and architectural drawings; it does not replace them or block
other source-grounded work if image generation is unavailable.

## Choose a useful view

- **Simplified CAD-like view:** pale clay surfaces, fine structural outlines and
  restrained shading. Suppress grout, stains and printed graphics while preserving
  wall ends, recesses, slab thickness cues, openings, rails, door leaves, landings
  and every visible tread, including small flights seen through windows.
- **Conservative decluttering:** remove loose trash, bags or movable containers
  while retaining the photographed architecture and useful depth cues. Pipes,
  columns, stair cheeks and guards can be structural or identifying features;
  do not discard them as noise. A surface hidden by a removed object is still
  unknown; do not accept newly generated floors, thresholds or steps as observations.
- **Qualitative depth plus outlines:** use a stated near/far convention, such as
  near-white and far-dark, with crisp silhouettes, recess boundaries, slab edges
  and nosings. Suppress texture and illumination changes so they do not resemble
  depth changes. Keep visible geometry behind openings and distinguish an opening
  from a dark painted panel. Plain depth can be useful too; outlines often clarify
  where a wall or slab actually terminates.

Generate separate variants when their purposes differ. Preserve the original
camera, crop, proportions and occlusion order; an attractive isometric redesign
cannot clarify the photographed view. Do not ask for hidden-room completion or
invented cutaways. Focused details may help, but retain a full-view locator and
the unchanged source alongside them.

## Prompt starting points

State the subject and intended review use, then choose the relevant transformation:

> Edit this photograph into a simplified CAD-like architectural view from exactly
> the same camera and crop. Use pale clay surfaces, thin contours and gentle
> shading. Suppress texture, grime and printed graphics. Preserve every visible
> wall cutoff, return, aperture, guard, door, floor, landing and stair nosing,
> including small stairs behind windows. Do not regularize the architecture or
> add hidden connections, floors, openings or rooms.

> Conservatively remove loose trash and movable clutter from this photograph.
> Keep all architecture, structural pipes, camera, crop, lighting and depth cues.
> Leave occluded construction unresolved rather than generating a newly visible
> detailed staircase, threshold or hallway.

> Make a qualitative camera-depth map with near surfaces light and far surfaces
> dark, plus fine contrasting structural outlines. Keep the original camera,
> crop, geometry and occlusions. Preserve openings and the actually visible
> structure behind them. Ignore texture/color and illumination as depth cues.
> Do not invent hidden surfaces or connections. This is inferred relative depth,
> not measured depth; uncertain regions remain uncertain.

## Verify before handing it to a reviewer

Inspect the generated image beside the unchanged original. Check the most fragile
features first: partial flights behind circular windows, narrow turns, floor edges,
door thresholds, recess depths and corners. Record altered, omitted or invented
boundaries. Reject or clearly mark misleading variants; do not adopt a changed
stair count or a newly exposed floor because the result looks plausible.
Check the material behind openings as well as the aperture outline: suppression
of a tiled background can turn intact masonry into an invented stair cavity or
extra step continuation. Decluttering can also erase a small flight and replace
it with a continuous floor. A sharper generated contour does not resolve either
ambiguity.

Generated grayscale values are not distances. Neither a smooth depth gradient nor
a clean edge proves a wall plane, physical cutoff or human connection. Confirm
important relationships in original pixels, another original view, reviewed
schematics and actual model geometry. Do not fit dimensions to generated depth.

Keep the original, generated aid and actual render together in a comparison board
when useful. Clearly distinguish their roles and keep original evidence readable.
Reviewers should still inspect originals first and independently verify structural
claims there; agreement between generated aids and a model is not independent
corroboration.

Preserve the input path/hash, full prompt, tool, output path/hash and a brief
accept/reject/uncertainty note. Save project-used outputs in the project workspace,
separately from original references, without overwriting originals. Link any
subsequent contour or schematic to the original evidence that supports it.
