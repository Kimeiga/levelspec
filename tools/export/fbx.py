"""Exact compiled triangle/UV payload -> isolated binary FBX, no geometry modifiers."""
import argparse, json, sys
from array import array
from pathlib import Path
import bpy


def linear(c):
    return c / 12.92 if c <= .04045 else ((c + .055) / 1.055) ** 2.4


def main(args):
    payload = json.loads(Path(args.input).read_text())
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.unit_settings.system = 'METRIC'
    scene.unit_settings.scale_length = 1.0
    mesh = payload['mesh']
    definitions = {m['id']: m for m in payload['materials']}
    definitions.setdefault('default', dict(id='default', color='#b9c7d1', roughness=.8, metalness=0))
    materials = {}
    for key, spec in definitions.items():
        mat = bpy.data.materials.new(key)
        mat.use_nodes = True
        shader = mat.node_tree.nodes.get('Principled BSDF')
        color = [linear(int(spec['color'][i:i+2], 16) / 255) for i in (1, 3, 5)] + [1]
        mat.diffuse_color = color
        shader.inputs['Base Color'].default_value = color
        shader.inputs['Roughness'].default_value = spec['roughness']
        shader.inputs['Metallic'].default_value = spec['metalness']
        if spec.get('texture'):
            image = bpy.data.images.load(str(Path(args.input).parent / payload['textureFiles'][spec['id']]), check_existing=True)
            image.colorspace_settings.name = 'sRGB'
            # FBX only transports direct image bindings. The Node host supplies a
            # color-multiplied image, preserving the original texture in metadata.
            node = mat.node_tree.nodes.new('ShaderNodeTexImage')
            node.image = image
            node.extension = 'REPEAT'
            mat.node_tree.links.new(node.outputs['Color'], shader.inputs['Base Color'])
            shader.inputs['Base Color'].default_value = (1, 1, 1, 1)
            mat.diffuse_color = (1, 1, 1, 1)
        materials[key] = mat
    root = bpy.data.objects.new(payload['id'], None)
    scene.collection.objects.link(root)
    root['geometryHash'] = payload['geometryHash']
    source_frames = {}
    groups = {}
    for t, si in enumerate(mesh['surfaces']):
        s = payload['surfaces'][si]
        page = mesh.get('atlasPages', [-1] * len(mesh['surfaces']))[t]
        groups.setdefault((s['mesh'], s['object'], s['material'], page), []).append(t)
    for (part, owner, material, page), triangles in groups.items():
        surface = payload['surfaces'][mesh['surfaces'][triangles[0]]]
        old = sorted({v for t in triangles for v in mesh['indices'][3*t:3*t+3]})
        lookup = {v: i for i, v in enumerate(old)}
        data = bpy.data.meshes.new(f'{part}:{owner}:{material}:page{page}')
        data.from_pydata([mesh['positions'][3*v:3*v+3] for v in old], [], [[lookup[v] for v in mesh['indices'][3*t:3*t+3]] for t in triangles])
        data.update()
        obj = bpy.data.objects.new(data.name, data)
        scene.collection.objects.link(obj)
        obj.parent = root
        data.materials.append(materials[material])
        for field in ('mesh', 'kind', 'object', 'layer', 'role', 'dynamic'):
            obj[field] = surface[field]
        obj['atlasPage'] = page
        obj['sourceSurfaces'] = json.dumps([mesh['surfaces'][t] for t in triangles])
        for channel, name in [('uv', 'Material'), ('uv1', 'Lightmap')]:
            if channel not in mesh:
                continue
            uv = data.uv_layers.new(name=name)
            for loop in data.loops:
                v = old[loop.vertex_index]
                uv.data[loop.index].uv = mesh[channel][2*v:2*v+2]
        for poly in data.polygons:
            poly.use_smooth = True
        normals = [mesh['normals'][3*old[loop.vertex_index]:3*old[loop.vertex_index]+3] for loop in data.loops]
        data.normals_split_custom_set(normals)
        tangents = [mesh['tangents'][4*old[loop.vertex_index]:4*old[loop.vertex_index]+4] for loop in data.loops] if mesh.get('tangents') else None
        source_frames[data.name] = (normals, tangents)
    for marker in payload['markers']:
        obj = bpy.data.objects.new(marker['id'], None)
        scene.collection.objects.link(obj)
        obj.parent = root
        obj.location = marker['position']
        for key in ('id', 'kind', 'layer', 'region', 'team'):
            if key in marker:
                obj[key] = marker[key]
    # Keep Blender's established FBX scene/material writer, but supply canonical
    # corner frames before serialization. Blender's normal packing and MikkTSpace
    # calculation otherwise alter authored normals/tangents. This hook is local
    # to this isolated process and never changes installed Blender files.
    from io_scene_fbx import export_fbx_bin
    from io_scene_fbx.fbx_utils import elem_data_single_float64_array, elem_data_single_int32_array, elem_data_single_string
    original_mesh_writer = export_fbx_bin.fbx_data_mesh_elements
    patched_frames = set()
    def mesh_writer(root, me_obj, scene_data, done_meshes):
        _, data, _ = scene_data.data_meshes[me_obj]
        before = len(root.elems)
        original_mesh_writer(root, me_obj, scene_data, done_meshes)
        if data.name not in source_frames:
            return
        assert not me_obj.use_bake_space_transform(scene_data), 'Canonical frames require object-space FBX geometry'
        normals, tangents = source_frames[data.name]
        for geometry in root.elems[before:]:
            if geometry.id != b'Geometry':
                continue
            for layer in geometry.elems:
                if layer.id == b'LayerElementNormal':
                    layer.elems[:] = [e for e in layer.elems if e.id not in (b'Normals', b'NormalsIndex', b'MappingInformationType', b'ReferenceInformationType')]
                    elem_data_single_string(layer, b'MappingInformationType', b'ByPolygonVertex')
                    elem_data_single_string(layer, b'ReferenceInformationType', b'IndexToDirect')
                    elem_data_single_float64_array(layer, b'Normals', array('d', (v for n in normals for v in n)))
                    elem_data_single_int32_array(layer, b'NormalsIndex', array('i', range(len(normals))))
                    patched_frames.add(data.name)
                elif tangents and layer.id in (b'LayerElementTangent', b'LayerElementBinormal') and layer.props[0] == (0).to_bytes(4, 'little', signed=True):
                    # Layer 0 is the Material UV channel. Other channels retain
                    # Blender's derived frames and are not source material tangents.
                    field = b'Tangents' if layer.id == b'LayerElementTangent' else b'Binormals'
                    vectors = [t[:3] for t in tangents] if field == b'Tangents' else [
                        [(n[1]*t[2]-n[2]*t[1])*t[3], (n[2]*t[0]-n[0]*t[2])*t[3], (n[0]*t[1]-n[1]*t[0])*t[3]] for n,t in zip(normals,tangents)]
                    layer.elems[:] = [e for e in layer.elems if e.id != field]
                    elem_data_single_float64_array(layer, field, array('d', (v for vector in vectors for v in vector)))
    export_fbx_bin.fbx_data_mesh_elements = mesh_writer
    try:
        bpy.ops.export_scene.fbx(filepath=args.output, check_existing=False,
            axis_forward='-Z', axis_up='Y', global_scale=1.0, apply_unit_scale=True,
            apply_scale_options='FBX_SCALE_ALL', use_space_transform=True,
            bake_space_transform=False, object_types={'MESH', 'EMPTY'},
            use_mesh_modifiers=False, use_tspace=True, use_custom_props=True,
            bake_anim=False, path_mode='RELATIVE', embed_textures=False)
    finally:
        export_fbx_bin.fbx_data_mesh_elements = original_mesh_writer
    assert patched_frames == set(source_frames), 'Blender FBX writer did not preserve every canonical frame'
    print('LEVELSPEC_FBX_COMPLETE', bpy.app.version_string)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--input', required=True)
    parser.add_argument('--output', required=True)
    main(parser.parse_args(sys.argv[sys.argv.index('--') + 1:]))
