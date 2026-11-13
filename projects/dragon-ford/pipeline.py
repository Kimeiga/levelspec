"""Carved-mass layout pipeline for Dragon Ford.

One Python description of open volumes (spaces, apertures, stairs) carved from a
solid city block produces the labeled SVG drawings, sections, layout-data JSON and
the editable native AML. Meters, right-handed Z-up, +Y north.

Run through the layout module:  uv run --with shapely python projects/dragon-ford/layout.py
"""
from __future__ import annotations
import json, math, hashlib, os
from pathlib import Path
import xml.etree.ElementTree as X
from shapely import set_precision
from shapely.geometry import Polygon, LineString, Point, box
from shapely.ops import unary_union
from shapely.prepared import prep
from shapely.affinity import rotate as _rotate

H = 3.4          # storey height
SLAB = 0.3       # structural floor thickness
SKY = 1e6


def rect(x0, y0, x1, y1):
    return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]


EPS = 0.004  # grids at different angles round to millimetres; weld shared edges instead of leaving hairline walls


def weld(parts):
    # morphological closing: fuses hairline gaps without moving any outer face
    return unary_union([p.buffer(EPS, join_style=2) for p in parts]).buffer(-EPS, join_style=2)


def clean(g):
    g = set_precision(g.buffer(0), 0.001)
    return g


def polys(g):
    if g.is_empty:
        return []
    if g.geom_type == 'Polygon':
        return [g] if g.area > 0.02 else []
    return [p for p in getattr(g, 'geoms', []) if p.geom_type == 'Polygon' and p.area > 0.02]


def ring(p):
    return [[round(x, 3), round(y, 3)] for x, y in list(p.coords)[:-1]]


def link(a1, a2, b1, b2):
    """Wedge joining two openings that belong to different grids (convex hull of the four jamb points)."""
    from shapely.geometry import MultiPoint
    return [list(c) for c in MultiPoint([a1, a2, b1, b2]).convex_hull.exterior.coords[:-1]]


def valid(id, poly):
    p = Polygon(poly)
    if not p.is_valid:
        raise ValueError(f'{id}: invalid polygon (self-intersection?) {poly}')
    return p


class Frame:
    """A local district grid: origin in world meters, rotated `deg` counter-clockwise."""
    def __init__(self, ox, oy, deg):
        self.o = (ox, oy); self.c = math.cos(math.radians(deg)); self.s = math.sin(math.radians(deg)); self.deg = deg

    def p(self, u, v):
        return (round(self.o[0] + u * self.c - v * self.s, 3), round(self.o[1] + u * self.s + v * self.c, 3))

    def r(self, u0, v0, u1, v1):
        return [self.p(u0, v0), self.p(u1, v0), self.p(u1, v1), self.p(u0, v1)]

    def poly(self, pts):
        return [self.p(u, v) for u, v in pts]

    def inv(self, x, y):
        dx, dy = x - self.o[0], y - self.o[1]
        return (round(dx * self.c + dy * self.s, 2), round(-dx * self.s + dy * self.c, 2))


THEME_ANGLES = dict(W=-9, S=5, C=5, E=-12, N=-3)
THEME_BASE = {k: v for k, v in dict(
    mass=('wall-concrete-rough.png', '#b9b4a8', 0.5), mass2=('wall-concrete-repaired.png', '#b3ab9c', 0.5), mass3=('wall-concrete-rough.png', '#a7a9a8', 0.5),
    concrete=('concrete.png', '#c9c4b6', 0.65), slab=('concrete.png', '#b8b2a2', 0.65), paving=('ground-concrete.png', '#c8c4b8', 1.1),
    tower=('plaster.png', '#c4beb0', 0.65), tower2=('plaster.png', '#b4bcc0', 0.65), tower3=('plaster.png', '#cbbfa6', 0.65),
    stair=('concrete.png', '#b9a898', 0.65), sill=('concrete.png', '#a9b3ae', 0.65), tall=('wall-concrete-rough.png', '#8c8175', 0.5),
    low=('wall-concrete-repaired.png', '#a8977a', 0.5), tin=('sheet.png', '#aab8bb', 1.6)).items()}
THEME_MATERIALS = {
    'kowloon-mosaic': dict(repeat=1.4, roughness=0.88, texture='mosaic.png'),
    'kowloon-plaster': dict(repeat=0.65, roughness=0.88, texture='plaster.png'),
    'kowloon-concrete': dict(repeat=0.65, roughness=0.88, texture='concrete.png'),
    'kowloon-ground': dict(repeat=1.1, roughness=0.95, texture='ground-concrete.png', normal_texture='ground-normal.png', normal_scale=1.1),
    'kowloon-roofing': dict(repeat=0.65, roughness=0.88, texture='roofing.png'),
    'kowloon-lettering': dict(repeat=1, roughness=0.75, texture='lettering.png', alpha_cutoff=0.5),
    'kowloon-signboard': dict(repeat=0.8, roughness=0.7, texture='signboard.png'),
    'kowloon-rust': dict(repeat=2, roughness=0.92, metalness=0.2, texture='rust.png'),
    'kowloon-glazing': dict(repeat=1, roughness=0.2, texture='glazing.png'),
    'kowloon-metal': dict(repeat=1.4, roughness=0.6, metalness=0.2, texture='metal.png'),
    'kowloon-sheet': dict(repeat=1.6, roughness=0.6, metalness=0.3, texture='sheet.png'),
    'kowloon-timber': dict(repeat=1.5, roughness=0.8, texture='timber.png'),
    'kowloon-wall-concrete': dict(repeat=0.5, roughness=0.96, texture='wall-concrete-rough.png'),
    'kowloon-wall-render': dict(repeat=0.5, roughness=0.93, texture='wall-concrete-repaired.png'),
    'kowloon-wall-ceramic': dict(repeat=2.5, roughness=0.68, texture='wall-ceramic-weathered.png', normal_texture='wall-ceramic-normal.png', normal_scale=0.55),
    'kowloon-wall-edge': dict(color='#c2b6a4', repeat=4, roughness=0.98, texture='wall-concrete-rough.png', normal_texture='ground-normal.png', normal_scale=0.7),
    'kowloon-wall-metal': dict(repeat=2, roughness=0.68, metalness=0.55, texture='wall-metal-weathered.png', normal_texture='wall-metal-normal.png', normal_scale=0.45),
    'kowloon-wall-rust': dict(color='#bcb0a0', repeat=2, roughness=0.88, metalness=0.25, texture='wall-metal-weathered.png', normal_texture='wall-metal-normal.png', normal_scale=0.65),
    'kowloon-wall-cable': dict(color='#292721', repeat=4, roughness=0.87, texture='wall-metal-weathered.png', normal_texture='wall-metal-normal.png', normal_scale=0.18),
    'kowloon-wall-posters': dict(repeat=1, roughness=0.96, texture='posters-atlas.jpg'),
}


def rectangles(q, deg, least=3.0, most=40.0):
    """Greedy cover of a lot by rectangles on its own district grid (local coordinates of the grid rotated by deg)."""
    r = _rotate(q, -deg, origin=(0, 0))
    def lines(vals):
        out = []
        for v in sorted(vals):
            if not out or v - out[-1] > 0.05:
                out.append(v)
        return out
    cs = [c for ring_ in [r.exterior, *r.interiors] for c in ring_.coords]
    xs, ys = lines(c[0] for c in cs), lines(c[1] for c in cs)
    if len(xs) < 2 or len(ys) < 2:
        return []
    grown = r.buffer(0.01, join_style=2)
    free = [[grown.covers(box(xs[i], ys[j], xs[i + 1], ys[j + 1])) for j in range(len(ys) - 1)] for i in range(len(xs) - 1)]
    out = []
    while True:
        best = None
        for i0 in range(len(xs) - 1):
            for j0 in range(len(ys) - 1):
                jmax = len(ys) - 1
                for i1 in range(i0, len(xs) - 1):
                    j = j0
                    while j < jmax and free[i1][j]:
                        j += 1
                    jmax = j
                    if jmax == j0 or xs[i1 + 1] - xs[i0] > most:
                        break
                    j1 = jmax
                    while j1 > j0 and ys[j1] - ys[j0] > most:
                        j1 -= 1
                    w, h = xs[i1 + 1] - xs[i0], ys[j1] - ys[j0]
                    if w >= least and h >= least and (best is None or w * h > best[0]):
                        best = (w * h, i0, i1, j0, j1)
        if not best:
            return out
        _, i0, i1, j0, j1 = best
        for i in range(i0, i1 + 1):
            for j in range(j0, j1):
                free[i][j] = False
        out.append((xs[i0], ys[j0], xs[i1 + 1], ys[j1]))


def building_box(r, deg, outside, base, height, n):
    """AML box for the building kit: front (local −Y) on the side with the most frontage onto sky or the outer streets."""
    x0, y0, x1, y1 = r
    t = math.radians(deg); c, s = math.cos(t), math.sin(t)
    def world(p): return (p[0] * c - p[1] * s, p[0] * s + p[1] * c)
    sides = [((x0, y0), (x1, y0), (0, -1), 0), ((x1, y0), (x1, y1), (1, 0), 90), ((x1, y1), (x0, y1), (0, 1), 180), ((x0, y1), (x0, y0), (-1, 0), 270)]
    def frontage(side):
        P, Q, nrm, _ = side
        ln = math.dist(P, Q); k = max(1, int(ln))
        return sum(outside.contains(Point(world((P[0] + (Q[0] - P[0]) * (i + .5) / k + nrm[0] * .6, P[1] + (Q[1] - P[1]) * (i + .5) / k + nrm[1] * .6)))) for i in range(k)) * ln / k
    P, Q, nrm, turn = max(sides, key=frontage); best = frontage((P, Q, nrm, turn))
    w = math.dist(P, Q); d = (y1 - y0) if turn in (0, 180) else (x1 - x0)
    wp_ = world(P)
    return dict(id=f'tenement-{n}', position=(round(wp_[0], 4), round(wp_[1], 4), base), yaw=(deg + turn) % 360, width=round(w, 4), depth=round(d, 4),
                height=round(height, 4), frontage=best, poly=Polygon([world(p) for p in [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]]))


class Layout:
    def __init__(self, id, name, revision, envelope, bands=3):
        self.id, self.name, self.revision = id, name, revision
        self.envelope = Polygon(envelope)
        self.bands = bands
        self.spaces, self.apertures, self.stairs = [], [], []
        self.guards, self.covers, self.plots, self.lowplots = [], [], [], []
        self.anchors, self.journeys, self.notes, self.views, self.props = {}, [], [], [], []
        self.airs = []

    # ---- authoring vocabulary -------------------------------------------------
    def space(self, id, poly, z=0.0, kind='alley', name=None, sky=False, ceil=None, roof=False, label_at=None):
        base = round(z / H) * H
        aligned = abs(base - z) < 1e-6
        if ceil is None:
            ceil = SKY if sky else (z + H if aligned else z + 3.1)
        self.spaces.append(dict(id=id, name=name or id, poly=valid(id, poly), z=z, kind=kind, sky=sky, ceil=ceil,
                                roof=roof, aligned=aligned, label_at=label_at))

    def air(self, id, poly, zbot, ztop=SKY):
        """Open air with no floor of its own (e.g. the sky column above a roofed pavilion)."""
        self.airs.append(dict(id=id, poly=valid(id, poly), zbot=zbot, ztop=ztop))

    def door(self, id, poly, z=0.0, head=2.5, sky=False):
        self.apertures.append(dict(id=id, poly=valid(id, poly), z=z, sill=0.0, head=None if sky else head, kind='door', sky=sky))

    def portal(self, id, poly, z=0.0, sky=False):
        """Full-height opening joining two spaces (no lintel)."""
        self.apertures.append(dict(id=id, poly=valid(id, poly), z=z, sill=0.0, head=None, kind='portal', sky=sky))

    def window(self, id, poly, z=0.0, sill=1.1, head=2.3, sky=False):
        """Observation aperture: sill blocks movement. head=None leaves it open to the band top (parapet)."""
        self.apertures.append(dict(id=id, poly=valid(id, poly), z=z, sill=sill, head=head, kind='window', sky=sky))

    def parapet(self, id, poly, z, height=1.05):
        """Solid balustrade built as mass with exact faces (no overhang above a lower floor); open to the sky above."""
        self.apertures.append(dict(id=id, poly=valid(id, poly), z=z, sill=height, head=None, kind='window', sky=True))

    def stair(self, id, a, b, z0, z1, width=2.4, name=None, sky=False, ceil=None):
        dx, dy = b[0] - a[0], b[1] - a[1]
        L = math.hypot(dx, dy)
        nx, ny = -dy / L * width / 2, dx / L * width / 2
        foot = Polygon([[a[0] + nx, a[1] + ny], [a[0] - nx, a[1] - ny], [b[0] - nx, b[1] - ny], [b[0] + nx, b[1] + ny]])
        risers = math.ceil(abs(z1 - z0) / 0.175 - 1e-9)
        self.stairs.append(dict(id=id, name=name or id, a=list(a), b=list(b), z0=z0, z1=z1, width=width, poly=foot,
                                risers=risers, sky=sky, ceil=ceil, run=L))

    def guard(self, id, a, b, z, height=1.05, thickness=0.16):
        d = math.dist(a, b); ux, uy = (b[0] - a[0]) / d * 0.06, (b[1] - a[1]) / d * 0.06  # bed both ends into the adjoining mass
        self.guards.append(dict(id=id, a=[round(a[0] - ux, 3), round(a[1] - uy, 3)], b=[round(b[0] + ux, 3), round(b[1] + uy, 3)], z=z, height=height, thickness=thickness))

    def cover(self, id, poly, z, height, role='', material=None):
        self.covers.append(dict(id=id, poly=Polygon(poly), z=z, height=height, role=role, material=material))

    def prop(self, id, poly, z, height, role='', collidable=True, material='rust'):
        self.props.append(dict(id=id, poly=Polygon(poly), z=z, height=height, role=role, collidable=collidable, material=material))

    def plot(self, id, poly, top, name=None):
        """Tower mass above the carved bands (hidden with roofs off)."""
        self.plots.append(dict(id=id, poly=Polygon(poly), top=top, name=name or id))

    def lowplot(self, id, poly, top, name=None):
        """A low building: no solid above `top` (must be a band boundary or lower)."""
        self.lowplots.append(dict(id=id, poly=Polygon(poly), top=top, name=name or id))

    def anchor(self, id, p, kind):
        self.anchors[id] = dict(p=list(p), kind=kind)

    def journey(self, id, name, waypoints):
        self.journeys.append(dict(id=id, name=name, waypoints=[list(w) for w in waypoints]))

    # ---- derived geometry ------------------------------------------------------
    def volumes(self):
        out = []
        for s in self.spaces:
            out.append((s['poly'], s['z'], s['ceil']))
        for a in self.apertures:
            out.append((a['poly'], a['z'], SKY if a['sky'] else a['z'] + H))
        for a in self.airs:
            out.append((a['poly'], a['zbot'], a['ztop']))
        for s in self.stairs:
            lo, hi = min(s['z0'], s['z1']), max(s['z0'], s['z1'])
            out.append((s['poly'], lo, SKY if s['sky'] else (s['ceil'] or hi + 2.3)))
        return out

    def band_open(self, k):
        lo, hi = k * H, (k + 1) * H
        parts = [p for p, zb, zt in self.volumes() if zb < hi - 0.05 and zt > lo + SLAB + 0.01]
        parts += [p['poly'] for p in self.lowplots if p['top'] <= lo + 1e-6]
        # half-level floors have under 2 m to the next storey: let the storey above stand 3 mm back from their walls
        parts += [s['poly'].buffer(0.003, join_style=2) for s in self.spaces if not s['aligned'] and s['z'] < lo and s['ceil'] > lo + SLAB + 0.01]
        return clean(weld(parts)) if parts else Polygon()

    def band_solid(self, k):
        return clean(self.envelope.difference(self.band_open(k)))

    def sky_open(self):
        parts = [p for p, zb, zt in self.volumes() if zt >= SKY]
        return clean(unary_union(parts)) if parts else Polygon()

    def floors(self):
        """Walking slabs grouped by elevation: {z: geometry}."""
        by = {}
        for s in self.spaces:
            by.setdefault(round(s['z'], 3), []).append(s['poly'])
        for a in self.apertures:
            if a['sill'] == 0:
                by.setdefault(round(a['z'], 3), []).append(a['poly'])
        stairs = unary_union([s['poly'] for s in self.stairs]) if self.stairs else Polygon()
        out = {}
        for z, g in sorted(by.items()):
            f = weld(g).difference(stairs)
            base = math.floor(z / H + 1e-6) * H
            if abs(base - z) < 1e-6:  # raised platforms in this storey stand on their own plinths down to the storey base
                plinths = [s['poly'] for s in self.spaces if not s['aligned'] and abs(math.floor(s['z'] / H + 1e-6) * H - base) < 1e-6]
                if plinths:
                    f = f.difference(unary_union(plinths))
            sills = [a['poly'] for a in self.apertures if a['sill'] > 0 and abs(a['z'] - z) < 1e-6]
            if sills:
                f = f.difference(unary_union(sills))
            out[z] = clean(f)
        return out

    def space_at(self, p):
        best = None
        for s in self.spaces:
            if abs(s['z'] - p[2]) < 0.05 and s['poly'].buffer(0.01).covers(Point(p[0], p[1])):
                best = s
        return best

    def checks(self):
        out = dict(overlaps=[], thin=[], drops=[], anchors=[], stairEnds=[])
        tall = [s for s in self.spaces if s['ceil'] - s['z'] > H + 1]
        items = [(s['id'], s['poly'], s['z'], min(s['ceil'], s['z'] + 2.0), 'space') for s in self.spaces]
        items += [(s['id'], s['poly'], min(s['z0'], s['z1']), max(s['z0'], s['z1']) + 2.0, 'stair') for s in self.stairs]
        for i, (ia, pa, za, ta, ka) in enumerate(items):
            for ib, pb, zb, tb, kb in items[i + 1:]:
                if abs(za - zb) < 1e-6 and not (ka == kb == 'stair'):
                    continue  # same-level spaces may overlap (they union); a flight may stand in the room it rises from
                if any(t['id'] in (ia, ib) and t['z'] <= min(za, zb) + 1e-6 and t['poly'].buffer(0.05).covers(pa if t['id'] == ib else pb) for t in tall if not t['sky']):
                    continue  # a platform or flight standing inside a double-height room
                if za < tb and zb < ta and pa.intersection(pb).area > 0.02:
                    out['overlaps'].append([ia, ib, round(pa.intersection(pb).area, 2)])
        for k in range(self.bands):
            solid = self.band_solid(k)
            thin = solid.difference(solid.buffer(-0.14).buffer(0.15))
            for p in polys(thin):
                if p.area > 0.05:
                    c = p.representative_point()
                    out['thin'].append(dict(band=k, at=[round(c.x, 2), round(c.y, 2)], area=round(p.area, 2)))
        fl = self.floors()
        stairs = unary_union([s['poly'] for s in self.stairs]) if self.stairs else Polygon()
        guards = unary_union([LineString([g['a'], g['b']]).buffer(0.25) for g in self.guards]) if self.guards else Polygon()
        sills = unary_union([a['poly'] for a in self.apertures if a['sill'] > 0]) if any(a['sill'] > 0 for a in self.apertures) else Polygon()
        for z, g in fl.items():
            if z < 0.5:
                continue
            k = int(math.floor(z / H + 1e-6))
            void = self.band_open(k).difference(g.buffer(0.02)).difference(stairs.buffer(0.02)).difference(sills.buffer(0.02))
            edge = g.boundary.intersection(void.buffer(0.03)).difference(guards)
            if edge.length > 0.3:
                for ln in getattr(edge, 'geoms', [edge]):
                    if ln.length > 0.3:
                        c = ln.interpolate(0.5, normalized=True)
                        out['drops'].append(dict(z=z, at=[round(c.x, 2), round(c.y, 2)], length=round(ln.length, 2)))
        for id, a in self.anchors.items():
            if not self.space_at(a['p']):
                out['anchors'].append(id)
        for s in self.stairs:
            for end, p, z in [('low', s['a'], s['z0']), ('high', s['b'], s['z1'])]:
                dx, dy = (s['b'][0] - s['a'][0]) / s['run'], (s['b'][1] - s['a'][1]) / s['run']
                q = [p[0] - dx * 0.4, p[1] - dy * 0.4, z] if end == 'low' else [p[0] + dx * 0.4, p[1] + dy * 0.4, z]
                f = fl.get(round(z, 3))
                if f is None or not f.buffer(0.01).covers(Point(q[0], q[1])):
                    out['stairEnds'].append([s['id'], end])
        return out

    # ---- data ------------------------------------------------------------------
    def data(self):
        return dict(
            id=self.id, name=self.name, revision=self.revision, units='meters', axes='X east, Y north, Z up', storey=H, slab=SLAB,
            envelope=ring(self.envelope.exterior),
            spaces=[dict(id=s['id'], name=s['name'], kind=s['kind'], z=s['z'], sky=s['sky'], ceil=None if s['ceil'] >= SKY else s['ceil'],
                         polygon=ring(s['poly'].exterior), area=round(s['poly'].area, 1)) for s in self.spaces],
            apertures=[dict(id=a['id'], kind=a['kind'], z=a['z'], sill=a['sill'], head=a['head'], polygon=ring(a['poly'].exterior)) for a in self.apertures],
            stairs=[dict(id=s['id'], name=s['name'], a=s['a'], b=s['b'], z0=s['z0'], z1=s['z1'], width=s['width'], risers=s['risers'], run=round(s['run'], 2)) for s in self.stairs],
            guards=self.guards,
            covers=[dict(id=c['id'], z=c['z'], height=c['height'], role=c['role'], polygon=ring(c['poly'].exterior)) for c in self.covers],
            anchors=self.anchors,
            journeys=[dict(**j, length=round(sum(math.dist(a[:2], b[:2]) for a, b in zip(j['waypoints'], j['waypoints'][1:])), 1)) for j in self.journeys],
            views=self.views, notes=self.notes, checks=self.checks())

    # ---- drawings --------------------------------------------------------------
    COLORS = dict(alley='#d9d2bd', court='#e8dcae', room='#c9d6cf', site='#f0b56a', spawn='#b9d39a', gallery='#b7cfe3',
                  roof='#d5c7df', landing='#e3c9b5', hall='#cfd9c2')

    def svg_plan(self, k, title, scale=9, legend=True):
        bx0, by0, bx1, by1 = self.envelope.bounds
        m = 4
        W, Hh = (bx1 - bx0 + 2 * m) * scale, (by1 - by0 + 2 * m) * scale + 60
        X0, Y0 = bx0 - m, by1 + m

        def tx(x): return round((x - X0) * scale, 1)
        def ty(y): return round((Y0 - y) * scale + 60, 1)
        def pth(p):
            d = ''
            for r in [p.exterior, *p.interiors]:
                c = list(r.coords)
                d += 'M' + ' L'.join(f'{tx(x)},{ty(y)}' for x, y in c[:-1]) + 'Z '
            return d
        o = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W:.0f} {Hh:.0f}" font-family="Helvetica,Arial,sans-serif">',
             f'<rect width="{W:.0f}" height="{Hh:.0f}" fill="#f7f5ee"/>',
             f'<text x="14" y="26" font-size="20" font-weight="bold" fill="#222">{self.name} {self.revision} — {title}</text>',
             f'<text x="14" y="46" font-size="12" fill="#555">Meters; +Y north (up); grid 10 m; origin SW. Dark = solid city mass at this storey. Floor elevation z shown per label. Hatched pale = open air above a lower floor.</text>']
        lo, hi = k * H, (k + 1) * H
        solid = self.band_solid(k)
        for p in polys(solid):
            o.append(f'<path d="{pth(p)}" fill="#5b5f66" fill-rule="evenodd" stroke="#2c2e33" stroke-width="1"/>')
        o.append('<defs><pattern id="hat" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="8" stroke="#9aa3ad" stroke-width="1.5"/></pattern></defs>')
        here = [s for s in self.spaces if lo - 0.01 <= s['z'] < hi - 0.01]
        below_open = [s for s in self.spaces if s['z'] < lo - 0.01 and s['ceil'] > lo + SLAB + 0.01]
        hereu = unary_union([s['poly'] for s in here]) if here else Polygon()
        for s in below_open:
            for p in polys(s['poly'].difference(hereu)):
                o.append(f'<path d="{pth(p)}" fill="#eef1f4" stroke="none"/><path d="{pth(p)}" fill="url(#hat)" stroke="#9aa3ad" stroke-width="0.8" stroke-dasharray="4 3"/>')
        for s in here:
            c = self.COLORS.get(s['kind'], '#ddd')
            o.append(f'<path d="{pth(s["poly"])}" fill="{c}" stroke="#7b7566" stroke-width="0.8"/>')
        for a in self.apertures:
            if not (lo - 0.01 <= a['z'] < hi - 0.01):
                continue
            if a['kind'] == 'window':
                o.append(f'<path d="{pth(a["poly"])}" fill="#8fd0ee" stroke="#1d6f95" stroke-width="1.6" stroke-dasharray="3 2"/>')
            else:
                o.append(f'<path d="{pth(a["poly"])}" fill="#fff6d8" stroke="#b08a2e" stroke-width="1"/>')
        for s in self.stairs:
            slo, shi = min(s['z0'], s['z1']), max(s['z0'], s['z1'])
            if not (slo < hi - 0.05 and shi > lo + 0.05):
                continue
            o.append(f'<path d="{pth(s["poly"])}" fill="#e9a48d" stroke="#8a3d24" stroke-width="1"/>')
            n = max(4, int(s['run'] / 0.7))
            dx, dy = s['b'][0] - s['a'][0], s['b'][1] - s['a'][1]
            nx, ny = -dy / s['run'] * s['width'] / 2, dx / s['run'] * s['width'] / 2
            for i in range(1, n):
                x, y = s['a'][0] + dx * i / n, s['a'][1] + dy * i / n
                o.append(f'<line x1="{tx(x+nx)}" y1="{ty(y+ny)}" x2="{tx(x-nx)}" y2="{ty(y-ny)}" stroke="#8a3d24" stroke-width="0.6"/>')
            up_a, up_b = (s['a'], s['b']) if s['z1'] > s['z0'] else (s['b'], s['a'])
            o.append(f'<line x1="{tx(up_a[0])}" y1="{ty(up_a[1])}" x2="{tx(up_b[0])}" y2="{ty(up_b[1])}" stroke="#5a1d0c" stroke-width="2" marker-end="url(#arr)"/>')
            mx, my = (s['a'][0] + s['b'][0]) / 2, (s['a'][1] + s['b'][1]) / 2
            o.append(f'<text x="{tx(mx)}" y="{ty(my)-4}" font-size="9.5" text-anchor="middle" fill="#5a1d0c" font-weight="bold">{s["id"]} ↑{slo:g}→{shi:g}</text>')
        o.append('<defs><marker id="arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#5a1d0c"/></marker></defs>')
        for g in self.guards:
            if lo - 0.01 <= g['z'] < hi - 0.01:
                o.append(f'<line x1="{tx(g["a"][0])}" y1="{ty(g["a"][1])}" x2="{tx(g["b"][0])}" y2="{ty(g["b"][1])}" stroke="#0b6b3a" stroke-width="2.4"/>')
        for c in self.covers:
            if lo - 0.01 <= c['z'] < hi - 0.01:
                fill = '#8c6f4e' if c['height'] <= 1.3 else '#4a3a2a'
                o.append(f'<path d="{pth(c["poly"])}" fill="{fill}" stroke="#221a10" stroke-width="0.8"/>')
                q = c['poly'].centroid
                o.append(f'<text x="{tx(q.x)}" y="{ty(q.y)+3}" font-size="7.5" text-anchor="middle" fill="#fff">{c["height"]:g}</text>')
        for c in self.props:
            if lo - 0.01 <= c['z'] < hi - 0.01 and c['collidable']:
                o.append(f'<path d="{pth(c["poly"])}" fill="#6d7a86" stroke="#2c2e33" stroke-width="0.6"/>')
        gx = math.ceil(bx0 / 10) * 10
        while gx <= bx1:
            o.append(f'<line x1="{tx(gx)}" y1="{ty(by0-m/2)}" x2="{tx(gx)}" y2="{ty(by1+m/2)}" stroke="#000" stroke-opacity="0.13" stroke-width="0.6"/><text x="{tx(gx)}" y="{ty(by0-m/2)+11}" font-size="9" text-anchor="middle" fill="#444">{gx:g}</text>')
            gx += 10
        gy = math.ceil(by0 / 10) * 10
        while gy <= by1:
            o.append(f'<line x1="{tx(bx0-m/2)}" y1="{ty(gy)}" x2="{tx(bx1+m/2)}" y2="{ty(gy)}" stroke="#000" stroke-opacity="0.13" stroke-width="0.6"/><text x="{tx(bx0-m/2)-4}" y="{ty(gy)+3}" font-size="9" text-anchor="end" fill="#444">{gy:g}</text>')
            gy += 10
        for s in here:
            q = Point(s['label_at']) if s['label_at'] else s['poly'].representative_point()
            lines = s['name'].split('|')
            for i, t in enumerate(lines):
                o.append(f'<text x="{tx(q.x)}" y="{ty(q.y)+i*11-(len(lines)-1)*5}" font-size="10.5" text-anchor="middle" fill="#1b1b1b" font-weight="bold" stroke="#fff" stroke-width="2.5" paint-order="stroke">{t}</text>')
            tag = f'{s["id"]} z{s["z"]:g}' + (' sky' if s['sky'] else '')
            o.append(f'<text x="{tx(q.x)}" y="{ty(q.y)+len(lines)*11-(len(lines)-1)*5}" font-size="8" text-anchor="middle" fill="#444" stroke="#fff" stroke-width="2" paint-order="stroke">{tag}</text>')
        for id, a in self.anchors.items():
            if lo - 0.01 <= a['p'][2] < hi - 0.01:
                col = dict(attacker_spawn='#c0392b', defender_spawn='#1f5fae', objective='#d35400').get(a['kind'], '#333')
                o.append(f'<circle cx="{tx(a["p"][0])}" cy="{ty(a["p"][1])}" r="7" fill="{col}" stroke="#fff" stroke-width="2"/><text x="{tx(a["p"][0])}" y="{ty(a["p"][1])-10}" font-size="11" font-weight="bold" text-anchor="middle" fill="{col}" stroke="#fff" stroke-width="2.5" paint-order="stroke">{id}</text>')
        if legend:
            lx, ly = 14, Hh - 12
            items = [('alley', 'alley/lane'), ('court', 'open court'), ('room', 'interior'), ('hall', 'hall'), ('site', 'bomb site'), ('spawn', 'spawn'), ('gallery', 'gallery/bridge'), ('roof', 'roof terrace'), ('landing', 'landing')]
            for i, (kk, t) in enumerate(items):
                o.append(f'<rect x="{lx+i*92}" y="{ly-10}" width="12" height="12" fill="{self.COLORS[kk]}" stroke="#555"/><text x="{lx+i*92+16}" y="{ly}" font-size="10" fill="#333">{t}</text>')
            o.append(f'<text x="{lx+9*92}" y="{ly}" font-size="10" fill="#1d6f95">blue dashed = view aperture (no passage)</text><text x="{lx+9*92+210}" y="{ly}" font-size="10" fill="#0b6b3a">green = guard rail</text><text x="{lx+9*92+310}" y="{ly}" font-size="10" fill="#8a3d24">red = stair (arrow up)</text>')
        o.append(f'<g transform="translate({W-46},{92})"><path d="M0,22 L0,-18 M-6,-8 L0,-20 L6,-8" stroke="#222" stroke-width="2" fill="none"/><text x="0" y="-24" font-size="12" text-anchor="middle" font-weight="bold">N</text></g>')
        o.append('</svg>')
        return '\n'.join(o)

    def svg_section(self, id, a, b, title, scale=11, zmax=None):
        """Vertical section along a→b, looking left of travel. Solid = band masses/slabs; shows floors, stairs, guards."""
        zmax = zmax or self.bands * H + 2
        L = math.dist(a, b)
        line = LineString([a, b])
        W, Hh = L * scale + 120, (zmax + 2) * scale + 70

        def tx(d): return round(60 + d * scale, 1)
        def tz(z): return round(50 + (zmax - z) * scale, 1)
        def spans(g):
            x = line.intersection(g)
            out = []
            for ln in getattr(x, 'geoms', [x]):
                if ln.geom_type == 'LineString' and ln.length > 0.02:
                    d = sorted(line.project(Point(c)) for c in ln.coords)
                    out.append((d[0], d[-1]))
            return out
        o = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W:.0f} {Hh:.0f}" font-family="Helvetica,Arial,sans-serif">',
             f'<rect width="{W:.0f}" height="{Hh:.0f}" fill="#f7f5ee"/>',
             f'<text x="14" y="22" font-size="15" font-weight="bold">{self.name} {self.revision} — section {id}: {title}</text>',
             f'<text x="14" y="38" font-size="10.5" fill="#555">from ({a[0]:g},{a[1]:g}) to ({b[0]:g},{b[1]:g}); horizontal = distance along cut (m); vertical = z (m). Figure = 2.0 m standing body.</text>']
        o.append(f'<rect x="{tx(0)}" y="{tz(0)}" width="{L*scale:.1f}" height="{scale*1.2:.1f}" fill="#3d3f44"/>')
        for k in range(self.bands):
            for d0, d1 in spans(self.band_solid(k)):
                o.append(f'<rect x="{tx(d0)}" y="{tz((k+1)*H)}" width="{(d1-d0)*scale:.1f}" height="{H*scale:.1f}" fill="#5b5f66" stroke="#2c2e33" stroke-width="0.5"/>')
        sky = self.sky_open()
        for p in self.plots:
            for d0, d1 in spans(p['poly'].difference(sky)):
                top = min(p['top'], zmax)
                o.append(f'<rect x="{tx(d0)}" y="{tz(top)}" width="{(d1-d0)*scale:.1f}" height="{(top-self.bands*H)*scale:.1f}" fill="#8a8e96" stroke="#2c2e33" stroke-width="0.5"/>')
        for z, g in self.floors().items():
            for d0, d1 in spans(g):
                o.append(f'<rect x="{tx(d0)}" y="{tz(z)}" width="{(d1-d0)*scale:.1f}" height="{SLAB*scale:.1f}" fill="#c98b3a" stroke="#6b4514" stroke-width="0.5"/>')
        for s in self.spaces:
            if not s['aligned']:
                base = math.floor(s['z'] / H) * H
                for d0, d1 in spans(s['poly']):
                    o.append(f'<rect x="{tx(d0)}" y="{tz(s["z"]-SLAB)}" width="{(d1-d0)*scale:.1f}" height="{(s["z"]-SLAB-base)*scale:.1f}" fill="#6d7178"/>')
            if s['roof']:
                for d0, d1 in spans(s['poly']):
                    o.append(f'<rect x="{tx(d0)}" y="{tz(s["ceil"]+SLAB)}" width="{(d1-d0)*scale:.1f}" height="{SLAB*scale:.1f}" fill="#7a5a2a"/>')
        for a_ in self.apertures:
            for d0, d1 in spans(a_['poly']):
                if a_['sill'] > 0:
                    o.append(f'<rect x="{tx(d0)}" y="{tz(a_["z"]+a_["sill"])}" width="{(d1-d0)*scale:.1f}" height="{a_["sill"]*scale:.1f}" fill="#2d7fa6"/>')
                if a_['head']:
                    top = (math.floor((a_['z'] + a_['head']) / H + 1e-6) + 1) * H
                    o.append(f'<rect x="{tx(d0)}" y="{tz(top)}" width="{(d1-d0)*scale:.1f}" height="{(top-a_["z"]-a_["head"])*scale:.1f}" fill="#2d7fa6"/>')
        for s in self.stairs:
            sl = LineString([s['a'], s['b']])
            x = line.intersection(s['poly'])
            if x.is_empty or x.length < 0.05:
                continue
            cs = list(x.coords)
            pts = []
            for c in (cs[0], cs[-1]):
                t = sl.project(Point(c)) / s['run']
                pts.append((line.project(Point(c)), s['z0'] + (s['z1'] - s['z0']) * t))
            o.append(f'<polygon points="{tx(pts[0][0])},{tz(pts[0][1])} {tx(pts[1][0])},{tz(pts[1][1])} {tx(pts[1][0])},{tz(min(s["z0"],s["z1"]))} {tx(pts[0][0])},{tz(min(s["z0"],s["z1"]))}" fill="#e9a48d" stroke="#8a3d24"/>')
            o.append(f'<text x="{tx((pts[0][0]+pts[1][0])/2)}" y="{tz(max(pts[0][1],pts[1][1]))-4}" font-size="9" text-anchor="middle" fill="#5a1d0c">{s["id"]}</text>')
        for g in self.guards:
            x = line.intersection(LineString([g['a'], g['b']]).buffer(g['thickness'] / 2))
            if not x.is_empty and x.length > 0:
                d = line.project(x.centroid)
                o.append(f'<rect x="{tx(d)-1.5}" y="{tz(g["z"]+g["height"])}" width="3" height="{g["height"]*scale:.1f}" fill="#0b6b3a"/>')
        for c in self.covers:
            for d0, d1 in spans(c['poly']):
                o.append(f'<rect x="{tx(d0)}" y="{tz(c["z"]+c["height"])}" width="{(d1-d0)*scale:.1f}" height="{c["height"]*scale:.1f}" fill="#8c6f4e" stroke="#221a10" stroke-width="0.5"/>')
        for s in self.spaces:
            for d0, d1 in spans(s['poly']):
                if d1 - d0 > 2.2:
                    mid = (d0 + d1) / 2
                    o.append(f'<text x="{tx(mid)}" y="{tz(s["z"])-2.25*scale}" font-size="9" text-anchor="middle" fill="#1b1b1b" stroke="#fff" stroke-width="2" paint-order="stroke">{s["name"].replace("|"," ")}</text>')
                    o.append(f'<rect x="{tx(mid)-0.25*scale}" y="{tz(s["z"]+2.0)}" width="{0.5*scale:.1f}" height="{2.0*scale:.1f}" fill="none" stroke="#c0392b" stroke-width="1"/>')
        for k in range(self.bands + 1):
            o.append(f'<line x1="{tx(0)-8}" y1="{tz(k*H)}" x2="{tx(L)+8}" y2="{tz(k*H)}" stroke="#000" stroke-opacity="0.25" stroke-dasharray="5 4"/><text x="{tx(0)-12}" y="{tz(k*H)+3}" font-size="9" text-anchor="end">{k*H:g}</text>')
        d = 0
        while d <= L:
            o.append(f'<line x1="{tx(d)}" y1="{tz(0)+scale*1.2}" x2="{tx(d)}" y2="{tz(0)+scale*1.2+5}" stroke="#333"/><text x="{tx(d)}" y="{tz(0)+scale*1.2+16}" font-size="9" text-anchor="middle">{d:g}</text>')
            d += 10
        o.append('</svg>')
        return '\n'.join(o)

    # ---- native AML ------------------------------------------------------------
    def aml(self, path, cut=None, validation='playable', description='', facade_every=1, theme=None):
        root = X.Element('architecture', {'version': '1', 'id': self.id, 'name': f'{self.name} {self.revision}', 'units': 'meters',
                                          'validation': validation, 'description': description})

        def fmt(v):
            if v is True: return 'true'
            if v is False: return 'false'
            if isinstance(v, (int, float)): return f'{v:.4f}'.rstrip('0').rstrip('.') if isinstance(v, float) else str(v)
            return str(v)

        def el(tag, parent=root, **kw):
            return X.SubElement(parent, tag, {k.rstrip('_').replace('_', '-'): fmt(v) for k, v in kw.items() if v is not None})

        def pts(q): return '; '.join(' '.join(fmt(float(v)) for v in p) for p in q)

        def profile(id, p):
            e = el('profile', id=id, points=pts(ring(p.exterior)))
            for r in p.interiors:
                el('hole', e, points=pts(ring(r)))
            return id

        mats = dict(paving='#a9a698', concrete='#b9b5a6', mass='#8f958f', mass2='#9c9484', mass3='#868d96', slab='#b4ad98',
                    stair='#b58e76', guard='#5e7a6c', low='#8c7a5c', tall='#5a4f42', sill='#7d8f8c', court='#c9bd92',
                    asite='#d6a15c', bsite='#73b4a3', rust='#9a5a4c', tile='#5f7d6e', net='#3c4a50', tower='#a39f95',
                    tower2='#8e9aa0', tower3='#b0a48f', window='#3f5560', sign='#b8423a', pipe='#70675c', tin='#8fa3a8')
        for id, c in mats.items():
            if theme and id in THEME_BASE:
                tex, tint, repeat = THEME_BASE[id]
                el('material', id=id, color=tint, repeat=repeat, roughness=0.92, texture=f'{theme}/{tex}')
            else:
                el('material', id=id, color=c)
        if theme:
            for id, kw in THEME_MATERIALS.items():
                kw = dict(kw); kw['texture'] = f'{theme}/{kw["texture"]}'
                if 'normal_texture' in kw: kw['normal_texture'] = f'{theme}/{kw["normal_texture"]}'
                el('material', id=id, color=kw.pop('color', '#ffffff'), **kw)
        # themed build: upper storeys become generated tenement rows on rectangles cut from the tower lots
        # the kit's triangle budget does not hold 35 tenement rows of 6-10 storeys: the themed build keeps 3-6 storeys above the playable ones
        def themed_top(t): return (self.bands - 1) * H + H * max(3, round((t - (self.bands - 1) * H) * float(os.environ.get('DF_HSCALE', 0.55)) / H))
        tboxes = []; tcover = Polygon(); tower_list = []
        if cut is None:
            sky0 = self.sky_open(); covered0 = Polygon()
            for i, p in enumerate(self.plots):
                g = clean(p['poly'].intersection(self.envelope).difference(sky0).difference(covered0))
                covered0 = covered0.union(p['poly'])
                tower_list.append((i, p, polys(g)))
        if theme and cut is None:
            outside0 = prep(clean(box(-200, -200, 400, 400).difference(self.envelope).union(sky0)))
            base = (self.bands - 1) * H
            for i, p, qs in tower_list:
                deg = THEME_ANGLES.get(p['id'][3:4], 0)
                for q in qs:
                    for r in rectangles(q, deg):
                        b = building_box(r, deg, outside0, base, themed_top(p['top']) - base, len(tboxes))
                        if b['frontage'] >= 3:
                            tboxes.append(b)
            # the reviewer must compile within its load limit: only the rows with the most frontage onto the open courts are generated
            court = prep(sky0)
            def onto_court(b):
                c = list(b['poly'].exterior.coords)
                return sum(math.dist(p, q) for p, q in zip(c, c[1:]) if court.contains(Point((p[0] + q[0]) / 2, (p[1] + q[1]) / 2).buffer(0.8)) or court.intersects(Point((p[0] + q[0]) / 2, (p[1] + q[1]) / 2).buffer(0.8)) and not b['poly'].buffer(0.1).contains(Point((p[0] + q[0]) / 2, (p[1] + q[1]) / 2).buffer(0.8)))
            tboxes = sorted(tboxes, key=onto_court, reverse=True)[:int(os.environ.get('DF_BUILD', 6))]
            for n, b in enumerate(tboxes):
                b['id'] = f'tenement-{n}'
            tcover = unary_union([b['poly'] for b in tboxes]).buffer(0.002, join_style=2) if tboxes else Polygon()
        city = el('assembly', id='city', label='Carved city block: masses, floors, stairs', coincident_material='retained-face')
        det = el('group', id='dressing', label='Non-colliding presentation detail', collidable=False)
        mapping = []
        nb = self.bands if cut is None else cut + 1
        ztop_cut = nb * H
        # carved storey masses
        for k in range(nb):
            solid_k = self.band_solid(k)
            if theme and k == self.bands - 1 and cut is None:
                solid_k = clean(solid_k.difference(tcover).buffer(-0.04, join_style=2).buffer(0.04, join_style=2))
            for i, p in enumerate(polys(solid_k)):
                id = f'mass-{k}-{i}'
                if k == self.bands - 1 and cut is None:
                    el('roof', city, id=id, group='roofs', profile=profile(id + '-plan', p), elevation=(k + 1) * H, thickness=H, playable=False,
                       material='mass3', label=f'Storey {k} solid building mass (z {k*H:g}–{(k+1)*H:g}); hidden with roofs off for inspection')
                    continue
                el('extrusion', city, id=id, group=f'mass-{k}', profile=profile(id + '-plan', p), position=f'0 0 {fmt(k*H)}', distance=H - SLAB,
                   material=['mass', 'mass2', 'mass3'][k % 3], label=f'Storey {k} solid building mass (z {k*H:g}–{(k+1)*H-SLAB:g})')
                # the top slab-depth of the mass leaves room for the walking floors of the storey above (no coincident tops)
                above = self.floors().get(round((k + 1) * H, 3))
                capg = clean(p.difference(above.buffer(0.001))) if above is not None and not above.is_empty else p
                for j, cq in enumerate(polys(capg)):
                    cid = f'{id}-top-{j}'
                    el('extrusion', city, id=cid, group=f'mass-{k}', profile=profile(cid + '-plan', cq), position=f'0 0 {fmt((k+1)*H-SLAB)}', distance=SLAB,
                       material=['mass', 'mass2', 'mass3'][k % 3], label=f'Storey {k} mass top course')
        # floors
        floor_ids = {}
        for z, g in self.floors().items():
            if z >= ztop_cut - 0.01:
                continue
            base = math.floor(z / H + 1e-6) * H
            for i, p in enumerate(polys(g)):
                id = f'floor-{fmt(z).replace(".", "_")}-{i}'
                floor_ids.setdefault(z, []).append((id, p))
                el('slab', city, id=id, group=f'floor-{int(math.floor(z / H + 1e-6))}', profile=profile(id + '-plan', p), elevation=z, thickness=SLAB,
                   material='paving' if z == 0 else 'slab', label=f'Walking floor z={z:g}')
                if abs(base - z) > 1e-6:  # half-level platform: solid plinth below the slab down to the storey base
                    el('extrusion', city, id=id + '-plinth', group='plinths', profile=id + '-plan', position=f'0 0 {fmt(base)}', distance=z - base - SLAB,
                       material='mass', label=f'Plinth under the z={z:g} platform')
        # aperture sills / lintels
        for a in self.apertures:
            if a['z'] >= ztop_cut - 0.01:
                continue
            top = (math.floor((a['z'] + (a['head'] or 0.1)) / H + 1e-6) + 1) * H
            if a['sill'] > 0:
                sbase = math.floor(a['z'] / H + 1e-6) * H  # a sill at a half-level stands on its own plinth
                el('extrusion', city, id=a['id'] + '-sill', group='apertures', profile=profile(a['id'] + '-sill-plan', a['poly']),
                   position=f'0 0 {fmt(sbase)}', distance=a['z'] - sbase + a['sill'], material='sill', label=f'{a["id"]} sill {a["sill"]:g} m: view only, no passage')
            if a['head']:
                el('extrusion', city, id=a['id'] + '-head', group='apertures', profile=profile(a['id'] + '-head-plan', a['poly']),
                   position=f'0 0 {fmt(a["z"]+a["head"])}', distance=top - a['z'] - a['head'], material='concrete', label=f'{a["id"]} lintel at {a["head"]:g} m')
            mapping.append(dict(layout=a['id'], kind=a['kind']))
        # room canopies
        for s in self.spaces:
            if s['roof'] and s['ceil'] + SLAB <= ztop_cut + 0.01:
                id = s['id'] + '-canopy'
                el('canopy', city, id=id, group='roofs', profile=profile(id + '-plan', s['poly']), elevation=s['ceil'] + SLAB, thickness=SLAB,
                   playable=False, material='tin', label=f'{s["name"]} cover')
        # stairs
        for s in self.stairs:
            if min(s['z0'], s['z1']) >= ztop_cut - 0.01:
                continue
            a, b, z0, z1 = (s['a'], s['b'], s['z0'], s['z1']) if s['z1'] > s['z0'] else (s['b'], s['a'], s['z1'], s['z0'])
            pid = s['id'] + '-axis'
            el('path', id=pid, points=pts([[*a, z0], [*b, z1]]))
            el('stairs', city, id=s['id'], group='stairs', path=pid, width=s['width'], count=s['risers'], underside='filled', material='stair', label=s['name'])
            sbase = math.floor(z0 / H + 1e-6) * H
            if z0 - sbase > 1e-6:  # a flight starting at a half-level stands on a solid plinth down to the storey base
                el('extrusion', city, id=s['id'] + '-plinth', group='plinths', profile=profile(s['id'] + '-plinth-plan', s['poly']), position=f'0 0 {fmt(sbase)}',
                   distance=z0 - sbase, material='mass', label=f'Plinth under {s["name"]}')
            mapping.append(dict(layout=s['id'], aml=s['id']))
        for g in self.guards:
            if g['z'] >= ztop_cut - 0.01:
                continue
            pid = g['id'] + '-axis'
            el('path', id=pid, points=pts([[*g['a'], g['z']], [*g['b'], g['z']]]))
            el('wall', city, id=g['id'], group='guards', path=pid, thickness=g['thickness'], height=g['height'], material='guard', label='Guard / parapet')
        for c in self.covers:
            if c['z'] >= ztop_cut - 0.01:
                continue
            el('extrusion', city, id=c['id'], group='cover', profile=profile(c['id'] + '-plan', c['poly']), position=f'0 0 {fmt(c["z"])}',
               distance=c['height'], material=c.get('material') or ('low' if c['height'] <= 1.3 else 'tall'), label=c['role'])
            mapping.append(dict(layout=c['id'], aml=c['id']))
        for c in self.props:
            if c['z'] >= ztop_cut - 0.01:
                continue
            parent = city if c['collidable'] else det
            kw = {} if c['collidable'] else dict(collidable=False)
            el('extrusion', parent, id=c['id'], group='props', profile=profile(c['id'] + '-plan', c['poly']), position=f'0 0 {fmt(c["z"])}',
               distance=c['height'], material=c['material'], label=c['role'], **kw)
        # towers and roof caps (hidden with roofs off)
        if cut is None:
            sky = self.sky_open()
            top = self.bands * H
            covered = Polygon(); towers = []
            for i, p, qs in tower_list:
                covered = covered.union(p['poly'])
                if theme:
                    qs = [r for q in qs for r in polys(clean(q.difference(tcover).buffer(-0.04, join_style=2).buffer(0.04, join_style=2))) if r.area > 0.5]
                if theme:
                    p = dict(p, top=themed_top(p['top']))
                for j, q in enumerate(qs):
                    towers.append((q, p['top']))
                    id = f'{p["id"]}-tower-{j}'
                    el('roof', city, id=id, group='roofs', profile=profile(id + '-plan', q), elevation=p['top'], thickness=p['top'] - top,
                       playable=False, material=['tower', 'tower2', 'tower3'][i % 3], label=f'{p["name"]}: upper storeys, inaccessible')
            # facade bays on tower faces that look onto open sky or the outside streets (presentation only, hidden with roofs)
            outside = clean(box(-200, -200, 400, 400).difference(self.envelope).union(sky))
            n = 0; placed = []
            for q, ttop in ([] if theme else towers):
                if True:
                    c = list(q.exterior.coords)
                    ccw = q.exterior.is_ccw
                    for a_, b_ in zip(c, c[1:]):
                        ex, ey = b_[0] - a_[0], b_[1] - a_[1]; ln = math.hypot(ex, ey)
                        if ln < 3.2:
                            continue
                        ux, uy = ex / ln, ey / ln
                        nx, ny = (uy, -ux) if ccw else (-uy, ux)
                        mx, my = (a_[0] + b_[0]) / 2, (a_[1] + b_[1]) / 2
                        if not outside.contains(Point(mx + nx * 0.4, my + ny * 0.4)):
                            continue
                        k = int(ln // 3.4)
                        for z in [top + 1.3 + 3.4 * f for f in range(0, int((ttop - top - 2.2) // 3.4), facade_every)]:
                            for j in range(k):
                                d = (j + 0.5) * ln / k
                                x, y = a_[0] + ux * d, a_[1] + uy * d
                                if any(abs(z - pz) < 0.1 and math.hypot(x - px, y - py) < 1.8 for px, py, pz in placed):
                                    continue
                                placed.append((x, y, z))
                                quad = Polygon([(x - ux * .75, y - uy * .75), (x + ux * .75, y + uy * .75),
                                                (x + ux * .75 + nx * .07, y + uy * .75 + ny * .07), (x - ux * .75 + nx * .07, y - uy * .75 + ny * .07)])
                                id = f'bay-{n}'; n += 1
                                el('roof', city, id=id, group='roofs', profile=profile(id + '-p', quad), elevation=z + 1.4, thickness=1.4, playable=False, material='window', label='Facade bay (presentation)')
            rest = clean(self.band_solid(self.bands - 1).difference(covered))
            for j, q in enumerate(polys(rest)):
                id = f'cap-{j}'
                el('roof', city, id=id, group='roofs', profile=profile(id + '-plan', q), elevation=top + 0.25, thickness=0.25, playable=False, material='tin', label='Roof cap')
            for lp in self.lowplots:
                k = int(round(lp['top'] / H))
                g = clean(lp['poly'].intersection(self.band_solid(k - 1))) if k >= 1 else Polygon()
                for j, q in enumerate(polys(g)):
                    id = f'{lp["id"]}-cap-{j}'
                    el('roof', city, id=id, group='roofs', profile=profile(id + '-plan', q), elevation=lp['top'] + 0.25, thickness=0.25, playable=False, material='tile', label=f'{lp["name"]} roof')
        def floor_of(p):
            for z, lst in floor_ids.items():
                if abs(z - p[2]) < 0.05:
                    for id, g in lst:
                        if g.buffer(0.01).covers(Point(p[0], p[1])):
                            return id
            raise ValueError(f'No floor under marker {p}')
        if cut is None:
            for n in self.notes:
                if 'polygon' not in n:
                    continue
                q = Polygon(n['polygon']); c = q.representative_point()
                host = floor_of([c.x, c.y, n['z']])
                el('face-material', id=n['id'].lower() + '-paint', host=host, face='top', profile=profile(n['id'].lower() + '-zone', q), material='asite' if n['id'].endswith('A') else 'bsite')
        if theme and cut is None:
            self._theme(el, pts, fmt, floor_ids, tboxes)
        el('player', radius=.25, height=2, step=.25, slope=42, crouch=1.1, vault=0, rappel=False, ladder=False)

        if cut is None:
            for id, a in self.anchors.items():
                el('marker', id=id, position=' '.join(fmt(float(v)) for v in a['p']), kind=a['kind'], element=floor_of(a['p']), movement='land')
            for j in self.journeys:
                w = j['waypoints']
                el('marker', id=j['id'] + '-start', position=' '.join(fmt(float(v)) for v in w[0]), kind='poi', element=floor_of(w[0]), movement='land')
                el('marker', id=j['id'] + '-end', position=' '.join(fmt(float(v)) for v in w[-1]), kind='poi', element=floor_of(w[-1]), movement='land')
                length = sum(math.dist(a[:2], b[:2]) for a, b in zip(w, w[1:]))
                el('route', id=j['id'], from_=j['id'] + '-start', to=j['id'] + '-end', min_routes=1, max_distance=math.ceil(length * 1.25 + 10), movement='land')
            spawns = [i for i, a in self.anchors.items() if a['kind'].endswith('_spawn')]
            ts = [i for i in spawns if self.anchors[i]['kind'] == 'attacker_spawn'][:1]
            cs = [i for i in spawns if self.anchors[i]['kind'] == 'defender_spawn'][:1]
            if ts and cs:
                el('no-spawn-los', markers=f'{ts[0]} {cs[0]}')
        X.indent(root, space='  ')
        X.ElementTree(root).write(path, encoding='utf-8', xml_declaration=True)
        return mapping

    def _theme(self, el, pts, fmt, floor_ids, tboxes):
        """Kowloon street kit: thin non-colliding lining walls on every carved face of the two playable storeys,
        patched ground on the walking slabs, generated tenement rows above. Physical geometry is unchanged."""
        liners = el('group', id='linings', label='Non-colliding wall linings that receive the Kowloon wall kit', collidable=False)
        # the kit accepts 128 receiving hosts: linings are polylines of about equal length along each carved face
        rings = [(k, r) for k in range(self.bands - 1) for p in polys(self.band_solid(k))
                 for q in polys(p.simplify(0.002).buffer(0.0153, join_style=2)) for r in [q.exterior, *q.interiors]]
        budget = 128 - sum(len(v) for v in floor_ids.values()) - len(self.stairs) - len(tboxes)
        span = sum(r.length for _, r in rings) / max(1, budget - len(rings))
        walls = []
        edge = self.envelope.exterior
        for k, r in rings:
            c = [p for i, p in enumerate(r.coords) if i == 0 or math.dist(p, r.coords[i - 1]) > 0.02]
            def mid(a, b): return ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
            c = [mid(c[0], c[1]), *c[1:], mid(c[0], c[1])]   # joints sit mid-edge so neighbouring linings butt squarely
            chunks = max(1, round(r.length / span)); target = r.length / chunks
            run = [c[0]]; acc = 0
            for a, b in zip(c, c[1:]):
                if edge.distance(Point(mid(a, b))) < 0.05:   # the outer face of the block is never seen from play
                    if len(run) > 1: walls.append((k, run))
                    run = [b]; acc = 0
                    continue
                ln = math.dist(a, b)
                if acc >= target and ln > 0.6:
                    m = mid(a, b); run.append(m); walls.append((k, run)); run = [m]; acc = 0
                run.append(b); acc += ln
            if len(run) > 1:
                walls.append((k, run))
        assert len(walls) <= budget, (len(walls), budget)
        for i, (k, run) in enumerate(walls):
            id = f'lining-{i}'
            el('path', id=id + ':path', points=pts([[x, y, k * H + 0.0037] for x, y in run]))
            el('wall', liners, id=id, group='linings', path=id + ':path', thickness=0.02, height=H - 0.0074, join='miter', material='kowloon-plaster', collidable=False)
        for b in tboxes:
            el('box', id=b['id'], group='tenements', position=' '.join(fmt(float(v)) for v in b['position']), rotation=f'0 0 {fmt(float(b["yaw"]))}',
               width=b['width'], depth=b['depth'], height=b['height'], collidable=False, material='kowloon-plaster', label='Generated tenement row above the playable storeys')
        if os.environ.get('DF_NODRESS'): return
        d = el('dressing', theme='kowloon-street@1', seed='dragon-ford-r02', finishes='kowloon', grime=0.7, wear=0.4, detail=os.environ.get('DF_DETAIL', 'low'),
               wall_materials='kowloon-wall-concrete kowloon-wall-render kowloon-plaster')
        patched = [float(v) for v in os.environ.get('DF_PATCHED', '').split()]
        for z, lst in floor_ids.items():
            for id, g in lst:
                if z in patched:
                    el('floor', d, host=id, material='kowloon-ground', ground='patched', patch_size=float(os.environ.get('DF_PATCH', 3.5)), material_size=10, relief=0.02, wetness=0.4,
                       litter=0.3, repairs=0.6, joined_pours=0.8, asphalt=0.12, manholes=0.3, breakup=0.4, tile_share=0.12, timber_share=0.02)
                elif str(z) not in os.environ.get('DF_NOFLOOR', '').split():
                    el('floor', d, host=id, material='kowloon-ground')
        for s in self.stairs:
            el('floor', d, host=s['id'], material='kowloon-concrete')
        for i in range(len(walls) if os.environ.get('DF_WALLS', '1') == '1' else 0):
            el('wall', d, host=f'lining-{i}', face='side', windows=False, material='kowloon-plaster', tile_share=[0.15, 0.35, 0.55][i % 3] * float(os.environ.get('DF_TILE', 0.1)))
        for b in tboxes:
            el('building', d, host=b['id'], material='kowloon-plaster')
        el('spans', d, cables=0.7, clotheslines=0.4, signs=0.35, clearance=2.7, reach=9)

    def write_drawings(self, out: Path, plans, sections=()):
        out.mkdir(parents=True, exist_ok=True)
        files = []
        for k, title in plans:
            f = out / f'plan-{k}.svg'
            f.write_text(self.svg_plan(k, title))
            files.append(f)
        for id, a, b, title in sections:
            f = out / f'section-{id}.svg'
            f.write_text(self.svg_section(id, a, b, title))
            files.append(f)
        (out / 'layout-data.json').write_text(json.dumps(self.data(), indent=1) + '\n')
        return files
