"""Procedural architecture and set dressing for Ninefold.

The inaccessible context masses are divided into building lots. Each lot is one
building with a bay / storey grid that runs from the street to its roofline, so
windows, balconies, string courses and pipes line up with each other and with
the lots' party walls. Where the blockout already supplies the wall (the
collision facade a player can touch) pieces are mounted on it; above it the
building is generated.

Gameplay contract: collision is never changed. Anything deeper than WALL_SKIN is
placed only where no walkable surface lies within CLEAR_HEAD beneath it and
where no higher walking level can see it, or at SAFE_Z and above, which is over
every eye position on the map.
"""
import json
import math

import numpy as np

import assets
import geo
import props
from assets import Frame, NEON, LAMP_WARM, LAMP_COOL, LAMP_SODIUM, ROOM_LIGHT
from geo import Z
from world import EYE

CLEAR_HEAD = 2.45
WALL_SKIN = 0.15
SAFE_Z = 9.6       # top storey line above every standing, stair and jump eye height (max 8.96 m)
STOREY = 3.2       # matches the playable floors at 0 / 3.2 / 6.4 m
STEP = 0.5         # lot raster

SHOP_WORDS = ["茶", "麵", "藥房", "牙科", "理髮", "米舖", "五金", "洗衣", "鐘錶", "香燭", "電器", "押", "冰室", "雜貨", "診所", "燒臘"]
CALLOUTS = [  # (label, x, y, floor z, neon colour index)
    ("肉舖 BUTCHER", 17, 37, 0.0, 0), ("學校 SCHOOL", 35, 44, 3.2, 5), ("裁縫 TAILOR", 65, 21, 0.0, 4),
    ("瓷廠 PORCELAIN", 75, 46, 0.0, 1), ("機器廠 MACHINE WORKS", 51, 38, 3.2, 2), ("染坊 DYE WORKS", 57, 57, 0.0, 4),
    ("鍋爐 BOILER", 35, 60, 0.0, 2), ("水街 WATER ST", 70, 76, 0.0, 1), ("運河 CANAL", 12, 16, 0.0, 3),
    ("水塘 RESERVOIR", 58, 74, 6.4, 1), ("天井 WELL", 51, 46, 0.0, 5),
]
WALL_TINTS = {
    "plaster": [(0.93, 0.90, 0.80), (0.78, 0.88, 0.80), (0.95, 0.80, 0.74), (0.80, 0.86, 0.93), (0.93, 0.86, 0.66),
                (0.90, 0.90, 0.88), (0.72, 0.82, 0.84), (0.86, 0.78, 0.70)],
    "mosaic": [(0.90, 0.88, 0.78), (0.70, 0.84, 0.78), (0.74, 0.82, 0.90), (0.88, 0.74, 0.66)],
    "concrete": [(1.0, 0.99, 0.96), (0.92, 0.93, 0.95)],
}
SASH_TINTS = [(0.20, 0.42, 0.40), (0.30, 0.33, 0.34), (0.60, 0.55, 0.46), (0.24, 0.32, 0.46), (0.45, 0.22, 0.18), (0.85, 0.85, 0.82)]
SHUTTER_TINTS = [(0.40, 0.66, 0.66), (0.72, 0.36, 0.30), (0.70, 0.72, 0.72), (0.38, 0.50, 0.74), (0.80, 0.72, 0.45)]
POSTER_TINTS = [(0.85, 0.80, 0.62), (0.80, 0.35, 0.28), (0.82, 0.84, 0.80), (0.35, 0.55, 0.62), (0.88, 0.70, 0.30)]


class Lot:
    def __init__(self, ident, x0, x1, y0, y1, base):
        self.id, self.x0, self.x1, self.y0, self.y1, self.base = ident, x0, x1, y0, y1, base
        self.roof = base
        self.storeys = 0

    def style(self, rng):
        self.wall = str(rng.choice(["plaster", "plaster", "plaster", "mosaic", "concrete"]))
        palette = WALL_TINTS[self.wall]
        self.tint = np.array(palette[rng.integers(len(palette))]) * rng.uniform(0.88, 1.04)
        self.trim = self.tint * (0.74 if rng.random() < 0.5 else 1.10)
        self.sash = np.array(SASH_TINTS[rng.integers(len(SASH_TINTS))])
        self.kind = int(rng.integers(4)) if rng.random() < 0.85 else 3
        self.bay = rng.uniform(2.7, 3.5)
        self.p_cage, self.p_ac, self.p_awning = rng.uniform(0.05, 0.45), rng.uniform(0.1, 0.4), rng.uniform(0.0, 0.25)
        self.p_lit = rng.uniform(0.25, 0.6)
        self.balconies = rng.random() < 0.18
        self.sill = rng.uniform(0.95, 1.1)
        self.win_h = rng.uniform(1.25, 1.5)

    def window_width(self, bay_width):
        target = (1.5, 2.1, 1.05, 0.9)[self.kind]
        return max(0.7, min(target, bay_width - 0.9))

    def contains(self, x, y, pad=0.0):
        return (self.x0 - pad <= x <= self.x1 + pad) and (self.y0 - pad <= y <= self.y1 + pad)


class Side:
    """One face of a lot, with a wall frame at ground level. index: 0 south, 1 east, 2 north, 3 west."""

    def __init__(self, lot, index):
        self.lot, self.index = lot, index
        x0, x1, y0, y1 = lot.x0, lot.x1, lot.y0, lot.y1
        start, normal = (((x0, y0), (0, -1)), ((x1, y0), (1, 0)), ((x1, y1), (0, 1)), ((x0, y1), (-1, 0)))[index]
        self.length = (x1 - x0) if index in (0, 2) else (y1 - y0)
        self.frame = Frame((start[0], start[1], 0.0), (normal[0], normal[1], 0.0))
        self.n = self.frame.n

    def at(self, x, y=0.0, z=0.0):
        return self.frame.at(x, y, z)


def _largest_rectangle(free):
    nx, ny = free.shape
    heights = np.zeros(ny, np.int32)
    best_area, best = 0, None
    for i in range(nx):
        heights = np.where(free[i], heights + 1, 0)
        stack = []
        for j in range(ny + 1):
            h = int(heights[j]) if j < ny else 0
            start = j
            while stack and stack[-1][1] >= h:
                s, hh = stack.pop()
                area = hh * (j - s)
                if area > best_area:
                    best_area, best = area, (i - hh + 1, s, hh, j - s)
                start = s
            stack.append((start, h))
    return best


class Dressing:
    def __init__(self, world, rng, log=print):
        self.w, self.rng, self.log = world, rng, log
        self.kit = assets.Kit(rng)
        self.counts = {}
        self.taken = {}
        self._lo, self._hi = [], []
        self._zlo, self._zhi = [], []
        self.lots = self._extract_lots()
        self._expand_lots()
        self._assign_heights()
        world.add_occluders(np.concatenate([
            geo.box((l.x0, l.y0, min(l.base, SAFE_Z)), (l.x1, l.y1, l.roof + 0.9)) for l in self.lots if l.storeys
        ]))
        self.anchors = self._anchors()

    # ------------------------------------------------------------ bookkeeping
    def count(self, name, n=1):
        self.counts[name] = self.counts.get(name, 0) + n

    def reserve(self, bounds):
        self._lo.append(bounds[0])
        self._hi.append(bounds[1])

    def free(self, bounds):
        if not self._lo:
            return True
        lo, hi = np.array(self._lo), np.array(self._hi)
        return not np.any(np.all(bounds[0] < hi, axis=1) & np.all(bounds[1] > lo, axis=1))

    def zone(self, bounds):
        """Wall area owned by the facade grammar: free-roaming dressing keeps out."""
        self._zlo.append(bounds[0])
        self._zhi.append(bounds[1])

    def in_zone(self, point):
        if not self._zlo:
            return False
        lo, hi = np.array(self._zlo), np.array(self._zhi)
        return bool(np.any(np.all(point > lo, axis=1) & np.all(point < hi, axis=1)))

    def spaced(self, category, point, spacing):
        pts = self.taken.setdefault(category, [])
        if any(np.linalg.norm(np.asarray(point) - q) < spacing for q in pts):
            return False
        pts.append(np.asarray(point, float))
        return True

    # ------------------------------------------------------------ safety rules
    def clear_below(self, points, bottom, top):
        """No walkable surface within CLEAR_HEAD below the object and no geometry inside its height."""
        w = self.w
        for p in points:
            hit = w.ray((p[0], p[1], bottom - 0.02), (0, 0, -1))
            if hit is not None and w.walk[hit[2]] and bottom - hit[0][2] < CLEAR_HEAD:
                return False
            if w.ray((p[0], p[1], top + 0.02), (0, 0, -1), top - bottom + 0.02) is not None:
                return False
        return True

    def hidden_from_upper_eyes(self, points, base):
        """Bulky overhead objects must not sit in any view from a higher walking level or stair."""
        w = self.w
        upper = w.eyes[w.eyes[:, 2] > base + EYE + 0.9]
        for p in points:
            for eye in upper[np.linalg.norm(upper - p, axis=1) < 45]:
                if w.clear(p, eye):
                    return False
        return True

    def may_protrude(self, f, x0, x1, y0, y1, depth):
        """Checks a wall-space box (relative to frame f) that stands `depth` proud of the wall."""
        bottom, top = f.o[2] + y0, f.o[2] + y1
        if bottom >= SAFE_Z:
            return True
        xs = np.arange(x0 - 0.3, x1 + 0.3 + 1e-6, 0.3)
        zs = np.arange(0.08, depth + 0.3 + 1e-6, 0.3)
        if not self.clear_below([f.at(x, 0, z) for x in xs for z in zs], bottom, top):
            return False
        below = self.w.ray(f.at((x0 + x1) / 2, y0, depth / 2), (0, 0, -1))
        base = below[0][2] if below else 0.0
        probes = [f.at(x, y, depth) for x in (x0, (x0 + x1) / 2, x1) for y in (y0, y1)]
        return self.hidden_from_upper_eyes(probes, base)

    # ------------------------------------------------------------ lots
    def _extract_lots(self):
        w, rng = self.w, self.rng
        nx, ny = int(98 / STEP) + 1, int(86 / STEP) + 1
        top = np.full((nx, ny), -1.0)
        for i in range(nx):
            for j in range(ny):
                hit = w.ray(((i + 0.5) * STEP, (j + 0.5) * STEP, 60.0), (0, 0, -1))
                if hit is not None and w.context[hit[2]] and hit[0][2] >= 9.0:
                    top[i, j] = round(float(hit[0][2]), 2)
        self.top = top

        def covered(x, y, height):
            hit = w.ray((x, y, 60.0), (0, 0, -1))
            return hit is not None and w.context[hit[2]] and abs(hit[0][2] - height) < 0.02

        def edge(inside, outside, fixed, axis, height):
            """Bisects between a covered and an uncovered coordinate to the mass edge."""
            for _ in range(9):
                mid = (inside + outside) / 2
                point = (mid, fixed) if axis == 0 else (fixed, mid)
                if covered(point[0], point[1], height):
                    inside = mid
                else:
                    outside = mid
            return inside

        lots = []
        for height in np.unique(top[top > 0]):
            free = top == height
            while True:
                rect = _largest_rectangle(free)
                if rect is None or min(rect[2], rect[3]) < 4 or rect[2] * rect[3] < 28:
                    break
                i0, j0, wi, wj = rect

                def cap(cells):
                    target = int(rng.integers(13, 24))
                    return cells if cells <= target + 7 else target

                wi, wj = cap(wi), cap(wj)
                free[i0:i0 + wi, j0:j0 + wj] = False
                x0, x1, y0, y1 = i0 * STEP, (i0 + wi) * STEP, j0 * STEP, (j0 + wj) * STEP
                # Snap sides that end the mass to its true edge so facades stay flush with the blockout.
                ys = [y0 + (y1 - y0) * s for s in (0.2, 0.5, 0.8)]
                xs = [x0 + (x1 - x0) * s for s in (0.2, 0.5, 0.8)]
                if i0 == 0 or not (top[i0 - 1, j0:j0 + wj] == height).mean() > 0.5:
                    x0 = max(edge(x0 + STEP / 2, x0 - STEP / 2, y, 0, height) for y in ys)
                if i0 + wi >= nx or not (top[i0 + wi, j0:j0 + wj] == height).mean() > 0.5:
                    x1 = min(edge(x1 - STEP / 2, x1 + STEP / 2, y, 0, height) for y in ys)
                if j0 == 0 or not (top[i0:i0 + wi, j0 - 1] == height).mean() > 0.5:
                    y0 = max(edge(y0 + STEP / 2, y0 - STEP / 2, x, 1, height) for x in xs)
                if j0 + wj >= ny or not (top[i0:i0 + wi, j0 + wj] == height).mean() > 0.5:
                    y1 = min(edge(y1 - STEP / 2, y1 + STEP / 2, x, 1, height) for x in xs)
                lot = Lot(len(lots), x0, x1, y0, y1, float(height))
                lot.style(rng)
                lots.append(lot)
        self.log(f"lots: {len(lots)} building lots cut from the context masses")
        return lots

    def _expand_lots(self):
        """Moves each lot face forward to the blockout wall standing in front of it, if any."""
        w = self.w
        grown = {}
        for lot in self.lots:
            offsets = []
            for index in range(4):
                side = Side(lot, index)
                found = []
                for x in np.arange(0.6, side.length - 0.5, 1.2):
                    for z in (1.6, 4.8, 8.0):
                        hit = w.ray(side.at(x, z, 1.2), -side.n, 1.25)
                        if hit is not None and w.structural[hit[2]] and np.dot(hit[1], side.n) > 0.95 and 1.2 - hit[3] > 0.05:
                            found.append(round(1.2 - hit[3], 2))
                if len(found) >= 2:
                    values, counts = np.unique(found, return_counts=True)
                    offsets.append(float(values[np.argmax(counts)]))
                else:
                    offsets.append(0.0)
            lot.offsets = offsets
            lot.y0 -= offsets[0]
            lot.x1 += offsets[1]
            lot.y1 += offsets[2]
            lot.x0 -= offsets[3]
            for o in offsets:
                grown[o] = grown.get(o, 0) + 1
        self.log("lots: face offsets to blockout walls " + json.dumps({str(k): v for k, v in sorted(grown.items())}))

    def _assign_heights(self):
        """Roofline rises away from the playable streets so the skyline reads as a bowl of towers."""
        rng = self.rng
        for lot in self.lots:
            cx, cy = (lot.x0 + lot.x1) / 2, (lot.y0 + lot.y1) / 2
            lot.dist = self.w.distance_to_play(cx, cy)
            slim = min(lot.x1 - lot.x0, lot.y1 - lot.y0)
            extra = int(round(1.5 + 0.26 * lot.dist + rng.normal(0, 1.5)))
            extra = max(0, min(extra, int(2.3 * slim / STOREY), 12))
            if slim < 4.5:
                extra = min(extra, 1)
            if rng.random() < 0.08:
                extra = 0
            if extra:
                lot.roof = STOREY * max(round((lot.base + extra * STOREY) / STOREY), math.ceil((lot.base + 1.6) / STOREY))
                lot.storeys = int(round(lot.roof / STOREY))
        heights = sorted(round(l.roof, 1) for l in self.lots)
        self.log(f"lots: rooflines {heights[0]}..{heights[-1]} m, median {heights[len(heights) // 2]} m")

    def lot_index(self, x, y):
        """Vectorised: index of the lot whose footprint contains each point, else -1."""
        out = np.full(np.shape(x), -1)
        for lot in self.lots:
            inside = (x >= lot.x0 - 1e-3) & (x <= lot.x1 + 1e-3) & (y >= lot.y0 - 1e-3) & (y <= lot.y1 + 1e-3)
            out = np.where((out < 0) & inside, lot.id, out)
        return out

    def buried(self, point, lot):
        """Inside a neighbouring building or a taller blockout mass."""
        x, y, z = point
        for other in self.lots:
            if other is not lot and other.storeys and other.contains(x, y, -0.01) and z < other.roof + 0.9:
                return True
        i, j = int(x / STEP), int(y / STEP)
        if 0 <= i < self.top.shape[0] and 0 <= j < self.top.shape[1] and self.top[i, j] > z and not lot.contains(x, y, -0.01):
            return True
        return False

    # ------------------------------------------------------------ facades
    def _probe(self, side, x, half, z0):
        """Classifies the bay cell against the blockout: 'source' (flat wall on the facade plane), 'free' or 'blocked'."""
        w = self.w
        clean, open_air = True, True
        for dx, dz in ((0, 1.6), (-half + 0.3, 0.3), (half - 0.3, 0.3), (half - 0.3, 2.7), (-half + 0.3, 2.7)):
            hit = w.ray(side.at(x + dx, z0 + dz, 1.2), -side.n, 1.8)
            if hit is None:
                clean = False
                continue
            offset = 1.2 - hit[3]
            if offset > 0.02:
                open_air = False
            if abs(offset) > 0.02 or not w.structural[hit[2]] or np.dot(hit[1], side.n) < 0.95:
                clean = False
        return "source" if clean else "free" if open_air else "blocked"

    def _floor_in_front(self, f, half, z0):
        """'street' when a level walkable floor meets the wall at z0, 'upper' when nothing walkable is near, else 'blocked'."""
        w = self.w
        level = True
        near = False
        for dx in (-half + 0.3, 0.0, half - 0.3):
            hit = w.ray(f.at(dx, 1.0, 0.4), (0, 0, -1), 1.0 + CLEAR_HEAD)
            if hit is not None and w.walk[hit[2]]:
                near = True
                level &= abs(hit[0][2] - z0) < 0.06
            else:
                level = False
        return "street" if level else "blocked" if near else "upper"

    def _columns(self, lot, count):
        rng = self.rng
        if lot.balconies:
            return ["B"] * count
        types = ["W"] * count
        if count >= 3 and rng.random() < 0.55:
            types[int(rng.integers(1, count - 1))] = "B"
        if count >= 3 and rng.random() < 0.45:
            types[0 if rng.random() < 0.5 else count - 1] = "S"
        return types

    def buildings(self):
        for lot in self.lots:
            for index in range(4):
                self._facade(lot, Side(lot, index))
            self._rooftop(lot)

    def _facade(self, lot, side):
        w, rng, kit = self.w, self.rng, self.kit
        if side.length < 1.6:
            return
        count = max(1, int(round(side.length / lot.bay)))
        bay = side.length / count
        half = bay / 2
        columns = self._columns(lot, count)
        tower_from = SAFE_Z if lot.storeys else None
        levels = max(lot.storeys, int(math.ceil(lot.base / STOREY)))
        wall = kit.shell(lot.wall)
        any_seen = False
        for b in range(count):
            xc = (b + 0.5) * bay
            for k in range(levels):
                z0 = k * STOREY
                f = side.frame.moved(xc, z0, 0.0)
                centre = f.at(0, 1.6, 0.05)
                generated = False
                state = self._probe(side, xc, half, z0)
                if lot.storeys and z0 >= tower_from - 1e-6 and state != "source":
                    corners = [f.at(dx, dy, 0.05) for dx, dy in ((0, 1.6), (-half + 0.1, 0.1), (half - 0.1, 0.1), (half - 0.1, 3.1), (-half + 0.1, 3.1))]
                    if all(self.buried(p, lot) for p in corners) or state == "blocked":
                        continue
                    # Where this face is the lot's own blockout mass, start above it rather than overlap it.
                    lift = min(max(lot.base - z0, 0.0), STOREY) if lot.offsets[side.index] == 0 else 0.0
                    if lift > STOREY - 0.05:
                        continue
                    wall.add(f.quad(-half, half, lift, STOREY, 0.0), lot.tint)
                    if lift > 0.05:
                        continue
                    generated = True
                elif state != "source":
                    continue
                if not w.seen_from_play(centre, side.n, rays=14):
                    continue
                any_seen = True
                near = w.distance_to_play(centre[0], centre[1]) < 26
                if generated:
                    assets.string_course(kit, f, -half, half, 0.0, lot.trim)
                    self._tower_cell(lot, f, bay, columns[b], near)
                else:
                    self._source_cell(lot, f, bay, z0, columns[b], b == 0, b == count - 1)
            if lot.storeys:  # parapet above the roof slab
                f = side.frame.moved(xc, lot.roof, 0.0)
                if not self.buried(f.at(0, 0.45, 0.05), lot):
                    wall.add(f.quad(-half, half, 0.0, 0.9, 0.0), lot.tint)
                    if w.seen_from_play(f.at(0, 0.45, 0.05), side.n, rays=8):
                        kit.trim().add(f.box(-half, half, 0.9, 0.98, -0.06, 0.06, open_back=False), lot.trim * 0.9)
                        assets.string_course(kit, f, -half, half, 0.0, lot.trim)
        if any_seen and lot.storeys and lot.roof > SAFE_Z + 3:
            f = side.frame.moved(0.14, SAFE_Z, 0.0)
            if not self.buried(f.at(0, 1.0, 0.1), lot) and w.seen_from_play(f.at(0, (lot.roof - SAFE_Z) / 2, 0.1), side.n, rays=10):
                assets.pipe_stack(kit, f, 0.0, 0.0, lot.roof - SAFE_Z + 0.5, tint=np.array((0.26, 0.30, 0.29)) * rng.uniform(0.7, 1.4))
                self.count("downpipes")

    def _source_cell(self, lot, f, bay, z0, column, first, last):
        """Dresses one bay of an existing blockout wall according to what stands in front of it."""
        kit, half = self.kit, bay / 2
        self.zone(f.bounds(-half, half, 0.0, STOREY, -0.1, 0.6))
        floor = self._floor_in_front(f, half, z0)
        indoor = self.w.ray(f.at(0, 1.5, 0.5), (0, 0, 1)) is not None  # anything overhead: not a street front
        if first:
            kit.trim().add(f.box(-half, -half + 0.16, 0.0, STOREY, 0, 0.06), lot.trim)
        if last:
            kit.trim().add(f.box(half - 0.16, half, 0.0, STOREY, 0, 0.06), lot.trim)
        if floor == "street":
            self._street_cell(lot, f, bay, indoor or z0 > 6.0)
        elif floor == "upper" and not indoor:
            assets.string_course(kit, f, -half, half, 0.0, lot.trim)
            self._upper_cell(lot, f, bay, column)

    def orphan_facades(self):
        """Blockout walls no building lot stands behind still get a bay rhythm of their own."""
        w, rng = self.w, self.rng
        styles = {}
        runs = 0
        for a in self.anchors:
            if self.in_zone(a.at(0, 1.5, 0.05)):
                continue
            left, right = self.span(a, 1.5, 14.0, 0.25)
            length = left + right
            if length < 2.4:
                continue
            key = (round(math.atan2(a.n[1], a.n[0]), 1), round(float(np.dot(a.p[:2], a.n[:2])), 1))
            if key not in styles:
                lot = Lot(-1, 0, 0, 0, 0, 0)
                lot.style(rng)
                lot.trim = np.array((0.74, 0.74, 0.70)) * rng.uniform(0.8, 1.05)
                lot.balconies = False
                lot.kind = int(rng.integers(3))
                styles[key] = lot
            lot = styles[key]
            origin = a.at(-left, 0, 0)
            run = Run(Frame((origin[0], origin[1], 0.0), a.n), length)
            count = max(1, int(round(length / lot.bay)))
            bay = length / count
            columns = ["W"] * count
            if count >= 4:
                columns[int(rng.integers(count))] = "S"
            used = False
            for b in range(count):
                xc = (b + 0.5) * bay
                for k in range(int(round(a.floor / STOREY)), 3):
                    z0 = k * STOREY
                    if z0 + 2.9 > a.top or self._probe(run, xc, bay / 2, z0) != "source":
                        break
                    f = run.frame.moved(xc, z0, 0.0)
                    if self.in_zone(f.at(0, 1.5, 0.05)):
                        continue
                    if not w.seen_from_play(f.at(0, 1.6, 0.05), run.n, rays=10):
                        continue
                    self._source_cell(lot, f, bay, z0, columns[b], b == 0, b == count - 1)
                    used = True
            runs += used
        self.log(f"facades: {runs} wall runs outside the building lots given bays")

    def _tower_cell(self, lot, f, bay, column, near):
        """A storey bay at or above SAFE_Z: free to project."""
        rng, kit = self.rng, self.kit
        lit = rng.random() < lot.p_lit
        if column == "B" and bay >= 2.2:
            cell = assets.balcony(kit, f, bay - 0.5, lot.wall, lot.tint, lot.trim, lot.sash, lit, rng.random() < 0.6, near)
            self.count("balconies")
            return
        if column == "S":
            assets.window(kit, f, 0.7, 0.6, 1.7, 3, lot.trim, lot.sash, lit, near)
            assets.pipe_stack(kit, f, bay / 2 - 0.35, 0.0, STOREY, radius=0.05, tint=(0.34, 0.24, 0.18))
            self.count("windows")
            return
        width = lot.window_width(bay)
        cell = assets.window(kit, f, width, lot.win_h, lot.sill, lot.kind, lot.trim, lot.sash, lit, near)
        self.count("windows")
        roll = rng.random()
        if roll < lot.p_cage:
            assets.cage(kit, f, width + 0.2, lot.sill - 0.25, lot.sill + lot.win_h + 0.05, 0.46, np.array((0.26, 0.34, 0.33)) * rng.uniform(0.7, 1.3), near)
            self.count("window cages")
        elif roll < lot.p_cage + lot.p_ac:
            x = rng.uniform(-width / 2 + 0.35, width / 2 - 0.35) if width > 0.8 else 0.0
            assets.air_conditioner(kit, f, x, lot.sill - 0.62, np.array((0.74, 0.74, 0.70)) * rng.uniform(0.65, 1.0))
            self.count("air conditioners")
        elif roll < lot.p_cage + lot.p_ac + lot.p_awning:
            assets.awning(kit, f, width + 0.3, lot.sill + lot.win_h + 0.45, 0.7, np.array(SHUTTER_TINTS[rng.integers(5)]) * rng.uniform(0.6, 1.0))
            self.count("awnings")
        elif roll > 0.86 and near:
            assets.drying_pole(kit, f, lot.sill - 0.05)
            self.count("drying poles")

    def _upper_cell(self, lot, f, bay, column):
        """A storey bay on a blockout wall above street level: flush pieces always, projecting ones only if provably safe."""
        rng, kit = self.rng, self.kit
        width = 0.7 if column == "S" else lot.window_width(bay)
        height, sill, kind = (0.6, 1.7, 3) if column == "S" else (lot.win_h, lot.sill, lot.kind)
        bounds = f.bounds(-width / 2 - 0.16, width / 2 + 0.16, sill - 0.75, sill + height + 0.2, -0.05, 0.6)
        if not self.free(bounds):
            return
        self.reserve(bounds)
        lit = rng.random() < lot.p_lit
        cell = assets.window(kit, f, width, height, sill, kind, lot.trim, lot.sash, lit, True)
        self.count("windows")
        if column == "S":
            return
        roll = rng.random()
        if roll < lot.p_cage:
            if self.may_protrude(f, -width / 2 - 0.1, width / 2 + 0.1, sill - 0.27, sill + height + 0.05, 0.46):
                assets.cage(kit, f, width + 0.2, sill - 0.25, sill + height + 0.05, 0.46, np.array((0.26, 0.34, 0.33)) * rng.uniform(0.7, 1.3))
                self.count("window cages")
        elif roll < lot.p_cage + lot.p_ac:
            x = rng.uniform(-width / 2 + 0.35, width / 2 - 0.35) if width > 0.8 else 0.0
            if self.may_protrude(f, x - 0.35, x + 0.35, sill - 0.95, sill - 0.17, 0.42):
                assets.air_conditioner(kit, f, x, sill - 0.62, np.array((0.74, 0.74, 0.70)) * rng.uniform(0.65, 1.0))
                self.count("air conditioners")
        elif roll < lot.p_cage + lot.p_ac + lot.p_awning:
            if self.may_protrude(f, -width / 2 - 0.15, width / 2 + 0.15, sill + height + 0.1, sill + height + 0.5, 0.7):
                assets.awning(kit, f, width + 0.3, sill + height + 0.45, 0.7, np.array(SHUTTER_TINTS[rng.integers(5)]) * rng.uniform(0.6, 1.0))
                self.count("awnings")

    def _street_cell(self, lot, f, bay, indoor):
        """A bay a player can stand against: everything stays within WALL_SKIN of the wall."""
        rng, kit = self.rng, self.kit
        half = bay / 2
        bounds = f.bounds(-half + 0.05, half - 0.05, 0.0, 3.08, -0.05, 0.5)
        if not self.free(bounds):
            return
        self.reserve(bounds)
        roll = rng.random()
        if indoor:
            if roll < 0.3:
                assets.meter_box(kit, f, rng.uniform(-half + 0.5, half - 0.5), 1.1, 1.25)
                self.count("meter boxes")
            elif roll < 0.6:
                self._posters(f, half)
            elif roll < 0.75:
                assets.vent(kit, f, rng.uniform(-half + 0.3, half - 0.8), 2.2)
            return
        if bay >= 2.5 and roll < 0.45:
            width = min(bay - 0.7, 2.6)
            assets.shutter(kit, f, width, 2.4, np.array(SHUTTER_TINTS[rng.integers(5)]) * rng.uniform(0.8, 1.15))
            self.count("shop shutters")
            if rng.random() < 0.6:
                assets.sign_board(kit, f, SHOP_WORDS[rng.integers(len(SHOP_WORDS))], NEON[rng.integers(len(NEON))], 2.68, 3.06, width / 2 + 0.09)
                self.count("shop signs")
        elif roll < 0.68:
            lit = rng.random() < lot.p_lit
            door_x = -bay * 0.2 if bay >= 2.2 else 0.0
            assets.door(kit, f.moved(door_x), 0.9, 2.05, np.array(SHUTTER_TINTS[rng.integers(5)]) * 0.8, lot.trim, lit)
            self.count("doors")
            if bay >= 2.6:
                wf = f.moved(bay * 0.24)
                cell = assets.window(kit, wf, 0.85, 0.95, 1.25, lot.kind, lot.trim, lot.sash, lit, True, grille=True)
                self.count("windows")
        elif roll < 0.86:
            lit = rng.random() < lot.p_lit
            width = max(0.8, min(1.5, bay - 1.0))
            cell = assets.window(kit, f, width, 1.1, 1.2, lot.kind, lot.trim, lot.sash, lit, True, grille=True)
            self.count("windows")
        else:
            self._posters(f, half)
            if rng.random() < 0.5:
                assets.meter_box(kit, f, rng.uniform(-half + 0.4, half - 0.4), 1.2, 1.5)
                self.count("meter boxes")
        lamp = f.moved(half - 0.02)
        if rng.random() < 0.6 and self.spaced("lamp", lamp.at(0, 2.5, 0), 7.5):
            roll = rng.random()
            assets.wall_lamp(kit, lamp, 2.52, LAMP_WARM if roll < 0.62 else LAMP_COOL if roll < 0.85 else LAMP_SODIUM, 260)
            self.count("wall lamps")

    def _posters(self, f, half):
        rng = self.rng
        x = -half + 0.25
        while x < half - 0.6:
            wdt, hgt = rng.uniform(0.3, 0.55), rng.uniform(0.4, 0.75)
            if rng.random() < 0.7:
                assets.poster(self.kit, f, x, rng.uniform(1.0, 1.6), wdt, hgt, POSTER_TINTS[rng.integers(len(POSTER_TINTS))])
                self.count("posters")
            x += wdt + rng.uniform(0.03, 0.4)

    def _rooftop(self, lot):
        """Silhouette pieces: only those some player can actually see are kept."""
        rng, kit, w = self.rng, self.kit, self.w
        top = lot.roof
        if lot.storeys:
            kit.tex("roofing").add(geo.quad((lot.x0, lot.y0, top), (lot.x1, lot.y0, top), (lot.x1, lot.y1, top), (lot.x0, lot.y1, top)), (0.9, 0.9, 0.9))
        x0, x1, y0, y1 = lot.x0 + 0.8, lot.x1 - 0.8, lot.y0 + 0.8, lot.y1 - 0.8
        if x1 - x0 < 1.5 or y1 - y0 < 1.5:
            return

        def visible(point):
            return w.seen_from_play(np.asarray(point, float), None, rays=26)

        if rng.random() < 0.6 and x1 - x0 > 3 and y1 - y0 > 3.2:
            hx, hy = rng.uniform(x0, x1 - 2.2), rng.uniform(y0, y1 - 2.6)
            if visible((hx + 1.1, hy + 1.3, top + 2.4)):
                assets.stair_hut(kit, (hx, hy, top), (hx + 2.2, hy + 2.6, top + 2.4), lot.wall, lot.tint * 0.95)
                self.count("roof huts")
        for _ in range(int(rng.integers(0, 3))):
            r, h = rng.uniform(0.8, 1.3), rng.uniform(1.4, 2.2)
            cx, cy = rng.uniform(x0 + 0.5, x1 - 0.5), rng.uniform(y0 + 0.5, y1 - 0.5)
            if visible((cx, cy, top + 0.9 + h)):
                assets.water_tank(kit, (cx, cy, top), r, h, np.array((0.55, 0.60, 0.62)) * rng.uniform(0.6, 1.1))
                self.count("water tanks")
        if rng.random() < 0.35 and x1 - x0 > 3.5 and y1 - y0 > 3.5:
            sx, sy = rng.uniform(x0, x1 - 2.8), rng.uniform(y0, y1 - 2.8)
            if visible((sx + 1.2, sy + 1.2, top + 2.5)):
                assets.shack(kit, (sx, sy, top), (sx + rng.uniform(2.0, 2.8), sy + rng.uniform(2.0, 2.8), top + 2.2),
                             np.array(SHUTTER_TINTS[rng.integers(5)]) * rng.uniform(0.6, 1.0))
                self.count("roof shacks")
        for _ in range(int(rng.integers(2, 8))):
            ax, ay, height = rng.uniform(x0 - 0.5, x1 + 0.5), rng.uniform(y0 - 0.5, y1 + 0.5), rng.uniform(2.5, 6.5)
            if visible((ax, ay, top + height)):
                assets.aerial(kit, (ax, ay, top), height)
                self.count("roof aerials")

    # ------------------------------------------------------------ free-roaming dressing on other walls
    def _anchors(self):
        w = self.w
        found = {}
        directions = [(math.cos(a), math.sin(a), 0.0) for a in np.arange(16) / 16 * 2 * math.pi]
        for x, y, z, head in w.samples:
            for d in directions:
                hit = w.ray((x, y, z + 1.5), d, 5.0)
                if hit is None:
                    continue
                loc, normal, index, dist = hit
                if abs(normal[2]) > 0.1 or np.dot(normal, d) > -0.35 or not w.structural[index]:
                    continue
                key = (round(loc[0] * 2), round(loc[1] * 2), round(z * 2), round(math.atan2(normal[1], normal[0]) * 2))
                if key not in found or dist < found[key][0]:
                    found[key] = (dist, Anchor(loc, normal, z, head == np.inf))
        anchors = [a for _, a in found.values()]
        for a in anchors:
            self._measure(a)
        self.log(f"anchors: {len(anchors)} wall points facing walkable space")
        return [anchors[i] for i in self.rng.permutation(len(anchors))]

    def _measure(self, a):
        w = self.w
        top = a.floor + 1.5
        for h in np.arange(1.75, 16.0, 0.25):
            hit = w.ray(a.at(0, h, 0.35), -a.n, 0.5)
            if hit is None or abs(hit[3] - 0.35) > 0.06:
                break
            top = a.floor + h
        ceiling = w.ray(a.at(0, 1.5, 0.35), (0, 0, 1))
        a.top = top
        a.free = min(top, a.floor + 1.5 + ceiling[3]) if ceiling else top

    def span(self, a, y, reach=4.0, step=0.25):
        """How far the same wall plane continues left and right at height y."""
        w = self.w
        out = []
        for sign in (-1, 1):
            s = 0.0
            while s + step <= reach:
                probe = a.at(sign * (s + step), y, 0.2)
                hit = w.ray(probe, -a.n, 0.3)
                if hit is None or abs(hit[3] - 0.2) > 0.03 or not w.clear(a.at(0, y, 0.2), probe, 0.0):
                    break
                s += step
            out.append(s)
        return out

    def callouts(self):
        for label, x, y, z, colour in CALLOUTS:
            best = None
            for a in self.anchors:
                if abs(a.floor - z) > 0.3 or a.free < a.floor + 2.9:
                    continue
                d = math.hypot(a.p[0] - x, a.p[1] - y)
                if d > 9 or (best and d >= best[0]) or min(self.span(a, 2.55, 1.5)) < 1.5:
                    continue
                best = (d, a)
            if not best:
                self.log(f"callout '{label}': no wall found near ({x}, {y}, {z})")
                continue
            f = Frame(best[1].at(0, 0, 0), best[1].n)
            self.reserve(f.bounds(-1.6, 1.6, 2.2, 2.9, -0.05, 0.5))
            assets.sign_board(self.kit, f, label, NEON[colour], 2.30, 2.82, 1.5)
            self.count("callout signs")

    def site_marks(self):
        kit = self.kit
        for letter, x, y, z, color in (("A", 87.0, 43.8, 0.0, (1.0, 0.62, 0.25)), ("B", 57.0, 35.0, 3.2, (0.35, 0.85, 0.95))):
            tris, size = kit.text(letter)
            s = 1.5 / size[1]
            world = np.zeros((len(tris), 3, 3))
            world[..., 0], world[..., 1], world[..., 2] = x + tris[..., 0] * s, y + tris[..., 1] * s, z + 0.006
            kit.flat().add(world, np.array(color) * 1.1, uv=np.zeros((len(world), 3, 2)))
            best = None
            for a in self.anchors:
                d = math.hypot(a.p[0] - x, a.p[1] - y)
                if abs(a.floor - z) < 0.3 and a.free >= a.floor + 2.9 and d < 10 and (not best or d < best[0]) and min(self.span(a, 1.9, 1.0)) >= 1.0:
                    best = (d, a)
            if best:
                f = Frame(best[1].at(0, 0, 0), best[1].n)
                self.reserve(f.bounds(-1.0, 1.0, 1.0, 2.9, -0.05, 0.5))
                kit.put_text(kit.flat(), letter, f.at(0, 1.95, 0.004), f.n, 1.6, 1.5, np.array(color))
                for y0 in (1.05, 2.78):
                    kit.flat().add(f.box(-0.9, 0.9, y0, y0 + 0.07, 0.0, 0.004), np.array(color))
            self.count("site marks")

    def lamps(self):
        rng = self.rng
        for a in self.anchors:
            if a.free < a.floor + 2.9 or self.in_zone(a.at(0, 1.5, 0.05)) or min(self.span(a, 2.6, 0.5)) < 0.25:
                continue
            f = Frame(a.at(0, 0, 0), a.n)
            bounds = f.bounds(-0.15, 0.15, 2.4, 3.1, -0.05, 0.4)
            if not self.free(bounds) or not self.spaced("lamp", a.at(0, 2.5, 0), 8.0 if a.outdoor else 11.0):
                continue
            self.reserve(bounds)
            roll = rng.random()
            assets.wall_lamp(self.kit, f, 2.62, LAMP_WARM if roll < 0.62 else LAMP_COOL if roll < 0.85 else LAMP_SODIUM, 260 if a.outdoor else 170)
            self.count("wall lamps")

    def ceiling_tubes(self):
        w, rng = self.w, self.rng
        for x, y, z, head in w.samples[rng.permutation(len(w.samples))]:
            if not (2.4 <= head <= 7.0):
                continue
            if any(w.ray((x, y, z + head - 0.3), d, 0.9) for d in ((1, 0, 0), (-1, 0, 0), (0, 1, 0), (0, -1, 0))):
                continue
            if not self.spaced("tube", (x, y, z), 4.6):
                continue
            along = np.array([1.0, 0, 0]) if rng.random() < 0.5 else np.array([0, 1.0, 0])
            assets.tube_light(self.kit, np.array([x, y, z + head]), along, LAMP_COOL if rng.random() < 0.6 else LAMP_WARM, head)
            self.count("ceiling tubes")

    def interior_walls(self):
        """Meter boxes, vents and bills on the walls the facade grammar does not own."""
        rng, kit = self.rng, self.kit
        for a in self.anchors:
            if a.free < a.floor + 2.6 or self.in_zone(a.at(0, 1.5, 0.05)):
                continue
            left, right = self.span(a, 1.4, 1.0)
            if min(left, right) < 0.75 or not self.spaced("wallprop", a.at(0, 1.4, 0), 5.0):
                continue
            f = Frame(a.at(0, 0, 0), a.n)
            bounds = f.bounds(-0.75, 0.75, 0.9, 2.6, -0.05, 0.3)
            if not self.free(bounds):
                continue
            self.reserve(bounds)
            roll = rng.random()
            if roll < 0.35:
                assets.meter_box(kit, f, 0.0, 1.1, min(1.3, a.free - a.floor - 1.75))
                self.count("meter boxes")
            elif roll < 0.8:
                self._posters(f, 0.9)
            else:
                assets.vent(kit, f, -0.25, 2.1)

    def neon_blades(self):
        rng = self.rng
        for a in self.anchors:
            if not a.outdoor or a.top < a.floor + 6.4:
                continue
            height = float(rng.choice([2.0, 2.6]))
            y0 = 3.45 + rng.random() * 0.3
            if y0 + height > a.top - a.floor - 0.2:
                continue
            f = Frame(a.at(0, 0, 0), a.n)
            bounds = f.bounds(-0.3, 0.3, y0, y0 + height, 0.0, 1.0)
            if not self.free(bounds) or not self.may_protrude(f, -0.06, 0.06, y0, y0 + height, 0.98):
                continue
            if not self.spaced("blade", a.at(0, y0, 0), 9.0):
                continue
            self.reserve(bounds)
            assets.neon_blade(self.kit, f, SHOP_WORDS[rng.integers(len(SHOP_WORDS))], NEON[rng.integers(len(NEON))], y0, height)
            self.count("projecting neon signs")

    def pipes(self):
        rng = self.rng
        tints = [(0.16, 0.22, 0.20), (0.30, 0.31, 0.30), (0.36, 0.20, 0.14), (0.50, 0.52, 0.50)]
        for a in self.anchors:
            if not a.outdoor or a.top < a.floor + 5.0 or self.in_zone(a.at(0, 1.5, 0.05)):
                continue
            height = a.top - a.floor - 0.15
            stop = self.w.ray(a.at(0, 0.1, 0.09), (0, 0, 1), height)
            if stop is not None:
                height = stop[3] - 0.05
            f = Frame(a.at(0, 0, 0), a.n)
            if height < 2.5 or not self.free(f.bounds(-0.1, 0.1, 0.0, height, 0.0, 0.2)) or not self.spaced("pipe", a.at(0, 0, 0), 5.5):
                continue
            assets.pipe_stack(self.kit, f, 0.0, 0.02, height, 0.05, tints[rng.integers(len(tints))])
            self.count("downpipes")

    def wall_cables(self):
        rng, flat = self.rng, self.kit.flat()
        for a in self.anchors:
            y = 2.66 + rng.random() * 0.12
            if a.free < a.floor + 2.9 or self.in_zone(a.at(0, 1.5, 0.05)):
                continue
            left, right = self.span(a, y, 7.0, 0.5)
            f = Frame(a.at(0, 0, 0), a.n)
            if left + right < 3.0 or not self.free(f.bounds(-left, right, y - 0.05, y + 0.25, 0.0, 0.1)):
                continue
            if not self.spaced("conduit", a.at(0, y, 0), 6.0):
                continue
            for k in range(int(rng.integers(2, 5))):
                yy, z = y + 0.045 * k, 0.03 + 0.012 * (k % 2)
                points = []
                for x in np.arange(-left, right + 1e-6, 1.5):
                    points.append(a.at(x, yy, z))
                    if x + 0.75 <= right:
                        points.append(a.at(x + 0.75, yy - 0.03 - 0.03 * rng.random(), z))
                if len(points) >= 2:
                    flat.add(geo.tube(points, 0.011, 3), (0.05, 0.05, 0.055))
            for x in np.arange(-left, right + 1e-6, 1.5):
                flat.add(f.box(x - 0.02, x + 0.02, y - 0.03, y + 0.2, 0.0, 0.05), (0.2, 0.2, 0.2))
            self.count("wall cable runs")

    def crossing_cables(self):
        w, rng, kit = self.w, self.rng, self.kit
        for a in self.anchors:
            if not a.outdoor or a.top < a.floor + 4.8:
                continue
            h = 4.3 + rng.random() * min(a.top - a.floor - 4.6, 5.5)
            start = a.at(0, h, 0)
            hit = w.ray(a.at(0, h, 0.05), a.n, 18.0)
            if hit is None or hit[3] < 2.2 or np.dot(hit[1], a.n) > -0.6:
                continue
            end = hit[0]
            pad = np.array([0.12, 0.12, 0.12])
            if not self.free((start - pad, start + pad)) or not self.free((end - pad, end + pad)):
                continue
            length = float(np.linalg.norm(end - start))
            sag = 0.12 + 0.05 * length
            line = geo.catenary(start, end, sag, 8)
            safe = True
            for p in line[1:-1]:
                below = w.ray((p[0], p[1], p[2] - 0.05), (0, 0, -1))
                if below is not None and w.walk[below[2]] and p[2] - below[0][2] < 2.7:
                    safe = False
            if not safe or not self.spaced("crossing", start, 3.4):
                continue
            for k in range(int(rng.integers(1, 4))):
                kit.flat().add(geo.tube(geo.catenary(start + Z * 0.05 * k, end + Z * 0.04 * k, sag * rng.uniform(0.7, 1.2), 8), 0.012, 3), (0.04, 0.04, 0.045))
            self.count("overhead cables")
            # Washing only above every eye height on the map, so cloth never screens an engagement.
            if line[:, 2].min() - 0.9 >= SAFE_Z - 0.6 and rng.random() < 0.8:
                direction = (end - start) / length
                for s in np.arange(0.2, 0.8, 0.09):
                    if rng.random() < 0.3:
                        continue
                    top_point = start + (end - start) * s
                    top_point[2] -= sag * 4 * s * (1 - s)
                    width, drop = rng.uniform(0.4, 0.7), rng.uniform(0.45, 0.85)
                    p0, p1 = top_point - direction * width / 2, top_point + direction * width / 2
                    kit.cloth().add(geo.quad(p0 - Z * drop, p1 - Z * drop, p1, p0), np.array(assets.CLOTH[rng.integers(len(assets.CLOTH))]), uv=np.zeros((2, 3, 2)))
                self.count("laundry lines")

    def run(self):
        self.callouts()
        self.site_marks()
        props.cover(self)
        self.buildings()
        self.orphan_facades()
        props.ceilings(self)
        props.ironwork(self)
        self.lamps()
        self.ceiling_tubes()
        self.neon_blades()
        self.interior_walls()
        self.pipes()
        self.wall_cables()
        self.crossing_cables()
        self.log("dressing: " + json.dumps(self.counts, ensure_ascii=False))


class Run:
    """A stretch of blockout wall treated as one facade; mirrors Side for the grammar."""

    def __init__(self, frame, length):
        self.frame, self.length, self.n = frame, length, frame.n

    def at(self, x, y=0.0, z=0.0):
        return self.frame.at(x, y, z)


class Anchor:
    """A point on a blockout wall that faces walkable space."""

    __slots__ = ("p", "n", "floor", "outdoor", "top", "free", "t")

    def __init__(self, p, n, floor, outdoor):
        self.p, self.floor, self.outdoor = p, floor, outdoor
        n = np.array([n[0], n[1], 0.0])
        self.n = n / np.linalg.norm(n)
        self.t = np.array([-self.n[1], self.n[0], 0.0])
        self.top = self.free = None

    def at(self, x=0.0, y=0.0, z=0.0):
        """Wall space to world: x along the wall, y above the anchor's floor, z out of the wall."""
        return np.array([self.p[0], self.p[1], self.floor]) + self.t * x + Z * y + self.n * z
