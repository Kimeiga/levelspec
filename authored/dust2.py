"""
Dust II — the meaning, laid over the radar's geometry.

The footprint comes from `maps/cs/dust_ii.plan`, which the tracer read off the
published radar at 91% IoU. Everything here is what the radar cannot carry:
which area is which callout, how high each one sits, how tall its ceiling is,
where the ramps are and where the crates are.

Seeds are rough on purpose. Each is a small rectangle somewhere inside its
area, and every floor cell is then assigned to the nearest seed by walking
distance, so regions grow down corridors and stop at walls on their own. The
job is to say *where Catwalk is*, not to trace its outline.

Elevations are relative and compressed: the real map's drops are larger than
anything you want to fall down repeatedly, and every neighbouring pair here is
either within a stride or joined by a ramp.
"""

ID = "cs_dust2"
NAME = "Dust II"
DESCRIPTION = (
    "Dust II. Footprint traced from the published radar, then annotated by hand "
    "with the callouts, elevations, ramps and cover the radar cannot carry. A "
    "topology reconstruction - proportions are approximate and no assets from "
    "the shipped game are used."
)
WALL_THICKNESS = 0.36
LAYER_HEIGHT = 6.5

# id, label, role, elevation, ceiling height, seed rectangles (x, y, w, h)
# with y counting up from the south edge, as the radar reads.
AREAS = [
    # --- T side, low and open ------------------------------------------------
    {"id": "t_spawn", "label": "T Spawn", "role": "spawn", "z": 0.0, "ceiling": 7.2,
     "seeds": [(14, 3, 5, 3)]},
    {"id": "outside_tunnels", "label": "Outside Tunnels", "role": "lane", "z": 0.0, "ceiling": 6.0,
     "seeds": [(4, 5, 4, 3)]},
    {"id": "t_ramp", "label": "T Ramp", "role": "lane", "z": 0.35, "ceiling": 6.4,
     "seeds": [(25, 4, 4, 3)]},

    # --- Mid, the spine ------------------------------------------------------
    {"id": "t_mid", "label": "T Mid", "role": "lane", "z": 0.0, "ceiling": 7.6,
     "seeds": [(21, 8, 3, 3)]},
    {"id": "mid_doors", "label": "Mid Doors", "role": "corridor", "z": 0.35, "ceiling": 3.6,
     "seeds": [(19, 13, 2, 2)]},
    {"id": "mid", "label": "Mid", "role": "lane", "z": 0.35, "ceiling": 7.8,
     "seeds": [(19, 17, 3, 4)]},
    {"id": "catwalk", "label": "Catwalk", "role": "balcony", "z": 0.7, "ceiling": 5.0,
     "seeds": [(19, 27, 3, 2)]},
    {"id": "ct_mid", "label": "CT Mid", "role": "lane", "z": 1.05, "ceiling": 6.2,
     "seeds": [(28, 34, 3, 2)]},
    {"id": "ct_spawn", "label": "CT Spawn", "role": "spawn", "z": 1.4, "ceiling": 7.0,
     "seeds": [(30, 38, 4, 3)]},

    # --- Long, up the east side ----------------------------------------------
    {"id": "outside_long", "label": "Outside Long", "role": "lane", "z": 0.7, "ceiling": 7.4,
     "seeds": [(38, 16, 4, 3)]},
    {"id": "long_a", "label": "Long A", "role": "lane", "z": 0.7, "ceiling": 7.0,
     "seeds": [(40, 24, 4, 4)]},
    {"id": "pit", "label": "Pit", "role": "lane", "z": -0.75, "ceiling": 5.0,
     "seeds": [(31, 24, 3, 3)]},
    {"id": "long_corner", "label": "Long Corner", "role": "lane", "z": 0.7, "ceiling": 6.0,
     "seeds": [(40, 33, 3, 3)]},

    # --- A, raised -----------------------------------------------------------
    {"id": "a_site", "label": "A Site", "role": "site", "z": 1.4, "ceiling": 8.2,
     "seeds": [(36, 41, 4, 3)]},
    {"id": "a_cross", "label": "A Cross", "role": "lane", "z": 1.05, "ceiling": 6.4,
     "seeds": [(31, 37, 3, 2)]},
    {"id": "a_short", "label": "A Short", "role": "corridor", "z": 1.05, "ceiling": 4.4,
     "seeds": [(26, 30, 3, 3)]},

    # --- B, and the way there ------------------------------------------------
    {"id": "mid_to_b", "label": "Mid to B", "role": "corridor", "z": 0.35, "ceiling": 4.2,
     "seeds": [(13, 20, 3, 2)]},
    {"id": "lower_tunnels", "label": "Lower Tunnels", "role": "corridor", "z": 0.0, "ceiling": 4.4,
     "seeds": [(5, 14, 4, 3)]},
    {"id": "upper_tunnels", "label": "Upper Tunnels", "role": "corridor", "z": 0.35, "ceiling": 4.6,
     "seeds": [(3, 27, 4, 2)]},
    {"id": "b_doors", "label": "B Doors", "role": "corridor", "z": 1.05, "ceiling": 4.0,
     "seeds": [(12, 39, 3, 2)]},
    {"id": "b_site", "label": "B Site", "role": "site", "z": 0.7, "ceiling": 7.4,
     "seeds": [(5, 42, 4, 3)]},
    {"id": "b_plat", "label": "Back Plat", "role": "site", "z": 1.05, "ceiling": 5.4,
     "seeds": [(2, 45, 3, 2)]},
]

# Ramps, where the drop is more than a stride. Each strip's long axis is the
# direction it climbs, and the areas at either end set the slope.
RAMPS = [
    {"id": "pit_ramp", "label": "Ramp to Pit", "at": [(34, 26, 3, 2)]},
    {"id": "a_ramp", "label": "Ramp to A", "at": [(39, 38, 2, 4)]},
]

# Crates and barrels, standing in whichever area the flood assigned them.
COVER = [
    {"id": "a_boxes", "label": "Boxes", "height": 1.5, "as": "crate",
     "at": [(37, 43, 2, 2), (40, 40, 2, 1)]},
    {"id": "b_barrels", "label": "Barrels", "height": 1.2, "as": "barrel",
     "at": [(4, 44, 2, 1), (8, 41, 2, 1)]},
    {"id": "mid_car", "label": "Car", "height": 1.3, "as": "vehicle",
     "at": [(20, 18, 2, 2)]},
    {"id": "long_crate", "label": "Long Crate", "height": 1.4, "as": "crate",
     "at": [(41, 27, 2, 2)]},
    {"id": "t_crates", "label": "Crates", "height": 1.3, "as": "crate",
     "at": [(12, 4, 2, 2), (18, 2, 2, 2)]},
]

DIRECTIVES = [
    'mark attacker_spawn t_spawn attack "T Spawn"',
    'mark defender_spawn ct_spawn defend "CT Spawn"',
    'mark site a_site neutral "A"',
    'mark site b_site neutral "B"',
    "",
    "route t_spawn a_site 2",
    "route t_spawn b_site 2",
]
