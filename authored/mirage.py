"""
Mirage — the meaning, laid over the radar's geometry.

Whitewashed plaster and terracotta, and a map that is really three routes from
one end to the other: Palace and Ramp up the left to A, Apartments down to B,
and Mid through the middle with Connector feeding either side.

The four anchors are read straight off the radar's own markers — the two orange
boxes are the sites, the two green ones the spawns — and everything between
them is placed from those. Elevations are compressed: A and B are raised, Mid
sits low between them, and Connector steps up on its way across.
"""

ID = "cs_mirage"
NAME = "Mirage"
DESCRIPTION = (
    "Mirage. Footprint traced from the published radar, then annotated by hand "
    "with the callouts, elevations, ramps and cover the radar cannot carry. A "
    "topology reconstruction - proportions are approximate and no assets from "
    "the shipped game are used."
)
WALL_THICKNESS = 0.32
LAYER_HEIGHT = 6.0

AREAS = [
    # --- T side, low --------------------------------------------------------
    {"id": "t_spawn", "label": "T Spawn", "role": "spawn", "z": 0.0, "ceiling": 7.0,
     "seeds": [(10, 10, 4, 3)]},
    {"id": "apartments", "label": "Apartments", "role": "corridor", "z": 0.4, "ceiling": 4.2,
     "seeds": [(23, 12, 3, 3)]},
    {"id": "short", "label": "Short", "role": "corridor", "z": 0.4, "ceiling": 4.0,
     "seeds": [(13, 19, 3, 3)]},
    {"id": "underpass", "label": "Underpass", "role": "corridor", "z": 0.4, "ceiling": 3.6,
     "seeds": [(21, 18, 3, 3)]},

    # --- B, and its market --------------------------------------------------
    {"id": "b_site", "label": "B Site", "role": "site", "z": 0.8, "ceiling": 7.6,
     "seeds": [(18, 5, 5, 3)]},
    {"id": "market", "label": "Market", "role": "room", "z": 0.8, "ceiling": 5.4,
     "seeds": [(35, 8, 4, 3)]},

    # --- the left run up to A -----------------------------------------------
    {"id": "palace", "label": "Palace", "role": "lane", "z": 0.75, "ceiling": 7.8,
     "seeds": [(13, 25, 3, 3)]},
    {"id": "a_ramp", "label": "A Ramp", "role": "lane", "z": 1.1, "ceiling": 6.6,
     "seeds": [(22, 36, 4, 3)]},
    {"id": "a_site", "label": "A Site", "role": "site", "z": 1.45, "ceiling": 8.4,
     "seeds": [(5, 35, 5, 3)]},

    # --- mid, the spine -----------------------------------------------------
    {"id": "mid", "label": "Mid", "role": "lane", "z": 0.4, "ceiling": 7.4,
     "seeds": [(24, 24, 4, 3)]},
    {"id": "top_mid", "label": "Top Mid", "role": "lane", "z": 0.75, "ceiling": 6.8,
     "seeds": [(30, 22, 3, 2)]},
    {"id": "connector", "label": "Connector", "role": "corridor", "z": 1.1, "ceiling": 4.4,
     "seeds": [(29, 27, 4, 2)]},
    {"id": "jungle", "label": "Jungle", "role": "lane", "z": 1.1, "ceiling": 5.6,
     "seeds": [(32, 29, 3, 2)]},

    # --- CT side, raised ----------------------------------------------------
    {"id": "ct_spawn", "label": "CT Spawn", "role": "spawn", "z": 1.45, "ceiling": 7.0,
     "seeds": [(41, 29, 4, 3)]},
    {"id": "ct_mid", "label": "CT Mid", "role": "lane", "z": 1.45, "ceiling": 6.4,
     "seeds": [(36, 36, 4, 3)]},
    {"id": "window", "label": "Window", "role": "balcony", "z": 1.1, "ceiling": 4.6,
     "seeds": [(36, 14, 2, 2)]},
    {"id": "catwalk", "label": "Catwalk", "role": "balcony", "z": 1.1, "ceiling": 5.0,
     "seeds": [(38, 18, 4, 2)]},
    {"id": "stairs", "label": "Stairs", "role": "stairwell", "z": 1.45, "ceiling": 4.8,
     "seeds": [(43, 21, 2, 2)]},
]

RAMPS = []

COVER = [
    {"id": "a_boxes", "label": "Boxes", "height": 1.4, "as": "crate",
     "at": [(7, 36, 2, 2), (12, 34, 2, 1)]},
    {"id": "b_van", "label": "Van", "height": 1.7, "as": "vehicle",
     "at": [(19, 6, 3, 2)]},
    {"id": "mid_crates", "label": "Crates", "height": 1.3, "as": "crate",
     "at": [(24, 25, 2, 2)]},
    {"id": "market_stall", "label": "Stall", "height": 1.2, "as": "crate",
     "at": [(36, 9, 2, 2)]},
    {"id": "t_crates", "label": "Crates", "height": 1.3, "as": "crate",
     "at": [(10, 11, 2, 2)]},
]

# Chosen for boundaries a single cut can close cleanly. Apartments/B and
# Underpass/Mid both meet along a run where any narrower opening strands a
# few cells behind the closure, so those two stay open arches in the geometry
# rather than framed ones.
PORTALS = [
    {"between": ("t_spawn", "apartments"), "kind": "arch", "width": 3},
    {"between": ("connector", "jungle"), "kind": "door", "width": 2},
    {"between": ("short", "palace"), "kind": "arch", "width": 3},
    {"between": ("mid", "top_mid"), "kind": "arch", "width": 3},
    {"between": ("catwalk", "stairs"), "kind": "door", "width": 2},
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
