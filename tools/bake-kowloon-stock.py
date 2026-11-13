"""Bake the approved pilot GLBs into normalized storefront meshes. Run with Blender."""
from bisect import bisect_left
import json
import math
import random
import subprocess
import tempfile
from pathlib import Path

import bpy
import bmesh
import sys
from mathutils import Matrix, Vector

ROOT = Path.cwd()
MODELS = json.loads((ROOT / "projects/kowloon-asset-pilot/models.json").read_text())
ASSETS = ROOT / "src/dressing/kowloon/shop/assets"
TEXTURES = ROOT / "projects/dressing-demo/textures"


def load_stock(asset, budget, texture_size):
    """Return triangles in a Z-up frame facing -Y, with base at zero and unit spans."""
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()
    bpy.ops.import_scene.gltf(filepath=str(ROOT / MODELS[asset]))
    obj, = [obj for obj in bpy.context.selected_objects if obj.type == "MESH"]
    bpy.context.view_layer.objects.active = obj
    # GLB UV seams duplicate positions; weld geometry before decimation while keeping loop UVs.
    welded = bmesh.new()
    welded.from_mesh(obj.data)
    bmesh.ops.remove_doubles(welded, verts=list(welded.verts), dist=0.00001)
    welded.to_mesh(obj.data)
    welded.free()
    obj.data.calc_loop_triangles()
    modifier = obj.modifiers.new("Stock triangle budget", "DECIMATE")
    modifier.ratio = budget / len(obj.data.loop_triangles)
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    mesh = obj.data
    mesh.calc_loop_triangles()
    world = [obj.matrix_world @ vertex.co for vertex in mesh.vertices]
    points = [(p.y, -p.x, p.z) for p in world]
    lo = [min(p[i] for p in points) for i in range(3)]
    hi = [max(p[i] for p in points) for i in range(3)]
    origin = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, lo[2]]
    uv = mesh.uv_layers.active.data
    rotation = obj.matrix_world.to_quaternion()
    faces = []
    for tri in mesh.loop_triangles:
        face = []
        for loop, index in zip(tri.loops, tri.vertices):
            p = [(points[index][i] - origin[i]) / (hi[i] - lo[i]) for i in range(3)]
            normal = rotation @ mesh.corner_normals[loop].vector
            components = (normal.y, -normal.x, normal.z)
            normalized = [components[i] * (hi[i] - lo[i]) for i in range(3)]
            face.append([*p, *normalized, *uv[loop].uv])
        faces.append(face)
    material = mesh.materials[0]
    base = next(node for node in material.node_tree.nodes if node.type == "BSDF_PRINCIPLED")
    image = base.inputs["Base Color"].links[0].from_node.image
    with tempfile.TemporaryDirectory() as directory:
        packed = image.packed_file
        source = Path(directory) / "color-image"
        source.write_bytes(packed.data)
        subprocess.run(["sips", "-Z", str(texture_size), "-s", "format", "png", str(source),
                        "--out", str(TEXTURES / f"{asset}.png")], check=True)
    return faces


def apple_pile(apple):
    """Pack a two-course crate; clip bottoms and omit faces buried in adjacent fruit."""
    rng = random.Random(871)
    items = []
    for columns, rows, z in [(6, 3, 0.0), (3, 2, 0.40)]:
        for row in range(rows):
            for col in range(columns):
                x = (col - (columns - 1) / 2) * .149 + rng.uniform(-.008, .008)
                y = (row - (rows - 1) / 2) * .28 + rng.uniform(-.009, .009)
                items.append((x, y, z, rng.uniform(-math.pi, math.pi)))
    faces = []
    for index, (x, y, z, angle) in enumerate(items):
        c, s = math.cos(angle), math.sin(angle)
        for face in apple:
            transformed = []
            for px, py, pz, nx, ny, nz, u, v in face:
                transformed.append([
                    x + (px*c - py*s)*.156, y + (px*s + py*c)*.218, z + pz*.60,
                    (nx*c - ny*s)/.156, (nx*s + ny*c)/.218, nz/.60, u, v,
                ])
            if all(p[2] < .15 for p in transformed):
                continue
            if any(
                all(((p[0]-ox)/.069)**2 + ((p[1]-oy)/.095)**2 + ((p[2]-oz-.30)/.26)**2 < 1
                    for p in transformed)
                for other, (ox, oy, oz, _) in enumerate(items) if other != index
            ):
                continue
            faces.append(transformed)
    return faces


def repaired_packet():
    """Bake the approved label onto a sealed, inflated pouch instead of collapsing its fragmented UV seams."""
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()
    bpy.ops.import_scene.gltf(filepath=str(ROOT / MODELS["snack-packet"]))
    obj, = [obj for obj in bpy.context.selected_objects if obj.type == "MESH"]
    points = [obj.matrix_world @ vertex.co for vertex in obj.data.vertices]
    points = [Vector((point.y, -point.x, point.z)) for point in points]
    low = Vector([min(point[i] for point in points) for i in range(3)])
    high = Vector([max(point[i] for point in points) for i in range(3)])
    span = high-low
    origin = Vector(((low.x+high.x)/2, (low.y+high.y)/2, low.z))
    for vertex, point in zip(obj.data.vertices, points):
        vertex.co = point-origin
    obj.matrix_world = Matrix.Identity(4)
    material = obj.data.materials[0]
    nodes = material.node_tree.nodes
    base = next(node for node in nodes if node.type == "BSDF_PRINCIPLED")
    color = base.inputs["Base Color"].links[0].from_socket
    emission = nodes.new("ShaderNodeEmission")
    material.node_tree.links.new(color, emission.inputs["Color"])
    output = next(node for node in nodes if node.type == "OUTPUT_MATERIAL")
    material.node_tree.links.new(emission.outputs[0], output.inputs["Surface"])
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 8
    scene.render.resolution_x = scene.render.resolution_y = 512
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "None"
    scene.view_settings.exposure = 0
    scale = span.z*1.02
    bpy.ops.object.camera_add(location=(0, -span.y-2, span.z/2), rotation=(math.pi/2, 0, 0))
    camera = bpy.context.object
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = scale
    scene.camera = camera
    scene.world.color = (.57, .45, .28)
    scene.render.film_transparent = True
    scene.render.filepath = str(ROOT / "projects/kowloon-liquor-props/materials/snack-packet-base.png")
    bpy.ops.render.render(write_still=True)
    # Extend the printed edge colors beyond the source silhouette so the repaired seams cannot sample background.
    image = bpy.data.images.load(scene.render.filepath, check_existing=False)
    pixels = list(image.pixels)
    spans = {}
    opaque_rows = {}
    for row in range(512):
        occupied = [column for column in range(512) if pixels[(row*512+column)*4+3] > .95]
        if occupied:
            spans[row] = (occupied[0]+2, occupied[-1]-2)
            opaque_rows[row] = occupied
    extended = []
    for row in range(512):
        source_row = row if row in spans else min(spans, key=lambda other: abs(other-row))
        left, right = spans[source_row]
        for column in range(512):
            source_column = max(left,min(right,column))
            index = (source_row*512+source_column)*4
            if pixels[index+3] <= .95:
                opaque = opaque_rows[source_row]
                nearest = bisect_left(opaque, source_column)
                candidates = opaque[max(0,nearest-1):nearest+1]
                source_column = min(candidates, key=lambda value: abs(value-source_column))
                index = (source_row*512+source_column)*4
            extended.extend([*pixels[index:index+3], 1])
    image.pixels[:] = extended
    image.save()

    # Five samples retain the puffed silhouette and both crimped seams at shop viewing scale.
    grid = 5
    segments = grid-1
    points = []
    for side in (-1, 1):
        for row in range(grid):
            z = row/segments
            for column in range(grid):
                t = column/segments
                x = (t-.5)*(1-.12*math.sin(math.pi*z))
                bulge = (.025+.475*math.sin(math.pi*z))*(1-.68*abs(2*t-1)**3)
                wrinkle = .025*math.sin(column*2.1+row*.7)*math.sin(math.pi*z)
                y = side*(bulge+wrinkle)
                points.append(Vector((x,y,z)))
    thickness = max(abs(point.y) for point in points)*2
    for point in points:
        point.y /= thickness
    triangles = []
    for side in range(2):
        for row in range(segments):
            for col in range(segments):
                a = side*grid*grid+row*grid+col
                triangles.extend([(a,a+1,a+grid+1), (a,a+grid+1,a+grid)])
    perimeter = list(range(grid))+[row*grid+segments for row in range(1,grid)]+list(range(grid*grid-2,grid*segments-1,-1))+[row*grid for row in range(segments-1,0,-1)]
    for i, a in enumerate(perimeter):
        b = perimeter[(i+1)%len(perimeter)]
        triangles.extend([(a,b,b+grid*grid), (a,b+grid*grid,a+grid*grid)])
    normals = [Vector() for point in points]
    oriented = []
    for face in triangles:
        a,b,c = [points[i] for i in face]
        normal = (b-a).cross(c-a)
        center = (a+b+c)/3-Vector((0,0,.5))
        if normal.dot(center) < 0:
            face = tuple(reversed(face))
            normal = -normal
        for i in face:
            normals[i] += normal
        oriented.append(face)
    for normal in normals:
        normal.normalize()
    faces = []
    for triangle in oriented:
        face = []
        for i in triangle:
            point = points[i]
            u = .5+point.x*span.x/scale
            v = .5+(point.z-.5)*span.z/scale
            face.append([*point, *normals[i], u, v])
        faces.append(face)
    return faces


def save(name, faces):
    """Write compact triangle corners as position, normal and UV tuples."""
    rounded = [[[round(value, 5) for value in vertex] for vertex in face] for face in faces]
    (ASSETS / f"{name}.json").write_text(json.dumps(rounded, separators=(",", ":")) + "\n")
    print(f"{name}: {len(faces)} triangles")


# A targeted rebake keeps unrelated accepted geometry and textures byte-for-byte stable.
selected = sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else []
if not selected or "apple" in selected:
    apple = load_stock("market-apple", 64, 256)
    save("apple-pile", apple_pile(apple))
if not selected or "packet" in selected:
    save("snack-packet", repaired_packet())
    subprocess.run(["python3", str(ROOT / "tools/bake-stock-appearances.py"), "--pouches-only"], check=True)
