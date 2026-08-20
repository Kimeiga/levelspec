"""
Inferno — the meaning, laid over the radar's geometry.

Cream stucco and red tile. Two routes that barely speak to each other: Banana
up the near side to B, and Mid through the middle to Arch and A, with Apartments
and Library feeding the site from the CT end.

Anchors come from the radar's own markers — the orange boxes are the sites, the
green ones the spawns. Elevations are compressed and rise toward both sites,
which is the shape of the real map: you are always climbing toward the fight.
"""

ID = "cs_inferno"
NAME = "Inferno"
DESCRIPTION = (
    "Inferno. Footprint traced from the published radar, then annotated by hand "
    "with the callouts, elevations, ramps and cover the radar cannot carry. A "
    "topology reconstruction - proportions are approximate and no assets from "
    "the shipped game are used."
)
WALL_THICKNESS = 0.34
LAYER_HEIGHT = 6.2

AREAS = [
    # --- T side, lowest -----------------------------------------------------
    {"id": "t_spawn", "label": "T Spawn", "role": "spawn", "z": 0.0, "ceiling": 7.4,
     "seeds": [(2, 13, 3, 3)]},
    {"id": "t_ramp", "label": "T Ramp", "role": "lane", "z": 0.35, "ceiling": 6.6,
     "seeds": [(10, 11, 3, 3)]},
    {"id": "underpass", "label": "Underpass", "role": "corridor", "z": 0.0, "ceiling": 3.8,
     "seeds": [(32, 5, 4, 2)]},

    # --- Banana, and B ------------------------------------------------------
    {"id": "banana", "label": "Banana", "role": "lane", "z": 0.4, "ceiling": 7.0,
     "seeds": [(24, 7, 4, 3)]},
    {"id": "second_mid", "label": "Second Mid", "role": "lane", "z": 0.4, "ceiling": 6.4,
     "seeds": [(27, 10, 3, 3)]},
    {"id": "boiler", "label": "Boiler", "role": "room", "z": 0.75, "ceiling": 4.0,
     "seeds": [(33, 15, 3, 2)]},
    {"id": "b_site", "label": "B Site", "role": "site", "z": 1.1, "ceiling": 8.0,
     "seeds": [(40, 13, 4, 3)]},
    {"id": "banana_balcony", "label": "Balcony", "role": "balcony", "z": 1.1, "ceiling": 4.6,
     "seeds": [(42, 10, 3, 2)]},

    # --- Mid, climbing to A -------------------------------------------------
    {"id": "mid", "label": "Mid", "role": "lane", "z": 0.4, "ceiling": 7.2,
     "seeds": [(19, 23, 3, 2)]},
    {"id": "arch", "label": "Arch", "role": "corridor", "z": 0.75, "ceiling": 4.4,
     "seeds": [(25, 30, 3, 3)]},
    {"id": "a_site", "label": "A Site", "role": "site", "z": 1.1, "ceiling": 8.2,
     "seeds": [(22, 38, 4, 3)]},
    {"id": "apartments", "label": "Apartments", "role": "corridor", "z": 1.1, "ceiling": 4.2,
     "seeds": [(30, 38, 4, 3)]},
    {"id": "library", "label": "Library", "role": "room", "z": 1.1, "ceiling": 5.0,
     "seeds": [(40, 37, 4, 3)]},

    # --- CT side, highest ---------------------------------------------------
    {"id": "ct_spawn", "label": "CT Spawn", "role": "spawn", "z": 1.45, "ceiling": 7.0,
     "seeds": [(43, 30, 4, 3)]},
    {"id": "pit", "label": "Pit", "role": "lane", "z": 0.75, "ceiling": 5.2,
     "seeds": [(37, 27, 3, 2)]},
    {"id": "ruins", "label": "Ruins", "role": "lane", "z": 0.75, "ceiling": 6.0,
     "seeds": [(36, 20, 4, 2)]},
    {"id": "graveyard", "label": "Graveyard", "role": "lane", "z": 1.1, "ceiling": 6.6,
     "seeds": [(45, 22, 2, 2)]},
]

RAMPS = []

COVER = [
    {"id": "a_boxes", "label": "Boxes", "height": 1.4, "as": "crate",
     "at": [(21, 39, 2, 2)]},
    {"id": "b_crates", "label": "Crates", "height": 1.4, "as": "crate",
     "at": [(41, 14, 2, 2)]},
    {"id": "banana_car", "label": "Car", "height": 1.6, "as": "vehicle",
     "at": [(24, 8, 2, 2)]},
    {"id": "mid_barrels", "label": "Barrels", "height": 1.2, "as": "barrel",
     "at": [(19, 24, 2, 1)]},
    {"id": "t_crates", "label": "Crates", "height": 1.3, "as": "crate",
     "at": [(2, 14, 2, 2)]},
]

PORTALS = [
    {"between": ("arch", "a_site"), "kind": "arch", "width": 3},
    {"between": ("apartments", "a_site"), "kind": "door", "width": 2},
    {"between": ("library", "apartments"), "kind": "door", "width": 2},
    {"between": ("boiler", "b_site"), "kind": "door", "width": 2},
    {"between": ("banana", "second_mid"), "kind": "arch", "width": 3},
    {"between": ("pit", "ruins"), "kind": "arch", "width": 3},
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
