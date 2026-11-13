"""Modeled kit pieces for the Ninefold art pass.

Every piece is real geometry written into shared material buckets, placed in a
wall Frame: x runs along the wall (to the viewer's right), y is up, z is out of
the wall. Pieces mounted on a wall leave their hidden back face open.
"""
import math

import numpy as np

import geo
from geo import Z, bucket

LAMP_WARM, LAMP_COOL, LAMP_SODIUM = (1.0, 0.70, 0.42), (0.84, 0.96, 1.0), (1.0, 0.55, 0.20)
NEON = [(1.0, 0.16, 0.12), (0.15, 0.85, 1.0), (1.0, 0.72, 0.15), (0.25, 1.0, 0.5), (1.0, 0.25, 0.65), (1.0, 0.95, 0.85)]
ROOM_LIGHT = [(1.0, 0.70, 0.36), (0.70, 0.92, 1.0), (1.0, 0.82, 0.55), (0.72, 1.0, 0.78)]
CLOTH = [(0.85, 0.85, 0.82), (0.75, 0.30, 0.26), (0.30, 0.42, 0.66), (0.86, 0.74, 0.36), (0.55, 0.58, 0.60), (0.40, 0.58, 0.48)]
DARK = np.array((0.09, 0.10, 0.10))


class Frame:
    def __init__(self, origin, normal):
        self.o = np.asarray(origin, float)
        self.t, self.up, self.n = geo.wall_frame(normal)

    def at(self, x=0.0, y=0.0, z=0.0):
        return self.o + self.t * x + self.up * y + self.n * z

    def box(self, x0, x1, y0, y1, z0, z1, open_back=None):
        return geo.obox(self.o, self.t, self.up, self.n, (x0, y0, z0), (x1, y1, z1), z0 <= 1e-6 if open_back is None else open_back)

    def quad(self, x0, x1, y0, y1, z):
        return geo.quad(self.at(x0, y0, z), self.at(x1, y0, z), self.at(x1, y1, z), self.at(x0, y1, z))

    def moved(self, x=0.0, y=0.0, z=0.0):
        return Frame(self.at(x, y, z), self.n)

    def bounds(self, x0, x1, y0, y1, z0=-0.2, z1=0.3):
        pts = np.array([self.at(x, y, z) for x in (x0, x1) for y in (y0, y1) for z in (z0, z1)])
        return pts.min(0), pts.max(0)


class Kit:
    """Material buckets, bake lights and randomness shared by all pieces."""

    def __init__(self, rng):
        self.rng = rng
        self.lights = []
        self._text = {}
        self._font = None

    # ---- buckets
    def flat(self):
        return bucket("decor_flat", None, 1.0)

    def tex(self, name):
        return bucket(f"decor_{name}", name, geo.SCALES[name])

    def trim(self):
        """Rendered mouldings: surrounds, sills, string courses, copings."""
        return self.tex("plaster")

    def shell(self, name):
        """Generated building walls."""
        return bucket(f"shell_{name}", name, geo.SCALES[name])

    def emit(self):
        return bucket("emit", None, 1.0, "emit")

    def glass(self):
        return bucket("glass", "glass", 1.0, "emit")

    def cloth(self):
        return bucket("cloth", None, 1.0)

    # ---- lights: descriptions the viewer turns into real-time lights
    def light(self, kind, pos, direction, color, power, reach=None):
        """kind: lamp, tube, sign or fire. direction is the axis the light throws along; reach in metres."""
        d = np.asarray(direction, float)
        self.lights.append({"kind": kind, "pos": [float(v) for v in pos], "dir": [float(v) for v in d / np.linalg.norm(d)],
                            "color": [float(c) for c in color], "power": float(power), "reach": reach})

    # ---- text
    def text(self, string):
        """Triangulated glyph outline in em units, centred on the origin: (tris (T,3,2), size)."""
        import bpy
        if string in self._text:
            return self._text[string]
        if self._font is None:
            try:
                self._font = bpy.data.fonts.load("/System/Library/Fonts/STHeiti Medium.ttc")
            except Exception:  # noqa: BLE001 - fall back to Blender's built-in Latin font
                self._font = False
        curve = bpy.data.curves.new("text", "FONT")
        curve.body = string
        curve.resolution_u = 2
        if self._font:
            curve.font = self._font
        obj = bpy.data.objects.new("text", curve)
        bpy.context.scene.collection.objects.link(obj)
        mesh = obj.evaluated_get(bpy.context.evaluated_depsgraph_get()).to_mesh()
        mesh.calc_loop_triangles()
        co = np.array([v.co[:2] for v in mesh.vertices])
        tris = np.array([co[list(t.vertices)] for t in mesh.loop_triangles]) if len(mesh.loop_triangles) else np.zeros((0, 3, 2))
        obj.to_mesh_clear()
        bpy.data.objects.remove(obj)
        size = np.array([1.0, 1.0])
        if len(tris):
            area = np.cross(tris[:, 1] - tris[:, 0], tris[:, 2] - tris[:, 0])
            tris[area < 0] = tris[area < 0][:, ::-1]
            lo, hi = tris.reshape(-1, 2).min(0), tris.reshape(-1, 2).max(0)
            tris, size = tris - (lo + hi) / 2, hi - lo
        self._text[string] = (tris, size)
        return self._text[string]

    def put_text(self, target, string, origin, normal, width, height, color):
        """Fits the string inside width x height, centred on origin, readable when facing the normal."""
        tris, size = self.text(string)
        if not len(tris):
            return
        s = min(width / size[0], height / size[1])
        t, up, _ = geo.wall_frame(normal)
        world = np.asarray(origin, float) + tris[..., 0:1] * s * t + tris[..., 1:2] * s * up
        target.add(world, color, uv=np.zeros((len(world), 3, 2)))


# ---------------------------------------------------------------- glazing
def glass_pane(kit, f, x0, x1, y0, y1, z, lit, cell):
    """One pane from the 4 x 2 room atlas; the upper atlas row is lit."""
    u0, v0 = cell / 4, 0.5 if lit else 0.0
    pad = 0.006
    ua, ub, va, vb = u0 + pad, u0 + 0.25 - pad, v0 + pad, v0 + 0.5 - pad
    uv = np.array([[[ua, va], [ub, va], [ub, vb]], [[ua, va], [ub, vb], [ua, vb]]])
    kit.glass().add(f.quad(x0, x1, y0, y1, z), (1, 1, 1), uv=uv)


def window(kit, f, w, h, sill, kind, trim, sash, lit, near=True, grille=False):
    """Opening w x h with its sill at height `sill`: surround, sill, sashes and glazing bars.

    kind 0 two-leaf casement, 1 three-leaf with transom, 2 single with transom, 3 louvre.
    Nothing here stands more than 0.14 m proud of the wall.
    """
    flat, mould = kit.flat(), kit.trim()
    hw, y0, y1 = w / 2, sill, sill + h
    mould.add(f.box(-hw - 0.10, hw + 0.10, y1, y1 + 0.13, 0, 0.10), trim)
    mould.add(f.box(-hw - 0.10, -hw, y0, y1, 0, 0.09), trim)
    mould.add(f.box(hw, hw + 0.10, y0, y1, 0, 0.09), trim)
    mould.add(f.box(-hw - 0.14, hw + 0.14, y0 - 0.07, y0, 0, 0.14), trim * 0.9)
    cell = int(kit.rng.integers(4))
    glass_pane(kit, f, -hw, hw, y0, y1, 0.012, lit, cell)
    bar = 0.045
    if near:
        for x0, x1, ya, yb in ((-hw, hw, y0, y0 + bar), (-hw, hw, y1 - bar, y1), (-hw, -hw + bar, y0, y1), (hw - bar, hw, y0, y1)):
            flat.add(f.box(x0, x1, ya, yb, 0.012, 0.05, open_back=True), sash)
    half = bar / 2
    if kind == 0:
        flat.add(f.box(-half, half, y0, y1, 0.012, 0.05, open_back=True), sash)
    elif kind == 1:
        for x in (-w / 6, w / 6):
            flat.add(f.box(x - half, x + half, y0, y1, 0.012, 0.05, open_back=True), sash)
        flat.add(f.box(-hw, hw, y0 + 0.72 * h - half, y0 + 0.72 * h + half, 0.012, 0.055, open_back=True), sash)
    elif kind == 2:
        flat.add(f.box(-hw, hw, y0 + 0.7 * h - half, y0 + 0.7 * h + half, 0.012, 0.055, open_back=True), sash)
        if near:
            flat.add(f.box(-half, half, y0, y0 + 0.7 * h, 0.012, 0.05, open_back=True), sash)
    else:
        slats = 7 if near else 4
        for i in range(slats):
            y = y0 + (i + 0.5) * h / slats
            flat.add(f.box(-hw, hw, y - 0.012, y + 0.012, 0.012, 0.065, open_back=True), sash)
    if grille and near:
        for x in np.linspace(-hw + 0.08, hw - 0.08, max(3, int(w / 0.16))):
            flat.add(f.box(x - 0.008, x + 0.008, y0, y1, 0.075, 0.09, open_back=False), DARK * 1.6)
        for y in (y0 + 0.25 * h, y0 + 0.75 * h):
            flat.add(f.box(-hw, hw, y - 0.01, y + 0.01, 0.07, 0.085, open_back=False), DARK * 1.6)
    return cell


def awning(kit, f, w, y, depth, tint):
    """Sloped corrugated sheet on two stays, hung above an opening."""
    sheet = kit.tex("corrugated")
    hw, drop = w / 2, 0.28
    a, b, c, d = f.at(-hw, y, 0.02), f.at(hw, y, 0.02), f.at(hw, y - drop, depth), f.at(-hw, y - drop, depth)
    sheet.add(geo.quad(a, d, c, b), tint)            # upper face
    sheet.add(geo.quad(a - Z * 0.02, b - Z * 0.02, c - Z * 0.02, d - Z * 0.02), tint * 0.7)  # underside
    for x in (-hw + 0.08, hw - 0.08):
        kit.flat().add(geo.tube([f.at(x, y - 0.55, 0.02), f.at(x, y - drop, depth - 0.05)], 0.014, 3), DARK)


def air_conditioner(kit, f, x, y, tint):
    """Window-type unit on a bracket with a condensate hose; body 0.7 x 0.45 x 0.4."""
    kit.tex("metal").add(f.box(x - 0.35, x + 0.35, y, y + 0.45, 0, 0.40), tint)
    flat = kit.flat()
    flat.add(f.box(x - 0.29, x + 0.29, y + 0.07, y + 0.38, 0.40, 0.412, open_back=True), DARK)
    for i in range(4):
        yy = y + 0.11 + i * 0.075
        flat.add(f.box(x - 0.27, x + 0.27, yy, yy + 0.02, 0.412, 0.42, open_back=True), tint * 0.6)
    for sx in (x - 0.3, x + 0.3):
        flat.add(geo.tube([f.at(sx, y - 0.3, 0.01), f.at(sx, y, 0.36)], 0.012, 3), DARK * 1.5)
    flat.add(geo.tube([f.at(x + 0.2, y, 0.3), f.at(x + 0.24, y - 0.5, 0.05), f.at(x + 0.24, y - 1.2, 0.03)], 0.01, 3), (0.5, 0.5, 0.48))


def cage(kit, f, w, y0, y1, depth, tint, near=True):
    """Bolt-on window cage: floor plate, rails and bars, with something stored in it."""
    flat = kit.flat()
    hw, r = w / 2, 0.013
    flat.add(f.box(-hw, hw, y0 - 0.02, y0, 0, depth), tint * 0.8)
    for y in (y0, (y0 + y1) / 2, y1):
        flat.add(geo.tube([f.at(-hw, y, 0), f.at(-hw, y, depth), f.at(hw, y, depth), f.at(hw, y, 0)], r, 3), tint)
    count = max(4, int(w / (0.16 if near else 0.34)))
    for x in np.linspace(-hw, hw, count):
        flat.add(geo.tube([f.at(x, y0, depth), f.at(x, y1, depth)], r * 0.8, 3), tint)
    if near:
        for z in np.linspace(0.12, depth - 0.1, 3):
            for sx in (-hw, hw):
                flat.add(geo.tube([f.at(sx, y0, z), f.at(sx, y1, z)], r * 0.8, 3), tint)
        rng = kit.rng
        x = rng.uniform(-hw + 0.25, hw - 0.25)
        s = rng.uniform(0.14, 0.22)
        flat.add(f.box(x - s, x + s, y0, y0 + rng.uniform(0.2, 0.4), 0.08, depth - 0.08, open_back=False),
                 np.array(CLOTH[rng.integers(len(CLOTH))]) * 0.7)


def drying_pole(kit, f, y, length=1.5):
    """Bamboo pole with washing; only ever placed above every eye height on the map."""
    rng = kit.rng
    root, tip = f.at(0, y, 0.02), f.at(0, y + 0.2, length)
    kit.flat().add(geo.tube([root, tip], 0.016, 4), (0.62, 0.52, 0.30))
    for s in (0.35, 0.6, 0.85):
        p = root * (1 - s) + tip * s
        half, drop = rng.uniform(0.2, 0.32), rng.uniform(0.5, 0.8)
        kit.cloth().add(geo.quad(p - f.t * half - Z * drop, p + f.t * half - Z * drop, p + f.t * half, p - f.t * half),
                        np.array(CLOTH[rng.integers(len(CLOTH))]), uv=np.zeros((2, 3, 2)))


def balcony(kit, f, w, wall, tint, trim, sash, lit, caged, near=True, depth=0.85):
    """Projecting slab balcony with door-window behind; solid upstand or railing, often caged in."""
    rng = kit.rng
    flat = kit.flat()
    hw = w / 2
    kit.tex("concrete").add(f.box(-hw, hw, -0.14, 0.0, 0, depth), (0.82, 0.82, 0.80))
    # Door and side light behind.
    dw = min(hw - 0.2, 1.0)
    cell = int(rng.integers(4))
    glass_pane(kit, f, -dw, dw, 0.06, 2.15, 0.012, lit, cell)
    kit.trim().add(f.box(-dw - 0.08, dw + 0.08, 2.15, 2.27, 0, 0.09), trim)
    for x in (-dw - 0.08, dw):
        kit.trim().add(f.box(x, x + 0.08, 0.0, 2.15, 0, 0.08), trim)
    flat.add(f.box(-0.025, 0.025, 0.06, 2.15, 0.012, 0.05, open_back=True), sash)
    if near:
        flat.add(f.box(-dw, dw, 1.78, 1.83, 0.012, 0.05, open_back=True), sash)
    top = 1.0
    if rng.random() < 0.55:  # rendered masonry upstand
        body = kit.tex(wall)
        body.add(f.box(-hw, hw, 0.0, top, depth - 0.08, depth, open_back=False), tint)
        for x0, x1 in ((-hw, -hw + 0.08), (hw - 0.08, hw)):
            body.add(f.box(x0, x1, 0.0, top, 0.0, depth - 0.08), tint)
        kit.trim().add(f.box(-hw - 0.02, hw + 0.02, top, top + 0.04, 0.0, depth + 0.02), trim)
    else:  # steel railing
        rail = np.array((0.20, 0.24, 0.24))
        for y in (0.12, top):
            flat.add(geo.tube([f.at(-hw, y, 0), f.at(-hw, y, depth), f.at(hw, y, depth), f.at(hw, y, 0)], 0.018, 4), rail)
        for x in np.linspace(-hw, hw, max(4, int(w / (0.14 if near else 0.3)))):
            flat.add(geo.tube([f.at(x, 0.12, depth), f.at(x, top, depth)], 0.01, 3), rail)
    if caged:
        bars = np.array((0.24, 0.30, 0.30)) * rng.uniform(0.7, 1.2)
        roof_y = 2.55
        for x in np.linspace(-hw, hw, max(4, int(w / (0.17 if near else 0.4)))):
            flat.add(geo.tube([f.at(x, top, depth), f.at(x, roof_y, depth)], 0.011, 3), bars)
        for z in np.linspace(0.15, depth - 0.15, 2 if near else 1):
            for sx in (-hw, hw):
                flat.add(geo.tube([f.at(sx, top, z), f.at(sx, roof_y, z)], 0.011, 3), bars)
        for y in (1.8, roof_y):
            flat.add(geo.tube([f.at(-hw, y, 0), f.at(-hw, y, depth), f.at(hw, y, depth), f.at(hw, y, 0)], 0.013, 3), bars)
        if rng.random() < 0.6:
            awning(kit, f, w + 0.1, roof_y + 0.32, depth + 0.18, np.array((0.62, 0.66, 0.64)) * rng.uniform(0.7, 1.1))
    if rng.random() < 0.6:  # washing along the balcony front
        y = 1.75 if caged else 1.55
        kit.flat().add(geo.tube([f.at(-hw + 0.05, y, depth - 0.12), f.at(hw - 0.05, y, depth - 0.12)], 0.012, 3), (0.6, 0.5, 0.3))
        for x in np.arange(-hw + 0.3, hw - 0.25, 0.42):
            if rng.random() < 0.3:
                continue
            half, drop = rng.uniform(0.12, 0.19), rng.uniform(0.4, 0.7)
            kit.cloth().add(f.moved(x, y, depth - 0.12).quad(-half, half, -drop, 0, 0),
                            np.array(CLOTH[rng.integers(len(CLOTH))]), uv=np.zeros((2, 3, 2)))
    return cell


def pipe_stack(kit, f, x, y0, y1, radius=0.055, tint=(0.30, 0.32, 0.31), offset=0.09):
    """Vertical soil or rain pipe with collars and wall brackets."""
    flat = kit.flat()
    tint = np.asarray(tint)
    flat.add(geo.tube([f.at(x, y0, offset), f.at(x, y1, offset)], radius, 6), tint)
    for y in np.arange(y0 + 0.5, y1 - 0.1, 3.2):
        flat.add(geo.tube([f.at(x, y, offset), f.at(x, y + 0.09, offset)], radius * 1.3, 6), tint * 0.8)
        flat.add(f.box(x - radius * 1.5, x + radius * 1.5, y + 0.3, y + 0.34, 0.0, offset), tint * 0.6)


def string_course(kit, f, x0, x1, y, trim, height=0.18, proud=0.06):
    kit.trim().add(f.box(x0, x1, y - height * 0.6, y + height * 0.4, 0, proud), trim)


def shutter(kit, f, w, h, tint):
    """Roller shutter in a steel frame with a hood box and floor lock. At most 0.09 m proud."""
    flat = kit.flat()
    hw = w / 2
    frame = np.array((0.17, 0.18, 0.18))
    for x0, x1, y0, y1 in ((-hw - 0.09, -hw, 0, h + 0.2), (hw, hw + 0.09, 0, h + 0.2)):
        flat.add(f.box(x0, x1, y0, y1, 0, 0.07), frame)
    flat.add(f.box(-hw, hw, h, h + 0.2, 0, 0.09), frame * 1.3)
    sheet = kit.tex("corrugated")
    cells = 5
    for i in range(cells):
        for j in range(cells):
            xa, xb = -hw + w * i / cells, -hw + w * (i + 1) / cells
            ya, yb = h * j / cells, h * (j + 1) / cells
            # Ribs run horizontally on a shutter: swap the texture axes.
            uv = np.array([[[ya, xa], [ya, xb], [yb, xb]], [[ya, xa], [yb, xb], [yb, xa]]]) / 1.2
            sheet.add(f.quad(xa, xb, ya, yb, 0.035), tint, uv=uv)
    flat.add(f.box(-0.12, 0.12, 0.04, 0.15, 0.035, 0.08, open_back=True), DARK)


def door(kit, f, w, h, tint, trim, lit):
    """Steel-faced door with a ventilation transom."""
    flat = kit.flat()
    hw = w / 2
    kit.trim().add(f.box(-hw - 0.08, -hw, 0, h + 0.38, 0, 0.08), trim)
    kit.trim().add(f.box(hw, hw + 0.08, 0, h + 0.38, 0, 0.08), trim)
    kit.trim().add(f.box(-hw - 0.08, hw + 0.08, h + 0.30, h + 0.38, 0, 0.09), trim)
    kit.tex("metal").add(f.box(-hw, hw, 0.02, h, 0, 0.035), tint)
    flat.add(f.box(-hw, hw, h, h + 0.035, 0, 0.06), trim)
    glass_pane(kit, f, -hw, hw, h + 0.035, h + 0.30, 0.012, lit, int(kit.rng.integers(4)))
    for x in np.linspace(-hw + 0.1, hw - 0.1, 5):
        flat.add(f.box(x - 0.008, x + 0.008, h + 0.035, h + 0.30, 0.03, 0.045, open_back=False), DARK * 1.5)
    flat.add(f.box(hw - 0.16, hw - 0.08, h * 0.46, h * 0.46 + 0.14, 0.035, 0.07, open_back=True), DARK * 2)
    flat.add(f.box(-hw - 0.08, hw + 0.08, 0.0, 0.03, 0, 0.14), (0.45, 0.45, 0.43))


def poster(kit, f, x, y, w, h, tint):
    flat = kit.flat()
    flat.add(f.box(x, x + w, y, y + h, 0, 0.006), np.asarray(tint) * 0.9)
    flat.add(f.box(x + 0.03, x + w - 0.03, y + h * 0.55, y + h - 0.03, 0.006, 0.008, open_back=True), np.asarray(tint) * 0.45)
    for i in range(3):
        yy = y + 0.04 + i * h * 0.14
        flat.add(f.box(x + 0.03, x + w * (0.9 - 0.2 * i), yy, yy + h * 0.06, 0.006, 0.008, open_back=True), (0.12, 0.12, 0.12))


def meter_box(kit, f, x, y, rise):
    """Electric meter cupboard with conduits running up the wall."""
    kit.tex("metal").add(f.box(x - 0.22, x + 0.22, y, y + 0.55, 0, 0.12), (0.55, 0.58, 0.56))
    flat = kit.flat()
    flat.add(f.box(x - 0.17, x + 0.17, y + 0.08, y + 0.47, 0.12, 0.128, open_back=True), (0.30, 0.32, 0.32))
    for dx in (-0.12, 0.0, 0.11):
        flat.add(geo.tube([f.at(x + dx, y + 0.55, 0.05), f.at(x + dx, y + 0.55 + rise, 0.05)], 0.014, 4), (0.42, 0.42, 0.40))


def vent(kit, f, x, y, w=0.5, h=0.34):
    flat = kit.flat()
    flat.add(f.box(x, x + w, y, y + h, 0, 0.05), (0.42, 0.44, 0.44))
    for i in range(5):
        yy = y + 0.04 + i * (h - 0.06) / 5
        flat.add(f.box(x + 0.03, x + w - 0.03, yy, yy + 0.025, 0.05, 0.062, open_back=True), DARK * 1.4)


def wall_lamp(kit, f, y, color, power):
    """Bulkhead lamp on a short conduit, with its light."""
    flat = kit.flat()
    flat.add(f.box(-0.10, 0.10, y - 0.03, y + 0.09, 0.0, 0.14), (0.10, 0.11, 0.11))
    flat.add(f.box(-0.014, 0.014, y + 0.09, y + 0.5, 0.0, 0.028), (0.14, 0.14, 0.14))
    kit.emit().add(f.box(-0.085, 0.085, y - 0.10, y - 0.03, 0.02, 0.13, open_back=False), np.array(color) * 2.4)
    kit.light("lamp", f.at(0, y - 0.07, 0.16), f.n * 0.55 - Z * 0.83, color, power)


def tube_light(kit, top, along, color, drop, power=95):
    """Ceiling batten with a fluorescent tube, hung at `top`, `drop` metres above the floor."""
    across = np.cross(Z, along)
    kit.flat().add(geo.obox(top, along, across, Z, (-0.66, -0.07, -0.06), (0.66, 0.07, 0.0)), (0.55, 0.57, 0.55))
    kit.emit().add(geo.obox(top, along, across, Z, (-0.60, -0.025, -0.10), (0.60, 0.025, -0.06)), np.array(color) * 3.0)
    kit.light("tube", top - Z * 0.12, (0, 0, -1), color, power, reach=drop + 1.2)


def sign_board(kit, f, label, color, y0, y1, half_width, lit=True):
    """Flat fascia sign: dark board, coloured trims, glowing lettering. 0.085 m proud."""
    flat = kit.flat()
    flat.add(f.box(-half_width, half_width, y0, y1, 0.0, 0.07), (0.07, 0.08, 0.09))
    for y in (y0, y1 - 0.03):
        flat.add(f.box(-half_width, half_width, y, y + 0.03, 0.07, 0.085, open_back=True), np.array(color) * 0.35)
    kit.put_text(kit.emit(), label, f.at(0, (y0 + y1) / 2, 0.078), f.n, half_width * 2 - 0.25, (y1 - y0) - 0.16, np.array(color) * 2.2)
    if lit:
        kit.light("sign", f.at(0, (y0 + y1) / 2, 0.12), f.n * 0.9 - Z * 0.4, color, 70)


def neon_blade(kit, f, word, color, y0, height):
    """Projecting vertical sign on two stays, lettered on both faces."""
    flat, emit = kit.flat(), kit.emit()
    y1 = y0 + height
    flat.add(f.box(-0.05, 0.05, y0, y1, 0.22, 0.98, open_back=False), (0.06, 0.07, 0.08))
    for y in (y0 + 0.25, y1 - 0.25):
        flat.add(geo.tube([f.at(0, y, 0), f.at(0, y, 0.24)], 0.02, 4), (0.1, 0.1, 0.1))
    chars = list(word)
    rows = max(len(chars), 2)
    pitch = height / rows
    for side in (-1, 1):
        for r, ch in enumerate(chars):
            yc = y1 - (r + 0.5) * pitch - pitch * (rows - len(chars)) / 2
            kit.put_text(emit, ch, f.at(side * 0.056, yc, 0.6), f.t * side, 0.6, pitch - 0.18, np.array(color) * 2.4)
        xa, xb = (0.05, 0.062) if side > 0 else (-0.062, -0.05)
        for z in (0.26, 0.94):
            emit.add(f.box(xa, xb, y0 + 0.05, y1 - 0.05, z - 0.012, z + 0.012, open_back=False), np.array(color) * 1.6)
        kit.light("sign", f.at(side * 0.08, (y0 + y1) / 2, 0.6), f.t * side * 0.9 - Z * 0.4, color, 85)


# ---------------------------------------------------------------- rooftops
def water_tank(kit, base, radius, height, tint):
    """Riveted cylinder on a steel stand with a hatch and feed pipe."""
    base = np.asarray(base, float)
    flat = kit.flat()
    leg = 0.9
    for dx, dy in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
        p = base + np.array([dx, dy, 0]) * radius * 0.62
        flat.add(geo.tube([p, p + Z * leg], 0.05, 4), DARK * 1.2)
    flat.add(geo.box(base + np.array([-radius * 0.8, -radius * 0.8, leg - 0.08]), base + np.array([radius * 0.8, radius * 0.8, leg])), DARK * 1.4)
    kit.tex("metal").add(geo.cylinder(base + Z * leg, radius, height, 12), tint)
    for s in (0.22, 0.74):
        flat.add(geo.tube([base + Z * (leg + height * s), base + Z * (leg + height * s + 0.06)], radius * 1.03, 12), np.asarray(tint) * 0.6)
    flat.add(geo.cylinder(base + Z * (leg + height), radius * 0.3, 0.1, 8), np.asarray(tint) * 0.7)
    p = base + np.array([radius * 0.9, 0, 0])
    flat.add(geo.tube([p + Z * (leg + 0.2), p + Z * 0.1, p + np.array([1.2, 0.6, 0.1])], 0.04, 4), (0.3, 0.3, 0.3))


def stair_hut(kit, lo, hi, wall, tint):
    """Roof access hut with an overhanging slab and a door on one face."""
    lo, hi = np.asarray(lo, float), np.asarray(hi, float)
    kit.tex(wall).add(geo.box(lo, hi), tint)
    kit.tex("concrete").add(geo.box((lo[0] - 0.2, lo[1] - 0.2, hi[2]), (hi[0] + 0.2, hi[1] + 0.2, hi[2] + 0.14)), (0.7, 0.7, 0.7))
    f = Frame(((lo[0] + hi[0]) / 2, lo[1], lo[2]), (0, -1, 0))
    kit.flat().add(f.box(-0.4, 0.4, 0, 1.95, 0, 0.03), (0.22, 0.30, 0.30))


def shack(kit, lo, hi, tint):
    """Squatter room in corrugated sheet with a mono-pitch roof and one lit opening."""
    lo, hi = np.asarray(lo, float), np.asarray(hi, float)
    sheet = kit.tex("corrugated")
    sheet.add(geo.box(lo, hi), tint)
    a, b = (lo[0] - 0.15, lo[1] - 0.15, hi[2] + 0.35), (hi[0] + 0.15, lo[1] - 0.15, hi[2] + 0.35)
    c, d = (hi[0] + 0.15, hi[1] + 0.15, hi[2] + 0.02), (lo[0] - 0.15, hi[1] + 0.15, hi[2] + 0.02)
    sheet.add(geo.quad(a, b, c, d), np.asarray(tint) * 0.8)
    sheet.add(geo.quad(a, d, c, b), np.asarray(tint) * 0.5)


def aerial(kit, base, height):
    """Fishbone television aerial on a pole."""
    rng = kit.rng
    base = np.asarray(base, float)
    flat = kit.flat()
    dark = DARK * 0.6
    flat.add(geo.tube([base, base + Z * height], 0.025, 3), dark)
    yaw = rng.uniform(0, math.pi)
    d = np.array([math.cos(yaw), math.sin(yaw), 0])
    c = np.array([-d[1], d[0], 0])
    tip = base + Z * (height - 0.1)
    flat.add(geo.tube([tip - d * 0.9, tip + d * 0.9], 0.015, 3), dark)
    for s in np.linspace(-0.8, 0.8, 6):
        half = 0.35 - 0.12 * abs(s)
        flat.add(geo.tube([tip + d * s - c * half, tip + d * s + c * half], 0.012, 3), dark)
