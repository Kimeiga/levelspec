"""Import the two approved food GLBs at uniform scale, preserving UVs and smooth normals. Run in Blender."""
import hashlib
import json
import math
import struct
import subprocess
from pathlib import Path

import bpy
from mathutils import Matrix, Vector

ROOT = Path.cwd()
PROJECT = ROOT / 'projects/kowloon-restaurant-props'
OUTPUT = ROOT / 'generated/restaurant-props/food-bake'
OUTPUT.mkdir(parents=True, exist_ok=True)
SPECS = [('chicken', 'chicken-result.json', [.235,.21,.49], 900),
         ('slices', 'slices-result.json', [.30,.21,.075], 500)]
catalog, report = {}, []


def extract_maps(path, name):
    """Keep each original material channel before local atlas packing."""
    raw = path.read_bytes()
    length = struct.unpack_from('<I', raw, 12)[0]
    document = json.loads(raw[20:20+length])
    binary = raw[28+length:]
    material, = document['materials']
    pbr = material['pbrMetallicRoughness']
    for channel, reference in [('color', pbr.get('baseColorTexture')),
                               ('normal', material.get('normalTexture')),
                               ('properties', pbr.get('metallicRoughnessTexture'))]:
        if reference is None:
            continue
        image = document['images'][document['textures'][reference['index']]['source']]
        view = document['bufferViews'][image['bufferView']]
        start = view.get('byteOffset', 0)
        (OUTPUT / f'{name}-{channel}').write_bytes(binary[start:start+view['byteLength']])


for name, result, envelope, budget in SPECS:
    task = json.loads((PROJECT / 'source-models' / result).read_text())
    path = ROOT / task['model_file']
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete()
    bpy.ops.import_scene.gltf(filepath=str(path))
    objects = [obj for obj in bpy.context.selected_objects if obj.type == 'MESH']
    rotation = Matrix.Rotation(-math.pi/2, 4, 'Z')
    points = [rotation @ obj.matrix_world @ vertex.co for obj in objects for vertex in obj.data.vertices]
    low = Vector([min(p[i] for p in points) for i in range(3)])
    high = Vector([max(p[i] for p in points) for i in range(3)])
    span = high-low
    scale = min(envelope[i]/span[i] for i in range(3))
    origin = Vector([(low.x+high.x)/2,(low.y+high.y)/2,low.z])
    anchor = (max(points, key=lambda p:p.z)-origin)*scale
    faces = []
    for obj in objects:
        mesh = obj.data
        mesh.calc_loop_triangles()
        transform = rotation @ obj.matrix_world
        normal_transform = transform.to_3x3().inverted().transposed()
        uv = mesh.uv_layers.active.data
        for triangle in mesh.loop_triangles:
            corners = []
            for loop, index in zip(triangle.loops, triangle.vertices):
                point = (transform @ mesh.vertices[index].co-origin)*scale
                normal = (normal_transform @ mesh.corner_normals[loop].vector).normalized()
                geometric = (normal_transform @ triangle.normal).normalized()
                if normal.dot(geometric) < .15:
                    normal = geometric
                corners.append([*point,*normal,*uv[loop].uv])
            faces.append(corners)
    assert len(faces) <= budget, (name, len(faces), budget)
    extract_maps(path, name)
    catalog[name] = {'size':list(span*scale),'anchor':list(anchor),'faces':faces}
    report.append({'name':name,'source':str(path.relative_to(ROOT)),'sourceSha256':hashlib.sha256(path.read_bytes()).hexdigest(),
                   'triangles':len(faces),'budget':budget,'size':list(span*scale),'uniformScale':scale,'task':task})
(OUTPUT/'catalog.json').write_text(json.dumps(catalog))
(PROJECT/'food-bake.json').write_text(json.dumps(report,indent=2)+'\n')
subprocess.run(['python3',str(ROOT/'tools/pack-restaurant-food.py')],check=True)
