"""
Okujou — an original rooftop, designed rather than traced.

Everything else in the library is a reconstruction: a real map's footprint read
off its radar and given back its meaning. This one is drawn from nothing, which
is the other half of what a level compiler is for — if the passes really do own
every coordinate, a map should be as easy to invent as to copy.

The shape is a Tokyo roof at night: a helipad deck open to the sky at one end,
a glazed penthouse at the other, a plant deck of chillers and ducts between
them, and a light well punched through the middle that you can see across and
cannot cross. That well is the whole design. Every route round it is a loop, so
you are never cornered and never safe, and the two ways round are different
fights — the west gantry is long and exposed and the east service run is short
and blind.

Heights step up toward the helipad, so the open ground is also the high ground,
which is the trade the deck is there to offer.
"""

ID = "nt_okujou"
NAME = "Okujou"
DESCRIPTION = (
    "Okujou. An original rooftop complex composed for this game rather than "
    "traced from anything: a helipad deck, a glazed penthouse, a plant deck, "
    "and a light well through the middle that every route has to go round."
)
GRID = 1.7
WALL_THICKNESS = 0.3
LAYER_HEIGHT = 6.0
WIDTH = 40
HEIGHT = 34

AREAS = [
    # --- the open end -------------------------------------------------------
    {"id": "helipad", "label": "Helipad", "role": "site", "z": 1.1, "ceiling": 9.5,
     "rects": [(21, 22, 15, 10), (24, 20, 9, 2)]},
    {"id": "north_edge", "label": "North Edge", "role": "balcony", "z": 1.1, "ceiling": 9.5,
     "rects": [(21, 32, 15, 1)]},

    # --- the long way round, west -------------------------------------------
    {"id": "west_gantry", "label": "West Gantry", "role": "lane", "z": 0.75, "ceiling": 8.0,
     "rects": [(4, 12, 3, 20)]},
    {"id": "north_walk", "label": "North Walk", "role": "lane", "z": 1.1, "ceiling": 8.0,
     "rects": [(4, 29, 17, 3)]},
    {"id": "stair_core", "label": "Stair Core", "role": "stairwell", "z": 0.4, "ceiling": 4.4,
     "rects": [(4, 8, 6, 4)]},

    # --- the short way round, east ------------------------------------------
    {"id": "service", "label": "Service Run", "role": "corridor", "z": 0.75, "ceiling": 3.6,
     "rects": [(33, 10, 3, 12)]},
    {"id": "east_stair", "label": "East Stair", "role": "stairwell", "z": 0.4, "ceiling": 4.2,
     "rects": [(31, 7, 5, 3)]},

    # --- the penthouse ------------------------------------------------------
    {"id": "penthouse", "label": "Penthouse", "role": "room", "z": 0.4, "ceiling": 5.2,
     "rects": [(20, 3, 11, 8)]},
    {"id": "lounge", "label": "Lounge", "role": "room", "z": 0.4, "ceiling": 4.6,
     "rects": [(14, 3, 6, 5)]},

    # --- the plant deck -----------------------------------------------------
    {"id": "plant", "label": "Plant Deck", "role": "lane", "z": 0.35, "ceiling": 7.4,
     "rects": [(10, 8, 10, 6), (10, 4, 4, 4)]},
    {"id": "duct_run", "label": "Ducts", "role": "corridor", "z": 0.35, "ceiling": 3.4,
     "rects": [(20, 11, 13, 3)]},

    # --- the light well, and the balconies looking into it -------------------
    {"id": "well_walk", "label": "Well Walk", "role": "balcony", "z": 0.75, "ceiling": 8.6,
     "rects": [(7, 14, 26, 6)],
     # The well itself: cut back out, so the walk is the ring around it.
     "holes": [(11, 15, 18, 4)]},
]

RAMPS = []

COVER = [
    {"id": "chillers", "label": "Chillers", "height": 1.7, "as": "crate",
     "at": [(12, 9, 3, 2), (16, 10, 2, 2)]},
    {"id": "pad_crates", "label": "Crates", "height": 1.3, "as": "crate",
     "at": [(23, 24, 2, 2), (31, 27, 2, 2)]},
    {"id": "tanks", "label": "Tanks", "height": 1.8, "as": "barrel",
     "at": [(25, 29, 2, 2)]},
    {"id": "lounge_bar", "label": "Bar", "height": 1.2, "as": "crate",
     "at": [(15, 5, 3, 1)]},
    {"id": "well_planters", "label": "Planters", "height": 1.1, "as": "crate",
     "at": [(8, 16, 2, 2), (30, 16, 2, 2)]},
]

# Where the plan wants a doorway rather than the full width of a boundary.
PORTALS = [
    {"between": ("lounge", "penthouse"), "kind": "door", "width": 2},
    {"between": ("penthouse", "duct_run"), "kind": "arch", "width": 3},
    {"between": ("service", "well_walk"), "kind": "door", "width": 2},
    {"between": ("stair_core", "west_gantry"), "kind": "door", "width": 2},
    {"between": ("plant", "well_walk"), "kind": "arch", "width": 3},
    {"between": ("north_walk", "helipad"), "kind": "arch", "width": 3},
]

DIRECTIVES = [
    'mark attacker_spawn lounge attack "Lounge"',
    'mark defender_spawn helipad defend "Helipad"',
    'mark site helipad neutral "Deck"',
    'mark site plant neutral "Plant"',
    "",
    "route lounge helipad 2",
    "route lounge plant 2",
]
