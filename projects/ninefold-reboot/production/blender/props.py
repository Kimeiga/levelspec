"""Detail for the blockout's own objects: cover pieces, ceilings and street ironwork.

Cover keeps its exact collision hull. Everything added to it is at most 0.05 m
proud of a face, and nothing is added on top of low cover, so what a player can
see over or shoot past is unchanged. Ceiling pieces stay 2.45 m clear of floors.
"""
import math

import numpy as np

import assets
import geo
from assets import DARK, Frame
from geo import Z

CLEAR_HEAD = 2.45
DYES = [(0.16, 0.22, 0.50), (0.62, 0.16, 0.14), (0.85, 0.62, 0.16), (0.20, 0.42, 0.30), (0.50, 0.24, 0.46), (0.82, 0.80, 0.74)]


def rect_faces(x0, y0, x1, y1, z):
    """Wall frames at the bottom centre of each side of an axis-aligned box: (frame, width)."""
    return [
        (Frame(((x0 + x1) / 2, y0, z), (0, -1, 0)), x1 - x0), (Frame((x1, (y0 + y1) / 2, z), (1, 0, 0)), y1 - y0),
        (Frame(((x0 + x1) / 2, y1, z), (0, 1, 0)), x1 - x0), (Frame((x0, (y0 + y1) / 2, z), (-1, 0, 0)), y1 - y0),
    ]


def polygon_faces(points, z):
    """Same for a counter-clockwise plan polygon."""
    out = []
    for i, a in enumerate(points):
        b = points[(i + 1) % len(points)]
        d = np.array([b[0] - a[0], b[1] - a[1]])
        length = float(np.linalg.norm(d))
        out.append((Frame(((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, z), (d[1] / length, -d[0] / length, 0)), length))
    return out


def plank(kit, f, a, b, width, proud, tint):
    """Flat board between two wall-space points (x, y)."""
    a, b = np.asarray(a, float), np.asarray(b, float)
    d = b - a
    length = float(np.linalg.norm(d))
    along = (f.t * d[0] + f.up * d[1]) / length
    across = np.cross(f.n, along)
    kit.tex("wood").add(geo.obox(f.at(a[0], a[1], 0), along, across, f.n, (0, -width / 2, 0), (length, width / 2, proud), open_back=True), tint)


def crate(kit, faces, height, tint):
    """Low cover as nailed crates: edge battens, uprights and a brace per panel."""
    tint = np.asarray(tint)
    for f, width in faces:
        hw = width / 2
        for y in (0.045, height - 0.045):
            plank(kit, f, (-hw, y), (hw, y), 0.09, 0.025, tint * 0.82)
        panels = max(1, int(round(width / 1.1)))
        for i in range(panels + 1):
            x = -hw + width * i / panels
            x = min(max(x, -hw + 0.045), hw - 0.045)
            plank(kit, f, (x, 0.09), (x, height - 0.09), 0.09, 0.025, tint * 0.82)
        for i in range(panels):
            xa, xb = -hw + width * i / panels + 0.09, -hw + width * (i + 1) / panels - 0.09
            if xb - xa > 0.4:
                ends = ((xa, 0.1), (xb, height - 0.1)) if i % 2 == 0 else ((xa, height - 0.1), (xb, 0.1))
                plank(kit, f, ends[0], ends[1], 0.08, 0.02, tint * 0.9)


def kiln(kit, faces, height):
    """Brick kiln: iron tie bands, buttress straps and stoke doors with a live fire behind them."""
    iron = np.array((0.16, 0.14, 0.13))
    for f, width in faces:
        hw = width / 2
        for y in (0.45, 1.45, 2.4):
            kit.tex("metal").add(f.box(-hw, hw, y, y + 0.08, 0, 0.02), iron)
        for x in np.arange(-hw + 0.25, hw - 0.2, 1.7):
            kit.tex("metal").add(f.box(x, x + 0.1, 0.0, height, 0, 0.03), iron * 0.9)
        if width > 4:
            for x in np.arange(-hw + 1.4, hw - 1.0, 2.55):
                kit.tex("metal").add(f.box(x - 0.36, x + 0.36, 0.2, 0.92, 0.02, 0.05, open_back=True), iron * 0.7)
                kit.tex("metal").add(f.box(x - 0.42, x + 0.42, 0.14, 0.98, 0.0, 0.035), iron * 1.2)
                for dx in (-0.2, -0.07, 0.06, 0.19):  # draught slots with the fire behind
                    kit.emit().add(f.box(x + dx - 0.035, x + dx + 0.035, 0.30, 0.40, 0.05, 0.055, open_back=True), np.array((1.0, 0.38, 0.08)) * 1.5)
                kit.flat().add(f.box(x + 0.24, x + 0.30, 0.52, 0.66, 0.05, 0.08, open_back=True), iron * 0.8)
                kit.light("fire", f.at(x, 0.5, 0.2), f.n, (1.0, 0.40, 0.12), 40)


def machine(kit, faces, height, tint):
    """Press: plinth, access panels with handles, seam bands and a control cabinet with pilot lights."""
    tint = np.asarray(tint)
    for index, (f, width) in enumerate(faces):
        hw = width / 2
        kit.tex("metal").add(f.box(-hw, hw, 0.0, 0.22, 0, 0.04), tint * 0.5)
        kit.tex("metal").add(f.box(-hw, hw, height - 0.3, height - 0.22, 0, 0.025), tint * 0.6)
        for x in (-hw * 0.45, hw * 0.45):
            kit.tex("metal").add(f.box(x - 0.62, x + 0.62, 0.55, 1.75, 0, 0.03), tint * 1.12)
            kit.flat().add(f.box(x - 0.2, x + 0.2, 1.1, 1.14, 0.03, 0.05, open_back=True), DARK * 2)
            for bx in (x - 0.56, x + 0.52):
                for by in (0.6, 1.66):
                    kit.flat().add(f.box(bx, bx + 0.04, by, by + 0.04, 0.03, 0.04, open_back=True), DARK * 3)
        if index == 0:
            kit.tex("metal").add(f.box(-0.25, 0.25, 1.95, 2.45, 0, 0.05), (0.50, 0.52, 0.50))
            for i, color in enumerate(((1.0, 0.2, 0.1), (0.2, 1.0, 0.3), (1.0, 0.7, 0.1))):
                x = -0.14 + i * 0.14
                kit.emit().add(f.box(x - 0.025, x + 0.025, 2.3, 2.35, 0.05, 0.056, open_back=True), np.array(color) * 2.2)
            kit.flat().add(f.box(-0.18, 0.18, 2.0, 2.2, 0.05, 0.054, open_back=True), (0.75, 0.72, 0.6))


def tank(kit, faces, height, tint, gauge_face=0):
    """Riveted vessel: hoops, a manway, a sight gauge and a valve wheel."""
    tint = np.asarray(tint)
    for index, (f, width) in enumerate(faces):
        hw = width / 2
        for y in (0.12, height * 0.5, height - 0.2):
            kit.tex("metal").add(f.box(-hw, hw, y, y + 0.09, 0, 0.022), tint * 0.6)
        if index == gauge_face and width > 1.5:
            kit.flat().add(geo.tube([f.at(0, 1.25, 0.0), f.at(0, 1.25, 0.04)], 0.34, 12, caps=True), tint * 0.75)
            kit.flat().add(f.box(hw - 0.5, hw - 0.44, 0.7, 1.9, 0.0, 0.035), (0.75, 0.80, 0.80))
            wheel = [f.at(-hw + 0.5 + 0.16 * math.cos(a), 1.2 + 0.16 * math.sin(a), 0.045) for a in np.linspace(0, 2 * math.pi, 9)]
            kit.flat().add(geo.tube(wheel, 0.014, 3), (0.55, 0.12, 0.10))
            kit.flat().add(geo.tube([f.at(-hw + 0.5, 1.2, 0.0), f.at(-hw + 0.5, 1.2, 0.05)], 0.02, 4), DARK * 2)


def rack(kit, faces, height, rng):
    """Dye store: shelves of cloth bolts seen end-on."""
    wood = np.array((0.62, 0.55, 0.45))
    for f, width in faces:
        hw = width / 2
        levels = 6
        for i in range(levels + 1):
            y = min(max(height * i / levels, 0.02), height - 0.02)
            plank(kit, f, (-hw, y), (hw, y), 0.04, 0.035, wood)
        posts = max(2, int(round(width / 1.2)) + 1)
        for i in range(posts):
            x = min(max(-hw + width * i / (posts - 1), -hw + 0.03), hw - 0.03)
            plank(kit, f, (x, 0.0), (x, height), 0.06, 0.04, wood * 0.9)
        for i in range(levels):
            y0, y1 = height * i / levels + 0.04, height * (i + 1) / levels - 0.04
            x = -hw + 0.08
            while x < hw - 0.2:
                w = rng.uniform(0.14, 0.26)
                h = (y1 - y0) * rng.uniform(0.55, 1.0)
                if rng.random() < 0.85:
                    kit.flat().add(f.box(x, min(x + w, hw - 0.06), y0, y0 + h, 0.0, 0.02), np.array(DYES[rng.integers(len(DYES))]) * rng.uniform(0.7, 1.1))
                x += w + 0.02


def stall(kit, faces, height, word):
    """Shuttered street stall: posts, a rolled blind line and a fascia sign on the long sides."""
    for f, width in faces:
        hw = width / 2
        for x in (-hw, hw - 0.08):
            kit.flat().add(f.box(x, x + 0.08, 0.0, height, 0, 0.04), DARK * 1.6)
        kit.flat().add(f.box(-hw, hw, height - 0.1, height, 0, 0.045), DARK * 1.6)
        if width > 3:
            assets.sign_board(kit, f, word, assets.NEON[2], height - 0.62, height - 0.14, hw - 0.3)
            for x in np.arange(-hw + 1.0, hw - 0.5, 1.25):
                kit.flat().add(f.box(x, x + 0.04, 0.0, height - 0.66, 0, 0.03), DARK * 1.4)


def brick_wall(kit, faces, height, dressing):
    for f, width in faces:
        hw = width / 2
        kit.tex("concrete").add(f.box(-hw - 0.03, hw + 0.03, height - 0.09, height, 0, 0.045), (0.8, 0.8, 0.78))
        if width > 3:
            dressing._posters(f, hw - 0.3)


def counter(kit, faces, height):
    for f, width in faces:
        hw = width / 2
        kit.tex("metal").add(f.box(-hw, hw, height - 0.07, height, 0, 0.03), (0.72, 0.74, 0.74))
        kit.flat().add(f.box(-hw, hw, 0.0, 0.1, 0, 0.012), DARK * 2)


def roof_tank(kit, faces, height):
    for index, (f, width) in enumerate(faces):
        hw = width / 2
        for y in (0.1, height * 0.5, height - 0.16):
            kit.tex("metal").add(f.box(-hw, hw, y, y + 0.08, 0, 0.022), (0.36, 0.40, 0.42))
        if index == 0:
            for x in (-0.22, 0.22):
                kit.flat().add(f.box(x - 0.02, x + 0.02, 0.1, height, 0.0, 0.045), DARK * 1.8)
            for y in np.arange(0.3, height - 0.1, 0.3):
                kit.flat().add(f.box(-0.22, 0.22, y, y + 0.03, 0.02, 0.045, open_back=True), DARK * 1.8)


def hut(kit, faces, height, lot_like):
    f, width = faces[0]
    assets.door(kit, f.moved(-width * 0.2), 0.85, 2.0, np.array((0.30, 0.42, 0.44)), np.array((0.5, 0.5, 0.47)), False)
    assets.window(kit, f.moved(width * 0.22), 0.8, 0.8, 1.2, 0, np.array((0.5, 0.5, 0.47)), np.array((0.2, 0.3, 0.3)), True, grille=True)


def service_core(kit, faces, height):
    """Lift and riser core: steel landing doors on one face, risers and vents on the others."""
    for index, (f, width) in enumerate(faces):
        hw = width / 2
        if index % 2 == 1 and width > 2.5:
            for x in (-0.48, 0.02):
                kit.tex("metal").add(f.box(x, x + 0.46, 0.02, 2.1, 0, 0.025), (0.50, 0.53, 0.52))
            kit.tex("metal").add(f.box(-0.6, 0.6, 2.1, 2.26, 0, 0.05), (0.32, 0.34, 0.34))
            kit.flat().add(f.box(-0.6, -0.5, 0, 2.1, 0, 0.05), (0.32, 0.34, 0.34))
            kit.flat().add(f.box(0.5, 0.6, 0, 2.1, 0, 0.05), (0.32, 0.34, 0.34))
            kit.emit().add(f.box(0.72, 0.78, 1.15, 1.21, 0.0, 0.03), np.array((1.0, 0.5, 0.1)) * 2.0)
            kit.flat().add(f.box(0.68, 0.82, 1.05, 1.3, 0.0, 0.025), DARK * 2)
        else:
            assets.vent(kit, f, -hw + 0.4, 2.4)
            assets.meter_box(kit, f, hw - 0.7, 1.0, 1.6)


def hazard_pier(kit, faces):
    for f, width in faces:
        hw = width / 2
        kit.flat().add(f.box(-hw, hw, 0.0, 1.0, 0, 0.006), (0.80, 0.62, 0.10))
        for x in np.arange(-hw, hw - 0.01, 0.4):
            kit.flat().add(f.box(x, min(x + 0.2, hw), 0.0, 1.0, 0.006, 0.008, open_back=True), DARK)


def cover(dressing):
    """Hulls from level.aml's cover profiles (plan rectangle, base z, height)."""
    kit, rng = dressing.kit, dressing.rng
    crate(kit, rect_faces(47, 37.5, 50, 38.9, 3.2), 1.2, (1, 1, 1))
    crate(kit, rect_faces(48, 54, 52, 55.5, 3.2), 1.2, (0.9, 0.85, 0.8))
    crate(kit, rect_faces(85, 45.5, 88, 47, 0.0), 1.2, (0.85, 0.8, 0.75))
    crate(kit, rect_faces(75, 49.5, 78, 50.8, 0.0), 1.2, (1, 0.95, 0.9))
    crate(kit, rect_faces(47, 44, 49, 46.6, 0.0), 1.2, (0.8, 0.85, 0.8))
    kiln(kit, rect_faces(81, 48, 84, 56, 0.0), 2.75)
    machine(kit, rect_faces(50, 33, 54, 37, 3.2), 2.6, (0.36, 0.52, 0.44))
    tank(kit, polygon_faces([(33, 54), (37, 54), (38, 55), (38, 58), (37, 59), (33, 59), (32, 58), (32, 55)], 0.0), 2.5, (0.62, 0.36, 0.28))
    rack(kit, rect_faces(55, 55, 57, 60, 0.0), 2.96, rng)
    stall(kit, rect_faces(28, 13, 33, 15.4, 0.0), 2.6, "麵")
    brick_wall(kit, rect_faces(13, 17, 18, 19, 0.0), 3.0, dressing)
    brick_wall(kit, rect_faces(73, 73, 75.5, 78, 0.0), 3.0, dressing)
    counter(kit, rect_faces(12, 35, 14, 39, 0.0), 1.2)
    roof_tank(kit, rect_faces(60, 78, 65, 80, 6.4), 2.2)
    hut(kit, rect_faces(40, 66, 44, 70, 6.4), 2.8, None)
    service_core(kit, rect_faces(56, 43, 62, 47, 3.2), 3.45)
    hazard_pier(kit, rect_faces(47, 31, 48, 33.5, 0.0))
    dressing.count("dressed cover pieces", 17)


def ceilings(dressing):
    """Downstand beams and service runs under interior slabs."""
    w, kit, rng = dressing.w, dressing.kit, dressing.rng
    done = set()
    for x, y, z, head in w.samples:
        if not (2.75 <= head <= 4.2):
            continue
        ceiling = z + head
        for axis, pitch, kind in ((0, 4, "beam"), (1, 3, "pipe")):
            along = np.array([1.0, 0, 0]) if axis == 0 else np.array([0, 1.0, 0])
            fixed = y if axis == 0 else x
            if int(round(fixed - 0.5)) % pitch != (0 if kind == "beam" else 1):
                continue
            drop = 0.28 if kind == "beam" else 0.16
            origin = np.array([x, y, ceiling - drop / 2])
            ends = []
            for sign in (-1, 1):
                hit = w.ray(origin, along * sign, 14.0)
                ends.append(hit[3] if hit else None)
            if None in ends or ends[0] + ends[1] < 2.0:
                continue
            a, b = origin - along * ends[0], origin + along * ends[1]
            key = (kind, round(float(a[0]), 1), round(float(a[1]), 1), round(float(ceiling), 1))
            if key in done:
                continue
            done.add(key)
            # Every point under the run must keep standing clearance.
            length = ends[0] + ends[1]
            clear = True
            for s in np.arange(0.3, length, 0.6):
                p = a + along * s
                below = w.ray((p[0], p[1], ceiling - drop - 0.02), (0, 0, -1))
                above = w.ray((p[0], p[1], ceiling - drop - 0.02), (0, 0, 1), drop + 0.1)
                if above is None or (below is not None and w.walk[below[2]] and ceiling - drop - below[0][2] < CLEAR_HEAD):
                    clear = False
                    break
            if not clear:
                continue
            across = np.cross(Z, along)
            if kind == "beam":
                kit.tex("concrete").add(geo.obox(a, along, across, Z, (0, -0.15, -drop / 2), (length, 0.15, drop / 2)), (0.9, 0.9, 0.88))
                dressing.count("ceiling beams")
            else:
                for offset, radius, tint in ((-0.12, 0.04, (0.42, 0.20, 0.14)), (0.02, 0.03, (0.50, 0.52, 0.50)), (0.13, 0.022, (0.16, 0.22, 0.20))):
                    start = a + across * offset + Z * (drop / 2 - radius - 0.03)
                    kit.flat().add(geo.tube([start, start + along * length], radius, 5), np.array(tint) * rng.uniform(0.8, 1.1))
                for s in np.arange(0.6, length, 2.0):
                    kit.flat().add(geo.obox(a + along * s, along, across, Z, (-0.02, -0.2, drop / 2 - 0.11), (0.02, 0.2, drop / 2)), DARK * 2)
                dressing.count("ceiling service runs")


def ironwork(dressing):
    """Manhole covers and gully grates set into the street: 12 mm proud, no collision."""
    w, kit, rng = dressing.w, dressing.kit, dressing.rng
    iron = np.array((0.11, 0.11, 0.115))
    for x, y, z, head in w.samples[rng.permutation(len(w.samples))]:
        if head != np.inf or abs(z) > 0.01:
            continue
        level = all((hit := w.ray((x + dx, y + dy, 0.5), (0, 0, -1), 0.6)) is not None and abs(hit[0][2]) < 0.01 and w.walk[hit[2]]
                    for dx, dy in ((0.7, 0), (-0.7, 0), (0, 0.7), (0, -0.7)))
        if not level or not dressing.spaced("manhole", (x, y, z), 13.0):
            continue
        kit.flat().add(geo.cylinder((x, y, 0.0), 0.36, 0.012, 14), iron)
        kit.flat().add(geo.tube([(x, y, 0.0), (x, y, 0.006)], 0.43, 14, caps=True), iron * 1.3)
        for a in np.linspace(0, math.pi, 4, endpoint=False):
            d = np.array([math.cos(a), math.sin(a), 0]) * 0.3
            kit.flat().add(geo.obox((x, y, 0.012), d / 0.3, np.cross(Z, d / 0.3), Z, (-0.3, -0.012, 0), (0.3, 0.012, 0.004)), iron * 1.7)
        dressing.count("manhole covers")
    for a in dressing.anchors:
        if not a.outdoor or abs(a.floor) > 0.01 or not dressing.spaced("gully", a.at(0, 0, 0), 11.0):
            continue
        f = Frame(a.at(0, 0, 0), a.n)
        if w.ray(f.at(0, 0.3, 0.5), (0, 0, -1), 0.4) is None:
            continue
        kit.flat().add(geo.obox(f.at(0, 0, 0.3), f.t, f.n, Z, (-0.3, 0, 0), (0.3, 0.22, 0.012)), iron)
        for s in np.linspace(-0.25, 0.25, 6):
            kit.flat().add(geo.obox(f.at(s, 0, 0.32), f.t, f.n, Z, (-0.012, 0, 0.012), (0.012, 0.18, 0.016)), iron * 2.0)
        dressing.count("gully grates")
