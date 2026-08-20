"""
Interchange — an original station, designed rather than traced.

The library's other originals are a roof, a campus and a market square. This
one is the shape a station is: two long platforms facing each other across a
track bed, and everything else hung off the ends.

The track bed is the whole design, and it is the opposite of Okujou's light
well. The well was a hole you could see across and could not cross; this is a
hole you *can* cross, four hundred millimetres down and four hundred back up,
and doing it puts you in the open with a platform edge above you on both
sides. So every fight has the same question in it — take the short way and be
seen from two levels, or take the long way round through the concourse and the
service run and arrive late. Neither answer is right twice in a row, which is
the only thing a map really has to arrange.

Everything else follows from that. The platforms are long and thin so a duel
along one is a duel about who is behind a canopy column. The service run
behind the south platform is low, blind and joins the substation, so the way
round is genuinely a different place rather than the same walk mirrored. The
concourse and the ticket hall do not touch: the only way between the two ends
of the station is across it, which is what a station is for.
"""

ID = "og_interchange"
NAME = "Interchange"
DESCRIPTION = (
    "Interchange. An original station composed for this game: two platforms "
    "facing each other across a track bed you can cross at a price, a "
    "concourse at one end, a ticket hall at the other, and a blind service "
    "run behind the south platform that is the long way round."
)
GRID = 1.6
WALL_THICKNESS = 0.28
LAYER_HEIGHT = 6.2
WIDTH = 46
HEIGHT = 30

AREAS = [
    # --- the two ends, which do not touch each other ------------------------
    {"id": "concourse", "label": "Concourse", "role": "site", "z": 0.8, "ceiling": 7.6,
     "rects": [(2, 21, 16, 7)]},
    {"id": "ticket_hall", "label": "Ticket Hall", "role": "site", "z": 0.8, "ceiling": 6.4,
     "rects": [(30, 21, 14, 7)]},

    # --- the platforms ------------------------------------------------------
    {"id": "north_platform", "label": "North Platform", "role": "lane", "z": 0.8, "ceiling": 6.2,
     "rects": [(2, 17, 38, 4)]},
    {"id": "south_platform", "label": "South Platform", "role": "lane", "z": 0.8, "ceiling": 6.2,
     "rects": [(2, 8, 38, 3)]},

    # --- the crossing, and the two ways down into it ------------------------
    {"id": "track_bed", "label": "Track Bed", "role": "lane", "z": 0.0, "ceiling": 9.0,
     "rects": [(2, 12, 38, 4)]},
    {"id": "north_steps_w", "label": "North Steps", "role": "corridor", "z": 0.4, "ceiling": 6.0,
     "rects": [(3, 16, 5, 1)]},
    {"id": "north_steps_e", "label": "North Steps East", "role": "corridor", "z": 0.4, "ceiling": 6.0,
     "rects": [(34, 16, 5, 1)]},
    {"id": "south_steps_w", "label": "South Steps", "role": "corridor", "z": 0.4, "ceiling": 6.0,
     "rects": [(3, 11, 5, 1)]},
    {"id": "south_steps_e", "label": "South Steps East", "role": "corridor", "z": 0.4, "ceiling": 6.0,
     "rects": [(34, 11, 5, 1)]},

    # --- the long way round -------------------------------------------------
    {"id": "service", "label": "Service Run", "role": "corridor", "z": 0.8, "ceiling": 3.2,
     "rects": [(6, 5, 30, 3)]},
    {"id": "substation", "label": "Substation", "role": "room", "z": 0.8, "ceiling": 4.4,
     "rects": [(36, 2, 8, 6)]},
    {"id": "east_link", "label": "East Link", "role": "corridor", "z": 0.8, "ceiling": 3.6,
     "rects": [(40, 8, 4, 13)]},
]

RAMPS = []

COVER = [
    {"id": "north_benches", "label": "Benches", "height": 1.0, "as": "crate",
     "at": [(7, 18, 3, 1), (20, 18, 3, 1), (31, 18, 3, 1)]},
    {"id": "south_benches", "label": "Benches", "height": 1.0, "as": "crate",
     "at": [(10, 9, 3, 1), (26, 9, 3, 1)]},
    {"id": "sleepers", "label": "Sleepers", "height": 1.2, "as": "crate",
     "at": [(12, 13, 2, 2), (24, 13, 2, 2), (33, 14, 2, 1)]},
    {"id": "gates", "label": "Ticket Gates", "height": 1.15, "as": "crate",
     "at": [(33, 23, 1, 4), (36, 23, 1, 4)]},
    {"id": "kiosk", "label": "Kiosk", "height": 1.6, "as": "crate",
     "at": [(5, 24, 3, 2)]},
    {"id": "transformers", "label": "Transformers", "height": 1.8, "as": "barrel",
     "at": [(38, 4, 2, 2), (41, 4, 2, 2)]},
    {"id": "pallets", "label": "Pallets", "height": 1.1, "as": "crate",
     "at": [(14, 6, 2, 1), (28, 6, 2, 1)]},
]

# Where the plan wants a doorway rather than the full width of a boundary.
PORTALS = [
    {"between": ("concourse", "north_platform"), "kind": "arch", "width": 5},
    {"between": ("ticket_hall", "north_platform"), "kind": "arch", "width": 4},
    {"between": ("south_platform", "service"), "kind": "door", "width": 2},
    {"between": ("service", "substation"), "kind": "door", "width": 2},
    {"between": ("east_link", "ticket_hall"), "kind": "door", "width": 2},
    {"between": ("east_link", "south_platform"), "kind": "arch", "width": 3},
]

DIRECTIVES = [
    'mark attacker_spawn concourse attack "Concourse"',
    'mark defender_spawn ticket_hall defend "Ticket Hall"',
    'mark site track_bed neutral "Tracks"',
    'mark site substation neutral "Substation"',
    "",
    "route concourse ticket_hall 2",
    "route concourse track_bed 2",
]
