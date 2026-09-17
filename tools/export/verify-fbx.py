"""Acceptance check: reimport delivered FBX and compare triangle corners to runtime JSON."""
import argparse, json, math, sys
from collections import Counter
from pathlib import Path
import bpy
from mathutils import Vector


def close(a, b, tolerance=0.0001):
    return len(a) == len(b) and all(abs(x-y) <= tolerance for x,y in zip(a,b))


def corner_close(a, b):
    # Blender's FBX importer encodes custom normals; its direction quantization
    # is separate from coordinate/UV preservation.
    return close(a[:3], b[:3], .0001) and close(a[3:6], b[3:6], .001) and close(a[6:], b[6:], .0001)


def key(points):
    center = [sum(p[i] for p in points)/3 for i in range(3)]
    return tuple(round(v, 2) for v in center)


def main(args):
    source = json.loads(Path(args.source).read_text())
    bpy.ops.wm.read_factory_settings(use_empty=True)
    is_gltf = Path(args.fbx).suffix.lower() in ('.glb', '.gltf')
    if is_gltf:
        bpy.ops.import_scene.gltf(filepath=str(Path(args.fbx).resolve()))
    else:
        bpy.ops.import_scene.fbx(filepath=str(Path(args.fbx).resolve()), use_custom_normals=True, use_custom_props=True)
    bpy.context.view_layer.update()
    mesh = source['mesh']
    if not is_gltf:
        from io_scene_fbx import parse_fbx
        tree, _ = parse_fbx.parse(str(Path(args.fbx).resolve()))
        geometries = [g for objects in tree.elems if objects.id == b'Objects' for g in objects.elems if g.id == b'Geometry' and g.props[2] == b'Mesh']
        for element, field, source_key, size in [(b'LayerElementNormal', b'Normals', 'normals', 3), (b'LayerElementTangent', b'Tangents', 'tangents', 4)]:
            if source_key not in mesh:
                continue
            expected_frames = Counter(tuple(mesh[source_key][size*v:size*v+3]) for v in mesh['indices'])
            actual_frames = Counter()
            for geometry in geometries:
                layer = next(e for e in geometry.elems if e.id == element and e.props[0] == 0)
                values = next(e.props[0] for e in layer.elems if e.id == field)
                actual_frames.update(tuple(values[i:i+3]) for i in range(0,len(values),3))
            assert actual_frames == expected_frames, f'FBX serialized {source_key} changed canonical components'

    expected = {}
    for t, si in enumerate(mesh['surfaces']):
        s = source['surfaces'][si]
        corners = []
        for v in mesh['indices'][3*t:3*t+3]:
            corners.append(mesh['positions'][3*v:3*v+3] + mesh['normals'][3*v:3*v+3] + mesh['uv'][2*v:2*v+2] + (mesh['uv1'][2*v:2*v+2] if 'uv1' in mesh else []))
        group = (s['mesh'], s['object'], s['material'], mesh.get('atlasPages', [-1]*len(mesh['surfaces']))[t])
        expected.setdefault(group, {}).setdefault(key(corners), []).append(corners)
    triangles = objects = 0
    for obj in bpy.context.scene.objects:
        if obj.type != 'MESH':
            continue
        objects += 1
        data = obj.data
        normal_matrix = obj.matrix_world.to_3x3().inverted().transposed()
        material_uv = data.uv_layers[0]
        assert material_uv is not None
        if 'uv1' in mesh:
            assert len(data.uv_layers) >= 2
        for poly in data.polygons:
            assert len(poly.vertices) == 3
            triangles += 1
            group = (obj['meshPart' if is_gltf else 'mesh'], obj['objectId' if is_gltf else 'object'], data.materials[poly.material_index].name, obj['atlasPage'])
            actual = []
            for li in poly.loop_indices:
                loop = data.loops[li]
                position = list(obj.matrix_world @ data.vertices[loop.vertex_index].co)
                normal = list((normal_matrix @ data.corner_normals[li].vector).normalized())
                uv = list(data.uv_layers[0].data[li].uv)
                uv1 = list(data.uv_layers[1].data[li].uv) if 'uv1' in mesh else []
                actual.append(position + normal + uv + uv1)
            bucket = expected.get(group, {}).get(key(actual), [])
            match = next((i for i, tri in enumerate(bucket) if any(all(corner_close(actual[j],tri[(j+offset)%3]) for j in range(3)) for offset in range(3))), None)
            assert match is not None, f'Triangle corner mismatch: {group} {actual}'
            bucket.pop(match)
    assert triangles == len(mesh['surfaces'])
    assert all(not bucket for group in expected.values() for bucket in group.values())
    for marker in source['markers']:
        obj = next((o for o in bpy.context.scene.objects if o.get('objectId' if is_gltf else 'id') == marker['id']), None)
        assert obj is not None and close(list(obj.matrix_world.translation), marker['position'])
    report = dict(blender=bpy.app.version_string, triangles=triangles, objects=objects, material_uv=True, lightmap_uv='uv1' in mesh, triangle_corner_tolerance_metres=0.0001, markers=len(source['markers']), imported_normal_component_tolerance=.001, serialized_frames_exact=not is_gltf)
    print('LEVELSPEC_MODEL_VERIFIED', json.dumps(report))
    if args.report:
        Path(args.report).write_text(json.dumps(report, indent=2))


if __name__ == '__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--source',required=True)
    parser.add_argument('--fbx',required=True)
    parser.add_argument('--report')
    main(parser.parse_args(sys.argv[sys.argv.index('--')+1:]))
