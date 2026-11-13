# Ninefold reboot — art pass and playable preview

Turns the accepted R08 blockout into modeled, textured architecture and a
Three.js first-person preview lit entirely in real time. Outputs are generated;
nothing here edits `level.aml`.

```sh
# Build: textures, Blender modeling pass, web package (about one minute)
projects/ninefold-reboot/production/build.sh

# Walk it. Leave this running: the page reloads itself, keeping your view, after every build.
npx vite --config projects/ninefold-reboot/play/vite.config.ts   # http://127.0.0.1:5183/

# Review stills from fixed viewpoints (uses installed Chrome through Playwright)
node projects/ninefold-reboot/play/capture.mjs generated/ninefold-reboot-production/stills
```

Outputs land in `generated/ninefold-reboot-production/`: `textures/` (PNG
tiles), `art/` (GLB, collision GLB, manifest, `ninefold-art.blend` for
inspection in Blender) and `web/` (what the preview serves).

## Input

The source is the retained R08 build (`generated/ninefold-reboot-r08-build`),
the one the independent reviews accepted. `node production/geometry-hash.ts`
confirms the current compiler still produces the same geometry hash for
`level.aml`. A fresh CLI validation currently stops at the shared compiler's
route-audit work budget, which is an incomplete check rather than a geometry
finding; the art pass does not re-validate gameplay and relies on the retained
R08 evidence.

## What is fixed and what is free

- **Collision is the R08 blockout, unchanged.** `ninefold.collision.glb` is
  re-exported from the source triangles. Floors, stairs, walls and cover are
  where the reviews left them.
- **The visible architecture is free to differ.** The placeholder window props
  are dropped. The context masses are divided into building lots; each lot is a
  building with one 3.2 m storey grid and its own bay rhythm from street to
  roofline. Where the blockout already supplies the wall a player can touch,
  pieces are mounted on it; above 9.6 m the building is generated, flush with
  that wall, up to about 35 m. Walls outside the lots get a bay rhythm of
  their own.
- **Dressing never enters player volume.** Pieces deeper than 0.15 m (less than
  the 0.25 m body radius) are placed only where no walkable surface lies within
  2.45 m beneath them and no higher walking level can see them, or at 9.6 m and
  above, which is over every standing, stair and jump eye height. Washing lines
  follow the same 9.6 m rule so cloth never screens an engagement. Cover keeps
  its exact hull: added detail is at most 0.05 m proud and never on top of low
  cover.

These rules are sampled ray checks from a 1 m grid of walkable eye positions,
not continuous proof. Cables and flush pieces can still cross a sightline by a
few centimetres; nothing was playtested.

## Files

| File | Role |
| --- | --- |
| `blender/textures.py` | Tileable PBR tiles with fine detail only, the room atlas for windows, and the macro variation map |
| `blender/geo.py` | Triangle helpers, material buckets, GLB writer |
| `blender/world.py` | Collision rays, walkable samples, visibility from play |
| `blender/assets.py` | Modeled kit: windows, balconies, cages, air conditioners, awnings, pipes, shutters, doors, signs, lamps, tanks, aerials |
| `blender/dressing.py` | Lots, building generator, facade grammar, street dressing and the safety rules |
| `blender/props.py` | Detail on the blockout's own cover pieces, ceilings and street ironwork |
| `blender/build.py` | Orchestration and export; nothing is baked |
| `package.py` | Browser packaging and the build stamp that triggers live reload |
| `../play/` | Three.js preview using `game/collision.ts` and `game/controller.ts` |

## Real-time look

The GLB carries geometry, material UVs and per-vertex paint tints only. The
viewer supplies everything else each frame:

- a low sun with a 4096 px shadow map and three tilted sky-fill lights with
  soft 2048 px shadow maps, all drawn once because the level is static, so
  alleys and rooms darken without a bake;
- a top-down height render that tells the shader what is under cover, which
  scales skylight and sky reflections;
- up to 16 of the nearest lamps, tubes and signs from the manifest's light
  list, evaluated in a loop that skips lamps out of range per pixel;
- half-resolution ground-truth ambient occlusion, bloom and ACES tone mapping;
- world-space weathering from the macro map so no tile shows a repeating stain.

If the frame rate stays under about 45 fps the page drops ambient occlusion,
then resolution. `Q` restores full quality. Look-dev overrides: `?sunAz=`,
`?sunEl=`, `?exposure=`, `?fills=`, `?msaa=`, `?ao=0`, `?bloom=0`, `?scale=`,
`?auto=0`, and `?pos=x,y,z&yaw=&pitch=&hud=0` for a fixed camera.
