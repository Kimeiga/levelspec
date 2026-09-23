# Rendering choices and checked primary references

Sources checked for this implementation, September 2026:

1. [Three.js MeshPhysicalMaterial](https://threejs.org/docs/pages/MeshPhysicalMaterial.html): clearcoat and anisotropy provide material-specific responses, with extra per-pixel cost. They are enabled selectively for ceramic and metal surfaces, not applied indiscriminately to every object.
2. [Three.js MeshStandardMaterial](https://threejs.org/docs/pages/MeshStandardMaterial.html): normal maps affect shading without altering geometry, and lightmaps use a separate UV channel. Detail maps use non-color data; calibrated lightmaps use linear sRGB and the validated second UV channel.
3. [Three.js Water](https://threejs.org/docs/pages/Water.html), together with the installed Water.js implementation: a bounded planar reflection suits the small flat courtyard basin. The custom implementation uses source-derived top triangles, reflected camera coordinates and oblique clipping; it does not add a second overlapping water plane or an external normal-map dependency.
4. [Three.js UnrealBloomPass](https://threejs.org/docs/pages/UnrealBloomPass.html): a mip-chain bloom supports a restrained highlight treatment. The pass runs at reduced resolution with a high brightness threshold, followed by output tone/color conversion.
5. [Three.js TAARenderPass](https://threejs.org/docs/pages/TAARenderPass.html): the pass accumulates a stationary scene without reprojection. It was not enabled for a walkthrough with animated water and changing geometry. The existing MSAA path is retained instead of promising motion-safe temporal accumulation.

The repository's existing `tools/lighting/calibrate.py`, `tools/lighting/bake.py`, `src/lighting/manifest.ts`, and the workbench's hybrid lightmap material were read before integrating the bake. Calibration, native bake completion, packed EXR checksums and browser binding were then tested directly. Environment reflection maps are not described as a substitute for a Cycles light bake.

KTX2 transcoding and a second diffuse LightProbe were not added. The original 256-square image sets are already small, and adding another diffuse ambient source to the calibrated bake would require avoiding duplicate light. The implementation instead keeps source-specific bakes, existing environment specular lighting and a documented live fallback for edits.
