"""
Train — the meaning, laid over the radar's geometry.

A rail depot: two sheds full of rolling stock with a yard above them and a
connector down the far side. The trains are the map — every angle on both sites
is an angle past a wagon — so they are the cover, laid out where the radar's own
coloured slabs put them.

Elevations run downhill from the T end: the upper yard is highest, Ivy and
Popdog step down through the middle, B sits between, and A Site is the low hall
at the bottom with the CT side raised again on the far right.
"""

ID = "cs_train"
NAME = "Train"
DESCRIPTION = (
    "Train. Footprint traced from the published radar, then annotated by hand "
    "with the callouts, elevations and rolling stock the radar cannot carry. A "
    "topology reconstruction - proportions are approximate and no assets from "
    "the shipped game are used."
)
WALL_THICKNESS = 0.34
LAYER_HEIGHT = 6.6

AREAS = [
    # --- the yard, highest --------------------------------------------------
    {"id": "t_spawn", "label": "T Spawn", "role": "spawn", "z": 1.4, "ceiling": 7.4,
     "seeds": [(2, 38, 4, 2)]},
    {"id": "upper_yard", "label": "Upper", "role": "lane", "z": 1.4, "ceiling": 8.6,
     "seeds": [(20, 40, 4, 2)]},
    {"id": "t_con", "label": "T Connector", "role": "corridor", "z": 1.05, "ceiling": 4.6,
     "seeds": [(27, 38, 2, 2)]},

    # --- the left-hand descent ----------------------------------------------
    {"id": "ivy", "label": "Ivy", "role": "lane", "z": 1.05, "ceiling": 6.4,
     "seeds": [(15, 33, 4, 3)]},
    {"id": "popdog", "label": "Popdog", "role": "corridor", "z": 0.7, "ceiling": 4.2,
     "seeds": [(17, 24, 3, 3)]},
    {"id": "ladder", "label": "Ladder Room", "role": "stairwell", "z": 0.35, "ceiling": 5.0,
     "seeds": [(11, 16, 4, 2)]},

    # --- B, the upper shed ---------------------------------------------------
    {"id": "b_site", "label": "B Site", "role": "site", "z": 0.7, "ceiling": 8.6,
     "seeds": [(25, 25, 5, 4)]},
    {"id": "b_halls", "label": "Halls", "role": "lane", "z": 0.7, "ceiling": 6.4,
     "seeds": [(21, 20, 4, 2)]},

    # --- the CT side, raised -------------------------------------------------
    {"id": "z", "label": "Z", "role": "corridor", "z": 1.05, "ceiling": 4.4,
     "seeds": [(39, 30, 3, 2)]},
    {"id": "connector", "label": "Connector", "role": "corridor", "z": 1.05, "ceiling": 4.8,
     "seeds": [(37, 26, 3, 3)]},
    {"id": "ct_spawn", "label": "CT Spawn", "role": "spawn", "z": 1.05, "ceiling": 7.4,
     "seeds": [(43, 21, 3, 3)]},
    {"id": "ct_ramp", "label": "Ramp", "role": "lane", "z": 0.7, "ceiling": 5.6,
     "seeds": [(45, 18, 2, 2)]},

    # --- A, the low hall -----------------------------------------------------
    {"id": "a_site", "label": "A Site", "role": "site", "z": 0.0, "ceiling": 9.2,
     "seeds": [(28, 7, 6, 4)]},
    {"id": "a_main", "label": "Main Hall", "role": "lane", "z": 0.0, "ceiling": 8.2,
     "seeds": [(23, 10, 4, 2)]},
    {"id": "electrical", "label": "Electrical", "role": "room", "z": 0.35, "ceiling": 5.2,
     "seeds": [(43, 6, 4, 3)]},
    {"id": "a_ramp", "label": "A Ramp", "role": "lane", "z": 0.35, "ceiling": 5.4,
     "seeds": [(12, 7, 4, 4)]},
    {"id": "alley", "label": "Alley", "role": "corridor", "z": 0.35, "ceiling": 4.6,
     "seeds": [(16, 0, 4, 2)]},
]

RAMPS = []

# The rolling stock, read off the radar's own coloured slabs. A wagon is cover
# you cannot see over and cannot shoot through, which is what gives both sites
# their angles.
COVER = [
    {"id": "blue_train", "label": "Blue Train", "height": 1.9, "as": "vehicle",
     "at": [(23, 9, 6, 1)]},
    {"id": "red_train", "label": "Red Train", "height": 1.9, "as": "vehicle",
     "at": [(30, 9, 6, 1)]},
    {"id": "yellow_train", "label": "Yellow Train", "height": 1.9, "as": "vehicle",
     "at": [(23, 6, 6, 1)]},
    {"id": "orange_train", "label": "Orange Train", "height": 1.9, "as": "vehicle",
     "at": [(26, 3, 6, 1)]},
    {"id": "bomb_train", "label": "Bomb Train", "height": 1.9, "as": "vehicle",
     "at": [(23, 27, 5, 1)]},
    {"id": "b_wagon", "label": "Wagon", "height": 1.9, "as": "vehicle",
     "at": [(29, 24, 5, 1)]},
    {"id": "b_flat", "label": "Flatbed", "height": 1.3, "as": "crate",
     "at": [(24, 22, 5, 1)]},
    {"id": "green_boxes", "label": "Green Boxes", "height": 1.4, "as": "crate",
     "at": [(43, 7, 2, 2)]},
]

PORTALS = [
    {"between": ("popdog", "ivy"), "kind": "door", "width": 2},
    {"between": ("ladder", "popdog"), "kind": "door", "width": 2},
    {"between": ("connector", "z"), "kind": "arch", "width": 3},
    {"between": ("electrical", "a_site"), "kind": "door", "width": 2},
    {"between": ("alley", "a_ramp"), "kind": "arch", "width": 3},
    {"between": ("t_con", "upper_yard"), "kind": "arch", "width": 3},
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
