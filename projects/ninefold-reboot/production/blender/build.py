"""Ninefold reboot art pass: accepted R08 blockout -> modeled, textured architecture as a game GLB.

    blender -b --python build.py -- --src <r08.glb> --tex <texture dir> --out <dir>

Blender is the modeling and texturing tool here. Nothing is baked: the GLB
carries geometry, material UVs and per-vertex paint tints, and the manifest
describes the lamps so the viewer can light everything in real time.

Collision is the fixed gameplay contract and is re-exported unchanged from the
R08 source. The visible architecture is free to differ from the blockout where
that reads better (see dressing.py for the placement rules that protect play).
"""
import json
import os
import sys
import time

import bpy
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import geo  # noqa: E402
from dressing import Dressing  # noqa: E402
from world import World, is_context, load_source  # noqa: E402

T0 = time.time()


def log(*parts):
    print(f"[{time.time() - T0:6.1f}s]", *parts, flush=True)


def arguments():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    out = {}
    key = None
    for token in argv:
        if token.startswith("--"):
            key = token[2:]
            out[key] = True
        elif key:
            out[key] = token
    return out


ARGS = arguments()
RNG = np.random.default_rng(9)

DISTRICTS = [  # wall wash for blockout walls that belong to no building lot
    ((18, 40), (0.96, 0.82, 0.78)),   # butcher: faded pink
    ((52, 45), (0.90, 0.91, 0.86)),   # machine works: lime wash
    ((82, 50), (0.96, 0.91, 0.78)),   # porcelain works: cream
    ((57, 62), (0.74, 0.86, 0.86)),   # dye works / boiler: teal wash
    ((30, 20), (0.92, 0.86, 0.72)),   # tailor street: ochre
    ((78, 76), (0.78, 0.86, 0.92)),   # water street: pale blue
]
COVER = {
    "A-KILN": ("brick", (1.0, 0.95, 0.9)), "T-RETURN": ("brick", (0.95, 0.95, 0.95)),
    "CT-RETURN": ("brick", (0.9, 0.92, 1.0)), "B-PRESS": ("metal", (0.36, 0.52, 0.44)),
    "BOILER-TANK": ("metal", (0.62, 0.36, 0.28)), "R-WATER": ("metal", (0.55, 0.62, 0.66)),
    "B-TABLE": ("wood", (1, 1, 1)), "N-SORT": ("wood", (0.9, 0.85, 0.8)), "A-BENCH": ("wood", (1, 0.95, 0.9)),
    "A-PALLET": ("wood", (0.85, 0.8, 0.75)), "W-CART": ("wood", (0.8, 0.85, 0.8)),
    "DYE-RACK": ("wood", (0.55, 0.50, 0.45)), "BUTCHER-COUNTER": ("tiles", (1.0, 0.92, 0.9)),
    "AWNING-STALL": ("corrugated", (0.45, 0.70, 0.68)), "R-HUT": ("corrugated", (0.85, 0.82, 0.72)),
    "U-PIER": ("concrete", (1, 1, 1)), "CORE": ("plaster", (0.90, 0.91, 0.86)),
}
SHOPS = {  # ground-floor interiors floored in ceramic tile instead of street slab
    "butcher": ([(10.7, 30.7), (24.3, 30.7), (24.3, 39.3), (21.3, 39.3), (21.3, 44.3), (10.7, 44.3)], (1.0, 0.90, 0.88)),
    "porcelain": ([(72.7, 41.7), (82.7, 41.7), (82.7, 38.7), (92.3, 41.7), (92.3, 62.3), (80.7, 62.3), (80.7, 59.3), (72.7, 59.3)], (0.88, 0.94, 1.0)),
}


def stable_hash(text):
    value = 2166136261
    for ch in text.encode():
        value = ((value ^ ch) * 16777619) & 0xFFFFFFFF
    return value


def jitter(key, amount=0.035):
    return 1 + (np.random.default_rng(stable_hash(key)).random(3) - 0.5) * 2 * amount


def district_tint(x, y):
    return np.array(min(DISTRICTS, key=lambda d: (d[0][0] - x) ** 2 + (d[0][1] - y) ** 2)[1])


# ---------------------------------------------------------------- blockout -> materials
def split_by_lots(records, lots):
    """Cuts wall and mass triangles along party lines so each building can carry its own finish."""
    for rec in records:
        tris = rec["tris"]
        if rec["role"] != "native-detail" and (rec["kind"] == "wall" or is_context(rec)):
            pts = tris.reshape(-1, 3)
            lo, hi = pts.min(0), pts.max(0)
            for lot in lots:
                if lot.x1 < lo[0] or lot.x0 > hi[0] or lot.y1 < lo[1] or lot.y0 > hi[1]:
                    continue
                for axis, value, a, b in ((0, lot.x0, lot.y0, lot.y1), (0, lot.x1, lot.y0, lot.y1), (1, lot.y0, lot.x0, lot.x1), (1, lot.y1, lot.x0, lot.x1)):
                    if not (lo[axis] + 0.05 < value < hi[axis] - 0.05):
                        continue
                    other = tris[:, :, 1 - axis]
                    near = (other.max(1) > a - 0.05) & (other.min(1) < b + 0.05)
                    if near.any():
                        tris = np.concatenate([tris[~near], geo.split_axis(tris[near], axis, value)])
        rec["visual"] = tris


def classify(records, dressing):
    """Routes every blockout triangle except the placeholder windows to a textured bucket."""
    lots = dressing.lots
    for rec in records:
        if rec["role"] == "native-detail" or rec["material"] == "window":
            continue
        tris = rec["visual"]
        n = geo.normals(tris)
        up = n[:, 2] > 0.7
        centre = tris.mean(1)
        ident, kind, material = rec["id"], rec["kind"], rec["material"]

        def put(mask, texture, tint):
            if mask.any():
                geo.arch(texture).add(tris[mask], np.asarray(tint, float))

        def put_walls(mask, fallback):
            """Building finish where a lot owns the wall, district wash elsewhere."""
            behind = centre - n * 0.1
            owner = dressing.lot_index(behind[:, 0], behind[:, 1])
            for lot_id in np.unique(owner[mask]):
                part = mask & (owner == lot_id)
                if lot_id < 0:
                    put(part, "plaster", fallback)
                else:
                    put(part, lots[lot_id].wall, lots[lot_id].tint)

        everything = np.ones(len(tris), bool)
        if kind == "floor":
            put(~up, "concrete", (0.85, 0.85, 0.85))
            if material == "paving":
                shop = np.zeros(len(tris), bool)
                for polygon, tint in SHOPS.values():
                    inside = geo.point_in_polygon(centre[:, 0], centre[:, 1], polygon) & up
                    put(inside, "tiles", tint)
                    shop |= inside
                put(up & ~shop, "street", (1, 1, 1))
            elif material == "jade":
                put(up, "floorpaint", (1, 1, 1))
            elif material == "a-zone":
                put(up, "street", (1.35, 0.85, 0.40))
            elif material == "b-zone":
                put(up, "floorpaint", (0.55, 1.15, 1.25))
            else:
                put(up, "roofing", (1, 1, 1))
        elif kind == "stairs":
            put(everything, "concrete", (0.86, 0.62, 0.52))
        elif kind == "ceiling":
            put(up, "roofing", (1.15, 0.72, 0.55) if material == "ceramic" else (1, 1, 1))
            put(~up, "concrete", (0.95, 0.95, 0.93))
        elif kind == "wall":
            if rec["role"] == "parapet":
                put(everything, "concrete", (0.95, 0.93, 0.90))
            else:
                put_walls(everything, district_tint(*centre[:, :2].mean(0)) * jitter(ident))
        elif is_context(rec):
            put(up, "roofing", (0.9, 0.9, 0.9))
            put_walls(~up, np.array((0.84, 0.86, 0.84)) * jitter(ident[:3], 0.05))
        elif ident in COVER:
            put(everything, *COVER[ident])
        else:  # joints, closed supports below occupied floors, core footing
            put(everything, "plaster", district_tint(*centre[:, :2].mean(0)) * jitter(ident))


# ---------------------------------------------------------------- Blender scene (for inspection in the UI)
def make_material(b, texture_dir):
    material = bpy.data.materials.new(b.name)
    material.use_nodes = True
    nodes, links = material.node_tree.nodes, material.node_tree.links
    nodes.clear()
    output = nodes.new("ShaderNodeOutputMaterial")
    attribute = nodes.new("ShaderNodeAttribute")
    attribute.attribute_name = "Col"
    if b.name == "emit":
        shader = nodes.new("ShaderNodeEmission")
        shader.inputs["Strength"].default_value = 4.0
        links.new(attribute.outputs["Color"], shader.inputs["Color"])
    else:
        shader = nodes.new("ShaderNodeBsdfPrincipled")
        shader.inputs["Roughness"].default_value = 0.85
        path = os.path.join(texture_dir, f"{b.texture}_color.png") if b.texture else None
        if path and os.path.exists(path):
            color = nodes.new("ShaderNodeTexImage")
            color.image = bpy.data.images.load(path, check_existing=True)
            multiply = nodes.new("ShaderNodeMix")
            multiply.data_type = "RGBA"
            multiply.blend_type = "MULTIPLY"
            multiply.inputs["Factor"].default_value = 1.0
            links.new(color.outputs["Color"], multiply.inputs["A"])
            links.new(attribute.outputs["Color"], multiply.inputs["B"])
            links.new(multiply.outputs["Result"], shader.inputs["Base Color"])
        else:
            links.new(attribute.outputs["Color"], shader.inputs["Base Color"])
    links.new(shader.outputs[0], output.inputs["Surface"])
    return material


def make_object(b, texture_dir):
    tris, colors, uvs = b.arrays()
    count = len(tris)
    mesh = bpy.data.meshes.new(b.name)
    mesh.vertices.add(count * 3)
    mesh.loops.add(count * 3)
    mesh.polygons.add(count)
    mesh.vertices.foreach_set("co", tris.reshape(-1))
    mesh.loops.foreach_set("vertex_index", np.arange(count * 3, dtype=np.int32))
    mesh.polygons.foreach_set("loop_start", np.arange(0, count * 3, 3, dtype=np.int32))
    mesh.polygons.foreach_set("loop_total", np.full(count, 3, np.int32))
    mesh.update(calc_edges=True)
    mesh.uv_layers.new(name="UVMap").data.foreach_set("uv", uvs.reshape(-1).astype(np.float32))
    rgba = np.concatenate([colors.reshape(-1, 3), np.ones((count * 3, 1))], 1).astype(np.float32)
    mesh.color_attributes.new("Col", "FLOAT_COLOR", "CORNER").data.foreach_set("color", rgba.reshape(-1))
    mesh.materials.append(make_material(b, texture_dir))
    obj = bpy.data.objects.new(b.name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    return obj


def add_lights(scene, lights):
    collection = bpy.data.collections.new("lights")
    scene.collection.children.link(collection)
    for i, spec in enumerate(lights):
        data = bpy.data.lights.new(f"{spec['kind']}-{i}", "POINT")
        data.energy, data.color, data.shadow_soft_size = spec["power"], spec["color"], 0.12
        obj = bpy.data.objects.new(data.name, data)
        obj.location = spec["pos"]
        collection.objects.link(obj)


def y_up(v):
    return [float(v[0]), float(v[2]), float(-v[1])]


# ---------------------------------------------------------------- main
def main():
    out = ARGS["out"]
    os.makedirs(out, exist_ok=True)
    records = load_source(ARGS["src"])
    log(f"source: {len(records)} objects, {sum(len(r['tris']) for r in records)} triangles")
    world = World(records, RNG, log)
    dressing = Dressing(world, RNG, log)
    split_by_lots(records, dressing.lots)
    classify(records, dressing)
    dressing.run()
    lights = dressing.kit.lights

    buckets = [b for b in geo.BUCKETS.values() if b.tris]
    log("triangles: " + json.dumps({b.name: int(sum(len(t) for t in b.tris)) for b in buckets}))
    for b in buckets:
        make_object(b, ARGS["tex"])
    add_lights(bpy.context.scene, lights)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out, "ninefold-art.blend"))

    primitives = []
    for b in buckets:
        tris, colors, uvs = b.arrays()
        primitives.append({
            "name": b.name, "pos": tris.reshape(-1, 3), "nrm": np.repeat(geo.normals(tris), 3, 0),
            "uv0": uvs.reshape(-1, 2), "col": colors.reshape(-1, 3),
            "extras": {"texture": b.texture, "lighting": b.lighting},
        })
    geo.write_glb(os.path.join(out, "ninefold.glb"), primitives)
    solid = np.concatenate([r["tris"] for r in records if r["collidable"]]).reshape(-1, 3)
    geo.write_glb(os.path.join(out, "ninefold.collision.glb"), [{"name": "collision", "pos": solid}])
    manifest = {
        "materials": {p["name"]: p["extras"] for p in primitives},
        "scales": geo.SCALES,
        "lights": [{"kind": l["kind"], "pos": y_up(l["pos"]), "dir": y_up(l["dir"]), "color": l["color"], "power": l["power"], "reach": l["reach"]} for l in lights],
        "lots": len(dressing.lots),
        "counts": dressing.counts,
        "triangles": {p["name"]: int(len(p["pos"]) // 3) for p in primitives},
    }
    with open(os.path.join(out, "ninefold.art.json"), "w") as handle:
        json.dump(manifest, handle, indent=1, ensure_ascii=False)
    log(f"exported {out}: {sum(manifest['triangles'].values())} triangles, {len(lights)} lights")


main()
