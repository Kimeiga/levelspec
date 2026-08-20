#!/usr/bin/env python3
"""
Dust II, authored by hand.

Not traced. Every area below is named for the callout people actually use,
placed where it belongs relative to the others, and given the elevation it has
in the real map — T spawn low, the long stretch a step above it, the pit sunk
below that, both bomb sites raised. The ramps are where the ramps are.

The regions are written as rectangles here and rasterised into the plan grid,
which is the same thing as drawing the ASCII by hand and considerably less
error-prone than typing forty-four rows of it. What makes this bespoke is not
the file format — it is that a person decided Catwalk connects Mid to A Short
and sits eight tenths of a metre up, rather than a k-means deciding it.

    python3 tools/author_dust2.py > maps/hand/dust2.plan
"""

W, H = 40, 44
GRID = 2.2  # metres per cell -> an 88 x 97 m map, about right for Dust II

# char, id, label, role, elevation, ceiling, and the rectangles it occupies.
# Rectangles are (x, y, w, h) with y measured from the south edge, so the
# layout below reads the same way up as the radar does.
AREAS = [
    # --- T side --------------------------------------------------------------
    ("T", "t_spawn", "T Spawn", "spawn", 0.0, 7.0, [(12, 1, 16, 6)]),
    ("N", "outside_tunnels", "Outside Tunnels", "lane", 0.0, 6.4, [(7, 7, 9, 5)]),
    ("m", "t_mid", "T Mid", "lane", 0.0, 7.2, [(15, 8, 7, 6)]),
    ("R", "t_ramp", "T Ramp", "lane", 0.4, 6.6, [(28, 6, 7, 4)]),

    # --- Long ----------------------------------------------------------------
    ("O", "outside_long", "Outside Long", "lane", 0.8, 7.4, [(30, 10, 8, 6)]),
    ("D", "long_doors", "Long Doors", "corridor", 0.8, 4.2, [(32, 16, 6, 3)]),
    ("L", "long_a", "Long A", "lane", 0.8, 7.0, [(32, 19, 6, 10)]),
    ("P", "pit", "Pit", "lane", -0.9, 5.2, [(26, 20, 6, 7)]),
    ("C", "long_corner", "Long Corner", "lane", 0.8, 6.0, [(32, 29, 6, 4)]),

    # --- A ------------------------------------------------------------------
    ("A", "a_site", "A Site", "site", 1.7, 8.0, [(26, 33, 12, 8)]),
    ("X", "a_cross", "A Cross", "lane", 1.3, 6.4, [(22, 32, 4, 5)]),
    ("S", "a_short", "A Short", "corridor", 1.3, 4.6, [(21, 26, 4, 6)]),
    ("K", "catwalk", "Catwalk", "balcony", 0.9, 5.4, [(18, 22, 6, 4)]),

    # --- Mid ----------------------------------------------------------------
    ("d", "mid_doors", "Mid Doors", "corridor", 0.4, 3.8, [(16, 14, 5, 3)]),
    ("M", "mid", "Mid", "lane", 0.4, 7.6, [(16, 17, 5, 9)]),
    ("p", "top_mid", "Top Mid", "lane", 0.8, 6.8, [(16, 26, 5, 5)]),
    ("E", "ct_mid", "CT Mid", "lane", 1.3, 6.4, [(15, 31, 7, 5)]),
    ("Z", "ct_spawn", "CT Spawn", "spawn", 1.7, 7.4, [(14, 36, 12, 6)]),

    # --- B ------------------------------------------------------------------
    ("W", "mid_to_b", "Mid to B", "corridor", 0.4, 4.4, [(11, 20, 5, 4)]),
    ("u", "lower_tunnels", "Lower Tunnels", "corridor", 0.0, 4.6, [(6, 14, 7, 10)]),
    ("U", "upper_tunnels", "Upper Tunnels", "corridor", 0.4, 4.8, [(6, 24, 7, 6)]),
    ("B", "b_doors", "B Doors", "corridor", 1.2, 4.0, [(11, 34, 4, 4)]),
    ("b", "b_site", "B Site", "site", 0.85, 7.2, [(3, 30, 9, 8)]),
    ("G", "b_plat", "Back Plat", "site", 1.2, 5.6, [(3, 38, 6, 3)]),
]

# Ramps: a strip that climbs between two areas. Drawn where the real map has
# one, and the compiler works out the slope from the areas at either end.
RAMPS = [
    ("/", "pit_ramp", "Pit Ramp", [(32, 23, 3, 2)]),      # Long down into Pit
    # North-south, so it actually crosses the boundary: its south end sits in
    # Long Corner and its north end in the site above.
    ("\\", "a_ramp", "Ramp to A", [(33, 31, 2, 4)]),       # Long Corner up to A
]

# Cover: crates and barrels, standing inside whatever area surrounds them.
COVER = [
    ("x", "a_boxes", "Boxes", 1.5, [(29, 35, 2, 2), (34, 38, 2, 1)]),
    ("o", "b_barrels", "Barrels", 1.2, [(6, 33, 2, 2), (9, 36, 1, 1)]),
    ("c", "mid_car", "Car", 1.3, [(17, 20, 2, 3)]),
    ("k", "long_crate", "Long Crate", 1.4, [(34, 25, 2, 2)]),
    ("t", "t_crates", "Crates", 1.3, [(16, 3, 2, 2), (23, 4, 2, 2)]),
]


def paint(grid, rects, ch):
    for (x, y, w, h) in rects:
        for j in range(y, y + h):
            for i in range(x, x + w):
                if 0 <= i < W and 0 <= j < H:
                    grid[j][i] = ch


def main():
    grid = [["." for _ in range(W)] for _ in range(H)]
    for ch, _id, _label, _role, _z, _ceil, rects in AREAS:
        paint(grid, rects, ch)
    for ch, _id, _label, rects in RAMPS:
        paint(grid, rects, ch)
    for ch, _id, _label, _h, rects in COVER:
        paint(grid, rects, ch)

    out = []
    out.append("id: cs_dust2_hand")
    out.append("name: Dust II")
    out.append(
        "description: Dust II, authored by hand rather than traced. Every area "
        "carries the callout it is known by, at the elevation it has in the "
        "original, with ramps where the ramps are. A topology reconstruction "
        "from public knowledge of the layout - proportions are approximate and "
        "no assets from the shipped game are used."
    )
    out.append(f"grid: {GRID}")
    out.append("wall_thickness: 0.36")
    out.append("")
    out.append("layer ground z=0 height=6.5 roof=no")
    out.append("")
    out.append("legend")
    for ch, aid, label, role, z, ceil, _ in AREAS:
        zs = f"  {z:+.2f}" if z else ""
        out.append(f'  {ch}  {aid:<17} "{label}"  {role}{zs}  h={ceil}')
    for ch, aid, label, _ in RAMPS:
        out.append(f'  {ch}  {aid:<17} "{label}"  ramp')
    for ch, aid, label, h, _ in COVER:
        out.append(f'  {ch}  {aid:<17} "{label}"  cover={h} as=crate')
    out.append("end")
    out.append("")
    out.append("plan")
    # Row 0 of the plan is the north edge, and y counts up from the south.
    for j in range(H - 1, -1, -1):
        out.append("".join(grid[j]).rstrip())
    out.append("end")
    out.append("")
    out.append("mark attacker_spawn t_spawn attack \"T Spawn\"")
    out.append("mark defender_spawn ct_spawn defend \"CT Spawn\"")
    out.append("mark site a_site neutral \"A\"")
    out.append("mark site b_site neutral \"B\"")
    out.append("")
    out.append("route t_spawn a_site 2")
    out.append("route t_spawn b_site 2")
    print("\n".join(out))


if __name__ == "__main__":
    main()
