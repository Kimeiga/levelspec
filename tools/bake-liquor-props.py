"""Import approved Tripo props into a meter-based Z-up catalog. Run with Blender."""
import hashlib
import json
import math
import subprocess
import struct
from pathlib import Path

import bpy
import bmesh
from mathutils import Matrix, Vector

ROOT = Path.cwd()
PROJECT = ROOT / "projects/kowloon-liquor-props"
OUTPUT = ROOT / "generated/liquor-props/bake"
OUTPUT.mkdir(parents=True, exist_ok=True)
SPECS = [spec for spec in json.loads((PROJECT / "assets.json").read_text()) if "adoption" not in spec]
for spec in SPECS:
    spec["budget"] = spec.get("productionBudget", spec["budget"])
SPECS.append({"name": "seasoning-jar", "budget": 96, "size": [.14, .14, .23]})
MODELS = json.loads((PROJECT / "models.json").read_text())
CATALOG = {}
REPORT = []
BOTTLE_PITCH = .074


def extract_maps(path, name):
    """Retain color, tangent normal and roughness/metalness from the source GLB."""
    raw = path.read_bytes()
    length = struct.unpack_from("<I", raw, 12)[0]
    document = json.loads(raw[20:20 + length])
    binary = raw[28 + length:]
    material, = document["materials"]
    pbr = material["pbrMetallicRoughness"]
    for channel, reference in [("color", pbr.get("baseColorTexture")),
                               ("properties", pbr.get("metallicRoughnessTexture")),
                               ("normal", material.get("normalTexture"))]:
        if reference is None:
            continue
        image = document["images"][document["textures"][reference["index"]]["source"]]
        view = document["bufferViews"][image["bufferView"]]
        start = view.get("byteOffset", 0)
        (OUTPUT / f"{name}-{channel}").write_bytes(binary[start:start + view["byteLength"]])


def import_asset(spec, tile):
    """Retain proportions, fit the declared envelope uniformly, and remap to an atlas tile."""
    name = spec["name"]
    path = ROOT / MODELS[name]
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()
    bpy.ops.import_scene.gltf(filepath=str(path))
    objects = [obj for obj in bpy.context.selected_objects if obj.type == "MESH"]
    source_triangles = 0
    for obj in objects:
        mesh_edit = bmesh.new()
        mesh_edit.from_mesh(obj.data)
        bmesh.ops.remove_doubles(mesh_edit, verts=list(mesh_edit.verts), dist=1e-6)
        mesh_edit.to_mesh(obj.data)
        mesh_edit.free()
        obj.data.update()
        obj.data.calc_loop_triangles()
        source_triangles += len(obj.data.loop_triangles)
    for obj in objects:
        if source_triangles <= spec["budget"]:
            continue
        bpy.context.view_layer.objects.active = obj
        modifier = obj.modifiers.new("Production budget", "DECIMATE")
        modifier.ratio = max(0.01, (spec["budget"] - 2) / source_triangles)
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    # Tripo's front is +X after Blender's Y-up conversion; the shop faces -Y.
    orientation = Matrix.Rotation(-math.pi / 2, 4, "Z")
    if "alignNormal" in spec:
        orientation = Vector(spec["alignNormal"]).rotation_difference(Vector((0, 0, 1))).to_matrix().to_4x4() @ orientation
    if "rotation" in spec:
        for axis, degrees in zip("XYZ", spec["rotation"]):
            orientation = Matrix.Rotation(math.radians(degrees), 4, axis) @ orientation
    world = [orientation @ obj.matrix_world @ vertex.co for obj in objects for vertex in obj.data.vertices]
    low = Vector([min(point[i] for point in world) for i in range(3)])
    high = Vector([max(point[i] for point in world) for i in range(3)])
    span = high - low
    factor = min(spec["size"][i] / span[i] for i in range(3))
    origin = Vector([(low.x + high.x) / 2, (low.y + high.y) / 2, low.z])
    size = list(span * factor)
    faces = []
    extract_maps(path, name)
    for obj in objects:
        mesh = obj.data
        mesh.calc_loop_triangles()
        uv = mesh.uv_layers.active.data
        transform = orientation @ obj.matrix_world
        normal_transform = transform.to_3x3().inverted().transposed()
        for triangle in mesh.loop_triangles:
            face = []
            for loop, index in zip(triangle.loops, triangle.vertices):
                point = (transform @ mesh.vertices[index].co - origin) * factor
                if name == "shop-counter" and point.z > size[2] - .015:
                    point.z = size[2]
                normal = (normal_transform @ mesh.corner_normals[loop].vector).normalized()
                geometric = (normal_transform @ triangle.normal).normalized()
                if normal.dot(geometric) <= .15:
                    normal = geometric
                u, v = uv[loop].uv
                # Four-pixel gutters protect adjacent asset tiles at small mip levels.
                atlas_uv = [(tile % 5 * 512 + 4 + u * 504) / 2560,
                            ((3 - tile // 5) * 512 + 4 + v * 504) / 2048]
                face.append([*point, *normal, *atlas_uv, u, v])
            faces.append(face)
    if name == "drinks-cooler":
        # Retain the cabinet skin; replace fused stock and shelves in its cavity.
        faces = [face for face in faces if not (
            abs(sum(v[0] for v in face)/3) < size[0]*.42
            and -size[1]*.48 < sum(v[1] for v in face)/3 < size[1]*.40
            and size[2]*.20 < sum(v[2] for v in face)/3 < size[2]*.86)]
    CATALOG[name] = {"size": size, "faces": faces, "tile": tile}
    REPORT.append({"name": name, "source": str(path.relative_to(ROOT)),
                   "sourceSha256": hashlib.sha256(path.read_bytes()).hexdigest(),
                   "sourceTriangles": source_triangles, "triangles": len(faces),
                   "budget": spec["budget"], "size": size, "uniformScale": factor})
    print(name, len(faces), size)


def bottle_load():
    """Bake one crate load from a low-detail copy, rather than 24 full shelf bottles."""
    bottle = next(spec for spec in SPECS if spec["name"] == "drink-bottle")
    full = CATALOG["drink-bottle"]
    import_asset({**bottle, "budget": 80}, SPECS.index(bottle))
    low = CATALOG["drink-bottle"]
    CATALOG["drink-bottle"] = full
    faces = []
    factor = min(.07 / low["size"][0], .07 / low["size"][1], .27 / low["size"][2])
    for row in range(3):
        for column in range(4):
            x, y = (column - 1.5) * BOTTLE_PITCH, (row - 1) * BOTTLE_PITCH
            for face in low["faces"]:
                # Undersides are hidden by the crate floor.
                if all(vertex[2] < .003 for vertex in face):
                    continue
                faces.append([[vertex[0]*factor + x, vertex[1]*factor + y,
                               vertex[2]*factor, *vertex[3:]] for vertex in face])
    CATALOG["bottle-load"] = {"size": [.222 + low["size"][0]*factor,
                                       .148 + low["size"][1]*factor,
                                       low["size"][2]*factor], "faces": faces,
                              "tile": SPECS.index(bottle), "sourceTexture": "drink-bottle"}


def repaired_crate(size, tile, load_size):
    """Rebuild the failed lattice with straight molded rails, reusing a worn red strip of the source maps."""
    width, depth, height = size
    load_scale = min(width*.9/load_size[0], depth*.85/load_size[1], height*1.2/load_size[2])
    pitch = BOTTLE_PITCH*load_scale
    floor_top = height*.075
    faces = []

    def beam(low, high, beveled=False):
        """Emit a closed rail; broad frame members have an eight-sided beveled cross section."""
        center = Vector([(a+b)/2 for a, b in zip(low, high)])
        spans = [b-a for a, b in zip(low, high)]
        axis = max(range(3), key=lambda i: spans[i])
        cross = [i for i in range(3) if i != axis]
        a, b = [spans[i]/2 for i in cross]
        cut = min(a, b)*.22 if beveled else 0
        ring = [(-a+cut,-b), (a-cut,-b), (a,-b+cut), (a,b-cut),
                (a-cut,b), (-a+cut,b), (-a,b-cut), (-a,-b+cut)] if beveled else [(-a,-b),(a,-b),(a,b),(-a,b)]
        ends = []
        for coordinate in (low[axis], high[axis]):
            end = []
            for u, v in ring:
                point = list(center)
                point[axis], point[cross[0]], point[cross[1]] = coordinate, center[cross[0]]+u, center[cross[1]]+v
                end.append(Vector(point))
            ends.append(end)
        polygons = [ends[0], ends[1]]
        polygons.extend([ends[0][i], ends[0][(i+1)%len(ring)], ends[1][(i+1)%len(ring)], ends[1][i]] for i in range(len(ring)))
        for polygon in polygons:
            normal = (polygon[1]-polygon[0]).cross(polygon[2]-polygon[0]).normalized()
            if normal.dot(sum(polygon, Vector())/len(polygon)-center) < 0:
                polygon = list(reversed(polygon))
                normal = -normal
            vertices = []
            for i, point in enumerate(polygon):
                # This strip contains plain red plastic and scuffed molding, not the malformed wall silhouettes.
                u = .035 + .235*(i in (1, 2))
                v = .335 + .020*(i >= 2)
                atlas = [(tile % 5*512+4+u*504)/2560, ((3-tile//5)*512+4+v*504)/2048]
                vertices.append([*point, *normal, *atlas, u, v])
            faces.extend([[list(vertices[0]), list(vertices[i]), list(vertices[i+1])] for i in range(1,len(vertices)-1)])

    post = .022
    for x in (-width/2, width/2-post):
        for y in (-depth/2, depth/2-post):
            beam([x,y,0], [x+post,y+post,height], True)
    for z in (0, height-.023):
        for y in (-depth/2, depth/2-.018):
            beam([-width/2+post,y,z], [width/2-post,y+.018,z+.023], True)
        for x in (-width/2, width/2-.018):
            beam([x,-depth/2+post,z], [x+.018,depth/2-post,z+.023], True)
    # Lower lattice leaves a continuous hand-grip opening beneath the top rim.
    for y in (-depth/2, depth/2-.012):
        beam([-width/2+post,y,.14], [width/2-post,y+.012,.151])
        for x in (-width/4,0,width/4):
            beam([x-.0045,y,.023], [x+.0045,y+.012,.14])
    for x in (-width/2, width/2-.012):
        beam([x,-depth/2+post,.14], [x+.012,depth/2-post,.151])
        for y in (-depth/6,depth/6):
            beam([x,y-.0045,.023], [x+.012,y+.0045,.14])
    for i in range(4):
        x = -width*.34+i*width*.68/3
        beam([x-.009,-depth/2+post,.007], [x+.009,depth/2-post,floor_top])
    for y in (-depth*.3,0,depth*.3):
        beam([-width/2+post,y-.007,.007], [width/2-post,y+.007,floor_top])
    for x in (-pitch,0,pitch):
        beam([x-.001,-depth/2+post,floor_top], [x+.001,depth/2-post,.105])
    for y in (-pitch/2,pitch/2):
        beam([-width/2+post,y-.001,floor_top], [width/2-post,y+.001,.105])
    return faces


def remeasure(asset):
    """Center the actual combined footprint and measure its exact bottom-based envelope."""
    faces = asset["faces"] + asset.get("paintedFaces", [])
    low = [min(v[i] for f in faces for v in f) for i in range(3)]
    high = [max(v[i] for f in faces for v in f) for i in range(3)]
    origin = [(low[0]+high[0])/2, (low[1]+high[1])/2, low[2]]
    for face in faces:
        for vertex in face:
            vertex[:3] = [round(vertex[i]-origin[i], 6) for i in range(3)]
    asset["size"] = [round(high[i]-low[i], 6) for i in range(3)]


def cavity_face(vertices):
    """Make an upward-facing interior triangle with normals matching its new shape."""
    vertices = [list(vertex) for vertex in vertices]
    normal = (Vector(vertices[1][:3])-Vector(vertices[0][:3])).cross(Vector(vertices[2][:3])-Vector(vertices[0][:3])).normalized()
    if normal.z < 0:
        vertices.reverse()
        normal = -normal
    for vertex in vertices:
        vertex[3:6] = normal
    return vertices


def hollow_basket(basket):
    """Replace the generated closing fan with a recessed floor and walls, preserving the outer lip and UVs."""
    interior = []
    shell = []
    for face in basket["faces"]:
        centers = [i for i, vertex in enumerate(face) if math.hypot(vertex[0], vertex[1]) < .01]
        if not centers:
            shell.append(face)
            continue
        index, = centers
        center, a, b = [list(face[(index+i) % 3]) for i in range(3)]
        floor_center = list(center)
        floor_center[2] = .007
        inner = []
        for edge in (a, b):
            fraction = .052 / math.hypot(edge[0], edge[1])
            vertex = [start+(end-start)*fraction for start, end in zip(center, edge)]
            vertex[2] = .007
            inner.append(vertex)
        ia, ib = inner
        interior.extend([cavity_face([floor_center, ia, ib]),
                         cavity_face([ia, a, b]), cavity_face([ia, b, ib])])
    if len(interior) != 144:
        raise ValueError("Basket source no longer has the reviewed 48-triangle closing fan")
    basket["faces"] = shell + interior
    return interior


def surface_height(faces, x, y):
    """Find the interior surface directly below a footprint point using projected barycentric coordinates."""
    heights = []
    for a, b, c in faces:
        determinant = (b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1])
        if abs(determinant) < 1e-12:
            continue
        u = ((b[1]-c[1])*(x-c[0])+(c[0]-b[0])*(y-c[1])) / determinant
        v = ((c[1]-a[1])*(x-c[0])+(a[0]-c[0])*(y-c[1])) / determinant
        if min(u, v, 1-u-v) >= -1e-7:
            heights.append(u*a[2]+v*b[2]+(1-u-v)*c[2])
    if not heights:
        raise ValueError("Egg footprint lies outside the basket cavity")
    return max(heights)


def egg_pile():
    """Lay eight simple eggs on the actual recessed basket floor, below its enclosing rim."""
    basket = CATALOG["egg-basket"]
    interior = hollow_basket(basket)
    uv = interior[0][0][6:8]
    placements = []
    for i in range(6):
        angle = i*math.tau/6 + .12
        placements.append((.05*math.cos(angle), .05*math.sin(angle), angle+math.pi/2, 1.4+.12*math.sin(angle)))
    placements.extend([(-.0165, -.003, math.pi/2-.05, 1.45), (.0165, .003, math.pi/2+.05, 1.5)])
    basket["paintedFaces"] = []
    for x, y, yaw, tilt in placements:
        rotation = Matrix.Rotation(yaw, 3, "Z") @ Matrix.Rotation(tilt, 3, "Y")
        rings = []
        for ring in range(5):
            phi = math.pi*ring/4
            points = []
            for side in range(10):
                theta = math.tau*side/10
                radius = .016*math.sin(phi)*(1-.12*math.cos(phi))
                point = rotation @ Vector((radius*math.cos(theta), radius*math.sin(theta), .025*math.cos(phi))) + Vector((x, y, 0))
                normal = (rotation @ Vector((math.sin(phi)*math.cos(theta), math.sin(phi)*math.sin(theta), .64*math.cos(phi)))).normalized()
                points.append([*point, *normal, *uv, .78, .70, .56])
            rings.append(points)
        support = max(surface_height(interior, v[0], v[1])-v[2] for ring in rings for v in ring)
        for ring in rings:
            for vertex in ring:
                vertex[2] += support
        for ring in range(4):
            for side in range(10):
                next_side = (side+1)%10
                a,b,c,d = rings[ring][side],rings[ring+1][side],rings[ring+1][next_side],rings[ring][next_side]
                for face in ([a,b,c], [a,c,d]):
                    geometric = (Vector(face[1][:3])-Vector(face[0][:3])).cross(Vector(face[2][:3])-Vector(face[0][:3]))
                    if geometric.length < 1e-9:
                        continue
                    if geometric.dot(Vector(face[0][3:6])) < 0:
                        face = list(reversed(face))
                    basket["paintedFaces"].append([list(vertex) for vertex in face])
    remeasure(basket)


for tile, spec in enumerate(SPECS):
    import_asset(spec, tile)
MODELS["dry-goods-bag"] = MODELS["rice-sack"]
import_asset({"name": "dry-goods-bag", "budget": 96, "size": [.12, .12, .17]}, 0)
bottle_load()
crate = CATALOG["bottle-crate"]
crate["faces"] = repaired_crate(crate["size"], crate["tile"], CATALOG["bottle-load"]["size"])
next(entry for entry in REPORT if entry["name"] == "bottle-crate")["triangles"] = len(crate["faces"])
# Compose matte eggs after packing the textured basket.
(OUTPUT / "catalog.json").write_text(json.dumps(CATALOG))
(PROJECT / "bake-report.json").write_text(json.dumps(REPORT, indent=2) + "\n")
subprocess.run(["python3", str(ROOT / "tools/pack-liquor-atlas.py")], check=True)
CATALOG = json.loads((ROOT / "src/dressing/kowloon/shop/assets/grocer-props.json").read_text())
egg_pile()
remeasure(CATALOG["bottle-load"])

(ROOT / "src/dressing/kowloon/shop/assets/grocer-props.json").write_text(json.dumps(CATALOG, separators=(",", ":")) + "\n")
subprocess.run(["python3", str(ROOT / "tools/refine-shop-materials.py")], check=True)
subprocess.run(["python3", str(ROOT / "tools/bake-stock-appearances.py")], check=True)
CATALOG = json.loads((ROOT / "src/dressing/kowloon/shop/assets/grocer-props.json").read_text())

production = []
for name, asset in CATALOG.items():
    production.append({"name": name, "texturedTriangles": len(asset["faces"]),
                       "paintedTriangles": len(asset.get("paintedFaces", [])),
                       "triangles": len(asset["faces"]) + len(asset.get("paintedFaces", [])),
                       "size": asset["size"]})
(PROJECT / "production-metrics.json").write_text(json.dumps(production, indent=2) + "\n")
