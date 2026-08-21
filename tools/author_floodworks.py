"""
Floodworks, drawn rather than typed.

A plan is a rectangular character grid and a legend, and forty-eight columns
by thirty-four rows is sixteen hundred characters that all have to line up. So
the map is written as a list of rectangles and the grid is painted from them —
which also means the design is legible as a design: the reservoir is one line,
the bridge is one line, and moving the culvert two metres south is an edit to a
number rather than to two hundred characters.

  python3 tools/author_floodworks.py       rewrites maps/hand/floodworks.plan
"""

W, H = 48, 34


def blank():
    return [['.' for _ in range(W)] for _ in range(H)]


def rect(g, ch, x0, y0, x1, y1):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            g[y][x] = ch


def render(g):
    return '\n'.join(''.join(r) for r in g)


def Y(row):
    """
    The y a text row lands on.

    Rows are written top-down and the grid is Y-up, so the first line of a plan
    is the north edge and the last is the south one. Every coordinate in the
    directives below is in grid space, not in row space, and getting that wrong
    puts a staircase in the middle of the air with no error until the compiler
    notices the endpoint is in no space at all.
    """
    return H - 1 - row


# ---------------------------------------------------------------- deck, z=0
# The public level. You arrive on the quay, walk a promenade the width of the
# map, and the only way over the water is through the gatehouse and out onto
# the bridge. Everything either side of the bridge is a hole.
deck = blank()
rect(deck, 'P', 4, 3, 43, 7)       # promenade: wide, legible, exposed
rect(deck, 'Q', 4, 3, 10, 9)       # quay: where you arrive
rect(deck, 'W', 4, 10, 9, 18)      # west core, down to the apron
# The east core is a shaft rather than a stairwell: it runs the height of the
# map's east edge and is the only thing linking all three levels, which is what
# makes the east side the route you take when you want to change your mind.
rect(deck, 'E', 38, 8, 43, 20)
rect(deck, 'G', 19, 8, 28, 12)     # gatehouse, straddling the gate itself
rect(deck, 'V', 21, 13, 26, 15)    # vestibule: the pinch before the release
rect(deck, 'B', 21, 16, 26, 26)    # the gate bridge, nineteen metres of it
rect(deck, 'S', 4, 27, 43, 30)     # south walk, the far side
rect(deck, 'M', 30, 24, 37, 26)    # muster, a pocket off the south end
deck[5][14] = '0'
deck[5][33] = '0'
deck[20][22] = '1'
deck[23][25] = '1'
deck[29][12] = '2'
deck[29][35] = '2'

# ------------------------------------------------------------- basin, z=-4.6
# The mechanical underworld. The reservoir is the open field the bridge
# crosses above; the culvert is the compressed, protected route along the
# south edge, and the only way between the two is one pressure door.
basin = blank()
rect(basin, 'R', 8, 12, 36, 25)    # the drained reservoir
rect(basin, 'A', 4, 10, 9, 18)     # apron, under the west core
rect(basin, 'H', 30, 8, 43, 18)    # pump hall, under the east core
rect(basin, 'U', 4, 27, 37, 29)    # culvert, the length of the map
rect(basin, 'D', 38, 22, 43, 29)   # drain head, where the culvert turns up
rect(basin, 'C', 17, 26, 22, 26)   # the pressure door's own short run
basin[16][14] = '3'
basin[20][24] = '3'
basin[21][29] = '3'
basin[11][35] = '4'
basin[12][40] = '4'
basin[28][10] = '5'
basin[28][28] = '5'

# ------------------------------------------------------------ gantry, z=+5.2
# Fast, exposed, and visible from everywhere below — which is the trade.
gantry = blank()
rect(gantry, 'I', 10, 18, 36, 20)  # the inspection run, across the basin
# Two rectangles rather than one: the head is set back from the run for its
# northern half, so the corner where the two meet is a real opening rather
# than a single quarter-metre cell reachable only on the diagonal.
rect(gantry, 'T', 38, 14, 42, 17)
rect(gantry, 'T', 37, 18, 42, 22)
rect(gantry, 'L', 4, 10, 9, 20)    # the west landing, over the west core
gantry[19][28] = '6'
gantry[19][16] = '6'

PLAN = f'''id: og_floodworks
name: Floodworks
description: Floodworks. An original flood-control district composed for this game. A low-lying quarter built around an automated pumping and floodgate system; the power has failed, the reservoir is half drained, and the only ways across are over the gate, under it, or along the inspection run above.

grid: 1.7
wall_thickness: 0.3

layer deck z=0 height=6.2 roof=no

legend
  Q  quay              "Quay"  spawn  h=6.0
  P  promenade         "Promenade"  lane  h=9.0
  G  gatehouse         "Gatehouse"  room  h=6.0
  V  vestibule         "Vestibule"  room  h=3.4
  B  gate_bridge       "Gate Bridge"  lane  h=4.4
  S  south_walk        "South Walk"  lane  h=8.6
  M  muster            "Muster"  room  h=5.0
  W  west_core         "West Core"  stairwell  h=6.2
  E  east_core         "East Core"  stairwell  h=6.2
  0  promenade_benches "Benches"  cover=1.0 as=crate
  1  bridge_kerbs      "Kerbs"  cover=1.1 as=crate
  2  walk_bollards     "Bollards"  cover=1.0 as=crate
end

plan
{render(deck)}
end

layer basin z=-5.0 height=4.3 roof=no

legend
  R  reservoir         "Reservoir"  site  h=4.3
  A  apron             "Apron"  lane  h=4.3
  H  pump_hall         "Pump Hall"  room  h=4.3
  U  culvert           "Culvert"  corridor  h=2.7
  C  pinch             "Pressure Door"  corridor  h=2.5
  D  drain_head        "Drain Head"  stairwell  h=4.3
  3  basin_silt        "Silt Banks"  cover=1.2 as=crate
  4  pump_gear         "Pump Gear"  cover=1.9 as=barrel
  5  culvert_valves    "Valves"  cover=1.0 as=barrel
end

plan
{render(basin)}
end

layer gantry z=6.6 height=3.0 roof=no

legend
  I  inspection        "Inspection Run"  balcony  h=3.0
  T  gantry_head       "Gantry Head"  room  h=3.0
  L  west_landing      "West Landing"  balcony  h=3.0
  6  gantry_rack       "Rack"  cover=0.9 as=crate
end

plan
{render(gantry)}
end

wall gatehouse promenade
door gatehouse promenade 3
wall gatehouse vestibule
door gatehouse vestibule 2
wall vestibule gate_bridge
arch vestibule gate_bridge 3
wall muster south_walk
arch muster south_walk 3
wall west_core quay
arch west_core quay 3
wall east_core promenade
arch east_core promenade 3
wall pinch culvert
door pinch culvert 2
wall pinch reservoir
door pinch reservoir 2
wall drain_head culvert
arch drain_head culvert 3

stairs basin 5,{Y(17)} -> deck 5,{Y(11)} 2.6
stairs basin 42,{Y(17)} -> deck 42,{Y(11)} 2.6
stairs deck 8,{Y(17)} -> gantry 8,{Y(12)} 2.6
stairs deck 39,{Y(13)} -> gantry 39,{Y(19)} 2.6
ladder basin 41,{Y(28)} -> deck 41,{Y(28)} 2.4
ladder deck 24,{Y(19)} -> gantry 24,{Y(19)} 2.2

mark attacker_spawn quay attack "Quay"
mark defender_spawn muster defend "Muster"
mark site reservoir neutral "Reservoir"
mark site gate_bridge neutral "Gate"

route quay reservoir 2
route quay gate_bridge 2
'''

if __name__ == '__main__':
    with open('maps/hand/floodworks.plan', 'w') as f:
        f.write(PLAN)
    print(f'wrote maps/hand/floodworks.plan ({len(PLAN)} bytes)')
