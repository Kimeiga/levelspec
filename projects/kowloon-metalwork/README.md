# Kowloon metalwork study

Small visual study using the production `windowUnit`, `cage`, and `bladeSign`
generators. The sign panel is deliberately plain to expose its support. It is
not a substitute for the complete building preview.

References: [window/cage concept](../kowloon-art-direction/components/09-windows.png)
and [sign concept](../kowloon-art-direction/components/06-signs.png). These are
generated art direction, not measured construction drawings.

Run `node projects/kowloon-metalwork/study.mjs` from the repository root. It writes
`generated/hardware-study/hardware.glb` with embedded PBR textures, a budget JSON,
and an interactive `index.html`. Serve the repository with Vite and open that
HTML to orbit the model. [Preview source](preview.html) retains the cameras and
real-time lighting. No lighting is baked into the material maps.

This pass adds chamfered frame and rail sections, glazing and window hardware,
a cage grate floor with bolted brackets, and solid sign gussets with washers and
chamfered bolt heads. Shared weathering adapters retain actual member contacts;
brown grime trails from those contacts follow projected world gravity. Visual
parts remain separate from collision and navigation.

Disposable evidence lives under `generated/hardware-study/`: overview, window,
cage and support images. Numeric probes there check geometry and weathering
ownership without asserting artistic colors, placements or wear patterns.
