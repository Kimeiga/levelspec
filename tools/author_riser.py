"""
Riser, drawn rather than typed.

Every map in the library is horizontal: you cross it. This one you climb — an
office tower's top three floors, stacked in one column, with a lightwell cut
through them so that the floor you were on ten seconds ago is visible under
your feet from the one above it.

  python3 tools/author_riser.py       rewrites maps/hand/riser.plan
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
    """Text rows run north to south; the grid is Y-up."""
    return H - 1 - row


# ------------------------------------------------------------- level one, z=0
# Where you arrive: a lobby, a reception, and an office floor with a lightwell
# cut through it. The core is the tower's spine and every level has one.
one = blank()
rect(one, 'O', 4, 13, 30, 27)      # open plan, the whole west half
rect(one, 'L', 4, 4, 14, 12)       # lobby, where you arrive
rect(one, 'R', 15, 4, 30, 12)      # reception, between lobby and core
rect(one, 'A', 15, 16, 22, 21)     # the atrium, three storeys of it
rect(one, 'C', 31, 8, 38, 20)      # the core: stairs, all the way up
rect(one, 'S', 31, 21, 38, 27)     # the service bay behind it
one[8][8] = '0'
one[24][8] = '0'
one[25][27] = '0'
one[6][20] = '1'
one[11][26] = '1'

# --------------------------------------------------------- unfinished, z=+4.8
# The floor above, never finished: low kerbs instead of walls, the slab open to
# the sky, and a hole in the middle where the atrium comes up through it.
two = blank()
rect(two, 'U', 6, 10, 30, 26)      # the slab
rect(two, '.', 14, 15, 23, 22)     # the void, wider than the atrium below it
rect(two, 'C', 31, 8, 38, 20)      # the core again
rect(two, 'F', 31, 21, 38, 26)     # formwork: the one enclosed corner up here
two[12][10] = '2'
two[24][11] = '2'
two[24][27] = '2'
two[13][27] = '2'

# --------------------------------------------------------------- plant, z=+9.6
# The top: a plant deck, an open roof yard, and the head of the core.
three = blank()
rect(three, 'Y', 10, 4, 38, 11)    # roof yard
rect(three, 'P', 10, 12, 30, 24)   # plant deck
rect(three, 'C', 31, 8, 38, 20)    # the core, one last time
three[16][14] = '3'
three[20][24] = '3'
three[7][20] = '3'

PLAN = f'''id: og_riser
name: Riser
description: Riser. An original tower composed for this game, drawn as a section rather than a plan. The top three floors of an office building: a finished floor with an atrium cut through it, an unfinished slab above with kerbs where the walls should be, and a plant deck on the roof. You go up, not across.

grid: 1.6
wall_thickness: 0.28

layer one z=0 height=4.4 roof=no

legend
  L  lobby             "Lobby"  spawn  h=4.4
  R  reception         "Reception"  room  h=4.4
  O  open_plan         "Open Plan"  room  h=4.4
  A  atrium            "Atrium"  site  h=9.2
  C  core              "Core"  stairwell  h=4.4
  S  service_bay       "Service Bay"  room  h=4.4
  0  desk_banks        "Desks"  cover=1.1  as=crate
  1  reception_counter "Counter"  cover=1.2  as=crate
end

plan
{render(one)}
end

layer two z=4.8 height=4.4 roof=no

legend
  U  slab              "Slab"  site  h=1.2
  C  core_two          "Core Landing"  stairwell  h=4.4
  F  formwork          "Formwork"  room  h=4.4
  2  slab_pallets      "Pallets"  cover=1.2  as=crate
end

plan
{render(two)}
end

layer three z=9.6 height=3.6 roof=no

legend
  Y  roof_yard         "Roof Yard"  roof  h=1.4
  P  plant_deck        "Plant Deck"  room  h=3.6
  C  core_three        "Core Head"  stairwell  h=3.6
  3  plant_units       "Plant"  cover=1.8  as=barrel
end

plan
{render(three)}
end

wall reception lobby
door reception lobby 3
wall core reception
door core reception 3
wall service_bay core
door service_bay core 2
wall formwork core_two
door formwork core_two 2
wall plant_deck core_three
arch plant_deck core_three 3

stairs one 34,{Y(19)} -> two 34,{Y(13)} 3.0
stairs two 36,{Y(13)} -> three 36,{Y(19)} 3.0
stairs one 9,{Y(25)} -> two 9,{Y(20)} 3.0
stairs two 12,{Y(24)} -> three 12,{Y(18)} 3.0

mark attacker_spawn lobby attack "Lobby"
mark defender_spawn plant_deck defend "Plant"
mark site atrium neutral "Atrium"
mark site slab neutral "Slab"

route lobby atrium 2
route lobby slab 2
'''

if __name__ == '__main__':
    with open('maps/hand/riser.plan', 'w') as f:
        f.write(PLAN)
    print(f'wrote maps/hand/riser.plan ({len(PLAN)} bytes)')
