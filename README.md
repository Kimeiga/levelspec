# LevelSpec

A level is a **program**, not a mesh. You write down what a place *is* — rooms,
what is next to what, where the walls and doors and stairs go — and a
deterministic compiler owns every coordinate that comes out of it.

The point is that the compiler can then be held to a standard no hand-built
geometry meets. Across the 9 authored levels and 110 traced maps in this repo,
the compiled output has **0 coplanar-same-normal face pairs and 0 intersecting
volumes**, and its navmesh is **100% reachable with 0 playable islands**. A
naive build of the identical specs — each box individually watertight, correctly
wound, and passing every half-space test — produces hundreds of both.

```
spec (JSON or a drawn plan)
  → compile()        11 passes; every coordinate decided here
  → validate()       geometry, navigation, tactical gates
  → bakeNavmesh()    independent re-derivation from the solids
  → geometry / OBJ / Quake .map / OpenSCAD / CadQuery / DXF / SVG
```

## Drawing a map

Writing a LevelSpec by hand means converting shapes into rectangles in your
head, and you cannot tell whether you got it right until you compile and walk
it. So there is a layer above: you draw the map, one character per cell.

```
layer ground z=0 height=5 roof=no

legend
  T  t_spawn   "T Spawn"   spawn
  L  long_a    "Long A"    lane   +0.8
  /  ramp_up   "Ramp"      ramp
end

plan
##################
#TTTTTT#####LLLLL#
#TTTTTT///////LLL#
##################
end
```

Two rules do most of the work:

- A letter is floor; `#`, `.` and space are not.
- **Where two different areas touch, that is a doorway** — exactly as wide as
  the run of cells that touch. Where they do not touch, there is a wall.

Openings need no declaration, because a gap you draw in a wall *is* the
opening. Areas are not rectangles either — each letter's cells are decomposed
into maximal rectangles on the way out, so an L-shaped site costs nothing.

## The map library

`maps/cs/` holds 110 real competitive layouts. Their footprints are traced
from published radar images (`reference/radars/`), their elevation comes from
the radar's own shading, and every one of them passes the same gates as a
hand-authored level.

```bash
node tools/trace_radar.py "reference/radars/Mirage/Mirage - Radar.png" \
    --cells 46 --bands 3 --out maps/traced/mirage.plan   # footprint
node tools/finalize.ts                                    # elevation + gates
node tools/plans.ts                                       # compile + report
```

These are **topology reconstructions, not measured copies** — proportions are
approximate, and no assets, textures, models or map files from any shipped game
are used or reproduced. The radar images are kept as provenance for the traces.

## Commands

```bash
npm run compile   # build + validate every authored level, write artifacts
npm run gen       # the procedural generator, still used as a fallback
npm test          # 114 assertions
```

## Why it holds together

Two rules, applied everywhere:

- **One owner per boundary edge.** A wall between two rooms belongs to exactly
  one of them. Overlaps are impossible rather than cleaned up afterwards.
- **One owner per junction square** — the same rule, one dimension down.

Everything else follows. Ramps inset for a wall that already exists rather than
burying a stringer inside it; risers seal every open elevation change so you
cannot walk off a ledge into the void; a flight's ends live in the two areas it
joins so the compiler can read their real heights.

The validators are not warnings. `generateLevel` and `loadAuthored` both throw
rather than hand back a level that fails one, so a broken floor cannot reach a
player.
