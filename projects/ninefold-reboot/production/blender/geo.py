"""Triangle-soup geometry helpers and a minimal GLB writer for the Ninefold art pass.

Everything is right-handed Z-up metres until write_glb converts to glTF Y-up.
Triangle arrays are float (T, 3, 3); winding is counter-clockwise seen from outside.
"""
import json
import struct

import numpy as np

Z = np.array([0.0, 0.0, 1.0])


def normals(tris):
    n = np.cross(tris[:, 1] - tris[:, 0], tris[:, 2] - tris[:, 0])
    length = np.linalg.norm(n, axis=1, keepdims=True)
    return n / np.maximum(length, 1e-12)


def quad(p0, p1, p2, p3):
    p0, p1, p2, p3 = (np.asarray(p, float) for p in (p0, p1, p2, p3))
    return np.array([[p0, p1, p2], [p0, p2, p3]])


_BOX_FACES = [
    (0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7),
]


def obox(origin, ax, ay, az, lo, hi, open_back=False):
    """Box spanning lo..hi in the right-handed frame (ax, ay, az) at origin.

    open_back drops the face at lo[2]: the hidden side of anything mounted on a wall.
    """
    origin = np.asarray(origin, float)
    corners = []
    for k in (lo[2], hi[2]):
        for i, j in ((lo[0], lo[1]), (hi[0], lo[1]), (hi[0], hi[1]), (lo[0], hi[1])):
            corners.append(origin + ax * i + ay * j + az * k)
    faces = _BOX_FACES[1:] if open_back else _BOX_FACES
    return np.concatenate([quad(*(corners[i] for i in face)) for face in faces])


def box(lo, hi):
    return obox((0, 0, 0), np.array([1.0, 0, 0]), np.array([0, 1.0, 0]), Z, lo, hi)


def wall_frame(normal):
    """(tangent, up, normal) with tangent pointing right for a viewer facing the wall."""
    n = np.array([normal[0], normal[1], 0.0])
    n /= np.linalg.norm(n)
    return np.array([-n[1], n[0], 0.0]), Z, n


def wall_box(origin, normal, x0, x1, y0, y1, z0, z1):
    """Box in wall space: x along the wall, y up, z out of the wall."""
    t, up, n = wall_frame(normal)
    return obox(origin, t, up, n, (x0, y0, z0), (x1, y1, z1))


def tube(points, radius, sides=5, caps=False):
    """Prism swept along a polyline."""
    pts = np.asarray(points, float)
    count = len(pts)
    rings = []
    for i in range(count):
        a = pts[max(i - 1, 0)]
        b = pts[min(i + 1, count - 1)]
        d = b - a
        d /= np.linalg.norm(d)
        ref = Z if abs(d[2]) < 0.9 else np.array([1.0, 0, 0])
        u = np.cross(ref, d)
        u /= np.linalg.norm(u)
        v = np.cross(d, u)
        angles = np.arange(sides) / sides * 2 * np.pi
        rings.append(pts[i] + radius * (np.cos(angles)[:, None] * u + np.sin(angles)[:, None] * v))
    out = []
    for i in range(count - 1):
        for s in range(sides):
            s2 = (s + 1) % sides
            out.append(quad(rings[i][s], rings[i][s2], rings[i + 1][s2], rings[i + 1][s]))
    if caps:
        for ring, flip in ((rings[0], True), (rings[-1], False)):
            centre = ring.mean(0)
            for s in range(sides):
                a, b = ring[s], ring[(s + 1) % sides]
                out.append(np.array([[centre, b, a]] if flip else [[centre, a, b]]))
    return np.concatenate(out)


def cylinder(base, radius, height, sides=12):
    base = np.asarray(base, float)
    return tube([base, base + Z * height], radius, sides, caps=True)


def catenary(a, b, sag, segments=8):
    a, b = np.asarray(a, float), np.asarray(b, float)
    s = np.linspace(0, 1, segments + 1)
    pts = a[None] + (b - a)[None] * s[:, None]
    pts[:, 2] -= sag * 4 * s * (1 - s)
    return pts


def box_uv(tris, scale, v_offset=0.0):
    """World-projected UVs: plan for flat faces, (along wall, height) for upright ones."""
    n = normals(tris)
    flat = np.abs(n[:, 2]) > 0.7
    t = np.stack([-n[:, 1], n[:, 0], np.zeros(len(n))], 1)
    length = np.linalg.norm(t, axis=1, keepdims=True)
    t = np.where(length > 1e-6, t / np.maximum(length, 1e-6), np.array([[1.0, 0, 0]]))
    u_wall = np.einsum("tcj,tj->tc", tris, t)
    u = np.where(flat[:, None], tris[:, :, 0], u_wall)
    v = np.where(flat[:, None], tris[:, :, 1], tris[:, :, 2] - v_offset)
    return np.stack([u, v], -1) / scale


def split_axis(tris, axis, value, eps=1e-4):
    """Cuts every triangle crossing the plane coordinate[axis] == value; winding is preserved."""
    side = tris[:, :, axis] - value
    crossing = (side.max(1) > eps) & (side.min(1) < -eps)
    if not crossing.any():
        return tris
    out = [tris[~crossing]]
    for tri, s in zip(tris[crossing], side[crossing]):
        # Rotate so vertex 0 is alone on its side of the plane.
        signs = np.where(np.abs(s) <= eps, 0, np.sign(s))
        lone = next((i for i in range(3) if signs[i] != 0 and signs[(i + 1) % 3] != signs[i] and signs[(i + 2) % 3] != signs[i]), 0)
        a, b, c = tri[lone], tri[(lone + 1) % 3], tri[(lone + 2) % 3]
        sa, sb, sc = s[lone], s[(lone + 1) % 3], s[(lone + 2) % 3]
        ab = a + (b - a) * (sa / (sa - sb)) if abs(sa - sb) > 1e-9 else b
        ac = a + (c - a) * (sa / (sa - sc)) if abs(sa - sc) > 1e-9 else c
        out.append(np.array([[a, ab, ac], [ab, b, c], [ab, c, ac]]))
    merged = np.concatenate(out)
    area = np.linalg.norm(np.cross(merged[:, 1] - merged[:, 0], merged[:, 2] - merged[:, 0]), axis=1)
    return merged[area > 1e-9]


class Bucket:
    """Triangles sharing one output material."""

    def __init__(self, name, texture=None, scale=1.0, lighting="lit", v_offset=0.0):
        self.name, self.texture, self.scale, self.lighting, self.v_offset = name, texture, scale, lighting, v_offset
        self.tris, self.colors, self.uvs = [], [], []

    def add(self, tris, color=(1, 1, 1), uv=None):
        tris = np.asarray(tris, float).reshape(-1, 3, 3)
        if not len(tris):
            return
        color = np.asarray(color, float)
        if color.ndim == 1:
            color = np.broadcast_to(color, (len(tris), 3, 3))
        elif color.ndim == 2:
            color = np.broadcast_to(color[:, None, :], (len(tris), 3, 3))
        self.tris.append(tris)
        self.colors.append(np.array(color))
        self.uvs.append(box_uv(tris, self.scale, self.v_offset) if uv is None else np.asarray(uv, float))

    def arrays(self):
        if not self.tris:
            return np.zeros((0, 3, 3)), np.zeros((0, 3, 3)), np.zeros((0, 3, 2))
        return np.concatenate(self.tris), np.concatenate(self.colors), np.concatenate(self.uvs)


BUCKETS = {}
SCALES = {"plaster": 2.4, "mosaic": 1.2, "street": 4.0, "tiles": 1.6, "floorpaint": 3.0, "roofing": 3.0,
          "brick": 1.2, "metal": 2.0, "corrugated": 1.2, "wood": 0.9, "concrete": 2.4}


def bucket(name, texture=None, scale=1.0, lighting="lit"):
    if name not in BUCKETS:
        BUCKETS[name] = Bucket(name, texture, scale, lighting)
    return BUCKETS[name]


def arch(texture):
    """Blockout surfaces."""
    return bucket(f"arch_{texture}", texture, SCALES[texture])


def point_in_polygon(x, y, polygon):
    poly = np.asarray(polygon, float)
    inside = np.zeros(np.shape(x), bool)
    j = len(poly) - 1
    for i in range(len(poly)):
        xi, yi = poly[i]
        xj, yj = poly[j]
        crosses = ((yi > y) != (yj > y)) & (x < (xj - xi) * (y - yi) / (yj - yi + 1e-12) + xi)
        inside ^= crosses
        j = i
    return inside


# ---------------------------------------------------------------- GLB
def _y_up(a):
    return np.stack([a[..., 0], a[..., 2], -a[..., 1]], -1)


def write_glb(path, primitives, extras=None):
    """primitives: dicts with name, pos (N,3), and optional nrm, uv0, uv1, col (N,3 floats 0..1).

    Attributes are per corner (unindexed); identical corners are welded here.
    """
    chunks, views, accessors, meshes, nodes, materials = [], [], [], [], [], []
    offset = 0

    def push(array, target=None):
        nonlocal offset
        data = array.tobytes()
        pad = (-len(data)) % 4
        chunks.append(data + b"\0" * pad)
        view = {"buffer": 0, "byteOffset": offset, "byteLength": len(data)}
        if target:
            view["target"] = target
        views.append(view)
        offset += len(data) + pad
        return len(views) - 1

    def accessor(array, kind, component, normalized=False, bounds=False, target=34962):
        entry = {"bufferView": push(array, target), "componentType": component, "count": len(array), "type": kind}
        if normalized:
            entry["normalized"] = True
        if bounds:
            entry["min"] = array.min(0).tolist()
            entry["max"] = array.max(0).tolist()
        accessors.append(entry)
        return len(accessors) - 1

    for prim in primitives:
        pos = _y_up(np.asarray(prim["pos"], np.float32))
        if not len(pos):
            continue
        columns = [pos]
        layout = [("POSITION", 3)]
        if prim.get("nrm") is not None:
            columns.append(_y_up(np.asarray(prim["nrm"], np.float32)))
            layout.append(("NORMAL", 3))
        for key, name in (("uv0", "TEXCOORD_0"), ("uv1", "TEXCOORD_1")):
            if prim.get(key) is not None:
                uv = np.asarray(prim[key], np.float32).copy()
                uv[:, 1] = 1 - uv[:, 1]
                columns.append(uv)
                layout.append((name, 2))
        if prim.get("col") is not None:
            columns.append(np.maximum(np.asarray(prim["col"], np.float32), 0))
            layout.append(("COLOR_0", 3))
        table = np.concatenate(columns, 1)
        keys = np.round(table, 4)
        _, first, inverse = np.unique(keys, axis=0, return_index=True, return_inverse=True)
        table = table[first]
        attributes, column = {}, 0
        for name, width in layout:
            data = np.ascontiguousarray(table[:, column:column + width])
            column += width
            attributes[name] = accessor(data, "VEC3" if width == 3 else "VEC2", 5126, bounds=name == "POSITION")
        indices = accessor(inverse.reshape(-1).astype(np.uint32), "SCALAR", 5125, target=34963)
        materials.append({"name": prim["name"], "extras": prim.get("extras", {})})
        meshes.append({"name": prim["name"], "primitives": [
            {"attributes": attributes, "indices": indices, "material": len(materials) - 1}]})
        nodes.append({"name": prim["name"], "mesh": len(meshes) - 1})
    gltf = {
        "asset": {"version": "2.0", "generator": "ninefold-reboot art pass"},
        "scene": 0, "scenes": [{"nodes": list(range(len(nodes)))}],
        "nodes": nodes, "meshes": meshes, "materials": materials,
        "accessors": accessors, "bufferViews": views, "buffers": [{"byteLength": offset}],
    }
    if extras:
        gltf["extras"] = extras
    text = json.dumps(gltf, separators=(",", ":")).encode()
    text += b" " * ((-len(text)) % 4)
    binary = b"".join(chunks)
    with open(path, "wb") as handle:
        handle.write(struct.pack("<III", 0x46546C67, 2, 12 + 8 + len(text) + 8 + len(binary)))
        handle.write(struct.pack("<II", len(text), 0x4E4F534A) + text)
        handle.write(struct.pack("<II", len(binary), 0x004E4942) + binary)
