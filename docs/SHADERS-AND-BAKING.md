# Shader rendering and actual baked lighting

The previous website used live direct lights and an environment reflection map, not baked lighting. This change runs the existing calibrated Cycles backend on all three textured presets and loads the matching results in the website.

## Rendering

Enhanced mode adds low-amplitude normal and roughness maps generated from the original material images, clearcoat on glazed ceramics, anisotropy on metals, restrained HDR bloom, and a small color/edge grade. A custom GLSL pulse identifies source objects whose compiled geometry actually changed. Lantern Court's authored basin top is replaced by a reflective water material using a mirrored camera and clipped render target; there is no duplicate coplanar surface.

MSAA remains enabled. Water animation and edit pulses can be paused in Appearance, and reduced-motion preferences start them paused. Basic mode bypasses post-processing and the reflective-water/material enhancements while retaining geometry, navigation, validation, exports and optional matching lightmaps. Rendering pauses when the scene is hidden. Water updates at a bounded cadence; moving the camera still renders immediately.

The work does not add screen-space AO, full-scene SSR, depth of field, a temporal accumulation pipeline, or remote assets. These are not required to provide the implemented effects. All geometry still comes from LevelSpec.

## Bake results and binding

Blender 4.5.9 LTS was downloaded from the official release host into the ignored verification directory, with its official SHA-256 checked. The existing unit-sky, unit-sun, colored-bounce, and linear FLOAT RGBA EXR calibration fixtures passed. The backend now accepts verified, packaged image bytes and uses the original material UVs and sRGB albedo textures during transport, rather than rejecting textured materials.

All three exact presets completed 32-sample Cycles bakes, with three 1024-square atlas pages each, plus two chart-aware padded mip levels. The transport contains diffuse sky light and indirect light from the authored lights. Direct lights and specular environment reflections remain live. The receiver shader excludes the ordinary diffuse sky contribution when applying the lightmap so it is not counted twice.

The browser verifies the exact source, geometry, triangle-corner mapping, UV hash, material image hashes, EXR checksums, dimensions, mip chain and calibrated intensity. Edits immediately invalidate the old binding. Unbaked source uses live lighting; resetting to an exact baked preset reloads its matching result. The page states which mode is active. Invalid or unavailable bake files do not block geometry, walking or exports.

Chalk's atlas contains seven unassigned CSG sliver triangles, each smaller than one square millimetre. Those retain live shading and their count is displayed. Normal-sized static surfaces without atlas coverage are rejected. No compiler validation gate is disabled.

## Reproduce

Set `BLENDER_PATH` to a local Blender executable. Run `npm run bake:site -- clay NEW_DIRECTORY 32`, and repeat for `chalk` and `night` using the same new parent directory. Existing revision directories are not overwritten. Run `npm run package:site-bakes -- NEW_DIRECTORY` to package EXRs and bindings; run `npm run generate:site-material-detail` for the original detail maps. The raw `.blend`, native tools and verification logs are not committed or published.

## Portability

GLB/glTF exports retain the LevelSpec geometry and original authored base-color textures. The custom water, detail maps, clearcoat, grading, bloom and baked-lightmap preview are not claimed to be included in portable model exports. Original authoring source and companion images remain available in the source ZIP. Native FBX/BSP2 exports are outside this change.
