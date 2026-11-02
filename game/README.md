# Game sample: playing a LevelSpec map in Three.js

This folder is a minimal Three.js game that consumes LevelSpec output the way
a real game would: it knows nothing about LevelSpec internals, only three
exported files.

| File | Use |
| --- | --- |
| `<id>.glb` | Visual geometry. Load it with `GLTFLoader`. |
| `<id>.collision.glb` | Walls, floors, stairs and cover, without decoration. Use it for player collision. |
| `<id>.game.json` | Spawns, bombsites and player size, in the same glTF Y-up metres. |

```sh
npm run game:export   # maps/hand/kiln.plan -> validate -> game/public/maps/kiln
npm run game:dev      # http://127.0.0.1:5173/ (add ?map=kiln/og_kiln)
```

`tools/game-export.ts` refuses to export a map that fails geometry or
navigation validation. The export is deterministic: the same plan always
produces byte-identical files.

`collision.ts`, `controller.ts` and `glb.ts` are engine-agnostic. They give
you sphere-stack wall collision, step-up, slope limits and gravity, and you
can copy them into a game. `walk.ts` reuses the same code for
`tests/game-walk.test.ts`. That test builds its own walkability grid by
probing the collision GLB, then physically walks every spawn-to-site route.
This checks traversal independently of LevelSpec's navmesh.

## Kiln

`maps/hand/kiln.plan` is an original bomb-defusal layout set in a disused
brickworks:

- **Attackers** spawn in the southern clay yard.
- **Bombsite A** is the raised kiln hall. Attackers reach it by Long (the
  western haul road) or by the Catwalk off mid.
- **Bombsite B** is the drying shed. Attackers reach it through the clay
  tunnels or up the conveyor from mid.
- **Defenders** spawn in the office block to the north.

Measured walk times at 5 m/s:

| Route | Time |
| --- | --- |
| Attackers to A | 15.5 s |
| Attackers to B | 16.1 s |
| Defenders to A | 6.6 s |
| Defenders to B | 7.4 s |

It is a blockout: no textures, lighting bake or art pass. Validation proves
the geometry and traversal are sound. Only playtesting can say whether the
map is balanced or fun.
