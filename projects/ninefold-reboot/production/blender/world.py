"""Spatial queries over the accepted R08 blockout: collision rays, walkable samples and visibility."""
import bpy  # noqa: F401 - imported so the module fails early outside Blender
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

EYE = 1.86


def load_source(path):
    """Reads the retained LevelSpec GLB into per-object triangle records (Z-up metres)."""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=path)
    records = []
    for obj in bpy.data.objects:
        if obj.type != "MESH":
            continue
        mesh = obj.data
        mesh.calc_loop_triangles()
        co = np.empty(len(mesh.vertices) * 3)
        mesh.vertices.foreach_get("co", co)
        matrix = np.array(obj.matrix_world)
        co = co.reshape(-1, 3) @ matrix[:3, :3].T + matrix[:3, 3]
        index = np.empty(len(mesh.loop_triangles) * 3, np.int32)
        mesh.loop_triangles.foreach_get("vertices", index)
        records.append({
            "id": obj.get("objectId", ""), "kind": obj.get("meshKind"), "role": obj.get("role"),
            "material": obj.material_slots[0].name if obj.material_slots else "",
            "collidable": bool(obj.get("collidable")), "tris": co[index.reshape(-1, 3)],
        })
    bpy.ops.wm.read_factory_settings(use_empty=True)
    return records


def is_context(record):
    ident = record["id"]
    return ident[:1] == "C" and ident[1:3].isdigit()


def _bvh(tris):
    count = len(tris)
    return BVHTree.FromPolygons(tris.reshape(-1, 3).tolist(), [(3 * i, 3 * i + 1, 3 * i + 2) for i in range(count)])


class World:
    def __init__(self, records, rng, log=print):
        self.rng = rng
        solid = [(i, r) for i, r in enumerate(records) if r["collidable"]]
        self.tris = np.concatenate([r["tris"] for _, r in solid])
        per_tri = lambda fn: np.concatenate([np.full(len(r["tris"]), bool(fn(r))) for _, r in solid])  # noqa: E731
        self.walk = per_tri(lambda r: r["kind"] in ("floor", "stairs"))
        self.structural = per_tri(lambda r: (r["kind"] == "wall" and r["role"] != "parapet") or is_context(r) or r["id"].startswith("PL-"))
        self.context = per_tri(is_context)
        self.bvh = _bvh(self.tris)
        self.vis = self.bvh  # collision plus generated building shells, for sightline tests only
        self.samples = self._walk_samples()
        self.eyes = self.samples[:, :3] + np.array([0, 0, EYE])
        log(f"world: {len(self.tris)} collision triangles, {len(self.samples)} walkable samples")

    def add_occluders(self, tris):
        self.vis = _bvh(np.concatenate([self.tris, tris]))

    def ray(self, origin, direction, distance=1e4, vis=False):
        tree = self.vis if vis else self.bvh
        loc, normal, index, dist = tree.ray_cast(Vector(origin), Vector(direction), distance)
        return None if loc is None else (np.array(loc), np.array(normal), index, dist)

    def clear(self, a, b, shrink=0.04, vis=False):
        d = np.asarray(b, float) - np.asarray(a, float)
        length = float(np.linalg.norm(d))
        return length < shrink or self.ray(a, d / length, length - shrink, vis) is None

    def _walk_samples(self):
        out = []
        for x in np.arange(0.5, 98, 1.0):
            for y in np.arange(0.5, 86, 1.0):
                z = 30.0
                while True:
                    hit = self.ray((x, y, z), (0, 0, -1))
                    if hit is None:
                        break
                    loc, normal, index, _ = hit
                    if self.walk[index] and normal[2] > 0.7:
                        above = self.ray((x, y, loc[2] + 0.05), (0, 0, 1))
                        head = above[3] + 0.05 if above else np.inf
                        if head >= 2.0:
                            out.append((x, y, loc[2], head))
                    z = loc[2] - 0.02
        return np.array(out)

    def distance_to_play(self, x, y):
        return float(np.min(np.hypot(self.samples[:, 0] - x, self.samples[:, 1] - y)))

    def _eye_order(self, point, normal, rays, reach):
        delta = self.eyes - point
        dist = np.linalg.norm(delta, axis=1)
        ok = dist < reach
        if normal is not None:
            ok &= (delta @ normal) > 0.05 * dist
        candidates = np.nonzero(ok)[0]
        if not len(candidates):
            return candidates
        near = candidates[np.argsort(dist[candidates])[: rays // 2]]
        far = self.rng.choice(candidates, size=min(rays - len(near), len(candidates)), replace=False)
        return np.concatenate([near, far])

    def seen_from_play(self, point, normal=None, rays=14, reach=110.0):
        """True when some sampled walkable eye position has a clear line to the point."""
        origin = point + normal * 0.03 if normal is not None else point
        for i in self._eye_order(point, normal, rays, reach):
            if self.clear(origin, self.eyes[i], vis=True):
                return True
        return False
