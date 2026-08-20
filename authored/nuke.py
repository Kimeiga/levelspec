"""
Nuke — the meaning, laid over two registered radars.

Nuke is the only map in the set whose radar comes in two sheets, and the whole
character of the place is that they are the same building: a concrete plant
with a reactor hall upstairs, a second hall directly beneath it, and a yard
wrapped round the outside that you fight across to get in. Flatten it to one
storey and it stops being Nuke.

The two sheets are traced from the same 1024-pixel canvas rather than each
cropped to its own content, so cell (x, y) is the same place on both. That is
what makes it safe to say "the stairs come up here": the lower level's Ramp
Room really is under the yard, and A Site really is over B Site.

Elevations climb inward and upward — yard at zero, the halls a step up, Silo
and Toxic above those — and the lower layer sits five metres down, so the floor
you are standing on in A Site is the ceiling of B Site.
"""

ID = "cs_nuke"
NAME = "Nuke"
DESCRIPTION = (
    "Nuke. Footprint traced from the published upper and lower radars, then "
    "annotated by hand with the callouts, elevations and cover the radars "
    "cannot carry. A topology reconstruction - proportions are approximate and "
    "no assets from the shipped game are used."
)
WALL_THICKNESS = 0.36

# The lower hall is a full storey down, and its ceiling is the upper hall's
# floor — which is why its height plus a slab has to clear the drop exactly.
LAYERS = [
    {"id": "main", "traced": "nuke_upper", "z": 0.0, "height": 6.4, "roof": False},
    {"id": "lower", "traced": "nuke_lower", "z": -5.0, "height": 4.3, "roof": False},
]

AREAS = [
    # --- the yard, all at grade ---------------------------------------------
    {"id": "t_spawn", "label": "T Spawn", "role": "spawn", "z": 0.0, "ceiling": 7.6,
     "seeds": [(4, 21, 3, 3)]},
    {"id": "road", "label": "Road", "role": "corridor", "z": 0.0, "ceiling": 5.4,
     "seeds": [(14, 21, 4, 2)]},
    {"id": "yard", "label": "Yard", "role": "lane", "z": 0.0, "ceiling": 8.6,
     "seeds": [(18, 20, 3, 1), (19, 19, 2, 1)]},
    {"id": "trophy", "label": "Trophy", "role": "lane", "z": 0.0, "ceiling": 8.6,
     "seeds": [(26, 14, 4, 2)]},
    {"id": "outside_east", "label": "Outside", "role": "lane", "z": 0.0, "ceiling": 8.6,
     "seeds": [(34, 20, 3, 2)]},
    {"id": "arch", "label": "Arch", "role": "corridor", "z": 0.35, "ceiling": 5.0,
     "seeds": [(38, 25, 3, 2)]},
    {"id": "ct_spawn", "label": "CT Spawn", "role": "spawn", "z": 0.35, "ceiling": 7.6,
     "seeds": [(43, 23, 3, 3)]},
    {"id": "garage", "label": "Garage", "role": "room", "z": 0.0, "ceiling": 5.6,
     "seeds": [(34, 14, 3, 3)]},

    # --- the plant, a step up -----------------------------------------------
    {"id": "squeaky", "label": "Squeaky", "role": "corridor", "z": 0.35, "ceiling": 3.6,
     "seeds": [(20, 25, 2, 2)]},
    {"id": "mini", "label": "Mini Office", "role": "room", "z": 0.35, "ceiling": 4.2,
     "seeds": [(21, 22, 3, 2)]},
    {"id": "a_site", "label": "A Site", "role": "site", "z": 0.35, "ceiling": 9.4,
     "seeds": [(26, 23, 4, 3)]},
    {"id": "hut", "label": "Hut", "role": "room", "z": 0.35, "ceiling": 4.0,
     "seeds": [(32, 23, 2, 2)]},
    {"id": "heaven", "label": "Heaven", "role": "balcony", "z": 0.7, "ceiling": 4.6,
     "seeds": [(32, 26, 2, 1)]},

    # --- the north stack ----------------------------------------------------
    {"id": "silo", "label": "Silo", "role": "room", "z": 0.7, "ceiling": 8.2,
     "seeds": [(26, 29, 4, 2)]},
    {"id": "toxic", "label": "Toxic", "role": "room", "z": 1.05, "ceiling": 5.2,
     "seeds": [(26, 32, 3, 2)]},

    # --- five metres down ---------------------------------------------------
    {"id": "b_site", "label": "B Site", "role": "site", "layer": "lower", "z": 0.0,
     "ceiling": 4.3, "seeds": [(26, 21, 3, 3)]},
    {"id": "vents", "label": "Vents", "role": "corridor", "layer": "lower", "z": 0.0,
     "ceiling": 2.6, "seeds": [(25, 17, 4, 1)]},
    {"id": "ramp_room", "label": "Ramp Room", "role": "lane", "layer": "lower", "z": 0.0,
     "ceiling": 4.0, "seeds": [(31, 22, 2, 2)]},
    {"id": "control", "label": "Control Room", "role": "room", "layer": "lower", "z": 0.35,
     "ceiling": 3.4, "seeds": [(26, 29, 3, 2)]},
    {"id": "t_roll", "label": "T Roll", "role": "corridor", "layer": "lower", "z": 0.0,
     "ceiling": 3.0, "seeds": [(31, 15, 2, 2)]},
    {"id": "dome", "label": "Dome", "role": "room", "layer": "lower", "z": 0.35,
     "ceiling": 4.2, "seeds": [(26, 32, 3, 2)]},
]

RAMPS = []

COVER = [
    {"id": "a_reactors", "label": "Reactors", "height": 1.9, "as": "barrel",
     "at": [(26, 23, 2, 2)]},
    {"id": "yard_tank", "label": "Tank", "height": 2.3, "as": "barrel",
     "at": [(22, 16, 2, 2)]},
    {"id": "garage_crates", "label": "Crates", "height": 1.4, "as": "crate",
     "at": [(34, 14, 2, 2)]},
    {"id": "ct_truck", "label": "Truck", "height": 1.7, "as": "vehicle",
     "at": [(43, 24, 2, 2)]},
    {"id": "trophy_containers", "label": "Containers", "height": 1.6, "as": "crate",
     "at": [(27, 13, 2, 1)]},
    {"id": "b_crates", "label": "Crates", "height": 1.4, "as": "crate",
     "layer": "lower", "at": [(26, 22, 2, 2)]},
]

PORTALS = [
    {"between": ("mini", "squeaky"), "kind": "door", "width": 2},
    {"between": ("hut", "a_site"), "kind": "door", "width": 2},
    {"between": ("garage", "trophy"), "kind": "arch", "width": 3},
    {"between": ("silo", "toxic"), "kind": "arch", "width": 3},
    {"between": ("ramp_room", "b_site"), "kind": "arch", "width": 3},
    {"between": ("t_roll", "vents"), "kind": "door", "width": 2},
]

# The three ways between the storeys.
#
# A flight is a physical run, not a teleport: every cell it crosses has to be
# floor on the lower layer and one single space on the upper, because the hole
# it punches removes the floor above but leaves the walls standing. So each of
# these is chosen to lie inside one room on both sheets at once — which is also
# why they land where they do, and why the wide one is the only wide one.
STAIRS = [
    # The broad flight, straight up out of B Site into the middle of A Site.
    {"id": "vent_stairs", "kind": "stairs", "from": "lower", "from_at": (28, 21),
     "to": "main", "to_at": (28, 25), "width": 2.84},
    # And a single-file climb out of Vents into the open yard south of the plant.
    {"id": "vents", "kind": "stairs", "from": "lower", "from_at": (25, 17),
     "to": "main", "to_at": (29, 17), "width": 1.42},
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
