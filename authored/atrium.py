"""
Atrium — an original corporate campus, composed.

The other end of the library's range from Okujou: white, glazed, daylit, and
almost entirely orthogonal. It is the Mirror's Edge idea — one restrained
material everywhere and a single saturated colour used only where you are meant
to look — turned into a floorplan.

The shape is a courtyard building. A glazed hall runs the length of it, a plaza
wraps two sides, service corridors run behind, and the middle is a planted
courtyard you can see across through glass but have to walk round. That is the
same trick as Okujou's light well, and it is here for the same reason: a ring
is the most legible plan a shooter can have, because you always know there is
another way and never know which way they took.

The red is the only colour in the place, and it is on the things worth
contesting.
"""

ID = "og_atrium"
NAME = "Atrium"
DESCRIPTION = (
    "Atrium. An original corporate campus composed for this game: a glazed "
    "hall round a planted courtyard, a plaza on two sides, and service runs "
    "behind everything."
)
GRID = 1.7
WALL_THICKNESS = 0.26
LAYER_HEIGHT = 6.4
WIDTH = 42
HEIGHT = 38

AREAS = [
    # --- the plaza, outside and open ----------------------------------------
    {"id": "plaza", "label": "Plaza", "role": "lane", "z": 0.0, "ceiling": 9.5,
     "rects": [(3, 3, 36, 6), (3, 3, 6, 32)]},
    {"id": "steps", "label": "Steps", "role": "lane", "z": 0.35, "ceiling": 9.0,
     "rects": [(9, 9, 6, 4)]},
    {"id": "north_deck", "label": "North Deck", "role": "balcony", "z": 0.7, "ceiling": 9.0,
     "rects": [(9, 31, 30, 4)]},

    # --- the ring -------------------------------------------------------------
    {"id": "south_hall", "label": "South Hall", "role": "room", "z": 0.35, "ceiling": 6.8,
     "rects": [(9, 13, 30, 5)]},
    {"id": "west_hall", "label": "West Hall", "role": "room", "z": 0.35, "ceiling": 6.8,
     "rects": [(9, 13, 5, 18)]},
    {"id": "east_hall", "label": "East Hall", "role": "room", "z": 0.35, "ceiling": 6.8,
     "rects": [(34, 13, 5, 18)]},
    {"id": "north_hall", "label": "North Hall", "role": "site", "z": 0.35, "ceiling": 8.6,
     "rects": [(9, 26, 30, 5)]},

    # --- what the ring goes round --------------------------------------------
    {"id": "courtyard", "label": "Courtyard", "role": "lane", "z": 0.0, "ceiling": 9.5,
     "rects": [(14, 18, 20, 8)],
     "holes": [(17, 20, 14, 4)]},

    # --- behind it ------------------------------------------------------------
    {"id": "service", "label": "Service", "role": "corridor", "z": 0.35, "ceiling": 3.4,
     "rects": [(15, 9, 24, 4)]},
    {"id": "loading", "label": "Loading", "role": "room", "z": 0.0, "ceiling": 5.4,
     "rects": [(34, 9, 5, 4)]},
    {"id": "lift_core", "label": "Lift Core", "role": "stairwell", "z": 0.7, "ceiling": 4.2,
     "rects": [(20, 31, 8, 4)]},
]

RAMPS = []

COVER = [
    {"id": "planters", "label": "Planters", "height": 1.0, "as": "crate",
     "at": [(15, 19, 2, 2), (31, 19, 2, 2), (15, 24, 2, 1), (31, 24, 2, 1)]},
    {"id": "reception", "label": "Reception", "height": 1.2, "as": "crate",
     "at": [(20, 28, 4, 1)]},
    {"id": "pallets", "label": "Pallets", "height": 1.4, "as": "crate",
     "at": [(35, 10, 2, 2)]},
    {"id": "benches", "label": "Benches", "height": 0.9, "as": "crate",
     "at": [(14, 5, 3, 1), (28, 5, 3, 1)]},
    {"id": "hall_desks", "label": "Desks", "height": 1.1, "as": "crate",
     "at": [(18, 15, 3, 1), (27, 15, 3, 1)]},
]

PORTALS = [
    {"between": ("service", "south_hall"), "kind": "door", "width": 2},
    {"between": ("loading", "service"), "kind": "door", "width": 2},
    {"between": ("lift_core", "north_hall"), "kind": "door", "width": 2},
    {"between": ("steps", "south_hall"), "kind": "arch", "width": 3},
    {"between": ("north_deck", "north_hall"), "kind": "arch", "width": 3},
    {"between": ("courtyard", "north_hall"), "kind": "arch", "width": 3},
]

DIRECTIVES = [
    'mark attacker_spawn plaza attack "Plaza"',
    'mark defender_spawn north_deck defend "North Deck"',
    'mark site north_hall neutral "Hall"',
    'mark site courtyard neutral "Court"',
    "",
    "route plaza north_hall 2",
    "route plaza courtyard 2",
]
