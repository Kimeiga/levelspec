"""
Kasbah — an original desert market, composed.

The warm end of the range. Where Atrium is one material and one accent, this is
all material: mudbrick, timber, awnings, tile, and no two rooms the same height.

The plan is a souk. Two covered lanes with low ceilings run north, a square
opens between them, a caravanserai courtyard sits behind on a terrace, and a
cistern is sunk below the square. The lanes are deliberately unpleasant to hold
— they are three cells wide with nothing to stand behind — and the square is
deliberately pleasant, so the fight moves toward the open ground rather than
stalling in the corridors, which is the failure mode of every market map ever
built.
"""

ID = "og_kasbah"
NAME = "Kasbah"
DESCRIPTION = (
    "Kasbah. An original desert market composed for this game: two covered "
    "souk lanes onto an open square, a caravanserai terrace behind it, and a "
    "sunken cistern under the middle."
)
GRID = 1.55
WALL_THICKNESS = 0.38
LAYER_HEIGHT = 5.6
WIDTH = 40
HEIGHT = 40

AREAS = [
    # --- the low end ---------------------------------------------------------
    {"id": "gate", "label": "Gate", "role": "spawn", "z": 0.0, "ceiling": 7.0,
     "rects": [(14, 3, 12, 4)]},
    {"id": "west_souk", "label": "West Souk", "role": "corridor", "z": 0.35, "ceiling": 3.4,
     "rects": [(9, 7, 4, 15)]},
    {"id": "east_souk", "label": "East Souk", "role": "corridor", "z": 0.35, "ceiling": 3.4,
     "rects": [(27, 7, 4, 15)]},
    {"id": "stalls", "label": "Stalls", "role": "room", "z": 0.35, "ceiling": 4.2,
     "rects": [(13, 7, 14, 5)]},

    # --- the square -----------------------------------------------------------
    {"id": "square", "label": "Square", "role": "site", "z": 0.7, "ceiling": 9.2,
     "rects": [(12, 16, 16, 10)]},
    {"id": "fountain_walk", "label": "Fountain", "role": "lane", "z": 0.7, "ceiling": 9.2,
     "rects": [(9, 22, 22, 4)]},

    # --- the high end ---------------------------------------------------------
    {"id": "terrace", "label": "Terrace", "role": "balcony", "z": 1.4, "ceiling": 6.0,
     "rects": [(9, 26, 22, 4)]},
    {"id": "caravanserai", "label": "Caravanserai", "role": "site", "z": 1.75, "ceiling": 8.4,
     "rects": [(11, 30, 18, 7)],
     "holes": [(15, 32, 10, 3)]},
    {"id": "riad", "label": "Riad", "role": "room", "z": 1.75, "ceiling": 5.0,
     "rects": [(15, 32, 10, 3)]},

    # --- the ways round -------------------------------------------------------
    {"id": "west_stair", "label": "West Stair", "role": "stairwell", "z": 1.05, "ceiling": 4.6,
     "rects": [(6, 22, 3, 8)]},
    {"id": "east_stair", "label": "East Stair", "role": "stairwell", "z": 1.05, "ceiling": 4.6,
     "rects": [(31, 22, 3, 8)]},
]

RAMPS = []

COVER = [
    {"id": "market_stalls", "label": "Stalls", "height": 1.3, "as": "crate",
     "at": [(15, 8, 3, 2), (22, 8, 3, 2)]},
    {"id": "fountain", "label": "Fountain", "height": 1.0, "as": "barrel",
     "at": [(19, 23, 3, 2)]},
    {"id": "square_crates", "label": "Crates", "height": 1.4, "as": "crate",
     "at": [(14, 18, 2, 2), (24, 18, 2, 2)]},
    {"id": "cart", "label": "Cart", "height": 1.6, "as": "vehicle",
     "at": [(19, 20, 3, 2)]},
    {"id": "urns", "label": "Urns", "height": 1.2, "as": "barrel",
     "at": [(13, 34, 2, 2), (25, 34, 2, 2)]},
]

PORTALS = [
    {"between": ("gate", "stalls"), "kind": "arch", "width": 3},
    {"between": ("stalls", "square"), "kind": "arch", "width": 3},
    {"between": ("riad", "caravanserai"), "kind": "door", "width": 2},
    {"between": ("west_stair", "fountain_walk"), "kind": "door", "width": 2},
    {"between": ("east_stair", "fountain_walk"), "kind": "door", "width": 2},
    {"between": ("terrace", "caravanserai"), "kind": "arch", "width": 3},
]

DIRECTIVES = [
    'mark attacker_spawn gate attack "Gate"',
    'mark defender_spawn caravanserai defend "Caravanserai"',
    'mark site square neutral "Square"',
    'mark site caravanserai neutral "Serai"',
    "",
    "route gate square 2",
    "route gate caravanserai 2",
]
