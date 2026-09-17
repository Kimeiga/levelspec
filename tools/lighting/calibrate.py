"""Tiny isolated Cycles calibration and strict float EXR/packed-image round trip.

Run Blender --background --factory-startup --python-exit-code 1 --python
blender_calibration.py -- --output-dir NEW_DIRECTORY
Only the new directory is written. CPU, four threads, 32px fixtures; no full bake.
"""
import argparse
import json
import math
from pathlib import Path
import struct
import sys
import time

import bpy
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from lightmap_io import float_image, image_pixels, save_linear_exr


def exr_channels(data):
    if data[:4] != b'v/1\x01':
        raise AssertionError('Not OpenEXR')
    offset, result = 8, {}
    while data[offset]:
        end = data.index(0, offset); name = data[offset:end].decode(); offset = end + 1
        end = data.index(0, offset); kind = data[offset:end].decode(); offset = end + 1
        size = struct.unpack_from('<I', data, offset)[0]; offset += 4
        payload = data[offset:offset+size]; offset += size
        if name == 'channels' and kind == 'chlist':
            cursor = 0
            while payload[cursor]:
                end = payload.index(0, cursor); channel = payload[cursor:end].decode(); cursor = end + 1
                result[channel] = struct.unpack_from('<i', payload, cursor)[0]
                cursor += 16
    return result


def roundtrip(output):
    rgb = np.asarray([0, .003, .125, .5, 1, 2, 8], np.float32)
    alpha = np.asarray([0, .001, .125, .25, .5, .75, 1], np.float32)
    expected = np.empty((7, 7, 4), np.float32)
    expected[:, :, 0] = rgb[None, :]
    expected[:, :, 1] = rgb[::-1][None, :]
    expected[:, :, 2] = np.roll(rgb, 2)[None, :]
    expected[:, :, 3] = alpha[:, None]
    scene = bpy.context.scene
    keys = ('file_format', 'color_mode', 'color_depth', 'exr_codec')
    cases = []
    for view, exposure, gamma in [('Standard', 0, 1), ('AgX', 2.25, 1.7)]:
        scene.view_settings.view_transform = view
        scene.view_settings.look = 'None'
        scene.view_settings.exposure = exposure
        scene.view_settings.gamma = gamma
        scene.render.image_settings.file_format = 'PNG'
        scene.render.image_settings.color_mode = 'RGB'
        scene.render.image_settings.color_depth = '8'
        previous = {key: getattr(scene.render.image_settings, key) for key in keys}
        image = float_image('Independent RGBA / ' + view, 7)
        image.pixels.foreach_set(expected.ravel())
        path = save_linear_exr(image, output / ('roundtrip-' + view.lower() + '.exr'))
        assert exr_channels(path.read_bytes()) == {'R': 2, 'G': 2, 'B': 2, 'A': 2}, 'Expected FLOAT RGBA channels'
        assert previous == {key: getattr(scene.render.image_settings, key) for key in keys}
        np.testing.assert_array_equal(image_pixels(image), expected)
        assert scene.view_settings.view_transform == view
        assert abs(scene.view_settings.exposure - exposure) < 1e-6 and abs(scene.view_settings.gamma - gamma) < 1e-6
        for color_space in ('Linear Rec.709', 'Non-Color'):
            restored = bpy.data.images.load(str(path), check_existing=False)
            restored.colorspace_settings.name = color_space
            restored.alpha_mode = 'CHANNEL_PACKED'
            actual = image_pixels(restored)
            np.testing.assert_allclose(actual, expected, rtol=2e-7, atol=2e-7)
            cases.append({'view': view, 'exposure': exposure, 'gamma': gamma, 'loadColorSpace': color_space,
                          'maximumRgbError': float(np.abs(actual[:, :, :3] - expected[:, :, :3]).max()),
                          'maximumAlphaError': float(np.abs(actual[:, :, 3] - expected[:, :, 3]).max())})
            bpy.data.images.remove(restored)
    packed = float_image('Packed independent linear RGBA', 7)
    packed.pixels.foreach_set(expected.ravel())
    packed.file_format = 'OPEN_EXR'
    packed.pack()
    np.testing.assert_array_equal(image_pixels(packed), expected)
    bpy.ops.wm.save_as_mainfile(filepath=str(output / 'packed-roundtrip.blend'))
    bpy.ops.wm.open_mainfile(filepath=str(output / 'packed-roundtrip.blend'))
    actual = image_pixels(bpy.data.images['Packed independent linear RGBA'])
    np.testing.assert_allclose(actual, expected, rtol=2e-7, atol=2e-7)
    return {'rgb': rgb.tolist(), 'alpha': alpha.tolist(), 'cases': cases,
            'packedReloadMaximumError': float(np.abs(actual - expected).max()),
            'renderSettingsRestored': True, 'sourceBufferUnchanged': True, 'channels': 'FLOAT RGBA'}


def diffuse_material(name, color):
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    nodes = material.node_tree.nodes
    nodes.clear()
    diffuse = nodes.new('ShaderNodeBsdfDiffuse')
    diffuse.inputs['Color'].default_value = (*color, 1)
    output = nodes.new('ShaderNodeOutputMaterial')
    material.node_tree.links.new(diffuse.outputs[0], output.inputs['Surface'])
    return material, diffuse


def bake(receiver, name, filters, samples, output):
    scene = bpy.context.scene
    scene.cycles.samples = samples
    image = float_image(name, 32)
    for material in receiver.data.materials:
        nodes = material.node_tree.nodes
        for node in nodes:
            node.select = False
        target = nodes.new('ShaderNodeTexImage')
        target.image = image; target.select = True; nodes.active = target
    bpy.ops.object.select_all(action='DESELECT')
    receiver.select_set(True); bpy.context.view_layer.objects.active = receiver
    started = time.monotonic()
    bpy.ops.object.bake(type='DIFFUSE', pass_filter=set(filters), margin=0,
                        use_clear=False, use_selected_to_active=False, uv_layer=receiver.data.uv_layers[0].name)
    values = image_pixels(image)
    coverage = values[:, :, 3] > .5
    assert coverage.all() and np.isfinite(values).all()
    save_linear_exr(image, output / (name + '.exr'))
    return {'mean': values[:, :, :3][coverage].mean(axis=0).tolist(),
            'maximum': float(values[:, :, :3][coverage].max()),
            'coveredPixels': int(coverage.sum()), 'seconds': time.monotonic() - started,
            'samples': samples, 'size': 32, 'filters': list(filters)}


def calibrate(output):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'; scene.cycles.device = 'CPU'
    scene.render.threads_mode = 'FIXED'; scene.render.threads = 4
    scene.cycles.use_denoising = False; scene.cycles.use_adaptive_sampling = False
    scene.cycles.max_bounces = 4; scene.cycles.diffuse_bounces = 4; scene.cycles.seed = 17
    scene.view_settings.view_transform = 'Standard'; scene.view_settings.look = 'None'
    scene.view_settings.exposure = 0; scene.view_settings.gamma = 1
    bpy.ops.mesh.primitive_plane_add(size=2)
    receiver = bpy.context.object; receiver.name = 'Calibration receiver'
    material, diffuse = diffuse_material('White Lambert', (1, 1, 1))
    receiver.data.materials.append(material)
    world = bpy.data.worlds.new('Unit white radiance'); world.use_nodes = True; scene.world = world
    background = world.node_tree.nodes.get('Background')
    background.inputs['Color'].default_value = (1, 1, 1, 1)
    background.inputs['Strength'].default_value = 1
    sky = bake(receiver, 'unit-sky', ('DIRECT', 'INDIRECT'), 64, output)
    diffuse.inputs['Color'].default_value = (.2, .7, .3, 1)
    colored_receiver = bake(receiver, 'unit-sky-colored-receiver', ('DIRECT', 'INDIRECT'), 64, output)
    diffuse.inputs['Color'].default_value = (1, 1, 1, 1)
    background.inputs['Strength'].default_value = 0
    bpy.ops.object.light_add(type='SUN'); sun = bpy.context.object
    sun.data.energy = 1; sun.data.color = (1, 1, 1); sun.data.angle = 0
    sun.rotation_euler = (0, 0, 0)
    direct = bake(receiver, 'unit-sun', ('DIRECT',), 64, output)
    indirect = bake(receiver, 'unit-sun-indirect-only', ('INDIRECT',), 16, output)
    assert abs(np.mean(sky['mean']) - 1) < .015, 'Sky units changed; investigate before adapting'
    np.testing.assert_allclose(colored_receiver['mean'], sky['mean'], atol=.015)
    assert abs(np.mean(direct['mean']) - 1 / math.pi) < .01, 'Sun units changed; investigate before adapting'
    assert indirect['maximum'] < 1e-5, 'Indirect-only pass leaked direct sun'
    sun.data.energy = 0; background.inputs['Strength'].default_value = 1
    bpy.ops.mesh.primitive_plane_add(size=2, location=(-1, 0, 1), rotation=(0, math.pi/2, 0))
    wall = bpy.context.object; wall.name = 'Red bounce wall'
    wall_material, _ = diffuse_material('Red bounce donor', (.8, .06, .02))
    wall.data.materials.append(wall_material)
    bounce = bake(receiver, 'red-wall-sky-indirect', ('INDIRECT',), 128, output)
    r, g, b = bounce['mean']
    assert r > .01 and r > 3 * g and g > b, 'Neighbor albedo did not produce directional colored bounce'
    bpy.ops.wm.save_as_mainfile(filepath=str(output / 'calibration-fixture.blend'))
    return {'basis': 'Color-disabled diffuse stores E/pi in this tested Cycles version',
            'irradianceDecodeMultiplier': math.pi, 'unitSky': sky, 'coloredReceiverSky': colored_receiver,
            'unitSun': direct, 'isolatedSunIndirect': indirect, 'redWallSkyIndirect': bounce}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-dir', type=Path, required=True, help='New directory; earlier raw results are never replaced')
    args = parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
    args.output_dir.mkdir(parents=True, exist_ok=False)
    report = {'blenderVersion': bpy.app.version_string, 'device': 'CPU', 'threads': 4,
              'exr': roundtrip(args.output_dir), 'calibration': calibrate(args.output_dir)}
    (args.output_dir/'results.json').write_text(json.dumps(report, indent=2) + '\n')
    print('GI_CALIBRATION_PASSED ' + json.dumps(report), flush=True)


if __name__ == '__main__':
    main()
