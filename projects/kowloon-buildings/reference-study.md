# Building construction study — 2026-11-11

This is themed invention, not reconstruction. Dimensions and the trapezoid are invented.

Images searched and inspected:

- [HK01, public drainage repair report](https://www.hk01.com/社會新聞/625712/市建局今年內協助300幢舊樓維修公用排水系統-涉1億元資助), photograph published May 16, 2021. [Image](https://cdn.hk01.com/di/media/images/dw/20210516/470556910119030784261054.jpeg/92zVRDxbc9WHdE1mX7-xIYz_niuEdAhEJzN5-Sczefk?v=w1920). Observed: recessed aluminum frames, separate sills and concrete hoods, louvers, external pipe collars and branches, dark runoff below projections, uneven render loss exposing substrate. This is an aging Hong Kong facade, not asserted to be inside the former Walled City.
- [Skywalker's Heritage, 8 Lung Kong Road](https://skywalker.autozine.org/Heritage/2Kowloon/03_Kowlooncity/Kowloon03_10.html). [Image](https://skywalker.autozine.org/Place/1152_Kowloon_City/13.jpg). Observed: layered horizontal floor bands with angled profiles, narrow inset framing around glazing, contrasting household additions, textured column bases and a drain at the frontage. The historic ornamental facade informs construction depth; its decoration is not copied wholesale.
- [M+, Greg Girard, Tung Tau Tsuen Road facade](https://www.mplus.org.hk/en/collection/objects/kowloon-walled-citytung-tau-tsuen-road-facade-20184/). Collection context consulted; not used as dimensional evidence.

Translation into the generator: chamfered slab bands, sloping sills with drip edges, secondary glazing beads and hinges, louvered ventilation covers, open roof-scupper mouths, narrow construction joints, and stains tied to those actual projections. Existing household variation, pipes, cages, signs and rooftop equipment remain in use.

The polygon roof uses the same ground-finish pipeline as rectangular terraces. Facades use the shared wall material charts, including runoff and coat loss. No reference photograph is shipped as a texture.


## Window interior study

The original [Joost van Dongen interior mapping paper](https://www.proun-game.com/Oogst3D/CODING/InteriorMapping/InteriorMapping.pdf)
(CGI 2008) raycasts a virtual room box per pixel for view-dependent depth with no
interior mesh. [Gaxil's Unity implementation](https://github.com/Gaxil/Unity-InteriorMapping)
adds room variation, lighting, and shadows in a shader. These techniques suit
large distant facades; their shader and atlas contract must also be implemented
by every consuming renderer.

For this portable mesh generator, use bounded geometry: existing facade reveals
extend 42 cm behind a shallow frame, a dark back closes the recess, and sparse
folded curtains provide depth cues. The four reveals and sealed backing take ten triangles before
shared finish subdivision; the inner back insert adds two and optional double-sided
curtains add twenty-four. No opaque painted reflection
covers the aperture. Selected backs have real warm emission at night, with
unchanged geometry. This is a small visual chamber, not a playable room or a
full room simulation. Flush overlays remain explicitly flat.

Emission follows the [Khronos strength extension](https://github.com/KhronosGroup/glTF/blob/main/extensions/2.0/Khronos/KHR_materials_emissive_strength/README.md):
linear RGB factors and a separate multiplier above one. A zero daylight factor
stays dark even in readers that ignore the optional extension.
