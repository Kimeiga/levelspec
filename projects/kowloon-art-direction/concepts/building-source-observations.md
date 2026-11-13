# Building art direction, 2026-11-11

The [generated target](target-01.png) is a built-in imagegen paintover of the actual three-story building captures. Its [prompt](prompt-01.md) preserves the main mass and opening arrangement while inviting material and secondary construction improvements. This is inspiration, not proof of implemented geometry or a dimensional reference. The target changes some details and camera proportions.

| Area | What the target makes clearer | Implementation consequence |
| --- | --- | --- |
| Wall surfaces | Broad, relatively quiet render lets openings and trim establish the structure. Repairs have boundaries and a reason to be there. | The study now uses its fine-grained plaster/render material as the facade palette, instead of covering the facade in the rough concrete tile. Grime is reduced from 0.7 to 0.45. Existing drain/sill/roof runoff remains active. |
| Scale of detail | Large building planes, medium repair/tile regions, then small fasteners and chips form a hierarchy. | Next construction pass should add a few purposeful repair regions and a tile dado, rather than increasing uniform noise. |
| Material separation | Painted steel, galvanized cage bars, tile grout, concrete and render have distinct color and surface response. | Keep these as distinct material families; avoid tinting every part with the same dirt pattern. |
| Installation details | Pipe couplers, bends, attachment plates, conduit runs, junction boxes, light cages and door hardware explain how parts were installed. | Extend existing services and hardware with connected assemblies and visible attachments. Some clamps, vents and frames already exist; the concept adds more than the current generator. |
| Wear | Rust sits at fasteners and sheet edges; moisture follows coping, drains and sills; handling wears doors and shutters. | Keep procedural aging tied to actual construction and exposure. Do not bake every type of wear into the repeating base color. |
| Depth and interior hints | Frame layers, blinds and a few dim silhouettes provide depth without bright painted reflections. | Existing chambers provide real depth; sparse geometric blinds or household silhouettes would be a separate improvement, not an interior/reflection atlas. |
| Presentation | Softer illumination and cleaner separation between light and shade let details survive. | Compare geometry/material changes in matched lighting first. The concept's painted illumination is not a baked texture requirement. |

Implemented in this pass: convex building footprints; continuous polygon roofs/parapets; slab bands, sills, frames, vents and scuppers; shared finish charts with causal runoff; real dark window recesses and seeded nighttime emission; guard-aware sash opening and transparent open leaves. The material correction changes the authored study palette and amounts, not the user's shared texture files or other agents' material libraries.

Not yet implemented from the concept: tile dado, projecting roof coping, pavement joints/drains, extra service hardware, caged entrance lamp, and interior objects. Those are follow-up candidates, not claimed screenshot features.

The matched calm study intentionally keeps `wear="0"` to isolate the base-material correction. Its improved readability does not mean the concept's chipped and peeled repairs have already been reproduced.

## Material experiment follow-up

The user supplied closer crops showing branching concrete color variations,
fine gravity-driven runoff, and relatively straight stepped repair edges.
Fresh patches interrupt earlier stains while older ones accumulate new dirt.
These observations now drive the opt-in `finish-study.aml` material pass:

- Source render, aged concrete and replacement render blend through multiscale
  procedural opacity fields. Connected color areas have finer broken boundaries
  and restrained, independent color variation within a neutral gray palette.
- Actual fixture ledges locate short runoff rivulets. Repairs retain only the
  age-appropriate fraction of old deposits.
- Repair edges stay mostly straight with millimeter-scale chips; shallow trowel
  ridges and softer cement grain affect normals, without adding pigment geometry.
- Painted doors receive local edge, handle and foot wear in color, roughness
  and normal maps.

The current phase prioritizes matched screenshots and a lightweight compile
check at the user's request. Existing tests are retained; no additional testing
expansion is part of the current visual iteration. The larger `level.aml` and
shared full demo have not been switched to raster appearance maps.

## Component finish balance

The original concept relies on muted, uneven base paint and metal. Corrosion is
sparse and concentrated at edges, seams and hardware; large orange or bright bare
metal patches should not carry the material's age. The component experiment now
uses independent color-channel fractal variation, brightness mottling and roughness
variation beneath restrained wear and oxidation. Pipe/frame coordinates use actual
meters, and shutter/roof corrugations unwrap by folded arc length. This replaces
the visibly stretched strips from the early component captures.

Geometry-derived joint detection currently covers ordinary bar, box and tube
assemblies, plus continuous folded sheets. Custom beveled sign-support sections
still receive intrinsic variation and edge aging, but have not yet been connected
to the shared joint collector by the signage agent.
